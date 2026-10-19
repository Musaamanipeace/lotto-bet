import test from 'node:test';
import assert from 'node:assert/strict';
import { candidateRows, doubleChanceSubOf, parseRules } from '../src/lib/filters.ts';
import {
  cardsToRules, clearedCards, defaultCards, isSolo, resetCard, soloCard, toggleSub,
} from '../src/lib/market-cards.ts';
import type { Game, Market, Outcome } from '../src/lib/types.ts';

const out = (id: string, desc: string, odds: number): Outcome => ({ bookmaker: 'sportybet', nativeId: id, desc, odds, isActive: true });
const mk = (nativeId: string, kind: Market['kind'], line: number | null, outcomes: Outcome[]): Market => ({
  bookmaker: 'sportybet', nativeId, specifier: line === null ? '' : `total=${line}`, line, kind, unavailableReason: null, outcomes,
});
const game: Game = {
  id: 'sportybet:1', bookmaker: 'sportybet', nativeEventId: '1', home: 'A', away: 'B', kickoff: 1_800_000_000_000, league: 'L', fetchRunId: null,
  markets: [
    mk('1', '1x2', null, [out('1', 'Home', 1.4), out('2', 'Draw', 4.2), out('3', 'Away', 7.5)]),
    mk('10', 'double_chance', null, [out('9', '1X', 1.12), out('10', '12', 1.18), out('11', 'X2', 2.9)]),
    mk('18', 'over_under', 0.5, [out('12', 'Over', 1.05), out('13', 'Under', 8.0)]),
    mk('18', 'over_under', 1.5, [out('12', 'Over', 1.3), out('13', 'Under', 3.2)]),
    mk('18', 'over_under', 3.5, [out('12', 'Over', 2.6), out('13', 'Under', 1.35)]),
    mk('29', 'btts', null, [out('74', 'Yes', 1.7), out('76', 'No', 2.0)]),
  ],
};
const picks = (rows: ReturnType<typeof candidateRows>) => rows.map((r) => r.pick).sort();

test('home / draw / away cards each match only their own 1X2 outcome', () => {
  const c = clearedCards();
  assert.deepEqual(picks(candidateRows([game], { rules: cardsToRules({ ...c, home: { ...c.home, on: true } }) })), ['Home']);
  assert.deepEqual(picks(candidateRows([game], { rules: cardsToRules({ ...c, draw: { ...c.draw, on: true } }) })), ['Draw']);
  assert.deepEqual(picks(candidateRows([game], { rules: cardsToRules({ ...c, away: { ...c.away, on: true } }) })), ['Away']);
});

test('each card applies its own odds range, and the slider ceiling means no upper limit', () => {
  const c = clearedCards();
  const home = { ...c.home, on: true, low: 1.5, high: 3 }; // 1.40 is below the minimum
  assert.equal(candidateRows([game], { rules: cardsToRules({ ...c, home }) }).length, 0);
  const away = { ...c.away, on: true, low: 1, high: 3 }; // 7.50 is above the track but the ceiling is open
  assert.deepEqual(picks(candidateRows([game], { rules: cardsToRules({ ...c, away }) })), ['Away']);
  const awayCapped = { ...c.away, on: true, low: 1, high: 2.9 };
  assert.equal(candidateRows([game], { rules: cardsToRules({ ...c, away: awayCapped }) }).length, 0);
});

test('double chance sub-toggles filter 1X / 12 / X2 independently', () => {
  let c = clearedCards();
  c = { ...c, dc: { ...c.dc, on: true } };
  assert.deepEqual(picks(candidateRows([game], { rules: cardsToRules(c) })), ['12', '1X', 'X2']);
  c = toggleSub(c, 'dc', '12');
  assert.deepEqual(picks(candidateRows([game], { rules: cardsToRules(c) })), ['1X', 'X2']);
  c = toggleSub(toggleSub(c, 'dc', '1X'), 'dc', 'X2');
  assert.equal(cardsToRules(c).length, 0); // card on, nothing picked: matches nothing
  assert.equal(candidateRows([game], { rules: cardsToRules(c) }).length, 0);
});

test('double chance labels are matched by description and unknown labels are never guessed', () => {
  assert.equal(doubleChanceSubOf('Home or Draw'), '1X');
  assert.equal(doubleChanceSubOf(' draw  or away '), 'X2');
  assert.equal(doubleChanceSubOf('1X'), '1X');
  assert.equal(doubleChanceSubOf('Something else'), null);
  // An unlabelled outcome still shows when every sub-toggle is on, and is hidden once the user narrows to specific picks.
  const odd: Game = { ...game, markets: [mk('10', 'double_chance', null, [out('99', 'Weird label', 1.2)])] };
  const c = { ...clearedCards(), dc: { ...clearedCards().dc, on: true } };
  assert.equal(candidateRows([odd], { rules: cardsToRules(c) }).length, 1);
  assert.equal(candidateRows([odd], { rules: cardsToRules(toggleSub(c, 'dc', '12')) }).length, 0);
});

test('over and under cards take several goal lines at once and only their own side', () => {
  let c = clearedCards();
  c = { ...c, over: { ...c.over, on: true, subs: ['0.5', '1.5'] }, under: { ...c.under, on: true, subs: ['3.5'], low: 1.01, high: 3 } };
  const rows = candidateRows([game], { rules: cardsToRules(c) });
  assert.deepEqual(picks(rows), ['Over 0.5', 'Over 1.5', 'Under 3.5']);
  assert.equal(candidateRows([game], { rules: cardsToRules({ ...c, over: { ...c.over, subs: [] } }) }).length, 1); // only Under 3.5 left
});

test('BTTS: GG, NGG, or both', () => {
  const c = clearedCards();
  const on = (subs: string[]) => cardsToRules({ ...c, btts: { ...c.btts, on: true, subs } });
  assert.deepEqual(picks(candidateRows([game], { rules: on(['GG']) })), ['Yes']);
  assert.deepEqual(picks(candidateRows([game], { rules: on(['NGG']) })), ['No']);
  assert.deepEqual(picks(candidateRows([game], { rules: on(['GG', 'NGG']) })), ['No', 'Yes']);
});

test('no card switched on shows nothing; defaults mirror the original starting filters', () => {
  assert.equal(candidateRows([game], { rules: cardsToRules(clearedCards()) }).length, 0);
  const d = defaultCards();
  assert.deepEqual(Object.entries(d).filter(([, v]) => v.on).map(([k]) => k), ['dc', 'home', 'away', 'over', 'under', 'btts']);
  assert.deepEqual([d.dc.low, d.dc.high, d.home.low, d.home.high, d.away.low, d.away.high], [1.08, 1.2, 1.3, 1.5, 1.5, 1.6]);
});

test('solo, reset and toggling a sub-market on', () => {
  const s = soloCard(defaultCards(), 'under');
  assert.ok(isSolo(s, 'under') && !isSolo(s, 'dc'));
  const moved = { ...s, under: { ...s.under, low: 2, high: 2.5, subs: ['4.5'] } };
  assert.deepEqual(resetCard(moved, 'under').under, { on: true, low: 1.05, high: 3, subs: ['3.5'] });
  const off = { ...clearedCards() };
  assert.equal(toggleSub(off, 'over', '2.5').over.on, true);
});

test('rules without an odds range leave odds unrestricted, and the old filters still combine with rules', () => {
  const c = clearedCards();
  const r = cardsToRules({ ...c, home: { ...c.home, on: true } });
  assert.deepEqual(r, [{ kind: '1x2', subs: ['home'] }]);
  assert.equal(candidateRows([game], { rules: r, oddsMax: 1.3 }).length, 0);
});

test('parseRules accepts what the UI sends and rejects malformed input', () => {
  const rules = cardsToRules(defaultCards());
  assert.deepEqual(parseRules(JSON.stringify(rules)), rules);
  assert.deepEqual(parseRules('[]'), []);
  assert.equal(parseRules('not json'), null);
  assert.equal(parseRules('{"kind":"btts"}'), null);
  assert.equal(parseRules('[{"kind":"corners"}]'), null);
  assert.equal(parseRules('[{"kind":"btts","oddsMin":"1.2"}]'), null);
  assert.equal(parseRules('[{"kind":"over_under","lines":["2.5"]}]'), null);
});

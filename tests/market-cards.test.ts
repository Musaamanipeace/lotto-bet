import test from 'node:test';
import assert from 'node:assert/strict';
import { candidateRows, doubleChanceSubOf, parseRules } from '../src/lib/filters.ts';
import {
  CARDS,
  GOAL_LINES_FALLBACK,
  MATCH_RESULT_CHOICES,
  allAvailableCards,
  cardsToRules,
  clearSubRange,
  clearedCards,
  defaultCards,
  isSolo,
  resetCard,
  setSubRange,
  soloCard,
  toggleSub,
} from '../src/lib/market-cards.ts';
import { matchesCardsState, normalizeCardsState } from '../src/lib/filter-state.ts';
import type { AiPick } from '../src/lib/ai-picks.ts';
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

test('1X2 card toggles Home / Draw / Away independently', () => {
  assert.equal(MATCH_RESULT_CHOICES.find((c) => c.id === 'home')?.label, 'Home');
  assert.equal(MATCH_RESULT_CHOICES.find((c) => c.id === 'away')?.label, 'Away');
  assert.equal(CARDS.find((c) => c.id === '1x2')?.hint, 'Home, Draw, Away — pick one or more');
  let c = clearedCards();
  c = { ...c, '1x2': { ...c['1x2'], on: true } }; // all three subs on by default
  assert.deepEqual(picks(candidateRows([game], { rules: cardsToRules(c) })), ['Away', 'Draw', 'Home']);
  c = toggleSub(c, '1x2', 'draw');
  assert.deepEqual(picks(candidateRows([game], { rules: cardsToRules(c) })), ['Away', 'Home']);
  c = toggleSub(toggleSub(c, '1x2', 'home'), '1x2', 'away');
  assert.equal(cardsToRules(c).length, 0); // card on, nothing picked: matches nothing
  assert.equal(candidateRows([game], { rules: cardsToRules(c) }).length, 0);
});

test('1X2 card odds range applies across picks and the ceiling means no upper limit', () => {
  const base = clearedCards();
  // handle at the ceiling (high === max): no upper bound, so Away (7.50) stays
  let c = { ...base, '1x2': { ...base['1x2'], on: true, low: 1, high: 6 } };
  assert.deepEqual(picks(candidateRows([game], { rules: cardsToRules(c) })), ['Away', 'Draw', 'Home']);
  // raise the floor: Home (1.40) drops out, Draw (4.20) and Away (7.50) remain
  c = { ...base, '1x2': { ...base['1x2'], on: true, low: 1.5, high: 6 } };
  assert.deepEqual(picks(candidateRows([game], { rules: cardsToRules(c) })), ['Away', 'Draw']);
  // cap the ceiling: Away (7.50) is now above oddsMax 4.20 -> only Draw
  c = { ...base, '1x2': { ...base['1x2'], on: true, low: 1.5, high: 4.2 } };
  assert.deepEqual(picks(candidateRows([game], { rules: cardsToRules(c) })), ['Draw']);
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
  assert.deepEqual(Object.entries(d).filter(([, v]) => v.on).map(([k]) => k), ['dc', '1x2', 'over', 'under', 'btts']);
  assert.deepEqual([d.dc.low, d.dc.high, d['1x2'].low, d['1x2'].high], [1.08, 1.2, 1.3, 2.5]);
});

test('solo, reset and toggling a sub-market on', () => {
  const s = soloCard(defaultCards(), 'under');
  assert.ok(isSolo(s, 'under') && !isSolo(s, 'dc'));
  const moved = { ...s, under: { ...s.under, low: 2, high: 2.5, subs: ['4.5'] } };
  assert.deepEqual(resetCard(moved, 'under').under, { on: true, low: 1.05, high: 3, subs: ['3.5'] });
  const off = { ...clearedCards() };
  assert.equal(toggleSub(off, 'over', '2.5').over.on, true);
});

test('a single 1X2 sub narrows picks; a rule without an odds range leaves odds unrestricted, and a top-level band still applies', () => {
  const c = clearedCards();
  const r = cardsToRules({ ...c, '1x2': { ...c['1x2'], on: true, subs: ['home'] } });
  assert.deepEqual(r, [{ kind: '1x2', subs: ['home'] }]); // no oddsMin/oddsMax in the rule
  assert.deepEqual(picks(candidateRows([game], { rules: r })), ['Home']);
  assert.equal(candidateRows([game], { rules: r, oddsMax: 1.3 }).length, 0); // top-level cap still works
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

test('"All available" turns every card on with every sub and full ranges; cleared turns them off', () => {
  const g = GOAL_LINES_FALLBACK;
  const all = allAvailableCards(g);
  assert.ok(Object.values(all).every((c) => c.on), 'every card is on');
  assert.deepEqual([all.dc.low, all.dc.high], [1, 3]);
  assert.deepEqual([all['1x2'].low, all['1x2'].high], [1, 6]);
  assert.deepEqual(all['1x2'].subs, ['home', 'draw', 'away']);
  assert.deepEqual(all['over'].subs, g.map(String));
  assert.deepEqual(all['under'].subs, g.map(String));
  assert.deepEqual(all['btts'].subs, ['GG', 'NGG']);
  const none = clearedCards();
  assert.ok(Object.values(none).every((c) => !c.on), 'every card is off');
});

test('per-selector subRanges allow independent min/max odds per submarket (e.g. Home vs Away)', () => {
  let c = clearedCards();
  c = { ...c, '1x2': { ...c['1x2'], on: true, low: 1.0, high: 6.0, subs: ['home', 'draw', 'away'] } };
  // Home is 1.40, Draw is 4.20, Away is 7.50 (Note: 6.0 ceiling = no upper limit)
  // Restrict Home to 1.50..2.00 (excludes Home 1.40), keep Draw at card default 1.0..6.0 (includes Draw 4.20),
  // and set Away to 5.00..6.00 (6.00 is max ceiling -> no upper limit, so Away 7.50 passes).
  c = setSubRange(c, '1x2', 'home', 1.5, 2.0);
  c = setSubRange(c, '1x2', 'away', 5.0, 6.0);
  assert.deepEqual(picks(candidateRows([game], { rules: cardsToRules(c) })), ['Away', 'Draw']);

  // Clear Home override -> falls back to card default (1.0..6.0) so Home 1.40 returns
  c = clearSubRange(c, '1x2', 'home');
  assert.deepEqual(picks(candidateRows([game], { rules: cardsToRules(c) })), ['Away', 'Draw', 'Home']);

  // Over Goals per-line range: Over 0.5 at 1.05, Over 1.5 at 1.30, Over 3.5 at 2.60
  c = { ...clearedCards(), over: { on: true, low: 1.01, high: 3.0, subs: ['0.5', '1.5', '3.5'] } };
  c = setSubRange(c, 'over', '0.5', 1.2, 2.0); // excludes Over 0.5 (1.05)
  c = setSubRange(c, 'over', '3.5', 2.0, 2.5); // excludes Over 3.5 (2.60)
  assert.deepEqual(picks(candidateRows([game], { rules: cardsToRules(c) })), ['Over 1.5']);

  // Reset card clears subRanges
  const reset = resetCard(c, 'over');
  assert.equal(reset.over.subRanges, undefined);
});

test('normalizeCardsState and matchesCardsState preserve and enforce per-selector subRanges', () => {
  const normalized = normalizeCardsState({
    '1x2': {
      on: true,
      low: 1.3,
      high: 2.5,
      subs: ['home', 'away'],
      subRanges: {
        home: { low: 1.2, high: 1.6 },
        away: { low: 3.0, high: 99 }, // clamped to 6.0
      },
    },
  });
  assert.deepEqual(normalized['1x2'].subRanges, {
    home: { low: 1.2, high: 1.6 },
    away: { low: 3.0, high: 6.0 },
  });

  const basePick: AiPick = {
    id: 'p1',
    gameId: 'g1',
    bookmaker: 'sportybet',
    home: 'A',
    away: 'B',
    kickoff: 1_800_000_000_000,
    league: 'L',
    marketKey: 'home_win',
    marketNativeId: '1',
    outcomeNativeId: '1',
    specifier: '',
    odds: 1.8,
    impliedProbability: 0.5,
    tier: 'balanced',
    fitScore: 0.9,
    fitBreakdown: {
      tierPlacement: 0.9,
      impliedProbability: 0.5,
      criteriaPassShare: 1,
      leaguePriority: 0.8,
      cardsCornersData: 0,
      failedCriteriaPenalty: 0,
      congestionPenalty: 0,
    },
    criteria: [],
    evaluation: {
      qualifies: true,
      label: 'Verified',
      verifiedLabel: 'Verified',
      total: 0,
      passed: 0,
      verifiable: 0,
      reason: null,
      provisionalCriteria: [],
    },
    rationale: 'test',
    exclusionStatus: 'cleared',
  };

  // Home odds 1.80 passes card default (1.3-2.5) without subRange, fails home subRange (1.2-1.6)
  assert.equal(matchesCardsState(basePick, normalized), false);
  assert.equal(matchesCardsState({ ...basePick, odds: 1.45 }, normalized), true);
  // Away odds 3.50 passes away subRange (3.0-6.0) even though card default max is 2.5
  assert.equal(matchesCardsState({ ...basePick, marketKey: 'away_win', odds: 3.5 }, normalized), true);
  assert.equal(matchesCardsState({ ...basePick, marketKey: 'away_win', odds: 2.2 }, normalized), false);
});


import assert from 'node:assert/strict';
import { test } from 'node:test';
import { candidateRows, type PickRow } from '../src/lib/filters.ts';
import { MAX_LEGS, addLeg, addMany, emptySlip, greyMarket, marketsInSlip, removeFromMarket, removeLeg, slipTotals, toggleGrey } from '../src/lib/slip.ts';

const mk = (n: number, over: Partial<PickRow> = {}): PickRow => ({
  gameId: `sportybet:${n}`, nativeEventId: `${n}`, bookmaker: 'sportybet', home: `H${n}`, away: `A${n}`, kickoff: n, league: 'L',
  pick: 'Home', odds: 2, marketNativeId: '1', outcomeNativeId: '1', specifier: '', marketKind: '1x2', line: null, outcomeKey: 'home', implied: 0.5, ...over,
});
const ou = (n: number) => mk(n, { marketKind: 'over_under', line: 2.5, pick: 'Over 2.5', marketNativeId: '18' });

test('one leg per game, one source bookmaker, max 50, with explicit reasons', () => {
  const s1 = addLeg(emptySlip(), mk(1)); assert.ok(s1.ok);
  const dup = addLeg(s1.slip, mk(1, { pick: 'Draw' })); assert.ok(!dup.ok && /already in the slip/.test(dup.error));
  const mixed = addLeg(s1.slip, mk(2, { bookmaker: 'betpawa', gameId: 'betpawa:2' })); assert.ok(!mixed.ok && /clear it/.test(mixed.error));
  const full = addMany(emptySlip(), Array.from({ length: MAX_LEGS + 3 }, (_, i) => mk(i)));
  assert.equal(full.added, MAX_LEGS); assert.equal(full.refused.length, 3);
});

test('totals: product of odds, greyed legs excluded but kept', () => {
  let s = addMany(emptySlip(), [mk(1, { odds: 2 }), mk(2, { odds: 3 }), mk(3, { odds: 1.5 })]).slip;
  let t = slipTotals(s); assert.ok(t.totalOdds.ok); assert.equal(t.totalOdds.total, 9);
  s = toggleGrey(s, 'sportybet:2'); t = slipTotals(s);
  assert.ok(t.totalOdds.ok); assert.equal(t.totalOdds.total, 3); assert.equal(t.legCount, 3); assert.equal(t.greyedCount, 1);
  assert.equal(toggleGrey(toggleGrey(s, 'sportybet:2'), 'sportybet:2').greyed.length, 1);
  s = greyMarket(s, { kind: '1x2' }, true); t = slipTotals(s);
  assert.ok(!t.totalOdds.ok); assert.equal(s.legs.length, 3, 'nothing is removed by greying');
  assert.equal(slipTotals(greyMarket(s, { kind: '1x2' }, false)).activeCount, 3);
});

test('combined probability is the product and is unavailable (with reason) if any leg lacks one', () => {
  let s = addMany(emptySlip(), [mk(1, { implied: 0.5 }), mk(2, { implied: 0.4 })]).slip;
  const c = slipTotals(s).combined; assert.ok(c.ok); assert.ok(Math.abs(c.probability - 0.2) < 1e-12);
  s = addMany(s, [mk(3, { implied: null })]).slip;
  const c2 = slipTotals(s).combined; assert.ok(!c2.ok && /1 of 3/.test(c2.reason));
  assert.ok(!slipTotals(emptySlip()).combined.ok);
});

test('remove N from a market removes the most recent N of that market only, and reports the real count', () => {
  const s = addMany(emptySlip(), [mk(1), ou(2), mk(3), ou(4), mk(5)]).slip;
  const r = removeFromMarket(s, { kind: '1x2' }, 2); assert.ok(r.ok);
  assert.deepEqual(r.slip.legs.map((l) => l.gameId), ['sportybet:1', 'sportybet:2', 'sportybet:4']);
  assert.equal(r.removed, 2);
  const over = removeFromMarket(s, { kind: 'over_under', line: 2.5 }, 9); assert.ok(over.ok);
  assert.equal(over.removed, 2); assert.equal(over.requested, 9);
  const none = removeFromMarket(s, { kind: 'over_under', line: 3.5 }, 1); assert.ok(none.ok && none.removed === 0);
  assert.ok(!removeFromMarket(s, { kind: '1x2' }, 0).ok);
  assert.deepEqual(marketsInSlip(s).map((m) => [m.key, m.count]), [['1x2:', 3], ['over_under:2.5', 2]]);
  assert.equal(removeLeg(s, 'sportybet:1').legs.length, 4);
});

test('implied probability on real rows: margin removed from the complete market; null if market has a suspended outcome', () => {
  const game = (suspended: boolean) => [{
    id: 'sportybet:1', bookmaker: 'sportybet' as const, nativeEventId: '1', home: 'A', away: 'B', kickoff: 1, league: 'L', fetchRunId: null,
    markets: [{ bookmaker: 'sportybet' as const, nativeId: '1', specifier: '', line: null, kind: '1x2' as const, unavailableReason: null, outcomes: [
      { bookmaker: 'sportybet' as const, nativeId: '1', desc: 'Home', odds: 2, isActive: true },
      { bookmaker: 'sportybet' as const, nativeId: '2', desc: 'Draw', odds: 4, isActive: true },
      { bookmaker: 'sportybet' as const, nativeId: '3', desc: 'Away', odds: 4, isActive: !suspended } ] }],
  }];
  const rows = candidateRows(game(false));
  assert.equal(rows.length, 3);
  assert.ok(Math.abs(rows[0].implied! - 0.5) < 1e-12, '1/2,1/4,1/4 sums to 1 so no margin: 0.5');
  assert.ok(Math.abs(rows.reduce((a, r) => a + r.implied!, 0) - 1) < 1e-12);
  assert.ok(candidateRows(game(true)).every((r) => r.implied === null));
});

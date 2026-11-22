import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  legsForTarget,
  pickBest,
  selectPerLeg,
  selectPerLegWindow,
  targetSlip,
} from '../src/lib/targeting.ts';
import type { TargetRow } from '../src/lib/targeting.ts';

function mk(id: string, odds: number, o: Partial<TargetRow> = {}): TargetRow {
  return {
    id,
    gameId: id,
    bookmaker: 'sportybet',
    home: `H${id}`,
    away: `A${id}`,
    odds,
    coverage: 0.8,
    fitBiasFree: 0.3,
    ...o,
  };
}

/** Synthetic pool: many 1.02–1.2 picks plus value picks 1.4–2.5, one Over 0.5 @ 1.03. */
function syntheticPool(): TargetRow[] {
  const pool: TargetRow[] = [mk('ov05', 1.03, { gameId: 'ov05', home: 'H0', away: 'A0' })];
  for (let i = 0; i < 20; i++) {
    pool.push(mk(`low${i}`, 1.02 + i * 0.06)); // 1.02 .. 1.20
  }
  for (const [id, odds] of [['v1', 1.4], ['v2', 1.5], ['v3', 1.7], ['v4', 1.9], ['v5', 2.05], ['v6', 2.2], ['v7', 2.5]] as const) {
    pool.push(mk(id, odds));
  }
  return pool;
}

test('legsForTarget: preferred per-leg average within [1.4, 2.2] for total 20', () => {
  const n = legsForTarget(20);
  assert.ok(n >= 2 && n <= 12);
  const avg = 20 ** (1 / n);
  assert.ok(avg >= 1.4 && avg <= 2.2, `avg ${avg} outside preferred range`);
});

test('targetSlip: target 20 within 5%, no leg below preferred range, ≤ cap', () => {
  const r = targetSlip(syntheticPool(), 20);
  assert.ok(r.reached, `achieved ${r.achieved} should be within 5% of 20`);
  assert.ok(Math.abs(r.achieved - 20) / 20 <= 0.05);
  assert.ok(r.picks.length <= 50);
  const minOdds = Math.min(...r.picks.map((p) => p.odds));
  assert.ok(minOdds >= 1.35, `lowest leg at ${minOdds}`);
  // One pick per game, one bookmaker per slip.
  assert.equal(new Set(r.picks.map((p) => p.gameId)).size, r.picks.length);
  assert.equal(new Set(r.picks.map((p) => p.bookmaker)).size, 1);
});

test('selectPerLeg: per-leg 2.0 returns pick between about 1.85 and 2.15', () => {
  const r = selectPerLeg(syntheticPool(), 2.0);
  assert.ok(r.pick, 'expected a pick');
  assert.ok(r.pick.odds >= 1.85 && r.pick.odds <= 2.15, `picked ${r.pick.odds}`);
});

test('selectPerLeg: per-leg 1.5 returns pick between about 1.38 and 1.62', () => {
  const r = selectPerLeg(syntheticPool(), 1.5);
  assert.ok(r.pick, 'expected a pick');
  assert.ok(r.pick.odds >= 1.38 && r.pick.odds <= 1.62, `picked ${r.pick.odds}`);
});

test('selectPerLeg: a 1.5 request never returns the Over 0.5 at 1.03', () => {
  const pool = syntheticPool();
  const r = selectPerLeg(pool, 1.5);
  assert.ok(r.pick);
  assert.ok(r.pick.odds >= 1.38, `picked ${r.pick.odds}`);
  assert.notEqual(r.pick.id, 'ov05');
});

test('selectPerLeg: empty window widens and states the widening', () => {
  const pool = [mk('a', 2.2), mk('b', 1.8)];
  const r = selectPerLeg(pool, 2.0);
  assert.ok(r.pick);
  assert.ok(r.pick.odds >= 1.92, `expected widened window to find ${r.pick.odds}`);
  assert.ok(r.message, 'expected a widening message');
  assert.match(r.message!, /±/);
});

test('selectPerLegWindow: range [1.4, 1.6] picks inside the window', () => {
  const r = selectPerLegWindow(syntheticPool(), 1.4, 1.6);
  assert.ok(r.pick);
  assert.ok(r.pick.odds >= 1.4 && r.pick.odds <= 1.6, `picked ${r.pick.odds}`);
});

test('targetSlip: unreachable target returns the closest slip and a plain message', () => {
  const r = targetSlip(syntheticPool(), 500);
  assert.equal(r.reached, false);
  assert.ok(r.picks.length > 0);
  assert.ok(r.message, 'expected a message');
  assert.match(r.message!, /best reachable total/);
  assert.ok(r.achieved < 500);
});

test('pickBest: bias-free ranking prefers higher fit, then coverage, then model disparity', () => {
  const a = mk('a', 2.0, { fitBiasFree: 0.2, coverage: 0.9 });
  const b = mk('b', 1.5, { fitBiasFree: 0.3, coverage: 0.5 });
  assert.equal(pickBest([a, b], 1.7)?.id, 'b'); // higher fit wins over higher odds
  const c = mk('c', 2.0, { fitBiasFree: 0.2, coverage: 0.9, modelProbability: 0.5, impliedProbability: 0.2 });
  const d = mk('d', 1.5, { fitBiasFree: 0.2, coverage: 0.9, modelProbability: 0.5, impliedProbability: 0.3 });
  assert.equal(pickBest([c, d], 1.7)?.id, 'c'); // higher positive disparity wins
});

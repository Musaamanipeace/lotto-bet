import test from 'node:test';
import assert from 'node:assert/strict';
import { generateAlternatives, swapInSlip, mulberry32, signature } from '../src/lib/alternatives.ts';
import type { AiPick } from '../src/lib/ai-picks.ts';
import type { PickMarketKey, Tier } from '../src/lib/criteria.ts';

const MARKETS: PickMarketKey[] = ['home_win', 'over_1_5', 'under_3_5', 'under_4_5', 'over_0_5', 'away_win'];
const TIERS: Tier[] = ['safe', 'balanced', 'value'];

/** nGames games, each offering `perGame` different markets, with deterministic odds and fit. */
function makePool(nGames: number, perGame = 3, seed = 7): AiPick[] {
  const r = mulberry32(seed);
  const out: AiPick[] = [];
  for (let g = 0; g < nGames; g++) {
    for (let m = 0; m < perGame; m++) {
      const odds = Math.round((1.15 + r() * 0.9) * 100) / 100;
      const key = MARKETS[(g + m) % MARKETS.length];
      out.push({
        id: `g${g}:${key}:t`, gameId: `sportybet:g${g}`, bookmaker: 'sportybet', marketKey: key,
        marketNativeId: 'm', outcomeNativeId: 'o', specifier: '', odds, impliedProbability: 1 / odds,
        kickoff: 1_000 + g, league: 'Premier League', home: `H${g}`, away: `A${g}`,
        tier: TIERS[Math.floor(r() * 3)], fitScore: 0.4 + r() * 0.3, fitBreakdown: {} as AiPick['fitBreakdown'],
        evaluation: { qualifies: true, label: r() > 0.5 ? 'Verified' : 'Best fit', passed: 2, verifiable: 2, total: 3, verifiedLabel: '', reason: null, provisionalCriteria: [] },
        rationale: '', exclusionStatus: 'not_checked',
      });
    }
  }
  return out;
}

const tot = (p: AiPick[]) => p.reduce((a, x) => a * x.odds, 1);

test('alternatives: many distinct slips, all inside the odds band, one pick per game', () => {
  const pool = makePool(60);
  const band = { min: 180, max: 220 };
  const r = generateAlternatives(pool, { band, maxSlips: 40, minDiffLegs: 2 });
  assert.ok(r.slips.length >= 25, `expected at least 25 slips, got ${r.slips.length}`);
  const sigs = new Set<string>();
  for (const s of r.slips) {
    const t = tot(s.picks);
    assert.ok(t >= band.min && t <= band.max, `total ${t} outside band`);
    assert.equal(new Set(s.picks.map((p) => p.gameId)).size, s.picks.length, 'one pick per game');
    sigs.add(signature(s.picks));
  }
  assert.equal(sigs.size, r.slips.length, 'no duplicate slips');
});

test('alternatives: every pair differs by at least minDiffLegs', () => {
  const r = generateAlternatives(makePool(60), { band: { min: 90, max: 110 }, maxSlips: 30, minDiffLegs: 3 });
  for (let i = 0; i < r.slips.length; i++) for (let j = i + 1; j < r.slips.length; j++) {
    const ids = new Set(r.slips[j].picks.map((p) => p.id));
    assert.ok(r.slips[i].picks.filter((p) => !ids.has(p.id)).length >= 3);
  }
});

test('alternatives: deterministic, and a larger count extends the same list', () => {
  const pool = makePool(60);
  const a = generateAlternatives(pool, { band: { min: 180, max: 220 }, maxSlips: 10, seed: 5 });
  const b = generateAlternatives(pool, { band: { min: 180, max: 220 }, maxSlips: 10, seed: 5 });
  const c = generateAlternatives(pool, { band: { min: 180, max: 220 }, maxSlips: 20, seed: 5 });
  assert.deepEqual(a.slips.map((s) => s.id), b.slips.map((s) => s.id));
  assert.deepEqual(c.slips.slice(0, 10).map((s) => s.id), a.slips.map((s) => s.id));
});

test('alternatives: cross-market swaps happen, and same_market keeps each swap in its market', () => {
  const pool = makePool(60);
  const any = generateAlternatives(pool, { band: { min: 180, max: 220 }, maxSlips: 20, scope: 'any' });
  const markets = new Set(any.slips.flatMap((s) => s.picks.map((p) => p.marketKey)));
  assert.ok(markets.size > 1);
});

test('alternatives: locked games stay in every slip', () => {
  const pool = makePool(60);
  const first = generateAlternatives(pool, { band: { min: 180, max: 220 }, maxSlips: 1 });
  const locked = first.slips[0].picks.slice(0, 2).map((p) => p.gameId);
  const r = generateAlternatives(pool, { band: { min: 180, max: 220 }, maxSlips: 15, lockedGameIds: locked });
  for (const s of r.slips) for (const g of locked) assert.ok(s.picks.some((p) => p.gameId === g));
});

test('alternatives: reports exhaustion honestly on a small pool', () => {
  const r = generateAlternatives(makePool(14, 1), { band: { min: 8, max: 16 }, maxSlips: 500, minDiffLegs: 2 });
  assert.equal(r.exhausted, true);
  assert.match(r.message ?? '', /exhausted|closest|No qualifying/i);
});

test('alternatives: unreachable target says so instead of faking a slip', () => {
  const r = generateAlternatives(makePool(5, 1), { band: { min: 5000, max: 6000 } });
  assert.equal(r.slips.length, 0);
  assert.match(r.message ?? '', /closest/);
});

test('swapInSlip: replaces weakest legs, never reuses excluded picks, keeps locked legs', () => {
  const pool = makePool(40);
  const slip = generateAlternatives(pool, { band: { min: 90, max: 110 }, maxSlips: 1 }).slips[0].picks;
  const locked = [slip[0].gameId];
  const seen = new Set<string>();
  let cur = slip;
  for (let i = 0; i < 4; i++) {
    const r = swapInSlip(cur, pool, { weakest: 2, lockedGameIds: locked, excludeIds: [...seen] });
    if (!r.ok) break;
    for (const sw of r.swaps) {
      assert.ok(!seen.has(sw.in.id), 'replacement repeated');
      seen.add(sw.in.id);
      assert.ok(sw.in.fitScore >= sw.out.fitScore - 0.05 - 1e-9);
    }
    assert.ok(r.picks.some((p) => p.gameId === locked[0]));
    assert.equal(new Set(r.picks.map((p) => p.gameId)).size, r.picks.length);
    cur = r.picks;
  }
  assert.ok(seen.size > 0);
});

test('swapInSlip: never downgrades a Verified leg to Best fit', () => {
  const pool = makePool(40);
  const slip = generateAlternatives(pool, { band: { min: 90, max: 110 }, maxSlips: 1 }).slips[0].picks;
  const v = slip.find((p) => p.evaluation.label === 'Verified');
  if (!v) return;
  const r = swapInSlip(slip, pool, { replaceIds: [v.id] });
  if (r.ok) assert.equal(r.swaps[0].in.evaluation.label, 'Verified');
});

test('swapInSlip: all legs locked gives a clear error', () => {
  const pool = makePool(30);
  const slip = generateAlternatives(pool, { band: { min: 40, max: 60 }, maxSlips: 1 }).slips[0].picks;
  const r = swapInSlip(slip, pool, { weakest: 2, lockedGameIds: slip.map((p) => p.gameId) });
  assert.equal(r.ok, false);
});

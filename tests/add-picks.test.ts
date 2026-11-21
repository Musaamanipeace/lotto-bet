import test from 'node:test';
import assert from 'node:assert/strict';
import { planAdd, describeReport, type Revalidation } from '../src/lib/add-picks.ts';
import { emptySlip, MAX_LEGS } from '../src/lib/slip.ts';
import type { AiPick } from '../src/lib/ai-picks.ts';

function pick(i: number, o: Partial<AiPick> = {}): AiPick {
  return {
    id: `p${i}`, gameId: `sportybet:ev${i}`, bookmaker: 'sportybet', marketKey: 'over_1_5', marketNativeId: 'm', outcomeNativeId: 'o',
    specifier: '', odds: 1.3, impliedProbability: 0.7, kickoff: 1, league: 'L', home: `H${i}`, away: `A${i}`, tier: 'safe',
    evaluation: { qualifies: true, label: 'Best fit', passed: 1, verifiable: 1, total: 1, verifiedLabel: '', reason: null, provisionalCriteria: [] },
    fitScore: 0.5, fitBreakdown: {} as AiPick['fitBreakdown'], rationale: '', exclusionStatus: 'not_checked', ...o,
  };
}

test('adds exactly N, in order', () => {
  const r = planAdd([1, 2, 3, 4, 5].map((i) => pick(i)), emptySlip(), 3);
  assert.equal(r.report.added, 3);
  assert.deepEqual(r.slip.legs.map((l) => l.gameId), ['sportybet:ev1', 'sportybet:ev2', 'sportybet:ev3']);
});

test('skips games already on the slip and keeps scanning so N is still reached', () => {
  const first = planAdd([pick(1)], emptySlip(), 1).slip;
  const r = planAdd([pick(1, { id: 'dup' }), pick(2), pick(3)], first, 2);
  assert.equal(r.report.added, 2);
  assert.equal(r.report.skipped.length, 1);
  assert.match(r.report.skipped[0].reason, /already in the slip/);
});

test('refuses a different bookmaker than the slip, and says why', () => {
  const first = planAdd([pick(1)], emptySlip(), 1).slip;
  const r = planAdd([pick(2, { bookmaker: 'betpawa', gameId: 'betpawa:ev2' })], first, 1);
  assert.equal(r.report.added, 0);
  assert.match(r.report.skipped[0].reason, /sportybet/);
});

test('never goes past the leg cap', () => {
  const many = Array.from({ length: MAX_LEGS + 10 }, (_, i) => pick(i));
  const r = planAdd(many, emptySlip(), MAX_LEGS + 10);
  assert.equal(r.slip.legs.length, MAX_LEGS);
  assert.equal(r.report.added, MAX_LEGS);
});

test('re-validation: price change is applied and reported, dropped picks are skipped', () => {
  const reval = new Map<string, Revalidation>([
    ['p1', { flag: { kind: 'price_changed', oldOdds: 1.3, newOdds: 1.35, stillInBand: true }, odds: 1.35 }],
    ['p2', { flag: { kind: 'no_longer_qualifies', reason: 'Odds moved to 2.00, outside the safe band' }, odds: 2 }],
    ['p3', { flag: { kind: 'market_gone', reason: 'Market no longer listed' }, odds: 1.3 }],
  ]);
  const r = planAdd([pick(1), pick(2), pick(3), pick(4)], emptySlip(), 3, reval);
  assert.equal(r.report.added, 2);
  assert.equal(r.slip.legs[0].odds, 1.35);
  assert.equal(r.report.priceChanged.length, 1);
  assert.deepEqual(r.report.skipped.map((s) => s.id), ['p2', 'p3']);
});

test('asking for more than exist reports "X of N"', () => {
  const r = planAdd([pick(1), pick(2)], emptySlip(), 5);
  assert.equal(describeReport(r.report), 'Added 2 of 5.');
});

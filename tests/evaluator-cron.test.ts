import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCriteria, type CriterionResult } from '../src/lib/evaluator.ts';
import { checkCronAuth } from '../src/lib/cron-auth.ts';
import { CRITERIA, VERIFICATION } from '../src/lib/criteria.ts';

const c = (...s: CriterionResult['status'][]): CriterionResult[] =>
  s.map((status, i) => ({ id: `c${i}`, label: `c${i}`, status }));

test('unavailable is never a pass', () => {
  const e = evaluateCriteria(c('pass', 'unavailable', 'unavailable', 'unavailable', 'unavailable'), 0.6, 'strict');
  assert.equal(e.qualifies, false);
  assert.equal(e.passed, 1);
  assert.equal(e.label, 'Best fit');
  assert.match(e.verifiedLabel, /^1 of 5/);
});

test('Verified only when enough are verifiable and all verifiable pass', () => {
  const ok = evaluateCriteria(c('pass', 'pass', 'pass', 'unavailable', 'unavailable'), 0.6, 'strict');
  assert.equal(ok.qualifies, true);
  assert.equal(ok.label, 'Verified');

  const low = evaluateCriteria(c('pass', 'pass', 'unavailable', 'unavailable', 'unavailable'), 0.6, 'strict');
  assert.equal(low.qualifies, false);
  assert.equal(low.label, 'Best fit');

  const fail = evaluateCriteria(c('pass', 'pass', 'pass', 'pass', 'fail'), 0.6, 'strict');
  assert.equal(fail.qualifies, false);
});

test('best_fit mode surfaces picks that miss the 60% rule', () => {
  const e = evaluateCriteria(c('pass', 'unavailable', 'unavailable', 'unavailable', 'unavailable'), 0.6, 'best_fit');
  assert.equal(e.qualifies, true);
  assert.equal(e.label, 'Best fit');
  assert.match(e.reason!, /verifiable/);
});

test('threshold is configurable and zero criteria never qualifies', () => {
  assert.equal(evaluateCriteria(c('pass', 'unavailable'), 0.5, 'strict').qualifies, true);
  const none = evaluateCriteria([]);
  assert.equal(none.qualifies, false);
  assert.match(none.reason!, /No criteria are configured/);
});

test('shipped config is configured (provisional thresholds, not awaiting)', () => {
  for (const [market, tiers] of Object.entries(CRITERIA)) {
    for (const [tier, t] of Object.entries(tiers)) {
      assert.equal(t.status, 'configured', `${market}/${tier} should be configured`);
      assert.ok(t.criteria.length > 0, `${market}/${tier} should have criteria`);
    }
  }
  assert.equal(VERIFICATION.mode, 'best_fit');
});

test('cron auth fails closed and rejects wrong secrets', () => {
  assert.equal(checkCronAuth('Bearer x', undefined).ok, false);
  assert.equal(checkCronAuth(null, 's3cret').ok, false);
  assert.equal(checkCronAuth('Bearer wrong!', 's3cret').ok, false);
  assert.equal(checkCronAuth('Bearer s3cret', 's3cret').ok, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCriteria, type CriterionResult } from '../src/lib/evaluator.ts';
import { checkCronAuth } from '../src/lib/cron-auth.ts';
import { CRITERIA } from '../src/lib/criteria.ts';

const c = (...s: CriterionResult['status'][]): CriterionResult[] => s.map((status, i) => ({ id: `c${i}`, label: `c${i}`, status }));

test('unavailable is never a pass', () => {
  const e = evaluateCriteria(c('pass', 'unavailable', 'unavailable', 'unavailable', 'unavailable'));
  assert.equal(e.qualifies, false); assert.equal(e.passed, 1); assert.match(e.label, /^1 of 5/);
});

test('qualifies only when enough are verifiable and all verifiable pass', () => {
  assert.equal(evaluateCriteria(c('pass', 'pass', 'pass', 'unavailable', 'unavailable')).qualifies, true); // 3/5 = 60%
  assert.equal(evaluateCriteria(c('pass', 'pass', 'unavailable', 'unavailable', 'unavailable')).qualifies, false); // 40%
  assert.equal(evaluateCriteria(c('pass', 'pass', 'pass', 'pass', 'fail')).qualifies, false);
});

test('threshold is configurable and zero criteria never qualifies', () => {
  assert.equal(evaluateCriteria(c('pass', 'unavailable'), 0.5).qualifies, true);
  const none = evaluateCriteria([]);
  assert.equal(none.qualifies, false); assert.match(none.reason!, /No criteria are configured/);
});

test('shipped config has no invented thresholds', () => {
  for (const tiers of Object.values(CRITERIA)) for (const t of Object.values(tiers)) {
    assert.equal(t.status, 'awaiting_thresholds'); assert.equal(t.criteria.length, 0);
  }
});

test('cron auth fails closed and rejects wrong secrets', () => {
  assert.equal(checkCronAuth('Bearer x', undefined).ok, false);
  assert.equal(checkCronAuth(null, 's3cret').ok, false);
  assert.equal(checkCronAuth('Bearer wrong!', 's3cret').ok, false);
  assert.equal(checkCronAuth('Bearer s3cret', 's3cret').ok, true);
});

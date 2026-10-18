import test from 'node:test';
import assert from 'node:assert/strict';
import { combinedProbability, impliedProbabilities, slipTotalOdds } from '../src/lib/math.ts';

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test('implied probabilities remove the margin and sum to 1', () => {
  const r = impliedProbabilities([2, 3.5, 3.8]);
  assert.ok(r.ok);
  near(r.probabilities.reduce((a, b) => a + b, 0), 1);
  near(r.overround, 1 / 2 + 1 / 3.5 + 1 / 3.8 - 1);
  near(r.probabilities[0], 0.5 / (1 / 2 + 1 / 3.5 + 1 / 3.8));
});

test('implied probabilities reject partial or invalid markets', () => {
  assert.equal(impliedProbabilities([1.5]).ok, false);
  assert.equal(impliedProbabilities([1.5, 1]).ok, false);
  assert.equal(impliedProbabilities([1.5, NaN]).ok, false);
});

test('slip total odds is the product of legs', () => {
  const r = slipTotalOdds([1.5, 2, 1.2]);
  assert.ok(r.ok); near(r.total, 3.6);
  assert.equal(slipTotalOdds([]).ok, false);
  assert.equal(slipTotalOdds([1.5, 0.9]).ok, false);
});

test('combined probability is the product of leg probabilities', () => {
  const r = combinedProbability([0.8, 0.5, 0.5]);
  assert.ok(r.ok); near(r.probability, 0.2);
  assert.equal(combinedProbability([]).ok, false);
  assert.equal(combinedProbability([0.5, 1.2]).ok, false);
});

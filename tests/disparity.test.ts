import assert from 'node:assert/strict';
import { test } from 'node:test';
import { disparityOf } from '../src/lib/disparity.ts';

test('disparity: sign convention — positive when model higher, negative when lower', () => {
  const d = disparityOf(0.7, 0.4); // model higher
  assert.equal(d.sign, 'positive');
  assert.ok(d.points! > 0);
  const d2 = disparityOf(0.3, 0.6); // model lower
  assert.equal(d2.sign, 'negative');
  assert.ok(d2.points! < 0);
  const d3 = disparityOf(0.5, 0.5);
  assert.equal(d3.sign, null);
});

test('disparity: missing model → reason "Not covered", no flag', () => {
  const d = disparityOf(null, 0.3);
  assert.equal(d.modelProbability, null);
  assert.equal(d.points, null);
  assert.equal(d.label, null);
  assert.equal(d.reason, 'Not covered');
});

test('disparity: mid-range 5 points → notice; 10 → strong', () => {
  // implied 0.5 (mid-range), model 0.55 → +5pts
  const d = disparityOf(0.55, 0.5);
  assert.equal(d.flagged.notice, true, `gap 5 should notice`);
  // implied 0.5, model 0.60 → +10pts
  const d2 = disparityOf(0.6, 0.5);
  assert.equal(d2.flagged.strong, true);
  assert.equal(d2.label, 'Check!');
  // implied 0.5, model 0.53 → +3pts → no flag
  const d3 = disparityOf(0.53, 0.5);
  assert.equal(d3.flagged.notice, false);
  assert.equal(d3.label, null);
});

test('disparity: extremes — loss-chance ratio 1.5 = notice, 2 = strong, either direction', () => {
  // p = 0.9 (market loss 0.1). model loss 0.19 → ratio 1.9 → notice.
  const d = disparityOf(0.81, 0.9);
  assert.equal(d.flagged.notice, true);
  // model loss 0.21 → ratio 2.1 → strong.
  const d2 = disparityOf(0.79, 0.9);
  assert.equal(d2.flagged.strong, true);
  assert.equal(d2.label, 'Check!');
  // model loss 0.1 → ratio 1.0 → no flag.
  const d3 = disparityOf(0.9, 0.9);
  assert.equal(d3.flagged.notice, false);
  // p = 0.95, model 0.85 → model loss 0.15, market loss 0.05 → ratio 3 → strong.
  const d4 = disparityOf(0.85, 0.95);
  assert.equal(d4.flagged.strong, true);
  assert.equal(d4.sign, 'negative');
});

test('disparity: certain-market disagreement → strong', () => {
  const d = disparityOf(0.3, 1.0); // market says certain, model disagrees
  assert.equal(d.flagged.strong, true);
  assert.equal(d.sign, 'negative');
});

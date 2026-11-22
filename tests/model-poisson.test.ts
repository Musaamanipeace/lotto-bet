import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  estimate1x2,
  estimateBtts,
  estimateDoubleChance,
  estimateOverUnder,
  poissonPmf,
  scorelineMatrix,
} from '../src/lib/model/poisson.ts';

// Matrix is truncated at 10 goals; allow small truncation error.
const close = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

test('Poisson: 1X2 sums to 1', () => {
  const m = scorelineMatrix(1.4, 0.9);
  const { home, draw, away } = estimate1x2(m);
  assert.ok(close(home + draw + away, 1, 1e-6), `sum=${home + draw + away}`);
});

test('Poisson: matrix is independent (rows sum to the home pmf)', () => {
  const m = scorelineMatrix(2.0, 1.2);
  for (let h = 0; h <= 10; h++) {
    const s = m[h].reduce((a, b) => a + b, 0);
    assert.ok(close(s, poissonPmf(2.0, h), 0.01), `h=${h} sum=${s}`);
  }
});

test('Poisson: over and under of one line sum to 1', () => {
  const m = scorelineMatrix(1.6, 1.1);
  for (const line of [0.5, 1.5, 2.5, 3.5]) {
    const { over, under } = estimateOverUnder(m, line);
    assert.ok(close(over + under, 1, 0.01), `line=${line} sum=${over + under}`);
  }
});

test('Poisson: double chance equals the right sums', () => {
  const m = scorelineMatrix(1.5, 1.4);
  const { home, draw, away } = estimate1x2(m);
  const { dc1x, dcx2, dc12 } = estimateDoubleChance(m);
  assert.ok(close(dc1x, home + draw));
  assert.ok(close(dcx2, away + draw));
  assert.ok(close(dc12, 1 - draw));
  assert.ok(close(dc1x + dcx2 + dc12, 2, 0.02), `sum=${dc1x + dcx2 + dc12}`);
  assert.ok(dc12 >= 0 && dc12 <= 1);
});

test('Poisson: BTTS sums to 1', () => {
  const m = scorelineMatrix(1.3, 1.7);
  const { yes, no } = estimateBtts(m);
  assert.ok(close(yes + no, 1, 0.01));
  assert.ok(yes > 0 && no > 0);
});

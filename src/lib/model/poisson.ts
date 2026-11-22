/**
 * Poisson scoreline model (poisson-v1).
 * From the competition's HOME and AWAY standings tables (see strengths.ts):
 * lambda_home = H_avg * attH * defA; lambda_away = A_avg * attA * defH.
 * Independent Poisson over the scoreline matrix 0..10 goals.
 */
export type ScorelineMatrix = number[][]; // [homeScore][awayScore], 0..10

export const MAX_GOALS = 10;

/** Poisson pmf: P(X = x) = e^-λ · λ^x / x!, x = 0, 1, 2, ... */
export function poissonPmf(lambda: number, x: number): number {
  if (!Number.isFinite(lambda) || lambda < 0) return 0;
  if (!Number.isInteger(x) || x < 0) return 0;
  let term = Math.exp(-lambda);
  for (let k = 1; k <= x; k++) {
    term = (term * lambda) / k;
  }
  return term;
}

/** Independent home/away scoreline matrix: matrix[h][a] = P(H=h, A=a). */
export function scorelineMatrix(lambdaHome: number, lambdaAway: number): ScorelineMatrix {
  const ph: number[] = [];
  const pa: number[] = [];
  for (let x = 0; x <= MAX_GOALS; x++) {
    ph.push(poissonPmf(lambdaHome, x));
    pa.push(poissonPmf(lambdaAway, x));
  }
  return ph.map((h, i) => pa.map((a, j) => h * a));
}

/** 1X2 (home win / draw / away win) from the matrix. */
export function estimate1x2(m: ScorelineMatrix): { home: number; draw: number; away: number } {
  let home = 0;
  let draw = 0;
  let away = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = m[h][a];
      if (h > a) home += p;
      else if (a > h) away += p;
      else draw += p;
    }
  }
  return { home, draw, away };
}

/** Over/under of an integer/half line from the matrix. */
export function estimateOverUnder(m: ScorelineMatrix, line: number): { over: number; under: number } {
  let over = 0;
  let under = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = m[h][a];
      if (h + a > line) over += p;
      else under += p;
    }
  }
  return { over, under };
}

/** Double chance: 1X (home wins or draws), X2 (away wins or draws), 12 (not a draw). */
export function estimateDoubleChance(m: ScorelineMatrix): { dc1x: number; dc12: number; dcx2: number; draw: number } {
  const { home, draw, away } = estimate1x2(m);
  return { dc1x: home + draw, dcx2: away + draw, dc12: 1 - draw, draw };
}

/** Both Teams To Score (BTTS). */
export function estimateBtts(m: ScorelineMatrix): { yes: number; no: number } {
  let yes = 0;
  let no = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = m[h][a];
      if (h > 0 && a > 0) yes += p;
      else no += p;
    }
  }
  return { yes, no };
}

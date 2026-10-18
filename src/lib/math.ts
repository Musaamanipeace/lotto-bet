import { fail, ok, type Result } from './result.ts';

/**
 * Implied probabilities with the bookmaker margin removed (proportional normalisation).
 * Needs the COMPLETE outcome set of one market; a partial set would give wrong numbers.
 */
export function impliedProbabilities(
  odds: number[],
): Result<{ probabilities: number[]; overround: number }> {
  if (odds.length < 2) return fail('Need at least 2 outcomes to remove the margin');
  if (odds.some((o) => !Number.isFinite(o) || o <= 1)) {
    return fail('Every outcome must have decimal odds greater than 1');
  }
  const raw = odds.map((o) => 1 / o);
  const sum = raw.reduce((a, b) => a + b, 0);
  return ok({ probabilities: raw.map((p) => p / sum), overround: sum - 1 });
}

export function slipTotalOdds(odds: number[]): Result<{ total: number }> {
  if (odds.length === 0) return fail('A slip needs at least one leg');
  if (odds.some((o) => !Number.isFinite(o) || o <= 1)) {
    return fail('Every leg must have decimal odds greater than 1');
  }
  return ok({ total: odds.reduce((a, b) => a * b, 1) });
}

/** Product of leg probabilities. Shown as-is, never as "likely to win". */
export function combinedProbability(probabilities: number[]): Result<{ probability: number }> {
  if (probabilities.length === 0) return fail('A slip needs at least one leg');
  if (probabilities.some((p) => !Number.isFinite(p) || p <= 0 || p > 1)) {
    return fail('Every probability must be in (0, 1]');
  }
  return ok({ probability: probabilities.reduce((a, b) => a * b, 1) });
}

import type { PickRow } from './filters.ts';
import { fail, ok, type Result } from './result.ts';

export const MAX_RANDOM_PICKS = 50;

/**
 * The ONLY place in the codebase allowed to use randomness (the guests' explicit "random picks"
 * feature; a test enforces this). One random pick per game, never two legs from the same game.
 * Returns how many were requested vs actually available so the UI can say so; it never pads.
 */
export function randomPicks(
  pool: PickRow[],
  count: number,
  rng: () => number = Math.random,
): Result<{ picks: PickRow[]; requested: number; available: number }> {
  if (!Number.isInteger(count) || count < 1 || count > MAX_RANDOM_PICKS) {
    return fail(`Pick a whole number of games between 1 and ${MAX_RANDOM_PICKS}`);
  }
  const byGame = new Map<string, PickRow[]>();
  for (const r of pool) byGame.set(r.gameId, [...(byGame.get(r.gameId) ?? []), r]);
  const games = [...byGame.values()];
  for (let i = games.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [games[i], games[j]] = [games[j], games[i]];
  }
  const picks = games.slice(0, count).map((rows) => rows[Math.floor(rng() * rows.length)]);
  return ok({ picks, requested: count, available: games.length });
}

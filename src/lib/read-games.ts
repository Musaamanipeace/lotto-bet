import { fail, ok, type Result } from './result.ts';
import type { Store } from './store.ts';
import { SPORTS, type Game, type Sport } from './types.ts';

export type SportError = { sport: Sport; error: string; httpStatus?: number };

/**
 * Pages read stored data from the LATEST finished run only, per sport. A sport whose fetch failed
 * in that run contributes an explicit error, never older games (and never another sport's games).
 */
export async function readGames(
  store: Store,
  sport?: Sport,
): Promise<Result<{ runId: string; dataAsOf: number; games: Game[]; errors: SportError[] }>> {
  const run = await store.latestRun();
  if (!run || !run.results || run.finishedAt === null) {
    return fail('No data has been fetched yet. Run the refresh first.');
  }
  const wanted: Sport[] = sport ? [sport] : SPORTS;
  const games: Game[] = [];
  const errors: SportError[] = [];
  for (const s of wanted) {
    const r = run.results[s];
    if (!r || !r.ok) {
      errors.push({ sport: s, error: r && !r.ok ? `Failed to fetch ${s} games: ${r.error}` : `No fetch result for ${s}`, httpStatus: r && !r.ok ? r.httpStatus : undefined });
      continue;
    }
    games.push(...(await store.gamesForRun(run.id, s)));
  }
  if (sport && errors.length) {
    return fail(errors[0].error, { sport, httpStatus: errors[0].httpStatus });
  }
  return ok({ runId: run.id, dataAsOf: run.finishedAt, games, errors });
}

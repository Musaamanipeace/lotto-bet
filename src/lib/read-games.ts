import { fail, ok, type Result } from './result.ts';
import type { Store } from './store.ts';
import { BOOKMAKER_LABEL, type Bookmaker, type Game } from './types.ts';

export type BookmakerError = { bookmaker: Bookmaker; error: string; httpStatus?: number };

/**
 * Pages read stored data from the LATEST finished run only. A bookmaker whose fetch failed in that
 * run contributes an explicit error, never older games.
 */
export async function readGames(
  store: Store,
  bookmaker?: Bookmaker,
): Promise<Result<{ runId: string; dataAsOf: number; games: Game[]; errors: BookmakerError[] }>> {
  const run = await store.latestRun();
  if (!run || !run.results || run.finishedAt === null) {
    return fail('No data has been fetched yet. Run the refresh first.');
  }
  const wanted: Bookmaker[] = bookmaker ? [bookmaker] : ['sportybet', 'betpawa'];
  const games: Game[] = [];
  const errors: BookmakerError[] = [];
  for (const b of wanted) {
    const r = run.results[b];
    if (!r.ok) { errors.push({ bookmaker: b, error: `Failed to fetch games for ${BOOKMAKER_LABEL[b]}: ${r.error}`, httpStatus: r.httpStatus }); continue; }
    games.push(...(await store.gamesForRun(run.id, b)));
  }
  if (bookmaker && errors.length) {
    return fail(errors[0].error, { bookmaker, httpStatus: errors[0].httpStatus });
  }
  return ok({ runId: run.id, dataAsOf: run.finishedAt, games, errors });
}

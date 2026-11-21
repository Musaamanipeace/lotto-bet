import { fail, ok, type Result } from './result.ts';
import { BOOKMAKER_LABEL, type Bookmaker, type Game, type Skipped } from './types.ts';

export type GamesResult = Result<{ games: Game[]; skipped: Skipped[] }>;
export type GameFetchers = Record<Bookmaker, () => Promise<GamesResult>>;

/**
 * Bookmaker isolation: only the requested bookmaker's fetcher runs. A failure is returned as-is
 * (real message + status). Never falls back to another bookmaker, stale data or an empty success.
 */
export async function getGamesForBookmaker(b: Bookmaker, fetchers: GameFetchers): Promise<GamesResult> {
  const r = await fetchers[b]();
  if (!r.ok) {
    return fail(`Failed to fetch games for ${BOOKMAKER_LABEL[b]}: ${r.error}`, { ...r.details, bookmaker: b });
  }
  const foreign = r.games.filter((g) => g.bookmaker !== b || g.markets.some((m) => m.bookmaker !== b || m.outcomes.some((o) => o.bookmaker !== b)));
  if (foreign.length > 0) {
    return fail(`Bookmaker isolation violated: ${foreign.length} record(s) not from ${BOOKMAKER_LABEL[b]}`, { bookmaker: b });
  }
  return ok({ games: r.games, skipped: r.skipped });
}

export const filterByBookmaker = (games: Game[], b: Bookmaker) => games.filter((g) => g.bookmaker === b);

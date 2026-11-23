import type { Game, Skipped, Sport } from './types.ts';

export type UpstreamRunResult =
  | { ok: true; count: number; outsideWindow: number; skipped: Skipped[] }
  | { ok: false; error: string; httpStatus?: number };

/**
 * One result per sport, stored verbatim on fetch_runs.results. Each sport is fetched and
 * recorded independently: a failed sport never replaces another sport's games with stale data.
 */
export type RunResults = Record<Sport, UpstreamRunResult>;

export type RunKind = 'daily' | 'lineup_refresh' | 'manual';
export type RunRecord = { id: string; kind: RunKind; startedAt: number; finishedAt: number | null; results: RunResults | null };

export interface Store {
  createRun(kind: RunKind): Promise<string>;
  finishRun(id: string, results: RunResults): Promise<void>;
  saveGames(runId: string, games: Game[]): Promise<void>;
  /** Latest FINISHED run, or null if none has ever completed. */
  latestRun(): Promise<RunRecord | null>;
  /** All games of one sport from a given run (SportyBet is the only bookmaker). */
  gamesForRun(runId: string, sport: Sport): Promise<Game[]>;
}

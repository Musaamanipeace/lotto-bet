import type { GameMatch } from './matching.ts';
import type { Bookmaker, Game, Skipped } from './types.ts';

export type UpstreamRunResult =
  | { ok: true; count: number; outsideWindow: number; skipped: Skipped[] }
  | { ok: false; error: string; httpStatus?: number };

export type RunResults = {
  sportybet: UpstreamRunResult;
  betpawa: UpstreamRunResult;
  matching:
    | { ok: true; matched: number; unmatchedSporty: number; unmatchedBetpawa: number }
    | { ok: false; error: string };
};

export type RunKind = 'daily' | 'lineup_refresh' | 'manual';
export type RunRecord = { id: string; kind: RunKind; startedAt: number; finishedAt: number | null; results: RunResults | null };

export interface Store {
  createRun(kind: RunKind): Promise<string>;
  finishRun(id: string, results: RunResults): Promise<void>;
  saveGames(runId: string, games: Game[]): Promise<void>;
  saveMatches(runId: string, matches: GameMatch[]): Promise<void>;
  /** Latest FINISHED run, or null if none has ever completed. */
  latestRun(): Promise<RunRecord | null>;
  gamesForRun(runId: string, bookmaker: Bookmaker): Promise<Game[]>;
}

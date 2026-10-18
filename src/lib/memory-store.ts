/**
 * In-memory Store used when DATABASE_URL is not set (local/dev).
 * Survives for the lifetime of the Node process only.
 */
import type { GameMatch } from './matching.ts';
import type { RunKind, RunRecord, RunResults, Store } from './store.ts';
import type { Bookmaker, Game } from './types.ts';

export class MemoryStore implements Store {
  private runs: RunRecord[] = [];
  private games = new Map<string, Game[]>();
  private matches = new Map<string, GameMatch[]>();
  private clock = Date.now();

  async createRun(kind: RunKind): Promise<string> {
    const id = `mem-${this.runs.length + 1}-${this.clock++}`;
    this.runs.push({ id, kind, startedAt: Date.now(), finishedAt: null, results: null });
    return id;
  }

  async finishRun(id: string, results: RunResults): Promise<void> {
    const r = this.runs.find((x) => x.id === id);
    if (!r) throw new Error(`Unknown run ${id}`);
    r.results = results;
    r.finishedAt = Date.now();
  }

  async saveGames(runId: string, games: Game[]): Promise<void> {
    const existing = this.games.get(runId) ?? [];
    this.games.set(runId, [...existing, ...games]);
  }

  async saveMatches(runId: string, matches: GameMatch[]): Promise<void> {
    this.matches.set(runId, matches);
  }

  async latestRun(): Promise<RunRecord | null> {
    const done = this.runs.filter((r) => r.finishedAt !== null);
    return done.at(-1) ?? null;
  }

  async gamesForRun(runId: string, bookmaker: Bookmaker): Promise<Game[]> {
    return (this.games.get(runId) ?? []).filter((g) => g.bookmaker === bookmaker);
  }
}

/** Singleton used across requests in the same process. */
let shared: MemoryStore | null = null;
export function getMemoryStore(): MemoryStore {
  return (shared ??= new MemoryStore());
}

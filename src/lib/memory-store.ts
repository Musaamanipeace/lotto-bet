/**
 * In-memory Store used when DATABASE_URL is not set (local/dev).
 * Survives for the lifetime of the Node process only.
 */
import type { RunKind, RunRecord, RunResults, Store } from './store.ts';
import type { Game, Sport } from './types.ts';

export class MemoryStore implements Store {
  private runs: RunRecord[] = [];
  private games = new Map<string, Game[]>();
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

  async latestRun(): Promise<RunRecord | null> {
    const done = this.runs.filter((r) => r.finishedAt !== null);
    return done.at(-1) ?? null;
  }

  async gamesForRun(runId: string, sport: Sport): Promise<Game[]> {
    return (this.games.get(runId) ?? []).filter((g) => g.sport === sport);
  }
}

/**
 * Singleton used across requests in the same process. Kept on globalThis because Next.js (dev and
 * some builds) can load a module once per route, which would give each route its own empty store.
 */
const g = globalThis as unknown as { __lottoMemoryStore?: MemoryStore };
export function getMemoryStore(): MemoryStore {
  return (g.__lottoMemoryStore ??= new MemoryStore());
}

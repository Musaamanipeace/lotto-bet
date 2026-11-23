// TEST-ONLY in-memory Store. Never imported by app code.
import type { RunKind, RunRecord, RunResults, Store } from '../src/lib/store.ts';
import type { Game, Sport } from '../src/lib/types.ts';

export class MemoryStore implements Store {
  runs: RunRecord[] = [];
  games = new Map<string, Game[]>();
  clock = 1000;
  failSave = false;
  async createRun(kind: RunKind) { const id = `run${this.runs.length + 1}`; this.runs.push({ id, kind, startedAt: this.clock++, finishedAt: null, results: null }); return id; }
  async finishRun(id: string, results: RunResults) { const r = this.runs.find((x) => x.id === id)!; r.results = results; r.finishedAt = this.clock++; }
  async saveGames(runId: string, games: Game[]) { if (this.failSave) throw new Error('disk full'); this.games.set(runId, [...(this.games.get(runId) ?? []), ...games]); }
  async latestRun() { const done = this.runs.filter((r) => r.finishedAt !== null); return done.at(-1) ?? null; }
  async gamesForRun(runId: string, sport: Sport) { return (this.games.get(runId) ?? []).filter((g) => g.sport === sport); }
}

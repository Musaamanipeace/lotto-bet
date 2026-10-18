/**
 * Load latest games from the store and generate + cache AI picks.
 * Called after a successful pipeline run and on demand from /api/ai/*.
 */
import { generateAiPicks, type AiEngineResult } from './ai-engine.ts';
import { saveAiSnapshot, getAiSnapshot, type AiSnapshot } from './ai-store.ts';
import { fail, ok, type Result } from './result.ts';
import type { Store } from './store.ts';
import type { Bookmaker, Game } from './types.ts';

export async function runAiGeneration(store: Store): Promise<Result<AiSnapshot>> {
  const run = await store.latestRun();
  if (!run) {
    return fail('No finished fetch run yet. Refresh games first.');
  }

  const bookmakers: Bookmaker[] = ['sportybet', 'betpawa'];
  const games: Game[] = [];
  for (const b of bookmakers) {
    const batch = await store.gamesForRun(run.id, b);
    games.push(...batch);
  }

  if (games.length === 0) {
    return fail('Latest run has no games. Refresh games first.');
  }

  const result: AiEngineResult = await generateAiPicks(games);
  const snap = saveAiSnapshot(result, run.id);
  return ok(snap);
}

/** Return cached snapshot, or generate if missing. */
export async function ensureAiSnapshot(store: Store): Promise<Result<AiSnapshot>> {
  const existing = getAiSnapshot();
  if (existing && existing.picks.length > 0) return ok(existing);
  return runAiGeneration(store);
}

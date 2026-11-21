/**
 * AI picks lifecycle.
 *
 * Generation (runAiGeneration) happens after a fetch run, from the daily cron, or when a signed-in
 * user presses "Regenerate AI". It NEVER waits on slow upstreams: stats providers get a wait budget
 * of AI_STATS_MAX_WAIT_MS (default 0), so a missed stat is marked not_fetched and the run finishes.
 *
 * Everything else (chat, picks, slips, swap, ...) only READS the saved snapshot (loadAiSnapshot), so a
 * user request can never turn into minutes of generation.
 */
import { generateAiPicks, type AiEngineResult } from './ai-engine.ts';
import { saveAiSnapshot, getAiSnapshot, type AiSnapshot } from './ai-store.ts';
import { fail, ok, type Result } from './result.ts';
import type { Store } from './store.ts';
import type { Bookmaker, Game } from './types.ts';

/**
 * Serverless instances do not share memory, so in production the games and picks must live in
 * Postgres. Returns the reason when that is not the case, otherwise null.
 */
export function storageProblem(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.DATABASE_URL) return null;
  if (env.NODE_ENV === 'production' && env.ALLOW_MEMORY_STORE !== '1') {
    return 'DATABASE_URL is not set. On serverless hosting each request can run on a different instance, so games and AI picks kept in memory are lost between requests. Add a Postgres DATABASE_URL to the project environment variables and redeploy (set ALLOW_MEMORY_STORE=1 only for a single long-running server).';
  }
  return null;
}

export async function runAiGeneration(store: Store, env: NodeJS.ProcessEnv = process.env): Promise<Result<AiSnapshot>> {
  const problem = storageProblem(env);
  if (problem) return fail(problem, { code: 'storage_not_configured' });

  const run = await store.latestRun();
  if (!run) return fail('No finished fetch run yet. Refresh games first.', { code: 'no_fetch_run' });

  const bookmakers: Bookmaker[] = ['sportybet', 'betpawa'];
  const games: Game[] = [];
  for (const b of bookmakers) games.push(...(await store.gamesForRun(run.id, b)));
  if (games.length === 0) return fail('Latest run has no games. Refresh games first.', { code: 'no_games' });

  const wait = Number(env.AI_STATS_MAX_WAIT_MS);
  const result: AiEngineResult = await generateAiPicks(games, { statsWaitMs: Number.isFinite(wait) && wait > 0 ? wait : 0 });
  try {
    return ok(await saveAiSnapshot(result, run.id));
  } catch (e) {
    return fail(`AI picks were generated but could not be saved: ${e instanceof Error ? e.message : String(e)}`, { code: 'snapshot_save_failed' });
  }
}

/** Read-only: the saved snapshot, or a failure that says exactly what to do next. Never generates. */
export async function loadAiSnapshot(env: NodeJS.ProcessEnv = process.env): Promise<Result<AiSnapshot>> {
  const problem = storageProblem(env);
  if (problem) return fail(problem, { code: 'storage_not_configured' });
  let snap: AiSnapshot | null;
  try {
    snap = await getAiSnapshot();
  } catch (e) {
    return fail(`Could not read saved AI picks: ${e instanceof Error ? e.message : String(e)}`, { code: 'snapshot_read_failed' });
  }
  if (!snap || snap.picks.length === 0) {
    return fail(snap ? 'The saved AI snapshot has no picks. Regenerate AI after refreshing games.' : 'No AI picks have been generated yet. Press Regenerate AI (or refresh games first if no games have been fetched).', { code: 'no_snapshot' });
  }
  return ok(snap);
}

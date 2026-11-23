import { fail, ok, type Result } from './result.ts';
import type { GamesResult } from './games.ts';
import type { RunKind, RunResults, Store, UpstreamRunResult } from './store.ts';
import { SPORTS, type Game, type Skipped, type Sport } from './types.ts';

export type PipelineDeps = {
  store: Store;
  /** One fetcher per sport; each is given the run id so every record carries the run that produced it. */
  fetchers: Record<Sport, (fetchRunId: string) => Promise<GamesResult>>;
  kind: RunKind;
  horizonDays?: number; // default 7
  now?: () => number;
};

/** Runs one sport's fetcher without ever letting a throw escape to the other sports. */
async function safeFetch(fn: (fetchRunId: string) => Promise<GamesResult>, fetchRunId: string): Promise<GamesResult> {
  try {
    return await fn(fetchRunId);
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

/**
 * Fetch each sport independently (try/catch per sport), keep only games inside [now, now+horizon],
 * store them, and record one result per sport. A failure in one sport is reported in that sport's
 * result only; never substituted with data from an earlier run or from another sport.
 */
export async function runPipeline(deps: PipelineDeps): Promise<Result<{ runId: string; results: RunResults }>> {
  const now = deps.now ?? Date.now;
  const horizon = (deps.horizonDays ?? 7) * 24 * 3600 * 1000;
  let runId: string;
  try { runId = await deps.store.createRun(deps.kind); }
  catch (e) { return fail(`Could not create fetch run: ${msg(e)}`); }

  try {
    const fetched = await Promise.all(
      SPORTS.map(async (sport) => [sport, await safeFetch(deps.fetchers[sport], runId)] as const),
    );
    const t = now();
    const results = {} as RunResults;

    for (const [sport, r] of fetched) {
      if (!r.ok) {
        results[sport] = { ok: false, error: r.error, ...(r.details.httpStatus !== undefined ? { httpStatus: r.details.httpStatus as number } : {}) };
        continue;
      }
      const inWindow = r.games.filter((g) => g.kickoff >= t && g.kickoff <= t + horizon);
      // Storage errors are NOT a fetch failure: let them escape so the whole run fails loudly.
      await deps.store.saveGames(runId, inWindow);
      results[sport] = summarize(inWindow, r.games.length, r.skipped);
    }

    await deps.store.finishRun(runId, results);
    return ok({ runId, results });
  } catch (e) {
    return fail(`Pipeline run ${runId} failed while storing results: ${msg(e)}`);
  }
}

function summarize(inWindow: Game[], fetched: number, skipped: Skipped[]): UpstreamRunResult {
  return { ok: true, count: inWindow.length, outsideWindow: fetched - inWindow.length, skipped };
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

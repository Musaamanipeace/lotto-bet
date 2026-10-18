import { matchGames } from './matching.ts';
import { fail, ok, type Result } from './result.ts';
import type { GamesResult } from './games.ts';
import type { RunKind, RunResults, Store, UpstreamRunResult } from './store.ts';
import type { Bookmaker, Game } from './types.ts';

export type PipelineDeps = {
  store: Store;
  /** Each fetcher is given the run id so every record carries the run that produced it. */
  fetchers: Record<Bookmaker, (fetchRunId: string) => Promise<GamesResult>>;
  kind: RunKind;
  horizonDays?: number; // default 7
  now?: () => number;
};

/**
 * Fetch from each bookmaker independently, keep only games inside [now, now+horizon], store them,
 * match betPawa to SportyBet only when BOTH fetched. One bookmaker failing never affects the other,
 * and nothing from an earlier run is substituted. The outcome of every step is recorded on the run.
 */
export async function runPipeline(deps: PipelineDeps): Promise<Result<{ runId: string; results: RunResults }>> {
  const now = deps.now ?? Date.now;
  const horizon = (deps.horizonDays ?? 7) * 24 * 3600 * 1000;
  let runId: string;
  try { runId = await deps.store.createRun(deps.kind); }
  catch (e) { return fail(`Could not create fetch run: ${msg(e)}`); }

  try {
    const [sp, bp] = await Promise.all([deps.fetchers.sportybet(runId), deps.fetchers.betpawa(runId)]);
    const t = now();
    const kept: Partial<Record<Bookmaker, Game[]>> = {};
    const summarize = async (b: Bookmaker, r: GamesResult): Promise<UpstreamRunResult> => {
      if (!r.ok) return { ok: false, error: r.error, httpStatus: r.details.httpStatus };
      const inWindow = r.games.filter((g) => g.kickoff >= t && g.kickoff <= t + horizon);
      await deps.store.saveGames(runId, inWindow);
      kept[b] = inWindow;
      return { ok: true, count: inWindow.length, outsideWindow: r.games.length - inWindow.length, skipped: r.skipped };
    };
    const sportybet = await summarize('sportybet', sp);
    const betpawa = await summarize('betpawa', bp);

    let matching: RunResults['matching'];
    if (kept.sportybet && kept.betpawa) {
      const m = matchGames(kept.sportybet, kept.betpawa);
      await deps.store.saveMatches(runId, m.matches);
      matching = { ok: true, matched: m.matches.length, unmatchedSporty: m.unmatchedSporty.length, unmatchedBetpawa: m.unmatchedBetpawa.length };
    } else {
      matching = { ok: false, error: 'Matching needs games from both bookmakers; at least one fetch failed' };
    }
    const results: RunResults = { sportybet, betpawa, matching };
    await deps.store.finishRun(runId, results);
    return ok({ runId, results });
  } catch (e) {
    return fail(`Pipeline run ${runId} failed while storing results: ${msg(e)}`);
  }
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

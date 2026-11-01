import { ok, fail, type Result } from './result.ts';
import type { MissingState } from './data-state.ts';
import { FootballDataProvider } from './fd-provider.ts';
import { miss, type MetricOutcome, type MetricRequest, type StatsProvider } from './stats-types.ts';

export { hit, miss } from './stats-types.ts';
export type { MetricOutcome, MetricRequest, Side, StatsProvider } from './stats-types.ts';

/**
 * Stats providers plug in here. A metric a provider cannot supply comes back as a
 * `missing` outcome with a state and a reason, never an estimate.
 *
 * Free sources:
 * - football-data.org: standings (overall/home/away) and a team's recent finished matches
 *   -> win rates, form, rank, goals, over/under rates, rest days. Implemented in fd-provider.ts.
 * - API-Football free (~100 req/day): cards/fouls/corners. NOT implemented: no cards or corners
 *   market is generated yet, so nothing would use it. Those metrics report `not_fetched`.
 * - xG / PPDA / field tilt / box touches: not offered by any free source.
 */

/** Metrics that free tiers can realistically supply. */
export const FREE_METRICS = new Set([
  'home_win_rate', 'away_win_rate', 'unbeaten_home_rate', 'no_draw_rate', 'form_points', 'rest_days', 'league_rank',
  'goals_scored_avg', 'goals_conceded_avg', 'over_1_5_rate', 'under_3_5_rate', 'under_4_5_rate',
  'fouls_avg', 'cards_avg', 'corners_won_avg', 'corners_conceded_avg', 'corners_combined_avg',
]);

/** Always unavailable on free data – listed so cards can show the reason. */
export const UNAVAILABLE_ON_FREE = new Set([
  'xg_home', 'xg_away', 'ppda', 'field_tilt', 'box_touches', 'shot_creating_actions', 'fast_break_shots',
]);

/** Metrics that need API-Football (per-fixture statistics). */
export const API_FOOTBALL_METRICS = new Set(['fouls_avg', 'cards_avg', 'corners_won_avg', 'corners_conceded_avg', 'corners_combined_avg']);

export const NOT_OFFERED_REASON =
  'No free data source offers this stat (xG, PPDA and similar are paid-only).';

/** Used when no API key is set: every metric is "not fetched", with the fix spelled out. */
class NullStatsProvider implements StatsProvider {
  readonly name = 'null';
  supports(_metric: string): boolean { return true; }
  async fetch(req: MetricRequest): Promise<MetricOutcome> {
    if (UNAVAILABLE_ON_FREE.has(req.metric)) return miss('not_offered', NOT_OFFERED_REASON, this.name);
    return miss('not_fetched', 'No stats provider configured. Set FOOTBALL_DATA_API_KEY to fetch real stats.', this.name);
  }
}

let fdSingleton: { key: string; provider: FootballDataProvider } | null = null;

/** Providers that are configured (have a key) or the null fallback. Instances are reused so caches persist. */
export function configuredProviders(env: NodeJS.ProcessEnv = process.env): StatsProvider[] {
  const providers: StatsProvider[] = [];
  if (env.FOOTBALL_DATA_API_KEY) {
    if (!fdSingleton || fdSingleton.key !== env.FOOTBALL_DATA_API_KEY) {
      fdSingleton = { key: env.FOOTBALL_DATA_API_KEY, provider: new FootballDataProvider(env) };
    }
    providers.push(fdSingleton.provider);
  }
  if (providers.length === 0) providers.push(new NullStatsProvider());
  return providers;
}

/** Resolve one metric with a precise reason whenever it is missing. */
export async function fetchMetricDetailed(
  req: MetricRequest,
  providers: StatsProvider[] = configuredProviders(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<MetricOutcome> {
  if (UNAVAILABLE_ON_FREE.has(req.metric)) return miss('not_offered', NOT_OFFERED_REASON);

  const supporting = providers.filter((p) => p.supports(req.metric));
  if (supporting.length === 0) {
    if (API_FOOTBALL_METRICS.has(req.metric)) {
      return miss(
        'not_fetched',
        env.API_FOOTBALL_KEY
          ? 'API-Football integration is not built yet (no cards/corners markets are generated), so this stat is never requested.'
          : 'Needs API-Football (API_FOOTBALL_KEY), which is not set and not built yet.',
      );
    }
    return miss('not_fetched', 'No configured provider supplies this stat.');
  }

  let firstMiss: MetricOutcome | null = null;
  for (const p of supporting) {
    const r = await p.fetch(req);
    if (r.ok) return r;
    firstMiss ??= r;
  }
  return firstMiss!;
}

/** Legacy shape kept for callers that only need a value or null. */
export async function fetchMetric(
  req: MetricRequest,
  providers: StatsProvider[] = configuredProviders(),
): Promise<Result<{ value: number | null; provider?: string }>> {
  const r = await fetchMetricDetailed(req, providers);
  if (r.ok) return ok({ value: r.value, provider: r.provider });
  if (r.state === 'fetch_failed') return fail(r.reason);
  return ok({ value: null });
}

export function beginStatsRun(providers: StatsProvider[] = configuredProviders()): void {
  for (const p of providers) p.beginRun?.();
}

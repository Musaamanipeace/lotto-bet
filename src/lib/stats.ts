import { ok, fail, type Result } from './result.ts';

/**
 * Stats providers plug in here.
 * A metric the provider cannot supply must come back as
 * { ok: true, value: null } (unavailable) or a failure — never an estimate.
 *
 * Free sources (design §3):
 * - football-data.org: fixtures, results, standings, H2H (rate-limited)
 * - API-Football free: shots, fouls, cards, corners, lineups (≈100 req/day)
 * - xG / PPDA / field tilt / box touches: always unavailable
 */

export type MetricRequest = {
  metric: string;
  teamIds?: string[];
  window?: number;
  fixtureId?: string;
  league?: string;
};

export interface StatsProvider {
  readonly name: string;
  supports(metric: string): boolean;
  fetchMetric(req: MetricRequest): Promise<Result<{ value: number | null }>>;
}

/** Metrics that free tiers can realistically supply. */
export const FREE_METRICS = new Set([
  'home_win_rate',
  'away_win_rate',
  'unbeaten_home_rate',
  'no_draw_rate',
  'form_points',
  'rest_days',
  'league_rank',
  'goals_scored_avg',
  'goals_conceded_avg',
  'over_1_5_rate',
  'under_3_5_rate',
  'under_4_5_rate',
  'fouls_avg',
  'cards_avg',
  'corners_won_avg',
  'corners_conceded_avg',
  'corners_combined_avg',
]);

/** Always unavailable on free data – listed so cards can show the reason. */
export const UNAVAILABLE_ON_FREE = new Set([
  'xg_home',
  'xg_away',
  'ppda',
  'field_tilt',
  'box_touches',
  'shot_creating_actions',
  'fast_break_shots',
]);

/**
 * Stub provider used when no API keys are configured.
 * Returns unavailable for every metric so the pipeline still runs and
 * picks are labeled Best fit with clear "N of M criteria verified".
 */
class NullStatsProvider implements StatsProvider {
  readonly name = 'null';
  supports(_metric: string): boolean {
    return true;
  }
  async fetchMetric(req: MetricRequest): Promise<Result<{ value: number | null }>> {
    if (UNAVAILABLE_ON_FREE.has(req.metric)) {
      return ok({ value: null }); // explicitly unavailable
    }
    // No real source configured
    return ok({ value: null });
  }
}

/**
 * football-data.org free-tier skeleton.
 * Wire FOOTBALL_DATA_API_KEY and implement the real HTTP calls when ready.
 * Until then it behaves like the null provider for unimplemented metrics.
 */
class FootballDataOrgProvider implements StatsProvider {
  readonly name = 'football-data.org';
  private key: string | undefined;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.key = env.FOOTBALL_DATA_API_KEY;
  }

  supports(metric: string): boolean {
    return (
      FREE_METRICS.has(metric) &&
      !['fouls_avg', 'cards_avg', 'corners_won_avg', 'corners_conceded_avg', 'corners_combined_avg'].includes(metric)
    );
  }

  async fetchMetric(req: MetricRequest): Promise<Result<{ value: number | null }>> {
    if (!this.key) {
      return ok({ value: null });
    }
    if (UNAVAILABLE_ON_FREE.has(req.metric)) {
      return ok({ value: null });
    }
    // TODO: implement real calls against https://api.football-data.org/v4
    // Rate limit: 10 req/min on free tier. Cache per team/run.
    return ok({ value: null });
  }
}

/**
 * API-Football free-tier skeleton (≈100 requests/day).
 * Prefer for cards, corners, fouls, lineups close to kickoff.
 */
class ApiFootballProvider implements StatsProvider {
  readonly name = 'api-football';
  private key: string | undefined;
  private budgetRemaining: number;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.key = env.API_FOOTBALL_KEY;
    this.budgetRemaining = Number(env.API_FOOTBALL_DAILY_BUDGET || 80);
  }

  supports(metric: string): boolean {
    return [
      'fouls_avg',
      'cards_avg',
      'corners_won_avg',
      'corners_conceded_avg',
      'corners_combined_avg',
      'rest_days',
    ].includes(metric);
  }

  async fetchMetric(req: MetricRequest): Promise<Result<{ value: number | null }>> {
    if (!this.key) return ok({ value: null });
    if (this.budgetRemaining <= 0) {
      return fail('API-Football daily request budget exhausted');
    }
    if (UNAVAILABLE_ON_FREE.has(req.metric)) return ok({ value: null });
    // TODO: implement real calls; decrement budgetRemaining on success.
    return ok({ value: null });
  }
}

/** Providers that are configured (have a key) or the null fallback. */
export function configuredProviders(env: NodeJS.ProcessEnv = process.env): StatsProvider[] {
  const providers: StatsProvider[] = [];
  if (env.FOOTBALL_DATA_API_KEY) providers.push(new FootballDataOrgProvider(env));
  if (env.API_FOOTBALL_KEY) providers.push(new ApiFootballProvider(env));
  if (providers.length === 0) providers.push(new NullStatsProvider());
  return providers;
}

/**
 * Fetch a single metric from the first provider that supports it.
 * Returns { value: null } when every provider reports unavailable.
 */
export async function fetchMetric(
  req: MetricRequest,
  providers: StatsProvider[] = configuredProviders(),
): Promise<Result<{ value: number | null; provider?: string }>> {
  for (const p of providers) {
    if (!p.supports(req.metric)) continue;
    const r = await p.fetchMetric(req);
    if (!r.ok) return r;
    if (r.value.value !== null) return ok({ value: r.value.value, provider: p.name });
  }
  return ok({ value: null });
}

import { FootballDataProvider } from './fd-provider.ts';
import {
  hit,
  miss,
  type MetricOutcome,
  type MetricRequest,
  type StatsProvider,
} from './stats-types.ts';
import { getDecryptedUserKeys } from './user-settings-store.ts';

export { type MetricOutcome, type MetricRequest, type StatsProvider };

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

let activeProviders: StatsProvider[] | null = null;

/** Merge user-stored BYOK keys (server-decrypted) into a provider env. */
function envWithStoredKeys(
  env: NodeJS.ProcessEnv,
  keys: Partial<Record<'football_data' | 'api_football', string>>,
): NodeJS.ProcessEnv {
  return {
    ...env,
    FOOTBALL_DATA_API_KEY: keys.football_data ?? env.FOOTBALL_DATA_API_KEY,
    API_FOOTBALL_KEY: keys.api_football ?? env.API_FOOTBALL_KEY,
  };
}

function configureProviders(env: NodeJS.ProcessEnv): StatsProvider[] {
  const list: StatsProvider[] = [];
  list.push(new FootballDataProvider(env));
  activeProviders = list;
  return list;
}

/** Providers from env vars only (legacy / non-user path). */
export function configuredProviders(env?: NodeJS.ProcessEnv): StatsProvider[] {
  return configureProviders(envWithStoredKeys(env ?? process.env, {}));
}

/**
 * Providers for a signed-in user: their server-decrypted BYOK keys
 * (`user_api_keys`) override the env vars (BYOK with account-saved keys).
 */
export async function configuredProvidersForUser(userId: string, env?: NodeJS.ProcessEnv): Promise<StatsProvider[]> {
  const keys = await getDecryptedUserKeys(userId);
  return configureProviders(envWithStoredKeys(env ?? process.env, keys));
}

/**
 * Fetch a single metric from the first provider that supports it.
 * Returns a MetricOutcome.
 */
export async function fetchMetric(
  req: MetricRequest,
  providers: StatsProvider[] = activeProviders ?? configuredProviders(),
): Promise<MetricOutcome> {
  for (const p of providers) {
    if (!p.supports(req.metric)) continue;
    const r = await p.fetch(req);
    return r;
  }
  return miss('not_offered', `No provider supports metric ${req.metric}`);
}

/**
 * Single config file for tiers, odds bands, league priority, verification rules,
 * provisional thresholds, fit-score weights and accumulator mixes.
 *
 * Free-data build (design §3, §14):
 * - Numbers stated in the original spec are used exactly.
 * - Everything else uses provisional league-relative or placeholder values and is
 *   marked `provisional: true` so cards can show the flag.
 * - xG-type metrics stay unavailable on free tiers; no proxies are invented.
 * - Corners is a new market (not in original spec); bands and criteria are placeholders.
 */

export type Tier = 'safe' | 'balanced' | 'value';
export const TIERS: Tier[] = ['safe', 'balanced', 'value'];

export const TIER_LABEL: Record<Tier, string> = {
  safe: 'Lower Risk (Safe)',
  balanced: 'Balanced (Default)',
  value: 'Higher Risk (Value)',
};

export type PickMarketKey =
  | 'over_0_5'
  | 'over_1_5'
  | 'under_4_5'
  | 'under_3_5'
  | 'home_win'
  | 'away_win'
  | 'double_chance_1x'
  | 'double_chance_12'
  | 'cards_over'
  | 'cards_under'
  | 'corners_over'
  | 'corners_under';

export type OddsBand = { min: number; max: number };

/** Odds bands. Corners copy Cards until real bands are supplied. */
export const ODDS_BANDS: Record<PickMarketKey, Record<Tier, OddsBand>> = {
  over_0_5:         { safe: { min: 1.02, max: 1.05 }, balanced: { min: 1.04, max: 1.12 }, value: { min: 1.12, max: 1.18 } },
  over_1_5:         { safe: { min: 1.15, max: 1.22 }, balanced: { min: 1.25, max: 1.40 }, value: { min: 1.42, max: 1.60 } },
  under_4_5:        { safe: { min: 1.05, max: 1.09 }, balanced: { min: 1.10, max: 1.22 }, value: { min: 1.22, max: 1.35 } },
  under_3_5:        { safe: { min: 1.18, max: 1.26 }, balanced: { min: 1.30, max: 1.45 }, value: { min: 1.48, max: 1.65 } },
  home_win:         { safe: { min: 1.25, max: 1.45 }, balanced: { min: 1.50, max: 1.85 }, value: { min: 1.90, max: 2.25 } },
  away_win:         { safe: { min: 1.40, max: 1.62 }, balanced: { min: 1.70, max: 2.10 }, value: { min: 2.15, max: 2.60 } },
  double_chance_1x: { safe: { min: 1.10, max: 1.18 }, balanced: { min: 1.20, max: 1.35 }, value: { min: 1.38, max: 1.55 } },
  double_chance_12: { safe: { min: 1.12, max: 1.18 }, balanced: { min: 1.22, max: 1.38 }, value: { min: 1.40, max: 1.55 } },
  cards_over:       { safe: { min: 1.25, max: 1.38 }, balanced: { min: 1.40, max: 1.65 }, value: { min: 1.68, max: 1.90 } },
  cards_under:      { safe: { min: 1.18, max: 1.28 }, balanced: { min: 1.35, max: 1.55 }, value: { min: 1.58, max: 1.80 } },
  // PROVISIONAL – copied from cards until real corner bands are supplied
  corners_over:     { safe: { min: 1.25, max: 1.38 }, balanced: { min: 1.40, max: 1.65 }, value: { min: 1.68, max: 1.90 } },
  corners_under:    { safe: { min: 1.18, max: 1.28 }, balanced: { min: 1.35, max: 1.55 }, value: { min: 1.58, max: 1.80 } },
};

export type Criterion = {
  id: string;
  label: string;
  /** Rolling window in matches. */
  window: number | null;
  comparator: 'min' | 'max' | 'between' | null;
  threshold: number | [number, number] | null;
  /** True when the number is a provisional / league-relative placeholder. */
  provisional?: boolean;
  /**
   * Metric key expected from a StatsProvider.
   * Metrics that free sources cannot supply (xG, PPDA, field tilt, …) stay
   * unavailable and never count as a pass.
   */
  metric?: string;
};

export type TierCriteria = {
  status: 'awaiting_thresholds' | 'configured';
  criteria: Criterion[];
};

/** League-relative cut-offs (design §3): best ~30 % / 40 % / 50 % of teams. */
export const LEAGUE_RELATIVE = {
  safe: 0.30,
  balanced: 0.40,
  value: 0.50,
} as const;

function c(
  id: string,
  label: string,
  window: number | null,
  comparator: 'min' | 'max' | 'between' | null,
  threshold: number | [number, number] | null,
  opts: { provisional?: boolean; metric?: string } = {},
): Criterion {
  return { id, label, window, comparator, threshold, ...opts };
}

/** Home-win rate ≥ 80 % (stated in original spec) – used exactly. */
const HOME_WIN_80 = c('home_win_rate_80', 'Home won ≥ 80 % of last N at home', 8, 'min', 0.8, {
  metric: 'home_win_rate',
});

const AWAY_WIN_RATE = c('away_win_rate', 'Away win rate above league median (provisional)', 8, 'min', 0.45, {
  provisional: true,
  metric: 'away_win_rate',
});

const FORM_POINTS = c('form_points', 'Points from last 5 matches (provisional)', 5, 'min', 9, {
  provisional: true,
  metric: 'form_points',
});

const REST_DAYS = c('rest_days', 'Rest days ≥ 3 (provisional)', null, 'min', 3, {
  provisional: true,
  metric: 'rest_days',
});

const LEAGUE_RANK = c('league_rank', 'League rank in top half (provisional)', null, 'max', 10, {
  provisional: true,
  metric: 'league_rank',
});

const GOALS_SCORED = c('goals_scored_avg', 'Goals scored / match above league median (provisional)', 6, 'min', 1.4, {
  provisional: true,
  metric: 'goals_scored_avg',
});

const GOALS_CONCEDED = c('goals_conceded_avg', 'Goals conceded / match below league median (provisional)', 6, 'max', 1.2, {
  provisional: true,
  metric: 'goals_conceded_avg',
});

const OVER_1_5_RATE = c('over_1_5_rate', 'Over 1.5 rate ≥ 70 % (provisional)', 8, 'min', 0.7, {
  provisional: true,
  metric: 'over_1_5_rate',
});

const UNDER_3_5_RATE = c('under_3_5_rate', 'Under 3.5 rate ≥ 65 % (provisional)', 8, 'min', 0.65, {
  provisional: true,
  metric: 'under_3_5_rate',
});

const FOULS_AVG = c('fouls_avg', 'Combined fouls / match (provisional)', 6, 'min', 22, {
  provisional: true,
  metric: 'fouls_avg',
});

const CARDS_AVG = c('cards_avg', 'Combined cards / match (provisional)', 6, 'min', 4.0, {
  provisional: true,
  metric: 'cards_avg',
});

const CORNERS_WON = c('corners_won_avg', 'Corners won / match (provisional)', 6, 'min', 5.0, {
  provisional: true,
  metric: 'corners_won_avg',
});

const CORNERS_CONCEDED = c('corners_conceded_avg', 'Corners conceded / match (provisional)', 6, 'max', 5.5, {
  provisional: true,
  metric: 'corners_conceded_avg',
});

/** xG-type metrics – always unavailable on free data; listed so the card can show them. */
const XG_HOME = c('xg_home', 'xG (home) – unavailable on free data', 6, 'min', null, {
  provisional: true,
  metric: 'xg_home',
});
const XG_AWAY = c('xg_away', 'xG (away) – unavailable on free data', 6, 'min', null, {
  provisional: true,
  metric: 'xg_away',
});
const PPDA = c('ppda', 'PPDA – unavailable on free data', 6, 'max', null, {
  provisional: true,
  metric: 'ppda',
});

function configured(criteria: Criterion[]): TierCriteria {
  return { status: 'configured', criteria };
}

/**
 * Criteria per market × tier.
 * Stated numbers (e.g. home win ≥ 80 %) are exact.
 * All others are provisional and flagged.
 */
export const CRITERIA: Record<PickMarketKey, Record<Tier, TierCriteria>> = {
  home_win: {
    safe: configured([HOME_WIN_80, FORM_POINTS, REST_DAYS, LEAGUE_RANK, GOALS_CONCEDED]),
    balanced: configured([HOME_WIN_80, FORM_POINTS, LEAGUE_RANK]),
    value: configured([c('home_win_rate_60', 'Home won ≥ 60 % of last N at home', 6, 'min', 0.6, { metric: 'home_win_rate' }), FORM_POINTS]),
  },
  away_win: {
    safe: configured([AWAY_WIN_RATE, FORM_POINTS, REST_DAYS, LEAGUE_RANK, GOALS_CONCEDED]),
    balanced: configured([AWAY_WIN_RATE, FORM_POINTS, LEAGUE_RANK]),
    value: configured([AWAY_WIN_RATE, FORM_POINTS]),
  },
  double_chance_1x: {
    safe: configured([
      c('unbeaten_home', 'Unbeaten rate at home ≥ 85 % (provisional)', 8, 'min', 0.85, { provisional: true, metric: 'unbeaten_home_rate' }),
      FORM_POINTS,
      REST_DAYS,
    ]),
    balanced: configured([
      c('unbeaten_home', 'Unbeaten rate at home ≥ 70 % (provisional)', 8, 'min', 0.7, { provisional: true, metric: 'unbeaten_home_rate' }),
      FORM_POINTS,
    ]),
    value: configured([
      c('unbeaten_home', 'Unbeaten rate at home ≥ 55 % (provisional)', 6, 'min', 0.55, { provisional: true, metric: 'unbeaten_home_rate' }),
    ]),
  },
  double_chance_12: {
    safe: configured([
      c('no_draw_rate', 'No-draw rate ≥ 75 % (provisional)', 8, 'min', 0.75, { provisional: true, metric: 'no_draw_rate' }),
      FORM_POINTS,
    ]),
    balanced: configured([
      c('no_draw_rate', 'No-draw rate ≥ 60 % (provisional)', 8, 'min', 0.6, { provisional: true, metric: 'no_draw_rate' }),
    ]),
    value: configured([
      c('no_draw_rate', 'No-draw rate ≥ 50 % (provisional)', 6, 'min', 0.5, { provisional: true, metric: 'no_draw_rate' }),
    ]),
  },
  over_0_5: {
    // Most criteria need xG → many will be unavailable → Best fit often
    safe: configured([OVER_1_5_RATE, GOALS_SCORED, XG_HOME, XG_AWAY]),
    balanced: configured([OVER_1_5_RATE, GOALS_SCORED, XG_HOME]),
    value: configured([OVER_1_5_RATE, GOALS_SCORED]),
  },
  over_1_5: {
    safe: configured([OVER_1_5_RATE, GOALS_SCORED, FORM_POINTS]),
    balanced: configured([OVER_1_5_RATE, GOALS_SCORED]),
    value: configured([OVER_1_5_RATE]),
  },
  under_3_5: {
    safe: configured([UNDER_3_5_RATE, GOALS_CONCEDED, FORM_POINTS, PPDA]),
    balanced: configured([UNDER_3_5_RATE, GOALS_CONCEDED]),
    value: configured([UNDER_3_5_RATE]),
  },
  under_4_5: {
    safe: configured([
      c('under_4_5_rate', 'Under 4.5 rate ≥ 80 % (provisional)', 8, 'min', 0.8, { provisional: true, metric: 'under_4_5_rate' }),
      GOALS_CONCEDED,
    ]),
    balanced: configured([
      c('under_4_5_rate', 'Under 4.5 rate ≥ 70 % (provisional)', 8, 'min', 0.7, { provisional: true, metric: 'under_4_5_rate' }),
    ]),
    value: configured([
      c('under_4_5_rate', 'Under 4.5 rate ≥ 60 % (provisional)', 6, 'min', 0.6, { provisional: true, metric: 'under_4_5_rate' }),
    ]),
  },
  cards_over: {
    safe: configured([CARDS_AVG, FOULS_AVG]),
    balanced: configured([CARDS_AVG]),
    value: configured([CARDS_AVG]),
  },
  cards_under: {
    safe: configured([
      c('cards_avg_low', 'Combined cards / match ≤ 3.5 (provisional)', 6, 'max', 3.5, { provisional: true, metric: 'cards_avg' }),
      FOULS_AVG,
    ]),
    balanced: configured([
      c('cards_avg_low', 'Combined cards / match ≤ 4.0 (provisional)', 6, 'max', 4.0, { provisional: true, metric: 'cards_avg' }),
    ]),
    value: configured([
      c('cards_avg_low', 'Combined cards / match ≤ 4.5 (provisional)', 6, 'max', 4.5, { provisional: true, metric: 'cards_avg' }),
    ]),
  },
  corners_over: {
    safe: configured([CORNERS_WON, CORNERS_CONCEDED, GOALS_SCORED]),
    balanced: configured([CORNERS_WON, CORNERS_CONCEDED]),
    value: configured([CORNERS_WON]),
  },
  corners_under: {
    safe: configured([
      c('corners_combined_low', 'Combined corners ≤ line (provisional)', 6, 'max', 9.0, { provisional: true, metric: 'corners_combined_avg' }),
      CORNERS_CONCEDED,
    ]),
    balanced: configured([
      c('corners_combined_low', 'Combined corners ≤ line (provisional)', 6, 'max', 10.0, { provisional: true, metric: 'corners_combined_avg' }),
    ]),
    value: configured([
      c('corners_combined_low', 'Combined corners ≤ line (provisional)', 6, 'max', 11.0, { provisional: true, metric: 'corners_combined_avg' }),
    ]),
  },
};

export const VERIFICATION = {
  /** A pick is "Verified" only if ≥ this fraction of criteria are verifiable AND all pass. */
  minVerifiableFraction: 0.6,
  oddsBandsAloneAreNotVerification: true,
  /**
   * best_fit (default for free-data build): picks that miss the 60 % rule still appear
   * labeled "Best fit". strict: only Verified picks are stored.
   */
  mode: 'best_fit' as 'best_fit' | 'strict',
} as const;

export const EXCLUSION = {
  lineupWindowHours: 2,
  congestionMatches: 3,
  congestionDays: 7,
} as const;

export const MATCHING = { teamSimilarityThreshold: 0.72 } as const;

/** Lower index = higher priority. */
export const LEAGUE_PRIORITY: string[][] = [
  ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'],
  ['Championship', 'Eredivisie', 'Primeira Liga', 'Belgian Pro League', 'Pro League'],
  ['MLS', 'Brasileirão Série A', 'Serie A Brazil', 'Liga Profesional'],
];

/** Fit-score component weights (provisional – tune from settled results). */
export const FIT_SCORE_WEIGHTS = {
  tierPlacement: 0.15,
  impliedProbability: 0.25,
  criteriaPassShare: 0.30,
  leaguePriority: 0.15,
  cardsCornersData: 0.05,
  failedCriteriaPenalty: -0.10,
  congestionPenalty: -0.10,
} as const;

/** Accumulator composition (design §4). */
export const ACCUMULATOR = {
  /** Default mix: core % / booster %. */
  defaultMix: { core: 0.75, booster: 0.25 },
  lowerRiskMix: { core: 0.90, booster: 0.10 },
  higherRiskMix: { core: 0.60, booster: 0.40 },
  /** "Lower risk" label if boosters ≤ this fraction of legs. */
  lowerRiskBoosterCap: 0.10,
  maxLegs: 50,
  maxStored25PlusSlips: 5,
} as const;

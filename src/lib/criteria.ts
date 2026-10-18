/**
 * Single config file for tiers, odds bands, league priority and verification rules.
 *
 * ASSUMPTION (also in README): the source text lost its >= / <= symbols. Over, win and
 * card-over thresholds are treated as MINIMUMS; Under and card-under thresholds as MAXIMUMS.
 *
 * The per-market numeric criteria (windows + thresholds) are NOT filled in here: the original
 * numbers were lost and must be supplied from the source document. They are left explicitly
 * empty (`criteria: []`, `status: 'awaiting_thresholds'`) rather than invented.
 */
export type Tier = 'safe' | 'balanced' | 'value';
export const TIERS: Tier[] = ['safe', 'balanced', 'value'];

export const TIER_LABEL: Record<Tier, string> = {
  safe: 'Lower Risk (Safe)',
  balanced: 'Balanced (Default)',
  value: 'Higher Risk (Value)',
};

export type PickMarketKey =
  | 'over_0_5' | 'over_1_5' | 'under_4_5' | 'under_3_5'
  | 'home_win' | 'away_win' | 'double_chance_1x' | 'double_chance_12'
  | 'cards_over' | 'cards_under';

export type OddsBand = { min: number; max: number };

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
};

export type Criterion = {
  id: string;
  label: string;
  /** Rolling window in matches (null until supplied). */
  window: number | null;
  comparator: 'min' | 'max' | 'between' | null;
  /** null = not supplied yet. NEVER invent a value. */
  threshold: number | [number, number] | null;
};

export type TierCriteria = {
  status: 'awaiting_thresholds' | 'configured';
  criteria: Criterion[];
};

const awaiting: TierCriteria = { status: 'awaiting_thresholds', criteria: [] };
export const CRITERIA: Record<PickMarketKey, Record<Tier, TierCriteria>> = Object.fromEntries(
  (Object.keys(ODDS_BANDS) as PickMarketKey[]).map((m) => [
    m,
    { safe: awaiting, balanced: awaiting, value: awaiting },
  ]),
) as Record<PickMarketKey, Record<Tier, TierCriteria>>;

export const VERIFICATION = {
  /** A pick qualifies only if at least this fraction of its criteria are verifiable. */
  minVerifiableFraction: 0.6,
  oddsBandsAloneAreNotVerification: true,
} as const;

export const EXCLUSION = {
  /** Discard if GK, primary CB or top scorer/creator is out within this many hours of kickoff. */
  lineupWindowHours: 2,
  /** Avoid "Safe" legs on teams playing a third match within this many days. */
  congestionMatches: 3,
  congestionDays: 7,
} as const;

export const MATCHING = { teamSimilarityThreshold: 0.72 } as const;

/** Lower index = higher priority. Other leagues only pass if picks pass the same checks. */
export const LEAGUE_PRIORITY: string[][] = [
  ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'],
  ['Championship', 'Eredivisie', 'Primeira Liga', 'Belgian Pro League', 'Pro League'],
  ['MLS', 'Brasileirão Série A', 'Serie A Brazil', 'Liga Profesional'],
];

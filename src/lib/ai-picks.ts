/**
 * Deterministic ranking, fit scoring and accumulator composition.
 * The LLM never decides what qualifies; it only chooses among IDs that
 * this module has already validated (design §2, §4).
 */
import {
  ACCUMULATOR,
  FIT_SCORE_WEIGHTS,
  LEAGUE_PRIORITY,
  type PickMarketKey,
  type Tier,
} from './criteria.ts';
import type { Evaluation, PickLabel } from './evaluator.ts';

export type AiPick = {
  id: string;
  gameId: string;
  bookmaker: string;
  marketKey: PickMarketKey;
  marketNativeId: string;
  outcomeNativeId: string;
  specifier: string;
  odds: number;
  impliedProbability: number;
  kickoff: number;
  league: string | null;
  home: string;
  away: string;
  tier: Tier;
  evaluation: Evaluation;
  fitScore: number;
  fitBreakdown: FitBreakdown;
  rationale: string;
  exclusionStatus: 'cleared' | 'not_checked' | 'excluded';
  exclusionNote?: string;
};

export type FitBreakdown = {
  tierPlacement: number;
  impliedProbability: number;
  criteriaPassShare: number;
  leaguePriority: number;
  cardsCornersData: number;
  failedCriteriaPenalty: number;
  congestionPenalty: number;
};

/** League priority rank (0 = highest). Unknown leagues get a high index. */
export function leaguePriorityIndex(league: string | null): number {
  if (!league) return LEAGUE_PRIORITY.length;
  const lower = league.toLowerCase();
  for (let i = 0; i < LEAGUE_PRIORITY.length; i++) {
    if (LEAGUE_PRIORITY[i].some((l) => lower.includes(l.toLowerCase()) || l.toLowerCase().includes(lower))) {
      return i;
    }
  }
  return LEAGUE_PRIORITY.length;
}

/**
 * Deterministic fit score in [0, 1] (can go slightly negative from penalties).
 * Components are stored so weights can be tuned later against settled results.
 */
export function computeFitScore(input: {
  oddsInBand: boolean;
  impliedProbability: number;
  evaluation: Evaluation;
  league: string | null;
  hasCardsOrCornersData: boolean;
  congestionFlag: boolean;
}): { score: number; breakdown: FitBreakdown } {
  const w = FIT_SCORE_WEIGHTS;
  const passShare = input.evaluation.total > 0 ? input.evaluation.passed / input.evaluation.total : 0;
  const leagueIdx = leaguePriorityIndex(input.league);
  const leagueScore = 1 - leagueIdx / Math.max(LEAGUE_PRIORITY.length, 1);

  const breakdown: FitBreakdown = {
    tierPlacement: input.oddsInBand ? 1 : 0,
    impliedProbability: Math.min(1, Math.max(0, input.impliedProbability)),
    criteriaPassShare: passShare,
    leaguePriority: leagueScore,
    cardsCornersData: input.hasCardsOrCornersData ? 1 : 0,
    failedCriteriaPenalty: input.evaluation.total - input.evaluation.passed - (input.evaluation.total - input.evaluation.verifiable) > 0 ? 1 : 0,
    congestionPenalty: input.congestionFlag ? 1 : 0,
  };

  const score =
    w.tierPlacement * breakdown.tierPlacement +
    w.impliedProbability * breakdown.impliedProbability +
    w.criteriaPassShare * breakdown.criteriaPassShare +
    w.leaguePriority * breakdown.leaguePriority +
    w.cardsCornersData * breakdown.cardsCornersData +
    w.failedCriteriaPenalty * breakdown.failedCriteriaPenalty +
    w.congestionPenalty * breakdown.congestionPenalty;

  return { score, breakdown };
}

/**
 * Ranking order (design §4):
 * 1. Verified before Best fit
 * 2. League priority
 * 3. Higher fit score
 * 4. Earlier kickoff
 */
export function rankAiPicks(picks: AiPick[]): AiPick[] {
  return [...picks].sort((a, b) => {
    if (a.evaluation.label !== b.evaluation.label) {
      return a.evaluation.label === 'Verified' ? -1 : 1;
    }
    const la = leaguePriorityIndex(a.league);
    const lb = leaguePriorityIndex(b.league);
    if (la !== lb) return la - lb;
    if (a.fitScore !== b.fitScore) return b.fitScore - a.fitScore;
    return a.kickoff - b.kickoff;
  });
}

export type RiskLabel = 'lower risk' | 'higher risk';

export type AccumulatorSlip = {
  id: string;
  picks: AiPick[];
  totalOdds: number;
  combinedImpliedProbability: number;
  riskLabel: RiskLabel;
  coreCount: number;
  boosterCount: number;
  createdAt: number;
};

function productOdds(picks: AiPick[]): number {
  return picks.reduce((acc, p) => acc * p.odds, 1);
}

function productImplied(picks: AiPick[]): number {
  return picks.reduce((acc, p) => acc * p.impliedProbability, 1);
}

/**
 * Build one accumulator from core (Safe then Balanced) + boosters (Value).
 * One pick per game, max ACCUMULATOR.maxLegs.
 */
export function composeAccumulator(
  ranked: AiPick[],
  targetLegs: number,
  mix: { core: number; booster: number } = ACCUMULATOR.defaultMix,
): AccumulatorSlip | null {
  const maxLegs = Math.min(targetLegs, ACCUMULATOR.maxLegs);
  if (maxLegs < 1 || ranked.length === 0) return null;

  const usedGames = new Set<string>();
  const corePool = ranked.filter((p) => p.tier === 'safe' || p.tier === 'balanced');
  const boosterPool = ranked.filter((p) => p.tier === 'value');

  const coreTarget = Math.round(maxLegs * mix.core);
  const boosterTarget = maxLegs - coreTarget;

  const selected: AiPick[] = [];

  for (const p of corePool) {
    if (selected.length >= coreTarget) break;
    if (usedGames.has(p.gameId)) continue;
    selected.push(p);
    usedGames.add(p.gameId);
  }

  for (const p of boosterPool) {
    if (selected.length >= maxLegs) break;
    if (selected.filter((s) => s.tier === 'value').length >= boosterTarget && selected.length >= coreTarget) break;
    if (usedGames.has(p.gameId)) continue;
    selected.push(p);
    usedGames.add(p.gameId);
  }

  // Fill remaining slots from any remaining ranked picks
  for (const p of ranked) {
    if (selected.length >= maxLegs) break;
    if (usedGames.has(p.gameId)) continue;
    selected.push(p);
    usedGames.add(p.gameId);
  }

  if (selected.length === 0) return null;

  const boosterCount = selected.filter((p) => p.tier === 'value').length;
  const coreCount = selected.length - boosterCount;
  const riskLabel: RiskLabel =
    boosterCount / selected.length <= ACCUMULATOR.lowerRiskBoosterCap ? 'lower risk' : 'higher risk';

  return {
    id: `slip_${Date.now()}_${selected.length}`,
    picks: selected,
    totalOdds: productOdds(selected),
    combinedImpliedProbability: productImplied(selected),
    riskLabel,
    coreCount,
    boosterCount,
    createdAt: Date.now(),
  };
}

/** Build up to N 25+ game slips, stopping when quality runs out. */
export function build25PlusSlips(ranked: AiPick[], maxSlips = ACCUMULATOR.maxStored25PlusSlips): AccumulatorSlip[] {
  const slips: AccumulatorSlip[] = [];
  let remaining = [...ranked];

  for (let i = 0; i < maxSlips; i++) {
    const slip = composeAccumulator(remaining, 25, ACCUMULATOR.defaultMix);
    if (!slip || slip.picks.length < 25) break;
    slips.push(slip);
    const used = new Set(slip.picks.map((p) => p.gameId));
    remaining = remaining.filter((p) => !used.has(p.gameId));
  }
  return slips;
}

/** Three risk variants for "pick N games". */
export function pickNGames(
  ranked: AiPick[],
  n: number,
): { lower: AccumulatorSlip | null; average: AccumulatorSlip | null; higher: AccumulatorSlip | null } {
  return {
    lower: composeAccumulator(ranked, n, ACCUMULATOR.lowerRiskMix),
    average: composeAccumulator(ranked, n, ACCUMULATOR.defaultMix),
    higher: composeAccumulator(ranked, n, ACCUMULATOR.higherRiskMix),
  };
}

/**
 * Closest Safe-tier slip to a target odds (log-scale distance).
 * Ties broken by higher combined implied probability.
 */
export function pickTargetOdds(
  ranked: AiPick[],
  targetOdds: number,
): { slip: AccumulatorSlip | null; achieved: number; gap: number; message?: string } {
  const safeOnly = ranked.filter((p) => p.tier === 'safe');
  if (safeOnly.length === 0) {
    return { slip: null, achieved: 0, gap: targetOdds, message: 'No Safe-tier picks available.' };
  }

  // Greedy: keep adding highest-fit safe picks until we pass or hit cap
  const used = new Set<string>();
  const selected: AiPick[] = [];
  let odds = 1;

  for (const p of safeOnly) {
    if (selected.length >= ACCUMULATOR.maxLegs) break;
    if (used.has(p.gameId)) continue;
    const next = odds * p.odds;
    // Prefer not overshooting too far; still add if under target
    if (odds < targetOdds || selected.length === 0) {
      selected.push(p);
      used.add(p.gameId);
      odds = next;
    }
  }

  if (selected.length === 0) {
    return { slip: null, achieved: 0, gap: targetOdds, message: 'No Safe-tier picks available.' };
  }

  const slip = composeAccumulator(selected, selected.length, { core: 1, booster: 0 })!;
  const gap = Math.abs(slip.totalOdds - targetOdds);
  const message =
    slip.totalOdds < targetOdds
      ? `The highest odds available from verified safe picks are ${slip.totalOdds.toFixed(2)}.`
      : undefined;

  return { slip, achieved: slip.totalOdds, gap, message };
}

/** Template rationale from stored criteria results (never LLM). */
export function buildRationale(evaluation: Evaluation, marketKey: PickMarketKey): string {
  const parts: string[] = [];
  if (evaluation.label === 'Verified') {
    parts.push(`Verified: ${evaluation.verifiedLabel}.`);
  } else {
    parts.push(`Best fit: ${evaluation.verifiedLabel}.`);
    if (evaluation.reason) parts.push(evaluation.reason);
  }
  if (evaluation.provisionalCriteria.length > 0) {
    parts.push(`Provisional thresholds used for: ${evaluation.provisionalCriteria.join(', ')}.`);
  }
  parts.push(`Market: ${marketKey}.`);
  return parts.join(' ');
}

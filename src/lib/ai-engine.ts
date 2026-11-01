/**
 * Full deterministic AI pipeline step:
 * games → candidates → criteria evaluation → fit score → rank → slips.
 * Stats that free providers cannot supply come back unavailable → Best fit labels.
 */
import {
  CRITERIA,
  type PickMarketKey,
  type Tier,
  VERIFICATION,
} from './criteria.ts';
import {
  type AiPick,
  type AccumulatorSlip,
  build25PlusSlips,
  buildRationale,
  composeAccumulator,
  computeFitScore,
  leaguePriorityIndex,
  pickNGames,
  pickTargetOdds,
  pickTargetOddsTiers,
  rankAiPicks,
} from './ai-picks.ts';
import { generateCandidates, type RawCandidate } from './candidates.ts';
import {
  evaluateCriteria,
  type CriterionResult,
  NO_STATS_PROVIDER_MESSAGE,
} from './evaluator.ts';
import { emptyStateCounts, type DataState, type StateCounts } from './data-state.ts';
import { beginStatsRun, configuredProviders, fetchMetricDetailed, UNAVAILABLE_ON_FREE, NOT_OFFERED_REASON } from './stats.ts';
import type { Side } from './stats-types.ts';
import type { Game } from './types.ts';

/** What data the engine actually had, so the UI can say "not offered" vs "not fetched" vs "failed". */
export type DataCoverage = {
  criteriaTotal: number;
  byState: StateCounts;
  topReasons: { state: DataState; reason: string; count: number }[];
  candidatesTotal: number;
  /** Candidates with at least one criterion backed by real data. */
  candidatesWithData: number;
  providers: string[];
};

export type AiEngineResult = {
  picks: AiPick[];
  byMarket: Record<string, AiPick[]>;
  slips25: AccumulatorSlip[];
  generatedAt: number;
  statsNote: string | null;
  candidateCount: number;
  verifiedCount: number;
  bestFitCount: number;
  coverage: DataCoverage;
};

/** Which team a criterion is about, from its metric and the market being picked. */
export function sideFor(marketKey: PickMarketKey, metric: string): Side {
  if (metric === 'home_win_rate' || metric === 'unbeaten_home_rate') return 'home';
  if (metric === 'away_win_rate') return 'away';
  if (marketKey === 'home_win' || marketKey === 'double_chance_1x') return 'home';
  if (marketKey === 'away_win') return 'away';
  return 'both';
}

/** Collects every criterion outcome of a run for the coverage summary. */
class CoverageTally {
  byState = emptyStateCounts();
  criteriaTotal = 0;
  reasons = new Map<string, { state: DataState; reason: string; count: number }>();
  candidatesTotal = 0;
  candidatesWithData = 0;
  add(state: DataState, reason?: string) {
    this.criteriaTotal++;
    this.byState[state]++;
    if (state !== 'ok' && reason) {
      const k = `${state}|${reason}`;
      const cur = this.reasons.get(k);
      if (cur) cur.count++;
      else this.reasons.set(k, { state, reason, count: 1 });
    }
  }
  summary(providers: string[]): DataCoverage {
    return {
      criteriaTotal: this.criteriaTotal,
      byState: this.byState,
      topReasons: [...this.reasons.values()].sort((a, b) => b.count - a.count).slice(0, 8),
      candidatesTotal: this.candidatesTotal,
      candidatesWithData: this.candidatesWithData,
      providers,
    };
  }
}

/** Evaluate one candidate's criteria using configured stats providers. */
async function evaluateCandidate(c: RawCandidate, tally: CoverageTally): Promise<AiPick> {
  const tierCriteria = CRITERIA[c.marketKey]?.[c.tier];
  const criteria = tierCriteria?.status === 'configured' ? tierCriteria.criteria : [];
  const results: CriterionResult[] = [];

  const missing = (crit: (typeof criteria)[number], state: DataState, reason: string, provider?: string) => {
    tally.add(state, reason);
    results.push({
      id: crit.id,
      label: crit.label,
      status: 'unavailable',
      detail: reason,
      provisional: crit.provisional,
      dataState: state,
      provider,
    });
  };

  for (const crit of criteria) {
    if (!crit.metric) {
      missing(crit, 'not_configured', 'No metric key configured for this criterion.');
      continue;
    }
    if (UNAVAILABLE_ON_FREE.has(crit.metric)) {
      missing(crit, 'not_offered', NOT_OFFERED_REASON);
      continue;
    }
    if (crit.threshold === null) {
      missing(crit, 'not_configured', 'Threshold not configured.');
      continue;
    }

    const m = await fetchMetricDetailed({
      metric: crit.metric,
      window: crit.window ?? undefined,
      league: c.row.league ?? undefined,
      home: c.row.home,
      away: c.row.away,
      side: sideFor(c.marketKey, crit.metric),
      kickoff: c.row.kickoff,
    });

    if (!m.ok) {
      missing(crit, m.state, m.reason, m.provider);
      continue;
    }

    const value = m.value;
    let status: CriterionResult['status'] = 'fail';
    if (crit.comparator === 'min' && typeof crit.threshold === 'number') {
      status = value >= crit.threshold ? 'pass' : 'fail';
    } else if (crit.comparator === 'max' && typeof crit.threshold === 'number') {
      status = value <= crit.threshold ? 'pass' : 'fail';
    } else if (crit.comparator === 'between' && Array.isArray(crit.threshold)) {
      status = value >= crit.threshold[0] && value <= crit.threshold[1] ? 'pass' : 'fail';
    }

    tally.add('ok');
    results.push({
      id: crit.id,
      label: crit.label,
      status,
      detail: `value=${value}${m.note ? ` (${m.note})` : ''}, threshold=${JSON.stringify(crit.threshold)}, source=${m.provider}`,
      provisional: crit.provisional,
      dataState: 'ok',
      provider: m.provider,
    });
  }

  tally.candidatesTotal++;
  if (results.some((r) => r.dataState === 'ok')) tally.candidatesWithData++;

  const evaluation = evaluateCriteria(results, VERIFICATION.minVerifiableFraction, VERIFICATION.mode);
  const implied = c.row.implied ?? 1 / c.row.odds;
  const { score, breakdown } = computeFitScore({
    oddsInBand: true,
    impliedProbability: implied,
    evaluation,
    league: c.row.league,
    hasCardsOrCornersData: false,
    congestionFlag: false,
  });

  return {
    id: `${c.row.gameId}:${c.marketKey}:${c.tier}`,
    gameId: c.row.gameId,
    bookmaker: c.row.bookmaker,
    marketKey: c.marketKey,
    marketNativeId: c.row.marketNativeId,
    outcomeNativeId: c.row.outcomeNativeId,
    specifier: c.row.specifier,
    odds: c.row.odds,
    impliedProbability: implied,
    kickoff: c.row.kickoff,
    league: c.row.league,
    home: c.row.home,
    away: c.row.away,
    tier: c.tier,
    evaluation,
    criteria: results,
    fitScore: score,
    fitBreakdown: breakdown,
    rationale: buildRationale(evaluation, c.marketKey),
    exclusionStatus: 'not_checked',
  };
}

/**
 * Run the full AI generation over a set of games.
 * Safe to call after every pipeline fetch; pure function of games + stats.
 */
export async function generateAiPicks(games: Game[]): Promise<AiEngineResult> {
  const providers = configuredProviders();
  const statsNote =
    providers.length === 1 && providers[0].name === 'null' ? NO_STATS_PROVIDER_MESSAGE : null;

  // Big Five first, so any per-run request budget is spent where data is richest.
  const candidates = generateCandidates(games).sort(
    (a, b) => leaguePriorityIndex(a.row.league) - leaguePriorityIndex(b.row.league) || a.row.kickoff - b.row.kickoff,
  );
  const picks: AiPick[] = [];
  const tally = new CoverageTally();
  beginStatsRun(providers);

  for (const c of candidates) {
    const pick = await evaluateCandidate(c, tally);
    if (pick.evaluation.qualifies) picks.push(pick);
  }

  const ranked = rankAiPicks(picks);
  const byMarket: Record<string, AiPick[]> = {};
  for (const p of ranked) {
    (byMarket[p.marketKey] ??= []).push(p);
  }

  const slips25 = build25PlusSlips(ranked);

  return {
    picks: ranked,
    byMarket,
    slips25,
    generatedAt: Date.now(),
    statsNote,
    candidateCount: candidates.length,
    verifiedCount: ranked.filter((p) => p.evaluation.label === 'Verified').length,
    bestFitCount: ranked.filter((p) => p.evaluation.label === 'Best fit').length,
    coverage: tally.summary(providers.map((p) => p.name)),
  };
}

export { pickNGames, pickTargetOdds, pickTargetOddsTiers, composeAccumulator, rankAiPicks };

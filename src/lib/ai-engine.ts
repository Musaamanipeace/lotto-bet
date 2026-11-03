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
import { configuredProviders, fetchMetric, UNAVAILABLE_ON_FREE, type StatsProvider } from './stats.ts';
import { emptyStateCounts, type CoverageData, type DataState } from './data-state.ts';
import type { Game } from './types.ts';

export type AiEngineResult = {
  picks: AiPick[];
  byMarket: Record<string, AiPick[]>;
  slips25: AccumulatorSlip[];
  generatedAt: number;
  statsNote: string | null;
  candidateCount: number;
  verifiedCount: number;
  bestFitCount: number;
  coverage: CoverageData;
};

/** Evaluate one candidate's criteria using configured stats providers. */
async function evaluateCandidate(c: RawCandidate, providers?: StatsProvider[]): Promise<AiPick> {
  const tierCriteria = CRITERIA[c.marketKey]?.[c.tier];
  const criteria = tierCriteria?.status === 'configured' ? tierCriteria.criteria : [];
  const results: CriterionResult[] = [];

  for (const crit of criteria) {
    if (!crit.metric) {
      results.push({
        id: crit.id,
        label: crit.label,
        status: 'unavailable',
        dataState: 'not_configured',
        detail: 'No metric key configured',
        provisional: crit.provisional,
      });
      continue;
    }
    if (UNAVAILABLE_ON_FREE.has(crit.metric) || crit.threshold === null) {
      results.push({
        id: crit.id,
        label: crit.label,
        status: 'unavailable',
        dataState: crit.threshold === null ? 'not_configured' : 'not_offered',
        detail: UNAVAILABLE_ON_FREE.has(crit.metric)
          ? 'Not available on free data sources'
          : 'Threshold not configured',
        provisional: crit.provisional,
      });
      continue;
    }

    const metricRes = await fetchMetric({
      metric: crit.metric,
      window: crit.window ?? undefined,
      league: c.row.league ?? undefined,
      home: c.row.home,
      away: c.row.away,
      kickoff: c.row.kickoff,
    }, providers);

    if (!metricRes.ok) {
      results.push({
        id: crit.id,
        label: crit.label,
        status: 'unavailable',
        dataState: metricRes.state,
        detail: metricRes.reason,
        provisional: crit.provisional,
      });
      continue;
    }

    const value = metricRes.value;
    let status: CriterionResult['status'] = 'fail';
    if (crit.comparator === 'min' && typeof crit.threshold === 'number') {
      status = value >= crit.threshold ? 'pass' : 'fail';
    } else if (crit.comparator === 'max' && typeof crit.threshold === 'number') {
      status = value <= crit.threshold ? 'pass' : 'fail';
    } else if (crit.comparator === 'between' && Array.isArray(crit.threshold)) {
      status = value >= crit.threshold[0] && value <= crit.threshold[1] ? 'pass' : 'fail';
    }

    results.push({
      id: crit.id,
      label: crit.label,
      status,
      dataState: 'ok',
      detail: `value=${value}, threshold=${JSON.stringify(crit.threshold)}`,
      provisional: crit.provisional,
    });
  }

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
  for (const p of providers) p.beginRun?.();
  const hasKey = Boolean(process.env.FOOTBALL_DATA_API_KEY || process.env.API_FOOTBALL_KEY);
  const statsNote = !hasKey ? NO_STATS_PROVIDER_MESSAGE : null;

  const candidates = generateCandidates(games);
  const picks: AiPick[] = [];
  const byState = emptyStateCounts();
  const reasonMap = new Map<string, { state: DataState; reason: string; count: number }>();
  let criteriaTotal = 0;
  let candidatesWithData = 0;

  for (const c of candidates) {
    const pick = await evaluateCandidate(c, providers);
    if (pick.evaluation.qualifies) picks.push(pick);

    let hadData = false;
    for (const crit of pick.criteria ?? []) {
      criteriaTotal++;
      const s = crit.dataState ?? 'not_fetched';
      byState[s] = (byState[s] ?? 0) + 1;
      if (s === 'ok') hadData = true;
      if (s !== 'ok' && crit.detail) {
        const key = `${s}:${crit.detail}`;
        const existing = reasonMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          reasonMap.set(key, { state: s, reason: crit.detail, count: 1 });
        }
      }
    }
    if (hadData) candidatesWithData++;
  }

  const topReasons = Array.from(reasonMap.values()).sort((a, b) => b.count - a.count);

  const coverage: CoverageData = {
    criteriaTotal,
    byState,
    topReasons,
    candidatesTotal: candidates.length,
    candidatesWithData,
    providers: providers.map((p) => p.name),
  };

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
    coverage,
  };
}

export { pickNGames, pickTargetOdds, pickTargetOddsTiers, composeAccumulator, rankAiPicks };

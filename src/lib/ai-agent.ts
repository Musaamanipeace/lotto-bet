import { pickNGames, pickTargetOdds, type AiPick, type TargetTier } from './ai-picks.ts';
import { swapInSlip, type SwapScope } from './alternatives.ts';
import type { Tier } from './criteria.ts';
import { emptyStateCounts } from './data-state.ts';
import { applyFilterState, normalizeFilterState, type FilterState } from './filter-state.ts';
import { callLlm } from './llm/index.ts';
import type { LlmEnv } from './llm/types.ts';
import { revalidatePicks, type RevalidateFlag } from './revalidate.ts';
import type { Game } from './types.ts';

export type SlipLegSummary = {
  gameId: string;
  home: string;
  away: string;
  pick: string;
  odds: number;
  marketKind?: string;
  marketNativeId?: string;
  outcomeNativeId?: string;
  specifier?: string;
};

export type LegFlag = {
  gameId: string;
  pickId: string | null;
  matchLabel: string;
  pickLabel: string;
  odds: number;
  fitScore: number | null;
  severities: ('stale' | 'weak' | 'correlated' | 'unverified')[];
  reasons: string[];
  revalidate?: RevalidateFlag;
};

export type SwapProposal = {
  type: 'propose_swap';
  outGameId: string;
  outPickId: string;
  inPickId: string;
  outPick: AiPick | null;
  outLeg: SlipLegSummary;
  inPick: AiPick;
  oddsBefore: number;
  oddsAfter: number;
  newTotalOdds: number;
  reason: string;
};

export type AddPicksAction = {
  type: 'add_picks';
  picks: AiPick[];
  requested: number;
  shortfall: number;
  totalOdds: number;
  tier: TargetTier;
};

export type AgentAction = AddPicksAction | SwapProposal;

export type AgentMode = 'pick_n' | 'inspect_slip' | 'suggest_swaps' | 'list_candidates' | 'chat';

export type AgentRequest = {
  mode: AgentMode;
  message?: string;
  filterState?: Partial<FilterState> | null;
  tier?: TargetTier | Tier;
  n?: number;
  targetOdds?: number;
  market?: string | null;
  slipLegs?: SlipLegSummary[];
  lockedGameIds?: string[];
  excludeIds?: string[];
  scope?: SwapScope;
  strict?: boolean;
};

export type AgentResponse = {
  ok: true;
  mode: AgentMode;
  summary: string;
  llmUsed: boolean;
  provider?: string;
  model?: string;
  llmWarning?: string;
  candidatesCount: number;
  picks: AiPick[];
  shortfall: number;
  flags: LegFlag[];
  swaps: SwapProposal[];
  actions: AgentAction[];
  seenPickIds: string[];
};

const SYSTEM_EXPLAINER = `You are Lotto Bet's slip assistant. Strictly summarize ONLY the computed deterministic tool results given to you.
Rules:
- Never claim a bet or slip will win, is guaranteed, or is likely to win. "Safe" is only a tier name.
- Never invent teams, odds, pick IDs, or statistics not present in the tool results.
- Keep explanations concise (2-4 crisp sentences).`;

/**
 * Lists candidates from the saved AI snapshot filtered strictly by unified FilterState.
 */
export function toolListCandidates(
  snapshotPicks: AiPick[],
  filterState: FilterState,
  opts: { tier?: Tier | ''; market?: string | null; excludeGameIds?: Set<string> } = {},
): AiPick[] {
  return applyFilterState(snapshotPicks, filterState, {
    tier: opts.tier || undefined,
    market: opts.market || undefined,
    excludedGameIds: opts.excludeGameIds,
    pastGraceMs: 5 * 60_000,
  });
}

/**
 * Selects N unique-game picks (or closest target odds) strictly within unified FilterState.
 */
export function toolPickN(
  snapshotPicks: AiPick[],
  filterState: FilterState,
  opts: {
    n: number;
    tier?: TargetTier;
    targetOdds?: number;
    market?: string | null;
    excludeGameIds?: Set<string>;
  },
): { picks: AiPick[]; requested: number; shortfall: number; totalOdds: number; poolCount: number } {
  const tier: TargetTier = opts.tier ?? 'average';
  const requested = Math.max(1, Math.min(50, Math.floor(opts.n || 5)));
  const pool = toolListCandidates(snapshotPicks, filterState, {
    market: opts.market,
    excludeGameIds: opts.excludeGameIds,
  });

  if (opts.targetOdds && Number.isFinite(opts.targetOdds) && opts.targetOdds > 1) {
    const res = pickTargetOdds(pool, opts.targetOdds, tier);
    const chosen = res.slip?.picks ?? [];
    return {
      picks: chosen,
      requested,
      shortfall: Math.max(0, requested - chosen.length),
      totalOdds: chosen.reduce((a, p) => a * p.odds, 1),
      poolCount: pool.length,
    };
  }

  const variants = pickNGames(pool, requested);
  const chosenSlip = variants[tier] ?? variants.average ?? variants.lower ?? variants.higher;
  const chosen = chosenSlip?.picks ?? [];
  return {
    picks: chosen,
    requested,
    shortfall: Math.max(0, requested - chosen.length),
    totalOdds: chosen.reduce((a, p) => a * p.odds, 1),
    poolCount: pool.length,
  };
}

/**
 * Inspects current betslip legs against snapshot data, live games odds (via revalidatePicks),
 * duplicate/correlated fixture checks, and weak fit scores.
 */
export function toolInspectSlip(
  legs: SlipLegSummary[],
  snapshotPicks: AiPick[],
  latestGames: Game[],
): { flags: LegFlag[]; matchedSnapshotPicks: AiPick[]; totalOdds: number } {
  const byGameId = new Map<string, AiPick[]>();
  for (const p of snapshotPicks) {
    const arr = byGameId.get(p.gameId) ?? [];
    arr.push(p);
    byGameId.set(p.gameId, arr);
  }

  const gameCounts = new Map<string, number>();
  for (const l of legs) {
    gameCounts.set(l.gameId, (gameCounts.get(l.gameId) ?? 0) + 1);
  }

  const matchedPicks: AiPick[] = [];
  const legMatchedPick = legs.map((l) => {
    const candidates = byGameId.get(l.gameId) ?? [];
    const exact = candidates.find(
      (p) =>
        (l.marketNativeId && p.marketNativeId === l.marketNativeId && p.outcomeNativeId === l.outcomeNativeId) ||
        p.marketKey === l.marketKind,
    ) ?? candidates[0] ?? null;
    if (exact) matchedPicks.push(exact);
    return exact;
  });

  const revalMap = new Map<string, RevalidateFlag>();
  if (latestGames.length > 0 && matchedPicks.length > 0) {
    for (const r of revalidatePicks(matchedPicks, latestGames)) {
      revalMap.set(r.id, r.revalidate);
    }
  }

  const flags: LegFlag[] = legs.map((leg, i) => {
    const snapPick = legMatchedPick[i];
    const severities: LegFlag['severities'] = [];
    const reasons: string[] = [];
    const reval = snapPick ? revalMap.get(snapPick.id) : undefined;

    if ((gameCounts.get(leg.gameId) ?? 0) > 1) {
      severities.push('correlated');
      reasons.push('Multiple selections from the same match.');
    }

    if (reval?.kind === 'market_gone') {
      severities.push('stale');
      reasons.push(reval.reason || 'Market no longer available in latest fetch.');
    } else if (reval?.kind === 'no_longer_qualifies') {
      severities.push('stale');
      reasons.push(reval.reason || 'Outcome no longer qualifies in latest odds.');
    } else if (reval?.kind === 'price_changed') {
      const diff = Math.abs(reval.newOdds - leg.odds);
      if (diff >= 0.05) {
        severities.push('stale');
        reasons.push(`Latest odds moved (${leg.odds.toFixed(2)} → ${reval.newOdds.toFixed(2)}).`);
      }
    }

    if (snapPick) {
      if (snapPick.evaluation.label !== 'Verified') {
        severities.push('unverified');
        reasons.push(`${snapPick.evaluation.verifiedLabel} (${snapPick.evaluation.label})`);
      }
      if (snapPick.fitScore < 0.45) {
        severities.push('weak');
        reasons.push(`Low fit score (${snapPick.fitScore.toFixed(2)}).`);
      }
    } else {
      severities.push('unverified');
      reasons.push('No matching AI evaluation in current snapshot.');
    }

    return {
      gameId: leg.gameId,
      pickId: snapPick?.id ?? null,
      matchLabel: `${leg.home} vs ${leg.away}`,
      pickLabel: leg.pick,
      odds: leg.odds,
      fitScore: snapPick ? snapPick.fitScore : null,
      severities,
      reasons,
      revalidate: reval,
    };
  });

  return {
    flags,
    matchedSnapshotPicks: matchedPicks,
    totalOdds: legs.reduce((a, l) => a * l.odds, 1),
  };
}

/**
 * Generates deterministic swap proposals for an existing slip using `swapInSlip()`,
 * strictly respecting `filterState`, `lockedGameIds`, and `excludeIds` (so repeated swaps never
 * hand back the same pick).
 */
export function toolSuggestSwaps(
  legs: SlipLegSummary[],
  snapshotPicks: AiPick[],
  filterState: FilterState,
  opts: {
    lockedGameIds?: string[];
    excludeIds?: string[];
    scope?: SwapScope;
    strict?: boolean;
    tier?: TargetTier;
    count?: number;
  } = {},
): { swaps: SwapProposal[]; message: string | null } {
  if (legs.length === 0) {
    return { swaps: [], message: 'Slip is empty.' };
  }

  const snapById = new Map(snapshotPicks.map((p) => [p.id, p]));
  const snapByGame = new Map<string, AiPick[]>();
  for (const p of snapshotPicks) {
    const arr = snapByGame.get(p.gameId) ?? [];
    arr.push(p);
    snapByGame.set(p.gameId, arr);
  }

  const locked = new Set(opts.lockedGameIds ?? []);
  const excluded = new Set(opts.excludeIds ?? []);

  // Build synthetic or matched AiPick array representing current slip
  const currentSlipPicks: AiPick[] = [];
  const legByPickId = new Map<string, SlipLegSummary>();
  for (const leg of legs) {
    const cands = snapByGame.get(leg.gameId) ?? [];
    const matched =
      cands.find(
        (p) =>
          (leg.marketNativeId && p.marketNativeId === leg.marketNativeId && p.outcomeNativeId === leg.outcomeNativeId) ||
          p.marketKey === leg.marketKind,
      ) ?? cands[0];

    if (matched) {
      currentSlipPicks.push(matched);
      legByPickId.set(matched.id, leg);
      excluded.add(matched.id);
    } else {
      // Synthetic placeholder pick for manual builder legs so swapInSlip can replace them cleanly
      const syntheticId = `manual:${leg.gameId}:${leg.marketKind || '1x2'}`;
      const synthetic: AiPick = {
        id: syntheticId,
        gameId: leg.gameId,
        bookmaker: filterState.bookmaker,
        marketKey: (leg.marketKind as AiPick['marketKey']) || 'home_win',
        marketNativeId: leg.marketNativeId || 'm',
        outcomeNativeId: leg.outcomeNativeId || 'o',
        specifier: leg.specifier || '',
        odds: leg.odds,
        impliedProbability: leg.odds > 1 ? 1 / leg.odds : 0.5,
        kickoff: Date.now() + 3600_000,
        league: null,
        home: leg.home,
        away: leg.away,
        tier: 'value',
        evaluation: {
          label: 'Best fit',
          qualifies: true,
          passed: 0,
          verifiable: 0,
          total: 0,
          reason: null,
          verifiedLabel: 'manual leg',
          provisionalCriteria: [],
          stateCounts: emptyStateCounts(),
        },
        criteria: [],
        fitScore: 0.1,
        fitBreakdown: {
          tierPlacement: 0,
          impliedProbability: 0,
          criteriaPassShare: 0,
          leaguePriority: 0,
          cardsCornersData: 0,
          failedCriteriaPenalty: 0,
          congestionPenalty: 0,
        },
        rationale: 'Manual builder leg',
        exclusionStatus: 'not_checked',
      };
      currentSlipPicks.push(synthetic);
      legByPickId.set(syntheticId, leg);
    }
  }

  const tier: TargetTier = opts.tier ?? 'higher';
  const allowedTiers =
    tier === 'lower' ? ['safe'] : tier === 'average' ? ['safe', 'balanced'] : ['safe', 'balanced', 'value'];

  const pool = toolListCandidates(snapshotPicks, filterState).filter(
    (p) => allowedTiers.includes(p.tier) && !excluded.has(p.id),
  );

  const weakestCount = Math.min(
    Math.max(1, opts.count ?? 3),
    currentSlipPicks.filter((p) => !locked.has(p.gameId)).length,
  );
  if (weakestCount === 0) {
    return { swaps: [], message: 'All legs on this slip are locked.' };
  }

  const res = swapInSlip(currentSlipPicks, pool, {
    weakest: weakestCount,
    lockedGameIds: [...locked],
    excludeIds: [...excluded],
    scope: opts.scope ?? 'any',
    strictlyBetter: opts.strict === true,
    seed: 1,
  });

  if (!res.ok) {
    return { swaps: [], message: res.error };
  }

  const slipTotal = legs.reduce((a, l) => a * l.odds, 1);
  const proposals: SwapProposal[] = [];
  for (const s of res.swaps) {
    // Verify replacement pick ID exists verbatim in snapshot
    const realIn = snapById.get(s.in.id);
    if (!realIn) continue;
    const realOut = snapById.get(s.out.id) ?? null;
    const outLeg = legByPickId.get(s.out.id) ?? {
      gameId: s.out.gameId,
      home: s.out.home,
      away: s.out.away,
      pick: s.out.marketKey.replace(/_/g, ' '),
      odds: s.out.odds,
    };
    const newTotalOdds = (slipTotal / Math.max(1, outLeg.odds)) * realIn.odds;
    proposals.push({
      type: 'propose_swap',
      outGameId: outLeg.gameId,
      outPickId: s.out.id,
      inPickId: realIn.id,
      outPick: realOut,
      outLeg,
      inPick: realIn,
      oddsBefore: outLeg.odds,
      oddsAfter: realIn.odds,
      newTotalOdds,
      reason: `Replaces ${outLeg.home} v ${outLeg.away} (${outLeg.pick} @${outLeg.odds.toFixed(2)}) with higher-ranked ${realIn.home} v ${realIn.away} (${realIn.marketKey.replace(/_/g, ' ')} @${realIn.odds.toFixed(2)}, fit ${realIn.fitScore.toFixed(2)}).`,
    });
  }

  return {
    swaps: proposals,
    message: proposals.length === 0 ? 'No better non-duplicate replacements match your active filters.' : null,
  };
}

/**
 * Executes a structured agent turn using deterministic tools first, then optionally calls the LLM
 * with the user's server-side keys to narrate the result. If the LLM is slow or errors, deterministic
 * tool outputs and explanation still succeed cleanly.
 */
export async function runAiAgent(opts: {
  request: AgentRequest;
  snapshotPicks: AiPick[];
  latestGames: Game[];
  llmEnv: LlmEnv;
}): Promise<AgentResponse> {
  const { request, snapshotPicks, latestGames, llmEnv } = opts;
  const filterState = normalizeFilterState(request.filterState);
  const excludeGameIds = new Set((request.slipLegs ?? []).map((l) => l.gameId));
  const mode: AgentMode = request.mode || 'chat';

  const snapIdSet = new Set(snapshotPicks.map((p) => p.id));

  let picks: AiPick[] = [];
  let shortfall = 0;
  let flags: LegFlag[] = [];
  let swaps: SwapProposal[] = [];
  const actions: AgentAction[] = [];
  let deterministicSummary = '';

  const filteredPool = toolListCandidates(snapshotPicks, filterState, {
    market: request.market ?? undefined,
    excludeGameIds,
  });

  if (mode === 'list_candidates') {
    const limit = Math.max(1, Math.min(50, Math.floor(request.n || 15)));
    picks = filteredPool.slice(0, limit);
    shortfall = Math.max(0, limit - picks.length);
    deterministicSummary =
      picks.length > 0
        ? `Found ${filteredPool.length} qualifying picks under your active filters (showing top ${picks.length}).`
        : 'No picks in the saved snapshot match your current filters.';
  } else if (mode === 'pick_n') {
    const tier: TargetTier =
      request.tier === 'lower' || request.tier === 'average' || request.tier === 'higher'
        ? request.tier
        : request.tier === 'safe'
          ? 'lower'
          : request.tier === 'value'
            ? 'higher'
            : 'average';
    const picked = toolPickN(snapshotPicks, filterState, {
      n: request.n || 5,
      tier,
      targetOdds: request.targetOdds,
      market: request.market,
      excludeGameIds,
    });
    picks = picked.picks.filter((p) => snapIdSet.has(p.id));
    shortfall = picked.shortfall;
    if (picks.length > 0) {
      actions.push({
        type: 'add_picks',
        picks,
        requested: picked.requested,
        shortfall,
        totalOdds: picked.totalOdds,
        tier,
      });
      deterministicSummary =
        shortfall > 0
          ? `Selected ${picks.length} of ${picked.requested} requested picks (${picked.totalOdds.toFixed(2)}x combined odds). Only ${picks.length} qualifying unique fixtures matched your filters.`
          : `Selected ${picks.length} picks (${picked.totalOdds.toFixed(2)}x combined odds) under your active filters.`;
    } else {
      deterministicSummary = `Could not find matching picks under your active filters (${picked.poolCount} in filtered pool). Try widening odds or timeframe.`;
    }
  } else if (mode === 'inspect_slip' || mode === 'suggest_swaps') {
    const legs = request.slipLegs ?? [];
    const inspected = toolInspectSlip(legs, snapshotPicks, latestGames);
    flags = inspected.flags;

    const tier: TargetTier =
      request.tier === 'lower' || request.tier === 'average' || request.tier === 'higher'
        ? request.tier
        : 'higher';
    const swapOut = toolSuggestSwaps(legs, snapshotPicks, filterState, {
      lockedGameIds: request.lockedGameIds,
      excludeIds: request.excludeIds,
      scope: request.scope ?? 'any',
      strict: request.strict,
      tier,
      count: request.n ?? 3,
    });
    swaps = swapOut.swaps.filter((s) => snapIdSet.has(s.inPickId));
    actions.push(...swaps);

    const flaggedCount = flags.filter((f) => f.severities.length > 0).length;
    deterministicSummary =
      legs.length === 0
        ? 'Your betslip is empty.'
        : `Reviewed ${legs.length} leg${legs.length === 1 ? '' : 's'} (total ${inspected.totalOdds.toFixed(2)}x): ${flaggedCount} flagged, ${swaps.length} swap suggestion${swaps.length === 1 ? '' : 's'} available.${swapOut.message ? ` ${swapOut.message}` : ''}`;
  } else {
    // General chat mode with intent extraction toward tools
    const msg = (request.message ?? '').trim();
    const numMatch = msg.match(/\b(\d{1,2})\b/);
    const wantsAdd = /\b(add|pick|build|give|suggest|select)\b/i.test(msg);
    const wantsSwap = /\b(swap|replace|review|weak|fix|improve)\b/i.test(msg);

    if (wantsSwap && (request.slipLegs?.length ?? 0) > 0) {
      const inspected = toolInspectSlip(request.slipLegs ?? [], snapshotPicks, latestGames);
      flags = inspected.flags;
      const swapOut = toolSuggestSwaps(request.slipLegs ?? [], snapshotPicks, filterState, {
        lockedGameIds: request.lockedGameIds,
        excludeIds: request.excludeIds,
        count: 3,
      });
      swaps = swapOut.swaps.filter((s) => snapIdSet.has(s.inPickId));
      actions.push(...swaps);
      deterministicSummary = `Reviewed ${request.slipLegs?.length ?? 0} legs and prepared ${swaps.length} swap suggestion(s).`;
    } else if (wantsAdd && filteredPool.length > 0) {
      const count = numMatch ? Math.min(20, Math.max(1, Number(numMatch[1]))) : 5;
      const picked = toolPickN(snapshotPicks, filterState, { n: count, excludeGameIds });
      picks = picked.picks.filter((p) => snapIdSet.has(p.id));
      shortfall = picked.shortfall;
      if (picks.length > 0) {
        actions.push({
          type: 'add_picks',
          picks,
          requested: count,
          shortfall,
          totalOdds: picked.totalOdds,
          tier: 'average',
        });
      }
      deterministicSummary =
        picks.length > 0
          ? `Prepared ${picks.length} picks (${picked.totalOdds.toFixed(2)}x combined) matching your active filters.${shortfall > 0 ? ` Only ${picks.length} of ${count} requested were available.` : ''}`
          : 'No matching picks found for your active filters.';
    } else {
      picks = filteredPool.slice(0, 10);
      deterministicSummary = `${filteredPool.length} AI picks currently match your active filters.`;
    }
  }

  // Optional LLM narration grounded strictly in computed deterministic outputs
  let summary = deterministicSummary;
  let llmUsed = false;
  let provider: string | undefined;
  let model: string | undefined;
  let llmWarning: string | undefined;

  const hasLlmKey = Boolean(llmEnv.GEMINI_API_KEY || llmEnv.OPENROUTER_API_KEY || llmEnv.MISTRAL_API_KEY);
  if (hasLlmKey) {
    const contextPayload = {
      mode,
      userMessage: request.message ?? null,
      filterSummary: {
        bookmaker: filterState.bookmaker,
        withinHours: filterState.withinHours,
        leaguesCount: filterState.leagues.length,
      },
      candidatesCount: filteredPool.length,
      shortfall,
      selectedPicks: picks.slice(0, 10).map((p) => ({
        id: p.id,
        match: `${p.home} vs ${p.away}`,
        market: p.marketKey,
        odds: p.odds,
        tier: p.tier,
        label: p.evaluation.label,
        verified: p.evaluation.verifiedLabel,
      })),
      flaggedLegs: flags.map((f) => ({
        match: f.matchLabel,
        pick: f.pickLabel,
        odds: f.odds,
        severities: f.severities,
        reasons: f.reasons,
      })),
      swaps: swaps.map((s) => ({
        out: `${s.outLeg.home} vs ${s.outLeg.away} (${s.outLeg.pick} @${s.oddsBefore})`,
        in: `${s.inPick.home} vs ${s.inPick.away} (${s.inPick.marketKey} @${s.oddsAfter})`,
        newTotalOdds: Number(s.newTotalOdds.toFixed(2)),
      })),
      deterministicSummary,
    };

    const llmRes = await callLlm(
      {
        system: SYSTEM_EXPLAINER,
        prompt: `Summarize these computed results concisely for the user:\n${JSON.stringify(contextPayload)}`,
      },
      llmEnv,
    );

    if (llmRes.ok && llmRes.text.trim()) {
      summary = llmRes.text.trim();
      llmUsed = true;
      provider = llmRes.provider;
      model = llmRes.model;
    } else if (!llmRes.ok) {
      llmWarning = llmRes.error;
    }
  }

  const seenPickIds = [...new Set([...picks.map((p) => p.id), ...swaps.map((s) => s.inPickId)])];

  return {
    ok: true,
    mode,
    summary,
    llmUsed,
    provider,
    model,
    llmWarning,
    candidatesCount: filteredPool.length,
    picks,
    shortfall,
    flags,
    swaps,
    actions,
    seenPickIds,
  };
}

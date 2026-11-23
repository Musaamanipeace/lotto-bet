import type { AiPick, TargetResult, TargetTier } from './ai-picks.ts';
import { pickTargetOdds, toTargetRow, TARGET_TIER_POOL } from './ai-picks.ts';
import { ACCUMULATOR } from './criteria.ts';
import { applyFilters, matchesCardsState } from './filter-state.ts';
import type { CardsState } from './market-cards.ts';
import type { FilterTemplate } from './template-store.ts';
import { targetSlip } from './targeting.ts';
import { BOOKMAKER_LABEL } from './types.ts';

/**
 * Checks whether an AI pick satisfies the market card rules and odds bounds of a template.
 */
export function matchesTemplateCards(pick: AiPick, cards: CardsState): boolean {
  return matchesCardsState(pick, cards);
}

/**
 * Filters ranked AI picks according to a template's bookmaker, kickoff window, leagues, and market cards.
 * Routes through the shared `applyFilters()` pipeline (Task 9).
 */
export function filterAiPicksByTemplate(
  picks: AiPick[],
  template: FilterTemplate,
  overrideWithinHours?: number | null,
): AiPick[] {
  const effectiveHours = overrideWithinHours !== undefined ? overrideWithinHours : template.withinHours;
  return applyFilters(picks, {
    bookmaker: template.bookmaker,
    withinHours: effectiveHours,
    leagues: template.leagues,
    cards: template.cards,
    pastGraceMs: 5 * 60_000,
  });
}

/**
 * Builds a target-odds accumulator from AI picks filtered by a specific template.
 */
export function buildTemplateTargetOdds(
  picks: AiPick[],
  template: FilterTemplate,
  targetOdds: number,
  tier: TargetTier = 'average',
  withinHours?: number | null,
): TargetResult {
  const filtered = filterAiPicksByTemplate(picks, template, withinHours);
  if (filtered.length === 0) {
    return {
      slip: null,
      achieved: 0,
      gap: targetOdds,
      message: `No AI picks match template "${template.name}". Try widening odds, timeframe, or selecting another template.`,
    };
  }

  // Targeted odds: honour the instruction, not the tier pool.
  const r = targetSlip(filtered.map(toTargetRow), targetOdds);
  if (r.picks.length === 0) {
    return {
      slip: null,
      achieved: r.achieved,
      gap: r.gap,
      message: r.message ?? `Could not assemble a slip matching target odds of ${targetOdds.toFixed(2)}x within template "${template.name}".`,
    };
  }

  return {
    slip: {
      id: `slip_target_${Date.now()}`,
      picks: r.picks.map((t) => t.pick as AiPick),
      totalOdds: r.achieved,
      combinedImpliedProbability: r.picks.reduce((a, t) => a * (t.impliedProbability ?? 1), 1),
      riskLabel: 'lower risk',
      coreCount: r.picks.length,
      boosterCount: 0,
      createdAt: Date.now(),
    },
    achieved: r.achieved,
    gap: r.gap,
    message: r.message,
  };
}

/**
 * Selects the top N AI picks matching a template, guaranteeing one pick per match.
 */
export function buildTemplatePicksN(
  picks: AiPick[],
  template: FilterTemplate,
  count: number,
  withinHours?: number | null,
): AiPick[] {
  const filtered = filterAiPicksByTemplate(picks, template, withinHours);
  const seenGames = new Set<string>();
  const selected: AiPick[] = [];

  for (const pick of filtered) {
    if (seenGames.has(pick.gameId)) continue;
    seenGames.add(pick.gameId);
    selected.push(pick);
    if (selected.length >= count) break;
  }

  return selected;
}

export type TemplateAiAccaOptions = {
  targetOdds?: number | null;
  targetGamesCount?: number | null;
  withinHours?: number | null;
  tier?: TargetTier;
  excludedGameIds?: Set<string>;
  /** Targeted-odds instructions (v2); override the tier pool when present. */
  legOdds?: number | null;
  min?: number | null;
  max?: number | null;
  legs?: number | null;
};

export type TemplateAiAccaResult = {
  picks: AiPick[];
  totalOdds: number;
  message?: string;
};

/**
 * Universal builder for AI accumulator from a template:
 * - targetOdds is optional
 * - targetGamesCount is optional
 * If both are supplied, constructs up to targetGamesCount legs targeting targetOdds.
 * If targetOdds only, searches closest target odds.
 * If targetGamesCount only, selects top N ranked picks.
 * If neither is specified, picks top 5 recommended picks.
 */
export function buildTemplateAiAcca(
  picks: AiPick[],
  template: FilterTemplate,
  options: TemplateAiAccaOptions = {},
): TemplateAiAccaResult {
  const { targetOdds, targetGamesCount, withinHours, tier = 'average', excludedGameIds } = options;

  let pool = filterAiPicksByTemplate(picks, template, withinHours);
  if (excludedGameIds && excludedGameIds.size > 0) {
    pool = pool.filter((p) => !excludedGameIds.has(p.gameId));
  }

  const hasOddsInstruction =
    (options.targetOdds !== null && options.targetOdds !== undefined && options.targetOdds > 1) ||
    (options.legOdds !== null && options.legOdds !== undefined && options.legOdds > 1) ||
    (options.min !== null && options.min !== undefined && options.max !== null && options.max !== undefined);

  const allowedTiers = new Set(TARGET_TIER_POOL[tier]);
  if (!hasOddsInstruction) {
    pool = pool.filter((p) => allowedTiers.has(p.tier));
  }

  if (pool.length === 0) {
    return {
      picks: [],
      totalOdds: 1,
      message: `No qualifying AI picks available for template "${template.name}".`,
    };
  }

  const hasOdds = typeof targetOdds === 'number' && Number.isFinite(targetOdds) && targetOdds > 1;
  const hasCount = typeof targetGamesCount === 'number' && Number.isInteger(targetGamesCount) && targetGamesCount > 0;

  // Case 1: Both Target Odds and Target Number of Games specified
  if (hasOdds && hasCount) {
    const maxLegs = Math.min(targetGamesCount, ACCUMULATOR.maxLegs);
    const r = targetSlip(pool.map(toTargetRow), targetOdds, { legs: targetGamesCount });
    if (r.picks.length === 0) {
      return { picks: [], totalOdds: 1, message: `Could not build slip for ${targetOdds}x across ${maxLegs} games.` };
    }
    return {
      picks: r.picks.map((t) => t.pick as AiPick),
      totalOdds: Math.round(r.achieved * 100) / 100,
      message: r.message,
    };
  }

  // Case 2: Only Target Odds specified
  if (hasOdds) {
    const r = buildTemplateTargetOdds(pool, template, targetOdds, tier, withinHours);
    if (!r.slip || r.slip.picks.length === 0) {
      return { picks: [], totalOdds: 1, message: r.message ?? `Target odds of ${targetOdds.toFixed(1)}x could not be met.` };
    }
    return {
      picks: r.slip.picks,
      totalOdds: Math.round(r.achieved * 100) / 100,
      message: r.message,
    };
  }

  // Case 3: Only Target Number of Games specified
  if (hasCount) {
    const selected = buildTemplatePicksN(pool, template, targetGamesCount, withinHours);
    const totalOdds = selected.reduce((acc, p) => acc * p.odds, 1);
    return {
      picks: selected,
      totalOdds: Math.round(totalOdds * 100) / 100,
    };
  }

  // Case 4: Neither specified (default: top 5 picks from template)
  const defaultCount = Math.min(5, pool.length);
  const selected = buildTemplatePicksN(pool, template, defaultCount, withinHours);
  const totalOdds = selected.reduce((acc, p) => acc * p.odds, 1);
  return {
    picks: selected,
    totalOdds: Math.round(totalOdds * 100) / 100,
  };
}

/**
 * Concise descriptive string of the active parameters in a filter template.
 */
export function templateSummary(template: FilterTemplate, overrideWithinHours?: number | null): string {
  const activeCards = Object.entries(template.cards)
    .filter(([, c]) => c.on)
    .map(([k, c]) => {
      const name = k === 'dc' ? 'Double Chance' : k === '1x2' ? '1X2' : k === 'over' ? 'Over' : k === 'under' ? 'Under' : 'BTTS';
      return `${name} [${c.low.toFixed(2)}-${c.high.toFixed(2)}]`;
    });

  const b = BOOKMAKER_LABEL[template.bookmaker];
  const effectiveHours = overrideWithinHours !== undefined ? overrideWithinHours : template.withinHours;
  const timeDesc = effectiveHours ? ` · <${effectiveHours}h` : '';
  if (activeCards.length === 0) return `${b}${timeDesc} · All markets`;
  return `${b}${timeDesc} · ${activeCards.join(', ')}`;
}

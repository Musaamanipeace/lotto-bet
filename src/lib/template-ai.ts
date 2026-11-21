import type { AiPick, TargetResult, TargetTier } from './ai-picks.ts';
import { pickTargetOdds, TARGET_TIER_POOL } from './ai-picks.ts';
import { ACCUMULATOR } from './criteria.ts';
import { applyFilters, matchesCardsState } from './filter-state.ts';
import type { CardsState } from './market-cards.ts';
import type { FilterTemplate } from './template-store.ts';

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

  const result = pickTargetOdds(filtered, targetOdds, tier);
  if (!result.slip) {
    return {
      ...result,
      message: result.message ?? `Could not assemble a slip matching target odds of ${targetOdds.toFixed(2)}x within template "${template.name}".`,
    };
  }

  return result;
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

  const allowedTiers = new Set(TARGET_TIER_POOL[tier]);
  pool = pool.filter((p) => allowedTiers.has(p.tier));

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
    const usedGames = new Set<string>();
    const selected: AiPick[] = [];
    let currentOdds = 1;

    while (selected.length < maxLegs && currentOdds < targetOdds) {
      let bestPick: AiPick | null = null;
      let bestLogDistance = Infinity;

      for (const p of pool) {
        if (usedGames.has(p.gameId)) continue;
        const nextOdds = currentOdds * p.odds;
        const dist = Math.abs(Math.log(nextOdds / targetOdds));
        if (dist < bestLogDistance) {
          bestLogDistance = dist;
          bestPick = p;
        }
      }

      if (!bestPick) break;
      selected.push(bestPick);
      usedGames.add(bestPick.gameId);
      currentOdds *= bestPick.odds;

      // If we crossed target and adding more would worsen the log distance:
      if (currentOdds >= targetOdds && selected.length >= maxLegs) break;
    }

    if (selected.length === 0) {
      return { picks: [], totalOdds: 1, message: `Could not build slip for ${targetOdds}x across ${maxLegs} games.` };
    }

    return {
      picks: selected,
      totalOdds: Math.round(currentOdds * 100) / 100,
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

  const b = template.bookmaker === 'sportybet' ? 'SportyBet' : 'betPawa';
  const effectiveHours = overrideWithinHours !== undefined ? overrideWithinHours : template.withinHours;
  const timeDesc = effectiveHours ? ` · <${effectiveHours}h` : '';
  if (activeCards.length === 0) return `${b}${timeDesc} · All markets`;
  return `${b}${timeDesc} · ${activeCards.join(', ')}`;
}

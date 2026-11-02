import type { AiPick, TargetResult, TargetTier } from './ai-picks.ts';
import { pickTargetOdds, TARGET_TIER_POOL } from './ai-picks.ts';
import { ACCUMULATOR } from './criteria.ts';
import type { CardsState } from './market-cards.ts';
import type { FilterTemplate } from './template-store.ts';

/**
 * Checks whether an AI pick satisfies the market card rules and odds bounds of a template.
 */
export function matchesTemplateCards(pick: AiPick, cards: CardsState): boolean {
  const anyOn = Object.values(cards).some((c) => c.on);
  if (!anyOn) return true; // No constraints enabled

  switch (pick.marketKey) {
    case 'home_win': {
      const c = cards['1x2'];
      return Boolean(c?.on && c.subs.includes('home') && pick.odds >= c.low && pick.odds <= c.high);
    }
    case 'away_win': {
      const c = cards['1x2'];
      return Boolean(c?.on && c.subs.includes('away') && pick.odds >= c.low && pick.odds <= c.high);
    }
    case 'double_chance_1x': {
      const c = cards.dc;
      return Boolean(c?.on && c.subs.includes('1X') && pick.odds >= c.low && pick.odds <= c.high);
    }
    case 'double_chance_12': {
      const c = cards.dc;
      return Boolean(c?.on && c.subs.includes('12') && pick.odds >= c.low && pick.odds <= c.high);
    }
    case 'over_0_5': {
      const c = cards.over;
      return Boolean(c?.on && c.subs.includes('0.5') && pick.odds >= c.low && pick.odds <= c.high);
    }
    case 'over_1_5': {
      const c = cards.over;
      return Boolean(c?.on && c.subs.includes('1.5') && pick.odds >= c.low && pick.odds <= c.high);
    }
    case 'under_3_5': {
      const c = cards.under;
      return Boolean(c?.on && c.subs.includes('3.5') && pick.odds >= c.low && pick.odds <= c.high);
    }
    case 'under_4_5': {
      const c = cards.under;
      return Boolean(c?.on && c.subs.includes('4.5') && pick.odds >= c.low && pick.odds <= c.high);
    }
    default:
      return false;
  }
}

/**
 * Filters ranked AI picks according to a template's bookmaker, kickoff window, leagues, and market cards.
 * Can override withinHours timeframe (e.g. 6h, 12h, 24h, 48h, 72h, or null for any time).
 */
export function filterAiPicksByTemplate(
  picks: AiPick[],
  template: FilterTemplate,
  overrideWithinHours?: number | null,
): AiPick[] {
  const allowedLeagues = template.leagues?.length
    ? new Set(template.leagues.map((l) => l.trim().toLowerCase()))
    : null;

  const effectiveHours = overrideWithinHours !== undefined ? overrideWithinHours : template.withinHours;
  const now = Date.now();
  const maxKickoff =
    typeof effectiveHours === 'number' && effectiveHours > 0
      ? now + effectiveHours * 3600_000
      : null;

  return picks.filter((p) => {
    if (p.bookmaker !== template.bookmaker) return false;
    // Discard matches that already kicked off in the past (allow 5min clock leeway)
    if (p.kickoff && p.kickoff < now - 5 * 60_000) return false;
    if (maxKickoff !== null && p.kickoff > maxKickoff) return false;
    if (allowedLeagues && (!p.league || !allowedLeagues.has(p.league.trim().toLowerCase()))) return false;
    return matchesTemplateCards(p, template.cards);
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

import type { AiPick } from './ai-picks.ts';
import type { Tier } from './criteria.ts';
import { CARDS, CARD_IDS, defaultCards, type CardId, type CardsState } from './market-cards.ts';
import type { Bookmaker } from './types.ts';

export type FilterState = {
  bookmaker: Bookmaker;
  withinHours: number | null;
  leagues: string[];
  cards: CardsState;
};

export function createDefaultFilterState(bookmaker: Bookmaker = 'sportybet'): FilterState {
  return {
    bookmaker,
    withinHours: null,
    leagues: [],
    cards: defaultCards(),
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function normalizeCardsState(raw: unknown): CardsState {
  const fallback = defaultCards();
  if (!raw || typeof raw !== 'object') return fallback;
  const rec = raw as Record<string, unknown>;
  const out: Partial<CardsState> = {};

  for (const def of CARDS) {
    const base = fallback[def.id];
    const item = rec[def.id];
    if (!item || typeof item !== 'object') {
      out[def.id] = base;
      continue;
    }
    const x = item as Record<string, unknown>;
    const rawLow = typeof x.low === 'number' && Number.isFinite(x.low) ? x.low : base.low;
    const rawHigh = typeof x.high === 'number' && Number.isFinite(x.high) ? x.high : base.high;
    const low = round2(clamp(rawLow, def.min, def.max));
    const high = round2(clamp(Math.max(low, rawHigh), low, def.max));
    const subs = Array.isArray(x.subs)
      ? x.subs.filter((s): s is string => typeof s === 'string').slice(0, 20)
      : [...base.subs];
    out[def.id] = {
      on: typeof x.on === 'boolean' ? x.on : base.on,
      low,
      high,
      subs,
    };
  }
  return out as CardsState;
}

export function normalizeFilterState(raw: unknown, fallbackBookmaker: Bookmaker = 'sportybet'): FilterState {
  const def = createDefaultFilterState(fallbackBookmaker);
  if (!raw || typeof raw !== 'object') return def;
  const x = raw as Record<string, unknown>;
  const bookmaker: Bookmaker =
    x.bookmaker === 'betpawa' || x.bookmaker === 'sportybet' ? x.bookmaker : def.bookmaker;
  const withinHours =
    x.withinHours === null || x.withinHours === undefined
      ? null
      : typeof x.withinHours === 'number' && Number.isFinite(x.withinHours) && x.withinHours > 0
        ? Math.min(24 * 14, Math.round(x.withinHours))
        : null;
  const leagues = Array.isArray(x.leagues)
    ? [...new Set(x.leagues.filter((l): l is string => typeof l === 'string' && l.trim().length > 0))]
    : [];
  const cards = x.cards ? normalizeCardsState(x.cards) : def.cards;
  return { bookmaker, withinHours, leagues, cards };
}

/**
 * Checks whether an AI pick satisfies the market card rules and odds bounds in `cards`.
 */
export function matchesCardsState(pick: AiPick, cards: CardsState): boolean {
  const anyOn = CARD_IDS.some((id) => cards[id]?.on);
  if (!anyOn) return true;

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

export type UnifiedPickFilterOptions = {
  bookmaker?: Bookmaker | string | null;
  withinHours?: number | null;
  leagues?: string[];
  cards?: CardsState | null;
  market?: string | null;
  tier?: Tier | '' | null;
  excludedGameIds?: Set<string>;
  /** Allow minor clock skew when checking past kickoffs (default: 0ms for strict cutoff, 5m if needed) */
  pastGraceMs?: number;
  nowMs?: number;
};

/**
 * Single shared filtering pipeline (Task 9): routes Builder, AI Picks, Templates, Chat, and AI Agent
 * through identical bookmaker, league, kickoff-time, market-card, and odds-bound rules.
 */
export function applyFilters(picks: AiPick[], opts: UnifiedPickFilterOptions): AiPick[] {
  const now = opts.nowMs ?? Date.now();
  const pastGrace = opts.pastGraceMs ?? 0;
  const hours = opts.withinHours;
  const cutoff =
    hours !== null && hours !== undefined && Number.isFinite(hours) && hours >= 0
      ? now + hours * 3_600_000
      : null;

  const leagues =
    opts.leagues && opts.leagues.length > 0
      ? new Set(opts.leagues.map((l) => l.trim().toLowerCase()))
      : null;

  return picks.filter((p) => {
    if (opts.bookmaker && p.bookmaker !== opts.bookmaker) return false;
    if (opts.market && p.marketKey !== opts.market) return false;
    if (opts.tier && p.tier !== opts.tier) return false;
    if (opts.excludedGameIds?.has(p.gameId)) return false;

    if (cutoff !== null) {
      if (p.kickoff < now - pastGrace || p.kickoff > cutoff) return false;
    } else if (pastGrace > 0 && p.kickoff && p.kickoff < now - pastGrace) {
      return false;
    }

    if (leagues) {
      const pLeague = (p.league?.trim() || 'Unknown league').toLowerCase();
      if (!leagues.has(pLeague)) return false;
    }

    if (opts.cards && !matchesCardsState(p, opts.cards)) return false;

    return true;
  });
}

export function applyFilterState(
  picks: AiPick[],
  state: FilterState,
  extra: Omit<UnifiedPickFilterOptions, 'bookmaker' | 'withinHours' | 'leagues' | 'cards'> = {},
): AiPick[] {
  return applyFilters(picks, {
    bookmaker: state.bookmaker,
    withinHours: state.withinHours,
    leagues: state.leagues,
    cards: state.cards,
    ...extra,
  });
}

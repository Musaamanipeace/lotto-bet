import { DOUBLE_CHANCE_SUBS, type PickRule } from './filters.ts';
import type { MarketKind } from './types.ts';

/** The market cards of the filter panel. Each card owns its submarket toggles and its own odds range. */
export type CardId = 'dc' | '1x2' | 'over' | 'under' | 'btts';
export const CARD_IDS: CardId[] = ['dc', '1x2', 'over', 'under', 'btts'];

export type SubOddsRange = {
  low: number;
  high: number;
};

export type CardState = {
  on: boolean;
  /** Odds range chosen for the card (or fallback for submarkets without an override). `high` at the track ceiling means "no upper limit". */
  low: number;
  high: number;
  /** Toggled submarkets: match-result picks (home/draw/away), DC picks (1X/12/X2), goal lines ('2.5'), or BTTS picks. */
  subs: string[];
  /** Optional per-submarket odds bounds keyed by submarket id (e.g. 'home', 'away', '1X', '2.5', 'GG'). */
  subRanges?: Record<string, SubOddsRange>;
};
export type CardsState = Record<CardId, CardState>;

export type CardDef = {
  id: CardId;
  title: string;
  hint: string;
  kind: MarketKind;
  /** Slider track. */
  min: number; max: number; step: number;
  defaults: CardState;
};

export const GOAL_LINES_FALLBACK = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5];
export const BTTS_CHOICES = [{ id: 'GG', label: 'GG (Yes)' }, { id: 'NGG', label: 'NGG (No)' }] as const;
export const DC_CHOICES = [
  { id: '1X', label: '1X', note: 'Home / Draw' },
  { id: '12', label: '12', note: 'Home / Away' },
  { id: 'X2', label: 'X2', note: 'Draw / Away' },
] as const;

export const MATCH_RESULT_CHOICES = [
  { id: 'home', label: 'Home', note: 'Home (1)' },
  { id: 'draw', label: 'Draw', note: 'Draw (X)' },
  { id: 'away', label: 'Away', note: 'Away (2)' },
] as const;

export const CARDS: CardDef[] = [
  { id: 'dc', title: 'Double Chance', hint: '1X, 12, X2', kind: 'double_chance', min: 1, max: 3, step: 0.01,
    defaults: { on: true, low: 1.08, high: 1.2, subs: [...DOUBLE_CHANCE_SUBS] } },
  { id: '1x2', title: 'Match Result (1X2)', hint: 'Home, Draw, Away — pick one or more', kind: '1x2', min: 1, max: 6, step: 0.01,
    defaults: { on: true, low: 1.3, high: 2.5, subs: ['home', 'draw', 'away'] } },
  { id: 'over', title: 'Over Goals', hint: 'Pick one or more lines', kind: 'over_under', min: 1.01, max: 3, step: 0.01,
    defaults: { on: true, low: 1.01, high: 3, subs: ['0.5'] } },
  { id: 'under', title: 'Under Goals', hint: 'Pick one or more lines', kind: 'over_under', min: 1.01, max: 3, step: 0.01,
    defaults: { on: true, low: 1.05, high: 3, subs: ['3.5'] } },
  { id: 'btts', title: 'Both Teams To Score', hint: 'GG and / or NGG', kind: 'btts', min: 1.01, max: 3, step: 0.01,
    defaults: { on: true, low: 1.2, high: 3, subs: ['GG'] } },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c])) as Record<CardId, CardDef>;

const copy = (s: CardState): CardState => ({
  on: s.on,
  low: s.low,
  high: s.high,
  subs: [...s.subs],
  ...(s.subRanges ? { subRanges: Object.fromEntries(Object.entries(s.subRanges).map(([k, v]) => [k, { ...v }])) } : {}),
});

export function defaultCards(): CardsState {
  return Object.fromEntries(CARDS.map((c) => [c.id, copy(c.defaults)])) as CardsState;
}

/** "Reset all": every card off, ranges fully open, toggles back to their defaults so a card is usable when switched on again. */
export function clearedCards(): CardsState {
  return Object.fromEntries(CARDS.map((c) => [c.id, { ...copy(c.defaults), on: false, low: c.min, high: c.max }])) as CardsState;
}

/** "All on": every card on, every submarket selected, every odds range fully open — the widest possible pool. */
export function allAvailableCards(goalLines: number[] = []): CardsState {
  const lines = goalLines.length ? goalLines : GOAL_LINES_FALLBACK;
  const subsFor = (id: CardId): string[] => {
    switch (id) {
      case 'dc': return [...DOUBLE_CHANCE_SUBS];
      case '1x2': return MATCH_RESULT_CHOICES.map((m) => m.id);
      case 'over':
      case 'under': return lines.map(String);
      case 'btts': return BTTS_CHOICES.map((b) => b.id);
    }
  };
  return Object.fromEntries(CARDS.map((c) => [c.id, { on: true, low: c.min, high: c.max, subs: subsFor(c.id) }])) as CardsState;
}

/** "Solo": this card on, every other card off. Ranges and toggles are left as they are. */
export function soloCard(cards: CardsState, id: CardId): CardsState {
  return Object.fromEntries(CARD_IDS.map((k) => [k, { ...cards[k], on: k === id }])) as CardsState;
}

/** The reset arrow on one card: back to its default range and toggles, on/off state untouched. */
export function resetCard(cards: CardsState, id: CardId): CardsState {
  return { ...cards, [id]: { ...copy(CARD_BY_ID[id].defaults), on: cards[id].on } };
}

/** Flip one submarket toggle. Switching a toggle on also switches its card on. */
export function toggleSub(cards: CardsState, id: CardId, sub: string): CardsState {
  const cur = cards[id];
  const has = cur.subs.includes(sub);
  const subs = has ? cur.subs.filter((s) => s !== sub) : [...cur.subs, sub];
  return { ...cards, [id]: { ...cur, subs, on: has ? cur.on : true } };
}

/** Set a custom min/max odds range for a specific submarket on a card. */
export function setSubRange(cards: CardsState, id: CardId, sub: string, low: number, high: number): CardsState {
  const cur = cards[id];
  const nextSubRanges: Record<string, SubOddsRange> = {
    ...(cur.subRanges ?? {}),
    [sub]: { low: round2(low), high: round2(high) },
  };
  return { ...cards, [id]: { ...cur, subRanges: nextSubRanges } };
}

/** Remove a custom min/max odds override for a submarket so it falls back to the card's shared range. */
export function clearSubRange(cards: CardsState, id: CardId, sub: string): CardsState {
  const cur = cards[id];
  if (!cur.subRanges || !(sub in cur.subRanges)) return cards;
  const nextSubRanges = { ...cur.subRanges };
  delete nextSubRanges[sub];
  const hasAny = Object.keys(nextSubRanges).length > 0;
  const nextCard: CardState = {
    on: cur.on,
    low: cur.low,
    high: cur.high,
    subs: [...cur.subs],
    ...(hasAny ? { subRanges: nextSubRanges } : {}),
  };
  return { ...cards, [id]: nextCard };
}

/** Get the effective { low, high } bounds for a specific submarket on a card. */
export function effectiveSubRange(card: CardState, sub: string): SubOddsRange {
  const custom = card.subRanges?.[sub];
  return custom ? { low: custom.low, high: custom.high } : { low: card.low, high: card.high };
}

export const isSolo = (cards: CardsState, id: CardId) => cards[id].on && CARD_IDS.every((k) => k === id || !cards[k].on);

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Translate the enabled cards into the rules the games API understands. */
export function cardsToRules(cards: CardsState): PickRule[] {
  const rules: PickRule[] = [];
  for (const def of CARDS) {
    const c = cards[def.id];
    if (!c.on) continue;
    const rangeFor = (low: number, high: number) => ({
      ...(low > def.min ? { oddsMin: round2(low) } : {}),
      ...(high < def.max ? { oddsMax: round2(high) } : {}),
    });
    const hasCustomSubs = Boolean(c.subRanges && c.subs.some((s) => Boolean(c.subRanges?.[s])));

    if (!hasCustomSubs) {
      const range = rangeFor(c.low, c.high);
      switch (def.id) {
        case '1x2': {
          if (c.subs.length === 0) break; // card is on but nothing picked: matches nothing
          const all = MATCH_RESULT_CHOICES.every((m) => c.subs.includes(m.id));
          rules.push({ kind: '1x2', ...(all ? {} : { subs: c.subs }), ...range });
          break;
        }
        case 'dc': {
          if (c.subs.length === 0) break; // card is on but nothing picked: matches nothing
          const all = DOUBLE_CHANCE_SUBS.every((s) => c.subs.includes(s));
          rules.push({ kind: 'double_chance', ...(all ? {} : { subs: c.subs }), ...range });
          break;
        }
        case 'over':
        case 'under': {
          const lines = c.subs.map(Number).filter(Number.isFinite);
          if (lines.length === 0) break;
          rules.push({ kind: 'over_under', subs: [def.id], lines, ...range });
          break;
        }
        case 'btts': {
          if (c.subs.length === 0) break;
          const all = BTTS_CHOICES.every((b) => c.subs.includes(b.id));
          rules.push({ kind: 'btts', ...(all ? {} : { subs: c.subs.map((s) => (s === 'GG' ? 'yes' : 'no')) }), ...range });
          break;
        }
      }
      continue;
    }

    if (c.subs.length === 0) continue;
    const groups = new Map<string, { low: number; high: number; subs: string[] }>();
    for (const sub of c.subs) {
      const eff = effectiveSubRange(c, sub);
      const low = round2(eff.low);
      const high = round2(eff.high);
      const key = `${low}|${high}`;
      const g = groups.get(key);
      if (g) g.subs.push(sub);
      else groups.set(key, { low, high, subs: [sub] });
    }

    for (const g of groups.values()) {
      const range = rangeFor(g.low, g.high);
      switch (def.id) {
        case '1x2':
          rules.push({ kind: '1x2', subs: g.subs, ...range });
          break;
        case 'dc':
          rules.push({ kind: 'double_chance', subs: g.subs, ...range });
          break;
        case 'over':
        case 'under': {
          const lines = g.subs.map(Number).filter(Number.isFinite);
          if (lines.length > 0) rules.push({ kind: 'over_under', subs: [def.id], lines, ...range });
          break;
        }
        case 'btts':
          rules.push({ kind: 'btts', subs: g.subs.map((s) => (s === 'GG' ? 'yes' : 'no')), ...range });
          break;
      }
    }
  }
  return rules;
}

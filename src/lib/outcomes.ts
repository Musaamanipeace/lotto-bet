import type { Bookmaker, MarketKind, Outcome } from './types.ts';

export type OutcomeKey = 'home' | 'draw' | 'away' | 'yes' | 'no' | 'over' | 'under';
export const OUTCOME_KEYS: OutcomeKey[] = ['home', 'draw', 'away', 'yes', 'no', 'over', 'under'];

/** SportyBet outcome ids: 1X2 = 1/2/3 and BTTS = 74/76 (verified in the spec). */
const SPORTY_BY_ID: Partial<Record<MarketKind, Record<string, OutcomeKey>>> = {
  '1x2': { '1': 'home', '2': 'draw', '3': 'away' },
  btts: { '74': 'yes', '76': 'no' },
};

/**
 * UNVERIFIED (awaiting a live betPawa payload): betPawa price names. A name that does not
 * match makes the leg "unmapped" with a visible reason; nothing is guessed.
 */
export const BETPAWA_BY_NAME: Partial<Record<MarketKind, Record<string, OutcomeKey>>> = {
  '1x2': { '1': 'home', x: 'draw', '2': 'away' },
  btts: { yes: 'yes', no: 'no' },
  over_under: { over: 'over', under: 'under' },
};

/**
 * Double chance outcomes are intentionally NOT identified: their ids/names were never verified.
 * SportyBet over/under is identified from the outcome description (over/under).
 */
export function outcomeKeyOf(bookmaker: Bookmaker, kind: MarketKind, o: Pick<Outcome, 'nativeId' | 'desc'>): OutcomeKey | null {
  if (bookmaker === 'sportybet') {
    if (kind === 'over_under') {
      const d = o.desc.trim().toLowerCase();
      return d.startsWith('over') ? 'over' : d.startsWith('under') ? 'under' : null;
    }
    return SPORTY_BY_ID[kind]?.[o.nativeId] ?? null;
  }
  return BETPAWA_BY_NAME[kind]?.[o.desc.trim().toLowerCase()] ?? null;
}

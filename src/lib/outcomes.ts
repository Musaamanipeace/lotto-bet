import type { Bookmaker, MarketKind, Outcome } from './types.ts';

export type OutcomeKey = 'home' | 'draw' | 'away' | 'yes' | 'no' | 'over' | 'under';
export const OUTCOME_KEYS: OutcomeKey[] = ['home', 'draw', 'away', 'yes', 'no', 'over', 'under'];

/**
 * Verified SportyBet outcome ids:
 * - 1X2 = 1/2/3, BTTS = 74/76
 * - match winner (tennis 186) / moneyline (basketball 219) = 4/5
 */
const SPORTY_BY_ID: Partial<Record<MarketKind, Record<string, OutcomeKey>>> = {
  '1x2': { '1': 'home', '2': 'draw', '3': 'away' },
  btts: { '74': 'yes', '76': 'no' },
  match_winner: { '4': 'home', '5': 'away' },
};

/**
 * Double chance outcomes are intentionally NOT identified: their ids were never verified.
 * SportyBet over/under is identified from the outcome description (over/under).
 * Anything unknown returns null; nothing is guessed.
 */
export function outcomeKeyOf(bookmaker: Bookmaker, kind: MarketKind, o: Pick<Outcome, 'nativeId' | 'desc'>): OutcomeKey | null {
  if (bookmaker !== 'sportybet') return null;
  if (kind === 'over_under') {
    const d = o.desc.trim().toLowerCase();
    return d.startsWith('over') ? 'over' : d.startsWith('under') ? 'under' : null;
  }
  return SPORTY_BY_ID[kind]?.[o.nativeId] ?? null;
}

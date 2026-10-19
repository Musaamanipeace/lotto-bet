import type { PickRow } from './filters.ts';
import type { AiPick } from './ai-picks.ts';
import type { PickMarketKey } from './criteria.ts';
import type { OutcomeKey } from './outcomes.ts';
import type { Bookmaker, MarketKind } from './types.ts';

type Shape = { kind: MarketKind; line: number | null; label: string; key: OutcomeKey | null };

/** The market kinds a slip leg can represent. Anything else (cards, corners) has no PickRow shape and is skipped. */
const SHAPES: Partial<Record<PickMarketKey, Shape>> = {
  home_win: { kind: '1x2', line: null, label: 'Home', key: 'home' },
  away_win: { kind: '1x2', line: null, label: 'Away', key: 'away' },
  double_chance_1x: { kind: 'double_chance', line: null, label: '1X', key: null },
  double_chance_12: { kind: 'double_chance', line: null, label: '12', key: null },
  over_0_5: { kind: 'over_under', line: 0.5, label: 'Over 0.5', key: 'over' },
  over_1_5: { kind: 'over_under', line: 1.5, label: 'Over 1.5', key: 'over' },
  under_3_5: { kind: 'over_under', line: 3.5, label: 'Under 3.5', key: 'under' },
  under_4_5: { kind: 'over_under', line: 4.5, label: 'Under 4.5', key: 'under' },
};

type AiPickLeg = Pick<AiPick, 'gameId' | 'bookmaker' | 'marketKey' | 'marketNativeId' | 'outcomeNativeId' | 'specifier' | 'odds' | 'impliedProbability' | 'kickoff' | 'league' | 'home' | 'away'>;

/**
 * Turns a stored AI pick into a slip leg. A game id is `<bookmaker>:<nativeEventId>` and a SportyBet native event id
 * itself contains colons ("sr:match:123"), so the event id is everything after the first prefix, never `split(':')[1]`.
 * Returns null when the pick cannot be represented, so it is skipped instead of producing a leg that cannot be booked.
 */
export function aiPickToRow(p: AiPickLeg): PickRow | null {
  if (p.bookmaker !== 'sportybet' && p.bookmaker !== 'betpawa') return null;
  const prefix = `${p.bookmaker}:`;
  if (!p.gameId.startsWith(prefix) || p.gameId.length === prefix.length) return null;
  const shape = SHAPES[p.marketKey];
  if (!shape) return null;
  return {
    gameId: p.gameId, nativeEventId: p.gameId.slice(prefix.length), bookmaker: p.bookmaker as Bookmaker,
    home: p.home, away: p.away, kickoff: p.kickoff, league: p.league,
    pick: shape.label, odds: p.odds,
    marketNativeId: p.marketNativeId, outcomeNativeId: p.outcomeNativeId, specifier: p.specifier,
    marketKind: shape.kind, line: shape.line, outcomeKey: shape.key, implied: p.impliedProbability,
  };
}

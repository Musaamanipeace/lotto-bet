export type Bookmaker = 'sportybet' | 'betpawa';

export const BOOKMAKER_LABEL: Record<Bookmaker, string> = {
  sportybet: 'SportyBet',
  betpawa: 'betPawa',
};

/** Only kinds verified from live data are listed. Anything else is `null` (unavailable). */
export type MarketKind = '1x2' | 'double_chance' | 'over_under' | 'btts';

export type Outcome = {
  bookmaker: Bookmaker;
  /** Native outcome id (SportyBet) or price id (betPawa; these EXPIRE, never cache for scripts). */
  nativeId: string;
  desc: string;
  odds: number;
  isActive: boolean;
};

export type Market = {
  bookmaker: Bookmaker;
  nativeId: string;
  specifier: string;
  /** Goal/card line for over_under markets, null when not identified. */
  line: number | null;
  kind: MarketKind | null;
  /** Set whenever the market is present but cannot be used, with the reason. */
  unavailableReason: string | null;
  outcomes: Outcome[];
};

export type Game = {
  /** `${bookmaker}:${nativeEventId}` so ids never collide across bookmakers. */
  id: string;
  bookmaker: Bookmaker;
  nativeEventId: string;
  home: string;
  away: string;
  /** Kickoff, epoch milliseconds. */
  kickoff: number;
  league: string | null;
  markets: Market[];
  fetchRunId: string | null;
};

export type Pick = {
  gameId: string;
  bookmaker: Bookmaker;
  marketNativeId: string;
  outcomeNativeId: string;
  specifier: string;
  odds: number;
  kickoff: number;
  league: string | null;
};

/** Records something dropped while parsing, so nothing is lost silently. */
export type Skipped = { ref: string; reason: string };

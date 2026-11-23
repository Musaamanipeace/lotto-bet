export type Bookmaker = 'sportybet' | 'betpawa';

export const BOOKMAKER_LABEL: Record<Bookmaker, string> = {
  sportybet: 'SportyBet',
  betpawa: 'betPawa',
};

export type Sport = 'football' | 'tennis' | 'basketball';

/** Every sport the refresh pipeline fetches, in request order. */
export const SPORTS: Sport[] = ['football', 'tennis', 'basketball'];

/** Only kinds verified from live data are listed. Anything else is `null` (unavailable). */
export type MarketKind = '1x2' | 'double_chance' | 'over_under' | 'btts' | 'match_winner' | 'total';

/** Market periods: football FT; new-sports per-sport lines (Football FT, Q1–Q4, H1/H2). */
export type MarketPeriod = 'ft' | 'q1' | 'q2' | 'q3' | 'q4' | 'h1' | 'h2' | null;

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
  /** For new-sports markets: 'q1'..'q4' for quarters, 'h1'/'h2' for halves, null otherwise. */
  period?: MarketPeriod;
};

export type Game = {
  /** `${bookmaker}:${nativeEventId}` so ids never collide across bookmakers. */
  id: string;
  bookmaker: Bookmaker;
  sport: Sport;
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

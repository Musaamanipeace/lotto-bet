export type BookieId =
  | 'sportybet:ke'
  | 'betpawa:ke'
  | '1xbet:ke'
  | 'mozzart:ke'
  | 'sportpesa:ke';

export interface H2HMatch {
  date: string;
  homeTeam: string;
  awayTeam: string;
  home_score: number;
  away_score: number;
  relevant: boolean;
}

export interface MarketPick {
  pick: string;
  odd: number;
  marketName: string;
}

export interface GameMarkets {
  doubleChance?: { pick: '1X' | 'X2' | '12' | string; odd: number }[];
  homeWin?: { pick: '1'; odd: number };
  draw?: { pick: 'X'; odd: number };
  awayWin?: { pick: '2'; odd: number };
  overUnder?: { pick: 'Over 0.5' | 'Under 3.5' | 'Over 1.5' | 'Under 4.5' | string; odd: number }[];
  /** Both teams to score (GG / NG / NGG) */
  btts?: { pick: 'GG' | 'NG' | 'NGG' | string; odd: number }[];
}

export interface SportyBetOutcome {
  outcomeId: string;
  name: string;
  odd: number;
}

export interface SportyBetMarket {
  marketId: string;
  name: string;
  specifier: string | null;
  outcomes: SportyBetOutcome[];
}

export interface StandardGame {
  id: string;
  eventId?: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  country?: string;
  kickoffTime: string;
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'CANCELLED' | 'POSTPONED';
  bookies: BookieId[];
  markets: GameMarkets;
  companyOdds?: Partial<Record<BookieId, GameMarkets>>;
  sportyMarkets?: SportyBetMarket[];
  cashoutAvailable?: boolean;
  h2hRecent5?: H2HMatch[];
  abnormalOddsFlag?: boolean;
  insights?: MatchInsights;
}

export interface SelectedPick {
  gameId: string;
  eventId?: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoffTime: string;
  marketName: 'Double Chance' | 'Home Win' | 'Over 0.5' | 'Under 3.5' | 'Over 1.5' | 'Under 4.5' | 'BTTS' | string;
  pick: string;
  odd: number;
  marketId?: string;
  outcomeId?: string;
  specifier?: string | null;
  bookie?: BookieId;
}

export interface FilterCriteria {
  selectedCompany: 'ALL' | BookieId;
  dcMin: number;
  dcMax: number;
  enableDoubleChance: boolean;
  enableDc1X?: boolean;
  enableDc12?: boolean;
  enableDcX2?: boolean;
  enableHomeWin: boolean;
  homeWinMin: number;
  homeWinMax: number;
  enableAwayWin: boolean;
  awayWinMin: number;
  awayWinMax: number;
  enableOver: boolean;
  overGoalLine: '0.5' | '1.5';
  /** Multi-selection: 0.5 and 1.5 can both be active */
  overGoalLines?: ('0.5' | '1.5')[];
  /** Odds range for Over markets */
  overMin: number;
  overMax: number;
  enableUnder: boolean;
  /** Multi-selection: 3.5 and 4.5 can both be active */
  underGoalLines: ('3.5' | '4.5')[];
  underGoalLine?: '3.5' | '4.5';
  /** Odds range for Under markets */
  underMin: number;
  underMax: number;
  enableBtts: boolean;
  /** Multi-selection: GG (Yes) and NGG (No) can both be active */
  bttsSelections: ('GG' | 'NGG')[];
  /** Odds range for BTTS (GG/NG) */
  bttsMin: number;
  bttsMax: number;
  /** Filter to only games with Cashout available */
  cashoutOnly: boolean;
  timeframeHours: number | null;
  pickCount: number;
  searchQuery: string;
  selectedLeague: string;
  /** When true, only games with complete market IDs are used */
  requireFullMarketData: boolean;
  /** Active picking strategy: AI Educated Pick vs Random Pick */
  pickingStrategy?: 'ai' | 'random';
}

export type SlipResultStatus = 'open' | 'won' | 'lost' | 'void' | 'unknown';

export interface SavedBetslip {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  selections: SelectedPick[];
  totalOdds: number;
  bookingCode?: string;
  stake?: number;
  status: SlipResultStatus;
  notes?: string;
  /** ISO kickoff of earliest leg — used to flag expired tickets */
  earliestKickoff?: string;
}

export type AIProvider = 'gemini' | 'openrouter' | 'mistral';

export interface ByokKeys {
  aiProvider: AIProvider;
  geminiKey: string;
  openrouterKey: string;
  mistralKey: string;
  geminiModel?: string;
  openrouterModel?: string;
  mistralModel?: string;
  theSportsDbKey: string;
  apiFootballKey: string;
  hasSkippedOnboarding: boolean;
}

export interface UserProfile {
  username: string;
  /** SHA-256 hex of password+salt — client-side only, not a bank */
  passwordHash: string;
  createdAt: string;
  /** Optional LLM API key stored only in this browser */
  llmApiKey?: string;
  /** openai | gemini | openrouter | mistral | compatible */
  llmProvider?: 'openai' | 'gemini' | 'openrouter' | 'mistral' | 'compatible';
  llmBaseUrl?: string;
  llmModel?: string;
}

export interface BookingCodeResponse {
  success: boolean;
  bookingCode: string;
  destinationBookie: BookieId;
  bookieName: string;
  matchCount: number;
  totalOdds: number;
  generatedAt: string;
  expiresAt: string;
  directUrl: string;
  deepLink?: string;
  selections: SelectedPick[];
  bonusPercentage?: number;
  error?: string;
}

export interface TeamFormStats {
  teamName: string;
  form: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  formScore: number;
  goalsFor: number;
  goalsAgainst: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  source: string;
}

export interface InjuryInfo {
  teamName: string;
  players: { name: string; position: string; severity: number }[];
  severity: number;
  source: string;
}

export interface MatchInsights {
  homeForm?: TeamFormStats | null;
  awayForm?: TeamFormStats | null;
  homeInjuries?: InjuryInfo | null;
  awayInjuries?: InjuryInfo | null;
  formEdge: number;
  injuryDrag: number;
  enrichedAt: string;
}


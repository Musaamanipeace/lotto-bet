export type BookieId = 'sportybet:ke' | 'betpawa:ke';

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
  overUnder?: { pick: 'Over 0.5' | 'Under 3.5' | 'Over 1.5' | 'Under 2.5' | string; odd: number }[];
}

export interface StandardGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  country?: string;
  kickoffTime: string; // ISO 8601 string
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'CANCELLED' | 'POSTPONED';
  bookies: BookieId[];
  markets: GameMarkets;
  companyOdds?: Partial<Record<BookieId, GameMarkets>>;
}

export interface SelectedPick {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoffTime: string;
  marketName: 'Double Chance' | 'Home Win' | 'Over 0.5' | 'Under 3.5' | string;
  pick: string;
  odd: number;
  bookie?: BookieId;
}

export interface FilterCriteria {
  selectedCompany: 'ALL' | BookieId; // Filter by company: ALL, betpawa:ke, sportybet:ke
  dcMin: number;
  dcMax: number;
  homeWinMin: number;
  homeWinMax: number;
  enableDoubleChance: boolean;
  enableHomeWin: boolean;
  enableOver05: boolean;
  enableUnder35: boolean;
  timeframeHours: number | null; // e.g. 3, 6, 12, 24, 48, null for all
  pickCount: number; // default: 30
  searchQuery: string;
  selectedLeague: string; // 'ALL' or specific league name
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
  selections: SelectedPick[];
  bonusPercentage?: number;
  error?: string;
}

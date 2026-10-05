import { FilterCriteria, BookieId, SportyBetMarket } from '@/types';

/** Shared odds-slider ceiling so ranges are not hard-capped too low */
export const ODDS_SLIDER_MAX = 10;

export const DEFAULT_FILTER_CRITERIA: FilterCriteria = {
  selectedCompany: 'ALL',
  dcMin: 1.08,
  dcMax: 1.20,
  homeWinMin: 1.30,
  homeWinMax: 1.50,
  enableDoubleChance: true,
  enableHomeWin: true,
  enableAwayWin: true,
  awayWinMin: 1.50,
  awayWinMax: 1.60,
  enableOver: true,
  overGoalLine: '0.5',
  overMin: 1.01,
  overMax: 1.50,
  enableUnder: true,
  underGoalLine: '3.5',
  underMin: 1.05,
  underMax: 1.80,
  enableBtts: true,
  bttsMin: 1.20,
  bttsMax: 2.50,
  timeframeHours: 24,
  pickCount: 30,
  searchQuery: '',
  selectedLeague: 'ALL',
  requireFullMarketData: false,
};

export interface BookieMeta {
  id: BookieId;
  name: string;
  shortName: string;
  tagline: string;
  codePrefix: string;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  homeUrl: string;
  bookingUrl: string;
  minStake: number;
  bonusLabel: string;
}

export const BOOKIE_CONFIGS: Record<BookieId, BookieMeta> = {
  'sportybet:ke': {
    id: 'sportybet:ke',
    name: 'SportyBet Kenya',
    shortName: 'SportyBet',
    tagline: 'Instant Booking Codes • Live Cashout',
    codePrefix: 'SB',
    accentColor: '#ef4444',
    badgeBg: 'bg-red-500/15',
    badgeBorder: 'border-red-500/40',
    badgeText: 'text-red-400',
    homeUrl: 'https://www.sportybet.com/ke/',
    bookingUrl: 'https://www.sportybet.com/ke/sport/football',
    minStake: 15,
    bonusLabel: 'Multi Bonus',
  },
};

export const TIMEFRAME_OPTIONS = [
  { label: 'Next 3h', value: 3 },
  { label: 'Next 6h', value: 6 },
  { label: 'Next 12h', value: 12 },
  { label: 'Next 24h', value: 24 },
  { label: 'Next 48h', value: 48 },
  { label: 'All Upcoming', value: null },
];

export const PICK_COUNT_PRESETS = [5, 10, 15, 20, 30, 50];

/**
 * Calculates bookie accumulator win bonus percentage based on legs count.
 * E.g. SportyBet gives:
 * 3 legs: 3%, 5 legs: 10%, 10 legs: 30%, 15 legs: 50%, 20 legs: 100%, 30 legs: 250%, 40+ legs: up to 1000%!
 */
export function getCompanyBonusPercentage(bookie: BookieId, legCount: number): number {
  if (legCount < 3) return 0;
  // SportyBet
  if (legCount >= 40) return 1000;
  if (legCount >= 30) return 250;
  if (legCount >= 20) return 100;
  if (legCount >= 15) return 50;
  if (legCount >= 10) return 30;
  if (legCount >= 5) return 10;
  return 3;
}

export const SPORTYBET_MARKET_IDS = {
  MATCH_WINNER: '1',
  DOUBLE_CHANCE: '10',
  OVER_UNDER: '18',
  BTTS: '29', // GG/NG both teams to score
} as const;

export const SPORTYBET_API_BASE = 'https://www.sportybet.com/api/ke';

/** Base upcoming-events endpoint; query params are added by oddsFetcher */
export const SPORTYBET_UPCOMING_EVENTS_URL =
  'https://www.sportybet.com/api/ke/factsCenter/pcUpcomingEvents';

export const SPORTYBET_SHARE_URL = 'https://www.sportybet.com/api/ke/orders/share';

export const SPORTYBET_DEEP_LINK_BASE = 'https://www.sportybet.com/ke/?shareCode=';

export const MARKET_NAME_TO_ID = new Map<string, string>([
  ['Double Chance', SPORTYBET_MARKET_IDS.DOUBLE_CHANCE],
  ['Home Win', SPORTYBET_MARKET_IDS.MATCH_WINNER],
  ['Over 0.5', SPORTYBET_MARKET_IDS.OVER_UNDER],
  ['Over 1.5', SPORTYBET_MARKET_IDS.OVER_UNDER],
  ['Under 3.5', SPORTYBET_MARKET_IDS.OVER_UNDER],
  ['Under 4.5', SPORTYBET_MARKET_IDS.OVER_UNDER],
  ['BTTS', SPORTYBET_MARKET_IDS.BTTS],
  ['GG', SPORTYBET_MARKET_IDS.BTTS],
  ['NG', SPORTYBET_MARKET_IDS.BTTS],
]);

export function getMarketIdForPick(marketName: string): string | undefined {
  return MARKET_NAME_TO_ID.get(marketName);
}

export function isSportyBetMarket(market: SportyBetMarket): boolean {
  return (
    market.marketId === SPORTYBET_MARKET_IDS.MATCH_WINNER ||
    market.marketId === SPORTYBET_MARKET_IDS.DOUBLE_CHANCE ||
    market.marketId === SPORTYBET_MARKET_IDS.OVER_UNDER ||
    market.marketId === SPORTYBET_MARKET_IDS.BTTS
  );
}


import { FilterCriteria, BookieId, SportyBetMarket } from '@/types';

/** Shared odds-slider ceiling so ranges are not hard-capped too low */
export const ODDS_SLIDER_MAX = 10;

export const DEFAULT_FILTER_CRITERIA: FilterCriteria = {
  selectedCompany: 'ALL',
  dcMin: 1.00,
  dcMax: 2.00,
  enableDoubleChance: true,
  enableDc1X: true,
  enableDc12: true,
  enableDcX2: true,
  enableHomeWin: true,
  homeWinMin: 1.00,
  homeWinMax: 3.00,
  enableAwayWin: true,
  awayWinMin: 1.00,
  awayWinMax: 3.00,
  enableOver: true,
  overGoalLines: ['0.5', '1.5'],
  overGoalLine: '0.5',
  overMin: 1.01,
  overMax: 3.00,
  enableUnder: true,
  underGoalLines: ['3.5', '4.5'],
  underGoalLine: '3.5',
  underMin: 1.01,
  underMax: 3.00,
  enableBtts: true,
  bttsSelections: ['GG', 'NGG'],
  bttsMin: 1.01,
  bttsMax: 3.00,
  cashoutOnly: false,
  timeframeHours: 24,
  pickCount: 30,
  searchQuery: '',
  selectedLeagues: [],
  requireFullMarketData: false,
  pickingStrategy: 'ai',
};

/**
 * Empty / cleared criteria fallback
 */
export const EMPTY_FILTER_CRITERIA: FilterCriteria = {
  selectedCompany: 'ALL',
  dcMin: 1.00,
  dcMax: 2.00,
  enableDoubleChance: false,
  enableDc1X: false,
  enableDc12: false,
  enableDcX2: false,
  enableHomeWin: false,
  homeWinMin: 1.00,
  homeWinMax: 3.00,
  enableAwayWin: false,
  awayWinMin: 1.00,
  awayWinMax: 3.00,
  enableOver: false,
  overGoalLines: [],
  overGoalLine: '0.5',
  overMin: 1.01,
  overMax: 3.00,
  enableUnder: false,
  underGoalLines: [],
  underGoalLine: '3.5',
  underMin: 1.01,
  underMax: 3.00,
  enableBtts: false,
  bttsSelections: [],
  bttsMin: 1.01,
  bttsMax: 3.00,
  cashoutOnly: false,
  timeframeHours: null,
  pickCount: 30,
  searchQuery: '',
  selectedLeagues: [],
  requireFullMarketData: false,
  pickingStrategy: 'ai',
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
  'betpawa:ke': {
    id: 'betpawa:ke',
    name: 'betPawa Kenya',
    shortName: 'betPawa',
    tagline: 'Win Bonus up to 1000% • 1 KSh Min Stake',
    codePrefix: 'BP',
    accentColor: '#10b981',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/40',
    badgeText: 'text-emerald-400',
    homeUrl: 'https://www.betpawa.co.ke/',
    bookingUrl: 'https://www.betpawa.co.ke/',
    minStake: 1,
    bonusLabel: '1000% Win Bonus',
  },
  '1xbet:ke': {
    id: '1xbet:ke',
    name: '1xBet Kenya',
    shortName: '1xBet',
    tagline: 'High Odds • Extensive Feed',
    codePrefix: '1X',
    accentColor: '#3b82f6',
    badgeBg: 'bg-blue-500/15',
    badgeBorder: 'border-blue-500/40',
    badgeText: 'text-blue-400',
    homeUrl: 'https://1xbet.co.ke/',
    bookingUrl: 'https://1xbet.co.ke/en/line/football',
    minStake: 22,
    bonusLabel: 'Acca Boost',
  },
  'mozzart:ke': {
    id: 'mozzart:ke',
    name: 'Mozzart Bet Kenya',
    shortName: 'Mozzart',
    tagline: 'Super Multi Bonus • Big Payouts',
    codePrefix: 'MZ',
    accentColor: '#f59e0b',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/40',
    badgeText: 'text-amber-400',
    homeUrl: 'https://www.mozzartbet.co.ke/',
    bookingUrl: 'https://www.mozzartbet.co.ke/en/sports-betting',
    minStake: 20,
    bonusLabel: 'Super Multi Bonus',
  },
  'sportpesa:ke': {
    id: 'sportpesa:ke',
    name: 'SportPesa Kenya',
    shortName: 'SportPesa',
    tagline: 'Premier Kenyan Sportsbook',
    codePrefix: 'SP',
    accentColor: '#0284c7',
    badgeBg: 'bg-sky-500/15',
    badgeBorder: 'border-sky-500/40',
    badgeText: 'text-sky-400',
    homeUrl: 'https://www.sportpesa.co.ke/',
    bookingUrl: 'https://www.sportpesa.co.ke/',
    minStake: 49,
    bonusLabel: 'Mega Acca Bonus',
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
  if (bookie === 'betpawa:ke') {
    if (legCount >= 45) return 1000;
    if (legCount >= 30) return 300;
    if (legCount >= 20) return 120;
    if (legCount >= 15) return 60;
    if (legCount >= 10) return 35;
    if (legCount >= 5) return 10;
    return 3;
  }
  if (bookie === 'mozzart:ke') {
    if (legCount < 4) return 0;
    if (legCount >= 40) return 1000;
    if (legCount >= 25) return 200;
    if (legCount >= 15) return 60;
    if (legCount >= 10) return 30;
    if (legCount >= 5) return 10;
    return 5;
  }
  if (bookie === '1xbet:ke') {
    if (legCount < 4) return 0;
    if (legCount >= 20) return 100;
    if (legCount >= 15) return 50;
    if (legCount >= 10) return 25;
    if (legCount >= 5) return 10;
    return 5;
  }
  if (bookie === 'sportpesa:ke') {
    if (legCount >= 35) return 500;
    if (legCount >= 25) return 150;
    if (legCount >= 15) return 50;
    if (legCount >= 10) return 25;
    if (legCount >= 5) return 10;
    return 3;
  }
  // SportyBet default
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


import { FilterCriteria, BookieId } from '@/types';

export const DEFAULT_FILTER_CRITERIA: FilterCriteria = {
  selectedCompany: 'ALL',
  dcMin: 1.08,
  dcMax: 1.20,
  homeWinMin: 1.30,
  homeWinMax: 1.50,
  enableDoubleChance: true,
  enableHomeWin: true,
  enableOver05: true,
  enableUnder35: true,
  timeframeHours: 24,
  pickCount: 30,
  searchQuery: '',
  selectedLeague: 'ALL',
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
  'betpawa:ke': {
    id: 'betpawa:ke',
    name: 'betPawa Kenya',
    shortName: 'betPawa',
    tagline: 'Up to 1000% Win Bonus • Min stake KES 1',
    codePrefix: 'PAW',
    accentColor: '#10b981',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/40',
    badgeText: 'text-emerald-400',
    homeUrl: 'https://www.betpawa.co.ke/',
    bookingUrl: 'https://www.betpawa.co.ke/',
    minStake: 1,
    bonusLabel: 'Win Bonus',
  },
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
 * E.g. betPawa gives:
 * 3 legs: 3%, 5 legs: 10%, 10 legs: 35%, 15 legs: 60%, 20 legs: 120%, 30 legs: 300%, 45+ legs: up to 1000%!
 */
export function getCompanyBonusPercentage(bookie: BookieId, legCount: number): number {
  if (legCount < 3) return 0;
  if (bookie === 'betpawa:ke') {
    if (legCount >= 45) return 1000;
    if (legCount >= 40) return 750;
    if (legCount >= 35) return 500;
    if (legCount >= 30) return 300;
    if (legCount >= 25) return 200;
    if (legCount >= 20) return 120;
    if (legCount >= 15) return 60;
    if (legCount >= 10) return 35;
    if (legCount >= 5) return 10;
    return 5;
  } else {
    // SportyBet
    if (legCount >= 40) return 1000;
    if (legCount >= 30) return 250;
    if (legCount >= 20) return 100;
    if (legCount >= 15) return 50;
    if (legCount >= 10) return 30;
    if (legCount >= 5) return 10;
    return 3;
  }
}

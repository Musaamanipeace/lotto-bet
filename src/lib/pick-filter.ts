import type { AiPick } from './ai-picks.ts';
import { applyFilters } from './filter-state.ts';

export const UNKNOWN_LEAGUE = 'Unknown league';

export const parseCsv = (v: string | null | undefined): string[] =>
  v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];

/** League name as /api/leagues reports it (null or blank becomes "Unknown league"). */
export const leagueName = (l: string | null): string => l?.trim() || UNKNOWN_LEAGUE;

export type PickFilter = {
  market?: string | null;
  bookmaker?: string | null;
  leagues?: string[];
  /** Keep only fixtures kicking off within the next N hours; null/omitted means no time filter. */
  withinHours?: number | null;
};

/** Applies market / bookmaker / league / kickoff-time filters via unified applyFilters(). */
export function filterPicks(picks: AiPick[], f: PickFilter): AiPick[] {
  return applyFilters(picks, {
    market: f.market,
    bookmaker: f.bookmaker,
    leagues: f.leagues,
    withinHours: f.withinHours,
  });
}

/**
 * League names go in the URL individually encoded and comma-joined,
 * so a name containing a comma survives.
 */
export const encodeLeagues = (names: string[]): string =>
  names.map(encodeURIComponent).join(',');

export const parseLeagues = (v: string | null | undefined): string[] =>
  parseCsv(v).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });

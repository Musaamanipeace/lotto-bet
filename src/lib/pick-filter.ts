
import type { AiPick } from './ai-picks.ts';

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

/** Applies market / bookmaker / league / kickoff-time filters. Empty or missing leagues means all leagues. */
export function filterPicks(picks: AiPick[], f: PickFilter): AiPick[] {
  const leagues = f.leagues?.length ? new Set(f.leagues) : null;
  const hours = f.withinHours;
  const now = Date.now();

  const cutoff =
    hours != null && Number.isFinite(hours) && hours >= 0
      ? now + hours * 60 * 60 * 1000
      : null;

  return picks.filter(
    (p) =>
      (!f.market || p.marketKey === f.market) &&
      (!f.bookmaker || p.bookmaker === f.bookmaker) &&
      (!leagues || leagues.has(leagueName(p.league))) &&
      (cutoff === null || (p.kickoff >= now && p.kickoff <= cutoff)),
  );
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

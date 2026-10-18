import { impliedProbabilities } from './math.ts';
import { outcomeKeyOf, type OutcomeKey } from './outcomes.ts';
import type { Bookmaker, Game, Market, MarketKind, Outcome } from './types.ts';

export const FT_LINE_MIN = 0.5;
export const FT_LINE_MAX = 5.5;

export type MarketSelector = { kind: MarketKind; line?: number };
export type Filter = {
  leagues?: string[];
  dateFrom?: number; dateTo?: number; // kickoff, epoch ms, inclusive
  oddsMin?: number; oddsMax?: number; // inclusive
  bookmaker?: Bookmaker;
  market?: MarketSelector;
};

/** What a game row shows: teams, pick, odd, kickoff (rest is for adding to a slip). */
export type PickRow = {
  gameId: string; nativeEventId: string; bookmaker: Bookmaker; home: string; away: string; kickoff: number; league: string | null;
  pick: string; odds: number;
  marketNativeId: string; outcomeNativeId: string; specifier: string; marketKind: MarketKind; line: number | null;
  /** Canonical outcome (home/over/yes...), or null when this outcome is not identified. */
  outcomeKey: OutcomeKey | null;
  /**
   * Implied probability with the bookmaker margin removed, from the market's COMPLETE outcome set.
   * null when that set is partial, suspended or has invalid odds. Never a model estimate.
   */
  implied: number | null;
};

/** A market is usable only if identified; full-time over/under only with a known line in 0.5-5.5. */
function usable(m: Market): boolean {
  if (m.kind === null || m.unavailableReason !== null) return false;
  if (m.kind === 'over_under') return m.line !== null && m.line >= FT_LINE_MIN && m.line <= FT_LINE_MAX;
  return true;
}

/** Margin-free probability of `o`, or null unless every outcome of the market is open and priced. */
function impliedOf(m: Market, o: Outcome): number | null {
  if (m.outcomes.length < 2 || m.outcomes.some((x) => !x.isActive)) return null;
  const r = impliedProbabilities(m.outcomes.map((x) => x.odds));
  if (!r.ok) return null;
  const i = m.outcomes.indexOf(o);
  return i >= 0 ? r.probabilities[i] : null;
}

function row(g: Game, m: Market, o: Outcome): PickRow {
  return {
    gameId: g.id, nativeEventId: g.nativeEventId, bookmaker: g.bookmaker, home: g.home, away: g.away, kickoff: g.kickoff, league: g.league,
    pick: m.kind === 'over_under' ? `${o.desc} ${m.line}` : o.desc, odds: o.odds,
    marketNativeId: m.nativeId, outcomeNativeId: o.nativeId, specifier: m.specifier, marketKind: m.kind!, line: m.line,
    outcomeKey: outcomeKeyOf(g.bookmaker, m.kind!, o),
    implied: impliedOf(m, o),
  };
}

export function candidateRows(games: Game[], f: Filter = {}): PickRow[] {
  const leagues = f.leagues?.length ? new Set(f.leagues) : null;
  const out: PickRow[] = [];
  for (const g of games) {
    if (f.bookmaker && g.bookmaker !== f.bookmaker) continue;
    if (leagues && (g.league === null || !leagues.has(g.league))) continue;
    if (f.dateFrom !== undefined && g.kickoff < f.dateFrom) continue;
    if (f.dateTo !== undefined && g.kickoff > f.dateTo) continue;
    for (const m of g.markets) {
      if (!usable(m)) continue;
      if (f.market && (m.kind !== f.market.kind || (f.market.line !== undefined && m.line !== f.market.line))) continue;
      for (const o of m.outcomes) {
        if (!o.isActive) continue;
        if (f.oddsMin !== undefined && o.odds < f.oddsMin) continue;
        if (f.oddsMax !== undefined && o.odds > f.oddsMax) continue;
        out.push(row(g, m, o));
      }
    }
  }
  return out.sort((a, b) => a.kickoff - b.kickoff || a.gameId.localeCompare(b.gameId) || a.marketNativeId.localeCompare(b.marketNativeId) || a.outcomeNativeId.localeCompare(b.outcomeNativeId));
}

/** Filter options come only from markets actually present in the fetched data. */
export function deriveFilterOptions(games: Game[]) {
  const rows = candidateRows(games);
  const leagues = [...new Set(rows.map((r) => r.league).filter((l): l is string => l !== null))].sort();
  const bookmakers = [...new Set(rows.map((r) => r.bookmaker))].sort() as Bookmaker[];
  const kinds = [...new Set(rows.map((r) => r.marketKind))].sort();
  const markets = kinds.map((kind) => ({
    kind,
    lines: [...new Set(rows.filter((r) => r.marketKind === kind && r.line !== null).map((r) => r.line as number))].sort((a, b) => a - b),
  }));
  return { leagues, bookmakers, markets };
}

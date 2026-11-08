import { impliedProbabilities } from './math.ts';
import { outcomeKeyOf, type OutcomeKey } from './outcomes.ts';
import type { Bookmaker, Game, Market, MarketKind, Outcome } from './types.ts';

export const FT_LINE_MIN = 0.5;
export const FT_LINE_MAX = 5.5;
export const FT_LINES = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5] as const;

export function isAllowedOverUnderLine(line: number | null | undefined): line is number {
  return typeof line === 'number' && (FT_LINES as readonly number[]).includes(line);
}

export type MarketSelector = { kind: MarketKind; line?: number };

/**
 * One market card from the filter UI. A row passes a rule when it is the same market kind, its
 * submarket is among `subs` (omitted = any, including unlabelled outcomes), its line is among `lines`
 * (over/under only; omitted = any) and its odds sit inside the optional range.
 * Submarkets: 1x2 -> home|draw|away, double_chance -> 1X|12|X2, over_under -> over|under, btts -> yes|no.
 */
export type PickRule = { kind: MarketKind; subs?: string[]; lines?: number[]; oddsMin?: number; oddsMax?: number };

export const DOUBLE_CHANCE_SUBS = ['1X', '12', 'X2'] as const;

const DC_ALIASES: Record<string, string[]> = {
  '1X': ['1x', 'x1', 'home or draw', 'home/draw', '1 or x', '1 or draw', 'home or x'],
  '12': ['12', '21', 'home or away', 'home/away', '1 or 2', 'home or 2'],
  X2: ['x2', '2x', 'draw or away', 'draw/away', 'x or 2', 'draw or 2', 'x or away'],
};

/**
 * Double chance is labelled by description only (the ids were never verified, see outcomes.ts), so this is a
 * label match that returns null for anything it does not recognise instead of guessing.
 */
export function doubleChanceSubOf(desc: string): string | null {
  const d = desc.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const [sub, aliases] of Object.entries(DC_ALIASES)) if (aliases.includes(d)) return sub;
  return null;
}

/** The submarket an outcome belongs to, or null when it cannot be identified. */
function subOf(m: Market, o: Outcome, key: OutcomeKey | null): string | null {
  if (m.kind === 'double_chance') return doubleChanceSubOf(o.desc);
  return key; // 1x2: home|draw|away, btts: yes|no, over_under: over|under
}

function passesRules(rules: PickRule[], m: Market, sub: string | null, odds: number): boolean {
  return rules.some((r) => {
    if (r.kind !== m.kind) return false;
    if (r.subs && (sub === null || !r.subs.includes(sub))) return false;
    if (r.lines && (m.line === null || !r.lines.includes(m.line))) return false;
    if (r.oddsMin !== undefined && odds < r.oddsMin) return false;
    if (r.oddsMax !== undefined && odds > r.oddsMax) return false;
    return true;
  });
}

const KINDS: MarketKind[] = ['1x2', 'double_chance', 'over_under', 'btts'];
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Parses the `rules` query parameter. Returns null for anything malformed so the API can answer 400. */
export function parseRules(json: string): PickRule[] | null {
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { return null; }
  if (!Array.isArray(raw) || raw.length > 20) return null;
  const out: PickRule[] = [];
  for (const r of raw) {
    if (typeof r !== 'object' || r === null) return null;
    const x = r as Record<string, unknown>;
    if (!KINDS.includes(x.kind as MarketKind)) return null;
    const rule: PickRule = { kind: x.kind as MarketKind };
    if (x.subs !== undefined) { if (!strings(x.subs)) return null; rule.subs = x.subs; }
    if (x.lines !== undefined) { if (!Array.isArray(x.lines) || !x.lines.every(finite)) return null; rule.lines = x.lines as number[]; }
    if (x.oddsMin !== undefined) { if (!finite(x.oddsMin)) return null; rule.oddsMin = x.oddsMin; }
    if (x.oddsMax !== undefined) { if (!finite(x.oddsMax)) return null; rule.oddsMax = x.oddsMax; }
    out.push(rule);
  }
  return out;
}

export type Filter = {
  gameId?: string;
  leagues?: string[];
  dateFrom?: number; dateTo?: number; // kickoff, epoch ms, inclusive
  oddsMin?: number; oddsMax?: number; // inclusive
  bookmaker?: Bookmaker;
  market?: MarketSelector;
  /** Market cards: when present a row must pass at least one rule (an empty list matches nothing). */
  rules?: PickRule[];
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

/** A market is usable only if identified; full-time over/under only with a known line strictly in 0.5, 1.5, 2.5, 3.5, 4.5, 5.5. */
function usable(m: Market): boolean {
  if (m.kind === null || m.unavailableReason !== null) return false;
  if (m.kind === 'over_under') return isAllowedOverUnderLine(m.line);
  return true;
}

export type MarketTextToken = { kind: 'number' | 'text'; value: string };

/**
 * Formats the market label for a game card chip:
 * - 1X2: Home -> "1", Away -> "2", Draw -> "x"
 * - Double Chance: "1 or x", "1 or 2", "x or 2"
 * - Over/Under (strictly 0.5, 1.5, 2.5, 3.5, 4.5, 5.5): "Over 0.5" .. "Over 5.5", "Under 0.5" .. "Under 5.5"
 * - BTTS: "GG", "NG"
 */
export function formatGameCardMarket(r: Pick<PickRow, 'marketKind' | 'outcomeKey' | 'pick' | 'line'>): string {
  if (r.marketKind === '1x2') {
    if (r.outcomeKey === 'home') return '1';
    if (r.outcomeKey === 'draw') return 'x';
    if (r.outcomeKey === 'away') return '2';
    const p = r.pick.trim().toLowerCase();
    if (p === '1' || p === 'home') return '1';
    if (p === 'x' || p === 'draw') return 'x';
    if (p === '2' || p === 'away') return '2';
    return r.pick;
  }

  if (r.marketKind === 'double_chance') {
    const sub = doubleChanceSubOf(r.pick);
    if (sub === '1X') return '1 or x';
    if (sub === '12') return '1 or 2';
    if (sub === 'X2') return 'x or 2';
    return r.pick;
  }

  if (r.marketKind === 'over_under') {
    const line = isAllowedOverUnderLine(r.line) ? r.line : null;
    const side =
      r.outcomeKey === 'over' || /^over\b/i.test(r.pick.trim())
        ? 'Over'
        : r.outcomeKey === 'under' || /^under\b/i.test(r.pick.trim())
          ? 'Under'
          : null;
    if (side && line !== null) {
      return `${side} ${line.toFixed(1)}`;
    }
    return r.pick;
  }

  if (r.marketKind === 'btts') {
    if (r.outcomeKey === 'yes' || /^(yes|gg)$/i.test(r.pick.trim())) return 'GG';
    if (r.outcomeKey === 'no' || /^(no|ng|ngg)$/i.test(r.pick.trim())) return 'NG';
    return r.pick;
  }

  return r.pick;
}

/**
 * Splits a market label into numeric segments (rendered in a larger font)
 * and alphabetic/text segments (rendered in a smaller font).
 */
export function tokenizeMarketText(label: string): MarketTextToken[] {
  const tokens: MarketTextToken[] = [];
  const regex = /(\d+(?:\.\d+)?)|([^\d]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(label)) !== null) {
    if (match[1] !== undefined) {
      tokens.push({ kind: 'number', value: match[1] });
    } else if (match[2] !== undefined) {
      tokens.push({ kind: 'text', value: match[2] });
    }
  }
  return tokens;
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
    if (f.gameId && g.id !== f.gameId) continue;
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
        if (f.rules && !passesRules(f.rules, m, subOf(m, o, outcomeKeyOf(g.bookmaker, m.kind!, o)), o.odds)) continue;
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

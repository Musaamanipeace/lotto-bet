import { fail, ok, type Result } from '../result.ts';
import { fetchJsonOnce, isRec, type FetchImpl, type Rec } from '../http.ts';
import type { Game, Market, MarketKind, Outcome, Skipped, Sport } from '../types.ts';

const B = 'sportybet' as const;
export const SPORTYBET_BASE = 'https://www.sportybet.com';

export const SPORTYBET_MARKET_KINDS: Record<string, MarketKind> = {
  '1': '1x2', '10': 'double_chance', '18': 'over_under', '29': 'btts',
};

/**
 * Per-sport config: sportId (feed param) + marketIds + marketMap keyed by sport
 * and market id together — ids collide across sports (e.g. basketball 18 ≠
 * football 18). tennis 186/189; basketball 219/225/236/68/90. Unsupported
 * markets stay kind: null.
 */
export const SPORTY_CONFIG: Record<Sport, { sportId: string; marketIds: string; marketMap: Record<string, MarketKind> }> = {
  football: { sportId: 'sr:sport:1', marketIds: '1,10,18,29', marketMap: SPORTYBET_MARKET_KINDS },
  tennis: { sportId: 'sr:sport:5', marketIds: '186,189', marketMap: { '186': 'match_winner', '189': 'over_under' } },
  basketball: {
    sportId: 'sr:sport:2',
    marketIds: '219,225,236,68,90',
    marketMap: { '219': 'match_winner', '225': 'over_under', '236': 'over_under', '68': 'over_under', '90': 'over_under' },
  },
};

function specifierPairs(spec: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const part of spec.split('|')) {
    const eq = part.indexOf('=');
    if (eq > 0) m.set(part.slice(0, eq), part.slice(eq + 1));
  }
  return m;
}

/**
 * Parses a totals specifier: `total` must be a finite .5 number; basketball
 * quarter (id 236) needs `quarternr` 1–4. Returns { line, period } or null on
 * a whole-number line / invalid quarter.
 */
function parseTotalsSpec(spec: string, marketId: string, sport: Sport): { line: number; period: Market['period'] } | null {
  const pairs = specifierPairs(spec);
  const totalRaw = pairs.get('total');
  const total = Number(totalRaw);
  if (totalRaw === undefined || !Number.isFinite(total)) return null;
  if (marketId === '68' && sport === 'basketball') return { line: total, period: 'h1' };
  if (marketId === '90' && sport === 'basketball') return { line: total, period: 'h2' };
  if (!String(totalRaw).endsWith('.5')) return null; // whole-number line → reject
  if (marketId === '236' && sport === 'basketball') {
    const qRaw = pairs.get('quarternr');
    const q = qRaw ? Number(qRaw) : NaN;
    if (!Number.isInteger(q) || q < 1 || q > 4) return null;
    return { line: total, period: `q${q}` as Market['period'] };
  }
  return { line: total, period: 'ft' };
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export const sportyHeaders = (extra: Record<string, string> = {}) => ({
  'Current-Country': 'KE',
  Referer: `${SPORTYBET_BASE}/ke/`,
  'User-Agent': UA,
  Accept: 'application/json',
  ...extra,
});

export type SportyFetchOptions = {
  pageSize?: number;
  pageNum?: number;
  timelineHours?: number;
  sport?: Sport;
  marketIds?: string;
  fetchRunId?: string;
};

export async function fetchSportyGames(
  opts: SportyFetchOptions = {},
  fetchImpl: FetchImpl = fetch,
): Promise<Result<{ games: Game[]; skipped: Skipped[] }>> {
  const sport = opts.sport ?? 'football';
  const cfg = SPORTY_CONFIG[sport];
  const params = new URLSearchParams({
    sportId: cfg.sportId,
    marketId: opts.marketIds ?? cfg.marketIds,
    pageSize: String(opts.pageSize ?? 50),
    pageNum: String(opts.pageNum ?? 1),
    timeline: String(opts.timelineHours ?? 168),
    todayGames: 'false',
    _t: String(Date.now()),
  });
  const url = `${SPORTYBET_BASE}/api/ke/factsCenter/pcUpcomingEvents?${params}`;
  const res = await fetchJsonOnce(fetchImpl, url, { method: 'GET', headers: sportyHeaders() }, { name: 'SportyBet', bookmaker: B });
  if (!res.ok) return res;
  return parseSportyResponse(res.body, opts.fetchRunId, sport);
}

export function parseSportyResponse(
  body: unknown,
  fetchRunId?: string,
  sport: Sport = 'football',
): Result<{ games: Game[]; skipped: Skipped[] }> {
  if (!isRec(body)) return fail('SportyBet returned a body that is not a JSON object', { bookmaker: B });
  if (body.bizCode !== 10000) {
    return fail(`SportyBet bizCode ${String(body.bizCode)}: ${String(body.message ?? 'no message')}`, {
      bookmaker: B, bizCode: body.bizCode as number | string,
    });
  }

  // End of list / empty page: success body without tournaments → empty page, not an error
  const data = isRec(body.data) ? body.data : null;
  const tournaments = data && Array.isArray(data.tournaments) ? data.tournaments : null;
  if (!tournaments) {
    return ok({ games: [], skipped: [] });
  }

  const games: Game[] = [];
  const skipped: Skipped[] = [];

  for (const t of tournaments) {
    if (!isRec(t) || !Array.isArray(t.events)) {
      skipped.push({ ref: 'tournament', reason: 'missing events array' });
      continue;
    }
    const league = typeof t.name === 'string' ? t.name : null;
    for (const e of t.events) {
      if (!isRec(e)) {
        skipped.push({ ref: 'event', reason: 'not an object' });
        continue;
      }
      const id = typeof e.eventId === 'string' ? e.eventId : null;
      if (!id) {
        skipped.push({ ref: 'event', reason: 'missing eventId' });
        continue;
      }
      if (
        typeof e.homeTeamName !== 'string' ||
        typeof e.awayTeamName !== 'string' ||
        typeof e.estimateStartTime !== 'number'
      ) {
        skipped.push({ ref: id, reason: 'missing team names or estimateStartTime' });
        continue;
      }
      const markets: Market[] = [];
      for (const m of Array.isArray(e.markets) ? e.markets : []) {
        const parsed = parseSportyMarket(m, id, skipped, sport);
        if (parsed) markets.push(parsed);
      }
      games.push({
        id: `${B}:${id}`,
        sport,
        bookmaker: B,
        nativeEventId: id,
        home: e.homeTeamName,
        away: e.awayTeamName,
        kickoff: e.estimateStartTime,
        league,
        markets,
        fetchRunId: fetchRunId ?? null,
      });
    }
  }
  return ok({ games, skipped });
}

function parseSportyMarket(m: unknown, eventId: string, skipped: Skipped[], sport: Sport): Market | null {
  if (!isRec(m) || (typeof m.id !== 'string' && typeof m.id !== 'number') || !Array.isArray(m.outcomes)) {
    skipped.push({ ref: eventId, reason: 'malformed market' });
    return null;
  }
  const nativeId = String(m.id);
  const specifier = typeof m.specifier === 'string' ? m.specifier : '';
  const outcomes: Outcome[] = [];
  for (const o of m.outcomes as unknown[]) {
    const r = o as Rec;
    const odds = Number(r?.odds);
    if (!isRec(o) || r.id === undefined || !Number.isFinite(odds)) {
      skipped.push({ ref: `${eventId}/market ${nativeId}`, reason: 'outcome without id or numeric odds' });
      return null;
    }
    outcomes.push({
      bookmaker: B,
      nativeId: String(r.id),
      desc: String(r.desc ?? ''),
      odds,
      isActive: r.isActive === true || r.isActive === 1,
    });
  }
  // Sport+id keyed map — ids collide across sports (e.g. basketball 18 ≠ football 18).
  const kind = SPORTY_CONFIG[sport].marketMap[nativeId] ?? null;
  const ids = new Set(outcomes.map((o) => o.nativeId));

  if (kind === 'match_winner') {
    if (ids.size !== 2 || !ids.has('4') || !ids.has('5')) {
      skipped.push({ ref: `${eventId}/market ${nativeId}`, reason: 'unexpected outcomes' });
      return null;
    }
    return { bookmaker: B, nativeId, specifier, line: null, kind, period: 'ft', unavailableReason: null, outcomes };
  }

  if (kind === 'over_under') {
    const st = parseTotalsSpec(specifier, nativeId, sport);
    if (!st) {
      skipped.push({ ref: `${eventId}/market ${nativeId}`, reason: 'whole-number line or invalid quarter specifier' });
      return { bookmaker: B, nativeId, specifier, line: null, kind, period: null, unavailableReason: 'whole-number line', outcomes };
    }
    if (!ids.has('12') || !ids.has('13')) {
      skipped.push({ ref: `${eventId}/market ${nativeId}`, reason: 'unexpected outcomes' });
      return null;
    }
    return { bookmaker: B, nativeId, specifier, line: st.line, kind, period: st.period ?? 'ft', unavailableReason: null, outcomes };
  }

  return {
    bookmaker: B,
    nativeId,
    specifier,
    line: null,
    kind,
    period: 'ft',
    unavailableReason: kind ? null : `SportyBet market id ${nativeId} is not identified`,
    outcomes,
  };
}

export async function fetchSportyAllPages(
  opts: SportyFetchOptions & { maxPages?: number } = {},
  fetchImpl: FetchImpl = fetch,
): Promise<Result<{ games: Game[]; skipped: Skipped[] }>> {
  const maxPages = opts.maxPages ?? 15;
  const byId = new Map<string, Game>();
  const skipped: Skipped[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const r = await fetchSportyGames({ ...opts, pageNum: page, pageSize: opts.pageSize ?? 50 }, fetchImpl);

    if (!r.ok) {
      if (page === 1) {
        return fail(`${r.error} (page ${page})`, r.details);
      }
      // Later page failed → keep games already collected
      skipped.push({ ref: 'pagination', reason: `stopped at page ${page}: ${r.error}` });
      break;
    }

    skipped.push(...r.skipped);

    if (r.games.length === 0) break; // normal end of list

    for (const g of r.games) byId.set(g.id, g);

    if (page === maxPages) {
      skipped.push({ ref: 'pagination', reason: `stopped at maxPages=${maxPages}; list may be incomplete` });
    }
  }

  return ok({ games: [...byId.values()], skipped });
}
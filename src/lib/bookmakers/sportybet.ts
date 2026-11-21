import { fail, ok, type Result } from '../result.ts';
import { fetchJsonOnce, isRec, type FetchImpl, type Rec } from '../http.ts';
import type { Game, Market, MarketKind, Outcome, Skipped } from '../types.ts';

const B = 'sportybet' as const;
export const SPORTYBET_BASE = 'https://www.sportybet.com';

export const SPORTYBET_MARKET_KINDS: Record<string, MarketKind> = {
  '1': '1x2', '10': 'double_chance', '18': 'over_under', '29': 'btts',
};

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
  marketIds?: string;
  fetchRunId?: string;
};

export async function fetchSportyGames(
  opts: SportyFetchOptions = {},
  fetchImpl: FetchImpl = fetch,
): Promise<Result<{ games: Game[]; skipped: Skipped[] }>> {
  const params = new URLSearchParams({
    sportId: 'sr:sport:1',
    marketId: opts.marketIds ?? '1,10,18,29',
    pageSize: String(opts.pageSize ?? 50),
    pageNum: String(opts.pageNum ?? 1),
    timeline: String(opts.timelineHours ?? 168),
    todayGames: 'false',
    _t: String(Date.now()),
  });
  const url = `${SPORTYBET_BASE}/api/ke/factsCenter/pcUpcomingEvents?${params}`;
  const res = await fetchJsonOnce(fetchImpl, url, { method: 'GET', headers: sportyHeaders() }, { name: 'SportyBet', bookmaker: B });
  if (!res.ok) return res;
  return parseSportyResponse(res.body, opts.fetchRunId);
}

export function parseSportyResponse(
  body: unknown,
  fetchRunId?: string,
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
        const parsed = parseSportyMarket(m, id, skipped);
        if (parsed) markets.push(parsed);
      }
      games.push({
        id: `${B}:${id}`,
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

function parseSportyMarket(m: unknown, eventId: string, skipped: Skipped[]): Market | null {
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
  const kind = SPORTYBET_MARKET_KINDS[nativeId] ?? null;
  const lineMatch = /total=([0-9]+(?:\.[0-9]+)?)/.exec(specifier);
  return {
    bookmaker: B,
    nativeId,
    specifier,
    line: kind === 'over_under' && lineMatch ? Number(lineMatch[1]) : null,
    kind,
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
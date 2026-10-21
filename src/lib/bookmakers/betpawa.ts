import { fail, ok, type Result } from '../result.ts';
import { fetchJsonOnce, isRec, type FetchImpl, type Rec } from '../http.ts';
import type { Game, Market, MarketKind, Outcome, Skipped } from '../types.ts';

const B = 'betpawa' as const;
export const BETPAWA_BASE = 'https://www.betpawa.co.ke';

/**
 * Known betPawa market types. 5000 (over/under) comes from earlier notes and is UNVERIFIED, and
 * its goal line is not identifiable until a live payload is supplied, so it is flagged unavailable.
 * Double chance, cards, corners and half totals are unknown: kept as kind=null with a reason.
 */
export const BETPAWA_MARKET_KINDS: Record<string, { kind: MarketKind; note?: string }> = {
  '3743': { kind: '1x2' },
  '3795': { kind: 'btts' },
  '5000': { kind: 'over_under' },
};

export const betPawaHeaders = () => ({
  'x-pawa-brand': 'betpawa-kenya',
  'x-pawa-language': 'en',
  devicetype: 'web',
  Accept: 'application/json',
});

export type BetPawaFetchOptions = { take?: number; marketTypes?: string[]; fetchRunId?: string };

export const BETPAWA_MAX_TAKE = 100;
/** Safety valve so a misbehaving upstream can never make us loop forever. */
const BETPAWA_MAX_PAGES = 10;

async function fetchBetPawaPage(skip: number, take: number, marketTypes: string[], fetchImpl: FetchImpl) {
  const query = {
    queries: [{
      query: { eventType: 'UPCOMING', categories: ['2'] },
      sort: { popularity: 'DESC' },
      skip,
      take,
      view: { marketTypes },
    }],
  };
  const url = `${BETPAWA_BASE}/api/sportsbook/v4/events/lists/by-queries?q=${encodeURIComponent(JSON.stringify(query))}`;
  return fetchJsonOnce(fetchImpl, url, { method: 'GET', headers: betPawaHeaders() }, { name: 'betPawa', bookmaker: B });
}

/** Number of raw events in a response page (before the parser drops malformed ones). */
function rawEventCount(body: unknown): number {
  if (!isRec(body) || !Array.isArray(body.responses)) return 0;
  return body.responses.reduce<number>((n, g) => n + (isRec(g) && Array.isArray(g.responses) ? g.responses.length : 0), 0);
}

/**
 * Fetches up to `opts.take` events (default 100). Never sends take > 100: larger requests are
 * split into pages using `skip` (the only paging parameter betPawa honours), stopping at the first short page.
 */
export async function fetchBetPawaGames(
  opts: BetPawaFetchOptions = {},
  fetchImpl: FetchImpl = fetch,
): Promise<Result<{ games: Game[]; skipped: Skipped[] }>> {
  const want = Math.max(1, opts.take ?? BETPAWA_MAX_TAKE);
  const marketTypes = opts.marketTypes ?? Object.keys(BETPAWA_MARKET_KINDS);
  const games: Game[] = [];
  const skipped: Skipped[] = [];
  const seen = new Set<string>();

  for (let page = 0, skip = 0; skip < want && page < BETPAWA_MAX_PAGES; page++, skip += BETPAWA_MAX_TAKE) {
    const pageSize = Math.min(BETPAWA_MAX_TAKE, want - skip);
    const res = await fetchBetPawaPage(skip, pageSize, marketTypes, fetchImpl);
    if (!res.ok) return res;
    const parsed = parseBetPawaResponse(res.body, opts.fetchRunId);
    if (!parsed.ok) return parsed;
    for (const g of parsed.games) if (!seen.has(g.id)) { seen.add(g.id); games.push(g); }
    skipped.push(...parsed.skipped);
    if (rawEventCount(res.body) < pageSize) break; // short page = last page
  }
  return ok({ games, skipped });
}

/**
 * Field names below follow the spec (responses[].responses[], participants[position],
 * markets[].marketType.id, row[].prices[]). Where the spec was not specific (event id, start time,
 * competition name, price fields) the parser is STRICT and reports an error instead of guessing.
 * Verify against a live sample payload.
 */
export function parseBetPawaResponse(
  body: unknown,
  fetchRunId?: string,
): Result<{ games: Game[]; skipped: Skipped[] }> {
  if (!isRec(body) || !Array.isArray(body.responses)) {
    return fail('betPawa response has no top-level responses array', { bookmaker: B });
  }
  const games: Game[] = [];
  const skipped: Skipped[] = [];

  for (const group of body.responses) {
    if (!isRec(group) || !Array.isArray(group.responses)) { skipped.push({ ref: 'group', reason: 'missing responses array' }); continue; }
    for (const e of group.responses) {
      if (!isRec(e)) { skipped.push({ ref: 'event', reason: 'not an object' }); continue; }
      const id = e.id !== undefined ? String(e.id) : null;
      if (!id) { skipped.push({ ref: 'event', reason: 'missing id' }); continue; }
      const parts = Array.isArray(e.participants) ? e.participants.filter(isRec) : [];
      const home = parts.find((p) => p.position === 1)?.name;
      const away = parts.find((p) => p.position === 2)?.name;
      const start = typeof e.startTime === 'string' || typeof e.startTime === 'number' ? new Date(e.startTime).getTime() : NaN;
      if (typeof home !== 'string' || typeof away !== 'string' || !Number.isFinite(start)) {
        skipped.push({ ref: id, reason: 'missing participants (position 1/2) or startTime' }); continue;
      }
      const league = isRec(e.competition) && typeof e.competition.name === 'string' ? e.competition.name : null;
      const markets: Market[] = [];
      for (const m of Array.isArray(e.markets) ? e.markets : []) {
        markets.push(...parseBetPawaMarket(m, id, skipped));
      }
      games.push({ id: `${B}:${id}`, bookmaker: B, nativeEventId: id, home, away, kickoff: start, league, markets, fetchRunId: fetchRunId ?? null });
    }
  }
  return ok({ games, skipped });
}

function parseBetPawaMarket(m: unknown, eventId: string, skipped: Skipped[]): Market[] {
  if (!isRec(m) || !isRec(m.marketType) || m.marketType.id === undefined || !Array.isArray(m.row)) {
    skipped.push({ ref: eventId, reason: 'malformed market (marketType.id / row)' }); return [];
  }
  const typeId = String(m.marketType.id);
  const known = BETPAWA_MARKET_KINDS[typeId];
  const out: Market[] = [];
  for (const row of m.row) {
    const prices = isRec(row) && Array.isArray(row.prices) ? row.prices : null;
    if (!prices) { skipped.push({ ref: `${eventId}/market ${typeId}`, reason: 'row without prices' }); continue; }
    const outcomes: Outcome[] = [];
    let valid = true;
    for (const p of prices) {
      const odds = isRec(p) ? Number(p.odds) : NaN;
      if (!isRec(p) || p.id === undefined || !Number.isFinite(odds)) { valid = false; break; }
      outcomes.push({ bookmaker: B, nativeId: String(p.id), desc: String(p.name ?? ''), odds, isActive: (p as Rec).suspended !== true });
    }
    if (!valid) { skipped.push({ ref: `${eventId}/market ${typeId}`, reason: 'price without id or numeric odds' }); continue; }
    let line: number | null = null;
    let lineReason: string | null = null;
    const spec = isRec(row.specifier) ? (row.specifier as Rec) : null;
    if (spec !== null && spec.total !== undefined) {
      line = Number(spec.total);
      if (!Number.isFinite(line)) { line = null; lineReason = 'over/under total is not a number'; }
    }
    if (known?.kind === 'over_under' && line === null) {
      lineReason = lineReason ?? 'betPawa over/under line not identified in row specifier';
    }
    out.push({
      bookmaker: B, nativeId: typeId, specifier: '', line,
      kind: known?.kind ?? null,
      unavailableReason: known ? lineReason ?? null : `betPawa market type ${typeId} is not identified`,
      outcomes,
    });
  }
  return out;
}

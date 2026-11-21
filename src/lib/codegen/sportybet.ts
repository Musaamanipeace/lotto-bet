import { SPORTYBET_BASE, sportyHeaders } from '../bookmakers/sportybet.ts';
import { fetchJsonOnce, isRec, type FetchImpl } from '../http.ts';
import type { PickRow } from '../filters.ts';
import { fail, type Failure } from '../result.ts';

export type SportyCodeResult =
  | { ok: true; destination: 'sportybet'; code: string; deepLink: string; legCount: number }
  | Failure;

/**
 * Server-side POST to /orders/share, exactly one body shape, exactly one attempt.
 * Only SportyBet-sourced legs are accepted; a betPawa-sourced leg is an error, never converted.
 */
export async function generateSportyBetCode(legs: PickRow[], fetchImpl: FetchImpl = fetch): Promise<SportyCodeResult> {
  if (legs.length === 0) return fail('Cannot generate a SportyBet code for an empty slip', { bookmaker: 'sportybet' });
  const foreign = legs.filter((l) => l.bookmaker !== 'sportybet');
  if (foreign.length > 0) {
    return fail(`${foreign.length} leg(s) are not SportyBet picks, so a SportyBet code cannot be generated: ${foreign.map((l) => `${l.home} v ${l.away}`).join('; ')}`, { bookmaker: 'sportybet' });
  }
  // A market without a specifier is stored as '' (see parseSportyMarket). The original app, which is known to
  // have produced codes, sent null in that case (`specifier: s.specifier ?? null`), so we do the same.
  const body = { selections: legs.map((l) => ({ eventId: l.nativeEventId, marketId: l.marketNativeId, outcomeId: l.outcomeNativeId, specifier: l.specifier === '' ? null : l.specifier })) };
  const url = `${SPORTYBET_BASE}/api/ke/orders/share`;
  const res = await fetchJsonOnce(
    fetchImpl, url,
    { method: 'POST', headers: sportyHeaders({ Origin: SPORTYBET_BASE, 'Content-Type': 'application/json' }), body: JSON.stringify(body) },
    { name: 'SportyBet', bookmaker: 'sportybet' },
  );
  if (!res.ok) return res;
  const b = res.body;
  if (!isRec(b) || b.bizCode !== 10000) {
    return fail(`SportyBet bizCode ${isRec(b) ? String(b.bizCode) : '?'}: ${isRec(b) ? String(b.message ?? 'no message') : 'unexpected response body'}`, {
      bookmaker: 'sportybet', url, bizCode: isRec(b) ? (b.bizCode as number | string) : undefined,
      // SportyBet's own words, so a rejected slip can be diagnosed instead of guessed at.
      bodySnippet: JSON.stringify(b).slice(0, 300),
    });
  }
  const code = isRec(b.data) ? b.data.shareCode : undefined;
  if (typeof code !== 'string' || !code) return fail('SportyBet reported success but returned no data.shareCode', { bookmaker: 'sportybet', url, bizCode: 10000 });
  return { ok: true, destination: 'sportybet', code, deepLink: `${SPORTYBET_BASE}/ke/?shareCode=${encodeURIComponent(code)}`, legCount: legs.length };
}

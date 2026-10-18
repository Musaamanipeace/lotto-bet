import { fetchBetPawaGames } from '../bookmakers/betpawa.ts';
import { MATCHING } from '../criteria.ts';
import type { PickRow } from '../filters.ts';
import type { FetchImpl } from '../http.ts';
import { teamSimilarity } from '../matching.ts';
import { outcomeKeyOf } from '../outcomes.ts';
import { fail, type Failure } from '../result.ts';
import type { Game } from '../types.ts';

export type BetPawaBody = { selections: { type: 'SINGLE'; selections: number[] }[] };
export type BetPawaScriptResult =
  | { ok: true; destination: 'betpawa'; mapped: number; total: number; unmapped: { leg: string; reason: string }[]; body: BetPawaBody; script: string }
  | Failure;

export const BETPAWA_STEPS = [
  'Copy the script.',
  'Open betPawa in a new tab and wait for it to load fully.',
  'Press F12 and open the Console tab.',
  'If the browser blocks pasting, type "allow pasting" and press Enter.',
  'Paste the script and press Enter. An alert shows your booking code.',
];
export const BETPAWA_WARNING = 'Price IDs expire. If the script fails or time has passed, regenerate it instead of reusing it.';

/** Exactly as specified. Relative URL only, body embedded as a real JS value, no cookies/tokens. */
export function buildBetPawaConsoleSnippet(body: BetPawaBody): string {
  const literal = JSON.stringify(body);
  return `
fetch('/api/sportsbook/v3/booking-number', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-pawa-brand': 'betpawa-kenya',
    'x-pawa-language': 'en',
    'devicetype': 'web'
  },
  body: JSON.stringify(${literal})
}).then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
  .then(function (x) {
    console.log(x);
    if (x.d && x.d.code) alert('betPawa code: ' + x.d.code);
    else alert('betPawa failed (' + x.status + '): ' + JSON.stringify(x.d));
  })
  .catch(function (e) { alert('Request failed: ' + e); });
`.trim();
}

const label = (l: PickRow) => `${l.home} v ${l.away}: ${l.pick}`;

/** Pure mapping of legs onto FRESH betPawa events. Nothing is guessed; each miss gets a reason. */
export function mapLegsToBetPawa(legs: PickRow[], fresh: Game[], threshold: number = MATCHING.teamSimilarityThreshold) {
  const priceIds: number[] = [];
  const unmapped: { leg: string; reason: string }[] = [];
  for (const l of legs) {
    let best: Game | null = null, bestScore = 0;
    for (const g of fresh) {
      const h = teamSimilarity(l.home, g.home), a = teamSimilarity(l.away, g.away);
      if (h >= threshold && a >= threshold && (h + a) / 2 > bestScore) { best = g; bestScore = (h + a) / 2; }
    }
    if (!best) { unmapped.push({ leg: label(l), reason: 'No matching betPawa event found' }); continue; }
    if (l.outcomeKey === null) { unmapped.push({ leg: label(l), reason: `Outcome of this ${l.marketKind} pick is not identified, so it cannot be mapped` }); continue; }
    const cands = best.markets.filter((m) => m.kind === l.marketKind && (l.marketKind !== 'over_under' || m.line === l.line));
    const usable = cands.filter((m) => m.unavailableReason === null);
    if (usable.length === 0) {
      unmapped.push({ leg: label(l), reason: cands.length ? `betPawa ${l.marketKind} market unavailable: ${cands[0].unavailableReason}` : `betPawa does not offer ${l.marketKind} for this game` });
      continue;
    }
    if (usable.length > 1) { unmapped.push({ leg: label(l), reason: `Ambiguous: betPawa has ${usable.length} ${l.marketKind} markets for this game` }); continue; }
    const hits = usable[0].outcomes.filter((o) => outcomeKeyOf('betpawa', l.marketKind, o) === l.outcomeKey);
    if (hits.length !== 1) { unmapped.push({ leg: label(l), reason: `betPawa outcome "${l.outcomeKey}" not identified in this market (${hits.length} candidates)` }); continue; }
    const id = Number(hits[0].nativeId);
    if (!Number.isInteger(id)) { unmapped.push({ leg: label(l), reason: `betPawa price id "${hits[0].nativeId}" is not an integer` }); continue; }
    priceIds.push(id);
  }
  return { priceIds, unmapped };
}

/** Fetches fresh betPawa events NOW (price ids expire), maps legs, builds the script. GET only. */
export async function prepareBetPawaScript(legs: PickRow[], fetchImpl: FetchImpl = fetch): Promise<BetPawaScriptResult> {
  if (legs.length === 0) return fail('Cannot generate a betPawa script for an empty slip', { bookmaker: 'betpawa' });
  const events = await fetchBetPawaGames({ take: 300 }, fetchImpl);
  if (!events.ok) return fail(`Failed to fetch fresh betPawa events: ${events.error}`, { ...events.details, bookmaker: 'betpawa' });
  const { priceIds, unmapped } = mapLegsToBetPawa(legs, events.games);
  if (priceIds.length === 0) {
    return fail(`0/${legs.length} legs mapped to betPawa; no script generated`, { bookmaker: 'betpawa', unmapped });
  }
  const body: BetPawaBody = { selections: priceIds.map((id) => ({ type: 'SINGLE' as const, selections: [id] })) };
  return { ok: true, destination: 'betpawa', mapped: priceIds.length, total: legs.length, unmapped, body, script: buildBetPawaConsoleSnippet(body) };
}

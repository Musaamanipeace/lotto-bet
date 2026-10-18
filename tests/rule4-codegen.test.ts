import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSportyResponse } from '../src/lib/bookmakers/sportybet.ts';
import { parseBetPawaResponse } from '../src/lib/bookmakers/betpawa.ts';
import { buildBetPawaConsoleSnippet, mapLegsToBetPawa, prepareBetPawaScript } from '../src/lib/codegen/betpawa.ts';
import { generateCode, parseLegs, type CodegenDeps } from '../src/lib/codegen/index.ts';
import { generateSportyBetCode } from '../src/lib/codegen/sportybet.ts';
import { candidateRows, type PickRow } from '../src/lib/filters.ts';
import { outcomeKeyOf } from '../src/lib/outcomes.ts';
import { fail } from '../src/lib/result.ts';
import { betpawaBody, jsonResponse, sportyBody } from './fixtures.ts';

const sp = parseSportyResponse(sportyBody); assert.ok(sp.ok);
const rows = candidateRows(sp.games);
const homeWin = rows.find((r) => r.marketKind === '1x2' && r.outcomeKey === 'home')!;
const over25 = rows.find((r) => r.marketKind === 'over_under' && r.outcomeKey === 'over')!;

function spy(handler: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return handler(url, init); }) as unknown as typeof fetch;
  return { calls, impl };
}

test('outcome keys: verified SportyBet ids; double chance and unknown betPawa names stay unidentified', () => {
  assert.equal(outcomeKeyOf('sportybet', '1x2', { nativeId: '3', desc: 'Away' }), 'away');
  assert.equal(outcomeKeyOf('sportybet', 'btts', { nativeId: '74', desc: 'Yes' }), 'yes');
  assert.equal(outcomeKeyOf('sportybet', 'double_chance', { nativeId: '9', desc: '1X' }), null);
  assert.equal(outcomeKeyOf('betpawa', '1x2', { nativeId: '1', desc: 'Weird' }), null);
});

test('SportyBet: one POST, exact body shape, deep link', async () => {
  const s = spy(() => jsonResponse(200, { bizCode: 10000, data: { shareCode: 'ABC123' } }));
  const r = await generateSportyBetCode([homeWin, over25], s.impl);
  assert.ok(r.ok && r.destination === 'sportybet');
  assert.equal(r.code, 'ABC123');
  assert.equal(r.deepLink, 'https://www.sportybet.com/ke/?shareCode=ABC123');
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].url, 'https://www.sportybet.com/api/ke/orders/share');
  assert.equal(s.calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(s.calls[0].init.body as string), { selections: [
    { eventId: 'sr:match:1', marketId: '1', outcomeId: '1', specifier: '' },
    { eventId: 'sr:match:1', marketId: '18', outcomeId: '12', specifier: 'total=2.5' },
  ] });
  const h = s.calls[0].init.headers as Record<string, string>;
  assert.equal(h['Current-Country'], 'KE'); assert.equal(h.Origin, 'https://www.sportybet.com');
});

test('SportyBet: non-10000 bizCode fails visibly after exactly one attempt (no alternative body)', async () => {
  const s = spy(() => jsonResponse(200, { bizCode: 11000, message: 'odds changed' }));
  const r = await generateSportyBetCode([homeWin], s.impl);
  assert.equal(s.calls.length, 1);
  assert.equal(r.ok, false);
  if (!r.ok) { assert.match(r.error, /11000/); assert.match(r.error, /odds changed/); }
});

test('SportyBet: betPawa-sourced legs are rejected without any request', async () => {
  const s = spy(() => jsonResponse(200, {}));
  const r = await generateSportyBetCode([{ ...homeWin, bookmaker: 'betpawa' }], s.impl);
  assert.equal(r.ok, false); assert.equal(s.calls.length, 0);
});

const bpGames = (() => { const r = parseBetPawaResponse(betpawaBody); assert.ok(r.ok); return r.games; })();
const ghost: PickRow = { ...homeWin, home: 'Zzyzx Rovers', away: 'Qwerty United' };

test('betPawa mapping: maps what it can, lists the rest with reasons', () => {
  const { priceIds, unmapped } = mapLegsToBetPawa([homeWin, over25, ghost], bpGames);
  assert.deepEqual(priceIds, [1001]);
  assert.equal(unmapped.length, 2);
  assert.match(unmapped.find((u) => u.leg.includes('Over'))!.reason, /does not offer over_under/);
  assert.match(unmapped.find((u) => u.leg.includes('Zzyzx'))!.reason, /No matching betPawa event/);
});

test('betPawa: SINGLE selections, N/M mapped, GET only (server never POSTs booking-number)', async () => {
  const s = spy(() => jsonResponse(200, betpawaBody));
  const r = await prepareBetPawaScript([homeWin, over25, ghost], s.impl);
  assert.ok(r.ok && r.destination === 'betpawa');
  assert.equal(`${r.mapped}/${r.total}`, '1/3');
  assert.deepEqual(r.body, { selections: [{ type: 'SINGLE', selections: [1001] }] });
  assert.equal(r.unmapped.length, 2);
  assert.equal(s.calls.length, 1);
  assert.ok(s.calls.every((c) => c.init.method === 'GET' && !c.url.includes('booking-number')));
});

test('betPawa: zero mapped is an error with reasons and NO script', async () => {
  const s = spy(() => jsonResponse(200, betpawaBody));
  const r = await prepareBetPawaScript([over25, ghost], s.impl);
  assert.equal(r.ok, false);
  if (!r.ok) { assert.match(r.error, /0\/2 legs mapped/); assert.equal(r.details.unmapped?.length, 2); assert.ok(!('script' in r)); }
});

test('betPawa: fetch failure surfaces the real error, single attempt', async () => {
  const s = spy(() => jsonResponse(503, 'down'));
  const r = await prepareBetPawaScript([homeWin], s.impl);
  assert.equal(s.calls.length, 1);
  assert.equal(r.ok, false);
  if (!r.ok) { assert.match(r.error, /Failed to fetch fresh betPawa events/); assert.equal(r.details.httpStatus, 503); }
});

test('snippet: relative URL, valid JS, embedded body, no cookies/tokens/fingerprints', () => {
  const body = { selections: [{ type: 'SINGLE' as const, selections: [1001] }, { type: 'SINGLE' as const, selections: [2002] }] };
  const js = buildBetPawaConsoleSnippet(body);
  assert.ok(js.includes(JSON.stringify(body)));
  assert.ok(js.startsWith("fetch('/api/sportsbook/v3/booking-number'"));
  assert.ok(!/https?:\/\//.test(js));
  assert.ok(!/cookie|x-pawa-token|fingerprint/i.test(js));
  assert.doesNotThrow(() => new Function(js)); // compiles, not executed
});

test('rule 4: only the selected destination’s generator runs; a betPawa failure triggers nothing else', async () => {
  const called: string[] = [];
  const deps: CodegenDeps = {
    sportybet: async () => { called.push('sportybet'); return fail('should not run'); },
    betpawa: async () => { called.push('betpawa'); return fail('betPawa down', { httpStatus: 503 }); },
  };
  const bp = await generateCode('betpawa', [homeWin], deps);
  assert.equal(bp.ok, false); assert.deepEqual(called, ['betpawa']);
  called.length = 0;
  await generateCode('sportybet', [homeWin], deps);
  assert.deepEqual(called, ['sportybet']);
  assert.equal((await generateCode('1xbet' as never, [homeWin], deps)).ok, false);
});

test('parseLegs validates untrusted input', () => {
  assert.ok(parseLegs([homeWin]).ok);
  assert.equal(parseLegs([]).ok, false);
  assert.equal(parseLegs([{ ...homeWin, odds: 0.5 }]).ok, false);
  assert.equal(parseLegs([{ ...homeWin, marketKind: 'corners' }]).ok, false);
  assert.equal(parseLegs(Array(51).fill(homeWin)).ok, false);
});

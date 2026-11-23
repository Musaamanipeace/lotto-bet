import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSportyResponse } from '../src/lib/bookmakers/sportybet.ts';
import { generateCode, parseLegs, type CodegenDeps } from '../src/lib/codegen/index.ts';
import { generateSportyBetCode } from '../src/lib/codegen/sportybet.ts';
import { candidateRows } from '../src/lib/filters.ts';
import { outcomeKeyOf } from '../src/lib/outcomes.ts';
import { fail } from '../src/lib/result.ts';
import { jsonResponse, sportyBody } from './fixtures.ts';

const sp = parseSportyResponse(sportyBody); assert.ok(sp.ok);
const rows = candidateRows(sp.games);
const homeWin = rows.find((r) => r.marketKind === '1x2' && r.outcomeKey === 'home')!;
const over25 = rows.find((r) => r.marketKind === 'over_under' && r.outcomeKey === 'over')!;

function spy(handler: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return handler(url, init); }) as unknown as typeof fetch;
  return { calls, impl };
}

test('outcome keys: verified SportyBet ids; double chance and unknown labels stay unidentified', () => {
  assert.equal(outcomeKeyOf('sportybet', '1x2', { nativeId: '3', desc: 'Away' }), 'away');
  assert.equal(outcomeKeyOf('sportybet', 'btts', { nativeId: '74', desc: 'Yes' }), 'yes');
  assert.equal(outcomeKeyOf('sportybet', 'double_chance', { nativeId: '9', desc: '1X' }), null);
  assert.equal(outcomeKeyOf('sportybet', 'match_winner', { nativeId: '999', desc: 'Home' }), null);
  assert.equal(outcomeKeyOf('sportybet', 'over_under', { nativeId: '18', desc: 'Maybe' }), null);
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
    { eventId: 'sr:match:1', marketId: '1', outcomeId: '1', specifier: null }, // no specifier is sent as null, like the original app
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
  if (!r.ok) { assert.match(r.error, /11000/); assert.match(r.error, /odds changed/); assert.match(r.details.bodySnippet ?? '', /odds changed/); }
});

test('rule 4: only sportybet is a destination; no other generator is called', async () => {
  const called: string[] = [];
  const deps: CodegenDeps = {
    sportybet: async () => { called.push('sportybet'); return fail('down', { httpStatus: 503 }); },
  };
  const r = await generateCode('sportybet', [homeWin], deps);
  assert.equal(r.ok, false);
  assert.deepEqual(called, ['sportybet']);
  assert.equal((await generateCode('1xbet' as never, [homeWin], deps)).ok, false);
  assert.deepEqual(called, ['sportybet']);
});

test('parseLegs validates untrusted input and accepts new-sport market kinds', () => {
  assert.ok(parseLegs([homeWin]).ok);
  assert.ok(parseLegs([{ ...homeWin, marketKind: 'match_winner', sport: 'tennis' }]).ok);
  assert.ok(parseLegs([{ ...homeWin, marketKind: 'over_under', period: 'q3', sport: 'basketball', line: 41.5 }]).ok);
  assert.equal(parseLegs([]).ok, false);
  assert.equal(parseLegs([{ ...homeWin, odds: 0.5 }]).ok, false);
  assert.equal(parseLegs([{ ...homeWin, marketKind: 'corners' }]).ok, false);
  assert.equal(parseLegs(Array(51).fill(homeWin)).ok, false);
});

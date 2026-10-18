import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchSportyGames } from '../src/lib/bookmakers/sportybet.ts';
import { fetchBetPawaGames } from '../src/lib/bookmakers/betpawa.ts';
import { runHealthChecks } from '../src/lib/health.ts';
import { jsonResponse, sportyBody } from './fixtures.ts';

function counting(handler: () => Response | Promise<Response>) {
  const state = { calls: 0 };
  const impl = (async () => { state.calls++; return handler(); }) as unknown as typeof fetch;
  return { state, impl };
}

test('HTTP failure: exactly one attempt, real status and message surfaced', async () => {
  const c = counting(() => jsonResponse(500, 'upstream down'));
  const r = await fetchSportyGames({}, c.impl);
  assert.equal(c.state.calls, 1);
  assert.equal(r.ok, false);
  if (!r.ok) { assert.match(r.error, /500/); assert.equal(r.details.httpStatus, 500); }
});

test('network error: exactly one attempt, no fallback payload', async () => {
  const c = counting(() => { throw new Error('ECONNRESET'); });
  const r = await fetchBetPawaGames({}, c.impl);
  assert.equal(c.state.calls, 1);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /ECONNRESET/);
});

test('non-10000 bizCode: one attempt, upstream message shown', async () => {
  const c = counting(() => jsonResponse(200, { bizCode: 19000, message: 'blocked' }));
  const r = await fetchSportyGames({}, c.impl);
  assert.equal(c.state.calls, 1);
  assert.equal(r.ok, false);
  if (!r.ok) { assert.match(r.error, /19000/); assert.match(r.error, /blocked/); }
});

test('success also takes a single request', async () => {
  const c = counting(() => jsonResponse(200, sportyBody));
  const r = await fetchSportyGames({}, c.impl);
  assert.equal(c.state.calls, 1);
  assert.ok(r.ok);
});

test('health check: one request per configured upstream, failures reported', async () => {
  const c = counting(() => jsonResponse(502, 'bad gateway'));
  const out = await runHealthChecks({}, c.impl);
  assert.equal(c.state.calls, 2); // SportyBet + betPawa only; stats providers not configured
  assert.deepEqual(out.map((u) => u.status), ['failed', 'failed', 'not_configured', 'not_configured']);
  assert.equal(out[0].httpStatus, 502);
});

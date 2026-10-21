import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchBetPawaGames, BETPAWA_MAX_TAKE } from '../src/lib/bookmakers/betpawa.ts';
import { prepareBetPawaScript } from '../src/lib/codegen/betpawa.ts';
import type { PickRow } from '../src/lib/filters.ts';
import type { OutcomeKey } from '../src/lib/outcomes.ts';
import { betpawaBody, jsonResponse } from './fixtures.ts';

/** Generate a well-formed betPawa event with a unique id and 1x2 market (3743). */
function makeEvent(id: number): unknown {
  const n = id * 10;
  return {
    id,
    startTime: '2030-01-01T15:00:00Z',
    participants: [{ position: 1, name: `Alpha${id}` }, { position: 2, name: `Beta${id}` }],
    competition: { name: 'Test League' },
    markets: [
      { marketType: { id: 3743 }, row: [{ prices: [
        { id: n + 1, name: '1', odds: 2.0 },
        { id: n + 2, name: 'x', odds: 3.0 },
        { id: n + 3, name: '2', odds: 3.5 },
      ] }] },
    ],
  };
}

/** Build a PickRow whose home/away match the generated event, outcomeKey is canonical. */
function makeLeg(id: number, outcomeKey: OutcomeKey): PickRow {
  return {
    gameId: `betpawa:${id}`, nativeEventId: String(id), bookmaker: 'betpawa',
    home: `Alpha${id}`, away: `Beta${id}`, kickoff: 1_800_000_000_000, league: 'Test League',
    pick: `Alpha${id}`, odds: 2.0,
    marketNativeId: '3743', outcomeNativeId: String(id * 10 + 1), specifier: '',
    marketKind: '1x2', line: null, outcomeKey, implied: null,
  };
}

/** Extract { skip, take } from the betPawa by-queries URL. */
function parseQuery(url: string): { skip: number; take: number } {
  const q = new URL(url).searchParams.get('q')!;
  const parsed = JSON.parse(q);
  return { skip: parsed.queries[0].skip, take: parsed.queries[0].take };
}

/**
 * Fake fetchImpl that simulates paging: returns 400 for take > 100 (matching the live API),
 * optionally fails on a specific skip with a given status, and otherwise slices the events array.
 */
function pagingFake(events: unknown[], failOnSkip?: number) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const q = new URL(url).searchParams.get('q')!;
    const parsed = JSON.parse(q);
    const { skip, take } = parsed.queries[0];
    if (take > 100) {
      return jsonResponse(400, { error: 'BAD_REQUEST', payload: { serverMessage: 'The maximum number of events is 100' } });
    }
    if (failOnSkip !== undefined && skip === failOnSkip) {
      return jsonResponse(503, 'upstream error');
    }
    const page = events.slice(skip, skip + take);
    return jsonResponse(200, { responses: [{ responses: page }] });
  }) as unknown as typeof fetch;
  return { calls, impl };
}

function spy(handler: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return handler(url, init); }) as unknown as typeof fetch;
  return { calls, impl };
}

const EVENTS_250 = Array.from({ length: 250 }, (_, i) => makeEvent(i + 1));
const EVENTS_200 = Array.from({ length: 200 }, (_, i) => makeEvent(i + 1));

test('BETPAWA_MAX_TAKE is 100', () => {
  assert.equal(BETPAWA_MAX_TAKE, 100);
});

test('fetchBetPawaGames({ take: 300 }) returns 250 games across 3 paged requests of 100', async () => {
  const { calls, impl } = pagingFake(EVENTS_250);
  const r = await fetchBetPawaGames({ take: 300 }, impl);
  assert.ok(r.ok, r.ok === false ? r.error : '');
  if (r.ok) {
    assert.equal(r.games.length, 250);
    assert.equal(calls.length, 3);
    assert.deepEqual(
      calls.map((c) => parseQuery(c.url)),
      [{ skip: 0, take: 100 }, { skip: 100, take: 100 }, { skip: 200, take: 100 }],
    );
    assert.ok(calls.every((c) => parseQuery(c.url).take <= 100), 'no request exceeded take=100');
  }
});

test('default (no take) makes exactly one request of 100', async () => {
  const { calls, impl } = pagingFake(EVENTS_250);
  const r = await fetchBetPawaGames({}, impl);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.games.length, 100);
    assert.equal(calls.length, 1);
    assert.deepEqual(parseQuery(calls[0].url), { skip: 0, take: 100 });
  }
});

test('exact multiple (200 events) ends on an empty page without looping', async () => {
  const { calls, impl } = pagingFake(EVENTS_200);
  const r = await fetchBetPawaGames({ take: 300 }, impl);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.games.length, 200);
    assert.equal(calls.length, 3);
    assert.deepEqual(parseQuery(calls[2].url), { skip: 200, take: 100 });
  }
});

test('upstream 503 on a later page surfaces as a failure', async () => {
  const { impl } = pagingFake(EVENTS_250, 100);
  const r = await fetchBetPawaGames({ take: 300 }, impl);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.match(r.error, /503/);
    assert.equal(r.details.httpStatus, 503);
  }
});

test('prepareBetPawaScript maps a game beyond the first 100 and never sends take > 100', async () => {
  const { calls, impl } = pagingFake(EVENTS_250);
  const farLeg = makeLeg(150, 'home');
  const r = await prepareBetPawaScript([farLeg], impl, { enabled: () => false, create: async () => ({ ok: false, error: 'disabled' }) });
  assert.ok(r.ok, r.ok === false ? r.error : '');
  if (r.ok) {
    assert.equal(r.mapped, 1);
    assert.deepEqual(r.body.selections, [{ type: 'SINGLE', selections: [1501] }]);
    assert.ok(calls.every((c) => parseQuery(c.url).take <= 100), 'no paging request exceeded take=100');
  }
});

test('browser stub: success sets code, script still present', async () => {
  const { impl } = spy(() => jsonResponse(200, betpawaBody));
  const leg: PickRow = {
    gameId: 'betpawa:555', nativeEventId: '555', bookmaker: 'betpawa',
    home: 'Arsenal', away: 'Chelsea', kickoff: 1_800_000_000_000, league: 'Premier League',
    pick: 'Arsenal', odds: 2.2,
    marketNativeId: '3743', outcomeNativeId: '1', specifier: '',
    marketKind: '1x2', line: null, outcomeKey: 'home', implied: null,
  };
  const r = await prepareBetPawaScript([leg], impl, { enabled: () => true, create: async () => ({ ok: true, code: 'ABC123' }) });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.code, 'ABC123');
    assert.ok(r.script);
    assert.equal(r.browserError, undefined);
  }
});

test('browser stub: failure sets browserError, code stays undefined, script still present', async () => {
  const { impl } = spy(() => jsonResponse(200, betpawaBody));
  const leg: PickRow = {
    gameId: 'betpawa:555', nativeEventId: '555', bookmaker: 'betpawa',
    home: 'Arsenal', away: 'Chelsea', kickoff: 1_800_000_000_000, league: 'Premier League',
    pick: 'Arsenal', odds: 2.2,
    marketNativeId: '3743', outcomeNativeId: '1', specifier: '',
    marketKind: '1x2', line: null, outcomeKey: 'home', implied: null,
  };
  const r = await prepareBetPawaScript([leg], impl, { enabled: () => true, create: async () => ({ ok: false, error: 'blocked' }) });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.code, undefined);
    assert.equal(r.browserError, 'blocked');
    assert.ok(r.script);
  }
});

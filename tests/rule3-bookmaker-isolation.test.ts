import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSportyResponse } from '../src/lib/bookmakers/sportybet.ts';
import { parseBetPawaResponse } from '../src/lib/bookmakers/betpawa.ts';
import { getGamesForBookmaker, type GameFetchers } from '../src/lib/games.ts';
import { fail, ok } from '../src/lib/result.ts';
import { betpawaBody, sportyBody } from './fixtures.ts';

test('every game, market and outcome carries its own bookmaker', () => {
  for (const [r, b] of [[parseSportyResponse(sportyBody), 'sportybet'], [parseBetPawaResponse(betpawaBody), 'betpawa']] as const) {
    assert.ok(r.ok);
    assert.ok(r.games.length > 0);
    for (const game of r.games) {
      assert.equal(game.bookmaker, b);
      for (const m of game.markets) { assert.equal(m.bookmaker, b); for (const o of m.outcomes) assert.equal(o.bookmaker, b); }
    }
  }
});

test('unidentified markets are flagged unavailable, not guessed', () => {
  const s = parseSportyResponse(sportyBody); const p = parseBetPawaResponse(betpawaBody);
  assert.ok(s.ok && p.ok);
  const unknownS = s.games[0].markets.find((m) => m.nativeId === '9999')!;
  const unknownP = p.games[0].markets.find((m) => m.nativeId === '4242')!;
  for (const m of [unknownS, unknownP]) { assert.equal(m.kind, null); assert.ok(m.unavailableReason); }
});

test('betPawa failure is reported as betPawa failure: no SportyBet fallback, no empty success', async () => {
  let sportyCalled = false;
  const fetchers: GameFetchers = {
    sportybet: async () => { sportyCalled = true; return ok({ games: parseSportyResponse(sportyBody).ok ? (parseSportyResponse(sportyBody) as any).games : [], skipped: [] }); },
    betpawa: async () => fail('betPawa responded with HTTP 503', { httpStatus: 503 }),
  };
  const r = await getGamesForBookmaker('betpawa', fetchers);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.match(r.error, /^Failed to fetch games for betPawa/);
    assert.match(r.error, /503/);
    assert.equal(r.details.httpStatus, 503);
    assert.equal(r.details.bookmaker, 'betpawa');
  }
  assert.equal(sportyCalled, false);
});

test('foreign-bookmaker records are rejected, never passed through', async () => {
  const sporty = parseSportyResponse(sportyBody); assert.ok(sporty.ok);
  const fetchers: GameFetchers = {
    sportybet: async () => ok({ games: [], skipped: [] }),
    betpawa: async () => ok({ games: sporty.games, skipped: [] }), // sportybet games offered as betPawa
  };
  const r = await getGamesForBookmaker('betpawa', fetchers);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /isolation violated/);
});

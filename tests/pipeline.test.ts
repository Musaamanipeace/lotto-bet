import test from 'node:test';
import assert from 'node:assert/strict';
import { runPipeline } from '../src/lib/pipeline.ts';
import { readGames } from '../src/lib/read-games.ts';
import { fail, ok } from '../src/lib/result.ts';
import type { Game } from '../src/lib/types.ts';
import { MemoryStore } from './memory-store.ts';

const NOW = 1_000_000_000_000;
const DAY = 86_400_000;
const g = (b: 'sportybet' | 'betpawa', id: string, home: string, away: string, kickoff: number): Game => ({
  id: `${b}:${id}`, bookmaker: b, nativeEventId: id, home, away, kickoff, league: 'L', markets: [], fetchRunId: null,
});
const good = (b: 'sportybet' | 'betpawa') => async () => ok({ games: [g(b, '1', 'Arsenal', 'Chelsea', NOW + DAY), g(b, '2', 'Old', 'Game', NOW - DAY), g(b, '3', 'Far', 'Future', NOW + 9 * DAY)], skipped: [] });

test('keeps only games within the 7 day window and reports what was outside', async () => {
  const store = new MemoryStore();
  const r = await runPipeline({ store, kind: 'manual', now: () => NOW, fetchers: { sportybet: good('sportybet'), betpawa: good('betpawa') } });
  assert.ok(r.ok);
  const sp = r.results.sportybet; assert.ok(sp.ok);
  assert.equal(sp.count, 1); assert.equal(sp.outsideWindow, 2);
  assert.ok(r.results.matching.ok && r.results.matching.matched === 1);
});

test('one bookmaker failing is recorded and does not affect the other', async () => {
  const store = new MemoryStore();
  const r = await runPipeline({ store, kind: 'daily', now: () => NOW, fetchers: {
    sportybet: good('sportybet'),
    betpawa: async () => fail('betPawa responded with HTTP 503', { httpStatus: 503 }),
  } });
  assert.ok(r.ok);
  assert.equal(r.results.sportybet.ok, true);
  assert.deepEqual(r.results.betpawa, { ok: false, error: 'betPawa responded with HTTP 503', httpStatus: 503 });
  assert.equal(r.results.matching.ok, false);
});

test('stored read: a failed bookmaker yields an error and NEVER the previous run’s games', async () => {
  const store = new MemoryStore();
  await runPipeline({ store, kind: 'daily', now: () => NOW, fetchers: { sportybet: good('sportybet'), betpawa: good('betpawa') } });
  await runPipeline({ store, kind: 'daily', now: () => NOW, fetchers: { sportybet: good('sportybet'), betpawa: async () => fail('boom', { httpStatus: 500 }) } });
  const bp = await readGames(store, 'betpawa');
  assert.equal(bp.ok, false);
  if (!bp.ok) { assert.match(bp.error, /^Failed to fetch games for betPawa/); assert.equal(bp.details.httpStatus, 500); }
  const all = await readGames(store);
  assert.ok(all.ok);
  assert.ok(all.games.every((x) => x.bookmaker === 'sportybet'));
  assert.equal(all.errors.length, 1);
  assert.equal(all.errors[0].bookmaker, 'betpawa');
});

test('no run yet is an explicit error; dataAsOf is the run finish time', async () => {
  const store = new MemoryStore();
  const empty = await readGames(store);
  assert.equal(empty.ok, false);
  await runPipeline({ store, kind: 'manual', now: () => NOW, fetchers: { sportybet: good('sportybet'), betpawa: good('betpawa') } });
  const r = await readGames(store);
  assert.ok(r.ok); assert.equal(r.dataAsOf, store.runs[0].finishedAt);
});

test('storage failure is surfaced, not swallowed', async () => {
  const store = new MemoryStore(); store.failSave = true;
  const r = await runPipeline({ store, kind: 'manual', now: () => NOW, fetchers: { sportybet: good('sportybet'), betpawa: good('betpawa') } });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /disk full/);
});

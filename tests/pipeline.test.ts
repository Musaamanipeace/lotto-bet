import test from 'node:test';
import assert from 'node:assert/strict';
import { runPipeline } from '../src/lib/pipeline.ts';
import { readGames } from '../src/lib/read-games.ts';
import { fail, ok } from '../src/lib/result.ts';
import type { GamesResult } from '../src/lib/games.ts';
import { SPORTS, type Game, type Sport } from '../src/lib/types.ts';
import { MemoryStore } from './memory-store.ts';

type Fetcher = (fetchRunId: string) => Promise<GamesResult>;

const NOW = 1_000_000_000_000;
const DAY = 86_400_000;
const g = (sport: Sport, id: string, kickoff: number): Game => ({
  id: `sportybet:${sport}-${id}`, sport, bookmaker: 'sportybet', nativeEventId: `${sport}-${id}`,
  home: `${sport} home`, away: `${sport} away`, kickoff, league: 'L', markets: [], fetchRunId: null,
});
const good = (sport: Sport) => async () => ok({
  games: [g(sport, '1', NOW + DAY), g(sport, 'old', NOW - DAY), g(sport, 'far', NOW + 9 * DAY)],
  skipped: [],
});
const fetchers = (overrides: Partial<Record<Sport, Fetcher>> = {}): Record<Sport, Fetcher> =>
  Object.fromEntries(SPORTS.map((s) => [s, overrides[s] ?? good(s)])) as Record<Sport, Fetcher>;

test('fetches every sport and keeps only games within the 7 day window', async () => {
  const store = new MemoryStore();
  const r = await runPipeline({ store, kind: 'manual', now: () => NOW, fetchers: fetchers() });
  assert.ok(r.ok);
  for (const sport of SPORTS) {
    const res: import('../src/lib/store.ts').UpstreamRunResult = r.results[sport]; assert.ok(res.ok);
    assert.equal(res.count, 1); assert.equal(res.outsideWindow, 2);
  }
  const all = await readGames(store);
  assert.ok(all.ok);
  assert.deepEqual(new Set(all.games.map((x) => x.sport)), new Set(SPORTS));
});

test('one sport failing is recorded in its own result and does not affect the others', async () => {
  const store = new MemoryStore();
  const r = await runPipeline({ store, kind: 'daily', now: () => NOW, fetchers: fetchers({
    tennis: async () => fail('sportybet tennis HTTP 503', { httpStatus: 503 }),
  }) });
  assert.ok(r.ok);
  assert.equal(r.results.football.ok, true);
  assert.equal(r.results.basketball.ok, true);
  assert.deepEqual(r.results.tennis, { ok: false, error: 'sportybet tennis HTTP 503', httpStatus: 503 });
  const t = await readGames(store, 'tennis');
  assert.equal(t.ok, false);
  if (!t.ok) assert.match(t.error, /Failed to fetch tennis games/);
});

test('a fetcher that throws is isolated to that sport', async () => {
  const store = new MemoryStore();
  const r = await runPipeline({ store, kind: 'manual', now: () => NOW, fetchers: fetchers({
    basketball: async () => { throw new Error('unexpected parser crash'); },
  }) });
  assert.ok(r.ok);
  assert.deepEqual(r.results.basketball, { ok: false, error: 'unexpected parser crash' });
  assert.equal(r.results.football.ok, true);
  assert.equal(r.results.tennis.ok, true);
});

test('stored read: a failed sport yields an error and NEVER the previous run’s games', async () => {
  const store = new MemoryStore();
  await runPipeline({ store, kind: 'daily', now: () => NOW, fetchers: fetchers() });
  await runPipeline({ store, kind: 'daily', now: () => NOW, fetchers: fetchers({
    tennis: async () => fail('boom', { httpStatus: 500 }),
  }) });
  const t = await readGames(store, 'tennis');
  assert.equal(t.ok, false);
  if (!t.ok) assert.equal(t.details.httpStatus, 500);
  const all = await readGames(store);
  assert.ok(all.ok);
  assert.ok(all.games.every((x) => x.sport !== 'tennis'));
  assert.equal(all.errors.length, 1);
  assert.equal(all.errors[0].sport, 'tennis');
});

test('no run yet is an explicit error; dataAsOf is the run finish time', async () => {
  const store = new MemoryStore();
  const empty = await readGames(store);
  assert.equal(empty.ok, false);
  await runPipeline({ store, kind: 'manual', now: () => NOW, fetchers: fetchers() });
  const r = await readGames(store);
  assert.ok(r.ok); assert.equal(r.dataAsOf, store.runs[0].finishedAt);
});

test('storage failure is surfaced, not swallowed', async () => {
  const store = new MemoryStore(); store.failSave = true;
  const r = await runPipeline({ store, kind: 'manual', now: () => NOW, fetchers: fetchers() });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /disk full/);
});

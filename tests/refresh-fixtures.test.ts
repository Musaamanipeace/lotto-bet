import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fetchSportyAllPages, SPORTY_CONFIG } from '../src/lib/bookmakers/sportybet.ts';
import { runPipeline } from '../src/lib/pipeline.ts';
import { readGames } from '../src/lib/read-games.ts';
import { SPORTS, type Sport } from '../src/lib/types.ts';
import { MemoryStore } from './memory-store.ts';

const fixture = (sport: Sport): unknown =>
  JSON.parse(readFileSync(`tests/fixture-sportybet-${sport}-feed.json`, 'utf8'));

// All saved fixtures are real feed responses; pick a clock before their kickoffs.
const FIXTURE_NOW = Date.parse('2026-11-22T00:00:00Z');

test('refresh requests each verified sportId + marketId and stores all three sports', async () => {
  const requested: Array<{ sportId: string; marketId: string }> = [];
  const bySportId = new Map(SPORTS.map((s) => [SPORTY_CONFIG[s].sportId, s]));
  const impl = (async (url: string | URL | Request) => {
    const p = new URL(String(url)).searchParams;
    const sportId = p.get('sportId') ?? '';
    const sport = bySportId.get(sportId);
    assert.ok(sport, `unexpected sportId ${sportId}`);
    assert.equal(p.get('marketId'), SPORTY_CONFIG[sport].marketIds, `marketId for ${sport}`);
    requested.push({ sportId, marketId: p.get('marketId') ?? '' });
    return new Response(JSON.stringify(fixture(sport)), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  const store = new MemoryStore();
  const r = await runPipeline({
    store, kind: 'manual', now: () => FIXTURE_NOW,
    fetchers: Object.fromEntries(SPORTS.map((sport) => [
      sport,
      (fetchRunId: string) => fetchSportyAllPages({ fetchRunId, sport, timelineHours: 168 }, impl),
    ])) as Parameters<typeof runPipeline>[0]['fetchers'],
  });

  assert.ok(r.ok, r.ok ? '' : r.error);
  // fetchSportyAllPages may request several pages per sport; every request must carry the verified ids.
  assert.ok(requested.length >= 3);
  assert.deepEqual(new Set(requested.map((x) => x.sportId)), new Set(SPORTS.map((s) => SPORTY_CONFIG[s].sportId)));

  for (const sport of SPORTS) {
    const result = r.results[sport];
    assert.ok(result.ok, `${sport}: ${result.ok ? '' : result.error}`);
    assert.ok(result.count > 0, `${sport} should have in-window games`);
    const games = await store.gamesForRun(r.runId, sport);
    assert.ok(games.length > 0);
    assert.ok(games.every((g) => g.sport === sport && g.bookmaker === 'sportybet'));
  }

  const all = await readGames(store);
  assert.ok(all.ok);
  assert.deepEqual(new Set(all.games.map((g) => g.sport)), new Set(SPORTS));
  assert.equal(all.errors.length, 0);
  // Real fixture markets: tennis winner/total, basketball quarters and halves.
  const tennis = all.games.filter((g) => g.sport === 'tennis').flatMap((g) => g.markets);
  assert.ok(tennis.some((m) => m.kind === 'match_winner'));
  assert.ok(tennis.some((m) => m.kind === 'over_under' && m.line !== null));
  const basketball = all.games.filter((g) => g.sport === 'basketball').flatMap((g) => g.markets);
  for (const period of ['q1', 'q2', 'q3', 'q4', 'h1', 'h2']) {
    assert.ok(basketball.some((m) => m.kind === 'over_under' && m.period === period), `period ${period}`);
  }
});

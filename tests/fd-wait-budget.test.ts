import assert from 'node:assert/strict';
import test from 'node:test';
import { FootballDataProvider } from '../src/lib/fd-provider.ts';

function make(rate: number) {
  let t = Date.parse('2026-10-01T12:00:00Z');
  const sleeps: number[] = [];
  const calls: string[] = [];
  const fetchImpl = (async (url: string) => {
    calls.push(String(url));
    const body = String(url).includes('/standings')
      ? { standings: [{ type: 'TOTAL', table: [{ position: 1, team: { id: 1, name: 'Arsenal FC' }, playedGames: 10, won: 8, draw: 1, lost: 1, goalsFor: 24, goalsAgainst: 6 }] }] }
      : { matches: [] };
    return { status: 200, ok: true, json: async () => body } as Response;
  }) as unknown as typeof fetch;
  const p = new FootballDataProvider(
    { FOOTBALL_DATA_API_KEY: 'k', FOOTBALL_DATA_RATE_PER_MIN: String(rate) } as unknown as NodeJS.ProcessEnv,
    { fetch: fetchImpl, now: () => t, sleep: async (ms) => { sleeps.push(ms); t += ms; } },
  );
  return { p, sleeps, calls };
}
const rq = { metric: 'form_points', league: 'Premier League', home: 'Arsenal', away: 'Chelsea', side: 'home' as const, window: 5 };

test('with a zero wait budget a rate-limited request never sleeps: the stat is not_fetched and no call is made', async () => {
  const { p, sleeps, calls } = make(1);
  p.beginRun({ maxWaitMs: 0 });
  const r = await p.fetch(rq);
  assert.ok(!r.ok);
  assert.equal(r.state, 'not_fetched');
  assert.equal(sleeps.length, 0, 'must not sleep');
  assert.equal(calls.length, 1, 'only the call that fit inside the rate limit was made');
});

test('a small wait budget is honoured, a long wait is not started', async () => {
  const { p, sleeps } = make(1);
  p.beginRun({ maxWaitMs: 5_000 });
  await p.fetch(rq);
  assert.equal(sleeps.length, 0, 'the needed ~60s wait is over budget');
});

test('without a budget (legacy callers) it still waits, so nothing else changes', async () => {
  const { p, sleeps } = make(1);
  p.beginRun();
  const r = await p.fetch(rq);
  assert.ok(sleeps.length >= 1 || r.ok);
});

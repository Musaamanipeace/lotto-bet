import test from 'node:test';
import assert from 'node:assert/strict';
import { FootballDataProvider } from '../src/lib/fd-provider.ts';
import { competitionCodeFor } from '../src/lib/competitions.ts';
import type { MetricRequest } from '../src/lib/stats-types.ts';

const row = (id: number, name: string, position: number, played: number, won: number, draw: number, gf: number, ga: number) => ({
  position, team: { id, name }, playedGames: played, won, draw, lost: played - won - draw, goalsFor: gf, goalsAgainst: ga,
});
const STANDINGS = {
  standings: [
    { type: 'TOTAL', table: [row(1, 'Arsenal FC', 1, 10, 8, 1, 24, 6), row(2, 'Chelsea FC', 6, 10, 4, 3, 14, 12)] },
    { type: 'HOME', table: [row(1, 'Arsenal FC', 1, 5, 5, 0, 14, 2), row(2, 'Chelsea FC', 4, 5, 3, 1, 8, 4)] },
    { type: 'AWAY', table: [row(1, 'Arsenal FC', 2, 5, 3, 1, 10, 4), row(2, 'Chelsea FC', 9, 5, 1, 2, 6, 8)] },
  ],
};
const m = (date: string, homeId: number, awayId: number, h: number, a: number) => ({
  utcDate: date, status: 'FINISHED', homeTeam: { id: homeId }, awayTeam: { id: awayId }, score: { fullTime: { home: h, away: a } },
});
// Arsenal (id 1): W 2-0, D 1-1, W 3-1 (away), L 0-1, W 4-0  -> form 3+1+3+0+3 = 10
const MATCHES = { matches: [
  m('2026-09-01T15:00:00Z', 1, 9, 2, 0), m('2026-09-08T15:00:00Z', 9, 1, 1, 1), m('2026-09-15T15:00:00Z', 9, 1, 1, 3),
  m('2026-09-22T15:00:00Z', 1, 9, 0, 1), m('2026-09-29T15:00:00Z', 1, 9, 4, 0),
] };

function setup(opts: { status?: number; maxCalls?: number } = {}) {
  const calls: string[] = [];
  const fetchImpl = (async (url: string) => {
    calls.push(String(url));
    const status = opts.status ?? 200;
    const body = String(url).includes('/standings') ? STANDINGS : MATCHES;
    return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
  }) as unknown as typeof fetch;
  const now = { t: Date.parse('2026-10-01T12:00:00Z') };
  const p = new FootballDataProvider(
    { FOOTBALL_DATA_API_KEY: 'k', FOOTBALL_DATA_MAX_CALLS_PER_RUN: String(opts.maxCalls ?? 60) } as unknown as NodeJS.ProcessEnv,
    { fetch: fetchImpl, now: () => now.t, sleep: async (ms) => { now.t += ms; } },
  );
  return { p, calls, now };
}
const req = (metric: string, o: Partial<MetricRequest> = {}): MetricRequest =>
  ({ metric, league: 'Premier League', home: 'Arsenal', away: 'Chelsea', side: 'home', window: 5, ...o });

test('league name mapping is exact: other countries are never mistaken for the English league', () => {
  assert.equal(competitionCodeFor('Premier League'), 'PL');
  assert.equal(competitionCodeFor('England Premier League'), 'PL');
  assert.equal(competitionCodeFor('Egypt Premier League'), null);
  assert.equal(competitionCodeFor('Brazil Serie A'), 'BSA');
  assert.equal(competitionCodeFor('Kenya Premier League'), null);
});

test('standings metrics: home win rate, unbeaten rate, rank, goals', async () => {
  const { p } = setup();
  const get = async (metric: string, o: Partial<MetricRequest> = {}) => {
    const r = await p.fetch(req(metric, o));
    assert.ok(r.ok, JSON.stringify(r));
    return r.value;
  };
  assert.equal(await get('home_win_rate'), 1);
  assert.equal(await get('unbeaten_home_rate'), 1);
  assert.equal(await get('away_win_rate', { side: 'away' }), 0.2);
  assert.equal(await get('league_rank'), 1);
  assert.equal(await get('goals_scored_avg'), 2.4);
  assert.equal(await get('goals_conceded_avg', { side: 'both' }), 0.9); // (0.6 + 1.2) / 2
});

test('match metrics: form points, rest days, goal-line rates', async () => {
  const { p } = setup();
  const val = async (metric: string, o: Partial<MetricRequest> = {}) => {
    const r = await p.fetch(req(metric, o));
    assert.ok(r.ok, JSON.stringify(r));
    return r.value;
  };
  assert.equal(await val('form_points'), 10);
  assert.equal(await val('over_1_5_rate'), 0.8);          // 2,2,4,1,4 goals -> 4 of 5 are 2+
  assert.equal(await val('under_3_5_rate'), 0.6);         // 2,2,4,1,4 -> 3 of 5 are <=3
  assert.equal(await val('no_draw_rate'), 0.8);
  // last match 2026-09-29 15:00, kickoff 2026-10-03 15:00 -> 4 days
  assert.equal(await val('rest_days', { kickoff: Date.parse('2026-10-03T15:00:00Z') }), 4);
});

test('results are cached: a second metric for the same team makes no new requests', async () => {
  const { p, calls } = setup();
  await p.fetch(req('form_points'));
  const n = calls.length;
  await p.fetch(req('over_1_5_rate'));
  await p.fetch(req('home_win_rate'));
  assert.equal(calls.length, n);
});

test('no key -> not_fetched with the fix named', async () => {
  const p = new FootballDataProvider({} as unknown as NodeJS.ProcessEnv);
  const r = await p.fetch(req('form_points'));
  assert.ok(!r.ok && r.state === 'not_fetched');
  assert.match((r as { reason: string }).reason, /FOOTBALL_DATA_API_KEY/);
});

test('league outside the free competitions -> not_covered', async () => {
  const { p, calls } = setup();
  const r = await p.fetch(req('form_points', { league: 'Kenya Premier League' }));
  assert.ok(!r.ok && r.state === 'not_covered');
  assert.equal(calls.length, 0, 'no request should be made for an uncovered league');
});

test('team that cannot be matched -> not_covered, with the name', async () => {
  const { p } = setup();
  const r = await p.fetch(req('form_points', { home: 'Zzyzx Rovers' }));
  assert.ok(!r.ok && r.state === 'not_covered');
  assert.match((r as { reason: string }).reason, /Zzyzx Rovers/);
});

test('HTTP 429 -> fetch_failed, 403 -> not_offered, and neither is retried', async () => {
  const a = setup({ status: 429 });
  const r1 = await a.p.fetch(req('league_rank'));
  assert.ok(!r1.ok && r1.state === 'fetch_failed');
  assert.match((r1 as { reason: string }).reason, /429/);
  const b = setup({ status: 403 });
  const r2 = await b.p.fetch(req('league_rank'));
  assert.ok(!r2.ok && r2.state === 'not_offered');
  assert.equal(a.calls.length, 1);
});

test('per-run request budget -> not_fetched, and beginRun resets it', async () => {
  const { p } = setup({ maxCalls: 1 });
  const first = await p.fetch(req('league_rank'));   // uses the one standings call
  assert.ok(first.ok);
  const second = await p.fetch(req('form_points'));  // needs a team-matches call: over budget
  assert.ok(!second.ok && second.state === 'not_fetched');
  assert.match((second as { reason: string }).reason, /budget/);
  p.beginRun();
  const third = await p.fetch(req('form_points'));
  assert.ok(third.ok);
});

test('rate limit: never more than the allowed requests per rolling minute', async () => {
  const { p, now } = setup();
  const starts: number[] = [];
  const orig = (p as unknown as { fetchImpl: typeof fetch }).fetchImpl;
  (p as unknown as { fetchImpl: typeof fetch }).fetchImpl = (async (...a: Parameters<typeof fetch>) => { starts.push(now.t); return orig(...a); }) as typeof fetch;
  (p as unknown as { ratePerMin: number }).ratePerMin = 2;
  for (const name of ['Arsenal', 'Chelsea']) {
    await p.fetch(req('form_points', { home: name, side: 'home' }));
    p.beginRun();
  }
  // 1 standings + 2 team calls = 3 requests, only 2 may start in the first minute
  assert.equal(starts.length, 3);
  assert.ok(starts[2] - starts[0] >= 60_000, `third call started ${starts[2] - starts[0]}ms after the first`);
});

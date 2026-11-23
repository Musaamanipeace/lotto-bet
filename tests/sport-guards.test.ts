import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { parseSportyResponse } from '../src/lib/bookmakers/sportybet.ts';
import { generateCandidates } from '../src/lib/candidates.ts';
import { candidateRows } from '../src/lib/filters.ts';
import { estimateForMarket } from '../src/lib/model/estimate.ts';
import { fetchMetric, type StatsProvider } from '../src/lib/stats.ts';
import { addMany, slipTotals } from '../src/lib/slip.ts';
import { targetSlip, type TargetRow } from '../src/lib/targeting.ts';
import type { Game } from '../src/lib/types.ts';

const fixture = (sport: string): unknown => JSON.parse(readFileSync(`tests/fixture-sportybet-${sport}-feed.json`, 'utf8'));
const games = (sport: 'tennis' | 'basketball'): Game[] => {
  const r = parseSportyResponse(fixture(sport), undefined, sport);
  assert.ok(r.ok);
  return r.games;
};

const fakeProvider: StatsProvider = {
  name: 'fake-football',
  supports: () => true,
  fetch: async () => ({ ok: true, value: 1, provider: 'fake-football' }),
};

test('football-only candidate generation skips tennis and basketball games', () => {
  assert.deepEqual(generateCandidates(games('tennis')), []);
  assert.deepEqual(generateCandidates(games('basketball')), []);
  assert.deepEqual(generateCandidates([...games('tennis'), ...games('basketball')]), []);
});

test('stats provider is never queried for a non-football sport', async () => {
  const r = await fetchMetric({ metric: 'home_win_rate', sport: 'tennis', home: 'A', away: 'B' }, [fakeProvider]);
  assert.equal(r.ok, false);
  if (!r.ok) { assert.equal(r.state, 'not_offered'); assert.match(r.reason, /tennis/); }
  const football = await fetchMetric({ metric: 'home_win_rate', sport: 'football', home: 'A', away: 'B' }, [fakeProvider]);
  assert.equal(football.ok, true);
});

test('Poisson goals model refuses non-football markets', () => {
  const r = estimateForMarket('home_win', 1.4, 1.2, 'basketball');
  assert.ok('reason' in r);
  assert.match(r.reason, /basketball/);
  assert.ok(!('reason' in estimateForMarket('home_win', 1.4, 1.2, 'football')));
});

test('a mixed-sport slip is accepted and totalled without error', () => {
  const tennis = candidateRows(games('tennis'))[0];
  const basketball = candidateRows(games('basketball'))[0];
  const sp = parseSportyResponse(fixture('football'));
  assert.ok(sp.ok);
  const football = candidateRows(sp.games)[0];
  assert.ok(tennis && basketball && football);

  const { slip, added, refused } = addMany({ legs: [], greyed: [] }, [tennis, basketball, football]);
  assert.equal(added, 3);
  assert.deepEqual(refused, []);
  assert.deepEqual(new Set(slip.legs.map((l) => l.sport)), new Set(['tennis', 'basketball', 'football']));
  const totals = slipTotals(slip);
  assert.equal(totals.legCount, 3);
  assert.ok(totals.totalOdds.ok);
});

test('AI targeting works from odds alone on mixed-sport rows', () => {
  const rows: TargetRow[] = [
    { id: 't1', gameId: 'sportybet:t1', bookmaker: 'sportybet', home: 'Tennis A', away: 'Tennis B', odds: 1.5 },
    { id: 'b1', gameId: 'sportybet:b1', bookmaker: 'sportybet', home: 'Basket A', away: 'Basket B', odds: 1.6 },
    { id: 'f1', gameId: 'sportybet:f1', bookmaker: 'sportybet', home: 'Football A', away: 'Football B', odds: 1.4 },
  ];
  const r = targetSlip(rows, 3.36, { legs: 3 });
  assert.equal(r.picks.length, 3);
  assert.ok(Math.abs(r.achieved - 3.36) / 3.36 < 0.05);
});

test('unsupported market ids stay kind: null and never become candidate rows', () => {
  const raw = fixture('tennis') as { data: { tournaments: Array<{ events: Array<{ markets: unknown[] }> }> } };
  const body = structuredClone(raw);
  for (const t of body.data.tournaments) for (const e of t.events) e.markets = [{
    id: '9999', specifier: '', outcomes: [{ id: '4', desc: 'Home', odds: 1.5, isActive: true }, { id: '5', desc: 'Away', odds: 2.5, isActive: true }],
  }];
  const r = parseSportyResponse(body, undefined, 'tennis');
  assert.ok(r.ok);
  const market = r.games[0].markets[0];
  assert.equal(market.kind, null);
  assert.ok(market.unavailableReason);
  assert.equal(candidateRows(r.games).length, 0);
});

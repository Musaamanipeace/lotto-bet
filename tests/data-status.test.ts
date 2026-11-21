import test from 'node:test';
import assert from 'node:assert/strict';
import { generateAiPicks } from '../src/lib/ai-engine.ts';
import { evaluateCriteria, type CriterionResult } from '../src/lib/evaluator.ts';
import { computeFitScore } from '../src/lib/ai-picks.ts';
import { configuredProviders } from '../src/lib/stats.ts';
import type { Game } from '../src/lib/types.ts';

function game(id: string, league: string, home: string, away: string, odds = 1.35): Game {
  return {
    id: `sportybet:${id}`, bookmaker: 'sportybet', nativeEventId: id, home, away, kickoff: Date.parse('2026-11-02T15:00:00Z'),
    league, fetchRunId: 'r1',
    markets: [{
      bookmaker: 'sportybet', nativeId: 'm1', specifier: '', line: null, kind: '1x2', unavailableReason: null,
      outcomes: [
        { bookmaker: 'sportybet', nativeId: '1', desc: '1', odds, isActive: true },
        { bookmaker: 'sportybet', nativeId: '2', desc: 'X', odds: 4.2, isActive: true },
        { bookmaker: 'sportybet', nativeId: '3', desc: '2', odds: 7.5, isActive: true },
      ],
    }],
  };
}

const KEY = 'FOOTBALL_DATA_API_KEY';

test('without an API key every missing criterion says not_fetched and names the fix', async () => {
  const saved = process.env[KEY];
  delete process.env[KEY];
  try {
    const r = await generateAiPicks([game('1', 'Premier League', 'Arsenal', 'Chelsea')]);
    assert.ok(r.statsNote);
    assert.equal(r.coverage.byState.ok, 0);
    assert.ok(r.coverage.byState.not_fetched > 0);
    assert.match(r.coverage.topReasons[0].reason, /FOOTBALL_DATA_API_KEY/);
    const pick = r.picks[0];
    assert.ok(pick.criteria && pick.criteria.every((c) => c.dataState === 'not_fetched'));
    assert.equal(pick.evaluation.dataCoverage, 0);
  } finally {
    if (saved !== undefined) process.env[KEY] = saved;
  }
});

test('with a key, real values are compared and marked ok; uncovered leagues say not_covered', async () => {
  const savedKey = process.env[KEY];
  const savedFetch = globalThis.fetch;
  process.env[KEY] = 'test-key-engine';
  const row = (id: number, name: string, pos: number) => ({ position: pos, team: { id, name }, playedGames: 10, won: 8, draw: 1, lost: 1, goalsFor: 20, goalsAgainst: 5 });
  const table = [row(1, 'Arsenal FC', 1), row(2, 'Chelsea FC', 2)];
  const ms = [1, 2, 3, 4, 5].map((i) => ({ utcDate: `2026-09-0${i}T15:00:00Z`, status: 'FINISHED', homeTeam: { id: 1 }, awayTeam: { id: 9 }, score: { fullTime: { home: 2, away: 0 } } }));
  globalThis.fetch = (async (url: string) => ({
    status: 200, ok: true,
    json: async () => (String(url).includes('/standings')
      ? { standings: [{ type: 'TOTAL', table }, { type: 'HOME', table }, { type: 'AWAY', table }] }
      : { matches: ms }),
  })) as unknown as typeof fetch;
  try {
    configuredProviders({ ...process.env, [KEY]: 'test-key-engine' }); // build the provider with the mocked fetch
    const r = await generateAiPicks([
      game('1', 'Premier League', 'Arsenal', 'Chelsea'),
      game('2', 'Kenya Premier League', 'Gor Mahia', 'AFC Leopards'),
    ]);
    const epl = r.picks.find((p) => p.league === 'Premier League')!;
    const ken = r.picks.find((p) => p.league === 'Kenya Premier League')!;
    assert.ok(epl.criteria!.some((c) => c.dataState === 'ok' && c.status === 'pass'));
    assert.ok(epl.evaluation.dataCoverage! > 0.5);
    assert.ok(ken.criteria!.every((c) => c.dataState === 'not_covered'));
    assert.match(ken.criteria![0].detail ?? '', /not one of the free/);
    assert.ok(epl.evaluation.dataCoverage! > ken.evaluation.dataCoverage!);
  } finally {
    globalThis.fetch = savedFetch;
    if (savedKey === undefined) delete process.env[KEY]; else process.env[KEY] = savedKey;
  }
});

test('evaluator counts data states and coverage', () => {
  const res: CriterionResult[] = [
    { id: 'a', label: 'a', status: 'pass', dataState: 'ok' },
    { id: 'b', label: 'b', status: 'fail', dataState: 'ok' },
    { id: 'c', label: 'c', status: 'unavailable', dataState: 'not_offered' },
    { id: 'd', label: 'd', status: 'unavailable', dataState: 'fetch_failed' },
    { id: 'e', label: 'e', status: 'unavailable' },
  ];
  const ev = evaluateCriteria(res);
  assert.equal(ev.dataCoverage, 2 / 5);
  assert.deepEqual(ev.stateCounts, { ok: 2, not_offered: 1, not_covered: 0, not_fetched: 1, fetch_failed: 1, not_configured: 0 });
});

test('less data weights the bookmaker probability more', () => {
  const mk = (coverage: number) => ({
    qualifies: true, label: 'Best fit' as const, passed: 0, verifiable: 0, total: 4, verifiedLabel: '', reason: null,
    provisionalCriteria: [], dataCoverage: coverage,
  });
  const high = computeFitScore({ oddsInBand: true, impliedProbability: 0.8, evaluation: mk(0), league: 'Premier League', hasCardsOrCornersData: false, congestionFlag: false });
  const lowProb = computeFitScore({ oddsInBand: true, impliedProbability: 0.5, evaluation: mk(0), league: 'Premier League', hasCardsOrCornersData: false, congestionFlag: false });
  const full = computeFitScore({ oddsInBand: true, impliedProbability: 0.8, evaluation: mk(1), league: 'Premier League', hasCardsOrCornersData: false, congestionFlag: false });
  assert.ok(high.score - lowProb.score > full.score - computeFitScore({ oddsInBand: true, impliedProbability: 0.5, evaluation: mk(1), league: 'Premier League', hasCardsOrCornersData: false, congestionFlag: false }).score,
    'with no data, a higher probability should be rewarded more than with full data');
  assert.ok(high.breakdown.lowDataProbability! > 0);
  assert.equal(full.breakdown.lowDataProbability, 0);
});

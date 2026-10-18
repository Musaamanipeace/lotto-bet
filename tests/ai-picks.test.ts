import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rankAiPicks,
  computeFitScore,
  composeAccumulator,
  pickNGames,
  type AiPick,
} from '../src/lib/ai-picks.ts';
import type { Evaluation } from '../src/lib/evaluator.ts';

function makeEval(label: 'Verified' | 'Best fit', passed = 3, total = 5): Evaluation {
  return {
    qualifies: true,
    label,
    passed,
    verifiable: passed,
    total,
    verifiedLabel: `${passed} of ${total} criteria verified`,
    reason: label === 'Best fit' ? 'only best fit' : null,
    provisionalCriteria: [],
  };
}

function makePick(overrides: Partial<AiPick> & { id: string }): AiPick {
  const evaluation = overrides.evaluation ?? makeEval('Verified');
  return {
    gameId: overrides.gameId ?? overrides.id,
    bookmaker: 'sportybet',
    marketKey: 'home_win',
    marketNativeId: 'm1',
    outcomeNativeId: 'o1',
    specifier: '',
    odds: 1.5,
    impliedProbability: 1 / 1.5,
    kickoff: Date.now() + 3600_000,
    league: 'Premier League',
    home: 'A',
    away: 'B',
    tier: 'safe',
    fitScore: 0.8,
    fitBreakdown: {
      tierPlacement: 1,
      impliedProbability: 0.67,
      criteriaPassShare: 0.6,
      leaguePriority: 1,
      cardsCornersData: 0,
      failedCriteriaPenalty: 0,
      congestionPenalty: 0,
    },
    rationale: 'test',
    exclusionStatus: 'not_checked',
    ...overrides,
    evaluation,
  };
}

test('Verified ranks before Best fit', () => {
  const picks = [
    makePick({ id: 'bf', evaluation: makeEval('Best fit'), fitScore: 0.99 }),
    makePick({ id: 'v', evaluation: makeEval('Verified'), fitScore: 0.5 }),
  ];
  const ranked = rankAiPicks(picks);
  assert.equal(ranked[0].id, 'v');
  assert.equal(ranked[1].id, 'bf');
});

test('fit score is deterministic', () => {
  const a = computeFitScore({
    oddsInBand: true,
    impliedProbability: 0.7,
    evaluation: makeEval('Verified', 4, 5),
    league: 'Premier League',
    hasCardsOrCornersData: false,
    congestionFlag: false,
  });
  const b = computeFitScore({
    oddsInBand: true,
    impliedProbability: 0.7,
    evaluation: makeEval('Verified', 4, 5),
    league: 'Premier League',
    hasCardsOrCornersData: false,
    congestionFlag: false,
  });
  assert.equal(a.score, b.score);
  assert.ok(a.score > 0.5);
});

test('composeAccumulator respects one-pick-per-game and max legs', () => {
  const picks = Array.from({ length: 60 }, (_, i) =>
    makePick({
      id: `g${i}`,
      gameId: `game${i}`,
      tier: i < 40 ? 'safe' : 'value',
      odds: i < 40 ? 1.2 : 1.8,
      impliedProbability: i < 40 ? 1 / 1.2 : 1 / 1.8,
    }),
  );
  const ranked = rankAiPicks(picks);
  const slip = composeAccumulator(ranked, 30);
  assert.ok(slip);
  assert.ok(slip!.picks.length <= 50);
  assert.ok(slip!.picks.length <= 30);
  const games = new Set(slip!.picks.map((p) => p.gameId));
  assert.equal(games.size, slip!.picks.length);
});

test('pickNGames returns three risk variants', () => {
  const picks = Array.from({ length: 40 }, (_, i) =>
    makePick({
      id: `g${i}`,
      gameId: `game${i}`,
      tier: i % 3 === 0 ? 'value' : 'safe',
    }),
  );
  const { lower, average, higher } = pickNGames(rankAiPicks(picks), 20);
  assert.ok(lower);
  assert.ok(average);
  assert.ok(higher);
  assert.ok(lower!.boosterCount <= average!.boosterCount);
});

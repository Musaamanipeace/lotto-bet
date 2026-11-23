import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  evaluateLegOutcome,
  evaluateSlip,
  normalizeMatchKey,
  type MatchScore,
} from '../src/lib/results-evaluator.ts';

test('normalizeMatchKey strips punctuation and normalizes casing', () => {
  assert.equal(
    normalizeMatchKey('Arsenal F.C.', 'Chelsea'),
    'arsenalfc__chelsea'
  );
  assert.equal(
    normalizeMatchKey('Real Madrid', 'F.C. Barcelona'),
    'realmadrid__fcbarcelona'
  );
});

test('1X2 market evaluation: home, draw, away', () => {
  const homeLeg = { home: 'Arsenal', away: 'Chelsea', pick: 'Arsenal Win', odds: 1.8, marketKind: '1x2' as const, outcomeKey: 'home' as const };
  const drawLeg = { home: 'Arsenal', away: 'Chelsea', pick: 'Draw', odds: 3.5, marketKind: '1x2' as const, outcomeKey: 'draw' as const };
  const awayLeg = { home: 'Arsenal', away: 'Chelsea', pick: 'Chelsea Win', odds: 4.2, marketKind: '1x2' as const, outcomeKey: 'away' as const };

  const scoreHomeWin: MatchScore = { homeScore: 2, awayScore: 1, status: 'FT', updatedAt: 0, source: 'manual' };
  const scoreDraw: MatchScore = { homeScore: 1, awayScore: 1, status: 'FT', updatedAt: 0, source: 'manual' };
  const scoreAwayWin: MatchScore = { homeScore: 0, awayScore: 2, status: 'FT', updatedAt: 0, source: 'manual' };

  // Home win scenario
  assert.equal(evaluateLegOutcome(homeLeg, scoreHomeWin).outcome, 'won');
  assert.equal(evaluateLegOutcome(drawLeg, scoreHomeWin).outcome, 'lost');
  assert.equal(evaluateLegOutcome(awayLeg, scoreHomeWin).outcome, 'lost');

  // Draw scenario
  assert.equal(evaluateLegOutcome(homeLeg, scoreDraw).outcome, 'lost');
  assert.equal(evaluateLegOutcome(drawLeg, scoreDraw).outcome, 'won');
  assert.equal(evaluateLegOutcome(awayLeg, scoreDraw).outcome, 'lost');

  // Away win scenario
  assert.equal(evaluateLegOutcome(homeLeg, scoreAwayWin).outcome, 'lost');
  assert.equal(evaluateLegOutcome(drawLeg, scoreAwayWin).outcome, 'lost');
  assert.equal(evaluateLegOutcome(awayLeg, scoreAwayWin).outcome, 'won');
});

test('double chance market evaluation: 1X, X2, 12', () => {
  const leg1X = { home: 'Liverpool', away: 'City', pick: '1X', odds: 1.4, marketKind: 'double_chance' as const, outcomeKey: null };
  const legX2 = { home: 'Liverpool', away: 'City', pick: 'X2', odds: 1.35, marketKind: 'double_chance' as const, outcomeKey: null };
  const leg12 = { home: 'Liverpool', away: 'City', pick: '12', odds: 1.3, marketKind: 'double_chance' as const, outcomeKey: null };

  const scoreHomeWin: MatchScore = { homeScore: 2, awayScore: 1, status: 'FT', updatedAt: 0, source: 'manual' };
  const scoreDraw: MatchScore = { homeScore: 2, awayScore: 2, status: 'FT', updatedAt: 0, source: 'manual' };

  assert.equal(evaluateLegOutcome(leg1X, scoreHomeWin).outcome, 'won');
  assert.equal(evaluateLegOutcome(legX2, scoreHomeWin).outcome, 'lost');
  assert.equal(evaluateLegOutcome(leg12, scoreHomeWin).outcome, 'won');

  assert.equal(evaluateLegOutcome(leg1X, scoreDraw).outcome, 'won');
  assert.equal(evaluateLegOutcome(legX2, scoreDraw).outcome, 'won');
  assert.equal(evaluateLegOutcome(leg12, scoreDraw).outcome, 'lost');
});

test('over_under market evaluation: over 2.5 and under 2.5', () => {
  const legOver = { home: 'PSG', away: 'Lyon', pick: 'Over 2.5', odds: 1.6, marketKind: 'over_under' as const, line: 2.5, outcomeKey: 'over' as const };
  const legUnder = { home: 'PSG', away: 'Lyon', pick: 'Under 2.5', odds: 2.2, marketKind: 'over_under' as const, line: 2.5, outcomeKey: 'under' as const };

  const scoreHigh: MatchScore = { homeScore: 2, awayScore: 1, status: 'FT', updatedAt: 0, source: 'manual' }; // total 3
  const scoreLow: MatchScore = { homeScore: 1, awayScore: 0, status: 'FT', updatedAt: 0, source: 'manual' };  // total 1

  assert.equal(evaluateLegOutcome(legOver, scoreHigh).outcome, 'won');
  assert.equal(evaluateLegOutcome(legUnder, scoreHigh).outcome, 'lost');

  assert.equal(evaluateLegOutcome(legOver, scoreLow).outcome, 'lost');
  assert.equal(evaluateLegOutcome(legUnder, scoreLow).outcome, 'won');
});

test('btts market evaluation: yes vs no', () => {
  const legYes = { home: 'Milan', away: 'Inter', pick: 'BTTS Yes', odds: 1.75, marketKind: 'btts' as const, outcomeKey: 'yes' as const };
  const legNo = { home: 'Milan', away: 'Inter', pick: 'BTTS No', odds: 2.0, marketKind: 'btts' as const, outcomeKey: 'no' as const };

  const scoreBoth: MatchScore = { homeScore: 1, awayScore: 1, status: 'FT', updatedAt: 0, source: 'manual' };
  const scoreOne: MatchScore = { homeScore: 2, awayScore: 0, status: 'FT', updatedAt: 0, source: 'manual' };

  assert.equal(evaluateLegOutcome(legYes, scoreBoth).outcome, 'won');
  assert.equal(evaluateLegOutcome(legNo, scoreBoth).outcome, 'lost');

  assert.equal(evaluateLegOutcome(legYes, scoreOne).outcome, 'lost');
  assert.equal(evaluateLegOutcome(legNo, scoreOne).outcome, 'won');
});

test('accumulator slip evaluation: all won vs 1 lost vs pending', () => {
  const slip = {
    id: 'test-slip-1',
    name: 'Test Acca',
    bookmaker: 'sportybet',
    createdAt: 1000,
    totalOdds: 3.5,
    combinedImplied: 0.28,
    legs: [
      { home: 'Arsenal', away: 'Chelsea', pick: 'Arsenal Win', odds: 1.8, marketKind: '1x2' as const, outcomeKey: 'home' as const },
      { home: 'Real Madrid', away: 'Barcelona', pick: 'Over 2.5', odds: 1.6, marketKind: 'over_under' as const, line: 2.5, outcomeKey: 'over' as const },
    ],
  };

  const scoresWinning: Record<string, MatchScore> = {
    [normalizeMatchKey('Arsenal', 'Chelsea')]: { homeScore: 2, awayScore: 0, status: 'FT', updatedAt: 0, source: 'manual' },
    [normalizeMatchKey('Real Madrid', 'Barcelona')]: { homeScore: 3, awayScore: 1, status: 'FT', updatedAt: 0, source: 'manual' },
  };

  const winningResult = evaluateSlip(slip, scoresWinning);
  assert.equal(winningResult.status, 'won');
  assert.equal(winningResult.isCompleted, true);
  assert.equal(winningResult.wonCount, 2);
  assert.equal(winningResult.lostCount, 0);

  const scoresOneLost: Record<string, MatchScore> = {
    [normalizeMatchKey('Arsenal', 'Chelsea')]: { homeScore: 2, awayScore: 0, status: 'FT', updatedAt: 0, source: 'manual' },
    [normalizeMatchKey('Real Madrid', 'Barcelona')]: { homeScore: 1, awayScore: 0, status: 'FT', updatedAt: 0, source: 'manual' }, // 1 goal < 2.5
  };

  const lostResult = evaluateSlip(slip, scoresOneLost);
  assert.equal(lostResult.status, 'lost');
  assert.equal(lostResult.isCompleted, true);
  assert.equal(lostResult.wonCount, 1);
  assert.equal(lostResult.lostCount, 1);

  // Partial/pending score
  const scoresPartial: Record<string, MatchScore> = {
    [normalizeMatchKey('Arsenal', 'Chelsea')]: { homeScore: 2, awayScore: 0, status: 'FT', updatedAt: 0, source: 'manual' },
  };
  const pendingResult = evaluateSlip(slip, scoresPartial);
  assert.equal(pendingResult.status, 'pending');
  assert.equal(pendingResult.isCompleted, false);
  assert.equal(pendingResult.wonCount, 1);
  assert.equal(pendingResult.pendingCount, 1);
});

test("legs with a 'default' placeholder score stay pending and never settle won/lost", () => {
  const leg = { home: 'Arsenal', away: 'Chelsea', pick: 'Chelsea Win', odds: 4.2, marketKind: '1x2' as const, outcomeKey: 'away' as const };
  const score: MatchScore = { homeScore: 2, awayScore: 1, status: 'FT', updatedAt: 0, source: 'default' };
  const res = evaluateLegOutcome(leg, score);
  assert.equal(res.outcome, 'pending');
  assert.match(res.reason, /awaiting/i);
});

test('tennis and basketball legs never settle: no score is attached, even with a matching football score', () => {
  const score: MatchScore = { homeScore: 2, awayScore: 1, status: 'FT', updatedAt: 0, source: 'manual' };
  const tennis = { home: 'Player A', away: 'Player B', pick: 'Home', odds: 1.6, marketKind: 'match_winner' as const, outcomeKey: 'home' as const, sport: 'tennis' as const };
  const basketball = { home: 'Lakers', away: 'Celtics', pick: 'Over 199.5', odds: 1.9, marketKind: 'over_under' as const, outcomeKey: 'over' as const, line: 199.5, sport: 'basketball' as const, period: 'ft' as const };
  const q3 = { home: 'Lakers', away: 'Celtics', pick: 'Over 41.5', odds: 1.8, marketKind: 'over_under' as const, outcomeKey: 'over' as const, line: 41.5, period: 'q3' as const };

  for (const leg of [tennis, basketball, q3]) {
    assert.equal(evaluateLegOutcome(leg, score).outcome, 'pending');
  }
  const slip = evaluateSlip({
    id: 'mixed', name: 'Mixed', bookmaker: 'sportybet', createdAt: 0, totalOdds: 5, combinedImplied: null,
    legs: [tennis, basketball],
  }, new Map([[normalizeMatchKey('Player A', 'Player B'), score], [normalizeMatchKey('Lakers', 'Celtics'), score]]));
  assert.equal(slip.status, 'pending');
  assert.equal(slip.pendingCount, 2);
  assert.ok(slip.legs.every((l) => l.outcome === 'pending' && l.score === undefined));
  assert.match(slip.legs[0].reason, /tennis\/basketball/);
});

test('a mixed slip with one lost football leg is still lost, but non-football legs stay pending', () => {
  const score: MatchScore = { homeScore: 0, awayScore: 3, status: 'FT', updatedAt: 0, source: 'manual' };
  const slip = evaluateSlip({
    id: 'mixed2', name: 'Mixed', bookmaker: 'sportybet', createdAt: 0, totalOdds: 3, combinedImplied: null,
    legs: [
      { home: 'Arsenal', away: 'Chelsea', pick: 'Home', odds: 1.5, marketKind: '1x2' as const, outcomeKey: 'home' as const, sport: 'football' as const },
      { home: 'Player A', away: 'Player B', pick: 'Home', odds: 1.6, marketKind: 'match_winner' as const, outcomeKey: 'home' as const, sport: 'tennis' as const },
    ],
  }, new Map([[normalizeMatchKey('Arsenal', 'Chelsea'), score], [normalizeMatchKey('Player A', 'Player B'), score]]));
  assert.equal(slip.status, 'lost');
  assert.equal(slip.lostCount, 1);
  assert.equal(slip.pendingCount, 1);
  assert.equal(slip.legs[1].score, undefined);
});

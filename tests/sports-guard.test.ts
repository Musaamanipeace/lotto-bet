import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateCandidates, marketKeyFor } from '../src/lib/candidates.ts';
import { matchGames, teamSimilarity } from '../src/lib/matching.ts';
import type { Game, MarketKind, Sport } from '../src/lib/types.ts';

const tennisGame = (id: string): Game => ({
  id,
  bookmaker: 'sportybet',
  sport: 'tennis',
  nativeEventId: id,
  home: 'Player A F.',
  away: 'Player B F.',
  kickoff: Date.now() + 60_000_000,
  league: 'ATP',
  markets: [
    {
      bookmaker: 'sportybet',
      nativeId: `m-${id}`,
      specifier: '',
      line: null,
      kind: null, // tennis match winner: not yet captured; stays null (6.2, 6.3)
      unavailableReason: 'Tennis markets not yet captured — see scripts/probe-markets.mjs and tests/fixtures.ts.',
      outcomes: [],
    },
  ],
  fetchRunId: null,
});

test('tennis games never produce football candidates (no ids invented)', () => {
  assert.deepEqual(generateCandidates([tennisGame('t1')]), []);
});

test('match_winner / total markets map to no candidate until criteria are configured (6.3)', () => {
  assert.equal(marketKeyFor({ marketKind: 'match_winner', outcomeKey: 'home' } as never), null);
  assert.equal(marketKeyFor({ marketKind: 'total', line: 1.5, outcomeKey: 'over' } as never), null);
});

test('matchGames only matches within the same sport (6.3)', () => {
  const mk = (id: string, sport: Sport, home: string, away: string): Game => ({
    id, bookmaker: 'sportybet', sport, nativeEventId: id, home, away,
    kickoff: 1, league: 'L', markets: [], fetchRunId: null,
  });
  // Same names on both sides: the sport guard must block the cross-sport match.
  const { matches, unmatchedSporty, unmatchedBetpawa } = matchGames(
    [mk('g1', 'football', 'Team A', 'Team B'), mk('g2', 'tennis', 'T1', 'T2')],
    [mk('g1', 'tennis', 'Team A', 'Team B'), mk('g2', 'football', 'T1', 'T2')],
  );
  assert.equal(matches.length, 0, 'cross-sport pairs must not match');
  assert.ok(unmatchedSporty.length === 2 && unmatchedBetpawa.length === 2);

  // Same sport: the pair still matches.
  const fb = [mk('g3', 'football', 'Team A', 'Team B')];
  const fbPawa = [mk('g3', 'football', 'Team A', 'Team B')];
  assert.equal(matchGames(fb, fbPawa).matches.length, 1);
});

test('Tennis player names need their own normalisation (6.3)', () => {
  assert.ok(teamSimilarity('Djokovic F.', 'Djokovic F.') > 0.5, 'same player name should be near 1');
  assert.ok(teamSimilarity('Safin F.', 'Nalbandian F.') >= 0);
});

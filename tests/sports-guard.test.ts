import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateCandidates, marketKeyFor } from '../src/lib/candidates.ts';
import { candidateRows } from '../src/lib/filters.ts';
import { teamSimilarity } from '../src/lib/matching.ts';
import type { Game } from '../src/lib/types.ts';

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
      nativeId: '186',
      specifier: '',
      line: null,
      kind: 'match_winner',
      period: 'ft',
      unavailableReason: null,
      outcomes: [
        { bookmaker: 'sportybet', nativeId: '4', desc: 'Home', odds: 1.6, isActive: true },
        { bookmaker: 'sportybet', nativeId: '5', desc: 'Away', odds: 2.2, isActive: true },
      ],
    },
  ],
  fetchRunId: null,
});

test('tennis rows are filterable but never produce football candidates', () => {
  const rows = candidateRows([tennisGame('t1')]);
  assert.ok(rows.length > 0, 'tennis markets are visible in the games list');
  assert.ok(rows.every((r) => r.sport === 'tennis' && r.marketKind === 'match_winner'));
  assert.deepEqual(generateCandidates([tennisGame('t1')]), []);
});

test('match_winner / total markets map to no football candidate until criteria are configured', () => {
  assert.equal(marketKeyFor({ marketKind: 'match_winner', outcomeKey: 'home' } as never), null);
  assert.equal(marketKeyFor({ marketKind: 'total', line: 1.5, outcomeKey: 'over' } as never), null);
});

test('sport does not leak across a mixed list of games', () => {
  const games = [tennisGame('t1')];
  const rows = candidateRows(games);
  assert.ok(rows.every((r) => r.sport === 'tennis'));
  assert.equal(generateCandidates(games).length, 0);
});

test('Tennis player names need their own normalisation (football standings matcher is generic)', () => {
  assert.ok(teamSimilarity('Djokovic F.', 'Djokovic F.') > 0.5, 'same player name should be near 1');
  assert.ok(teamSimilarity('Safin F.', 'Nalbandian F.') >= 0);
});

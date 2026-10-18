import test from 'node:test';
import assert from 'node:assert/strict';
import { matchGames, teamSimilarity } from '../src/lib/matching.ts';
import type { Game } from '../src/lib/types.ts';

const g = (bookmaker: 'sportybet' | 'betpawa', id: string, home: string, away: string): Game => ({
  id: `${bookmaker}:${id}`, bookmaker, nativeEventId: id, home, away, kickoff: 0, league: null, markets: [], fetchRunId: null,
});

test('similarity ignores case, accents and FC/CF noise', () => {
  assert.equal(teamSimilarity('Arsenal FC', 'arsenal'), 1);
  assert.equal(teamSimilarity('Atlético Madrid', 'Atletico Madrid'), 1);
  assert.ok(teamSimilarity('Manchester United', 'Man United') < 1);
  assert.ok(teamSimilarity('Arsenal', 'Chelsea') < 0.3);
});

test('both teams must match; unmatched games stay unmatched', () => {
  const s = [g('sportybet', '1', 'Arsenal FC', 'Chelsea FC'), g('sportybet', '2', 'Arsenal FC', 'Liverpool')];
  const p = [g('betpawa', 'a', 'Arsenal', 'Chelsea')];
  const r = matchGames(s, p);
  assert.equal(r.matches.length, 1);
  assert.equal(r.matches[0].sportyGameId, 'sportybet:1');
  assert.deepEqual(r.unmatchedSporty, ['sportybet:2']);
  assert.deepEqual(r.unmatchedBetpawa, []);
});

test('one-to-one: a betPawa game is never matched twice', () => {
  const s = [g('sportybet', '1', 'Arsenal', 'Chelsea'), g('sportybet', '2', 'Arsenal', 'Chelsea')];
  const p = [g('betpawa', 'a', 'Arsenal', 'Chelsea')];
  assert.equal(matchGames(s, p).matches.length, 1);
});

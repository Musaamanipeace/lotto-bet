import test from 'node:test';
import assert from 'node:assert/strict';
import { marketKeyFor, tierForOdds, generateCandidates } from '../src/lib/candidates.ts';
import type { PickRow } from '../src/lib/filters.ts';
import type { Game } from '../src/lib/types.ts';

function row(partial: Partial<PickRow> & Pick<PickRow, 'odds' | 'marketKind' | 'outcomeKey' | 'line'>): PickRow {
  return {
    gameId: 'sportybet:1',
    nativeEventId: '1',
    bookmaker: 'sportybet',
    home: 'A',
    away: 'B',
    kickoff: Date.now() + 86400000,
    league: 'Premier League',
    pick: 'Home',
    marketNativeId: 'm',
    outcomeNativeId: 'o',
    specifier: '',
    implied: 1 / partial.odds,
    ...partial,
  };
}

test('marketKeyFor maps 1x2 and over/under lines', () => {
  assert.equal(marketKeyFor(row({ odds: 1.4, marketKind: '1x2', outcomeKey: 'home', line: null })), 'home_win');
  assert.equal(marketKeyFor(row({ odds: 1.5, marketKind: '1x2', outcomeKey: 'away', line: null })), 'away_win');
  assert.equal(marketKeyFor(row({ odds: 1.3, marketKind: 'over_under', outcomeKey: 'over', line: 1.5 })), 'over_1_5');
  assert.equal(marketKeyFor(row({ odds: 1.3, marketKind: 'over_under', outcomeKey: 'under', line: 3.5 })), 'under_3_5');
  assert.equal(marketKeyFor(row({ odds: 1.3, marketKind: '1x2', outcomeKey: 'draw', line: null })), null);
});

test('tierForOdds prefers Safe on overlapping edges', () => {
  // over_0_5 safe max 1.05, balanced min 1.04
  assert.equal(tierForOdds('over_0_5', 1.04), 'safe');
  assert.equal(tierForOdds('home_win', 1.30), 'safe');
  assert.equal(tierForOdds('home_win', 1.60), 'balanced');
  assert.equal(tierForOdds('home_win', 2.00), 'value');
  assert.equal(tierForOdds('home_win', 3.00), null);
});

test('generateCandidates only emits banded mapped markets with implied', () => {
  const games: Game[] = [
    {
      id: 'sportybet:1',
      bookmaker: 'sportybet',
      nativeEventId: '1',
      home: 'A',
      away: 'B',
      kickoff: Date.now() + 86400000,
      league: 'Premier League',
      fetchRunId: 'r1',
      markets: [
        {
          bookmaker: 'sportybet',
          nativeId: 'm1',
          specifier: '',
          line: null,
          kind: '1x2',
          unavailableReason: null,
          outcomes: [
            { bookmaker: 'sportybet', nativeId: '1', desc: '1', odds: 1.35, isActive: true },
            { bookmaker: 'sportybet', nativeId: '2', desc: 'X', odds: 3.4, isActive: true },
            { bookmaker: 'sportybet', nativeId: '3', desc: '2', odds: 8.0, isActive: true },
          ],
        },
      ],
    },
  ];
  const c = generateCandidates(games);
  assert.ok(c.length >= 1);
  assert.equal(c[0].marketKey, 'home_win');
  assert.equal(c[0].tier, 'safe');
});

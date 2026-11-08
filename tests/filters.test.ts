import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSportyResponse } from '../src/lib/bookmakers/sportybet.ts';
import { parseBetPawaResponse } from '../src/lib/bookmakers/betpawa.ts';
import {
  FT_LINES,
  candidateRows,
  deriveFilterOptions,
  formatGameCardMarket,
  isAllowedOverUnderLine,
  tokenizeMarketText,
} from '../src/lib/filters.ts';
import type { Game } from '../src/lib/types.ts';
import { betpawaBody, sportyBody } from './fixtures.ts';

const sp = parseSportyResponse(sportyBody); const bp = parseBetPawaResponse(betpawaBody);
assert.ok(sp.ok && bp.ok);
const games = [...sp.games, ...bp.games];

test('bookmaker filter shows only that bookmaker', () => {
  assert.ok(candidateRows(games, { bookmaker: 'betpawa' }).every((r) => r.bookmaker === 'betpawa'));
  assert.ok(candidateRows(games, { bookmaker: 'sportybet' }).every((r) => r.bookmaker === 'sportybet'));
});

test('unidentified markets and betPawa over/under (no line) never become rows', () => {
  const rows = candidateRows(games);
  assert.ok(rows.every((r) => ['1x2', 'double_chance', 'over_under', 'btts'].includes(r.marketKind)));
  assert.equal(rows.filter((r) => r.bookmaker === 'betpawa' && r.marketKind !== '1x2').length, 0);
  assert.equal(rows.filter((r) => r.marketNativeId === '9999').length, 0);
});

test('market, line and odds range filters; counts follow', () => {
  const ou = candidateRows(games, { market: { kind: 'over_under', line: 2.5 } });
  assert.deepEqual(ou.map((r) => r.pick).sort(), ['Over 2.5', 'Under 2.5']);
  assert.equal(candidateRows(games, { market: { kind: 'over_under', line: 3.5 } }).length, 0);
  const band = candidateRows(games, { bookmaker: 'sportybet', oddsMin: 1.9, oddsMax: 2.2 });
  assert.ok(band.every((r) => r.odds >= 1.9 && r.odds <= 2.2));
  assert.equal(band.length, 2); // 2.10 (1x2 home) and 1.95 (under 2.5)
});

test('league and date filters', () => {
  assert.equal(candidateRows(games, { leagues: ['La Liga'] }).length, 0);
  assert.ok(candidateRows(games, { leagues: ['Premier League'] }).length > 0);
  assert.equal(candidateRows(games, { dateFrom: 2_000_000_000_000 }).filter((r) => r.bookmaker === 'sportybet').length, 0);
});

test('filter options come only from markets actually present', () => {
  const o = deriveFilterOptions(games);
  assert.deepEqual(o.leagues, ['Premier League']);
  assert.deepEqual(o.markets.map((m) => m.kind), ['1x2', 'over_under']);
  assert.deepEqual(o.markets.find((m) => m.kind === 'over_under')!.lines, [2.5]);
});

test('over and under markets strictly allow only 0.5, 1.5, 2.5, 3.5, 4.5, 5.5', () => {
  assert.deepEqual(FT_LINES, [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]);
  for (const line of [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]) {
    assert.equal(isAllowedOverUnderLine(line), true);
  }
  for (const invalid of [0, 0.25, 0.75, 1.0, 1.25, 1.75, 2.0, 2.25, 2.75, 3.0, 4.0, 5.0, 6.0, 6.5, null, undefined]) {
    assert.equal(isAllowedOverUnderLine(invalid), false);
  }

  const testGame: Game = {
    id: 'sportybet:ou-lines',
    bookmaker: 'sportybet',
    nativeEventId: 'ou-lines',
    home: 'Arsenal',
    away: 'Chelsea',
    kickoff: 1_800_000_000_000,
    league: 'Premier League',
    fetchRunId: null,
    markets: [0.5, 1.0, 1.25, 1.5, 2.0, 2.25, 2.5, 2.75, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.5].map((line) => ({
      bookmaker: 'sportybet',
      nativeId: '18',
      specifier: `total=${line}`,
      line,
      kind: 'over_under',
      unavailableReason: null,
      outcomes: [
        { bookmaker: 'sportybet', nativeId: '12', desc: 'Over', odds: 1.5, isActive: true },
        { bookmaker: 'sportybet', nativeId: '13', desc: 'Under', odds: 2.5, isActive: true },
      ],
    })),
  };

  const rows = candidateRows([testGame]);
  const lines = [...new Set(rows.map((r) => r.line))].sort((a, b) => (a ?? 0) - (b ?? 0));
  assert.deepEqual(lines, [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]);
});

test('game card market labels: 1 / 2 / x, double chance 1 or x / 1 or 2 / x or 2, Over/Under 0.5-5.5, and numeric vs alphabet tokenizing', () => {
  // 1X2
  assert.equal(formatGameCardMarket({ marketKind: '1x2', outcomeKey: 'home', pick: 'Home', line: null }), '1');
  assert.equal(formatGameCardMarket({ marketKind: '1x2', outcomeKey: 'away', pick: 'Away', line: null }), '2');
  assert.equal(formatGameCardMarket({ marketKind: '1x2', outcomeKey: 'draw', pick: 'Draw', line: null }), 'x');

  // Double chance
  assert.equal(formatGameCardMarket({ marketKind: 'double_chance', outcomeKey: null, pick: 'Home or Draw', line: null }), '1 or x');
  assert.equal(formatGameCardMarket({ marketKind: 'double_chance', outcomeKey: null, pick: '1X', line: null }), '1 or x');
  assert.equal(formatGameCardMarket({ marketKind: 'double_chance', outcomeKey: null, pick: 'Home or Away', line: null }), '1 or 2');
  assert.equal(formatGameCardMarket({ marketKind: 'double_chance', outcomeKey: null, pick: '12', line: null }), '1 or 2');
  assert.equal(formatGameCardMarket({ marketKind: 'double_chance', outcomeKey: null, pick: 'Draw or Away', line: null }), 'x or 2');
  assert.equal(formatGameCardMarket({ marketKind: 'double_chance', outcomeKey: null, pick: 'X2', line: null }), 'x or 2');

  // Over / Under (0.5 - 5.5)
  for (const line of [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]) {
    assert.equal(
      formatGameCardMarket({ marketKind: 'over_under', outcomeKey: 'over', pick: `Over ${line}`, line }),
      `Over ${line.toFixed(1)}`,
    );
    assert.equal(
      formatGameCardMarket({ marketKind: 'over_under', outcomeKey: 'under', pick: `Under ${line}`, line }),
      `Under ${line.toFixed(1)}`,
    );
  }

  // Tokenizing separates numbers (larger font) from alphabet text (smaller font)
  assert.deepEqual(tokenizeMarketText('1'), [{ kind: 'number', value: '1' }]);
  assert.deepEqual(tokenizeMarketText('2'), [{ kind: 'number', value: '2' }]);
  assert.deepEqual(tokenizeMarketText('x'), [{ kind: 'text', value: 'x' }]);
  assert.deepEqual(tokenizeMarketText('1 or x'), [
    { kind: 'number', value: '1' },
    { kind: 'text', value: ' or x' },
  ]);
  assert.deepEqual(tokenizeMarketText('1 or 2'), [
    { kind: 'number', value: '1' },
    { kind: 'text', value: ' or ' },
    { kind: 'number', value: '2' },
  ]);
  assert.deepEqual(tokenizeMarketText('x or 2'), [
    { kind: 'text', value: 'x or ' },
    { kind: 'number', value: '2' },
  ]);
  assert.deepEqual(tokenizeMarketText('Over 2.5'), [
    { kind: 'text', value: 'Over ' },
    { kind: 'number', value: '2.5' },
  ]);
});

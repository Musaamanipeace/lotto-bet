import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSportyResponse } from '../src/lib/bookmakers/sportybet.ts';
import { parseBetPawaResponse } from '../src/lib/bookmakers/betpawa.ts';
import { candidateRows, deriveFilterOptions } from '../src/lib/filters.ts';
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

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { parseSportyResponse, SPORTY_CONFIG } from '../src/lib/bookmakers/sportybet.ts';

const readFeed = (name: string) => JSON.parse(readFileSync(`tests/fixture-sportybet-${name}-feed.json`, 'utf8'));

test('tennis feed parses from real fixture: match_winner + over_under, ft period', () => {
  const r = parseSportyResponse(readFeed('tennis'), undefined, 'tennis');
  assert.ok(r.ok);
  assert.ok(r.games.length > 0);
  const kinds = new Set(r.games.flatMap((g) => g.markets.map((m) => m.kind)));
  assert.ok(kinds.has('match_winner'));
  assert.ok(kinds.has('over_under'));
  for (const g of r.games) assert.equal(g.sport, 'tennis');
  const winners = r.games.flatMap((g) => g.markets).filter((m) => m.kind === 'match_winner');
  assert.ok(winners.every((m) => m.outcomes.map((o) => o.nativeId).sort().join(',') === '4,5'));
  for (const m of r.games.flatMap((g) => g.markets)) {
    if (m.kind === 'over_under') assert.equal(m.period, 'ft');
  }
});

test('basketball feed parses from real fixture: periods q1..q4 and h1/h2', () => {
  const r = parseSportyResponse(readFeed('basketball'), undefined, 'basketball');
  assert.ok(r.ok);
  assert.ok(r.games.length > 0);
  for (const g of r.games) assert.equal(g.sport, 'basketball');
  const byId = new Map<string, string[]>();
  for (const m of r.games.flatMap((g) => g.markets)) {
    if (m.kind === 'over_under' && m.nativeId === '236') byId.set('236', [...(byId.get('236') ?? []), String(m.period ?? 'none')]);
  }
  const quarters = byId.get('236') ?? [];
  assert.ok(quarters.includes('q1') && quarters.includes('q2') && quarters.includes('q3') && quarters.includes('q4'), quarters.join(','));
  const byId2 = new Set(r.games.flatMap((g) => g.markets).filter((m) => m.kind === 'over_under' && m.nativeId === '68').map((m) => m.period));
  assert.ok(byId2.has('h1'));
  const byId3 = new Set(r.games.flatMap((g) => g.markets).filter((m) => m.kind === 'over_under' && m.nativeId === '90').map((m) => m.period));
  assert.ok(byId3.has('h2'));
  // Whole-number lines are rejected per the brief
  assert.equal(SPORTY_CONFIG.basketball.marketMap['18'], undefined, 'id 18 unsupported in basketball');
});

test('id 18 collision: football maps it, basketball does not (map keyed by sport+id)', () => {
  assert.equal(SPORTY_CONFIG.football.marketMap['18'], 'over_under');
  assert.equal(SPORTY_CONFIG.basketball.marketMap['18'], undefined);
});

test('football parsing unchanged: same market ids as before', () => {
  assert.deepEqual(SPORTY_CONFIG.football.marketMap, { '1': '1x2', '10': 'double_chance', '18': 'over_under', '29': 'btts' });
  assert.equal(SPORTY_CONFIG.football.marketIds, '1,10,18,29');
});

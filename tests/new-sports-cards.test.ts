import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { parseSportyResponse } from '../src/lib/bookmakers/sportybet.ts';
import { cardsToRules, clearedCards, CARD_IDS, defaultCards, type CardId } from '../src/lib/market-cards.ts';
import { candidateRows, formatGameCardMarket, parseRules } from '../src/lib/filters.ts';
import { FILTER_VERSION, isLegacyFilterState, normalizeCardsState, normalizeFilterState } from '../src/lib/filter-state.ts';
import type { Game } from '../src/lib/types.ts';

const fixture = (sport: string): unknown => JSON.parse(readFileSync(`tests/fixture-sportybet-${sport}-feed.json`, 'utf8'));
const games = (sport: 'tennis' | 'basketball'): Game[] => {
  const r = parseSportyResponse(fixture(sport), undefined, sport);
  assert.ok(r.ok);
  return r.games;
};
const withCard = (id: CardId, patch: Partial<ReturnType<typeof clearedCards>[CardId]> = {}) => {
  const c = clearedCards();
  return { ...c, [id]: { ...c[id], on: true, ...patch } };
};
const rowsFor = (sport: 'tennis' | 'basketball', id: CardId, patch: Partial<ReturnType<typeof clearedCards>[CardId]> = {}) =>
  candidateRows(games(sport), { rules: cardsToRules(withCard(id, patch)) });

test('tennis match winner card: independent sub-selections, each with its own odds range', () => {
  const all = rowsFor('tennis', 'tn_winner');
  assert.ok(all.length > 0);
  assert.ok(all.every((r) => r.sport === 'tennis' && r.marketKind === 'match_winner' && r.marketNativeId === '186'));
  assert.deepEqual(new Set(all.map((r) => r.outcomeKey)), new Set(['home', 'away']));

  const home = rowsFor('tennis', 'tn_winner', { subs: ['home'] });
  assert.ok(home.length > 0 && home.every((r) => r.outcomeKey === 'home'));
  const away = rowsFor('tennis', 'tn_winner', { subs: ['away'] });
  assert.ok(away.length > 0 && away.every((r) => r.outcomeKey === 'away'));

  // This card's odds range only affects this card.
  const odds = home[0].odds;
  const narrow = rowsFor('tennis', 'tn_winner', { subs: ['home'], low: odds, high: odds });
  assert.ok(narrow.length > 0 && narrow.every((r) => r.odds === odds));
  assert.equal(candidateRows(games('tennis'), { rules: cardsToRules(withCard('tn_winner', { subs: [], on: true })) }).length, 0);
});

test('tennis total games card uses the real games line and keeps over/under independent', () => {
  const rows = rowsFor('tennis', 'tn_total');
  assert.ok(rows.length > 0);
  assert.ok(rows.every((r) => r.sport === 'tennis' && r.marketKind === 'over_under' && r.marketNativeId === '189' && r.period === 'ft'));
  assert.ok(rows.every((r) => typeof r.line === 'number' && Number.isFinite(r.line) && r.line! > 10 && String(r.line).endsWith('.5')));
  assert.deepEqual(new Set(rows.map((r) => r.outcomeKey)), new Set(['over', 'under']));
  assert.equal(formatGameCardMarket(rows.find((r) => r.outcomeKey === 'over')!), 'Over 17.5');
});

test('basketball moneyline, game total, quarter and half cards stay isolated by sport/period/market id', () => {
  const ml = rowsFor('basketball', 'bk_ml');
  assert.ok(ml.every((r) => r.marketKind === 'match_winner' && r.marketNativeId === '219' && r.outcomeKey !== null));

  const total = rowsFor('basketball', 'bk_total');
  assert.ok(total.every((r) => r.marketNativeId === '225' && r.period === 'ft'));

  for (const [id, period] of [['bk_q1', 'q1'], ['bk_q2', 'q2'], ['bk_q3', 'q3'], ['bk_q4', 'q4']] as const) {
    const rows = rowsFor('basketball', id);
    assert.ok(rows.length > 0, `${id} has rows`);
    assert.ok(rows.every((r) => r.marketNativeId === '236' && r.period === period), id);
  }
  const h1 = rowsFor('basketball', 'bk_h1');
  const h2 = rowsFor('basketball', 'bk_h2');
  assert.ok(h1.length > 0 && h1.every((r) => r.marketNativeId === '68' && r.period === 'h1'));
  assert.ok(h2.length > 0 && h2.every((r) => r.marketNativeId === '90' && r.period === 'h2'));

  // The tennis winner card cannot pick up basketball moneyline rows and vice versa.
  assert.equal(candidateRows(games('basketball'), { rules: cardsToRules(withCard('tn_winner')) }).length, 0);
  assert.equal(candidateRows(games('tennis'), { rules: cardsToRules(withCard('bk_ml')) }).length, 0);
});

test('odds bounds are per card: changing tennis bounds leaves basketball rows untouched', () => {
  const tennis = cardsToRules(withCard('tn_winner', { low: 1.9, high: 2.0 }));
  const tennisRows = candidateRows(games('tennis'), { rules: tennis });
  assert.ok(tennisRows.every((r) => r.odds >= 1.9 && r.odds <= 2));
  const basketball = candidateRows(games('basketball'), { rules: tennis });
  assert.equal(basketball.length, 0, 'tennis rules never match basketball games');
});

test('filterVersion migration fills missing tennis/basketball cards from an old saved shape', () => {
  const legacy = {
    bookmaker: 'sportybet', withinHours: 24, leagues: ['Premier League'],
    cards: {
      dc: { on: false, low: 1.1, high: 1.4, subs: ['1X'] },
      '1x2': { on: true, low: 1.3, high: 2.5, subs: ['home'] },
      over: { on: true, low: 1.05, high: 2, subs: ['1.5'] },
      under: { on: false, low: 1.05, high: 3, subs: ['3.5'] },
      btts: { on: false, low: 1.2, high: 3, subs: ['GG'] },
    },
  };
  assert.equal(isLegacyFilterState(legacy), true);
  const migrated = normalizeFilterState(legacy);
  assert.equal(migrated.filterVersion, FILTER_VERSION);
  assert.equal(isLegacyFilterState(migrated), false);
  for (const id of CARD_IDS) assert.ok(migrated.cards[id], `card ${id} exists`);
  assert.deepEqual(migrated.cards['1x2'], legacy.cards['1x2']);
  for (const id of ['tn_winner', 'tn_total', 'bk_ml', 'bk_total', 'bk_q1', 'bk_q2', 'bk_q3', 'bk_q4', 'bk_h1', 'bk_h2'] as const) {
    assert.deepEqual(migrated.cards[id], defaultCards()[id], `${id} gets its default (off)`);
    assert.equal(migrated.cards[id].on, false);
  }
});

test('cards survive a v2 round trip and malformed new rules are rejected', () => {
  const cards = defaultCards();
  assert.deepEqual(normalizeCardsState(cards), cards);
  const rules = cardsToRules({ ...cards, tn_total: { ...cards.tn_total, on: true } });
  assert.deepEqual(parseRules(JSON.stringify(rules)), rules);
  assert.equal(parseRules('[{"kind":"match_winner","sport":"hockey"}]'), null);
  assert.equal(parseRules('[{"kind":"over_under","period":"q9"}]'), null);
  assert.equal(parseRules('[{"kind":"over_under","marketIds":"186"}]'), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterAiPicksByTemplate,
  buildTemplateTargetOdds,
  buildTemplatePicksN,
  buildTemplateAiAcca,
  templateSummary,
} from '../src/lib/template-ai.ts';
import { DEFAULT_TEMPLATES, type FilterTemplate } from '../src/lib/template-store.ts';
import type { AiPick } from '../src/lib/ai-picks.ts';

function makePick(id: string, marketKey: AiPick['marketKey'], odds: number, tier: AiPick['tier'] = 'safe', overrides: Partial<AiPick> = {}): AiPick {
  return {
    id: `p-${id}`,
    gameId: `sportybet:${id}`,
    bookmaker: 'sportybet',
    marketKey,
    marketNativeId: 'm1',
    outcomeNativeId: 'o1',
    specifier: '',
    odds,
    impliedProbability: 1 / odds,
    kickoff: Date.now() + 3600_000,
    league: 'Premier League',
    home: `Home ${id}`,
    away: `Away ${id}`,
    tier,
    evaluation: {
      qualifies: true,
      label: 'Verified',
      passed: 3,
      verifiable: 3,
      total: 3,
      verifiedLabel: '3 of 3 verified',
      reason: null,
      provisionalCriteria: [],
    },
    fitScore: 0.85,
    fitBreakdown: {
      tierPlacement: 1,
      impliedProbability: 0.7,
      criteriaPassShare: 1,
      leaguePriority: 1,
      cardsCornersData: 0,
      failedCriteriaPenalty: 0,
      congestionPenalty: 0,
    },
    rationale: 'Solid home record',
    exclusionStatus: 'not_checked',
    ...overrides,
  };
}

test('filters AI picks matching Safe Accumulator template', () => {
  const safeTpl = DEFAULT_TEMPLATES.find((t) => t.id === 'tpl-safe-acca')!;
  const picks: AiPick[] = [
    makePick('1', 'double_chance_1x', 1.25),
    makePick('2', 'home_win', 1.40),
    makePick('3', 'away_win', 2.50), // 1x2 but outside high odds
    makePick('4', 'over_1_5', 1.30), // over is disabled on Safe Acca
  ];

  const filtered = filterAiPicksByTemplate(picks, safeTpl);
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].id, 'p-1');
  assert.equal(filtered[1].id, 'p-2');
});

test('filters AI picks by bookmaker and league when specified in template', () => {
  const customTpl: FilterTemplate = {
    id: 'tpl-custom',
    name: 'EPL Only',
    bookmaker: 'sportybet',
    withinHours: 24,
    leagues: ['Premier League'],
    createdAt: Date.now(),
    cards: {
      dc: { on: false, low: 1.05, high: 2.0, subs: ['1X'] },
      '1x2': { on: true, low: 1.2, high: 2.0, subs: ['home'] },
      over: { on: false, low: 1.2, high: 2.0, subs: ['1.5'] },
      under: { on: false, low: 1.2, high: 2.0, subs: ['3.5'] },
      btts: { on: false, low: 1.2, high: 2.0, subs: ['yes'] },
    },
  };

  const picks: AiPick[] = [
    makePick('1', 'home_win', 1.5, 'safe', { league: 'Premier League' }),
    makePick('2', 'home_win', 1.5, 'safe', { league: 'La Liga' }), // wrong league
    makePick('3', 'home_win', 1.5, 'safe', { bookmaker: 'betpawa' }), // wrong bookmaker
  ];

  const filtered = filterAiPicksByTemplate(picks, customTpl);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'p-1');
});

test('buildTemplateTargetOdds generates accumulator matching target odds from template', () => {
  const goalFeast = DEFAULT_TEMPLATES.find((t) => t.id === 'tpl-goal-feast')!;
  const picks: AiPick[] = [
    makePick('1', 'over_1_5', 1.35, 'safe'),
    makePick('2', 'over_1_5', 1.40, 'safe'),
    makePick('3', 'over_1_5', 1.50, 'safe'),
    makePick('4', 'over_1_5', 1.60, 'safe'),
    makePick('5', 'home_win', 1.50, 'safe'), // not over goals
  ];

  const res = buildTemplateTargetOdds(picks, goalFeast, 4.0, 'lower');
  assert.ok(res.slip);
  assert.ok(res.achieved > 2.0);
  assert.ok(res.slip.picks.every((p) => p.marketKey === 'over_1_5'));
});

test('buildTemplatePicksN limits count and ensures one pick per game', () => {
  const safeTpl = DEFAULT_TEMPLATES.find((t) => t.id === 'tpl-safe-acca')!;
  const picks: AiPick[] = [
    makePick('1', 'home_win', 1.35),
    makePick('1', 'double_chance_1x', 1.15), // same game
    makePick('2', 'home_win', 1.40),
    makePick('3', 'home_win', 1.45),
  ];

  const selected = buildTemplatePicksN(picks, safeTpl, 2);
  assert.equal(selected.length, 2);
  assert.equal(selected[0].gameId, 'sportybet:1');
  assert.equal(selected[1].gameId, 'sportybet:2');
});

test('templateSummary returns human-readable summary', () => {
  const safeTpl = DEFAULT_TEMPLATES.find((t) => t.id === 'tpl-safe-acca')!;
  const s = templateSummary(safeTpl);
  assert.ok(s.includes('SportyBet'));
  assert.ok(s.includes('Double Chance'));
});

test('buildTemplateAiAcca with both targetOdds and targetGamesCount', () => {
  const safeTpl = DEFAULT_TEMPLATES.find((t) => t.id === 'tpl-safe-acca')!;
  const picks: AiPick[] = [
    makePick('1', 'home_win', 1.4),
    makePick('2', 'home_win', 1.45),
    makePick('3', 'double_chance_1x', 1.25),
    makePick('4', 'double_chance_1x', 1.3),
    makePick('5', 'home_win', 1.5),
  ];

  const res = buildTemplateAiAcca(picks, safeTpl, { targetOdds: 3.0, targetGamesCount: 3 });
  assert.ok(res.picks.length <= 3);
  assert.ok(res.totalOdds > 1.5);
});

test('buildTemplateAiAcca with only targetGamesCount (optional odds)', () => {
  const safeTpl = DEFAULT_TEMPLATES.find((t) => t.id === 'tpl-safe-acca')!;
  const picks: AiPick[] = [
    makePick('1', 'home_win', 1.4),
    makePick('2', 'home_win', 1.45),
    makePick('3', 'double_chance_1x', 1.25),
  ];

  const res = buildTemplateAiAcca(picks, safeTpl, { targetGamesCount: 2 });
  assert.equal(res.picks.length, 2);
  assert.ok(res.totalOdds > 1);
});

test('buildTemplateAiAcca with neither targetOdds nor targetGamesCount', () => {
  const safeTpl = DEFAULT_TEMPLATES.find((t) => t.id === 'tpl-safe-acca')!;
  const picks: AiPick[] = [
    makePick('1', 'home_win', 1.4),
    makePick('2', 'home_win', 1.45),
    makePick('3', 'double_chance_1x', 1.25),
    makePick('4', 'home_win', 1.35),
    makePick('5', 'double_chance_1x', 1.2),
    makePick('6', 'home_win', 1.5),
  ];

  const res = buildTemplateAiAcca(picks, safeTpl);
  assert.equal(res.picks.length, 5); // default 5 picks
  assert.ok(res.totalOdds > 1);
});

test('filters AI picks by timeframe and timeframe override', () => {
  const safeTpl = DEFAULT_TEMPLATES.find((t) => t.id === 'tpl-safe-acca')!;
  const now = Date.now();
  const picks: AiPick[] = [
    makePick('1', 'home_win', 1.4, 'safe', { kickoff: now + 2 * 3600_000 }), // in 2 hours
    makePick('2', 'home_win', 1.4, 'safe', { kickoff: now + 10 * 3600_000 }), // in 10 hours
    makePick('3', 'home_win', 1.4, 'safe', { kickoff: now + 36 * 3600_000 }), // in 36 hours
  ];

  // Filter with withinHours = 6 (should only get pick 1)
  const in6h = filterAiPicksByTemplate(picks, safeTpl, 6);
  assert.equal(in6h.length, 1);
  assert.equal(in6h[0].id, 'p-1');

  // Filter with withinHours = 24 (should get picks 1 and 2)
  const in24h = filterAiPicksByTemplate(picks, safeTpl, 24);
  assert.equal(in24h.length, 2);

  // In buildTemplateAiAcca with withinHours: 6
  const acca = buildTemplateAiAcca(picks, safeTpl, { withinHours: 6 });
  assert.equal(acca.picks.length, 1);
  assert.equal(acca.picks[0].id, 'p-1');
});


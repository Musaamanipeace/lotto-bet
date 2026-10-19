import test from 'node:test';
import assert from 'node:assert/strict';
import { aiPickToRow } from '../src/lib/ai-rows.ts';
import { generateSportyBetCode } from '../src/lib/codegen/sportybet.ts';
import { parseLegs } from '../src/lib/codegen/index.ts';
import type { PickMarketKey } from '../src/lib/criteria.ts';

const pick = (over: Partial<Parameters<typeof aiPickToRow>[0]> = {}) => ({
  gameId: 'sportybet:sr:match:61301013', bookmaker: 'sportybet', marketKey: 'home_win' as PickMarketKey,
  marketNativeId: '1', outcomeNativeId: '1', specifier: '', odds: 1.4, impliedProbability: 0.7,
  kickoff: 1_800_000_000_000, league: 'L', home: 'A', away: 'B', ...over,
});

test('AI leg keeps the full SportyBet event id, which itself contains colons', () => {
  const row = aiPickToRow(pick())!;
  assert.equal(row.nativeEventId, 'sr:match:61301013'); // split(":")[1] would have produced "sr"
  assert.equal(row.gameId, 'sportybet:sr:match:61301013');
});

test('AI legs get the right market shape; unrepresentable ones are skipped', () => {
  assert.deepEqual(
    (({ marketKind, line, pick: p, outcomeKey }) => ({ marketKind, line, p, outcomeKey }))(aiPickToRow(pick({ marketKey: 'under_3_5', marketNativeId: '18', outcomeNativeId: '13', specifier: 'total=3.5' }))!),
    { marketKind: 'over_under', line: 3.5, p: 'Under 3.5', outcomeKey: 'under' },
  );
  assert.equal(aiPickToRow(pick({ marketKey: 'corners_over' }))!, null);
  assert.equal(aiPickToRow(pick({ gameId: 'betpawa:123' })), null); // prefix must match the bookmaker
  assert.equal(aiPickToRow(pick({ gameId: 'sportybet:' })), null);
});

test('an AI leg passes validation and reaches SportyBet with the real ids and a null specifier', async () => {
  const row = aiPickToRow(pick())!;
  const parsed = parseLegs([row]);
  assert.ok(parsed.ok);
  let sent: unknown;
  const impl = (async (_u: string, init: RequestInit) => { sent = JSON.parse(init.body as string); return new Response(JSON.stringify({ bizCode: 10000, data: { shareCode: 'XYZ' } })); }) as unknown as typeof fetch;
  const r = await generateSportyBetCode(parsed.legs, impl);
  assert.ok(r.ok);
  assert.deepEqual(sent, { selections: [{ eventId: 'sr:match:61301013', marketId: '1', outcomeId: '1', specifier: null }] });
});

test('markets that do have a specifier keep it exactly', async () => {
  const row = aiPickToRow(pick({ marketKey: 'over_0_5', marketNativeId: '18', outcomeNativeId: '12', specifier: 'total=0.5' }))!;
  let sent: { selections: { specifier: unknown }[] } | undefined;
  const impl = (async (_u: string, init: RequestInit) => { sent = JSON.parse(init.body as string); return new Response(JSON.stringify({ bizCode: 10000, data: { shareCode: 'XYZ' } })); }) as unknown as typeof fetch;
  await generateSportyBetCode([row], impl);
  assert.equal(sent!.selections[0].specifier, 'total=0.5');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMemoryFdCache } from '../src/lib/fd-cache.ts';
import { FootballDataProvider } from '../src/lib/fd-provider.ts';

test('createMemoryFdCache: get/set/delete + expiry', () => {
  const c = createMemoryFdCache(50);
  c.set('a', 1);
  assert.deepEqual(c.get('a'), { at: c.get('a')!.at, value: 1 });
  assert.equal(c.get('a')!.value, 1);
  c.delete('a');
  assert.equal(c.get('a'), null);
  c.set('b', 2);
  c.set('b', 3);
  assert.equal(c.get('b')!.value, 3);
});

test('createMemoryFdCache: expires after ttl', async () => {
  const c = createMemoryFdCache(20);
  c.set('x', 9);
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(c.get('x'), null);
});

test('FootballDataProvider.setCache: read-through cache returns cached data, no second fetch', async () => {
  const c = createMemoryFdCache();
  let calls = 0;
  const fetchStub = async () => {
    calls++;
    return new Response(
      JSON.stringify({
        standings: [{ type: 'TOTAL', table: [{ position: 1, team: { id: 1, name: 'X' }, playedGames: 6, won: 3, draw: 1, lost: 2, goalsFor: 3, goalsAgainst: 1 }] }],
      }),
      { status: 200 },
    );
  };
  const p = new FootballDataProvider({ FOOTBALL_DATA_API_KEY: 'k', NODE_ENV: 'test' } as NodeJS.ProcessEnv, { fetch: fetchStub });
  p.setCache(c);
  const a = await p.getStandings('1');
  const b = await p.getStandings('1');
  assert.equal(calls, 1, `expected 1 fetch, got ${calls}`);
  assert.ok(!('fail' in a) && !('fail' in b));
  assert.equal((a as { total: unknown[] }).total.length, 1);
});

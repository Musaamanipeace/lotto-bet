import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { PickRow } from '../src/lib/filters.ts';
import { randomPicks } from '../src/lib/random-picks.ts';

const row = (g: number, o: number): PickRow => ({
  gameId: `sportybet:${g}`, nativeEventId: `${g}`, bookmaker: 'sportybet', home: 'H', away: 'A', kickoff: g, league: null,
  pick: `o${o}`, odds: 2, marketNativeId: '1', outcomeNativeId: `${o}`, specifier: '', marketKind: '1x2', line: null, outcomeKey: null, implied: null,
});
const pool = [row(1, 1), row(1, 2), row(1, 3), row(2, 1), row(2, 2), row(3, 1)];

// small deterministic generator (mulberry32) so the test never touches Math.random
const seeded = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

test('random picks: one pick per game, from the pool, deterministic for a given rng', () => {
  const a = randomPicks(pool, 2, seeded(7)), b = randomPicks(pool, 2, seeded(7));
  assert.ok(a.ok && b.ok);
  assert.deepEqual(a.picks, b.picks);
  assert.equal(new Set(a.picks.map((p) => p.gameId)).size, 2);
  assert.ok(a.picks.every((p) => pool.includes(p)));
});

test('asking for more games than exist returns what exists and says so (no padding)', () => {
  const r = randomPicks(pool, 10, seeded(1));
  assert.ok(r.ok); assert.equal(r.picks.length, 3); assert.equal(r.requested, 10); assert.equal(r.available, 3);
  assert.ok(randomPicks([], 5, seeded(1)).ok);
});

test('count must be a whole number from 1 to 50', () => {
  for (const n of [0, -1, 1.5, 51, NaN]) assert.equal(randomPicks(pool, n).ok, false);
});

test('Math.random is used only in src/lib/random-picks.ts (engineering rule 2)', () => {
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      if (f === 'node_modules' || f === '.next' || f === '.git') continue;
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f) && readFileSync(p, 'utf8').includes('Math.random')) hits.push(p);
    }
  };
  for (const d of ['src', 'app']) walk(d);
  assert.deepEqual(hits, [join('src', 'lib', 'random-picks.ts')]);
});

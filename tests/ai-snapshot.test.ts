import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateAiPicks } from '../src/lib/ai-engine.ts';
import { getAiSnapshot, saveAiSnapshot } from '../src/lib/ai-store.ts';
import { MemorySnapshotStore } from '../src/lib/ai-snapshot-store.ts';
import { loadAiSnapshot, runAiGeneration, storageProblem } from '../src/lib/run-ai.ts';
import { MemoryStore } from '../src/lib/memory-store.ts';
import { hintForError } from '../src/lib/error-hints.ts';

const PROD = { NODE_ENV: 'production' } as unknown as NodeJS.ProcessEnv;
const DEV = { NODE_ENV: 'development' } as unknown as NodeJS.ProcessEnv;

test('a saved snapshot is read back by a different "instance" (separate reads of the same store)', async () => {
  const store = new MemorySnapshotStore();
  assert.equal(await getAiSnapshot(store), null);
  const saved = await saveAiSnapshot(await generateAiPicks([]), 'run-1', store);
  const back = await getAiSnapshot(store);
  assert.equal(back?.runId, 'run-1');
  assert.equal(back?.generatedAt, saved.generatedAt);
});

test('production without DATABASE_URL is refused with a clear reason; a database, dev, or the explicit opt-in is fine', () => {
  assert.match(storageProblem(PROD) ?? '', /DATABASE_URL is not set/);
  assert.equal(storageProblem({ ...PROD, DATABASE_URL: 'postgres://x' } as NodeJS.ProcessEnv), null);
  assert.equal(storageProblem({ ...PROD, ALLOW_MEMORY_STORE: '1' } as NodeJS.ProcessEnv), null);
  assert.equal(storageProblem(DEV), null);
});

test('reading never generates: with nothing saved it says so, with a stable code', async () => {
  const r = await loadAiSnapshot(DEV);
  assert.ok(!r.ok);
  assert.equal(r.details.code, 'no_snapshot');
  const prod = await loadAiSnapshot(PROD);
  assert.ok(!prod.ok);
  assert.equal(prod.details.code, 'storage_not_configured');
});

test('generation reports the real reason: storage problem, no fetch run', async () => {
  const store = new MemoryStore();
  const a = await runAiGeneration(store, PROD);
  assert.ok(!a.ok); assert.equal(a.details.code, 'storage_not_configured');
  const b = await runAiGeneration(store, DEV);
  assert.ok(!b.ok); assert.equal(b.details.code, 'no_fetch_run');
});

test('the error box only suggests fetching games when that is the actual problem', () => {
  assert.match(hintForError('No finished fetch run yet. Refresh games first.') ?? '', /Fetch games first/);
  assert.match(hintForError('No AI picks have been generated yet. Press Regenerate AI') ?? '', /Regenerate AI/);
  assert.match(hintForError('DATABASE_URL is not set. On serverless...') ?? '', /DATABASE_URL/);
  assert.equal(hintForError('Gemini timed out (no response before the time limit)'), null);
  assert.equal(hintForError('AI picks were generated but could not be saved: connection refused'), null);
  assert.equal(hintForError(null), null);
});

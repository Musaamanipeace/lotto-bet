import assert from 'node:assert/strict';
import { test } from 'node:test';
import { callLlm } from '../src/lib/llm/index.ts';
import { buildLlmEnv } from '../src/lib/llm/request-env.ts';
import { jsonResponse } from './fixtures.ts';

const KEYS = { GEMINI_API_KEY: 'g', OPENROUTER_API_KEY: 'o', MISTRAL_API_KEY: 'm' };

/**
 * A fetch that never answers; it only ends when the caller's AbortSignal fires. AbortSignal.timeout
 * timers do not keep Node alive, so a ref'd timer holds the test process open until the abort lands.
 */
const hang = (async (_url: string, init: RequestInit) =>
  new Promise<Response>((_res, rej) => {
    const keepAlive = setTimeout(() => {}, 10_000);
    init.signal?.addEventListener('abort', () => { clearTimeout(keepAlive); rej(init.signal?.reason); });
  })) as unknown as typeof fetch;

test('a hung provider is reported as "timed out", not as a bare request failure', async () => {
  const r = await callLlm({ prompt: 'hi' }, { GEMINI_API_KEY: 'g', LLM_TIMEOUT_MS: '40' }, hang);
  assert.ok(!r.ok);
  assert.match(r.error, /Gemini timed out/);
  assert.equal(r.details.attempts?.filter((a) => !a.error.startsWith('skipped:')).length, 1);
});

test('the whole chain stays inside its time budget; late providers are skipped, never started', async () => {
  const calls: string[] = [];
  const f = (async (url: string, init: RequestInit) => { calls.push(new URL(url).host); return (hang as Function)(url, init); }) as unknown as typeof fetch;
  const t0 = Date.now();
  const r = await callLlm({ prompt: 'hi' }, { ...KEYS, LLM_TIMEOUT_MS: '60', LLM_TOTAL_BUDGET_MS: '100' }, f);
  const elapsed = Date.now() - t0;
  assert.ok(!r.ok);
  assert.ok(elapsed < 500, `took ${elapsed}ms`);
  assert.deepEqual(calls, ['generativelanguage.googleapis.com'], 'only the first provider had time to start');
  assert.match(r.error, /gemini: Gemini timed out/);
  assert.match(r.error, /openrouter: skipped: time budget/);
  assert.match(r.error, /mistral: skipped: time budget/);
});

test('defaults keep the chain under the browser timeout (35s) and the route limit (60s)', async () => {
  const { LLM_TIMEOUT_MS, LLM_TOTAL_BUDGET_MS } = await import('../src/lib/llm/types.ts');
  assert.ok(LLM_TOTAL_BUDGET_MS < 35_000);
  assert.ok(LLM_TIMEOUT_MS <= LLM_TOTAL_BUDGET_MS);
});

test('Settings model applies only to the chosen provider and the chosen provider goes first', () => {
  const env = buildLlmEnv(new Headers({ 'x-ai-provider': 'mistral', 'x-ai-model': 'open-mistral-7b' }), KEYS);
  assert.equal(env.MISTRAL_MODEL, 'open-mistral-7b');
  assert.equal(env.GEMINI_MODEL, undefined);
  assert.equal(env.OPENROUTER_MODEL, undefined);
  assert.equal(env.LLM_PROVIDER_ORDER, 'mistral,gemini,openrouter');
});

test('failing over from the chosen provider sends the next provider ITS OWN default model', async () => {
  const bodies: Record<string, unknown> = {};
  const f = (async (url: string, init: RequestInit) => {
    const host = new URL(url).host;
    bodies[host] = init.body ? JSON.parse(init.body as string) : null;
    if (host === 'generativelanguage.googleapis.com') return jsonResponse(503, { error: { message: 'overloaded' } });
    return jsonResponse(200, { choices: [{ message: { content: 'ok' } }] });
  }) as unknown as typeof fetch;
  const env = buildLlmEnv(new Headers({ 'x-ai-provider': 'gemini', 'x-ai-model': 'gemini-2.5-pro' }), { GEMINI_API_KEY: 'g', OPENROUTER_API_KEY: 'o' });
  const r = await callLlm({ prompt: 'hi' }, env, f);
  assert.ok(r.ok);
  assert.equal(r.provider, 'openrouter');
  assert.equal(r.model, 'openrouter/auto');
  assert.equal((bodies['openrouter.ai'] as { model: string }).model, 'openrouter/auto');
  assert.equal(r.attempts[0].provider, 'gemini', 'the Gemini failure stays visible');
});

test('headers: client key headers are ignored (server env only), unknown providers and oversized models are ignored', () => {
  const env = buildLlmEnv(new Headers({ 'x-ai-provider': 'nope', 'x-ai-model': 'x' }), { GEMINI_API_KEY: 'server-key' });
  assert.equal(env.GEMINI_API_KEY, 'server-key');
  assert.equal(env.LLM_PROVIDER_ORDER, undefined);
  assert.equal(env.GEMINI_MODEL, undefined);
  const big = buildLlmEnv(new Headers({ 'x-ai-provider': 'gemini', 'x-ai-model': 'm'.repeat(300) }), {});
  assert.equal(big.GEMINI_MODEL, undefined);
});

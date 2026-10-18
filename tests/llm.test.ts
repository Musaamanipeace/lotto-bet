import assert from 'node:assert/strict';
import { test } from 'node:test';
import { callLlm, isTransient, parseOrder } from '../src/lib/llm/index.ts';
import { jsonResponse } from './fixtures.ts';

const KEYS = { GEMINI_API_KEY: 'g', OPENROUTER_API_KEY: 'o', OPENROUTER_MODEL: 'some/model', MISTRAL_API_KEY: 'm' }; // model pinned here so the tests can check it
const geminiOk = { candidates: [{ content: { parts: [{ text: 'from gemini' }] } }] };
const chatOk = (t: string) => ({ choices: [{ message: { content: t } }] });

function router(handlers: Record<string, () => Response | Promise<Response>>) {
  const calls: string[] = [];
  const fetchImpl = (async (url: string) => {
    const host = new URL(url).host;
    calls.push(host);
    return handlers[host]();
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}
const G = 'generativelanguage.googleapis.com', O = 'openrouter.ai', M = 'api.mistral.ai';

test('first configured provider answers; no other provider is called', async () => {
  const { calls, fetchImpl } = router({ [G]: () => jsonResponse(200, geminiOk), [O]: () => jsonResponse(200, chatOk('x')), [M]: () => jsonResponse(200, chatOk('x')) });
  const r = await callLlm({ prompt: 'hi' }, KEYS, fetchImpl);
  assert.ok(r.ok); assert.equal(r.text, 'from gemini'); assert.equal(r.provider, 'gemini'); assert.deepEqual(calls, [G]); assert.deepEqual(r.attempts, []);
});

test('Gemini "high demand" 503 fails over to OpenRouter, and the failure stays visible in attempts', async () => {
  const { calls, fetchImpl } = router({ [G]: () => jsonResponse(503, { error: { message: 'model is overloaded' } }), [O]: () => jsonResponse(200, chatOk('from openrouter')), [M]: () => jsonResponse(200, chatOk('x')) });
  const r = await callLlm({ prompt: 'hi' }, KEYS, fetchImpl);
  assert.ok(r.ok); assert.equal(r.provider, 'openrouter'); assert.equal(r.text, 'from openrouter'); assert.equal(r.model, 'some/model');
  assert.equal(r.attempts.length, 1); assert.equal(r.attempts[0].provider, 'gemini'); assert.equal(r.attempts[0].httpStatus, 503);
  assert.deepEqual(calls, [G, O]);
});

test('each provider gets exactly ONE request (no retries), and the chain reaches Mistral', async () => {
  const { calls, fetchImpl } = router({ [G]: () => jsonResponse(429, 'rate'), [O]: () => jsonResponse(500, 'boom'), [M]: () => jsonResponse(200, chatOk('from mistral')) });
  const r = await callLlm({ prompt: 'hi', json: true }, KEYS, fetchImpl);
  assert.ok(r.ok); assert.equal(r.provider, 'mistral'); assert.deepEqual(calls, [G, O, M]); assert.equal(r.attempts.length, 2);
});

test('all providers failing returns an error carrying every real message and status', async () => {
  const { fetchImpl } = router({ [G]: () => jsonResponse(503, 'a'), [O]: () => jsonResponse(502, 'b'), [M]: () => jsonResponse(401, 'c') });
  const r = await callLlm({ prompt: 'hi' }, KEYS, fetchImpl);
  assert.ok(!r.ok); assert.match(r.error, /All LLM providers failed/);
  assert.deepEqual(r.details.attempts!.map((a) => [a.provider, a.httpStatus]), [['gemini', 503], ['openrouter', 502], ['mistral', 401]]);
});

test('network errors and empty responses also fail over', async () => {
  const { fetchImpl } = router({ [G]: () => { throw new Error('socket hang up'); }, [O]: () => jsonResponse(200, { choices: [{ message: { content: '' } }] }), [M]: () => jsonResponse(200, chatOk('ok')) });
  const r = await callLlm({ prompt: 'hi' }, KEYS, fetchImpl);
  assert.ok(r.ok); assert.equal(r.provider, 'mistral');
  assert.match(r.attempts[0].error, /socket hang up/); assert.match(r.attempts[1].error, /no text/);
});

test('unconfigured providers are skipped and listed, never called; none configured is an explicit error', async () => {
  const { calls, fetchImpl } = router({ [M]: () => jsonResponse(200, chatOk('m')) });
  const r = await callLlm({ prompt: 'hi' }, { MISTRAL_API_KEY: 'm' }, fetchImpl);
  assert.ok(r.ok); assert.deepEqual(calls, [M]);
  assert.deepEqual(r.attempts.map((a) => a.error), ['skipped: GEMINI_API_KEY is not set', 'skipped: OPENROUTER_API_KEY is not set']);
  const none = await callLlm({ prompt: 'hi' }, {}, fetchImpl);
  assert.ok(!none.ok); assert.match(none.error, /No LLM provider is configured/);
});

test('LLM_FAILOVER=transient stops at a non-transient error (e.g. 400) instead of trying the next provider', async () => {
  const { calls, fetchImpl } = router({ [G]: () => jsonResponse(400, 'bad request'), [O]: () => jsonResponse(200, chatOk('x')) });
  const r = await callLlm({ prompt: 'hi' }, { ...KEYS, LLM_FAILOVER: 'transient' }, fetchImpl);
  assert.ok(!r.ok); assert.deepEqual(calls, [G]); assert.match(r.error, /non-transient/);
  const t = router({ [G]: () => jsonResponse(503, 'x'), [O]: () => jsonResponse(200, chatOk('y')) });
  const r2 = await callLlm({ prompt: 'hi' }, { ...KEYS, LLM_FAILOVER: 'transient' }, t.fetchImpl);
  assert.ok(r2.ok); assert.equal(r2.provider, 'openrouter');
});

test('order and mode come from env; bad values are explicit errors', async () => {
  const { calls, fetchImpl } = router({ [M]: () => jsonResponse(200, chatOk('m')), [G]: () => jsonResponse(200, geminiOk) });
  const r = await callLlm({ prompt: 'hi' }, { ...KEYS, LLM_PROVIDER_ORDER: 'mistral,gemini' }, fetchImpl);
  assert.ok(r.ok); assert.deepEqual(calls, [M]);
  assert.ok(!parseOrder('gemini,gpt').ok);
  assert.ok(!(await callLlm({ prompt: 'x' }, { ...KEYS, LLM_FAILOVER: 'sometimes' }, fetchImpl)).ok);
  assert.deepEqual([undefined, 408, 429, 500, 503].map(isTransient), [true, true, true, true, true]);
  assert.deepEqual([400, 401, 403, 404].map(isTransient), [false, false, false, false]);
});

test('requests are shaped per provider (key in header, json mode, system prompt)', async () => {
  const seen: { url: string; init: RequestInit }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => { seen.push({ url, init }); return jsonResponse(503, 'x'); }) as unknown as typeof fetch;
  await callLlm({ system: 'be brief', prompt: 'hi', json: true }, KEYS, fetchImpl);
  const [g, o, m] = seen.map((s) => ({ ...s, body: JSON.parse(s.init.body as string), h: s.init.headers as Record<string, string> }));
  assert.equal(g.h['x-goog-api-key'], 'g'); assert.ok(!g.url.includes('key=')); assert.equal(g.body.generationConfig.responseMimeType, 'application/json');
  assert.equal(g.body.systemInstruction.parts[0].text, 'be brief'); assert.match(g.url, /gemini-2\.5-flash:generateContent$/);
  assert.equal(o.h.authorization, 'Bearer o'); assert.equal(o.body.model, 'some/model'); assert.equal(o.body.messages[0].role, 'system'); assert.equal(o.body.response_format.type, 'json_object');
  assert.equal(m.h.authorization, 'Bearer m'); assert.equal(m.body.model, 'mistral-small-latest'); assert.equal(m.url, 'https://api.mistral.ai/v1/chat/completions');
});

test('OpenRouter defaults to openrouter/auto when OPENROUTER_MODEL is unset, and honours it when set', async () => {
  const bodies: string[] = [];
  const fetchImpl = (async (_u: string, init: RequestInit) => { bodies.push(JSON.parse(init.body as string).model); return jsonResponse(200, chatOk('ok')); }) as unknown as typeof fetch;
  const a = await callLlm({ prompt: 'x' }, { OPENROUTER_API_KEY: 'o' }, fetchImpl);
  assert.ok(a.ok); assert.equal(a.model, 'openrouter/auto');
  await callLlm({ prompt: 'x' }, { OPENROUTER_API_KEY: 'o', OPENROUTER_MODEL: 'a/b' }, fetchImpl);
  assert.deepEqual(bodies, ['openrouter/auto', 'a/b']);
});

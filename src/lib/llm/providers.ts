import { fetchJsonOnce, isRec } from '../http.ts';
import { fail, ok } from '../result.ts';
import { LLM_TIMEOUT_MS, type LlmProvider } from './types.ts';

const need = (v: string | undefined, name: string) => (v ? null : `${name} is not set`);

export const gemini: LlmProvider = {
  name: 'gemini',
  notConfigured: (env) => need(env.GEMINI_API_KEY ?? env.LLM_API_KEY, 'GEMINI_API_KEY'),
  async call(req, env, fetchImpl) {
    const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
    const key = (env.GEMINI_API_KEY ?? env.LLM_API_KEY) as string;
    const res = await fetchJsonOnce(fetchImpl, `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        ...(req.system ? { systemInstruction: { parts: [{ text: req.system }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
        ...(req.json ? { generationConfig: { responseMimeType: 'application/json' } } : {}),
      }),
    }, { name: 'Gemini' });
    if (!res.ok) return res;
    const parts = isRec(res.body) && Array.isArray(res.body.candidates) && isRec(res.body.candidates[0]) && isRec(res.body.candidates[0].content)
      ? res.body.candidates[0].content.parts : undefined;
    const text = Array.isArray(parts) ? parts.map((p) => (isRec(p) && typeof p.text === 'string' ? p.text : '')).join('') : '';
    return text ? ok({ text, model }) : fail('Gemini returned no text (blocked or empty response)', { upstream: 'Gemini', httpStatus: res.status });
  },
};

/** Shared by OpenRouter and Mistral: both speak the OpenAI chat-completions shape. */
async function chatCompletions(who: string, url: string, key: string, model: string, headers: Record<string, string>, req: Parameters<LlmProvider['call']>[0], fetchImpl: Parameters<LlmProvider['call']>[2]) {
  const res = await fetchJsonOnce(fetchImpl, url, {
    method: 'POST', signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}`, ...headers },
    body: JSON.stringify({
      model,
      messages: [...(req.system ? [{ role: 'system', content: req.system }] : []), { role: 'user', content: req.prompt }],
      ...(req.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  }, { name: who });
  if (!res.ok) return res;
  const choice = isRec(res.body) && Array.isArray(res.body.choices) ? res.body.choices[0] : undefined;
  const text = isRec(choice) && isRec(choice.message) && typeof choice.message.content === 'string' ? choice.message.content : '';
  return text ? ok({ text, model }) : fail(`${who} returned no text`, { upstream: who, httpStatus: res.status });
}

export const openrouter: LlmProvider = {
  name: 'openrouter',
  // No default model: OpenRouter hosts many and the right one is your choice.
  notConfigured: (env) => need(env.OPENROUTER_API_KEY, 'OPENROUTER_API_KEY') ?? need(env.OPENROUTER_MODEL, 'OPENROUTER_MODEL'),
  call: (req, env, f) => chatCompletions('OpenRouter', 'https://openrouter.ai/api/v1/chat/completions', env.OPENROUTER_API_KEY as string, env.OPENROUTER_MODEL as string, {}, req, f),
};

export const mistral: LlmProvider = {
  name: 'mistral',
  notConfigured: (env) => need(env.MISTRAL_API_KEY, 'MISTRAL_API_KEY'),
  call: (req, env, f) => chatCompletions('Mistral', 'https://api.mistral.ai/v1/chat/completions', env.MISTRAL_API_KEY as string, env.MISTRAL_MODEL || 'mistral-small-latest', {}, req, f),
};

export const ALL_PROVIDERS: Record<string, LlmProvider> = { gemini, openrouter, mistral };

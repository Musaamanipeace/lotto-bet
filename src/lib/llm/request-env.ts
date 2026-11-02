/**
 * Builds the LLM environment for one request from the server env plus the optional per-user headers
 * the Settings screen sends (x-ai-provider, x-ai-model, x-gemini-key, ...).
 *
 * The chosen model applies ONLY to the chosen provider. Failover providers keep their own defaults,
 * so falling over from Gemini to Mistral never sends Mistral a Gemini model name. The chosen provider
 * goes first and the rest of the order follows it, so one slow or overloaded provider is not the end.
 */
import { ALL_PROVIDERS } from './providers.ts';
import { DEFAULT_ORDER } from './index.ts';
import type { LlmEnv } from './types.ts';

const MODEL_VAR: Record<string, string> = { gemini: 'GEMINI_MODEL', openrouter: 'OPENROUTER_MODEL', mistral: 'MISTRAL_MODEL' };
const KEY_VAR: [string, string][] = [['x-gemini-key', 'GEMINI_API_KEY'], ['x-openrouter-key', 'OPENROUTER_API_KEY'], ['x-mistral-key', 'MISTRAL_API_KEY']];

export function buildLlmEnv(headers: { get(name: string): string | null }, base: LlmEnv = process.env): LlmEnv {
  const env: LlmEnv = { ...base };
  for (const [header, name] of KEY_VAR) {
    const v = headers.get(header)?.trim();
    if (v) env[name] = v;
  }

  const provider = headers.get('x-ai-provider')?.trim().toLowerCase();
  if (provider && ALL_PROVIDERS[provider]) {
    const configured = (base.LLM_PROVIDER_ORDER || DEFAULT_ORDER).split(',').map((s) => s.trim().toLowerCase()).filter((n) => n && ALL_PROVIDERS[n]);
    env.LLM_PROVIDER_ORDER = [...new Set([provider, ...configured, ...Object.keys(ALL_PROVIDERS)])].join(',');
    const model = headers.get('x-ai-model')?.trim();
    if (model && model.length <= 200) env[MODEL_VAR[provider]] = model;
  }
  return env;
}

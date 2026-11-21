/**
 * Builds the LLM environment for one request using server-side keys (plus optional non-secret
 * provider/model selection headers: x-ai-provider, x-ai-model).
 *
 * Security rule (Task 2): Client headers NEVER carry API keys. Keys live encrypted per user in
 * `user_api_keys` (via `buildUserLlmEnv`) or in server environment variables (`base`).
 */
import { ALL_PROVIDERS } from './providers.ts';
import { DEFAULT_ORDER } from './index.ts';
import type { LlmEnv } from './types.ts';

const MODEL_VAR: Record<string, string> = {
  gemini: 'GEMINI_MODEL',
  openrouter: 'OPENROUTER_MODEL',
  mistral: 'MISTRAL_MODEL',
};

export function buildLlmEnv(
  headers: { get(name: string): string | null },
  base: LlmEnv = {},
): LlmEnv {
  const env: LlmEnv = { ...base };

  const provider = headers.get('x-ai-provider')?.trim().toLowerCase();
  if (provider && ALL_PROVIDERS[provider]) {
    const configured = (base.LLM_PROVIDER_ORDER || DEFAULT_ORDER)
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((n) => n && ALL_PROVIDERS[n]);
    env.LLM_PROVIDER_ORDER = [
      ...new Set([provider, ...configured, ...Object.keys(ALL_PROVIDERS)]),
    ].join(',');
    const model = headers.get('x-ai-model')?.trim();
    if (model && model.length <= 200) env[MODEL_VAR[provider]] = model;
  }
  return env;
}

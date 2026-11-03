import type { FetchImpl } from '../http.ts';
import type { Result } from '../result.ts';

export type LlmRequest = { system?: string; prompt: string; json?: boolean };
export type LlmEnv = Record<string, string | undefined>;
export type ProviderName = 'gemini' | 'openrouter' | 'mistral';

export type LlmProvider = {
  name: ProviderName;
  /** null when usable, otherwise the reason it is not configured (e.g. a missing key). */
  notConfigured(env: LlmEnv): string | null;
  /** ONE HTTP attempt. No retries here; the chain in index.ts decides what to do next. */
  call(req: LlmRequest, env: LlmEnv, fetchImpl: FetchImpl): Promise<Result<{ text: string; model: string }>>;
};

export const LLM_TIMEOUT_MS = 25_000;

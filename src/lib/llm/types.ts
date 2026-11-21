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
  call(req: LlmRequest, env: LlmEnv, fetchImpl: FetchImpl, opts?: LlmCallOpts): Promise<Result<{ text: string; model: string }>>;
};

export type LlmCallOpts = { timeoutMs?: number };

/**
 * Time limits. The whole provider chain must finish before the host kills the request
 * (routes set maxDuration = 60) and before the browser gives up (Settings default is 35s),
 * so a failure is always reported with its real cause instead of becoming a bare timeout.
 * Override with LLM_TIMEOUT_MS (per provider) and LLM_TOTAL_BUDGET_MS (whole chain).
 */
export const LLM_TIMEOUT_MS = 15_000;
export const LLM_TOTAL_BUDGET_MS = 30_000;

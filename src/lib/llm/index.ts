import type { FetchImpl } from '../http.ts';
import { fail, ok, type ErrorDetails, type Result } from '../result.ts';
import { ALL_PROVIDERS } from './providers.ts';
import type { LlmEnv, LlmProvider, LlmRequest } from './types.ts';

export type LlmAttempt = { provider: string; error: string; httpStatus?: number };
export type LlmOk = { text: string; provider: string; model: string; attempts: LlmAttempt[] };

export const DEFAULT_ORDER = 'gemini,openrouter,mistral';

/** Network errors (no HTTP status), timeouts, 408, 429 and 5xx (e.g. Gemini "high demand" 503). */
export const isTransient = (httpStatus: number | undefined) => httpStatus === undefined || httpStatus === 408 || httpStatus === 429 || httpStatus >= 500;

export function parseOrder(raw: string | undefined): Result<{ order: LlmProvider[] }> {
  const names = (raw || DEFAULT_ORDER).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const unknown = names.filter((n) => !ALL_PROVIDERS[n]);
  if (unknown.length) return fail(`LLM_PROVIDER_ORDER has unknown provider(s): ${unknown.join(', ')}. Use: ${Object.keys(ALL_PROVIDERS).join(', ')}`);
  return ok({ order: [...new Set(names)].map((n) => ALL_PROVIDERS[n]) });
}

/**
 * Tries providers in LLM_PROVIDER_ORDER, ONE request per provider (no retries), and moves to the next
 * after a failure. LLM_FAILOVER=any (default) fails over on every error; LLM_FAILOVER=transient fails
 * over only on network errors, timeouts, 408, 429 and 5xx, and stops at a 4xx such as a bad request.
 * This is never silent: the result lists every provider tried and the real error of each failure, and
 * when all fail the error carries all of them. Unconfigured providers are listed as skipped.
 */
export async function callLlm(req: LlmRequest, env: LlmEnv = process.env, fetchImpl: FetchImpl = fetch) {
  const parsed = parseOrder(env.LLM_PROVIDER_ORDER);
  if (!parsed.ok) return parsed;
  const mode = (env.LLM_FAILOVER || 'any').toLowerCase();
  if (mode !== 'any' && mode !== 'transient') return fail(`LLM_FAILOVER must be "any" or "transient", got "${env.LLM_FAILOVER}"`);

  const attempts: LlmAttempt[] = [];
  for (const p of parsed.order) {
    const missing = p.notConfigured(env);
    if (missing) { attempts.push({ provider: p.name, error: `skipped: ${missing}` }); continue; }
    const r = await p.call(req, env, fetchImpl);
    if (r.ok) return ok<LlmOk>({ text: r.text, provider: p.name, model: r.model, attempts });
    const httpStatus = (r.details as ErrorDetails).httpStatus;
    attempts.push({ provider: p.name, error: r.error, httpStatus });
    if (mode === 'transient' && !isTransient(httpStatus)) {
      return fail(`${p.name} failed with a non-transient error, so no other provider was tried: ${r.error}`, { attempts, httpStatus });
    }
  }
  const tried = attempts.filter((a) => !a.error.startsWith('skipped:'));
  const summary = attempts.map((a) => `${a.provider}: ${a.error}${a.httpStatus ? ` (HTTP ${a.httpStatus})` : ''}`).join(' | ');
  return fail(tried.length === 0 ? `No LLM provider is configured. ${summary}` : `All LLM providers failed. ${summary}`, { attempts });
}

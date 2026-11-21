import type { FetchImpl } from '../http.ts';
import { fail, ok, type ErrorDetails, type Result } from '../result.ts';
import { ALL_PROVIDERS } from './providers.ts';
import { LLM_TIMEOUT_MS, LLM_TOTAL_BUDGET_MS, type LlmEnv, type LlmProvider, type LlmRequest } from './types.ts';

export type LlmAttempt = { provider: string; error: string; httpStatus?: number };
export type LlmOk = { text: string; provider: string; model: string; attempts: LlmAttempt[] };

export const DEFAULT_ORDER = 'gemini,openrouter,mistral';

const positive = (v: string | undefined) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : undefined; };

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
 *
 * The whole chain shares one time budget (LLM_TOTAL_BUDGET_MS) so it always finishes before the host or
 * browser gives up. Each provider gets at most LLM_TIMEOUT_MS and never more than the time left; a
 * provider that cannot get a meaningful slice is listed as skipped rather than started.
 */
export async function callLlm(req: LlmRequest, env: LlmEnv = process.env, fetchImpl: FetchImpl = fetch) {
  const parsed = parseOrder(env.LLM_PROVIDER_ORDER);
  if (!parsed.ok) return parsed;
  const mode = (env.LLM_FAILOVER || 'any').toLowerCase();
  if (mode !== 'any' && mode !== 'transient') return fail(`LLM_FAILOVER must be "any" or "transient", got "${env.LLM_FAILOVER}"`);

  const perProviderMs = positive(env.LLM_TIMEOUT_MS) ?? LLM_TIMEOUT_MS;
  const totalMs = positive(env.LLM_TOTAL_BUDGET_MS) ?? LLM_TOTAL_BUDGET_MS;
  const minSliceMs = Math.min(2_000, perProviderMs);
  const startedAt = Date.now();

  const attempts: LlmAttempt[] = [];
  for (const p of parsed.order) {
    const missing = p.notConfigured(env);
    if (missing) { attempts.push({ provider: p.name, error: `skipped: ${missing}` }); continue; }
    const remaining = totalMs - (Date.now() - startedAt);
    if (remaining < minSliceMs) { attempts.push({ provider: p.name, error: `skipped: time budget of ${Math.round(totalMs / 1000)}s used up by earlier providers` }); continue; }
    const r = await p.call(req, env, fetchImpl, { timeoutMs: Math.min(perProviderMs, remaining) });
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

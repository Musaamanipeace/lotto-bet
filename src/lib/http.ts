import { fail, type Failure } from './result.ts';

export type FetchImpl = typeof fetch;
export type Rec = Record<string, unknown>;

export const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * ONE attempt, no retries, no alternative payloads. Returns parsed JSON or a visible failure
 * carrying the real message and HTTP status.
 */
export async function fetchJsonOnce(
  fetchImpl: FetchImpl,
  url: string,
  init: RequestInit,
  who: { name: string; bookmaker?: string },
): Promise<{ ok: true; body: unknown; status: number } | Failure> {
  let res: Response;
  try {
    res = await fetchImpl(url, init);
  } catch (e) {
    return fail(`${who.name} request failed: ${e instanceof Error ? e.message : String(e)}`, {
      bookmaker: who.bookmaker, upstream: who.name, url, cause: String(e),
    });
  }
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    return fail(`${who.name} responded with HTTP ${res.status}`, {
      bookmaker: who.bookmaker, upstream: who.name, url, httpStatus: res.status, bodySnippet: text.slice(0, 300),
    });
  }
  try {
    return { ok: true, body: JSON.parse(text), status: res.status };
  } catch {
    return fail(`${who.name} returned a body that is not valid JSON (HTTP ${res.status})`, {
      bookmaker: who.bookmaker, upstream: who.name, url, httpStatus: res.status, bodySnippet: text.slice(0, 300),
    });
  }
}

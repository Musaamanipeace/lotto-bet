import type { BetPawaBody } from './betpawa.ts';

/**
 * OPTIONAL: create the betPawa booking code from a real (headless) browser session on betpawa.co.ke,
 * i.e. the same request the console script makes, but run by the server instead of the user.
 * Free: uses open-source Playwright + Chromium. No third-party browser service.
 *
 * Two modes:
 *  - BETPAWA_BROWSER_WORKER_URL set -> POST the body to your own worker (see /worker). Use this on Vercel.
 *  - otherwise, if BETPAWA_BROWSER=1 -> launch Chromium in-process (needs a long-running Node host + Chromium).
 */
export type BrowserCodeResult = { ok: true; code: string } | { ok: false; error: string; status?: number };

export const betPawaBrowserEnabled = () => process.env.BETPAWA_BROWSER === '1' || !!process.env.BETPAWA_BROWSER_WORKER_URL;

const BETPAWA_HOME = 'https://www.betpawa.co.ke/';
const MAX_CONCURRENT = 2; // each browser context costs roughly 100-200 MB

type PwBrowser = { newContext(o?: unknown): Promise<PwContext> };
type PwContext = { newPage(): Promise<PwPage>; close(): Promise<void> };
type PwPage = {
  goto(url: string, o?: unknown): Promise<unknown>;
  waitForLoadState(state: string, o?: unknown): Promise<unknown>;
  evaluate<A, R>(fn: (a: A) => Promise<R> | R, arg: A): Promise<R>;
};

let browserP: Promise<PwBrowser> | null = null;
let active = 0;

async function getBrowser(): Promise<PwBrowser> {
  if (!browserP) {
    // Variable specifier keeps bundlers/typecheck from requiring the package unless this mode is actually used.
    const name = 'playwright-core';
    browserP = import(/* webpackIgnore: true */ name).then((pw) =>
      pw.chromium.launch({
        headless: true,
        executablePath: process.env.CHROMIUM_PATH || undefined,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      }),
    );
    browserP.catch(() => { browserP = null; }); // allow a retry after a failed launch
  }
  return browserP;
}

async function viaWorker(url: string, body: BetPawaBody): Promise<BrowserCodeResult> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.BETPAWA_WORKER_SECRET ?? ''}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
    return (await res.json()) as BrowserCodeResult;
  } catch (e) {
    return { ok: false, error: `Browser worker unreachable: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function createBetPawaCodeInBrowser(body: BetPawaBody): Promise<BrowserCodeResult> {
  const worker = process.env.BETPAWA_BROWSER_WORKER_URL;
  if (worker) return viaWorker(worker, body);

  if (active >= MAX_CONCURRENT) return { ok: false, error: 'Browser is busy, try again shortly' };
  active++;
  let ctx: PwContext | null = null;
  try {
    ctx = await (await getBrowser()).newContext({ locale: 'en-KE' });
    const page = await ctx.newPage();
    await page.goto(BETPAWA_HOME, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Same request as the console snippet, executed inside the page so origin/cookies are the site's own.
    const out = await page.evaluate(async (b: BetPawaBody) => {
      const r = await fetch('/api/sportsbook/v3/booking-number', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-pawa-brand': 'betpawa-kenya',
          'x-pawa-language': 'en',
          devicetype: 'web',
        },
        body: JSON.stringify(b),
      });
      let d: unknown = null;
      try { d = await r.json(); } catch { /* non-JSON body */ }
      return { status: r.status, d };
    }, body);

    const code = (out.d as { code?: unknown } | null)?.code;
    if (code) return { ok: true, code: String(code) };
    return { ok: false, status: out.status, error: `betPawa refused the booking (HTTP ${out.status}): ${JSON.stringify(out.d).slice(0, 300)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    active--;
    await ctx?.close().catch(() => {});
  }
}

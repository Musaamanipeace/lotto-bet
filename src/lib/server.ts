import { fetchBetPawaGames } from './bookmakers/betpawa.ts';
import { fetchSportyAllPages } from './bookmakers/sportybet.ts';
import { checkCronAuth } from './cron-auth.ts';
import { runPipeline } from './pipeline.ts';
import { PgStore } from './pg-store.ts';
import { getMemoryStore } from './memory-store.ts';
import { runAiGeneration } from './run-ai.ts';
import type { Store } from './store.ts';
import type { RunKind } from './store.ts';

/**
 * Prefer Postgres when DATABASE_URL is set; otherwise use an in-process memory store
 * so local/dev works without a database.
 */
export function getStore(): Store {
  if (process.env.DATABASE_URL) return new PgStore();
  return getMemoryStore();
}

export async function handleRefresh(req: Request, kind: RunKind): Promise<Response> {
  const isDev = process.env.NODE_ENV !== 'production';
  const secret = process.env.CRON_SECRET;

  // In development, allow refresh without CRON_SECRET so the app is usable out of the box.
  // In production, still require the secret (fails closed if unset).
  if (!isDev) {
    const auth = checkCronAuth(req.headers.get('authorization'), secret);
    if (!auth.ok) return Response.json(auth, { status: auth.status ?? 401 });
  } else if (secret) {
    const header = req.headers.get('authorization');
    if (header) {
      const auth = checkCronAuth(header, secret);
      if (!auth.ok) return Response.json(auth, { status: auth.status ?? 401 });
    }
  }

  try {
    const store = getStore();
    const r = await runPipeline({
      store,
      kind,
      fetchers: {
        sportybet: (fetchRunId) => fetchSportyAllPages({ fetchRunId, timelineHours: 168 }),
        betpawa: (fetchRunId) => fetchBetPawaGames({ fetchRunId, take: 300 }),
      },
    });
    if (!r.ok) return Response.json(r, { status: 500 });

    // Deterministic AI generation after a successful fetch (design §3).
    // Failure here is reported but does not fail the fetch itself.
    let ai: { ok: true; pickCount: number; verifiedCount: number; bestFitCount: number } | { ok: false; error: string } | null = null;
    try {
      const aiR = await runAiGeneration(store);
      if (aiR.ok) {
        ai = {
          ok: true,
          pickCount: aiR.picks.length,
          verifiedCount: aiR.verifiedCount,
          bestFitCount: aiR.bestFitCount,
        };
      } else {
        ai = { ok: false, error: aiR.error };
      }
    } catch (e) {
      ai = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }

    const anyFailed = !r.results.sportybet.ok || !r.results.betpawa.ok;
    return Response.json({ ...r, ai }, { status: anyFailed ? 502 : 200 });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e), details: {} },
      { status: 500 },
    );
  }
}

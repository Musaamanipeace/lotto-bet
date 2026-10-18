import { fetchBetPawaGames } from './bookmakers/betpawa.ts';
import { fetchSportyAllPages } from './bookmakers/sportybet.ts';
import { checkCronAuth } from './cron-auth.ts';
import { runPipeline } from './pipeline.ts';
import { PgStore } from './pg-store.ts';
import type { RunKind } from './store.ts';

export async function handleRefresh(req: Request, kind: RunKind): Promise<Response> {
  const auth = checkCronAuth(req.headers.get('authorization'), process.env.CRON_SECRET);
  if (!auth.ok) return Response.json(auth, { status: auth.status ?? 401 });
  try {
    const r = await runPipeline({
      store: new PgStore(), kind,
      fetchers: {
        sportybet: (fetchRunId) => fetchSportyAllPages({ fetchRunId, timelineHours: 168 }),
        betpawa: (fetchRunId) => fetchBetPawaGames({ fetchRunId, take: 300 }),
      },
    });
    if (!r.ok) return Response.json(r, { status: 500 });
    const anyFailed = !r.results.sportybet.ok || !r.results.betpawa.ok;
    return Response.json(r, { status: anyFailed ? 502 : 200 });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e), details: {} }, { status: 500 });
  }
}

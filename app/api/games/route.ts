import { candidateRows, deriveFilterOptions, parseRules, type Filter } from '@/lib/filters.ts';
import { getStore } from '@/lib/server.ts';
import { readGames } from '@/lib/read-games.ts';
import { runPipeline } from '@/lib/pipeline.ts';
import { fetchSportyAllPages } from '@/lib/bookmakers/sportybet.ts';
import { fetchBetPawaGames } from '@/lib/bookmakers/betpawa.ts';
import type { Bookmaker, MarketKind } from '@/lib/types.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const KICKOFF_BUFFER_MS = 2 * 60 * 1000;

const num = (v: string | null) => (v === null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));

/**
 * If there is no finished run yet (fresh install / memory store), run the pipeline once
 * so the UI can show SportyBet (and betPawa) games without a manual refresh.
 */
async function ensureData() {
  const store = getStore();
  const existing = await store.latestRun();
  if (existing && existing.results) return;
  await runPipeline({
    store,
    kind: 'manual',
    fetchers: {
      sportybet: (fetchRunId) => fetchSportyAllPages({ fetchRunId, timelineHours: 168 }),
      betpawa: (fetchRunId) => fetchBetPawaGames({ fetchRunId, take: 300 }),
    },
  });
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const b = q.get('bookmaker');
  if (b !== null && b !== 'sportybet' && b !== 'betpawa') {
    return Response.json({ ok: false, error: `Unknown bookmaker "${b}"`, details: {} }, { status: 400 });
  }
  const rulesParam = q.get('rules');
  const rules = rulesParam === null ? undefined : parseRules(rulesParam);
  if (rules === null) {
    return Response.json({ ok: false, error: 'The "rules" parameter is not valid market-filter JSON.', details: {} }, { status: 400 });
  }
  try {
    // Auto-bootstrap on first request so SportyBet games appear without a prior cron/refresh.
    await ensureData();
    const r = await readGames(getStore(), (b as Bookmaker | null) ?? undefined);
    if (!r.ok) return Response.json(r, { status: r.details.httpStatus ?? 502 });
    const kind = q.get('market') as MarketKind | null;
    // Never offer games that have started or are about to: the stored snapshot can be hours old, and the original
    // app only listed games kicking off at least 2 minutes from now. SportyBet refuses to share a slip with a started game.
    const earliest = Date.now() + KICKOFF_BUFFER_MS;
    const filter: Filter = {
      leagues: q.get('leagues')?.split(',').filter(Boolean),
      dateFrom: Math.max(num(q.get('dateFrom')) ?? 0, earliest), dateTo: num(q.get('dateTo')),
      oddsMin: num(q.get('oddsMin')), oddsMax: num(q.get('oddsMax')),
      market: kind ? { kind, line: num(q.get('line')) } : undefined,
      rules,
    };
    const rows = candidateRows(r.games, filter);
    return Response.json({
      ok: true,
      runId: r.runId,
      dataAsOf: new Date(r.dataAsOf).toISOString(),
      count: rows.length,
      options: deriveFilterOptions(r.games),
      errors: r.errors,
      rows,
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e), details: {} },
      { status: 500 },
    );
  }
}

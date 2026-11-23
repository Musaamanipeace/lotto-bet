import { candidateRows, deriveFilterOptions, parseRules, type Filter } from '@/lib/filters.ts';
import { getStore } from '@/lib/server.ts';
import { readGames } from '@/lib/read-games.ts';
import { runPipeline } from '@/lib/pipeline.ts';
import { fetchSportyAllPages } from '@/lib/bookmakers/sportybet.ts';
import { SPORTS, type MarketKind, type Sport } from '@/lib/types.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const KICKOFF_BUFFER_MS = 2 * 60 * 1000;

const num = (v: string | null) => (v === null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));

/**
 * If there is no finished run yet (fresh install / memory store), run the pipeline once
 * so the UI can show football, tennis and basketball games without a manual refresh.
 */
async function ensureData() {
  const store = getStore();
  const existing = await store.latestRun();
  if (existing && existing.results) return;
  await runPipeline({
    store,
    kind: 'manual',
    fetchers: Object.fromEntries(
      SPORTS.map((sport) => [sport, (fetchRunId: string) => fetchSportyAllPages({ fetchRunId, sport, timelineHours: 168 })]),
    ) as Record<Sport, (fetchRunId: string) => ReturnType<typeof fetchSportyAllPages>>,
  });
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const sportParam = q.get('sport');
  if (sportParam !== null && !SPORTS.includes(sportParam as Sport)) {
    return Response.json({ ok: false, error: `Unknown sport "${sportParam}"`, details: {} }, { status: 400 });
  }
  const sport = (sportParam as Sport | null) ?? undefined;
  const gameId = q.get('gameId');
  const allMarkets = q.get('allMarkets') === '1' || q.get('allMarkets') === 'true';
  const rulesParam = q.get('rules');
  const rules = allMarkets ? undefined : (rulesParam === null ? undefined : parseRules(rulesParam));
  if (rules === null) {
    return Response.json({ ok: false, error: 'The "rules" parameter is not valid market-filter JSON.', details: {} }, { status: 400 });
  }
  try {
    // Auto-bootstrap on first request so SportyBet games appear without a prior cron/refresh.
    await ensureData();
    const r = await readGames(getStore(), sport);
    if (!r.ok) return Response.json(r, { status: r.details.httpStatus ?? 502 });
    const kind = q.get('market') as MarketKind | null;
    // Never offer games that have started or are about to: the stored snapshot can be hours old, and the original
    // app only listed games kicking off at least 2 minutes from now. SportyBet refuses to share a slip with a started game.
    const earliest = Date.now() + KICKOFF_BUFFER_MS;
    const filter: Filter = {
      gameId: gameId || undefined,
      leagues: allMarkets ? undefined : q.get('leagues')?.split(',').filter(Boolean),
      dateFrom: Math.max(num(q.get('dateFrom')) ?? 0, earliest), dateTo: num(q.get('dateTo')),
      oddsMin: allMarkets ? undefined : num(q.get('oddsMin')), oddsMax: allMarkets ? undefined : num(q.get('oddsMax')),
      market: kind ? { kind, line: num(q.get('line')) } : undefined,
      rules,
    };
    const rows = candidateRows(r.games, filter);
    // What the user would see with no filters at all (same kickoff buffer), so the UI can say what the filters hide.
    const all = candidateRows(r.games, { dateFrom: earliest });
    const unfiltered = { rows: all.length, games: new Set(all.map((x) => x.gameId)).size };
    return Response.json({
      ok: true,
      runId: r.runId,
      dataAsOf: new Date(r.dataAsOf).toISOString(),
      count: rows.length,
      unfiltered,
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

import { loadAiSnapshot } from '@/lib/run-ai.ts';
import { getStore } from '@/lib/server.ts';
import type { PickMarketKey } from '@/lib/criteria.ts';
import { filterPicks, parseLeagues } from '@/lib/pick-filter.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/ai/picks?market=home_win&bookmaker=sportybet&leagues=A,B&limit=50
 * Returns ranked AI picks, optionally filtered by market / bookmaker.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const market = url.searchParams.get('market') as PickMarketKey | null;
  const bookmaker = url.searchParams.get('bookmaker');
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50)));

  const r = await loadAiSnapshot();
  if (!r.ok) return Response.json(r, { status: 400 });

  const picks = filterPicks(r.picks, { market, bookmaker, leagues: parseLeagues(url.searchParams.get('leagues')) }).slice(0, limit);

  return Response.json({
    ok: true,
    generatedAt: r.generatedAt,
    statsNote: r.statsNote,
    verifiedCount: r.verifiedCount,
    bestFitCount: r.bestFitCount,
    coverage: r.coverage,
    total: picks.length,
    picks,
  });
}

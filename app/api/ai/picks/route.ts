import { loadAiSnapshot } from '@/lib/run-ai.ts';
import type { PickMarketKey } from '@/lib/criteria.ts';
import { filterPicks, parseLeagues } from '@/lib/pick-filter.ts';
import { requireAiAccess } from '@/lib/ai-auth.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/ai/picks?market=home_win&bookmaker=sportybet&leagues=A,B&limit=50
 * Returns ranked AI picks, optionally filtered by market / bookmaker / leagues / timeframe.
 * Requires signed-in session (401) and user-stored API key (400 keys_required).
 */
export async function GET(req: Request) {
  const access = await requireAiAccess(req, { requireAiKey: true });
  if (!access.ok) return access.response;

  const url = new URL(req.url);
  const market = url.searchParams.get('market') as PickMarketKey | null;
  const bookmaker = url.searchParams.get('bookmaker');

  const rawWithin = url.searchParams.get('withinHours');
  const withinHours =
    rawWithin !== null && rawWithin !== ''
      ? Number(rawWithin)
      : null;

  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('limit') || 50)),
  );

  const r = await loadAiSnapshot();
  if (!r.ok) {
    return Response.json(r, { status: 400 });
  }

  const picks = filterPicks(r.picks, {
    market,
    bookmaker,
    leagues: parseLeagues(url.searchParams.get('leagues')),
    withinHours,
  }).slice(0, limit);

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

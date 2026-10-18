import { ensureAiSnapshot } from '@/lib/run-ai.ts';
import { getStore } from '@/lib/server.ts';
import type { PickMarketKey } from '@/lib/criteria.ts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/picks?market=home_win&bookmaker=sportybet&limit=50
 * Returns ranked AI picks, optionally filtered by market / bookmaker.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const market = url.searchParams.get('market') as PickMarketKey | null;
  const bookmaker = url.searchParams.get('bookmaker');
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50)));

  const r = await ensureAiSnapshot(getStore());
  if (!r.ok) return Response.json(r, { status: 400 });

  let picks = r.picks;
  if (market) picks = picks.filter((p) => p.marketKey === market);
  if (bookmaker) picks = picks.filter((p) => p.bookmaker === bookmaker);
  picks = picks.slice(0, limit);

  return Response.json({
    ok: true,
    generatedAt: r.generatedAt,
    statsNote: r.statsNote,
    verifiedCount: r.verifiedCount,
    bestFitCount: r.bestFitCount,
    total: picks.length,
    picks,
  });
}

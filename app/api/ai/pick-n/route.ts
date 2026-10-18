import { ensureAiSnapshot } from '@/lib/run-ai.ts';
import { pickNGames } from '@/lib/ai-engine.ts';
import { getStore } from '@/lib/server.ts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/pick-n?n=20&bookmaker=sportybet
 * Returns lower / average / higher-risk slips of N legs.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const n = Math.min(50, Math.max(1, Number(url.searchParams.get('n') || 10)));
  const bookmaker = url.searchParams.get('bookmaker');

  const r = await ensureAiSnapshot(getStore());
  if (!r.ok) return Response.json(r, { status: 400 });

  let ranked = r.picks;
  if (bookmaker) ranked = ranked.filter((p) => p.bookmaker === bookmaker);

  const variants = pickNGames(ranked, n);
  const serialize = (s: ReturnType<typeof pickNGames>['lower']) =>
    s
      ? {
          id: s.id,
          legCount: s.picks.length,
          totalOdds: s.totalOdds,
          combinedImpliedProbability: s.combinedImpliedProbability,
          riskLabel: s.riskLabel,
          coreCount: s.coreCount,
          boosterCount: s.boosterCount,
          picks: s.picks,
        }
      : null;

  return Response.json({
    ok: true,
    requested: n,
    qualified: ranked.length,
    message: ranked.length < n ? `Only ${ranked.length} picks qualified.` : null,
    lower: serialize(variants.lower),
    average: serialize(variants.average),
    higher: serialize(variants.higher),
  });
}

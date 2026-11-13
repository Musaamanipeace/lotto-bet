import { loadAiSnapshot } from '@/lib/run-ai.ts';
import { pickNGames } from '@/lib/ai-engine.ts';
import { filterPicks, parseLeagues } from '@/lib/pick-filter.ts';
import { requireAiAccess } from '@/lib/ai-auth.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/ai/pick-n?n=20&bookmaker=sportybet
 * Returns lower / average / higher-risk slips of N legs.
 * Requires signed-in session (401) and user-stored API key (400 keys_required).
 */
export async function GET(req: Request) {
  const access = await requireAiAccess(req, { requireAiKey: true });
  if (!access.ok) return access.response;

  const url = new URL(req.url);
  const n = Math.min(50, Math.max(1, Number(url.searchParams.get('n') || 10)));
  const bookmaker = url.searchParams.get('bookmaker');
  const rawWithin = url.searchParams.get('withinHours');
  const withinHours = rawWithin !== null && rawWithin !== '' ? Number(rawWithin) : null;

  const r = await loadAiSnapshot();
  if (!r.ok) return Response.json(r, { status: 400 });

  const ranked = filterPicks(r.picks, {
    bookmaker,
    leagues: parseLeagues(url.searchParams.get('leagues')),
    withinHours,
  });

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

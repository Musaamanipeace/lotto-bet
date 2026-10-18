import { ensureAiSnapshot } from '@/lib/run-ai.ts';
import { pickTargetOdds } from '@/lib/ai-engine.ts';
import { getStore } from '@/lib/server.ts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/target-odds?target=20&bookmaker=sportybet
 * Closest Safe-tier slip to the requested total odds.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = Number(url.searchParams.get('target') || 20);
  const bookmaker = url.searchParams.get('bookmaker');

  if (!Number.isFinite(target) || target <= 1) {
    return Response.json({ ok: false, error: 'target must be a number greater than 1' }, { status: 400 });
  }

  const r = await ensureAiSnapshot(getStore());
  if (!r.ok) return Response.json(r, { status: 400 });

  let ranked = r.picks;
  if (bookmaker) ranked = ranked.filter((p) => p.bookmaker === bookmaker);

  const result = pickTargetOdds(ranked, target);
  return Response.json({
    ok: true,
    target,
    achieved: result.achieved,
    gap: result.gap,
    message: result.message ?? null,
    slip: result.slip
      ? {
          id: result.slip.id,
          legCount: result.slip.picks.length,
          totalOdds: result.slip.totalOdds,
          combinedImpliedProbability: result.slip.combinedImpliedProbability,
          riskLabel: result.slip.riskLabel,
          picks: result.slip.picks,
        }
      : null,
  });
}

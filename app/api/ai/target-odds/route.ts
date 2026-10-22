import { ensureAiSnapshot } from '@/lib/run-ai.ts';
import { pickTargetOddsTiers, type AccumulatorSlip, type TargetResult } from '@/lib/ai-picks.ts';
import { getStore } from '@/lib/server.ts';

export const dynamic = 'force-dynamic';

const serializeSlip = (s: AccumulatorSlip | null) =>
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

const serialize = (r: TargetResult) => ({
  slip: serializeSlip(r.slip),
  achieved: r.achieved,
  gap: r.gap,
  message: r.message ?? null,
});

/**
 * GET /api/ai/target-odds?target=20&bookmaker=sportybet
 * Closest slip to the requested total odds, for each risk tier:
 * lower (Safe only), average (Safe + Balanced), higher (all tiers).
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

  const t = pickTargetOddsTiers(ranked, target);
  return Response.json({
    ok: true,
    target,
    lower: serialize(t.lower),
    average: serialize(t.average),
    higher: serialize(t.higher),
  });
}

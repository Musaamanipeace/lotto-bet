import { loadAiSnapshot } from '@/lib/run-ai.ts';
import { pickTargetOddsTiers, toTargetRow, type AccumulatorSlip, type TargetResult } from '@/lib/ai-picks.ts';
import { filterPicks, parseLeagues } from '@/lib/pick-filter.ts';
import { requireAiAccess } from '@/lib/ai-auth.ts';
import { selectPerLeg, selectPerLegWindow, targetSlip, type TargetSlipResult } from '@/lib/targeting.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

type TargetedResult = TargetSlipResult & { message?: string };

const serializeTargeted = (r: TargetedResult) => ({
  slip: r.picks.length > 0 ? r.picks.map((p) => p.pick ?? p) : null,
  legCount: r.picks.length,
  achieved: r.achieved,
  legs: r.legs,
  reached: r.reached,
  gap: r.gap,
  message: r.message ?? null,
});

/**
 * GET /api/ai/target-odds
 * - `target`: total target odds (default 20)
 * - `legOdds`: per-leg target (e.g. 2.0 or 1.5)
 * - `min` + `max`: per-leg range window
 * - `legs`: chosen leg count for total targets
 * Requires signed-in session (401) and user-stored API key (400 keys_required).
 */
export async function GET(req: Request) {
  const access = await requireAiAccess(req, { requireAiKey: true });
  if (!access.ok) return access.response;

  const url = new URL(req.url);
  const target = Number(url.searchParams.get('target') || 0);
  const legOdds = Number(url.searchParams.get('legOdds') || 0);
  const legsRaw = url.searchParams.get('legs');
  const legs = legsRaw !== null && legsRaw !== '' ? Number(legsRaw) : undefined;
  const minRaw = url.searchParams.get('min');
  const maxRaw = url.searchParams.get('max');
  const min = minRaw !== null && minRaw !== '' ? Number(minRaw) : undefined;
  const max = maxRaw !== null && maxRaw !== '' ? Number(maxRaw) : undefined;
  const bookmaker = url.searchParams.get('bookmaker');
  const rawWithin = url.searchParams.get('withinHours');
  const withinHours = rawWithin !== null && rawWithin !== '' ? Number(rawWithin) : null;

  const legacyTarget = Number.isFinite(target) && target > 1 ? target : 20;
  const validLegOdds = Number.isFinite(legOdds) && legOdds > 1;
  const validRange =
    min !== undefined && max !== undefined && Number.isFinite(min) && Number.isFinite(max) && min < max;
  const hasLegs = legs !== undefined && Number.isFinite(legs) && legs >= 1;
  if (!validLegOdds && !validRange && !(Number.isFinite(target) && target > 1)) {
    return Response.json({ ok: false, error: 'target, legOdds or min+max is required' }, { status: 400 });
  }

  const r = await loadAiSnapshot();
  if (!r.ok) return Response.json(r, { status: 400 });

  const ranked = filterPicks(r.picks, {
    bookmaker,
    leagues: parseLeagues(url.searchParams.get('leagues')),
    withinHours,
  });
  const rows = ranked.map(toTargetRow);

  if (validLegOdds) {
    const res = selectPerLeg(rows, legOdds);
    const picks = res.pick ? [res.pick] : [];
    return Response.json({
      ok: true,
      kind: 'per_leg',
      legOdds,
      ...serializeTargeted({
        picks,
        achieved: picks.length > 0 ? picks[0].odds : 1,
        legs: picks.length,
        gap: 0,
        reached: picks.length > 0,
        message: res.message,
      }),
    });
  }

  if (validRange) {
    const res = selectPerLegWindow(rows, min, max);
    const picks = res.pick ? [res.pick] : [];
    return Response.json({
      ok: true,
      kind: 'per_leg',
      min,
      max,
      ...serializeTargeted({
        picks,
        achieved: picks.length > 0 ? picks[0].odds : 1,
        legs: picks.length,
        gap: 0,
        reached: picks.length > 0,
        message: res.message,
      }),
    });
  }

  // Total target.
  const t = targetSlip(rows, legacyTarget, { legs: hasLegs ? legs : undefined });
  return Response.json({
    ok: true,
    kind: 'total',
    target: legacyTarget,
    ...serializeTargeted(t),
  });
}

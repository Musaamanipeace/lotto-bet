import { loadAiSnapshot } from '@/lib/run-ai.ts';
import { getStore } from '@/lib/server.ts';
import { filterPicks } from '@/lib/pick-filter.ts';
import { swapInSlip, type SwapScope } from '@/lib/alternatives.ts';
import type { TargetTier } from '@/lib/ai-picks.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * POST /api/ai/swap
 * { pickIds, replaceIds?, weakest?, lockedGameIds?, excludeIds?, leagues?, scope?, strict?, tier?, band?, seed? }
 * Swaps some legs of one slip for equal-or-better picks (any market by default). Send every pick you were
 * already offered in `excludeIds` and repeated swaps never hand the same pick back.
 */
export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = (await req.json()) as Record<string, unknown>; } catch { return Response.json({ ok: false, error: 'Body must be JSON' }, { status: 400 }); }

  const pickIds = strs(b.pickIds);
  if (pickIds.length === 0) return Response.json({ ok: false, error: 'pickIds is required' }, { status: 400 });

  const snap = await loadAiSnapshot();
  if (!snap.ok) return Response.json(snap, { status: 400 });
  const byId = new Map(snap.picks.map((p) => [p.id, p]));
  const slip = pickIds.map((id) => byId.get(id));
  if (slip.some((p) => !p)) {
    return Response.json({ ok: false, error: 'Some picks are no longer in the latest AI snapshot (it was regenerated). Reload the picks and try again.' }, { status: 409 });
  }
  const slipPicks = slip as NonNullable<(typeof slip)[number]>[];
  const bookmaker = slipPicks[0].bookmaker;
  const tier = (typeof b.tier === 'string' ? b.tier : 'higher') as TargetTier;
  const allowed = tier === 'lower' ? ['safe'] : tier === 'average' ? ['safe', 'balanced'] : ['safe', 'balanced', 'value'];
  const pool = filterPicks(snap.picks, { bookmaker, leagues: strs(b.leagues) }).filter((p) => allowed.includes(p.tier));

  const band = b.band && typeof b.band === 'object' ? (b.band as { min?: unknown; max?: unknown }) : null;
  const r = swapInSlip(slipPicks, pool, {
    replaceIds: strs(b.replaceIds),
    weakest: typeof b.weakest === 'number' ? Math.max(1, Math.min(50, Math.floor(b.weakest))) : undefined,
    lockedGameIds: strs(b.lockedGameIds),
    excludeIds: strs(b.excludeIds),
    scope: b.scope === 'same_market' ? ('same_market' as SwapScope) : 'any',
    strictlyBetter: b.strict === true,
    band: band && typeof band.min === 'number' && typeof band.max === 'number' ? { min: band.min, max: band.max } : undefined,
    seed: typeof b.seed === 'number' ? b.seed : Date.now() % 1_000_000,
  });
  if (!r.ok) return Response.json(r, { status: 422 });

  return Response.json({
    ok: true,
    picks: r.picks,
    totalOdds: r.picks.reduce((a, p) => a * p.odds, 1),
    swaps: r.swaps.map((s) => ({ out: s.out, in: s.in })),
  });
}

import { loadAiSnapshot } from '@/lib/run-ai.ts';
import { getStore } from '@/lib/server.ts';
import { filterPicks, parseCsv, parseLeagues } from '@/lib/pick-filter.ts';
import { generateAlternatives, type SwapScope } from '@/lib/alternatives.ts';
import type { TargetTier } from '@/lib/ai-picks.ts';
import type { AiPick } from '@/lib/ai-picks.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const num = (v: string | null) => (v === null || v.trim() === '' ? null : Number(v));
const int = (v: string | null, d: number, lo: number, hi: number) => {
  const n = num(v);
  return n !== null && Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.floor(n))) : d;
};

/**
 * GET /api/ai/alternatives?target=500&tol=0.1  (or min=100&max=1000)
 *   &count=50&minDiff=2&tier=higher&scope=any|same_market&strict=0|1&bookmaker=sportybet
 *   &leagues=A,B&locked=gameId1,gameId2&seed=1
 * Many different slips inside the odds band. "Load more" = the same call with a larger count
 * (deterministic: the first slips stay the same). Picks are sent once in `pickIndex`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams;

  let min = num(q.get('min'));
  let max = num(q.get('max'));
  const target = num(q.get('target'));
  if (target !== null) {
    const tol = num(q.get('tol')) ?? 0.1;
    if (!Number.isFinite(target) || target <= 1) return Response.json({ ok: false, error: 'target must be a number greater than 1' }, { status: 400 });
    if (!Number.isFinite(tol) || tol <= 0 || tol >= 0.9) return Response.json({ ok: false, error: 'tol must be between 0 and 0.9' }, { status: 400 });
    min = target * (1 - tol);
    max = target * (1 + tol);
  }
  if (min === null || max === null || !Number.isFinite(min) || !Number.isFinite(max) || min <= 1 || max <= min) {
    return Response.json({ ok: false, error: 'Give target (with optional tol) or min and max, with 1 < min < max.' }, { status: 400 });
  }

  const tier = (q.get('tier') || 'higher') as TargetTier;
  if (!['lower', 'average', 'higher'].includes(tier)) return Response.json({ ok: false, error: 'tier must be lower, average or higher' }, { status: 400 });
  const scope: SwapScope = q.get('scope') === 'same_market' ? 'same_market' : 'any';

  const snap = await loadAiSnapshot();
  if (!snap.ok) return Response.json(snap, { status: 400 });

  const leagues = parseLeagues(q.get('leagues'));
  let bookmaker = q.get('bookmaker');
  if (!bookmaker) {
    // A slip never mixes bookmakers, so use the one with the larger pool.
    const counts = new Map<string, number>();
    for (const p of filterPicks(snap.picks, { leagues })) counts.set(p.bookmaker, (counts.get(p.bookmaker) ?? 0) + 1);
    bookmaker = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }
  const ranked = filterPicks(snap.picks, { bookmaker, leagues });

  const result = generateAlternatives(ranked, {
    band: { min, max },
    tier,
    scope,
    strictlyBetter: q.get('strict') === '1',
    minDiffLegs: int(q.get('minDiff'), 2, 1, 20),
    maxSlips: int(q.get('count'), 50, 1, 500),
    lockedGameIds: parseCsv(q.get('locked')),
    seed: int(q.get('seed'), 1, 0, 1_000_000),
  });

  const pickIndex: Record<string, AiPick> = {};
  const slips = result.slips.map((s) => {
    for (const p of s.picks) pickIndex[p.id] = p;
    return {
      id: s.id, legCount: s.picks.length, totalOdds: s.totalOdds, combinedImpliedProbability: s.combinedImpliedProbability,
      riskLabel: s.riskLabel, coreCount: s.coreCount, boosterCount: s.boosterCount, avgFit: s.avgFit,
      diffFromFirst: s.diffFromFirst, pickIds: s.picks.map((p) => p.id),
    };
  });

  return Response.json({
    ok: true, band: result.band, bookmaker, poolSize: ranked.length, count: slips.length,
    exhausted: result.exhausted, message: result.message, slips, pickIndex,
  });
}

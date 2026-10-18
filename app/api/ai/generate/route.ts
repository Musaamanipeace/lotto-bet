import { runAiGeneration } from '@/lib/run-ai.ts';
import { getStore } from '@/lib/server.ts';
import { checkCronAuth } from '@/lib/cron-auth.ts';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/generate
 * Regenerates AI picks from the latest finished fetch run.
 * In production requires CRON_SECRET; in development open.
 */
export async function POST(req: Request) {
  const isProd = process.env.NODE_ENV === 'production' && !!process.env.DATABASE_URL;
  if (isProd) {
    const auth = checkCronAuth(req.headers.get('authorization'), process.env.CRON_SECRET);
    if (!auth.ok) return Response.json(auth, { status: auth.status ?? 401 });
  }

  const r = await runAiGeneration(getStore());
  if (!r.ok) return Response.json(r, { status: 400 });
  return Response.json({
    ok: true,
    generatedAt: r.generatedAt,
    candidateCount: r.candidateCount,
    verifiedCount: r.verifiedCount,
    bestFitCount: r.bestFitCount,
    pickCount: r.picks.length,
    slips25Count: r.slips25.length,
    statsNote: r.statsNote,
  });
}

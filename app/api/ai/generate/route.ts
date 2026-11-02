import { runAiGeneration } from '@/lib/run-ai.ts';
import { getStore } from '@/lib/server.ts';
import { getAiSnapshot } from '@/lib/ai-store.ts';
import { checkCronAuth } from '@/lib/cron-auth.ts';
import { currentUser } from '@/lib/session.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** A second press inside this window returns the picks just generated instead of regenerating. */
const COOLDOWN_MS = 20_000;

/**
 * POST /api/ai/generate
 * Regenerates AI picks from the latest finished fetch run and saves them.
 * Allowed for: a request carrying the CRON_SECRET bearer, or a signed-in user (the Regenerate AI
 * button). In development with no database it is open.
 */
export async function POST(req: Request) {
  const isProd = process.env.NODE_ENV === 'production' && !!process.env.DATABASE_URL;
  if (isProd) {
    const bearer = checkCronAuth(req.headers.get('authorization'), process.env.CRON_SECRET);
    if (!bearer.ok) {
      const user = await currentUser(req).catch(() => null);
      if (!user) return Response.json({ ok: false, error: 'Sign in to regenerate AI picks.', details: { code: 'auth_required' } }, { status: 401 });
    }
  }

  const prev = await getAiSnapshot().catch(() => null);
  if (prev && Date.now() - prev.generatedAt < COOLDOWN_MS) {
    return Response.json({ ok: true, cached: true, generatedAt: prev.generatedAt, candidateCount: prev.candidateCount, verifiedCount: prev.verifiedCount, bestFitCount: prev.bestFitCount, pickCount: prev.picks.length, slips25Count: prev.slips25.length, statsNote: prev.statsNote });
  }

  const r = await runAiGeneration(getStore());
  if (!r.ok) return Response.json(r, { status: r.details.code === 'storage_not_configured' ? 503 : 400 });
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

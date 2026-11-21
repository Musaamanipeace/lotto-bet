import { loadAiSnapshot } from '@/lib/run-ai.ts';
import { requireAiAccess } from '@/lib/ai-auth.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET /api/ai/slips – stored 25+ game accumulators (requires signed-in session). */
export async function GET(req: Request) {
  const access = await requireAiAccess(req, { requireAiKey: false });
  if (!access.ok) return access.response;

  const r = await loadAiSnapshot();
  if (!r.ok) return Response.json(r, { status: 400 });
  return Response.json({
    ok: true,
    generatedAt: r.generatedAt,
    statsNote: r.statsNote,
    slips: r.slips25,
  });
}

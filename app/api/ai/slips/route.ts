import { loadAiSnapshot } from '@/lib/run-ai.ts';
import { getStore } from '@/lib/server.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET /api/ai/slips – stored 25+ game accumulators. */
export async function GET() {
  const r = await loadAiSnapshot();
  if (!r.ok) return Response.json(r, { status: 400 });
  return Response.json({
    ok: true,
    generatedAt: r.generatedAt,
    statsNote: r.statsNote,
    slips: r.slips25,
  });
}

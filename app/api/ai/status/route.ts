import { getAiSnapshot } from '@/lib/ai-store.ts';
import { VERIFICATION, CRITERIA } from '@/lib/criteria.ts';
import { configuredProviders } from '@/lib/stats.ts';
import { getStore } from '@/lib/server.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  const snap = getAiSnapshot();
  const providers = configuredProviders().map((p) => p.name);
  const run = await getStore().latestRun();

  const marketsConfigured = Object.entries(CRITERIA).map(([market, tiers]) => ({
    market,
    tiers: Object.fromEntries(
      Object.entries(tiers).map(([t, tc]) => [t, { status: tc.status, criteriaCount: tc.criteria.length }]),
    ),
  }));

  return Response.json({
    ok: true,
    verificationMode: VERIFICATION.mode,
    minVerifiableFraction: VERIFICATION.minVerifiableFraction,
    statsProviders: providers,
    latestFetchRun: run
      ? { id: run.id, kind: run.kind, finishedAt: run.finishedAt, results: run.results }
      : null,
    aiSnapshot: snap
      ? {
          generatedAt: snap.generatedAt,
          runId: snap.runId,
          candidateCount: snap.candidateCount,
          verifiedCount: snap.verifiedCount,
          bestFitCount: snap.bestFitCount,
          pickCount: snap.picks.length,
          slips25Count: snap.slips25.length,
          statsNote: snap.statsNote,
        }
      : null,
    marketsConfigured,
    messages: buildStatusMessages(providers, snap),
  });
}

function buildStatusMessages(providers: string[], snap: ReturnType<typeof getAiSnapshot>): string[] {
  const msgs: string[] = [];
  if (providers.length === 1 && providers[0] === 'null') {
    msgs.push('No stats provider configured, so tier criteria can’t be verified. Picks will be labeled Best fit.');
  }
  if (!snap) {
    msgs.push('No AI picks generated yet. Call POST /api/ai/generate after a games refresh.');
  } else if (snap.picks.length === 0) {
    msgs.push('No verified picks today. Check which criteria were unavailable.');
  }
  return msgs;
}

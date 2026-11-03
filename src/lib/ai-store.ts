/**
 * The latest AI picks / slips. Persisted (Postgres when DATABASE_URL is set) so that any server
 * instance can serve them; see ai-snapshot-store.ts.
 */
import type { AccumulatorSlip, AiPick } from './ai-picks.ts';
import type { AiEngineResult } from './ai-engine.ts';
import type { CoverageData } from './data-state.ts';
import { getSnapshotStore, type SnapshotStore } from './ai-snapshot-store.ts';

export type AiSnapshot = {
  picks: AiPick[];
  byMarket: Record<string, AiPick[]>;
  slips25: AccumulatorSlip[];
  generatedAt: number;
  statsNote: string | null;
  candidateCount: number;
  verifiedCount: number;
  bestFitCount: number;
  coverage: CoverageData;
  runId: string | null;
};

export async function saveAiSnapshot(result: AiEngineResult, runId: string | null = null, store: SnapshotStore = getSnapshotStore()): Promise<AiSnapshot> {
  const snapshot: AiSnapshot = {
    picks: result.picks,
    byMarket: result.byMarket,
    slips25: result.slips25,
    generatedAt: result.generatedAt,
    statsNote: result.statsNote,
    candidateCount: result.candidateCount,
    verifiedCount: result.verifiedCount,
    bestFitCount: result.bestFitCount,
    coverage: result.coverage,
    runId,
  };
  await store.save(snapshot);
  return snapshot;
}

export async function getAiSnapshot(store: SnapshotStore = getSnapshotStore()): Promise<AiSnapshot | null> {
  return store.latest();
}

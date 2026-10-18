/**
 * In-process store for the latest AI picks / slips.
 * Separate from the fetch Store so AI generation can run without Postgres.
 */
import type { AccumulatorSlip, AiPick } from './ai-picks.ts';
import type { AiEngineResult } from './ai-engine.ts';

export type AiSnapshot = {
  picks: AiPick[];
  byMarket: Record<string, AiPick[]>;
  slips25: AccumulatorSlip[];
  generatedAt: number;
  statsNote: string | null;
  candidateCount: number;
  verifiedCount: number;
  bestFitCount: number;
  runId: string | null;
};

let snapshot: AiSnapshot | null = null;

export function saveAiSnapshot(result: AiEngineResult, runId: string | null = null): AiSnapshot {
  snapshot = {
    picks: result.picks,
    byMarket: result.byMarket,
    slips25: result.slips25,
    generatedAt: result.generatedAt,
    statsNote: result.statsNote,
    candidateCount: result.candidateCount,
    verifiedCount: result.verifiedCount,
    bestFitCount: result.bestFitCount,
    runId,
  };
  return snapshot;
}

export function getAiSnapshot(): AiSnapshot | null {
  return snapshot;
}

export function clearAiSnapshot(): void {
  snapshot = null;
}

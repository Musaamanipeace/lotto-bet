'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { AiPick } from '@/lib/ai-picks.ts';
import { aiPickToRow } from '@/lib/ai-rows.ts';
import type { PickRow } from '@/lib/filters.ts';
import { defaultCards } from '@/lib/market-cards.ts';
import { MAX_LEGS, addLeg, addMany, emptySlip, removeLeg, slipTotals, type Slip as BuilderSlip } from '@/lib/slip.ts';
import { getLocalTemplates, type FilterTemplate } from '@/lib/template-store.ts';
import { buildTemplateAiAcca, templateSummary } from '@/lib/template-ai.ts';
import { useStoredSlip } from '../components/use-slips';
import { AlternativesPanel } from '../components/alternatives-panel';
import { CoverageStrip, CriteriaList, PickDataLine, type CoverageData } from '../components/data-status';
import { LeagueChecklist, type LeagueItem } from '../components/league-checklist';
import { describeReport, planAdd, type Revalidation } from '@/lib/add-picks.ts';
import { encodeLeagues, parseLeagues } from '@/lib/pick-filter.ts';
import { SettingsModal } from '../components/settings-modal';
import { hintForError } from '@/lib/error-hints.ts';

type CriterionEval = {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'unavailable';
  detail?: string;
  provisional?: boolean;
};

type Slip = {
  id: string;
  legCount?: number;
  totalOdds: number;
  combinedImpliedProbability: number;
  riskLabel: string;
  coreCount: number;
  boosterCount: number;
  picks: AiPick[];
};

const MARKETS: { key: string; label: string }[] = [
  { key: '', label: 'All markets' },
  { key: 'home_win', label: 'Home Win' },
  { key: 'away_win', label: 'Away Win' },
  { key: 'over_0_5', label: 'Over 0.5' },
  { key: 'over_1_5', label: 'Over 1.5' },
  { key: 'under_3_5', label: 'Under 3.5' },
  { key: 'under_4_5', label: 'Under 4.5' },
];

const TIER_CHIP: Record<string, string> = {
  safe: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  balanced: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  value: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
};

function fmtKickoff(ms: number) {
  try {
    return new Date(ms).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(ms);
  }
}

function PickCard({ pick, slip, onAdd, onRemove }: {
  pick: AiPick;
  slip: BuilderSlip;
  onAdd: (p: AiPick) => string | null;
  onRemove: (p: AiPick) => void;
}) {
  const [open, setOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  // 'this': this exact pick is in the slip. 'other': the game is in the slip with a different market.
  const leg = slip.legs.find((l) => l.gameId === pick.gameId);
  const slipState: 'none' | 'this' | 'other' = !leg
    ? 'none'
    : leg.marketNativeId === pick.marketNativeId && leg.outcomeNativeId === pick.outcomeNativeId && leg.specifier === pick.specifier
      ? 'this'
      : 'other';
  return (
    <article className="glass rounded-xl border border-white/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-semibold text-white">
            {pick.home} <span className="text-slate-500">vs</span> {pick.away}
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {pick.league ?? 'Unknown league'} · {fmtKickoff(pick.kickoff)}
          </p>
        </div>
        <div className="text-right">
          <span className="font-display text-xl font-bold text-gold-400">{pick.odds.toFixed(2)}</span>
          <p className="text-[11px] text-slate-400">
            implied {(pick.impliedProbability * 100).toFixed(1)}% (bookmaker, margin removed)
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${TIER_CHIP[pick.tier]}`}>
          {pick.tier}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
            pick.evaluation.label === 'Verified'
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
              : 'border-slate-500/50 bg-slate-500/15 text-slate-300'
          }`}
        >
          {pick.evaluation.label}
        </span>
        <span className="text-[11px] text-slate-400">{pick.evaluation.verifiedLabel}</span>
        <span className="text-[11px] text-slate-500">fit {pick.fitScore.toFixed(2)}</span>
        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
          {pick.marketKey.replace(/_/g, ' ')}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-300">{pick.rationale}</p>
      <PickDataLine counts={pick.evaluation.stateCounts} total={pick.evaluation.total} />
      {pick.evaluation.provisionalCriteria.length > 0 && (
        <p 

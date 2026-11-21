'use client';

import { useState } from 'react';
import { DATA_STATE_HELP, DATA_STATE_LABEL, MISSING_STATES, type DataState, type StateCounts } from '@/lib/data-state.ts';
import type { CriterionResult } from '@/lib/evaluator.ts';

export type CoverageData = {
  criteriaTotal: number;
  byState: StateCounts;
  topReasons: { state: DataState; reason: string; count: number }[];
  candidatesTotal: number;
  candidatesWithData: number;
  providers: string[];
};

const STATE_CLS: Record<DataState, string> = {
  ok: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  not_offered: 'border-slate-500/50 bg-slate-500/15 text-slate-300',
  not_covered: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  not_fetched: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  fetch_failed: 'border-red-500/40 bg-red-500/15 text-red-300',
  not_configured: 'border-violet-500/40 bg-violet-500/15 text-violet-300',
};

export function StateBadge({ state, count }: { state: DataState; count?: number }) {
  return (
    <span title={DATA_STATE_HELP[state]} className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATE_CLS[state]}`}>
      {DATA_STATE_LABEL[state]}{count !== undefined ? `: ${count}` : ''}
    </span>
  );
}

/** Page-level answer to "is the data unavailable, or was it never fetched?" */
export function CoverageStrip({ coverage }: { coverage: CoverageData | null | undefined }) {
  const [open, setOpen] = useState(false);
  if (!coverage || coverage.criteriaTotal === 0) return null;
  const real = coverage.byState.ok;
  return (
    <section className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3" aria-label="Data coverage">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-white">
          Data coverage: {real} of {coverage.criteriaTotal} criteria used real data
        </span>
        <span className="text-xs text-slate-400">
          · {coverage.candidatesWithData} of {coverage.candidatesTotal} candidate picks had at least some data
          {coverage.providers.length ? ` · source: ${coverage.providers.join(', ')}` : ''}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <StateBadge state="ok" count={real} />
        {MISSING_STATES.filter((s) => coverage.byState[s] > 0).map((s) => <StateBadge key={s} state={s} count={coverage.byState[s]} />)}
      </div>
      {coverage.topReasons.length > 0 && (
        <>
          <button type="button" className="mt-2 text-xs text-cyan-400 hover:underline" onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide reasons' : 'Why is data missing?'}
          </button>
          {open && (
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              {coverage.topReasons.map((r) => (
                <li key={`${r.state}|${r.reason}`} className="flex flex-wrap items-start gap-2">
                  <StateBadge state={r.state} /> <span>{r.reason}</span> <span className="text-slate-500">×{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

const ICON: Record<CriterionResult['status'], string> = { pass: '✓', fail: '✗', unavailable: '–' };

/** Per-criterion list for one pick: result, data state and the exact reason or value. */
export function CriteriaList({ criteria }: { criteria: CriterionResult[] | undefined }) {
  if (!criteria || criteria.length === 0) return <p className="mt-1 text-xs text-slate-500">No criteria are configured for this market and tier.</p>;
  return (
    <ul className="mt-2 space-y-1.5 text-xs">
      {criteria.map((c) => {
        const state: DataState = c.dataState ?? (c.status === 'unavailable' ? 'not_fetched' : 'ok');
        return (
          <li key={c.id} className="rounded border border-white/5 px-2 py-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={c.status === 'pass' ? 'text-emerald-300' : c.status === 'fail' ? 'text-red-300' : 'text-slate-500'} aria-label={c.status}>{ICON[c.status]}</span>
              <span className="text-slate-200">{c.label}</span>
              <StateBadge state={state} />
            </div>
            {c.detail && <p className="mt-0.5 break-words text-[11px] text-slate-500">{c.detail}</p>}
          </li>
        );
      })}
    </ul>
  );
}

/** Compact "3 ✓ 1 ✗ · 2 not offered · 1 not fetched" line for a pick card. */
export function PickDataLine({ counts, total }: { counts?: StateCounts; total: number }) {
  if (!counts || total === 0) return null;
  const missing = MISSING_STATES.filter((s) => counts[s] > 0);
  return (
    <p className="mt-1 text-[11px] text-slate-400">
      Data: {counts.ok} of {total} criteria had real data
      {missing.map((s) => ` · ${counts[s]} ${DATA_STATE_LABEL[s].toLowerCase()}`).join('')}
    </p>
  );
}

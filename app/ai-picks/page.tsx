'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AiPick, TargetTier } from '@/lib/ai-picks.ts';
import type { AgentResponse } from '@/lib/ai-agent.ts';
import { applyFilterState } from '@/lib/filter-state.ts';
import { addLeg, defaultSlipName, emptySlip, removeLeg, type Slip as BuilderSlip } from '@/lib/slip.ts';
import { aiPickToRow } from '@/lib/ai-rows.ts';
import { upsertLocalSavedSlip } from '@/lib/saved-slips.ts';
import { planAdd } from '@/lib/add-picks.ts';
import {
  getClientPreferenceHeaders,
  hasConfiguredAiKeys,
  onSettingsChanged,
  refreshServerSettings,
} from '@/lib/client-settings.ts';
import { useAuth } from '../components/auth-context';
import { CoverageStrip, CriteriaList, PickDataLine, type CoverageData } from '../components/data-status';
import { FilterSummaryBadge, useFilters } from '../components/filter-context';
import { useStoredSlip } from '../components/use-slips';

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

  const leg = slip.legs.find((l) => l.gameId === pick.gameId);
  const slipState: 'none' | 'this' | 'other' = !leg
    ? 'none'
    : leg.marketNativeId === pick.marketNativeId && leg.outcomeNativeId === pick.outcomeNativeId && leg.specifier === pick.specifier
      ? 'this'
      : 'other';

  const handleAdd = () => {
    const err = onAdd(pick);
    setAddError(err);
  };

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
        <p className="mt-2 text-xs text-amber-400/90">
          Provisional criteria active: {pick.evaluation.provisionalCriteria.join(', ')}
        </p>
      )}

      {addError && <p className="mt-2 text-xs font-medium text-rose-400">{addError}</p>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
        >
          {open ? 'Hide criteria breakdown' : 'View criteria breakdown'}
        </button>

        {slipState === 'this' ? (
          <button
            type="button"
            onClick={() => onRemove(pick)}
            className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/30 border border-rose-500/30"
          >
            Remove from slip
          </button>
        ) : slipState === 'other' ? (
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
          >
            Replace leg in slip
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
          >
            Add to slip
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 rounded-lg bg-black/20 p-3">
          <CriteriaList criteria={pick.criteria} />
        </div>
      )}
    </article>
  );
}

export default function AiPicksPage() {
  const { user, openAuth } = useAuth();
  const { filterState, openFiltersSheet } = useFilters();
  const [picks, setPicks] = useState<AiPick[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<'' | 'safe' | 'balanced' | 'value'>('');
  const [coverageData, setCoverageData] = useState<CoverageData | null>(null);
  const [byokReady, setByokReady] = useState<boolean>(false);

  // Task 13: "Ask AI for N picks" bar
  const [askCount, setAskCount] = useState('5');
  const [askTier, setAskTier] = useState<TargetTier>('average');
  const [askTargetOdds, setAskTargetOdds] = useState('');
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentResponse | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentAppliedNotice, setAgentAppliedNotice] = useState<string | null>(null);

  const [slip, setSlip] = useStoredSlip();

  const openSettings = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('lb-open-settings'));
    }
  };

  const loadPicks = useCallback(async () => {
    if (!user) {
      setByokReady(false);
      setPicks([]);
      setLoading(false);
      return;
    }
    let ready = hasConfiguredAiKeys();
    if (!ready) {
      const snap = await refreshServerSettings();
      ready = Boolean(snap?.aiKeysConfigured);
    }
    setByokReady(ready);
    if (!ready) {
      setPicks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/ai/picks', {
        headers: getClientPreferenceHeaders(),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        if (res.status === 400 && data?.code === 'keys_required') {
          setByokReady(false);
          setPicks([]);
          return;
        }
        throw new Error(data?.error ?? `Failed to fetch AI picks (HTTP ${res.status})`);
      }
      setPicks(data.picks ?? []);
      setCoverageData(data.coverage ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadPicks();
    return onSettingsChanged(() => {
      void loadPicks();
    });
  }, [loadPicks]);

  // Task 9: Route AI Picks filtering through canonical applyFilterState()
  const filteredPicks = useMemo(() => {
    return applyFilterState(picks, filterState, {
      tier: selectedTier || undefined,
      pastGraceMs: 5 * 60_000,
    });
  }, [picks, filterState, selectedTier]);

  const persistSlip = useCallback(
    async (nextSlip: BuilderSlip) => {
      if (!user || nextSlip.legs.length === 0) return;
      const b = nextSlip.legs[0]?.bookmaker ?? filterState.bookmaker;
      const totalOdds = nextSlip.legs.reduce((a, l) => a * l.odds, 1);
      const name = nextSlip.name || defaultSlipName();
      try {
        const r = await fetch('/api/slips/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: nextSlip.id,
            name,
            bookmaker: b,
            legs: nextSlip.legs,
            totalOdds,
            combinedImplied: null,
          }),
        });
        const j = await r.json().catch(() => null);
        if (j?.ok && j.slip) upsertLocalSavedSlip(j.slip);
      } catch {
        /* ignore */
      }
    },
    [user, filterState.bookmaker],
  );

  const handleAddPick = useCallback(
    (pick: AiPick): string | null => {
      if (!byokReady) {
        openSettings();
        return 'Please save your API key in Settings first.';
      }
      const base = slip.legs.some((l) => l.gameId === pick.gameId)
        ? removeLeg(slip, pick.gameId)
        : slip.legs.length === 0
          ? { id: `saved-${Date.now()}`, name: defaultSlipName(), legs: [], greyed: [] }
          : slip;
      const { slip: nextSlip, report } = planAdd([pick], base, 1);
      if (report.added === 0) {
        return report.skipped[0]?.reason ?? "Couldn't add this pick to the slip";
      }
      const finalSlip = {
        ...nextSlip,
        id: nextSlip.id || `saved-${Date.now()}`,
        name: nextSlip.name || defaultSlipName(),
      };
      setSlip(finalSlip);
      void persistSlip(finalSlip);
      return null;
    },
    [slip, setSlip, byokReady, persistSlip],
  );

  const handleRemovePick = useCallback(
    (pick: AiPick) => {
      setSlip(removeLeg(slip, pick.gameId));
    },
    [slip, setSlip],
  );

  async function handleAskAiForNPicks() {
    setAgentError(null);
    setAgentAppliedNotice(null);
    const n = Math.max(1, Math.min(25, Number.parseInt(askCount, 10) || 5));
    const parsedTarget = askTargetOdds.trim() ? Number.parseFloat(askTargetOdds) : undefined;
    if (parsedTarget !== undefined && (!Number.isFinite(parsedTarget) || parsedTarget <= 1)) {
      setAgentError('Target odds must be greater than 1.');
      return;
    }

    setAgentBusy(true);
    try {
      const res = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getClientPreferenceHeaders(),
        },
        body: JSON.stringify({
          mode: 'pick_n',
          n,
          tier: askTier,
          targetOdds: parsedTarget,
          filterState,
          slipLegs: slip.legs.map((l) => ({
            gameId: l.gameId,
            home: l.home,
            away: l.away,
            pick: l.pick,
            odds: l.odds,
            marketKind: l.marketKind,
          })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setAgentError(data?.error ?? `Request failed (HTTP ${res.status})`);
        return;
      }
      setAgentResult(data as AgentResponse);
    } catch (e) {
      setAgentError(e instanceof Error ? e.message : String(e));
    } finally {
      setAgentBusy(false);
    }
  }

  function applyAgentPicks(replaceExisting: boolean) {
    if (!agentResult || agentResult.picks.length === 0) return;
    let working: BuilderSlip = replaceExisting
      ? { id: `saved-${Date.now()}`, name: defaultSlipName(), legs: [], greyed: [] }
      : slip.legs.length === 0
        ? { id: `saved-${Date.now()}`, name: defaultSlipName(), legs: [], greyed: [] }
        : { ...slip, id: slip.id || `saved-${Date.now()}`, name: slip.name || defaultSlipName() };

    let addedCount = 0;
    for (const p of agentResult.picks) {
      const row = aiPickToRow(p);
      if (!row) continue;
      const res = addLeg(working, row);
      if (res.ok) {
        working = res.slip;
        addedCount += 1;
      }
    }
    setSlip(working);
    void persistSlip(working);
    setAgentAppliedNotice(
      `Added ${addedCount} AI pick${addedCount === 1 ? '' : 's'} to "${working.name}".`,
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="glass rounded-xl border border-white/10 p-6 text-center space-y-3">
          <h1 className="font-display text-2xl font-bold text-white">Sign in required</h1>
          <p className="text-sm text-slate-400">
            Unsigned-in users can use the Builder, Filters, and Random Picks. Sign in and save an API key in Settings to use AI Picks.
          </p>
          <button type="button" onClick={() => openAuth('login')} className="btn-emerald text-xs">
            Sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">AI Recommended Picks</h1>
          <p className="mt-1 text-sm text-slate-400">
            Filtered by your unified Builder criteria and verified against recent team metrics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSummaryBadge />
          <button
            type="button"
            onClick={openFiltersSheet}
            className="btn-ghost px-3 py-1.5 text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
          >
            🎚️ Edit Filters
          </button>
        </div>
      </header>

      {!byokReady ? (
        <div className="glass rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-3">
          <p className="text-sm font-medium text-amber-200">
            🔑 Save an AI API key in Menu ▾ → Settings to unlock AI Picks and the Pick-N Agent.
          </p>
          <button type="button" onClick={openSettings} className="btn-gold text-xs">
            Open Settings
          </button>
        </div>
      ) : (
        <>
          {coverageData && <CoverageStrip coverage={coverageData} />}

          {/* Task 13: Ask AI for N Picks Agent Bar */}
          <section className="glass mb-6 rounded-xl border border-gold-500/30 bg-gradient-to-br from-gold-500/10 via-navy-900/70 to-navy-950 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-gold-300">
                  🤖 Ask AI for N Picks
                </h2>
                <p className="text-xs text-slate-400">
                  Selects unique fixtures strictly matching your active Unified Filters.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-300 flex items-center gap-1.5">
                  Tier:
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value as '' | 'safe' | 'balanced' | 'value')}
                    className="field h-8 py-0 text-xs"
                    aria-label="Filter list by risk tier"
                  >
                    <option value="">All Tiers</option>
                    <option value="safe">Safe</option>
                    <option value="balanced">Balanced</option>
                    <option value="value">Value</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-slate-300">
                Picks (N)
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={askCount}
                  onChange={(e) => setAskCount(e.target.value)}
                  className="field mt-1 w-20 h-8 text-xs text-center font-mono"
                />
              </label>

              <label className="text-xs text-slate-300">
                Risk Profile
                <select
                  value={askTier}
                  onChange={(e) => setAskTier(e.target.value as TargetTier)}
                  className="field mt-1 h-8 py-0 text-xs"
                >
                  <option value="lower">Safe</option>
                  <option value="average">Balanced</option>
                  <option value="higher">Value</option>
                </select>
              </label>

              <label className="text-xs text-slate-300">
                Target Odds (optional)
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 12.0"
                  value={askTargetOdds}
                  onChange={(e) => setAskTargetOdds(e.target.value.replace(/[^\d.]/g, ''))}
                  className="field mt-1 w-28 h-8 text-xs font-mono"
                />
              </label>

              <button
                type="button"
                disabled={agentBusy}
                onClick={() => void handleAskAiForNPicks()}
                className="btn-gold h-8 px-4 text-xs font-bold"
              >
                {agentBusy ? 'Selecting picks…' : 'Ask AI for N picks'}
              </button>
            </div>

            {agentError && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {agentError}
              </p>
            )}

            {agentResult && (
              <div className="rounded-xl border border-cyan-500/30 bg-navy-950/70 p-3.5 space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-cyan-200">
                    {agentResult.picks.length} pick{agentResult.picks.length === 1 ? '' : 's'} selected
                    {agentResult.shortfall > 0 && ` (shortfall: ${agentResult.shortfall})`}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {agentResult.picks.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => applyAgentPicks(false)}
                          className="btn-emerald h-7 px-3 py-0 text-xs font-semibold"
                        >
                          Add to slip
                        </button>
                        {slip.legs.length > 0 && (
                          <button
                            type="button"
                            onClick={() => applyAgentPicks(true)}
                            className="btn-ghost h-7 px-3 py-0 text-xs"
                          >
                            Replace active slip
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <p className="text-slate-200">{agentResult.summary}</p>
                {agentAppliedNotice && (
                  <p className="text-emerald-300 font-medium">{agentAppliedNotice}</p>
                )}
                {agentResult.picks.length > 0 && (
                  <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 pt-1">
                    {agentResult.picks.map((p) => (
                      <li key={p.id} className="rounded border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
                        <span className="font-medium text-white">{p.home} v {p.away}</span>{' '}
                        <span className="text-slate-400">· {p.marketKey.replace(/_/g, ' ')}</span>{' '}
                        <strong className="text-gold-400">@{p.odds.toFixed(2)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading AI picks…</div>
          ) : error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center text-rose-300">
              {error}
            </div>
          ) : filteredPicks.length === 0 ? (
            <div className="glass rounded-xl border border-white/10 py-12 text-center space-y-3">
              <p className="text-slate-300">No picks matched your current Unified Filters.</p>
              <button type="button" onClick={openFiltersSheet} className="btn-emerald text-xs">
                Adjust Unified Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPicks.map((pick) => (
                <PickCard
                  key={`${pick.gameId}-${pick.marketNativeId}-${pick.outcomeNativeId}`}
                  pick={pick}
                  slip={slip}
                  onAdd={handleAddPick}
                  onRemove={handleRemovePick}
                />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

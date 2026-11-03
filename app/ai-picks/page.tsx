'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AiPick } from '@/lib/ai-picks.ts';
import { removeLeg, type Slip as BuilderSlip } from '@/lib/slip.ts';
import { useStoredSlip } from '../components/use-slips';
import { CoverageStrip, CriteriaList, PickDataLine, type CoverageData } from '../components/data-status';
import type { LeagueItem } from '../components/league-checklist';
import { planAdd } from '@/lib/add-picks.ts';
import { SettingsModal } from '../components/settings-modal';
<<<<<<< HEAD
=======

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
>>>>>>> parent of ad1a217 (refined ai logic)

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
  const [picks, setPicks] = useState<AiPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [minOdds, setMinOdds] = useState('');
  const [maxOdds, setMaxOdds] = useState('');
  const [coverageData, setCoverageData] = useState<CoverageData | null>(null);
  const [, setLeagues] = useState<LeagueItem[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [slip, setSlip] = useStoredSlip();

  useEffect(() => {
    async function loadPicks() {
      try {
        setLoading(true);
        const res = await fetch('/api/ai-picks');
        if (!res.ok) throw new Error('Failed to fetch AI picks data');
        const data = await res.json();
        setPicks(data.picks ?? []);
        setCoverageData(data.coverage ?? null);
        setLeagues(data.leagues ?? []);
      } catch (err: any) {
        setError(err.message ?? 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }
    loadPicks();
  }, []);

  const filteredPicks = useMemo(() => {
    return picks.filter((p) => {
      if (selectedMarket && p.marketKey !== selectedMarket) return false;
      if (selectedTier && p.tier !== selectedTier) return false;
      if (minOdds && p.odds < parseFloat(minOdds)) return false;
      if (maxOdds && p.odds > parseFloat(maxOdds)) return false;
      return true;
    });
  }, [picks, selectedMarket, selectedTier, minOdds, maxOdds]);

  const handleAddPick = useCallback(
    (pick: AiPick): string | null => {
      // If another outcome for the same game is already in the slip, replace it.
      const base = slip.legs.some((l) => l.gameId === pick.gameId) ? removeLeg(slip, pick.gameId) : slip;
      const { slip: nextSlip, report } = planAdd([pick], base, 1);
      if (report.added === 0) {
        return report.skipped[0]?.reason ?? "Couldn't add this pick to the slip";
      }
      setSlip(nextSlip);
      return null;
    },
    [slip, setSlip]
  );

  const handleRemovePick = useCallback(
    (pick: AiPick) => {
      setSlip(removeLeg(slip, pick.gameId));
    },
    [slip, setSlip]
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">AI Recommended Picks</h1>
          <p className="mt-1 text-sm text-slate-400">
            Algorithmic football market analysis verified against historical trend data
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
        >
          Settings
        </button>
      </header>

      {coverageData && <CoverageStrip coverage={coverageData} />}

<<<<<<< HEAD
      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
=======
      <CoverageStrip coverage={meta?.coverage} />

      <details className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2">
        <summary className="cursor-pointer text-sm text-slate-200">
          Leagues{leagues.length ? ` (${leagues.length} selected)` : ' (all)'} ▾
        </summary>
        <div className="mt-3">
          {leagueList.length === 0
            ? <p className="text-xs text-slate-400">No leagues loaded yet. Refresh games first.</p>
            : <LeagueChecklist leagues={leagueList} selected={leagues} onChange={setLeagues} compact />}
        </div>
      </details>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-white/10 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setInputError(null); }}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === t.id ? 'bg-white/15 text-white' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">
          {error}
          <p className="mt-1 text-xs text-red-300/80">
            If no fetch run exists yet, open the home page or POST /api/admin/refresh first, then Regenerate AI.
          </p>
        </div>
      )}

      {status === 'loading' && <p className="text-sm text-slate-400">Loading…</p>}

      {tab === 'market' && status !== 'loading' && (
>>>>>>> parent of ad1a217 (refined ai logic)
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Market Filter</label>
          <select
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {MARKETS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Risk Tier</label>
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">All Tiers</option>
            <option value="safe">Safe</option>
            <option value="balanced">Balanced</option>
            <option value="value">Value</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Min Odds</label>
          <input
            type="number"
            step="0.05"
            placeholder="e.g. 1.20"
            value={minOdds}
            onChange={(e) => setMinOdds(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Max Odds</label>
          <input
            type="number"
            step="0.05"
            placeholder="e.g. 3.00"
            value={maxOdds}
            onChange={(e) => setMaxOdds(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </section>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading AI picks...</div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center text-rose-300">
          {error}
        </div>
      ) : filteredPicks.length === 0 ? (
        <div className="py-12 text-center text-slate-400">No picks matched your active filters.</div>
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

      {settingsOpen && <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />}
    </main>
  );
}

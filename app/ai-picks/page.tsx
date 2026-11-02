'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { AiPick } from '@/lib/ai-picks.ts';
import { aiPickToRow } from '@/lib/ai-rows.ts';
import { MAX_LEGS, addLeg, emptySlip, removeLeg, slipTotals, type Slip as BuilderSlip } from '@/lib/slip.ts';
import { useStoredSlip } from '../components/use-slips';
import { AlternativesPanel } from '../components/alternatives-panel';
import { CoverageStrip, CriteriaList, PickDataLine, type CoverageData } from '../components/data-status';
import { LeagueChecklist, type LeagueItem } from '../components/league-checklist';
import { describeReport, planAdd, type Revalidation } from '@/lib/add-picks.ts';
import { encodeLeagues, parseLeagues } from '@/lib/pick-filter.ts';
import { SettingsModal } from '../components/settings-modal';

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
        <p className="mt-1 text-[11px] text-amber-400/80">
          Provisional thresholds used
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="text-xs text-cyan-400 hover:underline"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Hide details' : 'Show criteria details'}
        </button>
        {slipState === 'this' ? (
          <button type="button" className="btn-ghost h-8 border-emerald-500/40 px-3 py-0 text-xs text-emerald-300"
            onClick={() => { setAddError(null); onRemove(pick); }} aria-label={`Remove ${pick.home} v ${pick.away} from slip`}>
            ✓ In slip · Remove
          </button>
        ) : slipState === 'other' ? (
          <button type="button" disabled className="btn-ghost h-8 px-3 py-0 text-xs"
            title="Remove the other pick for this game from your slip first">
            Game already in slip
          </button>
        ) : (
          <button type="button" className="btn-emerald h-8 px-3 py-0 text-xs"
            onClick={() => setAddError(onAdd(pick))} aria-label={`Add ${pick.home} v ${pick.away} to slip`}>
            + Add to slip
          </button>
        )}
      </div>
      {addError && <p className="mt-1.5 text-right text-xs text-amber-300" role="status">{addError}</p>}
      {open && (
        <>
          <CriteriaList criteria={pick.criteria} />
          <p className="mt-2 text-xs text-slate-500">
            Exclusion: {pick.exclusionStatus}. Bookmaker: {pick.bookmaker}.
            {pick.evaluation.reason ? ` Reason: ${pick.evaluation.reason}` : ''}
          </p>
        </>
      )}
    </article>
  );
}

function SlipCard({ slip, title }: { slip: Slip; title?: string }) {
  const [legsOpen, setLegsOpen] = useState(true);
  const picksList = slip.picks ?? [];
  return (
    <article className="glass rounded-xl border border-white/10 p-4 transition-all">
      {title && <h3 className="mb-2 font-display text-sm font-semibold text-white">{title}</h3>}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-display text-2xl font-bold text-gold-400">{slip.totalOdds.toFixed(2)}</span>
          <span className="ml-2 text-xs text-slate-400">
            combined implied {(slip.combinedImpliedProbability * 100).toFixed(4)}%
          </span>
        </div>
        <div className="text-right text-xs text-slate-400">
          <span className="rounded-full border border-white/10 px-2 py-0.5">{slip.riskLabel}</span>
          <p className="mt-1">
            {picksList.length || slip.legCount} legs · {slip.coreCount} core · {slip.boosterCount} boosters
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-xs">
        <span className="text-slate-400">Picks Breakdown ({picksList.length || slip.legCount})</span>
        <button
          type="button"
          onClick={() => setLegsOpen((o) => !o)}
          className="text-cyan-400 hover:text-cyan-300"
        >
          {legsOpen ? '▲ Collapse legs' : '▼ Show legs'}
        </button>
      </div>

      {legsOpen && (
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-slate-300">
          {picksList.slice(0, 30).map((p) => (
            <li key={p.id} className="flex justify-between gap-2 border-b border-white/5 py-1">
              <span>
                {p.home} vs {p.away} · {p.marketKey.replace(/_/g, ' ')}
              </span>
              <span className="text-gold-400">{p.odds.toFixed(2)}</span>
            </li>
          ))}
          {picksList.length > 30 && (
            <li className="text-slate-500">… and {picksList.length - 30} more</li>
          )}
        </ul>
      )}
    </article>
  );
}

type TierResult = { slip: Slip | null; achieved: number; gap: number; message: string | null };
type TargetData = { target: number; lower: TierResult; average: TierResult; higher: TierResult };

const TARGET_TIER_LABEL = {
  lower: 'Lower risk (Safe picks only)',
  average: 'Average (Safe + Balanced)',
  higher: 'Higher risk (all tiers)',
} as const;

type Tab = 'market' | 'n' | 'target' | '25plus' | 'alts';

const parseN = (t: string): number | null => {
  const v = Number(t);
  return t.trim() !== '' && Number.isInteger(v) && v >= 1 && v <= 50 ? v : null;
};
const parseTarget = (t: string): number | null => {
  const v = Number(t);
  return t.trim() !== '' && Number.isFinite(v) && v > 1 ? v : null;
};

const INPUT_CLS = 'ml-1 rounded border border-white/10 bg-navy-900 px-2 py-1 text-white focus:border-emerald-500 focus:outline-none';

export default function AiPicksPage() {
  const [tab, setTab] = useState<Tab>('market');
  const [market, setMarket] = useState('');
  const [picks, setPicks] = useState<AiPick[]>([]);
  const [slips25, setSlips25] = useState<Slip[]>([]);
  const [pickN, setPickN] = useState<{ lower: Slip | null; average: Slip | null; higher: Slip | null; message: string | null; qualified: number } | null>(null);
  const [targetResult, setTargetResult] = useState<TargetData | null>(null);
  // Inputs are free-typed text; nothing is fetched until the action button (or Enter) is used.
  const [nText, setNText] = useState('15');
  const [targetText, setTargetText] = useState('20');
  const [inputError, setInputError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ statsNote: string | null; verifiedCount?: number; bestFitCount?: number; generatedAt?: number; coverage?: CoverageData | null } | null>(null);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [leagueList, setLeagueList] = useState<LeagueItem[]>([]);
  const [leaguesReady, setLeaguesReady] = useState(false);
  const [addTopN, setAddTopN] = useState('10');
  const [addNote, setAddNote] = useState<string | null>(null);
  const lq = leagues.length ? `&leagues=${encodeURIComponent(encodeLeagues(leagues))}` : '';
  const [generating, setGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [slip, setSlip] = useStoredSlip();

  /** Returns an error message, or null when the pick was added. */
  function addPick(p: AiPick): string | null {
    const row = aiPickToRow(p);
    if (!row) return "This market type can't be added to a slip.";
    const r = addLeg(slip, row);
    if (!r.ok) return r.error;
    setSlip(r.slip);
    return null;
  }
  const removePick = (p: AiPick) => setSlip(removeLeg(slip, p.gameId));
  const slipOdds = useMemo(() => {
    const t = slipTotals(slip).totalOdds;
    return t.ok ? t.total : null;
  }, [slip]);

  const loadPicks = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const q = new URLSearchParams({ limit: '80' });
      if (market) q.set('market', market);
      const r = await fetch(`/api/ai/picks?${q}${lq}`);
      const j = await r.json();
      if (!j.ok) {
        setStatus('error');
        setError(j.error ?? `HTTP ${r.status}`);
        setPicks([]);
        return;
      }
      setPicks(j.picks ?? []);
      setMeta({
        statsNote: j.statsNote,
        verifiedCount: j.verifiedCount,
        bestFitCount: j.bestFitCount,
        generatedAt: j.generatedAt,
        coverage: j.coverage ?? null,
      });
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [market, lq]);

  const load25 = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const r = await fetch('/api/ai/slips');
      const j = await r.json();
      if (!j.ok) {
        setStatus('error');
        setError(j.error ?? `HTTP ${r.status}`);
        return;
      }
      setSlips25(j.slips ?? []);
      setMeta((m) => ({ ...m, statsNote: j.statsNote, generatedAt: j.generatedAt }));
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const loadPickN = useCallback(async (n: number) => {
    setStatus('loading');
    setError(null);
    try {
      const r = await fetch(`/api/ai/pick-n?n=${n}${lq}`);
      const j = await r.json();
      if (!j.ok) {
        setStatus('error');
        setError(j.error ?? `HTTP ${r.status}`);
        return;
      }
      setPickN({
        lower: j.lower,
        average: j.average,
        higher: j.higher,
        message: j.message,
        qualified: j.qualified,
      });
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [lq]);

  const loadTarget = useCallback(async (target: number) => {
    setStatus('loading');
    setError(null);
    try {
      const r = await fetch(`/api/ai/target-odds?target=${target}${lq}`);
      const j = await r.json();
      if (!j.ok) {
        setStatus('error');
        setError(j.error ?? `HTTP ${r.status}`);
        return;
      }
      setTargetResult({ target: j.target, lower: j.lower, average: j.average, higher: j.higher });
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [lq]);

  // League filter: read from ?leagues= once, keep the URL in sync, and load the league list.
  useEffect(() => {
    setLeagues(parseLeagues(new URLSearchParams(window.location.search).get('leagues')));
    setLeaguesReady(true);
    fetch('/api/leagues').then((r) => r.json()).then((j) => { if (j.ok) setLeagueList(j.leagues ?? []); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!leaguesReady) return;
    const q = new URLSearchParams(window.location.search);
    if (leagues.length) q.set('leagues', encodeLeagues(leagues)); else q.delete('leagues');
    const t = q.toString();
    window.history.replaceState(null, '', t ? `?${t}` : window.location.pathname);
  }, [leagues, leaguesReady]);
  // Changing leagues drops stale Pick N / Target results so they reload with the new filter.
  useEffect(() => {
    if (!leaguesReady) return;
    setPickN(null);
    setTargetResult(null);
    if (tab === 'n') void loadPickN(parseN(nText) ?? 15);
    if (tab === 'target') void loadTarget(parseTarget(targetText) ?? 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lq, leaguesReady]);

  /** Add the first N picks currently listed to the betslip, after re-checking their odds. */
  async function addTop() {
    const n = Math.max(1, Math.floor(Number(addTopN)) || 1);
    setAddNote('Checking latest odds…');
    let reval: Map<string, Revalidation> | undefined;
    try {
      const r = await fetch('/api/ai/revalidate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pickIds: picks.slice(0, 200).map((p) => p.id) }) });
      const j = await r.json();
      if (j.ok) reval = new Map((j.results as { id: string; flag: Revalidation['flag']; odds: number }[]).map((x) => [x.id, { flag: x.flag, odds: x.odds }]));
    } catch { /* planAdd works without re-validation and says so below */ }
    const out = planAdd(picks, slip, n, reval);
    setSlip(out.slip);
    const why = out.report.skipped.slice(0, 3).map((s) => `${s.label}: ${s.reason}`).join(' · ');
    setAddNote(`${describeReport(out.report)}${reval ? '' : ' (odds could not be re-checked)'}${why ? ` ${why}` : ''}`);
  }

  // Market chips are single clicks, so they refetch right away.
  useEffect(() => {
    if (tab === 'market') void loadPicks();
  }, [tab, loadPicks]);

  // Pick N / Target odds load on first open only. Typing never refetches; the action button does.
  useEffect(() => {
    if (tab === '25plus') void load25();
    if (tab === 'n' && !pickN) void loadPickN(parseN(nText) ?? 15);
    if (tab === 'target' && !targetResult) void loadTarget(parseTarget(targetText) ?? 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function submitN(e?: React.FormEvent) {
    e?.preventDefault();
    const v = parseN(nText);
    if (v === null) { setInputError('Games must be a whole number from 1 to 50.'); return; }
    setInputError(null);
    setNText(String(v));
    void loadPickN(v);
  }

  function submitTarget(e?: React.FormEvent) {
    e?.preventDefault();
    const v = parseTarget(targetText);
    if (v === null) { setInputError('Target odds must be a number greater than 1.'); return; }
    setInputError(null);
    void loadTarget(v);
  }

  async function regenerate() {
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch('/api/ai/generate', { method: 'POST' });
      const j = await r.json();
      if (!j.ok) {
        setError(j.error ?? `HTTP ${r.status}`);
      } else {
        // reload active tab
        if (tab === 'market') await loadPicks();
        if (tab === '25plus') await load25();
        if (tab === 'n') await loadPickN(parseN(nText) ?? 15);
        if (tab === 'target') await loadTarget(parseTarget(targetText) ?? 20);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'market', label: 'Best by market' },
    { id: 'n', label: 'Pick N games' },
    { id: 'target', label: 'Target odds' },
    { id: '25plus', label: '25+ accumulators' },
    { id: 'alts', label: 'Alternatives' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">AI Picks</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Deterministic picks from odds bands and criteria. Unavailable stats never count as a pass.
            Labels are <strong className="text-slate-300">Verified</strong> or{' '}
            <strong className="text-slate-300">Best fit</strong> — never win language.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost text-xs text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10"
            onClick={() => setSettingsOpen(true)}
          >
            ⚙️ AI Settings
          </button>
          <button type="button" className="btn-ghost" onClick={() => void regenerate()} disabled={generating}>
            {generating ? 'Generating…' : 'Regenerate AI'}
          </button>
          <Link href="/" className="btn-gold">
            Builder
          </Link>
        </div>
      </div>

      {meta?.statsNote && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200" role="status">
          {meta.statsNote}
        </div>
      )}
      {meta && (meta.verifiedCount !== undefined || meta.bestFitCount !== undefined) && (
        <p className="mb-4 text-xs text-slate-500">
          {meta.verifiedCount ?? 0} Verified · {meta.bestFitCount ?? 0} Best fit
          {meta.generatedAt ? ` · as of ${new Date(meta.generatedAt).toLocaleString()}` : ''}
        </p>
      )}

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
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {MARKETS.map((m) => (
              <button
                key={m.key || 'all'}
                type="button"
                onClick={() => setMarket(m.key)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  market === m.key
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {picks.length === 0 && !error && (
            <p className="text-sm text-slate-400">
              No picks in this market could be verified today. Try Regenerate AI after refreshing games.
            </p>
          )}
          {picks.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <span>Add the top</span>
              <input className={`${INPUT_CLS} w-14`} inputMode="numeric" aria-label="How many picks to add" value={addTopN} onChange={(e) => setAddTopN(e.target.value.replace(/\D/g, '').slice(0, 2))} />
              <span>listed picks to the betslip</span>
              <button type="button" className="btn-emerald h-8 px-3 py-0 text-xs" onClick={() => void addTop()}>Add</button>
              {addNote && <span className="text-xs text-amber-200" role="status">{addNote}</span>}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {picks.map((p) => (
              <PickCard key={p.id} pick={p} slip={slip} onAdd={addPick} onRemove={removePick} />
            ))}
          </div>
        </div>
      )}

      {tab === 'n' && (
        <div>
          <form onSubmit={submitN} className="mb-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-300">
              Games
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={nText}
                onChange={(e) => setNText(e.target.value.replace(/\D/g, '').slice(0, 2))}
                className={`${INPUT_CLS} w-16`}
                aria-label="Number of games"
              />
            </label>
            <button type="submit" className="btn-emerald" disabled={status === 'loading'}>
              {status === 'loading' ? 'Building…' : 'Build slips'}
            </button>
            <span className="text-xs text-slate-500">1 to 50</span>
          </form>
          {inputError && <p className="mb-3 text-sm text-red-300" role="alert">{inputError}</p>}
          {status !== 'loading' && (
            <>
              {pickN?.message && <p className="mb-3 text-sm text-amber-300">{pickN.message}</p>}
              <div className="grid gap-4 lg:grid-cols-3">
                {pickN?.lower && <SlipCard slip={pickN.lower} title="Lower risk (~90% core)" />}
                {pickN?.average && <SlipCard slip={pickN.average} title="Average (~75% core)" />}
                {pickN?.higher && <SlipCard slip={pickN.higher} title="Higher risk (~60% core)" />}
              </div>
              {!pickN?.lower && !pickN?.average && !pickN?.higher && !error && (
                <p className="text-sm text-slate-400">No slips could be built from qualifying picks.</p>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'target' && (
        <div>
          <form onSubmit={submitTarget} className="mb-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-300">
              Target odds
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={targetText}
                onChange={(e) => {
                  // digits and a single dot only
                  const t = e.target.value.replace(/[^\d.]/g, '');
                  const dot = t.indexOf('.');
                  setTargetText(dot === -1 ? t.slice(0, 7) : (t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, '')).slice(0, 9));
                }}
                className={`${INPUT_CLS} w-24`}
                aria-label="Target odds"
              />
            </label>
            <button type="submit" className="btn-emerald" disabled={status === 'loading'}>
              {status === 'loading' ? 'Finding…' : 'Find closest'}
            </button>
          </form>
          {inputError && <p className="mb-3 text-sm text-red-300" role="alert">{inputError}</p>}
          {status !== 'loading' && targetResult && (
            <>
              <p className="mb-3 text-sm text-slate-400">Requested {targetResult.target.toFixed(2)}, closest slip for each risk tier:</p>
              <div className="grid gap-4 lg:grid-cols-3">
                {(['lower', 'average', 'higher'] as const).map((tier) => {
                  const t = targetResult[tier];
                  return (
                    <div key={tier}>
                      {t.slip ? (
                        <>
                          <p className="mb-2 text-xs text-slate-400">
                            achieved {t.achieved.toFixed(2)} · gap {t.gap.toFixed(2)}
                          </p>
                          <SlipCard slip={t.slip} title={TARGET_TIER_LABEL[tier]} />
                        </>
                      ) : (
                        <article className="glass rounded-xl border border-white/10 p-4">
                          <h3 className="mb-2 font-display text-sm font-semibold text-white">{TARGET_TIER_LABEL[tier]}</h3>
                          <p className="text-sm text-slate-400">No slip available for this tier.</p>
                        </article>
                      )}
                      {t.message && <p className="mt-2 text-xs text-amber-300">{t.message}</p>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'alts' && <AlternativesPanel leagues={leagues} slip={slip} setSlip={setSlip} />}

      {tab === '25plus' && status !== 'loading' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {slips25.length === 0 && !error && (
            <p className="text-sm text-slate-400">
              No 25+ game slips could be built. Need at least 25 qualifying picks from different games.
            </p>
          )}
          {slips25.map((s, i) => (
            <SlipCard key={s.id} slip={s} title={`Accumulator ${i + 1}`} />
          ))}
        </div>
      )}
      {slip.legs.length > 0 && (
        <div className="glass fixed bottom-4 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center gap-3 bg-navy-900/95 px-4 py-2.5 shadow-lg" role="status">
          <span className="text-sm text-slate-200">
            Slip · {slip.legs.length}/{MAX_LEGS} legs
            {slipOdds !== null && <> · <span className="font-display font-bold text-gold-400">{slipOdds.toFixed(2)}</span></>}
          </span>
          <button type="button" className="btn-ghost ml-auto h-8 px-3 py-0 text-xs" onClick={() => setSlip(emptySlip())}>Clear</button>
          <Link href="/" className="btn-gold h-8 px-3 py-0 text-xs">Open slip →</Link>
        </div>
      )}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

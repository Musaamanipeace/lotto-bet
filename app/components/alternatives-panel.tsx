'use client';

import { useMemo, useState } from 'react';
import type { AiPick } from '@/lib/ai-picks.ts';
import { describeReport, planAdd, type Revalidation } from '@/lib/add-picks.ts';
import { encodeLeagues } from '@/lib/pick-filter.ts';
import { emptySlip, type Slip as BuilderSlip } from '@/lib/slip.ts';

type ApiSlip = {
  id: string; legCount: number; totalOdds: number; combinedImpliedProbability: number; riskLabel: string;
  coreCount: number; boosterCount: number; avgFit: number; diffFromFirst: number; pickIds: string[];
};
type Result = { bookmaker: string | null; poolSize: number; count: number; exhausted: boolean; message: string | null; slips: ApiSlip[]; pickIndex: Record<string, AiPick>; band: { min: number; max: number } };
type Row = { id: string; picks: AiPick[]; swapped: boolean };
type Local = { picks: AiPick[]; history: AiPick[][]; seen: string[]; locked: string[]; picked: string[]; note: string | null };

const PRESETS = [100, 250, 500, 1000];
const INPUT = 'rounded border border-white/10 bg-navy-900 px-2 py-1 text-white focus:border-emerald-500 focus:outline-none';
const digits = (t: string, max = 9) => t.replace(/[^\d.]/g, '').slice(0, max);
const oddsOf = (p: AiPick[]) => p.reduce((a, x) => a * x.odds, 1);
const avgFit = (p: AiPick[]) => (p.length ? p.reduce((a, x) => a + x.fitScore, 0) / p.length : 0);

async function revalidate(ids: string[]): Promise<Map<string, Revalidation> | null> {
  try {
    const r = await fetch('/api/ai/revalidate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pickIds: ids }) });
    const j = await r.json();
    if (!j.ok) return null;
    return new Map((j.results as { id: string; flag: Revalidation['flag']; odds: number }[]).map((x) => [x.id, { flag: x.flag, odds: x.odds }]));
  } catch { return null; }
}

export function AlternativesPanel({ leagues, slip, setSlip }: { leagues: string[]; slip: BuilderSlip; setSlip: (s: BuilderSlip) => void }) {
  const [mode, setMode] = useState<'target' | 'range'>('target');
  const [targetText, setTargetText] = useState('500');
  const [tol, setTol] = useState('0.1');
  const [minText, setMinText] = useState('100');
  const [maxText, setMaxText] = useState('1000');
  const [bookmaker, setBookmaker] = useState('');
  const [scope, setScope] = useState<'any' | 'same_market'>('any');
  const [tier, setTier] = useState<'higher' | 'average' | 'lower'>('higher');
  const [minDiff, setMinDiff] = useState('2');
  const [count, setCount] = useState('50');
  const [strict, setStrict] = useState(false);
  const [sort, setSort] = useState<'order' | 'odds' | 'fit' | 'legs' | 'diff'>('order');

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [local, setLocal] = useState<Record<string, Local>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [addN, setAddN] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<Record<string, string>>({});
  const [swapN, setSwapN] = useState('2');

  function qs(n: number) {
    const q = new URLSearchParams({ count: String(n), minDiff: minDiff || '2', tier, scope });
    if (mode === 'target') { q.set('target', targetText); q.set('tol', tol); } else { q.set('min', minText); q.set('max', maxText); }
    if (bookmaker) q.set('bookmaker', bookmaker);
    if (strict) q.set('strict', '1');
    if (leagues.length) q.set('leagues', encodeLeagues(leagues));
    return q.toString();
  }

  async function generate(n: number, keepEdits = false) {
    const t = Number(mode === 'target' ? targetText : minText);
    if (!Number.isFinite(t) || t <= 1) { setErr('Enter odds greater than 1.'); return; }
    if (mode === 'range' && !(Number(maxText) > Number(minText))) { setErr('Max odds must be greater than min odds.'); return; }
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/ai/alternatives?${qs(n)}`);
      const j = await r.json();
      if (!j.ok) { setErr(j.error ?? `HTTP ${r.status}`); return; }
      setRes(j);
      if (!keepEdits) { setLocal({}); setOpen({}); setToast({}); }
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  const rows: Row[] = useMemo(() => {
    if (!res) return [];
    const base = res.slips.map((s) => ({
      id: s.id,
      picks: local[s.id]?.picks ?? s.pickIds.map((id) => res.pickIndex[id]).filter(Boolean),
      swapped: Boolean(local[s.id]),
      diff: s.diffFromFirst,
    }));
    const key = {
      order: () => 0,
      odds: (a: Row, b: Row) => oddsOf(b.picks) - oddsOf(a.picks),
      fit: (a: Row, b: Row) => avgFit(b.picks) - avgFit(a.picks),
      legs: (a: Row, b: Row) => b.picks.length - a.picks.length,
      diff: (a: Row & { diff: number }, b: Row & { diff: number }) => b.diff - a.diff,
    }[sort];
    return sort === 'order' ? base : [...base].sort(key as never);
  }, [res, local, sort]);

  const loc = (r: Row): Local => local[r.id] ?? { picks: r.picks, history: [], seen: [], locked: [], picked: [], note: null };
  const patch = (r: Row, p: Partial<Local>) => setLocal((m) => ({ ...m, [r.id]: { ...loc(r), ...p } }));
  const say = (id: string, t: string) => setToast((m) => ({ ...m, [id]: t }));

  async function add(r: Row, replace: boolean) {
    const picks = loc(r).picks;
    const n = replace ? picks.length : Math.max(1, Math.floor(Number(addN[r.id] ?? picks.length)) || picks.length);
    if (replace && slip.legs.length > 0 && !window.confirm('Replace the legs currently on your betslip with this slip?')) return;
    say(r.id, 'Checking latest odds…');
    const reval = await revalidate(picks.map((p) => p.id));
    const out = planAdd(picks, replace ? emptySlip() : slip, n, reval ?? undefined);
    setSlip(out.slip);
    const extra = reval ? '' : ' (odds could not be re-checked)';
    const why = out.report.skipped.slice(0, 3).map((s) => `${s.label}: ${s.reason}`).join(' · ');
    say(r.id, `${describeReport(out.report)}${extra}${why ? ` ${why}` : ''}`);
  }

  async function swap(r: Row, mode: 'weakest' | 'picked') {
    const l = loc(r);
    const body = {
      pickIds: l.picks.map((p) => p.id), lockedGameIds: l.locked, excludeIds: [...l.seen, ...l.picks.map((p) => p.id)],
      leagues, scope, strict, tier,
      ...(mode === 'weakest' ? { weakest: Math.max(1, Number(swapN) || 1) } : { replaceIds: l.picked }),
      band: res?.band,
    };
    if (mode === 'picked' && l.picked.length === 0) { patch(r, { note: 'Tick the legs you want swapped first.' }); return; }
    try {
      const resp = await fetch('/api/ai/swap', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = await resp.json();
      if (!j.ok) { patch(r, { note: j.error ?? `HTTP ${resp.status}` }); return; }
      const swaps = j.swaps as { out: AiPick; in: AiPick }[];
      const inBand = res ? j.totalOdds >= res.band.min && j.totalOdds <= res.band.max : true;
      patch(r, {
        picks: j.picks, history: [...l.history, l.picks], seen: [...l.seen, ...swaps.map((s) => s.in.id)], picked: [],
        note: `${swaps.map((s) => `${s.out.home} v ${s.out.away}: ${s.out.marketKey.replace(/_/g, ' ')} @${s.out.odds.toFixed(2)} → ${s.in.marketKey.replace(/_/g, ' ')} @${s.in.odds.toFixed(2)} (fit ${s.out.fitScore.toFixed(2)} → ${s.in.fitScore.toFixed(2)})`).join(' · ')}${inBand ? '' : ' · total odds now outside your range'}`,
      });
    } catch (e) { patch(r, { note: e instanceof Error ? e.message : String(e) }); }
  }

  const undo = (r: Row) => { const l = loc(r); const prev = l.history[l.history.length - 1]; if (prev) patch(r, { picks: prev, history: l.history.slice(0, -1), note: 'Undid the last swap.' }); };
  const tog = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div>
      <form className="mb-4 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4" onSubmit={(e) => { e.preventDefault(); void generate(Math.min(500, Math.max(1, Number(count) || 50))); }}>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <span className="mr-1">Odds</span>
          <button type="button" className={`rounded-full border px-3 py-1 text-xs ${mode === 'target' ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-white/10 text-slate-400'}`} onClick={() => setMode('target')}>Around a target</button>
          <button type="button" className={`rounded-full border px-3 py-1 text-xs ${mode === 'range' ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-white/10 text-slate-400'}`} onClick={() => setMode('range')}>Within a range</button>
        </div>
        {mode === 'target' ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
            <input className={`${INPUT} w-24`} inputMode="decimal" value={targetText} onChange={(e) => setTargetText(digits(e.target.value))} aria-label="Target odds" />
            <select className={INPUT} value={tol} onChange={(e) => setTol(e.target.value)} aria-label="Tolerance">
              <option value="0.05">± 5%</option><option value="0.1">± 10%</option><option value="0.2">± 20%</option>
            </select>
            {PRESETS.map((p) => <button key={p} type="button" className="rounded border border-white/10 px-2 py-1 text-xs text-slate-300 hover:border-white/30" onClick={() => setTargetText(String(p))}>{p}</button>)}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
            <input className={`${INPUT} w-24`} inputMode="decimal" value={minText} onChange={(e) => setMinText(digits(e.target.value))} aria-label="Minimum odds" />
            <span>to</span>
            <input className={`${INPUT} w-24`} inputMode="decimal" value={maxText} onChange={(e) => setMaxText(digits(e.target.value))} aria-label="Maximum odds" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <label>Bookmaker <select className={INPUT} value={bookmaker} onChange={(e) => setBookmaker(e.target.value)}><option value="">Auto (largest pool)</option><option value="sportybet">SportyBet</option><option value="betpawa">betPawa</option></select></label>
          <label>Swaps <select className={INPUT} value={scope} onChange={(e) => setScope(e.target.value as 'any' | 'same_market')}><option value="any">Across any market</option><option value="same_market">Same market only</option></select></label>
          <label>Pool <select className={INPUT} value={tier} onChange={(e) => setTier(e.target.value as 'higher')}><option value="higher">All tiers</option><option value="average">Safe + Balanced</option><option value="lower">Safe only</option></select></label>
          <label>Legs that must differ <input className={`${INPUT} w-14`} inputMode="numeric" value={minDiff} onChange={(e) => setMinDiff(e.target.value.replace(/\D/g, '').slice(0, 2))} /></label>
          <label>How many <input className={`${INPUT} w-16`} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, '').slice(0, 3))} /></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} /> Swaps must be strictly better</label>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-emerald" disabled={loading}>{loading ? 'Generating…' : 'Generate alternatives'}</button>
          {leagues.length > 0 && <span className="text-xs text-slate-400">Using {leagues.length} selected leagues</span>}
        </div>
      </form>

      {err && <p className="mb-3 text-sm text-red-300" role="alert">{err}</p>}

      {res && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-slate-200" role="status">
              {res.count} slips · {res.band.min.toFixed(0)}–{res.band.max.toFixed(0)} odds · {res.bookmaker ?? 'no bookmaker'} · {res.poolSize} picks in pool
            </span>
            <label className="ml-auto text-xs text-slate-400">Sort <select className={INPUT} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="order">Generated order</option><option value="odds">Highest odds</option><option value="fit">Best average fit</option><option value="legs">Most legs</option><option value="diff">Most different</option></select></label>
          </div>
          {res.message && <p className="mb-3 text-sm text-amber-300">{res.message}</p>}
          {res.count === 0 && !res.message && <p className="text-sm text-slate-400">No slips could be built.</p>}

          <div className="space-y-2">
            {rows.map((r, i) => {
              const l = loc(r);
              const total = oddsOf(l.picks);
              const isOpen = Boolean(open[r.id]);
              return (
                <article key={r.id} className="glass rounded-xl border border-white/10 p-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-xs text-slate-500">#{i + 1}</span>
                    <span className="font-display text-xl font-bold text-gold-400">{total.toFixed(2)}</span>
                    <span className="text-xs text-slate-400">{l.picks.length} legs · fit {avgFit(l.picks).toFixed(2)} · {l.picks.filter((p) => p.evaluation.label === 'Verified').length} Verified{r.swapped ? ' · edited' : ''}</span>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      <input className={`${INPUT} h-8 w-12 text-xs`} inputMode="numeric" aria-label="How many legs to add" value={addN[r.id] ?? String(l.picks.length)} onChange={(e) => setAddN((m) => ({ ...m, [r.id]: e.target.value.replace(/\D/g, '').slice(0, 2) }))} />
                      <button type="button" className="btn-emerald h-8 px-3 py-0 text-xs" onClick={() => void add(r, false)}>Add N to betslip</button>
                      <button type="button" className="btn-ghost h-8 px-3 py-0 text-xs" onClick={() => void add(r, true)}>Load as betslip</button>
                      <button type="button" className="text-xs text-cyan-400 hover:underline" onClick={() => setOpen((m) => ({ ...m, [r.id]: !m[r.id] }))}>{isOpen ? 'Hide legs' : 'Legs & swaps'}</button>
                    </div>
                  </div>
                  {toast[r.id] && <p className="mt-1 text-xs text-amber-200" role="status">{toast[r.id]}</p>}
                  {isOpen && (
                    <div className="mt-2 border-t border-white/5 pt-2">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                        <button type="button" className="btn-ghost h-7 px-2 py-0 text-xs" onClick={() => void swap(r, 'weakest')}>Swap weakest</button>
                        <input className={`${INPUT} h-7 w-10 text-xs`} inputMode="numeric" aria-label="How many weakest legs" value={swapN} onChange={(e) => setSwapN(e.target.value.replace(/\D/g, '').slice(0, 2))} />
                        <button type="button" className="btn-ghost h-7 px-2 py-0 text-xs" onClick={() => void swap(r, 'picked')}>Swap ticked</button>
                        <button type="button" className="btn-ghost h-7 px-2 py-0 text-xs" disabled={l.history.length === 0} onClick={() => undo(r)}>Undo</button>
                        <span className="text-slate-500">🔒 keeps a game through every swap · ☐ marks it for “Swap ticked”</span>
                      </div>
                      {l.note && <p className="mb-2 text-xs text-slate-300" role="status">{l.note}</p>}
                      <ul className="max-h-72 space-y-1 overflow-y-auto text-xs text-slate-300">
                        {l.picks.map((p) => (
                          <li key={p.id} className="flex items-center gap-2 border-b border-white/5 py-1">
                            <input type="checkbox" aria-label={`Select ${p.home} v ${p.away} for swapping`} checked={l.picked.includes(p.id)} onChange={() => patch(r, { picked: tog(l.picked, p.id) })} />
                            <button type="button" title="Lock this game" aria-pressed={l.locked.includes(p.gameId)} className={l.locked.includes(p.gameId) ? '' : 'opacity-30'} onClick={() => patch(r, { locked: tog(l.locked, p.gameId) })}>🔒</button>
                            <span className="flex-1">{p.home} vs {p.away} · {p.marketKey.replace(/_/g, ' ')} <span className="text-slate-500">· {p.league ?? 'Unknown league'} · {p.evaluation.label} · fit {p.fitScore.toFixed(2)}</span></span>
                            <span className="text-gold-400">{p.odds.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-3">
            {!res.exhausted && res.count < 500 && (
              <button type="button" className="btn-ghost" disabled={loading} onClick={() => { const n = Math.min(500, res.count + 50); setCount(String(n)); void generate(n, true); }}>
                {loading ? 'Loading…' : 'Load 50 more'}
              </button>
            )}
            <span className="text-xs text-slate-500">{res.exhausted ? 'Pool exhausted: no more qualifying slips with these settings.' : res.count >= 500 ? 'Reached the 500 slip cap.' : 'More are available.'}</span>
          </div>
        </>
      )}
    </div>
  );
}

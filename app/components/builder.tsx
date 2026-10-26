'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MarketSelector, PickRow } from '@/lib/filters.ts';
import { aiPickToRow } from '@/lib/ai-rows.ts';
import type { AiPick } from '@/lib/ai-picks.ts';
import { GOAL_LINES_FALLBACK, cardsToRules, defaultCards } from '@/lib/market-cards.ts';
import { randomPicks } from '@/lib/random-picks.ts';
import {
  MAX_LEGS, addLeg, addMany, emptySlip, greyMarket, marketsInSlip, removeFromMarket, removeLeg, slipBookmaker, slipTotals, toggleGrey, type Slip,
} from '@/lib/slip.ts';
import type { ErrorDetails } from '@/lib/result.ts';
import { BOOKMAKER_LABEL, type Bookmaker, type MarketKind } from '@/lib/types.ts';
import { useAuth } from './auth-context';
import { CodegenPanel } from './codegen-panel';
import { GameCard } from './game-card';
import { useStoredSlip } from './use-slips';
import { HealthBanner } from './health-banner';
import { MarketFilters } from './market-filters';

type GamesOk = {
  ok: true; runId: string; dataAsOf: string; count: number;
  options: { leagues: string[]; bookmakers: Bookmaker[]; markets: { kind: MarketKind; lines: number[] }[] };
  errors: { bookmaker: Bookmaker; error: string; httpStatus?: number }[];
  rows: PickRow[];
};
type GamesState = { status: 'loading' } | { status: 'error'; error: string; httpStatus: number; details: ErrorDetails } | { status: 'ok'; data: GamesOk };

const KIND_LABEL: Record<MarketKind, string> = { '1x2': '1X2', double_chance: 'Double chance', over_under: 'Over/Under', btts: 'Both teams to score' };
const WITHIN: { label: string; hours: number | null }[] = [
  { label: 'Any time (next 7 days)', hours: null }, { label: 'Next 6 hours', hours: 6 }, { label: 'Next 12 hours', hours: 12 },
  { label: 'Next 24 hours', hours: 24 }, { label: 'Next 48 hours', hours: 48 }, { label: 'Next 3 days', hours: 72 },
];
const GAME_RENDER_CAP = 60;

const fmtKickoff = (ms: number) => new Date(ms).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const marketLabel = (s: MarketSelector) => `${KIND_LABEL[s.kind]}${s.line !== undefined ? ` ${s.line}` : ''}`;

export function Builder({ heading }: { heading?: string }) {
  const { user } = useAuth();
  const [bookmaker, setBookmaker] = useState<Bookmaker>('sportybet');
  const [leagues, setLeagues] = useState<string[]>([]);
  const [withinHours, setWithinHours] = useState<number | null>(null);
  const [cards, setCards] = useState(defaultCards);
  const [options, setOptions] = useState<GamesOk['options'] | null>(null);
  const [games, setGames] = useState<GamesState>({ status: 'loading' });
  const [slip, setSlip, slipReady] = useStoredSlip();
  const [showAvailable, setShowAvailable] = useState(true);
  const [showStaging, setShowStaging] = useState(true);
  const [notice, setNotice] = useState<{ tone: 'info' | 'warn'; text: string } | null>(null);
  const [randomCount, setRandomCount] = useState('5');
  const [removeCount, setRemoveCount] = useState('1');
  const [toolMarket, setToolMarket] = useState('');
  const reqId = useRef(0);

  // The Leagues list is a native <details>: close it on an outside click or Escape.
  const leaguesRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const d = leaguesRef.current;
      if (d?.open && !d.contains(e.target as Node)) d.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && leaguesRef.current?.open) leaguesRef.current.open = false;
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Picks added from the AI Picks page may be from either bookmaker: open the Builder on the slip's bookmaker.
  const syncedBookmaker = useRef(false);
  useEffect(() => {
    if (!slipReady || syncedBookmaker.current) return;
    syncedBookmaker.current = true;
    const b = slipBookmaker(slip);
    if (b) setBookmaker(b);
  }, [slipReady, slip]);

  // The market cards become the rules the API filters by. Serialised once so the effect below only reruns on a real change.
  const rulesKey = useMemo(() => JSON.stringify(cardsToRules(cards)), [cards]);

  // Live-updating pool: refetch (debounced) whenever a filter changes.
  useEffect(() => {
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setGames({ status: 'loading' });
    const t = setTimeout(async () => {
      const q = new URLSearchParams({ bookmaker });
      if (leagues.length) q.set('leagues', leagues.join(','));
      if (withinHours !== null) { q.set('dateFrom', String(Date.now())); q.set('dateTo', String(Date.now() + withinHours * 3_600_000)); }
      q.set('rules', rulesKey);
      try {
        const r = await fetch(`/api/games?${q}`, { signal: ctrl.signal });
        const j = await r.json().catch(() => null);
        if (id !== reqId.current) return;
        if (j && j.ok) { setGames({ status: 'ok', data: j }); setOptions(j.options); }
        else setGames({ status: 'error', error: j?.error ?? `Request failed (HTTP ${r.status})`, httpStatus: r.status, details: j?.details ?? {} });
      } catch (e) {
        if (ctrl.signal.aborted || id !== reqId.current) return;
        setGames({ status: 'error', error: `Request failed: ${e instanceof Error ? e.message : String(e)}`, httpStatus: 0, details: {} });
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [bookmaker, leagues, withinHours, rulesKey]);

  const inSlip = useMemo(() => new Set(slip.legs.map((l) => l.gameId)), [slip.legs]);
  const pool = useMemo(() => (games.status === 'ok' ? games.data.rows.filter((r) => !inSlip.has(r.gameId)) : []), [games, inSlip]);
  const byGame = useMemo(() => {
    if (pool.length === 0) return [];
    const map = new Map<string, PickRow[]>();
    for (const r of pool) {
      const arr = map.get(r.gameId);
      if (arr) arr.push(r); else map.set(r.gameId, [r]);
    }
    return [...map.values()].sort((a, b) => a[0].kickoff - b[0].kickoff);
  }, [pool]);
  const goalLines = useMemo(() => {
    const lines = options?.markets.find((m) => m.kind === 'over_under')?.lines ?? [];
    return lines.length ? lines : GOAL_LINES_FALLBACK;
  }, [options]);
  const totals = slipTotals(slip);
  const activeLegs = slip.legs.filter((l) => !slip.greyed.includes(l.gameId));
  const slipMarkets = marketsInSlip(slip);
  const toolSel = slipMarkets.find((m) => m.key === toolMarket) ?? slipMarkets[0];

  function chooseBookmaker(b: Bookmaker) {
    if (b === bookmaker) return;
    if (slip.legs.length > 0 && !window.confirm(`Switching to ${BOOKMAKER_LABEL[b]} clears your slip (odds are never mixed across bookmakers). Continue?`)) return;
    setSlip(emptySlip()); setLeagues([]); setNotice(null); setBookmaker(b);
  }

  function add(row: PickRow) {
    const r = addLeg(slip, row);
    if (r.ok) { setSlip(r.slip); setNotice(null); } else setNotice({ tone: 'warn', text: r.error });
  }

  function addRandom() {
    const n = Number(randomCount);
    const r = randomPicks(pool, n);
    if (!r.ok) { setNotice({ tone: 'warn', text: r.error }); return; }
    const res = addMany(slip, r.picks);
    setSlip(res.slip);
    const short = r.available < r.requested ? ` Only ${r.available} game${r.available === 1 ? '' : 's'} available in the current pool.` : '';
    const refused = res.refused.length ? ` ${res.refused.length} refused: ${res.refused.map((x) => x.reason).join('; ')}.` : '';
    setNotice({ tone: short || refused ? 'warn' : 'info', text: `Added ${res.added} random pick${res.added === 1 ? '' : 's'} (requested ${r.requested}).${short}${refused}` });
  }

  async function addWithAi() {
    const n = Number(randomCount);
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      setNotice({ tone: 'warn', text: 'Count must be a whole number from 1 to 50.' });
      return;
    }
    setNotice({ tone: 'info', text: 'Loading AI picks…' });
    try {
      const q = new URLSearchParams({ limit: String(n + 20) });
      if (bookmaker) q.set('bookmaker', bookmaker);
      const r = await fetch(`/api/ai/picks?${q}`);
      const j = await r.json();
      if (!j.ok) {
        setNotice({ tone: 'warn', text: j.error ?? `AI picks failed (HTTP ${r.status})` });
        return;
      }
      const inSlipIds = new Set(slip.legs.map((l) => l.gameId));
      const aiRows = (j.picks as AiPick[])
        .filter((p) => p.bookmaker === bookmaker && !inSlipIds.has(p.gameId))
        .map(aiPickToRow)
        .filter((row): row is PickRow => row !== null)
        .slice(0, n);
      if (aiRows.length === 0) {
        setNotice({ tone: 'warn', text: 'No AI picks match your filters. Try widening filters or regenerating AI after a games refresh.' });
        return;
      }
      const res = addMany(slip, aiRows);
      setSlip(res.slip);
      const short = aiRows.length < n ? ` Only ${aiRows.length} of ${n} AI picks matched the current bookmaker and slip.` : '';
      setNotice({
        tone: short ? 'warn' : 'info',
        text: `Added ${res.added} AI pick${res.added === 1 ? '' : 's'} (Verified / Best fit from stored pool).${short}`,
      });
    } catch (e) {
      setNotice({ tone: 'warn', text: e instanceof Error ? e.message : String(e) });
    }
  }


  async function saveCurrentSlip() {
    if (slip.legs.length === 0) {
      setNotice({ tone: 'warn', text: 'Slip is empty.' });
      return;
    }
    const b = slipBookmaker(slip);
    if (!b) {
      setNotice({ tone: 'warn', text: 'Slip has no bookmaker.' });
      return;
    }
    const totalsNow = slipTotals(slip);
    const totalOdds = totalsNow.totalOdds.ok ? totalsNow.totalOdds.total : slip.legs.reduce((a, l) => a * l.odds, 1);
    const combinedImplied = totalsNow.combined.ok ? totalsNow.combined.probability : null;
    const payload = {
      name: `${b} · ${slip.legs.length} legs · ${totalOdds.toFixed(2)}`,
      bookmaker: b,
      legs: slip.legs,
      totalOdds,
      combinedImplied,
    };
    try {
      const r = await fetch('/api/slips/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      // Always mirror to localStorage for Saved Slips page
      try {
        const key = 'lb_saved_slips_v1';
        const prev = JSON.parse(localStorage.getItem(key) || '[]');
        const entry = j.ok && j.slip ? j.slip : { id: `local-${Date.now()}`, ...payload, createdAt: Date.now(), shared: false, userId: null };
        const next = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 50);
        localStorage.setItem(key, JSON.stringify(next));
      } catch { /* ignore quota */ }
      if (!j.ok) {
        setNotice({ tone: 'warn', text: j.error ? `Saved locally only: ${j.error}` : 'Saved locally only.' });
      } else {
        setNotice({ tone: 'info', text: 'Slip saved. Open Saved Slips from the menu.' });
      }
    } catch (e) {
      setNotice({ tone: 'warn', text: e instanceof Error ? e.message : String(e) });
    }
  }

  function removeN() {

    if (!toolSel) return;
    const r = removeFromMarket(slip, toolSel.selector, Number(removeCount));
    if (!r.ok) { setNotice({ tone: 'warn', text: r.error }); return; }
    setSlip(r.slip);
    setNotice({ tone: r.removed < r.requested ? 'warn' : 'info', text: `Removed ${r.removed} of ${r.requested} requested from ${marketLabel(toolSel.selector)}. They are back in Available Games.` });
  }

  const greyedInTool = toolSel ? slip.legs.filter((l) => `${l.marketKind}:${l.line ?? ''}` === toolSel.key).every((l) => slip.greyed.includes(l.gameId)) : false;

  return (
    <section className="mx-auto max-w-6xl px-4">
      {heading && <h1 className="font-display text-2xl font-bold text-white">{heading}</h1>}
      <div className="mt-2"><HealthBanner /></div>

      <div className="glass relative z-20 mt-4 space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-400">Bookmaker</span>
          {(['sportybet', 'betpawa'] as Bookmaker[]).map((b) => (
            <button key={b} className={bookmaker === b ? 'btn-emerald' : 'btn-ghost'} aria-pressed={bookmaker === b} onClick={() => chooseBookmaker(b)}>{BOOKMAKER_LABEL[b]}</button>
          ))}
          <span className="ml-auto flex gap-2">
            <button className={showAvailable ? 'btn-emerald' : 'btn-ghost'} aria-pressed={showAvailable} onClick={() => setShowAvailable((v) => !v)}>Available Games</button>
            <button className={showStaging ? 'btn-emerald' : 'btn-ghost'} aria-pressed={showStaging} onClick={() => setShowStaging((v) => !v)}>Staging Area</button>
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">Kickoff
            <select className="field mt-1" value={withinHours ?? ''} onChange={(e) => setWithinHours(e.target.value === '' ? null : Number(e.target.value))}>
              {WITHIN.map((w) => <option key={w.label} value={w.hours ?? ''}>{w.label}</option>)}
            </select>
          </label>
          <details ref={leaguesRef} className="relative text-xs text-slate-400">
            <summary className="field mt-5 cursor-pointer list-none text-slate-200">Leagues{leagues.length ? ` (${leagues.length})` : ''} ▾</summary>
            <div className="glass absolute left-0 top-full z-50 mt-1 max-h-64 w-72 max-w-full overflow-auto bg-navy-900 p-2 shadow-xl backdrop-blur-none">
              {!options ? <p className="p-2">Loading…</p> : options.leagues.length === 0 ? <p className="p-2">No leagues in the data.</p> : (
                <>
                  <button className="mb-1 text-emerald-400 underline" onClick={() => setLeagues([])}>Clear</button>
                  {options.leagues.map((l) => (
                    <label key={l} className="flex items-center gap-2 px-1 py-1 text-slate-200">
                      <input type="checkbox" checked={leagues.includes(l)} onChange={() => setLeagues((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]))} />{l}
                    </label>
                  ))}
                </>
              )}
            </div>
          </details>
        </div>
      </div>

      <MarketFilters cards={cards} onChange={setCards} goalLines={goalLines} qualifying={games.status === 'ok' ? byGame.length : null} />

      {notice && (
        <p className={`mt-3 rounded-lg border px-3 py-2 text-sm ${notice.tone === 'warn' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`} role="status">{notice.text}</p>
      )}

      <div className={`mt-4 grid gap-4 ${showAvailable && showStaging ? 'lg:grid-cols-2' : ''}`}>
        {showAvailable && (
          <div className="glass p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold text-white">Available Games</h2>
              <span className="text-sm text-slate-300" aria-live="polite">{games.status === 'ok' ? `${byGame.length} game${byGame.length === 1 ? '' : 's'}` : '…'}</span>
            </div>
            {games.status === 'ok' && <p className="text-xs text-slate-500">Data as of {new Date(games.data.dataAsOf).toLocaleString()}</p>}

            {games.status === 'loading' && <p className="mt-6 text-center text-sm text-slate-400">Loading games…</p>}
            {games.status === 'error' && (
              <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200" role="alert">
                <p className="font-semibold">{games.error}</p>
                {games.httpStatus > 0 && <p className="mt-1 text-xs text-red-300">HTTP {games.httpStatus}{games.details.upstream ? ` · ${games.details.upstream}` : ''}</p>}
                {games.details.bodySnippet && <p className="mt-1 break-all font-mono text-[11px] text-red-300/80">{games.details.bodySnippet}</p>}
              </div>
            )}
            {games.status === 'ok' && pool.length === 0 && (
              <p className="mt-6 text-center text-sm text-slate-400">{games.data.count === 0 ? 'No games match these filters.' : 'Every matching game is already in your slip.'}</p>
            )}
            {games.status === 'ok' && pool.length > 0 && (
              <>
                <ul className="mt-3 space-y-3 max-h-[36rem] overflow-auto">
                  {byGame.slice(0, GAME_RENDER_CAP).map((rows) => {
                    const g = rows[0];
                    return (
                      <li key={g.gameId}><GameCard rows={rows} onAdd={add} /></li>
                    );
                  })}
                </ul>
                {byGame.length > GAME_RENDER_CAP && <p className="mt-2 text-xs text-amber-300">Showing the first {GAME_RENDER_CAP} of {byGame.length} games. Narrow the filters to see the rest.</p>}
              </>
            )}
          </div>
        )}

        {showStaging && (
          <div className="space-y-4">
            <div className="glass p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-lg font-bold text-white">Staging Area</h2>
                <span className="text-sm text-slate-300">{slip.legs.length}/{MAX_LEGS} legs</span>
              </div>

              {slip.legs.length === 0 ? <p className="mt-6 text-center text-sm text-slate-400">Your slip is empty. Tap a game on the left to add it.</p> : (
                <ul className="mt-3 max-h-80 divide-y divide-white/5 overflow-auto">
                  {slip.legs.map((l) => {
                    const grey = slip.greyed.includes(l.gameId);
                    return (
                      <li key={l.gameId} className={`flex items-center gap-2 py-2 ${grey ? 'opacity-40' : ''}`}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-white">{l.home} v {l.away}</span>
                          <span className="block text-xs text-slate-400">{l.pick} · {fmtKickoff(l.kickoff)}{l.implied !== null ? ` · implied ${(l.implied * 100).toFixed(1)}%` : ''}</span>
                        </span>
                        <span className="odds">{l.odds.toFixed(2)}</span>
                        <button className="btn-ghost px-2 py-1 text-xs" aria-pressed={grey} onClick={() => setSlip(toggleGrey(slip, l.gameId))}>{grey ? 'Restore' : 'Grey'}</button>
                        <button className="btn-ghost px-2 py-1 text-xs" aria-label={`Remove ${l.home} v ${l.away}`} onClick={() => setSlip(removeLeg(slip, l.gameId))}>✕</button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {slip.legs.length > 0 && (
                <dl className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-400">Total odds ({totals.activeCount} active{totals.greyedCount ? `, ${totals.greyedCount} greyed` : ''})</dt>
                    <dd className="odds text-lg">{totals.totalOdds.ok ? totals.totalOdds.total.toFixed(2) : '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Combined implied probability</dt>
                    <dd className="text-slate-200">{totals.combined.ok ? `${(totals.combined.probability * 100).toFixed(2)}%` : 'unavailable'}</dd></div>
                  <p className="text-[11px] text-slate-500">{totals.combined.ok
                    ? 'Product of each leg\'s margin-free implied probability. It describes the bookmaker\'s pricing, not a prediction.'
                    : totals.combined.reason}</p>
                </dl>
              )}
            </div>

            <div className="glass space-y-3 p-4 text-sm">
              <p className="font-semibold text-white">Slip tools</p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-slate-400">Add N games
                  <input className="field mt-1 w-20" inputMode="numeric" value={randomCount} onChange={(e) => setRandomCount(e.target.value.replace(/\D/g, ''))} />
                </label>
                {user ? (
                  <>
                    <button className="btn-gold" disabled={games.status !== 'ok'} onClick={() => void addWithAi()}>Add with AI</button>
                    <button className="btn-ghost" disabled={games.status !== 'ok' || pool.length === 0} onClick={addRandom}>Add random</button>
                  </>
                ) : (
                  <button className="btn-gold" disabled={games.status !== 'ok' || pool.length === 0} onClick={addRandom}>Add random picks</button>
                )}
              </div>
              {!user && <p className="text-[11px] text-slate-500">Guests get random picks from the filtered pool. These are not recommendations.</p>}

              <div className="flex flex-wrap items-end gap-2 border-t border-white/10 pt-3">
                <label className="text-xs text-slate-400">Market in slip
                  <select className="field mt-1" disabled={slipMarkets.length === 0} value={toolSel?.key ?? ''} onChange={(e) => setToolMarket(e.target.value)}>
                    {slipMarkets.length === 0 ? <option value="">No legs yet</option> : slipMarkets.map((m) => <option key={m.key} value={m.key}>{marketLabel(m.selector)} ({m.count})</option>)}
                  </select>
                </label>
                <label className="text-xs text-slate-400">Remove N
                  <input className="field mt-1 w-20" inputMode="numeric" value={removeCount} onChange={(e) => setRemoveCount(e.target.value.replace(/\D/g, ''))} />
                </label>
                <button className="btn-ghost" disabled={!toolSel} onClick={removeN}>Remove N games</button>
                <button className="btn-ghost" disabled={!toolSel} onClick={() => toolSel && setSlip(greyMarket(slip, toolSel.selector, !greyedInTool))}>{greyedInTool ? 'Restore market' : 'Grey out market'}</button>
                <button className="btn-gold" disabled={slip.legs.length === 0} onClick={() => void saveCurrentSlip()}>Save slip</button>
                <button className="btn-ghost" disabled={slip.legs.length === 0} onClick={() => { setSlip(emptySlip()); setNotice(null); }}>Clear slip</button>
              </div>
            </div>

            <CodegenPanel legs={activeLegs} sourceBookmaker={(() => { const b = slipBookmaker(slip); return b ? BOOKMAKER_LABEL[b] : null; })()} />
          </div>
        )}
      </div>
    </section>
  );
}

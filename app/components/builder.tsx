'use client';
import { parseLeagues } from '@/lib/pick-filter.ts';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MarketSelector, PickRow } from '@/lib/filters.ts';
import { aiPickToRow } from '@/lib/ai-rows.ts';
import type { AiPick } from '@/lib/ai-picks.ts';
import { GOAL_LINES_FALLBACK, cardsToRules, defaultCards } from '@/lib/market-cards.ts';
import { randomPicks } from '@/lib/random-picks.ts';
import {
  MAX_LEGS, addLeg, addMany, emptySlip, greyMarket, marketsInSlip, removeFromMarket, removeLeg, slipBookmaker, slipTotals, toggleGrey,
} from '@/lib/slip.ts';
import type { ErrorDetails } from '@/lib/result.ts';
import { BOOKMAKER_LABEL, type Bookmaker, type MarketKind } from '@/lib/types.ts';
import { useAuth } from './auth-context';
import { CodegenPanel } from './codegen-panel';
import { GameCard } from './game-card';
import { useStoredSlip } from './use-slips';
import { HealthBanner } from './health-banner';
import { MarketFilters } from './market-filters';
import { ZeroDataBanner } from './zero-data-banner';
import { onTemplateApplied, getLocalTemplates, type FilterTemplate } from '@/lib/template-store.ts';
import {
  filterAiPicksByTemplate,
  buildTemplateTargetOdds,
  buildTemplatePicksN,
  buildTemplateAiAcca,
  templateSummary,
} from '@/lib/template-ai.ts';
import type { TargetTier } from '@/lib/ai-picks.ts';
import { getClientSettings, getClientAiHeaders } from '@/lib/client-settings.ts';
import { LeagueChecklist, type LeagueItem } from './league-checklist';

type GamesOk = {
  ok: true; runId: string; dataAsOf: string; count: number;
  unfiltered?: { games: number; rows: number };
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
  /** Same grouped list the Active Leagues tab shows (Big Five, Second Tier European, ...). null = not loaded / failed. */
  const [leagueList, setLeagueList] = useState<LeagueItem[] | null>(null);
  /** true = ignore every filter and show the full market list for all upcoming games. */
  const [bypass, setBypass] = useState(false);
  const [withinHours, setWithinHours] = useState<number | null>(null);
  const [cards, setCards] = useState(defaultCards);
  const [options, setOptions] = useState<GamesOk['options'] | null>(null);
  const [games, setGames] = useState<GamesState>({ status: 'loading' });
  const [slip, setSlip, slipReady] = useStoredSlip();
  const [notice, setNotice] = useState<{ tone: 'info' | 'warn'; text: string } | null>(null);
  const [randomCount, setRandomCount] = useState('5');
  const [removeCount, setRemoveCount] = useState('1');
  const [toolMarket, setToolMarket] = useState('');
  const [legsCollapsed, setLegsCollapsed] = useState(false);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const [codegenCollapsed, setCodegenCollapsed] = useState(false);
  const [aiTemplateId, setAiTemplateId] = useState<string>('');
  const [targetOddsInput, setTargetOddsInput] = useState<string>('20');
  const [targetGamesInput, setTargetGamesInput] = useState<string>('5');
  const [aiTimeframe, setAiTimeframe] = useState<string>('template');
  const [targetTier, setTargetTier] = useState<TargetTier>('average');
  const [isAddingAi, setIsAddingAi] = useState<boolean>(false);
  const [templates, setTemplates] = useState<FilterTemplate[]>([]);
  const reqId = useRef(0);

  // Load available templates
  useEffect(() => {
    setTemplates(getLocalTemplates());
  }, []);

  // Leagues ticked on the Leagues page arrive as ?leagues=
  useEffect(() => {
    const fromUrl = parseLeagues(new URLSearchParams(window.location.search).get('leagues'));
    if (fromUrl.length) setLeagues(fromUrl);
  }, []);

  // Sync when template is applied via Navigation or Market Filters
  useEffect(() => {
    return onTemplateApplied((tpl) => {
      if (tpl.bookmaker) setBookmaker(tpl.bookmaker);
      if (tpl.withinHours !== undefined) setWithinHours(tpl.withinHours);
      if (tpl.leagues) setLeagues(tpl.leagues);
      if (tpl.cards) setCards(tpl.cards);
    });
  }, []);

  // Load the grouped league list for the chosen bookmaker (same source as the Active Leagues tab).
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/leagues?bookmaker=${bookmaker}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => setLeagueList(j?.ok && Array.isArray(j.leagues) && j.leagues.length ? (j.leagues as LeagueItem[]) : null))
      .catch(() => { if (!ctrl.signal.aborted) setLeagueList(null); });
    return () => ctrl.abort();
  }, [bookmaker]);

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

  // The market cards become the rules the API filters by.
  const rulesKey = useMemo(() => JSON.stringify(cardsToRules(cards)), [cards]);

  // Live-updating pool: refetch (debounced) whenever a filter changes.
  useEffect(() => {
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setGames({ status: 'loading' });
    const t = setTimeout(async () => {
      const q = new URLSearchParams({ bookmaker });
      if (!bypass) {
        if (leagues.length) q.set('leagues', leagues.join(','));
        if (withinHours !== null) { q.set('dateFrom', String(Date.now())); q.set('dateTo', String(Date.now() + withinHours * 3_600_000)); }
        q.set('rules', rulesKey);
      }
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
  }, [bookmaker, leagues, withinHours, rulesKey, bypass]);

  // Touching any filter means the user wants their filters back.
  useEffect(() => { setBypass(false); }, [leagues, withinHours, rulesKey]);

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

  const shownGames = useMemo(() => (games.status === 'ok' ? new Set(games.data.rows.map((r) => r.gameId)).size : 0), [games]);
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
    setIsAddingAi(true);
    setNotice({ tone: 'info', text: 'Loading AI picks…' });
    const clientSettings = getClientSettings();
    const timeoutMs = (clientSettings.timeoutSeconds || 35) * 1000;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const q = new URLSearchParams({ limit: '100' });
      const r = await fetch(`/api/ai/picks?${q}`, {
        headers: getClientAiHeaders(clientSettings),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const j = await r.json();
      if (!j.ok) {
        setNotice({ tone: 'warn', text: j.error ?? `AI picks failed (HTTP ${r.status})` });
        setIsAddingAi(false);
        return;
      }

      // Determine template to use
      const chosenTemplate: FilterTemplate = aiTemplateId
        ? (templates.find((t) => t.id === aiTemplateId) ?? {
            id: 'active',
            name: 'Active Filters',
            bookmaker,
            withinHours,
            leagues,
            cards,
            createdAt: Date.now(),
          })
        : {
            id: 'active',
            name: 'Active Screen Filters',
            bookmaker,
            withinHours,
            leagues,
            cards,
            createdAt: Date.now(),
          };

      // Check bookmaker compatibility with current slip
      if (slip.legs.length > 0 && slipBookmaker(slip) !== chosenTemplate.bookmaker) {
        const proceed = window.confirm(
          `Picks in "${chosenTemplate.name}" are for ${BOOKMAKER_LABEL[chosenTemplate.bookmaker]}, but your slip has ${BOOKMAKER_LABEL[slipBookmaker(slip)!]} picks. Clear slip and proceed?`,
        );
        if (!proceed) {
          setIsAddingAi(false);
          setNotice(null);
          return;
        }
        setSlip(emptySlip());
      }

      const inSlipIds = new Set(slip.legs.map((l) => l.gameId));
      const allAiPicks = (j.picks as AiPick[]).filter((p) => !inSlipIds.has(p.gameId));

      const parsedOdds = targetOddsInput.trim() ? Number.parseFloat(targetOddsInput) : null;
      const parsedGames = targetGamesInput.trim() ? Number.parseInt(targetGamesInput, 10) : null;

      if (parsedOdds !== null && (!Number.isFinite(parsedOdds) || parsedOdds <= 1)) {
        setNotice({ tone: 'warn', text: 'Target odds must be a number greater than 1 (e.g. 10 or 25.5).' });
        setIsAddingAi(false);
        return;
      }

      if (parsedGames !== null && (!Number.isInteger(parsedGames) || parsedGames < 1 || parsedGames > 50)) {
        setNotice({ tone: 'warn', text: 'Target games count must be an integer between 1 and 50.' });
        setIsAddingAi(false);
        return;
      }

      const parsedTimeframe =
        aiTimeframe === 'template'
          ? (chosenTemplate.withinHours ?? null)
          : aiTimeframe === 'any'
            ? null
            : Number(aiTimeframe);

      const res = buildTemplateAiAcca(allAiPicks, chosenTemplate, {
        targetOdds: parsedOdds,
        targetGamesCount: parsedGames,
        withinHours: parsedTimeframe,
        tier: targetTier,
        excludedGameIds: inSlipIds,
      });

      if (!res.picks || res.picks.length === 0) {
        setNotice({
          tone: 'warn',
          text: res.message ?? `No picks in "${chosenTemplate.name}" matched your criteria. Try widening odds, timeframe, or selecting another risk tier.`,
        });
        setIsAddingAi(false);
        return;
      }

      const rows = res.picks
        .map(aiPickToRow)
        .filter((row): row is PickRow => row !== null);

      if (rows.length === 0) {
        setNotice({ tone: 'warn', text: 'Selected picks could not be added to the slip.' });
        setIsAddingAi(false);
        return;
      }

      const addRes = addMany(slip, rows);
      setSlip(addRes.slip);
      const oddsNote = `reaching ${res.totalOdds.toFixed(2)}x total odds`;
      const targetNote = parsedOdds ? ` (target was ${parsedOdds.toFixed(1)}x)` : '';
      const timeNote = parsedTimeframe ? ` · <${parsedTimeframe}h` : '';
      setNotice({
        tone: 'info',
        text: `Added ${addRes.added} AI picks from "${chosenTemplate.name}" ${oddsNote}${targetNote}${timeNote}.`,
      });
    } catch (e: unknown) {
      clearTimeout(timer);
      const err = e as Error;
      if (err.name === 'AbortError') {
        setNotice({ tone: 'warn', text: `AI request timed out after ${clientSettings.timeoutSeconds || 35}s. Verify upstream keys in Settings.` });
      } else {
        setNotice({ tone: 'warn', text: err.message || String(e) });
      }
    } finally {
      setIsAddingAi(false);
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
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">Kickoff
            <select className="field mt-1" value={withinHours ?? ''} onChange={(e) => setWithinHours(e.target.value === '' ? null : Number(e.target.value))}>
              {WITHIN.map((w) => <option key={w.label} value={w.hours ?? ''}>{w.label}</option>)}
            </select>
          </label>
          <details ref={leaguesRef} className="relative text-xs text-slate-400">
            <summary className="field mt-5 cursor-pointer list-none text-slate-200">Leagues{leagues.length ? ` (${leagues.length})` : ''} ▾</summary>
            <div className="glass absolute left-0 top-full z-50 mt-1 max-h-[70vh] w-[min(24rem,90vw)] overflow-auto bg-navy-900 p-2 shadow-xl backdrop-blur-none">
              {!options ? <p className="p-2">Loading…</p> : options.leagues.length === 0 ? <p className="p-2">No leagues in the data.</p> : leagueList ? (
                <LeagueChecklist leagues={leagueList} selected={leagues} onChange={setLeagues} compact />
              ) : (
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

      {/* Main Content: Available Games & Static Active Betslip */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2 items-start">
        {/* Available Games Column with anchor target */}
        <div id="available-games" className="glass p-4 scroll-mt-20">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-bold text-white">Available Games</h2>
            <span className="text-sm text-slate-300" aria-live="polite">{games.status === 'ok' ? `${byGame.length} game${byGame.length === 1 ? '' : 's'}` : '…'}</span>
          </div>
          {games.status === 'ok' && <p className="text-xs text-slate-500">Data as of {new Date(games.data.dataAsOf).toLocaleString()}</p>}

          {games.status === 'ok' && bypass && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100" role="status">
              <span>Filters bypassed: showing all {shownGames} upcoming game{shownGames === 1 ? '' : 's'} with their full market list. Your filter settings are kept.</span>
              <button type="button" className="btn-ghost ml-auto h-7 px-2.5 py-0 text-xs" onClick={() => setBypass(false)}>Back to my filters</button>
            </div>
          )}

          {games.status === 'loading' && <p className="mt-6 text-center text-sm text-slate-400">Loading games…</p>}
          {games.status === 'error' && (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200" role="alert">
              <p className="font-semibold">{games.error}</p>
              {games.httpStatus > 0 && <p className="mt-1 text-xs text-red-300">HTTP {games.httpStatus}{games.details.upstream ? ` · ${games.details.upstream}` : ''}</p>}
              {games.details.bodySnippet && <p className="mt-1 break-all font-mono text-[11px] text-red-300/80">{games.details.bodySnippet}</p>}
            </div>
          )}
          {games.status === 'ok' && pool.length === 0 && (
            games.data.count === 0 ? (
              <div className="mt-4">
                <ZeroDataBanner
                  bookmaker={bookmaker}
                  leaguesCount={leagues.length}
                  withinHours={withinHours}
                  activeCardsCount={Object.values(cards).filter((c) => c.on).length}
                  onResetFilters={() => {
                    setWithinHours(null);
                    setLeagues([]);
                    setCards(defaultCards);
                  }}
                  onSwitchBookmaker={(b) => chooseBookmaker(b)}
                  onRefreshCompleted={() => {
                    setBookmaker((b) => b);
                  }}
                />
              </div>
            ) : (
              <p className="mt-6 text-center text-sm text-slate-400">Every matching game is already in your slip.</p>
            )
          )}
          {games.status === 'ok' && pool.length > 0 && (
            <>
              <ul className="mt-3 space-y-3 max-h-[36rem] overflow-auto">
                {byGame.slice(0, GAME_RENDER_CAP).map((rows) => {
                  const g = rows[0];
                  return (
                    <li key={g.gameId}>
                      <GameCard
                        rows={rows}
                        onAdd={add}
                      />
                    </li>
                  );
                })}
              </ul>
              {byGame.length > GAME_RENDER_CAP && (
                <p className="mt-2 text-xs text-amber-300">
                  Showing the first {GAME_RENDER_CAP} of {byGame.length} games. Narrow the filters to see the rest.
                </p>
              )}
            </>
          )}
        </div>

        {/* Static Active Betslip Column (Normal document flow, no sticky/floating) */}
        <div id="slip-panel" className="space-y-4">
          <div className="glass p-4 transition-all">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-white">Active Betslip</h2>
                <span className="text-sm text-slate-300">
                  {slip.legs.length}/{MAX_LEGS} legs
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLegsCollapsed((c) => !c)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  {legsCollapsed ? '▼ Expand Legs' : '▲ Collapse Legs'}
                </button>
              </div>
            </div>

            {slip.legs.length === 0 ? (
              <p className="mt-6 text-center text-sm text-slate-400">
                Your slip is empty. Tap + on any game or outcome to add it.
              </p>
            ) : (
              !legsCollapsed && (
                <ul className="mt-3 max-h-80 divide-y divide-white/5 overflow-auto">
                  {slip.legs.map((l) => {
                    const grey = slip.greyed.includes(l.gameId);
                    return (
                      <li key={l.gameId} className={`flex items-center gap-2 py-2 ${grey ? 'opacity-40' : ''}`}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-white">{l.home} v {l.away}</span>
                          <span className="block text-xs text-slate-400">
                            {l.pick} · {fmtKickoff(l.kickoff)}
                            {l.implied !== null ? ` · implied ${(l.implied * 100).toFixed(1)}%` : ''}
                          </span>
                        </span>
                        <span className="odds">{l.odds.toFixed(2)}</span>
                        <button
                          className="btn-ghost px-2 py-1 text-xs"
                          aria-pressed={grey}
                          onClick={() => setSlip(toggleGrey(slip, l.gameId))}
                        >
                          {grey ? 'Restore' : 'Grey'}
                        </button>
                        <button
                          className="btn-ghost px-2 py-1 text-xs"
                          aria-label={`Remove ${l.home} v ${l.away}`}
                          onClick={() => setSlip(removeLeg(slip, l.gameId))}
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )
            )}

            {slip.legs.length > 0 && (
              <dl className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm">
                <div className="flex justify-between items-center">
                  <dt className="text-slate-400">
                    Total odds ({totals.activeCount} active{totals.greyedCount ? `, ${totals.greyedCount} greyed` : ''})
                  </dt>
                  <dd className="odds text-lg">
                    {totals.totalOdds.ok ? totals.totalOdds.total.toFixed(2) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-slate-400">Combined implied probability</dt>
                  <dd className="text-slate-200">
                    {totals.combined.ok ? `${(totals.combined.probability * 100).toFixed(2)}%` : 'unavailable'}
                  </dd>
                </div>
                <p className="text-[11px] text-slate-500">
                  {totals.combined.ok
                    ? "Product of each leg's margin-free implied probability. It describes the bookmaker's pricing, not a prediction."
                    : totals.combined.reason}
                </p>
              </dl>
            )}
          </div>

          {/* Slip Tools Subcomponent (Collapsible) */}
          <div className="glass space-y-3 p-4 text-sm transition-all">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white">Slip Tools & Batch Actions</p>
              <button
                type="button"
                onClick={() => setToolsCollapsed((c) => !c)}
                className="text-xs text-slate-400 hover:text-white"
              >
                {toolsCollapsed ? '▼ Expand Tools' : '▲ Collapse Tools'}
              </button>
            </div>

            {!toolsCollapsed && (
              <div className="space-y-3.5">
                {/* AI & Filter Template Accumulator Section */}
                <div className="rounded-xl border border-gold-500/30 bg-gradient-to-br from-gold-500/10 via-navy-900/60 to-navy-950 p-3.5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-display text-sm font-bold text-gold-300">
                      ⚡ AI Picks from Template
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      Target & Batch
                    </span>
                  </div>

                  {/* Template Picker */}
                  <div className="mt-2.5 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="font-medium">Filter Template:</span>
                      <span className="text-[11px] text-slate-500">
                        {aiTemplateId ? templates.find((t) => t.id === aiTemplateId)?.bookmaker : bookmaker}
                      </span>
                    </div>
                    <select
                      className="field w-full text-xs py-1.5"
                      value={aiTemplateId}
                      onChange={(e) => setAiTemplateId(e.target.value)}
                    >
                      <option value="">Current Active Screen Filters</option>
                      <optgroup label="Default Filter Templates">
                        {templates.filter((t) => t.isDefault).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({BOOKMAKER_LABEL[t.bookmaker]})
                          </option>
                        ))}
                      </optgroup>
                      {templates.some((t) => !t.isDefault) && (
                        <optgroup label="My Saved Templates">
                          {templates.filter((t) => !t.isDefault).map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({BOOKMAKER_LABEL[t.bookmaker]})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {/* Summary pill */}
                    <p className="truncate text-[11px] text-cyan-400/80">
                      {templateSummary(
                        aiTemplateId
                          ? (templates.find((t) => t.id === aiTemplateId) ?? {
                              id: 'active',
                              name: 'Active',
                              bookmaker,
                              withinHours,
                              leagues,
                              cards,
                              createdAt: 0,
                            })
                          : {
                              id: 'active',
                              name: 'Active',
                              bookmaker,
                              withinHours,
                              leagues,
                              cards,
                              createdAt: 0,
                            },
                        aiTimeframe !== 'template' ? (aiTimeframe === 'any' ? null : Number(aiTimeframe)) : undefined,
                      )}
                    </p>
                  </div>

                  {/* AI Timeframe Selector */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="font-medium">AI Picks Timeframe:</span>
                      <span className="text-[11px] text-cyan-400 font-mono">
                        {aiTimeframe === 'template' ? 'From Template' : aiTimeframe === 'any' ? 'Any time' : `<${aiTimeframe}h`}
                      </span>
                    </div>
                    <select
                      className="field w-full text-xs py-1.5"
                      value={aiTimeframe}
                      onChange={(e) => setAiTimeframe(e.target.value)}
                    >
                      <option value="template">From Template Default</option>
                      <option value="2">Next 2 hours (Kickoff soon)</option>
                      <option value="6">Next 6 hours</option>
                      <option value="12">Next 12 hours</option>
                      <option value="24">Next 24 hours (Today)</option>
                      <option value="48">Next 48 hours (Next 2 days)</option>
                      <option value="72">Next 3 days (This weekend)</option>
                      <option value="any">Any time (Next 7 days)</option>
                    </select>
                  </div>

                  {/* Target Odds & Target Games (Both Optional) */}
                  <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-white/10 pt-3">
                    {/* Target Total Odds (Optional) */}
                    <div className="space-y-1.5 rounded-lg bg-black/25 p-2.5 border border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-slate-300">
                          Target Odds <span className="text-slate-500 font-normal">(optional)</span>
                        </label>
                        {targetOddsInput && (
                          <button
                            type="button"
                            onClick={() => setTargetOddsInput('')}
                            className="text-[10px] text-slate-400 hover:text-white"
                            title="Clear target odds"
                          >
                            ✕ Clear
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={targetOddsInput}
                          onChange={(e) => {
                            const t = e.target.value.replace(/[^\d.]/g, '');
                            setTargetOddsInput(t.slice(0, 7));
                          }}
                          className="field h-7 w-full text-right text-xs font-bold text-gold-400"
                          placeholder="e.g. 20.0"
                        />
                        <span className="text-xs font-bold text-slate-400">x</span>
                      </div>
                      {/* Presets */}
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {['5', '10', '20', '50', '100'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setTargetOddsInput(preset)}
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-mono transition ${
                              targetOddsInput === preset
                                ? 'border-gold-500 bg-gold-500/25 text-gold-300'
                                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {preset}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Target Games Count (Optional) */}
                    <div className="space-y-1.5 rounded-lg bg-black/25 p-2.5 border border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-slate-300">
                          Number of Games <span className="text-slate-500 font-normal">(optional)</span>
                        </label>
                        {targetGamesInput && (
                          <button
                            type="button"
                            onClick={() => setTargetGamesInput('')}
                            className="text-[10px] text-slate-400 hover:text-white"
                            title="Clear game count"
                          >
                            ✕ Clear
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={targetGamesInput}
                          onChange={(e) => setTargetGamesInput(e.target.value.replace(/\D/g, '').slice(0, 2))}
                          className="field h-7 w-full text-right text-xs font-bold text-cyan-300"
                          placeholder="e.g. 5"
                        />
                        <span className="text-xs text-slate-400">legs</span>
                      </div>
                      {/* Presets */}
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {['3', '5', '8', '10', '15'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setTargetGamesInput(preset)}
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-mono transition ${
                              targetGamesInput === preset
                                ? 'border-cyan-500 bg-cyan-500/25 text-cyan-300'
                                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Risk Profile Selection */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Risk Profile:</span>
                    <div className="flex gap-1">
                      {(['lower', 'average', 'higher'] as const).map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => setTargetTier(tier)}
                          className={`rounded border px-2 py-0.5 text-[10px] font-medium transition ${
                            targetTier === tier
                              ? 'border-gold-500 bg-gold-500/20 text-gold-300'
                              : 'border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {tier === 'lower' ? 'Safe' : tier === 'average' ? 'Balanced' : 'Value'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Generation CTA */}
                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn-gold flex-1 py-2 text-xs font-bold shadow-md hover:brightness-110 transition"
                      disabled={isAddingAi}
                      onClick={() => void addWithAi()}
                    >
                      {isAddingAi
                        ? '⚡ Generating…'
                        : targetOddsInput.trim() && targetGamesInput.trim()
                          ? `⚡ Add ~${targetOddsInput}x AI Acca (${targetGamesInput} games)`
                          : targetOddsInput.trim()
                            ? `⚡ Add ~${targetOddsInput}x AI Acca`
                            : targetGamesInput.trim()
                              ? `⚡ Add ${targetGamesInput} AI Picks`
                              : '⚡ Add Top AI Picks from Template'}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost py-2 text-xs"
                      disabled={games.status !== 'ok' || pool.length === 0}
                      onClick={addRandom}
                      title="Add random picks from current pool without AI"
                    >
                      Add Random
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-2 border-t border-white/10 pt-3">
                  <label className="text-xs text-slate-400">
                    Market in slip
                    <select
                      className="field mt-1"
                      disabled={slipMarkets.length === 0}
                      value={toolSel?.key ?? ''}
                      onChange={(e) => setToolMarket(e.target.value)}
                    >
                      {slipMarkets.length === 0 ? (
                        <option value="">No legs yet</option>
                      ) : (
                        slipMarkets.map((m) => (
                          <option key={m.key} value={m.key}>
                            {marketLabel(m.selector)} ({m.count})
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  <label className="text-xs text-slate-400">
                    Remove N
                    <input
                      className="field mt-1 w-20"
                      inputMode="numeric"
                      value={removeCount}
                      onChange={(e) => setRemoveCount(e.target.value.replace(/\D/g, ''))}
                    />
                  </label>
                  <button className="btn-ghost" disabled={!toolSel} onClick={removeN}>
                    Remove N games
                  </button>
                  <button
                    className="btn-ghost"
                    disabled={!toolSel}
                    onClick={() => toolSel && setSlip(greyMarket(slip, toolSel.selector, !greyedInTool))}
                  >
                    {greyedInTool ? 'Restore market' : 'Grey out market'}
                  </button>
                  <button className="btn-gold" disabled={slip.legs.length === 0} onClick={() => void saveCurrentSlip()}>
                    Save slip
                  </button>
                  <button
                    className="btn-ghost"
                    disabled={slip.legs.length === 0}
                    onClick={() => {
                      setSlip(emptySlip());
                      setNotice(null);
                    }}
                  >
                    Clear slip
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Booking Code Generation (Collapsible) */}
          <div className="glass p-4 transition-all">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-300">Bookmaker Code Generator</p>
              <button
                type="button"
                onClick={() => setCodegenCollapsed((c) => !c)}
                className="text-xs text-slate-400 hover:text-white"
              >
                {codegenCollapsed ? '▼ Expand Code Gen' : '▲ Collapse Code Gen'}
              </button>
            </div>
            {!codegenCollapsed && (
              <CodegenPanel
                legs={activeLegs}
                sourceBookmaker={(() => {
                  const b = slipBookmaker(slip);
                  return b ? BOOKMAKER_LABEL[b] : null;
                })()}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

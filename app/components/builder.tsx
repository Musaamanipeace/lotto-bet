'use client';
import { parseLeagues } from '@/lib/pick-filter.ts';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { PickRow } from '@/lib/filters.ts';
import { aiPickToRow } from '@/lib/ai-rows.ts';
import type { AiPick, TargetTier } from '@/lib/ai-picks.ts';
import { GOAL_LINES_FALLBACK, cardsToRules, defaultCards } from '@/lib/market-cards.ts';
import { randomPicks } from '@/lib/random-picks.ts';
import {
  addLeg,
  addMany,
  defaultSlipName,
  emptySlip,
  slipBookmaker,
  slipTotals,
  type Slip,
} from '@/lib/slip.ts';
import type { ErrorDetails } from '@/lib/result.ts';
import { BOOKMAKER_LABEL, type Bookmaker, type MarketKind } from '@/lib/types.ts';
import { upsertLocalSavedSlip } from '@/lib/saved-slips.ts';
import { useAuth } from './auth-context';
import { GameCard } from './game-card';
import { useStoredSlip } from './use-slips';
import { HealthBanner } from './health-banner';
import { MarketFilters } from './market-filters';
import { ZeroDataBanner } from './zero-data-banner';
import { onTemplateApplied, onTemplatesChanged, getLocalTemplates, type FilterTemplate } from '@/lib/template-store.ts';
import { buildTemplateAiAcca } from '@/lib/template-ai.ts';
import { getClientSettings, getClientAiHeaders, hasSubmittedByok, onSettingsChanged } from '@/lib/client-settings.ts';
import type { LeagueItem } from './league-checklist';

type GamesOk = {
  ok: true;
  runId: string;
  dataAsOf: string;
  count: number;
  unfiltered?: { games: number; rows: number };
  options: { leagues: string[]; bookmakers: Bookmaker[]; markets: { kind: MarketKind; lines: number[] }[] };
  errors: { bookmaker: Bookmaker; error: string; httpStatus?: number }[];
  rows: PickRow[];
};

type GamesState =
  | { status: 'loading' }
  | { status: 'error'; error: string; httpStatus: number; details: ErrorDetails }
  | { status: 'ok'; data: GamesOk };

export function Builder({ heading }: { heading?: string }) {
  const { user } = useAuth();
  const [bookmaker, setBookmaker] = useState<Bookmaker>('sportybet');
  const [leagues, setLeagues] = useState<string[]>([]);
  const [leagueList, setLeagueList] = useState<LeagueItem[] | null>(null);
  const [bypass, setBypass] = useState(false);
  const [withinHours, setWithinHours] = useState<number | null>(null);
  const [cards, setCards] = useState(defaultCards);
  const [options, setOptions] = useState<GamesOk['options'] | null>(null);
  const [games, setGames] = useState<GamesState>({ status: 'loading' });
  const [slip, setSlip, slipReady] = useStoredSlip();
  const [toast, setToast] = useState<{ tone: 'info' | 'warn'; text: string } | null>(null);

  // Task 8: Games Carousel state (collapsible, expanded by default, preserves index)
  const [gamesExpanded, setGamesExpanded] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Task 10: Add-to-slip chooser state when an active slip already exists
  const [pendingPick, setPendingPick] = useState<PickRow | null>(null);

  // AI & Random Tools state
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const [randomCount, setRandomCount] = useState('5');
  const [aiTemplateId, setAiTemplateId] = useState<string>('');
  const [targetOddsInput, setTargetOddsInput] = useState<string>('20');
  const [targetGamesInput, setTargetGamesInput] = useState<string>('5');
  const [aiTimeframe, setAiTimeframe] = useState<string>('template');
  const [targetTier, setTargetTier] = useState<TargetTier>('average');
  const [isAddingAi, setIsAddingAi] = useState<boolean>(false);
  const [byokReady, setByokReady] = useState<boolean>(false);
  const [templates, setTemplates] = useState<FilterTemplate[]>([]);
  const reqId = useRef(0);

  useEffect(() => {
    if (!user) {
      setByokReady(false);
      return;
    }
    setByokReady(hasSubmittedByok());
    return onSettingsChanged((s) => setByokReady(hasSubmittedByok(s)));
  }, [user]);

  const showToast = useCallback((tone: 'info' | 'warn', text: string) => {
    setToast({ tone, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setTemplates(getLocalTemplates());
    return onTemplatesChanged((next) => setTemplates(next));
  }, [user]);

  useEffect(() => {
    const fromUrl = parseLeagues(new URLSearchParams(window.location.search).get('leagues'));
    if (fromUrl.length) setLeagues(fromUrl);
  }, []);

  useEffect(() => {
    return onTemplateApplied((tpl) => {
      if (tpl.bookmaker) setBookmaker(tpl.bookmaker);
      setWithinHours(tpl.withinHours !== undefined ? tpl.withinHours : null);
      setLeagues(Array.isArray(tpl.leagues) ? [...tpl.leagues] : []);
      if (tpl.cards) setCards(tpl.cards);
    });
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/leagues?bookmaker=${bookmaker}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) =>
        setLeagueList(j?.ok && Array.isArray(j.leagues) && j.leagues.length ? (j.leagues as LeagueItem[]) : null),
      )
      .catch(() => {
        if (!ctrl.signal.aborted) setLeagueList(null);
      });
    return () => ctrl.abort();
  }, [bookmaker]);

  const syncedBookmaker = useRef(false);
  useEffect(() => {
    if (!slipReady || syncedBookmaker.current) return;
    syncedBookmaker.current = true;
    const b = slipBookmaker(slip);
    if (b) setBookmaker(b);
  }, [slipReady, slip]);

  const rulesKey = useMemo(() => JSON.stringify(cardsToRules(cards)), [cards]);

  useEffect(() => {
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setGames({ status: 'loading' });
    const t = setTimeout(async () => {
      const q = new URLSearchParams({ bookmaker });
      if (!bypass) {
        if (leagues.length) q.set('leagues', leagues.join(','));
        if (withinHours !== null) {
          q.set('dateFrom', String(Date.now()));
          q.set('dateTo', String(Date.now() + withinHours * 3_600_000));
        }
        q.set('rules', rulesKey);
      }
      try {
        const r = await fetch(`/api/games?${q}`, { signal: ctrl.signal });
        const j = await r.json().catch(() => null);
        if (id !== reqId.current) return;
        if (j && j.ok) {
          setGames({ status: 'ok', data: j });
          setOptions(j.options);
        } else {
          setGames({
            status: 'error',
            error: j?.error ?? `Request failed (HTTP ${r.status})`,
            httpStatus: r.status,
            details: j?.details ?? {},
          });
        }
      } catch (e) {
        if (ctrl.signal.aborted || id !== reqId.current) return;
        setGames({
          status: 'error',
          error: `Request failed: ${e instanceof Error ? e.message : String(e)}`,
          httpStatus: 0,
          details: {},
        });
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [bookmaker, leagues, withinHours, rulesKey, bypass]);

  useEffect(() => {
    setBypass(false);
  }, [leagues, withinHours, rulesKey]);

  const inSlip = useMemo(() => new Set(slip.legs.map((l) => l.gameId)), [slip.legs]);
  const pool = useMemo(
    () => (games.status === 'ok' ? games.data.rows.filter((r) => !inSlip.has(r.gameId)) : []),
    [games, inSlip],
  );
  const byGame = useMemo(() => {
    if (pool.length === 0) return [];
    const map = new Map<string, PickRow[]>();
    for (const r of pool) {
      const arr = map.get(r.gameId);
      if (arr) arr.push(r);
      else map.set(r.gameId, [r]);
    }
    return [...map.values()].sort((a, b) => a[0].kickoff - b[0].kickoff);
  }, [pool]);

  // Clamp carouselIndex if the filtered game count shrinks
  useEffect(() => {
    if (byGame.length > 0 && carouselIndex >= byGame.length) {
      setCarouselIndex(byGame.length - 1);
    }
  }, [byGame.length, carouselIndex]);

  // Restore scroll position when expanding the collapsible section (Task 8)
  useEffect(() => {
    if (gamesExpanded && carouselRef.current && byGame.length > 0) {
      const el = carouselRef.current;
      const width = el.clientWidth;
      if (width > 0) {
        el.scrollTo({ left: carouselIndex * width, behavior: 'instant' as ScrollBehavior });
      }
    }
  }, [gamesExpanded, byGame.length]);

  const scrollToSlide = useCallback(
    (nextIdx: number) => {
      if (byGame.length === 0) return;
      const clamped = Math.max(0, Math.min(nextIdx, byGame.length - 1));
      setCarouselIndex(clamped);
      const el = carouselRef.current;
      if (el && el.clientWidth > 0) {
        el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
      }
    },
    [byGame.length],
  );

  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el || el.clientWidth <= 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx >= 0 && idx < byGame.length && idx !== carouselIndex) {
      setCarouselIndex(idx);
    }
  };

  const handleCarouselKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollToSlide(carouselIndex - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollToSlide(carouselIndex + 1);
    }
  };

  const goalLines = useMemo(() => {
    const lines = options?.markets.find((m) => m.kind === 'over_under')?.lines ?? [];
    return lines.length ? lines : GOAL_LINES_FALLBACK;
  }, [options]);

  const shownGames = useMemo(
    () => (games.status === 'ok' ? new Set(games.data.rows.map((r) => r.gameId)).size : 0),
    [games],
  );

  function chooseBookmaker(b: Bookmaker) {
    if (b === bookmaker) return;
    if (
      slip.legs.length > 0 &&
      !window.confirm(
        `Switching to ${BOOKMAKER_LABEL[b]} clears your active slip (odds are never mixed across bookmakers). Continue?`,
      )
    ) {
      return;
    }
    setSlip(emptySlip());
    setLeagues([]);
    setToast(null);
    setCarouselIndex(0);
    setBookmaker(b);
  }

  /**
   * Auto-saves a slip to the server (`/api/slips/save`) and user-scoped localStorage (Task 10).
   */
  const autoPersistSlip = useCallback(
    async (targetSlip: Slip): Promise<Slip> => {
      const b = slipBookmaker(targetSlip);
      if (!b || targetSlip.legs.length === 0) return targetSlip;
      // Unsigned-in users only use the active working slip in localStorage (no account slip saving)
      if (!user) {
        const updatedGuest: Slip = {
          ...targetSlip,
          id: targetSlip.id || `guest-${Date.now()}`,
          name: targetSlip.name || defaultSlipName(),
        };
        setSlip(updatedGuest);
        return updatedGuest;
      }
      const totalsNow = slipTotals(targetSlip);
      const totalOdds = totalsNow.totalOdds.ok
        ? totalsNow.totalOdds.total
        : targetSlip.legs.reduce((a, l) => a * l.odds, 1);
      const combinedImplied = totalsNow.combined.ok ? totalsNow.combined.probability : null;
      const name = targetSlip.name || defaultSlipName();

      const payload = {
        id: targetSlip.id,
        name,
        bookmaker: b,
        legs: targetSlip.legs,
        totalOdds,
        combinedImplied,
      };

      try {
        const r = await fetch('/api/slips/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const j = await r.json().catch(() => null);
        const saved =
          j?.ok && j.slip
            ? j.slip
            : {
                ...payload,
                id: targetSlip.id || `saved-${Date.now()}`,
                userId: user?.id ?? null,
                createdAt: Date.now(),
                shared: false,
              };
        upsertLocalSavedSlip(saved);
        const updated: Slip = { ...targetSlip, id: saved.id, name: saved.name };
        setSlip(updated);
        return updated;
      } catch {
        const fallback = {
          ...payload,
          id: targetSlip.id || `saved-${Date.now()}`,
          userId: user?.id ?? null,
          createdAt: Date.now(),
          shared: false,
        };
        upsertLocalSavedSlip(fallback);
        const updated: Slip = { ...targetSlip, id: fallback.id, name: fallback.name };
        setSlip(updated);
        return updated;
      }
    },
    [setSlip, user?.id],
  );

  /**
   * Task 10: Add-to-slip behaviour:
   * - Prevent duplicate selections of the same game and market.
   * - If no active slip exists (`slip.legs.length === 0`), create one automatically with a default name
   *   (e.g. "Slip 8 Nov, 14:32") and save it immediately.
   * - If an active slip exists, show chooser: "Add to current slip" or "New slip".
   */
  function handleRequestAdd(row: PickRow) {
    // Check duplicate selection in active slip first
    const existing = slip.legs.find((l) => l.gameId === row.gameId);
    if (existing) {
      if (existing.marketKind === row.marketKind && existing.pick === row.pick) {
        showToast('warn', `Duplicate selection: ${row.home} v ${row.away} (${row.pick}) is already in your slip.`);
      } else {
        showToast('warn', `${row.home} v ${row.away} already has a pick (${existing.pick}) in your active slip.`);
      }
      return;
    }

    // No active slip -> auto-create named slip and save immediately
    if (slip.legs.length === 0) {
      const name = defaultSlipName();
      const created: Slip = {
        id: `saved-${Date.now()}`,
        name,
        legs: [row],
        greyed: [],
      };
      setSlip(created);
      void autoPersistSlip(created);
      showToast('info', `Created & saved "${name}" — added ${row.home} v ${row.away} (${row.pick} @${row.odds.toFixed(2)}).`);
      return;
    }

    // Active slip exists -> open chooser ("Add to current slip" or "New slip")
    setPendingPick(row);
  }

  function handleConfirmAddToCurrent() {
    if (!pendingPick) return;
    const row = pendingPick;
    setPendingPick(null);
    const r = addLeg(slip, row);
    if (!r.ok) {
      showToast('warn', r.error);
      return;
    }
    const namedSlip: Slip = {
      ...r.slip,
      id: slip.id || `saved-${Date.now()}`,
      name: slip.name || defaultSlipName(),
    };
    setSlip(namedSlip);
    void autoPersistSlip(namedSlip);
    showToast(
      'info',
      `Added ${row.home} v ${row.away} (${row.pick} @${row.odds.toFixed(2)}) to "${namedSlip.name}".`,
    );
  }

  function handleConfirmCreateNewSlip() {
    if (!pendingPick) return;
    const row = pendingPick;
    setPendingPick(null);
    const name = defaultSlipName();
    const freshSlip: Slip = {
      id: `saved-${Date.now()}`,
      name,
      legs: [row],
      greyed: [],
    };
    setSlip(freshSlip);
    setBookmaker(row.bookmaker);
    void autoPersistSlip(freshSlip);
    showToast(
      'info',
      `Created new slip "${name}" with ${row.home} v ${row.away} (${row.pick} @${row.odds.toFixed(2)}).`,
    );
  }

  function addRandom() {
    const n = Number(randomCount);
    const r = randomPicks(pool, n);
    if (!r.ok) {
      showToast('warn', r.error);
      return;
    }
    const base: Slip =
      slip.legs.length === 0
        ? { id: `saved-${Date.now()}`, name: defaultSlipName(), legs: [], greyed: [] }
        : { ...slip, id: slip.id || `saved-${Date.now()}`, name: slip.name || defaultSlipName() };
    const res = addMany(base, r.picks);
    const nextSlip: Slip = { ...res.slip, id: base.id, name: base.name };
    setSlip(nextSlip);
    void autoPersistSlip(nextSlip);
    const short =
      r.available < r.requested
        ? ` Only ${r.available} game${r.available === 1 ? '' : 's'} available in the current pool.`
        : '';
    const refused = res.refused.length
      ? ` ${res.refused.length} refused: ${res.refused.map((x) => x.reason).join('; ')}.`
      : '';
    showToast(
      short || refused ? 'warn' : 'info',
      `Added ${res.added} random pick${res.added === 1 ? '' : 's'} to "${nextSlip.name}".${short}${refused}`,
    );
  }

  async function addWithAi() {
    const clientSettings = getClientSettings();
    if (!hasSubmittedByok(clientSettings)) {
      showToast('warn', 'Please submit your own API key (BYOK) in Menu ▾ → Settings before using AI picks.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('lb-open-settings'));
      }
      return;
    }

    setIsAddingAi(true);
    showToast('info', 'Loading AI picks…');
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
        showToast('warn', j.error ?? `AI picks failed (HTTP ${r.status})`);
        setIsAddingAi(false);
        return;
      }

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

      let workingSlip = slip;
      if (workingSlip.legs.length > 0 && slipBookmaker(workingSlip) !== chosenTemplate.bookmaker) {
        const proceed = window.confirm(
          `Picks in "${chosenTemplate.name}" are for ${BOOKMAKER_LABEL[chosenTemplate.bookmaker]}, but your slip has ${BOOKMAKER_LABEL[slipBookmaker(workingSlip)!]} picks. Clear slip and proceed?`,
        );
        if (!proceed) {
          setIsAddingAi(false);
          return;
        }
        workingSlip = emptySlip();
      }

      const inSlipIds = new Set(workingSlip.legs.map((l) => l.gameId));
      const allAiPicks = (j.picks as AiPick[]).filter((p) => !inSlipIds.has(p.gameId));

      const parsedOdds = targetOddsInput.trim() ? Number.parseFloat(targetOddsInput) : null;
      const parsedGames = targetGamesInput.trim() ? Number.parseInt(targetGamesInput, 10) : null;

      if (parsedOdds !== null && (!Number.isFinite(parsedOdds) || parsedOdds <= 1)) {
        showToast('warn', 'Target odds must be a number greater than 1 (e.g. 10 or 25.5).');
        setIsAddingAi(false);
        return;
      }

      if (parsedGames !== null && (!Number.isInteger(parsedGames) || parsedGames < 1 || parsedGames > 50)) {
        showToast('warn', 'Target games count must be an integer between 1 and 50.');
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
        showToast(
          'warn',
          res.message ??
            `No picks in "${chosenTemplate.name}" matched your criteria. Try widening odds, timeframe, or selecting another risk tier.`,
        );
        setIsAddingAi(false);
        return;
      }

      const rows = res.picks.map(aiPickToRow).filter((row): row is PickRow => row !== null);
      if (rows.length === 0) {
        showToast('warn', 'Selected picks could not be added to the slip.');
        setIsAddingAi(false);
        return;
      }

      const base: Slip =
        workingSlip.legs.length === 0
          ? { id: `saved-${Date.now()}`, name: defaultSlipName(), legs: [], greyed: [] }
          : { ...workingSlip, id: workingSlip.id || `saved-${Date.now()}`, name: workingSlip.name || defaultSlipName() };

      const addRes = addMany(base, rows);
      const nextSlip: Slip = { ...addRes.slip, id: base.id, name: base.name };
      setSlip(nextSlip);
      void autoPersistSlip(nextSlip);

      const oddsNote = `reaching ${res.totalOdds.toFixed(2)}x total odds`;
      const targetNote = parsedOdds ? ` (target was ${parsedOdds.toFixed(1)}x)` : '';
      const timeNote = parsedTimeframe ? ` · <${parsedTimeframe}h` : '';
      showToast(
        'info',
        `Added ${addRes.added} AI picks from "${chosenTemplate.name}" to "${nextSlip.name}" ${oddsNote}${targetNote}${timeNote}.`,
      );
    } catch (e: unknown) {
      clearTimeout(timer);
      const err = e as Error;
      if (err.name === 'AbortError') {
        showToast('warn', `AI request timed out after ${clientSettings.timeoutSeconds || 35}s.`);
      } else {
        showToast('warn', err.message || String(e));
      }
    } finally {
      setIsAddingAi(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pb-10">
      {heading && <h1 className="font-display text-2xl font-bold text-white">{heading}</h1>}
      <div className="mt-2">
        <HealthBanner />
      </div>

      {/* Task 9: Single Unified Filter Bar (Bookmaker + Time Period + Leagues + Market Cards) */}
      <MarketFilters
        bookmaker={bookmaker}
        onBookmakerChange={chooseBookmaker}
        withinHours={withinHours}
        onWithinHoursChange={setWithinHours}
        leagues={leagues}
        onLeaguesChange={setLeagues}
        availableLeagues={options?.leagues ?? null}
        leagueList={leagueList}
        cards={cards}
        onChange={setCards}
        goalLines={goalLines}
        qualifying={games.status === 'ok' ? byGame.length : null}
      />

      {/* Confirmation / Warning Toast (Task 10) */}
      {toast && (
        <div
          className={`mt-3 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg ${
            toast.tone === 'warn'
              ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
              : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
          }`}
          role="status"
          aria-live="polite"
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs opacity-70 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Available Games: Expanded = down-scrollable list of all games; Collapsed = 1 card at a time with Prev/Next */}
      <div id="available-games" className="glass mt-4 p-4 scroll-mt-20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-lg font-bold text-white">Available Games</h2>
            {games.status === 'ok' && byGame.length > 0 && (
              <span
                className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-300"
                aria-live="polite"
              >
                {gamesExpanded
                  ? `${byGame.length} game${byGame.length === 1 ? '' : 's'}`
                  : `${carouselIndex + 1} / ${byGame.length}`}
              </span>
            )}
            {games.status === 'ok' && byGame.length === 0 && (
              <span className="text-sm text-slate-400">0 games</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {games.status === 'ok' && byGame.length > 0 && !gamesExpanded && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollToSlide(carouselIndex - 1)}
                  disabled={carouselIndex <= 0}
                  aria-label="Previous game"
                  className="btn-ghost h-8 px-2.5 py-0 text-xs font-semibold"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSlide(carouselIndex + 1)}
                  disabled={carouselIndex >= byGame.length - 1}
                  aria-label="Next game"
                  className="btn-ghost h-8 px-2.5 py-0 text-xs font-semibold"
                >
                  Next →
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setGamesExpanded((e) => !e)}
              aria-expanded={gamesExpanded}
              className="btn-ghost h-8 px-2.5 py-0 text-xs"
            >
              {gamesExpanded ? '▲ Collapse Games' : `▼ Expand Games (${byGame.length})`}
            </button>
          </div>
        </div>

        {games.status === 'ok' && (
          <p className="mt-0.5 text-xs text-slate-500">
            Data as of {new Date(games.data.dataAsOf).toLocaleString()}
          </p>
        )}

        <div className="mt-3">
          {games.status === 'ok' && bypass && (
            <div
              className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100"
              role="status"
            >
              <span>
                Filters bypassed: showing all {shownGames} upcoming game{shownGames === 1 ? '' : 's'} with their full market list.
              </span>
              <button
                type="button"
                className="btn-ghost ml-auto h-7 px-2.5 py-0 text-xs"
                onClick={() => setBypass(false)}
              >
                Back to my filters
              </button>
            </div>
          )}

          {games.status === 'loading' && (
            <p className="py-8 text-center text-sm text-slate-400">Loading games…</p>
          )}

          {games.status === 'error' && (
            <div
              className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
              role="alert"
            >
              <p className="font-semibold">{games.error}</p>
              {games.httpStatus > 0 && (
                <p className="mt-1 text-xs text-red-300">
                  HTTP {games.httpStatus}
                  {games.details.upstream ? ` · ${games.details.upstream}` : ''}
                </p>
              )}
              {games.details.bodySnippet && (
                <p className="mt-1 break-all font-mono text-[11px] text-red-300/80">
                  {games.details.bodySnippet}
                </p>
              )}
            </div>
          )}

          {games.status === 'ok' && pool.length === 0 && (
            games.data.count === 0 ? (
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
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">
                Every matching game is already in your slip.
              </p>
            )
          )}

          {games.status === 'ok' && byGame.length > 0 && (
            gamesExpanded ? (
              /* Expanded view: down-scrollable card list to the last game */
              <div
                aria-label="Available games list"
                className="max-h-[42rem] space-y-3 overflow-y-auto pr-1"
              >
                {byGame.map((rows) => {
                  const g = rows[0];
                  return <GameCard key={g.gameId} rows={rows} onAdd={handleRequestAdd} />;
                })}
              </div>
            ) : (
              /* Collapsed view: reduced to 1 card at a time with Prev/Next scroll feature */
              <div
                tabIndex={0}
                onKeyDown={handleCarouselKeyDown}
                aria-roledescription="carousel"
                aria-label="Available games carousel"
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 rounded-xl"
              >
                <div
                  ref={carouselRef}
                  onScroll={handleCarouselScroll}
                  className="flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
                >
                  {byGame.map((rows, index) => {
                    const g = rows[0];
                    return (
                      <div
                        key={g.gameId}
                        role="group"
                        aria-roledescription="slide"
                        aria-label={`Game ${index + 1} of ${byGame.length}`}
                        className="w-full shrink-0 snap-center px-0.5"
                      >
                        <GameCard rows={rows} onAdd={handleRequestAdd} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Unsigned-in users ONLY get Random Picks; Signed-in users get AI & Batch Slip Generator + Random Picks */}
      {!user ? (
        <div className="glass mt-4 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div>
            <p className="font-semibold text-white">Random Picks</p>
            <p className="text-xs text-slate-400">
              Add random picks from the currently filtered games pool to your slip.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={randomCount}
              onChange={(e) => setRandomCount(e.target.value.replace(/\D/g, '').slice(0, 2))}
              aria-label="Random picks count"
              className="field h-8 w-14 px-2 text-center text-xs"
            />
            <button
              type="button"
              className="btn-emerald py-1.5 px-3 text-xs font-semibold"
              disabled={games.status !== 'ok' || pool.length === 0}
              onClick={addRandom}
            >
              Add Random
            </button>
          </div>
        </div>
      ) : (
        <div className="glass mt-4 space-y-3 p-4 text-sm transition-all">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white">AI & Batch Slip Generator</p>
            <button
              type="button"
              onClick={() => setToolsCollapsed((c) => !c)}
              className="text-xs text-slate-400 hover:text-white"
            >
              {toolsCollapsed ? '▼ Expand Generator' : '▲ Collapse Generator'}
            </button>
          </div>

          {!toolsCollapsed && (
            <div className="rounded-xl border border-gold-500/30 bg-gradient-to-br from-gold-500/10 via-navy-900/60 to-navy-950 p-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-display text-sm font-bold text-gold-300">
                  ⚡ AI Picks from Template
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Target & Batch
                </span>
              </div>

              {!byokReady && (
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  <span>
                    🔑 <strong>BYOK Required:</strong> Submit your own API key in <strong>Menu ▾ → Settings</strong> to use AI Picks.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new Event('lb-open-settings'));
                      }
                    }}
                    className="btn-gold px-2.5 py-1 text-[11px] font-bold"
                  >
                    Submit BYOK Key
                  </button>
                </div>
              )}

              <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
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
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-medium">AI Picks Timeframe:</span>
                    <span className="text-[11px] text-cyan-400 font-mono">
                      {aiTimeframe === 'template'
                        ? 'From Template'
                        : aiTimeframe === 'any'
                          ? 'Any time'
                          : `<${aiTimeframe}h`}
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
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-white/10 pt-3">
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
                </div>

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
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Risk Profile:</span>
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

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-gold py-1.5 text-xs font-bold"
                    disabled={isAddingAi}
                    onClick={() => void addWithAi()}
                  >
                    {isAddingAi ? '⚡ Generating…' : '⚡ Add AI Picks'}
                  </button>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={randomCount}
                      onChange={(e) => setRandomCount(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      aria-label="Random picks count"
                      className="field h-7 w-12 px-1 text-center text-xs"
                    />
                    <button
                      type="button"
                      className="btn-ghost py-1.5 text-xs"
                      disabled={games.status !== 'ok' || pool.length === 0}
                      onClick={addRandom}
                    >
                      Add Random
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task 10: Active Slip Chooser Modal ("Add to current slip" or "New slip") */}
      {pendingPick && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setPendingPick(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="slip-chooser-title"
        >
          <div
            className="glass w-full max-w-md bg-navy-900/95 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 id="slip-chooser-title" className="font-display text-base font-bold text-white">
                Add Selection to Slip
              </h3>
              <button
                type="button"
                onClick={() => setPendingPick(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Cancel add to slip"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
              <p className="font-semibold text-white">
                {pendingPick.home} vs {pendingPick.away}
              </p>
              <p className="mt-0.5 text-slate-300">
                Pick: <strong className="text-emerald-300">{pendingPick.pick}</strong> · Odds:{' '}
                <strong className="text-gold-400">@{pendingPick.odds.toFixed(2)}</strong>
              </p>
            </div>

            <p className="text-xs text-slate-300">
              You have an active slip (<strong className="text-white">{slip.name || 'Current Slip'}</strong> with{' '}
              {slip.legs.length} {slip.legs.length === 1 ? 'selection' : 'selections'}). Where would you like to add
              this game?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleConfirmAddToCurrent}
                className="btn-emerald py-2.5 text-xs font-bold"
              >
                Add to current slip
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateNewSlip}
                className="btn-gold py-2.5 text-xs font-bold"
              >
                New slip
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

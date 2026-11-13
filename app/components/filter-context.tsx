'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  createDefaultFilterState,
  normalizeFilterState,
  type FilterState,
} from '@/lib/filter-state.ts';
import type { CardsState } from '@/lib/market-cards.ts';
import { SIGNOUT_EVENT } from '@/lib/client-storage.ts';
import { BOOKMAKER_LABEL, type Bookmaker } from '@/lib/types.ts';
import { useAuth } from './auth-context';
import type { LeagueItem } from './league-checklist';

type FilterCtxValue = {
  filterState: FilterState;
  setFilterState: (next: FilterState | ((prev: FilterState) => FilterState)) => void;
  setBookmaker: (bookmaker: Bookmaker) => void;
  setWithinHours: (withinHours: number | null) => void;
  setLeagues: (leagues: string[]) => void;
  setCards: (cards: CardsState) => void;
  resetFilters: (goalLines?: number[]) => void;
  filtersSheetOpen: boolean;
  openFiltersSheet: () => void;
  closeFiltersSheet: () => void;
  availableLeagues: string[] | null;
  setAvailableLeagues: (l: string[] | null) => void;
  leagueList: LeagueItem[] | null;
  setLeagueList: (l: LeagueItem[] | null) => void;
  goalLines: number[];
  setGoalLines: (g: number[]) => void;
  qualifyingCount: number | null;
  setQualifyingCount: (n: number | null) => void;
  filterVersion: number;
};

const FilterCtx = createContext<FilterCtxValue | null>(null);

export function useFilters(): FilterCtxValue {
  const c = useContext(FilterCtx);
  if (!c) throw new Error('useFilters must be used inside FilterProvider');
  return c;
}

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [filterState, setFilterStateRaw] = useState<FilterState>(() => createDefaultFilterState('sportybet'));
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const [availableLeagues, setAvailableLeagues] = useState<string[] | null>(null);
  const [leagueList, setLeagueList] = useState<LeagueItem[] | null>(null);
  const [goalLines, setGoalLines] = useState<number[]>([]);
  const [qualifyingCount, setQualifyingCount] = useState<number | null>(null);
  const [filterVersion, setFilterVersion] = useState(0);

  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted FilterState from DB (/api/settings) when signed in; reset for guest/signout
  useEffect(() => {
    if (!user) {
      hydratedRef.current = false;
      return;
    }
    let alive = true;
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive || !j?.ok) return;
        const rawFs = j.preferences?.filterState;
        if (rawFs) {
          setFilterStateRaw(normalizeFilterState(rawFs, j.preferences?.defaultBookmaker ?? 'sportybet'));
          setFilterVersion((v) => v + 1);
        }
        hydratedRef.current = true;
      })
      .catch(() => {
        hydratedRef.current = true;
      });
    return () => {
      alive = false;
    };
  }, [user]);

  // Reset in-memory FilterState on sign-out so User A's filters never leak to User B
  useEffect(() => {
    const onSignOut = () => {
      hydratedRef.current = false;
      setFilterStateRaw(createDefaultFilterState('sportybet'));
      setFiltersSheetOpen(false);
      setFilterVersion((v) => v + 1);
    };
    window.addEventListener(SIGNOUT_EVENT, onSignOut);
    return () => window.removeEventListener(SIGNOUT_EVENT, onSignOut);
  }, []);

  const persistFilterState = useCallback(
    (next: FilterState) => {
      if (!user) return; // Guests hold filters in memory for this page only
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferences: { filterState: next, defaultBookmaker: next.bookmaker } }),
        }).catch(() => {});
      }, 350);
    },
    [user],
  );

  const setFilterState = useCallback(
    (updater: FilterState | ((prev: FilterState) => FilterState)) => {
      setFilterStateRaw((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        setFilterVersion((v) => v + 1);
        persistFilterState(next);
        return next;
      });
    },
    [persistFilterState],
  );

  const setBookmaker = useCallback(
    (bookmaker: Bookmaker) => {
      setFilterState((prev) => ({
        ...prev,
        bookmaker,
        leagues: prev.bookmaker === bookmaker ? prev.leagues : [],
      }));
    },
    [setFilterState],
  );

  const setWithinHours = useCallback(
    (withinHours: number | null) => {
      setFilterState((prev) => ({ ...prev, withinHours }));
    },
    [setFilterState],
  );

  const setLeagues = useCallback(
    (leagues: string[]) => {
      setFilterState((prev) => ({ ...prev, leagues }));
    },
    [setFilterState],
  );

  const setCards = useCallback(
    (cards: CardsState) => {
      setFilterState((prev) => ({ ...prev, cards }));
    },
    [setFilterState],
  );

  const resetFilters = useCallback(
    () => {
      setFilterState((prev) => createDefaultFilterState(prev.bookmaker));
    },
    [setFilterState],
  );

  return (
    <FilterCtx.Provider
      value={{
        filterState,
        setFilterState,
        setBookmaker,
        setWithinHours,
        setLeagues,
        setCards,
        resetFilters,
        filtersSheetOpen,
        openFiltersSheet: () => setFiltersSheetOpen(true),
        closeFiltersSheet: () => setFiltersSheetOpen(false),
        availableLeagues,
        setAvailableLeagues,
        leagueList,
        setLeagueList,
        goalLines,
        setGoalLines,
        qualifyingCount,
        setQualifyingCount,
        filterVersion,
      }}
    >
      {children}
    </FilterCtx.Provider>
  );
}

export function FilterSummaryBadge() {
  const { filterState } = useFilters();
  const activeCards = Object.values(filterState.cards).filter((c) => c.on).length;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
      <span className="rounded bg-white/10 px-1.5 py-0.5 font-medium text-emerald-300">
        {BOOKMAKER_LABEL[filterState.bookmaker]}
      </span>
      <span className="rounded bg-white/10 px-1.5 py-0.5">
        {filterState.withinHours ? `Next ${filterState.withinHours}h` : 'Any time'}
      </span>
      <span className="rounded bg-white/10 px-1.5 py-0.5">
        {filterState.leagues.length > 0 ? `${filterState.leagues.length} leagues` : 'All leagues'}
      </span>
      <span className="rounded bg-white/10 px-1.5 py-0.5">
        {activeCards} market{activeCards === 1 ? '' : 's'}
      </span>
    </span>
  );
}

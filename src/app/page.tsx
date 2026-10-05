'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { StandardGame, FilterCriteria, SelectedPick, BookieId, UserProfile } from '@/types';
import { DEFAULT_FILTER_CRITERIA, BOOKIE_CONFIGS } from '@/lib/constants';
import {
  evaluateAndFilterGames,
  pickRandomSelections,
  pickSmartSelections,
  mergePicksIntoSlip,
  calculateAccumulatorOdds,
} from '@/lib/filterEngine';
import { FilterBar } from '@/components/FilterBar';
import { GameCard } from '@/components/GameCard';
import { BetslipDrawer } from '@/components/BetslipDrawer';
import { ExportModal } from '@/components/ExportModal';
import { AccountPanel } from '@/components/AccountPanel';
import { AiCoachPanel } from '@/components/AiCoachPanel';
import { AuthModal } from '@/components/AuthModal';
import { SavedSlipsModal } from '@/components/SavedSlipsModal';
import { AiAgentDrawer } from '@/components/AiAgentDrawer';
import { getCurrentUser, signOutUser, listSavedSlips, saveBetslip } from '@/lib/storage';
import {
  Dices,
  RefreshCw,
  ShieldCheck,
  CheckCheck,
  AlertTriangle,
  Flame,
  Layers,
  Zap,
  Building2,
  Sparkles,
  User,
  LogOut,
  Bookmark,
  Bot,
} from 'lucide-react';

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function HomePage() {
  const [games, setGames] = useState<StandardGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oddsSource, setOddsSource] = useState<'api'>('api');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const [criteria, setCriteria] = useState<FilterCriteria>(DEFAULT_FILTER_CRITERIA);
  const debouncedCriteria = useDebouncedValue(criteria, 100);
  const [selectedPicks, setSelectedPicks] = useState<SelectedPick[]>([]);
  /** Undo stack: previous slip states (most recent at end) */
  const [picksHistory, setPicksHistory] = useState<SelectedPick[][]>([]);
  const [stake, setStake] = useState<number>(50);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'algo' | 'picked'>('all');
  const [algoPicks, setAlgoPicks] = useState<SelectedPick[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSavedSlipsModalOpen, setIsSavedSlipsModalOpen] = useState(false);
  const [isAiAgentOpen, setIsAiAgentOpen] = useState(false);
  const [savedSlipsCount, setSavedSlipsCount] = useState<number>(0);
  const [lastBookingCode, setLastBookingCode] = useState<string | undefined>();

  // Initialize user session and saved slips count
  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    if (u) {
      setSavedSlipsCount(listSavedSlips(u.username).length);
    }
  }, []);

  /** Push current slip onto undo history, then apply next state */
  const commitPicks = (next: SelectedPick[] | ((prev: SelectedPick[]) => SelectedPick[])) => {
    setSelectedPicks((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      // Avoid stacking identical snapshots
      const same =
        prev.length === resolved.length &&
        prev.every((p, i) => p.gameId === resolved[i]?.gameId && p.pick === resolved[i]?.pick);
      if (!same) {
        setPicksHistory((h) => [...h.slice(-29), prev]);
      }
      return resolved;
    });
  };

  const handleUndo = () => {
    setPicksHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setSelectedPicks(prev);
      return h.slice(0, -1);
    });
  };

  // Fetch games from /api/odds
  const loadOdds = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/odds');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to ingest match odds');
      }
      setGames(data.games || []);
      setOddsSource(data.source || 'api');
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching match odds';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOdds();
  }, []);

  // Compute evaluations and filtering for the active criteria
  const evaluations = useMemo(() => {
    return evaluateAndFilterGames(games, debouncedCriteria);
  }, [games, debouncedCriteria]);

  // Compute live counts for each company filter
  const companyCounts = useMemo(() => {
    const all = evaluateAndFilterGames(games, { ...debouncedCriteria, selectedCompany: 'ALL' }).length;
    const sportybet = evaluateAndFilterGames(games, { ...debouncedCriteria, selectedCompany: 'sportybet:ke' }).length;
    return { all, sportybet };
  }, [games, debouncedCriteria]);

  // Extract unique available leagues for dropdown filter
  const availableLeagues = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => {
      if (g.league) set.add(g.league);
    });
    return Array.from(set).sort();
  }, [games]);

  // Map of currently selected picks on the betslip by gameId for fast lookup
  const selectedPicksMap = useMemo(() => {
    const map = new Map<string, SelectedPick>();
    selectedPicks.forEach((p) => map.set(p.gameId, p));
    return map;
  }, [selectedPicks]);

  // Remaining available games (evaluations not already in the betslip)
  const remainingEvaluations = useMemo(() => {
    return evaluations.filter((ev) => !selectedPicksMap.has(ev.game.id));
  }, [evaluations, selectedPicksMap]);

  // Keep algo candidate picks in sync with remaining available games and pickCount
  useEffect(() => {
    setAlgoPicks((prev) => {
      // Exclude any picks that got added to the betslip (either one-by-one or via Add Next)
      const valid = prev.filter((p) => !selectedPicksMap.has(p.gameId));
      const targetCount = Math.max(1, Math.min(100, criteria.pickCount));
      if (valid.length === targetCount) return valid;
      // If count changed or picks moved to the slip, draw fresh candidate selections from remaining games
      return pickRandomSelections(remainingEvaluations, targetCount);
    });
  }, [remainingEvaluations, criteria.pickCount, selectedPicksMap]);

  const algoPicksGameIdSet = useMemo(() => {
    return new Set(algoPicks.map((p) => p.gameId));
  }, [algoPicks]);

  // Handle changing target company
  const handleCompanyChange = (bookie: 'ALL' | BookieId) => {
    setCriteria((prev) => ({ ...prev, selectedCompany: bookie }));
    if (bookie === 'sportybet:ke' && stake < 15) {
      setStake(15);
    }
  };

  /** Toggle full-market-data filter — for testing real booking codes */
  const handleUseBookableOnly = () => {
    setCriteria((prev) => ({ ...prev, requireFullMarketData: !prev.requireFullMarketData }));
  };

  /**
   * Apply current filters, AI-pick `count` new games from remaining, ADD to slip (no duplicates).
   * Filters stay as-is so you can tweak and add again; use resetFilters to clear criteria only.
   */
  const handleAddAiPicks = (count: number) => {
    const n = Math.max(1, Math.min(100, count || criteria.pickCount));
    const exclude = new Set<string>(selectedPicks.map((p) => p.gameId));
    const fresh = pickSmartSelections(evaluations, n, exclude);
    if (fresh.length === 0) return;
    commitPicks((prev) => mergePicksIntoSlip(prev, fresh));
  };

  /**
   * Shuffle:
   * Randomly reshuffles the candidate Pick N selections from remaining available games
   * (games not already on the betslip).
   * Does NOT add or remove games from the betslip.
   * Does NOT reset or clear the betslip.
   */
  const handleShufflePicks = (count?: number) => {
    const n = Math.max(1, Math.min(100, count || criteria.pickCount));
    const fresh = pickRandomSelections(remainingEvaluations, n);
    setAlgoPicks(fresh);
  };

  /**
   * Add Next:
   * Adds the current candidate Pick N games (or up to N from remaining games) to the betslip.
   * As they enter the betslip, they leave the remaining available games.
   */
  const handlePickPicks = (count?: number) => {
    const n = Math.max(1, Math.min(100, count || criteria.pickCount));
    const toAdd = algoPicks.length > 0 ? algoPicks.slice(0, n) : pickRandomSelections(remainingEvaluations, n);
    if (toAdd.length === 0) return;
    commitPicks((prev) => mergePicksIntoSlip(prev, toAdd));
  };

  /**
   * Remove the last N picks from the slip (latest additions).
   */
  const handleRemoveGames = (count: number) => {
    const n = Math.max(1, Math.min(100, count || criteria.pickCount));
    commitPicks((prev) => prev.slice(0, Math.max(0, prev.length - n)));
  };

  /** Reset filter criteria to defaults without clearing the betslip */
  const handleResetFiltersKeepSlip = () => {
    setCriteria({ ...DEFAULT_FILTER_CRITERIA });
  };

  // Toggle selection on/off for a given pick
  const handleTogglePick = (pick: SelectedPick) => {
    commitPicks((prev) => {
      const exists = prev.some((p) => p.gameId === pick.gameId);
      if (exists) {
        return prev.filter((p) => p.gameId !== pick.gameId);
      } else {
        return [...prev, pick];
      }
    });
  };

  // Select a specific market pick for a match
  const handleSelectSpecificPick = (pick: SelectedPick) => {
    commitPicks((prev) => {
      const filtered = prev.filter((p) => p.gameId !== pick.gameId);
      return [...filtered, pick];
    });
  };

  // Remove pick
  const handleRemovePick = (gameId: string) => {
    commitPicks((prev) => prev.filter((p) => p.gameId !== gameId));
  };

  // Clear entire slip
  const handleClearSlip = () => {
    commitPicks([]);
  };

  const totalOdds = calculateAccumulatorOdds(selectedPicks);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 pb-36">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#0d1422]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-[#0d1422] rounded-[10px] flex items-center justify-center text-emerald-400">
                <Dices className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white flex items-center">
                  Lotto<span className="text-emerald-400">Bet</span>
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  KE v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Multi-Bookie Odds Filtering & Betslip Generator
              </p>
            </div>
          </div>

          {/* Right Header Status Controls */}
          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SportyBet Live Odds</span>
              {lastUpdated && <span className="text-slate-400 font-mono">({lastUpdated})</span>}
            </div>

            <button
              onClick={loadOdds}
              disabled={loading}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 text-xs flex items-center gap-1.5 transition-all"
              title="Refresh match odds"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* AI Agent Button */}
            <button
              onClick={() => setIsAiAgentOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              title="Open AI Betting Agent to discuss and build slips"
            >
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <span>AI Agent</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            {/* Saved Slips & User Account */}
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSavedSlipsModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
                  title="View, edit, or concatenate saved betslips"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Saved Slips</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-amber-400 font-mono font-bold">
                    {savedSlipsCount}
                  </span>
                </button>

                <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono font-bold text-emerald-400">
                    <User className="w-3 h-3" />
                    <span>@{user.username}</span>
                  </div>
                  <button
                    onClick={() => {
                      signOutUser();
                      setUser(null);
                      setSavedSlipsCount(0);
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sign In</span>
              </button>
            )}

            <button
              onClick={() => setIsExportModalOpen(true)}
              disabled={selectedPicks.length === 0}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Get Code</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Quick Highlights Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#111927] border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Eligible Pool</span>
              <span className="text-lg font-black text-white font-mono">{evaluations.length} Matches</span>
            </div>
          </div>

          <div className="bg-[#111927] border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">In Slip Matches</span>
              <span className="text-lg font-black text-white font-mono">{selectedPicks.length} Matches</span>
            </div>
          </div>

          <div className="bg-[#111927] border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Accumulator Odds</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{totalOdds.toLocaleString()}x</span>
            </div>
          </div>

          <div className="bg-[#111927] border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Active Company</span>
              <span className="text-xs font-bold text-slate-200">
                {criteria.selectedCompany === 'ALL'
                  ? 'All (SportyBet)'
                  : BOOKIE_CONFIGS[criteria.selectedCompany].shortName}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Configuration Bar with Company Selector */}
        <FilterBar
          criteria={criteria}
          onChange={setCriteria}
          availableLeagues={availableLeagues}
          totalEligibleMatches={remainingEvaluations.length}
          companyCounts={companyCounts}
          onPickPicks={handlePickPicks}
          onShufflePicks={handleShufflePicks}
          onRemoveGames={handleRemoveGames}
          onClearSlip={handleClearSlip}
          onUndo={handleUndo}
          canUndo={picksHistory.length > 0}
        />

        {/* Fixtures Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Qualifying Fixtures ({evaluations.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('algo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'algo'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Algo Pick N ({algoPicks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('picked')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'picked'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>In Betslip ({selectedPicks.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>
              {criteria.selectedCompany === 'ALL'
                ? 'Showing fixtures for all companies'
                : `Showing fixtures available on ${BOOKIE_CONFIGS[criteria.selectedCompany].name}`}
            </span>
            <button
              onClick={handleUseBookableOnly}
              title="Only fixtures with complete SportyBet market IDs, then shuffle — use this to test real booking codes"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border ${
                criteria.requireFullMarketData
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Bookable only
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-[#111927]/60 border border-slate-800 rounded-xl p-4 animate-pulse space-y-3"
              >
                <div className="h-4 bg-slate-800 rounded w-1/3" />
                <div className="space-y-2">
                  <div className="h-5 bg-slate-800 rounded w-3/4" />
                  <div className="h-5 bg-slate-800 rounded w-2/3" />
                </div>
                <div className="h-8 bg-slate-800 rounded w-full mt-4" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-center space-y-3 my-8">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Odds Ingestion Notice</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
            <button
              onClick={loadOdds}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
            >
              Retry Ingestion
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && evaluations.length === 0 && (
          <div className="bg-[#111927] border border-slate-800 rounded-2xl p-10 text-center space-y-3 my-6">
            <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">
              No Matches Found For {criteria.selectedCompany === 'ALL' ? 'Selected Criteria' : BOOKIE_CONFIGS[criteria.selectedCompany].name}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Try switching bookmakers, widening the odds bounds (e.g., increase Double Chance max to 1.25), or choosing a longer kickoff timeframe.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setCriteria((prev) => ({ ...prev, selectedCompany: 'ALL' }))}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs border border-slate-700"
              >
                View All Bookmakers
              </button>
              <button
                onClick={() => setCriteria(DEFAULT_FILTER_CRITERIA)}
                className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* Fixtures List / Grid */}
        {!loading && !error && evaluations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {evaluations
              .filter((ev) => {
                if (activeTab === 'picked') {
                  return selectedPicksMap.has(ev.game.id);
                }
                if (activeTab === 'algo') {
                  return algoPicksGameIdSet.has(ev.game.id);
                }
                return true;
              })
              .map((evaluation) => {
                const currentSelection = selectedPicksMap.get(evaluation.game.id) || null;
                const isAlgoCandidate = algoPicksGameIdSet.has(evaluation.game.id);
                return (
                  <GameCard
                    key={evaluation.game.id}
                    game={evaluation.game}
                    eligiblePicks={evaluation.eligiblePicks}
                    currentSelection={currentSelection}
                    selectedCompany={criteria.selectedCompany}
                    isAlgoCandidate={isAlgoCandidate}
                    onTogglePick={handleTogglePick}
                    onSelectSpecificPick={handleSelectSpecificPick}
                  />
                );
              })}
          </div>
        )}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4 pb-28">
          <AccountPanel
            selections={selectedPicks}
            stake={stake}
            bookingCode={lastBookingCode}
            onLoadSlip={(sels) => {
              commitPicks(sels);
              setActiveTab('picked');
            }}
            onUserChange={setUser}
          />
          <AiCoachPanel selections={selectedPicks} games={games} user={user} />
        </div>
      </main>

      {/* Docked Betslip Drawer */}
      <BetslipDrawer
        selections={selectedPicks}
        selectedCompany={criteria.selectedCompany}
        onCompanyChange={handleCompanyChange}
        onRemovePick={handleRemovePick}
        onClearSlip={handleClearSlip}
        onAddAiPicks={handleAddAiPicks}
        onPickPicks={handlePickPicks}
        onShufflePicks={handleShufflePicks}
        onRemoveGames={handleRemoveGames}
        onResetFiltersKeepSlip={handleResetFiltersKeepSlip}
        onUndo={handleUndo}
        canUndo={picksHistory.length > 0}
        defaultAddCount={criteria.pickCount}
        eligibleCount={evaluations.length}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        stake={stake}
        onStakeChange={setStake}
        onOpenSavedSlips={() => {
          if (!user) {
            setIsAuthModalOpen(true);
          } else {
            setIsSavedSlipsModalOpen(true);
          }
        }}
        onSaveCurrentSlip={() => {
          if (!user) {
            setIsAuthModalOpen(true);
          } else {
            setIsSavedSlipsModalOpen(true);
          }
        }}
        savedSlipsCount={savedSlipsCount}
      />

      {/* Booking Code Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selections={selectedPicks}
        stake={stake}
        initialBookie={criteria.selectedCompany === 'ALL' ? 'sportybet:ke' : criteria.selectedCompany}
      />

      {/* Auth Modal (Username & Password only) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          setSavedSlipsCount(listSavedSlips(u.username).length);
        }}
      />

      {/* Saved Betslips Modal (Named, Edited, Deleted, Concatenate) */}
      {user && (
        <SavedSlipsModal
          isOpen={isSavedSlipsModalOpen}
          onClose={() => {
            setIsSavedSlipsModalOpen(false);
            setSavedSlipsCount(listSavedSlips(user.username).length);
          }}
          username={user.username}
          currentSlip={selectedPicks}
          onLoadSlip={(sels) => {
            commitPicks(sels);
            setActiveTab('picked');
          }}
          onAppendToSlip={(sels) => {
            commitPicks((prev) => mergePicksIntoSlip(prev, sels));
            setActiveTab('picked');
          }}
        />
      )}

      {/* AI Betting Agent Drawer (Discuss, Build, Save Slips) */}
      <AiAgentDrawer
        isOpen={isAiAgentOpen}
        onClose={() => setIsAiAgentOpen(false)}
        activeSlip={selectedPicks}
        availableMatches={games}
        user={user}
        onLoadSlip={(sels) => {
          commitPicks(sels);
          setActiveTab('picked');
        }}
        onAppendToSlip={(sels) => {
          commitPicks((prev) => mergePicksIntoSlip(prev, sels));
          setActiveTab('picked');
        }}
        onRefreshSavedSlips={() => {
          if (user) setSavedSlipsCount(listSavedSlips(user.username).length);
        }}
      />
    </div>
  );
}


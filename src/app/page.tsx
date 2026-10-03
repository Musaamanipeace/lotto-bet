'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { StandardGame, FilterCriteria, SelectedPick, BookieId } from '@/types';
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
import {
  Dices,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CheckCheck,
  AlertTriangle,
  Flame,
  Layers,
  Zap,
  Building2,
} from 'lucide-react';

export default function HomePage() {
  const [games, setGames] = useState<StandardGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oddsSource, setOddsSource] = useState<'api'>('api');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const [criteria, setCriteria] = useState<FilterCriteria>(DEFAULT_FILTER_CRITERIA);
  const [selectedPicks, setSelectedPicks] = useState<SelectedPick[]>([]);
  const [stake, setStake] = useState<number>(50);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'picked'>('all');

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
    return evaluateAndFilterGames(games, criteria);
  }, [games, criteria]);

  // Compute live counts for each company filter
  const companyCounts = useMemo(() => {
    const all = evaluateAndFilterGames(games, { ...criteria, selectedCompany: 'ALL' }).length;
    const sportybet = evaluateAndFilterGames(games, { ...criteria, selectedCompany: 'sportybet:ke' }).length;
    return { all, sportybet };
  }, [games, criteria]);

  // Extract unique available leagues for dropdown filter
  const availableLeagues = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => {
      if (g.league) set.add(g.league);
    });
    return Array.from(set).sort();
  }, [games]);

  // Map of currently selected picks by gameId for fast lookup
  const selectedPicksMap = useMemo(() => {
    const map = new Map<string, SelectedPick>();
    selectedPicks.forEach((p) => map.set(p.gameId, p));
    return map;
  }, [selectedPicks]);

  // Initial automatic random pick once games are loaded
  useEffect(() => {
    if (evaluations.length > 0 && selectedPicks.length === 0) {
      const initialPicks = pickRandomSelections(evaluations, criteria.pickCount);
      setSelectedPicks(initialPicks);
    }
  }, [evaluations, criteria.pickCount, selectedPicks.length]);

  // Handle changing target company
  const handleCompanyChange = (bookie: 'ALL' | BookieId) => {
    setCriteria((prev) => ({ ...prev, selectedCompany: bookie }));
    if (bookie === 'sportybet:ke' && stake < 15) {
      setStake(15);
    }
  };

  // Shuffle & replace entire slip using Fisher-Yates
  const handleShuffleAndPick = () => {
    if (evaluations.length === 0) return;
    const newPicks = pickRandomSelections(evaluations, criteria.pickCount);
    setSelectedPicks(newPicks);
  };

  /** Enable full-market-data filter and rebuild slip — for testing real booking codes */
  const handleUseBookableOnly = () => {
    const next: FilterCriteria = { ...criteria, requireFullMarketData: true };
    setCriteria(next);
    const evals = evaluateAndFilterGames(games, next);
    const newPicks = pickRandomSelections(evals, next.pickCount);
    setSelectedPicks(newPicks);
  };

  /**
   * Apply current filters, AI-pick `count` new games, ADD to slip (no duplicates).
   * Filters stay as-is so you can tweak and add again; use resetFilters to clear criteria only.
   */
  const handleAddAiPicks = (count: number) => {
    const n = Math.max(1, Math.min(50, count || criteria.pickCount));
    const exclude = new Set(selectedPicks.map((p) => p.gameId));
    const fresh = pickSmartSelections(evaluations, n, exclude);
    if (fresh.length === 0) return;
    setSelectedPicks((prev) => mergePicksIntoSlip(prev, fresh));
  };

  /** Same as AI add but pure random under current filters */
  const handleAddRandomPicks = (count: number) => {
    const n = Math.max(1, Math.min(50, count || criteria.pickCount));
    const exclude = new Set(selectedPicks.map((p) => p.gameId));
    const pool = evaluations.filter((ev) => !exclude.has(ev.game.id));
    const fresh = pickRandomSelections(pool, n);
    if (fresh.length === 0) return;
    setSelectedPicks((prev) => mergePicksIntoSlip(prev, fresh));
  };

  /** Reset filter criteria to defaults without clearing the betslip */
  const handleResetFiltersKeepSlip = () => {
    setCriteria({ ...DEFAULT_FILTER_CRITERIA });
  };

  // Toggle selection on/off for a given pick
  const handleTogglePick = (pick: SelectedPick) => {
    setSelectedPicks((prev) => {
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
    setSelectedPicks((prev) => {
      const filtered = prev.filter((p) => p.gameId !== pick.gameId);
      return [...filtered, pick];
    });
  };

  // Remove pick
  const handleRemovePick = (gameId: string) => {
    setSelectedPicks((prev) => prev.filter((p) => p.gameId !== gameId));
  };

  // Clear entire slip
  const handleClearSlip = () => {
    setSelectedPicks([]);
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
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
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

            <button
              onClick={() => setIsExportModalOpen(true)}
              disabled={selectedPicks.length === 0}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Get Booking Code</span>
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
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Slip Selections</span>
              <span className="text-lg font-black text-white font-mono">{selectedPicks.length} Games</span>
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
          totalEligibleMatches={evaluations.length}
          companyCounts={companyCounts}
          onShuffleAndPick={handleShuffleAndPick}
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
              onClick={handleShuffleAndPick}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 border border-slate-700"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Shuffle
            </button>
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
                return true;
              })
              .map((evaluation) => {
                const currentSelection = selectedPicksMap.get(evaluation.game.id) || null;
                return (
                  <GameCard
                    key={evaluation.game.id}
                    game={evaluation.game}
                    eligiblePicks={evaluation.eligiblePicks}
                    currentSelection={currentSelection}
                    selectedCompany={criteria.selectedCompany}
                    onTogglePick={handleTogglePick}
                    onSelectSpecificPick={handleSelectSpecificPick}
                  />
                );
              })}
          </div>
        )}
      </main>

      {/* Docked Betslip Drawer */}
      <BetslipDrawer
        selections={selectedPicks}
        selectedCompany={criteria.selectedCompany}
        onCompanyChange={handleCompanyChange}
        onRemovePick={handleRemovePick}
        onClearSlip={handleClearSlip}
        onShuffleAndPick={handleShuffleAndPick}
        onAddAiPicks={handleAddAiPicks}
        onAddRandomPicks={handleAddRandomPicks}
        onResetFiltersKeepSlip={handleResetFiltersKeepSlip}
        defaultAddCount={criteria.pickCount}
        eligibleCount={evaluations.length}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        stake={stake}
        onStakeChange={setStake}
      />

      {/* Booking Code Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selections={selectedPicks}
        stake={stake}
        initialBookie={criteria.selectedCompany === 'ALL' ? 'sportybet:ke' : criteria.selectedCompany}
      />
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { StandardGame, FilterCriteria, SelectedPick, BookieId, UserProfile, SavedBetslip } from '@/types';
import { DEFAULT_FILTER_CRITERIA, BOOKIE_CONFIGS } from '@/lib/constants';
import {
  evaluateAndFilterGames,
  pickRandomSelections,
  pickSmartSelections,
  mergePicksIntoSlip,
  calculateAccumulatorOdds,
  removeLeastPreferredPicks,
} from '@/lib/filterEngine';
import { FilterBar } from '@/components/FilterBar';
import { BetslipDrawer } from '@/components/BetslipDrawer';
import { ExportModal } from '@/components/ExportModal';
import { AccountPanel } from '@/components/AccountPanel';
import { AiCoachPanel } from '@/components/AiCoachPanel';
import { AuthModal } from '@/components/AuthModal';
import { SavedSlipsModal } from '@/components/SavedSlipsModal';
import { ResultsModal } from '@/components/ResultsModal';
import { StatsModal } from '@/components/StatsModal';
import { AiAgentDrawer } from '@/components/AiAgentDrawer';
import { SettingsModal } from '@/components/SettingsModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { TopAlertBanner } from '@/components/TopAlertBanner';
import { KeyGuardModal } from '@/components/KeyGuardModal';
import { AiPicksPanel } from '@/components/AiPicksPanel';
import { MyPicksPanel } from '@/components/MyPicksPanel';
import { ChatTab } from '@/components/ChatTab';
import { getCurrentUser, signOutUser, listSavedSlips, listUsers } from '@/lib/storage';
import { getByokKeys, hasActiveAiKey, BYOK_CHANGED_EVENT } from '@/lib/byokStorage';
import { ByokKeys } from '@/types';
import {
  Dices,
  RefreshCw,
  ShieldCheck,
  CheckCheck,
  AlertTriangle,
  Trophy,
  Layers,
  Zap,
  Building2,
  Sparkles,
  User,
  LogOut,
  Bookmark,
  Bot,
  Plus,
  Key,
  Settings,
  Sparkles as SparklesIcon,
  Check as CheckIcon,
  TrendingUp,
  Clock,
} from 'lucide-react';

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

type AppTab = 'ai-picks' | 'my-picks' | 'saved' | 'chat';

const TAB_LABELS: Record<AppTab, { label: string; icon: React.ElementType }> = {
  'ai-picks': { label: 'AI Picks', icon: SparklesIcon },
  'my-picks': { label: 'My Picks', icon: TrendingUp },
  saved: { label: 'Saved', icon: CheckIcon },
  chat: { label: 'Chat', icon: Clock },
};

export default function HomePage() {
  const [games, setGames] = useState<StandardGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const [criteria, setCriteria] = useState<FilterCriteria>(DEFAULT_FILTER_CRITERIA);
  const debouncedCriteria = useDebouncedValue(criteria, 100);
  const [selectedPicks, setSelectedPicks] = useState<SelectedPick[]>([]);
  const [stake, setStake] = useState<number>(50);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('my-picks');
  const [algoPicks, setAlgoPicks] = useState<SelectedPick[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSavedSlipsModalOpen, setIsSavedSlipsModalOpen] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [isAiAgentOpen, setIsAiAgentOpen] = useState(false);
  const [statsGame, setStatsGame] = useState<StandardGame | null>(null);
  const [savedSlipsCount, setSavedSlipsCount] = useState<number>(0);
  const [lastBookingCode] = useState<string | undefined>();

  // BYOK state
  const [byok, setByok] = useState<ByokKeys>(getByokKeys());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [keyGuard, setKeyGuard] = useState<{
    isOpen: boolean;
    featureName: string;
    description?: string;
  }>({ isOpen: false, featureName: '' });

  const hasAiKey = hasActiveAiKey(byok);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    if (u) {
      setSavedSlipsCount(listSavedSlips(u.username).length);
    }

    const currentKeys = getByokKeys();
    setByok(currentKeys);
    if (!hasActiveAiKey(currentKeys) && !currentKeys.hasSkippedOnboarding) {
      setIsOnboardingModalOpen(true);
    }

    const handleByokChange = (e: Event) => {
      const custom = e as CustomEvent<ByokKeys>;
      if (custom.detail) {
        setByok(custom.detail);
      }
    };
    window.addEventListener(BYOK_CHANGED_EVENT, handleByokChange);
    return () => window.removeEventListener(BYOK_CHANGED_EVENT, handleByokChange);
  }, []);

  const commitPicks = (next: SelectedPick[] | ((prev: SelectedPick[]) => SelectedPick[])) => {
    setSelectedPicks(next);
  };

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

  const evaluations = useMemo(() => {
    return evaluateAndFilterGames(games, debouncedCriteria);
  }, [games, debouncedCriteria]);

  const companyCounts = useMemo(() => {
    const all = evaluateAndFilterGames(games, { ...debouncedCriteria, selectedCompany: 'ALL' }).length;
    const sportybet = evaluateAndFilterGames(games, { ...debouncedCriteria, selectedCompany: 'sportybet:ke' }).length;
    return { all, sportybet };
  }, [games, debouncedCriteria]);

  const availableLeagues = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => {
      if (g.league) set.add(g.league);
    });
    return Array.from(set).sort();
  }, [games]);

  const selectedPicksMap = useMemo(() => {
    const map = new Map<string, SelectedPick>();
    selectedPicks.forEach((p) => map.set(p.gameId, p));
    return map;
  }, [selectedPicks]);

  const remainingEvaluations = useMemo(() => {
    return evaluations.filter((ev) => !selectedPicksMap.has(ev.game.id));
  }, [evaluations, selectedPicksMap]);

  useEffect(() => {
    setAlgoPicks((prev) => {
      const valid = prev.filter((p) => !selectedPicksMap.has(p.gameId));
      const targetCount = Math.max(1, Math.min(100, criteria.pickCount));
      if (valid.length === targetCount) return valid;
      return pickRandomSelections(remainingEvaluations, targetCount);
    });
  }, [remainingEvaluations, criteria.pickCount, selectedPicksMap]);

  const algoPicksGameIdSet = useMemo(() => {
    return new Set(algoPicks.map((p) => p.gameId));
  }, [algoPicks]);

  const handleCompanyChange = (bookie: 'ALL' | BookieId) => {
    setCriteria((prev) => ({ ...prev, selectedCompany: bookie }));
    if (bookie === 'sportybet:ke' && stake < 15) {
      setStake(15);
    }
  };

  const handleUseBookableOnly = () => {
    setCriteria((prev) => ({ ...prev, requireFullMarketData: !prev.requireFullMarketData }));
  };

  const handleAddAiPicks = (count: number) => {
    if (!hasAiKey) {
      setKeyGuard({
        isOpen: true,
        featureName: 'AI Picks',
        description:
          'AI Picks use machine-learning educated analysis to evaluate H2H historical records, team form edge, and bookmaker pricing deviations. Please configure your private API key in Settings to unlock AI Picks.',
      });
      return;
    }
    const n = Math.max(1, Math.min(100, count || criteria.pickCount));
    const exclude = new Set<string>(selectedPicks.map((p) => p.gameId));
    const fresh = pickSmartSelections(evaluations, n, exclude);
    if (fresh.length === 0) return;
    commitPicks((prev) => mergePicksIntoSlip(prev, fresh));
  };

  const handleAddRandomPicks = (count: number) => {
    const n = Math.max(1, Math.min(100, count || criteria.pickCount));
    const fresh = pickRandomSelections(remainingEvaluations, n);
    if (fresh.length === 0) return;
    commitPicks((prev) => mergePicksIntoSlip(prev, fresh));
  };

  const handleShuffle = (target: 'staging' | 'slip', count?: number, mode?: 'ai' | 'random') => {
    const n = Math.max(1, Math.min(100, count || criteria.pickCount));
    const effectiveMode = mode || criteria.pickingStrategy || 'ai';

    if (effectiveMode === 'ai' && !hasAiKey) {
      setKeyGuard({
        isOpen: true,
        featureName: 'AI Shuffle',
        description:
          'AI Shuffle analyzes squad momentum and H2H. Configure your API key in Settings or use Random Shuffle.',
      });
      return;
    }

    if (target === 'staging') {
      const fresh =
        effectiveMode === 'ai'
          ? pickSmartSelections(remainingEvaluations, n)
          : pickRandomSelections(remainingEvaluations, n);
      setAlgoPicks(fresh);
    } else {
      if (selectedPicks.length === 0) return;
      const fresh =
        effectiveMode === 'ai'
          ? pickSmartSelections(evaluations, selectedPicks.length)
          : pickRandomSelections(evaluations, selectedPicks.length);
      commitPicks(fresh);
    }
  };

  const handlePickPicks = (count?: number) => {
    const n = Math.max(1, Math.min(100, count || criteria.pickCount));
    const toAdd = algoPicks.length > 0 ? algoPicks.slice(0, n) : pickRandomSelections(remainingEvaluations, n);
    if (toAdd.length === 0) return;
    commitPicks((prev) => mergePicksIntoSlip(prev, toAdd));
  };

  const handleRemoveGames = (count: number) => {
    const n = Math.max(1, Math.min(100, count || criteria.pickCount));
    commitPicks((prev) => removeLeastPreferredPicks(prev, n));
  };

  const handleResetFiltersKeepSlip = () => {
    setCriteria({ ...DEFAULT_FILTER_CRITERIA });
  };

  const handleSoloFilter = (_market: string) => {
    setActiveTab('my-picks');
  };

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

  const handleSelectSpecificPick = (pick: SelectedPick) => {
    commitPicks((prev) => {
      const filtered = prev.filter((p) => p.gameId !== pick.gameId);
      return [...filtered, pick];
    });
  };

  const handleRemovePick = (gameId: string) => {
    commitPicks((prev) => prev.filter((p) => p.gameId !== gameId));
  };

  const handleClearSlip = () => {
    commitPicks([]);
  };

  const totalOdds = useMemo(() => calculateAccumulatorOdds(selectedPicks), [selectedPicks]);
  const stagingOdds = useMemo(() => calculateAccumulatorOdds(algoPicks), [algoPicks]);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 pb-36">
      {/* Top Persistent Alert Banner */}
      <TopAlertBanner
        isMissingKeys={!hasAiKey}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#0d1422]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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
                  KE v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Multi-Bookie Odds Filtering & Betslip Generator
              </p>
            </div>
          </div>

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

            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                hasAiKey
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300'
              }`}
              title="Manage BYOK API keys"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settings</span>
              {!hasAiKey && (
                <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1 py-0.2 rounded font-mono font-bold">
                  BYOK
                </span>
              )}
            </button>

            <button
              onClick={() => setIsResultsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              title="View match results"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Results</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSavedSlipsModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
                  title="View saved betslips"
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
          <div className="bg-[#111927] border border-amber-500/30 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                Staging Area ({algoPicks.length})
              </span>
              <span className="text-lg font-black text-amber-400 font-mono">
                {stagingOdds.toLocaleString()}x
              </span>
            </div>
          </div>

          <div className="bg-[#111927] border border-emerald-500/30 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                In Betslip ({selectedPicks.length})
              </span>
              <span className="text-lg font-black text-emerald-400 font-mono">
                {totalOdds.toLocaleString()}x
              </span>
            </div>
          </div>

          <div className="bg-[#111927] border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Eligible Pool</span>
              <span className="text-lg font-black text-white font-mono">{evaluations.length} Matches</span>
            </div>
          </div>

          <div className="bg-[#111927] border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Active Company</span>
              <span className="text-xs font-bold text-slate-200">
                {criteria.selectedCompany === 'ALL' ? 'All (SportyBet)' : BOOKIE_CONFIGS[criteria.selectedCompany].shortName}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <FilterBar
          criteria={criteria}
          onChange={setCriteria}
          availableLeagues={availableLeagues}
          totalEligibleMatches={remainingEvaluations.length}
          companyCounts={companyCounts}
          onNextAdd={handlePickPicks}
          onShuffle={handleShuffle}
          onAddAiPicks={handleAddAiPicks}
          onAddRandomPicks={handleAddRandomPicks}
          onRemoveGames={handleRemoveGames}
          onSoloFilter={handleSoloFilter}
          hasAiKey={hasAiKey}
          onRequireKey={(feature) =>
            setKeyGuard({
              isOpen: true,
              featureName: feature,
              description:
                'This feature requires an active AI provider API key. Configure your private key in BYOK Settings to unlock all capabilities.',
            })
          }
        />

        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto sm:overflow-visible">
            {(['ai-picks', 'my-picks', 'saved', 'chat'] as AppTab[]).map((tab) => {
              const active = activeTab === tab;
              const { label, icon: Icon } = TAB_LABELS[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    active
                      ? 'bg-emerald-500 text-slate-950 shadow-md border-emerald-500'
                      : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>
              {criteria.selectedCompany === 'ALL'
                ? 'Showing fixtures for all companies'
                : `Showing fixtures available on ${BOOKIE_CONFIGS[criteria.selectedCompany].name}`}
            </span>
            <button
              onClick={handleUseBookableOnly}
              title="Only fixtures with complete SportyBet market IDs"
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

        {/* Tab Panels */}
        <div className="space-y-6">
          {activeTab === 'ai-picks' && (
            <AiPicksPanel
              games={games}
              evaluations={evaluations.map((ev) => ({ game: ev.game, eligiblePicks: ev.eligiblePicks }))}
              selectedPicks={selectedPicks}
              onAddAiPicks={handleAddAiPicks}
              onAddRandomPicks={handleAddRandomPicks}
              onAppendToSlip={(picks) => {
                const newPicks = picks.filter((p) => !selectedPicksMap.has(p.gameId));
                if (newPicks.length > 0) commitPicks((prev) => mergePicksIntoSlip(prev, newPicks));
              }}
              onRemovePick={handleRemovePick}
              hasAiKey={hasAiKey}
              onRequireKey={(feature) =>
                setKeyGuard({
                  isOpen: true,
                  featureName: feature,
                  description: 'AI Picks require an API key. Configure in Settings.',
                })
              }
              cashoutOnly={criteria.cashoutOnly}
            />
          )}

          {activeTab === 'my-picks' && (
            <MyPicksPanel
              games={games}
              evaluations={evaluations.map((ev) => ({ game: ev.game, eligiblePicks: ev.eligiblePicks }))}
              selectedPicks={selectedPicks}
              selectedCompany={criteria.selectedCompany}
              onTogglePick={handleTogglePick}
              onSelectSpecificPick={handleSelectSpecificPick}
            />
          )}

          {activeTab === 'saved' && (
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Saved Betslips</h3>
                </div>
                {user ? (
                  <button
                    onClick={() => setIsSavedSlipsModalOpen(true)}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-amber-500/30"
                  >
                    <span>Manage Saved</span>
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">Sign in to save slips</span>
                )}
              </div>

              {user ? (
                <SavedSlipsModal
                  isOpen={isSavedSlipsModalOpen}
                  onClose={() => setIsSavedSlipsModalOpen(false)}
                  username={user.username}
                  currentSlip={selectedPicks}
                  onLoadSlip={(sels) => {
                    commitPicks(sels);
                    setActiveTab('my-picks');
                  }}
                  onAppendToSlip={(sels) => {
                    commitPicks((prev) => mergePicksIntoSlip(prev, sels));
                    setActiveTab('my-picks');
                  }}
                />
              ) : (
                <div className="py-8 text-center">
                  <span className="text-xs text-slate-500">Sign in to view and manage your saved betslips.</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl h-[600px] flex flex-col overflow-hidden">
              <ChatTab
                isOpen={true}
                activeSlip={selectedPicks}
                availableMatches={games}
                onLoadSlip={(sels) => {
                  commitPicks(sels);
                  setActiveTab('my-picks');
                }}
                onAppendToSlip={(sels) => {
                  commitPicks((prev) => mergePicksIntoSlip(prev, sels));
                  setActiveTab('my-picks');
                }}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
              />
            </div>
          )}
        </div>

        {/* Loading / Error / Empty states */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[#111927]/60 border border-slate-800 rounded-xl p-4 animate-pulse space-y-3">
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

        {error && !loading && (
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-center space-y-3 my-6">
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

        {!loading && !error && evaluations.length === 0 && activeTab === 'my-picks' && (
          <div className="bg-[#111927] border border-slate-800 rounded-2xl p-10 text-center space-y-3 my-6">
            <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No Matches Found For Selected Criteria</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Try switching bookmakers, widening the odds bounds, or choosing a longer kickoff timeframe.
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
      </main>

      {/* Betslip Drawer (only generate-code control) */}
      <BetslipDrawer
        selections={selectedPicks}
        selectedCompany={criteria.selectedCompany}
        onCompanyChange={handleCompanyChange}
        onRemovePick={handleRemovePick}
        onClearSlip={handleClearSlip}
        onAddAiPicks={handleAddAiPicks}
        onAddRandomPicks={handleAddRandomPicks}
        onNextAdd={handlePickPicks}
        onShuffle={handleShuffle}
        onRemoveGames={handleRemoveGames}
        onResetFiltersKeepSlip={handleResetFiltersKeepSlip}
        defaultAddCount={criteria.pickCount}
        eligibleCount={evaluations.length}
        stagingOdds={stagingOdds}
        stagingCount={algoPicks.length}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        stake={stake}
        onStakeChange={setStake}
        hasAiKey={hasAiKey}
        onRequireKey={(feature) =>
          setKeyGuard({
            isOpen: true,
            featureName: feature,
            description:
              'This feature requires an active AI provider API key. Configure your private key in BYOK Settings to unlock all capabilities.',
          })
        }
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

      {/* Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selections={selectedPicks}
        stake={stake}
        initialBookie={criteria.selectedCompany === 'ALL' ? 'sportybet:ke' : criteria.selectedCompany}
        hasKeys={hasAiKey}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          setSavedSlipsCount(listSavedSlips(u.username).length);
        }}
      />

      {user && (
        <SavedSlipsModal
          isOpen={isSavedSlipsModalOpen}
          onClose={() => setIsSavedSlipsModalOpen(false)}
          username={user.username}
          currentSlip={selectedPicks}
          onLoadSlip={(sels) => {
            commitPicks(sels);
            setActiveTab('my-picks');
          }}
          onAppendToSlip={(sels) => {
            commitPicks((prev) => mergePicksIntoSlip(prev, sels));
            setActiveTab('my-picks');
          }}
        />
      )}

      <ResultsModal
        isOpen={isResultsModalOpen}
        onClose={() => setIsResultsModalOpen(false)}
        savedSlips={user ? listSavedSlips(user.username) : []}
        username={user ? user.username : null}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      <AiAgentDrawer
        isOpen={isAiAgentOpen}
        onClose={() => setIsAiAgentOpen(false)}
        activeSlip={selectedPicks}
        availableMatches={games}
        user={user}
        onLoadSlip={(sels) => {
          commitPicks(sels);
          setActiveTab('my-picks');
        }}
        onAppendToSlip={(sels) => {
          commitPicks((prev) => mergePicksIntoSlip(prev, sels));
          setActiveTab('my-picks');
        }}
        onRefreshSavedSlips={() => {
          if (user) setSavedSlipsCount(listSavedSlips(user.username).length);
        }}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <StatsModal
        isOpen={Boolean(statsGame)}
        onClose={() => setStatsGame(null)}
        game={statsGame}
        onSelectPick={handleSelectSpecificPick}
        selectedPick={statsGame ? selectedPicksMap.get(statsGame.id) || null : null}
        hasKeys={hasAiKey}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <OnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <KeyGuardModal
        isOpen={keyGuard.isOpen}
        onClose={() => setKeyGuard((prev) => ({ ...prev, isOpen: false }))}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        featureName={keyGuard.featureName}
        description={keyGuard.description}
      />
    </div>
  );
}

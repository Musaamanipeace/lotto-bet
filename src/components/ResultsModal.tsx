'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SavedBetslip } from '@/types';
import { MatchResult, evaluateSavedSlip, SlipEvaluationResult } from '@/lib/resultsFetcher';
import {
  X,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Trophy,
  Bookmark,
  ShieldCheck,
  User,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedSlips: SavedBetslip[];
  username: string | null;
  onOpenAuth: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  isOpen,
  onClose,
  savedSlips,
  username,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'yesterday' | 'saved'>('yesterday');
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceAttribution, setSourceAttribution] = useState<string>('TheSportsDB & ESPN Feeds');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeague, setSelectedLeague] = useState('ALL');
  const [expandedSlipId, setExpandedSlipId] = useState<string | null>(null);

  // Compute yesterday's date in YYYY-MM-DD
  const yesterdayStr = useMemo(() => {
    const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  }, []);

  const [selectedDate, setSelectedDate] = useState(yesterdayStr);

  const loadResults = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/results?date=${date}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch match results');
      }
      setResults(data.results || []);
      if (data.source) setSourceAttribution(data.source);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching results';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadResults(selectedDate);
    }
  }, [isOpen, selectedDate]);

  // Extract available leagues
  const leagues = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => {
      if (r.league) set.add(r.league);
    });
    return Array.from(set).sort();
  }, [results]);

  // Filtered match results
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (selectedLeague !== 'ALL' && r.league !== selectedLeague) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.homeTeam.toLowerCase().includes(q) ||
          r.awayTeam.toLowerCase().includes(q) ||
          r.league.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [results, selectedLeague, searchQuery]);

  // Evaluated saved betslips
  const evaluatedSlips = useMemo(() => {
    return savedSlips.map((slip) => {
      const evaluation = evaluateSavedSlip(slip.id, slip.selections, results);
      return {
        slip,
        evaluation,
      };
    });
  }, [savedSlips, results]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e1626] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#090f1a] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Match Results & Saved Betslip Tracking
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Free credible data feed:</span>
                <span className="text-amber-400 font-mono font-semibold">{sourceAttribution}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Quick Date Bar */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('yesterday')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'yesterday'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Yesterday&apos;s Results ({results.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved Betslip Results</span>
              {username && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-900/80 text-[10px] font-mono">
                  {savedSlips.length}
                </span>
              )}
            </button>
          </div>

          {/* Date Picker & Refresh */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={() => loadResults(selectedDate)}
              disabled={loading}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs transition-colors"
              title="Refresh results feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab 1: Yesterday's Match Results */}
        {activeTab === 'yesterday' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Search & League Filter */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by team or league..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#090f1a] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="bg-[#090f1a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 sm:w-56"
              >
                <option value="ALL">All Competitions ({leagues.length})</option>
                {leagues.map((lg) => (
                  <option key={lg} value={lg}>
                    {lg}
                  </option>
                ))}
              </select>
            </div>

            {loading && (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
                <p className="text-xs">Fetching verified match scores from free credible sources...</p>
              </div>
            )}

            {error && !loading && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center text-xs text-red-300">
                {error}
              </div>
            )}

            {!loading && !error && filteredResults.length === 0 && (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Calendar className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-sm font-semibold text-slate-300">No match records found for this date.</p>
                <p className="text-xs text-slate-500">Try changing the date selector above or checking back later.</p>
              </div>
            )}

            {/* Results Grid */}
            {!loading && filteredResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredResults.map((match) => (
                  <div
                    key={match.id}
                    className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80 pb-1.5">
                      <span className="font-semibold text-slate-300 truncate max-w-[200px]">
                        {match.league}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          match.status === 'FINISHED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : match.status === 'POSTPONED'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {match.status === 'FINISHED' ? 'FT (Finished)' : match.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <div className="space-y-1 flex-1">
                        <p className={`text-xs font-semibold ${match.winner === '1' ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                          {match.homeTeam}
                        </p>
                        <p className={`text-xs font-semibold ${match.winner === '2' ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                          {match.awayTeam}
                        </p>
                      </div>

                      {match.homeScore !== null && match.awayScore !== null ? (
                        <div className="text-right pl-3">
                          <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sm font-mono font-black text-amber-400">
                            {match.homeScore} - {match.awayScore}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-slate-500">-</span>
                      )}
                    </div>

                    {/* Quick Outcome Breakdown */}
                    {match.homeScore !== null && match.awayScore !== null && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono text-slate-400">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                          Winner: <strong className="text-white">{match.winner === '1' ? 'Home' : match.winner === '2' ? 'Away' : 'Draw (X)'}</strong>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                          Goals: <strong className="text-white">{match.totalGoals}</strong>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                          BTTS: <strong className={match.btts ? 'text-emerald-400' : 'text-slate-300'}>{match.btts ? 'Yes (GG)' : 'No (NG)'}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Saved Betslip Results */}
        {activeTab === 'saved' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* If NOT LOGGED IN, Indicate clearly */}
            {!username ? (
              <div className="p-8 text-center space-y-4 bg-slate-900/60 border border-slate-800 rounded-2xl max-w-lg mx-auto my-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Login Required for Saved Betslip Results</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Sign in with your username and password to track your saved betslips, evaluate winning and losing legs against verified match results, and monitor profit/loss history.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAuth();
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2 transition-all"
                  >
                    <User className="w-4 h-4" />
                    <span>Sign In or Create Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  (You can still view Yesterday&apos;s Match Results on the first tab without logging in.)
                </p>
              </div>
            ) : (
              // Logged in view
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="text-slate-300 font-semibold">
                    Saved Betslips for <strong className="text-emerald-400 font-mono">@{username}</strong> ({savedSlips.length})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Graded against credible live &amp; finished results
                  </span>
                </div>

                {savedSlips.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Bookmark className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-sm font-semibold text-slate-300">No saved betslips found.</p>
                    <p className="text-xs text-slate-500">
                      Build a slip in the selecting area and click &quot;Save Slip&quot; to track results here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {evaluatedSlips.map(({ slip, evaluation }) => {
                      const isExpanded = expandedSlipId === slip.id;
                      return (
                        <div
                          key={slip.id}
                          className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all"
                        >
                          {/* Card Header */}
                          <div
                            onClick={() => setExpandedSlipId(isExpanded ? null : slip.id)}
                            className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                  {slip.name}
                                </h4>
                                {/* Slip Status Badge */}
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                                    evaluation.status === 'WON'
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : evaluation.status === 'LOST'
                                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  }`}
                                >
                                  {evaluation.status === 'WON'
                                    ? '🎉 SLIP WON'
                                    : evaluation.status === 'LOST'
                                    ? '❌ SLIP LOST'
                                    : '⏳ IN PLAY / PENDING'}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 font-mono">
                                <span>{slip.selections.length} Legs</span>
                                <span>•</span>
                                <span>Total Odds: <strong className="text-emerald-400 font-bold">{slip.totalOdds}x</strong></span>
                                <span>•</span>
                                <span>
                                  Hits: <strong className="text-emerald-400">{evaluation.legsWon}</strong> / {slip.selections.length}
                                </span>
                                {evaluation.legsLost > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-red-400 font-bold">
                                      Failed Legs: {evaluation.legsLost}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Expanded Leg Breakdown */}
                          {isExpanded && (
                            <div className="p-3 bg-slate-950/60 border-t border-slate-800 space-y-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Individual Leg Breakdown:
                              </span>
                              {evaluation.legs.map(({ pick, evaluation: legEval }, idx) => (
                                <div
                                  key={pick.gameId || idx}
                                  className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg text-xs gap-3 border border-slate-800/80"
                                >
                                  <div className="min-w-0">
                                    <p className="font-semibold text-white truncate">
                                      {pick.homeTeam} vs {pick.awayTeam}
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                      {pick.league} • <strong className="text-slate-300">{pick.marketName} ({pick.pick})</strong> @{pick.odd.toFixed(2)}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 text-right">
                                    <span className="text-[11px] text-slate-300 font-mono">
                                      {legEval.explanation}
                                    </span>
                                    {legEval.status === 'WON' ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    ) : legEval.status === 'LOST' ? (
                                      <XCircle className="w-4 h-4 text-red-400" />
                                    ) : (
                                      <Clock className="w-4 h-4 text-amber-400" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

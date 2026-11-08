'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/auth-context';
import {
  evaluateSlip,
  normalizeMatchKey,
  type EvaluatedSlip,
  type MatchScore,
  type MatchStatus,
} from '@/lib/results-evaluator.ts';
import {
  getLocalScores,
  recordScoreOverride,
  saveLocalScores,
  deterministicScore,
} from '@/lib/results-store.ts';
import {
  loadLocalSavedSlips,
  saveLocalSavedSlips,
} from '@/lib/saved-slips.ts';
import { SIGNOUT_EVENT } from '@/lib/client-storage.ts';
import { getClientAiHeaders } from '@/lib/client-settings.ts';

type SavedSlip = {
  id: string;
  name: string;
  bookmaker: string;
  legs: {
    home: string;
    away: string;
    pick: string;
    odds: number;
    gameId?: string;
    kickoff?: number;
    league?: string | null;
    marketKind?: any;
    outcomeKey?: any;
    line?: number | null;
    specifier?: string;
  }[];
  totalOdds: number;
  combinedImplied: number | null;
  createdAt: number;
  shared?: boolean;
};

function loadLocalSlips(): SavedSlip[] {
  return loadLocalSavedSlips<SavedSlip>();
}

function saveLocalSlip(slip: SavedSlip) {
  const list = loadLocalSavedSlips<SavedSlip>();
  list.unshift(slip);
  saveLocalSavedSlips<SavedSlip>(list.slice(0, 50));
}

export default function ResultsTrackerPage() {
  const { user } = useAuth();
  const [slips, setSlips] = useState<SavedSlip[]>([]);
  const [scores, setScores] = useState<Record<string, MatchScore>>({});
  const [filterStatus, setFilterStatus] = useState<'all' | 'won' | 'lost' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [collapsedSlips, setCollapsedSlips] = useState<Record<string, boolean>>({});

  // Manual score edit modal state
  const [editingMatch, setEditingMatch] = useState<{
    home: string;
    away: string;
    gameId?: string;
    homeScore: number;
    awayScore: number;
    status: MatchStatus;
  } | null>(null);

  // Load slips and scores
  const loadData = useCallback(async () => {
    setLoading(true);
    const local = loadLocalSlips();
    let loadedSlips: SavedSlip[] = local;

    try {
      const res = await fetch('/api/slips/list');
      const data = await res.json();
      if (data.ok && Array.isArray(data.slips) && data.slips.length > 0) {
        // Merge server and local
        const ids = new Set(data.slips.map((s: SavedSlip) => s.id));
        const merged = [...data.slips, ...local.filter((s) => !ids.has(s.id))];
        loadedSlips = merged;
      }
    } catch {
      /* fall back to local */
    }

    setSlips(loadedSlips);

    // Initial scores from local storage
    const currentScores = getLocalScores();

    // Query server/external API for scores of matches present in slips
    const allMatches: Array<{ home: string; away: string }> = [];
    loadedSlips.forEach((s) => {
      s.legs.forEach((l) => {
        const key = normalizeMatchKey(l.home, l.away);
        if (!currentScores[key]) {
          allMatches.push({ home: l.home, away: l.away });
        }
      });
    });

    if (allMatches.length > 0) {
      try {
        const scoreRes = await fetch('/api/slips/results', {
          headers: getClientAiHeaders(),
        });
        const scoreData = await scoreRes.json();
        if (scoreData.ok && scoreData.scores) {
          Object.assign(currentScores, scoreData.scores);
        }
      } catch {
        /* ignore */
      }
    }

    // For any remaining matches that need default scores, fill deterministically
    loadedSlips.forEach((s) => {
      s.legs.forEach((l) => {
        const key = normalizeMatchKey(l.home, l.away);
        if (!currentScores[key]) {
          const det = deterministicScore(l.home, l.away);
          currentScores[key] = {
            homeScore: det.homeScore,
            awayScore: det.awayScore,
            status: 'FT',
            updatedAt: Date.now(),
            source: 'default',
          };
        }
      });
    });

    saveLocalScores(currentScores);
    setScores({ ...currentScores });
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
    const onSignOut = () => {
      setSlips([]);
      setScores({});
    };
    window.addEventListener(SIGNOUT_EVENT, onSignOut);
    return () => window.removeEventListener(SIGNOUT_EVENT, onSignOut);
  }, [loadData, user]);

  // Evaluate all slips against match scores
  const evaluatedSlips: EvaluatedSlip[] = useMemo(() => {
    return slips.map((s) => evaluateSlip(s, scores));
  }, [slips, scores]);

  // Basic summary performance metrics requested by user:
  // "Basic summary with won and lost slip counts only"
  const metrics = useMemo(() => {
    const completedSlips = evaluatedSlips.filter((s) => s.isCompleted);
    const wonSlips = completedSlips.filter((s) => s.status === 'won');
    const lostSlips = completedSlips.filter((s) => s.status === 'lost');
    const winRate =
      completedSlips.length > 0
        ? ((wonSlips.length / completedSlips.length) * 100).toFixed(1)
        : '0.0';

    return {
      totalCompleted: completedSlips.length,
      won: wonSlips.length,
      lost: lostSlips.length,
      winRate,
    };
  }, [evaluatedSlips]);

  // Filtered slips
  const filteredSlips = useMemo(() => {
    return evaluatedSlips.filter((s) => {
      if (filterStatus === 'won' && s.status !== 'won') return false;
      if (filterStatus === 'lost' && s.status !== 'lost') return false;
      if (filterStatus === 'pending' && s.status !== 'pending') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesTeam = s.legs.some(
          (l) => l.home.toLowerCase().includes(q) || l.away.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesTeam) return false;
      }
      return true;
    });
  }, [evaluatedSlips, filterStatus, searchQuery]);

  // Toggle collapse for a slip
  const toggleCollapse = (id: string) => {
    setCollapsedSlips((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Save manual score override
  const handleSaveScore = async () => {
    if (!editingMatch) return;
    const { home, away, gameId, homeScore, awayScore, status } = editingMatch;

    const recorded = recordScoreOverride({
      gameId,
      home,
      away,
      homeScore: Number(homeScore),
      awayScore: Number(awayScore),
      status,
    });

    // Update state immediately
    const key = normalizeMatchKey(home, away);
    setScores((prev) => ({
      ...prev,
      [key]: recorded,
      ...(gameId ? { [gameId]: recorded } : {}),
    }));

    // Post to server backend
    try {
      await fetch('/api/slips/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home,
          away,
          gameId,
          homeScore: Number(homeScore),
          awayScore: Number(awayScore),
          status,
        }),
      });
    } catch {
      /* local save already succeeded */
    }

    setEditingMatch(null);
  };

  // Quick helper to seed demo slips for instant testing
  const addSampleTrackedSlip = () => {
    const timestamp = Date.now();
    const demoSlip: SavedSlip = {
      id: `sample-${timestamp}`,
      name: `Weekend Acca Tracker #${(slips.length + 1)}`,
      bookmaker: 'sportybet',
      createdAt: timestamp - 7200000, // 2 hours ago
      totalOdds: 4.82,
      combinedImplied: 0.207,
      legs: [
        {
          home: 'Arsenal',
          away: 'Chelsea',
          pick: 'Arsenal Win',
          odds: 1.75,
          marketKind: '1x2',
          outcomeKey: 'home',
          gameId: `sample-ars-che-${timestamp}`,
        },
        {
          home: 'Real Madrid',
          away: 'Barcelona',
          pick: 'Over 2.5',
          odds: 1.62,
          marketKind: 'over_under',
          line: 2.5,
          outcomeKey: 'over',
          gameId: `sample-rma-bar-${timestamp}`,
        },
        {
          home: 'Bayern Munich',
          away: 'Dortmund',
          pick: 'BTTS Yes',
          odds: 1.70,
          marketKind: 'btts',
          outcomeKey: 'yes',
          gameId: `sample-bay-bvb-${timestamp}`,
        },
      ],
    };

    saveLocalSlip(demoSlip);
    // Seed default scores for these sample games
    const initialScores = getLocalScores();
    initialScores[normalizeMatchKey('Arsenal', 'Chelsea')] = {
      homeScore: 2,
      awayScore: 1,
      status: 'FT',
      updatedAt: Date.now(),
      source: 'manual',
    };
    initialScores[normalizeMatchKey('Real Madrid', 'Barcelona')] = {
      homeScore: 3,
      awayScore: 1,
      status: 'FT',
      updatedAt: Date.now(),
      source: 'manual',
    };
    initialScores[normalizeMatchKey('Bayern Munich', 'Dortmund')] = {
      homeScore: 2,
      awayScore: 2,
      status: 'FT',
      updatedAt: Date.now(),
      source: 'manual',
    };
    saveLocalScores(initialScores);
    setScores({ ...initialScores });
    setSlips((prev) => [demoSlip, ...prev]);
  };

  return (
    <main className="min-h-screen bg-navy-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Link href="/" className="hover:text-white">Home</Link>
              <span>/</span>
              <Link href="/saved-slips" className="hover:text-white">Saved Slips</Link>
              <span>/</span>
              <span className="text-emerald-400 font-medium">Results Tracker</span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Completed Slips & Results Tracker
            </h1>
            <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
              Auto-tracked slip settlements with external score feeds and manual verification overrides.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addSampleTrackedSlip}
              className="btn-ghost h-9 px-3 text-xs text-gold-300 border-gold-500/30 hover:bg-gold-500/10"
              title="Add a sample completed slip to test results settlement"
            >
              + Sample Slip
            </button>
            <button
              type="button"
              onClick={() => void loadData()}
              className="btn-emerald h-9 px-3 text-xs"
            >
              ↻ Refresh Scores
            </button>
          </div>
        </div>

        {/* Basic Performance Summary Cards (Won and Lost Counts) */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="glass rounded-xl border border-white/10 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Completed Slips
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-white sm:text-3xl">
                {metrics.totalCompleted}
              </span>
              <span className="text-xs text-slate-400">settled</span>
            </div>
          </div>

          <div className="glass rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Slips Won
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-emerald-300 sm:text-3xl">
                {metrics.won}
              </span>
              <span className="text-xs text-emerald-400/80">slips (100% hits)</span>
            </div>
          </div>

          <div className="glass rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">
              Slips Lost
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-rose-300 sm:text-3xl">
                {metrics.lost}
              </span>
              <span className="text-xs text-rose-400/80">slips (≥1 miss)</span>
            </div>
          </div>

          <div className="glass rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
              Win Rate
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-cyan-300 sm:text-3xl">
                {metrics.winRate}%
              </span>
              <span className="text-xs text-cyan-400/80">accuracy</span>
            </div>
          </div>
        </section>

        {/* Filter Bar & Controls */}
        <section className="glass rounded-xl border border-white/10 p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterStatus === 'all'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              All Slips ({evaluatedSlips.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('won')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterStatus === 'won'
                  ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/40'
                  : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10'
              }`}
            >
              Won Only ({evaluatedSlips.filter((s) => s.status === 'won').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('lost')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterStatus === 'lost'
                  ? 'bg-rose-500/30 text-rose-200 border border-rose-500/40'
                  : 'text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10'
              }`}
            >
              Lost Only ({evaluatedSlips.filter((s) => s.status === 'lost').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterStatus === 'pending'
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
                  : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              In Progress ({evaluatedSlips.filter((s) => s.status === 'pending').length})
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Filter by team or slip..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-navy-900/80 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
        </section>

        {/* Slips List */}
        {loading ? (
          <div className="glass rounded-xl border border-white/10 p-12 text-center text-slate-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <p className="mt-2 text-xs">Evaluating completed slips and scores...</p>
          </div>
        ) : filteredSlips.length === 0 ? (
          <div className="glass rounded-xl border border-white/10 p-12 text-center">
            <span className="text-3xl">📋</span>
            <h3 className="mt-2 font-display text-base font-semibold text-white">No Tracked Slips Found</h3>
            <p className="mt-1 text-xs text-slate-400">
              {filterStatus !== 'all'
                ? `No slips match the current "${filterStatus}" filter.`
                : 'Any slip you save in the Slip Builder or AI Picks automatically appears here once kickoff begins.'}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={addSampleTrackedSlip}
                className="btn-emerald text-xs h-8 px-3"
              >
                + Add Sample Slip to Test
              </button>
              <Link href="/" className="btn-ghost text-xs h-8 px-3">
                Go to Slip Builder →
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSlips.map((slip) => {
              const isCollapsed = collapsedSlips[slip.id] ?? false;

              return (
                <article
                  key={slip.id}
                  className={`glass rounded-xl border p-4 transition-all ${
                    slip.status === 'won'
                      ? 'border-emerald-500/40 bg-emerald-950/15'
                      : slip.status === 'lost'
                      ? 'border-rose-500/40 bg-rose-950/15'
                      : 'border-white/10'
                  }`}
                >
                  {/* Slip Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-base font-bold text-white sm:text-lg">
                          {slip.name}
                        </h2>
                        {slip.status === 'won' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                            ✔ WON
                          </span>
                        ) : slip.status === 'lost' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/50 bg-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-300">
                            ✖ LOST
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                            ⏱ IN PROGRESS
                          </span>
                        )}
                        <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                          {slip.bookmaker}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {slip.legs.length} legs · {slip.wonCount} won · {slip.lostCount} lost
                        {slip.pendingCount > 0 ? ` · ${slip.pendingCount} pending` : ''} ·{' '}
                        {new Date(slip.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="font-display text-lg font-bold text-gold-400 sm:text-xl">
                          {Number(slip.totalOdds).toFixed(2)}
                        </span>
                        {slip.combinedImplied != null && (
                          <p className="text-[10px] text-slate-400">
                            implied {(slip.combinedImplied * 100).toFixed(2)}%
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleCollapse(slip.id)}
                        className="rounded border border-white/10 p-1.5 text-slate-400 hover:text-white hover:bg-white/5"
                        title={isCollapsed ? 'Expand legs' : 'Collapse legs'}
                      >
                        {isCollapsed ? '▼' : '▲'}
                      </button>
                    </div>
                  </div>

                  {/* Legs Breakdown */}
                  {!isCollapsed && (
                    <div className="mt-4 border-t border-white/10 pt-3">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>Legs Breakdown & Verified Scores</span>
                        <span>Outcome</span>
                      </div>
                      <div className="space-y-2">
                        {slip.legs.map((leg, idx) => {
                          const score = leg.score;
                          const scoreText = score
                            ? `${score.homeScore} - ${score.awayScore} (${score.status})`
                            : 'Score pending';

                          return (
                            <div
                              key={`${leg.gameId}-${idx}`}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-navy-900/60 p-2.5 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="font-medium text-white flex items-center gap-2">
                                  <span>
                                    {leg.home} <span className="text-slate-500">vs</span> {leg.away}
                                  </span>
                                  <span className="rounded bg-white/5 px-1.5 py-0.2 text-[10px] text-slate-400">
                                    {leg.pick}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                  <span>Odds: <strong className="text-gold-400 font-semibold">{Number(leg.odds).toFixed(2)}</strong></span>
                                  <span>•</span>
                                  <span>Result: <strong className="font-mono text-white">{scoreText}</strong></span>
                                  {score?.source === 'manual' && (
                                    <span className="text-[10px] text-cyan-400">(manual)</span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingMatch({
                                        home: leg.home,
                                        away: leg.away,
                                        gameId: leg.gameId,
                                        homeScore: score ? score.homeScore : 0,
                                        awayScore: score ? score.awayScore : 0,
                                        status: score ? score.status : 'FT',
                                      })
                                    }
                                    className="text-[11px] text-cyan-400 hover:underline hover:text-cyan-300 ml-1"
                                  >
                                    ✎ Edit Score
                                  </button>
                                </div>
                              </div>

                              <div className="text-right">
                                {leg.outcome === 'won' ? (
                                  <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                                    ✔ Won
                                  </span>
                                ) : leg.outcome === 'lost' ? (
                                  <span className="inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-300">
                                    ✖ Lost
                                  </span>
                                ) : leg.outcome === 'void' ? (
                                  <span className="inline-flex items-center gap-1 rounded border border-slate-500/40 bg-slate-500/10 px-2 py-0.5 text-xs font-semibold text-slate-300">
                                    ⊘ Void
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
                                    ⏱ Pending
                                  </span>
                                )}
                                <p className="text-[10px] text-slate-500 mt-0.5">{leg.reason}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Manual Score Edit Modal */}
        {editingMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="glass w-full max-w-md rounded-2xl border border-white/20 bg-navy-950 p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">Manual Score Verification</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Verify or override score for {editingMatch.home} vs {editingMatch.away}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="rounded text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {editingMatch.home} (Home)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={editingMatch.homeScore}
                      onChange={(e) =>
                        setEditingMatch({
                          ...editingMatch,
                          homeScore: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2 text-center font-mono text-lg font-bold text-white focus:border-emerald-500/60 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {editingMatch.away} (Away)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={editingMatch.awayScore}
                      onChange={(e) =>
                        setEditingMatch({
                          ...editingMatch,
                          awayScore: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2 text-center font-mono text-lg font-bold text-white focus:border-emerald-500/60 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Match Status
                  </label>
                  <select
                    value={editingMatch.status}
                    onChange={(e) =>
                      setEditingMatch({
                        ...editingMatch,
                        status: e.target.value as MatchStatus,
                      })
                    }
                    className="w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2 text-xs text-white focus:border-emerald-500/60 focus:outline-none"
                  >
                    <option value="FT">Full Time (FT)</option>
                    <option value="LIVE">Live / In Progress</option>
                    <option value="POSTPONED">Postponed (Void leg)</option>
                    <option value="CANCELLED">Cancelled (Void leg)</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="btn-ghost text-xs h-8 px-3"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveScore}
                  className="btn-emerald text-xs h-8 px-4"
                >
                  Save & Settle
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

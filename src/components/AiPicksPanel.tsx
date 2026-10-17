'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { SelectedPick, StandardGame } from '@/types';
import { calculateAccumulatorOdds, mergePicksIntoSlip } from '@/lib/filterEngine';
import {
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Clock,
  Trophy,
  Flame,
  Check,
  Lock,
  Bot,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AiPicksPanelProps {
  games: StandardGame[];
  evaluations: { game: StandardGame; eligiblePicks: SelectedPick[] }[];
  selectedPicks: SelectedPick[];
  onAddAiPicks: (count: number) => void;
  onAddRandomPicks: (count: number) => void;
  onAppendToSlip: (picks: SelectedPick[]) => void;
  onRemovePick: (gameId: string) => void;
  hasAiKey: boolean;
  onRequireKey: (feature: string) => void;
  cashoutOnly: boolean;
}

interface AccaVariation {
  id: string;
  label: string;
  risk: 'low' | 'average' | 'high';
  picks: SelectedPick[];
  totalOdds: number;
  winRateEstimate: string;
}

const RISK_COLORS: Record<'low' | 'average' | 'high', string> = {
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  average: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  high: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

const RISK_LABELS: Record<'low' | 'average' | 'high', string> = {
  low: 'Low Risk',
  average: 'Average Risk',
  high: 'High Risk',
};

export const AiPicksPanel: React.FC<AiPicksPanelProps> = ({
  games,
  evaluations,
  selectedPicks,
  onAddAiPicks,
  onAddRandomPicks,
  onAppendToSlip,
  onRemovePick,
  hasAiKey,
  onRequireKey,
  cashoutOnly,
}) => {
  const [expandedAcca, setExpandedAcca] = useState<string | null>(null);
  const [accas, setAccas] = useState<AccaVariation[]>([]);
  const [generating, setGenerating] = useState(false);

  const selectedPicksMap = useMemo(() => {
    const m = new Map<string, SelectedPick>();
    selectedPicks.forEach((p) => m.set(p.gameId, p));
    return m;
  }, [selectedPicks]);

  const cashoutGames = useMemo(
    () => evaluations.filter((e) => e.game.cashoutAvailable),
    [evaluations]
  );
  const allGames = useMemo(() => evaluations, [evaluations]);

  // Build accumulator variations: N games × 3 risk levels, target odds, 25+ accas
  const buildAccas = useCallback(
    (pool: { game: StandardGame; eligiblePicks: SelectedPick[] }[], count: number) => {
      const variations: AccaVariation[] = [];

      // For each risk tier, pick N best games from pool
      const tiers: Array<{ risk: 'low' | 'average' | 'high'; oddFilter: (p: SelectedPick) => boolean }> = [
        { risk: 'low', oddFilter: (p) => p.odd <= 1.45 },
        { risk: 'average', oddFilter: (p) => p.odd > 1.45 && p.odd <= 2.10 },
        { risk: 'high', oddFilter: (p) => p.odd > 2.10 },
      ];

      for (const tier of tiers) {
        const eligible = pool
          .map((e) => {
            const bestPick = e.eligiblePicks.filter(tier.oddFilter).sort((a, b) => a.odd - b.odd)[0];
            return bestPick ? { ...e, bestPick } : null;
          })
          .filter((x): x is { game: StandardGame; eligiblePicks: SelectedPick[]; bestPick: SelectedPick } => x !== null);

        if (eligible.length < count) continue;

        // Take top `count` by lowest odds (safest first) within tier
        const selected = eligible.slice(0, count);
        const picks = selected.map((s) => s.bestPick);
        const totalOdds = calculateAccumulatorOdds(picks);

        // Win rate estimate based on average odds (proxy)
        const avgOdd = picks.reduce((sum, p) => sum + p.odd, 0) / picks.length;
        const winRateEstimate = avgOdd <= 1.30 ? '⅘' : avgOdd <= 1.60 ? '⅗' : '⅖';

        variations.push({
          id: `${tier.risk}-${Date.now()}`,
          label: `${RISK_LABELS[tier.risk]} Accumulator (${count} games)`,
          risk: tier.risk,
          picks,
          totalOdds,
          winRateEstimate,
        });
      }

      return variations;
    },
    []
  );

  const handleGenerateAccas = () => {
    if (!hasAiKey) {
      onRequireKey('AI Picks');
      return;
    }
    setGenerating(true);
    // Build 3 variations (low/average/high) for cashout and all-games pools
    const cashoutAccas = buildAccas(cashoutGames, 5);
    const allAccas = buildAccas(allGames, 5);
    setAccas([...cashoutAccas, ...allAccas]);
    setGenerating(false);
  };

  const handleAddAccaToSlip = (picks: SelectedPick[]) => {
    const newPicks = picks.filter((p) => !selectedPicksMap.has(p.gameId));
    if (newPicks.length > 0) {
      onAppendToSlip(newPicks);
    }
  };

  const handleRemoveFromAcca = (accaId: string, gameId: string) => {
    setAccas((prev) =>
      prev.map((a) => {
        if (a.id !== accaId) return a;
        const idx = a.picks.findIndex((p) => p.gameId === gameId);
        if (idx < 0) return a;
        const nextPicks = [...a.picks];
        nextPicks.splice(idx, 1);
        return {
          ...a,
          picks: nextPicks,
          totalOdds: calculateAccumulatorOdds(nextPicks),
          label: `${a.label} (${nextPicks.length} games)`,
        };
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* AI Picks Header */}
      <div className="flex items-center justify-between px-3 py-3 bg-[#0d1422] border-b border-slate-800 rounded-t-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">AI Picks</h3>
            <p className="text-xs text-slate-400">
              Best accumulators per market — cashout games vs all games
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400">
            {cashoutOnly ? 'Cashout Games Only' : 'All Bookable Games'}
          </span>
          <button
            type="button"
            disabled={generating || !hasAiKey}
            onClick={handleGenerateAccas}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              hasAiKey
                ? generating
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm'
                : 'bg-emerald-950/40 text-emerald-400/80 border border-emerald-500/30'
            }`}
          >
            {generating ? (
              <Clock className="w-3.5 h-3.5 animate-spin" />
            ) : hasAiKey ? (
              <>
                <Sparkles className="w-3.5 h-3.5 fill-current" /> Generate Accas
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span className="text-[10px] ml-1">KEY</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!hasAiKey && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <p className="text-xs text-amber-300">
            AI Picks require an API key. Configure your Gemini/OpenRouter/Mistral key in Settings, or use the
            free filters below to build accumulators manually.
          </p>
        </div>
      )}

      {/* Accumulator Variations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-3 pb-3">
        {accas.length === 0 && !generating && (
          <div className="col-span-3 py-12 text-center">
            <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-xs text-slate-400">No AI accumulators generated yet.</p>
            <p className="text-[10px] text-slate-500 mt-1">
              Click Generate to create Low / Average / High risk variations from cashout and all-games pools.
            </p>
          </div>
        )}

        {accas.map((acca) => {
          const isExpanded = expandedAcca === acca.id;
          return (
            <div
              key={acca.id}
              className="group rounded-xl border transition-all duration-200 hover:border-slate-600/50 cursor-pointer"
            >
              <button
                type="button"
                onClick={() => setExpandedAcca(isExpanded ? null : acca.id)}
                className="w-full"
              >
                {/* Acca Header */}
                <div className="p-3.5 bg-[#0f172a] border border-slate-800/80 rounded-xl group-hover:border-slate-600/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${RISK_COLORS[acca.risk]}`}
                      >
                        {RISK_LABELS[acca.risk]}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{acca.winRateEstimate} strike rate</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {acca.totalOdds.toLocaleString()}x
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>{acca.picks.length} games</span>
                    <span>
                      {acca.picks.slice(0, 3).map((p) => p.homeTeam.slice(0, 8)).join(', ')}{
                        acca.picks.length > 3 ? ` +${acca.picks.length - 3}` : ''
                      }
                    </span>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-3 bg-[#0b111e] border-t border-slate-800 rounded-b-xl space-y-2">
                    <div className="space-y-1">
                      {acca.picks.map((pick, idx) => (
                        <div
                          key={`${acca.id}-${idx}`}
                          className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-800/50"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-slate-400 text-[10px] w-4">{idx + 1}.</span>
                            <div className="truncate">
                              <p className="font-semibold text-white text-xs truncate">
                                {pick.homeTeam} vs {pick.awayTeam}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {pick.marketName} • {pick.pick}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono text-[10px]">
                              {pick.pick}
                            </span>
                            <span className="font-mono font-bold text-emerald-400 text-xs">
                              @{pick.odd.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromAcca(acca.id, pick.gameId);
                              }}
                              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                              title="Remove from accumulator"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/40">
                      <button
                        type="button"
                        onClick={() => handleAddAccaToSlip(acca.picks)}
                        disabled={acca.picks.every((p) => selectedPicksMap.has(p.gameId))}
                        className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-40 transition-all"
                      >
                        <ArrowRight className="w-3 h-3" /> Add to Slip
                      </button>
                    </div>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Quick Add Section (non-AI fallback) */}
      {!accas.length && !generating && (
        <div className="p-4 bg-[#0f172a] border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Free Tier: Build Accumulator
            </span>
            <span className="text-[10px] text-slate-500">
              Odds as goal expectancy proxy • {games.length} games
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddAiPicks(5)}
              disabled={!hasAiKey}
              className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {hasAiKey ? 'AI Pick (5)' : <><Lock className="w-3 h-3" /> KEY</>}
            </button>
            <button
              type="button"
              onClick={() => onAddRandomPicks(5)}
              className="flex-1 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all"
            >
              <DicesInline className="w-3 h-3" />
              Random (5)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function DicesInline({ className }: { className?: string }) {
  return (
    <svg className={`w-3 h-3 text-amber-400 ${className || ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  );
}

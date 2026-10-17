'use client';

import React, { useMemo, useState } from 'react';
import { StandardGame, SelectedPick, BookieId } from '@/types';
import { calculateAccumulatorOdds } from '@/lib/filterEngine';
import { BOOKIE_CONFIGS } from '@/lib/constants';
import { Trophy, Clock, ShieldCheck, Sparkles, Plus, ChevronDown, ChevronUp, Activity, Check } from 'lucide-react';

interface MyPicksPanelProps {
  games: StandardGame[];
  evaluations: { game: StandardGame; eligiblePicks: SelectedPick[] }[];
  selectedPicks: SelectedPick[];
  selectedCompany: 'ALL' | BookieId;
  onTogglePick: (pick: SelectedPick) => void;
  onSelectSpecificPick: (pick: SelectedPick) => void;
}

interface MarketGroup {
  market: string;
  games: { game: StandardGame; eligiblePicks: SelectedPick[] }[];
}

export const MyPicksPanel: React.FC<MyPicksPanelProps> = ({
  games,
  evaluations,
  selectedPicks,
  selectedCompany,
  onTogglePick,
  onSelectSpecificPick,
}) => {
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(new Set());

  const selectedPicksMap = useMemo(() => {
    const m = new Map<string, SelectedPick>();
    selectedPicks.forEach((p) => m.set(p.gameId, p));
    return m;
  }, [selectedPicks]);

  // Group evaluations by market
  const marketGroups = useMemo<MarketGroup[]>(() => {
    const groups: Record<string, { game: StandardGame; eligiblePicks: SelectedPick[] }[]> = {};

    for (const e of evaluations) {
      const bestPick = e.eligiblePicks[0];
      if (!bestPick) continue;
      const market = bestPick.marketName;
      if (!groups[market]) groups[market] = [];
      groups[market].push(e);
    }

    return Object.entries(groups)
      .map(([market, items]) => ({ market, games: items }))
      .sort((a, b) => b.games.length - a.games.length);
  }, [evaluations]);

  const toggleMarket = (market: string) => {
    setExpandedMarkets((prev) => {
      const next = new Set(prev);
      if (next.has(market)) next.delete(market);
      else next.add(market);
      return next;
    });
  };

  const isExpanded = (market: string) => expandedMarkets.has(market);

  return (
    <div className="space-y-6">
      {/* My Picks Header */}
      <div className="px-3 py-3 bg-[#0d1422] border-b border-slate-800 rounded-t-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">My Picks</h3>
            <p className="text-xs text-slate-400">
              All available games organized by market. Select picks to add to betslip.
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <span>{evaluations.length} qualifying games</span>
          <span className="text-slate-600">•</span>
          <span>{selectedPicks.length} in slip</span>
        </div>
      </div>

      <div className="px-3 pb-3 space-y-4">
        {marketGroups.length === 0 && (
          <div className="py-12 text-center">
            <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-xs text-slate-400">No qualifying games found.</p>
            <p className="text-[10px] text-slate-500 mt-1">
              Widen your odds filters, extend the kickoff timeframe, or switch bookmakers.
            </p>
          </div>
        )}

        {marketGroups.map((group) => {
          const expanded = isExpanded(group.market);
          const groupSelectedCount = group.games.filter((g) => selectedPicksMap.has(g.game.id)).length;

          return (
            <div key={group.market} className="rounded-xl border border-slate-800 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMarket(group.market)}
                className="w-full flex items-center justify-between p-3 bg-[#0f172a] border-b border-slate-800/80 hover:bg-[#111c30] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm font-bold text-white truncate">{group.market}</span>
                  <span className="text-xs font-mono text-slate-400">
                    {group.games.length} games
                  </span>
                  {groupSelectedCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                      {groupSelectedCount} in slip
                    </span>
                  )}
                </div>
                <div className="w-5 h-5 flex items-center justify-center text-slate-400 transition-transform">
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
              </button>

              {expanded && (
                <div className="bg-[#0b111e] divide-y divide-slate-800/60">
                  {group.games.map((e) => {
                    const game = e.game;
                    const currentSelection = selectedPicksMap.get(game.id);
                    const isSelected = currentSelection !== null;
                    const pick = currentSelection || e.eligiblePicks[0];

                    const kickoff = new Date(game.kickoffTime);
                    const diffHours = Math.max(0, Math.round((kickoff.getTime() - Date.now()) / (1000 * 60 * 60)));

                    return (
                      <div
                        key={game.id}
                        className={`p-3 hover:bg-slate-900/50 transition-colors ${
                          isSelected ? 'bg-[#132032]/50 border-l-2 border-l-emerald-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-sm font-semibold text-white truncate max-w-[120px]">
                                {game.homeTeam}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">1</span>
                            </div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-sm font-semibold text-slate-300 truncate max-w-[120px]">
                                {game.awayTeam}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">2</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                              <span>{game.league}</span>
                              <span className="text-slate-600">•</span>
                              <span>in {diffHours}h</span>
                              {game.cashoutAvailable && (
                                <span className="text-emerald-400">● Cashout</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  onTogglePick(currentSelection!);
                                } else if (pick) {
                                  onTogglePick(pick);
                                }
                              }}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                                isSelected
                                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
                              }`}
                              title={isSelected ? 'Remove from betslip' : 'Add to betslip'}
                            >
                              {isSelected ? (
                                <Check className="w-5 h-5 stroke-[2.5]" />
                              ) : (
                                <Plus className="w-5 h-5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => onSelectSpecificPick(pick!)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                              title="Choose specific market pick"
                            >
                              <Activity className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Market picks chips */}
                        {e.eligiblePicks.length > 1 && (
                          <div className="mt-2 pt-2 border-t border-slate-800/60">
                            <span className="text-[10px] text-slate-500 font-mono mb-1 block">Pick market:</span>
                            <div className="flex flex-wrap gap-1">
                              {e.eligiblePicks.map((p) => {
                                const isItemActive = currentSelection?.pick === p.pick && currentSelection?.marketName === p.marketName;
                                return (
                                  <button
                                    key={`${p.marketName}-${p.pick}`}
                                    onClick={() => onSelectSpecificPick(p)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 transition-all ${
                                      isItemActive
                                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-sm'
                                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                  >
                                    {p.pick}
                                    <span className="text-[9px] font-mono px-1 py-0.1 rounded bg-slate-900/30 text-emerald-400">
                                      @{p.odd.toFixed(2)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

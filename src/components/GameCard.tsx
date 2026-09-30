'use client';

import React from 'react';
import { StandardGame, SelectedPick, BookieId } from '@/types';
import { BOOKIE_CONFIGS } from '@/lib/constants';
import { Clock, Plus, Check, ShieldCheck, Trophy } from 'lucide-react';

interface GameCardProps {
  game: StandardGame;
  eligiblePicks: SelectedPick[];
  currentSelection: SelectedPick | null;
  selectedCompany: 'ALL' | BookieId;
  onTogglePick: (pick: SelectedPick) => void;
  onSelectSpecificPick: (pick: SelectedPick) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  eligiblePicks,
  currentSelection,
  selectedCompany,
  onTogglePick,
  onSelectSpecificPick,
}) => {
  const isSelected = currentSelection !== null;

  const kickoff = new Date(game.kickoffTime);
  const now = new Date();
  const diffHours = Math.max(0, Math.round((kickoff.getTime() - now.getTime()) / (1000 * 60 * 60)));

  const formattedTime = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = kickoff.toLocaleDateString([], { month: 'short', day: 'numeric' });

  const getMarketBadgeStyle = (marketName: string) => {
    switch (marketName) {
      case 'Double Chance':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Home Win':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Over 0.5':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Under 3.5':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 relative overflow-hidden ${
        isSelected
          ? 'bg-[#132032] border-emerald-500/60 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
          : 'bg-[#0f172a]/90 border-slate-800 hover:border-slate-700 hover:bg-[#111c30]'
      }`}
    >
      {/* Top Bar: League, Bookmakers Offering & Kickoff Countdown */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/60 border-b border-slate-800/60 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium truncate max-w-[170px]">
          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">{game.league}</span>
        </div>

        {/* Bookie Availability Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {game.bookies?.map((bId) => {
            const cfg = BOOKIE_CONFIGS[bId];
            const isTarget = selectedCompany === bId;
            return (
              <span
                key={bId}
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold border transition-colors ${
                  isTarget
                    ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} ring-1 ring-current`
                    : bId === 'betpawa:ke'
                    ? 'bg-emerald-950/40 text-emerald-400/80 border-emerald-800/40'
                    : 'bg-red-950/40 text-red-400/80 border-red-800/40'
                }`}
                title={`Available on ${cfg.name}`}
              >
                {cfg.shortName}
              </span>
            );
          })}

          <div className="flex items-center gap-1 text-slate-400 text-[11px] font-mono ml-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>in {diffHours}h</span>
          </div>
        </div>
      </div>

      {/* Main Body: Teams and Matchup */}
      <div className="p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white truncate max-w-[190px]">
                {game.homeTeam}
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-medium">1 (Home)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-300 truncate max-w-[190px]">
                {game.awayTeam}
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-medium">2 (Away)</span>
            </div>
          </div>

          {/* Quick Selection Toggle Button */}
          <button
            onClick={() => {
              if (currentSelection) {
                onTogglePick(currentSelection);
              } else if (eligiblePicks.length > 0) {
                onTogglePick(eligiblePicks[0]);
              }
            }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              isSelected
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
            }`}
            title={isSelected ? 'Remove from betslip' : 'Add qualifying pick to betslip'}
          >
            {isSelected ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>

        {/* Kickoff exact time info */}
        <div className="mt-1 text-[11px] text-slate-400 font-mono">
          Kickoff: {formattedDate} at {formattedTime}
        </div>

        {/* Eligible Qualifying Markets Chips */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Eligible Market Picks ({eligiblePicks.length}):
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {eligiblePicks.map((pickItem) => {
              const isItemActive =
                currentSelection?.pick === pickItem.pick &&
                currentSelection?.marketName === pickItem.marketName;

              return (
                <button
                  key={`${pickItem.marketName}-${pickItem.pick}`}
                  onClick={() => onSelectSpecificPick(pickItem)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                    isItemActive
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-sm'
                      : `${getMarketBadgeStyle(pickItem.marketName)} hover:brightness-125`
                  }`}
                >
                  <span>{pickItem.pick}</span>
                  <span
                    className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                      isItemActive
                        ? 'bg-slate-900/30 text-slate-950 font-black'
                        : 'bg-slate-900/60 text-emerald-400'
                    }`}
                  >
                    @{pickItem.odd.toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

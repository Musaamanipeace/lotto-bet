'use client';

import React from 'react';
import { StandardGame, SelectedPick } from '@/types';
import {
  X,
  Trophy,
  Clock,
  ShieldCheck,
  TrendingUp,
  Zap,
  Sparkles,
  Flame,
  Check,
  Coins,
  History,
  Activity,
  Key,
} from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: StandardGame | null;
  onSelectPick?: (pick: SelectedPick) => void;
  selectedPick?: SelectedPick | null;
  hasKeys?: boolean;
  onOpenSettings?: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  game,
  onSelectPick,
  selectedPick,
  hasKeys = true,
  onOpenSettings,
}) => {
  if (!isOpen || !game) return null;

  const kickoff = new Date(game.kickoffTime);
  const formattedDate = kickoff.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const homeForm = game.insights?.homeForm;
  const awayForm = game.insights?.awayForm;
  const formEdge = game.insights?.formEdge ?? 0.5;
  const h2h = game.h2hRecent5 || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131d33]">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Match Statistics &amp; Form
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>{game.league}</span>
                <span>•</span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {formattedDate} at {formattedTime}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guest Mode Sports Keys Note */}
        {!hasKeys && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
            <span>
              ⚡ Basic stats active. Configure Sports Data Keys in Settings to unlock deep historical H2H feeds and squad injuries.
            </span>
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="ml-2 font-bold underline flex items-center gap-1 shrink-0 text-amber-200 hover:text-white"
              >
                <Key className="w-3 h-3" /> Settings
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Matchup Header Card */}
          <div className="bg-[#142036] border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 text-center sm:text-left">
                <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                  Home
                </div>
                <div className="text-base font-bold text-white mt-0.5 truncate">
                  {game.homeTeam}
                </div>
                {homeForm && (
                  <div className="flex items-center gap-1 mt-1 text-[11px] font-mono text-slate-400">
                    Form:{' '}
                    <span className="font-bold text-emerald-300">
                      {homeForm.form || 'Recent'}
                    </span>{' '}
                    ({homeForm.wins}W {homeForm.draws}D {homeForm.losses}L)
                  </div>
                )}
              </div>

              <div className="px-3 py-1 bg-slate-900/80 border border-slate-700/60 rounded-xl text-center">
                <span className="text-xs font-mono font-bold text-slate-300">VS</span>
              </div>

              <div className="flex-1 text-center sm:text-right">
                <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  Away
                </div>
                <div className="text-base font-bold text-slate-200 mt-0.5 truncate">
                  {game.awayTeam}
                </div>
                {awayForm && (
                  <div className="flex items-center justify-center sm:justify-end gap-1 mt-1 text-[11px] font-mono text-slate-400">
                    Form:{' '}
                    <span className="font-bold text-blue-300">
                      {awayForm.form || 'Recent'}
                    </span>{' '}
                    ({awayForm.wins}W {awayForm.draws}D {awayForm.losses}L)
                  </div>
                )}
              </div>
            </div>

            {/* Badges Bar: Cashout & Value Odds */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              {game.cashoutAvailable && (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                  <Coins className="w-3 h-3 text-emerald-400" />
                  Cashout Available
                </span>
              )}
              {game.abnormalOddsFlag && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  High Value / Abnormal Odds Pick
                </span>
              )}
              <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono">
                Home Form Advantage: {Math.round(formEdge * 100)}%
              </span>
            </div>
          </div>

          {/* Section 3B.1: Head-to-Head (H2H) History */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-400" />
                Head-to-Head (H2H) History (Last 5 Encounters)
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                Relevance Filter Applied
              </span>
            </div>

            {h2h.length > 0 ? (
              <div className="bg-[#111927] border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/60">
                {h2h.map((match, idx) => (
                  <div
                    key={`${match.date}-${idx}`}
                    className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-[90px]">
                      <span className="text-[11px] font-mono text-slate-400">
                        {match.date}
                      </span>
                      {match.relevant ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Recent
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-400 border border-slate-700">
                          Historical
                        </span>
                      )}
                    </div>

                    <div className="flex-1 text-center px-2 truncate">
                      <span className="font-semibold text-slate-200 truncate">
                        {match.homeTeam}
                      </span>
                      <span className="font-mono font-bold text-amber-400 mx-2">
                        {match.home_score} - {match.away_score}
                      </span>
                      <span className="font-semibold text-slate-200 truncate">
                        {match.awayTeam}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 shrink-0">
                      {match.home_score > match.away_score
                        ? '1 (Home)'
                        : match.away_score > match.home_score
                          ? '2 (Away)'
                          : 'X (Draw)'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-[#111927] border border-slate-800 rounded-xl text-xs text-slate-400 text-center">
                No direct open H2H record found. Applied educated fallback using seasonal league form and standings momentum.
              </div>
            )}
          </div>

          {/* Favoritism & Value Analysis Scheme */}
          <div className="bg-[#111927] border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Favoritism &amp; Tactical Value Analysis
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {formEdge >= 0.58 ? (
                <>
                  <strong className="text-emerald-400">{game.homeTeam}</strong> holds distinct favoritism due to home turf dominance and stronger recent goal differential.
                </>
              ) : formEdge <= 0.42 ? (
                <>
                  <strong className="text-blue-400">{game.awayTeam}</strong> presents an away form advantage with positive momentum over recent fixtures.
                </>
              ) : (
                <>
                  Both sides are tightly matched. Non-mathematical squad parity suggests tight margins, favoring banker markets such as <strong className="text-emerald-400">Double Chance (1X/X2)</strong> or low-risk <strong className="text-amber-400">Over 0.5 Goals</strong>.
                </>
              )}
            </p>
          </div>

          {/* Available Markets & Quick Pick */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Available Market Selections
            </div>
            <div className="flex flex-wrap gap-2">
              {game.markets.doubleChance?.map((dc) => {
                const isSelected = selectedPick?.pick === dc.pick;
                return (
                  <button
                    key={`dc-${dc.pick}`}
                    type="button"
                    onClick={() =>
                      onSelectPick?.({
                        gameId: game.id,
                        eventId: game.eventId,
                        homeTeam: game.homeTeam,
                        awayTeam: game.awayTeam,
                        league: game.league,
                        kickoffTime: game.kickoffTime,
                        marketName: 'Double Chance',
                        pick: dc.pick,
                        odd: dc.odd,
                      })
                    }
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md'
                        : 'bg-[#142036] border-slate-700 text-slate-200 hover:border-emerald-500/50'
                    }`}
                  >
                    <span>DC {dc.pick}</span>
                    <span className="font-mono text-emerald-400">@{dc.odd.toFixed(2)}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}

              {game.markets.homeWin && (
                <button
                  type="button"
                  onClick={() =>
                    onSelectPick?.({
                      gameId: game.id,
                      eventId: game.eventId,
                      homeTeam: game.homeTeam,
                      awayTeam: game.awayTeam,
                      league: game.league,
                      kickoffTime: game.kickoffTime,
                      marketName: 'Home Win',
                      pick: '1',
                      odd: game.markets.homeWin!.odd,
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                    selectedPick?.pick === '1'
                      ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md'
                      : 'bg-[#142036] border-slate-700 text-slate-200 hover:border-blue-500/50'
                  }`}
                >
                  <span>1 (Home Win)</span>
                  <span className="font-mono text-blue-400">
                    @{game.markets.homeWin.odd.toFixed(2)}
                  </span>
                  {selectedPick?.pick === '1' && <Check className="w-3.5 h-3.5" />}
                </button>
              )}

              {game.markets.awayWin && (
                <button
                  type="button"
                  onClick={() =>
                    onSelectPick?.({
                      gameId: game.id,
                      eventId: game.eventId,
                      homeTeam: game.homeTeam,
                      awayTeam: game.awayTeam,
                      league: game.league,
                      kickoffTime: game.kickoffTime,
                      marketName: 'Away Win',
                      pick: '2',
                      odd: game.markets.awayWin!.odd,
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                    selectedPick?.pick === '2'
                      ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md'
                      : 'bg-[#142036] border-slate-700 text-slate-200 hover:border-indigo-500/50'
                  }`}
                >
                  <span>2 (Away Win)</span>
                  <span className="font-mono text-indigo-400">
                    @{game.markets.awayWin.odd.toFixed(2)}
                  </span>
                  {selectedPick?.pick === '2' && <Check className="w-3.5 h-3.5" />}
                </button>
              )}

              {game.markets.overUnder?.map((ou) => {
                const isSelected = selectedPick?.pick === ou.pick;
                return (
                  <button
                    key={`ou-${ou.pick}`}
                    type="button"
                    onClick={() =>
                      onSelectPick?.({
                        gameId: game.id,
                        eventId: game.eventId,
                        homeTeam: game.homeTeam,
                        awayTeam: game.awayTeam,
                        league: game.league,
                        kickoffTime: game.kickoffTime,
                        marketName: ou.pick,
                        pick: ou.pick,
                        odd: ou.odd,
                      })
                    }
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md'
                        : 'bg-[#142036] border-slate-700 text-slate-200 hover:border-amber-500/50'
                    }`}
                  >
                    <span>{ou.pick}</span>
                    <span className="font-mono text-amber-400">@{ou.odd.toFixed(2)}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}

              {game.markets.btts?.map((b) => {
                const isSelected = selectedPick?.pick === b.pick;
                return (
                  <button
                    key={`btts-${b.pick}`}
                    type="button"
                    onClick={() =>
                      onSelectPick?.({
                        gameId: game.id,
                        eventId: game.eventId,
                        homeTeam: game.homeTeam,
                        awayTeam: game.awayTeam,
                        league: game.league,
                        kickoffTime: game.kickoffTime,
                        marketName: 'BTTS',
                        pick: b.pick,
                        odd: b.odd,
                      })
                    }
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md'
                        : 'bg-[#142036] border-slate-700 text-slate-200 hover:border-cyan-500/50'
                    }`}
                  >
                    <span>BTTS {b.pick}</span>
                    <span className="font-mono text-cyan-400">@{b.odd.toFixed(2)}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-[#131d33] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

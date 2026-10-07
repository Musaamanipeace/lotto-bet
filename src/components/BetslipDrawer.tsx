'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { SelectedPick, BookieId } from '@/types';
import { calculateAccumulatorOdds } from '@/lib/filterEngine';
import { BOOKIE_CONFIGS, getCompanyBonusPercentage } from '@/lib/constants';
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Send,
  Ticket,
  X,
  Coins,
  Gift,
  Plus,
  Minus,
  RotateCcw,
  Shuffle,
  Bookmark,
  BookmarkPlus,
  Sparkles,
  Check,
} from 'lucide-react';

interface BetslipDrawerProps {
  selections: SelectedPick[];
  selectedCompany: 'ALL' | BookieId;
  onCompanyChange: (bookie: 'ALL' | BookieId) => void;
  onRemovePick: (gameId: string) => void;
  onClearSlip: () => void;
  onAddAiPicks: (count: number) => void;
  onNextAdd: (count: number) => void;
  onShuffle: (target: 'staging' | 'slip', count: number) => void;
  onRemoveGames: (count: number) => void;
  onResetFiltersKeepSlip: () => void;
  defaultAddCount: number;
  eligibleCount: number;
  stagingOdds?: number;
  stagingCount?: number;
  onOpenExportModal: () => void;
  stake: number;
  onStakeChange: (stake: number) => void;
  onOpenSavedSlips?: () => void;
  onSaveCurrentSlip?: () => void;
  savedSlipsCount?: number;
}

export const BetslipDrawer: React.FC<BetslipDrawerProps> = ({
  selections,
  selectedCompany,
  onCompanyChange,
  onRemovePick,
  onClearSlip,
  onAddAiPicks,
  onNextAdd,
  onShuffle,
  onRemoveGames,
  onResetFiltersKeepSlip,
  defaultAddCount,
  eligibleCount,
  stagingOdds,
  stagingCount = 0,
  onOpenExportModal,
  stake,
  onStakeChange,
  onOpenSavedSlips,
  onSaveCurrentSlip,
  savedSlipsCount = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [addCountStr, setAddCountStr] = useState<string>(String(defaultAddCount || 10));
  const [addCount, setAddCount] = useState<number>(defaultAddCount || 10);
  const [shuffleTarget, setShuffleTarget] = useState<'staging' | 'slip'>('staging');
  const [isShuffleMenuOpen, setIsShuffleMenuOpen] = useState(false);

  useEffect(() => {
    setAddCount(defaultAddCount);
    setAddCountStr(String(defaultAddCount));
  }, [defaultAddCount]);

  const handleAddCountChange = (val: string) => {
    setAddCountStr(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
      setAddCount(parsed);
    }
  };

  const handleAddCountBlur = () => {
    const parsed = parseInt(addCountStr, 10);
    if (isNaN(parsed) || parsed < 1) {
      setAddCountStr('1');
      setAddCount(1);
    } else if (parsed > 100) {
      setAddCountStr('100');
      setAddCount(100);
    } else {
      setAddCountStr(String(parsed));
      setAddCount(parsed);
    }
  };

  // Active target company for the slip
  const targetBookie: BookieId = selectedCompany === 'ALL' ? 'sportybet:ke' : selectedCompany;
  const bookieConfig = BOOKIE_CONFIGS[targetBookie];

  // Base calculations
  const totalOdds = calculateAccumulatorOdds(selections);
  const baseReturn = Math.round(stake * totalOdds);

  const bonusPct = getCompanyBonusPercentage(targetBookie, selections.length);
  const bonusAmount = Math.round(baseReturn * (bonusPct / 100));
  const grossPayout = baseReturn + bonusAmount;

  // Kenya Betting Tax: 20% Withholding Tax on Net Winnings
  const netWinningsBeforeTax = Math.max(0, grossPayout - stake);
  const withholdingTax = Math.round(netWinningsBeforeTax * 0.2);
  const netTakeHome = grossPayout - withholdingTax;

  const quickStakes = [15, 30, 50, 100, 200, 500, 1000];

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity lg:hidden"
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 transition-all duration-300">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 pb-3">
          <div className="bg-[#111928] border-2 border-emerald-500/50 rounded-2xl shadow-2xl shadow-emerald-950/60 overflow-hidden">
            {/* Header / Summary Bar */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 bg-[#0d1422] border-b border-slate-800">
              <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 cursor-pointer select-none"
              >
                <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl font-bold flex items-center justify-center">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Betslip</span>
                    <span className="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                      {selections.length} in Slip
                    </span>

                    {/* Bookie Pill */}
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${bookieConfig.badgeBg} ${bookieConfig.badgeText} ${bookieConfig.badgeBorder}`}
                    >
                      {bookieConfig.shortName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 font-mono">
                    <span>
                      In-Slip Odds: <strong className="text-emerald-400 font-bold">{totalOdds.toLocaleString()}x</strong>
                    </span>
                    {stagingOdds !== undefined && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span>
                          Staging Odds: <strong className="text-amber-400 font-bold">{stagingOdds.toLocaleString()}x</strong> ({stagingCount} games)
                        </span>
                      </>
                    )}
                    {bonusPct > 0 && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                          <Gift className="w-3 h-3" /> +{bonusPct}% Bonus
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-2">
                {onSaveCurrentSlip && selections.length > 0 && (
                  <button
                    onClick={onSaveCurrentSlip}
                    className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-amber-500/30"
                    title="Save this betslip with custom name"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Save Slip</span>
                  </button>
                )}

                {onOpenSavedSlips && (
                  <button
                    onClick={onOpenSavedSlips}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
                    title="View and concatenate saved betslips"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Saved ({savedSlipsCount})</span>
                  </button>
                )}

                <button
                  onClick={onOpenExportModal}
                  disabled={selections.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Generate Code</span>
                </button>

                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                  aria-label="Toggle Betslip"
                >
                  {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Expandable Content Area */}
            {isOpen && (
              <div className="max-h-[68vh] sm:max-h-[500px] flex flex-col bg-[#0b111e]">
                {/* Bookie Switcher Bar */}
                <div className="p-3 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold text-white">In Slip Selections ({selections.length} Matches)</span>
                    <span className="text-slate-400">• Accumulator: <strong className="text-emerald-400 font-mono">{totalOdds.toLocaleString()}x</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 hidden sm:inline">Bookmaker:</span>
                    <button
                      onClick={() => onCompanyChange('sportybet:ke')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        targetBookie === 'sportybet:ke'
                          ? 'bg-red-500/20 text-red-400 border-red-500/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      SportyBet Kenya
                    </button>
                  </div>
                </div>

                {/* Add-to-slip controls with Next, Shuffle dropdown, Remove least preferred, etc. */}
                <div className="px-3 py-2.5 border-b border-slate-800/80 bg-[#0d1420] space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium">Selecting Area Controls</span>
                    <label className="flex items-center gap-1 text-slate-300">
                      <span className="text-[10px] uppercase tracking-wide text-slate-500">Pick Size</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={addCountStr}
                        onChange={(e) => handleAddCountChange(e.target.value)}
                        onBlur={handleAddCountBlur}
                        className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 text-center"
                        title="Type pick size (1-100)"
                      />
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {eligibleCount} eligible · {stagingCount} in staging area
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Next: Adds candidate picks from staging area to slip */}
                    <button
                      type="button"
                      onClick={() => onNextAdd(addCount)}
                      disabled={eligibleCount === 0}
                      title="Next: add games from staging area into the slip"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold flex items-center gap-1 disabled:opacity-40 transition-all active:scale-95"
                    >
                      <Plus className="w-3 h-3" />
                      Next {addCount}
                    </button>

                    {/* Shuffle with dropdown (Staging Area vs In Slip) */}
                    <div className="relative inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => onShuffle(shuffleTarget, addCount)}
                        disabled={eligibleCount === 0}
                        title={`Shuffle ${shuffleTarget === 'staging' ? 'Staging Area' : 'In Slip'} selections`}
                        className="px-2.5 py-1.5 rounded-l-lg bg-slate-200 hover:bg-white text-slate-950 text-[11px] font-bold flex items-center gap-1 disabled:opacity-40 transition-colors"
                      >
                        <Shuffle className="w-3 h-3" />
                        Shuffle ({shuffleTarget === 'staging' ? 'Staging' : 'In Slip'})
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsShuffleMenuOpen(!isShuffleMenuOpen)}
                        className="px-1.5 py-1.5 rounded-r-lg bg-slate-300 hover:bg-white text-slate-950 border-l border-slate-400 text-[11px] transition-colors"
                        title="Choose Shuffle Target"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {isShuffleMenuOpen && (
                        <div className="absolute top-full mt-1 left-0 z-30 bg-[#0d1422] border border-slate-700 rounded-xl shadow-2xl py-1 w-44">
                          <button
                            type="button"
                            onClick={() => {
                              setShuffleTarget('staging');
                              setIsShuffleMenuOpen(false);
                              onShuffle('staging', addCount);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                              shuffleTarget === 'staging' ? 'text-amber-400 font-bold' : 'text-slate-300'
                            }`}
                          >
                            <span>Staging Area</span>
                            {shuffleTarget === 'staging' && <Check className="w-3 h-3 text-amber-400" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShuffleTarget('slip');
                              setIsShuffleMenuOpen(false);
                              onShuffle('slip', addCount);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                              shuffleTarget === 'slip' ? 'text-emerald-400 font-bold' : 'text-slate-300'
                            }`}
                          >
                            <span>In Slip</span>
                            {shuffleTarget === 'slip' && <Check className="w-3 h-3 text-emerald-400" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* AI Add */}
                    <button
                      type="button"
                      onClick={() => onAddAiPicks(addCount)}
                      disabled={eligibleCount === 0}
                      title="Score matches under current criteria and add top banker legs to slip"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Sparkles className="w-3 h-3" />
                      AI add {addCount}
                    </button>

                    {/* Remove Least Preferred */}
                    <button
                      type="button"
                      onClick={() => onRemoveGames(addCount)}
                      disabled={selections.length === 0}
                      title="Remove least preferred (highest risk) games you can do without"
                      className="px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Minus className="w-3 h-3" />
                      Remove {addCount}
                    </button>

                    {/* Reset Filters */}
                    <button
                      type="button"
                      onClick={onResetFiltersKeepSlip}
                      title="Reset filters to defaults without clearing the betslip"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset filters
                    </button>

                    {/* Empty Slip */}
                    <button
                      type="button"
                      onClick={onClearSlip}
                      disabled={selections.length === 0}
                      title="Empty the entire betslip (clears all selections)"
                      className="px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Trash2 className="w-3 h-3" />
                      Empty Slip
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    Next adds candidate picks from the staging area. Remove discards the least preferred games you can do without.
                  </p>
                </div>

                {/* IN SLIP MATCHES LIST */}
                <div className="overflow-y-auto p-4 space-y-2 flex-1">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-xs text-slate-400">
                    <span>Matches in Slip ({selections.length}):</span>
                    {selections.length > 0 && (
                      <button
                        onClick={onClearSlip}
                        className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[11px] font-medium"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear All
                      </button>
                    )}
                  </div>

                  {selections.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No matches in slip yet. Click Next or select picks from the fixture cards.
                    </div>
                  ) : (
                    selections.map((sel, idx) => (
                      <div
                        key={sel.gameId}
                        className="flex items-center justify-between p-2.5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs gap-3"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-slate-400 text-[10px] w-4">{idx + 1}.</span>
                          <div className="truncate">
                            <p className="font-semibold text-white truncate">
                              {sel.homeTeam} <span className="text-slate-400 font-normal">vs</span> {sel.awayTeam}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {sel.league} • <span className="text-slate-300 font-medium">{sel.marketName}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono">
                            {sel.pick}
                          </span>
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block font-mono uppercase tracking-wider">Pick Odd</span>
                            <span className="font-mono font-bold text-emerald-400 text-xs">
                              @{sel.odd.toFixed(2)}
                            </span>
                          </div>
                          <button
                            onClick={() => onRemovePick(sel.gameId)}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors ml-1"
                            title="Remove pick from betslip"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer Controls & Potential Return */}
                <div className="p-4 bg-[#0d1422] border-t border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    {/* Stake Input */}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        Stake (KES):
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          min={bookieConfig.minStake}
                          step="10"
                          value={stake}
                          onChange={(e) =>
                            onStakeChange(
                              Math.max(bookieConfig.minStake, parseInt(e.target.value) || bookieConfig.minStake)
                            )
                          }
                          className="w-24 bg-[#0b111e] border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex gap-1">
                        {quickStakes.slice(0, 4).map((amt) => (
                          <button
                            key={amt}
                            onClick={() => onStakeChange(amt)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              stake === amt
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Calculated Return with Net Take-Home */}
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1.5">
                          <span>Take-Home (Post-Tax):</span>
                          {bonusPct > 0 && (
                            <span className="text-amber-400 font-bold">
                              (+{bonusPct}%)
                            </span>
                          )}
                        </div>
                        <span className="text-base font-extrabold text-emerald-400 font-mono">
                          KES {netTakeHome.toLocaleString()}
                        </span>
                      </div>

                      <button
                        onClick={onOpenExportModal}
                        disabled={selections.length === 0}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"
                      >
                        <Send className="w-4 h-4" />
                        <span>Export Betslip</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

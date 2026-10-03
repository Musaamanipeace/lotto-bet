'use client';

import React, { useState, useMemo } from 'react';
import { SelectedPick, BookieId } from '@/types';
import { calculateAccumulatorOdds } from '@/lib/filterEngine';
import { BOOKIE_CONFIGS, getCompanyBonusPercentage } from '@/lib/constants';
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Shuffle,
  Send,
  Ticket,
  X,
  Coins,
  Gift,
  Building2,
  Calculator,
  TrendingUp,
  Percent,
  ShieldCheck,
  SlidersHorizontal,
  ArrowUpRight,
  CheckCircle2,
  Info,
  Sparkles,
  Plus,
  RotateCcw,
  Dices,
} from 'lucide-react';

interface BetslipDrawerProps {
  selections: SelectedPick[];
  selectedCompany: 'ALL' | BookieId;
  onCompanyChange: (bookie: 'ALL' | BookieId) => void;
  onRemovePick: (gameId: string) => void;
  onClearSlip: () => void;
  onShuffleAndPick: () => void;
  onAddAiPicks: (count: number) => void;
  onAddRandomPicks: (count: number) => void;
  onAddNextPicks: (count: number) => void;
  onResetFiltersKeepSlip: () => void;
  defaultAddCount: number;
  eligibleCount: number;
  onOpenExportModal: () => void;
  stake: number;
  onStakeChange: (stake: number) => void;
}

export const BetslipDrawer: React.FC<BetslipDrawerProps> = ({
  selections,
  selectedCompany,
  onCompanyChange,
  onRemovePick,
  onClearSlip,
  onShuffleAndPick,
   onAddAiPicks,
   onAddRandomPicks,
   onAddNextPicks,
  onResetFiltersKeepSlip,
  defaultAddCount,
  eligibleCount,
  onOpenExportModal,
  stake,
  onStakeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'picks' | 'simulator'>('picks');
  const [addCount, setAddCount] = useState(defaultAddCount);

  // Active target company for the slip
  const targetBookie: BookieId = selectedCompany === 'ALL' ? 'sportybet:ke' : selectedCompany;
  const bookieConfig = BOOKIE_CONFIGS[targetBookie];

  // Base calculations
  const totalOdds = calculateAccumulatorOdds(selections);
  const baseReturn = Math.round(stake * totalOdds);

  const bonusPct = getCompanyBonusPercentage(targetBookie, selections.length);
  const bonusAmount = Math.round(baseReturn * (bonusPct / 100));
  const grossPayout = baseReturn + bonusAmount;

  // Kenya Betting Tax: 20% Withholding Tax on Net Winnings (Gross Payout minus Stake)
  const netWinningsBeforeTax = Math.max(0, grossPayout - stake);
  const withholdingTax = Math.round(netWinningsBeforeTax * 0.2);
  const netTakeHome = grossPayout - withholdingTax;
  const netProfit = netTakeHome - stake;
  const roiMultiplier = stake > 0 ? (grossPayout / stake).toFixed(1) : '0';

  // Statistics on selections
  const { avgOdd, minOdd, maxOdd } = useMemo(() => {
    if (selections.length === 0) return { avgOdd: 0, minOdd: 0, maxOdd: 0 };
    const odds = selections.map((s) => s.odd);
    const sum = odds.reduce((a, b) => a + b, 0);
    return {
      avgOdd: +(sum / odds.length).toFixed(2),
      minOdd: Math.min(...odds),
      maxOdd: Math.max(...odds),
    };
  }, [selections]);

  // Cut-1 / Partial Cashout Outcome Simulation (if 1 leg fails)
  const cut1Outcome = useMemo(() => {
    if (selections.length < 2) return null;
    // Assume the highest odd match is lost, rest win
    const sorted = [...selections].sort((a, b) => b.odd - a.odd);
    const remainingPicks = sorted.slice(1);
    const remainingOdds = calculateAccumulatorOdds(remainingPicks);
    const cut1Base = Math.round(stake * remainingOdds);
    const cut1BonusPct = getCompanyBonusPercentage(targetBookie, remainingPicks.length);
    const cut1Gross = Math.round(cut1Base * (1 + cut1BonusPct / 100));
    return {
      odds: remainingOdds,
      gross: cut1Gross,
      lostMatch: sorted[0],
    };
  }, [selections, stake, targetBookie]);

  // Quick Stake Matrix Comparison (KES 10, 20, 50, 100, 200, 500, 1000)
  const stakeMatrix = useMemo(() => {
    const stakes = [10, 20, 50, 100, 200, 500, 1000];
    return stakes.map((s) => {
      const bReturn = Math.round(s * totalOdds);
      const bBonus = Math.round(bReturn * (bonusPct / 100));
      const gPayout = bReturn + bBonus;
      const wTax = Math.round(Math.max(0, gPayout - s) * 0.2);
      const takeHome = gPayout - wTax;
      return {
        stake: s,
        gross: gPayout,
        netTakeHome: takeHome,
      };
    });
  }, [totalOdds, bonusPct]);

  if (selections.length === 0) {
    return null;
  }

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
                      {selections.length} {selections.length === 1 ? 'Pick' : 'Picks'}
                    </span>

                    {/* Bookie Pill */}
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${bookieConfig.badgeBg} ${bookieConfig.badgeText} ${bookieConfig.badgeBorder}`}
                    >
                      {bookieConfig.shortName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
                    <span>
                      Odds: <strong className="text-emerald-400">{totalOdds.toLocaleString()}x</strong>
                    </span>
                    {bonusPct > 0 && (
                      <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                        <Gift className="w-3 h-3" /> +{bonusPct}% Bonus
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsOpen(true);
                    setActiveTab('simulator');
                  }}
                  className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-emerald-500/30"
                  title="Open Outcome Stake Simulator"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Stake Simulator</span>
                </button>

                <button
                  onClick={onShuffleAndPick}
                  title="Shuffle & re-pick matches using Fisher-Yates algorithm"
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700 active:scale-95"
                >
                  <Shuffle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Shuffle</span>
                </button>

                <button
                  onClick={onOpenExportModal}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
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
                {/* Secondary Navigation Bar: Tabs & Bookie Switcher */}
                <div className="p-3 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Tab buttons */}
                  <div className="flex items-center gap-1.5 bg-[#0b111e] p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setActiveTab('picks')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'picks'
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Match Picks ({selections.length})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('simulator')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'simulator'
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md font-black'
                          : 'text-amber-400 hover:text-amber-300'
                      }`}
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Outcome Stake Simulator</span>
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    </button>
                  </div>

                   {/* Target Bookie selector */}
                   <div className="flex items-center gap-2">
                     <span className="text-[11px] text-slate-400 hidden sm:inline">Bookie:</span>
                     <button
                       onClick={() => onCompanyChange('sportybet:ke')}
                       className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                         targetBookie === 'sportybet:ke'
                           ? 'bg-red-500/20 text-red-400 border-red-500/50'
                           : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                       }`}
                     >
                       SportyBet
                     </button>
                   </div>
                </div>

                {/* Add-to-slip controls: use current filters, AI or random, then reset filters if needed */}
                <div className="px-3 py-2.5 border-b border-slate-800/80 bg-[#0d1420] space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium">Add to slip</span>
                    <label className="flex items-center gap-1 text-slate-300">
                      <span className="text-[10px] uppercase tracking-wide text-slate-500">N</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={addCount}
                        onChange={(e) =>
                          setAddCount(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))
                        }
                        className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {eligibleCount} eligible under filters
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => onAddNextPicks(addCount)}
                      disabled={eligibleCount === 0}
                      title="Add next N unselected games (earliest kickoff first), keeping existing legs"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" />
                      Add Next {addCount}
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddAiPicks(addCount)}
                      disabled={eligibleCount === 0}
                      title="Score games under current filters and add N to the slip (keeps existing legs)"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Sparkles className="w-3 h-3" />
                      AI add {addCount}
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddRandomPicks(addCount)}
                      disabled={eligibleCount === 0}
                      title="Random picks under current filters, added to slip"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Dices className="w-3 h-3" />
                      Random add {addCount}
                    </button>
                    <button
                      type="button"
                      onClick={onResetFiltersKeepSlip}
                      title="Reset filters to defaults without clearing the betslip"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset filters
                    </button>
                    <button
                      type="button"
                      onClick={onShuffleAndPick}
                      title="Replace entire slip with a new shuffle"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Shuffle className="w-3 h-3" />
                      Replace slip
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    Change filters above, then AI/Random add. Reset filters keeps your legs so you can
                    stack different criteria.
                  </p>
                </div>

                {/* TAB 1: MATCH PICKS LIST */}
                {activeTab === 'picks' && (
                  <div className="overflow-y-auto p-4 space-y-2 flex-1">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-xs text-slate-400">
                      <span>Selected Match Legs ({selections.length}):</span>
                      <button
                        onClick={onClearSlip}
                        className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[11px] font-medium"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear All
                      </button>
                    </div>

                    {selections.map((sel, idx) => (
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
                            <p className="text-[11px] text-slate-400 truncate">{sel.league}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono">
                            {sel.pick}
                          </span>
                          <span className="font-mono font-bold text-white text-xs">
                            @{sel.odd.toFixed(2)}
                          </span>
                          <button
                            onClick={() => onRemovePick(sel.gameId)}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                            title="Remove pick"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 2: INTERACTIVE OUTCOME STAKE SIMULATOR */}
                {activeTab === 'simulator' && (
                  <div className="overflow-y-auto p-4 space-y-4 flex-1">
                    {/* Top Slider & Stake Inputs */}
                    <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Interactive Stake Simulator
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                          KES {stake.toLocaleString()}
                        </span>
                      </div>

                      {/* Slider */}
                      <div className="space-y-1">
                        <input
                          type="range"
                          min={bookieConfig.minStake}
                          max="2000"
                          step="10"
                          value={Math.min(stake, 2000)}
                          onChange={(e) => onStakeChange(parseInt(e.target.value) || bookieConfig.minStake)}
                          className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>Min: KES {bookieConfig.minStake}</span>
                          <span>KES 500</span>
                          <span>KES 1,000</span>
                          <span>KES 2,000+</span>
                        </div>
                      </div>

                      {/* Quick Stake Buttons */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {quickStakes.map((amt) => (
                          <button
                            key={amt}
                            onClick={() => onStakeChange(amt)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                              stake === amt
                                ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                            }`}
                          >
                            KES {amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Simulation Outcome Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Outcome Scenario 1: FULL WIN */}
                      <div className="p-3.5 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Scenario A: All {selections.length} Legs Win
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            100% Hit Rate
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>Base Return:</span>
                            <span className="font-mono text-slate-200">KES {baseReturn.toLocaleString()}</span>
                          </div>

                          {bonusPct > 0 && (
                            <div className="flex justify-between text-amber-400">
                              <span>{bookieConfig.shortName} Bonus (+{bonusPct}%):</span>
                              <span className="font-mono font-bold">+KES {bonusAmount.toLocaleString()}</span>
                            </div>
                          )}

                          <div className="flex justify-between text-slate-400">
                            <span>Gross Winnings:</span>
                            <span className="font-mono text-white font-bold">KES {grossPayout.toLocaleString()}</span>
                          </div>

                          <div className="flex justify-between text-slate-400">
                            <span className="flex items-center gap-1" title="20% Withholding Tax on Net Winnings">
                              Kenya 20% Tax (WHT):
                              <Info className="w-3 h-3 text-slate-400" />
                            </span>
                            <span className="font-mono text-red-400">-KES {withholdingTax.toLocaleString()}</span>
                          </div>

                          <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                            <span className="text-xs font-bold text-white">Net Take-Home:</span>
                            <span className="text-lg font-black text-emerald-400 font-mono">
                              KES {netTakeHome.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                            <span>Net Profit:</span>
                            <span className="font-mono text-emerald-300 font-bold">
                              +KES {netProfit.toLocaleString()} ({roiMultiplier}x ROI)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Outcome Scenario 2: CUT-1 (1 Match Fails / Cashout) */}
                      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-amber-400" />
                            Scenario B: 1-Match Cut / Cashout
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            Cut-1 Simulation
                          </span>
                        </div>

                        {cut1Outcome ? (
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-slate-400">
                              <span>Simulated Missed Leg:</span>
                              <span className="font-mono text-slate-300 truncate max-w-[130px]">
                                {cut1Outcome.lostMatch.homeTeam} (@{cut1Outcome.lostMatch.odd})
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Remaining Odds ({selections.length - 1} legs):</span>
                              <span className="font-mono text-emerald-400 font-bold">
                                {cut1Outcome.odds.toLocaleString()}x
                              </span>
                            </div>
                            <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                              <span className="text-xs font-bold text-white">Cut-1 Est. Value:</span>
                              <span className="text-base font-extrabold text-amber-400 font-mono">
                                KES {cut1Outcome.gross.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 italic">
                              *Estimated payout under bookmaker Cut-1 insurance or early cashout salvage.
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 py-3 text-center">
                            Add at least 2 matches to simulate Cut-1 outcomes.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Statistical Metrics Strip */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Average Leg Odd</span>
                        <span className="font-mono font-bold text-white text-sm">@{avgOdd.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Safest Leg</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">@{minOdd.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Highest Leg</span>
                        <span className="font-mono font-bold text-blue-400 text-sm">@{maxOdd.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Stake Matrix Comparison Table */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                        Quick Stake Sensitivity Table:
                      </span>
                      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40 text-xs font-mono">
                        <div className="grid grid-cols-3 p-2 bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                          <span>Stake (KES)</span>
                          <span className="text-center">Gross Return</span>
                          <span className="text-right">Net Take-Home</span>
                        </div>
                        <div className="divide-y divide-slate-800/60 max-h-36 overflow-y-auto">
                          {stakeMatrix.map((item) => (
                            <div
                              key={item.stake}
                              onClick={() => onStakeChange(item.stake)}
                              className={`grid grid-cols-3 p-2 cursor-pointer transition-colors ${
                                stake === item.stake
                                  ? 'bg-amber-400/10 font-bold text-amber-300'
                                  : 'hover:bg-slate-800/60 text-slate-300'
                              }`}
                            >
                              <span className="flex items-center gap-1">
                                KES {item.stake}
                                {stake === item.stake && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                )}
                              </span>
                              <span className="text-center text-white">
                                KES {item.gross.toLocaleString()}
                              </span>
                              <span className="text-right text-emerald-400 font-bold">
                                KES {item.netTakeHome.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"
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

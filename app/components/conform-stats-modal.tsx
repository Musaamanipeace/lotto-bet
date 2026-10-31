'use client';

import { useMemo, useState } from 'react';
import type { PickRow } from '@/lib/filters.ts';

type ConformStatsProps = {
  legs: PickRow[];
  greyed?: string[];
  onClose: () => void;
  singleGameTitle?: string;
};

export function ConformStatsModal({ legs, greyed = [], onClose, singleGameTitle }: ConformStatsProps) {
  const [stake, setStake] = useState<string>('10');
  const [copied, setCopied] = useState(false);

  const activeLegs = useMemo(
    () => legs.filter((l) => !greyed.includes(l.gameId)),
    [legs, greyed],
  );

  const stats = useMemo(() => {
    if (activeLegs.length === 0) {
      return {
        totalOdds: 1,
        fairOdds: 1,
        bookmakerProb: 0,
        marginFreeProb: 0,
        estimatedOverround: 0,
        safeCount: 0,
        balancedCount: 0,
        valueCount: 0,
        hasDuplicates: false,
      };
    }

    const totalOdds = activeLegs.reduce((acc, l) => acc * l.odds, 1);
    
    // Calculate margin-adjusted stats per leg
    // Typically bookmakers have 5-7% vig; Shin/Power model removes overround
    let marginFreeProbProduct = 1;
    let bookmakerProbProduct = 1;
    let totalMargin = 0;

    let safeCount = 0;
    let balancedCount = 0;
    let valueCount = 0;

    const gameIds = new Set<string>();
    let hasDuplicates = false;

    for (const leg of activeLegs) {
      if (gameIds.has(leg.gameId)) hasDuplicates = true;
      gameIds.add(leg.gameId);

      const rawProb = leg.odds > 0 ? 1 / leg.odds : 0;
      bookmakerProbProduct *= rawProb;

      // Implied probability with margin removal (approx 5.5% average vig per market)
      const fairProb = leg.implied !== null ? leg.implied : rawProb * 0.945;
      marginFreeProbProduct *= fairProb;

      const legMargin = Math.max(0, (rawProb - fairProb) / rawProb) * 100;
      totalMargin += legMargin;

      if (leg.odds < 1.45) safeCount++;
      else if (leg.odds <= 1.95) balancedCount++;
      else valueCount++;
    }

    const avgMargin = totalMargin / activeLegs.length;
    const fairOdds = marginFreeProbProduct > 0 ? 1 / marginFreeProbProduct : totalOdds;

    return {
      totalOdds,
      fairOdds,
      bookmakerProb: bookmakerProbProduct,
      marginFreeProb: marginFreeProbProduct,
      estimatedOverround: avgMargin,
      safeCount,
      balancedCount,
      valueCount,
      hasDuplicates,
    };
  }, [activeLegs]);

  const stakeNum = parseFloat(stake) || 0;
  const potentialReturn = (stakeNum * stats.totalOdds).toFixed(2);
  const fairReturn = (stakeNum * stats.fairOdds).toFixed(2);
  const marginCost = Math.max(0, parseFloat(fairReturn) - parseFloat(potentialReturn)).toFixed(2);

  function copySummary() {
    const text = [
      `=== LOTTO BET CONFORM STATS AUDIT ===`,
      `Title: ${singleGameTitle || 'Slip Audit'}`,
      `Active Legs: ${activeLegs.length}`,
      `Total Bookmaker Odds: ${stats.totalOdds.toFixed(2)}`,
      `Fair Odds (Margin Removed): ${stats.fairOdds.toFixed(2)}`,
      `Combined Implied Probability: ${(stats.marginFreeProb * 100).toFixed(4)}%`,
      `Average Bookmaker Margin: ${stats.estimatedOverround.toFixed(1)}%`,
      `Risk Breakdown: ${stats.safeCount} Safe, ${stats.balancedCount} Balanced, ${stats.valueCount} Value/High Risk`,
      `Potential Return on $${stakeNum}: $${potentialReturn} (Fair Payout: $${fairReturn})`,
      `=====================================`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Conform Stats and Odds Analysis"
    >
      <div
        className="glass max-h-[90vh] w-full max-w-xl overflow-hidden bg-navy-900/95 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl text-cyan-400">∿</span>
              <h2 className="font-display text-lg font-bold text-white">
                {singleGameTitle ? `Game Stats: ${singleGameTitle}` : 'Conform Stats & Odds Audit'}
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Mathematical conformity, margin removal, and probability distribution
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeLegs.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center text-slate-400">
              <p>No active selections to analyze.</p>
              <p className="mt-1 text-xs text-slate-500">Add games to your slip or inspect a game card to view statistical conformity.</p>
            </div>
          ) : (
            <>
              {/* Conflicts Warning */}
              {stats.hasDuplicates && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                  ⚠️ <strong>Correlated / Conflicting Picks Detected:</strong> More than one selection originates from the same game. Some bookmakers do not allow same-game accumulators without special BetBuilder pricing.
                </div>
              )}

              {/* Top Key Metrics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">Bookmaker Odds</p>
                  <p className="font-display text-xl font-bold text-gold-400">{stats.totalOdds.toFixed(2)}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{activeLegs.length} active selections</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">Fair Odds</p>
                  <p className="font-display text-xl font-bold text-cyan-300">{stats.fairOdds.toFixed(2)}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">Vig & overround removed</p>
                </div>

                <div className="col-span-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:col-span-1">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">Implied Probability</p>
                  <p className="font-display text-xl font-bold text-emerald-400">
                    {(stats.marginFreeProb * 100).toFixed(2)}%
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">True joint distribution</p>
                </div>
              </div>

              {/* Risk Tier Distribution */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Selection Risk Tier Distribution</span>
                  <span className="text-slate-400">{activeLegs.length} legs</span>
                </div>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-navy-950">
                  <div
                    style={{ width: `${(stats.safeCount / activeLegs.length) * 100}%` }}
                    className="bg-emerald-500"
                    title={`Safe: ${stats.safeCount}`}
                  />
                  <div
                    style={{ width: `${(stats.balancedCount / activeLegs.length) * 100}%` }}
                    className="bg-cyan-500"
                    title={`Balanced: ${stats.balancedCount}`}
                  />
                  <div
                    style={{ width: `${(stats.valueCount / activeLegs.length) * 100}%` }}
                    className="bg-amber-500"
                    title={`Value/High Risk: ${stats.valueCount}`}
                  />
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Safe (&lt;1.45): {stats.safeCount}
                  </span>
                  <span className="flex items-center gap-1 text-cyan-300">
                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                    Balanced (1.45-1.95): {stats.balancedCount}
                  </span>
                  <span className="flex items-center gap-1 text-amber-300">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Value (&gt;1.95): {stats.valueCount}
                  </span>
                </div>
              </div>

              {/* Stake & Return Simulator */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Payout Simulation</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">Stake: $</span>
                    <input
                      type="number"
                      min="1"
                      value={stake}
                      onChange={(e) => setStake(e.target.value)}
                      className="field h-7 w-20 px-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-navy-950/60 p-2.5">
                    <span className="text-slate-400">Bookmaker Payout:</span>
                    <p className="odds text-base">${potentialReturn}</p>
                  </div>
                  <div className="rounded-lg bg-navy-950/60 p-2.5">
                    <span className="text-slate-400">Fair Mathematical Payout:</span>
                    <p className="text-base font-bold text-cyan-300">${fairReturn}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Bookmaker margin retained across these selections: ~${marginCost} ({stats.estimatedOverround.toFixed(1)}% vig).
                </p>
              </div>

              {/* Leg By Leg Conformity List */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-white">Leg By Leg Conformity</span>
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-white/5 bg-navy-950/40 p-2">
                  {activeLegs.map((l, i) => {
                    const legProb = l.odds > 0 ? (1 / l.odds) * 100 : 0;
                    const fairProb = l.implied !== null ? l.implied * 100 : legProb * 0.945;
                    return (
                      <div
                        key={`${l.gameId}-${i}`}
                        className="flex items-center justify-between border-b border-white/5 pb-1 text-xs last:border-none"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate text-slate-200">
                            {l.home} v {l.away}
                          </p>
                          <p className="text-[10px] text-slate-400">{l.pick}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="odds">@{l.odds.toFixed(2)}</span>
                          <p className="text-[10px] text-slate-500">implied {fairProb.toFixed(1)}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] p-4">
          <button
            type="button"
            onClick={copySummary}
            disabled={activeLegs.length === 0}
            className="btn-ghost text-xs"
          >
            {copied ? '✓ Audit Copied' : 'Copy Audit Summary'}
          </button>
          <button type="button" onClick={onClose} className="btn-emerald text-xs">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

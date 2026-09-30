'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BookieId, SelectedPick, BookingCodeResponse } from '@/types';
import { BOOKIE_CONFIGS, getCompanyBonusPercentage } from '@/lib/constants';
import { calculateAccumulatorOdds } from '@/lib/filterEngine';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  AlertCircle,
  Share2,
  CheckCircle2,
  Download,
  Gift,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selections: SelectedPick[];
  stake: number;
  initialBookie?: BookieId;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  selections,
  stake,
  initialBookie = 'sportybet:ke',
}) => {
  const [selectedBookie, setSelectedBookie] = useState<BookieId>(initialBookie);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BookingCodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync initialBookie when modal opens
  useEffect(() => {
    if (isOpen && initialBookie) {
      setSelectedBookie(initialBookie);
    }
  }, [isOpen, initialBookie]);

  const totalOdds = calculateAccumulatorOdds(selections);
  const basePayout = Math.round(stake * totalOdds);
  const bonusPct = getCompanyBonusPercentage(selectedBookie, selections.length);
  const bonusAmount = Math.round(basePayout * (bonusPct / 100));
  const estPayout = basePayout + bonusAmount;

  const generateCode = useCallback(async (bookie: BookieId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination_bookie: bookie,
          selections,
          stake,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate destination booking code.');
      }
      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error generating booking code';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selections, stake]);

  useEffect(() => {
    if (isOpen && selections.length > 0) {
      generateCode(selectedBookie);
    }
  }, [isOpen, selectedBookie, generateCode, selections.length]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!result?.bookingCode) return;
    navigator.clipboard.writeText(result.bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSlip = () => {
    if (!result) return;
    const cfg = BOOKIE_CONFIGS[result.destinationBookie];
    const content = [
      `=============================================`,
      `  LOTTOBET - MULTI-BOOKIE ACCUMULATOR SLIP   `,
      `=============================================`,
      `Target Company: ${cfg.name} (${result.destinationBookie})`,
      `Official Booking Code: ${result.bookingCode}`,
      `Total Matches: ${selections.length}`,
      `Total Odds: ${totalOdds.toLocaleString()}x`,
      `Bonus Boost: +${bonusPct}% (${cfg.bonusLabel})`,
      `Stake: KES ${stake}`,
      `Est. Total Return: KES ${estPayout.toLocaleString()}`,
      `Generated: ${new Date(result.generatedAt).toLocaleString()}`,
      `=============================================`,
      `QUALIFYING SELECTIONS:`,
      ...selections.map(
        (s, i) =>
          `${i + 1}. [${s.league}] ${s.homeTeam} vs ${s.awayTeam} | Market: ${s.marketName} | Pick: ${s.pick} @ ${s.odd.toFixed(2)}`
      ),
      `=============================================`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lottobet-${result.destinationBookie.replace(':', '-')}-${result.bookingCode}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111928] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0d1422]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Generate Booking Code</h3>
              <p className="text-xs text-slate-400">Target Kenya Bookmakers (SportyBet & betPawa)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Bookie Switcher Tabs */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Select Destination Bookmaker:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['betpawa:ke', 'sportybet:ke'] as BookieId[]).map((bookieId) => {
                const cfg = BOOKIE_CONFIGS[bookieId];
                const active = selectedBookie === bookieId;
                return (
                  <button
                    key={bookieId}
                    type="button"
                    onClick={() => setSelectedBookie(bookieId)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      active
                        ? bookieId === 'betpawa:ke'
                          ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500'
                          : 'bg-red-500/15 border-red-500 text-white shadow-md shadow-red-950/40 ring-1 ring-red-500'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{cfg.name}</span>
                      <span className="text-sm">🇰🇪</span>
                    </div>
                    <span className={`text-[11px] font-mono ${cfg.badgeText}`}>{cfg.tagline}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400">
                Packaging {selections.length} selections for {BOOKIE_CONFIGS[selectedBookie].name}...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && !loading && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Conversion Notice</p>
                <p className="text-slate-400 mt-0.5">{error}</p>
                <button
                  onClick={() => generateCode(selectedBookie)}
                  className="mt-2 text-xs font-bold text-red-300 underline"
                >
                  Retry generation
                </button>
              </div>
            </div>
          )}

          {/* Booking Code Presentation Box */}
          {result && !loading && (
            <div className="space-y-4">
              <div
                className={`p-4 bg-[#090e18] border-2 rounded-2xl text-center space-y-2 relative overflow-hidden ${
                  selectedBookie === 'betpawa:ke' ? 'border-emerald-500/50' : 'border-red-500/50'
                }`}
              >
                <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block">
                  Official Booking Code ({BOOKIE_CONFIGS[result.destinationBookie].name})
                </span>

                <div className="flex items-center justify-center gap-3 py-1">
                  <span
                    className={`text-2xl sm:text-3xl font-mono font-black tracking-wider select-all ${
                      selectedBookie === 'betpawa:ke' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {result.bookingCode}
                  </span>
                  <button
                    onClick={handleCopy}
                    className={`p-2 rounded-xl transition-all font-bold active:scale-90 ${
                      selectedBookie === 'betpawa:ke'
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        : 'bg-red-500 hover:bg-red-400 text-white'
                    }`}
                    title="Copy Booking Code"
                  >
                    {copied ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-300 font-medium">
                  {copied ? (
                    <span className="text-emerald-300 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Copied to clipboard! Ready to load in bookmaker.
                    </span>
                  ) : (
                    <span>Click copy to load into the bookie app or site</span>
                  )}
                </div>
              </div>

              {/* Betslip Financial Summary Grid */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Picks</span>
                  <span className="font-bold text-white font-mono">{selections.length}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Accumulator</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {totalOdds.toLocaleString()}x
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">
                    Est. Return {bonusPct > 0 ? `(+${bonusPct}%)` : ''}
                  </span>
                  <span className="font-bold text-amber-400 font-mono">
                    KES {estPayout.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Bonus Highlight Pill */}
              {bonusPct > 0 && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-amber-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-amber-400" />
                    {BOOKIE_CONFIGS[selectedBookie].shortName} {BOOKIE_CONFIGS[selectedBookie].bonusLabel}
                  </span>
                  <span className="font-bold font-mono">+{bonusPct}% Boost (+KES {bonusAmount.toLocaleString()})</span>
                </div>
              )}

              {/* Direct 1-Click Action Buttons */}
              <div className="space-y-2">
                <a
                  href={BOOKIE_CONFIGS[selectedBookie].homeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-2.5 px-4 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md ${
                    selectedBookie === 'betpawa:ke'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  <span>Open {BOOKIE_CONFIGS[selectedBookie].name}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={
                      selectedBookie === 'sportybet:ke'
                        ? BOOKIE_CONFIGS['betpawa:ke'].homeUrl
                        : BOOKIE_CONFIGS['sportybet:ke'].homeUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <span>
                      Open {selectedBookie === 'sportybet:ke' ? 'betPawa' : 'SportyBet'}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={handleDownloadSlip}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download TXT</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0d1422] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

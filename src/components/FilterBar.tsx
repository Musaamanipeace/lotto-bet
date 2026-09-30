'use client';

import React from 'react';
import { FilterCriteria, BookieId } from '@/types';
import { TIMEFRAME_OPTIONS, PICK_COUNT_PRESETS, DEFAULT_FILTER_CRITERIA, BOOKIE_CONFIGS } from '@/lib/constants';
import { RotateCcw, Search, Sliders, Sparkles, Building2, Check } from 'lucide-react';

interface FilterBarProps {
  criteria: FilterCriteria;
  onChange: (criteria: FilterCriteria) => void;
  availableLeagues: string[];
  totalEligibleMatches: number;
  companyCounts: {
    all: number;
    betpawa: number;
    sportybet: number;
  };
  onShuffleAndPick: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  criteria,
  onChange,
  availableLeagues,
  totalEligibleMatches,
  companyCounts,
  onShuffleAndPick,
}) => {
  const updateCriteria = <K extends keyof FilterCriteria>(key: K, value: FilterCriteria[K]) => {
    onChange({ ...criteria, [key]: value });
  };

  const handleReset = () => {
    onChange({ ...DEFAULT_FILTER_CRITERIA });
  };

  return (
    <div className="bg-[#111927] border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl mb-6">
      {/* SECTION 1: Company Filter (betPawa vs SportyBet vs All) */}
      <div className="pb-5 mb-5 border-b border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Filter by Betting Company:
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Select a bookmaker to isolate company-specific odds and bonus programs
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Option 1: ALL COMPANIES */}
          <button
            onClick={() => updateCriteria('selectedCompany', 'ALL')}
            className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
              criteria.selectedCompany === 'ALL'
                ? 'bg-gradient-to-r from-slate-800 to-slate-900 border-emerald-500/80 text-white shadow-lg ring-1 ring-emerald-500/40'
                : 'bg-slate-900/60 border-slate-800/90 text-slate-400 hover:border-slate-700 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                  criteria.selectedCompany === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                ALL
              </div>
              <div>
                <span className="text-xs font-bold text-white block">All Bookmakers</span>
                <span className="text-[10px] text-slate-400">betPawa & SportyBet</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {companyCounts.all}
              </span>
            </div>
          </button>

          {/* Option 2: BETPAWA KENYA */}
          <button
            onClick={() => updateCriteria('selectedCompany', 'betpawa:ke')}
            className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
              criteria.selectedCompany === 'betpawa:ke'
                ? 'bg-gradient-to-r from-emerald-950/40 to-slate-900 border-emerald-500 text-white shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                : 'bg-slate-900/60 border-slate-800/90 text-slate-400 hover:border-emerald-500/30 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-xs text-emerald-400">
                PAW
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">betPawa Kenya</span>
                  <span className="text-xs">🇰🇪</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-medium">Up to 1000% Win Bonus</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {companyCounts.betpawa}
              </span>
            </div>
          </button>

          {/* Option 3: SPORTYBET KENYA */}
          <button
            onClick={() => updateCriteria('selectedCompany', 'sportybet:ke')}
            className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
              criteria.selectedCompany === 'sportybet:ke'
                ? 'bg-gradient-to-r from-red-950/40 to-slate-900 border-red-500 text-white shadow-lg shadow-red-950/40 ring-1 ring-red-500/50'
                : 'bg-slate-900/60 border-slate-800/90 text-slate-400 hover:border-red-500/30 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center font-bold text-xs text-red-400">
                SB
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">SportyBet Kenya</span>
                  <span className="text-xs">🇰🇪</span>
                </div>
                <span className="text-[10px] text-red-400 font-medium">Instant Booking Codes</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-red-400 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                {companyCounts.sportybet}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* SECTION 2: Top Search & Active Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Preferred Market Filters
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                {totalEligibleMatches} Qualifying Matches
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {criteria.selectedCompany === 'ALL'
                ? 'Scanning markets across all bookmakers'
                : `Scanning odds specifically tailored for ${BOOKIE_CONFIGS[criteria.selectedCompany].name}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search team or league..."
              value={criteria.searchQuery}
              onChange={(e) => updateCriteria('searchQuery', e.target.value)}
              className="w-full bg-[#0b111e] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            title="Reset Filters"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1 transition-colors border border-slate-700"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: Market Selector Chips & Odds Bounds */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-5 border-b border-slate-800/80">
        {/* Double Chance Controls */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            criteria.enableDoubleChance
              ? 'bg-[#0f172a] border-emerald-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/70 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={criteria.enableDoubleChance}
                onChange={(e) => updateCriteria('enableDoubleChance', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-emerald-300">Double Chance (1X, 12, X2)</span>
            </label>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              {criteria.dcMin.toFixed(2)} - {criteria.dcMax.toFixed(2)}
            </span>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Min: {criteria.dcMin.toFixed(2)}</span>
              <span>Max: {criteria.dcMax.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="1.05"
              max="1.30"
              step="0.01"
              value={criteria.dcMax}
              disabled={!criteria.enableDoubleChance}
              onChange={(e) => updateCriteria('dcMax', parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* Home Win (1) Controls */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            criteria.enableHomeWin
              ? 'bg-[#0f172a] border-blue-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/70 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={criteria.enableHomeWin}
                onChange={(e) => updateCriteria('enableHomeWin', e.target.checked)}
                className="w-4 h-4 rounded text-blue-500 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-blue-300">Home Win (1)</span>
            </label>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/50">
              {criteria.homeWinMin.toFixed(2)} - {criteria.homeWinMax.toFixed(2)}
            </span>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Min: {criteria.homeWinMin.toFixed(2)}</span>
              <span>Max: {criteria.homeWinMax.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="1.20"
              max="1.80"
              step="0.02"
              value={criteria.homeWinMax}
              disabled={!criteria.enableHomeWin}
              onChange={(e) => updateCriteria('homeWinMax', parseFloat(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* Over 0.5 Goals */}
        <div
          className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
            criteria.enableOver05
              ? 'bg-[#0f172a] border-amber-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/70 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={criteria.enableOver05}
                onChange={(e) => updateCriteria('enableOver05', e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-amber-300">Over 0.5 Goals</span>
            </label>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50">
              High Probability
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Filters matches with high likelihood of at least 1 goal in 90 mins.
          </p>
        </div>

        {/* Under 3.5 Goals */}
        <div
          className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
            criteria.enableUnder35
              ? 'bg-[#0f172a] border-purple-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/70 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={criteria.enableUnder35}
                onChange={(e) => updateCriteria('enableUnder35', e.target.checked)}
                className="w-4 h-4 rounded text-purple-500 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-purple-300">Under 3.5 Goals</span>
            </label>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800/50">
              Max 3 Goals
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Safe ceiling market for disciplined accumulators.
          </p>
        </div>
      </div>

      {/* SECTION 4: Timeframe, League & N-Picks Selector */}
      <div className="pt-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Timeframe Pills */}
        <div className="space-y-1.5 w-full lg:w-auto">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Kickoff Window:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TIMEFRAME_OPTIONS.map((opt) => {
              const active = criteria.timeframeHours === opt.value;
              return (
                <button
                  key={opt.label}
                  onClick={() => updateCriteria('timeframeHours', opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-semibold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* League selector */}
        <div className="space-y-1.5 w-full sm:w-auto">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            League:
          </span>
          <select
            value={criteria.selectedLeague}
            onChange={(e) => updateCriteria('selectedLeague', e.target.value)}
            className="w-full sm:w-52 bg-[#0b111e] border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Competitions ({availableLeagues.length})</option>
            {availableLeagues.map((league) => (
              <option key={league} value={league}>
                {league}
              </option>
            ))}
          </select>
        </div>

        {/* Pick Count Selector & Shuffle Action */}
        <div className="space-y-1.5 w-full lg:w-auto">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Betslip Size (N):
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#0b111e] border border-slate-700/80 rounded-xl p-1 gap-1">
              {PICK_COUNT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => updateCriteria('pickCount', preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                    criteria.pickCount === preset
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {preset}
                </button>
              ))}
              <input
                type="number"
                min="1"
                max="100"
                value={criteria.pickCount}
                onChange={(e) => updateCriteria('pickCount', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 bg-slate-800/80 border border-slate-700 text-center py-1 text-xs text-emerald-400 font-mono font-bold rounded-lg focus:outline-none"
              />
            </div>

            <button
              onClick={onShuffleAndPick}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Pick {criteria.pickCount}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

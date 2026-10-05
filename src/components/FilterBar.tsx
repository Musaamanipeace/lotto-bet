'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FilterCriteria, BookieId } from '@/types';
import { TIMEFRAME_OPTIONS, PICK_COUNT_PRESETS, DEFAULT_FILTER_CRITERIA, BOOKIE_CONFIGS } from '@/lib/constants';
import { RotateCcw, Search, Sliders, Building2, Check, ShieldCheck, Plus, Minus, Trash2, Shuffle, Undo2 } from 'lucide-react';

interface FilterBarProps {
  criteria: FilterCriteria;
  onChange: (criteria: FilterCriteria) => void;
  availableLeagues: string[];
  totalEligibleMatches: number;
  companyCounts: {
    all: number;
    sportybet: number;
  };
  onPickPicks: (count: number) => void;
  onShufflePicks: (count: number) => void;
  onRemoveGames: (count: number) => void;
  onClearSlip: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

/**
 * Dual-handle range slider that can be dragged from both the left (min)
 * and right (max) handles. Both handles can be moved independently.
 * Uses refs for drag state to avoid React re-render churn during dragging.
 */
interface DualRangeSliderProps {
  min: number;
  max: number;
  step: number;
  minVal: number;
  maxVal: number;
  onChange: (min: number, max: number) => void;
  labelMin?: string;
  labelMax?: string;
}

const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  min,
  max,
  step,
  minVal,
  maxVal,
  onChange,
  labelMin = 'min',
  labelMax = 'max',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const minHandleRef = useRef<HTMLButtonElement>(null);
  const maxHandleRef = useRef<HTMLButtonElement>(null);
  const rangeRef = useRef<HTMLDivElement>(null);
  const minLabelRef = useRef<HTMLSpanElement>(null);
  const maxLabelRef = useRef<HTMLSpanElement>(null);

  const draggingRef = useRef<'min' | 'max' | null>(null);
  const minValueRef = useRef(minVal);
  const maxValueRef = useRef(maxVal);
  const onChangeRef = useRef(onChange);
  const frameRef = useRef<number | null>(null);
  const pendingClientXRef = useRef<number | null>(null);

  const clamp = useCallback(
    (value: number, lower: number, upper: number) => Math.min(Math.max(value, lower), upper),
    []
  );

  const snap = useCallback(
    (value: number) => {
      const steps = Math.round((value - min) / step);
      return clamp(min + steps * step, min, max);
    },
    [min, max, step, clamp]
  );

  const toPercent = useCallback(
    (value: number) => ((value - min) / (max - min)) * 100,
    [min, max]
  );

  const updateVisuals = useCallback(
    (nextMin: number, nextMax: number) => {
      const minPercent = toPercent(nextMin);
      const maxPercent = toPercent(nextMax);

      if (minHandleRef.current) {
        minHandleRef.current.style.left = `${minPercent}%`;
      }
      if (maxHandleRef.current) {
        maxHandleRef.current.style.left = `${maxPercent}%`;
      }
      if (rangeRef.current) {
        rangeRef.current.style.left = `${minPercent}%`;
        rangeRef.current.style.width = `${maxPercent - minPercent}%`;
      }
      if (minLabelRef.current) {
        minLabelRef.current.textContent = nextMin.toFixed(2);
      }
      if (maxLabelRef.current) {
        maxLabelRef.current.textContent = nextMax.toFixed(2);
      }
    },
    [toPercent]
  );

  const positionToValue = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return min;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return min;
      const x = clamp(clientX - rect.left, 0, rect.width);
      return min + (x / rect.width) * (max - min);
    },
    [min, max, clamp]
  );

  const renderPendingPosition = useCallback(() => {
    frameRef.current = null;
    const clientX = pendingClientXRef.current;
    const handle = draggingRef.current;
    if (clientX === null || !handle) return;

    const value = snap(positionToValue(clientX));
    let nextMin = minValueRef.current;
    let nextMax = maxValueRef.current;

    if (handle === 'min') {
      nextMin = clamp(value, min, nextMax - step);
    } else {
      nextMax = clamp(value, nextMin + step, max);
    }

    minValueRef.current = nextMin;
    maxValueRef.current = nextMax;
    updateVisuals(nextMin, nextMax);
  }, [min, max, step, clamp, positionToValue, snap, updateVisuals]);

  const scheduleVisualUpdate = useCallback(
    (clientX: number) => {
      pendingClientXRef.current = clientX;
      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(renderPendingPosition);
      }
    },
    [renderPendingPosition]
  );

  const stopDragging = useCallback(() => {
    if (!draggingRef.current) return;

    if (pendingClientXRef.current !== null) {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      renderPendingPosition();
    }

    draggingRef.current = null;
    pendingClientXRef.current = null;
    onChangeRef.current(minValueRef.current, maxValueRef.current);
  }, [renderPendingPosition]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!draggingRef.current) return;
      event.preventDefault();
      scheduleVisualUpdate(event.clientX);
    },
    [scheduleVisualUpdate]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (!draggingRef.current) return;
      event.preventDefault();
      stopDragging();
    },
    [stopDragging]
  );

  const startDragging = useCallback(
    (handle: 'min' | 'max') => (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      minValueRef.current = minVal;
      maxValueRef.current = maxVal;
      draggingRef.current = handle;
      pendingClientXRef.current = null;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [minVal, maxVal]
  );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (draggingRef.current !== null) return;
    minValueRef.current = minVal;
    maxValueRef.current = maxVal;
    updateVisuals(minVal, maxVal);
  }, [minVal, maxVal, updateVisuals]);

  useEffect(() => {
    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp, { passive: false });
    document.addEventListener('pointercancel', handlePointerUp, { passive: false });
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [handlePointerMove, handlePointerUp]);

  return (
    <div className="space-y-2">
      <div ref={trackRef} className="relative h-6 flex items-center touch-none select-none">
        <div className="absolute left-0 right-0 h-2 bg-slate-800 rounded-lg" />
        <div
          ref={rangeRef}
          className="absolute h-2 bg-emerald-500/30 rounded-lg"
          style={{ left: `${toPercent(minVal)}%`, width: `${toPercent(maxVal) - toPercent(minVal)}%` }}
        />
        <button
          ref={minHandleRef}
          type="button"
          onPointerDown={startDragging('min')}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-slate-900 border-2 border-emerald-500 rounded-full shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10"
          style={{ left: `${toPercent(minVal)}%`, touchAction: 'none' }}
          title={`Set minimum ${labelMin}`}
          aria-label={`Set minimum ${labelMin}`}
        />
        <button
          ref={maxHandleRef}
          type="button"
          onPointerDown={startDragging('max')}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-slate-900 border-2 border-emerald-500 rounded-full shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10"
          style={{ left: `${toPercent(maxVal)}%`, touchAction: 'none' }}
          title={`Set maximum ${labelMax}`}
          aria-label={`Set maximum ${labelMax}`}
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
        <span ref={minLabelRef}>{minVal.toFixed(2)}</span>
        <span ref={maxLabelRef}>{maxVal.toFixed(2)}</span>
      </div>
    </div>
  );
};


export const FilterBar: React.FC<FilterBarProps> = ({
  criteria,
  onChange,
  availableLeagues,
  totalEligibleMatches,
  companyCounts,
  onPickPicks,
  onShufflePicks,
  onRemoveGames,
  onClearSlip,
  onUndo,
  canUndo = false,
}) => {
  const updateCriteria = <K extends keyof FilterCriteria>(key: K, value: FilterCriteria[K]) => {
    onChange({ ...criteria, [key]: value });
  };

  const handleReset = () => {
    onChange({ ...DEFAULT_FILTER_CRITERIA });
  };

  const handleRangeChange = (
    setMinKey: 'dcMin' | 'homeWinMin' | 'awayWinMin',
    setMaxKey: 'dcMax' | 'homeWinMax' | 'awayWinMax',
    newMin: number,
    newMax: number
  ) => {
    onChange({ ...criteria, [setMinKey]: newMin, [setMaxKey]: newMax });
  };

  return (
    <div className="bg-[#111927] border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl mb-6">
      {/* SECTION 1: Company Filter (SportyBet vs All) */}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                <span className="text-[10px] text-slate-400">SportyBet</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {companyCounts.all}
              </span>
            </div>
          </button>

          {/* Option 2: SPORTYBET KENYA */}
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

          {/* Bookable / full market data only */}
          <button
            type="button"
            onClick={() =>
              updateCriteria('requireFullMarketData', !criteria.requireFullMarketData)
            }
            title="Only use fixtures that already have complete SportyBet market IDs (needed for real booking codes)"
            className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors border ${
              criteria.requireFullMarketData
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden sm:inline">
              {criteria.requireFullMarketData ? 'Bookable only' : 'All fixtures'}
            </span>
          </button>

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
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/20">
              {criteria.dcMin.toFixed(2)} - {criteria.dcMax.toFixed(2)}
            </span>
          </div>
          {criteria.enableDoubleChance && (
            <DualRangeSlider
              min={1.0}
              max={2.0}
              step={0.01}
              minVal={criteria.dcMin}
              maxVal={criteria.dcMax}
              labelMin="dc"
              labelMax="dc"
              onChange={(newMin, newMax) =>
                handleRangeChange('dcMin', 'dcMax', newMin, newMax)
              }
            />
          )}
          <p className="text-[11px] text-slate-400 mt-1">
            Drag handles to set odds range. Widening includes more games.
          </p>
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
          {criteria.enableHomeWin && (
            <DualRangeSlider
              min={1.0}
              max={3.0}
              step={0.02}
              minVal={criteria.homeWinMin}
              maxVal={criteria.homeWinMax}
              labelMin="home"
              labelMax="home"
              onChange={(newMin, newMax) =>
                handleRangeChange('homeWinMin', 'homeWinMax', newMin, newMax)
              }
            />
          )}
          <p className="text-[11px] text-slate-400 mt-1">
            Drag handles to set odds range. Widening includes more games.
          </p>
        </div>

        {/* Away Win (2) Controls */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            criteria.enableAwayWin
              ? 'bg-[#0f172a] border-indigo-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/70 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={criteria.enableAwayWin}
                onChange={(e) => updateCriteria('enableAwayWin', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-500 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-indigo-300">Away Win (2)</span>
            </label>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-800/50">
              {criteria.awayWinMin.toFixed(2)} - {criteria.awayWinMax.toFixed(2)}
            </span>
          </div>
          {criteria.enableAwayWin && (
            <DualRangeSlider
              min={1.0}
              max={3.0}
              step={0.02}
              minVal={criteria.awayWinMin}
              maxVal={criteria.awayWinMax}
              labelMin="away"
              labelMax="away"
              onChange={(newMin, newMax) =>
                handleRangeChange('awayWinMin', 'awayWinMax', newMin, newMax)
              }
            />
          )}
          <p className="text-[11px] text-slate-400 mt-1">
            Drag handles to set odds range. Widening includes more games.
          </p>
        </div>

        {/* Over Goal Line Selector */}
        <div
          className={`p-3.5 rounded-xl border transition-all flex flex-col ${
            criteria.enableOver
              ? 'bg-[#0f172a] border-amber-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/70 opacity-60'
          }}`}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={criteria.enableOver}
                onChange={(e) => updateCriteria('enableOver', e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-amber-300">Over Goals</span>
            </label>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50">
              High Probability
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => updateCriteria('overGoalLine', '0.5')}
              disabled={!criteria.enableOver}
              className={`flex-1 text-center py-1 rounded-lg text-xs font-medium transition-all ${
                criteria.overGoalLine === '0.5'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              } disabled:opacity-40`}
            >
              Over 0.5
            </button>
            <button
              onClick={() => updateCriteria('overGoalLine', '1.5')}
              disabled={!criteria.enableOver}
              className={`flex-1 text-center py-1 rounded-lg text-xs font-medium transition-all ${
                criteria.overGoalLine === '1.5'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              } disabled:opacity-40`}
            >
              Over 1.5
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Filters matches with high likelihood of at least {criteria.overGoalLine === '0.5' ? '1' : '2'} goals.
          </p>
        </div>

        {/* Under Goal Line Selector */}
        <div
          className={`p-3.5 rounded-xl border transition-all flex flex-col ${
            criteria.enableUnder
              ? 'bg-[#0f172a] border-purple-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/70 opacity-60'
          }}`}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={criteria.enableUnder}
                onChange={(e) => updateCriteria('enableUnder', e.target.checked)}
                className="w-4 h-4 rounded text-purple-500 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-purple-300">Under Goals</span>
            </label>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800/50">
              Max {criteria.underGoalLine === '3.5' ? '3' : '4'} Goals
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => updateCriteria('underGoalLine', '3.5')}
              disabled={!criteria.enableUnder}
              className={`flex-1 text-center py-1 rounded-lg text-xs font-medium transition-all ${
                criteria.underGoalLine === '3.5'
                  ? 'bg-purple-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              } disabled:opacity-40`}
            >
              Under 3.5
            </button>
            <button
              onClick={() => updateCriteria('underGoalLine', '4.5')}
              disabled={!criteria.enableUnder}
              className={`flex-1 text-center py-1 rounded-lg text-xs font-medium transition-all ${
                criteria.underGoalLine === '4.5'
                  ? 'bg-purple-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              } disabled:opacity-40`}
            >
              Under 4.5
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Safe over/under ceiling for disciplined accumulators.
          </p>
        </div>

        {/* Both Teams To Score (GG) */}
        <div
          className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
            criteria.enableBtts
              ? 'bg-[#0f172a] border-cyan-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/70 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={criteria.enableBtts}
                onChange={(e) => updateCriteria('enableBtts', e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-cyan-300">Both Teams Score (GG)</span>
            </label>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
              GG / NG
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Prefer GG (both teams score) when available on SportyBet market 29.
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

        {/* Pick Count Selector */}
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

            <span
              className="px-3.5 py-2 bg-slate-900 text-emerald-400 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700"
            >
              <span className="text-sm">N</span>
              Pick {criteria.pickCount}
            </span>

            <button
              onClick={() => onPickPicks(criteria.pickCount)}
              title="Add Next: add candidate Pick N games to your betslip"
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Next</span>
            </button>

            <button
              onClick={() => onShufflePicks(criteria.pickCount)}
              title="Shuffle candidate Pick N from remaining available games (does not alter betslip)"
              className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 border border-slate-700 text-slate-900 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Shuffle</span>
            </button>

            <button
              onClick={() => onRemoveGames(criteria.pickCount)}
              title="Remove N games from the end of the slip"
              className="px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Remove</span>
            </button>

            {onUndo && (
              <button
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo last slip change"
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
                  canUndo
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Undo</span>
              </button>
            )}

            <button
              onClick={onClearSlip}
              title="Empty the entire betslip"
              className="px-2.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Empty Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

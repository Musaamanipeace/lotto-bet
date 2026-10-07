'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FilterCriteria, BookieId } from '@/types';
import { TIMEFRAME_OPTIONS, PICK_COUNT_PRESETS, DEFAULT_FILTER_CRITERIA, BOOKIE_CONFIGS } from '@/lib/constants';
import {
  RotateCcw,
  Search,
  Sliders,
  Building2,
  Check,
  ShieldCheck,
  Plus,
  Minus,
  Trash2,
  Shuffle,
  ChevronDown,
} from 'lucide-react';

interface FilterBarProps {
  criteria: FilterCriteria;
  onChange: (criteria: FilterCriteria) => void;
  availableLeagues: string[];
  totalEligibleMatches: number;
  companyCounts: {
    all: number;
    sportybet: number;
  };
  onNextAdd: (count: number) => void;
  onShuffle: (target: 'staging' | 'slip', count: number) => void;
  onRemoveGames: (count: number) => void;
  onClearSlip: () => void;
  onSoloFilter?: (market: string) => void;
}

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
  onNextAdd,
  onShuffle,
  onRemoveGames,
  onClearSlip,
  onSoloFilter,
}) => {
  // Typable pick input local state
  const [pickInputStr, setPickInputStr] = useState<string>(String(criteria.pickCount || 10));
  const [shuffleTarget, setShuffleTarget] = useState<'staging' | 'slip'>('staging');
  const [isShuffleMenuOpen, setIsShuffleMenuOpen] = useState(false);

  useEffect(() => {
    setPickInputStr(String(criteria.pickCount));
  }, [criteria.pickCount]);

  const updateCriteria = <K extends keyof FilterCriteria>(key: K, value: FilterCriteria[K]) => {
    onChange({ ...criteria, [key]: value });
  };

  const handleResetAll = () => {
    onChange({ ...DEFAULT_FILTER_CRITERIA });
  };

  const handleRangeChange = (
    setMinKey: 'dcMin' | 'homeWinMin' | 'awayWinMin' | 'overMin' | 'underMin' | 'bttsMin',
    setMaxKey: 'dcMax' | 'homeWinMax' | 'awayWinMax' | 'overMax' | 'underMax' | 'bttsMax',
    newMin: number,
    newMax: number
  ) => {
    onChange({ ...criteria, [setMinKey]: newMin, [setMaxKey]: newMax });
  };

  // Check if a specific market is currently solo'd
  const isSolo = (market: 'dc' | 'homewin' | 'awaywin' | 'over' | 'under' | 'btts') => {
    const { enableDoubleChance, enableHomeWin, enableAwayWin, enableOver, enableUnder, enableBtts } = criteria;
    if (market === 'dc') return enableDoubleChance && !enableHomeWin && !enableAwayWin && !enableOver && !enableUnder && !enableBtts;
    if (market === 'homewin') return enableHomeWin && !enableDoubleChance && !enableAwayWin && !enableOver && !enableUnder && !enableBtts;
    if (market === 'awaywin') return enableAwayWin && !enableDoubleChance && !enableHomeWin && !enableOver && !enableUnder && !enableBtts;
    if (market === 'over') return enableOver && !enableDoubleChance && !enableHomeWin && !enableAwayWin && !enableUnder && !enableBtts;
    if (market === 'under') return enableUnder && !enableDoubleChance && !enableHomeWin && !enableAwayWin && !enableOver && !enableBtts;
    if (market === 'btts') return enableBtts && !enableDoubleChance && !enableHomeWin && !enableAwayWin && !enableOver && !enableUnder;
    return false;
  };

  // Solo button handler: snaps selecting area to only that filter
  const handleSolo = (market: 'dc' | 'homewin' | 'awaywin' | 'over' | 'under' | 'btts') => {
    if (isSolo(market)) {
      // Toggle off solo: restore all market filters
      onChange({
        ...criteria,
        enableDoubleChance: true,
        enableHomeWin: true,
        enableAwayWin: false,
        enableOver: true,
        enableUnder: true,
        enableBtts: true,
      });
    } else {
      // Solo this market
      onChange({
        ...criteria,
        enableDoubleChance: market === 'dc',
        enableHomeWin: market === 'homewin',
        enableAwayWin: market === 'awaywin',
        enableOver: market === 'over',
        enableUnder: market === 'under',
        enableBtts: market === 'btts',
      });
    }
    if (onSoloFilter) {
      onSoloFilter(market);
    }
  };

  // Reset single filter box to bare min and max
  const handleResetBox = (box: 'dc' | 'homewin' | 'awaywin' | 'over' | 'under' | 'btts') => {
    if (box === 'dc') {
      onChange({
        ...criteria,
        dcMin: 1.00,
        dcMax: 2.00,
        enableDoubleChance: true,
        enableDc1X: true,
        enableDc12: true,
        enableDcX2: true,
      });
    } else if (box === 'homewin') {
      onChange({ ...criteria, homeWinMin: 1.00, homeWinMax: 3.00, enableHomeWin: true });
    } else if (box === 'awaywin') {
      onChange({ ...criteria, awayWinMin: 1.00, awayWinMax: 3.00, enableAwayWin: true });
     } else if (box === 'over') {
      onChange({ ...criteria, overGoalLine: '0.5', overMin: 1.01, overMax: 3.00, enableOver: true });
    } else if (box === 'under') {
      onChange({ ...criteria, underGoalLine: '4.5', underMin: 1.05, underMax: 3.00, enableUnder: true });
    } else if (box === 'btts') {
      onChange({ ...criteria, bttsMin: 1.01, bttsMax: 3.00, enableBtts: true });
    }
  };

  const handlePickInputChange = (val: string) => {
    setPickInputStr(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
      updateCriteria('pickCount', parsed);
    }
  };

  const handlePickInputBlur = () => {
    const parsed = parseInt(pickInputStr, 10);
    if (isNaN(parsed) || parsed < 1) {
      setPickInputStr('1');
      updateCriteria('pickCount', 1);
    } else if (parsed > 100) {
      setPickInputStr('100');
      updateCriteria('pickCount', 100);
    } else {
      setPickInputStr(String(parsed));
      updateCriteria('pickCount', parsed);
    }
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
                <span className="text-[10px] text-slate-400">SportyBet Live Odds</span>
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

          {/* Reset All Filters Button */}
          <button
            onClick={handleResetAll}
            title="Reset All Filters to Default"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1 transition-colors border border-slate-700"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset All</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: Market Selector Chips & Odds Bounds with Toggle, Solo, and Box Reset */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-5 border-b border-slate-800/80">
        {/* Box 1: Double Chance Controls */}
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

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSolo('dc')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors border ${
                  isSolo('dc')
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Solo: Snap selecting area to only Double Chance"
              >
                Solo
              </button>
              <button
                type="button"
                onClick={() => handleResetBox('dc')}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Reset Double Chance to bare min & max (1.00 - 2.00)"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/20">
                {criteria.dcMin.toFixed(2)} - {criteria.dcMax.toFixed(2)}
              </span>
            </div>
          </div>
           {/* Double Chance Outcome Toggles: 1X, 12, X2 */}
           <div className="flex items-center gap-1.5 my-2.5">
             <button
               type="button"
               onClick={() => updateCriteria('enableDc1X', criteria.enableDc1X === false)}
               disabled={!criteria.enableDoubleChance}
               className={`flex-1 py-1 rounded-lg text-xs font-bold font-mono text-center transition-all border ${
                 criteria.enableDc1X !== false
                   ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                   : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
               } disabled:opacity-40`}
               title="Toggle 1X (Home or Draw)"
             >
               1X
             </button>

            <button
              type="button"
              onClick={() => updateCriteria('enableDc12', criteria.enableDc12 === false)}
              disabled={!criteria.enableDoubleChance}
              className={`flex-1 py-1 rounded-lg text-xs font-bold font-mono text-center transition-all border ${
                criteria.enableDc12 !== false
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              } disabled:opacity-40`}
              title="Toggle 12 (Home or Away)"
            >
              12
            </button>

            <button
              type="button"
              onClick={() => updateCriteria('enableDcX2', criteria.enableDcX2 === false)}
              disabled={!criteria.enableDoubleChance}
              className={`flex-1 py-1 rounded-lg text-xs font-bold font-mono text-center transition-all border ${
                criteria.enableDcX2 !== false
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              } disabled:opacity-40`}
              title="Toggle X2 (Draw or Away)"
            >
              X2
            </button>
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
            Toggle on/off, Solo to isolate, or Reset to bare min &amp; max (1.00 - 2.00).
          </p>
        </div>

        {/* Box 2: Home Win (1) Controls */}
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

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSolo('homewin')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors border ${
                  isSolo('homewin')
                    ? 'bg-blue-500 text-slate-950 border-blue-400 font-extrabold shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Solo: Snap selecting area to only Home Win"
              >
                Solo
              </button>
              <button
                type="button"
                onClick={() => handleResetBox('homewin')}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Reset Home Win to bare min & max (1.00 - 3.00)"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/50">
                {criteria.homeWinMin.toFixed(2)} - {criteria.homeWinMax.toFixed(2)}
              </span>
            </div>
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
            Toggle on/off, Solo to isolate, or Reset to bare min &amp; max (1.00 - 3.00).
          </p>
        </div>

        {/* Box 3: Away Win (2) Controls */}
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

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSolo('awaywin')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors border ${
                  isSolo('awaywin')
                    ? 'bg-indigo-500 text-slate-950 border-indigo-400 font-extrabold shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Solo: Snap selecting area to only Away Win"
              >
                Solo
              </button>
              <button
                type="button"
                onClick={() => handleResetBox('awaywin')}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Reset Away Win to bare min & max (1.00 - 3.00)"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-800/50">
                {criteria.awayWinMin.toFixed(2)} - {criteria.awayWinMax.toFixed(2)}
              </span>
            </div>
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
            Toggle on/off, Solo to isolate, or Reset to bare min &amp; max (1.00 - 3.00).
          </p>
        </div>

        {/* Box 4: Over Goal Line Selector */}
        <div
          className={`p-3.5 rounded-xl border transition-all flex flex-col ${
            criteria.enableOver
              ? 'bg-[#0f172a] border-amber-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/70 opacity-60'
          }`}
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

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSolo('over')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors border ${
                  isSolo('over')
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Solo: Snap selecting area to only Over Goals"
              >
                Solo
              </button>
              <button
                type="button"
                onClick={() => handleResetBox('over')}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                 title="Reset Over Goals to bare min & max (0.5 line, 1.01 - 3.00)"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50">
                Over {criteria.overGoalLine}
              </span>
            </div>
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
           {criteria.enableOver && (
             <DualRangeSlider
               min={1.01}
               max={3.0}
               step={0.02}
               minVal={criteria.overMin}
               maxVal={criteria.overMax}
               labelMin="over"
               labelMax="over"
               onChange={(newMin, newMax) =>
                 handleRangeChange('overMin', 'overMax', newMin, newMax)
               }
             />
           )}
           <p className="text-[11px] text-slate-400 mt-2">
             Toggle on/off, Solo to isolate, or Reset to bare min &amp; max (1.01 - 3.00).
           </p>
         </div>

        {/* Box 5: Under Goal Line Selector */}
        <div
          className={`p-3.5 rounded-xl border transition-all flex flex-col ${
            criteria.enableUnder
              ? 'bg-[#0f172a] border-purple-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/70 opacity-60'
          }`}
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

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSolo('under')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors border ${
                  isSolo('under')
                    ? 'bg-purple-500 text-slate-950 border-purple-400 font-extrabold shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Solo: Snap selecting area to only Under Goals"
              >
                Solo
              </button>
              <button
                type="button"
                onClick={() => handleResetBox('under')}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                 title="Reset Under Goals to bare min & max (4.5 line, 1.01 - 3.00)"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800/50">
                Under {criteria.underGoalLine}
              </span>
            </div>
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
           {criteria.enableUnder && (
             <DualRangeSlider
               min={1.01}
               max={3.0}
               step={0.02}
               minVal={criteria.underMin}
               maxVal={criteria.underMax}
               labelMin="under"
               labelMax="under"
               onChange={(newMin, newMax) =>
                 handleRangeChange('underMin', 'underMax', newMin, newMax)
               }
             />
           )}
           <p className="text-[11px] text-slate-400 mt-2">
             Safe ceiling for accumulators. Solo to snap selecting area.
           </p>
        </div>

         {/* Box 6: Both Teams To Score (GG) */}
         <div
           className={`p-3.5 rounded-xl border transition-all flex flex-col ${
             criteria.enableBtts
               ? 'bg-[#0f172a] border-cyan-500/40 shadow-sm'
               : 'bg-slate-900/40 border-slate-800/70 opacity-60'
           }`}
         >
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={criteria.enableBtts}
                onChange={(e) => updateCriteria('enableBtts', e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-cyan-300">Both Teams Score (GG)</span>
            </label>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSolo('btts')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors border ${
                  isSolo('btts')
                    ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-extrabold shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Solo: Snap selecting area to only BTTS"
              >
                Solo
              </button>
              <button
                type="button"
                onClick={() => handleResetBox('btts')}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Reset BTTS (GG/NG) to bare min & max (1.01 - 3.00)"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
                GG / NG
              </span>
            </div>
          </div>
          {criteria.enableBtts && (
            <DualRangeSlider
              min={1.01}
              max={3.0}
              step={0.02}
              minVal={criteria.bttsMin}
              maxVal={criteria.bttsMax}
              labelMin="gg"
              labelMax="gg"
              onChange={(newMin, newMax) =>
                handleRangeChange('bttsMin', 'bttsMax', newMin, newMax)
              }
            />
          )}
          <p className="text-[11px] text-slate-400 mt-2">
            Both teams score on SportyBet market 29. Toggle on/off, Solo to snap selecting area, or Reset to bare min &amp; max (1.01 - 3.00).
          </p>
        </div>
      </div>

      {/* SECTION 4: Timeframe, League & Typable Pick Controls */}
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

        {/* Typable Pick Size & Action Controls */}
        <div className="space-y-1.5 w-full lg:w-auto">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Picks Size (Typable):
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {/* Presets and Typable Input */}
            <div className="flex items-center bg-[#0b111e] border border-slate-700/80 rounded-xl p-1 gap-1">
              {PICK_COUNT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => updateCriteria('pickCount', preset)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                    criteria.pickCount === preset
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {preset}
                </button>
              ))}
              {/* Typable input */}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pickInputStr}
                onChange={(e) => handlePickInputChange(e.target.value)}
                onBlur={handlePickInputBlur}
                className="w-14 bg-slate-800 border border-slate-700 text-center py-1 text-xs text-emerald-400 font-mono font-bold rounded-lg focus:outline-none focus:border-emerald-400"
                title="Type any number of picks (1 - 100)"
              />
            </div>

            {/* Renamed label: Pick instead of algo pick n */}
            <span className="px-3 py-1.5 bg-slate-900 text-emerald-400 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 font-mono">
              Pick {criteria.pickCount}
            </span>

            {/* Next Button: Adds candidate picks from staging area to slip */}
            <button
              onClick={() => onNextAdd(criteria.pickCount)}
              title="Next: Add candidate picks from staging area into the betslip"
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Next</span>
            </button>

            {/* Shuffle Button with Dropdown (Staging Area vs In Slip) */}
            <div className="relative inline-flex items-center">
              <button
                onClick={() => onShuffle(shuffleTarget, criteria.pickCount)}
                title={`Shuffle ${shuffleTarget === 'staging' ? 'Staging Area' : 'In Slip'} selections`}
                className="px-2.5 py-1.5 rounded-l-xl bg-slate-200 hover:bg-white text-slate-950 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Shuffle ({shuffleTarget === 'staging' ? 'Staging' : 'In Slip'})</span>
              </button>
              <button
                onClick={() => setIsShuffleMenuOpen(!isShuffleMenuOpen)}
                title="Select shuffle target: Staging Area or In Slip"
                className="px-1.5 py-1.5 rounded-r-xl bg-slate-300 hover:bg-white text-slate-950 border-l border-slate-400 text-xs transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown Menu */}
              {isShuffleMenuOpen && (
                <div className="absolute top-full mt-1 left-0 z-30 bg-[#0d1422] border border-slate-700 rounded-xl shadow-2xl py-1 w-44">
                  <button
                    onClick={() => {
                      setShuffleTarget('staging');
                      setIsShuffleMenuOpen(false);
                      onShuffle('staging', criteria.pickCount);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      shuffleTarget === 'staging' ? 'text-amber-400 font-bold bg-slate-850' : 'text-slate-300'
                    }`}
                  >
                    <span>Staging Area</span>
                    {shuffleTarget === 'staging' && <Check className="w-3 h-3 text-amber-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setShuffleTarget('slip');
                      setIsShuffleMenuOpen(false);
                      onShuffle('slip', criteria.pickCount);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      shuffleTarget === 'slip' ? 'text-emerald-400 font-bold bg-slate-850' : 'text-slate-300'
                    }`}
                  >
                    <span>In Slip</span>
                    {shuffleTarget === 'slip' && <Check className="w-3 h-3 text-emerald-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Remove Button: Removes least preferred ("can do without") games */}
            <button
              onClick={() => onRemoveGames(criteria.pickCount)}
              title="Remove: Discards the least preferred (highest risk) games you can do without"
              className="px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Remove</span>
            </button>

            {/* Empty Slip Button */}
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

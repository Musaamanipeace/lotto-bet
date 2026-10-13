'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FilterCriteria, BookieId } from '@/types';
import {
  TIMEFRAME_OPTIONS,
  PICK_COUNT_PRESETS,
  DEFAULT_FILTER_CRITERIA,
  EMPTY_FILTER_CRITERIA,
  BOOKIE_CONFIGS,
} from '@/lib/constants';
import {
  RotateCcw,
  Search,
  Sliders,
  Building2,
  Check,
  ShieldCheck,
  Plus,
  Minus,
  Shuffle,
  ChevronDown,
  Coins,
  Sparkles,
  Dices,
  Zap,
  Lock,
} from 'lucide-react';

interface FilterBarProps {
  criteria: FilterCriteria;
  onChange: (criteria: FilterCriteria) => void;
  availableLeagues: string[];
  totalEligibleMatches: number;
  companyCounts: Record<string, number>;
  onNextAdd: (count: number) => void;
  onShuffle: (target: 'staging' | 'slip', count: number, mode?: 'ai' | 'random') => void;
  onAddAiPicks?: (count: number) => void;
  onAddRandomPicks?: (count: number) => void;
  onRemoveGames: (count: number) => void;
  onSoloFilter?: (market: string) => void;
  hasAiKey?: boolean;
  onRequireKey?: (feature: string) => void;
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
          style={{
            left: `${toPercent(minVal)}%`,
            width: `${toPercent(maxVal) - toPercent(minVal)}%`,
          }}
        />
        <button
          ref={minHandleRef}
          type="button"
          onPointerDown={startDragging('min')}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-slate-900 border-2 border-emerald-500 rounded-full shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10"
        />
        <button
          ref={maxHandleRef}
          type="button"
          onPointerDown={startDragging('max')}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-slate-900 border-2 border-emerald-500 rounded-full shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10"
        />
      </div>

      <div className="flex justify-between items-center text-xs font-mono text-slate-400">
        <span ref={minLabelRef} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
          {minVal.toFixed(2)}
        </span>
        <span className="text-[10px] text-slate-500">odds bound</span>
        <span ref={maxLabelRef} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
          {maxVal.toFixed(2)}
        </span>
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
  onAddAiPicks,
  onAddRandomPicks,
  onRemoveGames,
  onSoloFilter,
  hasAiKey = true,
  onRequireKey,
}) => {
  const [pickInputStr, setPickInputStr] = useState<string>(String(criteria.pickCount || 30));
  const [shuffleTarget, setShuffleTarget] = useState<'staging' | 'slip'>('staging');
  const [shuffleMode, setShuffleMode] = useState<'ai' | 'random'>('ai');
  const [isShuffleMenuOpen, setIsShuffleMenuOpen] = useState(false);

  useEffect(() => {
    setPickInputStr(String(criteria.pickCount));
  }, [criteria.pickCount]);

  const updateCriteria = <K extends keyof FilterCriteria>(key: K, value: FilterCriteria[K]) => {
    onChange({ ...criteria, [key]: value });
  };

  /** Section 2.3: Reset All Filters Button Repair - resets all to clean off/empty state */
  const handleResetAll = () => {
    onChange({ ...EMPTY_FILTER_CRITERIA });
  };

  const handleRangeChange = (
    setMinKey: 'dcMin' | 'homeWinMin' | 'awayWinMin' | 'overMin' | 'underMin' | 'bttsMin',
    setMaxKey: 'dcMax' | 'homeWinMax' | 'awayWinMax' | 'overMax' | 'underMax' | 'bttsMax',
    newMin: number,
    newMax: number
  ) => {
    onChange({
      ...criteria,
      [setMinKey]: newMin,
      [setMaxKey]: newMax,
    });
  };

  // Solo feature: turns on ONE market and turns off all others
  const handleSolo = (market: 'dc' | 'homewin' | 'awaywin' | 'over' | 'under' | 'btts') => {
    onChange({
      ...criteria,
      enableDoubleChance: market === 'dc',
      enableHomeWin: market === 'homewin',
      enableAwayWin: market === 'awaywin',
      enableOver: market === 'over',
      enableUnder: market === 'under',
      enableBtts: market === 'btts',
    });
    if (onSoloFilter) {
      onSoloFilter(market);
    }
  };

  // Reset single filter box
  const handleResetBox = (box: 'dc' | 'homewin' | 'awaywin' | 'over' | 'under' | 'btts') => {
    if (box === 'dc') {
      onChange({ ...criteria, dcMin: 1.0, dcMax: 2.0 });
    } else if (box === 'homewin') {
      onChange({ ...criteria, homeWinMin: 1.0, homeWinMax: 3.0 });
    } else if (box === 'awaywin') {
      onChange({ ...criteria, awayWinMin: 1.0, awayWinMax: 3.0 });
    } else if (box === 'over') {
      onChange({ ...criteria, overMin: 1.01, overMax: 3.0, overGoalLine: '0.5' });
    } else if (box === 'under') {
      onChange({ ...criteria, underMin: 1.01, underMax: 3.0, underGoalLines: ['3.5', '4.5'] });
    } else if (box === 'btts') {
      onChange({ ...criteria, bttsMin: 1.01, bttsMax: 3.0, bttsSelections: ['GG', 'NGG'] });
    }
  };

  const isSolo = (market: 'dc' | 'homewin' | 'awaywin' | 'over' | 'under' | 'btts') => {
    const map = {
      dc: criteria.enableDoubleChance,
      homewin: criteria.enableHomeWin,
      awaywin: criteria.enableAwayWin,
      over: criteria.enableOver,
      under: criteria.enableUnder,
      btts: criteria.enableBtts,
    };
    const activeKeys = Object.entries(map).filter(([, v]) => v);
    return activeKeys.length === 1 && map[market] === true;
  };

  /** Section 2.1: Under Goals multi-selection logic */
  const activeUnderLines = criteria.underGoalLines || ['3.5'];
  const toggleUnderGoalLine = (line: '3.5' | '4.5') => {
    const current = new Set(criteria.underGoalLines || []);
    if (current.has(line)) {
      current.delete(line);
    } else {
      current.add(line);
    }
    const next = Array.from(current) as ('3.5' | '4.5')[];
    onChange({
      ...criteria,
      underGoalLines: next,
      underGoalLine: next[0] || '3.5',
      enableUnder: next.length > 0 ? true : criteria.enableUnder,
    });
  };

  /** Section 2.2: BTTS (GG & NGG) multi-selection logic */
  const activeBttsSelections = criteria.bttsSelections || ['GG'];
  const toggleBttsSelection = (pick: 'GG' | 'NGG') => {
    const current = new Set(criteria.bttsSelections || []);
    if (current.has(pick)) {
      current.delete(pick);
    } else {
      current.add(pick);
    }
    const next = Array.from(current) as ('GG' | 'NGG')[];
    onChange({
      ...criteria,
      bttsSelections: next,
      enableBtts: next.length > 0 ? true : criteria.enableBtts,
    });
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

  const bookieKeys: BookieId[] = [
    'sportybet:ke',
    'betpawa:ke',
    '1xbet:ke',
    'mozzart:ke',
    'sportpesa:ke',
  ];

  return (
    <div className="bg-[#111927] border border-slate-800 rounded-2xl p-4 md:p-6 mb-8 shadow-xl space-y-6">
      {/* SECTION 1: Target Bookmakers Bar */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Target Bookmaker
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Select to tailor odds &amp; direct booking generation
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* ALL BOOKIES */}
          <button
            type="button"
            onClick={() => updateCriteria('selectedCompany', 'ALL')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              criteria.selectedCompany === 'ALL'
                ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="text-xs font-bold truncate">All Bookmakers</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {companyCounts.all ?? totalEligibleMatches} matches
            </div>
          </button>

          {/* 5 INDIVIDUAL BOOKMAKERS */}
          {bookieKeys.map((bId) => {
            const cfg = BOOKIE_CONFIGS[bId];
            const isSelected = criteria.selectedCompany === bId;
            return (
              <button
                key={bId}
                type="button"
                onClick={() => updateCriteria('selectedCompany', bId)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? `${cfg.badgeBg} border-current ${cfg.badgeText} shadow-md ring-1 ring-current`
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold truncate">{cfg.shortName}</div>
                <div className="text-[10px] opacity-80 mt-0.5 truncate">
                  Min {cfg.minStake} KSh
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Top Search & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Market Odds Filter
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                {totalEligibleMatches} Qualifying
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Configure odds ranges, cashout requirement, and goal lines
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search team or league..."
              value={criteria.searchQuery}
              onChange={(e) => updateCriteria('searchQuery', e.target.value)}
              className="w-full bg-[#0b111e] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Section 2.4: Cashout Availability Filter Toggle */}
          <button
            type="button"
            onClick={() => updateCriteria('cashoutOnly', !criteria.cashoutOnly)}
            title="Filter matches that explicitly support Cashout"
            className={`px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all border ${
              criteria.cashoutOnly
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cashout Only</span>
            {criteria.cashoutOnly && <Check className="w-3 h-3 text-emerald-400" />}
          </button>

          {/* Bookable only toggle */}
          <button
            type="button"
            onClick={() =>
              updateCriteria('requireFullMarketData', !criteria.requireFullMarketData)
            }
            title="Only use fixtures that already have complete market IDs for booking codes"
            className={`px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors border ${
              criteria.requireFullMarketData
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-semibold'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bookable only</span>
          </button>

          {/* Section 2.3: Reset All Filters Button Repair */}
          <button
            type="button"
            onClick={handleResetAll}
            title="Reset All Filters to Default Empty/Off State"
            className="px-3 py-2 bg-slate-800 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-700 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: Market Selector Chips & Odds Bounds */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-2 border-b border-slate-800/80">
        {/* Box 1: Double Chance Controls */}
        <div
          className={`p-3.5 rounded-xl border transition-all flex flex-col ${
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
                title="Reset Double Chance odds to defaults"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 mb-2">
            {[
              { key: 'enableDc1X', label: '1X (Home/Draw)' },
              { key: 'enableDc12', label: '12 (Home/Away)' },
              { key: 'enableDcX2', label: 'X2 (Draw/Away)' },
            ].map(({ key, label }) => {
              const active = criteria[key as keyof FilterCriteria] !== false;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    updateCriteria(key as keyof FilterCriteria, !active as unknown as never)
                  }
                  className={`flex-1 py-1 px-1 rounded-lg text-[10px] font-bold border transition-colors ${
                    active
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {criteria.enableDoubleChance && (
            <DualRangeSlider
              min={1.0}
              max={2.0}
              step={0.01}
              minVal={criteria.dcMin}
              maxVal={criteria.dcMax}
              onChange={(newMin, newMax) => handleRangeChange('dcMin', 'dcMax', newMin, newMax)}
            />
          )}
        </div>

        {/* Box 2: Home Win (1) Controls */}
        <div
          className={`p-3.5 rounded-xl border transition-all flex flex-col ${
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
                title="Reset Home Win bounds"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {criteria.enableHomeWin && (
            <DualRangeSlider
              min={1.0}
              max={3.0}
              step={0.02}
              minVal={criteria.homeWinMin}
              maxVal={criteria.homeWinMax}
              onChange={(newMin, newMax) =>
                handleRangeChange('homeWinMin', 'homeWinMax', newMin, newMax)
              }
            />
          )}
        </div>

        {/* Box 3: Away Win (2) Controls */}
        <div
          className={`p-3.5 rounded-xl border transition-all flex flex-col ${
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
                title="Reset Away Win bounds"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {criteria.enableAwayWin && (
            <DualRangeSlider
              min={1.0}
              max={3.0}
              step={0.02}
              minVal={criteria.awayWinMin}
              maxVal={criteria.awayWinMax}
              onChange={(newMin, newMax) =>
                handleRangeChange('awayWinMin', 'awayWinMax', newMin, newMax)
              }
            />
          )}
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
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
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
                title="Reset Over Goals bounds"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 mb-2">
            {(['0.5', '1.5'] as const).map((line) => (
              <button
                key={line}
                type="button"
                onClick={() => updateCriteria('overGoalLine', line)}
                disabled={!criteria.enableOver}
                className={`flex-1 text-center py-1 rounded-lg text-xs font-medium transition-all ${
                  criteria.overGoalLine === line
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                } disabled:opacity-40`}
              >
                Over {line}
              </button>
            ))}
          </div>

          {criteria.enableOver && (
            <DualRangeSlider
              min={1.01}
              max={3.0}
              step={0.02}
              minVal={criteria.overMin}
              maxVal={criteria.overMax}
              onChange={(newMin, newMax) =>
                handleRangeChange('overMin', 'overMax', newMin, newMax)
              }
            />
          )}
        </div>

        {/* Section 2.1: Box 5 - Under Goal Line Selector with Simultaneous Multi-Selection */}
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
              <span className="text-xs font-bold text-purple-300">Under Goals (Multi-Select)</span>
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
                title="Reset Under Goals to defaults"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Section 2.1: Multi-selection toggle buttons for 3.5 and 4.5 simultaneously */}
          <div className="flex gap-1.5 mb-2">
            {(['3.5', '4.5'] as const).map((line) => {
              const isActive = activeUnderLines.includes(line);
              return (
                <button
                  key={line}
                  type="button"
                  onClick={() => toggleUnderGoalLine(line)}
                  disabled={!criteria.enableUnder}
                  className={`flex-1 text-center py-1 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-purple-500 text-slate-950 border-purple-400 shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                  } disabled:opacity-40`}
                >
                  <span>Under {line}</span>
                  {isActive && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </button>
              );
            })}
          </div>

          {criteria.enableUnder && (
            <DualRangeSlider
              min={1.01}
              max={3.0}
              step={0.02}
              minVal={criteria.underMin}
              maxVal={criteria.underMax}
              onChange={(newMin, newMax) =>
                handleRangeChange('underMin', 'underMax', newMin, newMax)
              }
            />
          )}
          <p className="text-[10px] text-slate-400 mt-1">
            Toggle 3.5 &amp; 4.5 ON simultaneously for flexible ceiling safety.
          </p>
        </div>

        {/* Section 2.2: Box 6 - Both Teams To Score (BTTS) with Explicit GG & NGG Multi-Selection */}
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
              <span className="text-xs font-bold text-cyan-300">BTTS (Both Teams Score)</span>
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
                title="Reset BTTS bounds"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Section 2.2: Explicit GG and NGG toggle buttons allowing simultaneous multi-selection */}
          <div className="flex gap-1.5 mb-2">
            {[
              { id: 'GG' as const, label: 'GG (Yes)' },
              { id: 'NGG' as const, label: 'NGG (No)' },
            ].map(({ id, label }) => {
              const isActive = activeBttsSelections.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleBttsSelection(id)}
                  disabled={!criteria.enableBtts}
                  className={`flex-1 text-center py-1 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                  } disabled:opacity-40`}
                >
                  <span>{label}</span>
                  {isActive && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </button>
              );
            })}
          </div>

          {criteria.enableBtts && (
            <DualRangeSlider
              min={1.01}
              max={3.0}
              step={0.02}
              minVal={criteria.bttsMin}
              maxVal={criteria.bttsMax}
              onChange={(newMin, newMax) =>
                handleRangeChange('bttsMin', 'bttsMax', newMin, newMax)
              }
            />
          )}
          <p className="text-[10px] text-slate-400 mt-1">
            Toggle GG &amp; NGG simultaneously to match both or either market.
          </p>
        </div>
      </div>

      {/* SECTION 4: Timeframe, League & Dual Strategy Generation Controls */}
      <div className="pt-2 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Timeframe Pills */}
        <div className="space-y-1.5 w-full lg:w-auto">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Kickoff Window:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TIMEFRAME_OPTIONS.map((tf) => (
              <button
                key={tf.label}
                type="button"
                onClick={() => updateCriteria('timeframeHours', tf.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  criteria.timeframeHours === tf.value
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* League Selector Dropdown */}
        <div className="space-y-1.5 w-full lg:w-auto">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Filter League:
          </span>
          <select
            value={criteria.selectedLeague}
            onChange={(e) => updateCriteria('selectedLeague', e.target.value)}
            className="w-full lg:w-56 bg-[#0b111e] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Leagues</option>
            {availableLeagues.map((lg) => (
              <option key={lg} value={lg}>
                {lg}
              </option>
            ))}
          </select>
        </div>

        {/* Section 3A & 2.5: Pick Size, Add, Shuffle & Dual Picking Controls */}
        <div className="space-y-1.5 w-full lg:w-auto">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Selection &amp; Accumulator Controls:
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {/* Presets */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {PICK_COUNT_PRESETS.slice(0, 4).map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => updateCriteria('pickCount', count)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    criteria.pickCount === count
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {count}
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
                className="w-12 bg-slate-800 border border-slate-700 text-center py-0.5 text-xs text-emerald-400 font-mono font-bold rounded-lg focus:outline-none focus:border-emerald-400"
                title="Type any number of picks (1 - 100)"
              />
            </div>

            {/* Section 3A: Dual Picking Generation Buttons */}
            {/* Option 1: AI Pick (Educated Analysis) */}
            <button
              type="button"
              onClick={() => {
                if (!hasAiKey) {
                  onRequireKey?.('AI Picks');
                  return;
                }
                if (onAddAiPicks) {
                  onAddAiPicks(criteria.pickCount);
                } else {
                  onNextAdd(criteria.pickCount);
                }
              }}
              title={
                hasAiKey
                  ? 'AI Pick: Educated analysis evaluating H2H, favoritism, form edge, and value odds'
                  : 'AI Pick requires an API Key. Click to configure in Settings.'
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 ${
                hasAiKey
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-emerald-950/40 text-emerald-400/80 border border-emerald-500/30 hover:border-emerald-500/60'
              }`}
            >
              {hasAiKey ? (
                <Sparkles className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>AI Pick ({criteria.pickCount})</span>
              {!hasAiKey && (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-mono font-bold">
                  KEY
                </span>
              )}
            </button>

            {/* Option 2: Random Pick */}
            <button
              type="button"
              onClick={() => {
                if (onAddRandomPicks) {
                  onAddRandomPicks(criteria.pickCount);
                } else {
                  onShuffle('slip', criteria.pickCount, 'random');
                }
              }}
              title="Random Pick: Pure unbiased selection across eligible matches"
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Dices className="w-3.5 h-3.5 text-amber-400" />
              <span>Random Pick</span>
            </button>

            {/* Section 2.5: Relabeled "Add" Button (was "Next") */}
            <button
              type="button"
              onClick={() => onNextAdd(criteria.pickCount)}
              title="Add candidate picks from staging area into the betslip"
              className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-white text-slate-950 text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Slip</span>
            </button>

            {/* Shuffle Button with Dropdown (Staging vs In Slip, AI vs Random) */}
            <div className="relative inline-flex items-center">
              <button
                type="button"
                onClick={() => onShuffle(shuffleTarget, criteria.pickCount, shuffleMode)}
                title={`Shuffle ${shuffleTarget === 'staging' ? 'Staging Area' : 'In Slip'} selections (${shuffleMode.toUpperCase()})`}
                className="px-2.5 py-1.5 rounded-l-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                <span>Shuffle</span>
              </button>
              <button
                type="button"
                onClick={() => setIsShuffleMenuOpen(!isShuffleMenuOpen)}
                title="Select shuffle target and mode"
                className="px-1.5 py-1.5 rounded-r-xl bg-slate-800 hover:bg-slate-700 border border-l-0 border-slate-700 text-slate-200 text-xs transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown Menu */}
              {isShuffleMenuOpen && (
                <div className="absolute top-full mt-1 right-0 z-30 bg-[#0d1422] border border-slate-700 rounded-xl shadow-2xl py-1 w-48 divide-y divide-slate-800">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Target
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShuffleTarget('staging');
                      setIsShuffleMenuOpen(false);
                      onShuffle('staging', criteria.pickCount, shuffleMode);
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
                      onShuffle('slip', criteria.pickCount, shuffleMode);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      shuffleTarget === 'slip' ? 'text-emerald-400 font-bold' : 'text-slate-300'
                    }`}
                  >
                    <span>In Slip</span>
                    {shuffleTarget === 'slip' && <Check className="w-3 h-3 text-emerald-400" />}
                  </button>

                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Strategy
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShuffleMode('ai');
                      setIsShuffleMenuOpen(false);
                      onShuffle(shuffleTarget, criteria.pickCount, 'ai');
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      shuffleMode === 'ai' ? 'text-emerald-400 font-bold' : 'text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> AI Educated
                    </span>
                    {shuffleMode === 'ai' && <Check className="w-3 h-3 text-emerald-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShuffleMode('random');
                      setIsShuffleMenuOpen(false);
                      onShuffle(shuffleTarget, criteria.pickCount, 'random');
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      shuffleMode === 'random' ? 'text-amber-400 font-bold' : 'text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Dices className="w-3 h-3" /> Random
                    </span>
                    {shuffleMode === 'random' && <Check className="w-3 h-3 text-amber-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Remove Button */}
            <button
              type="button"
              onClick={() => onRemoveGames(criteria.pickCount)}
              title="Remove least preferred (highest risk) games you can do without"
              className="px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Remove</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

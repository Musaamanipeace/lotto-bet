'use client';
import { useEffect, useRef, useState } from 'react';
import {
  BTTS_CHOICES,
  CARDS,
  DC_CHOICES,
  MATCH_RESULT_CHOICES,
  allAvailableCards,
  isSolo,
  resetCard,
  soloCard,
  toggleSub,
  type CardDef,
  type CardId,
  type CardsState,
} from '@/lib/market-cards.ts';
import {
  DEFAULT_TEMPLATES,
  deleteLocalTemplate,
  getLocalTemplates,
  notifyTemplateApplied,
  onTemplateApplied,
  onTemplatesChanged,
  saveLocalTemplate,
  type FilterTemplate,
} from '@/lib/template-store.ts';
import { BOOKMAKER_LABEL, type Bookmaker } from '@/lib/types.ts';
import { useAuth } from './auth-context';
import { LeagueChecklist, type LeagueItem } from './league-checklist';

/** Full class names on purpose: Tailwind only generates classes it can read literally in these files. */
const ACCENT: Record<CardId, { dot: string; title: string; edge: string; chipOn: string }> = {
  dc:    { dot: 'bg-emerald-400', title: 'text-emerald-300', edge: 'border-emerald-400/40', chipOn: 'border-emerald-400 bg-emerald-400 text-navy-950' },
  '1x2': { dot: 'bg-purple-400',  title: 'text-purple-300',  edge: 'border-purple-400/40',  chipOn: 'border-purple-400 bg-purple-400 text-navy-950' },
  over:  { dot: 'bg-sky-400',     title: 'text-sky-300',     edge: 'border-sky-400/40',     chipOn: 'border-sky-400 bg-sky-400 text-navy-950' },
  under: { dot: 'bg-rose-400',    title: 'text-rose-300',    edge: 'border-rose-400/40',    chipOn: 'border-rose-400 bg-rose-400 text-navy-950' },
  btts:  { dot: 'bg-orange-400',  title: 'text-orange-300',  edge: 'border-orange-400/40',  chipOn: 'border-orange-400 bg-orange-400 text-navy-950' },
};

const WITHIN_OPTIONS: { label: string; hours: number | null }[] = [
  { label: 'Any time (next 7 days)', hours: null },
  { label: 'Next 6 hours', hours: 6 },
  { label: 'Next 12 hours', hours: 12 },
  { label: 'Next 24 hours', hours: 24 },
  { label: 'Next 48 hours', hours: 48 },
  { label: 'Next 3 days', hours: 72 },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Validates and clamps a two-point (min/max) odds input update.
 * Enforces sensible bounds [min, max], step rounding, and min <= max.
 */
export function clampOddsInput(
  which: 'low' | 'high',
  rawValue: string,
  currentLow: number,
  currentHigh: number,
  min: number,
  max: number,
  step: number,
): { low: number; high: number } {
  const parsed = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsed)) {
    return { low: currentLow, high: currentHigh };
  }
  const snap = (v: number) => round2(clamp(min + Math.round((v - min) / step) * step, min, max));
  if (which === 'low') {
    const nextLow = snap(clamp(parsed, min, currentHigh));
    const nextHigh = Math.max(nextLow, currentHigh);
    return { low: nextLow, high: nextHigh };
  }
  const nextHigh = snap(clamp(parsed, currentLow, max));
  const nextLow = Math.min(currentLow, nextHigh);
  return { low: nextLow, high: nextHigh };
}

/**
 * Two-point (min/max odds) filter via text inputs ONLY (Task 9).
 * Drag/slider interaction has been removed.
 */
function OddsRange({
  def,
  low,
  high,
  onCommit,
}: {
  def: CardDef;
  low: number;
  high: number;
  onCommit: (low: number, high: number) => void;
}) {
  const { min, max, step } = def;
  const [textLow, setTextLow] = useState(low.toFixed(2));
  const [textHigh, setTextHigh] = useState(high.toFixed(2));

  useEffect(() => {
    setTextLow(low.toFixed(2));
    setTextHigh(high.toFixed(2));
  }, [low, high]);

  const commitLow = (val: string) => {
    const next = clampOddsInput('low', val, low, high, min, max, step);
    setTextLow(next.low.toFixed(2));
    setTextHigh(next.high.toFixed(2));
    if (next.low !== low || next.high !== high) {
      onCommit(next.low, next.high);
    }
  };

  const commitHigh = (val: string) => {
    const next = clampOddsInput('high', val, low, high, min, max, step);
    setTextLow(next.low.toFixed(2));
    setTextHigh(next.high.toFixed(2));
    if (next.low !== low || next.high !== high) {
      onCommit(next.low, next.high);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-navy-950/50 p-2.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <label className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-400">Min Odds:</span>
          <input
            type="number"
            inputMode="decimal"
            step={step}
            min={min}
            max={max}
            value={textLow}
            onChange={(e) => setTextLow(e.target.value)}
            onBlur={(e) => commitLow(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitLow((e.target as HTMLInputElement).value);
              }
            }}
            aria-label={`${def.title} minimum odds`}
            className="field h-7 w-20 px-2 text-center font-mono text-xs font-semibold text-gold-400"
          />
        </label>
        <span className="text-[10px] font-mono text-slate-500">to</span>
        <label className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-400">Max Odds:</span>
          <input
            type="number"
            inputMode="decimal"
            step={step}
            min={min}
            max={max}
            value={textHigh}
            onChange={(e) => setTextHigh(e.target.value)}
            onBlur={(e) => commitHigh(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitHigh((e.target as HTMLInputElement).value);
              }
            }}
            aria-label={`${def.title} maximum odds`}
            className="field h-7 w-20 px-2 text-center font-mono text-xs font-semibold text-gold-400"
          />
        </label>
      </div>
      <p className="mt-1 text-[10px] text-slate-500">
        Bounds: {min.toFixed(2)} – {max.toFixed(2)} (min ≤ max)
      </p>
    </div>
  );
}

const chip = (on: boolean, accent: CardId) =>
  `rounded-lg border px-2 py-1 text-xs font-semibold transition ${on ? ACCENT[accent].chipOn : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/10 hover:text-slate-100'}`;

export function MarketFilters({
  bookmaker = 'sportybet',
  onBookmakerChange,
  withinHours = null,
  onWithinHoursChange,
  leagues = [],
  onLeaguesChange,
  availableLeagues = null,
  leagueList = null,
  cards,
  onChange,
  goalLines,
  qualifying,
}: {
  bookmaker?: Bookmaker;
  onBookmakerChange?: (b: Bookmaker) => void;
  withinHours?: number | null;
  onWithinHoursChange?: (h: number | null) => void;
  leagues?: string[];
  onLeaguesChange?: (l: string[]) => void;
  availableLeagues?: string[] | null;
  leagueList?: LeagueItem[] | null;
  cards: CardsState;
  onChange: (next: CardsState) => void;
  goalLines: number[];
  qualifying: number | null;
}) {
  const { user } = useAuth();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  const [templates, setTemplates] = useState<FilterTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const leaguesRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    setTemplates(getLocalTemplates());
    const offApplied = onTemplateApplied((tpl) => {
      setSelectedTemplateId(tpl.id);
      if (tpl.bookmaker) onBookmakerChange?.(tpl.bookmaker);
      onWithinHoursChange?.(tpl.withinHours !== undefined ? tpl.withinHours : null);
      onLeaguesChange?.(Array.isArray(tpl.leagues) ? [...tpl.leagues] : []);
      onChange(tpl.cards);
      setNotice(`Applied template: "${tpl.name}"`);
      setTimeout(() => setNotice(null), 3000);
    });
    const offChanged = onTemplatesChanged((next) => setTemplates(next));
    return () => {
      offApplied();
      offChanged();
    };
  }, [user, onChange, onBookmakerChange, onWithinHoursChange, onLeaguesChange]);

  // Close Leagues dropdown on outside click or Escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const d = leaguesRef.current;
      if (d?.open && !d.contains(e.target as Node)) d.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && leaguesRef.current?.open) leaguesRef.current.open = false;
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const set = (id: CardId, patch: Partial<CardsState[CardId]>) =>
    onChange({ ...cards, [id]: { ...cards[id], ...patch } });
  const anyOn = Object.values(cards).some((c) => c.on);

  const toggleCardCollapse = (id: string) => {
    setCollapsedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllCards = () => {
    const allCollapsed = CARDS.every((d) => collapsedCards[d.id]);
    const next: Record<string, boolean> = {};
    CARDS.forEach((d) => {
      next[d.id] = !allCollapsed;
    });
    setCollapsedCards(next);
  };

  function handleSelectTemplate(id: string) {
    setSelectedTemplateId(id);
    if (!id) return;
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      if (tpl.bookmaker) onBookmakerChange?.(tpl.bookmaker);
      onWithinHoursChange?.(tpl.withinHours !== undefined ? tpl.withinHours : null);
      onLeaguesChange?.(Array.isArray(tpl.leagues) ? [...tpl.leagues] : []);
      onChange(tpl.cards);
      notifyTemplateApplied(tpl);
      setNotice(`Applied template: "${tpl.name}"`);
      setTimeout(() => setNotice(null), 3000);
    }
  }

  async function handleSaveNewTemplate() {
    if (!newTemplateName.trim()) return;
    const tpl = saveLocalTemplate({
      name: newTemplateName.trim(),
      description: newTemplateDesc.trim() || undefined,
      bookmaker,
      withinHours: withinHours ?? null,
      leagues: Array.isArray(leagues) ? [...leagues] : [],
      cards,
    });

    fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tpl),
    }).catch(() => {});

    setTemplates(getLocalTemplates());
    setSelectedTemplateId(tpl.id);
    setSaveModalOpen(false);
    setNewTemplateName('');
    setNewTemplateDesc('');
    setNotice(`Saved template: "${tpl.name}"`);
    setTimeout(() => setNotice(null), 3000);
  }

  function handleDeleteCurrentTemplate() {
    if (!selectedTemplateId) return;
    deleteLocalTemplate(selectedTemplateId);
    setTemplates(getLocalTemplates());
    setSelectedTemplateId('');
    setNotice('Template deleted');
    setTimeout(() => setNotice(null), 2500);
  }

  function subToggles(def: CardDef) {
    const c = cards[def.id];
    const pick = (sub: string) => onChange(toggleSub(cards, def.id, sub));
    if (def.id === 'dc') {
      return DC_CHOICES.map((d) => (
        <button
          key={d.id}
          type="button"
          aria-pressed={c.subs.includes(d.id)}
          title={d.note}
          className={`${chip(c.subs.includes(d.id), 'dc')} flex-1`}
          onClick={() => pick(d.id)}
        >
          {d.label}
          <span className="ml-1 hidden text-[10px] font-normal opacity-70 xl:inline">{d.note}</span>
        </button>
      ));
    }
    if (def.id === '1x2') {
      return MATCH_RESULT_CHOICES.map((d) => (
        <button
          key={d.id}
          type="button"
          aria-pressed={c.subs.includes(d.id)}
          title={d.note}
          className={`${chip(c.subs.includes(d.id), '1x2')} flex-1`}
          onClick={() => pick(d.id)}
        >
          {d.label}
          <span className="ml-1 hidden text-[10px] font-normal opacity-70 xl:inline">{d.note}</span>
        </button>
      ));
    }
    if (def.id === 'over' || def.id === 'under') {
      const lines = [...new Set([...goalLines, ...c.subs.map(Number)])].sort((x, y) => x - y);
      return lines.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={c.subs.includes(String(l))}
          className={chip(c.subs.includes(String(l)), def.id)}
          onClick={() => pick(String(l))}
        >
          {def.id === 'over' ? 'Over' : 'Under'} {l}
        </button>
      ));
    }
    if (def.id === 'btts') {
      return BTTS_CHOICES.map((b) => (
        <button
          key={b.id}
          type="button"
          aria-pressed={c.subs.includes(b.id)}
          className={`${chip(c.subs.includes(b.id), 'btts')} flex-1`}
          onClick={() => pick(b.id)}
        >
          {b.label}
        </button>
      ));
    }
    return null;
  }

  return (
    <div id="filters" className="glass relative z-20 mt-4 p-4 scroll-mt-20 transition-all space-y-4">
      {/* Top Header with Collapsible Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-white">
              Unified Filters
            </h2>
            {qualifying !== null && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 align-middle font-mono text-xs font-semibold text-emerald-300">
                {qualifying} qualifying
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Filter by bookmaker, kickoff time period, leagues, and market odds in one unified bar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user && (
            <button
              type="button"
              className="btn-ghost px-3 py-1.5 text-xs text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10"
              onClick={() => setSaveModalOpen(true)}
            >
              💾 Save as Template
            </button>
          )}
          <button
            type="button"
            className="btn-ghost px-3 py-1.5 text-xs"
            onClick={() => {
              onWithinHoursChange?.(null);
              onLeaguesChange?.([]);
              onChange(allAvailableCards(goalLines));
            }}
            title="Reset timeframe, leagues, and market cards"
          >
            ↺ Reset All
          </button>
          <button
            type="button"
            className="btn-ghost px-3 py-1.5 text-xs"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-label={filtersOpen ? 'Hide filters' : 'Show filters'}
          >
            {filtersOpen ? '▲ Hide filters' : '▼ Show filters'}
          </button>
        </div>
      </div>

      {notice && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/15 px-3 py-1.5 text-xs text-cyan-200">
          {notice}
        </div>
      )}

      {/* Unified Row: Bookmaker + Kickoff Time Period + Leagues + Preset Template */}
      <div className="grid gap-3 rounded-xl border border-white/10 bg-navy-950/50 p-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
        {/* 1. Bookmaker Control */}
        <div>
          <span className="block text-xs font-medium text-slate-400 mb-1">Bookmaker</span>
          <div className="flex gap-1.5">
            {(['sportybet', 'betpawa'] as Bookmaker[]).map((b) => (
              <button
                key={b}
                type="button"
                className={`flex-1 py-2 text-xs ${bookmaker === b ? 'btn-emerald' : 'btn-ghost'}`}
                aria-pressed={bookmaker === b}
                onClick={() => onBookmakerChange?.(b)}
              >
                {BOOKMAKER_LABEL[b]}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Time Period (Kickoff) Control */}
        <label className="text-xs font-medium text-slate-400">
          Time Period (Kickoff)
          <select
            className="field mt-1 py-2 text-xs"
            value={withinHours ?? ''}
            onChange={(e) => onWithinHoursChange?.(e.target.value === '' ? null : Number(e.target.value))}
          >
            {WITHIN_OPTIONS.map((w) => (
              <option key={w.label} value={w.hours ?? ''}>
                {w.label}
              </option>
            ))}
          </select>
        </label>

        {/* 3. Leagues Control */}
        <details ref={leaguesRef} className="relative text-xs font-medium text-slate-400">
          <summary className="field mt-5 cursor-pointer list-none py-2 text-xs text-slate-200">
            Leagues{leagues.length ? ` (${leagues.length})` : ' (All)'} ▾
          </summary>
          <div className="glass absolute left-0 top-full z-50 mt-1 max-h-[70vh] w-[min(24rem,90vw)] overflow-auto bg-navy-900 p-2 shadow-xl backdrop-blur-none">
            {!availableLeagues ? (
              <p className="p-2">Loading…</p>
            ) : availableLeagues.length === 0 ? (
              <p className="p-2">No leagues in the data.</p>
            ) : leagueList && onLeaguesChange ? (
              <LeagueChecklist leagues={leagueList} selected={leagues} onChange={onLeaguesChange} compact />
            ) : (
              <>
                <button
                  type="button"
                  className="mb-1 text-emerald-400 underline"
                  onClick={() => onLeaguesChange?.([])}
                >
                  Clear
                </button>
                {availableLeagues.map((l) => (
                  <label key={l} className="flex items-center gap-2 px-1 py-1 text-slate-200">
                    <input
                      type="checkbox"
                      checked={leagues.includes(l)}
                      onChange={() =>
                        onLeaguesChange?.(
                          leagues.includes(l) ? leagues.filter((x) => x !== l) : [...leagues, l],
                        )
                      }
                    />
                    {l}
                  </label>
                ))}
              </>
            )}
          </div>
        </details>

        {/* 4. Preset Template Selector */}
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
            <span>Preset Template</span>
            {selectedTemplateId && !templates.find((t) => t.id === selectedTemplateId)?.isDefault && (
              <button
                type="button"
                onClick={handleDeleteCurrentTemplate}
                className="text-[11px] text-red-400 hover:underline"
              >
                Delete
              </button>
            )}
          </div>
          <select
            className="field py-2 text-xs"
            value={selectedTemplateId}
            onChange={(e) => handleSelectTemplate(e.target.value)}
            aria-label="Preset Template"
          >
            <option value="">Choose a Template…</option>
            <optgroup label="Default Presets">
              {templates.filter((t) => t.isDefault).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
            {templates.some((t) => !t.isDefault) && (
              <optgroup label="My Saved Templates">
                {templates.filter((t) => !t.isDefault).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {/* Collapsible Market Cards Grid */}
      {filtersOpen && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Market Cards & Two-Point Odds Bounds
            </span>
            <button
              type="button"
              onClick={toggleAllCards}
              className="text-xs text-slate-400 hover:text-white"
            >
              Toggle All Market Details
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {CARDS.map((def) => {
              const c = cards[def.id];
              const a = ACCENT[def.id];
              const toggles = subToggles(def);
              const isCardCollapsed = Boolean(collapsedCards[def.id]);

              return (
                <div
                  key={def.id}
                  className={`rounded-xl border p-3.5 transition ${
                    c.on ? `bg-navy-800/60 ${a.edge}` : 'border-white/10 bg-white/[0.02] opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`flex items-center gap-2 text-sm font-bold ${a.title}`}>
                        <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${a.dot}`} />
                        {def.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{def.hint}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        aria-pressed={isSolo(cards, def.id)}
                        title={`Solo: switch on only ${def.title}`}
                        className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold transition ${
                          isSolo(cards, def.id) ? a.chipOn : 'border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                        onClick={() => onChange(soloCard(cards, def.id))}
                      >
                        Solo
                      </button>
                      <button
                        type="button"
                        aria-label={`Reset ${def.title}`}
                        title="Reset this card's range and submarkets"
                        className="rounded-md px-1.5 py-0.5 text-sm leading-none text-slate-400 transition hover:bg-white/10 hover:text-white"
                        onClick={() => onChange(resetCard(cards, def.id))}
                      >
                        ↺
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={c.on}
                        aria-label={`${def.title} on or off`}
                        className={`relative h-5 w-9 rounded-full transition ${c.on ? 'bg-emerald-500' : 'bg-white/15'}`}
                        onClick={() => set(def.id, { on: !c.on })}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                            c.on ? 'left-[1.125rem]' : 'left-0.5'
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCardCollapse(def.id)}
                        className="rounded p-1 text-slate-400 hover:text-white"
                        title={isCardCollapsed ? 'Expand subcomponents' : 'Collapse subcomponents'}
                      >
                        {isCardCollapsed ? '▼' : '▲'}
                      </button>
                    </div>
                  </div>

                  {/* Submarket & Text-Only Range Controls */}
                  {!isCardCollapsed && (
                    <>
                      {toggles && <div className="mt-3 flex flex-wrap gap-1.5">{toggles}</div>}

                      {c.on ? (
                        <OddsRange
                          def={def}
                          low={c.low}
                          high={c.high}
                          onCommit={(low, high) => set(def.id, { low, high })}
                        />
                      ) : (
                        <p className="mt-3 text-[11px] text-slate-500">
                          Switched off. Turn it on to include these picks.
                        </p>
                      )}
                      {c.on && toggles && c.subs.length === 0 && (
                        <p className="mt-2 text-[11px] text-amber-300">Pick at least one submarket above.</p>
                      )}
                    </>
                  )}

                  {isCardCollapsed && c.on && (
                    <p className="mt-2 text-[11px] text-slate-400">
                      Range: @{c.low.toFixed(2)} - @{c.high.toFixed(2)} · {c.subs.length} submarkets active
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!anyOn && (
        <p
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200"
          role="status"
        >
          Every market is switched off, so no games are shown. Turn at least one card on.
        </p>
      )}

      {/* Save Template Modal */}
      {saveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSaveModalOpen(false)}
        >
          <div
            className="glass w-full max-w-md bg-navy-900/95 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display text-base font-bold text-white">Save Current Filters as Template</h3>
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div>
              <label className="text-xs text-slate-300">Template Name</label>
              <input
                className="field mt-1"
                placeholder="e.g. Weekend Home Dominance, Safe GG Accumulator"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-slate-300">Description (Optional)</label>
              <textarea
                className="field mt-1 h-20 text-xs"
                placeholder="Short note on what this strategy targets..."
                value={newTemplateDesc}
                onChange={(e) => setNewTemplateDesc(e.target.value)}
              />
            </div>
            <div className="rounded-lg border border-white/10 bg-navy-950/60 p-3 text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-slate-200">Included in this template:</p>
              <p>
                • <span className="text-slate-400">Bookmaker:</span> {BOOKMAKER_LABEL[bookmaker]}
              </p>
              <p>
                • <span className="text-slate-400">Timeframe:</span>{' '}
                {withinHours ? `Next ${withinHours} hours` : 'Any time (next 7 days)'}
              </p>
              <p>
                • <span className="text-slate-400">Selected Leagues:</span>{' '}
                {leagues.length > 0 ? `${leagues.length} selected (${leagues.slice(0, 3).join(', ')}${leagues.length > 3 ? '…' : ''})` : 'All leagues'}
              </p>
              <p>
                • <span className="text-slate-400">Market Filters:</span>{' '}
                {Object.values(cards).filter((c) => c.on).length} active market card(s)
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setSaveModalOpen(false)} className="btn-ghost text-xs">
                Cancel
              </button>
              <button
                type="button"
                disabled={!newTemplateName.trim()}
                onClick={() => void handleSaveNewTemplate()}
                className="btn-gold text-xs"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

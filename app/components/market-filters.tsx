'use client';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  BTTS_CHOICES, CARDS, DC_CHOICES, MATCH_RESULT_CHOICES, allAvailableCards, isSolo, resetCard, soloCard, toggleSub,
  type CardDef, type CardId, type CardsState,
} from '@/lib/market-cards.ts';
import {
  DEFAULT_TEMPLATES,
  deleteLocalTemplate,
  getLocalTemplates,
  notifyTemplateApplied,
  onTemplateApplied,
  saveLocalTemplate,
  type FilterTemplate,
} from '@/lib/template-store.ts';

/** Full class names on purpose: Tailwind only generates classes it can read literally in these files. */
const ACCENT: Record<CardId, { dot: string; title: string; edge: string; chipOn: string; fill: string; handle: string }> = {
  dc:    { dot: 'bg-emerald-400', title: 'text-emerald-300', edge: 'border-emerald-400/40', chipOn: 'border-emerald-400 bg-emerald-400 text-navy-950', fill: 'bg-emerald-400/45', handle: 'border-emerald-400' },
  '1x2': { dot: 'bg-purple-400', title: 'text-purple-300', edge: 'border-purple-400/40', chipOn: 'border-purple-400 bg-purple-400 text-navy-950', fill: 'bg-purple-400/45', handle: 'border-purple-400' },
  over:  { dot: 'bg-sky-400',     title: 'text-sky-300',     edge: 'border-sky-400/40',     chipOn: 'border-sky-400 bg-sky-400 text-navy-950',         fill: 'bg-sky-400/45',     handle: 'border-sky-400' },
  under: { dot: 'bg-rose-400',    title: 'text-rose-300',    edge: 'border-rose-400/40',    chipOn: 'border-rose-400 bg-rose-400 text-navy-950',       fill: 'bg-rose-400/45',    handle: 'border-rose-400' },
  btts:  { dot: 'bg-orange-400',  title: 'text-orange-300',  edge: 'border-orange-400/40',  chipOn: 'border-orange-400 bg-orange-400 text-navy-950',   fill: 'bg-orange-400/45',  handle: 'border-orange-400' },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const round2 = (n: number) => Math.round(n * 100) / 100;

function OddsRange({ def, low, high, accent, onCommit }: {
  def: CardDef; low: number; high: number; accent: CardId; onCommit: (low: number, high: number) => void;
}) {
  const { min, max, step } = def;
  const track = useRef<HTMLDivElement>(null);
  const active = useRef<'low' | 'high' | null>(null);
  const latest = useRef({ low, high });
  const [drag, setDrag] = useState<{ low: number; high: number } | null>(null);
  const live = drag ?? { low, high };
  const a = ACCENT[accent];

  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const snap = (v: number) => round2(clamp(min + Math.round((v - min) / step) * step, min, max));
  const valueAt = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r || r.width <= 0) return min;
    return snap(min + clamp((clientX - r.left) / r.width, 0, 1) * (max - min));
  };
  const place = (which: 'low' | 'high', v: number) => {
    const cur = latest.current;
    return which === 'low' ? { low: Math.min(v, round2(cur.high - step)), high: cur.high } : { low: cur.low, high: Math.max(v, round2(cur.low + step)) };
  };

  function down(which: 'low' | 'high') {
    return (e: PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      active.current = which;
      latest.current = { low, high };
      setDrag({ low, high });
    };
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    if (!active.current) return;
    latest.current = place(active.current, valueAt(e.clientX));
    setDrag(latest.current);
  }
  function up() {
    if (!active.current) return;
    active.current = null;
    setDrag(null);
    onCommit(latest.current.low, latest.current.high);
  }
  function trackDown(e: PointerEvent<HTMLDivElement>) {
    const v = valueAt(e.clientX);
    latest.current = { low, high };
    const which = Math.abs(v - low) <= Math.abs(v - high) ? 'low' : 'high';
    onCommit(place(which, v).low, place(which, v).high);
  }
  function keys(which: 'low' | 'high') {
    return (e: KeyboardEvent<HTMLButtonElement>) => {
      const big = step * 10;
      const delta = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step, PageDown: -big, PageUp: big }[e.key];
      const target = e.key === 'Home' ? min : e.key === 'End' ? max : delta !== undefined ? live[which] + delta : undefined;
      if (target === undefined) return;
      e.preventDefault();
      latest.current = { low, high };
      const next = place(which, snap(target));
      onCommit(next.low, next.high);
    };
  }

  const openTop = live.high >= max;
  const handle = (which: 'low' | 'high', label: string) => (
    <button
      type="button" role="slider" aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={live[which]}
      aria-valuetext={which === 'high' && openTop ? `${max.toFixed(2)} or more` : live[which].toFixed(2)}
      onPointerDown={down(which)} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={keys(which)}
      className={`absolute top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 bg-navy-900 shadow-lg transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:cursor-grabbing ${a.handle}`}
      style={{ left: `${pct(live[which])}%` }}
    />
  );

  return (
    <div className="mt-3">
      <div ref={track} onPointerDown={trackDown} className="relative flex h-6 cursor-pointer touch-none select-none items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/10" />
        <div className={`absolute h-1.5 rounded-full ${a.fill}`} style={{ left: `${pct(live.low)}%`, width: `${pct(live.high) - pct(live.low)}%` }} />
        {handle('low', `${def.title} minimum odds`)}
        {handle('high', `${def.title} maximum odds`)}
      </div>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="odds rounded-md bg-white/5 px-1.5 py-0.5">{live.low.toFixed(2)}</span>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">odds range</span>
        <span className="odds rounded-md bg-white/5 px-1.5 py-0.5">{live.high.toFixed(2)}{openTop ? '+' : ''}</span>
      </div>
    </div>
  );
}

const chip = (on: boolean, accent: CardId) =>
  `rounded-lg border px-2 py-1 text-xs font-semibold transition ${on ? ACCENT[accent].chipOn : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/10 hover:text-slate-100'}`;

export function MarketFilters({ cards, onChange, goalLines, qualifying }: {
  cards: CardsState; onChange: (next: CardsState) => void; goalLines: number[]; qualifying: number | null;
}) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  const [templates, setTemplates] = useState<FilterTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setTemplates(getLocalTemplates());
    return onTemplateApplied((tpl) => {
      setSelectedTemplateId(tpl.id);
      onChange(tpl.cards);
      setNotice(`Applied template: "${tpl.name}"`);
      setTimeout(() => setNotice(null), 3000);
    });
  }, [onChange]);

  const set = (id: CardId, patch: Partial<CardsState[CardId]>) => onChange({ ...cards, [id]: { ...cards[id], ...patch } });
  const anyOn = Object.values(cards).some((c) => c.on);

  const toggleCardCollapse = (id: string) => {
    setCollapsedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllCards = () => {
    const allCollapsed = CARDS.every((d) => collapsedCards[d.id]);
    const next: Record<string, boolean> = {};
    CARDS.forEach((d) => { next[d.id] = !allCollapsed; });
    setCollapsedCards(next);
  };

  function handleSelectTemplate(id: string) {
    setSelectedTemplateId(id);
    if (!id) return;
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
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
      bookmaker: 'sportybet',
      withinHours: null,
      leagues: [],
      cards,
    });

    // Also sync to server
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
        <button key={d.id} type="button" aria-pressed={c.subs.includes(d.id)} title={d.note} className={`${chip(c.subs.includes(d.id), 'dc')} flex-1`} onClick={() => pick(d.id)}>
          {d.label}<span className="ml-1 hidden text-[10px] font-normal opacity-70 xl:inline">{d.note}</span>
        </button>
      ));
    }
    if (def.id === '1x2') {
      return MATCH_RESULT_CHOICES.map((d) => (
        <button key={d.id} type="button" aria-pressed={c.subs.includes(d.id)} title={d.note} className={`${chip(c.subs.includes(d.id), '1x2')} flex-1`} onClick={() => pick(d.id)}>
          {d.label}<span className="ml-1 hidden text-[10px] font-normal opacity-70 xl:inline">{d.note}</span>
        </button>
      ));
    }
    if (def.id === 'over' || def.id === 'under') {
      const lines = [...new Set([...goalLines, ...c.subs.map(Number)])].sort((x, y) => x - y);
      return lines.map((l) => (
        <button key={l} type="button" aria-pressed={c.subs.includes(String(l))} className={chip(c.subs.includes(String(l)), def.id)} onClick={() => pick(String(l))}>
          {def.id === 'over' ? 'Over' : 'Under'} {l}
        </button>
      ));
    }
    if (def.id === 'btts') {
      return BTTS_CHOICES.map((b) => (
        <button key={b.id} type="button" aria-pressed={c.subs.includes(b.id)} className={`${chip(c.subs.includes(b.id), 'btts')} flex-1`} onClick={() => pick(b.id)}>{b.label}</button>
      ));
    }
    return null;
  }

  return (
    <div className="glass mt-4 p-4 transition-all">
      {/* Top Header with Collapsible Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-white">
              Market Filters & Templates
            </h2>
            {qualifying !== null && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 align-middle font-mono text-xs font-semibold text-emerald-300">
                {qualifying} qualifying
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Customize market cards or load saved filter templates for fast slip curation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost px-3 py-1.5 text-xs text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10"
            onClick={() => setSaveModalOpen(true)}
          >
            💾 Save as Template
          </button>
          <button
            type="button"
            className="btn-ghost px-3 py-1.5 text-xs"
            onClick={() => onChange(allAvailableCards(goalLines))}
            title="Turn every market on with all submarkets selected and full odds ranges"
          >
            ↺ Reset All
          </button>
          <button
            type="button"
            className="btn-ghost px-3 py-1.5 text-xs"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
          >
            {filtersOpen ? '▲ Collapse Section' : '▼ Expand Section'}
          </button>
        </div>
      </div>

      {notice && (
        <div className="mt-3 rounded-lg border border-cyan-500/30 bg-cyan-500/15 px-3 py-1.5 text-xs text-cyan-200">
          {notice}
        </div>
      )}

      {/* Filter Templates Quick Bar */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-navy-950/40 p-2.5">
        <span className="text-xs font-semibold text-slate-300">Preset Template:</span>
        <select
          className="field h-8 max-w-xs text-xs py-1"
          value={selectedTemplateId}
          onChange={(e) => handleSelectTemplate(e.target.value)}
        >
          <option value="">Choose a Template…</option>
          <optgroup label="Default Presets">
            {templates.filter((t) => t.isDefault).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </optgroup>
          {templates.some((t) => !t.isDefault) && (
            <optgroup label="My Saved Templates">
              {templates.filter((t) => !t.isDefault).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </optgroup>
          )}
        </select>

        {selectedTemplateId && !templates.find((t) => t.id === selectedTemplateId)?.isDefault && (
          <button
            type="button"
            onClick={handleDeleteCurrentTemplate}
            className="text-xs text-red-400 hover:underline px-1"
          >
            Delete Template
          </button>
        )}

        <button
          type="button"
          onClick={toggleAllCards}
          className="ml-auto text-xs text-slate-400 hover:text-white"
        >
          Toggle All Market Details
        </button>
      </div>

      {/* Collapsible Market Cards Grid */}
      {filtersOpen && (
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${c.on ? 'left-[1.125rem]' : 'left-0.5'}`} />
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

                {/* Submarket & Range Controls (Collapsible Subcomponent) */}
                {!isCardCollapsed && (
                  <>
                    {toggles && <div className="mt-3 flex flex-wrap gap-1.5">{toggles}</div>}

                    {c.on ? (
                      <OddsRange
                        def={def}
                        low={c.low}
                        high={c.high}
                        accent={def.id}
                        onCommit={(low, high) => set(def.id, { low, high })}
                      />
                    ) : (
                      <p className="mt-3 text-[11px] text-slate-500">Switched off. Turn it on to include these picks.</p>
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
      )}

      {!anyOn && (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200" role="status">
          Every market is switched off, so no games are shown. Turn at least one card on.
        </p>
      )}

      {/* Save Template Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setSaveModalOpen(false)}>
          <div className="glass w-full max-w-md bg-navy-900/95 p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display text-base font-bold text-white">Save Current Filters as Template</h3>
              <button type="button" onClick={() => setSaveModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
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

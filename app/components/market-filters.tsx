'use client';
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  BTTS_CHOICES, CARDS, DC_CHOICES, isSolo, resetCard, soloCard, toggleSub, clearedCards,
  type CardDef, type CardId, type CardsState,
} from '@/lib/market-cards.ts';

/** Full class names on purpose: Tailwind only generates classes it can read literally in these files. */
const ACCENT: Record<CardId, { dot: string; title: string; edge: string; chipOn: string; fill: string; handle: string }> = {
  dc:    { dot: 'bg-emerald-400', title: 'text-emerald-300', edge: 'border-emerald-400/40', chipOn: 'border-emerald-400 bg-emerald-400 text-navy-950', fill: 'bg-emerald-400/45', handle: 'border-emerald-400' },
  home:  { dot: 'bg-cyan-400',    title: 'text-cyan-300',    edge: 'border-cyan-400/40',    chipOn: 'border-cyan-400 bg-cyan-400 text-navy-950',       fill: 'bg-cyan-400/45',    handle: 'border-cyan-400' },
  draw:  { dot: 'bg-gold-400',    title: 'text-gold-300',    edge: 'border-gold-400/40',    chipOn: 'border-gold-400 bg-gold-400 text-navy-950',       fill: 'bg-gold-400/45',    handle: 'border-gold-400' },
  away:  { dot: 'bg-violet-400',  title: 'text-violet-300',  edge: 'border-violet-400/40',  chipOn: 'border-violet-400 bg-violet-400 text-navy-950',   fill: 'bg-violet-400/45',  handle: 'border-violet-400' },
  over:  { dot: 'bg-sky-400',     title: 'text-sky-300',     edge: 'border-sky-400/40',     chipOn: 'border-sky-400 bg-sky-400 text-navy-950',         fill: 'bg-sky-400/45',     handle: 'border-sky-400' },
  under: { dot: 'bg-rose-400',    title: 'text-rose-300',    edge: 'border-rose-400/40',    chipOn: 'border-rose-400 bg-rose-400 text-navy-950',       fill: 'bg-rose-400/45',    handle: 'border-rose-400' },
  btts:  { dot: 'bg-orange-400',  title: 'text-orange-300',  edge: 'border-orange-400/40',  chipOn: 'border-orange-400 bg-orange-400 text-navy-950',   fill: 'bg-orange-400/45',  handle: 'border-orange-400' },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Two-handle odds range. While a handle is dragged only this component re-renders; the new range is
 * handed to the parent on release (or on each key press), so the games list is not refetched mid-drag.
 */
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
  const set = (id: CardId, patch: Partial<CardsState[CardId]>) => onChange({ ...cards, [id]: { ...cards[id], ...patch } });
  const anyOn = Object.values(cards).some((c) => c.on);

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
    <div className="glass mt-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-white">
            Market filters
            {qualifying !== null && <span className="ml-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 align-middle font-mono text-xs font-semibold text-emerald-300">{qualifying} qualifying</span>}
          </h2>
          <p className="text-xs text-slate-400">Switch a market on, choose its submarkets, then set the odds range it must fall in.</p>
        </div>
        <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => onChange(clearedCards())} title="Switch every market off and open every odds range">↺ Reset all</button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((def) => {
          const c = cards[def.id];
          const a = ACCENT[def.id];
          const toggles = subToggles(def);
          return (
            <div key={def.id} className={`rounded-xl border p-3.5 transition ${c.on ? `bg-navy-800/60 ${a.edge}` : 'border-white/10 bg-white/[0.02] opacity-60'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`flex items-center gap-2 text-sm font-bold ${a.title}`}><span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${a.dot}`} />{def.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{def.hint}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button type="button" aria-pressed={isSolo(cards, def.id)} title={`Solo: switch on only ${def.title}`}
                    className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold transition ${isSolo(cards, def.id) ? a.chipOn : 'border-white/10 text-slate-300 hover:bg-white/10'}`}
                    onClick={() => onChange(soloCard(cards, def.id))}>Solo</button>
                  <button type="button" aria-label={`Reset ${def.title}`} title="Reset this card's range and submarkets"
                    className="rounded-md px-1.5 py-0.5 text-sm leading-none text-slate-400 transition hover:bg-white/10 hover:text-white"
                    onClick={() => onChange(resetCard(cards, def.id))}>↺</button>
                  <button type="button" role="switch" aria-checked={c.on} aria-label={`${def.title} on or off`}
                    className={`relative h-5 w-9 rounded-full transition ${c.on ? 'bg-emerald-500' : 'bg-white/15'}`}
                    onClick={() => set(def.id, { on: !c.on })}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${c.on ? 'left-[1.125rem]' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              {toggles && <div className="mt-3 flex flex-wrap gap-1.5">{toggles}</div>}

              {c.on
                ? <OddsRange def={def} low={c.low} high={c.high} accent={def.id} onCommit={(low, high) => set(def.id, { low, high })} />
                : <p className="mt-3 text-[11px] text-slate-500">Switched off. Turn it on to include these picks.</p>}
              {c.on && toggles && c.subs.length === 0 && <p className="mt-2 text-[11px] text-amber-300">Pick at least one submarket above.</p>}
            </div>
          );
        })}
      </div>

      {!anyOn && <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200" role="status">Every market is switched off, so no games are shown. Turn at least one card on.</p>}
    </div>
  );
}

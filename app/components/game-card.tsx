'use client';
import type { PickRow } from '@/lib/filters.ts';
import { BOOKMAKER_LABEL } from '@/lib/types.ts';

/**
 * One game card: header chips, two team rows (Stats + add buttons), kickoff, divider,
 * then every eligible pick as a colour-coded chip. Sizes: card p-3.5 / rounded-xl,
 * team name 14px, mono meta 11px, chips 24px high with 8px gaps.
 */

const fmtKickoff = (ms: number) => {
  const d = new Date(ms);
  const day = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${day} at ${time}`;
};

const timeUntil = (ms: number) => {
  const mins = Math.round((ms - Date.now()) / 60_000);
  if (mins <= 0) return 'live';
  if (mins < 60) return `in ${mins}m`;
  const h = Math.floor(mins / 60);
  return h < 48 ? `in ${h}h` : `in ${Math.floor(h / 24)}d`;
};

/** Short chip label: 1 / X / 2, GG / NG, otherwise the bookmaker's own description. */
function chipLabel(r: PickRow): string {
  switch (r.outcomeKey) {
    case 'home': return r.marketKind === '1x2' ? '1' : r.pick;
    case 'draw': return r.marketKind === '1x2' ? 'X' : r.pick;
    case 'away': return r.marketKind === '1x2' ? '2' : r.pick;
    case 'yes': return 'GG';
    case 'no': return 'NG';
    default: return r.pick;
  }
}

/** Chip colour per market type. Edit this one map to retheme. */
function chipTone(r: PickRow): string {
  if (r.marketKind === 'double_chance') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20';
  if (r.marketKind === '1x2') return 'border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20';
  if (r.marketKind === 'btts') return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20';
  if (/^under/i.test(r.pick)) return 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20';
  return 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20';
}

const Pill = ({ children, tone }: { children: React.ReactNode; tone: string }) => (
  <span className={`inline-flex h-5 items-center rounded px-1.5 text-[10px] font-semibold ${tone}`}>{children}</span>
);

export function GameCard({ rows, onAdd, onStats, algo = false }: {
  rows: PickRow[];
  onAdd: (row: PickRow) => void;
  onStats?: (row: PickRow) => void;
  /** Show the gold "Algo Pick" chip (pass true for games the AI engine picked). */
  algo?: boolean;
}) {
  const g = rows[0];
  const addDefault = () => onAdd(rows[0]);
  return (
    <div className="rounded-xl border border-indigo-400/20 bg-gradient-to-b from-navy-800/70 to-navy-900/80 p-3.5">
      {/* Header: league + chips + countdown */}
      <div className="flex items-center gap-1.5">
        <span aria-hidden className="text-sm leading-none text-gold-400">🏆</span>
        <span className="min-w-0 max-w-[4rem] shrink truncate text-[11px] font-medium text-slate-300" title={g.league ?? ''}>{g.league ?? '—'}</span>
        {algo && <Pill tone="border border-gold-500/50 bg-gold-400/15 text-gold-300">✦ Algo Pick</Pill>}
        <Pill tone="bg-white/10 text-slate-200">{BOOKMAKER_LABEL[g.bookmaker]}</Pill>
        <span className="ml-auto whitespace-nowrap font-mono text-[11px] text-slate-400">⏱ {timeUntil(g.kickoff)}</span>
      </div>

      {/* Teams + actions */}
      <div className="mt-4 flex items-center gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="flex items-baseline gap-1.5 text-sm font-semibold leading-tight text-white">
            <span className="truncate">{g.home}</span>
            <span className="shrink-0 font-mono text-[11px] font-normal text-slate-400">1 (Home)</span>
          </p>
          <p className="flex items-baseline gap-1.5 text-sm font-semibold leading-tight text-white">
            <span className="truncate">{g.away}</span>
            <span className="shrink-0 font-mono text-[11px] font-normal text-slate-400">2 (Away)</span>
          </p>
        </div>
        <button type="button" onClick={() => onStats?.(g)} disabled={!onStats}
          className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:opacity-40">
          ∿ Stats
        </button>
        <button type="button" onClick={addDefault} aria-label={`Add ${g.home} v ${g.away}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-lg text-slate-200 transition hover:bg-white/10">
          +
        </button>
      </div>

      <p className="mt-2 font-mono text-[11px] text-slate-400">Kickoff: {fmtKickoff(g.kickoff)}</p>

      {/* Eligible picks */}
      <div className="mt-3 border-t border-white/10 pt-3">
        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span aria-hidden className="text-emerald-400">✔</span>Eligible Market Picks ({rows.length}):
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {rows.map((r) => (
            <button key={`${r.marketNativeId}|${r.outcomeNativeId}|${r.specifier}`} type="button" onClick={() => onAdd(r)}
              aria-label={`Add ${r.pick} at ${r.odds.toFixed(2)}`}
              className={`inline-flex h-6 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition ${chipTone(r)}`}>
              {chipLabel(r)}
              <span className="font-mono text-[10px] opacity-70">@{r.odds.toFixed(2)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

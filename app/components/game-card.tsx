'use client';
import { useState } from 'react';
import {
  formatGameCardMarket,
  isAllowedOverUnderLine,
  tokenizeMarketText,
  type PickRow,
} from '@/lib/filters.ts';
import { BOOKMAKER_LABEL } from '@/lib/types.ts';

/**
 * One game card: header chips, two team rows, kickoff, divider,
 * eligible picks, and an expandable inline panel for "Other markets" / "Show all markets".
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

/** Short chip label: 1 / x / 2, 1 or x / 1 or 2 / x or 2, Over/Under 0.5–5.5, GG / NG. */
export function chipLabel(r: PickRow): string {
  return formatGameCardMarket(r);
}

/** Strictly allow only 0.5, 1.5, 2.5, 3.5, 4.5, 5.5 for over/under rows. */
function isValidCardRow(r: PickRow): boolean {
  if (r.marketKind === 'over_under') {
    return isAllowedOverUnderLine(r.line);
  }
  return true;
}

/** Renders market label with smaller font for alphabet text and larger font for numbers. */
function MarketLabel({ row }: { row: PickRow }) {
  const tokens = tokenizeMarketText(chipLabel(row));
  return (
    <span className="inline-flex items-baseline whitespace-pre">
      {tokens.map((t, i) =>
        t.kind === 'number' ? (
          <span key={i} className="font-mono text-sm font-bold leading-none">
            {t.value}
          </span>
        ) : (
          <span key={i} className="text-[10px] font-medium leading-none opacity-90">
            {t.value}
          </span>
        ),
      )}
    </span>
  );
}

/** Renders odds with smaller @ prefix and larger font for the numeric price. */
function OddsLabel({ odds }: { odds: number }) {
  return (
    <span className="inline-flex items-baseline font-mono leading-none">
      <span className="text-[10px] opacity-75">@</span>
      <span className="text-sm font-bold">{odds.toFixed(2)}</span>
    </span>
  );
}

/** Chip colour per market type. */
function chipTone(r: PickRow): string {
  if (r.marketKind === 'double_chance') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20';
  if (r.marketKind === '1x2') return 'border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20';
  if (r.marketKind === 'btts') return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20';
  if (/^under/i.test(r.pick)) return 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20';
  return 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20';
}

const Pill = ({ children, tone }: { children: React.ReactNode; tone: string }) => (
  <span className={`inline-flex h-5 items-center rounded px-1.5 text-[10px] font-semibold ${tone}`}>{children}</span>
);

export function GameCard({ rows, onAdd, algo = false }: {
  rows: PickRow[];
  onAdd: (row: PickRow) => void;
  /** Show the gold "Algo Pick" chip (pass true for games the AI engine picked). */
  algo?: boolean;
}) {
  const [picksOpen, setPicksOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherRows, setOtherRows] = useState<PickRow[] | null>(null);
  const [loadingOther, setLoadingOther] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const visibleRows = rows.filter(isValidCardRow);
  const g = visibleRows[0] ?? rows[0];
  const addDefault = () => onAdd(g);

  const toggleOtherMarkets = async () => {
    if (otherOpen) {
      setOtherOpen(false);
      return;
    }
    setOtherOpen(true);
    if (otherRows !== null) return;

    setLoadingOther(true);
    setFetchError(null);
    try {
      const q = new URLSearchParams({
        bookmaker: g.bookmaker,
        gameId: g.gameId,
        allMarkets: '1',
      });
      const res = await fetch(`/api/games?${q}`);
      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.rows)) {
        setOtherRows(data.rows);
      } else {
        setFetchError(data.error || `Failed to fetch other markets (HTTP ${res.status})`);
      }
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingOther(false);
    }
  };

  // Set of keys for currently displayed filtered rows
  const existingKeys = new Set(
    visibleRows.map((r) => `${r.marketNativeId}|${r.outcomeNativeId}|${r.specifier}`)
  );
  // Additional rows that are not in the main filtered list (strictly 0.5-5.5 for over/under)
  const extraRows = otherRows
    ? otherRows.filter(
        (r) =>
          isValidCardRow(r) &&
          !existingKeys.has(`${r.marketNativeId}|${r.outcomeNativeId}|${r.specifier}`),
      )
    : [];

  return (
    <div className="rounded-xl border border-indigo-400/20 bg-gradient-to-b from-navy-800/70 to-navy-900/80 p-3.5 transition-all">
      {/* Header: league + chips + countdown */}
      <div className="flex items-center gap-1.5">
        <span aria-hidden className="text-sm leading-none text-gold-400">🏆</span>
        <span className="min-w-0 max-w-[8rem] shrink truncate text-[11px] font-medium text-slate-300" title={g.league ?? ''}>{g.league ?? '—'}</span>
        {algo && <Pill tone="border border-gold-500/50 bg-gold-400/15 text-gold-300">✦ Algo Pick</Pill>}
        <Pill tone="bg-white/10 text-slate-200">{BOOKMAKER_LABEL[g.bookmaker]}</Pill>
        <span className="ml-auto whitespace-nowrap font-mono text-[11px] text-slate-400">⏱ {timeUntil(g.kickoff)}</span>
      </div>

      {/* Teams + actions */}
      <div className="mt-4 flex items-center gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="flex items-baseline gap-1.5 text-sm font-semibold leading-tight text-white">
            <span className="truncate">{g.home}</span>
            <span className="shrink-0 font-mono text-slate-400">
              <span className="text-sm font-bold text-slate-200">1</span>{' '}
              <span className="text-[10px] font-normal">(Home)</span>
            </span>
          </p>
          <p className="flex items-baseline gap-1.5 text-sm font-semibold leading-tight text-white">
            <span className="truncate">{g.away}</span>
            <span className="shrink-0 font-mono text-slate-400">
              <span className="text-sm font-bold text-slate-200">2</span>{' '}
              <span className="text-[10px] font-normal">(Away)</span>
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={toggleOtherMarkets}
          className={`flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition ${
            otherOpen
              ? 'border-cyan-400 bg-cyan-400/20 text-cyan-200'
              : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
          title="Show all available markets for this game, ignoring active filters"
        >
          {otherOpen ? '▲ Hide other markets' : '▼ Other markets'}
        </button>
        <button type="button" onClick={addDefault} aria-label={`Add default pick for ${g.home} v ${g.away}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-lg text-slate-200 transition hover:bg-white/10">
          +
        </button>
      </div>

      <p className="mt-2 font-mono text-[11px] text-slate-400">Kickoff: {fmtKickoff(g.kickoff)}</p>

      {/* Eligible picks based on current filters */}
      <div className="mt-3 border-t border-white/10 pt-2.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <p className="flex items-center gap-1.5">
            <span aria-hidden className="text-emerald-400">✔</span>
            Eligible Filtered Picks (<span className="font-mono text-xs font-bold text-slate-200">{visibleRows.length}</span>):
          </p>
          <button
            type="button"
            onClick={() => setPicksOpen((o) => !o)}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
            aria-expanded={picksOpen}
          >
            {picksOpen ? '▲ Collapse' : `▼ Show (${visibleRows.length})`}
          </button>
        </div>

        {picksOpen ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleRows.map((r) => (
              <button key={`${r.marketNativeId}|${r.outcomeNativeId}|${r.specifier}`} type="button" onClick={() => onAdd(r)}
                aria-label={`Add ${chipLabel(r)} at ${r.odds.toFixed(2)}`}
                className={`inline-flex h-7 items-baseline gap-1.5 rounded-md border px-2.5 py-1 transition ${chipTone(r)}`}>
                <MarketLabel row={r} />
                <OddsLabel odds={r.odds} />
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-1.5 flex flex-wrap items-baseline gap-2 text-slate-400">
            <span className="text-[10px]">Sample:</span>
            {visibleRows.slice(0, 2).map((r) => (
              <span
                key={`sample-${r.marketNativeId}|${r.outcomeNativeId}|${r.specifier}`}
                className="inline-flex items-baseline gap-1 text-slate-300"
              >
                <MarketLabel row={r} />
                <OddsLabel odds={r.odds} />
              </span>
            ))}
            {visibleRows.length > 2 && (
              <span className="text-[10px] text-slate-500">
                +<span className="font-mono text-xs font-bold">{visibleRows.length - 2}</span> more hidden
              </span>
            )}
          </div>
        )}
      </div>

      {/* Inline panel for "Other markets" ignoring global filters */}
      {otherOpen && (
        <div className="mt-3 rounded-lg border border-cyan-500/30 bg-navy-950/60 p-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-cyan-300">
              All Markets for {g.home} vs {g.away}
            </span>
            <span className="text-[10px] text-slate-400">
              (Ignores global filters)
            </span>
          </div>

          {loadingOther && (
            <p className="text-xs text-slate-400 py-2">Loading all available markets for this game…</p>
          )}

          {fetchError && (
            <p className="text-xs text-red-300 py-1">{fetchError}</p>
          )}

          {!loadingOther && otherRows && (
            <div className="space-y-2">
              {extraRows.length === 0 ? (
                <p className="text-xs text-slate-400">
                  All available markets for this game are already shown in the eligible picks list above.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {extraRows.map((r) => (
                    <button
                      key={`other-${r.marketNativeId}|${r.outcomeNativeId}|${r.specifier}`}
                      type="button"
                      onClick={() => onAdd(r)}
                      aria-label={`Add ${chipLabel(r)} at ${r.odds.toFixed(2)}`}
                      className={`inline-flex h-7 items-baseline gap-1.5 rounded-md border px-2.5 py-1 transition ${chipTone(r)}`}
                      title={`${r.marketKind.toUpperCase()}: ${chipLabel(r)} @ ${r.odds.toFixed(2)}`}
                    >
                      <MarketLabel row={r} />
                      <OddsLabel odds={r.odds} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

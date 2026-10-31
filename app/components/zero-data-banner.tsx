'use client';

import { useState } from 'react';
import { BOOKMAKER_LABEL, type Bookmaker } from '@/lib/types.ts';

type ZeroDataBannerProps = {
  bookmaker: Bookmaker;
  leaguesCount: number;
  withinHours: number | null;
  activeCardsCount: number;
  onResetFilters: () => void;
  onSwitchBookmaker: (b: Bookmaker) => void;
  onRefreshCompleted?: () => void;
};

export function ZeroDataBanner({
  bookmaker,
  leaguesCount,
  withinHours,
  activeCardsCount,
  onResetFilters,
  onSwitchBookmaker,
  onRefreshCompleted,
}: ZeroDataBannerProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const alternateBookmaker: Bookmaker = bookmaker === 'sportybet' ? 'betpawa' : 'sportybet';

  async function handleTriggerRefresh() {
    setRefreshing(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/refresh', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setFeedback(`✓ Feed updated successfully (${data.results?.sportybet?.count ?? 0} SportyBet, ${data.results?.betpawa?.count ?? 0} betPawa games).`);
        onRefreshCompleted?.();
      } else {
        setFeedback(`Refresh returned status ${res.status}: ${data?.error ?? 'Upstream bookmaker endpoint reached'}. Try widening filters.`);
        onRefreshCompleted?.();
      }
    } catch (e) {
      setFeedback(`Refresh trigger: ${e instanceof Error ? e.message : 'Network request completed'}`);
      onRefreshCompleted?.();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-200">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">
          ℹ️
        </span>
        <div className="flex-1">
          <h3 className="font-display text-base font-bold text-white">
            No fixtures matched your current criteria
          </h3>
          <p className="mt-1 text-xs text-amber-200/90 leading-relaxed">
            The database currently has no games matching the active filters for{' '}
            <strong className="text-white">{BOOKMAKER_LABEL[bookmaker]}</strong>.
            This happens when kickoff filters are too narrow, the selected leagues have no upcoming games,
            or the upstream bookmaker feed has not run today.
          </p>

          {/* Diagnostic status tags */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded border border-amber-500/30 bg-navy-950/60 px-2 py-0.5 text-slate-300">
              Bookmaker: <strong className="text-white">{BOOKMAKER_LABEL[bookmaker]}</strong>
            </span>
            <span className="rounded border border-amber-500/30 bg-navy-950/60 px-2 py-0.5 text-slate-300">
              Time window: <strong className="text-white">{withinHours ? `Next ${withinHours}h` : 'Any time (7 days)'}</strong>
            </span>
            <span className="rounded border border-amber-500/30 bg-navy-950/60 px-2 py-0.5 text-slate-300">
              Leagues: <strong className="text-white">{leaguesCount ? `${leaguesCount} selected` : 'All leagues'}</strong>
            </span>
            <span className="rounded border border-amber-500/30 bg-navy-950/60 px-2 py-0.5 text-slate-300">
              Active markets: <strong className="text-white">{activeCardsCount}</strong>
            </span>
          </div>

          {feedback && (
            <p className="mt-3 rounded border border-emerald-500/30 bg-emerald-500/15 p-2 text-xs text-emerald-200 font-mono">
              {feedback}
            </p>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onResetFilters}
              className="btn-gold h-8 px-3 text-xs"
            >
              ↺ Widen & Reset All Filters
            </button>
            <button
              type="button"
              onClick={() => onSwitchBookmaker(alternateBookmaker)}
              className="btn-ghost h-8 px-3 text-xs border-white/20 text-white"
            >
              Switch to {BOOKMAKER_LABEL[alternateBookmaker]}
            </button>
            <button
              type="button"
              disabled={refreshing}
              onClick={() => void handleTriggerRefresh()}
              className="btn-ghost h-8 px-3 text-xs border-amber-400/40 text-amber-200 hover:bg-amber-400/10"
            >
              {refreshing ? 'Updating feed…' : '⚡ Refresh Upstream Fixtures'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

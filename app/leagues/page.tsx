'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type League = {
  name: string;
  gameCount: number;
  nextKickoff: number | null;
  bookmakers: string[];
  priorityGroup: number;
};

const GROUP_LABEL = ['Big Five Leagues', 'Second Tier European', 'Americas & Other Priority', 'Other Competitions'];

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmaker, setBookmaker] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<number, boolean>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const q = bookmaker ? `?bookmaker=${bookmaker}` : '';
        const r = await fetch(`/api/leagues${q}`);
        const j = await r.json();
        if (!j.ok) {
          setError(j.error ?? `HTTP ${r.status}`);
        } else {
          setLeagues(j.leagues ?? []);
          setTotalGames(j.totalGames ?? 0);
          setMessage(j.message ?? null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [bookmaker]);

  const grouped = useMemo(() => {
    const map = new Map<number, League[]>();
    for (let i = 0; i < GROUP_LABEL.length; i++) {
      map.set(i, []);
    }
    for (const l of leagues) {
      const g = Math.min(Math.max(0, l.priorityGroup), GROUP_LABEL.length - 1);
      const arr = map.get(g) ?? [];
      arr.push(l);
      map.set(g, arr);
    }
    return map;
  }, [leagues]);

  const toggleGroup = (groupIdx: number) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupIdx]: !prev[groupIdx] }));
  };

  const toggleAll = () => {
    const allCollapsed = Array.from(grouped.keys()).every((k) => collapsedGroups[k]);
    const next: Record<number, boolean> = {};
    Array.from(grouped.keys()).forEach((k) => {
      next[k] = !allCollapsed;
    });
    setCollapsedGroups(next);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Active Leagues</h1>
          <p className="mt-1 text-sm text-slate-400">
            Leagues present in the current fetch run, organized by analytical priority tiers.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="field text-sm"
            value={bookmaker}
            onChange={(e) => setBookmaker(e.target.value)}
          >
            <option value="">All bookmakers</option>
            <option value="sportybet">SportyBet</option>
            <option value="betpawa">betPawa</option>
          </select>
          <button type="button" onClick={toggleAll} className="btn-ghost text-xs">
            Toggle All Groups
          </button>
          <Link href="/" className="btn-gold">
            Builder
          </Link>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">{error}</div>
      )}
      {message && <p className="mb-4 text-sm text-amber-300">{message}</p>}
      {!loading && leagues.length > 0 && (
        <p className="mb-4 text-xs text-slate-500">
          {leagues.length} leagues · {totalGames} games in latest run
        </p>
      )}

      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([groupIdx, items]) => {
          if (items.length === 0) return null;
          const isCollapsed = Boolean(collapsedGroups[groupIdx]);
          const groupTotalGames = items.reduce((sum, item) => sum + item.gameCount, 0);

          return (
            <div key={groupIdx} className="rounded-xl border border-white/10 bg-navy-900/60 p-4 transition-all">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    {GROUP_LABEL[groupIdx]}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {items.length} leagues · {groupTotalGames} games
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleGroup(groupIdx)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  {isCollapsed ? `▼ Expand (${items.length})` : '▲ Collapse'}
                </button>
              </div>

              {!isCollapsed && (
                <div className="mt-3 space-y-2">
                  {items.map((l) => (
                    <div
                      key={l.name}
                      className="glass flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 px-3 py-2.5"
                    >
                      <div>
                        <h3 className="text-sm font-medium text-white">{l.name}</h3>
                        <p className="text-[11px] text-slate-500">{l.bookmakers.join(', ')}</p>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-emerald-300 font-semibold">{l.gameCount} games</span>
                        {l.nextKickoff && (
                          <p className="text-[11px] text-slate-400">
                            next {new Date(l.nextKickoff).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

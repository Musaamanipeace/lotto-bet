'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type League = {
  name: string;
  gameCount: number;
  nextKickoff: number | null;
  bookmakers: string[];
  priorityGroup: number;
};

const GROUP_LABEL = ['Big Five', 'Second tier', 'Americas / other priority', 'Other'];

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmaker, setBookmaker] = useState('');

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Active Leagues</h1>
          <p className="mt-1 text-sm text-slate-400">
            Leagues present in the current fetch run, ordered by priority used for AI ranking.
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

      <div className="space-y-2">
        {leagues.map((l) => (
          <div
            key={l.name}
            className="glass flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-4 py-3"
          >
            <div>
              <h2 className="font-medium text-white">{l.name}</h2>
              <p className="text-[11px] text-slate-500">
                {GROUP_LABEL[Math.min(l.priorityGroup, GROUP_LABEL.length - 1)]} · {l.bookmakers.join(', ')}
              </p>
            </div>
            <div className="text-right text-sm">
              <span className="text-emerald-300">{l.gameCount} games</span>
              {l.nextKickoff && (
                <p className="text-[11px] text-slate-400">
                  next {new Date(l.nextKickoff).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

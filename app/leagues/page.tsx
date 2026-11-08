'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/auth-context';
import { LeagueChecklist, type LeagueItem } from '../components/league-checklist';
import { encodeLeagues, parseLeagues } from '@/lib/pick-filter.ts';

export default function LeaguesPage() {
  const { user, openAuth } = useAuth();
  const [leagues, setLeagues] = useState<LeagueItem[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmaker, setBookmaker] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  // Selection lives in the URL (?leagues=) so it survives refresh and can be shared.
  useEffect(() => {
    setSelected(parseLeagues(new URLSearchParams(window.location.search).get('leagues')));
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const q = new URLSearchParams(window.location.search);
    if (selected.length) q.set('leagues', encodeLeagues(selected)); else q.delete('leagues');
    const s = q.toString();
    window.history.replaceState(null, '', s ? `?${s}` : window.location.pathname);
  }, [selected, ready]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/leagues${bookmaker ? `?bookmaker=${bookmaker}` : ''}`);
        const j = await r.json();
        if (!j.ok) setError(j.error ?? `HTTP ${r.status}`);
        else {
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

  const known = useMemo(() => new Set(leagues.map((l) => l.name)), [leagues]);
  const effective = useMemo(() => selected.filter((n) => known.has(n)), [selected, known]);
  const selectedGames = leagues.filter((l) => effective.includes(l.name)).reduce((s, l) => s + l.gameCount, 0);
  const qs = effective.length ? `?leagues=${encodeURIComponent(encodeLeagues(effective))}` : '';

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="glass rounded-xl border border-white/10 p-6 text-center space-y-3">
          <h1 className="font-display text-2xl font-bold text-white">Sign in required</h1>
          <p className="text-sm text-slate-400">
            Unsigned-in users can only use the Builder, Filters, and Random Picks. Sign in to use the standalone Active Leagues page.
          </p>
          <button type="button" onClick={() => openAuth('login')} className="btn-emerald text-xs">
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Active Leagues</h1>
          <p className="mt-1 text-sm text-slate-400">
            Tick the leagues you want. Use them in the AI Picks or the Builder; nothing ticked means all leagues.
          </p>
        </div>
        <div className="flex gap-2">
          <select className="field text-sm" value={bookmaker} onChange={(e) => setBookmaker(e.target.value)} aria-label="Bookmaker">
            <option value="">All bookmakers</option>
            <option value="sportybet">SportyBet</option>
            <option value="betpawa">betPawa</option>
          </select>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">{error}</div>}
      {message && <p className="mb-4 text-sm text-amber-300">{message}</p>}
      {!loading && leagues.length > 0 && (
        <p className="mb-4 text-xs text-slate-500">{leagues.length} leagues · {totalGames} games in latest run</p>
      )}

      {leagues.length > 0 && (
        <>
          <LeagueChecklist leagues={leagues} selected={effective} onChange={setSelected} />
          <div className="sticky bottom-4 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-navy-900/95 px-4 py-3 shadow-lg">
            <span className="text-sm text-slate-200" role="status">
              {effective.length === 0 ? 'All leagues' : `${effective.length} leagues · ${selectedGames} games`}
            </span>
            <Link href={`/ai-picks${qs}`} className="btn-emerald ml-auto h-8 px-3 py-0 text-xs">AI Picks for these →</Link>
            <Link href={`/${qs}`} className="btn-gold h-8 px-3 py-0 text-xs">Builder with these →</Link>
          </div>
        </>
      )}
    </div>
  );
}

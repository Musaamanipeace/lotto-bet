'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type CommunitySlip = {
  id: string;
  name: string;
  bookmaker: string;
  legs: { home: string; away: string; pick: string; odds: number }[];
  totalOdds: number;
  combinedImplied: number | null;
  createdAt: number;
  shareNote?: string;
  userId: string | null;
};

function CommunitySlipItem({ s }: { s: CommunitySlip }) {
  const [legsOpen, setLegsOpen] = useState(false);

  return (
    <article className="glass rounded-xl border border-white/10 p-4 transition-all">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">{s.name}</h2>
          <p className="text-xs text-slate-400">
            {s.bookmaker} · {s.legs.length} legs · {new Date(s.createdAt).toLocaleString()}
          </p>
          {s.shareNote && <p className="mt-1 text-sm text-slate-300">{s.shareNote}</p>}
        </div>
        <div className="text-right">
          <span className="font-display text-xl font-bold text-gold-400">{Number(s.totalOdds).toFixed(2)}</span>
          {s.combinedImplied !== null && (
            <p className="text-[11px] text-slate-400">implied {(s.combinedImplied * 100).toFixed(2)}%</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-xs">
        <span className="text-slate-400">Selections ({s.legs.length})</span>
        <button
          type="button"
          onClick={() => setLegsOpen((o) => !o)}
          className="text-cyan-400 hover:text-cyan-300 font-medium"
        >
          {legsOpen ? '▲ Collapse selections' : `▼ Show all selections (${s.legs.length})`}
        </button>
      </div>

      {legsOpen ? (
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-slate-300">
          {s.legs.map((l, i) => (
            <li key={i} className="flex justify-between gap-2 border-b border-white/5 py-1">
              <span>
                {l.home} vs {l.away} · {l.pick}
              </span>
              <span className="text-gold-400">{Number(l.odds).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-1 text-xs text-slate-500">
          {s.legs.slice(0, 2).map((l) => `${l.home} v ${l.away} (${l.pick})`).join(' · ')}
          {s.legs.length > 2 && ` +${s.legs.length - 2} more`}
        </div>
      )}
    </article>
  );
}

export default function CommunityPage() {
  const [slips, setSlips] = useState<CommunitySlip[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/community');
        const j = await r.json();
        if (!j.ok) {
          setError(j.error ?? `HTTP ${r.status}`);
        } else {
          setSlips(j.slips ?? []);
          setMessage(j.message);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Community Slips</h1>
          <p className="mt-1 text-sm text-slate-400">
            Shared slips from other users. No win claims — only published selections and bookmaker odds.
          </p>
        </div>
        <Link href="/saved-slips" className="btn-ghost">
          My saved slips
        </Link>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">{error}</div>
      )}
      {!loading && slips.length === 0 && (
        <div className="glass rounded-xl p-8 text-center text-slate-300">
          <p>{message ?? 'No shared slips yet.'}</p>
          <p className="mt-2 text-sm text-slate-500">Save a slip, then share it from Saved Slips.</p>
        </div>
      )}

      <div className="space-y-4">
        {slips.map((s) => (
          <CommunitySlipItem key={s.id} s={s} />
        ))}
      </div>
    </div>
  );
}

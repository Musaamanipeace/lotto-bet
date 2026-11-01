'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/auth-context';
import { writeSlip } from '@/lib/slip-store.ts';
import { ConformStatsModal } from '../components/conform-stats-modal';
import type { PickRow } from '@/lib/filters.ts';

type SavedSlip = {
  id: string;
  name: string;
  bookmaker: string;
  legs: { home: string; away: string; pick: string; odds: number; gameId: string }[];
  totalOdds: number;
  combinedImplied: number | null;
  createdAt: number;
  shared: boolean;
  shareNote?: string;
};

const LS_KEY = 'lb_saved_slips_v1';

function loadLocal(): SavedSlip[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocal(slips: SavedSlip[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(slips.slice(0, 50)));
}

function SavedSlipItem({
  s,
  user,
  busy,
  onRemove,
  onShare,
  onLoad,
  onAudit,
}: {
  s: SavedSlip;
  user: unknown;
  busy: boolean;
  onRemove: (id: string) => void;
  onShare: (id: string) => void;
  onLoad: (s: SavedSlip) => void;
  onAudit: (s: SavedSlip) => void;
}) {
  const [legsOpen, setLegsOpen] = useState(true);

  return (
    <article className="glass rounded-xl border border-white/10 p-4 transition-all">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">{s.name}</h2>
          <p className="text-xs text-slate-400">
            {s.bookmaker} · {s.legs.length} legs · {new Date(s.createdAt).toLocaleString()}
            {s.shared ? ' · shared' : ''}
          </p>
        </div>
        <div className="text-right">
          <span className="font-display text-xl font-bold text-gold-400">{Number(s.totalOdds).toFixed(2)}</span>
          {s.combinedImplied != null && (
            <p className="text-[11px] text-slate-400">
              combined implied {(s.combinedImplied * 100).toFixed(4)}%
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-xs">
        <span className="text-slate-400">Legs Breakdown ({s.legs.length})</span>
        <button
          type="button"
          onClick={() => setLegsOpen((o) => !o)}
          className="text-cyan-400 hover:text-cyan-300"
        >
          {legsOpen ? '▲ Collapse legs' : '▼ Show legs'}
        </button>
      </div>

      {legsOpen && (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-300">
          {s.legs.map((l, i) => (
            <li key={`${l.gameId}-${i}`} className="flex justify-between gap-2 border-b border-white/5 py-1">
              <span>
                {l.home} vs {l.away} · {l.pick}
              </span>
              <span className="text-gold-400">{Number(l.odds).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-white/5">
        <button
          type="button"
          className="btn-emerald text-xs h-7 px-2.5"
          onClick={() => onLoad(s)}
        >
          Load to Active Slip
        </button>
        <button
          type="button"
          className="btn-ghost text-xs h-7 px-2.5 text-cyan-300 border-cyan-500/30"
          onClick={() => onAudit(s)}
        >
          ∿ Conform Stats
        </button>
        <button
          type="button"
          className="btn-ghost text-xs h-7 px-2.5"
          disabled={busy || s.shared}
          onClick={() => onShare(s.id)}
          title={user ? 'Share to Community' : 'Sign in to share'}
        >
          {s.shared ? 'Shared' : 'Share to Community'}
        </button>
        <button
          type="button"
          className="btn-ghost text-xs h-7 px-2.5 text-red-300 hover:bg-red-500/10"
          disabled={busy}
          onClick={() => onRemove(s.id)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export default function SavedSlipsPage() {
  const { user, loading, openAuth } = useAuth();
  const [slips, setSlips] = useState<SavedSlip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [auditSlip, setAuditSlip] = useState<{ legs: PickRow[]; title: string } | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const local = typeof window !== 'undefined' ? loadLocal() : [];
    try {
      const r = await fetch('/api/slips/list');
      const j = await r.json();
      if (j.ok && Array.isArray(j.slips) && j.slips.length > 0) {
        setSlips(j.slips);
        return;
      }
    } catch {
      /* fall through to local */
    }
    setSlips(local);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, user]);

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch('/api/slips/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const next = loadLocal().filter((s) => s.id !== id);
      saveLocal(next);
      setSlips((cur) => cur.filter((s) => s.id !== id));
      setNotice('Slip deleted.');
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function share(id: string) {
    if (!user) {
      openAuth('login');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/slips/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const j = await r.json();
      if (!j.ok) {
        setError(j.error ?? 'Share failed');
      } else {
        setSlips((cur) => cur.map((s) => (s.id === id ? { ...s, shared: true } : s)));
        setNotice('Slip shared with the community!');
        setTimeout(() => setNotice(null), 3000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function handleLoadSlip(s: SavedSlip) {
    const fullLegs = s.legs.map((l, idx) => ({
      gameId: l.gameId || `leg-${Date.now()}-${idx}`,
      nativeEventId: l.gameId || 'ev1',
      home: l.home,
      away: l.away,
      bookmaker: (s.bookmaker as 'sportybet' | 'betpawa') || 'sportybet',
      kickoff: Date.now() + 3600000,
      league: null,
      marketNativeId: 'm1',
      outcomeNativeId: 'o1',
      specifier: '',
      marketKind: '1x2' as const,
      line: null,
      outcomeKey: null,
      pick: l.pick,
      odds: l.odds,
      implied: l.odds > 0 ? 1 / l.odds : null,
    }));
    writeSlip({ legs: fullLegs, greyed: [] });
    setNotice(`Loaded "${s.name}" with ${s.legs.length} legs into the builder slip.`);
    setTimeout(() => setNotice(null), 3500);
  }

  function handleAuditSlip(s: SavedSlip) {
    const fullLegs = s.legs.map((l, idx) => ({
      gameId: l.gameId || `leg-${Date.now()}-${idx}`,
      nativeEventId: l.gameId || 'ev1',
      home: l.home,
      away: l.away,
      bookmaker: (s.bookmaker as 'sportybet' | 'betpawa') || 'sportybet',
      kickoff: Date.now() + 3600000,
      league: null,
      marketNativeId: 'm1',
      outcomeNativeId: 'o1',
      specifier: '',
      marketKind: '1x2' as const,
      line: null,
      outcomeKey: null,
      pick: l.pick,
      odds: l.odds,
      implied: l.odds > 0 ? 1 / l.odds : null,
    }));
    setAuditSlip({ legs: fullLegs, title: s.name });
  }

  if (loading) {
    return <p className="mt-10 text-center text-sm text-slate-400">Checking session…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Saved Slips</h1>
          <p className="mt-1 text-sm text-slate-400">
            Slips saved to your account. Reload into active slip, audit mathematical conformity, or share to Community.
          </p>
        </div>
        <Link href="/" className="btn-gold">
          Builder
        </Link>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {notice}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200" role="alert">
          {error}
        </div>
      )}

      {slips.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-slate-300">No saved slips yet.</p>
          <p className="mt-2 text-sm text-slate-500">
            Build a slip on the home page, then use <strong className="text-slate-400">Save slip</strong> in the staging area.
          </p>
          <Link href="/" className="btn-ghost mt-4 inline-flex">
            Go to builder
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {slips.map((s) => (
          <SavedSlipItem
            key={s.id}
            s={s}
            user={user}
            busy={busy}
            onRemove={remove}
            onShare={share}
            onLoad={handleLoadSlip}
            onAudit={handleAuditSlip}
          />
        ))}
      </div>

      {auditSlip && (
        <ConformStatsModal
          legs={auditSlip.legs}
          singleGameTitle={auditSlip.title}
          onClose={() => setAuditSlip(null)}
        />
      )}
    </div>
  );
}

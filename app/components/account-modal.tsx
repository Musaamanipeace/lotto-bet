'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './auth-context';
import { deleteLocalTemplate, getLocalTemplates, notifyTemplateApplied, type FilterTemplate } from '@/lib/template-store.ts';
import { writeSlip } from '@/lib/slip-store.ts';

type SavedSlip = {
  id: string;
  name: string;
  bookmaker: string;
  legs: { home: string; away: string; pick: string; odds: number; gameId: string }[];
  totalOdds: number;
  combinedImplied: number | null;
  createdAt: number;
  shared: boolean;
};

export function AccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'slips' | 'templates' | 'profile'>('slips');
  const [slips, setSlips] = useState<SavedSlip[]>([]);
  const [templates, setTemplates] = useState<FilterTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setActionNotice(null);
    setLoading(true);

    // Load templates
    setTemplates(getLocalTemplates());

    // Load slips
    fetch('/api/slips/list')
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && Array.isArray(j.slips)) {
          setSlips(j.slips);
        } else {
          try {
            const raw = localStorage.getItem('lb_saved_slips_v1');
            setSlips(raw ? JSON.parse(raw) : []);
          } catch {
            setSlips([]);
          }
        }
      })
      .catch(() => {
        try {
          const raw = localStorage.getItem('lb_saved_slips_v1');
          setSlips(raw ? JSON.parse(raw) : []);
        } catch {
          setSlips([]);
        }
      })
      .finally(() => setLoading(false));
  }, [open, user]);

  if (!open || !user) return null;

  function handleLoadSlip(s: SavedSlip) {
    // Convert to builder slip format and save to slip store
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
    setActionNotice(`Loaded "${s.name}" with ${s.legs.length} legs into the builder slip.`);
  }

  async function handleDeleteSlip(id: string) {
    try {
      await fetch('/api/slips/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setSlips((prev) => prev.filter((s) => s.id !== id));
      try {
        const raw = localStorage.getItem('lb_saved_slips_v1');
        if (raw) {
          const arr: SavedSlip[] = JSON.parse(raw);
          localStorage.setItem('lb_saved_slips_v1', JSON.stringify(arr.filter((s) => s.id !== id)));
        }
      } catch {
        /* ignore */
      }
      setActionNotice('Slip removed.');
    } catch {
      setActionNotice('Could not delete slip.');
    }
  }

  function handleApplyTemplate(tpl: FilterTemplate) {
    notifyTemplateApplied(tpl);
    setActionNotice(`Filter template "${tpl.name}" applied! Open Builder to view matched games.`);
  }

  function handleDeleteTemplate(id: string) {
    deleteLocalTemplate(id);
    setTemplates(getLocalTemplates());
    fetch('/api/templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
    setActionNotice('Template removed.');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Account Data & Settings">
      <div className="glass max-h-[90vh] w-full max-w-2xl overflow-hidden bg-navy-900/95 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 font-display font-bold text-emerald-400">
                {user.username.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-white">{user.username}</h2>
                <p className="text-xs text-slate-400">Account storage: {slips.length} slips · {templates.length} templates</p>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-white/10 bg-white/[0.02] px-5">
          <button
            type="button"
            className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition ${activeTab === 'slips' ? 'border-gold-400 text-gold-400' : 'border-transparent text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab('slips')}
          >
            Saved Betslips ({slips.length})
          </button>
          <button
            type="button"
            className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition ${activeTab === 'templates' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab('templates')}
          >
            Filter Templates ({templates.length})
          </button>
          <button
            type="button"
            className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition ${activeTab === 'profile' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile & Session
          </button>
        </div>

        {actionNotice && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-5 py-2 text-xs text-emerald-300">
            {actionNotice}
          </div>
        )}

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading stored account data…</p>
          ) : activeTab === 'slips' ? (
            <div className="space-y-3">
              {slips.length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
                  <p className="text-sm text-slate-300">No saved slips yet.</p>
                  <p className="mt-1 text-xs text-slate-500">Build slips on the home page and save them to your account.</p>
                  <Link href="/" onClick={onClose} className="btn-gold mt-4 inline-flex text-xs">
                    Open Builder
                  </Link>
                </div>
              ) : (
                slips.map((s) => (
                  <div key={s.id} className="rounded-xl border border-white/10 bg-navy-800/50 p-4 transition hover:border-white/20">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-white">{s.name}</h3>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {s.bookmaker} · {s.legs.length} legs · {new Date(s.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-lg font-bold text-gold-400">{Number(s.totalOdds).toFixed(2)}</span>
                        {s.combinedImplied !== null && (
                          <p className="text-[11px] text-slate-400">implied {(s.combinedImplied * 100).toFixed(2)}%</p>
                        )}
                      </div>
                    </div>
                    <ul className="mt-2.5 max-h-24 space-y-1 overflow-y-auto rounded-lg bg-navy-950/60 p-2 text-xs text-slate-300">
                      {s.legs.map((l, idx) => (
                        <li key={idx} className="flex justify-between border-b border-white/5 py-0.5 last:border-none">
                          <span className="truncate">{l.home} v {l.away} ({l.pick})</span>
                          <span className="odds text-[11px]">{Number(l.odds).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleLoadSlip(s)} className="btn-emerald h-7 px-2.5 text-xs">
                          Load into Slip
                        </button>
                        <Link href="/saved-slips" onClick={onClose} className="btn-ghost h-7 px-2.5 text-xs">
                          Full View
                        </Link>
                      </div>
                      <button type="button" onClick={() => handleDeleteSlip(s.id)} className="text-xs text-red-400 hover:underline">
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'templates' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Filter templates store your preferred bookmaker, odds thresholds, and market combinations for rapid slip building.
              </p>
              {templates.map((tpl) => (
                <div key={tpl.id} className="rounded-xl border border-white/10 bg-navy-800/50 p-4 transition hover:border-white/20">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{tpl.name}</h3>
                        {tpl.isDefault && (
                          <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300">Preset</span>
                        )}
                      </div>
                      {tpl.description && <p className="mt-0.5 text-xs text-slate-400">{tpl.description}</p>}
                      <p className="mt-1 text-[11px] text-slate-500">
                        Bookmaker: {tpl.bookmaker} · Kickoff: {tpl.withinHours ? `Next ${tpl.withinHours}h` : 'Any time'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        className="btn-gold h-7 px-2.5 text-xs"
                      >
                        Apply Template
                      </button>
                      {!tpl.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="btn-ghost h-7 px-2 text-xs text-red-300 hover:border-red-400/40 hover:bg-red-500/10"
                          title="Delete template"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Market summary */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {Object.entries(tpl.cards).map(([id, card]) => {
                      if (!card.on) return null;
                      return (
                        <span key={id} className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
                          {id.toUpperCase()}: {card.low.toFixed(2)} - {card.high.toFixed(2)}
                          {card.subs.length > 0 && ` (${card.subs.join(', ')})`}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-slate-400">Account Username</span>
                  <span className="font-semibold text-white">{user.username}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-slate-400">Account ID</span>
                  <span className="font-mono text-xs text-slate-300">{user.id}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-slate-400">Session Status</span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" /> Active Authenticated
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Total Saved Betslips</span>
                  <span className="odds">{slips.length}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  void logout();
                  onClose();
                }}
                className="btn-ghost w-full text-xs text-red-300 hover:bg-red-500/10 hover:border-red-500/40"
              >
                Sign out of this session
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 bg-white/[0.02] p-3 text-right">
          <button type="button" onClick={onClose} className="btn-ghost text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

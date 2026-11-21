'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-context';
import { useStoredSlip } from './use-slips';
import { emptySlip, slipBookmaker, slipTotals } from '@/lib/slip.ts';
import { BOOKMAKER_LABEL } from '@/lib/types.ts';
import {
  DEFAULT_TEMPLATES,
  getLocalTemplates,
  notifyTemplateApplied,
  onTemplateApplied,
  type FilterTemplate,
} from '@/lib/template-store.ts';
import { STORAGE_KEYS, scopedStorageKey, SIGNOUT_EVENT } from '@/lib/client-storage.ts';

const ROUTES = [
  { label: 'Builder', href: '/', icon: '📝', desc: 'Custom Slip Builder' },
  { label: 'Available Games', href: '/#available-games', icon: '⚽', desc: 'Live Match Odds' },
  { label: 'AI Picks', href: '/ai-picks', icon: '✦', desc: 'Verified AI Value' },
  { label: 'My Picks', href: '/my-picks', icon: '🎯', desc: 'Personal Selections' },
  { label: 'Saved Slips', href: '/saved-slips', icon: '📋', desc: 'Archived Slips' },
  { label: 'Results Tracker', href: '/results', icon: '📊', desc: 'Settled Slips & Scores' },
  { label: 'Community', href: '/community', icon: '👥', desc: 'Shared User Slips' },
  { label: 'Leagues', href: '/leagues', icon: '🏆', desc: 'Active Competitions' },
  { label: 'AI Chat', href: '/chat', icon: '💬', desc: 'Odds & Rule Assistant' },
];

export function TopCollapsibleHub() {
  const { user } = useAuth();
  const pathname = usePathname();
  const visibleRoutes = user ? ROUTES : ROUTES.slice(0, 2);
  const [collapsed, setCollapsed] = useState(true);
  const [slip, setSlip] = useStoredSlip();
  const [templates, setTemplates] = useState<FilterTemplate[]>(DEFAULT_TEMPLATES);
  const [activeTemplateName, setActiveTemplateName] = useState<string>('Custom');

  // Remember collapse preference in user-scoped localStorage
  useEffect(() => {
    const sync = () => {
      try {
        const stored = localStorage.getItem(scopedStorageKey(STORAGE_KEYS.TOP_HUB_COLLAPSED));
        if (stored !== null) setCollapsed(stored === 'true');
        else setCollapsed(true);
      } catch {
        /* ignore */
      }
      setTemplates(getLocalTemplates());
    };
    sync();
    window.addEventListener(SIGNOUT_EVENT, sync);
    return () => window.removeEventListener(SIGNOUT_EVENT, sync);
  }, []);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(scopedStorageKey(STORAGE_KEYS.TOP_HUB_COLLAPSED), String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    return onTemplateApplied((tpl) => {
      setActiveTemplateName(tpl.name);
    });
  }, []);

  const totals = slipTotals(slip);
  const totalOddsDisplay = totals.totalOdds.ok ? totals.totalOdds.total.toFixed(2) : '1.00';
  const impliedDisplay = totals.combined.ok
    ? `${(totals.combined.probability * 100).toFixed(1)}%`
    : '—';
  const bookmaker = slipBookmaker(slip);

  return (
    <div className="relative z-30 border-b border-white/10 bg-navy-950/90 backdrop-blur-md transition-all">
      <div className="mx-auto max-w-6xl px-4 py-2">
        {/* Header Bar of Hub: Title, Summary indicators, and Open navigation toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wider text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Navigation
            </span>

            {/* Quick Status Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-slate-300">
                Slip:{' '}
                <strong className="text-gold-400">
                  {slip.legs.length} {slip.legs.length === 1 ? 'leg' : 'legs'}
                </strong>
                {slip.legs.length > 0 && ` · @${totalOddsDisplay}`}
              </span>
              {bookmaker && (
                <span className="hidden sm:inline-block rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-slate-400">
                  {BOOKMAKER_LABEL[bookmaker]}
                </span>
              )}
              <span className="hidden md:inline-block rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-300 text-[11px]">
                Preset: {activeTemplateName}
              </span>
            </div>
          </div>

          {/* Open navigation toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleCollapse}
              aria-expanded={!collapsed}
              className="btn-ghost h-7 px-2.5 text-xs text-slate-300 hover:text-white"
            >
              {collapsed ? '▼ Open navigation' : '▲ Close navigation'}
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        {!collapsed && (
          <div className="mt-3 space-y-3 pt-2 border-t border-white/5">
            {/* Direct Route Navigation */}
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                All Routes Navigation
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
                {visibleRoutes.map((r) => {
                  const active = pathname === r.href;
                  return (
                    <Link
                      key={r.href}
                      href={r.href}
                      className={`flex items-center gap-2 rounded-lg border p-2 transition text-left ${
                        active
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-white'
                          : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span className="text-base">{r.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-tight truncate">{r.label}</p>
                        <p className="text-[10px] text-slate-400 truncate">{r.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Betslip Quick Glance & Filter Templates */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Active Betslip Summary</span>
                  <span className="odds">
                    {totals.activeCount} active legs · @{totalOddsDisplay}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Implied prob: <span className="text-slate-200">{impliedDisplay}</span>
                  </span>
                  <div className="flex gap-2">
                    <Link href="/" className="text-emerald-400 hover:underline">
                      Open Builder
                    </Link>
                    {slip.legs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSlip(emptySlip())}
                        className="text-red-400 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-white">Instant Filter Templates</span>
                  <span className="text-[10px] text-slate-500">1-click apply</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {templates.slice(0, 4).map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => notifyTemplateApplied(tpl)}
                      className={`rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                        activeTemplateName === tpl.name
                          ? 'border-cyan-400 bg-cyan-400/20 text-cyan-200'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                      title={tpl.description}
                    >
                      {tpl.name}
                    </button>
                  ))}
                  <Link
                    href="/"
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-400 hover:text-white"
                  >
                    More…
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

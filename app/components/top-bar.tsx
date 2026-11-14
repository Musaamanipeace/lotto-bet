'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './auth-context';
import { AccountModal } from './account-modal';
import { BetslipModal } from './betslip-modal';
import { useFilters } from './filter-context';
import { FiltersModal } from './market-filters';
import { SettingsModal } from './settings-modal';
import { ShortcutsBar, ShortcutsModals, useShortcutsController } from './shortcuts-bar';
import { useStoredSlip } from './use-slips';

/** Unsigned-in users only have access to Builder, Filters, Available Games, and non-AI Settings. */
const GUEST_MENU: { label: string; href: string }[] = [
  { label: 'Builder', href: '/' },
  { label: 'Available Games', href: '/#available-games' },
];

/** Signed-in users unlock all routes. */
const USER_MENU: { label: string; href: string }[] = [
  { label: 'Builder', href: '/' },
  { label: 'Available Games', href: '/#available-games' },
  { label: 'AI Picks', href: '/ai-picks' },
  { label: 'My Picks', href: '/my-picks' },
  { label: 'Saved Slips', href: '/saved-slips' },
  { label: 'Results Tracker', href: '/results' },
  { label: 'Community', href: '/community' },
  { label: 'AI Chat & Agent', href: '/chat' },
  { label: 'Active Leagues', href: '/leagues' },
];

export function TopBar() {
  const { user, loading, sessionError, openAuth, signOut } = useAuth();
  const { openFiltersSheet } = useFilters();
  const shortcutsCtrl = useShortcutsController();
  const pathname = usePathname();
  const [slip] = useStoredSlip();
  const [open, setOpen] = useState(false);
  const [betslipOpen, setBetslipOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState<number>(56);
  const betslipTriggerRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Measure fixed header (including safe-area-inset-top and signed-in shortcuts bar) so content never hides underneath
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setHeaderHeight(Math.ceil(el.getBoundingClientRect().height));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [user, sessionError]);

  // Betslip popup and menu are collapsed on load and after navigation (Task 5)
  useEffect(() => {
    setBetslipOpen(false);
    setOpen(false);
  }, [pathname]);

  // Close account modal immediately if user signs out
  useEffect(() => {
    if (!user) {
      setAccountOpen(false);
    }
  }, [user]);

  // Open Settings via custom event for BOTH signed-in users and guests (Task 12)
  useEffect(() => {
    const onOpenSettings = () => setSettingsOpen(true);
    window.addEventListener('lb-open-settings', onOpenSettings);
    return () => window.removeEventListener('lb-open-settings', onOpenSettings);
  }, []);

  const legCount = slip.legs.length;
  const menuItems = user ? USER_MENU : GUEST_MENU;

  return (
    <>
      {/* Fixed static top header for mobile & desktop with safe-area-inset-top padding (Task 4) */}
      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-navy-950/90 backdrop-blur-md"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
          <Link href="/" className="shrink-0 font-display text-lg sm:text-xl font-bold tracking-tight text-white">
            Lotto<span className="text-emerald-400"> Bet</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Betslip popup trigger button with selection count badge (Task 5) */}
            <button
              ref={betslipTriggerRef}
              type="button"
              onClick={() => setBetslipOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={betslipOpen}
              className="btn-ghost relative h-8 gap-1.5 px-2.5 text-xs border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
              title="Open active betslip"
            >
              <span>🧾 Betslip</span>
              <span
                className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-400 px-1.5 py-0.5 font-mono text-[11px] font-bold leading-none text-navy-950"
                aria-label={`${legCount} selections`}
              >
                {legCount}
              </span>
            </button>

            <div className="relative">
              <button
                type="button"
                className="btn-ghost h-8 px-2.5 text-xs"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
              >
                Menu <span aria-hidden className="ml-1">▾</span>
              </button>
              {open && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                  <div role="menu" className="glass absolute right-0 z-50 mt-2 w-64 bg-navy-900/95 p-1.5 shadow-2xl">
                    {/* User name and login status inside the menu dropdown */}
                    <div className="mb-1 rounded-lg border border-white/10 bg-navy-950/70 px-3 py-2.5">
                      {loading ? (
                        <p className="text-xs text-slate-400">Checking session…</p>
                      ) : user ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">
                              Signed in
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setOpen(false);
                                void signOut();
                              }}
                              className="text-xs font-medium text-rose-300 hover:text-rose-200 hover:underline"
                            >
                              Log out
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setOpen(false);
                              setAccountOpen(true);
                            }}
                            className="flex w-full items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-left text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20"
                            title="View stored betslips, filter templates, and account"
                          >
                            <span className="truncate">👤 {user.username}</span>
                            <span className="text-[10px] text-emerald-400">Account →</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                              Status: Guest
                            </span>
                            <span className="text-[11px] text-slate-500">Not signed in</span>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setOpen(false);
                                openAuth('login');
                              }}
                              className="btn-emerald flex-1 py-1.5 text-xs font-semibold"
                            >
                              Log in
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpen(false);
                                openAuth('signup');
                              }}
                              className="btn-gold flex-1 py-1.5 text-xs font-semibold"
                            >
                              Sign up
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {menuItems.map((m) => (
                      <Link
                        key={m.label}
                        role="menuitem"
                        href={m.href}
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                      >
                        {m.label}
                      </Link>
                    ))}

                    {/* Unified Filters sheet trigger reachable from any route (Task 9) */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpen(false);
                        openFiltersSheet();
                      }}
                      className="block w-full text-left rounded-lg px-3 py-2 text-sm text-emerald-300 hover:bg-white/10"
                    >
                      🎚️ Filters
                    </button>

                    {/* Settings is reachable ONLY from the menu — open to BOTH guests and signed-in users (Tasks 5 & 12) */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpen(false);
                        setSettingsOpen(true);
                      }}
                      className="block w-full text-left rounded-lg px-3 py-2 text-sm text-cyan-300 hover:bg-white/10 border-t border-white/10 mt-1"
                    >
                      ⚙️ Settings{user ? '' : ' (Preferences)'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Signed-in customizable shortcuts bar (Task 11) */}
        <ShortcutsBar ctrl={shortcutsCtrl} />

        {sessionError && (
          <div className="border-t border-red-500/30 bg-red-500/10 px-4 py-1.5 text-center text-xs text-red-300" role="alert">
            {sessionError}
          </div>
        )}
      </header>

      {/* Spacer dynamically matching fixed header height + safe-area-inset-top + shortcuts bar (Task 4 + 11) */}
      <div
        aria-hidden="true"
        className="w-full shrink-0"
        style={{ height: `${headerHeight}px` }}
      />

      <ShortcutsModals ctrl={shortcutsCtrl} />
      <BetslipModal
        open={betslipOpen}
        onClose={() => setBetslipOpen(false)}
        triggerRef={betslipTriggerRef}
      />
      <FiltersModal />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {user && (
        <AccountModal
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
        />
      )}
    </>
  );
}

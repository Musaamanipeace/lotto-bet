'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './auth-context';
import { AccountModal } from './account-modal';
import { BetslipModal } from './betslip-modal';
import { SettingsModal } from './settings-modal';
import { ShortcutsBar } from './shortcuts-bar';
import { useStoredSlip } from './use-slips';

/** Unsigned-in users only have access to the basic Builder, Filters, and Available Games. */
const GUEST_MENU: { label: string; href: string }[] = [
  { label: 'Builder', href: '/' },
  { label: 'Available Games', href: '/#available-games' },
];

/** Signed-in users unlock all features plus BYOK Settings. */
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
  const pathname = usePathname();
  const [slip] = useStoredSlip();
  const [open, setOpen] = useState(false);
  const [betslipOpen, setBetslipOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const betslipTriggerRef = useRef<HTMLButtonElement>(null);

  // Betslip popup and menu are collapsed on load and after navigation (Task 5)
  useEffect(() => {
    setBetslipOpen(false);
    setOpen(false);
  }, [pathname]);

  // Close settings/account modals immediately if user signs out
  useEffect(() => {
    if (!user) {
      setSettingsOpen(false);
      setAccountOpen(false);
    }
  }, [user]);

  // Allow signed-in components to open BYOK Settings via custom event
  useEffect(() => {
    const onOpenSettings = () => {
      if (user) {
        setSettingsOpen(true);
      } else {
        openAuth('login');
      }
    };
    window.addEventListener('lb-open-settings', onOpenSettings);
    return () => window.removeEventListener('lb-open-settings', onOpenSettings);
  }, [user, openAuth]);

  const legCount = slip.legs.length;
  const menuItems = user ? USER_MENU : GUEST_MENU;

  return (
    <>
      {/* Fixed static top header for mobile & desktop with safe-area-inset-top padding (Task 4) */}
      <header
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

            {!loading && !user && (
              <button className="btn-gold h-8 px-2.5 text-xs" onClick={() => openAuth('signup')}>
                Get Free Slips
              </button>
            )}
            {user && (
              <>
                <button
                  type="button"
                  onClick={() => setAccountOpen(true)}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 max-w-[7rem] truncate"
                  title="View stored betslips, filter templates, and account"
                >
                  👤 {user.username}
                </button>
                <button className="btn-ghost h-8 px-2 text-xs" onClick={() => void signOut()}>
                  Log out
                </button>
              </>
            )}
            {!loading && !user && (
              <button className="btn-ghost hidden sm:inline-flex h-8 px-2.5 text-xs" onClick={() => openAuth('login')}>
                Log in
              </button>
            )}
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
                  <div role="menu" className="glass absolute right-0 z-50 mt-2 w-60 bg-navy-900/95 p-1 shadow-2xl">
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
                    {!user && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpen(false);
                          openAuth('login');
                        }}
                        className="block w-full text-left rounded-lg px-3 py-2 text-sm text-emerald-300 hover:bg-white/10 border-t border-white/10 mt-1"
                      >
                        🔑 Log in to unlock AI & tools
                      </button>
                    )}
                    {/* Settings is reachable ONLY from the menu and ONLY for signed-in users (Task 5 + BYOK) */}
                    {user && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpen(false);
                          setSettingsOpen(true);
                        }}
                        className="block w-full text-left rounded-lg px-3 py-2 text-sm text-cyan-300 hover:bg-white/10 border-t border-white/10 mt-1"
                      >
                        ⚙️ Settings (BYOK Keys)
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {sessionError && (
          <div className="border-t border-red-500/30 bg-red-500/10 px-4 py-1.5 text-center text-xs text-red-300" role="alert">
            {sessionError}
          </div>
        )}
      </header>

      {/* Spacer matching fixed header height + safe-area-inset-top so no content is hidden under the header (Task 4) */}
      <div
        aria-hidden="true"
        className="w-full shrink-0"
        style={{ height: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
      />

      {/* Pinned tool shortcuts bar just below the header when signed in (Task 11) */}
      <ShortcutsBar />

      <BetslipModal
        open={betslipOpen}
        onClose={() => setBetslipOpen(false)}
        triggerRef={betslipTriggerRef}
      />
      {user && (
        <>
          <AccountModal
            open={accountOpen}
            onClose={() => setAccountOpen(false)}
          />
          <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </>
      )}
    </>
  );
}

'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from './auth-context';
import { AccountModal } from './account-modal';

const MENU: { label: string; href: string }[] = [
  { label: 'Builder', href: '/' },
  { label: 'AI Picks', href: '/ai-picks' },
  { label: 'My Picks', href: '/my-picks' },
  { label: 'Saved Slips', href: '/saved-slips' },
  { label: 'Community', href: '/community' },
  { label: 'AI Chat & Agent', href: '/chat' },
  { label: 'Active Leagues', href: '/leagues' },
];

export function TopBar() {
  const { user, loading, sessionError, openAuth, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-display text-xl font-bold tracking-tight text-white">
            Lotto<span className="text-emerald-400"> Bet</span>
          </Link>
          <div className="flex items-center gap-2">
            {!loading && !user && (
              <button className="btn-gold" onClick={() => openAuth('signup')}>Get Free Slips</button>
            )}
            {user && (
              <>
                <button
                  type="button"
                  onClick={() => setAccountOpen(true)}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                  title="View stored betslips, filter templates, and account"
                >
                  👤 {user.username}
                </button>
                <button className="btn-ghost text-xs" onClick={() => void logout()}>Log out</button>
              </>
            )}
            {!loading && !user && (
              <button className="btn-ghost hidden sm:inline-flex" onClick={() => openAuth('login')}>Log in</button>
            )}
          <div className="relative">
            <button className="btn-ghost" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              Menu <span aria-hidden className="ml-1">▾</span>
            </button>
            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div role="menu" className="glass absolute right-0 z-50 mt-2 w-60 bg-navy-900/95 p-1">
                  {MENU.map((m) => (
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
    <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
  </>
  );
}

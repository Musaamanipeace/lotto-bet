'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from './auth-context';

const MENU: { label: string; href?: string }[] = [
  { label: 'AI Picks', href: '/ai-picks' },
  { label: 'My Picks', href: '/my-picks' },
  { label: 'Saved Slips' },
  { label: 'Community' },
  { label: 'AI Chat & Agent' },
  { label: 'Active Leagues' },
];

export function TopBar() {
  const { user, loading, sessionError, openAuth, logout } = useAuth();
  const [open, setOpen] = useState(false);
  return (
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
              <span className="hidden text-sm text-slate-400 sm:inline">{user.username}</span>
              <button className="btn-ghost" onClick={() => void logout()}>Log out</button>
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
                  {MENU.map((m) =>
                    m.href ? (
                      <Link key={m.label} role="menuitem" href={m.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10">
                        {m.label}
                      </Link>
                    ) : (
                      <div key={m.label} role="menuitem" aria-disabled="true" className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-500">
                        {m.label}<span className="text-[10px] uppercase tracking-wide">not built yet</span>
                      </div>
                    ),
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {sessionError && (
        <div className="border-t border-red-500/30 bg-red-500/10 px-4 py-1.5 text-center text-xs text-red-300" role="alert">{sessionError}</div>
      )}
    </header>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { useFilters } from './filter-context';

export function BetPawaComingSoonModal() {
  const { betPawaComingSoonOpen, closeBetPawaComingSoon } = useFilters();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!betPawaComingSoonOpen) return;

    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 10);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeBetPawaComingSoon();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [betPawaComingSoonOpen, closeBetPawaComingSoon]);

  if (!betPawaComingSoonOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={closeBetPawaComingSoon}
      role="dialog"
      aria-modal="true"
      aria-labelledby="betpawa-coming-soon-title"
    >
      <div
        className="glass max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-amber-400/30 bg-navy-900/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="space-y-1">
            <span className="inline-flex items-center rounded border border-amber-400/40 bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Coming Soon
            </span>
            <h2
              id="betpawa-coming-soon-title"
              className="font-display text-lg font-bold text-white"
            >
              betPawa Support
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={closeBetPawaComingSoon}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-sm font-bold text-white hover:bg-white/20"
            aria-label="Close betPawa coming soon popup"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3.5 px-5 py-4 text-xs text-slate-300 leading-relaxed">
          <p>
            Live fixture feeds, market odds filtering, and automated booking-code generation for{' '}
            <strong className="text-white">betPawa</strong> are currently in development and will be
            available soon.
          </p>

          <div className="rounded-xl border border-white/10 bg-navy-950/60 p-3.5 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
              What&apos;s on the way
            </p>
            <ul className="space-y-1.5 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-amber-300" aria-hidden>•</span>
                <span>Real-time betPawa match &amp; market odds syncing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-300" aria-hidden>•</span>
                <span>Unified filter templates &amp; AI pick scoring</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-300" aria-hidden>•</span>
                <span>One-click betPawa slip &amp; booking code export</span>
              </li>
            </ul>
          </div>

          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-200">
            <strong className="text-emerald-300">SportyBet</strong> is active now — your filters,
            betslip, and AI tools remain ready to use.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-navy-950/70 px-5 py-3">
          <button
            type="button"
            onClick={closeBetPawaComingSoon}
            className="btn-emerald px-4 py-1.5 text-xs font-semibold"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

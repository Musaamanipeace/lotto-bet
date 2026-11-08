'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  MAX_LEGS,
  defaultSlipName,
  emptySlip,
  greyMarket,
  marketsInSlip,
  removeFromMarket,
  removeLeg,
  slipBookmaker,
  slipTotals,
  toggleGrey,
} from '@/lib/slip.ts';
import type { MarketSelector } from '@/lib/filters.ts';
import { BOOKMAKER_LABEL, type MarketKind } from '@/lib/types.ts';
import type { Destination } from '@/lib/codegen/index.ts';
import type { SportyCodeResult } from '@/lib/codegen/sportybet.ts';
import { BETPAWA_STEPS, BETPAWA_WARNING, type BetPawaScriptResult } from '@/lib/codegen/betpawa.ts';
import type { Failure } from '@/lib/result.ts';
import { upsertLocalSavedSlip } from '@/lib/saved-slips.ts';
import { useAuth } from './auth-context';
import { useStoredSlip } from './use-slips';

type CodegenOutcome =
  | { destination: Destination; result: SportyCodeResult | BetPawaScriptResult | Failure; httpStatus: number }
  | { destination: Destination; transportError: string };

const KIND_LABEL: Record<MarketKind, string> = {
  '1x2': '1X2',
  double_chance: 'Double chance',
  over_under: 'Over/Under',
  btts: 'Both teams to score',
};

const fmtKickoff = (ms: number) =>
  new Date(ms).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const marketLabel = (s: MarketSelector) => `${KIND_LABEL[s.kind]}${s.line !== undefined ? ` ${s.line}` : ''}`;

export function BetslipModal({
  open,
  onClose,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef?: RefObject<HTMLButtonElement | null>;
}) {
  const { user, openAuth, codegenRequiresSignIn } = useAuth();
  const [slip, setSlip] = useStoredSlip();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const pushedHistoryRef = useRef(false);

  const [busyCodegen, setBusyCodegen] = useState(false);
  const [outcome, setOutcome] = useState<CodegenOutcome | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'info' | 'warn'; text: string } | null>(null);
  const [removeCount, setRemoveCount] = useState('1');
  const [toolMarket, setToolMarket] = useState('');

  // Reset transient codegen state when legs change
  useEffect(() => {
    setOutcome(null);
    setCopied(null);
  }, [slip.legs.length]);

  // Scroll lock preserving exact scrollY + focus trap + Escape + mobile back button
  useEffect(() => {
    if (!open) return;

    const savedScrollY = window.scrollY;
    const body = document.body;
    const prevPosition = body.style.position;
    const prevTop = body.style.top;
    const prevLeft = body.style.left;
    const prevRight = body.style.right;
    const prevWidth = body.style.width;
    const prevOverflow = body.style.overflow;

    body.style.position = 'fixed';
    body.style.top = `-${savedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    // Push history entry so mobile back button closes popup without leaving the page
    try {
      window.history.pushState({ lbBetslipPopup: true }, '');
      pushedHistoryRef.current = true;
    } catch {
      pushedHistoryRef.current = false;
    }

    // Focus close button inside modal on open
    const focusTimer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 10);

    const onPopState = () => {
      if (pushedHistoryRef.current) {
        pushedHistoryRef.current = false;
        onClose();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('keydown', onKeyDown);

      body.style.position = prevPosition;
      body.style.top = prevTop;
      body.style.left = prevLeft;
      body.style.right = prevRight;
      body.style.width = prevWidth;
      body.style.overflow = prevOverflow;
      window.scrollTo(0, savedScrollY);

      if (pushedHistoryRef.current) {
        pushedHistoryRef.current = false;
        try {
          if (window.history.state?.lbBetslipPopup) {
            window.history.back();
          }
        } catch {
          /* ignore */
        }
      }

      // Return focus to trigger button
      triggerRef?.current?.focus();
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  const totals = slipTotals(slip);
  const activeLegs = slip.legs.filter((l) => !slip.greyed.includes(l.gameId));
  const bookmaker = slipBookmaker(slip);
  const destination: Destination = bookmaker ?? 'sportybet';
  const slipMarkets = marketsInSlip(slip);
  const toolSel = slipMarkets.find((m) => m.key === toolMarket) ?? slipMarkets[0];
  const greyedInTool = toolSel
    ? slip.legs
        .filter((l) => `${l.marketKind}:${l.line ?? ''}` === toolSel.key)
        .every((l) => slip.greyed.includes(l.gameId))
    : false;

  async function handleGenerateBookCode() {
    if (!user && codegenRequiresSignIn) {
      onClose();
      openAuth('login');
      return;
    }
    if (activeLegs.length === 0) return;
    setBusyCodegen(true);
    setOutcome(null);
    setCopied(null);
    try {
      const r = await fetch('/api/codegen', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ destination, legs: activeLegs }),
      });
      const text = await r.text();
      let result: unknown = null;
      try {
        result = JSON.parse(text);
      } catch {
        /* handled below */
      }
      if (result && typeof result === 'object' && 'ok' in result) {
        setOutcome({ destination, result: result as SportyCodeResult, httpStatus: r.status });
      } else {
        setOutcome({
          destination,
          transportError: `Unexpected response (HTTP ${r.status}): ${text.slice(0, 200)}`,
        });
      }
    } catch (e) {
      setOutcome({
        destination,
        transportError: `Request failed: ${e instanceof Error ? e.message : String(e)}`,
      });
    } finally {
      setBusyCodegen(false);
    }
  }

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
    } catch (e) {
      setCopied(`Copy failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleSaveSlip() {
    if (slip.legs.length === 0 || !bookmaker) return;
    const totalOdds = totals.totalOdds.ok ? totals.totalOdds.total : slip.legs.reduce((a, l) => a * l.odds, 1);
    const combinedImplied = totals.combined.ok ? totals.combined.probability : null;
    const name = slip.name || defaultSlipName();
    const payload = {
      id: slip.id,
      name,
      bookmaker,
      legs: slip.legs,
      totalOdds,
      combinedImplied,
    };

    try {
      const r = await fetch('/api/slips/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      const savedEntry =
        j?.ok && j.slip
          ? j.slip
          : {
              ...payload,
              id: slip.id || `local-${Date.now()}`,
              userId: user?.id ?? null,
              createdAt: Date.now(),
              shared: false,
            };
      upsertLocalSavedSlip(savedEntry);
      setSlip({ ...slip, id: savedEntry.id, name: savedEntry.name });
      setNotice({ tone: 'info', text: `Saved "${savedEntry.name}".` });
    } catch (e) {
      setNotice({ tone: 'warn', text: e instanceof Error ? e.message : String(e) });
    }
  }

  function handleRemoveN() {
    if (!toolSel) return;
    const r = removeFromMarket(slip, toolSel.selector, Number(removeCount));
    if (!r.ok) {
      setNotice({ tone: 'warn', text: r.error });
      return;
    }
    setSlip(r.slip);
    setNotice({
      tone: r.removed < r.requested ? 'warn' : 'info',
      text: `Removed ${r.removed} of ${r.requested} from ${marketLabel(toolSel.selector)}.`,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="betslip-modal-title"
    >
      <div
        ref={dialogRef}
        className="glass flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-navy-900/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="betslip-modal-title" className="font-display text-lg font-bold text-white">
                {slip.name || 'Active Betslip'}
              </h2>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-300">
                {slip.legs.length}/{MAX_LEGS}
              </span>
              {bookmaker && (
                <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                  {BOOKMAKER_LABEL[bookmaker]}
                </span>
              )}
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Close betslip"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {notice && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                notice.tone === 'warn'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              }`}
              role="status"
            >
              {notice.text}
            </div>
          )}

          {slip.legs.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-300">Your betslip is empty.</p>
              <p className="mt-1 text-xs text-slate-500">
                Tap any outcome on a game card to automatically create and save a slip.
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-white/5">
                {slip.legs.map((l) => {
                  const grey = slip.greyed.includes(l.gameId);
                  return (
                    <li
                      key={l.gameId}
                      className={`flex items-center gap-2 py-2.5 ${grey ? 'opacity-40' : ''}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-white">
                          {l.home} v {l.away}
                        </span>
                        <span className="block text-xs text-slate-400">
                          {l.pick} · {fmtKickoff(l.kickoff)}
                          {l.implied !== null ? ` · implied ${(l.implied * 100).toFixed(1)}%` : ''}
                        </span>
                      </span>
                      <span className="odds text-sm">{l.odds.toFixed(2)}</span>
                      <button
                        type="button"
                        className="btn-ghost px-2 py-1 text-xs"
                        aria-pressed={grey}
                        onClick={() => setSlip(toggleGrey(slip, l.gameId))}
                      >
                        {grey ? 'Restore' : 'Grey'}
                      </button>
                      <button
                        type="button"
                        className="btn-ghost px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                        aria-label={`Remove ${l.home} v ${l.away}`}
                        onClick={() => setSlip(removeLeg(slip, l.gameId))}
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Totals */}
              <dl className="space-y-1.5 border-t border-white/10 pt-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">
                    Total odds ({totals.activeCount} active
                    {totals.greyedCount ? `, ${totals.greyedCount} greyed` : ''})
                  </dt>
                  <dd className="odds text-xl">
                    {totals.totalOdds.ok ? totals.totalOdds.total.toFixed(2) : '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">Combined implied probability</dt>
                  <dd className="text-slate-200">
                    {totals.combined.ok ? `${(totals.combined.probability * 100).toFixed(2)}%` : 'unavailable'}
                  </dd>
                </div>
              </dl>

              {/* Batch Market Tools inside Betslip */}
              {slipMarkets.length > 0 && (
                <div className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
                  <label className="text-slate-400">
                    Market
                    <select
                      className="field mt-1 py-1 text-xs"
                      value={toolSel?.key ?? ''}
                      onChange={(e) => setToolMarket(e.target.value)}
                    >
                      {slipMarkets.map((m) => (
                        <option key={m.key} value={m.key}>
                          {marketLabel(m.selector)} ({m.count})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-slate-400">
                    Count
                    <input
                      className="field mt-1 w-16 py-1 text-xs"
                      inputMode="numeric"
                      value={removeCount}
                      onChange={(e) => setRemoveCount(e.target.value.replace(/\D/g, ''))}
                    />
                  </label>
                  <button type="button" className="btn-ghost py-1.5 text-xs" onClick={handleRemoveN}>
                    Remove N
                  </button>
                  <button
                    type="button"
                    className="btn-ghost py-1.5 text-xs"
                    onClick={() => toolSel && setSlip(greyMarket(slip, toolSel.selector, !greyedInTool))}
                  >
                    {greyedInTool ? 'Restore market' : 'Grey market'}
                  </button>
                </div>
              )}

              {/* Task 6: Merged Book Code Generator inside Betslip */}
              <div className="space-y-3 border-t border-white/10 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn-gold flex-1 text-xs font-bold"
                    disabled={busyCodegen || activeLegs.length === 0}
                    onClick={() => void handleGenerateBookCode()}
                  >
                    {busyCodegen ? 'Generating book code…' : 'Generate book code'}
                  </button>
                  <button
                    type="button"
                    className="btn-emerald text-xs"
                    onClick={() => void handleSaveSlip()}
                  >
                    Save slip
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-xs text-rose-300 hover:bg-rose-500/10"
                    onClick={() => {
                      setSlip(emptySlip());
                      setOutcome(null);
                      setNotice(null);
                    }}
                  >
                    Clear slip
                  </button>
                </div>

                {/* Book Code Generator Output */}
                {outcome && 'transportError' in outcome && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200" role="alert">
                    <p className="font-semibold">{outcome.transportError}</p>
                  </div>
                )}

                {outcome && 'result' in outcome && !outcome.result.ok && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200" role="alert">
                    <p className="font-semibold">{outcome.result.error}</p>
                    {outcome.result.details?.unmapped && outcome.result.details.unmapped.length > 0 && (
                      <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                        {outcome.result.details.unmapped.map((u, i) => (
                          <li key={i}>
                            <strong>{u.leg}</strong>: {u.reason}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {outcome && 'result' in outcome && outcome.result.ok && outcome.result.destination === 'sportybet' && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                    <p className="text-emerald-300">
                      SportyBet Booking Code ({outcome.result.legCount} legs)
                    </p>
                    <p className="my-1.5 font-display text-2xl font-bold tracking-wider text-white">
                      {outcome.result.code}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="btn-ghost text-xs"
                        onClick={() => void copyText('code', (outcome.result as { code: string }).code)}
                      >
                        Copy code
                      </button>
                      <a
                        className="btn-emerald text-xs"
                        href={(outcome.result as { deepLink: string }).deepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open on SportyBet
                      </a>
                      {copied && (
                        <span className="text-emerald-300">
                          {copied === 'code' ? '✓ Copied!' : copied}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {outcome && 'result' in outcome && outcome.result.ok && outcome.result.destination === 'betpawa' && (
                  <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                    <p className="font-semibold text-emerald-300">
                      {outcome.result.mapped}/{outcome.result.total} legs mapped for betPawa
                    </p>
                    {outcome.result.code && (
                      <div className="rounded border border-emerald-500/40 bg-emerald-500/10 p-2">
                        <p className="text-emerald-300">betPawa Booking Code</p>
                        <p className="my-1 font-display text-2xl font-bold tracking-wider text-white">
                          {outcome.result.code}
                        </p>
                        <button
                          type="button"
                          className="btn-ghost text-xs"
                          onClick={() => void copyText('code', outcome.result.ok && outcome.result.destination === 'betpawa' && outcome.result.code ? outcome.result.code : '')}
                        >
                          Copy code
                        </button>
                      </div>
                    )}
                    <ol className="list-decimal space-y-0.5 pl-4 text-slate-300">
                      {BETPAWA_STEPS.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                    <p className="text-amber-300">{BETPAWA_WARNING}</p>
                    <textarea
                      readOnly
                      className="field h-24 font-mono text-[11px]"
                      value={outcome.result.script}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label="betPawa console script"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="btn-gold text-xs"
                        onClick={() =>
                          void copyText(
                            'script',
                            outcome.result.ok && outcome.result.destination === 'betpawa'
                              ? outcome.result.script
                              : '',
                          )
                        }
                      >
                        Copy script
                      </button>
                      {copied && (
                        <span className="text-emerald-300">
                          {copied === 'script' || copied === 'code' ? '✓ Copied!' : copied}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

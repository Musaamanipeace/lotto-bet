'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  MAX_LEGS,
  addLeg,
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
import { aiPickToRow } from '@/lib/ai-rows.ts';
import type { AgentResponse, LegFlag, SwapProposal } from '@/lib/ai-agent.ts';
import {
  getClientPreferenceHeaders,
  hasConfiguredAiKeys,
  refreshServerSettings,
} from '@/lib/client-settings.ts';
import { useAuth } from './auth-context';
import { useFilters } from './filter-context';
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

const SEVERITY_STYLE: Record<LegFlag['severities'][number], string> = {
  stale: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
  correlated: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
  weak: 'border-orange-500/40 bg-orange-500/15 text-orange-200',
  unverified: 'border-slate-500/40 bg-slate-500/15 text-slate-300',
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
  const { filterState } = useFilters();
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

  // Task 13: AI Review & Swaps state
  const [aiBusy, setAiBusy] = useState(false);
  const [aiReview, setAiReview] = useState<AgentResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [lockedGames, setLockedGames] = useState<Record<string, boolean>>({});
  const [excludePickIds, setExcludePickIds] = useState<string[]>([]);

  // Reset transient codegen state when legs change
  useEffect(() => {
    setOutcome(null);
    setCopied(null);
  }, [slip.legs.length]);

  // Clear AI review on sign-out
  useEffect(() => {
    if (!user) {
      setAiReview(null);
      setAiError(null);
      setExcludePickIds([]);
      setLockedGames({});
    }
  }, [user]);

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

  const flagByGame = new Map<string, LegFlag>();
  for (const f of aiReview?.flags ?? []) {
    flagByGame.set(f.gameId, f);
  }

  async function persistSlipOnServer(nextSlip: typeof slip) {
    if (!user || nextSlip.legs.length === 0) return;
    const b = slipBookmaker(nextSlip);
    if (!b) return;
    const t = slipTotals(nextSlip);
    const totalOdds = t.totalOdds.ok ? t.totalOdds.total : nextSlip.legs.reduce((a, l) => a * l.odds, 1);
    const combinedImplied = t.combined.ok ? t.combined.probability : null;
    const name = nextSlip.name || defaultSlipName();
    try {
      const r = await fetch('/api/slips/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: nextSlip.id,
          name,
          bookmaker: b,
          legs: nextSlip.legs,
          totalOdds,
          combinedImplied,
        }),
      });
      const j = await r.json().catch(() => null);
      if (j?.ok && j.slip) upsertLocalSavedSlip(j.slip);
    } catch {
      /* non-fatal */
    }
  }

  async function handleRunAiReview(extraExcluded: string[] = []) {
    setAiError(null);
    if (!user) {
      onClose();
      openAuth('login');
      return;
    }
    let ready = hasConfiguredAiKeys();
    if (!ready) {
      const snap = await refreshServerSettings();
      ready = Boolean(snap?.aiKeysConfigured);
    }
    if (!ready) {
      setAiError('Save an API key in Menu ▾ → Settings to run AI review.');
      return;
    }
    if (slip.legs.length === 0) return;

    setAiBusy(true);
    try {
      const mergedExclude = [...new Set([...excludePickIds, ...extraExcluded])];
      const lockedGameIds = Object.entries(lockedGames)
        .filter(([, isLocked]) => isLocked)
        .map(([gid]) => gid);

      const res = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getClientPreferenceHeaders(),
        },
        body: JSON.stringify({
          mode: 'inspect_slip',
          filterState,
          lockedGameIds,
          excludeIds: mergedExclude,
          slipLegs: slip.legs.map((l) => ({
            gameId: l.gameId,
            home: l.home,
            away: l.away,
            pick: l.pick,
            odds: l.odds,
            marketKind: l.marketKind,
            marketNativeId: l.marketNativeId,
            outcomeNativeId: l.outcomeNativeId,
            specifier: l.specifier,
          })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setAiError(data?.error ?? `AI review failed (HTTP ${res.status})`);
        return;
      }
      const agentRes = data as AgentResponse;
      setAiReview(agentRes);
      if (Array.isArray(agentRes.seenPickIds) && agentRes.seenPickIds.length > 0) {
        setExcludePickIds((prev) => [...new Set([...prev, ...agentRes.seenPickIds])]);
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiBusy(false);
    }
  }

  function handleAcceptSwap(swap: SwapProposal) {
    const newRow = aiPickToRow(swap.inPick);
    if (!newRow) {
      setNotice({ tone: 'warn', text: 'Could not convert replacement pick into slip leg.' });
      return;
    }
    const afterRemove = removeLeg(slip, swap.outGameId);
    const added = addLeg(afterRemove, newRow);
    if (!added.ok) {
      setNotice({ tone: 'warn', text: added.error });
      return;
    }
    const nextSlip = {
      ...added.slip,
      id: slip.id || `saved-${Date.now()}`,
      name: slip.name || defaultSlipName(),
    };
    setSlip(nextSlip);
    void persistSlipOnServer(nextSlip);

    setExcludePickIds((prev) => [...new Set([...prev, swap.inPickId, swap.outPickId])]);
    setAiReview((prev) =>
      prev
        ? {
            ...prev,
            swaps: prev.swaps.filter((s) => s.inPickId !== swap.inPickId),
          }
        : prev,
    );
    setNotice({
      tone: 'info',
      text: `Swapped out ${swap.outLeg.home} v ${swap.outLeg.away} for ${swap.inPick.home} v ${swap.inPick.away} (@${swap.oddsAfter.toFixed(2)}).`,
    });
  }

  function handleRejectSwap(swap: SwapProposal) {
    setExcludePickIds((prev) => [...new Set([...prev, swap.inPickId])]);
    setAiReview((prev) =>
      prev
        ? {
            ...prev,
            swaps: prev.swaps.filter((s) => s.inPickId !== swap.inPickId),
          }
        : prev,
    );
  }

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
                  const isLocked = Boolean(lockedGames[l.gameId]);
                  const flag = flagByGame.get(l.gameId);
                  return (
                    <li
                      key={l.gameId}
                      className={`py-2.5 space-y-1.5 ${grey ? 'opacity-40' : ''}`}
                    >
                      <div className="flex items-center gap-2">
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
                        {user && (
                          <button
                            type="button"
                            className={`btn-ghost px-2 py-1 text-xs ${isLocked ? 'border-amber-500/40 bg-amber-500/15 text-amber-300' : ''}`}
                            aria-pressed={isLocked}
                            title={isLocked ? 'Locked from AI swaps' : 'Lock game against AI swaps'}
                            onClick={() =>
                              setLockedGames((prev) => ({ ...prev, [l.gameId]: !prev[l.gameId] }))
                            }
                          >
                            {isLocked ? '🔒' : '🔓'}
                          </button>
                        )}
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
                      </div>
                      {flag && flag.severities.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pl-0.5 text-[10px]">
                          {flag.severities.map((sev) => (
                            <span
                              key={sev}
                              className={`rounded border px-1.5 py-0.5 font-semibold uppercase ${SEVERITY_STYLE[sev]}`}
                            >
                              {sev}
                            </span>
                          ))}
                          {flag.reasons[0] && (
                            <span className="text-slate-400">{flag.reasons[0]}</span>
                          )}
                        </div>
                      )}
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

              {/* Task 6 & Task 13: Book Code Generator + AI Review */}
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
                    className="btn-ghost text-xs border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                    disabled={aiBusy || slip.legs.length === 0}
                    onClick={() => void handleRunAiReview()}
                  >
                    {aiBusy ? 'Reviewing…' : '🤖 AI review'}
                  </button>
                  {user && (
                    <button
                      type="button"
                      className="btn-emerald text-xs"
                      onClick={() => void handleSaveSlip()}
                    >
                      Save slip
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-ghost text-xs text-rose-300 hover:bg-rose-500/10"
                    onClick={() => {
                      setSlip(emptySlip());
                      setOutcome(null);
                      setNotice(null);
                      setAiReview(null);
                      setAiError(null);
                    }}
                  >
                    Clear slip
                  </button>
                </div>

                {/* Task 13: AI Review Error / Key CTA */}
                {aiError && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                    <span>{aiError}</span>
                    {user && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          window.dispatchEvent(new Event('lb-open-settings'));
                        }}
                        className="btn-gold px-2.5 py-1 text-[11px] font-bold"
                      >
                        Open Settings
                      </button>
                    )}
                  </div>
                )}

                {/* Task 13: AI Review Results + Swap Cards */}
                {aiReview && (
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.06] p-3.5 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-cyan-200">🤖 AI Slip Review</span>
                      <div className="flex items-center gap-2">
                        {aiReview.llmUsed && aiReview.model && (
                          <span className="text-[10px] text-slate-400">{aiReview.model}</span>
                        )}
                        <button
                          type="button"
                          disabled={aiBusy}
                          onClick={() => void handleRunAiReview()}
                          className="text-[11px] text-cyan-300 hover:underline"
                        >
                          Refresh swaps
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-200 leading-relaxed">{aiReview.summary}</p>
                    {aiReview.llmWarning && (
                      <p className="text-[11px] text-amber-300">
                        Note: {aiReview.llmWarning} (showing deterministic check).
                      </p>
                    )}

                    {aiReview.swaps.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Suggested Swaps
                        </p>
                        {aiReview.swaps.map((swap) => (
                          <div
                            key={`${swap.outGameId}-${swap.inPickId}`}
                            className="rounded-lg border border-white/10 bg-navy-950/70 p-2.5 space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-rose-300 line-through">
                                  Out: {swap.outLeg.home} v {swap.outLeg.away} ({swap.outLeg.pick} @{swap.oddsBefore.toFixed(2)})
                                </p>
                                <p className="text-emerald-300 font-semibold">
                                  In: {swap.inPick.home} v {swap.inPick.away} ({swap.inPick.marketKey.replace(/_/g, ' ')} @{swap.oddsAfter.toFixed(2)})
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="block font-mono font-bold text-gold-400">
                                  New total: {swap.newTotalOdds.toFixed(2)}x
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {swap.inPick.evaluation.label} · fit {swap.inPick.fitScore.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-400">{swap.reason}</p>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleRejectSwap(swap)}
                                className="btn-ghost px-2.5 py-1 text-[11px]"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAcceptSwap(swap)}
                                className="btn-emerald px-2.5 py-1 text-[11px] font-semibold"
                              >
                                Accept Swap
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        No swaps suggested under current unlocked legs and active filters.
                      </p>
                    )}
                  </div>
                )}

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

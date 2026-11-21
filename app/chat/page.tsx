'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AgentAction, AddPicksAction, SwapProposal } from '@/lib/ai-agent.ts';
import { aiPickToRow } from '@/lib/ai-rows.ts';
import { addLeg, defaultSlipName, removeLeg, type Slip } from '@/lib/slip.ts';
import { upsertLocalSavedSlip } from '@/lib/saved-slips.ts';
import {
  getClientPreferenceHeaders,
  getClientSettings,
  hasConfiguredAiKeys,
  onSettingsChanged,
  refreshServerSettings,
  type ClientAiSettings,
} from '@/lib/client-settings.ts';
import { useAuth } from '../components/auth-context';
import { FilterSummaryBadge, useFilters } from '../components/filter-context';
import { useStoredSlip } from '../components/use-slips';

type Msg = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: AgentAction[];
};

export default function ChatPage() {
  const { user, openAuth } = useAuth();
  const { filterState, openFiltersSheet } = useFilters();
  const [slip, setSlip] = useStoredSlip();

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Ask about AI picks, why a leg is labeled Best fit, or request picks/swaps (e.g. "add 5 picks" or "review my slip"). Actions use your active Unified Filters and require your confirmation to modify your slip.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [byokReady, setByokReady] = useState(false);
  const [clientSettings, setClientSettings] = useState<ClientAiSettings>(() => getClientSettings());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setClientSettings(getClientSettings());
    if (user) {
      setByokReady(hasConfiguredAiKeys());
      void refreshServerSettings().then((snap) => {
        if (snap) {
          setByokReady(snap.aiKeysConfigured);
          setClientSettings(snap.preferences);
        }
      });
    } else {
      setByokReady(false);
    }
    return onSettingsChanged((s) => {
      setClientSettings(s);
      const ready = hasConfiguredAiKeys();
      setByokReady(ready);
      if (ready) setError(null);
    });
  }, [user]);

  const openSettings = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('lb-open-settings'));
    }
  };

  async function persistSlip(nextSlip: Slip) {
    if (!user || nextSlip.legs.length === 0) return;
    const b = nextSlip.legs[0]?.bookmaker ?? filterState.bookmaker;
    const totalOdds = nextSlip.legs.reduce((a, l) => a * l.odds, 1);
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
          combinedImplied: null,
        }),
      });
      const j = await r.json().catch(() => null);
      if (j?.ok && j.slip) upsertLocalSavedSlip(j.slip);
    } catch {
      /* non-fatal */
    }
  }

  function applyAddPicksAction(action: AddPicksAction) {
    let working: Slip =
      slip.legs.length === 0
        ? { id: `saved-${Date.now()}`, name: defaultSlipName(), legs: [], greyed: [] }
        : { ...slip, id: slip.id || `saved-${Date.now()}`, name: slip.name || defaultSlipName() };

    let added = 0;
    for (const p of action.picks) {
      const row = aiPickToRow(p);
      if (!row) continue;
      const res = addLeg(working, row);
      if (res.ok) {
        working = res.slip;
        added += 1;
      }
    }
    setSlip(working);
    void persistSlip(working);
    setActionToast(`Added ${added} pick${added === 1 ? '' : 's'} to "${working.name}".`);
    setTimeout(() => setActionToast(null), 4000);
  }

  function applySwapAction(swap: SwapProposal) {
    const newRow = aiPickToRow(swap.inPick);
    if (!newRow) return;
    const afterRemove = removeLeg(slip, swap.outGameId);
    const added = addLeg(afterRemove, newRow);
    if (!added.ok) {
      setError(added.error);
      return;
    }
    const nextSlip: Slip = {
      ...added.slip,
      id: slip.id || `saved-${Date.now()}`,
      name: slip.name || defaultSlipName(),
    };
    setSlip(nextSlip);
    void persistSlip(nextSlip);
    setActionToast(`Swapped ${swap.outLeg.home} v ${swap.outLeg.away} for ${swap.inPick.home} v ${swap.inPick.away}.`);
    setTimeout(() => setActionToast(null), 4000);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    const currentSettings = getClientSettings();
    setClientSettings(currentSettings);

    let ready = hasConfiguredAiKeys();
    if (!ready && user) {
      const snap = await refreshServerSettings();
      ready = Boolean(snap?.aiKeysConfigured);
      setByokReady(ready);
    }

    if (!ready) {
      const msg = 'Please add your AI API key in Menu ▾ → Settings before using AI Chat.';
      setError(msg);
      setMessages((m) => [
        ...m,
        { role: 'user', content: text },
        { role: 'assistant', content: `🔑 ${msg}` },
      ]);
      setInput('');
      openSettings();
      return;
    }

    setInput('');
    setError(null);
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setBusy(true);

    const timeoutSeconds = currentSettings.timeoutSeconds || 35;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

    try {
      const slipSummary =
        slip.legs.length > 0
          ? `${slip.legs.length} legs (${slip.legs.map((l) => `${l.home} v ${l.away}: ${l.pick} @${l.odds}`).join('; ')})`
          : 'empty';

      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getClientPreferenceHeaders(currentSettings),
        },
        body: JSON.stringify({
          message: text,
          filterState,
          slipSummary,
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
          history: next.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const j = await r.json();
      if (!j.ok) {
        const errMsg = j.error ?? j.message ?? `HTTP ${r.status}`;
        setError(errMsg);
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: `AI Error: ${errMsg}. You can review your model and API key in Menu ▾ → Settings.`,
          },
        ]);
      } else {
        let content = j.reply as string;
        if (j.provider) content += `\n\n— ${j.provider}${j.model ? ` / ${j.model}` : ''}`;
        const structuredActions = Array.isArray(j.actions) ? (j.actions as AgentAction[]) : [];
        setMessages((m) => [...m, { role: 'assistant', content, actions: structuredActions }]);
      }
    } catch (e: unknown) {
      clearTimeout(timeoutId);
      const err = e as Error;
      if (err.name === 'AbortError') {
        const timeoutMsg = `Request timed out after ${timeoutSeconds}s. You can adjust timeout or choose another model in Settings.`;
        setError(timeoutMsg);
        setMessages((m) => [...m, { role: 'assistant', content: `⏳ ${timeoutMsg}` }]);
      } else {
        setError(err.message || String(e));
      }
    } finally {
      setBusy(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="glass rounded-xl border border-white/10 p-6 text-center space-y-3">
          <h1 className="font-display text-2xl font-bold text-white">Sign in required</h1>
          <p className="text-sm text-slate-400">
            Unsigned-in users can use the Builder, Filters, and Random Picks. Sign in and save an API key in Settings to use AI Chat.
          </p>
          <button type="button" onClick={() => openAuth('login')} className="btn-emerald text-xs">
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-8" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">AI Chat & Agent</h1>
          <p className="mt-1 text-sm text-slate-400">
            Active model: <span className="text-cyan-300 font-medium">{clientSettings?.selectedModel || 'gemini-2.5-flash'}</span> ({clientSettings?.provider || 'gemini'}).
          </p>
          <div className="mt-2">
            <FilterSummaryBadge />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={openFiltersSheet} className="btn-ghost text-xs border-emerald-500/40 text-emerald-300">
            🎚️ Filters
          </button>
          <Link href="/ai-picks" className="btn-ghost text-xs">
            AI Picks
          </Link>
        </div>
      </div>

      {!byokReady && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200" role="status">
          <span>🔑 Add your AI API key in Menu ▾ → Settings to enable AI Chat.</span>
          <button
            type="button"
            onClick={openSettings}
            className="btn-gold h-7 px-2.5 py-0 text-xs"
          >
            Open Settings
          </button>
        </div>
      )}

      {actionToast && (
        <div className="mb-3 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200" role="status">
          {actionToast}
        </div>
      )}

      {error && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200" role="status">
          <span>{error}</span>
          <button
            type="button"
            onClick={openSettings}
            className="btn-gold h-7 px-2.5 py-0 text-xs"
          >
            Configure in Settings
          </button>
        </div>
      )}

      <div className="glass flex flex-1 flex-col rounded-xl border border-white/10 p-4">
        <div className="flex-1 space-y-3 overflow-y-auto" style={{ maxHeight: '55vh' }}>
          {messages.map((m, i) => (
            <div key={i} className="space-y-2">
              <div
                className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'ml-8 bg-emerald-500/15 text-emerald-50'
                    : 'mr-8 bg-white/5 text-slate-200'
                }`}
              >
                {m.content}
              </div>

              {m.actions && m.actions.length > 0 && (
                <div className="mr-8 space-y-2 pl-2">
                  {m.actions.map((act, idx) =>
                    act.type === 'add_picks' ? (
                      <div key={idx} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-emerald-200">
                            Proposed Picks ({act.picks.length} · {act.totalOdds.toFixed(2)}x)
                            {act.shortfall > 0 ? ` · ${act.shortfall} short of requested ${act.requested}` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => applyAddPicksAction(act)}
                            className="btn-emerald px-2.5 py-1 text-[11px] font-semibold"
                          >
                            Apply {act.picks.length} picks to slip
                          </button>
                        </div>
                        <ul className="space-y-1 text-[11px] text-slate-300">
                          {act.picks.map((p) => (
                            <li key={p.id}>
                              {p.home} v {p.away} · {p.marketKey.replace(/_/g, ' ')} @{p.odds.toFixed(2)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div key={idx} className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-cyan-200">
                            Swap: {act.outLeg.home} v {act.outLeg.away} → {act.inPick.home} v {act.inPick.away} (@{act.oddsAfter.toFixed(2)})
                          </span>
                          <button
                            type="button"
                            onClick={() => applySwapAction(act)}
                            className="btn-emerald px-2.5 py-1 text-[11px] font-semibold"
                          >
                            Accept Swap
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-300">{act.reason}</p>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form
          className="mt-4 flex gap-2 border-t border-white/10 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            className="field flex-1"
            placeholder="e.g. Why are picks labeled Best fit? Add 5 picks. Review my slip."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            maxLength={2000}
          />
          <button type="submit" className="btn-gold" disabled={busy || !input.trim()}>
            {busy ? '…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

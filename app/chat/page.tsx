'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/auth-context';
import {
  getClientSettings,
  getClientAiHeaders,
  hasSubmittedByok,
  onSettingsChanged,
  type ClientAiSettings,
} from '@/lib/client-settings.ts';

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

export default function ChatPage() {
  const { user, openAuth } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Ask about AI picks, why a leg is labeled Best fit, or request a structured action (e.g. “add 5 under 3.5 picks”). I only use stored AI picks — no invented stats or win claims.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSettings, setClientSettings] = useState<ClientAiSettings>(() => getClientSettings());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setClientSettings(getClientSettings());
    return onSettingsChanged((s) => {
      setClientSettings(s);
      if (hasSubmittedByok(s)) setError(null);
    });
  }, []);

  const openSettings = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('lb-open-settings'));
    }
  };

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    const currentSettings = getClientSettings();
    setClientSettings(currentSettings);

    // If the client has not submitted BYOK, tell them to submit and do not perform anything.
    if (!hasSubmittedByok(currentSettings)) {
      const msg = 'Please submit your own API key (BYOK) in Menu ▾ → Settings before using AI Chat.';
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
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getClientAiHeaders(currentSettings),
        },
        body: JSON.stringify({
          message: text,
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
            content: `AI Error: ${errMsg}. You can set your free model and BYOK API key in Menu ▾ → Settings.`,
          },
        ]);
      } else {
        let content = j.reply as string;
        if (j.action && j.action.type === 'add_games') {
          content += `\n\n(Suggested action: add ${j.action.n ?? '?'} games${j.action.market ? ` in ${j.action.market}` : ''} — use AI Picks or Builder to apply.)`;
        }
        if (j.provider) content += `\n\n— ${j.provider}${j.model ? ` / ${j.model}` : ''}`;
        setMessages((m) => [...m, { role: 'assistant', content }]);
      }
    } catch (e: unknown) {
      clearTimeout(timeoutId);
      const err = e as Error;
      if (err.name === 'AbortError') {
        const timeoutMsg = `Request timed out after ${timeoutSeconds}s. You can select another free model or adjust timeout in Menu ▾ → Settings.`;
        setError(timeoutMsg);
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: `⏳ ${timeoutMsg}`,
          },
        ]);
      } else {
        setError(err.message || String(e));
      }
    } finally {
      setBusy(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  const byokReady = hasSubmittedByok(clientSettings);

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="glass rounded-xl border border-white/10 p-6 text-center space-y-3">
          <h1 className="font-display text-2xl font-bold text-white">Sign in required</h1>
          <p className="text-sm text-slate-400">
            Unsigned-in users can only use the Builder, Filters, and Random Picks. Sign in and submit your BYOK key to use AI Chat.
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
        </div>
        <div className="flex gap-2">
          <Link href="/ai-picks" className="btn-ghost text-xs">
            AI Picks
          </Link>
        </div>
      </div>

      {!byokReady && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200" role="status">
          <span>🔑 You have not submitted an API key (BYOK) yet. Submit your key in Settings to use AI Chat.</span>
          <button
            type="button"
            onClick={openSettings}
            className="btn-gold h-7 px-2.5 py-0 text-xs"
          >
            Submit BYOK in Settings
          </button>
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
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'ml-8 bg-emerald-500/15 text-emerald-50'
                  : 'mr-8 bg-white/5 text-slate-200'
              }`}
            >
              {m.content}
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
            placeholder="e.g. Why are picks labeled Best fit? Add 5 home wins."
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

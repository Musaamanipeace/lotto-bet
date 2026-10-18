'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

export default function ChatPage() {
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
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setError(null);
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setBusy(true);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: next.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const j = await r.json();
      if (!j.ok) {
        setError(j.error ?? j.message ?? `HTTP ${r.status}`);
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: j.message
              ? `${j.message} ${j.error ? `(${j.error})` : ''}`
              : `Request failed: ${j.error ?? r.status}`,
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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-8" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">AI Chat & Agent</h1>
          <p className="mt-1 text-sm text-slate-400">
            LLM layer on a closed set of stored AI picks. Requires a configured key (Gemini / OpenRouter / Mistral).
          </p>
        </div>
        <Link href="/ai-picks" className="btn-ghost">
          AI Picks
        </Link>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200" role="status">
          {error}
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

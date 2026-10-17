'use client';

import React, { useRef, useEffect, useState } from 'react';
import { SelectedPick, StandardGame } from '@/types';
import { calculateAccumulatorOdds } from '@/lib/filterEngine';
import { Bot, User, Send, Loader2, X, Settings, AlertTriangle, CheckCircle2, ArrowRight, Plus } from 'lucide-react';

interface ChatTabProps {
  isOpen: boolean;
  activeSlip: SelectedPick[];
  availableMatches: StandardGame[];
  onLoadSlip: (selections: SelectedPick[]) => void;
  onAppendToSlip: (selections: SelectedPick[]) => void;
  onOpenSettings?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  proposedPicks?: SelectedPick[];
  action?: string;
  isError?: boolean;
}

export const ChatTab: React.FC<ChatTabProps> = ({
  isOpen,
  activeSlip,
  availableMatches,
  onLoadSlip,
  onAppendToSlip,
  onOpenSettings,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I'm your LottoBet betting assistant. Ask me to build accumulators, analyze your slip, or discuss match strategy. I work with the live fixtures and odds shown in My Picks.",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMsg: Message = { id: `user_${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const history = messages.concat(userMsg).map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          activeSlip,
          availableMatches: availableMatches.slice(0, 40),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reach AI agent');
      }

      const botMsg: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Here is what I found for you:',
        proposedPicks: data.data?.proposedPicks || [],
        action: data.data?.action || 'none',
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error talking to AI agent';
      setMessages((prev) => [
        ...prev,
        { id: `err_${Date.now()}`, role: 'assistant', content: `⚠️ ${msg}`, isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const QUICK_PROMPTS = [
    'Build 5 safe Over 0.5 goals accumulator',
    'Pick 4 Double Chance bankers',
    'Find 3 high-value Home Wins',
    'Analyze risk in my current slip',
  ];

  const handleSavePicks = (picks: SelectedPick[]) => {
    const newPicks = picks.filter((p) => !activeSlip.some((s) => s.gameId === p.gameId));
    if (newPicks.length > 0) {
      onAppendToSlip(newPicks);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b111e] border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Chat Assistant</h3>
            <p className="text-[10px] text-slate-400">AI betting strategist</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (confirm('Clear chat?')) {
                setMessages([messages[0]]);
              }
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2 text-xs ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  m.isError
                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                    : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                }`}
              >
                {m.isError ? <AlertTriangle className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-2.5 whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none shadow-md'
                  : m.isError
                  ? 'bg-rose-950/40 text-rose-200 border border-rose-500/30 rounded-tl-none shadow-sm'
                  : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none shadow-sm'
              }`}
            >
              {m.content}

              {m.proposedPicks && m.proposedPicks.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800/60 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <SparklesIcon /> Proposed ({m.proposedPicks.length})
                    </span>
                    <span className="font-mono text-slate-400">
                      {calculateAccumulatorOdds(m.proposedPicks)}x
                    </span>
                  </div>
                  <div className="space-y-0.5 max-h-32 overflow-y-auto pr-1">
                    {m.proposedPicks.map((pick, i) => (
                      <div key={`${pick.gameId}_${i}`} className="bg-slate-950 p-1.5 rounded border border-slate-800 flex items-center justify-between text-[10px]">
                        <div className="truncate mr-2">
                          <span className="text-white font-medium">{pick.homeTeam} vs {pick.awayTeam}</span>
                          <div className="text-slate-400">{pick.marketName}: {pick.pick}</div>
                        </div>
                        <span className="font-mono font-bold text-emerald-400 bg-slate-900 px-1 py-0.5 rounded border border-slate-700">
                          {pick.odd.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => onLoadSlip(m.proposedPicks!)}
                      className="flex-1 py-1 px-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-bold rounded transition-all"
                    >
                      <ArrowRight className="w-2.5 h-2.5" /> Replace Slip
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSavePicks(m.proposedPicks!)}
                      className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold rounded transition-all"
                    >
                      <Plus className="w-2.5 h-2.5" /> Add
                    </button>
                  </div>
                </div>
              )}

              {m.isError && onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/20 text-rose-200 text-[10px] font-bold rounded border border-rose-500/40"
                >
                  <Settings className="w-2.5 h-2.5" /> Settings
                </button>
              )}
            </div>

            {m.role === 'user' && (
              <div className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 font-bold shadow-md">
                <User className="w-3 h-3" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start items-center">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Bot className="w-3 h-3" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex items-center gap-1 text-slate-400 text-[10px]">
              <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-3 py-1 border-t border-slate-800 bg-slate-950/60 overflow-x-auto whitespace-nowrap flex gap-1">
        {QUICK_PROMPTS.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleQuickPrompt(p)}
            disabled={loading}
            className="px-2 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 text-[10px] border border-slate-800 transition-colors shrink-0"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-2 bg-slate-900 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about fixtures, odds, accumulators..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || loading}
            className="p-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 rounded transition-all shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

function SparklesIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v3m0 0v3m0-3h3m-3 0h-3m-3 3l3 3m0 0-3 3m3-3l-3-3m-3 3l-3-3m3 3l3-3" />
    </svg>
  );
}

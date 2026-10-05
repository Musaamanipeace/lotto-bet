'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SelectedPick, StandardGame, UserProfile, SavedBetslip } from '@/types';
import { calculateAccumulatorOdds, mergePicksIntoSlip } from '@/lib/filterEngine';
import { saveBetslip, listSavedSlips } from '@/lib/storage';
import {
  Bot,
  User,
  Send,
  Sparkles,
  X,
  Loader2,
  BookmarkPlus,
  Plus,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  RotateCcw,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  proposedPicks?: SelectedPick[];
  action?: string;
  slipNameToSave?: string;
  confidenceScore?: number;
}

interface AiAgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSlip: SelectedPick[];
  availableMatches: StandardGame[];
  user: UserProfile | null;
  onLoadSlip: (selections: SelectedPick[]) => void;
  onAppendToSlip: (selections: SelectedPick[]) => void;
  onRefreshSavedSlips?: () => void;
}

const QUICK_PROMPTS = [
  'Pick 5 safe Over 0.5 goals matches for tonight',
  'Build a 4-leg Double Chance banker accumulator',
  'Find 3 high-confidence Home Wins under 1.45',
  'Analyze the risk of my current matches in slip',
  'Recommend 6 low-risk games with total odds around 3x',
];

export const AiAgentDrawer: React.FC<AiAgentDrawerProps> = ({
  isOpen,
  onClose,
  activeSlip,
  availableMatches,
  user,
  onLoadSlip,
  onAppendToSlip,
  onRefreshSavedSlips,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I am your LottoBet AI Betting Agent. You can discuss match strategy with me, ask me to build accumulators (e.g. *'Pick 5 Over 0.5s under 1.20'*, *'Build 4 Double Chance bankers'*), analyze your current slip, or save slips by name. How can I help you today?",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const history = messages
        .concat(userMsg)
        .map((m) => ({ role: m.role, content: m.content }));

      const savedList = user ? listSavedSlips(user.username) : [];
      const savedSummary = savedList.map((s) => ({
        id: s.id,
        name: s.name,
        matchCount: s.selections.length,
        totalOdds: s.totalOdds,
      }));

      const res = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          activeSlip,
          savedSlips: savedSummary,
          availableMatches: availableMatches.slice(0, 40),
          userApiKey: user?.llmApiKey,
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
        slipNameToSave: data.data?.slipNameToSave,
        confidenceScore: data.data?.confidenceScore,
      };

      setMessages((prev) => [...prev, botMsg]);

      // If agent triggered save_slip automatically
      if (data.data?.action === 'save_slip' && data.data?.slipNameToSave) {
        const toSave = (data.data?.proposedPicks && data.data.proposedPicks.length > 0)
          ? data.data.proposedPicks
          : activeSlip;
        if (toSave.length > 0 && user) {
          saveBetslip(data.data.slipNameToSave, toSave);
          onRefreshSavedSlips?.();
          notify(`Saved "${data.data.slipNameToSave}" to your betslips!`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error talking to AI agent';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${msg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePicksAsSlip = (picks: SelectedPick[], customName?: string) => {
    if (!user) {
      notify('Please sign in to save betslips to your account.');
      return;
    }
    const name = customName?.trim() || `AI Acca - ${picks.length} Matches (${calculateAccumulatorOdds(picks)}x)`;
    saveBetslip(name, picks);
    onRefreshSavedSlips?.();
    notify(`Saved "${name}" successfully to your account!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg h-full bg-[#0b111e] border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20">
              <div className="w-full h-full bg-[#0d1422] rounded-[10px] flex items-center justify-center text-emerald-400">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">LottoBet AI Agent</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Agentic
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Discuss, build, and save accumulators in real time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (confirm('Clear chat conversation?')) {
                  setMessages([
                    {
                      id: 'welcome',
                      role: 'assistant',
                      content: 'Conversation reset. What accumulator strategy would you like to explore?',
                    },
                  ]);
                }
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
              title="Clear chat"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div className="px-4 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 text-xs ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 space-y-2.5 ${
                  m.role === 'user'
                    ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>

                {/* If the assistant proposed a concrete set of match picks */}
                {m.proposedPicks && m.proposedPicks.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Proposed Accumulator ({m.proposedPicks.length} Matches)
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        Total Odds: {calculateAccumulatorOdds(m.proposedPicks)}x
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {m.proposedPicks.map((pick, pIdx) => (
                        <div
                          key={`${pick.gameId}-${pick.pick}-${pIdx}`}
                          className="p-2 rounded-lg bg-[#0b111e] border border-slate-800 text-[11px] flex items-center justify-between gap-2"
                        >
                          <div className="truncate flex-1">
                            <p className="font-semibold text-white truncate">
                              {pick.homeTeam} vs {pick.awayTeam}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {pick.league} • <span className="text-slate-300">{pick.marketName}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono font-bold">
                              {pick.pick}
                            </span>
                            <span className="font-mono font-bold text-white">
                              @{pick.odd.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons for proposed picks */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onLoadSlip(m.proposedPicks!);
                          notify(`Loaded ${m.proposedPicks!.length} matches into your active betslip!`);
                        }}
                        className="py-1.5 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm transition-colors"
                      >
                        <ArrowRight className="w-3 h-3" />
                        <span>Load as Active Slip</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onAppendToSlip(m.proposedPicks!);
                          notify(`Appended ${m.proposedPicks!.length} matches to your current slip!`);
                        }}
                        className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] flex items-center justify-center gap-1 border border-slate-700 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add to Current Slip</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSavePicksAsSlip(m.proposedPicks!, m.slipNameToSave)}
                        className="col-span-2 py-1.5 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                      >
                        <BookmarkPlus className="w-3 h-3" />
                        <span>Save as New Betslip {m.slipNameToSave ? `("${m.slipNameToSave}")` : ''}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 items-center text-xs text-slate-400">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Agent analyzing live odds and building strategy...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2.5 bg-slate-900/60 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              disabled={loading}
              className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 whitespace-nowrap border border-slate-700/60 transition-colors shrink-0 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 bg-slate-900 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask agent: 'Pick 5 Over 0.5s', 'Save as Bankers'..."
              disabled={loading}
              className="flex-1 bg-[#0b111e] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold transition-all shadow-md shadow-emerald-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

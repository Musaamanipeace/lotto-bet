'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SelectedPick, StandardGame, UserProfile, AIProvider, ByokKeys } from '@/types';
import { calculateAccumulatorOdds, mergePicksIntoSlip } from '@/lib/filterEngine';
import { saveBetslip, listSavedSlips } from '@/lib/storage';
import {
  getByokKeys,
  saveByokKeys,
  PROVIDER_LABELS,
  POPULAR_MODELS,
  validateKeyFormat,
  BYOK_CHANGED_EVENT,
} from '@/lib/byokStorage';
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
  Settings,
  Key,
  ChevronDown,
  AlertTriangle,
  Cpu,
  Check,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  proposedPicks?: SelectedPick[];
  action?: string;
  slipNameToSave?: string;
  confidenceScore?: number;
  isError?: boolean;
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
  onOpenSettings?: () => void;
  /** True when the server has preloaded env AI keys (guest mode). */
  serverAiConfigured?: boolean;
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
  onOpenSettings,
  serverAiConfigured = false,
}) => {
  const [byok, setByok] = useState<ByokKeys>(getByokKeys());
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [showQuickKeyInput, setShowQuickKeyInput] = useState(false);
  const [quickKeyVal, setQuickKeyVal] = useState('');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I am your LottoBet AI Betting Agent. You can discuss match strategy with me, ask me to build accumulators (e.g. *'Pick 5 Over 0.5s under 1.20'*, *'Build 4 Double Chance bankers'*), analyze your current slip, or save slips by name. Select your preferred model provider above and ask anything!",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync BYOK keys when drawer opens or updates
  useEffect(() => {
    if (isOpen) {
      const current = getByokKeys();
      setByok(current);
      setSelectedProvider(current.aiProvider || 'gemini');
      const defaultMod =
        (current.aiProvider === 'gemini'
          ? current.geminiModel
          : current.aiProvider === 'openrouter'
          ? current.openrouterModel
          : current.mistralModel) || PROVIDER_LABELS[current.aiProvider || 'gemini'].defaultModel;
      setSelectedModel(defaultMod);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleByokUpdate = (e: Event) => {
      const custom = e as CustomEvent<ByokKeys>;
      if (custom.detail) {
        setByok(custom.detail);
        setSelectedProvider(custom.detail.aiProvider || 'gemini');
      }
    };
    window.addEventListener(BYOK_CHANGED_EVENT, handleByokUpdate);
    return () => window.removeEventListener(BYOK_CHANGED_EVENT, handleByokUpdate);
  }, []);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  // Active key for current provider
  const activeKey =
    selectedProvider === 'gemini'
      ? byok.geminiKey?.trim()
      : selectedProvider === 'openrouter'
      ? byok.openrouterKey?.trim()
      : byok.mistralKey?.trim();

  const isKeyConfigured = Boolean(activeKey && activeKey.length > 0) || serverAiConfigured;

  const handleProviderChange = (newProvider: AIProvider) => {
    setSelectedProvider(newProvider);
    const defaultMod =
      (newProvider === 'gemini'
        ? byok.geminiModel
        : newProvider === 'openrouter'
        ? byok.openrouterModel
        : byok.mistralModel) || PROVIDER_LABELS[newProvider].defaultModel;
    setSelectedModel(defaultMod);
    saveByokKeys({ aiProvider: newProvider });
    setShowQuickKeyInput(false);
  };

  const handleSaveQuickKey = () => {
    const trimmed = quickKeyVal.trim();
    if (!trimmed) return;
    saveByokKeys({
      aiProvider: selectedProvider,
      ...(selectedProvider === 'gemini' ? { geminiKey: trimmed } : {}),
      ...(selectedProvider === 'openrouter' ? { openrouterKey: trimmed } : {}),
      ...(selectedProvider === 'mistral' ? { mistralKey: trimmed } : {}),
    });
    setQuickKeyVal('');
    setShowQuickKeyInput(false);
    notify(`Saved ${PROVIDER_LABELS[selectedProvider].name} API key!`);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    if (!isKeyConfigured) {
      setShowQuickKeyInput(true);
      notify(`Please enter your ${PROVIDER_LABELS[selectedProvider].name} API Key first.`);
      return;
    }

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
        .filter((m) => !m.isError)
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
          userApiKey: activeKey,
          provider: selectedProvider,
          model: selectedModel,
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
        const toSave =
          data.data?.proposedPicks && data.data.proposedPicks.length > 0
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
          isError: true,
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
    const name =
      customName?.trim() ||
      `AI Acca - ${picks.length} Matches (${calculateAccumulatorOdds(picks)}x)`;
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
                  BYOK Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Discuss, build, and save accumulators with your model of choice
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Open BYOK Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
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
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODEL PROVIDER SELECTOR STRIP (Requested Feature) */}
        <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800/90 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Active Model Provider:
            </span>

            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isKeyConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className={`text-[11px] font-semibold ${isKeyConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isKeyConfigured ? 'Key Configured' : 'Key Missing'}
              </span>
            </div>
          </div>

          {/* Provider Buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            {(['gemini', 'openrouter', 'mistral'] as AIProvider[]).map((p) => {
              const active = selectedProvider === p;
              const hasKey = Boolean(
                p === 'gemini'
                  ? byok.geminiKey?.trim()
                  : p === 'openrouter'
                  ? byok.openrouterKey?.trim()
                  : byok.mistralKey?.trim()
              );

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleProviderChange(p)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between border ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{PROVIDER_LABELS[p].name}</span>
                  {hasKey ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 ml-1" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 shrink-0 ml-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Model Selection Dropdown & Key Quick Action */}
          <div className="flex items-center gap-2 pt-0.5">
            <div className="flex-1 relative">
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  if (selectedProvider === 'gemini') saveByokKeys({ geminiModel: e.target.value });
                  else if (selectedProvider === 'openrouter') saveByokKeys({ openrouterModel: e.target.value });
                  else saveByokKeys({ mistralModel: e.target.value });
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {POPULAR_MODELS[selectedProvider].map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {!isKeyConfigured && (
              <button
                type="button"
                onClick={() => setShowQuickKeyInput(!showQuickKeyInput)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1 shrink-0"
              >
                <Key className="w-3 h-3" />
                <span>+ Set Key</span>
              </button>
            )}

            {isKeyConfigured && onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md"
                title="Manage keys in Settings"
              >
                Settings
              </button>
            )}
          </div>

          {/* Quick Key Entry Dropdown (if missing or requested) */}
          {showQuickKeyInput && (
            <div className="p-2.5 bg-slate-900 rounded-lg border border-amber-500/40 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-amber-300">
                  Enter {PROVIDER_LABELS[selectedProvider].name} Key:
                </span>
                <a
                  href={PROVIDER_LABELS[selectedProvider].getUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline text-[10px]"
                >
                  Get Key ↗
                </a>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="password"
                  value={quickKeyVal}
                  onChange={(e) => setQuickKeyVal(e.target.value)}
                  placeholder={`Paste ${selectedProvider} API key...`}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSaveQuickKey}
                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs shrink-0"
                >
                  Save
                </button>
              </div>
            </div>
          )}
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
                <div
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                    m.isError
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  {m.isError ? <AlertTriangle className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 space-y-2.5 ${
                  m.role === 'user'
                    ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none shadow-md'
                    : m.isError
                    ? 'bg-rose-950/40 text-rose-200 border border-rose-500/30 rounded-tl-none shadow-sm'
                    : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>

                {/* If message is error, provide action button */}
                {m.isError && onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold rounded text-[11px] border border-rose-500/40 mt-1"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Open BYOK Settings to verify key</span>
                  </button>
                )}

                {/* Proposed Picks Card */}
                {m.proposedPicks && m.proposedPicks.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Proposed Accumulator (
                        {m.proposedPicks.length} matches)
                      </span>
                      <span className="font-mono text-slate-400">
                        Total:{' '}
                        <span className="text-emerald-400 font-bold">
                          {calculateAccumulatorOdds(m.proposedPicks)}x
                        </span>
                      </span>
                    </div>

                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {m.proposedPicks.map((pick, i) => (
                        <div
                          key={`${pick.gameId}_${i}`}
                          className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/60 flex items-center justify-between text-[11px]"
                        >
                          <div className="truncate mr-2">
                            <span className="text-white font-medium">
                              {pick.homeTeam} vs {pick.awayTeam}
                            </span>
                            <div className="text-[10px] text-slate-400 truncate">
                              {pick.marketName}:{' '}
                              <span className="text-emerald-400 font-bold">
                                {pick.pick}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-white shrink-0 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                            {pick.odd.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons on proposed picks */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => onLoadSlip(m.proposedPicks!)}
                        className="flex-1 py-1.5 px-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-all flex items-center justify-center gap-1 text-[11px] shadow-sm"
                      >
                        <ArrowRight className="w-3 h-3" /> Replace Slip
                      </button>
                      <button
                        type="button"
                        onClick={() => onAppendToSlip(m.proposedPicks!)}
                        className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-all flex items-center justify-center gap-1 text-[11px]"
                      >
                        <Plus className="w-3 h-3" /> Add to Current
                      </button>
                      {user && (
                        <button
                          type="button"
                          onClick={() => handleSavePicksAsSlip(m.proposedPicks!)}
                          className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold rounded-lg transition-all flex items-center justify-center gap-1 text-[11px]"
                          title="Save this accumulator"
                        >
                          <BookmarkPlus className="w-3 h-3" /> Save Slip
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 font-bold shadow-md">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 text-xs justify-start items-center">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>
                  Querying {PROVIDER_LABELS[selectedProvider].name} ({selectedModel})...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Carousel */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/60 overflow-x-auto whitespace-nowrap flex gap-1.5 no-scrollbar">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              disabled={loading}
              className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 text-[11px] border border-slate-800 transition-colors shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
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
              placeholder={
                isKeyConfigured
                  ? `Ask ${PROVIDER_LABELS[selectedProvider].name} about fixtures, odds, or accas...`
                  : `Please configure ${PROVIDER_LABELS[selectedProvider].name} API key above...`
              }
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className="p-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 rounded-xl transition-all shadow-md active:scale-95 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

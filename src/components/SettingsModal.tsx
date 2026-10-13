'use client';

import React, { useState, useEffect } from 'react';
import { AIProvider, ByokKeys } from '@/types';
import {
  getByokKeys,
  saveByokKeys,
  resetByokKeys,
  validateKeyFormat,
  PROVIDER_LABELS,
  POPULAR_MODELS,
  hasActiveAiKey,
  hasSportsDataKeys,
} from '@/lib/byokStorage';
import {
  X,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Cpu,
  Database,
  Trash2,
  Save,
  Check,
  Sparkles,
  Lock,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProvider?: AIProvider;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialProvider,
}) => {
  const [keys, setKeys] = useState<ByokKeys>(getByokKeys());
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'sports'>('ai');

  useEffect(() => {
    if (isOpen) {
      const current = getByokKeys();
      if (initialProvider) {
        current.aiProvider = initialProvider;
      }
      setKeys(current);
      setSaveSuccess(false);
    }
  }, [isOpen, initialProvider]);

  if (!isOpen) return null;

  const toggleShow = (field: string) => {
    setShowKeys((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleProviderSelect = (provider: AIProvider) => {
    const defaultModel = PROVIDER_LABELS[provider].defaultModel;
    setKeys((prev) => ({
      ...prev,
      aiProvider: provider,
      ...(provider === 'gemini' && !prev.geminiModel ? { geminiModel: defaultModel } : {}),
      ...(provider === 'openrouter' && !prev.openrouterModel ? { openrouterModel: defaultModel } : {}),
      ...(provider === 'mistral' && !prev.mistralModel ? { mistralModel: defaultModel } : {}),
    }));
  };

  const handleSave = () => {
    saveByokKeys({
      ...keys,
      hasSkippedOnboarding: true,
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1000);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all your stored API keys?')) {
      resetByokKeys();
      setKeys(getByokKeys());
    }
  };

  const activeAiValid = hasActiveAiKey(keys);
  const sportsValid = hasSportsDataKeys(keys);

  const activeProvider = keys.aiProvider;
  const activeValidation = validateKeyFormat(
    activeProvider,
    activeProvider === 'gemini'
      ? keys.geminiKey
      : activeProvider === 'openrouter'
      ? keys.openrouterKey
      : keys.mistralKey
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-lg font-bold text-white flex items-center gap-2">
                Bring Your Own Key (BYOK) Settings
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Secure Local Storage
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Keys remain in your private browser memory. Never shared or stored on remote servers.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Highlights */}
        <div className="bg-slate-950/60 px-6 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${activeAiValid ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300 font-medium">AI Engine:</span>
              <span className={activeAiValid ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {activeAiValid ? `${PROVIDER_LABELS[activeProvider].name} Ready` : 'Key Required (Guest Mode)'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${sportsValid ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              <span className="text-slate-300 font-medium">Sports Data:</span>
              <span className={sportsValid ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {sportsValid ? 'Custom Feed Active' : 'Default / Test Feed'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'ai'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 inline mr-1" /> AI Model Keys
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sports')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'sports'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5 inline mr-1" /> Sports Data Keys
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300 text-sm">
          {activeTab === 'ai' ? (
            <div className="space-y-6">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                  Select Active AI Model Provider
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['gemini', 'openrouter', 'mistral'] as AIProvider[]).map((prov) => {
                    const info = PROVIDER_LABELS[prov];
                    const isSelected = activeProvider === prov;
                    const hasKey = Boolean(
                      prov === 'gemini'
                        ? keys.geminiKey?.trim()
                        : prov === 'openrouter'
                        ? keys.openrouterKey?.trim()
                        : keys.mistralKey?.trim()
                    );

                    return (
                      <button
                        key={prov}
                        type="button"
                        onClick={() => handleProviderSelect(prov)}
                        className={`relative p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-950/30 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                            : 'bg-slate-800/40 border-slate-700 hover:border-slate-600 hover:bg-slate-800/80'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-bold text-sm ${isSelected ? 'text-emerald-400' : 'text-white'}`}>
                              {info.name}
                            </span>
                            {hasKey && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Key stored" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">{info.tag}</p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                          <span className={hasKey ? 'text-emerald-400' : 'text-amber-400/90'}>
                            {hasKey ? 'Key Configured' : 'Needs Key'}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Provider Key Inputs */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-semibold text-white">
                      {PROVIDER_LABELS[activeProvider].name} Configuration
                    </h3>
                  </div>
                  <a
                    href={PROVIDER_LABELS[activeProvider].getUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline underline-offset-2"
                  >
                    Get API Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* API Key Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {PROVIDER_LABELS[activeProvider].name} API Key
                    </label>
                    {activeValidation.valid && (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {activeValidation.message}
                      </span>
                    )}
                    {!activeValidation.valid && (
                      <span className="text-[11px] text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {activeValidation.message}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showKeys[activeProvider] ? 'text' : 'password'}
                      value={
                        activeProvider === 'gemini'
                          ? keys.geminiKey
                          : activeProvider === 'openrouter'
                          ? keys.openrouterKey
                          : keys.mistralKey
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeProvider === 'gemini') setKeys((p) => ({ ...p, geminiKey: val }));
                        else if (activeProvider === 'openrouter') setKeys((p) => ({ ...p, openrouterKey: val }));
                        else setKeys((p) => ({ ...p, mistralKey: val }));
                      }}
                      placeholder={`Paste your ${PROVIDER_LABELS[activeProvider].name} key here...`}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShow(activeProvider)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showKeys[activeProvider] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Model Selector for Active Provider */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Preferred Model
                  </label>
                  <select
                    value={
                      activeProvider === 'gemini'
                        ? keys.geminiModel || PROVIDER_LABELS.gemini.defaultModel
                        : activeProvider === 'openrouter'
                        ? keys.openrouterModel || PROVIDER_LABELS.openrouter.defaultModel
                        : keys.mistralModel || PROVIDER_LABELS.mistral.defaultModel
                    }
                    onChange={(e) => {
                      const m = e.target.value;
                      if (activeProvider === 'gemini') setKeys((p) => ({ ...p, geminiModel: m }));
                      else if (activeProvider === 'openrouter') setKeys((p) => ({ ...p, openrouterModel: m }));
                      else setKeys((p) => ({ ...p, mistralModel: m }));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {POPULAR_MODELS[activeProvider].map((mod) => (
                      <option key={mod.id} value={mod.id}>
                        {mod.label} ({mod.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sports Data Keys */}
              <div>
                <h3 className="font-bold text-white text-base mb-1 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" /> Sports Data API Credentials
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Power real-time team statistics, historical Head-to-Head (H2H) results, and squad injury analysis.
                </p>
              </div>

              {/* TheSportsDB */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white text-xs block">THESPORTSDB_API_KEY</span>
                    <span className="text-[11px] text-slate-400">Head-to-head match history & team form scores</span>
                  </div>
                  <a
                    href="https://www.thesportsdb.com/api.php"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline underline-offset-2"
                  >
                    Get Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={showKeys.thesportsdb ? 'text' : 'password'}
                    value={keys.theSportsDbKey}
                    onChange={(e) => setKeys((p) => ({ ...p, theSportsDbKey: e.target.value }))}
                    placeholder="Enter key (leave empty to use default free tier '3')"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow('thesportsdb')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showKeys.thesportsdb ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tip: Key &apos;3&apos; is the public free tier for testing; a Patreon key unlocks full live league depth.
                </p>
              </div>

              {/* API-FOOTBALL */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white text-xs block">API_FOOTBALL_KEY</span>
                    <span className="text-[11px] text-slate-400">RapidAPI / api-sports key for squad injuries & lineup drag</span>
                  </div>
                  <a
                    href="https://www.api-football.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline underline-offset-2"
                  >
                    Get Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={showKeys.apifootball ? 'text' : 'password'}
                    value={keys.apiFootballKey}
                    onChange={(e) => setKeys((p) => ({ ...p, apiFootballKey: e.target.value }))}
                    placeholder="Paste your RapidAPI or API-Football key..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow('apifootball')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showKeys.apifootball ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Guarantee Note */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200 mb-0.5">Zero-Telemetry Privacy Guarantee</p>
              <p>
                All BYOK keys are held in your browser&apos;s localStorage and transmitted only over encrypted TLS directly to the designated AI endpoints. No third-party data tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All Keys
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-md ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold'
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Keys Saved!
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Save Keys & Unlock
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

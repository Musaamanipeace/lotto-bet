'use client';

import React, { useState } from 'react';
import { AIProvider, ByokKeys } from '@/types';
import {
  getByokKeys,
  saveByokKeys,
  PROVIDER_LABELS,
  validateKeyFormat,
} from '@/lib/byokStorage';
import {
  Sparkles,
  Key,
  Shield,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Dices,
  Lock,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validationMsg, setValidationMsg] = useState<{ valid: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleKeyChange = (val: string) => {
    setKeyInput(val);
    if (val.trim()) {
      setValidationMsg(validateKeyFormat(provider, val));
    } else {
      setValidationMsg(null);
    }
  };

  const handleSaveAndUnlock = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setValidationMsg({ valid: false, message: 'Please paste a valid key or choose Skip.' });
      return;
    }

    const patch: Partial<ByokKeys> = {
      aiProvider: provider,
      hasSkippedOnboarding: true,
      ...(provider === 'gemini' ? { geminiKey: trimmed } : {}),
      ...(provider === 'openrouter' ? { openrouterKey: trimmed } : {}),
      ...(provider === 'mistral' ? { mistralKey: trimmed } : {}),
    };

    saveByokKeys(patch);
    onClose();
  };

  const handleSkip = () => {
    saveByokKeys({ hasSkippedOnboarding: true });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Glow & Badge */}
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-1">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 id="onboarding-modal-title" className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Welcome to LottoBet BYOK
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Unlock unlimited AI Accumulator generation, intelligent H2H analysis, and multi-bookie code conversions with your own private API key.
            </p>
          </div>

          {/* Quick Provider Picker */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 text-center">
              1. Choose Your AI Provider
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {(['gemini', 'openrouter', 'mistral'] as AIProvider[]).map((p) => {
                const info = PROVIDER_LABELS[p];
                const active = provider === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setProvider(p);
                      setKeyInput('');
                      setValidationMsg(null);
                    }}
                    className={`py-2.5 px-2 rounded-xl border text-center transition-all ${
                      active
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500'
                        : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-xs sm:text-sm">{info.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{info.tag}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300">
                2. Paste {PROVIDER_LABELS[provider].name} API Key
              </label>
              <a
                href={PROVIDER_LABELS[provider].getUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline underline-offset-2"
              >
                Get Free Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder={`Paste your ${PROVIDER_LABELS[provider].name} key here...`}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-xs sm:text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {validationMsg && (
              <div
                className={`text-xs flex items-center gap-1.5 ${
                  validationMsg.valid ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {validationMsg.valid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{validationMsg.message}</span>
              </div>
            )}
          </div>

          {/* Privacy Note */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Your keys remain strictly in local browser storage. You can change providers or add SportsDB keys at any time in Settings.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleSaveAndUnlock}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99]"
            >
              <span>Save Key & Unlock All AI Capabilities</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs text-slate-400 hover:text-slate-200 py-1.5 px-3 rounded-lg hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
              >
                <Dices className="w-3.5 h-3.5 text-amber-400" />
                <span>Skip For Now (Continue as Guest)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 py-1.5 px-3 rounded-lg hover:bg-slate-800/60 transition-colors"
              >
                Advanced Settings & Sports Keys →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

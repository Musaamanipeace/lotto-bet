'use client';

import React from 'react';
import { Key, Lock, ArrowRight, X, ShieldAlert, Sparkles } from 'lucide-react';

interface KeyGuardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  featureName: string;
  description?: string;
}

export const KeyGuardModal: React.FC<KeyGuardModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  featureName,
  description,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyguard-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl p-6 text-center space-y-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
          <Lock className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 id="keyguard-modal-title" className="text-lg font-black text-white">
            API Key Required
          </h2>
          <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold text-xs mb-1">
            {featureName} is locked in Guest Mode
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {description ||
              `To execute ${featureName}, bring your own private API key (Google Gemini, OpenRouter, or Mistral). Keys are stored 100% locally on your device.`}
          </p>
        </div>

        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98"
          >
            <Key className="w-4 h-4" />
            <span>Open Settings & Configure Key</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            Continue with Random Picks
          </button>
        </div>
      </div>
    </div>
  );
};

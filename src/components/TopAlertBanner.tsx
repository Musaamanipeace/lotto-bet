'use client';

import React from 'react';
import { Settings, AlertTriangle, Key, Sparkles, ArrowRight } from 'lucide-react';

interface TopAlertBannerProps {
  isMissingKeys: boolean;
  onOpenSettings: () => void;
}

export const TopAlertBanner: React.FC<TopAlertBannerProps> = ({
  isMissingKeys,
  onOpenSettings,
}) => {
  if (!isMissingKeys) return null;

  return (
    <aside
      aria-label="API keys notice"
      className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-b border-amber-500/30 text-amber-200 px-4 py-2.5 sm:py-2 text-xs transition-all relative z-30"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-amber-300 mr-1.5">Guest Mode Active:</span>
            <span className="text-amber-200/90">
              API keys are missing. AI Picks, advanced H2H analysis, and multi-bookie conversion are locked to Random Picks only.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm active:scale-95 text-xs"
        >
          <Key className="w-3.5 h-3.5" />
          <span>Configure Keys in Settings</span>
          <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
        </button>
      </div>
    </aside>
  );
};

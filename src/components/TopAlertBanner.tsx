'use client';

import React from 'react';
import { Info, ShieldCheck } from 'lucide-react';

interface TopAlertBannerProps {
  isMissingKeys: boolean;
  serverAiConfigured?: boolean;
  onOpenSettings: () => void;
}

export const TopAlertBanner: React.FC<TopAlertBannerProps> = ({
  isMissingKeys,
  serverAiConfigured = false,
  onOpenSettings,
}) => {
  // Guest mode (no local key + no server key): keep guest-mode features locked but DO NOT
  // prompt the user to configure keys — server env keys are used automatically when present.
  if (!isMissingKeys) return null;

  const serverHandled = serverAiConfigured;

  return (
    <aside
      aria-label="Guest mode notice"
      className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-b border-amber-500/30 text-amber-200 px-4 py-2.5 sm:py-2 text-xs transition-all relative z-30"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 shrink-0">
            {serverHandled ? <ShieldCheck className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          </div>
          <div>
            <span className="font-bold text-amber-300 mr-1.5">
              {serverHandled ? 'Server AI Active:' : 'Guest Mode Active:'}
            </span>
            <span className="text-amber-200/90">
              {serverHandled
                ? 'AI Picks run off server-configured keys. Sign in and add a personal key in Settings to override.'
                : 'AI Picks, advanced H2H analysis, and multi-bookie conversion are limited to Random Picks.'}
            </span>
          </div>
        </div>

        {serverHandled ? null : (
          <button
            type="button"
            onClick={onOpenSettings}
            className="shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm active:scale-95 text-xs"
          >
            Configure Keys in Settings
          </button>
        )}
      </div>
    </aside>
  );
};

'use client';

import { useEffect, useState } from 'react';
import {
  getClientSettings,
  saveClientSettings,
  SUPPORTED_FREE_MODELS,
  type ClientAiSettings,
} from '@/lib/client-settings.ts';

export function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState<ClientAiSettings>(getClientSettings());
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (open) {
      setSettings(getClientSettings());
      setTestStatus(null);
    }
  }, [open]);

  if (!open) return null;

  const handleModelChange = (modelId: string) => {
    const found = SUPPORTED_FREE_MODELS.find((m) => m.id === modelId);
    if (found) {
      const next = saveClientSettings({
        selectedModel: found.id,
        provider: found.provider,
      });
      setSettings(next);
      triggerSaved();
    }
  };

  const handleTimeoutChange = (timeoutSeconds: number) => {
    setSettings((prev) => ({ ...prev, timeoutSeconds }));
  };

  const triggerSaved = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleSaveAll = () => {
    saveClientSettings(settings);
    triggerSaved();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestStatus(null);
    saveClientSettings(settings);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), (settings.timeoutSeconds || 35) * 1000);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ai-provider': settings.provider,
          'x-ai-model': settings.selectedModel,
        },
        body: JSON.stringify({
          message: 'Ping. Respond with one word: Ready.',
          history: [],
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestStatus(`✅ Success! Model responded via ${data.provider} (${data.model}): "${data.reply?.slice(0, 50)}"`);
      } else {
        setTestStatus(`❌ ${data.error || data.message || `HTTP ${res.status}`}`);
      }
    } catch (err: unknown) {
      const e = err as Error;
      if (e.name === 'AbortError') {
        setTestStatus(`❌ Request timed out after ${settings.timeoutSeconds}s. Please check network or choose another model.`);
      } else {
        setTestStatus(`❌ Connection error: ${e.message || String(e)}`);
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="AI Model & Timeout Settings"
    >
      <div
        className="glass max-h-[90vh] w-full max-w-2xl overflow-hidden bg-navy-900/95 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                AI Model & Timeout Settings
              </h2>
              <p className="text-xs text-slate-400">
                Choose your preferred AI model and request timeout. Upstream credentials are managed securely via server environment variables.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {savedNotice && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-5 py-2 text-xs text-emerald-300">
            ✓ Settings saved.
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Section 1: Free Model Selection */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-sm font-semibold text-white">
                Active Free AI Model
              </label>
              <span className="text-[11px] text-cyan-300 uppercase tracking-wider font-semibold">
                Provider: {settings.provider}
              </span>
            </div>
            <select
              className="field w-full text-sm py-2"
              value={settings.selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              <optgroup label="Google Gemini (Free Tier)">
                {SUPPORTED_FREE_MODELS.filter((m) => m.provider === 'gemini').map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.desc}
                  </option>
                ))}
              </optgroup>
              <optgroup label="OpenRouter (Free Models)">
                {SUPPORTED_FREE_MODELS.filter((m) => m.provider === 'openrouter').map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.desc}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Mistral AI (Free Tier)">
                {SUPPORTED_FREE_MODELS.filter((m) => m.provider === 'mistral').map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.desc}
                  </option>
                ))}
              </optgroup>
            </select>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Switches between Gemini, OpenRouter free models, or Mistral using server-configured environment credentials.
            </p>
          </div>

          {/* Section 2: Hard Timeout Setting */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Hard Request Timeout</p>
              <p className="text-xs text-slate-400">
                Prevents infinite hanging if upstream API rate-limits or pauses.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={10}
                max={120}
                className="field w-20 text-center text-xs py-1"
                value={settings.timeoutSeconds}
                onChange={(e) => handleTimeoutChange(Number(e.target.value) || 35)}
              />
              <span className="text-xs text-slate-400">seconds</span>
            </div>
          </div>

          {/* Connection Test & Output */}
          {testStatus && (
            <div
              className={`rounded-lg border p-3 text-xs ${
                testStatus.startsWith('✅')
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-amber-500/40 bg-amber-500/15 text-amber-200'
              }`}
            >
              {testStatus}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-white/10 p-4 flex flex-wrap items-center justify-between gap-2 bg-navy-950/60">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="btn-ghost text-xs text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10"
          >
            {testing ? 'Testing connection…' : '⚡ Test Selected Model'}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveAll}
              className="btn-gold text-xs"
            >
              Save Settings
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

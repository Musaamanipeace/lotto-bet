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
  const [showKeys, setShowKeys] = useState({
    gemini: false,
    openrouter: false,
    mistral: false,
    footballData: false,
  });
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

  const handleKeyChange = <K extends keyof ClientAiSettings>(field: K, value: ClientAiSettings[K]) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
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
          ...(settings.geminiApiKey ? { 'x-gemini-key': settings.geminiApiKey } : {}),
          ...(settings.openrouterApiKey ? { 'x-openrouter-key': settings.openrouterApiKey } : {}),
          ...(settings.mistralApiKey ? { 'x-mistral-key': settings.mistralApiKey } : {}),
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
      aria-label="Client Settings & AI Configuration"
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
                Client AI & API Settings
              </h2>
              <p className="text-xs text-slate-400">
                Configure your free AI models and API keys. Keys are stored in this browser and cleared on sign-out.
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
            ✓ Settings saved to browser storage.
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
              Switches between Gemini, OpenRouter free models, or Mistral. Your choice is persisted across reloads.
            </p>
          </div>

          {/* Section 2: Client-side AI API Keys */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3.5">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Client AI Provider Keys
              </h3>
              <p className="text-xs text-slate-400">
                Keys are kept in your browser only and are wiped completely when you sign out. They are never sent to the server except as temporary request headers.
              </p>
            </div>

            {/* Gemini Key */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <label className="text-slate-300 font-medium">Gemini API Key</label>
                <button
                  type="button"
                  onClick={() => setShowKeys((p) => ({ ...p, gemini: !p.gemini }))}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  {showKeys.gemini ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showKeys.gemini ? 'text' : 'password'}
                className="field w-full text-xs font-mono"
                placeholder="AIzaSy..."
                value={settings.geminiApiKey}
                onChange={(e) => handleKeyChange('geminiApiKey', e.target.value)}
              />
            </div>

            {/* OpenRouter Key */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <label className="text-slate-300 font-medium">OpenRouter API Key</label>
                <button
                  type="button"
                  onClick={() => setShowKeys((p) => ({ ...p, openrouter: !p.openrouter }))}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  {showKeys.openrouter ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showKeys.openrouter ? 'text' : 'password'}
                className="field w-full text-xs font-mono"
                placeholder="sk-or-v1-..."
                value={settings.openrouterApiKey}
                onChange={(e) => handleKeyChange('openrouterApiKey', e.target.value)}
              />
            </div>

            {/* Mistral Key */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <label className="text-slate-300 font-medium">Mistral API Key</label>
                <button
                  type="button"
                  onClick={() => setShowKeys((p) => ({ ...p, mistral: !p.mistral }))}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  {showKeys.mistral ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showKeys.mistral ? 'text' : 'password'}
                className="field w-full text-xs font-mono"
                placeholder="mistral-api-key..."
                value={settings.mistralApiKey}
                onChange={(e) => handleKeyChange('mistralApiKey', e.target.value)}
              />
            </div>
          </div>

          {/* Section 3: Football Stats Key */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Football Data API Key (Optional Stats)
              </h3>
              <p className="text-xs text-slate-400">
                Powers verified team statistics and live match results. Free keys available at football-data.org.
              </p>
            </div>
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <label className="text-slate-300 font-medium">Football-Data.org Token</label>
                <button
                  type="button"
                  onClick={() => setShowKeys((p) => ({ ...p, footballData: !p.footballData }))}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  {showKeys.footballData ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showKeys.footballData ? 'text' : 'password'}
                className="field w-full text-xs font-mono"
                placeholder="e.g. 847d8f9c1..."
                value={settings.footballDataApiKey}
                onChange={(e) => handleKeyChange('footballDataApiKey', e.target.value)}
              />
            </div>
          </div>

          {/* Section 4: Hard Timeout Setting */}
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
                onChange={(e) => handleKeyChange('timeoutSeconds', Number(e.target.value) || 35)}
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

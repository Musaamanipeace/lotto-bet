'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import {
  applyServerSnapshot,
  getClientPreferenceHeaders,
  getClientSettings,
  saveClientSettings,
  SUPPORTED_FREE_MODELS,
  type ApiKeyProvider,
  type ClientAiSettings,
  type ClientSettingsSnapshot,
  type MaskedKeyStatus,
} from '@/lib/client-settings.ts';

type KeyFieldConfig = {
  provider: ApiKeyProvider;
  label: string;
  placeholder: string;
  section: 'ai' | 'stats';
};

const KEY_FIELDS: KeyFieldConfig[] = [
  { provider: 'gemini', label: 'Gemini API Key', placeholder: 'AIzaSy…', section: 'ai' },
  { provider: 'openrouter', label: 'OpenRouter API Key', placeholder: 'sk-or-v1-…', section: 'ai' },
  { provider: 'mistral', label: 'Mistral API Key', placeholder: 'mistral-api-key…', section: 'ai' },
  { provider: 'football_data', label: 'Football-Data.org Token', placeholder: '847d8f9c1…', section: 'stats' },
  { provider: 'api_football', label: 'API-Football Key (api-sports.io)', placeholder: 'a1b2c3d4…', section: 'stats' },
];

const EMPTY_INPUTS: Record<ApiKeyProvider, string> = {
  gemini: '',
  openrouter: '',
  mistral: '',
  football_data: '',
  api_football: '',
};

const EMPTY_SHOW: Record<ApiKeyProvider, boolean> = {
  gemini: false,
  openrouter: false,
  mistral: false,
  football_data: false,
  api_football: false,
};

export function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, openAuthWithSettingsReturn } = useAuth();
  const [settings, setSettings] = useState<ClientAiSettings>(getClientSettings());
  const [snapshot, setSnapshot] = useState<ClientSettingsSnapshot | null>(null);
  const [keyInputs, setKeyInputs] = useState<Record<ApiKeyProvider, string>>(EMPTY_INPUTS);
  const [showKeys, setShowKeys] = useState<Record<ApiKeyProvider, boolean>>(EMPTY_SHOW);
  const [loadingServer, setLoadingServer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState<ApiKeyProvider | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const loadFromServer = useCallback(async () => {
    if (!user) {
      setSnapshot(null);
      setSettings(getClientSettings());
      return;
    }
    setLoadingServer(true);
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        const snap = applyServerSnapshot(data);
        setSnapshot(snap);
        setSettings(snap.preferences);
      } else {
        setNotice({ kind: 'err', text: data?.error ?? `Failed to load settings (HTTP ${res.status})` });
      }
    } catch (err) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoadingServer(false);
    }
  }, [user]);

  useEffect(() => {
    if (!open) return;
    setTestStatus(null);
    setNotice(null);
    setKeyInputs({ ...EMPTY_INPUTS });
    setShowKeys({ ...EMPTY_SHOW });
    void loadFromServer();
  }, [open, user, loadFromServer]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleModelChange = (modelId: string) => {
    const found = SUPPORTED_FREE_MODELS.find((m) => m.id === modelId);
    if (!found) return;
    const next = saveClientSettings({
      selectedModel: found.id,
      provider: found.provider,
    });
    setSettings(next);
  };

  async function saveToServer(overridePrefs?: ClientAiSettings): Promise<boolean> {
    if (!user) {
      saveClientSettings(overridePrefs ?? settings);
      setNotice({ kind: 'ok', text: 'Preferences saved for this session (sign in to persist across reloads and save API keys).' });
      return true;
    }

    setSaving(true);
    setNotice(null);
    try {
      const apiKeysPayload: Partial<Record<ApiKeyProvider, string>> = {};
      (Object.keys(keyInputs) as ApiKeyProvider[]).forEach((p) => {
        const trimmed = keyInputs[p].trim();
        if (trimmed) apiKeysPayload[p] = trimmed;
      });

      const prefs = overridePrefs ?? settings;
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: prefs,
          apiKeys: apiKeysPayload,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setNotice({ kind: 'err', text: data?.error ?? `Save failed (HTTP ${res.status})` });
        return false;
      }

      const snap = applyServerSnapshot(data);
      setSnapshot(snap);
      setSettings(snap.preferences);
      setKeyInputs({ ...EMPTY_INPUTS });
      setNotice({
        kind: 'ok',
        text:
          Object.keys(apiKeysPayload).length > 0
            ? 'Encrypted API keys & preferences saved to your account.'
            : 'Preferences saved to your account.',
      });
      return true;
    } catch (err) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : String(err) });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteKey(provider: ApiKeyProvider) {
    if (!user) return;
    setDeletingProvider(provider);
    setNotice(null);
    try {
      const res = await fetch(`/api/settings?provider=${encodeURIComponent(provider)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setNotice({ kind: 'err', text: data?.error ?? `Remove failed (HTTP ${res.status})` });
        return;
      }
      const snap = applyServerSnapshot(data);
      setSnapshot(snap);
      setKeyInputs((prev) => ({ ...prev, [provider]: '' }));
      setNotice({ kind: 'ok', text: `Removed stored ${provider.replace('_', '-')} key.` });
    } catch (err) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setDeletingProvider(null);
    }
  }

  async function handleTestConnection() {
    if (!user) {
      setTestStatus('❌ Sign in and save an AI provider key before testing a model.');
      return;
    }
    const hasPendingKey = (['gemini', 'openrouter', 'mistral'] as ApiKeyProvider[]).some(
      (p) => keyInputs[p].trim().length > 0,
    );
    if (hasPendingKey) {
      const ok = await saveToServer();
      if (!ok) return;
    } else if (!snapshot?.aiKeysConfigured) {
      setTestStatus('❌ Enter and save a Gemini, OpenRouter, or Mistral API key first.');
      return;
    }

    setTesting(true);
    setTestStatus(null);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), (settings.timeoutSeconds || 35) * 1000);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getClientPreferenceHeaders(settings),
        },
        body: JSON.stringify({
          message: 'Ping. Respond with one word: Ready.',
          history: [],
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setTestStatus(`✅ Success! Model responded via ${data.provider} (${data.model}): "${String(data.reply ?? '').slice(0, 60)}"`);
      } else {
        setTestStatus(`❌ ${data?.error || data?.message || `HTTP ${res.status}`}`);
      }
    } catch (err: unknown) {
      const e = err as Error;
      if (e.name === 'AbortError') {
        setTestStatus(`❌ Request timed out after ${settings.timeoutSeconds}s.`);
      } else {
        setTestStatus(`❌ Connection error: ${e.message || String(e)}`);
      }
    } finally {
      setTesting(false);
    }
  }

  function renderKeyRow(cfg: KeyFieldConfig) {
    const status: MaskedKeyStatus | undefined = snapshot?.keys?.[cfg.provider];
    const isSet = Boolean(status?.isSet);
    return (
      <div key={cfg.provider} className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <label className="text-slate-300 font-medium" htmlFor={`key-input-${cfg.provider}`}>
              {cfg.label}
            </label>
            {isSet ? (
              <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                Saved ••••{status?.last4 ?? '****'}
              </span>
            ) : (
              <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-400">
                Not set
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowKeys((p) => ({ ...p, [cfg.provider]: !p[cfg.provider] }))}
              className="text-[11px] text-cyan-400 hover:underline"
            >
              {showKeys[cfg.provider] ? 'Hide' : 'Show'}
            </button>
            {isSet && (
              <button
                type="button"
                disabled={deletingProvider === cfg.provider}
                onClick={() => void handleDeleteKey(cfg.provider)}
                className="text-[11px] text-rose-400 hover:underline disabled:opacity-50"
              >
                {deletingProvider === cfg.provider ? 'Removing…' : 'Remove'}
              </button>
            )}
          </div>
        </div>
        <input
          id={`key-input-${cfg.provider}`}
          type={showKeys[cfg.provider] ? 'text' : 'password'}
          autoComplete="off"
          className="field w-full text-xs font-mono"
          placeholder={isSet ? `Enter new key to replace ••••${status?.last4 ?? '****'}` : cfg.placeholder}
          value={keyInputs[cfg.provider]}
          onChange={(e) => setKeyInputs((p) => ({ ...p, [cfg.provider]: e.target.value }))}
        />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Settings & AI Configuration"
    >
      <div
        className="glass max-h-[90vh] w-full max-w-2xl overflow-hidden bg-navy-900/95 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>⚙️</span>
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Settings & AI Configuration
              </h2>
              <p className="text-xs text-slate-400">
                {user
                  ? 'API keys are encrypted server-side (AES-256-GCM) and never stored in browser storage.'
                  : 'Customize preferences for this session, or sign in to save encrypted API keys and use AI.'}
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

        {/* Notices */}
        {notice && (
          <div
            className={`border-b px-5 py-2 text-xs ${
              notice.kind === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
                : 'border-rose-500/30 bg-rose-500/15 text-rose-200'
            }`}
            role="status"
          >
            {notice.text}
          </div>
        )}

        {/* Guest CTA */}
        {!user && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-amber-200">
                Sign in to save API keys and use AI
              </p>
              <p className="text-[11px] text-amber-100/80">
                Your saved keys stay encrypted under your account and survive sign-out across devices.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openAuthWithSettingsReturn('login');
                }}
                className="btn-emerald px-3 py-1.5 text-xs font-semibold"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openAuthWithSettingsReturn('signup');
                }}
                className="btn-gold px-3 py-1.5 text-xs font-semibold"
              >
                Sign up
              </button>
            </div>
          </div>
        )}

        {/* Signed-in persistence mode banner when running without Postgres */}
        {user && snapshot?.persistenceMode === 'memory' && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-5 py-2 text-[11px] text-amber-200">
            ⚠️ Server is running in encrypted in-memory mode (no DATABASE_URL configured). Keys will reset if the server restarts.
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Model selection (available to both guests and signed-in users) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-sm font-semibold text-white" htmlFor="settings-model-select">
                Preferred AI Model
              </label>
              <span className="text-[11px] text-cyan-300 uppercase tracking-wider font-semibold">
                Provider: {settings.provider}
              </span>
            </div>
            <select
              id="settings-model-select"
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
              {user
                ? 'Saved with your account preferences.'
                : 'Stored in memory for this session only.'}
            </p>
          </div>

          {/* Signed-in encrypted API keys */}
          {user && (
            <>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      AI Provider Keys (Encrypted Server-Side)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Only masked last-4 digits are displayed after saving. Raw keys are never sent back to the browser.
                    </p>
                  </div>
                  {loadingServer && (
                    <span className="text-[11px] text-slate-400">Syncing…</span>
                  )}
                </div>
                {KEY_FIELDS.filter((f) => f.section === 'ai').map(renderKeyRow)}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Football Stats & Results Keys (Optional)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Used server-side for verified team form and match result checking.
                  </p>
                </div>
                {KEY_FIELDS.filter((f) => f.section === 'stats').map(renderKeyRow)}
              </div>
            </>
          )}

          {/* Hard timeout (non-secret preference available to guests and users) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Request Timeout</p>
              <p className="text-xs text-slate-400">
                Caps how long AI requests wait before falling back gracefully.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={10}
                max={120}
                className="field w-20 text-center text-xs py-1"
                value={settings.timeoutSeconds}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    timeoutSeconds: Math.min(120, Math.max(10, Number(e.target.value) || 35)),
                  }))
                }
              />
              <span className="text-xs text-slate-400">seconds</span>
            </div>
          </div>

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

        {/* Footer */}
        <div className="border-t border-white/10 p-4 flex flex-wrap items-center justify-between gap-2 bg-navy-950/60">
          {user ? (
            <button
              type="button"
              onClick={() => void handleTestConnection()}
              disabled={testing || saving}
              className="btn-ghost text-xs text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10"
            >
              {testing ? 'Testing connection…' : '⚡ Test Selected Model'}
            </button>
          ) : (
            <span className="text-xs text-slate-400">Sign in required to test AI models</span>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveToServer()}
              className="btn-gold text-xs"
            >
              {saving ? 'Saving…' : user ? 'Save Settings' : 'Save Preferences'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost text-xs">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

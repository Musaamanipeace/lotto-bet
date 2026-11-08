'use client';

import {
  STORAGE_KEYS,
  getActiveStorageUserId,
  scopedStorageKey,
} from './client-storage.ts';

/**
 * Client-side AI settings (Bring Your Own Key — BYOK).
 *
 * Strictly for signed-in users:
 * - Unsigned-in (guest) users have no Settings panel, cannot save or read keys, and cannot use AI features.
 * - Signed-in users store their own BYOK keys ONLY in user-scoped browser localStorage
 *   (`lb_client_ai_settings_v1:<userId>`) — never in the database — and pass them via request headers.
 * - On sign-out, performFullSignOutCleanup() / clearAllUserStorage() wipes all stored keys.
 * - If a signed-in user has not submitted their BYOK key, AI actions do not execute and prompt them to submit.
 */

export type FreeAiModel = {
  id: string;
  name: string;
  provider: 'gemini' | 'openrouter' | 'mistral';
  desc: string;
  isFree: boolean;
};

export const SUPPORTED_FREE_MODELS: FreeAiModel[] = [
  // Gemini Free Tier Models
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    desc: 'Fast, high quality reasoning (recommended free model)',
    isFree: true,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    desc: 'Lightweight free model with generous quota',
    isFree: true,
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    desc: 'Next-gen experimental multimodal model',
    isFree: true,
  },

  // OpenRouter Free Models (:free suffix or auto)
  {
    id: 'openrouter/auto',
    name: 'OpenRouter Auto Router',
    provider: 'openrouter',
    desc: 'Automatically routes to best available model',
    isFree: true,
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash Exp (OpenRouter Free)',
    provider: 'openrouter',
    desc: 'Free rate-limited route via OpenRouter',
    isFree: true,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B (OpenRouter Free)',
    provider: 'openrouter',
    desc: 'High parameter open source model at zero cost',
    isFree: true,
  },
  {
    id: 'mistralai/mistral-small-3:free',
    name: 'Mistral Small 3 (OpenRouter Free)',
    provider: 'openrouter',
    desc: 'Compact European multilingual model',
    isFree: true,
  },

  // Mistral Direct Models
  {
    id: 'mistral-small-latest',
    name: 'Mistral Small Latest',
    provider: 'mistral',
    desc: 'Direct Mistral La Plateforme free tier',
    isFree: true,
  },
  {
    id: 'open-mistral-7b',
    name: 'Open Mistral 7B',
    provider: 'mistral',
    desc: 'Standard 7B open model',
    isFree: true,
  },
];

export type ClientAiSettings = {
  selectedModel: string;
  provider: 'gemini' | 'openrouter' | 'mistral';
  geminiApiKey: string;
  openrouterApiKey: string;
  mistralApiKey: string;
  footballDataApiKey: string;
  apiFootballKey: string;
  timeoutSeconds: number;
};

export const DEFAULT_CLIENT_SETTINGS: ClientAiSettings = {
  selectedModel: 'gemini-2.5-flash',
  provider: 'gemini',
  geminiApiKey: '',
  openrouterApiKey: '',
  mistralApiKey: '',
  footballDataApiKey: '',
  apiFootballKey: '',
  timeoutSeconds: 35,
};

export function getClientSettings(): ClientAiSettings {
  if (typeof window === 'undefined') return DEFAULT_CLIENT_SETTINGS;
  const userId = getActiveStorageUserId();
  if (!userId) return DEFAULT_CLIENT_SETTINGS;
  try {
    const key = scopedStorageKey(STORAGE_KEYS.CLIENT_AI_SETTINGS, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_CLIENT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CLIENT_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_CLIENT_SETTINGS;
  }
}

export function saveClientSettings(settings: Partial<ClientAiSettings>): ClientAiSettings {
  const userId = getActiveStorageUserId();
  if (!userId) return DEFAULT_CLIENT_SETTINGS;
  const current = getClientSettings();
  const next: ClientAiSettings = { ...current, ...settings };
  if (typeof window !== 'undefined') {
    try {
      const key = scopedStorageKey(STORAGE_KEYS.CLIENT_AI_SETTINGS, userId);
      localStorage.setItem(key, JSON.stringify(next));
      if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('lb_settings_changed', { detail: next }));
      }
    } catch {
      /* quota ignored */
    }
  }
  return next;
}

/**
 * Returns true only if a user is signed in AND has submitted at least one BYOK AI provider key.
 */
export function hasSubmittedByok(customSettings?: ClientAiSettings): boolean {
  if (!getActiveStorageUserId() && !customSettings) return false;
  const s = customSettings || getClientSettings();
  return Boolean(
    s.geminiApiKey?.trim() ||
      s.openrouterApiKey?.trim() ||
      s.mistralApiKey?.trim(),
  );
}

/**
 * Clears the in-memory view of secrets after logout.
 * The actual storage wipe is performed by clearAllUserStorage().
 */
export function clearClientSecrets(): void {
  // Storage is wiped by performFullSignOutCleanup() / clearAllUserStorage().
}

export function onSettingsChanged(cb: (settings: ClientAiSettings) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const ce = e as CustomEvent<ClientAiSettings>;
    if (ce.detail) cb(ce.detail);
  };
  window.addEventListener('lb_settings_changed', handler);
  return () => window.removeEventListener('lb_settings_changed', handler);
}

/** Formats client BYOK settings into headers for thin-proxy API routes */
export function getClientAiHeaders(customSettings?: ClientAiSettings): Record<string, string> {
  const s = customSettings || getClientSettings();
  const headers: Record<string, string> = {
    'x-ai-provider': s.provider,
    'x-ai-model': s.selectedModel,
  };
  if (s.geminiApiKey?.trim()) headers['x-gemini-key'] = s.geminiApiKey.trim();
  if (s.openrouterApiKey?.trim()) headers['x-openrouter-key'] = s.openrouterApiKey.trim();
  if (s.mistralApiKey?.trim()) headers['x-mistral-key'] = s.mistralApiKey.trim();
  if (s.footballDataApiKey?.trim()) headers['x-football-data-key'] = s.footballDataApiKey.trim();
  if (s.apiFootballKey?.trim()) headers['x-api-football-key'] = s.apiFootballKey.trim();
  return headers;
}

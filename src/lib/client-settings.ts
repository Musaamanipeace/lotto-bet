'use client';

import {
  STORAGE_KEYS,
  getActiveStorageUserId,
  scopedStorageKey,
} from './client-storage.ts';

/**
 * Client-side NON-SECRET preferences & server settings cache (Tasks 2 & 12).
 *
 * Security guarantees:
 * - API keys are NEVER stored in browser memory/localStorage/sessionStorage/IndexedDB or sent via HTTP headers.
 * - API keys are saved ONLY server-side, encrypted per user with AES-256-GCM (`/api/settings`).
 * - Unsigned-in (guest) users can open Settings and change non-secret preferences (in-memory for page lifetime only)
 *   and see a sign-in CTA to save API keys and use AI features.
 * - Signed-in users load masked key statuses (`isSet`, `last4`) and non-secret preferences from `GET /api/settings`.
 */

export type ApiKeyProvider = 'gemini' | 'openrouter' | 'mistral' | 'football_data' | 'api_football';

export type MaskedKeyStatus = {
  provider: ApiKeyProvider;
  isSet: boolean;
  last4: string | null;
  keyId?: string;
  updatedAt?: number;
};

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
  timeoutSeconds: number;
};

export type ClientSettingsSnapshot = {
  preferences: ClientAiSettings;
  aiKeysConfigured: boolean;
  keysConfigured: boolean;
  persistenceMode: 'postgres' | 'memory';
  keys: Record<ApiKeyProvider, MaskedKeyStatus>;
};

export const DEFAULT_CLIENT_SETTINGS: ClientAiSettings = {
  selectedModel: 'gemini-2.5-flash',
  provider: 'gemini',
  timeoutSeconds: 35,
};

const DEFAULT_KEYS: Record<ApiKeyProvider, MaskedKeyStatus> = {
  gemini: { provider: 'gemini', isSet: false, last4: null },
  openrouter: { provider: 'openrouter', isSet: false, last4: null },
  mistral: { provider: 'mistral', isSet: false, last4: null },
  football_data: { provider: 'football_data', isSet: false, last4: null },
  api_football: { provider: 'api_football', isSet: false, last4: null },
};

// In-memory store for non-secret guest prefs (Task 12) + cached server key-status flags
let guestMemorySettings: ClientAiSettings = { ...DEFAULT_CLIENT_SETTINGS };
let serverSnapshotCache: ClientSettingsSnapshot | null = null;

function notifyChanged(next: ClientAiSettings): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent('lb_settings_changed', { detail: next }));
  }
}

export function getClientSettings(): ClientAiSettings {
  if (typeof window === 'undefined') return DEFAULT_CLIENT_SETTINGS;
  const userId = getActiveStorageUserId();
  if (!userId) return { ...guestMemorySettings };
  try {
    const key = scopedStorageKey(STORAGE_KEYS.CLIENT_AI_SETTINGS, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return serverSnapshotCache?.preferences ?? DEFAULT_CLIENT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ClientAiSettings>;
    return {
      selectedModel:
        typeof parsed.selectedModel === 'string' && parsed.selectedModel.trim()
          ? parsed.selectedModel
          : DEFAULT_CLIENT_SETTINGS.selectedModel,
      provider:
        parsed.provider === 'gemini' || parsed.provider === 'openrouter' || parsed.provider === 'mistral'
          ? parsed.provider
          : DEFAULT_CLIENT_SETTINGS.provider,
      timeoutSeconds:
        typeof parsed.timeoutSeconds === 'number' && Number.isFinite(parsed.timeoutSeconds)
          ? Math.min(120, Math.max(10, Math.round(parsed.timeoutSeconds)))
          : DEFAULT_CLIENT_SETTINGS.timeoutSeconds,
    };
  } catch {
    return DEFAULT_CLIENT_SETTINGS;
  }
}

export function saveClientSettings(settings: Partial<ClientAiSettings>): ClientAiSettings {
  const userId = getActiveStorageUserId();
  const current = getClientSettings();
  const next: ClientAiSettings = {
    selectedModel: settings.selectedModel ?? current.selectedModel,
    provider: settings.provider ?? current.provider,
    timeoutSeconds: settings.timeoutSeconds ?? current.timeoutSeconds,
  };

  if (!userId) {
    // Guests hold non-secret preferences in memory for the page lifetime only (never persisted to localStorage)
    guestMemorySettings = next;
    notifyChanged(next);
    return next;
  }

  if (typeof window !== 'undefined') {
    try {
      const key = scopedStorageKey(STORAGE_KEYS.CLIENT_AI_SETTINGS, userId);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* quota ignored */
    }
  }
  if (serverSnapshotCache) {
    serverSnapshotCache = { ...serverSnapshotCache, preferences: next };
  }
  notifyChanged(next);
  return next;
}

export function getCachedServerSnapshot(): ClientSettingsSnapshot | null {
  return serverSnapshotCache;
}

export function applyServerSnapshot(payload: {
  persistenceMode?: 'postgres' | 'memory';
  aiKeysConfigured?: boolean;
  keysConfigured?: boolean;
  keys?: Record<ApiKeyProvider, MaskedKeyStatus>;
  preferences?: Partial<ClientAiSettings>;
}): ClientSettingsSnapshot {
  const prefs: ClientAiSettings = {
    selectedModel: payload.preferences?.selectedModel || DEFAULT_CLIENT_SETTINGS.selectedModel,
    provider:
      payload.preferences?.provider === 'openrouter' || payload.preferences?.provider === 'mistral'
        ? payload.preferences.provider
        : 'gemini',
    timeoutSeconds:
      typeof payload.preferences?.timeoutSeconds === 'number'
        ? payload.preferences.timeoutSeconds
        : DEFAULT_CLIENT_SETTINGS.timeoutSeconds,
  };
  const snap: ClientSettingsSnapshot = {
    persistenceMode: payload.persistenceMode === 'postgres' ? 'postgres' : 'memory',
    aiKeysConfigured: Boolean(payload.aiKeysConfigured),
    keysConfigured: Boolean(payload.keysConfigured),
    keys: payload.keys ?? DEFAULT_KEYS,
    preferences: prefs,
  };
  serverSnapshotCache = snap;
  if (getActiveStorageUserId()) {
    saveClientSettings(prefs);
  }
  return snap;
}

export async function refreshServerSettings(): Promise<ClientSettingsSnapshot | null> {
  if (!getActiveStorageUserId()) {
    serverSnapshotCache = null;
    return null;
  }
  try {
    const r = await fetch('/api/settings', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j?.ok) return null;
    return applyServerSnapshot(j);
  } catch {
    return null;
  }
}

export function hasConfiguredAiKeys(): boolean {
  if (!getActiveStorageUserId()) return false;
  return Boolean(serverSnapshotCache?.aiKeysConfigured);
}

/**
 * Resets in-memory preferences & server snapshot cache on sign-out.
 * Storage keys are wiped by performFullSignOutCleanup().
 */
export function clearClientSecrets(): void {
  guestMemorySettings = { ...DEFAULT_CLIENT_SETTINGS };
  serverSnapshotCache = null;
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

/** Non-secret preference headers only — NEVER transmits API keys */
export function getClientPreferenceHeaders(customSettings?: ClientAiSettings): Record<string, string> {
  const s = customSettings || getClientSettings();
  return {
    'x-ai-provider': s.provider,
    'x-ai-model': s.selectedModel,
  };
}

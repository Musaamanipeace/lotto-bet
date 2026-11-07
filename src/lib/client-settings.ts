'use client';

/**
 * Client-side AI settings.
 *
 * SECURITY (task 2 hardening):
 * - API keys are NEVER written to localStorage / sessionStorage / IndexedDB.
 * - Only non-secret preferences (selected model, provider, timeout) are persisted.
 * - Keys live only in memory for the lifetime of the page. They are cleared on logout
 *   via clearAllUserStorage() + the in-memory reset below.
 * - Prefer setting keys as server environment variables (GEMINI_API_KEY etc.) so the
 *   client never needs to hold them.
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
  /** In-memory only. Never persisted. */
  geminiApiKey: string;
  /** In-memory only. Never persisted. */
  openrouterApiKey: string;
  /** In-memory only. Never persisted. */
  mistralApiKey: string;
  /** In-memory only. Never persisted. */
  footballDataApiKey: string;
  /** In-memory only. Never persisted. */
  apiFootballKey: string;
  timeoutSeconds: number;
};

/** Only the non-secret fields that are safe to keep in localStorage. */
type PersistedPrefs = {
  selectedModel: string;
  provider: 'gemini' | 'openrouter' | 'mistral';
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

const STORAGE_KEY = 'lb_client_ai_settings_v1';

/** In-memory store for secrets that must never hit disk. Cleared on logout. */
let memorySecrets: Pick<
  ClientAiSettings,
  'geminiApiKey' | 'openrouterApiKey' | 'mistralApiKey' | 'footballDataApiKey' | 'apiFootballKey'
> = {
  geminiApiKey: '',
  openrouterApiKey: '',
  mistralApiKey: '',
  footballDataApiKey: '',
  apiFootballKey: '',
};

function readPersistedPrefs(): PersistedPrefs {
  if (typeof window === 'undefined') {
    return {
      selectedModel: DEFAULT_CLIENT_SETTINGS.selectedModel,
      provider: DEFAULT_CLIENT_SETTINGS.provider,
      timeoutSeconds: DEFAULT_CLIENT_SETTINGS.timeoutSeconds,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        selectedModel: DEFAULT_CLIENT_SETTINGS.selectedModel,
        provider: DEFAULT_CLIENT_SETTINGS.provider,
        timeoutSeconds: DEFAULT_CLIENT_SETTINGS.timeoutSeconds,
      };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedPrefs & ClientAiSettings>;
    // Explicitly ignore any legacy key fields that might still be present in old storage.
    return {
      selectedModel: typeof parsed.selectedModel === 'string' ? parsed.selectedModel : DEFAULT_CLIENT_SETTINGS.selectedModel,
      provider:
        parsed.provider === 'gemini' || parsed.provider === 'openrouter' || parsed.provider === 'mistral'
          ? parsed.provider
          : DEFAULT_CLIENT_SETTINGS.provider,
      timeoutSeconds:
        typeof parsed.timeoutSeconds === 'number' && parsed.timeoutSeconds > 0
          ? parsed.timeoutSeconds
          : DEFAULT_CLIENT_SETTINGS.timeoutSeconds,
    };
  } catch {
    return {
      selectedModel: DEFAULT_CLIENT_SETTINGS.selectedModel,
      provider: DEFAULT_CLIENT_SETTINGS.provider,
      timeoutSeconds: DEFAULT_CLIENT_SETTINGS.timeoutSeconds,
    };
  }
}

function writePersistedPrefs(prefs: PersistedPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    // Only write the safe subset. Never write keys.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedModel: prefs.selectedModel,
        provider: prefs.provider,
        timeoutSeconds: prefs.timeoutSeconds,
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function getClientSettings(): ClientAiSettings {
  const prefs = readPersistedPrefs();
  return {
    ...DEFAULT_CLIENT_SETTINGS,
    ...prefs,
    // Secrets always come from memory, never from storage.
    geminiApiKey: memorySecrets.geminiApiKey,
    openrouterApiKey: memorySecrets.openrouterApiKey,
    mistralApiKey: memorySecrets.mistralApiKey,
    footballDataApiKey: memorySecrets.footballDataApiKey,
    apiFootballKey: memorySecrets.apiFootballKey,
  };
}

export function saveClientSettings(settings: Partial<ClientAiSettings>): ClientAiSettings {
  const current = getClientSettings();
  const next: ClientAiSettings = { ...current, ...settings };

  // Update in-memory secrets.
  memorySecrets = {
    geminiApiKey: next.geminiApiKey ?? '',
    openrouterApiKey: next.openrouterApiKey ?? '',
    mistralApiKey: next.mistralApiKey ?? '',
    footballDataApiKey: next.footballDataApiKey ?? '',
    apiFootballKey: next.apiFootballKey ?? '',
  };

  // Persist only non-secret prefs.
  writePersistedPrefs({
    selectedModel: next.selectedModel,
    provider: next.provider,
    timeoutSeconds: next.timeoutSeconds,
  });

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('lb_settings_changed', { detail: next }));
    } catch {
      /* ignore */
    }
  }

  return next;
}

/**
 * Clears in-memory API keys. Called from the central logout path.
 * Does not touch the persisted (safe) prefs; those are removed by clearAllUserStorage.
 */
export function clearClientSecrets(): void {
  memorySecrets = {
    geminiApiKey: '',
    openrouterApiKey: '',
    mistralApiKey: '',
    footballDataApiKey: '',
    apiFootballKey: '',
  };
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

/** Formats client settings into headers for thin-proxy API routes */
export function getClientAiHeaders(customSettings?: ClientAiSettings): Record<string, string> {
  const s = customSettings || getClientSettings();
  const headers: Record<string, string> = {
    'x-ai-provider': s.provider,
    'x-ai-model': s.selectedModel,
  };
  if (s.geminiApiKey) headers['x-gemini-key'] = s.geminiApiKey;
  if (s.openrouterApiKey) headers['x-openrouter-key'] = s.openrouterApiKey;
  if (s.mistralApiKey) headers['x-mistral-key'] = s.mistralApiKey;
  if (s.footballDataApiKey) headers['x-football-data-key'] = s.footballDataApiKey;
  if (s.apiFootballKey) headers['x-api-football-key'] = s.apiFootballKey;
  return headers;
}

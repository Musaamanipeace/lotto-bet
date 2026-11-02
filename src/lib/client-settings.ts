'use client';

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

const STORAGE_KEY = 'lb_client_ai_settings_v1';

export function getClientSettings(): ClientAiSettings {
  if (typeof window === 'undefined') return DEFAULT_CLIENT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
  const current = getClientSettings();
  const next: ClientAiSettings = { ...current, ...settings };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('lb_settings_changed', { detail: next }));
    } catch {
      /* quota ignored */
    }
  }
  return next;
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

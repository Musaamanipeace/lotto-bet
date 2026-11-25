import { AIProvider, ByokKeys } from '@/types';

export const BYOK_STORAGE_KEY = 'lottobet_byok_keys_v1';
export const BYOK_CHANGED_EVENT = 'lottobet_byok_updated';

export const DEFAULT_BYOK_KEYS: ByokKeys = {
  aiProvider: 'gemini',
  geminiKey: '',
  openrouterKey: '',
  mistralKey: '',
  geminiModel: 'gemini-2.5-flash',
  openrouterModel: 'openai/gpt-4o-mini',
  mistralModel: 'mistral-small-latest',
  theSportsDbKey: '',
  apiFootballKey: '',
  hasSkippedOnboarding: false,
};

export const PROVIDER_LABELS: Record<AIProvider, { name: string; tag: string; defaultModel: string; getUrl: string }> = {
  gemini: {
    name: 'Google Gemini',
    tag: 'Official Google AI',
    defaultModel: 'gemini-2.5-flash',
    getUrl: 'https://aistudio.google.com/app/apikey',
  },
  openrouter: {
    name: 'OpenRouter',
    tag: 'Multi-Model Aggregator',
    defaultModel: 'openai/gpt-4o-mini',
    getUrl: 'https://openrouter.ai/keys',
  },
  mistral: {
    name: 'Mistral AI',
    tag: 'European Open AI',
    defaultModel: 'mistral-small-latest',
    getUrl: 'https://console.mistral.ai/api-keys/',
  },
};

export const POPULAR_MODELS: Record<AIProvider, { id: string; label: string }[]> = {
  gemini: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Ultra fast & smart)' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Deep reasoning & betting math)' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Stable low latency)' },
  ],
  openrouter: [
    { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (Cost-efficient & sharp)' },
    { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (Elite analysis)' },
    { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3 (High capability)' },
    { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash via OpenRouter' },
    { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
  ],
  mistral: [
    { id: 'mistral-small-latest', label: 'Mistral Small (Fastest & low cost)' },
    { id: 'mistral-large-latest', label: 'Mistral Large (Flagship intelligence)' },
    { id: 'codestral-latest', label: 'Codestral (Analytical reasoning)' },
  ],
};

/**
 * Validate key formats based on provider specification
 */
export function validateKeyFormat(
  provider: AIProvider | 'thesportsdb' | 'api-football',
  key: string
): { valid: boolean; message: string; warning?: boolean } {
  const trimmed = key.trim();
  if (!trimmed) {
    return { valid: false, message: 'Key is empty' };
  }

  switch (provider) {
    case 'gemini':
      if (trimmed.startsWith('AIza') && trimmed.length >= 35) {
        return { valid: true, message: 'Valid Google Gemini API Key format' };
      }
      if (trimmed.length >= 25) {
        return { valid: true, message: 'Custom Gemini key accepted', warning: true };
      }
      return { valid: false, message: 'Google Gemini keys usually start with AIza and have ~39 chars' };

    case 'openrouter':
      if (trimmed.startsWith('sk-or-v1-') || trimmed.startsWith('sk-or-')) {
        return { valid: true, message: 'Valid OpenRouter key format' };
      }
      if (trimmed.length >= 20) {
        return { valid: true, message: 'OpenRouter key format accepted', warning: true };
      }
      return { valid: false, message: 'OpenRouter keys typically start with sk-or-' };

    case 'mistral':
      if (trimmed.length >= 24 && /^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        return { valid: true, message: 'Valid Mistral API key format' };
      }
      if (trimmed.length >= 16) {
        return { valid: true, message: 'Mistral key format accepted', warning: true };
      }
      return { valid: false, message: 'Mistral keys are usually 32-character strings' };

    case 'thesportsdb':
      if (trimmed === '3') {
        return { valid: true, message: 'TheSportsDB Free Test Key (3) active' };
      }
      if (trimmed.length >= 1) {
        return { valid: true, message: 'TheSportsDB Key configured' };
      }
      return { valid: false, message: 'TheSportsDB key required' };

    case 'api-football':
      if (trimmed.length >= 20) {
        return { valid: true, message: 'API-Football key configured' };
      }
      return { valid: false, message: 'API-Football key looks too short' };

    default:
      return { valid: trimmed.length > 5, message: 'Key configured' };
  }
}

/**
 * Read BYOK configuration from localStorage safely
 */
export function getByokKeys(): ByokKeys {
  if (typeof window === 'undefined') return { ...DEFAULT_BYOK_KEYS };
  try {
    const raw = localStorage.getItem(BYOK_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BYOK_KEYS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BYOK_KEYS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_BYOK_KEYS };
  }
}

/**
 * Save BYOK configuration to localStorage and dispatch event
 */
export function saveByokKeys(patch: Partial<ByokKeys>): ByokKeys {
  if (typeof window === 'undefined') return { ...DEFAULT_BYOK_KEYS, ...patch };
  const current = getByokKeys();
  const updated: ByokKeys = {
    ...current,
    ...patch,
  };
  localStorage.setItem(BYOK_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent(BYOK_CHANGED_EVENT, { detail: updated }));
  return updated;
}

/**
 * Check if the active AI provider has a configured API key
 */
export function hasActiveAiKey(keys?: ByokKeys): boolean {
  const current = keys || getByokKeys();
  switch (current.aiProvider) {
    case 'gemini':
      return Boolean(current.geminiKey && current.geminiKey.trim().length > 0);
    case 'openrouter':
      return Boolean(current.openrouterKey && current.openrouterKey.trim().length > 0);
    case 'mistral':
      return Boolean(current.mistralKey && current.mistralKey.trim().length > 0);
    default:
      return false;
  }
}

/**
 * Get active AI credentials info
 */
export function getActiveAiConfig(keys?: ByokKeys): {
  provider: AIProvider;
  key: string;
  model: string;
  isConfigured: boolean;
} {
  const current = keys || getByokKeys();
  const provider = current.aiProvider || 'gemini';
  let key = '';
  let model = '';

  if (provider === 'gemini') {
    key = current.geminiKey?.trim() || '';
    model = current.geminiModel || PROVIDER_LABELS.gemini.defaultModel;
  } else if (provider === 'openrouter') {
    key = current.openrouterKey?.trim() || '';
    model = current.openrouterModel || PROVIDER_LABELS.openrouter.defaultModel;
  } else if (provider === 'mistral') {
    key = current.mistralKey?.trim() || '';
    model = current.mistralModel || PROVIDER_LABELS.mistral.defaultModel;
  }

  return {
    provider,
    key,
    model,
    isConfigured: Boolean(key),
  };
}

/**
 * Check if sports data keys are set
 */
export function hasSportsDataKeys(keys?: ByokKeys): boolean {
  const current = keys || getByokKeys();
  return Boolean(
    (current.theSportsDbKey && current.theSportsDbKey.trim().length > 0) ||
    (current.apiFootballKey && current.apiFootballKey.trim().length > 0)
  );
}

/**
 * Check if user is in unauthenticated / keyless guest mode
 */
export function isGuestMode(keys?: ByokKeys): boolean {
  const current = keys || getByokKeys();
  return !hasActiveAiKey(current);
}

/**
 * Reset all BYOK keys
 */
export function resetByokKeys(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BYOK_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(BYOK_CHANGED_EVENT, { detail: DEFAULT_BYOK_KEYS }));
}

import { decryptUserApiKey, encryptUserApiKey, type EncryptedKeyRecord } from './key-crypto.ts';
import { createDefaultFilterState, normalizeFilterState, type FilterState } from './filter-state.ts';
import { DEFAULT_ORDER } from './llm/index.ts';
import { ALL_PROVIDERS } from './llm/providers.ts';
import type { LlmEnv } from './llm/types.ts';
import { ensureUserSettingsTables } from './pg-schema.ts';
import { queryAsUser } from './pg-store.ts';
import type { Bookmaker } from './types.ts';

export type ApiKeyProvider = 'gemini' | 'openrouter' | 'mistral' | 'football_data' | 'api_football';
export const API_KEY_PROVIDERS: readonly ApiKeyProvider[] = [
  'gemini',
  'openrouter',
  'mistral',
  'football_data',
  'api_football',
];
export const AI_KEY_PROVIDERS: readonly ApiKeyProvider[] = ['gemini', 'openrouter', 'mistral'];

export type AiProvider = 'gemini' | 'openrouter' | 'mistral';

export type UserPreferences = {
  selectedModel: string;
  provider: AiProvider;
  timeoutSeconds: number;
  defaultBookmaker: Bookmaker;
  filterState: FilterState;
};

export type MaskedKeyStatus = {
  provider: ApiKeyProvider;
  isSet: boolean;
  last4: string | null;
  keyId?: string;
  updatedAt?: number;
};

export type UserSettingsPayload = {
  persistenceMode: 'postgres' | 'memory';
  keysConfigured: boolean;
  aiKeysConfigured: boolean;
  keys: Record<ApiKeyProvider, MaskedKeyStatus>;
  preferences: UserPreferences;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  selectedModel: 'gemini-2.5-flash',
  provider: 'gemini',
  timeoutSeconds: 35,
  defaultBookmaker: 'sportybet',
  filterState: createDefaultFilterState('sportybet'),
};

type StoredEncryptedKey = EncryptedKeyRecord & {
  provider: ApiKeyProvider;
  updatedAt: number;
};

const g = globalThis as unknown as {
  __lottoMemKeys?: Map<string, Map<ApiKeyProvider, StoredEncryptedKey>>;
  __lottoMemPrefs?: Map<string, UserPreferences>;
};
const memKeys = (g.__lottoMemKeys ??= new Map<string, Map<ApiKeyProvider, StoredEncryptedKey>>());
const memPrefs = (g.__lottoMemPrefs ??= new Map<string, UserPreferences>());

const usePg = () => Boolean(process.env.DATABASE_URL);

function emptyMaskedKeys(): Record<ApiKeyProvider, MaskedKeyStatus> {
  return {
    gemini: { provider: 'gemini', isSet: false, last4: null },
    openrouter: { provider: 'openrouter', isSet: false, last4: null },
    mistral: { provider: 'mistral', isSet: false, last4: null },
    football_data: { provider: 'football_data', isSet: false, last4: null },
    api_football: { provider: 'api_football', isSet: false, last4: null },
  };
}

function normalizePrefs(raw: Partial<UserPreferences> | null | undefined, prev: UserPreferences = DEFAULT_USER_PREFERENCES): UserPreferences {
  const provider: AiProvider =
    raw?.provider === 'openrouter' || raw?.provider === 'mistral' || raw?.provider === 'gemini'
      ? raw.provider
      : prev.provider;
  const selectedModel =
    typeof raw?.selectedModel === 'string' && raw.selectedModel.trim().length > 0 && raw.selectedModel.length <= 200
      ? raw.selectedModel.trim()
      : prev.selectedModel;
  const timeoutSeconds =
    typeof raw?.timeoutSeconds === 'number' && Number.isFinite(raw.timeoutSeconds)
      ? Math.min(120, Math.max(10, Math.round(raw.timeoutSeconds)))
      : prev.timeoutSeconds;
  const defaultBookmaker: Bookmaker =
    raw?.defaultBookmaker === 'betpawa' || raw?.defaultBookmaker === 'sportybet'
      ? raw.defaultBookmaker
      : prev.defaultBookmaker;
  const filterState = raw?.filterState
    ? normalizeFilterState(raw.filterState, defaultBookmaker)
    : prev.filterState;

  return {
    selectedModel,
    provider,
    timeoutSeconds,
    defaultBookmaker,
    filterState,
  };
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  if (!usePg()) {
    return memPrefs.get(userId) ?? { ...DEFAULT_USER_PREFERENCES, filterState: createDefaultFilterState() };
  }
  await ensureUserSettingsTables();
  const r = await queryAsUser<{
    selected_model: string;
    provider: AiProvider;
    timeout_seconds: number;
    default_bookmaker: Bookmaker;
    filter_state: unknown;
  }>(
    userId,
    `SELECT selected_model, provider, timeout_seconds, default_bookmaker, filter_state
     FROM user_settings WHERE user_id = $1`,
    [userId],
  );
  const row = r.rows[0];
  if (!row) {
    return { ...DEFAULT_USER_PREFERENCES, filterState: createDefaultFilterState() };
  }
  return normalizePrefs({
    selectedModel: row.selected_model,
    provider: row.provider,
    timeoutSeconds: row.timeout_seconds,
    defaultBookmaker: row.default_bookmaker,
    filterState: row.filter_state ? normalizeFilterState(row.filter_state, row.default_bookmaker) : undefined,
  });
}

export async function saveUserPreferences(
  userId: string,
  patch: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const prev = await getUserPreferences(userId);
  const next = normalizePrefs(patch, prev);

  if (!usePg()) {
    memPrefs.set(userId, next);
    return next;
  }

  await ensureUserSettingsTables();
  await queryAsUser(
    userId,
    `INSERT INTO user_settings (user_id, selected_model, provider, timeout_seconds, default_bookmaker, filter_state, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, now())
     ON CONFLICT (user_id) DO UPDATE SET
       selected_model = EXCLUDED.selected_model,
       provider = EXCLUDED.provider,
       timeout_seconds = EXCLUDED.timeout_seconds,
       default_bookmaker = EXCLUDED.default_bookmaker,
       filter_state = EXCLUDED.filter_state,
       updated_at = now()`,
    [
      userId,
      next.selectedModel,
      next.provider,
      next.timeoutSeconds,
      next.defaultBookmaker,
      JSON.stringify(next.filterState),
    ],
  );
  return next;
}

export async function setUserApiKey(
  userId: string,
  provider: ApiKeyProvider,
  plaintextKey: string,
): Promise<MaskedKeyStatus> {
  const enc = encryptUserApiKey(userId, plaintextKey);
  const updatedAt = Date.now();

  if (!usePg()) {
    const map = memKeys.get(userId) ?? new Map<ApiKeyProvider, StoredEncryptedKey>();
    map.set(provider, { ...enc, provider, updatedAt });
    memKeys.set(userId, map);
    return {
      provider,
      isSet: true,
      last4: enc.last4,
      keyId: enc.keyId,
      updatedAt,
    };
  }

  await ensureUserSettingsTables();
  await queryAsUser(
    userId,
    `INSERT INTO user_api_keys (user_id, provider, ciphertext, iv, tag, last4, key_id, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (user_id, provider) DO UPDATE SET
       ciphertext = EXCLUDED.ciphertext,
       iv = EXCLUDED.iv,
       tag = EXCLUDED.tag,
       last4 = EXCLUDED.last4,
       key_id = EXCLUDED.key_id,
       updated_at = now()`,
    [userId, provider, enc.ciphertext, enc.iv, enc.tag, enc.last4, enc.keyId],
  );

  return {
    provider,
    isSet: true,
    last4: enc.last4,
    keyId: enc.keyId,
    updatedAt,
  };
}

export async function deleteUserApiKey(
  userId: string,
  provider: ApiKeyProvider | 'all',
): Promise<void> {
  if (!usePg()) {
    if (provider === 'all') {
      memKeys.delete(userId);
    } else {
      memKeys.get(userId)?.delete(provider);
    }
    return;
  }

  await ensureUserSettingsTables();
  if (provider === 'all') {
    await queryAsUser(userId, `DELETE FROM user_api_keys WHERE user_id = $1`, [userId]);
  } else {
    await queryAsUser(
      userId,
      `DELETE FROM user_api_keys WHERE user_id = $1 AND provider = $2`,
      [userId, provider],
    );
  }
}

export async function getUserSettingsForClient(userId: string): Promise<UserSettingsPayload> {
  const keys = emptyMaskedKeys();
  const preferences = await getUserPreferences(userId);

  if (!usePg()) {
    const map = memKeys.get(userId);
    if (map) {
      for (const [provider, rec] of map.entries()) {
        keys[provider] = {
          provider,
          isSet: true,
          last4: rec.last4,
          keyId: rec.keyId,
          updatedAt: rec.updatedAt,
        };
      }
    }
  } else {
    await ensureUserSettingsTables();
    const r = await queryAsUser<{
      provider: ApiKeyProvider;
      last4: string;
      key_id: string;
      updated_ms: string;
    }>(
      userId,
      `SELECT provider, last4, key_id, (extract(epoch from updated_at)*1000)::bigint AS updated_ms
       FROM user_api_keys WHERE user_id = $1`,
      [userId],
    );
    for (const row of r.rows) {
      if (API_KEY_PROVIDERS.includes(row.provider)) {
        keys[row.provider] = {
          provider: row.provider,
          isSet: true,
          last4: row.last4,
          keyId: row.key_id,
          updatedAt: Number(row.updated_ms),
        };
      }
    }
  }

  const keysConfigured = API_KEY_PROVIDERS.some((p) => keys[p].isSet);
  const aiKeysConfigured = AI_KEY_PROVIDERS.some((p) => keys[p].isSet);

  return {
    persistenceMode: usePg() ? 'postgres' : 'memory',
    keysConfigured,
    aiKeysConfigured,
    keys,
    preferences,
  };
}

/**
 * Server-only helper: decrypts a user's stored API keys on the server using `userId` AAD.
 * NEVER return these values to browser code or write them to logs.
 */
export async function getDecryptedUserKeys(
  userId: string,
): Promise<Partial<Record<ApiKeyProvider, string>>> {
  const out: Partial<Record<ApiKeyProvider, string>> = {};

  if (!usePg()) {
    const map = memKeys.get(userId);
    if (!map) return out;
    for (const [provider, rec] of map.entries()) {
      try {
        out[provider] = decryptUserApiKey(userId, rec);
      } catch {
        /* ignore corrupted or mismatched AAD key */
      }
    }
    return out;
  }

  await ensureUserSettingsTables();
  const r = await queryAsUser<{
    provider: ApiKeyProvider;
    ciphertext: string;
    iv: string;
    tag: string;
    key_id: string;
  }>(
    userId,
    `SELECT provider, ciphertext, iv, tag, key_id FROM user_api_keys WHERE user_id = $1`,
    [userId],
  );
  for (const row of r.rows) {
    if (!API_KEY_PROVIDERS.includes(row.provider)) continue;
    try {
      out[row.provider] = decryptUserApiKey(userId, {
        ciphertext: row.ciphertext,
        iv: row.iv,
        tag: row.tag,
        keyId: row.key_id,
      });
    } catch {
      /* ignore decryption failures */
    }
  }
  return out;
}

const MODEL_VAR: Record<AiProvider, string> = {
  gemini: 'GEMINI_MODEL',
  openrouter: 'OPENROUTER_MODEL',
  mistral: 'MISTRAL_MODEL',
};

/**
 * Server-only: builds `LlmEnv` from the user's server-decrypted API keys and preferences.
 */
export async function buildUserLlmEnv(
  userId: string,
  override?: { provider?: string | null; model?: string | null; timeoutSeconds?: number | null },
  base: LlmEnv = {},
): Promise<{ env: LlmEnv; hasAiKey: boolean; provider: AiProvider; model: string; timeoutSeconds: number }> {
  const [keys, prefs] = await Promise.all([getDecryptedUserKeys(userId), getUserPreferences(userId)]);

  const env: LlmEnv = { ...base };
  if (keys.gemini) env.GEMINI_API_KEY = keys.gemini;
  if (keys.openrouter) env.OPENROUTER_API_KEY = keys.openrouter;
  if (keys.mistral) env.MISTRAL_API_KEY = keys.mistral;

  const chosenProviderRaw = override?.provider?.trim().toLowerCase();
  const provider: AiProvider =
    chosenProviderRaw === 'gemini' || chosenProviderRaw === 'openrouter' || chosenProviderRaw === 'mistral'
      ? chosenProviderRaw
      : prefs.provider;

  const model =
    override?.model?.trim() && override.model.trim().length <= 200
      ? override.model.trim()
      : prefs.selectedModel;

  const timeoutSeconds =
    typeof override?.timeoutSeconds === 'number' && Number.isFinite(override.timeoutSeconds)
      ? Math.min(120, Math.max(10, Math.round(override.timeoutSeconds)))
      : prefs.timeoutSeconds;

  const configured = (base.LLM_PROVIDER_ORDER || DEFAULT_ORDER)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((n) => n && ALL_PROVIDERS[n]);
  env.LLM_PROVIDER_ORDER = [...new Set([provider, ...configured, ...Object.keys(ALL_PROVIDERS)])].join(',');
  env[MODEL_VAR[provider]] = model;
  env.LLM_TIMEOUT_MS = String(timeoutSeconds * 1000);

  const hasAiKey = Boolean(env.GEMINI_API_KEY || env.OPENROUTER_API_KEY || env.MISTRAL_API_KEY || env.LLM_API_KEY);
  return { env, hasAiKey, provider, model, timeoutSeconds };
}

export function resetUserSettingsStoreForTests(): void {
  memKeys.clear();
  memPrefs.clear();
}

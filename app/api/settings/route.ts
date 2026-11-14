import { currentUser, jsonError, requireJson } from '@/lib/session.ts';
import {
  API_KEY_PROVIDERS,
  deleteUserApiKey,
  getUserSettingsForClient,
  saveUserPreferences,
  setUserApiKey,
  type ApiKeyProvider,
  type UserPreferences,
} from '@/lib/user-settings-store.ts';
import { normalizeFilterState } from '@/lib/filter-state.ts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings
 * Returns masked API key metadata (never plaintext keys) and non-secret user preferences.
 * Requires an authenticated session (401 for guests).
 */
export async function GET(req: Request) {
  const user = await currentUser(req);
  if (!user) {
    return jsonError('Sign in to access saved settings and API keys.', 401);
  }
  try {
    const data = await getUserSettingsForClient(user.id);
    return Response.json({ ok: true, ...data });
  } catch (e) {
    return jsonError(
      `Failed to load settings: ${e instanceof Error ? e.message : String(e)}`,
      500,
    );
  }
}

/**
 * PUT /api/settings
 * Encrypts and stores submitted API keys server-side per user (AES-256-GCM with user_id AAD)
 * and persists non-secret preferences + unified FilterState.
 */
export async function PUT(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;

  const user = await currentUser(req);
  if (!user) {
    return jsonError('Sign in to save settings and API keys.', 401);
  }

  let body: {
    keys?: Partial<Record<ApiKeyProvider, string | null>>;
    apiKeys?: Partial<Record<ApiKeyProvider, string | null>>;
    deleteProviders?: ApiKeyProvider[];
    preferences?: Partial<UserPreferences>;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  if (!body || typeof body !== 'object') {
    return jsonError('Settings payload must be a JSON object', 400);
  }

  try {
    if (body.preferences && typeof body.preferences === 'object') {
      const prefPatch: Partial<UserPreferences> = {};
      if (typeof body.preferences.selectedModel === 'string') {
        prefPatch.selectedModel = body.preferences.selectedModel;
      }
      if (
        body.preferences.provider === 'gemini' ||
        body.preferences.provider === 'openrouter' ||
        body.preferences.provider === 'mistral'
      ) {
        prefPatch.provider = body.preferences.provider;
      }
      if (typeof body.preferences.timeoutSeconds === 'number') {
        prefPatch.timeoutSeconds = body.preferences.timeoutSeconds;
      }
      if (
        body.preferences.defaultBookmaker === 'sportybet' ||
        body.preferences.defaultBookmaker === 'betpawa'
      ) {
        prefPatch.defaultBookmaker = body.preferences.defaultBookmaker;
      }
      if (body.preferences.filterState) {
        prefPatch.filterState = normalizeFilterState(
          body.preferences.filterState,
          prefPatch.defaultBookmaker ?? 'sportybet',
        );
      }
      await saveUserPreferences(user.id, prefPatch);
    }

    if (Array.isArray(body.deleteProviders)) {
      for (const p of body.deleteProviders) {
        if (API_KEY_PROVIDERS.includes(p)) {
          await deleteUserApiKey(user.id, p);
        }
      }
    }

    const submittedKeys =
      body.keys && typeof body.keys === 'object'
        ? body.keys
        : body.apiKeys && typeof body.apiKeys === 'object'
          ? body.apiKeys
          : null;

    if (submittedKeys) {
      for (const provider of API_KEY_PROVIDERS) {
        if (!(provider in submittedKeys)) continue;
        const val = submittedKeys[provider];
        if (val === null) {
          await deleteUserApiKey(user.id, provider);
          continue;
        }
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (trimmed.length === 0) continue; // blank input preserves existing stored key
          if (trimmed.length < 8 || trimmed.length > 500) {
            return jsonError(`Invalid ${provider} key length (must be 8–500 characters).`, 400);
          }
          await setUserApiKey(user.id, provider, trimmed);
        }
      }
    }

    const updated = await getUserSettingsForClient(user.id);
    return Response.json({ ok: true, ...updated });
  } catch (e) {
    return jsonError(
      `Failed to save settings: ${e instanceof Error ? e.message : String(e)}`,
      500,
    );
  }
}

/**
 * DELETE /api/settings
 * Deletes one provider key (`{ provider }`) or all keys (`{ provider: 'all' }`) for the signed-in user.
 */
export async function DELETE(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;

  const user = await currentUser(req);
  if (!user) {
    return jsonError('Sign in to delete API keys.', 401);
  }

  let body: { provider?: ApiKeyProvider | 'all' };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const target = body?.provider;
  if (target !== 'all' && (!target || !API_KEY_PROVIDERS.includes(target))) {
    return jsonError('Valid provider or "all" is required', 400);
  }

  try {
    await deleteUserApiKey(user.id, target);
    const updated = await getUserSettingsForClient(user.id);
    return Response.json({ ok: true, ...updated });
  } catch (e) {
    return jsonError(
      `Failed to delete key: ${e instanceof Error ? e.message : String(e)}`,
      500,
    );
  }
}

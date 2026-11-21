import type { User } from './auth.ts';
import type { LlmEnv } from './llm/types.ts';
import { currentUser, jsonError } from './session.ts';
import { buildUserLlmEnv, type AiProvider } from './user-settings-store.ts';

export type AiAccessResult =
  | {
      ok: true;
      user: User;
      env: LlmEnv;
      provider: AiProvider;
      model: string;
      timeoutSeconds: number;
      hasAiKey: boolean;
    }
  | {
      ok: false;
      response: Response;
    };

/**
 * Enforces Task 12 & Task 2 security gates for every AI route:
 * 1. Unauthenticated requests always receive HTTP 401.
 * 2. Signed-in users without any stored API key receive HTTP 400 (`keys_required`) when `requireAiKey` is true.
 * 3. Decrypted keys are loaded strictly on the server via `buildUserLlmEnv` (never from browser headers).
 */
export async function requireAiAccess(
  req: Request,
  opts: { requireAiKey?: boolean } = {},
): Promise<AiAccessResult> {
  const user = await currentUser(req);
  if (!user) {
    return {
      ok: false,
      response: jsonError('Sign in required to use AI features.', 401),
    };
  }

  const providerHeader = req.headers.get('x-ai-provider');
  const modelHeader = req.headers.get('x-ai-model');

  const llm = await buildUserLlmEnv(user.id, {
    provider: providerHeader,
    model: modelHeader,
  });

  if (opts.requireAiKey !== false && !llm.hasAiKey) {
    return {
      ok: false,
      response: Response.json(
        {
          ok: false,
          code: 'keys_required',
          error:
            'Add your API key in Settings (Menu ▾ → Settings) before using AI features.',
        },
        { status: 400 },
      ),
    };
  }

  return {
    ok: true,
    user,
    env: llm.env,
    provider: llm.provider,
    model: llm.model,
    timeoutSeconds: llm.timeoutSeconds,
    hasAiKey: llm.hasAiKey,
  };
}

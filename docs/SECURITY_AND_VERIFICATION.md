# Security Audit, Persistence Map, Key Rotation & Verification Guide

This document satisfies the audit and documentation requirements in `app/Newplan.md` across Tasks 1–11.

---

## 1. Persistence & Storage Audit Table (Task 1)

Every client-side key, cookie, cache, and database table was audited. All user-specific `localStorage` keys are registered in `src/lib/client-storage.ts`, namespaced by user ID (`<baseKey>:<userId>`) via `scopedStorageKey()`, and wiped on `signOut()` via `performFullSignOutCleanup()`.

| Storage Mechanism | Key / Table Name | Where Written / Read | User-Specific? | Isolation & Sign-Out Behaviour |
| --- | --- | --- | --- | --- |
| `localStorage` | `lb_slip_v1[:<userId>]` (`STORAGE_KEYS.SLIP`) | `src/lib/slip-store.ts`, `app/components/use-slips.ts` | **Yes** | Scoped by `<userId>`; cleared on `signOut()` and reset in memory via `lb-auth-signout` / `lb-slip-changed`. |
| `localStorage` | `lb_saved_slips_v1[:<userId>]` (`STORAGE_KEYS.SAVED_SLIPS`) | `src/lib/saved-slips.ts`, `app/saved-slips/page.tsx`, `app/results/page.tsx`, `app/components/builder.tsx` | **Yes** | Scoped by `<userId>`; cleared on `signOut()`. |
| `localStorage` | `lb_filter_templates_v1[:<userId>]` (`STORAGE_KEYS.FILTER_TEMPLATES`) | `src/lib/template-store.ts` | **Yes** | Scoped by `<userId>`; cleared on `signOut()`. |
| `localStorage` | `lb_results_scores_v1[:<userId>]` (`STORAGE_KEYS.RESULTS_SCORES`) | `src/lib/results-store.ts`, `app/results/page.tsx` | **Yes** | Scoped by `<userId>`; cleared on `signOut()`. |
| `localStorage` | `lb_client_ai_settings_v1[:<userId>]` (`STORAGE_KEYS.CLIENT_AI_SETTINGS`) | `src/lib/client-settings.ts`, `app/components/settings-modal.tsx` | **Yes** (non-secret prefs only: `selectedModel`, `provider`, `timeoutSeconds`) | Never stores API keys; scoped by `<userId>`; cleared on `signOut()`. |
| `localStorage` | `lb_top_hub_collapsed[:<userId>]` (`STORAGE_KEYS.TOP_HUB_COLLAPSED`) | `app/components/top-collapsible-hub.tsx` | **Yes** | Scoped by `<userId>`; cleared on `signOut()`. |
| `localStorage` | `lb_user_shortcuts_v1[:<userId>]` (`STORAGE_KEYS.USER_SHORTCUTS`) | `src/lib/shortcuts.ts`, `app/components/shortcuts-bar.tsx` | **Yes** | Scoped by `<userId>`; cleared on `signOut()`. |
| `sessionStorage` | Any session keys | `src/lib/client-storage.ts` | **Yes** | `sessionStorage.clear()` executed on `signOut()`. |
| `IndexedDB` | Any origin databases | `src/lib/client-storage.ts` (`clearAllIndexedDB`) | **Yes** | All origin IndexedDB databases enumerated and deleted on `signOut()`. |
| Service Worker Cache | `lotto-bet-static-v1` | `public/sw.js`, `src/lib/client-storage.ts` (`clearServiceWorkerCaches`) | **No** (static assets & `/offline` only) | Never caches `/api/*`, authenticated requests, or user routes (`/my-picks`, `/saved-slips`, `/results`); wiped on `signOut()`. |
| HTTP Cookie | `lb_session` | `src/lib/session.ts`, `app/api/auth/*`, `middleware.ts` | **Yes** | `HttpOnly; SameSite=Lax; Path=/` (`Secure` in production); revoked server-side and expired (`Max-Age=0`) on `/api/auth/logout`. |
| React Context / State | `AuthContext`, `useStoredSlip`, `ShortcutsBar` | `app/components/auth-context.tsx`, `app/components/use-slips.ts`, `app/components/shortcuts-bar.tsx` | **Yes** | Cleared immediately on `signOut()` and re-verified on `pageshow` (bfcache / Back button protection). |
| Postgres / Supabase | `slips` | `db/migrations/004_full_schema.sql`, `006_security_rls_keys_shortcuts.sql` | **Yes** (`user_id`) | Strict RLS (`user_id = effective_user_id()`); no `anon` access. |
| Postgres / Supabase | `picks` | `db/migrations/004_full_schema.sql`, `006_security_rls_keys_shortcuts.sql` | **Yes** (`user_id`) | Strict RLS (`user_id = effective_user_id()`); no `anon` access. |
| Postgres / Supabase | `community_posts` | `db/migrations/004_full_schema.sql`, `006_security_rls_keys_shortcuts.sql` | **Yes** (`user_id` owner) | Authenticated read, owner-only `INSERT`/`UPDATE`/`DELETE` (`user_id = effective_user_id()`). |
| Postgres / Supabase | `sessions` | `db/migrations/003_auth.sql`, `006_security_rls_keys_shortcuts.sql` | **Yes** (`user_id`) | Strict RLS (`user_id = effective_user_id()`); revoked on logout. |
| Postgres / Supabase | `user_shortcuts` | `db/migrations/006_security_rls_keys_shortcuts.sql`, `src/lib/shortcuts.ts` | **Yes** (`user_id`) | Strict RLS (`user_id = effective_user_id()`) for `SELECT`/`INSERT`/`UPDATE`/`DELETE`; target allowlist constraint. |

---

## 2. API Key Removal & Key Rotation List (Task 2)

All API key fields, client-side storage of keys, UI inputs for keys, and `x-*-key` request headers have been removed from the client and database. All provider keys are read exclusively on the server from `process.env`.

### Keys That Must Be Rotated Immediately
Because previous versions of the app permitted entering or storing these keys in client settings or database tables, **rotate all of the following keys in their respective provider dashboards** and set the new values only in server environment variables (`.env.local` / hosting provider secret manager):

1. **`GEMINI_API_KEY`** (Google AI Studio / Gemini API)
2. **`OPENROUTER_API_KEY`** (OpenRouter API)
3. **`MISTRAL_API_KEY`** (Mistral AI Console)
4. **`FOOTBALL_DATA_API_KEY`** (football-data.org API token)
5. **`API_FOOTBALL_KEY`** (API-Football / API-Sports key)
6. **`CRON_SECRET`** (Internal cron bearer secret, if previously shared)

### Migration Requiring Human Approval
- File: `db/migrations/006_security_rls_keys_shortcuts.sql`
- **Status:** ⚠️ **REQUIRES HUMAN APPROVAL BEFORE RUNNING IN PRODUCTION**
- Actions performed by this migration:
  - Drops any legacy API key tables (`api_keys`, `user_api_keys`, `app_secrets`, `provider_keys`) and columns (`gemini_api_key`, `openrouter_api_key`, `mistral_api_key`, `football_data_api_key`, `api_football_key`, `api_key`, `secret_key`, `encrypted_api_key`) on `users` and `user_settings`.
  - Creates `effective_user_id()` bridging `app.current_user_id` and Supabase `auth.uid()`.
  - Enables and forces strict Row-Level Security (RLS) on `slips`, `picks`, `community_posts`, `sessions`, and `user_shortcuts`, revoking anonymous access.
  - Creates `user_shortcuts` with a 24-character label constraint and internal path allowlist constraint.

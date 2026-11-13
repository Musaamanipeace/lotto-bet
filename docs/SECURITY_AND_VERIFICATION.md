# Security Audit, Persistence Map, Encrypted Keys & Verification Guide

This document covers the security audit, storage map, encrypted per-user key persistence, key rotation instructions, and manual verification checklists across Tasks 1–13.

---

## 1. Persistence & Storage Audit Table (Tasks 1, 2, 3, 9, 11, 12)

Every client-side key, cookie, cache, and database table is audited below.
- **Zero API keys** are ever written to `localStorage`, `sessionStorage`, `IndexedDB`, cookies, or `x-*-key` HTTP headers.
- User-specific client keys are registered in `src/lib/client-storage.ts`, namespaced by `<baseKey>:<userId>` via `scopedStorageKey()`, and wiped on `signOut()` via `performFullSignOutCleanup()`.

| Storage Mechanism | Key / Table Name | Where Written / Read | User-Specific? | Isolation & Sign-Out Behaviour |
| --- | --- | --- | --- | --- |
| `localStorage` | `lb_slip_v1[:<userId>]` (`STORAGE_KEYS.SLIP`) | `src/lib/slip-store.ts`, `app/components/use-slips.ts` | **Yes** | Scoped by `<userId>`; cleared on `signOut()` and reset via `lb-auth-signout` / `lb-slip-changed`. |
| `localStorage` | `lb_saved_slips_v1[:<userId>]` (`STORAGE_KEYS.SAVED_SLIPS`) | `src/lib/saved-slips.ts`, `app/saved-slips/page.tsx`, `app/results/page.tsx` | **Yes** | Scoped by `<userId>`; cleared on `signOut()`. |
| `localStorage` | `lb_filter_templates_v1[:<userId>]` (`STORAGE_KEYS.FILTER_TEMPLATES`) | `src/lib/template-store.ts`, `app/components/market-filters.tsx` | **Yes** | Scoped by `<userId>`; authoritative copies live in Postgres `user_settings.custom_templates`. |
| `localStorage` | `lb_results_scores_v1[:<userId>]` (`STORAGE_KEYS.RESULTS_SCORES`) | `src/lib/results-store.ts`, `app/results/page.tsx` | **Yes** | Scoped by `<userId>`; cleared on `signOut()`. |
| `localStorage` | `lb_client_ai_settings_v1[:<userId>]` (`STORAGE_KEYS.CLIENT_AI_SETTINGS`) | `src/lib/client-settings.ts`, `app/components/settings-modal.tsx` | **Yes** (non-secret prefs only: `selectedModel`, `provider`, `timeoutSeconds`) | **Never stores API keys.** Guests hold prefs in-memory only; signed-in cache is cleared on `signOut()`. |
| `localStorage` | `lb_top_hub_collapsed[:<userId>]` (`STORAGE_KEYS.TOP_HUB_COLLAPSED`) | `app/components/top-collapsible-hub.tsx` | **Yes** | Scoped by `<userId>`; cleared on `signOut()`. |
| `sessionStorage` | Any session keys | `src/lib/client-storage.ts` | **Yes** | `sessionStorage.clear()` executed on `signOut()`. |
| `IndexedDB` | Any origin databases | `src/lib/client-storage.ts` (`clearAllIndexedDB`) | **Yes** | All origin IndexedDB databases enumerated and deleted on `signOut()`. |
| Service Worker Cache | `lotto-bet-static-v1` | `public/sw.js`, `src/lib/client-storage.ts` | **No** (static assets & `/offline` only) | Never caches `/api/*`, Supabase requests, or user routes (`/my-picks`, `/saved-slips`, `/results`, `/ai-picks`, `/chat`, `/community`, `/leagues`); wiped on `signOut()`. |
| HTTP Cookie | `lb_session` | `src/lib/session.ts`, `app/api/auth/*`, `middleware.ts` | **Yes** | `HttpOnly; SameSite=Lax; Path=/` (`Secure` in production); revoked server-side and expired (`Max-Age=0`) on `/api/auth/logout`. |
| React Context / State | `AuthProvider`, `FilterProvider`, `ShortcutsBar`, `BetslipModal` | `app/components/auth-context.tsx`, `filter-context.tsx`, `shortcuts-bar.tsx`, `betslip-modal.tsx` | **Yes** | Cleared on `SIGNOUT_EVENT`; `pageshow` handler prevents stale bfcache/Back-button UI. |
| Postgres / Supabase | `user_api_keys` | `db/migrations/007_user_api_keys.sql`, `src/lib/user-settings-store.ts`, `src/lib/key-crypto.ts` | **Yes** (`user_id` + AAD) | AES-256-GCM encrypted (`ciphertext`, `iv`, `tag`, `last4`, `key_id`); strict RLS (`user_id = effective_user_id()`); no `anon` access; plaintext never leaves server. |
| Postgres / Supabase | `user_settings` | `db/migrations/007_user_api_keys.sql`, `src/lib/user-settings-store.ts` | **Yes** (`user_id`) | Stores non-secret preferences, unified `filter_state`, and `custom_templates` under strict RLS. |
| Postgres / Supabase | `slips`, `picks`, `community_posts`, `sessions`, `user_shortcuts` | `db/migrations/006_security_rls_keys_shortcuts.sql`, `007_user_api_keys.sql` | **Yes** (`user_id`) | Strict RLS (`user_id = effective_user_id()`); `anon` access revoked; shortcuts constrained to `SHORTCUT_ALLOWLIST`, max 8 items, max 24 chars. |

---

## 2. Encrypted Per-User API Keys & Key Rotation (Task 2)

User-supplied keys (`gemini`, `openrouter`, `mistral`, `football_data`, `api_football`) are encrypted on the server with **AES-256-GCM** using `KEY_ENCRYPTION_SECRET` (or versioned `KEY_ENCRYPTION_SECRETS` JSON / `v1:secret1,v2:secret2`) with:
- A random 12-byte IV per encryption.
- `user_id` bound as Additional Authenticated Data (AAD), preventing ciphertext replay under another user.
- Only `{ provider, isSet, last4, keyId, updatedAt }` returned by `GET /api/settings`.

### Keys / Secrets Management
1. Generate a 32-byte base64 or hex secret for `KEY_ENCRYPTION_SECRET` in production environment variables (never commit secrets or expose via `NEXT_PUBLIC_*`).
2. To rotate encryption keys without invalidating existing users:
   - Set `KEY_ENCRYPTION_KEY_ID=v2` and `KEY_ENCRYPTION_SECRETS="v1:<old-secret>,v2:<new-secret>"`.
   - Existing rows decrypt using their stored `key_id` (`v1`), while new saves encrypt using `v2`.
3. Rotate any legacy provider keys (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `MISTRAL_API_KEY`, `FOOTBALL_DATA_API_KEY`, `API_FOOTBALL_KEY`, `CRON_SECRET`) that may have been exposed in previous client/database builds.

---

## 3. Migrations Requiring Human Approval Before Running in Production

⚠️ **STOP & REVIEW BEFORE APPLYING TO PRODUCTION**
1. `db/migrations/006_security_rls_keys_shortcuts.sql` — Edited to remove dropping `user_api_keys` / key columns so Task 2 per-user key persistence works; enforces strict RLS on `slips`, `picks`, `community_posts`, `sessions`, `user_shortcuts`.
2. `db/migrations/007_user_api_keys.sql` — Creates `user_api_keys` (AES-256-GCM encrypted columns + `FORCE ROW LEVEL SECURITY` + `REVOKE ALL FROM anon`), `user_settings` (`filter_state`, `custom_templates`, preferences with RLS), and `slips` metadata + `slips_select_shared` policy.

-- 007_user_api_keys.sql
-- ⚠️ REQUIRES HUMAN APPROVAL BEFORE RUNNING IN PRODUCTION ⚠️
--
-- Tasks covered:
-- 2. Encrypted per-user API key storage (`user_api_keys`) with AES-256-GCM ciphertext, IV, GCM auth tag,
--    masked `last4`, `key_id` for secret rotation, and strict per-user RLS (`effective_user_id()`).
-- 9/12. Non-secret user settings, shared FilterState, and saved custom templates in `user_settings` (RLS isolated).
-- 1/10. Saved slips columns (`name`, `combined_implied`, `shared`, `share_note`) and authenticated community policy.

-- ---------------------------------------------------------------------------
-- Task 2: Encrypted per-user API keys
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_api_keys (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT effective_user_id() REFERENCES users(id) ON DELETE CASCADE,
  provider   text NOT NULL CHECK (provider IN ('gemini', 'openrouter', 'mistral', 'football_data', 'api_football')),
  ciphertext text NOT NULL,
  iv         text NOT NULL,
  tag        text NOT NULL,
  last4      text NOT NULL,
  key_id     text NOT NULL DEFAULT 'v1',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS user_api_keys_user_idx ON user_api_keys (user_id);

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_api_keys_select_own ON user_api_keys;
DROP POLICY IF EXISTS user_api_keys_insert_own ON user_api_keys;
DROP POLICY IF EXISTS user_api_keys_update_own ON user_api_keys;
DROP POLICY IF EXISTS user_api_keys_delete_own ON user_api_keys;

CREATE POLICY user_api_keys_select_own ON user_api_keys
  FOR SELECT
  USING (effective_user_id() IS NOT NULL AND user_id = effective_user_id());

CREATE POLICY user_api_keys_insert_own ON user_api_keys
  FOR INSERT
  WITH CHECK (effective_user_id() IS NOT NULL AND user_id = effective_user_id());

CREATE POLICY user_api_keys_update_own ON user_api_keys
  FOR UPDATE
  USING (effective_user_id() IS NOT NULL AND user_id = effective_user_id())
  WITH CHECK (effective_user_id() IS NOT NULL AND user_id = effective_user_id());

CREATE POLICY user_api_keys_delete_own ON user_api_keys
  FOR DELETE
  USING (effective_user_id() IS NOT NULL AND user_id = effective_user_id());

-- ---------------------------------------------------------------------------
-- Task 9 & 12: Per-user non-secret settings, unified FilterState & templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_settings (
  user_id           uuid PRIMARY KEY DEFAULT effective_user_id() REFERENCES users(id) ON DELETE CASCADE,
  selected_model    text NOT NULL DEFAULT 'gemini-2.5-flash',
  provider          text NOT NULL DEFAULT 'gemini' CHECK (provider IN ('gemini', 'openrouter', 'mistral')),
  timeout_seconds   integer NOT NULL DEFAULT 35 CHECK (timeout_seconds BETWEEN 10 AND 120),
  default_bookmaker text NOT NULL DEFAULT 'sportybet' CHECK (default_bookmaker IN ('sportybet', 'betpawa')),
  filter_state      jsonb,
  custom_templates  jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_settings_select_own ON user_settings;
DROP POLICY IF EXISTS user_settings_insert_own ON user_settings;
DROP POLICY IF EXISTS user_settings_update_own ON user_settings;
DROP POLICY IF EXISTS user_settings_delete_own ON user_settings;

CREATE POLICY user_settings_select_own ON user_settings
  FOR SELECT
  USING (effective_user_id() IS NOT NULL AND user_id = effective_user_id());

CREATE POLICY user_settings_insert_own ON user_settings
  FOR INSERT
  WITH CHECK (effective_user_id() IS NOT NULL AND user_id = effective_user_id());

CREATE POLICY user_settings_update_own ON user_settings
  FOR UPDATE
  USING (effective_user_id() IS NOT NULL AND user_id = effective_user_id())
  WITH CHECK (effective_user_id() IS NOT NULL AND user_id = effective_user_id());

CREATE POLICY user_settings_delete_own ON user_settings
  FOR DELETE
  USING (effective_user_id() IS NOT NULL AND user_id = effective_user_id());

-- ---------------------------------------------------------------------------
-- Task 1 & 10: Saved slips metadata columns + authenticated community sharing
-- ---------------------------------------------------------------------------
ALTER TABLE slips
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS combined_implied numeric(8,6),
  ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_note text;

CREATE INDEX IF NOT EXISTS slips_user_created_idx ON slips (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS slips_shared_created_idx ON slips (shared, created_at DESC) WHERE shared = true;

DROP POLICY IF EXISTS slips_select_shared ON slips;
CREATE POLICY slips_select_shared ON slips
  FOR SELECT
  USING (effective_user_id() IS NOT NULL AND shared = true);

-- Revoke anonymous access if `anon` role exists (Supabase)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON user_api_keys, user_settings FROM anon';
  END IF;
END
$$;

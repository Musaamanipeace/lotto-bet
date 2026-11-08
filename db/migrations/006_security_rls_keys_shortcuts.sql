-- 006_security_rls_keys_shortcuts.sql
-- ⚠️ REQUIRES HUMAN APPROVAL BEFORE RUNNING IN PRODUCTION ⚠️
--
-- Tasks covered:
-- 1. Strict user-scoped RLS on all user-owned tables (slips, picks, community_posts, sessions, user_shortcuts)
--    using `effective_user_id()` which supports both Supabase `auth.uid()` and Postgres `app.current_user_id`.
--    No user-owned table is open to `anon`.
-- 2. Drop any API key / secret columns or tables from the database (all keys live strictly in server env vars).
-- 11. Create `user_shortcuts` table with allowlist CHECK constraint, 24-char label limit, and per-user RLS.

-- ---------------------------------------------------------------------------
-- Helper: effective_user_id() works with both Supabase Auth (`auth.uid()`)
-- and custom Postgres request context (`app.current_user_id`).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION effective_user_id() RETURNS uuid
LANGUAGE plpgsql STABLE AS $$
DECLARE
  uid uuid;
BEGIN
  BEGIN
    EXECUTE 'SELECT auth.uid()' INTO uid;
  EXCEPTION WHEN undefined_function OR invalid_schema_name THEN
    uid := NULL;
  END;
  RETURN COALESCE(uid, app_current_user_id());
END;
$$;

-- ---------------------------------------------------------------------------
-- Task 2: Remove any stored API keys / settings keys from the database
-- ⚠️ REQUIRES HUMAN APPROVAL BEFORE RUNNING
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS users
  DROP COLUMN IF EXISTS gemini_api_key,
  DROP COLUMN IF EXISTS openrouter_api_key,
  DROP COLUMN IF EXISTS mistral_api_key,
  DROP COLUMN IF EXISTS football_data_api_key,
  DROP COLUMN IF EXISTS api_football_key,
  DROP COLUMN IF EXISTS settings_keys;

DROP TABLE IF EXISTS user_api_keys;

-- ---------------------------------------------------------------------------
-- Task 11: user_shortcuts table with allowlist check & RLS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_shortcuts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT effective_user_id() REFERENCES users(id) ON DELETE CASCADE,
  label      text NOT NULL CHECK (char_length(trim(label)) BETWEEN 1 AND 24),
  target     text NOT NULL CHECK (
    target IN (
      '/',
      '/#filters',
      '/#available-games',
      '/ai-picks',
      '/my-picks',
      '/saved-slips',
      '/results',
      '/community',
      '/leagues',
      '/chat'
    )
    AND target LIKE '/%'
    AND target NOT LIKE '//%'
    AND lower(target) NOT LIKE '%javascript:%'
  ),
  icon       text,
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target)
);

CREATE INDEX IF NOT EXISTS user_shortcuts_user_pos_idx ON user_shortcuts (user_id, position);

ALTER TABLE user_shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_shortcuts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_shortcuts_select_own ON user_shortcuts;
DROP POLICY IF EXISTS user_shortcuts_insert_own ON user_shortcuts;
DROP POLICY IF EXISTS user_shortcuts_update_own ON user_shortcuts;
DROP POLICY IF EXISTS user_shortcuts_delete_own ON user_shortcuts;

CREATE POLICY user_shortcuts_select_own ON user_shortcuts
  FOR SELECT
  USING (effective_user_id() IS NOT NULL AND user_id = effective_user_id());

CREATE POLICY user_shortcuts_insert_own ON user_shortcuts
  FOR INSERT
  WITH CHECK (effective_user_id() IS NOT NULL AND user_id = effective_user_id());

CREATE POLICY user_shortcuts_update_own ON user_shortcuts
  FOR UPDATE
  USING (effective_user_id() IS NOT NULL AND user_id = effective_user_id())
  WITH CHECK (effective_user_id() IS NOT NULL AND user_id = effective_user_id());

CREATE POLICY user_shortcuts_delete_own ON user_shortcuts
  FOR DELETE
  USING (effective_user_id() IS NOT NULL AND user_id = effective_user_id());

-- ---------------------------------------------------------------------------
-- Task 1: Tighten RLS on slips, picks, community_posts, and sessions
-- ---------------------------------------------------------------------------
ALTER TABLE slips ALTER COLUMN user_id SET DEFAULT effective_user_id();
ALTER TABLE community_posts ALTER COLUMN user_id SET DEFAULT effective_user_id();

ALTER TABLE slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE slips FORCE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks FORCE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts FORCE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS slips_select_own ON slips;
DROP POLICY IF EXISTS slips_insert_own ON slips;
DROP POLICY IF EXISTS slips_update_own ON slips;
DROP POLICY IF EXISTS slips_delete_own ON slips;

CREATE POLICY slips_select_own ON slips
  FOR SELECT
  USING (effective_user_id() IS NOT NULL AND user_id = effective_user_id());

CREATE POLICY slips_insert_own ON slips
  FOR INSERT
  WITH CHECK (effective_user_id() IS NOT NULL AND user_id = effective_user_id());

CREATE POLICY slips_update_own ON slips
  FOR UPDATE
  USING (effective_user_id() IS NOT NULL AND user_id = effective_user_id())
  WITH CHECK (effective_user_id() IS NOT NULL AND user_id = effective_user_id());

CREATE POLICY slips_delete_own ON slips
  FOR DELETE
  USING (effective_user_id() IS NOT NULL AND user_id = effective_user_id());

DROP POLICY IF EXISTS picks_select_via_slip ON picks;
DROP POLICY IF EXISTS picks_insert_via_slip ON picks;
DROP POLICY IF EXISTS picks_update_via_slip ON picks;
DROP POLICY IF EXISTS picks_delete_via_slip ON picks;

CREATE POLICY picks_select_via_slip ON picks
  FOR SELECT
  USING (
    effective_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM slips s
      WHERE s.id = picks.slip_id AND s.user_id = effective_user_id()
    )
  );

CREATE POLICY picks_insert_via_slip ON picks
  FOR INSERT
  WITH CHECK (
    effective_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM slips s
      WHERE s.id = picks.slip_id AND s.user_id = effective_user_id()
    )
  );

CREATE POLICY picks_update_via_slip ON picks
  FOR UPDATE
  USING (
    effective_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM slips s
      WHERE s.id = picks.slip_id AND s.user_id = effective_user_id()
    )
  );

CREATE POLICY picks_delete_via_slip ON picks
  FOR DELETE
  USING (
    effective_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM slips s
      WHERE s.id = picks.slip_id AND s.user_id = effective_user_id()
    )
  );

-- Revoke anonymous access to user-owned tables if `anon` role exists (Supabase)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON users, sessions, slips, picks, user_shortcuts FROM anon';
  END IF;
END
$$;

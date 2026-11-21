-- 005_user_data_rls.sql
-- Strengthen RLS so that user-owned rows are only visible/writable by their owner.
-- Requires human review before applying to production.
--
-- Notes:
-- - This project uses a custom session cookie (lb_session), not Supabase Auth.
-- - The application layer already scopes queries by the authenticated user id.
-- - These policies provide a second line of defence when the DB is accessed
--   directly (e.g. via a compromised service role or future Supabase integration).
-- - For the current cookie-based auth, the app continues to enforce ownership
--   in TypeScript. These policies become fully effective once a proper
--   auth.uid() / JWT claim is wired (or when using Supabase Auth later).

-- Helper: current user id from a request setting (set by the app / middleware).
-- The application should execute:
--   SELECT set_config('app.current_user_id', '<uuid>', true);
-- before running user-scoped queries when using a privileged connection.

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '')::uuid;
$$;

-- ---------------------------------------------------------------------------
-- slips
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS slips_select_own ON slips;
DROP POLICY IF EXISTS slips_insert_own ON slips;
DROP POLICY IF EXISTS slips_update_own ON slips;
DROP POLICY IF EXISTS slips_delete_own ON slips;

CREATE POLICY slips_select_own ON slips
  FOR SELECT
  USING (
    user_id IS NULL                          -- AI / system slips
    OR user_id = app_current_user_id()
  );

CREATE POLICY slips_insert_own ON slips
  FOR INSERT
  WITH CHECK (
    user_id IS NULL
    OR user_id = app_current_user_id()
  );

CREATE POLICY slips_update_own ON slips
  FOR UPDATE
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

CREATE POLICY slips_delete_own ON slips
  FOR DELETE
  USING (user_id = app_current_user_id());

-- ---------------------------------------------------------------------------
-- picks (owned via parent slip)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS picks_select_via_slip ON picks;
DROP POLICY IF EXISTS picks_insert_via_slip ON picks;
DROP POLICY IF EXISTS picks_update_via_slip ON picks;
DROP POLICY IF EXISTS picks_delete_via_slip ON picks;

CREATE POLICY picks_select_via_slip ON picks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM slips s
      WHERE s.id = picks.slip_id
        AND (s.user_id IS NULL OR s.user_id = app_current_user_id())
    )
  );

CREATE POLICY picks_insert_via_slip ON picks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM slips s
      WHERE s.id = picks.slip_id
        AND (s.user_id IS NULL OR s.user_id = app_current_user_id())
    )
  );

CREATE POLICY picks_update_via_slip ON picks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM slips s
      WHERE s.id = picks.slip_id
        AND s.user_id = app_current_user_id()
    )
  );

CREATE POLICY picks_delete_via_slip ON picks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM slips s
      WHERE s.id = picks.slip_id
        AND s.user_id = app_current_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- community_posts
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS community_posts_select_own ON community_posts;
DROP POLICY IF EXISTS community_posts_insert_own ON community_posts;
DROP POLICY IF EXISTS community_posts_update_own ON community_posts;
DROP POLICY IF EXISTS community_posts_delete_own ON community_posts;

CREATE POLICY community_posts_select_own ON community_posts
  FOR SELECT
  USING (user_id = app_current_user_id() OR true);  -- public read for feed; tighten later if needed

CREATE POLICY community_posts_insert_own ON community_posts
  FOR INSERT
  WITH CHECK (user_id = app_current_user_id());

CREATE POLICY community_posts_update_own ON community_posts
  FOR UPDATE
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

CREATE POLICY community_posts_delete_own ON community_posts
  FOR DELETE
  USING (user_id = app_current_user_id());

-- ---------------------------------------------------------------------------
-- sessions (owner can only see/delete their own)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS sessions_select_own ON sessions;
DROP POLICY IF EXISTS sessions_delete_own ON sessions;

CREATE POLICY sessions_select_own ON sessions
  FOR SELECT
  USING (user_id = app_current_user_id());

CREATE POLICY sessions_delete_own ON sessions
  FOR DELETE
  USING (user_id = app_current_user_id());

-- NOTE: users table itself should remain readable only by the service role
-- for login (find-by-username). Do not open it to the anon/authenticated role.

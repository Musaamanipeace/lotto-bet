import type pg from 'pg';
import { getPool } from './pg-store.ts';

const g = globalThis as unknown as {
  __lottoPgUserSettingsReady?: Promise<void> | null;
  __lottoPgShortcutsReady?: Promise<void> | null;
  __lottoPgSavedSlipsReady?: Promise<void> | null;
};

async function ensureUserIdFunctions(pool: pg.Pool): Promise<void> {
  await pool.query(`
    CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS uuid
    LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('app.current_user_id', true), '')::uuid;
    $$;
  `);
  await pool.query(`
    CREATE OR REPLACE FUNCTION effective_user_id() RETURNS uuid
    LANGUAGE plpgsql STABLE AS $$
    DECLARE
      uid uuid;
    BEGIN
      BEGIN
        EXECUTE 'SELECT auth.uid()' INTO uid;
      EXCEPTION WHEN OTHERS THEN
        uid := NULL;
      END;
      RETURN COALESCE(uid, app_current_user_id());
    END;
    $$;
  `);
}

async function ensurePolicy(
  pool: pg.Pool,
  table: string,
  policyName: string,
  clause: string,
): Promise<void> {
  await pool.query(
    `DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = current_schema()
          AND tablename = $1
          AND policyname = $2
      ) THEN
        EXECUTE format('CREATE POLICY %I ON %I ${clause}', $2, $1);
      END IF;
    END
    $$;`,
    [table, policyName],
  );
}

async function ensureOwnRowsPolicies(pool: pg.Pool, table: string): Promise<void> {
  const cond = '(effective_user_id() IS NOT NULL AND user_id = effective_user_id())';
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = '${table}' AND policyname = '${table}_select_own'
      ) THEN
        CREATE POLICY ${table}_select_own ON ${table} FOR SELECT USING ${cond};
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = '${table}' AND policyname = '${table}_insert_own'
      ) THEN
        CREATE POLICY ${table}_insert_own ON ${table} FOR INSERT WITH CHECK ${cond};
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = '${table}' AND policyname = '${table}_update_own'
      ) THEN
        CREATE POLICY ${table}_update_own ON ${table} FOR UPDATE USING ${cond} WITH CHECK ${cond};
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = '${table}' AND policyname = '${table}_delete_own'
      ) THEN
        CREATE POLICY ${table}_delete_own ON ${table} FOR DELETE USING ${cond};
      END IF;
    END
    $$;
  `);
}

/**
 * Idempotent, strictly non-destructive schema bootstrap mirroring
 * `db/migrations/007_user_api_keys.sql` so a missed migration does not break Settings or Templates.
 */
export function ensureUserSettingsTables(): Promise<void> {
  return (g.__lottoPgUserSettingsReady ??= (async () => {
    const pool = await getPool();
    const check = await pool.query<{ has_keys: boolean; has_settings: boolean }>(`
      SELECT
        to_regclass('user_api_keys') IS NOT NULL AS has_keys,
        to_regclass('user_settings') IS NOT NULL AS has_settings
    `);
    const row = check.rows[0];
    if (row?.has_keys && row?.has_settings) return;

    await ensureUserIdFunctions(pool);

    if (!row?.has_keys) {
      await pool.query(`
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
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS user_api_keys_user_idx ON user_api_keys (user_id)`);
      await pool.query(`ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY`);
      await pool.query(`ALTER TABLE user_api_keys FORCE ROW LEVEL SECURITY`);
      await ensureOwnRowsPolicies(pool, 'user_api_keys');
    }

    if (!row?.has_settings) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_settings (
          user_id           uuid PRIMARY KEY DEFAULT effective_user_id() REFERENCES users(id) ON DELETE CASCADE,
          selected_model    text NOT NULL DEFAULT 'gemini-2.5-flash',
          provider          text NOT NULL DEFAULT 'gemini' CHECK (provider IN ('gemini', 'openrouter', 'mistral')),
          timeout_seconds   integer NOT NULL DEFAULT 35 CHECK (timeout_seconds BETWEEN 10 AND 120),
          default_bookmaker text NOT NULL DEFAULT 'sportybet' CHECK (default_bookmaker IN ('sportybet', 'betpawa')),
          filter_state      jsonb,
          custom_templates  jsonb NOT NULL DEFAULT '[]'::jsonb,
          updated_at        timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY`);
      await pool.query(`ALTER TABLE user_settings FORCE ROW LEVEL SECURITY`);
      await ensureOwnRowsPolicies(pool, 'user_settings');
    }
  })().catch((e) => {
    g.__lottoPgUserSettingsReady = null;
    throw e;
  }));
}

/**
 * Idempotent, strictly non-destructive schema bootstrap mirroring
 * `db/migrations/006_security_rls_keys_shortcuts.sql` (`user_shortcuts` table).
 */
export function ensureShortcutsTable(): Promise<void> {
  return (g.__lottoPgShortcutsReady ??= (async () => {
    const pool = await getPool();
    const check = await pool.query<{ exists: boolean }>(
      `SELECT to_regclass('user_shortcuts') IS NOT NULL AS exists`,
    );
    if (check.rows[0]?.exists) return;

    await ensureUserIdFunctions(pool);

    await pool.query(`
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
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS user_shortcuts_user_pos_idx ON user_shortcuts (user_id, position)`);
    await pool.query(`ALTER TABLE user_shortcuts ENABLE ROW LEVEL SECURITY`);
    await pool.query(`ALTER TABLE user_shortcuts FORCE ROW LEVEL SECURITY`);
    await ensureOwnRowsPolicies(pool, 'user_shortcuts');
  })().catch((e) => {
    g.__lottoPgShortcutsReady = null;
    throw e;
  }));
}

/**
 * Idempotent, strictly non-destructive additive column check for `slips`
 * mirroring `db/migrations/007_user_api_keys.sql`.
 */
export function ensureSavedSlipsColumns(): Promise<void> {
  return (g.__lottoPgSavedSlipsReady ??= (async () => {
    const pool = await getPool();
    const check = await pool.query<{ cnt: string }>(`
      SELECT count(*)::text AS cnt
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'slips'
        AND column_name IN ('name', 'combined_implied', 'shared', 'share_note')
    `);
    if (Number(check.rows[0]?.cnt ?? 0) >= 4) return;

    await pool.query(`
      ALTER TABLE slips
        ADD COLUMN IF NOT EXISTS name text,
        ADD COLUMN IF NOT EXISTS combined_implied numeric(8,6),
        ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS share_note text
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS slips_user_created_idx ON slips (user_id, created_at DESC)`);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS slips_shared_created_idx ON slips (shared, created_at DESC) WHERE shared = true`,
    );
  })().catch((e) => {
    g.__lottoPgSavedSlipsReady = null;
    throw e;
  }));
}

void ensurePolicy;

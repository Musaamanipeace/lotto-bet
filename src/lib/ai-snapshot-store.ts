/**
 * Where the latest AI snapshot lives.
 * - Postgres when DATABASE_URL is set, so every serverless instance reads the same picks.
 * - In-process memory otherwise (local dev only; the production guard in run-ai.ts refuses it).
 */
import { getPool } from './pg-store.ts';
import type { AiSnapshot } from './ai-store.ts';

export interface SnapshotStore {
  save(snap: AiSnapshot): Promise<void>;
  latest(): Promise<AiSnapshot | null>;
}

export class MemorySnapshotStore implements SnapshotStore {
  private snap: AiSnapshot | null = null;
  async save(snap: AiSnapshot) { this.snap = snap; }
  async latest() { return this.snap; }
}

const KEEP = 5;

export class PgSnapshotStore implements SnapshotStore {
  private ready: Promise<void> | null = null;

  /** Idempotent; mirrors db/migrations/004_ai_snapshots.sql so a missed migration does not break the app. */
  private ensureTable(): Promise<void> {
    return (this.ready ??= (async () => {
      const pool = await getPool();
      await pool.query(`CREATE TABLE IF NOT EXISTS ai_snapshots (
        id bigserial PRIMARY KEY, run_id text, generated_at timestamptz NOT NULL DEFAULT now(), data jsonb NOT NULL)`);
      await pool.query('ALTER TABLE ai_snapshots ENABLE ROW LEVEL SECURITY');
    })().catch((e) => { this.ready = null; throw e; }));
  }

  async save(snap: AiSnapshot) {
    await this.ensureTable();
    const pool = await getPool();
    await pool.query('INSERT INTO ai_snapshots (run_id, data) VALUES ($1, $2::jsonb)', [snap.runId, JSON.stringify(snap)]);
    await pool.query('DELETE FROM ai_snapshots WHERE id NOT IN (SELECT id FROM ai_snapshots ORDER BY id DESC LIMIT $1)', [KEEP]);
  }

  async latest() {
    await this.ensureTable();
    const pool = await getPool();
    const r = await pool.query('SELECT data FROM ai_snapshots ORDER BY id DESC LIMIT 1');
    return r.rows[0] ? (r.rows[0].data as AiSnapshot) : null;
  }
}

const g = globalThis as unknown as { __lottoMemorySnapshots?: MemorySnapshotStore; __lottoPgSnapshots?: PgSnapshotStore };

export function getSnapshotStore(): SnapshotStore {
  if (process.env.DATABASE_URL) return (g.__lottoPgSnapshots ??= new PgSnapshotStore());
  return (g.__lottoMemorySnapshots ??= new MemorySnapshotStore());
}

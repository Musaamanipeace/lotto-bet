import pg from 'pg';
import type { AuthStore, User } from './auth.ts';

let pool: pg.Pool | null = null;
function getPool(): pg.Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return (pool ??= new pg.Pool({ connectionString: url, max: 3 }));
}

export class PgAuthStore implements AuthStore {
  async createUser(username: string, passwordHash: string) {
    try {
      const r = await getPool().query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id', [username, passwordHash]);
      return { id: r.rows[0].id as string };
    } catch (e) {
      if ((e as { code?: string }).code === '23505') return 'taken' as const;
      throw e;
    }
  }
  async findUserByUsername(username: string) {
    const r = await getPool().query('SELECT id, username, password_hash FROM users WHERE username = $1', [username]);
    const x = r.rows[0];
    return x ? { id: x.id as string, username: x.username as string, passwordHash: x.password_hash as string } : null;
  }
  async createSession(userId: string, tokenHash: string, expiresAt: number) {
    await getPool().query('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, to_timestamp($3 / 1000.0))', [userId, tokenHash, expiresAt]);
  }
  async findSessionUser(tokenHash: string, now: number): Promise<User | null> {
    const r = await getPool().query(
      `SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > to_timestamp($2 / 1000.0)`, [tokenHash, now]);
    return r.rows[0] ? { id: r.rows[0].id, username: r.rows[0].username } : null;
  }
  async deleteSession(tokenHash: string) {
    await getPool().query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  }
}

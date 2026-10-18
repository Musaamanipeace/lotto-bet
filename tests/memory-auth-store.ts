// TEST-ONLY in-memory AuthStore. Never imported by app code.
import type { AuthStore, User } from '../src/lib/auth.ts';

export class MemoryAuthStore implements AuthStore {
  users: { id: string; username: string; passwordHash: string }[] = [];
  sessions = new Map<string, { userId: string; expiresAt: number }>();
  async createUser(username: string, passwordHash: string) {
    if (this.users.some((u) => u.username === username)) return 'taken' as const;
    const id = `u${this.users.length + 1}`;
    this.users.push({ id, username, passwordHash });
    return { id };
  }
  async findUserByUsername(username: string) { return this.users.find((u) => u.username === username) ?? null; }
  async createSession(userId: string, tokenHash: string, expiresAt: number) { this.sessions.set(tokenHash, { userId, expiresAt }); }
  async findSessionUser(tokenHash: string, now: number): Promise<User | null> {
    const s = this.sessions.get(tokenHash);
    if (!s || s.expiresAt <= now) return null;
    const u = this.users.find((x) => x.id === s.userId)!;
    return { id: u.id, username: u.username };
  }
  async deleteSession(tokenHash: string) { this.sessions.delete(tokenHash); }
}

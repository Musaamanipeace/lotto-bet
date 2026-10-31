import type { AuthStore, User } from './auth.ts';

export class MemoryAuthStore implements AuthStore {
  private users: { id: string; username: string; passwordHash: string; createdAt: number }[] = [];
  private sessions = new Map<string, { userId: string; expiresAt: number }>();

  private userClock = 0;

  async createUser(username: string, passwordHash: string): Promise<{ id: string } | 'taken'> {
    if (this.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return 'taken' as const;
    }
    const id = `usr_${Date.now()}_${++this.userClock}`;
    this.users.push({ id, username, passwordHash, createdAt: Date.now() });
    return { id };
  }

  async findUserByUsername(username: string): Promise<{ id: string; username: string; passwordHash: string } | null> {
    const u = this.users.find((x) => x.username.toLowerCase() === username.toLowerCase());
    return u ? { id: u.id, username: u.username, passwordHash: u.passwordHash } : null;
  }

  async createSession(userId: string, tokenHash: string, expiresAt: number): Promise<void> {
    this.sessions.set(tokenHash, { userId, expiresAt });
  }

  async findSessionUser(tokenHash: string, now: number): Promise<User | null> {
    const s = this.sessions.get(tokenHash);
    if (!s || s.expiresAt <= now) {
      if (s) this.sessions.delete(tokenHash);
      return null;
    }
    const u = this.users.find((x) => x.id === s.userId);
    return u ? { id: u.id, username: u.username } : null;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);
  }

  getUsersCount(): number {
    return this.users.length;
  }
}

let sharedMemoryAuthStore: MemoryAuthStore | null = null;
export function getMemoryAuthStore(): MemoryAuthStore {
  return (sharedMemoryAuthStore ??= new MemoryAuthStore());
}

import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { fail, ok, type Result } from './result.ts';

export const SESSION_COOKIE = 'lb_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const USERNAME_RE = /^[a-z0-9_]{3,32}$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128; // upper bound so a huge body cannot be used to burn CPU in scrypt

export type User = { id: string; username: string };

/** Persistence for users and sessions. Postgres in the app (pg-auth-store.ts), in-memory in tests only. */
export interface AuthStore {
  /** Returns 'taken' when the username already exists. */
  createUser(username: string, passwordHash: string): Promise<{ id: string } | 'taken'>;
  findUserByUsername(username: string): Promise<{ id: string; username: string; passwordHash: string } | null>;
  createSession(userId: string, tokenHash: string, expiresAt: number): Promise<void>;
  /** Returns the user only if the session exists and has not expired at `now`. */
  findSessionUser(tokenHash: string, now: number): Promise<User | null>;
  deleteSession(tokenHash: string): Promise<void>;
}

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function scryptAsync(password: string, salt: Buffer, p: typeof SCRYPT): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, p.keylen, { N: p.N, r: p.r, p: p.p }, (e, k) => (e ? reject(e) : resolve(k))),
  );
}

/** Format: scrypt$N$r$p$saltB64$hashB64. Per-password random salt; parameters travel with the hash. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, saltB64, hashB64] = stored.split('$');
  if (alg !== 'scrypt' || !saltB64 || !hashB64) return false;
  const params = { N: Number(n), r: Number(r), p: Number(p), keylen: Buffer.from(hashB64, 'base64').length };
  if (![params.N, params.r, params.p].every((x) => Number.isInteger(x) && x > 0)) return false;
  let key: Buffer;
  try { key = await scryptAsync(password, Buffer.from(saltB64, 'base64'), params); } catch { return false; }
  const want = Buffer.from(hashB64, 'base64');
  return key.length === want.length && timingSafeEqual(key, want);
}

export function validateCredentials(usernameRaw: unknown, passwordRaw: unknown): Result<{ username: string; password: string }> {
  if (typeof usernameRaw !== 'string' || typeof passwordRaw !== 'string') return fail('Username and password are required');
  const username = usernameRaw.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) return fail('Username must be 3-32 characters: letters, digits or underscore');
  if (passwordRaw.length < PASSWORD_MIN) return fail(`Password must be at least ${PASSWORD_MIN} characters`);
  if (passwordRaw.length > PASSWORD_MAX) return fail(`Password must be at most ${PASSWORD_MAX} characters`);
  return ok({ username, password: passwordRaw });
}

export const newSessionToken = () => randomBytes(32).toString('base64url');
/** Only the hash is stored, so a leaked database does not leak usable session tokens. */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

type Session = { token: string; expiresAt: number; user: User };

async function startSession(store: AuthStore, user: User, now: number): Promise<Session> {
  const token = newSessionToken();
  const expiresAt = now + SESSION_TTL_MS;
  await store.createSession(user.id, hashToken(token), expiresAt);
  return { token, expiresAt, user };
}

export async function signUp(store: AuthStore, usernameRaw: unknown, passwordRaw: unknown, now = Date.now()): Promise<Result<Session>> {
  const c = validateCredentials(usernameRaw, passwordRaw);
  if (!c.ok) return c;
  const created = await store.createUser(c.username, await hashPassword(c.password));
  if (created === 'taken') return fail('That username is already taken');
  return ok(await startSession(store, { id: created.id, username: c.username }, now));
}

// A real hash to compare against when the username does not exist, so timing does not reveal which usernames exist.
const DUMMY_HASH = hashPassword('not-a-real-password');

export async function logIn(store: AuthStore, usernameRaw: unknown, passwordRaw: unknown, now = Date.now()): Promise<Result<Session>> {
  const generic = fail('Invalid username or password');
  if (typeof usernameRaw !== 'string' || typeof passwordRaw !== 'string' || passwordRaw.length > PASSWORD_MAX) return generic;
  const user = await store.findUserByUsername(usernameRaw.trim().toLowerCase());
  const good = await verifyPassword(passwordRaw, user ? user.passwordHash : await DUMMY_HASH);
  if (!user || !good) return generic;
  return ok(await startSession(store, { id: user.id, username: user.username }, now));
}

export async function userForToken(store: AuthStore, token: string | null, now = Date.now()): Promise<User | null> {
  if (!token) return null;
  return store.findSessionUser(hashToken(token), now);
}

export async function logOut(store: AuthStore, token: string | null): Promise<void> {
  if (token) await store.deleteSession(hashToken(token));
}

export function readSessionToken(cookieHeader: string | null): string | null {
  for (const part of (cookieHeader ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === SESSION_COOKIE) return decodeURIComponent(part.slice(i + 1).trim()) || null;
  }
  return null;
}

export function sessionCookie(token: string, expiresAt: number, secure: boolean): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(expiresAt).toUTCString()}${secure ? '; Secure' : ''}`;
}
export const clearedSessionCookie = (secure: boolean) =>
  `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;

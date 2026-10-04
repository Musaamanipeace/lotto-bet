import { SavedBetslip, SelectedPick, SlipResultStatus, UserProfile } from '@/types';
import { calculateAccumulatorOdds } from './filterEngine';

const USERS_KEY = 'lottobet_users_v1';
const SESSION_KEY = 'lottobet_session_v1';
const SLIPS_KEY = 'lottobet_slips_v1';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getSessionEmail(): string | null {
  return readJson<string | null>(SESSION_KEY, null);
}

export function setSessionEmail(email: string | null) {
  if (email) writeJson(SESSION_KEY, email);
  else if (typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY);
}

export function listUsers(): UserProfile[] {
  return readJson<UserProfile[]>(USERS_KEY, []);
}

export async function registerUser(
  email: string,
  password: string
): Promise<{ ok: true; user: UserProfile } | { ok: false; error: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@') || password.length < 4) {
    return { ok: false, error: 'Use a valid email and password (min 4 chars).' };
  }
  const users = listUsers();
  if (users.some((u) => u.email === normalized)) {
    return { ok: false, error: 'Account already exists. Sign in instead.' };
  }
  const passwordHash = await hashPassword(password, normalized);
  const user: UserProfile = {
    email: normalized,
    passwordHash,
    createdAt: new Date().toISOString(),
    llmProvider: 'openai',
    llmModel: 'gpt-4o-mini',
  };
  users.push(user);
  writeJson(USERS_KEY, users);
  setSessionEmail(normalized);
  return { ok: true, user };
}

export async function signInUser(
  email: string,
  password: string
): Promise<{ ok: true; user: UserProfile } | { ok: false; error: string }> {
  const normalized = email.trim().toLowerCase();
  const users = listUsers();
  const user = users.find((u) => u.email === normalized);
  if (!user) return { ok: false, error: 'No account with that email.' };
  const hash = await hashPassword(password, normalized);
  if (hash !== user.passwordHash) return { ok: false, error: 'Wrong password.' };
  setSessionEmail(normalized);
  return { ok: true, user };
}

export function signOutUser() {
  setSessionEmail(null);
}

export function getCurrentUser(): UserProfile | null {
  const email = getSessionEmail();
  if (!email) return null;
  return listUsers().find((u) => u.email === email) || null;
}

export function updateCurrentUser(patch: Partial<UserProfile>): UserProfile | null {
  const email = getSessionEmail();
  if (!email) return null;
  const users = listUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx < 0) return null;
  users[idx] = { ...users[idx], ...patch, email: users[idx].email, passwordHash: users[idx].passwordHash };
  writeJson(USERS_KEY, users);
  return users[idx];
}

function slipsKey(email: string) {
  return `${SLIPS_KEY}:${email}`;
}

export function listSavedSlips(email?: string | null): SavedBetslip[] {
  const e = email || getSessionEmail();
  if (!e) return [];
  const slips = readJson<SavedBetslip[]>(slipsKey(e), []);
  // Auto-mark open slips past last kickoff as unknown if still open
  const now = Date.now();
  let changed = false;
  for (const s of slips) {
    if (s.status === 'open' && s.earliestKickoff) {
      const t = new Date(s.earliestKickoff).getTime();
      // 3h after earliest kickoff → mark unknown (user can set won/lost)
      if (!isNaN(t) && now > t + 3 * 3600_000) {
        s.status = 'unknown';
        changed = true;
      }
    }
  }
  if (changed) writeJson(slipsKey(e), slips);
  return slips;
}

export function saveBetslip(
  name: string,
  selections: SelectedPick[],
  opts: { bookingCode?: string; stake?: number; notes?: string } = {}
): SavedBetslip | null {
  const email = getSessionEmail();
  if (!email || selections.length === 0) return null;
  const slips = listSavedSlips(email);
  const earliest = selections
    .map((s) => new Date(s.kickoffTime).getTime())
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b)[0];
  const slip: SavedBetslip = {
    id: `slip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || `Slip ${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    selections,
    totalOdds: calculateAccumulatorOdds(selections),
    bookingCode: opts.bookingCode,
    stake: opts.stake,
    status: 'open',
    notes: opts.notes,
    earliestKickoff: earliest ? new Date(earliest).toISOString() : undefined,
  };
  slips.unshift(slip);
  writeJson(slipsKey(email), slips);
  return slip;
}

export function updateSavedSlip(
  id: string,
  patch: Partial<SavedBetslip>
): SavedBetslip | null {
  const email = getSessionEmail();
  if (!email) return null;
  const slips = listSavedSlips(email);
  const idx = slips.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  slips[idx] = {
    ...slips[idx],
    ...patch,
    id: slips[idx].id,
    createdAt: slips[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  writeJson(slipsKey(email), slips);
  return slips[idx];
}

export function deleteSavedSlip(id: string): boolean {
  const email = getSessionEmail();
  if (!email) return false;
  const slips = listSavedSlips(email).filter((s) => s.id !== id);
  writeJson(slipsKey(email), slips);
  return true;
}

export function deleteAllSavedSlips(): number {
  const email = getSessionEmail();
  if (!email) return 0;
  const n = listSavedSlips(email).length;
  writeJson(slipsKey(email), []);
  return n;
}

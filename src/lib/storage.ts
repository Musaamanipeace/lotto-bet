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

export function getSessionUsername(): string | null {
  return readJson<string | null>(SESSION_KEY, null);
}

export function setSessionUsername(username: string | null) {
  if (username) writeJson(SESSION_KEY, username);
  else if (typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY);
}

export function listUsers(): UserProfile[] {
  return readJson<UserProfile[]>(USERS_KEY, []);
}

export async function registerUser(
  username: string,
  password: string
): Promise<{ ok: true; user: UserProfile } | { ok: false; error: string }> {
  const normalized = username.trim().toLowerCase();
  if (!normalized || password.length < 4) {
    return { ok: false, error: 'Use a valid username and password (min 4 chars).' };
  }
  const users = listUsers();
  if (users.some((u) => u.username === normalized)) {
    return { ok: false, error: 'Account already exists. Sign in instead.' };
  }
  const passwordHash = await hashPassword(password, normalized);
  const user: UserProfile = {
    username: normalized,
    passwordHash,
    createdAt: new Date().toISOString(),
    llmProvider: 'openai',
    llmModel: 'gpt-4o-mini',
  };
  users.push(user);
  writeJson(USERS_KEY, users);
  setSessionUsername(normalized);
  return { ok: true, user };
}

export async function signInUser(
  username: string,
  password: string
): Promise<{ ok: true; user: UserProfile } | { ok: false; error: string }> {
  const normalized = username.trim().toLowerCase();
  const users = listUsers();
  const user = users.find((u) => u.username === normalized);
  if (!user) return { ok: false, error: 'No account with that username.' };
  const hash = await hashPassword(password, normalized);
  if (hash !== user.passwordHash) return { ok: false, error: 'Wrong password.' };
  setSessionUsername(normalized);
  return { ok: true, user };
}

export function signOutUser() {
  setSessionUsername(null);
}

export function getCurrentUser(): UserProfile | null {
  const username = getSessionUsername();
  if (!username) return null;
  return listUsers().find((u) => u.username === username) || null;
}

export function updateCurrentUser(patch: Partial<UserProfile>): UserProfile | null {
  const username = getSessionUsername();
  if (!username) return null;
  const users = listUsers();
  const idx = users.findIndex((u) => u.username === username);
  if (idx < 0) return null;
  users[idx] = { ...users[idx], ...patch, username: users[idx].username, passwordHash: users[idx].passwordHash };
  writeJson(USERS_KEY, users);
  return users[idx];
}

function slipsKey(username: string) {
  return `${SLIPS_KEY}:${username}`;
}

export function listSavedSlips(username?: string | null): SavedBetslip[] {
  const u = username || getSessionUsername();
  if (!u) return [];
  const slips = readJson<SavedBetslip[]>(slipsKey(u), []);
  const now = Date.now();
  let changed = false;
  for (const s of slips) {
    if (s.status === 'open' && s.earliestKickoff) {
      const t = new Date(s.earliestKickoff).getTime();
      if (!isNaN(t) && now > t + 3 * 3600_000) {
        s.status = 'unknown';
        changed = true;
      }
    }
  }
  if (changed) writeJson(slipsKey(u), slips);
  return slips;
}

export function saveBetslip(
  name: string,
  selections: SelectedPick[],
  opts: { bookingCode?: string; stake?: number; notes?: string } = {}
): SavedBetslip | null {
  const username = getSessionUsername();
  if (!username || selections.length === 0) return null;
  const slips = listSavedSlips(username);
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
  writeJson(slipsKey(username), slips);
  return slip;
}

export function appendToBetslip(
  slipId: string,
  newSelections: SelectedPick[]
): SavedBetslip | null {
  const username = getSessionUsername();
  if (!username || newSelections.length === 0) return null;
  const slips = listSavedSlips(username);
  const idx = slips.findIndex((s) => s.id === slipId);
  if (idx < 0) return null;

  const existing = slips[idx];
  const mergedSelections = [...existing.selections];
  const existingGameIds = new Set(existing.selections.map((s) => s.gameId));

  for (const pick of newSelections) {
    if (!existingGameIds.has(pick.gameId)) {
      mergedSelections.push(pick);
      existingGameIds.add(pick.gameId);
    }
  }

  const earliest = mergedSelections
    .map((s) => new Date(s.kickoffTime).getTime())
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b)[0];

  slips[idx] = {
    ...existing,
    selections: mergedSelections,
    totalOdds: calculateAccumulatorOdds(mergedSelections),
    updatedAt: new Date().toISOString(),
    earliestKickoff: earliest ? new Date(earliest).toISOString() : undefined,
  };
  writeJson(slipsKey(username), slips);
  return slips[idx];
}

export function updateSavedSlip(
  id: string,
  patch: Partial<SavedBetslip>
): SavedBetslip | null {
  const username = getSessionUsername();
  if (!username) return null;
  const slips = listSavedSlips(username);
  const idx = slips.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  slips[idx] = {
    ...slips[idx],
    ...patch,
    id: slips[idx].id,
    createdAt: slips[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  writeJson(slipsKey(username), slips);
  return slips[idx];
}

export function deleteSavedSlip(id: string): boolean {
  const username = getSessionUsername();
  if (!username) return false;
  const slips = listSavedSlips(username).filter((s) => s.id !== id);
  writeJson(slipsKey(username), slips);
  return true;
}

export function deleteAllSavedSlips(): number {
  const username = getSessionUsername();
  if (!username) return 0;
  const n = listSavedSlips(username).length;
  writeJson(slipsKey(username), []);
  return n;
}
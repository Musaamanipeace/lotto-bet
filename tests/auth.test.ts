import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SESSION_COOKIE, SESSION_TTL_MS, clearedSessionCookie, hashPassword, hashToken, logIn, logOut,
  readSessionToken, sessionCookie, signUp, userForToken, validateCredentials, verifyPassword,
} from '../src/lib/auth.ts';
import { MemoryAuthStore } from './memory-auth-store.ts';

test('passwords are salted scrypt hashes, never plaintext, and verify correctly', async () => {
  const a = await hashPassword('correct horse'), b = await hashPassword('correct horse');
  assert.match(a, /^scrypt\$\d+\$\d+\$\d+\$/);
  assert.ok(!a.includes('correct horse'));
  assert.notEqual(a, b, 'same password must hash differently (random salt)');
  assert.equal(await verifyPassword('correct horse', a), true);
  assert.equal(await verifyPassword('wrong horse', a), false);
  assert.equal(await verifyPassword('x', 'garbage'), false);
});

test('credential validation: lowercased username, length limits, explicit messages', () => {
  const ok = validateCredentials('  Alice_1 ', 'longenough');
  assert.ok(ok.ok && ok.username === 'alice_1');
  assert.equal(validateCredentials('ab', 'longenough').ok, false);
  assert.equal(validateCredentials('has space', 'longenough').ok, false);
  const short = validateCredentials('alice', 'short');
  assert.ok(!short.ok && /at least 8/.test(short.error));
  assert.equal(validateCredentials('alice', 'x'.repeat(129)).ok, false);
  assert.equal(validateCredentials(undefined, 'longenough').ok, false);
});

test('sign-up stores only a hash; duplicate username is an explicit error; session works then logs out', async () => {
  const store = new MemoryAuthStore();
  const r = await signUp(store, 'Alice', 'password123', 1000);
  assert.ok(r.ok);
  assert.ok(!store.users[0].passwordHash.includes('password123'));
  const dup = await signUp(store, 'alice', 'otherpass123', 1000);
  assert.ok(!dup.ok && /taken/.test(dup.error));
  assert.deepEqual(await userForToken(store, r.token, 2000), { id: 'u1', username: 'alice' });
  assert.equal([...store.sessions.keys()][0], hashToken(r.token), 'only the token hash is stored');
  assert.ok(!store.sessions.has(r.token));
  await logOut(store, r.token);
  assert.equal(await userForToken(store, r.token, 2000), null);
});

test('sessions expire', async () => {
  const store = new MemoryAuthStore();
  const r = await signUp(store, 'bob', 'password123', 0);
  assert.ok(r.ok);
  assert.ok(await userForToken(store, r.token, SESSION_TTL_MS - 1));
  assert.equal(await userForToken(store, r.token, SESSION_TTL_MS), null);
  assert.equal(await userForToken(store, null, 0), null);
});

test('log-in: wrong password and unknown user give the same generic error', async () => {
  const store = new MemoryAuthStore();
  await signUp(store, 'carol', 'password123');
  const good = await logIn(store, 'CAROL', 'password123');
  assert.ok(good.ok && good.user.username === 'carol');
  const wrong = await logIn(store, 'carol', 'nope-nope-nope');
  const ghost = await logIn(store, 'nobody', 'password123');
  assert.ok(!wrong.ok && !ghost.ok);
  assert.equal(wrong.error, 'Invalid username or password');
  assert.equal(ghost.error, wrong.error);
});

test('cookie helpers: HttpOnly + SameSite, Secure in production, parsing', () => {
  const c = sessionCookie('tok/en', 1_800_000_000_000, true);
  assert.match(c, new RegExp(`^${SESSION_COOKIE}=`));
  assert.ok(c.includes('HttpOnly') && c.includes('SameSite=Lax') && c.includes('Secure'));
  assert.ok(!sessionCookie('t', 1, false).includes('Secure'));
  assert.ok(clearedSessionCookie(false).includes('Max-Age=0'));
  assert.equal(readSessionToken(`a=1; ${SESSION_COOKIE}=${encodeURIComponent('tok/en')}; b=2`), 'tok/en');
  assert.equal(readSessionToken('a=1'), null);
  assert.equal(readSessionToken(null), null);
});

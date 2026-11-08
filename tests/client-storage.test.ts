import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_USER_STORAGE_KEYS,
  STORAGE_KEYS,
  clearAllUserStorage,
  hasAnyUserStorage,
  performFullSignOutCleanup,
  scopedStorageKey,
  setActiveStorageUserId,
  getActiveStorageUserId,
} from '../src/lib/client-storage.ts';
import {
  getClientSettings,
  saveClientSettings,
  getClientAiHeaders,
  hasSubmittedByok,
} from '../src/lib/client-settings.ts';
import { readSlip, writeSlip } from '../src/lib/slip-store.ts';
import { emptySlip, defaultSlipName } from '../src/lib/slip.ts';
import { getLocalTemplates, saveLocalTemplate } from '../src/lib/template-store.ts';
import { defaultCards } from '../src/lib/market-cards.ts';

// Minimal in-memory localStorage mock for Node tests
function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, String(value));
    },
    removeItem(key: string) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
    get length() {
      return data.size;
    },
    key(i: number) {
      return Array.from(data.keys())[i] ?? null;
    },
    _data: data,
  };
}

describe('client-storage & signOut cleanup (Task 1 & Task 2)', () => {
  it('exposes the expected registry of keys', () => {
    assert.ok(ALL_USER_STORAGE_KEYS.includes(STORAGE_KEYS.SLIP));
    assert.ok(ALL_USER_STORAGE_KEYS.includes(STORAGE_KEYS.CLIENT_AI_SETTINGS));
    assert.ok(ALL_USER_STORAGE_KEYS.includes(STORAGE_KEYS.SAVED_SLIPS));
    assert.ok(ALL_USER_STORAGE_KEYS.includes(STORAGE_KEYS.FILTER_TEMPLATES));
    assert.ok(ALL_USER_STORAGE_KEYS.includes(STORAGE_KEYS.RESULTS_SCORES));
    assert.ok(ALL_USER_STORAGE_KEYS.includes(STORAGE_KEYS.TOP_HUB_COLLAPSED));
    assert.equal(ALL_USER_STORAGE_KEYS.length, 6);
  });

  it('namespaces keys by active user ID and prevents User A data from leaking to User B', () => {
    const mem = createMemoryStorage();
    // @ts-expect-error – injecting mock into global
    globalThis.localStorage = mem;
    // @ts-expect-error
    globalThis.sessionStorage = createMemoryStorage();
    // @ts-expect-error
    globalThis.window = globalThis;

    setActiveStorageUserId('user-a');
    assert.equal(getActiveStorageUserId(), 'user-a');
    assert.equal(scopedStorageKey(STORAGE_KEYS.SLIP), 'lb_slip_v1:user-a');

    // User A saves a slip and custom AI model settings
    writeSlip({
      id: 'slip-a',
      name: 'User A Slip',
      greyed: [],
      legs: [
        {
          id: 'g1:1:1:',
          gameId: 'g1',
          home: 'Arsenal',
          away: 'Chelsea',
          league: 'EPL',
          kickoff: 1700000000000,
          bookmaker: 'sportybet',
          marketNativeId: '1',
          outcomeNativeId: '1',
          specifier: '',
          selectionLabel: 'Arsenal',
          marketLabel: '1X2',
          odds: 1.85,
          impliedProbability: 0.51,
        },
      ],
    });
    saveClientSettings({ selectedModel: 'mistral-small-latest', timeoutSeconds: 45 });

    assert.equal(readSlip().legs.length, 1);
    assert.equal(getClientSettings().selectedModel, 'mistral-small-latest');

    // Switch to User B (without even clearing first, User B must not read User A's keys)
    setActiveStorageUserId('user-b');
    assert.equal(scopedStorageKey(STORAGE_KEYS.SLIP), 'lb_slip_v1:user-b');
    assert.equal(readSlip().legs.length, 0);
    assert.equal(getClientSettings().selectedModel, 'gemini-2.5-flash');
  });

  it('performFullSignOutCleanup clears all registered keys, sessionStorage, IndexedDB, and SW caches', async () => {
    const mem = createMemoryStorage();
    const sess = createMemoryStorage();
    // @ts-expect-error
    globalThis.localStorage = mem;
    // @ts-expect-error
    globalThis.sessionStorage = sess;

    const deletedDbs: string[] = [];
    // @ts-expect-error
    globalThis.indexedDB = {
      databases: async () => [{ name: 'lb-local-db' }, { name: 'supabase-cache' }],
      deleteDatabase: (name: string) => {
        deletedDbs.push(name);
        const req: any = {};
        queueMicrotask(() => req.onsuccess?.());
        return req;
      },
    };

    const deletedCaches: string[] = [];
    // @ts-expect-error
    globalThis.caches = {
      keys: async () => ['lotto-bet-static-v1', 'other-cache'],
      delete: async (k: string) => {
        deletedCaches.push(k);
        return true;
      },
    };

    // Seed unscoped, user-scoped, legacy keys, and sessionStorage
    setActiveStorageUserId('user-a');
    for (const k of ALL_USER_STORAGE_KEYS) {
      mem.setItem(k, 'unscoped-val');
      mem.setItem(`${k}:user-a`, 'scoped-val-a');
      mem.setItem(`${k}:user-b`, 'scoped-val-b');
    }
    mem.setItem('lb_legacy_secret', 'should-also-go');
    mem.setItem('sb-auth-token', 'should-also-go');
    mem.setItem('unrelated', 'keep-me');
    sess.setItem('session_temp', 'temp-val');

    assert.equal(hasAnyUserStorage(), true);

    await performFullSignOutCleanup();

    assert.equal(getActiveStorageUserId(), null);
    for (const k of ALL_USER_STORAGE_KEYS) {
      assert.equal(mem.getItem(k), null, `expected ${k} to be cleared`);
      assert.equal(mem.getItem(`${k}:user-a`), null, `expected ${k}:user-a to be cleared`);
      assert.equal(mem.getItem(`${k}:user-b`), null, `expected ${k}:user-b to be cleared`);
    }
    assert.equal(mem.getItem('lb_legacy_secret'), null);
    assert.equal(mem.getItem('sb-auth-token'), null);
    assert.equal(mem.getItem('unrelated'), 'keep-me');
    assert.equal(sess.length, 0);
    assert.deepEqual(deletedDbs, ['lb-local-db', 'supabase-cache']);
    assert.deepEqual(deletedCaches, ['lotto-bet-static-v1', 'other-cache']);
    assert.equal(hasAnyUserStorage(), false);
  });

  it('scopes client BYOK keys per user, detects missing BYOK, and wipes keys on sign-out', async () => {
    const mem = createMemoryStorage();
    // @ts-expect-error
    globalThis.localStorage = mem;
    setActiveStorageUserId('user-a');

    // Before submitting BYOK, hasSubmittedByok() is false and no x-*-key headers are sent
    assert.equal(hasSubmittedByok(), false);
    assert.equal('x-gemini-key' in getClientAiHeaders(), false);

    // User A submits their own BYOK key
    saveClientSettings({
      selectedModel: 'gemini-2.5-flash',
      provider: 'gemini',
      geminiApiKey: 'USER_A_GEMINI_KEY',
    });

    assert.equal(hasSubmittedByok(), true);
    const headersA = getClientAiHeaders();
    assert.equal(headersA['x-gemini-key'], 'USER_A_GEMINI_KEY');
    assert.equal(headersA['x-ai-model'], 'gemini-2.5-flash');

    // User B does not see User A's BYOK key
    setActiveStorageUserId('user-b');
    assert.equal(hasSubmittedByok(), false);
    assert.equal(getClientSettings().geminiApiKey, '');
    assert.equal('x-gemini-key' in getClientAiHeaders(), false);

    // Sign-out wipes all stored BYOK keys
    await performFullSignOutCleanup();
    setActiveStorageUserId('user-a');
    assert.equal(hasSubmittedByok(), false);
    assert.equal(getClientSettings().geminiApiKey, '');
  });

  it('prevents unsigned-in (guest) users from saving or reading BYOK settings', () => {
    const mem = createMemoryStorage();
    // @ts-expect-error
    globalThis.localStorage = mem;
    setActiveStorageUserId(null);

    const saved = saveClientSettings({
      geminiApiKey: 'SHOULD_NOT_SAVE_FOR_GUEST',
    });
    assert.equal(saved.geminiApiKey, '');
    assert.equal(hasSubmittedByok(), false);
    assert.equal(mem.length, 0);
  });

  it('generates default slip name with date and time (Task 10)', () => {
    const name = defaultSlipName(new Date('2026-11-08T08:45:00Z'));
    assert.ok(name.startsWith('Slip '));
    assert.ok(name.length >= 10);
    const s = emptySlip();
    assert.deepEqual(s.legs, []);
  });

  it('saves and restores market filters, selected leagues, timeframe, and bookmaker in a saved template', () => {
    const mem = createMemoryStorage();
    // @ts-expect-error
    globalThis.localStorage = mem;
    // @ts-expect-error
    globalThis.window = {
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    setActiveStorageUserId('user-a');

    const selectedLeagues = ['Premier League', 'La Liga'];
    const tpl = saveLocalTemplate({
      name: 'My Weekend EPL + LaLiga 24h',
      bookmaker: 'betpawa',
      withinHours: 24,
      leagues: selectedLeagues,
      cards: defaultCards(),
    });

    // Mutating the original array afterwards must not mutate the saved template
    selectedLeagues.push('Serie A');

    const loaded = getLocalTemplates().find((t) => t.id === tpl.id);
    assert.ok(loaded);
    assert.equal(loaded.bookmaker, 'betpawa');
    assert.equal(loaded.withinHours, 24);
    assert.deepEqual(loaded.leagues, ['Premier League', 'La Liga']);
    assert.deepEqual(loaded.cards, defaultCards());
  });
});

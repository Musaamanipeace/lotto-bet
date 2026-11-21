import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_USER_STORAGE_KEYS,
  STORAGE_KEYS,
  hasAnyUserStorage,
  performFullSignOutCleanup,
  scopedStorageKey,
  setActiveStorageUserId,
  getActiveStorageUserId,
} from '../src/lib/client-storage.ts';
import {
  applyServerSnapshot,
  clearClientSecrets,
  getClientPreferenceHeaders,
  getClientSettings,
  hasConfiguredAiKeys,
  saveClientSettings,
} from '../src/lib/client-settings.ts';
import { readSlip, writeSlip } from '../src/lib/slip-store.ts';
import { emptySlip, defaultSlipName } from '../src/lib/slip.ts';
import { getLocalTemplates, saveLocalTemplate } from '../src/lib/template-store.ts';
import { defaultCards } from '../src/lib/market-cards.ts';

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

function setupBrowserMocks() {
  const mem = createMemoryStorage();
  const sess = createMemoryStorage();
  (globalThis as Record<string, unknown>).localStorage = mem;
  (globalThis as Record<string, unknown>).sessionStorage = sess;
  (globalThis as Record<string, unknown>).window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  return { mem, sess };
}

describe('client-storage & signOut cleanup (Task 1, Task 2, Task 12)', () => {
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
    setupBrowserMocks();
    clearClientSecrets();

    setActiveStorageUserId('user-a');
    assert.equal(getActiveStorageUserId(), 'user-a');
    assert.equal(scopedStorageKey(STORAGE_KEYS.SLIP), 'lb_slip_v1:user-a');

    writeSlip({
      id: 'slip-a',
      name: 'User A Slip',
      greyed: [],
      legs: [
        {
          gameId: 'g1',
          nativeEventId: 'ev1',
          home: 'Arsenal',
          away: 'Chelsea',
          league: 'EPL',
          kickoff: 1700000000000,
          bookmaker: 'sportybet',
          marketNativeId: '1',
          outcomeNativeId: '1',
          specifier: '',
          marketKind: '1x2',
          line: null,
          outcomeKey: 'home',
          pick: 'Arsenal',
          odds: 1.85,
          implied: 0.51,
        },
      ],
    });
    saveClientSettings({ selectedModel: 'mistral-small-latest', provider: 'mistral', timeoutSeconds: 45 });

    assert.equal(readSlip().legs.length, 1);
    assert.equal(getClientSettings().selectedModel, 'mistral-small-latest');

    // Switch to User B (User B must not read User A's slip or preferences)
    setActiveStorageUserId('user-b');
    assert.equal(scopedStorageKey(STORAGE_KEYS.SLIP), 'lb_slip_v1:user-b');
    assert.equal(readSlip().legs.length, 0);
    assert.equal(getClientSettings().selectedModel, 'gemini-2.5-flash');
  });

  it('performFullSignOutCleanup clears all registered keys, sessionStorage, IndexedDB, and SW caches', async () => {
    const { mem, sess } = setupBrowserMocks();

    const deletedDbs: string[] = [];
    (globalThis as Record<string, unknown>).indexedDB = {
      databases: async () => [{ name: 'lb-local-db' }, { name: 'supabase-cache' }],
      deleteDatabase: (name: string) => {
        deletedDbs.push(name);
        const req: { onsuccess?: () => void } = {};
        queueMicrotask(() => req.onsuccess?.());
        return req;
      },
    };

    const deletedCaches: string[] = [];
    (globalThis as Record<string, unknown>).caches = {
      keys: async () => ['lotto-bet-static-v1', 'other-cache'],
      delete: async (k: string) => {
        deletedCaches.push(k);
        return true;
      },
    };

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

    clearClientSecrets();
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

  it('never emits API keys in localStorage or headers and caches only non-secret status flags (Task 2)', async () => {
    const { mem } = setupBrowserMocks();
    clearClientSecrets();
    setActiveStorageUserId('user-a');

    assert.equal(hasConfiguredAiKeys(), false);
    const headersInitial = getClientPreferenceHeaders();
    assert.equal('x-gemini-key' in headersInitial, false);
    assert.equal('x-openrouter-key' in headersInitial, false);
    assert.equal('x-mistral-key' in headersInitial, false);

    // Server returns masked status (no plaintext key)
    applyServerSnapshot({
      persistenceMode: 'postgres',
      aiKeysConfigured: true,
      keysConfigured: true,
      preferences: { selectedModel: 'gemini-2.5-flash', provider: 'gemini', timeoutSeconds: 35 },
      keys: {
        gemini: { provider: 'gemini', isSet: true, last4: '9876' },
        openrouter: { provider: 'openrouter', isSet: false, last4: null },
        mistral: { provider: 'mistral', isSet: false, last4: null },
        football_data: { provider: 'football_data', isSet: false, last4: null },
        api_football: { provider: 'api_football', isSet: false, last4: null },
      },
    });

    assert.equal(hasConfiguredAiKeys(), true);
    const headersAfter = getClientPreferenceHeaders();
    assert.equal(headersAfter['x-ai-model'], 'gemini-2.5-flash');
    assert.equal(Object.keys(headersAfter).some((k) => k.includes('key')), false);
    assert.equal(JSON.stringify([...mem._data.entries()]).includes('9876'), false);

    // Sign-out wipes cached server status & localStorage
    clearClientSecrets();
    await performFullSignOutCleanup();
    setActiveStorageUserId('user-a');
    assert.equal(hasConfiguredAiKeys(), false);
  });

  it('allows guests to change non-secret preferences in memory without writing to localStorage (Task 12)', () => {
    const { mem } = setupBrowserMocks();
    clearClientSecrets();
    setActiveStorageUserId(null);

    const saved = saveClientSettings({
      selectedModel: 'open-mistral-7b',
      provider: 'mistral',
      timeoutSeconds: 50,
    });
    assert.equal(saved.selectedModel, 'open-mistral-7b');
    assert.equal(hasConfiguredAiKeys(), false);
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
    setupBrowserMocks();
    setActiveStorageUserId('user-a');

    const selectedLeagues = ['Premier League', 'La Liga'];
    const tpl = saveLocalTemplate({
      name: 'My Weekend EPL + LaLiga 24h',
      bookmaker: 'betpawa',
      withinHours: 24,
      leagues: selectedLeagues,
      cards: defaultCards(),
    });

    selectedLeagues.push('Serie A');

    const loaded = getLocalTemplates().find((t) => t.id === tpl.id);
    assert.ok(loaded);
    assert.equal(loaded.bookmaker, 'betpawa');
    assert.equal(loaded.withinHours, 24);
    assert.deepEqual(loaded.leagues, ['Premier League', 'La Liga']);
    assert.deepEqual(loaded.cards, defaultCards());
  });
});

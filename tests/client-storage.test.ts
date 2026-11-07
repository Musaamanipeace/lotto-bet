import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_USER_STORAGE_KEYS,
  STORAGE_KEYS,
  clearAllUserStorage,
  hasAnyUserStorage,
} from '../src/lib/client-storage.ts';

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

describe('client-storage', () => {
  it('exposes the expected registry of keys', () => {
    assert.ok(ALL_USER_STORAGE_KEYS.includes(STORAGE_KEYS.SLIP));
    assert.ok(ALL_USER_STORAGE_KEYS.includes(STORAGE_KEYS.CLIENT_AI_SETTINGS));
    assert.ok(ALL_USER_STORAGE_KEYS.includes(STORAGE_KEYS.SAVED_SLIPS));
    assert.ok(ALL_USER_STORAGE_KEYS.includes(STORAGE_KEYS.FILTER_TEMPLATES));
    assert.equal(ALL_USER_STORAGE_KEYS.length >= 5, true);
  });

  it('clearAllUserStorage removes every registered key and any lb_* leftovers', () => {
    const mem = createMemoryStorage();
    // @ts-expect-error – injecting mock into global for the pure functions
    globalThis.localStorage = mem;
    // @ts-expect-error
    globalThis.sessionStorage = createMemoryStorage();
    // @ts-expect-error
    globalThis.window = globalThis;

    // Seed known keys + a legacy one
    for (const k of ALL_USER_STORAGE_KEYS) {
      mem.setItem(k, 'present');
    }
    mem.setItem('lb_legacy_secret', 'should-also-go');
    mem.setItem('unrelated', 'keep-me');

    assert.equal(hasAnyUserStorage(), true);

    clearAllUserStorage();

    for (const k of ALL_USER_STORAGE_KEYS) {
      assert.equal(mem.getItem(k), null, `expected ${k} to be cleared`);
    }
    assert.equal(mem.getItem('lb_legacy_secret'), null);
    assert.equal(mem.getItem('unrelated'), 'keep-me');
    assert.equal(hasAnyUserStorage(), false);
  });
});

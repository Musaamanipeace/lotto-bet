import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  saveSlip,
  listSavedSlips,
  getSavedSlip,
  updateSavedSlip,
  deleteSavedSlip,
  resetSavedSlipsForTests,
} from '../src/lib/saved-slips.ts';
import {
  MemoryShortcutStore,
  isValidShortcutTarget,
  validateShortcutLabel,
  SHORTCUT_ALLOWLIST,
  MAX_SHORTCUTS,
  MAX_SHORTCUT_LABEL_LEN,
} from '../src/lib/shortcuts.ts';

function clampOddsInput(val: string, fallback: number, minBound: number, maxBound: number): number {
  const parsed = Number.parseFloat(val);
  if (!Number.isFinite(parsed)) return fallback;
  const clamped = Math.max(minBound, Math.min(maxBound, parsed));
  return Math.round(clamped * 20) / 20;
}

describe('User data isolation (Task 1 RLS & server store)', () => {
  beforeEach(() => {
    resetSavedSlipsForTests();
  });

  it('isolates saved slips: User A cannot read, update, or delete User B rows; anon reads nothing', () => {
    const sampleLeg: any = {
      gameId: 'g1',
      home: 'Arsenal',
      away: 'Chelsea',
      league: 'EPL',
      kickoff: 1700000000000,
      bookmaker: 'sportybet',
      marketKind: '1x2',
      marketLabel: '1X2',
      outcomeKey: 'home',
      selectionLabel: 'Arsenal',
      odds: 1.85,
      impliedProbability: 0.51,
      line: null,
      specifier: '',
      marketNativeId: '1',
      outcomeNativeId: '1',
    };

    const slipA = saveSlip({
      userId: 'user-a',
      name: 'User A Private Slip',
      bookmaker: 'sportybet',
      legs: [sampleLeg],
      totalOdds: 1.85,
      combinedImplied: 0.51,
    });

    const slipB = saveSlip({
      userId: 'user-b',
      name: 'User B Private Slip',
      bookmaker: 'sportybet',
      legs: [sampleLeg],
      totalOdds: 2.1,
      combinedImplied: 0.45,
    });

    // Anonymous user reads nothing
    assert.deepEqual(listSavedSlips(null), []);

    // User A only sees User A's slip
    const listA = listSavedSlips('user-a');
    assert.equal(listA.length, 1);
    assert.equal(listA[0]!.id, slipA.id);

    // User B only sees User B's slip
    const listB = listSavedSlips('user-b');
    assert.equal(listB.length, 1);
    assert.equal(listB[0]!.id, slipB.id);

    // User A cannot update User B's slip
    const crossUpdate = updateSavedSlip('user-a', slipB.id, { name: 'Hacked by A' });
    assert.equal(crossUpdate, null);
    assert.equal(getSavedSlip('user-b', slipB.id)?.name, 'User B Private Slip');
    assert.equal(getSavedSlip('user-a', slipB.id), null);
    assert.equal(getSavedSlip(null, slipB.id), null);

    // Anonymous cannot update or delete User A's slip
    assert.equal(updateSavedSlip(null, slipA.id, { name: 'Anon Hack' }), null);
    assert.equal(deleteSavedSlip(null, slipA.id), false);

    // User A cannot delete User B's slip
    assert.equal(deleteSavedSlip('user-a', slipB.id), false);
    assert.equal(listSavedSlips('user-b').length, 1);

    // User A can update and delete their own slip
    const updatedA = updateSavedSlip('user-a', slipA.id, { name: 'Renamed by A' });
    assert.equal(updatedA?.name, 'Renamed by A');
    assert.equal(deleteSavedSlip('user-a', slipA.id), true);
    assert.equal(listSavedSlips('user-a').length, 0);
  });

  it('isolates shortcuts: User A cannot read, rename, reorder, or delete User B shortcuts; anon is rejected', async () => {
    const store = new MemoryShortcutStore();

    const resA = await store.add('user-a', {
      label: 'My Picks',
      target: '/my-picks',
      icon: '🎯',
    });
    assert.equal(resA.ok, true);
    if (!resA.ok) return;
    const sA = resA.shortcut;

    const resB = await store.add('user-b', {
      label: 'Results',
      target: '/results',
      icon: '📊',
    });
    assert.equal(resB.ok, true);
    if (!resB.ok) return;
    const sB = resB.shortcut;

    // Anonymous user reads nothing and cannot mutate
    assert.deepEqual(await store.list(null), []);
    assert.equal((await store.add(null, { target: '/' })).ok, false);
    assert.equal((await store.rename(null, sA.id, 'Anon')).ok, false);
    assert.equal((await store.remove(null, sA.id)).ok, false);

    // User A only sees their own shortcut
    const listA = await store.list('user-a');
    assert.equal(listA.length, 1);
    assert.equal(listA[0]!.id, sA.id);

    // User A cannot rename User B's shortcut
    const crossRename = await store.rename('user-a', sB.id, 'Hijacked');
    assert.equal(crossRename.ok, false);
    const listB = await store.list('user-b');
    assert.equal(listB[0]!.label, 'Results');

    // User A cannot delete User B's shortcut
    const crossDelete = await store.remove('user-a', sB.id);
    assert.equal(crossDelete.ok, false);
    assert.equal((await store.list('user-b')).length, 1);
  });
});

describe('Shortcuts allowlist, limits, and reordering (Task 11)', () => {
  it('validates internal allowlist targets and rejects external or arbitrary URLs', () => {
    for (const item of SHORTCUT_ALLOWLIST) {
      assert.equal(isValidShortcutTarget(item.target), true, `Expected ${item.target} to be valid`);
    }
    assert.equal(isValidShortcutTarget('/#available-games'), true);
    assert.equal(isValidShortcutTarget('/#filters'), true);

    // Reject external, protocol-relative, javascript, and non-allowlisted paths
    assert.equal(isValidShortcutTarget('https://evil.com'), false);
    assert.equal(isValidShortcutTarget('http://evil.com/my-picks'), false);
    assert.equal(isValidShortcutTarget('//evil.com'), false);
    assert.equal(isValidShortcutTarget('javascript:alert(1)'), false);
    assert.equal(isValidShortcutTarget('/admin/secret'), false);
    assert.equal(isValidShortcutTarget('free text input'), false);
  });

  it('enforces 24-char label limit, max 8 shortcuts, duplicate prevention, and reordering', async () => {
    const store = new MemoryShortcutStore();

    // Label validation
    const longLabel = 'A'.repeat(MAX_SHORTCUT_LABEL_LEN + 1);
    assert.equal(validateShortcutLabel(longLabel).ok, false);
    assert.equal(validateShortcutLabel('').ok, false);
    assert.equal(validateShortcutLabel('Valid Label').ok, true);

    // Duplicate target prevention
    const first = await store.add('user-1', { label: 'Picks', target: '/my-picks' });
    assert.equal(first.ok, true);
    const dup = await store.add('user-1', { label: 'Picks Again', target: '/my-picks' });
    assert.equal(dup.ok, false);
    if (!dup.ok) assert.match(dup.error, /already exists/i);

    // Fill up to MAX_SHORTCUTS (8)
    let addedCount = 1;
    for (const allow of SHORTCUT_ALLOWLIST) {
      if (allow.target === '/my-picks') continue;
      if (addedCount >= MAX_SHORTCUTS) break;
      const r = await store.add('user-1', { label: allow.label, target: allow.target });
      assert.equal(r.ok, true);
      addedCount++;
    }
    const all = await store.list('user-1');
    assert.equal(all.length, MAX_SHORTCUTS);

    // 9th shortcut must fail
    const ninth = await store.add('user-1', { label: 'Extra', target: '/chat' });
    assert.equal(ninth.ok, false);
    if (!ninth.ok) assert.match(ninth.error, /Maximum of 8/i);

    // Reorder shortcuts
    const reversedIds = [...all.map((s) => s.id)].reverse();
    const reordered = await store.reorder('user-1', reversedIds);
    assert.equal(reordered.ok, true);
    if (reordered.ok) {
      assert.equal(reordered.shortcuts[0]!.id, reversedIds[0]);
      assert.equal(reordered.shortcuts[0]!.position, 0);
      assert.equal(reordered.shortcuts[MAX_SHORTCUTS - 1]!.id, reversedIds[MAX_SHORTCUTS - 1]);
    }
  });
});

describe('Two-point odds numeric input validation (Task 9)', () => {
  it('clamps non-numeric and out-of-range inputs and enforces min <= max', () => {
    assert.equal(clampOddsInput('abc', 1.2, 1.01, 5.0), 1.2);
    assert.equal(clampOddsInput('0.5', 1.2, 1.01, 5.0), 1.0);
    assert.equal(clampOddsInput('99.0', 2.5, 1.01, 10.0), 10.0);
    assert.equal(clampOddsInput('1.83', 1.2, 1.01, 10.0), 1.85);
  });
});

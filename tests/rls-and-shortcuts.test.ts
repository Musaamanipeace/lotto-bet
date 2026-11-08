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
});

describe('Two-point odds numeric input validation (Task 9)', () => {
  it('clamps non-numeric and out-of-range inputs and enforces min <= max', () => {
    assert.equal(clampOddsInput('abc', 1.2, 1.01, 5.0), 1.2);
    assert.equal(clampOddsInput('0.5', 1.2, 1.01, 5.0), 1.0);
    assert.equal(clampOddsInput('99.0', 2.5, 1.01, 10.0), 10.0);
    assert.equal(clampOddsInput('1.83', 1.2, 1.01, 10.0), 1.85);
  });
});

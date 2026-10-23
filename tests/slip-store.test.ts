import test from 'node:test';
import assert from 'node:assert/strict';
import { SLIP_KEY, readSlip, writeSlip } from '../src/lib/slip-store.ts';

function shim() {
  const data = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
  (globalThis as any).window = { dispatchEvent: () => true };
  return data;
}

const leg = (id: string) => ({
  gameId: id, nativeEventId: id, bookmaker: 'sportybet', home: 'A', away: 'B', kickoff: 1, league: null, pick: 'Home', odds: 1.5,
  marketNativeId: '1', outcomeNativeId: '1', specifier: '', marketKind: '1x2', line: null, outcomeKey: 'home', implied: 0.6,
});

test('stored slip round-trips and drops greyed ids that are no longer legs', () => {
  const data = shim();
  writeSlip({ legs: [leg('sportybet:1')] as any, greyed: ['sportybet:1'] });
  assert.equal(readSlip().legs.length, 1);
  data.set(SLIP_KEY, JSON.stringify({ legs: [leg('sportybet:1')], greyed: ['gone', 'sportybet:1'] }));
  assert.deepEqual(readSlip().greyed, ['sportybet:1']);
});

test('missing, corrupt or malformed stored slips read as empty', () => {
  const data = shim();
  assert.equal(readSlip().legs.length, 0);
  data.set(SLIP_KEY, '{not json');
  assert.equal(readSlip().legs.length, 0);
  data.set(SLIP_KEY, JSON.stringify({ legs: [{ gameId: 1 }], greyed: [] }));
  assert.equal(readSlip().legs.length, 0);
});

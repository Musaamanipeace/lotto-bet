import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractActions, isNeverAllowed, validateAction } from '../src/lib/agent-actions.ts';

test('set_filters: valid args pass; bad bookmaker rejected', () => {
  const ok = validateAction({ name: 'set_filters', args: { bookmaker: 'sportybet', withinHours: 24, leagues: ['Premier League'] } });
  assert.equal(ok.ok, true);
  const bad = validateAction({ name: 'set_filters', args: { bookmaker: 'nfl', withinHours: -5 } });
  assert.equal(bad.ok, false);
});

test('reset_filters: no args', () => {
  assert.equal(validateAction({ name: 'reset_filters', args: {} }).ok, true);
  assert.equal(validateAction({ name: 'reset_filters', args: { x: 1 } }).ok, false);
});

test('save_filter_template: requires a name; valid minimal shape passes', () => {
  assert.equal(validateAction({ name: 'save_filter_template', args: { name: '' } }).ok, false);
  const ok = validateAction({ name: 'save_filter_template', args: { name: 'Lottery 2.0', bookmaker: 'sportybet' } });
  assert.equal(ok.ok, true);
  assert.equal(ok.ok && ok.action.risk, 'saved_data');
});

test('delete_filter_template / delete_slip: require id and are destructive', () => {
  assert.equal(validateAction({ name: 'delete_filter_template', args: { id: '' } }).ok, false);
  const ok = validateAction({ name: 'delete_slip', args: { id: 's-1' } });
  assert.equal(ok.ok, true);
  assert.equal(ok.ok && ok.action.risk, 'destructive');
});

test('add_picks: rejects malformed picks, accepts valid ones', () => {
  const ok = validateAction({
    name: 'add_picks',
    args: {
      picks: [{ gameId: 'g1', home: 'H', away: 'A', pick: 'Over 2.5', odds: 1.9, marketKind: 'over_under', line: 2.5 }],
    },
  });
  assert.equal(ok.ok, true);
  assert.equal(validateAction({ name: 'add_picks', args: { picks: [{ gameId: 'g1' }] } }).ok, false);
});

test('navigate / open_modal: allowlists enforced', () => {
  assert.equal(validateAction({ name: 'navigate', args: { route: '/results' } }).ok, true);
  assert.equal(validateAction({ name: 'navigate', args: { route: '/admin/keys' } }).ok, false);
  assert.equal(validateAction({ name: 'open_modal', args: { modal: 'betslip' } }).ok, true);
  assert.equal(validateAction({ name: 'open_modal', args: { modal: 'anything' } }).ok, false);
});

test('Guard: keys, passwords and account deletion are never allowed by name', () => {
  for (const name of ['change_api_key', 'set_api_key', 'read_api_keys', 'delete_account', 'change_password', 'update_password', 'cancel_account']) {
    assert.equal(isNeverAllowed(name), true, `${name} must be refused`);
    assert.equal(validateAction({ name, args: {} }).ok, false, `validateAction must refuse ${name}`);
  }
  assert.equal(validateAction({ name: 'set_api_key', args: { key: 'x', value: 'y' } }).ok, false);
});

test('Guard: sensitive arg names are refused even with a valid action name', () => {
  const bad = validateAction({ name: 'set_filters', args: { apiKey: 'sk-1' } });
  assert.equal(bad.ok, false);
  const bad2 = validateAction({ name: 'save_filter_template', args: { name: 'x', password: 'hunter2' } });
  assert.equal(bad2.ok, false);
});

test('extractActions: drops invalid entries with visible errors', () => {
  const { actions, errors } = extractActions([
    { name: 'navigate', args: { route: '/results' } },
    { name: 'navigate', args: { route: '/admin' } },
    { name: 'delete_slip' },
    { name: 'not_a_real_action', args: {} },
    null,
  ]);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].name, 'navigate');
  assert.ok(errors.length >= 3);
});

test('extractActions: accepts bare array or {actions:[...]}', () => {
  assert.equal(extractActions([{ name: 'reset_filters', args: {} }]).actions.length, 1);
  assert.equal(extractActions({ actions: [{ name: 'reset_filters', args: {} }] }).actions.length, 1);
  assert.equal(extractActions(undefined).actions.length, 0);
});

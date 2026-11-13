import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { currentUser } from '../src/lib/session.ts';
import { requireAiAccess } from '../src/lib/ai-auth.ts';
import {
  decryptUserApiKey,
  encryptUserApiKey,
  isEncryptionSecretConfigured,
  maskLast4,
} from '../src/lib/key-crypto.ts';
import {
  buildUserLlmEnv,
  deleteUserApiKey,
  getUserSettingsForClient,
  resetUserSettingsStoreForTests,
  saveUserPreferences,
  setUserApiKey,
} from '../src/lib/user-settings-store.ts';
import {
  MAX_SHORTCUT_LABEL,
  MAX_SHORTCUTS,
  addShortcut,
  deleteShortcut,
  isValidShortcutTarget,
  listShortcuts,
  reorderShortcuts,
  resetShortcutsForTests,
} from '../src/lib/shortcuts.ts';
import { emptyStateCounts } from '../src/lib/data-state.ts';
import { applyFilterState, createDefaultFilterState } from '../src/lib/filter-state.ts';
import { runAiAgent, toolInspectSlip, toolPickN, toolSuggestSwaps } from '../src/lib/ai-agent.ts';
import type { AiPick } from '../src/lib/ai-picks.ts';
import type { Game } from '../src/lib/types.ts';

function sampleAiPick(overrides: Partial<AiPick> = {}): AiPick {
  const counts = emptyStateCounts();
  counts.ok = 4;
  return {
    id: 'pick-1',
    gameId: 'g-1',
    bookmaker: 'sportybet',
    marketKey: 'home_win',
    marketNativeId: '1',
    outcomeNativeId: '1',
    specifier: '',
    odds: 1.75,
    impliedProbability: 0.54,
    kickoff: Date.now() + 3_600_000,
    league: 'Premier League',
    home: 'Arsenal',
    away: 'Chelsea',
    tier: 'safe',
    evaluation: {
      label: 'Verified',
      qualifies: true,
      passed: 4,
      verifiable: 4,
      total: 4,
      reason: null,
      verifiedLabel: '4 of 4 criteria verified',
      provisionalCriteria: [],
      stateCounts: counts,
    },
    criteria: [],
    fitScore: 0.82,
    fitBreakdown: {
      tierPlacement: 1,
      impliedProbability: 0.54,
      criteriaPassShare: 1,
      leaguePriority: 0.9,
      cardsCornersData: 1,
      failedCriteriaPenalty: 0,
      congestionPenalty: 0,
    },
    rationale: 'Strong home metrics',
    exclusionStatus: 'cleared',
    ...overrides,
  };
}

describe('Encrypted per-user API keys & settings (Tasks 2 & 12)', () => {
  beforeEach(() => {
    resetUserSettingsStoreForTests();
    process.env.KEY_ENCRYPTION_SECRET = 'test-master-secret-for-lotto-bet-32bytes!';
    delete process.env.KEY_ENCRYPTION_SECRETS;
    process.env.KEY_ENCRYPTION_KEY_ID = 'v1';
  });

  it('encrypts with AES-256-GCM + userId AAD, prevents cross-user decryption, and supports key rotation', () => {
    assert.equal(isEncryptionSecretConfigured(), true);
    const enc = encryptUserApiKey('user-a', 'AIzaSySuperSecret9876');
    assert.equal(enc.last4, '9876');
    assert.equal(maskLast4('AIzaSySuperSecret9876'), '9876');
    assert.notEqual(enc.ciphertext, 'AIzaSySuperSecret9876');

    // Same user decrypts cleanly
    assert.equal(decryptUserApiKey('user-a', enc), 'AIzaSySuperSecret9876');

    // Wrong user AAD MUST fail authentication tag check
    assert.throws(() => decryptUserApiKey('user-b', enc));

    // Rotate active secret to v2 while retaining v1 for older rows
    delete process.env.KEY_ENCRYPTION_SECRET;
    process.env.KEY_ENCRYPTION_KEY_ID = 'v2';
    process.env.KEY_ENCRYPTION_SECRETS = JSON.stringify({
      v1: 'test-master-secret-for-lotto-bet-32bytes!',
      v2: 'brand-new-rotated-secret-v2-32bytes!',
    });

    // Old v1 ciphertext still decrypts under v1 key
    assert.equal(decryptUserApiKey('user-a', enc), 'AIzaSySuperSecret9876');

    // New ciphertext encrypts under v2 and decrypts cleanly
    const encV2 = encryptUserApiKey('user-a', 'sk-or-v1-rotated-1234');
    assert.equal(encV2.keyId, 'v2');
    assert.equal(decryptUserApiKey('user-a', encV2), 'sk-or-v1-rotated-1234');
  });

  it('isolates per-user keys & preferences, never returns plaintext to client, and supports deletion', async () => {
    await setUserApiKey('user-a', 'gemini', 'AIzaSySecretKeyUserA1111');
    await saveUserPreferences('user-a', { selectedModel: 'gemini-2.5-flash', timeoutSeconds: 42 });

    const clientA = await getUserSettingsForClient('user-a');
    assert.equal(clientA.aiKeysConfigured, true);
    assert.equal(clientA.keys.gemini.isSet, true);
    assert.equal(clientA.keys.gemini.last4, '1111');
    assert.equal(JSON.stringify(clientA).includes('AIzaSySecretKeyUserA1111'), false);

    // User B does not see User A's keys or preferences
    const clientB = await getUserSettingsForClient('user-b');
    assert.equal(clientB.aiKeysConfigured, false);
    assert.equal(clientB.keys.gemini.isSet, false);
    assert.equal(clientB.keys.gemini.last4, null);
    assert.equal(clientB.preferences.timeoutSeconds, 35);

    // Server LLM env resolves decrypted key exclusively for User A
    const outA = await buildUserLlmEnv('user-a', { provider: 'gemini' });
    assert.equal(outA.hasAiKey, true);
    assert.equal(outA.env.GEMINI_API_KEY, 'AIzaSySecretKeyUserA1111');
    const outB = await buildUserLlmEnv('user-b', { provider: 'gemini' });
    assert.equal(outB.hasAiKey, false);
    assert.equal(outB.env.GEMINI_API_KEY, undefined);

    // Deleting key clears status
    await deleteUserApiKey('user-a', 'gemini');
    const afterDel = await getUserSettingsForClient('user-a');
    assert.equal(afterDel.aiKeysConfigured, false);
    assert.equal(afterDel.keys.gemini.isSet, false);
  });
});

describe('Shortcuts allowlist, bounds, reorder, and user isolation (Task 11)', () => {
  beforeEach(() => {
    resetShortcutsForTests();
  });

  it('blocks external/unsafe URLs, enforces max 8 and 24-char labels, and isolates users', () => {
    assert.equal(isValidShortcutTarget('/ai-picks'), true);
    assert.equal(isValidShortcutTarget('/#filters'), true);
    assert.equal(isValidShortcutTarget('https://evil.com'), false);
    assert.equal(isValidShortcutTarget('//evil.com'), false);
    assert.equal(isValidShortcutTarget('javascript:alert(1)'), false);

    // Reject external target
    const badRes = addShortcut('user-a', { target: 'https://evil.com', label: 'Evil' });
    assert.equal(badRes.ok, false);

    // Reject >24 char label cleanly
    const tooLongRes = addShortcut('user-a', { target: '/ai-picks', label: 'A'.repeat(MAX_SHORTCUT_LABEL + 5) });
    assert.equal(tooLongRes.ok, false);

    // Valid shortcut within 24 chars succeeds
    const validRes = addShortcut('user-a', { target: '/ai-picks', label: 'A'.repeat(MAX_SHORTCUT_LABEL) });
    assert.equal(validRes.ok, true);
    if (!validRes.ok) throw new Error('expected valid shortcut');
    assert.equal(validRes.shortcut.label.length, MAX_SHORTCUT_LABEL);

    // Reject duplicate target
    const dupRes = addShortcut('user-a', { target: '/ai-picks' });
    assert.equal(dupRes.ok, false);

    // Fill up to MAX_SHORTCUTS (8)
    const remainingTargets = ['/my-picks', '/saved-slips', '/results', '/community', '/chat', '/leagues', '/#filters'];
    for (const target of remainingTargets) {
      const r = addShortcut('user-a', { target });
      assert.equal(r.ok, true);
    }
    const listA = listShortcuts('user-a');
    assert.equal(listA.length, MAX_SHORTCUTS);

    // 9th shortcut rejected
    const ninth = addShortcut('user-a', { target: '/#available-games' });
    assert.equal(ninth.ok, false);

    // Reorder preserves count and order
    const reversed = [...listA].reverse().map((s) => s.id);
    const reordered = reorderShortcuts('user-a', reversed);
    assert.equal(reordered.ok, true);
    if (!reordered.ok) throw new Error('expected reordered shortcuts');
    assert.equal(reordered.shortcuts[0]!.id, reversed[0]);

    // User B sees 0 shortcuts and cannot delete User A's shortcut
    assert.equal(listShortcuts('user-b').length, 0);
    assert.equal(deleteShortcut('user-b', validRes.shortcut.id), false);
    assert.equal(deleteShortcut('user-a', validRes.shortcut.id), true);
  });
});

describe('Unified FilterState & AI Agent tools (Tasks 9 & 13)', () => {
  it('filters AI picks through canonical FilterState', () => {
    const fs = createDefaultFilterState('sportybet');
    fs.withinHours = 24;
    fs.leagues = ['Premier League'];

    const now = Date.now();
    const picks = [
      sampleAiPick({ id: 'ok', gameId: 'g1', league: 'Premier League', kickoff: now + 2 * 3600_000, odds: 1.7 }),
      sampleAiPick({ id: 'wrong-league', gameId: 'g2', league: 'Serie A', kickoff: now + 2 * 3600_000, odds: 1.7 }),
      sampleAiPick({ id: 'too-late', gameId: 'g3', league: 'Premier League', kickoff: now + 48 * 3600_000, odds: 1.7 }),
      sampleAiPick({ id: 'wrong-bookie', gameId: 'g4', bookmaker: 'betpawa', league: 'Premier League', kickoff: now + 2 * 3600_000, odds: 1.7 }),
    ];

    const matched = applyFilterState(picks, fs);
    assert.deepEqual(matched.map((p) => p.id), ['ok']);
  });

  it('toolPickN respects FilterState and honestly reports shortfalls', () => {
    const fs = createDefaultFilterState('sportybet');
    const picks = [
      sampleAiPick({ id: 'p1', gameId: 'g1', home: 'A', away: 'B', fitScore: 0.9 }),
      sampleAiPick({ id: 'p2', gameId: 'g2', home: 'C', away: 'D', fitScore: 0.85 }),
    ];
    const res = toolPickN(picks, fs, { n: 5, tier: 'average' });
    assert.equal(res.picks.length, 2);
    assert.equal(res.shortfall, 3);
  });

  it('toolInspectSlip & toolSuggestSwaps flag weak/correlated legs, honor locks, and exclude seen picks', () => {
    const fs = createDefaultFilterState('sportybet');
    const slipLegs = [
      { gameId: 'g1', home: 'Arsenal', away: 'Chelsea', pick: 'Arsenal Win', odds: 1.4, marketKind: '1x2' },
      { gameId: 'g1', home: 'Arsenal', away: 'Chelsea', pick: 'Over 2.5', odds: 1.8, marketKind: 'over_under' },
      { gameId: 'g2', home: 'Inter', away: 'Milan', pick: 'Inter Win', odds: 1.65, marketKind: '1x2' },
    ];

    const snapshot = [
      sampleAiPick({ id: 'snap-1', gameId: 'g1', fitScore: 0.35, evaluation: { ...sampleAiPick().evaluation, label: 'Best fit' } }),
      sampleAiPick({ id: 'snap-2', gameId: 'g2', home: 'Inter', away: 'Milan', fitScore: 0.30 }),
      sampleAiPick({ id: 'cand-a', gameId: 'g10', home: 'Real Madrid', away: 'Sevilla', fitScore: 0.95, odds: 1.55 }),
      sampleAiPick({ id: 'cand-b', gameId: 'g11', home: 'Bayern', away: 'Mainz', fitScore: 0.91, odds: 1.45 }),
    ];

    const games: Game[] = [];
    const inspected = toolInspectSlip(slipLegs, snapshot, games);
    assert.equal(inspected.flags[0]!.severities.includes('correlated'), true);
    assert.equal(inspected.flags[0]!.severities.includes('weak'), true);

    // Lock g1 so only g2 can be swapped out
    const firstSwaps = toolSuggestSwaps(slipLegs, snapshot, fs, {
      lockedGameIds: ['g1'],
      excludeIds: [],
      count: 2,
    });
    assert.ok(firstSwaps.swaps.every((s) => s.outGameId !== 'g1'));
    assert.ok(firstSwaps.swaps.length >= 1);
    const chosenId = firstSwaps.swaps[0]!.inPickId;

    // Exclude seen IDs -> second call must not repeat chosenId
    const secondSwaps = toolSuggestSwaps(slipLegs, snapshot, fs, {
      lockedGameIds: ['g1'],
      excludeIds: [chosenId],
      count: 2,
    });
    assert.ok(secondSwaps.swaps.every((s) => s.inPickId !== chosenId));
  });

  it('runAiAgent validates all returned pick IDs against snapshot and succeeds deterministically without LLM keys', async () => {
    const fs = createDefaultFilterState('sportybet');
    const snap = [
      sampleAiPick({ id: 'valid-1', gameId: 'g1', home: 'Team A', away: 'Team B', fitScore: 0.9 }),
      sampleAiPick({ id: 'valid-2', gameId: 'g2', home: 'Team C', away: 'Team D', fitScore: 0.8 }),
    ];
    const res = await runAiAgent({
      request: { mode: 'pick_n', n: 3, filterState: fs },
      snapshotPicks: snap,
      latestGames: [],
      llmEnv: {}, // No LLM key -> deterministic fallback summary
    });
    assert.equal(res.ok, true);
    assert.equal(res.llmUsed, false);
    assert.equal(res.picks.length, 2);
    assert.equal(res.shortfall, 1);
    assert.ok(res.picks.every((p) => p.id === 'valid-1' || p.id === 'valid-2'));
  });
});

describe('API route fail-closed auth gates (Tasks 1, 2, 11, 12, 13)', () => {
  it('returns 401 when unauthenticated via requireAiAccess and currentUser', async () => {
    const reqGet = new Request('http://localhost:3000/api/test', { method: 'GET' });
    const reqJson = new Request('http://localhost:3000/api/ai/agent', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-gemini-key': 'spoofed-header-key',
      },
      body: JSON.stringify({ mode: 'pick_n', message: 'hi', n: 3 }),
    });

    assert.equal(await currentUser(reqGet), null);
    const getAccess = await requireAiAccess(reqGet);
    assert.equal(getAccess.ok, false);
    if (!getAccess.ok) assert.equal(getAccess.response.status, 401);

    const postAccess = await requireAiAccess(reqJson);
    assert.equal(postAccess.ok, false);
    if (!postAccess.ok) assert.equal(postAccess.response.status, 401);
  });

  it('guards settings, shortcuts, chat, and every /api/ai/* route with auth checks', () => {
    const protectedRoutes = [
      'app/api/settings/route.ts',
      'app/api/shortcuts/route.ts',
      'app/api/chat/route.ts',
      'app/api/ai/agent/route.ts',
      'app/api/ai/alternatives/route.ts',
      'app/api/ai/generate/route.ts',
      'app/api/ai/pick-n/route.ts',
      'app/api/ai/picks/route.ts',
      'app/api/ai/revalidate/route.ts',
      'app/api/ai/slips/route.ts',
      'app/api/ai/status/route.ts',
      'app/api/ai/swap/route.ts',
      'app/api/ai/target-odds/route.ts',
    ];
    for (const rel of protectedRoutes) {
      const src = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
      assert.ok(
        src.includes('requireAiAccess') || src.includes('currentUser'),
        `Expected auth guard in ${rel}`,
      );
      assert.ok(
        !src.includes('x-gemini-key') &&
          !src.includes('x-openrouter-key') &&
          !src.includes('x-mistral-key'),
        `Unexpected client key header reference in ${rel}`,
      );
    }
  });
});

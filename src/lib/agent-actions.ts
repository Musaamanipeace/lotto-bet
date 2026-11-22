/**
 * Typed action registry for the chat agent (Section 4).
 *
 * Each action has a name, a strictly validated argument schema, a risk level
 * and an executor ("client" = applied on the client through the same setters
 * the UI uses; "server" = calls the same route/helper the UI uses, so auth,
 * RLS and rate limits are identical; the agent gets no extra permissions).
 *
 * Risk levels:
 * - read_reversible:   run immediately; show a line in chat (Undo where reversible).
 * - saved_data:        run immediately when the user asked for it explicitly.
 * - destructive:       one-tap confirm in chat before running.
 * - never_allowed:     the agent refuses; the user does it by hand.
 */
import { normalizeFilterState, normalizeCardsState, type FilterState } from './filter-state.ts';
import type { Bookmaker, MarketKind } from './types.ts';

export type RiskLevel = 'read_reversible' | 'saved_data' | 'destructive' | 'never_allowed';

export type ActionName =
  | 'set_filters'
  | 'reset_filters'
  | 'save_filter_template'
  | 'update_filter_template'
  | 'delete_filter_template'
  | 'apply_template'
  | 'add_picks'
  | 'remove_leg'
  | 'clear_slip'
  | 'grey_leg'
  | 'lock_leg'
  | 'swap_leg'
  | 'save_slip'
  | 'rename_slip'
  | 'delete_slip'
  | 'generate_book_code'
  | 'share_slip'
  | 'navigate'
  | 'open_modal'
  | 'scroll_to'
  | 'change_setting';

export type ValidatedAction = {
  name: ActionName;
  args: Record<string, unknown>;
  risk: RiskLevel;
  executor: 'client' | 'server';
};

/** Never allowed: the agent must refuse, user does it by hand. */
const NEVER_ALLOWED_NAMES = new Set<string>([
  'change_api_key',
  'set_api_key',
  'update_api_key',
  'rotate_api_key',
  'read_api_keys',
  'delete_api_keys',
  'change_password',
  'update_password',
  'delete_account',
  'cancel_account',
]);

/** Allowlist for navigation and modals. */
const NAVIGATE_ROUTES = new Set(['/', '/builder', '/ai-picks', '/results', '/templates', '/leagues']);
const OPEN_MODALS = new Set(['betslip', 'settings', 'account']);

/** Settings the agent may change (non-secret). */
const CHANGE_SETTING_KEYS = new Set(['selectedModel', 'provider', 'timeoutSeconds', 'language', 'theme']);

const MARKET_KINDS: MarketKind[] = ['1x2', 'double_chance', 'over_under', 'btts'];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

function err(name: string, problem: string): { ok: false; error: string } {
  return { ok: false, error: `${name}: ${problem}` };
}

function validateStringArray(v: unknown, field: string): string[] | string | null {
  if (v === undefined) return [];
  if (!Array.isArray(v) || !v.every((x) => isNonEmptyString(x))) return `${field} must be an array of strings`;
  return v as string[];
}

/**
 * Validates an LLM-produced action item ({name, args}). Malformed arguments
 * are rejected; the caller must drop invalid actions (never execute them).
 */
export function validateAction(item: unknown): { ok: true; action: ValidatedAction } | { ok: false; error: string } {
  if (!isRecord(item)) return err('unknown', 'action must be an object');
  const actionName = item.name;
  if (!isNonEmptyString(actionName) || !(actionName in ACTIONS)) {
    return err(String(actionName ?? 'unknown'), 'unknown action name');
  }

  const meta = ACTIONS[actionName as ActionName];
  if (NEVER_ALLOWED_NAMES.has(actionName) || isNeverAllowed(actionName)) {
    return err(actionName, 'this action is not allowed for the agent');
  }

  const args = isRecord(item.args) ? item.args : {};
  const problems = validateArgs(actionName as ActionName, args);
  if (problems.length > 0) {
    return { ok: false, error: `${actionName}: invalid args — ${problems.join('; ')}` };
  }

  // Sensitive-name guard: nothing in the schema may touch keys/passwords/accounts.
  const sensitive = findSensitiveKey(Object.keys(args));
  if (sensitive) {
    return err(actionName, `refused: argument "${sensitive}" is not agent-accessible`);
  }

  return { ok: true, action: { name: actionName as ActionName, args: sanitize(args), risk: meta.risk, executor: meta.executor } };
}

const ACTIONS: Record<ActionName, { risk: RiskLevel; executor: 'client' | 'server' }> = {
  set_filters: { risk: 'read_reversible', executor: 'client' },
  reset_filters: { risk: 'read_reversible', executor: 'client' },
  save_filter_template: { risk: 'saved_data', executor: 'server' },
  update_filter_template: { risk: 'saved_data', executor: 'server' },
  delete_filter_template: { risk: 'destructive', executor: 'server' },
  apply_template: { risk: 'read_reversible', executor: 'client' },
  add_picks: { risk: 'read_reversible', executor: 'client' },
  remove_leg: { risk: 'read_reversible', executor: 'client' },
  clear_slip: { risk: 'read_reversible', executor: 'client' },
  grey_leg: { risk: 'read_reversible', executor: 'client' },
  lock_leg: { risk: 'read_reversible', executor: 'client' },
  swap_leg: { risk: 'read_reversible', executor: 'client' },
  save_slip: { risk: 'saved_data', executor: 'server' },
  rename_slip: { risk: 'read_reversible', executor: 'client' },
  delete_slip: { risk: 'destructive', executor: 'server' },
  generate_book_code: { risk: 'read_reversible', executor: 'server' },
  share_slip: { risk: 'saved_data', executor: 'server' },
  navigate: { risk: 'read_reversible', executor: 'client' },
  open_modal: { risk: 'read_reversible', executor: 'client' },
  scroll_to: { risk: 'read_reversible', executor: 'client' },
  change_setting: { risk: 'saved_data', executor: 'server' },
};

/** Guard: reject anything key/password/account related by name or shape. */
export function isNeverAllowed(name: string): boolean {
  if (NEVER_ALLOWED_NAMES.has(name)) return true;
  const n = name.toLowerCase();
  if (/key|password|secret|token|account.*delet|delet.*account|password.*change|change.*password/i.test(n)) return true;
  return false;
}

function findSensitiveKey(keys: string[]): string | null {
  for (const k of keys) {
    const lk = k.toLowerCase();
    if (/^(api_?key|apikey|password|secret|token|auth_token|session_token|user_?password|password_?hash)$/.test(lk)) return k;
  }
  return null;
}

function sanitize(args: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(args).filter(([k]) => !findSensitiveKey([k])));
}

function validateArgs(name: ActionName, a: Record<string, unknown>): string[] {
  const problems: string[] = [];
  switch (name) {
    case 'set_filters': {
      const fs = normalizeFilterState(a.bookmaker !== undefined || a.cards !== undefined || a.leagues !== undefined ? a : undefined);
      // normalizeFilterState validates shape; fall back to plain string fields
      if (a.bookmaker !== undefined && !['sportybet', 'betpawa'].includes(a.bookmaker as Bookmaker)) {
        problems.push(`bookmaker must be 'sportybet' or 'betpawa'`);
      }
      const strLeagues = validateStringArray(a.leagues, 'leagues');
      if (typeof strLeagues === 'string') problems.push(strLeagues);
      if (a.withinHours !== undefined && !(typeof a.withinHours === 'number' && a.withinHours >= 0)) {
        problems.push('withinHours must be a non-negative number or null');
      }
      if (fs.bookmaker === null && a.bookmaker !== undefined && !problems.length) problems.push('bookmaker invalid');
      break;
    }
    case 'reset_filters':
      if (Object.keys(a).length > 0) problems.push('reset_filters takes no arguments');
      break;
    case 'save_filter_template': {
      if (!isNonEmptyString(a.name)) problems.push('name is required (non-empty string)');
      const strLeagues = validateStringArray(a.leagues, 'leagues');
      if (typeof strLeagues === 'string') problems.push(strLeagues);
      if (a.withinHours !== undefined && a.withinHours !== null && !(typeof a.withinHours === 'number' && a.withinHours >= 0)) {
        problems.push('withinHours must be a number ≥ 0 or null');
      }
      break;
    }
    case 'update_filter_template': {
      if (!isNonEmptyString(a.id)) problems.push('id is required');
      if (!isNonEmptyString(a.name ?? '') && a.name !== undefined) problems.push('name must be a non-empty string');
      break;
    }
    case 'delete_filter_template':
    case 'delete_slip': {
      if (!isNonEmptyString(a.id)) problems.push('id is required');
      break;
    }
    case 'apply_template':
      if (!isNonEmptyString(a.id)) problems.push('id is required');
      break;
    case 'add_picks': {
      const picks = a.picks;
      if (!Array.isArray(picks) || picks.length === 0) {
        problems.push('picks must be a non-empty array');
        break;
      }
      picks.forEach((p, i) => {
        if (!isRecord(p)) {
          problems.push(`picks[${i}] must be an object`);
          return;
        }
        if (!isNonEmptyString(p.gameId)) problems.push(`picks[${i}].gameId is required`);
        if (!isNonEmptyString(p.home)) problems.push(`picks[${i}].home is required`);
        if (!isNonEmptyString(p.away)) problems.push(`picks[${i}].away is required`);
        if (!isNonEmptyString(p.pick)) problems.push(`picks[${i}].pick is required`);
        if (!(typeof p.odds === 'number' && Number.isFinite(p.odds) && p.odds > 0)) {
          problems.push(`picks[${i}].odds must be a positive number`);
        }
        if (p.marketKind !== undefined && !MARKET_KINDS.includes(p.marketKind as MarketKind)) {
          problems.push(`picks[${i}].marketKind invalid`);
        }
      });
      break;
    }
    case 'remove_leg':
    case 'grey_leg':
    case 'lock_leg':
      if (!isNonEmptyString(a.gameId)) problems.push('gameId is required');
      break;
    case 'swap_leg': {
      if (!isNonEmptyString(a.outGameId) || !isNonEmptyString(a.inGameId)) {
        problems.push('outGameId and inGameId are required');
      }
      break;
    }
    case 'save_slip':
    case 'generate_book_code':
      if (a.slipId !== undefined && !isNonEmptyString(a.slipId)) problems.push('slipId must be a string');
      break;
    case 'rename_slip':
      if (!isNonEmptyString(a.name)) problems.push('name is required');
      break;
    case 'share_slip':
      if (a.slipId !== undefined && !isNonEmptyString(a.slipId)) problems.push('slipId must be a string');
      break;
    case 'navigate':
      if (!NAVIGATE_ROUTES.has(a.route as string)) problems.push(`route must be one of: ${[...NAVIGATE_ROUTES].join(', ')}`);
      break;
    case 'open_modal':
      if (!OPEN_MODALS.has(a.modal as string)) problems.push(`modal must be one of: ${[...OPEN_MODALS].join(', ')}`);
      break;
    case 'scroll_to':
      if (!isNonEmptyString(a.target)) problems.push('target is required (a scroll anchor id)');
      break;
    case 'change_setting': {
      if (!CHANGE_SETTING_KEYS.has(a.key as string)) problems.push(`key must be one of: ${[...CHANGE_SETTING_KEYS].join(', ')}`);
      if (a.value === undefined) problems.push('value is required');
      break;
    }
  }
  return problems;
}

/**
 * Parses the LLM's JSON output into validated actions. Malformed entries are
 * dropped with a visible error; nothing invalid is ever executed.
 */
export function extractActions(parsed: unknown): { actions: ValidatedAction[]; errors: string[] } {
  const actions: ValidatedAction[] = [];
  const errors: string[] = [];
  if (parsed === undefined || parsed === null) return { actions, errors };
  const list = Array.isArray(parsed) ? parsed : isRecord(parsed) && Array.isArray(parsed.actions) ? parsed.actions : null;
  if (!list) return { actions: [], errors: ['Agent returned no action list.'] };
  for (const item of list) {
    const res = validateAction(item);
    if (res.ok) actions.push(res.action);
    else errors.push(res.error);
  }
  return { actions, errors };
}

/** Helpers for the client dispatcher to reuse the same validation the UI uses. */
export function normalizeFilterArgs(args: Record<string, unknown>): FilterState {
  return normalizeFilterState(args.cards ? { ...args, cards: normalizeCardsState(args.cards) } : args);
}

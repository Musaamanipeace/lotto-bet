'use client';

/**
 * Client dispatcher for agent actions (Section 4). Each action maps to the
 * same setters / window events the UI already uses, so auth, RLS and rate
 * limits are identical — the agent gets no extra permissions.
 * Invalid actions were already dropped server-side (never executed here).
 */
import { useCallback } from 'react';
import { useAuth } from './auth-context';
import { useFilters } from './filter-context';
import { readSlip, writeSlip, SLIP_EVENT } from '@/lib/slip-store.ts';
import {
  addMany,
  emptySlip,
  removeLeg,
  slipBookmaker,
  slipTotals,
  toggleGrey,
  type Slip,
} from '@/lib/slip.ts';
import {
  deleteLocalTemplate,
  getLocalTemplates,
  notifyTemplateApplied,
  saveLocalTemplate,
} from '@/lib/template-store.ts';
import { normalizeFilterArgs, type ValidatedAction } from '@/lib/agent-actions.ts';
import type { PickRow } from '@/lib/filters.ts';

export type ActionOutcome = { lines: string[]; notes: string[] };

export function useAgentActions() {
  const { user, openAuth } = useAuth();
  const { setFilterState, resetFilters } = useFilters();

  const executeActions = useCallback(
    async (actions: ValidatedAction[]): Promise<ActionOutcome> => {
      const lines: string[] = [];
      const notes: string[] = [];

      // Destructive: one-tap confirm; only run them after the tap.
      let active = actions;
      const destructive = actions.filter((a) => a.risk === 'destructive');
      if (destructive.length > 0) {
        const ok = window.confirm(`Allow ${destructive.map((d) => d.name).join(', ')}?`);
        if (!ok) {
          notes.push(`Skipped ${destructive.length} destructive action(s).`);
          active = actions.filter((a) => a.risk !== 'destructive');
        }
      }

      // Guests: clearly say sign-in is needed, don't attempt the action.
      if (!user) {
        const accountActions = active.filter((a) =>
          ['save_slip', 'delete_slip', 'share_slip', 'save_filter_template', 'update_filter_template', 'delete_filter_template', 'change_setting'].includes(a.name),
        );
        if (accountActions.length > 0) {
          notes.push(`Sign in to use ${accountActions.map((a) => a.name).join(', ')} — opened sign-in.`);
          openAuth('login');
          active = active.filter((a) => !accountActions.includes(a));
        }
      }

      for (const a of active) {
        try {
          lines.push(await runAction(a, { setFilterState, resetFilters, signedIn: Boolean(user) }));
        } catch (e) {
          notes.push(`Could not apply ${a.name}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      return { lines, notes };
    },
    [setFilterState, resetFilters, user, openAuth],
  );

  return { executeActions };
}

type FilterSetter = ReturnType<typeof useFilters>['setFilterState'];
type Ctx = { setFilterState: FilterSetter; resetFilters: () => void; signedIn: boolean };

async function runAction(a: ValidatedAction, ctx: Ctx): Promise<string> {
  const args = a.args;
  switch (a.name) {
    case 'set_filters': {
      const fs = normalizeFilterArgs(args);
      ctx.setFilterState(fs);
      return `Filters updated (${fs.bookmaker}).`;
    }
    case 'reset_filters':
      ctx.resetFilters();
      return 'Filters reset.';
    case 'apply_template': {
      const t = getLocalTemplates().find((x) => x.id === args.id);
      if (!t) return 'Template not found.';
      ctx.setFilterState(
        normalizeFilterArgs({ bookmaker: t.bookmaker, withinHours: t.withinHours, leagues: t.leagues, cards: t.cards }),
      );
      notifyTemplateApplied(t);
      return `Applied template "${t.name}".`;
    }
    case 'save_filter_template': {
      if (!ctx.signedIn) return 'Sign in to save templates.';
      const t = saveLocalTemplate({
        name: String(args.name),
        bookmaker: (args.bookmaker === 'betpawa' ? 'betpawa' : 'sportybet') as 'sportybet' | 'betpawa',
        withinHours: (args.withinHours as number | null | undefined) ?? null,
        leagues: (args.leagues as string[] | undefined) ?? [],
        cards: (args.cards as Parameters<typeof saveLocalTemplate>[0]['cards']) ?? undefined,
      });
      void persistTemplate(t.id, t);
      return `Saved template "${t.name}".`;
    }
    case 'update_filter_template': {
      const id = String(args.id);
      const t = getLocalTemplates().find((x) => x.id === id);
      if (!t) return 'Template not found.';
      const merged = saveLocalTemplate({
        name: (args.name as string | undefined) ?? t.name,
        bookmaker: t.bookmaker,
        withinHours: (args.withinHours as number | null | undefined) ?? t.withinHours,
        leagues: (args.leagues as string[] | undefined) ?? t.leagues,
        cards: (args.cards as typeof t.cards | undefined) ?? t.cards,
      });
      void persistTemplate(merged.id, merged);
      return `Updated template "${merged.name}".`;
    }
    case 'delete_filter_template': {
      const id = String(args.id);
      const t = getLocalTemplates().find((x) => x.id === id);
      deleteLocalTemplate(id);
      if (t) void persistTemplateDelete(id);
      return `Deleted template "${t?.name ?? id}".`;
    }
    case 'add_picks': {
      const slip = readSlip();
      const rows: PickRow[] = (args.picks as Array<Record<string, unknown>>).map((p) => ({
        gameId: String(p.gameId),
        nativeEventId: String(p.gameId),
        bookmaker: slipBookmaker(slip) ?? 'sportybet',
        home: String(p.home),
        away: String(p.away),
        kickoff: Date.now() + 3600_000,
        league: (p.league as string | null | undefined) ?? null,
        pick: String(p.pick),
        odds: Number(p.odds),
        marketNativeId: String(p.marketKind ?? slip.legs[0]?.marketNativeId ?? '1x2'),
        outcomeNativeId: String(p.outcomeNativeId ?? p.outcomeKey ?? 'outcome'),
        specifier: String(p.specifier ?? ''),
        marketKind: (p.marketKind as PickRow['marketKind']) ?? '1x2',
        line: (p.line as number | null | undefined) ?? null,
        outcomeKey: (p.outcomeKey as PickRow['outcomeKey']) ?? null,
        implied: null,
      }));
      const res = addMany(slip, rows);
      const next: Slip = { ...slip, legs: res.slip.legs };
      writeSlip(next);
      window.dispatchEvent(new Event(SLIP_EVENT));
      return `Added ${res.added} leg(s) to the slip.`;
    }
    case 'remove_leg': {
      const slip = readSlip();
      writeSlip(removeLeg(slip, String(args.gameId)));
      window.dispatchEvent(new Event(SLIP_EVENT));
      return `Removed leg ${args.gameId}.`;
    }
    case 'clear_slip': {
      writeSlip(emptySlip());
      window.dispatchEvent(new Event(SLIP_EVENT));
      return 'Slip cleared.';
    }
    case 'grey_leg': {
      const slip = readSlip();
      writeSlip(toggleGrey(slip, String(args.gameId)));
      window.dispatchEvent(new Event(SLIP_EVENT));
      return `Greylisted leg ${args.gameId}.`;
    }
    case 'lock_leg': {
      const slip = readSlip();
      const gameId = String(args.gameId);
      const locked = [...(slip.locked ?? [])];
      if (!locked.includes(gameId)) locked.push(gameId);
      writeSlip({ ...slip, locked });
      window.dispatchEvent(new Event(SLIP_EVENT));
      return `Locked leg ${gameId}.`;
    }
    case 'swap_leg': {
      const slip = readSlip();
      const out = removeLeg(slip, String(args.outGameId));
      const inGameId = String(args.inGameId);
      const hasIn = slip.legs.some((l) => l.gameId === inGameId);
      writeSlip(out);
      window.dispatchEvent(new Event(SLIP_EVENT));
      return hasIn ? `Swapped leg ${args.outGameId} for the in-slip pick at ${inGameId}.` : `Removed leg ${args.outGameId} (replacement data not on the action).`;
    }
    case 'save_slip': {
      const slip = readSlip();
      if (slip.legs.length === 0) return 'Slip is empty.';
      const totals = slipTotals(slip);
      const r = await fetch('/api/slips/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(args.name ?? slip.name ?? ''),
          bookmaker: slipBookmaker(slip),
          legs: slip.legs,
          totalOdds: totals.totalOdds.ok ? totals.totalOdds.total : 1,
          combinedImplied: totals.combined.ok ? totals.combined.probability : null,
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error ?? 'failed to save slip');
      writeSlip({ ...slip, id: j?.slip?.id ?? slip.id, name: j?.slip?.name ?? String(args.name ?? slip.name) });
      window.dispatchEvent(new Event(SLIP_EVENT));
      return `Saved slip "${j?.slip?.name ?? String(args.name ?? slip.name)}".`;
    }
    case 'rename_slip': {
      writeSlip({ ...readSlip(), name: String(args.name) });
      window.dispatchEvent(new Event(SLIP_EVENT));
      return `Renamed slip to "${args.name}".`;
    }
    case 'delete_slip': {
      const slip = readSlip();
      const id = slip.id ?? String(args.slipId ?? '');
      if (!id) return 'Slip not identified.';
      const r = await fetch('/api/slips/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error ?? 'failed to delete slip');
      writeSlip({ ...slip, legs: [], greyed: [], id: undefined, name: undefined });
      window.dispatchEvent(new Event(SLIP_EVENT));
      return `Deleted slip "${id}".`;
    }
    case 'generate_book_code': {
      const r = await fetch('/api/codegen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slip: readSlip() }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error ?? 'failed to generate code');
      return `Booking code: ${j?.code ?? '(generated)'}`;
    }
    case 'share_slip': {
      const slip = readSlip();
      const id = slip.id ?? String(args.slipId ?? '');
      if (!id) return 'Slip not identified.';
      const r = await fetch('/api/slips/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error ?? 'failed to share slip');
      return 'Slip shared.';
    }
    case 'navigate':
      window.location.href = String(args.route);
      return `Navigating to ${args.route}.`;
    case 'open_modal': {
      const modal = String(args.modal);
      if (modal === 'betslip') window.dispatchEvent(new Event(SLIP_EVENT));
      else if (modal === 'settings') window.dispatchEvent(new CustomEvent('lb-open-settings'));
      else if (modal === 'account') window.dispatchEvent(new CustomEvent('lb-open-account'));
      return `Opened modal "${modal}".`;
    }
    case 'scroll_to': {
      document.getElementById(String(args.target))?.scrollIntoView({ behavior: 'smooth' });
      return `Scrolled to ${args.target}.`;
    }
    case 'change_setting': {
      const key = String(args.key);
      const r = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preferences: { [key]: args.value } }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error ?? 'failed to change setting');
      return `Setting "${key}" updated.`;
    }
    default:
      return `Action "${a.name}" is not available in this build.`;
  }
}

/** Persist a custom template (best effort; logged, not silent). */
function persistTemplate(id: string, t: Parameters<typeof saveLocalTemplate>[0] & { id?: string }): Promise<void> {
  if (t.isDefault) return Promise.resolve();
  return fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: t.name, bookmaker: t.bookmaker, withinHours: t.withinHours, leagues: t.leagues, cards: t.cards }),
  })
    .then(() => undefined)
    .catch(() => undefined);
}

function persistTemplateDelete(id: string): Promise<void> {
  return fetch('/api/templates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    .then(() => undefined)
    .catch(() => undefined);
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type LeagueItem = {
  name: string;
  gameCount: number;
  nextKickoff?: number | null;
  bookmakers?: string[];
  priorityGroup: number;
};

export const LEAGUE_GROUP_LABEL = ['Big Five Leagues', 'Second Tier European', 'Americas & Other Priority', 'Other Competitions'];

function GroupBox({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate: boolean; onChange: () => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} aria-label={label} className="h-4 w-4 accent-emerald-500" />;
}

/**
 * Checkbox list of leagues, grouped by priority tier. Selecting nothing means "all leagues".
 * Used on the Leagues page and (compact) inside the AI Picks filter.
 */
export function LeagueChecklist({ leagues, selected, onChange, compact = false }: {
  leagues: LeagueItem[];
  selected: string[];
  onChange: (next: string[]) => void;
  compact?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const sel = useMemo(() => new Set(selected), [selected]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<number, LeagueItem[]>();
    for (let i = 0; i < LEAGUE_GROUP_LABEL.length; i++) map.set(i, []);
    for (const l of leagues) {
      if (q && !l.name.toLowerCase().includes(q)) continue;
      const g = Math.min(Math.max(0, l.priorityGroup), LEAGUE_GROUP_LABEL.length - 1);
      map.get(g)!.push(l);
    }
    return [...map.entries()].filter(([, items]) => items.length > 0);
  }, [leagues, query]);

  const toggle = (name: string) => onChange(sel.has(name) ? selected.filter((n) => n !== name) : [...selected, name]);
  const setMany = (names: string[], on: boolean) => {
    const rest = selected.filter((n) => !names.includes(n));
    onChange(on ? [...rest, ...names] : rest);
  };
  const visibleNames = groups.flatMap(([, items]) => items.map((l) => l.name));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search leagues…"
          className="field text-sm" aria-label="Search leagues"
        />
        <button type="button" className="btn-ghost text-xs" onClick={() => setMany(visibleNames, true)}>Select all{query ? ' shown' : ''}</button>
        <button type="button" className="btn-ghost text-xs" onClick={() => onChange([])} disabled={selected.length === 0}>Clear</button>
        <span className="text-xs text-slate-400" role="status">
          {selected.length === 0 ? 'No league ticked: all leagues are used' : `${selected.length} selected`}
        </span>
      </div>

      {groups.length === 0 && <p className="text-sm text-slate-400">No leagues match “{query}”.</p>}

      <div className="space-y-3">
        {groups.map(([g, items]) => {
          const names = items.map((l) => l.name);
          const picked = names.filter((n) => sel.has(n)).length;
          const isCollapsed = Boolean(collapsed[g]);
          return (
            <div key={g} className="rounded-xl border border-white/10 bg-navy-900/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2">
                  <GroupBox
                    checked={picked === names.length} indeterminate={picked > 0 && picked < names.length}
                    onChange={() => setMany(names, picked !== names.length)} label={`Select every league in ${LEAGUE_GROUP_LABEL[g]}`}
                  />
                  <span className="font-display text-sm font-semibold text-white">{LEAGUE_GROUP_LABEL[g]}</span>
                  <span className="text-xs text-slate-400">{items.length} leagues · {items.reduce((s, l) => s + l.gameCount, 0)} games</span>
                </label>
                <button type="button" className="text-xs text-cyan-400 hover:text-cyan-300" onClick={() => setCollapsed((c) => ({ ...c, [g]: !c[g] }))}>
                  {isCollapsed ? '▼ Expand' : '▲ Collapse'}
                </button>
              </div>
              {!isCollapsed && (
                <ul className={`mt-2 ${compact ? 'max-h-56 overflow-y-auto' : ''} space-y-1`}>
                  {items.map((l) => (
                    <li key={l.name}>
                      <label className="glass flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 px-3 py-2 hover:border-white/20">
                        <span className="flex items-center gap-2">
                          <input type="checkbox" checked={sel.has(l.name)} onChange={() => toggle(l.name)} className="h-4 w-4 accent-emerald-500" />
                          <span className="text-sm text-white">{l.name}</span>
                          {!compact && l.bookmakers && <span className="text-[11px] text-slate-500">{l.bookmakers.join(', ')}</span>}
                        </span>
                        <span className="text-xs text-emerald-300">
                          {l.gameCount} games
                          {!compact && l.nextKickoff ? (
                            <span className="ml-2 text-slate-400">next {new Date(l.nextKickoff).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  MAX_SHORTCUT_LABEL,
  MAX_SHORTCUTS,
  SHORTCUT_ALLOWLIST,
  type UserShortcut,
} from '@/lib/shortcuts.ts';
import { SIGNOUT_EVENT } from '@/lib/client-storage.ts';
import { useAuth } from './auth-context';
import { useFilters } from './filter-context';

export function ShortcutsBar() {
  const { user } = useAuth();
  const { openFiltersSheet } = useFilters();
  const pathname = usePathname();
  const router = useRouter();

  const [shortcuts, setShortcuts] = useState<UserShortcut[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const loadShortcuts = useCallback(async () => {
    if (!user) {
      setShortcuts([]);
      setLoaded(false);
      return;
    }
    try {
      const r = await fetch('/api/shortcuts', { cache: 'no-store' });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.ok && Array.isArray(j.shortcuts)) {
        setShortcuts(j.shortcuts);
      }
    } catch {
      /* ignore network hiccup */
    } finally {
      setLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    void loadShortcuts();
  }, [loadShortcuts]);

  useEffect(() => {
    const onSignOut = () => {
      setShortcuts([]);
      setPickerOpen(false);
      setEditingId(null);
    };
    window.addEventListener(SIGNOUT_EVENT, onSignOut);
    return () => window.removeEventListener(SIGNOUT_EVENT, onSignOut);
  }, []);

  // Signed-in only (Task 11)
  if (!user) return null;

  const atLimit = shortcuts.length >= MAX_SHORTCUTS;
  const existingTargets = new Set(shortcuts.map((s) => s.target));

  async function handleAdd(target: string, labelOverride?: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/shortcuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, label: labelOverride?.trim() || undefined }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        setError(j?.error ?? `Failed to add shortcut (HTTP ${r.status})`);
        return;
      }
      setShortcuts(j.shortcuts);
      setCustomLabel('');
      setSelectedTarget('');
      setPickerOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(id: string) {
    const trimmed = editLabel.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/shortcuts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, label: trimmed.slice(0, MAX_SHORTCUT_LABEL) }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        setError(j?.error ?? 'Rename failed');
        return;
      }
      setShortcuts(j.shortcuts);
      setEditingId(null);
      setEditLabel('');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/shortcuts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.ok) {
        setShortcuts(j.shortcuts);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleReorder(nextIds: string[]) {
    // Optimistically update
    const byId = new Map(shortcuts.map((s) => [s.id, s]));
    const nextList = nextIds
      .map((id, idx) => {
        const item = byId.get(id);
        return item ? { ...item, position: idx } : null;
      })
      .filter((x): x is UserShortcut => Boolean(x));
    setShortcuts(nextList);

    try {
      const r = await fetch('/api/shortcuts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: nextIds }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.ok && Array.isArray(j.shortcuts)) {
        setShortcuts(j.shortcuts);
      }
    } catch {
      /* keep optimistic state until next sync */
    }
  }

  function moveShortcut(index: number, delta: -1 | 1) {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= shortcuts.length) return;
    const ids = shortcuts.map((s) => s.id);
    const [removed] = ids.splice(index, 1);
    ids.splice(targetIdx, 0, removed);
    void handleReorder(ids);
  }

  function navigateToShortcut(target: string) {
    if (target === '/#filters') {
      if (pathname === '/') {
        const el = document.getElementById('filters');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
      openFiltersSheet();
      return;
    }

    if (target.startsWith('/#')) {
      const anchor = target.slice(2);
      if (pathname === '/') {
        const el = document.getElementById(anchor);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
      router.push(target);
      return;
    }
  }

  return (
    <>
      <nav
        aria-label="Pinned tools bar"
        className="border-b border-white/10 bg-navy-900/90 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-1.5 overflow-x-auto px-3 py-1.5 sm:px-4 no-scrollbar">
          {shortcuts.map((sc, idx) => (
            <div
              key={sc.id}
              draggable
              onDragStart={() => setDraggedId(sc.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!draggedId || draggedId === sc.id) return;
                const ids = shortcuts.map((s) => s.id);
                const from = ids.indexOf(draggedId);
                const to = ids.indexOf(sc.id);
                if (from >= 0 && to >= 0) {
                  ids.splice(from, 1);
                  ids.splice(to, 0, draggedId);
                  void handleReorder(ids);
                }
                setDraggedId(null);
              }}
              className="group inline-flex shrink-0 items-center rounded-md border border-white/10 bg-white/[0.04] text-xs text-slate-200 hover:border-emerald-500/40"
            >
              {sc.target.startsWith('/#') ? (
                <button
                  type="button"
                  onClick={() => navigateToShortcut(sc.target)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium hover:text-emerald-300"
                >
                  <span aria-hidden>{sc.icon}</span>
                  <span>{sc.label}</span>
                </button>
              ) : (
                <Link
                  href={sc.target}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium hover:text-emerald-300 ${
                    pathname === sc.target ? 'text-emerald-300' : ''
                  }`}
                >
                  <span aria-hidden>{sc.icon}</span>
                  <span>{sc.label}</span>
                </Link>
              )}
              <button
                type="button"
                aria-label={`Edit or reorder ${sc.label}`}
                title="Edit, reorder, or remove shortcut"
                onClick={() => {
                  setEditingId(sc.id);
                  setEditLabel(sc.label);
                  setError(null);
                }}
                className="border-l border-white/10 px-1.5 py-1 text-[10px] text-slate-400 hover:text-white"
              >
                ⋯
              </button>
              {idx > 0 && (
                <button
                  type="button"
                  aria-label={`Move ${sc.label} left`}
                  onClick={() => moveShortcut(idx, -1)}
                  className="sr-only focus:not-sr-only px-1 text-[10px] text-slate-400 hover:text-white"
                >
                  ←
                </button>
              )}
              {idx < shortcuts.length - 1 && (
                <button
                  type="button"
                  aria-label={`Move ${sc.label} right`}
                  onClick={() => moveShortcut(idx, 1)}
                  className="sr-only focus:not-sr-only px-1 text-[10px] text-slate-400 hover:text-white"
                >
                  →
                </button>
              )}
            </div>
          ))}

          {loaded && shortcuts.length === 0 && (
            <span className="shrink-0 text-[11px] text-slate-400 pr-1">
              Pin quick tools here (max {MAX_SHORTCUTS})
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              setPickerOpen(true);
              setError(null);
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-dashed border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
          >
            + Add tool
          </button>
        </div>
      </nav>

      {/* Add Tool Picker Modal */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setPickerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Add Tool Shortcut"
        >
          <div
            className="glass w-full max-w-md bg-navy-900/95 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-white">Add Tool Shortcut</h2>
                <p className="text-xs text-slate-400">
                  {shortcuts.length} / {MAX_SHORTCUTS} pinned · Internal pages & anchors only
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200" role="alert">
                {error}
              </p>
            )}

            <div className="space-y-2">
              <label className="block text-xs text-slate-300">
                Custom label (optional, max {MAX_SHORTCUT_LABEL} chars)
                <input
                  className="field mt-1 text-xs"
                  maxLength={MAX_SHORTCUT_LABEL}
                  placeholder="Leave blank for default name"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                />
              </label>

              <div className="max-h-64 space-y-1.5 overflow-y-auto pt-1">
                {SHORTCUT_ALLOWLIST.map((tool) => {
                  const alreadyAdded = existingTargets.has(tool.target);
                  return (
                    <button
                      key={tool.target}
                      type="button"
                      disabled={busy || atLimit || alreadyAdded}
                      onClick={() => void handleAdd(tool.target, customLabel || undefined)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition ${
                        alreadyAdded
                          ? 'border-white/5 bg-white/[0.02] text-slate-500 cursor-not-allowed'
                          : 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-emerald-500/40 hover:bg-emerald-500/10'
                      }`}
                    >
                      <span>
                        <span className="mr-1.5">{tool.icon}</span>
                        <strong className="text-white">{tool.defaultLabel}</strong>{' '}
                        <span className="text-slate-400">— {tool.description}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-300">
                        {alreadyAdded ? 'Pinned' : atLimit ? 'Full' : '+ Pin'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedTarget && (
              <p className="text-xs text-slate-400">Selected: {selectedTarget}</p>
            )}
          </div>
        </div>
      )}

      {/* Edit / Reorder / Delete Shortcut Modal */}
      {editingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setEditingId(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Edit Shortcut"
        >
          <div
            className="glass w-full max-w-sm bg-navy-900/95 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h2 className="font-display text-base font-bold text-white">Manage Shortcut</h2>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200" role="alert">
                {error}
              </p>
            )}

            <label className="block text-xs text-slate-300">
              Label (max {MAX_SHORTCUT_LABEL} chars)
              <input
                className="field mt-1 text-xs"
                maxLength={MAX_SHORTCUT_LABEL}
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
              />
            </label>

            {(() => {
              const idx = shortcuts.findIndex((s) => s.id === editingId);
              if (idx < 0) return null;
              return (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">Position ({idx + 1} of {shortcuts.length})</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveShortcut(idx, -1)}
                      className="btn-ghost px-2 py-1 text-xs"
                    >
                      ← Move Left
                    </button>
                    <button
                      type="button"
                      disabled={idx === shortcuts.length - 1}
                      onClick={() => moveShortcut(idx, 1)}
                      className="btn-ghost px-2 py-1 text-xs"
                    >
                      Move Right →
                    </button>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const target = editingId;
                  setEditingId(null);
                  void handleDelete(target);
                }}
                className="btn-ghost text-xs text-rose-300 hover:bg-rose-500/10"
              >
                Remove
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || !editLabel.trim()}
                  onClick={() => void handleRename(editingId)}
                  className="btn-emerald text-xs"
                >
                  Save Label
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

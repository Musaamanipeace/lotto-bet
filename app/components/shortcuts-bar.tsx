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

export type ShortcutsController = ReturnType<typeof useShortcutsController>;

export function useShortcutsController() {
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

  // Close shortcut modals on route change
  useEffect(() => {
    setPickerOpen(false);
    setEditingId(null);
  }, [pathname]);

  // Escape key + body scroll lock while Add/Manage shortcut modal is open
  const anyModalOpen = Boolean(user) && (pickerOpen || Boolean(editingId));
  useEffect(() => {
    if (!anyModalOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPickerOpen(false);
        setEditingId(null);
      }
    };
    window.addEventListener('keydown', onKey);

    const scrollY = window.scrollY;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      window.scrollTo(0, scrollY);
    };
  }, [anyModalOpen]);

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

  return {
    user,
    pathname,
    shortcuts,
    loaded,
    pickerOpen,
    setPickerOpen,
    editingId,
    setEditingId,
    editLabel,
    setEditLabel,
    customLabel,
    setCustomLabel,
    selectedTarget,
    error,
    setError,
    busy,
    draggedId,
    setDraggedId,
    handleAdd,
    handleRename,
    handleDelete,
    handleReorder,
    moveShortcut,
    navigateToShortcut,
  };
}

export function ShortcutsBar({ ctrl }: { ctrl: ShortcutsController }) {
  if (!ctrl.user) return null;

  return (
    <nav
      aria-label="Pinned tools bar"
      className="border-b border-white/10 bg-navy-900/95"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-1.5 overflow-x-auto px-3 py-1.5 sm:px-4 no-scrollbar">
        {ctrl.shortcuts.map((sc, idx) => (
          <div
            key={sc.id}
            draggable
            onDragStart={() => ctrl.setDraggedId(sc.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (!ctrl.draggedId || ctrl.draggedId === sc.id) return;
              const ids = ctrl.shortcuts.map((s) => s.id);
              const from = ids.indexOf(ctrl.draggedId);
              const to = ids.indexOf(sc.id);
              if (from >= 0 && to >= 0) {
                ids.splice(from, 1);
                ids.splice(to, 0, ctrl.draggedId);
                void ctrl.handleReorder(ids);
              }
              ctrl.setDraggedId(null);
            }}
            className="group inline-flex shrink-0 items-center rounded-md border border-white/10 bg-white/[0.04] text-xs text-slate-200 hover:border-emerald-500/40"
          >
            {sc.target.startsWith('/#') ? (
              <button
                type="button"
                onClick={() => ctrl.navigateToShortcut(sc.target)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium hover:text-emerald-300"
              >
                <span aria-hidden>{sc.icon}</span>
                <span>{sc.label}</span>
              </button>
            ) : (
              <Link
                href={sc.target}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium hover:text-emerald-300 ${
                  ctrl.pathname === sc.target ? 'text-emerald-300' : ''
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
                ctrl.setEditingId(sc.id);
                ctrl.setEditLabel(sc.label);
                ctrl.setError(null);
              }}
              className="border-l border-white/10 px-1.5 py-1 text-[10px] text-slate-400 hover:text-white"
            >
              ⋯
            </button>
            {idx > 0 && (
              <button
                type="button"
                aria-label={`Move ${sc.label} left`}
                onClick={() => ctrl.moveShortcut(idx, -1)}
                className="sr-only focus:not-sr-only px-1 text-[10px] text-slate-400 hover:text-white"
              >
                ←
              </button>
            )}
            {idx < ctrl.shortcuts.length - 1 && (
              <button
                type="button"
                aria-label={`Move ${sc.label} right`}
                onClick={() => ctrl.moveShortcut(idx, 1)}
                className="sr-only focus:not-sr-only px-1 text-[10px] text-slate-400 hover:text-white"
              >
                →
              </button>
            )}
          </div>
        ))}

        {ctrl.loaded && ctrl.shortcuts.length === 0 && (
          <span className="shrink-0 text-[11px] text-slate-400 pr-1">
            Pin quick tools here (max {MAX_SHORTCUTS})
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            ctrl.setPickerOpen(true);
            ctrl.setError(null);
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-dashed border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
        >
          + Add tool
        </button>
      </div>
    </nav>
  );
}

/**
 * Rendered as a sibling AFTER </header> in TopBar so fixed positioning and z-index
 * are never trapped inside the fixed header's backdrop-filter containing block on mobile.
 */
export function ShortcutsModals({ ctrl }: { ctrl: ShortcutsController }) {
  if (!ctrl.user) return null;

  const atLimit = ctrl.shortcuts.length >= MAX_SHORTCUTS;
  const existingTargets = new Set(ctrl.shortcuts.map((s) => s.target));

  return (
    <>
      {/* Add Tool Picker Modal */}
      {ctrl.pickerOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/75 p-3 sm:p-4 backdrop-blur-sm"
          style={{
            paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) ctrl.setPickerOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Add Tool Shortcut"
        >
          <div
            className="glass my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden bg-navy-900/95 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5 sm:py-3.5">
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-white">Add Tool Shortcut</h2>
                <p className="text-xs text-slate-400">
                  {ctrl.shortcuts.length} / {MAX_SHORTCUTS} pinned · Internal pages & anchors only
                </p>
              </div>
              <button
                type="button"
                onClick={() => ctrl.setPickerOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-base font-bold text-white hover:bg-white/20"
                aria-label="Close Add Tool modal"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3.5 sm:px-5 space-y-3">
              {ctrl.error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200" role="alert">
                  {ctrl.error}
                </p>
              )}

              <label className="block text-xs text-slate-300">
                Custom label (optional, max {MAX_SHORTCUT_LABEL} chars)
                <input
                  className="field mt-1 text-xs"
                  maxLength={MAX_SHORTCUT_LABEL}
                  placeholder="Leave blank for default name"
                  value={ctrl.customLabel}
                  onChange={(e) => ctrl.setCustomLabel(e.target.value)}
                />
              </label>

              <div className="space-y-1.5 pt-1">
                {SHORTCUT_ALLOWLIST.map((tool) => {
                  const alreadyAdded = existingTargets.has(tool.target);
                  return (
                    <button
                      key={tool.target}
                      type="button"
                      disabled={ctrl.busy || atLimit || alreadyAdded}
                      onClick={() => void ctrl.handleAdd(tool.target, ctrl.customLabel || undefined)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-xs transition ${
                        alreadyAdded
                          ? 'border-white/5 bg-white/[0.02] text-slate-500 cursor-not-allowed'
                          : 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-emerald-500/40 hover:bg-emerald-500/10'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="mr-1.5">{tool.icon}</span>
                        <strong className="text-white">{tool.defaultLabel}</strong>{' '}
                        <span className="text-slate-400">— {tool.description}</span>
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-emerald-300">
                        {alreadyAdded ? 'Pinned' : atLimit ? 'Full' : '+ Pin'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {ctrl.selectedTarget && (
                <p className="text-xs text-slate-400">Selected: {ctrl.selectedTarget}</p>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-end border-t border-white/10 bg-navy-950/70 px-4 py-2.5 sm:px-5">
              <button
                type="button"
                onClick={() => ctrl.setPickerOpen(false)}
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Reorder / Delete Shortcut Modal */}
      {ctrl.editingId && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/75 p-3 sm:p-4 backdrop-blur-sm"
          style={{
            paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) ctrl.setEditingId(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Edit Shortcut"
        >
          <div
            className="glass my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-sm flex-col overflow-hidden bg-navy-900/95 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <h2 className="font-display text-base font-bold text-white">Manage Shortcut</h2>
              <button
                type="button"
                onClick={() => ctrl.setEditingId(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-base font-bold text-white hover:bg-white/20"
                aria-label="Close Manage Shortcut modal"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 space-y-4">
              {ctrl.error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200" role="alert">
                  {ctrl.error}
                </p>
              )}

              <label className="block text-xs text-slate-300">
                Label (max {MAX_SHORTCUT_LABEL} chars)
                <input
                  className="field mt-1 text-xs"
                  maxLength={MAX_SHORTCUT_LABEL}
                  value={ctrl.editLabel}
                  onChange={(e) => ctrl.setEditLabel(e.target.value)}
                />
              </label>

              {(() => {
                const idx = ctrl.shortcuts.findIndex((s) => s.id === ctrl.editingId);
                if (idx < 0) return null;
                return (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400">Position ({idx + 1} of {ctrl.shortcuts.length})</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => ctrl.moveShortcut(idx, -1)}
                        className="btn-ghost px-2 py-1 text-xs"
                      >
                        ← Move Left
                      </button>
                      <button
                        type="button"
                        disabled={idx === ctrl.shortcuts.length - 1}
                        onClick={() => ctrl.moveShortcut(idx, 1)}
                        className="btn-ghost px-2 py-1 text-xs"
                      >
                        Move Right →
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-white/10 bg-navy-950/70 px-4 py-3 sm:px-5">
              <button
                type="button"
                disabled={ctrl.busy}
                onClick={() => {
                  const target = ctrl.editingId;
                  ctrl.setEditingId(null);
                  if (target) void ctrl.handleDelete(target);
                }}
                className="btn-ghost text-xs text-rose-300 hover:bg-rose-500/10"
              >
                Remove
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => ctrl.setEditingId(null)}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={ctrl.busy || !ctrl.editLabel.trim()}
                  onClick={() => {
                    if (ctrl.editingId) void ctrl.handleRename(ctrl.editingId);
                  }}
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

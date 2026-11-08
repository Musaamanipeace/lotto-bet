'use client';

import { useCallback, useEffect, useState, type DragEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './auth-context';
import {
  MAX_SHORTCUT_LABEL_LEN,
  MAX_SHORTCUTS,
  SHORTCUT_ALLOWLIST,
  loadLocalShortcuts,
  saveLocalShortcuts,
  type UserShortcut,
} from '@/lib/shortcuts.ts';
import { SIGNOUT_EVENT } from '@/lib/client-storage.ts';

export function ShortcutsBar() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [shortcuts, setShortcuts] = useState<UserShortcut[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string>(SHORTCUT_ALLOWLIST[0].target);
  const [customLabel, setCustomLabel] = useState<string>(SHORTCUT_ALLOWLIST[0].label);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load shortcuts when user is signed in; clear on sign-out
  useEffect(() => {
    if (!user) {
      setShortcuts([]);
      setPickerOpen(false);
      setManageMode(false);
      return;
    }

    const cached = loadLocalShortcuts();
    if (cached.length > 0) setShortcuts(cached);

    let live = true;
    fetch('/api/shortcuts', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (!live) return;
        if (j?.ok && Array.isArray(j.shortcuts)) {
          setShortcuts(j.shortcuts);
          saveLocalShortcuts(j.shortcuts);
        }
      })
      .catch(() => {});

    return () => {
      live = false;
    };
  }, [user]);

  useEffect(() => {
    const onSignOut = () => {
      setShortcuts([]);
      setPickerOpen(false);
      setManageMode(false);
    };
    window.addEventListener(SIGNOUT_EVENT, onSignOut);
    return () => window.removeEventListener(SIGNOUT_EVENT, onSignOut);
  }, []);

  const handleNavigate = useCallback(
    (target: string) => {
      if (manageMode) return;
      const [pathPart, hashPart] = target.split('#');
      const targetPath = pathPart || '/';

      if (hashPart && pathname === targetPath) {
        const el = document.getElementById(hashPart);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          window.history.replaceState(null, '', target);
          return;
        }
      }

      router.push(target);
      if (hashPart) {
        setTimeout(() => {
          const el = document.getElementById(hashPart);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 180);
      }
    },
    [manageMode, pathname, router],
  );

  // Render only when signed in
  if (!user) return null;

  const pinnedTargets = new Set(shortcuts.map((s) => s.target));
  const atLimit = shortcuts.length >= MAX_SHORTCUTS;

  const openPicker = () => {
    setError(null);
    const firstAvailable = SHORTCUT_ALLOWLIST.find((a) => !pinnedTargets.has(a.target)) ?? SHORTCUT_ALLOWLIST[0];
    setSelectedTarget(firstAvailable.target);
    setCustomLabel(firstAvailable.label);
    setPickerOpen(true);
  };

  const handleSelectTargetChange = (target: string) => {
    setSelectedTarget(target);
    const found = SHORTCUT_ALLOWLIST.find((a) => a.target === target);
    if (found) setCustomLabel(found.label.slice(0, MAX_SHORTCUT_LABEL_LEN));
    setError(null);
  };

  const handleAddShortcut = async () => {
    if (atLimit) {
      setError(`Maximum of ${MAX_SHORTCUTS} shortcuts reached. Remove one to add another.`);
      return;
    }
    if (pinnedTargets.has(selectedTarget)) {
      setError('A shortcut for this route is already pinned.');
      return;
    }
    const trimmed = customLabel.trim();
    if (!trimmed || trimmed.length > MAX_SHORTCUT_LABEL_LEN) {
      setError(`Label must be between 1 and ${MAX_SHORTCUT_LABEL_LEN} characters.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const def = SHORTCUT_ALLOWLIST.find((a) => a.target === selectedTarget);
      const r = await fetch('/api/shortcuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: selectedTarget,
          label: trimmed,
          icon: def?.icon ?? '📌',
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setError(j.error ?? 'Could not add shortcut');
      } else {
        const next = [...shortcuts, j.shortcut as UserShortcut];
        setShortcuts(next);
        saveLocalShortcuts(next);
        setPickerOpen(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (id: string) => {
    const trimmed = editingLabel.trim();
    if (!trimmed || trimmed.length > MAX_SHORTCUT_LABEL_LEN) {
      setError(`Label must be 1–${MAX_SHORTCUT_LABEL_LEN} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/shortcuts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, label: trimmed }),
      });
      const j = await r.json();
      if (r.ok && j.ok) {
        const next = shortcuts.map((s) => (s.id === id ? (j.shortcut as UserShortcut) : s));
        setShortcuts(next);
        saveLocalShortcuts(next);
        setEditingId(null);
      } else {
        setError(j.error ?? 'Rename failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/shortcuts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const j = await r.json();
      if (r.ok && j.ok) {
        const next = shortcuts.filter((s) => s.id !== id).map((s, idx) => ({ ...s, position: idx }));
        setShortcuts(next);
        saveLocalShortcuts(next);
      } else {
        setError(j.error ?? 'Delete failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const commitOrder = async (nextOrder: UserShortcut[]) => {
    const reindexed = nextOrder.map((s, idx) => ({ ...s, position: idx }));
    setShortcuts(reindexed);
    saveLocalShortcuts(reindexed);
    try {
      await fetch('/api/shortcuts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reindexed.map((s) => s.id) }),
      });
    } catch {
      /* local state already updated */
    }
  };

  const moveShortcut = (index: number, delta: -1 | 1) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= shortcuts.length) return;
    const copy = [...shortcuts];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    void commitOrder(copy);
  };

  const onDragStart = (idx: number) => (e: DragEvent<HTMLDivElement>) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (targetIdx: number) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      return;
    }
    const copy = [...shortcuts];
    const [moved] = copy.splice(dragIdx, 1);
    copy.splice(targetIdx, 0, moved);
    setDragIdx(null);
    void commitOrder(copy);
  };

  return (
    <div
      className="border-b border-white/10 bg-navy-900/90 backdrop-blur-md"
      role="region"
      aria-label="Pinned tool shortcuts"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
        {shortcuts.length === 0 && (
          <span className="shrink-0 text-xs text-slate-400">
            No pinned tools yet — pin routes or sections you visit often:
          </span>
        )}

        {shortcuts.map((s, idx) => (
          <div
            key={s.id}
            draggable={manageMode}
            onDragStart={onDragStart(idx)}
            onDragOver={onDragOver}
            onDrop={onDrop(idx)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              manageMode
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200 cursor-grab'
                : 'border-white/15 bg-white/[0.04] text-slate-200 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-white'
            }`}
          >
            {editingId === s.id ? (
              <form
                className="flex items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleRename(s.id);
                }}
              >
                <input
                  type="text"
                  maxLength={MAX_SHORTCUT_LABEL_LEN}
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  aria-label={`Rename ${s.label}`}
                  className="h-5 w-28 rounded border border-cyan-400/50 bg-navy-950 px-1.5 text-xs text-white focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-navy-950"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleNavigate(s.target)}
                  className="inline-flex items-center gap-1.5 text-left"
                >
                  {s.icon && <span aria-hidden>{s.icon}</span>}
                  <span>{s.label}</span>
                </button>

                {manageMode && (
                  <span className="ml-1 inline-flex items-center gap-0.5 border-l border-white/15 pl-1">
                    <button
                      type="button"
                      onClick={() => moveShortcut(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Move ${s.label} earlier`}
                      className="rounded px-1 text-[10px] text-slate-300 hover:bg-white/10 disabled:opacity-30"
                      title="Move left / up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveShortcut(idx, 1)}
                      disabled={idx === shortcuts.length - 1}
                      aria-label={`Move ${s.label} later`}
                      className="rounded px-1 text-[10px] text-slate-300 hover:bg-white/10 disabled:opacity-30"
                      title="Move right / down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(s.id);
                        setEditingLabel(s.label);
                      }}
                      aria-label={`Rename ${s.label}`}
                      className="rounded px-1 text-[10px] text-cyan-300 hover:bg-white/10"
                      title="Rename"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(s.id)}
                      aria-label={`Remove ${s.label}`}
                      className="rounded px-1 text-[10px] text-rose-300 hover:bg-rose-500/20"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </>
            )}
          </div>
        ))}

        {/* Trailing + Add tool chip */}
        <button
          type="button"
          onClick={openPicker}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
        >
          + Add tool
        </button>

        {shortcuts.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setManageMode((m) => !m);
              setEditingId(null);
            }}
            aria-pressed={manageMode}
            className="ml-auto shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10 hover:text-white"
          >
            {manageMode ? 'Done' : '✎ Edit tools'}
          </button>
        )}
      </div>

      {/* Add Tool Picker Modal */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setPickerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Add tool shortcut"
        >
          <div
            className="glass w-full max-w-md bg-navy-900/95 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-white">Pin a Tool Shortcut</h2>
                <p className="text-xs text-slate-400">
                  Choose an app route or section ({shortcuts.length}/{MAX_SHORTCUTS} pinned).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close shortcut picker"
              >
                ✕
              </button>
            </div>

            {atLimit && (
              <div
                className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs text-amber-200"
                role="alert"
              >
                You have reached the maximum of {MAX_SHORTCUTS} shortcuts. Remove an existing shortcut to pin a new one.
              </div>
            )}

            {error && (
              <div
                className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs text-rose-200"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Destination (Allowlist)
                </label>
                <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                  {SHORTCUT_ALLOWLIST.map((item) => {
                    const alreadyPinned = pinnedTargets.has(item.target);
                    const isSelected = selectedTarget === item.target;
                    return (
                      <button
                        key={item.target}
                        type="button"
                        disabled={alreadyPinned}
                        onClick={() => handleSelectTargetChange(item.target)}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition ${
                          alreadyPinned
                            ? 'border-white/5 bg-white/[0.01] text-slate-500 opacity-50 cursor-not-allowed'
                            : isSelected
                              ? 'border-emerald-500 bg-emerald-500/15 text-white'
                              : 'border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/10'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span aria-hidden>{item.icon}</span>
                          <span className="truncate font-semibold">{item.label}</span>
                          <span className="truncate text-[11px] text-slate-400">— {item.desc}</span>
                        </span>
                        {alreadyPinned && (
                          <span className="ml-2 shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-400">
                            Pinned
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="shortcut-label-input" className="font-semibold text-slate-300">
                    Chip Label
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {customLabel.trim().length}/{MAX_SHORTCUT_LABEL_LEN}
                  </span>
                </div>
                <input
                  id="shortcut-label-input"
                  type="text"
                  maxLength={MAX_SHORTCUT_LABEL_LEN}
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value.slice(0, MAX_SHORTCUT_LABEL_LEN))}
                  className="field text-xs"
                  placeholder="Shortcut label (max 24 chars)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="btn-ghost text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || atLimit || pinnedTargets.has(selectedTarget) || !customLabel.trim()}
                onClick={() => void handleAddShortcut()}
                className="btn-emerald text-xs"
              >
                {busy ? 'Adding…' : 'Pin Shortcut'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

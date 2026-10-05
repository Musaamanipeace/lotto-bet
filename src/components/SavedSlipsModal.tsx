'use client';

import React, { useState } from 'react';
import { SavedBetslip, SelectedPick } from '@/types';
import {
  listSavedSlips,
  updateSavedSlip,
  deleteSavedSlip,
  saveBetslip,
} from '@/lib/storage';
import { calculateAccumulatorOdds, mergePicksIntoSlip } from '@/lib/filterEngine';
import {
  Bookmark,
  Edit2,
  Trash2,
  X,
  Check,
  Plus,
  Send,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Combine,
  CheckSquare,
  Square,
  FileCheck,
} from 'lucide-react';

interface SavedSlipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  currentSlip: SelectedPick[];
  onLoadSlip: (selections: SelectedPick[]) => void;
  onAppendToSlip: (selections: SelectedPick[]) => void;
}

export const SavedSlipsModal: React.FC<SavedSlipsModalProps> = ({
  isOpen,
  onClose,
  username,
  currentSlip,
  onLoadSlip,
  onAppendToSlip,
}) => {
  const [slips, setSlips] = useState<SavedBetslip[]>(() => listSavedSlips(username));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedForConcat, setSelectedForConcat] = useState<string[]>([]);
  const [saveName, setSaveName] = useState('');
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const refreshSlips = () => {
    const list = listSavedSlips(username);
    setSlips(list);
  };

  const handleStartRename = (slip: SavedBetslip) => {
    setEditingId(slip.id);
    setEditName(slip.name);
  };

  const handleSaveRename = (id: string) => {
    if (!editName.trim()) return;
    updateSavedSlip(id, { name: editName.trim() });
    setEditingId(null);
    refreshSlips();
    notify('Betslip renamed successfully.');
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    deleteSavedSlip(id);
    setSelectedForConcat((prev) => prev.filter((sId) => sId !== id));
    refreshSlips();
    notify('Betslip deleted.');
  };

  const handleRemoveLegFromSavedSlip = (slipId: string, gameId: string) => {
    const target = slips.find((s) => s.id === slipId);
    if (!target) return;
    const remaining = target.selections.filter((s) => s.gameId !== gameId);
    if (remaining.length === 0) {
      if (confirm('Removing all legs will delete this slip. Proceed?')) {
        deleteSavedSlip(slipId);
        refreshSlips();
      }
      return;
    }
    updateSavedSlip(slipId, {
      selections: remaining,
      totalOdds: calculateAccumulatorOdds(remaining),
    });
    refreshSlips();
    notify('Leg removed from saved slip.');
  };

  const handleSaveCurrentSlip = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentSlip.length === 0) {
      notify('Current betslip has no matches to save.');
      return;
    }
    const defaultName = `Accumulator - ${currentSlip.length} Matches (${calculateAccumulatorOdds(currentSlip)}x)`;
    const finalName = saveName.trim() || defaultName;
    saveBetslip(finalName, currentSlip);
    setSaveName('');
    setIsSavingCurrent(false);
    refreshSlips();
    notify(`Saved "${finalName}" successfully!`);
  };

  const toggleSelectForConcat = (id: string) => {
    setSelectedForConcat((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  /** Check if match kickoff has already passed */
  const isKickoffExpired = (kickoffTime: string): boolean => {
    const t = new Date(kickoffTime).getTime();
    return !isNaN(t) && t <= Date.now();
  };

  /** Filter selections to return only upcoming / unexpired matches */
  const filterActiveMatches = (selections: SelectedPick[]) => {
    const now = Date.now();
    const active: SelectedPick[] = [];
    let expiredCount = 0;
    for (const s of selections) {
      const t = new Date(s.kickoffTime).getTime();
      if (!isNaN(t) && t <= now) {
        expiredCount++;
      } else {
        active.push(s);
      }
    }
    return { active, expiredCount };
  };

  /** Load saved slip into betslip, excluding any expired games */
  const handleLoadSlip = (slip: SavedBetslip) => {
    const { active, expiredCount } = filterActiveMatches(slip.selections);
    if (active.length === 0) {
      notify(`Cannot load "${slip.name}": all ${slip.selections.length} matches have already kicked off.`);
      return;
    }
    onLoadSlip(active);
    const msg =
      expiredCount > 0
        ? `Loaded ${active.length} active matches (@${calculateAccumulatorOdds(active)}x). Excluded ${expiredCount} expired match${expiredCount === 1 ? '' : 'es'}.`
        : `Loaded "${slip.name}" (${active.length} matches, @${calculateAccumulatorOdds(active)}x) into betslip!`;
    notify(msg);
    onClose();
  };

  /** Concatenate selected slips into one large accumulator, excluding expired matches */
  const handleConcatenateSlips = () => {
    if (selectedForConcat.length < 2) {
      notify('Select at least 2 saved slips to concatenate.');
      return;
    }
    const chosenSlips = slips.filter((s) => selectedForConcat.includes(s.id));
    let allMatches: SelectedPick[] = [];
    for (const s of chosenSlips) {
      allMatches = mergePicksIntoSlip(allMatches, s.selections);
    }

    // Exclude any expired games
    const { active, expiredCount } = filterActiveMatches(allMatches);
    if (active.length === 0) {
      notify('All matches across the selected slips have already kicked off (expired).');
      return;
    }

    const megaOdds = calculateAccumulatorOdds(active);
    const megaName = `Mega Acca (${chosenSlips.length} Slips Concatenated - ${active.length} Matches)`;

    // Save as new concatenated slip
    saveBetslip(megaName, active);
    refreshSlips();
    setSelectedForConcat([]);

    onLoadSlip(active);
    const note = expiredCount > 0 ? ` (excluded ${expiredCount} expired matches)` : '';
    notify(`Concatenated ${chosenSlips.length} slips into "${megaName}" (@${megaOdds}x)${note}! Loaded into active betslip.`);
  };

  /** Concatenate a single saved slip with current active slip, excluding expired matches */
  const handleConcatWithActiveSlip = (slip: SavedBetslip) => {
    const { active: slipActive, expiredCount: slipExpired } = filterActiveMatches(slip.selections);
    if (slipActive.length === 0) {
      notify(`Cannot concatenate: all matches in "${slip.name}" have already kicked off.`);
      return;
    }
    const { active: currentActive, expiredCount: currentExpired } = filterActiveMatches(currentSlip);
    const merged = mergePicksIntoSlip(currentActive, slipActive);
    onLoadSlip(merged);

    const totalExpired = slipExpired + currentExpired;
    const note = totalExpired > 0 ? ` (excluded ${totalExpired} expired matches)` : '';
    notify(`Concatenated "${slip.name}" with current betslip (${merged.length} matches, @${calculateAccumulatorOdds(merged)}x)${note}!`);
  };

  /** Clean up and remove expired matches directly from a saved slip */
  const handleCleanExpiredFromSlip = (slipId: string) => {
    const target = slips.find((s) => s.id === slipId);
    if (!target) return;
    const { active, expiredCount } = filterActiveMatches(target.selections);
    if (expiredCount === 0) {
      notify('No expired matches in this slip.');
      return;
    }
    if (active.length === 0) {
      if (confirm('All matches in this slip have expired. Delete this slip?')) {
        deleteSavedSlip(slipId);
        refreshSlips();
        notify('Expired slip deleted.');
      }
      return;
    }
    updateSavedSlip(slipId, {
      selections: active,
      totalOdds: calculateAccumulatorOdds(active),
    });
    refreshSlips();
    notify(`Cleaned ${expiredCount} expired match${expiredCount === 1 ? '' : 'es'} from "${target.name}".`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Saved Betslips</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  @{username}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Name, edit, delete, or concatenate slips for mega accumulators
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Action: Save Active Slip if matches exist */}
        {currentSlip.length > 0 && (
          <div className="p-3 bg-emerald-950/20 border-b border-emerald-900/40 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                Active betslip has <strong>{currentSlip.length} matches in slip</strong> (@{calculateAccumulatorOdds(currentSlip)}x)
              </span>
            </div>
            {!isSavingCurrent ? (
              <button
                type="button"
                onClick={() => setIsSavingCurrent(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-sm transition-colors"
              >
                <Plus className="w-3 h-3" />
                Save Current Slip
              </button>
            ) : (
              <form onSubmit={handleSaveCurrentSlip} className="flex items-center gap-2 flex-1 max-w-sm">
                <input
                  type="text"
                  autoFocus
                  placeholder="Name this betslip..."
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsSavingCurrent(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        )}

        {/* Toast / Notification Banner */}
        {notification && (
          <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <FileCheck className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* Multi-Slip Concatenation Bar */}
        {selectedForConcat.length > 0 && (
          <div className="p-3 bg-amber-950/30 border-b border-amber-500/40 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-semibold">
              <Combine className="w-4 h-4 text-amber-400" />
              <span>{selectedForConcat.length} slips selected for concatenation</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedForConcat([])}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={handleConcatenateSlips}
                disabled={selectedForConcat.length < 2}
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-amber-500/20"
              >
                <Combine className="w-3.5 h-3.5" />
                Concatenate Slips (Mega Acca)
              </button>
            </div>
          </div>
        )}

        {/* Saved Slips List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {slips.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 mx-auto">
                <Bookmark className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">No Saved Betslips Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Build a betslip and click &quot;Save Current Slip&quot; to preserve it here. You can name your slips, edit individual legs, and concatenate multiple slips into mega accumulators!
              </p>
            </div>
          ) : (
            slips.map((s) => {
              const isSelected = selectedForConcat.includes(s.id);
              const isExpanded = expandedId === s.id;
              const { active: slipActive, expiredCount } = filterActiveMatches(s.selections);

              return (
                <div
                  key={s.id}
                  className={`rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-[#152033] border-amber-500/60 ring-1 ring-amber-500/40 shadow-lg'
                      : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800'
                  }`}
                >
                  {/* Slip Header Row */}
                  <div className="p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                      {/* Select for Concatenation Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleSelectForConcat(s.id)}
                        title={isSelected ? 'Deselect from concatenation' : 'Select to concatenate'}
                        className="text-slate-400 hover:text-amber-400 shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-amber-400" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        {editingId === s.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              autoFocus
                              className="bg-slate-800 border border-emerald-500 rounded px-2 py-1 text-xs text-white font-semibold focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRename(s.id)}
                              className="p-1 text-emerald-400 hover:text-emerald-300"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1 text-slate-400 hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                              {s.name}
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleStartRename(s)}
                              className="text-slate-500 hover:text-slate-300 p-0.5"
                              title="Rename slip"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                          <span className="text-slate-200 font-semibold">
                            {s.selections.length} in slip ({slipActive.length} active)
                          </span>
                          <span>•</span>
                          <span>
                            Total Odds: <strong className="text-emerald-400 font-bold">{s.totalOdds}x</strong>
                          </span>
                          {expiredCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="px-1.5 py-0.2 rounded bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-bold">
                                {expiredCount} Expired
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCleanExpiredFromSlip(s.id)}
                                className="text-[10px] text-red-400 hover:text-red-300 underline"
                                title="Remove expired matches from this saved slip"
                              >
                                Clean Expired
                              </button>
                            </>
                          )}
                          {s.bookingCode && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400">Code: {s.bookingCode}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="text-slate-500">
                            {new Date(s.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : s.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
                      >
                        {isExpanded ? 'Hide Legs' : `View Legs (${s.selections.length})`}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleConcatWithActiveSlip(s)}
                        title="Concatenate unexpired matches from this slip into your active betslip"
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1"
                      >
                        <Combine className="w-3 h-3" />
                        <span>+ Merge</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadSlip(s)}
                        title="Replace active betslip with unexpired matches from this slip"
                        className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-sm"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Load</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(s.id, s.name)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Delete saved slip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded View: Legs list with ability to edit/remove individual matches */}
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-800/80 space-y-1.5 bg-[#090f1a] rounded-b-xl">
                      <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider py-1 flex justify-between">
                        <span>Matches in this saved slip:</span>
                        <span>Expired matches automatically excluded on load/merge</span>
                      </div>
                      {s.selections.map((leg, idx) => {
                        const isExpired = isKickoffExpired(leg.kickoffTime);
                        return (
                          <div
                            key={`${leg.gameId}-${leg.pick}`}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs gap-2 ${
                              isExpired
                                ? 'bg-red-950/20 border-red-900/40 opacity-70'
                                : 'bg-slate-900/90 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-mono text-slate-500 text-[10px] w-4">{idx + 1}.</span>
                              <div className="truncate">
                                <p className={`font-semibold truncate ${isExpired ? 'line-through text-slate-400' : 'text-white'}`}>
                                  {leg.homeTeam} <span className="text-slate-400 font-normal">vs</span> {leg.awayTeam}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {leg.league} • <span className="text-slate-300 font-medium">{leg.marketName}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isExpired ? (
                                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">
                                  Kicked Off
                                </span>
                              ) : null}
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono text-[11px]">
                                {leg.pick}
                              </span>
                              <span className="font-mono font-bold text-white text-xs">
                                @{leg.odd.toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveLegFromSavedSlip(s.id, leg.gameId)}
                                className="p-1 text-slate-500 hover:text-red-400 transition-colors ml-1"
                                title="Remove this leg from saved slip"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{slips.length} total saved slips</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

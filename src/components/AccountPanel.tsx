'use client';

import React, { useEffect, useState } from 'react';
import { UserProfile, SavedBetslip, SlipResultStatus, SelectedPick } from '@/types';
import {
  getCurrentUser,
  registerUser,
  signInUser,
  signOutUser,
  updateCurrentUser,
  listSavedSlips,
  saveBetslip,
  updateSavedSlip,
  deleteSavedSlip,
  deleteAllSavedSlips,
  appendToBetslip,
} from '@/lib/storage';
import { LogIn, LogOut, Save, Trash2, User, KeyRound, Archive, Edit2, Copy, PlusCircle, Loader2, Check, X } from 'lucide-react';

interface AccountPanelProps {
  selections: SelectedPick[];
  stake: number;
  bookingCode?: string;
  onLoadSlip: (selections: SelectedPick[]) => void;
  onUserChange?: (user: UserProfile | null) => void;
}

export const AccountPanel: React.FC<AccountPanelProps> = ({
  selections,
  stake,
  bookingCode,
  onLoadSlip,
  onUserChange,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [slips, setSlips] = useState<SavedBetslip[]>([]);
  const [slipName, setSlipName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<'openai' | 'gemini' | 'compatible'>('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [baseUrl, setBaseUrl] = useState('');
  const [editingSlipId, setEditingSlipId] = useState<string | null>(null);
  const [editSlipName, setEditSlipName] = useState('');
  const [appendTargetId, setAppendTargetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => {
    const u = getCurrentUser();
    setUser(u);
    onUserChange?.(u);
    if (u) {
      setSlips(listSavedSlips(u.username));
      setApiKey(u.llmApiKey || '');
      setProvider(u.llmProvider || 'openai');
      setModel(u.llmModel || 'gpt-4o-mini');
      setBaseUrl(u.llmBaseUrl || '');
    } else {
      setSlips([]);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegister = async () => {
    setSaving(true);
    const r = await registerUser(username, password);
    setMsg(r.ok ? 'Account created — signed in.' : r.error);
    refresh();
    setSaving(false);
  };

  const handleSignIn = async () => {
    setSaving(true);
    const r = await signInUser(username, password);
    setMsg(r.ok ? 'Signed in.' : r.error);
    refresh();
    setSaving(false);
  };

  const handleSignOut = () => {
    signOutUser();
    setMsg('Signed out.');
    refresh();
  };

  const handleSaveKeys = () => {
    const u = updateCurrentUser({
      llmApiKey: apiKey.trim() || undefined,
      llmProvider: provider,
      llmModel: model.trim() || undefined,
      llmBaseUrl: baseUrl.trim() || undefined,
    });
    setMsg(u ? 'AI settings saved in this browser only.' : 'Sign in first.');
    refresh();
  };

  const handleSaveSlip = () => {
    const s = saveBetslip(slipName, selections, { stake, bookingCode });
    setMsg(s ? `Saved "${s.name}".` : 'Sign in and add legs before saving.');
    setSlipName('');
    refresh();
  };

  const handleAppendSlip = (slipId: string) => {
    const result = appendToBetslip(slipId, selections);
    setMsg(result ? `Appended ${selections.length} legs to "${result.name}".` : 'Sign in and add legs before appending.');
    setAppendTargetId(null);
    refresh();
  };

  const setStatus = (id: string, status: SlipResultStatus) => {
    updateSavedSlip(id, { status });
    refresh();
  };

  const startEditSlip = (slip: SavedBetslip) => {
    setEditingSlipId(slip.id);
    setEditSlipName(slip.name);
  };

  const saveEditSlip = (slipId: string) => {
    const result = updateSavedSlip(slipId, { name: editSlipName });
    setMsg(result ? `Renamed to "${result.name}".` : 'Failed to rename.');
    setEditingSlipId(null);
    setEditSlipName('');
    refresh();
  };

  const cancelEditSlip = () => {
    setEditingSlipId(null);
    setEditSlipName('');
  };

  if (!user) {
    return (
      <div className="bg-[#111927] border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <User className="w-4 h-4 text-emerald-400" />
          Sign in to save slips
        </div>
        <p className="text-[11px] text-slate-400">
          Accounts are stored only in this browser (no cloud server). Optional for AI analysis with your own API key.
        </p>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-[#0b111e] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-[#0b111e] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={saving}
            className="flex-1 px-3 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-1"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
            Sign in
          </button>
          <button
            type="button"
            onClick={handleRegister}
            disabled={saving}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white"
          >
            Register
          </button>
        </div>
        {msg && <p className="text-[11px] text-amber-300">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="bg-[#111927] border border-slate-800 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-white truncate">{user.username}</div>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>

      <div className="space-y-2 border-t border-slate-800 pt-3">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <KeyRound className="w-3 h-3" /> Optional LLM key (your key, this device)
        </div>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as typeof provider)}
          className="w-full bg-[#0b111e] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
        >
          <option value="openai">OpenAI</option>
          <option value="gemini">Google Gemini</option>
          <option value="compatible">OpenAI-compatible (custom base URL)</option>
        </select>
        <input
          type="password"
          placeholder="API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full bg-[#0b111e] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
        />
        <input
          placeholder="Model (e.g. gpt-4o-mini or gemini-2.0-flash)"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full bg-[#0b111e] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
        />
        {provider === 'compatible' && (
          <input
            placeholder="Base URL https://.../v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full bg-[#0b111e] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
          />
        )}
        <button
          type="button"
          onClick={handleSaveKeys}
          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200"
        >
          Save AI settings
        </button>
      </div>

      <div className="space-y-2 border-t border-slate-800 pt-3">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Save className="w-3 h-3" /> Save current slip
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Slip name"
            value={slipName}
            onChange={(e) => setSlipName(e.target.value)}
            className="flex-1 bg-[#0b111e] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
          />
          <button
            type="button"
            onClick={handleSaveSlip}
            disabled={selections.length === 0}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-800 pt-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Archive className="w-3 h-3" /> Saved slips ({slips.length})
          </div>
          {slips.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Delete ALL saved slips?')) {
                  deleteAllSavedSlips();
                  refresh();
                  setMsg('All saved slips deleted.');
                }
              }}
              className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-0.5"
            >
              <Trash2 className="w-3 h-3" /> Delete all
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {slips.length === 0 && (
            <p className="text-[11px] text-slate-500">No saved slips yet.</p>
          )}
          {slips.map((s) => (
            <div
              key={s.id}
              className="p-2 rounded-xl border border-slate-800 bg-[#0b111e] text-[11px] space-y-1"
            >
              <div className="flex justify-between gap-2">
                {editingSlipId === s.id ? (
                  <div className="flex-1 flex gap-1">
                    <input
                      type="text"
                      value={editSlipName}
                      onChange={(e) => setEditSlipName(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => saveEditSlip(s.id)}
                      className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditSlip}
                      className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold text-white truncate">{s.name}</span>
                    <button
                      type="button"
                      onClick={() => startEditSlip(s)}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Rename slip"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <span
                  className={`font-mono ${
                    s.status === 'won'
                      ? 'text-emerald-400'
                      : s.status === 'lost'
                      ? 'text-red-400'
                      : s.status === 'open'
                      ? 'text-sky-400'
                      : 'text-amber-400'
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <div className="text-slate-400">
                {s.selections.length} legs · {s.totalOdds}x
                {s.bookingCode ? ` · ${s.bookingCode}` : ''}
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => onLoadSlip(s.selections)}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] font-medium"
                >
                  Load
                </button>
                <button
                  type="button"
                  onClick={() => setAppendTargetId(s.id)}
                  className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-medium"
                >
                  <PlusCircle className="w-3 h-3" /> Append
                </button>
                {(['open', 'won', 'lost', 'void', 'unknown'] as SlipResultStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(s.id, st)}
                    className={`px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 text-[10px] ${
                      s.status === st ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : ''
                    }`}
                  >
                    {st}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete "${s.name}"?`)) {
                      deleteSavedSlip(s.id);
                      refresh();
                    }
                  }}
                  className="px-2 py-0.5 rounded text-red-400 text-[10px]"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
              {appendTargetId === s.id && (
                <div className="pt-1 border-t border-slate-800 flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleAppendSlip(s.id)}
                    className="flex-1 px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold"
                  >
                    Confirm Append ({selections.length} legs)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppendTargetId(null)}
                    className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {msg && <p className="text-[11px] text-amber-300">{msg}</p>}
    </div>
  );
};
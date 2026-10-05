'use client';

import React, { useState } from 'react';
import { SelectedPick, StandardGame, UserProfile, SavedBetslip } from '@/types';
import { listSavedSlips, getCurrentUser } from '@/lib/storage';
import { Sparkles, Loader2 } from 'lucide-react';

interface AiCoachPanelProps {
  selections: SelectedPick[];
  games: StandardGame[];
  user: UserProfile | null;
}

export const AiCoachPanel: React.FC<AiCoachPanelProps> = ({ selections, games, user }) => {
  const [prompt, setPrompt] = useState(
    'Review my current slip. Flag weak legs and suggest better replacements from available fixtures if possible. Summarize how my saved tickets have been performing.'
  );
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    const u = user || getCurrentUser();
    if (!u?.llmApiKey) {
      setError('Sign in and save your own LLM API key under Account first.');
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const saved: SavedBetslip[] = listSavedSlips(u.username);
      const sample = games.slice(0, 40).map((g) => ({
        id: g.id,
        eventId: g.eventId,
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        league: g.league,
        kickoffTime: g.kickoffTime,
        markets: g.markets,
      }));
      const res = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          apiKey: u.llmApiKey,
          provider: u.llmProvider || 'openai',
          model: u.llmModel,
          baseUrl: u.llmBaseUrl,
          context: {
            currentSelections: selections,
            savedSlips: saved.map((s) => ({
              name: s.name,
              status: s.status,
              totalOdds: s.totalOdds,
              bookingCode: s.bookingCode,
              createdAt: s.createdAt,
              earliestKickoff: s.earliestKickoff,
              legs: s.selections.map((p) => ({
                homeTeam: p.homeTeam,
                awayTeam: p.awayTeam,
                marketName: p.marketName,
                pick: p.pick,
                odd: p.odd,
                kickoffTime: p.kickoffTime,
              })),
            })),
            availableGamesSample: sample,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI request failed');
      }
      setAnalysis(data.analysis || '(empty response)');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111927] border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-white">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        AI coach (your API key)
      </div>
      <p className="text-[11px] text-slate-400">
        Optional. Sends your prompt plus current slip, saved ticket results, and a fixture sample to
        your LLM. Keys never leave this flow except to the provider you configure.
      </p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        className="w-full bg-[#0b111e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        placeholder="Ask for analysis, replacements, or review of saved tickets…"
      />
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="w-full px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? 'Analyzing…' : 'Run analysis'}
      </button>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {analysis && (
        <div className="p-3 rounded-xl bg-[#0b111e] border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap max-h-64 overflow-y-auto">
          {analysis}
        </div>
      )}
    </div>
  );
};


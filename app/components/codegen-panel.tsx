'use client';
import { useState } from 'react';
import type { BetPawaScriptResult } from '@/lib/codegen/betpawa.ts';
import { BETPAWA_STEPS, BETPAWA_WARNING } from '@/lib/codegen/betpawa.ts';
import type { Destination } from '@/lib/codegen/index.ts';
import type { SportyCodeResult } from '@/lib/codegen/sportybet.ts';
import type { PickRow } from '@/lib/filters.ts';
import type { Failure } from '@/lib/result.ts';
import { useAuth } from './auth-context';

type Outcome =
  | { destination: Destination; result: SportyCodeResult | BetPawaScriptResult | Failure; httpStatus: number }
  | { destination: Destination; transportError: string };

const NAME: Record<Destination, string> = { sportybet: 'SportyBet', betpawa: 'betPawa' };

export function CodegenPanel({ legs, sourceBookmaker }: { legs: PickRow[]; sourceBookmaker: string | null }) {
  const { user, loading, openAuth, codegenRequiresSignIn } = useAuth();
  const [destination, setDestination] = useState<Destination>('sportybet');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Only the explicitly chosen destination runs, and only when the user presses a button.
  async function generate(dest: Destination) {
    setBusy(true); setOutcome(null); setCopied(null);
    try {
      const r = await fetch('/api/codegen', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ destination: dest, legs }) });
      const text = await r.text();
      let result: unknown = null;
      try { result = JSON.parse(text); } catch { /* handled below */ }
      if (result && typeof result === 'object' && 'ok' in result) setOutcome({ destination: dest, result: result as SportyCodeResult, httpStatus: r.status });
      else setOutcome({ destination: dest, transportError: `Unexpected response (HTTP ${r.status}): ${text.slice(0, 200)}` });
    } catch (e) {
      setOutcome({ destination: dest, transportError: `Request failed: ${e instanceof Error ? e.message : String(e)}` });
    } finally { setBusy(false); }
  }

  async function copy(label: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(label); } catch (e) { setCopied(`copy failed: ${e instanceof Error ? e.message : String(e)}`); }
  }

  if (loading) return null;
  if (!user && codegenRequiresSignIn) {
    return (
      <div className="glass p-4 text-sm">
        <p className="font-semibold text-white">Booking codes</p>
        <p className="mt-1 text-slate-400">Sign in to turn your slip into a SportyBet or betPawa booking code.</p>
        <button className="btn-gold mt-3" onClick={() => openAuth('signup')}>Get Free Slips</button>
      </div>
    );
  }

  return (
    <div className="glass space-y-3 p-4 text-sm">
      <p className="font-semibold text-white">Booking codes</p>
      <div className="flex gap-2" role="radiogroup" aria-label="Destination">
        {(['sportybet', 'betpawa'] as Destination[]).map((d) => (
          <button key={d} role="radio" aria-checked={destination === d} onClick={() => { setDestination(d); setOutcome(null); }}
            className={destination === d ? 'btn-emerald' : 'btn-ghost'}>{NAME[d]}</button>
        ))}
      </div>
      <p className="text-xs text-slate-400">
        {legs.length} active leg{legs.length === 1 ? '' : 's'}{sourceBookmaker ? ` from ${sourceBookmaker}` : ''}. Greyed legs are not included.
        {destination === 'sportybet' && ' SportyBet codes accept SportyBet picks only.'}
        {destination === 'betpawa' && ' betPawa legs are matched to fresh betPawa events when you press Generate.'}
      </p>
      <button className="btn-gold w-full" disabled={busy || legs.length === 0} onClick={() => void generate(destination)}>
        {busy ? 'Generating…' : `Generate ${NAME[destination]} ${destination === 'betpawa' ? 'script' : 'code'}`}
      </button>

      {outcome && 'transportError' in outcome && <ErrorBox error={outcome.transportError} />}

      {outcome && 'result' in outcome && !outcome.result.ok && (
        <>
          <ErrorBox error={outcome.result.error} status={outcome.httpStatus} details={outcome.result.details} />
          {outcome.destination === 'betpawa' && (
            <button className="btn-ghost w-full" disabled={busy} onClick={() => { setDestination('sportybet'); void generate('sportybet'); }}>
              Generate SportyBet code instead
            </button>
          )}
        </>
      )}

      {outcome && 'result' in outcome && outcome.result.ok && outcome.result.destination === 'sportybet' && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-xs text-emerald-300">SportyBet code ({outcome.result.legCount} legs)</p>
          <p className="my-1 font-display text-2xl font-bold tracking-wider text-white">{outcome.result.code}</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => void copy('code', (outcome.result as { code: string }).code)}>Copy code</button>
            <a className="btn-emerald" href={(outcome.result as { deepLink: string }).deepLink} target="_blank" rel="noopener noreferrer">Open on SportyBet</a>
          </div>
          {copied && <p className="mt-1 text-xs text-slate-400">{copied === 'code' ? 'Copied' : copied}</p>}
        </div>
      )}

      {outcome && 'result' in outcome && outcome.result.ok && outcome.result.destination === 'betpawa' && (
        <BetPawaResult r={outcome.result} copied={copied} onCopy={(t) => void copy('script', t)} />
      )}
    </div>
  );
}

function ErrorBox({ error, status, details }: { error: string; status?: number; details?: Failure['details'] }) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200" role="alert">
      <p className="font-semibold">{error}</p>
      {(status || details?.httpStatus || details?.bizCode !== undefined) && (
        <p className="mt-1 text-xs text-red-300">
          {status ? `HTTP ${status}` : ''}{details?.httpStatus && details.httpStatus !== status ? ` · upstream HTTP ${details.httpStatus}` : ''}
          {details?.bizCode !== undefined ? ` · bizCode ${details.bizCode}` : ''}
        </p>
      )}
      {details?.bodySnippet && <p className="mt-1 break-all font-mono text-[11px] text-red-300/80">{details.bodySnippet}</p>}
      {details?.unmapped && details.unmapped.length > 0 && <Unmapped items={details.unmapped} />}
    </div>
  );
}

function Unmapped({ items }: { items: { leg: string; reason: string }[] }) {
  return (
    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
      {items.map((u, i) => <li key={i}><span className="font-semibold">{u.leg}</span>: {u.reason}</li>)}
    </ul>
  );
}

function BetPawaResult({ r, copied, onCopy }: { r: Extract<BetPawaScriptResult, { ok: true }>; copied: string | null; onCopy: (t: string) => void }) {
  return (
    <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
      <p className="font-semibold text-emerald-300">{r.mapped}/{r.total} legs mapped</p>
      {r.unmapped.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-amber-200">
          <p className="text-xs font-semibold">Not included in the script:</p>
          <Unmapped items={r.unmapped} />
        </div>
      )}
      <ol className="list-decimal space-y-0.5 pl-5 text-xs text-slate-300">{BETPAWA_STEPS.map((s) => <li key={s}>{s}</li>)}</ol>
      <p className="text-xs text-amber-300">{BETPAWA_WARNING}</p>
      <textarea readOnly className="field h-32 font-mono text-[11px]" value={r.script} onFocus={(e) => e.currentTarget.select()} aria-label="betPawa console script" />
      <div className="flex flex-wrap gap-2">
        <button className="btn-gold" onClick={() => onCopy(r.script)}>Copy script</button>
        <a className="btn-emerald" href="https://www.betpawa.co.ke/" target="_blank" rel="noopener noreferrer">Open betPawa</a>
      </div>
      {copied && <p className="text-xs text-slate-400">{copied === 'script' ? 'Copied' : copied}</p>}
    </div>
  );
}

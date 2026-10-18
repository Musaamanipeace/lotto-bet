'use client';
import { useEffect, useState } from 'react';
import { useAuth } from './auth-context';

export function AuthModal() {
  const { authOpen, closeAuth, openAuth, setUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setError(null); }, [authOpen]);
  if (!authOpen) return null;
  const signup = authOpen === 'signup';

  async function submit() {
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/auth/${signup ? 'signup' : 'login'}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }),
      });
      const j = await r.json().catch(() => null);
      if (!j || !j.ok) { setError(j?.error ?? `Request failed (HTTP ${r.status})`); return; }
      setUser(j.user); setPassword(''); closeAuth();
    } catch (e) {
      setError(`Request failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={signup ? 'Sign up' : 'Log in'} onClick={closeAuth}>
      <div className="glass w-full max-w-sm bg-navy-900/95 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-bold text-white">{signup ? 'Create your free account' : 'Welcome back'}</h2>
        <p className="mt-1 text-sm text-slate-400">{signup ? 'Needed to generate booking codes. No email required.' : 'Log in to continue.'}</p>
        <div className="mt-4 space-y-3">
          <input className="field" placeholder="Username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="field" type="password" placeholder="Password (8+ characters)" autoComplete={signup ? 'new-password' : 'current-password'}
            value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !busy) void submit(); }} />
          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">{error}</p>}
          <button className="btn-gold w-full" disabled={busy || !username || !password} onClick={() => void submit()}>
            {busy ? 'Please wait…' : signup ? 'Sign up' : 'Log in'}
          </button>
        </div>
        <p className="mt-4 text-center text-sm text-slate-400">
          {signup ? 'Already have an account?' : 'New here?'}{' '}
          <button className="text-emerald-400 underline" onClick={() => openAuth(signup ? 'login' : 'signup')}>{signup ? 'Log in' : 'Sign up'}</button>
        </p>
        <p className="mt-3 text-center text-[11px] text-slate-500">By continuing you confirm you are 18 or older.</p>
      </div>
    </div>
  );
}

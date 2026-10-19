'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@/lib/auth.ts';

type AuthMode = 'signup' | 'login';
type Ctx = {
  user: User | null;
  loading: boolean;
  /** Set when the session check itself failed (e.g. database unreachable). Not the same as "signed out". */
  sessionError: string | null;
  /** False when this deployment lets guests generate booking codes (no database, or not production). */
  codegenRequiresSignIn: boolean;
  authOpen: AuthMode | null;
  openAuth: (mode: AuthMode) => void;
  closeAuth: () => void;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);
export const useAuth = (): Ctx => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [codegenRequiresSignIn, setCodegenRequiresSignIn] = useState(true);
  const [authOpen, setAuthOpen] = useState<AuthMode | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/auth/me')
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (!live) return;
        if (j && j.ok) { setUser(j.user); setCodegenRequiresSignIn(j.codegenRequiresSignIn !== false); }
        else setSessionError(j?.error ?? `Session check failed (HTTP ${r.status})`);
      })
      .catch((e) => live && setSessionError(`Session check failed: ${e instanceof Error ? e.message : String(e)}`))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, []);

  const logout = useCallback(async () => {
    const r = await fetch('/api/auth/logout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    if (r.ok) setUser(null);
    else {
      const j = await r.json().catch(() => null);
      setSessionError(j?.error ?? `Log-out failed (HTTP ${r.status})`);
    }
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, sessionError, codegenRequiresSignIn, authOpen, openAuth: setAuthOpen, closeAuth: () => setAuthOpen(null), setUser, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@/lib/auth.ts';
import { clearAllUserStorage } from '@/lib/client-storage.ts';
import { clearClientSecrets } from '@/lib/client-settings.ts';

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

/**
 * Single place that performs a full client-side cleanup after the server session is destroyed.
 * - Clears every known lb_* localStorage / sessionStorage key
 * - Clears in-memory API key secrets
 * - Resets React auth state
 */
function performClientCleanup(setUser: (u: User | null) => void): void {
  clearAllUserStorage();
  clearClientSecrets();
  setUser(null);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [codegenRequiresSignIn, setCodegenRequiresSignIn] = useState(true);
  const [authOpen, setAuthOpen] = useState<AuthMode | null>(null);

  // Initial session check
  useEffect(() => {
    let live = true;
    fetch('/api/auth/me')
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (!live) return;
        if (j && j.ok) {
          setUser(j.user);
          setCodegenRequiresSignIn(j.codegenRequiresSignIn !== false);
        } else {
          setSessionError(j?.error ?? `Session check failed (HTTP ${r.status})`);
        }
      })
      .catch((e) => live && setSessionError(`Session check failed: ${e instanceof Error ? e.message : String(e)}`))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, []);

  /**
   * Full sign-out:
   * 1. Tell the server to destroy the session + clear the cookie
   * 2. Wipe every piece of client storage that could contain user data or secrets
   * 3. Clear in-memory secrets
   * 4. Reset React state
   */
  const logout = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      // Always clean the client even if the network call failed – better to be signed out locally
      // than leave residual data.
      performClientCleanup(setUser);
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        setSessionError(j?.error ?? `Log-out failed (HTTP ${r.status})`);
      } else {
        setSessionError(null);
      }
    } catch (e) {
      performClientCleanup(setUser);
      setSessionError(`Log-out failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  // Prevent bfcache / back-button from showing a stale signed-in UI after logout.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Page was restored from bfcache. Re-validate session.
        fetch('/api/auth/me')
          .then(async (r) => {
            const j = await r.json().catch(() => null);
            if (j && j.ok && j.user) {
              setUser(j.user);
            } else {
              // No valid session → force clean state
              performClientCleanup(setUser);
            }
          })
          .catch(() => {
            performClientCleanup(setUser);
          });
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        user,
        loading,
        sessionError,
        codegenRequiresSignIn,
        authOpen,
        openAuth: setAuthOpen,
        closeAuth: () => setAuthOpen(null),
        setUser,
        logout,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

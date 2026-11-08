'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@/lib/auth.ts';
import {
  performFullSignOutCleanup,
  setActiveStorageUserId,
} from '@/lib/client-storage.ts';
import { SLIP_EVENT } from '@/lib/slip-store.ts';
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
  /** Canonical signOut function per Task 1 */
  signOut: () => Promise<void>;
  /** Alias for signOut */
  logout: () => Promise<void>;
};

const PROTECTED_PATHS = ['/my-picks', '/saved-slips', '/results'];

const AuthCtx = createContext<Ctx | null>(null);
export const useAuth = (): Ctx => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
};

/**
 * Single place that performs a full client-side cleanup after the server session is destroyed:
 * - Clears every known lb_* localStorage / sessionStorage key (both scoped and unscoped)
 * - Clears IndexedDB databases
 * - Clears Service Worker caches
 * - Clears in-memory state and dispatches reset events
 */
export async function performClientCleanup(setUserState?: (u: User | null) => void): Promise<void> {
  clearClientSecrets();
  await performFullSignOutCleanup();
  setUserState?.(null);
}

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  // Set storage namespace synchronously from server session before children mount
  if (typeof window !== 'undefined' && initialUser?.id) {
    setActiveStorageUserId(initialUser.id);
  }

  const router = useRouter();
  const pathname = usePathname();
  const [user, setUserInternal] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(initialUser === null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [codegenRequiresSignIn, setCodegenRequiresSignIn] = useState(true);
  const [authOpen, setAuthOpen] = useState<AuthMode | null>(null);

  const setUser = useCallback((u: User | null) => {
    setActiveStorageUserId(u?.id ?? null);
    setUserInternal(u);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(SLIP_EVENT));
    }
  }, []);

  // Check if URL has ?auth=login or ?auth=signup from middleware redirect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('auth');
    if ((mode === 'login' || mode === 'signup') && !user) {
      setAuthOpen(mode);
    }
  }, [user]);

  // Initial session check
  useEffect(() => {
    let live = true;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (!live) return;
        if (j && j.ok) {
          setUser(j.user ?? null);
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
  }, [setUser]);

  /**
   * Full sign-out (Task 1):
   * 1. Tell the server to destroy the session + clear the cookie
   * 2. Wipe localStorage, sessionStorage, IndexedDB, and Service Worker caches
   * 3. Reset in-memory state and storage user scope
   * 4. Redirect to home
   */
  const signOut = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      await performClientCleanup(setUserInternal);
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        setSessionError(j?.error ?? `Log-out failed (HTTP ${r.status})`);
      } else {
        setSessionError(null);
      }
    } catch (e) {
      await performClientCleanup(setUserInternal);
      setSessionError(`Log-out failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      router.push('/');
      router.refresh();
    }
  }, [router]);

  // Prevent bfcache / back-button from showing a stale signed-in UI after logout.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname?.startsWith(`${p}/`));
      if (e.persisted || isProtected) {
        fetch('/api/auth/me', { cache: 'no-store' })
          .then(async (r) => {
            const j = await r.json().catch(() => null);
            if (j && j.ok && j.user) {
              setUser(j.user);
            } else {
              await performClientCleanup(setUserInternal);
              if (isProtected) {
                router.replace('/?auth=login');
              }
            }
          })
          .catch(async () => {
            await performClientCleanup(setUserInternal);
            if (isProtected) {
              router.replace('/?auth=login');
            }
          });
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [pathname, router, setUser]);

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
        signOut,
        logout: signOut,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

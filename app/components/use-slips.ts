'use client';
import { useCallback, useEffect, useState } from 'react';
import { emptySlip, type Slip } from '@/lib/slip.ts';
import { SLIP_EVENT, readSlip, writeSlip } from '@/lib/slip-store.ts';
import { SIGNOUT_EVENT } from '@/lib/client-storage.ts';

/**
 * Drop-in replacement for useState<Slip>: same setter, but the slip is saved in the browser
 * (user-scoped when signed in) and stays in sync across pages, tabs, and sign-in/sign-out events.
 */
export function useStoredSlip(): [Slip, (s: Slip) => void, boolean] {
  const [slip, setLocal] = useState<Slip>(emptySlip());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setLocal(readSlip());
    const onSignOut = () => setLocal(emptySlip());
    sync();
    setReady(true);
    window.addEventListener(SLIP_EVENT, sync);
    window.addEventListener('storage', sync);
    window.addEventListener(SIGNOUT_EVENT, onSignOut);
    return () => {
      window.removeEventListener(SLIP_EVENT, sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener(SIGNOUT_EVENT, onSignOut);
    };
  }, []);

  const set = useCallback((s: Slip) => {
    setLocal(s);
    writeSlip(s);
  }, []);

  return [slip, set, ready];
}

'use client';
import { useCallback, useEffect, useState } from 'react';
import { emptySlip, type Slip } from '@/lib/slip.ts';
import { SLIP_EVENT, readSlip, writeSlip } from '@/lib/slip-store.ts';

/**
 * Drop-in replacement for useState<Slip>: same setter, but the slip is saved in the browser
 * and stays in sync across pages and tabs. `ready` turns true once the stored slip has loaded.
 */
export function useStoredSlip(): [Slip, (s: Slip) => void, boolean] {
  const [slip, setLocal] = useState<Slip>(emptySlip());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setLocal(readSlip());
    sync();
    setReady(true);
    window.addEventListener(SLIP_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SLIP_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const set = useCallback((s: Slip) => {
    setLocal(s);
    writeSlip(s);
  }, []);

  return [slip, set, ready];
}

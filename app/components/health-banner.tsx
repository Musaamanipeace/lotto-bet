'use client';
import { useEffect, useState } from 'react';
import type { UpstreamHealth } from '@/lib/health.ts';

/** Shows whether each upstream is reachable. Failures show the real message and status. */
export function HealthBanner() {
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error'; error: string } | { status: 'ok'; upstreams: UpstreamHealth[] }>({ status: 'loading' });

  useEffect(() => {
    let live = true;
    fetch('/api/health')
      .then(async (r) => {
        const j = await r.json().catch(() => null); // /api/health answers 502 with a JSON body when something is down
        if (!live) return;
        if (j && Array.isArray(j.upstreams)) setState({ status: 'ok', upstreams: j.upstreams });
        else setState({ status: 'error', error: `Health check failed (HTTP ${r.status})` });
      })
      .catch((e) => live && setState({ status: 'error', error: `Health check failed: ${e instanceof Error ? e.message : String(e)}` }));
    return () => { live = false; };
  }, []);

  if (state.status === 'loading') return <p className="text-xs text-slate-500">Checking upstream status…</p>;
  if (state.status === 'error') return <p className="text-xs text-red-300" role="alert">{state.error}</p>;
  const shown = state.upstreams.filter((u) => u.status !== 'not_configured');
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {shown.map((u) => (
        <li key={u.name} className={u.status === 'ok' ? 'text-emerald-400' : 'text-red-300'} role={u.status === 'ok' ? undefined : 'alert'}>
          <span aria-hidden>●</span> {u.name}: {u.status === 'ok' ? 'reachable' : `unreachable${u.httpStatus ? ` (HTTP ${u.httpStatus})` : ''}${u.error ? `: ${u.error}` : ''}`}
        </li>
      ))}
    </ul>
  );
}

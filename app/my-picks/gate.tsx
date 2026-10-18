'use client';
import { useAuth } from '../components/auth-context';
import { Builder } from '../components/builder';

export function MyPicksGate() {
  const { user, loading, openAuth } = useAuth();
  if (loading) return <p className="mt-10 text-center text-sm text-slate-400">Checking your session…</p>;
  if (!user) {
    return (
      <div className="glass mx-auto mt-10 max-w-md p-6 text-center">
        <h1 className="font-display text-xl font-bold text-white">My Picks</h1>
        <p className="mt-2 text-sm text-slate-400">Sign in to build slips from every available game.</p>
        <button className="btn-gold mt-4" onClick={() => openAuth('signup')}>Get Free Slips</button>
      </div>
    );
  }
  return <div className="pt-6"><Builder heading="My Picks" /></div>;
}

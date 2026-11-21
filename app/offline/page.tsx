import Link from 'next/link';

export const metadata = {
  title: 'Offline · Lotto Bet',
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="glass w-full p-6 space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-2xl">
          📡
        </div>
        <h1 className="font-display text-2xl font-bold text-white">You are offline</h1>
        <p className="text-sm text-slate-300">
          Live odds, account slips, and booking code generation require an active internet connection. No personal or authenticated data is cached offline.
        </p>
        <div className="pt-2">
          <Link href="/" className="btn-emerald w-full">
            Retry Connection
          </Link>
        </div>
      </div>
    </main>
  );
}

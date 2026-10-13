'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center p-4">
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-sm"
      >
        Try again
      </button>
    </div>
  );
}

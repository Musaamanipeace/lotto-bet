export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-slate-400 mb-4">Page not found</p>
      <a href="/" className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-sm">
        Return Home
      </a>
    </div>
  );
}

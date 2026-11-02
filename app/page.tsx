import { Builder } from './components/builder';

export default function Home() {
  return (
    <>
      <div className="relative overflow-hidden pb-8 pt-10 sm:pt-14 border-b border-white/5">
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            Build your football slip from <span className="text-emerald-400">live odds</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">
            Pick from upcoming games on SportyBet or betPawa, see your total odds as you go, then turn the slip into a booking code.
          </p>
        </div>
      </div>
      <div className="mt-4"><Builder /></div>
    </>
  );
}

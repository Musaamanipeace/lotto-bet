import { Builder } from './components/builder';

const BALLS = [
  { n: 7, c: '#34d399', s: 56, x: '6%', y: '12%', d: '0s' },
  { n: 23, c: '#f5c451', s: 44, x: '88%', y: '8%', d: '-2s' },
  { n: 14, c: '#22d3ee', s: 36, x: '78%', y: '58%', d: '-4s' },
  { n: 42, c: '#f5c451', s: 40, x: '3%', y: '62%', d: '-1s' },
];

export default function Home() {
  return (
    <>
      <div className="dotgrid relative overflow-hidden pb-10 pt-14 sm:pt-20">
        <div className="glow -left-24 top-0 h-80 w-80 bg-emerald-500" />
        <div className="glow -right-24 top-10 h-72 w-72 bg-cyan-400" />
        <div className="glow bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 bg-gold-400" />
        {BALLS.map((b) => (
          <span key={b.n} aria-hidden className="ball" style={{ width: b.s, height: b.s, left: b.x, top: b.y, background: b.c, animationDelay: b.d, fontSize: b.s / 2.6 }}>{b.n}</span>
        ))}
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            Build your football slip from <span className="text-emerald-400">live odds</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Pick from upcoming games on SportyBet or betPawa, see your total odds as you go, then turn the slip into a booking code.
          </p>
        </div>
      </div>
      <div className="-mt-2"><Builder /></div>
    </>
  );
}

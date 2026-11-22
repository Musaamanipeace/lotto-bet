'use client';

/**
 * Info popover (5.3) explaining the implied/model/disparity numbers in the
 * betslip summary. Keyboard accessible; closes on Escape.
 */
import { useEffect, useRef, useState } from 'react';

export function ModelInfoPopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey, true);
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('click', onClick);
    };
  }, [open]);

  return (
    <div className="relative ml-1" ref={ref}>
      <button
        type="button"
        aria-label="About implied probability, model and disparity"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="text-slate-400 hover:text-white"
        title="What these numbers mean"
      >
        ⓘ
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Implied probability, model and disparity"
          className="absolute right-0 z-40 mt-1 w-80 rounded-xl border border-white/15 bg-navy-950 p-4 text-xs text-slate-300 shadow-2xl"
        >
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-white">Implied probability</p>
              <p className="text-slate-400">The bookmaker's odds converted to a percentage, with the bookmaker's margin removed (the market price of the pick).</p>
            </div>
            <div>
              <p className="font-semibold text-white">The model</p>
              <p className="text-slate-400">
                An independent estimate from season-to-date goals scored and conceded (home and away, per team,
                shrunk toward the league average). Football leagues in the free data only; other leagues and sports
                show &ldquo;Not covered&rdquo;.
              </p>
            </div>
            <div>
              <p className="font-semibold text-white">Disparity</p>
              <p className="text-slate-400">
                Model minus implied, in points. Positive: the model is more optimistic than the market.
                Negative: more pessimistic. Flagging thresholds are provisional (5 points notice / 10 points
                strong between 15% and 85% probability; beyond that, a 1.5x or 2x difference in chance of losing).
              </p>
            </div>
            <div>
              <p className="font-semibold text-white">How useful it is</p>
              <p className="text-slate-400">
                A second opinion, not a tip. It does not know about injuries, lineups, rotation or motivation,
                so large gaps usually mean something the model is missing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

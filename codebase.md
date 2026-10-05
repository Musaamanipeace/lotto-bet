# DualRangeSlider Performance Fix

This codebase update fixes the dual odds range slider in:

`src/components/FilterBar.tsx`

and adds debounced filtering in:

`src/app/page.tsx`

## Changes

- Both minimum and maximum handles use Pointer Events.
- Drag state is stored in refs instead of React state.
- Slider movement is rendered directly through DOM styles.
- `requestAnimationFrame` limits visual updates to the browser's animation frames.
- The parent `onChange` callback is called only when dragging ends.
- The expensive game filtering is debounced by 100 ms.
- The minimum and maximum handles may approach each other by one `step`, but cannot cross.
- Mouse, touch, and stylus input use the same pointer implementation.

---

## `src/components/FilterBar.tsx`

Replace the existing `DualRangeSlider` implementation with:

```tsx
interface DualRangeSliderProps {
  min: number;
  max: number;
  step: number;
  minVal: number;
  maxVal: number;
  onChange: (min: number, max: number) => void;
  labelMin?: string;
  labelMax?: string;
}

const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  min,
  max,
  step,
  minVal,
  maxVal,
  onChange,
  labelMin = 'min',
  labelMax = 'max',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const minHandleRef = useRef<HTMLButtonElement>(null);
  const maxHandleRef = useRef<HTMLButtonElement>(null);
  const rangeRef = useRef<HTMLDivElement>(null);

  const draggingRef = useRef<'min' | 'max' | null>(null);
  const minValueRef = useRef(minVal);
  const maxValueRef = useRef(maxVal);
  const frameRef = useRef<number | null>(null);
  const pendingClientXRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);

  const clamp = useCallback(
    (value: number, lower: number, upper: number) =>
      Math.min(Math.max(value, lower), upper),
    []
  );

  const snap = useCallback(
    (value: number) => {
      const steps = Math.round((value - min) / step);
      return clamp(min + steps * step, min, max);
    },
    [min, max, step, clamp]
  );

  const toPercent = useCallback(
    (value: number) => ((value - min) / (max - min)) * 100,
    [min, max]
  );

  const updateVisuals = useCallback(
    (nextMin: number, nextMax: number) => {
      const minPercent = toPercent(nextMin);
      const maxPercent = toPercent(nextMax);

      if (minHandleRef.current) {
        minHandleRef.current.style.transform =
          `translate3d(${minPercent}%, 0, 0)`;
      }

      if (maxHandleRef.current) {
        maxHandleRef.current.style.transform =
          `translate3d(${maxPercent}%, 0, 0)`;
      }

      if (rangeRef.current) {
        rangeRef.current.style.left = `${minPercent}%`;
        rangeRef.current.style.width = `${maxPercent - minPercent}%`;
      }
    },
    [toPercent]
  );

  const positionToValue = useCallback(
    (clientX: number) => {
      const track = trackRef.current;

      if (!track) {
        return min;
      }

      const rect = track.getBoundingClientRect();

      if (rect.width <= 0) {
        return min;
      }

      const x = clamp(clientX - rect.left, 0, rect.width);
      const ratio = x / rect.width;

      return min + ratio * (max - min);
    },
    [min, max, clamp]
  );

  const renderPendingPosition = useCallback(() => {
    frameRef.current = null;

    const clientX = pendingClientXRef.current;

    if (clientX === null || !draggingRef.current) {
      return;
    }

    const rawValue = positionToValue(clientX);
    const value = snap(rawValue);

    if (draggingRef.current === 'min') {
      const nextMin = clamp(
        value,
        min,
        maxValueRef.current - step
      );

      minValueRef.current = nextMin;

      updateVisuals(
        nextMin,
        maxValueRef.current
      );
    } else {
      const nextMax = clamp(
        value,
        minValueRef.current + step,
        max
      );

      maxValueRef.current = nextMax;

      updateVisuals(
        minValueRef.current,
        nextMax
      );
    }
  }, [
    min,
    max,
    step,
    clamp,
    positionToValue,
    snap,
    updateVisuals,
  ]);

  const scheduleVisualUpdate = useCallback(
    (clientX: number) => {
      pendingClientXRef.current = clientX;

      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(
          renderPendingPosition
        );
      }
    },
    [renderPendingPosition]
  );

  const stopDragging = useCallback(() => {
    const handle = draggingRef.current;

    if (!handle) {
      return;
    }

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (pendingClientXRef.current !== null) {
      renderPendingPosition();
    }

    draggingRef.current = null;
    pendingClientXRef.current = null;

    onChangeRef.current(
      minValueRef.current,
      maxValueRef.current
    );
  }, [renderPendingPosition]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!draggingRef.current) {
        return;
      }

      event.preventDefault();
      scheduleVisualUpdate(event.clientX);
    },
    [scheduleVisualUpdate]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (!draggingRef.current) {
        return;
      }

      event.preventDefault();
      stopDragging();
    },
    [stopDragging]
  );

  const startDragging = useCallback(
    (handle: 'min' | 'max') => (event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();

      minValueRef.current = minVal;
      maxValueRef.current = maxVal;

      draggingRef.current = handle;

      const target = event.currentTarget;

      if (target instanceof HTMLElement) {
        target.setPointerCapture?.(event.pointerId);
      }
    },
    [minVal, maxVal]
  );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (draggingRef.current !== null) {
      return;
    }

    minValueRef.current = minVal;
    maxValueRef.current = maxVal;

    updateVisuals(minVal, maxVal);
  }, [
    minVal,
    maxVal,
    updateVisuals,
  ]);

  useEffect(() => {
    document.addEventListener(
      'pointermove',
      handlePointerMove,
      { passive: false }
    );

    document.addEventListener(
      'pointerup',
      handlePointerUp,
      { passive: false }
    );

    document.addEventListener(
      'pointercancel',
      handlePointerUp,
      { passive: false }
    );

    return () => {
      document.removeEventListener(
        'pointermove',
        handlePointerMove
      );

      document.removeEventListener(
        'pointerup',
        handlePointerUp
      );

      document.removeEventListener(
        'pointercancel',
        handlePointerUp
      );

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [
    handlePointerMove,
    handlePointerUp,
  ]);

  return (
    <div className="space-y-2">
      <div
        ref={trackRef}
        className="relative h-6 flex items-center touch-none select-none"
      >
        <div className="absolute left-0 right-0 h-2 bg-slate-800 rounded-lg" />

        <div
          ref={rangeRef}
          className="absolute h-2 bg-emerald-500/30 rounded-lg"
          style={{
            left: `${toPercent(minVal)}%`,
            width: `${toPercent(maxVal) - toPercent(minVal)}%`,
          }}
        />

        <button
          ref={minHandleRef}
          type="button"
          onPointerDown={startDragging('min')}
          className="absolute top-1/2 w-5 h-5 bg-slate-900 border-2 border-emerald-500 rounded-full shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10"
          style={{
            left: '-10px',
            transform: `translate3d(${toPercent(minVal)}%, -50%, 0)`,
            touchAction: 'none',
          }}
          title={`Set minimum ${labelMin}`}
          aria-label={`Set minimum ${labelMin}`}
        />

        <button
          ref={maxHandleRef}
          type="button"
          onPointerDown={startDragging('max')}
          className="absolute top-1/2 w-5 h-5 bg-slate-900 border-2 border-emerald-500 rounded-full shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10"
          style={{
            left: '-10px',
            transform: `translate3d(${toPercent(maxVal)}%, -50%, 0)`,
            touchAction: 'none',
          }}
          title={`Set maximum ${labelMax}`}
          aria-label={`Set maximum ${labelMax}`}
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
        <span>{minValueRef.current.toFixed(2)}</span>
        <span>{maxValueRef.current.toFixed(2)}</span>
      </div>
    </div>
  );
};
```

### Important

Remove the old slider code containing:

```tsx
const [draggingHandle, setDraggingHandle] =
  useState<'min' | 'max' | null>(null);

const [, forceUpdate] = useState(0);
```

Also remove the old `handleMouseDown`, `handleTouchStart`, and `useEffect` that installs `mousemove`, `mouseup`, `touchmove`, and `touchend` handlers.

The new implementation uses Pointer Events instead.

---

## `src/app/page.tsx`

Add this hook near the other hooks/utilities:

```tsx
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

After the `criteria` state is created, add:

```tsx
const debouncedCriteria = useDebouncedValue(criteria, 100);
```

For example:

```tsx
const [criteria, setCriteria] =
  useState<FilterCriteria>(DEFAULT_FILTER_CRITERIA);

const debouncedCriteria = useDebouncedValue(criteria, 100);
```

### Replace the evaluations calculation

Old:

```tsx
const evaluations = useMemo(() => {
  return evaluateAndFilterGames(games, criteria);
}, [games, criteria]);
```

New:

```tsx
const evaluations = useMemo(() => {
  return evaluateAndFilterGames(games, debouncedCriteria);
}, [games, debouncedCriteria]);
```

### Replace the company counts calculation

Old:

```tsx
const companyCounts = useMemo(() => {
  const all = evaluateAndFilterGames(
    games,
    { ...criteria, selectedCompany: 'ALL' }
  ).length;

  const sportybet = evaluateAndFilterGames(
    games,
    { ...criteria, selectedCompany: 'sportybet:ke' }
  ).length;

  return { all, sportybet };
}, [games, criteria]);
```

New:

```tsx
const companyCounts = useMemo(() => {
  const all = evaluateAndFilterGames(
    games,
    {
      ...debouncedCriteria,
      selectedCompany: 'ALL',
    }
  ).length;

  const sportybet = evaluateAndFilterGames(
    games,
    {
      ...debouncedCriteria,
      selectedCompany: 'sportybet:ke',
    }
  ).length;

  return {
    all,
    sportybet,
  };
}, [games, debouncedCriteria]);
```

---

## Resulting interaction model

```text
USER DRAGS HANDLE
       │
       ▼
Pointer Event
       │
       ▼
draggingRef
       │
       ▼
value refs
       │
       ▼
requestAnimationFrame
       │
       ▼
Direct DOM update
       │
       └──────► NO React render
                 NO filtering
                 NO parent update


USER RELEASES HANDLE
       │
       ▼
Final min/max values
       │
       ▼
onChange(min, max)
       │
       ▼
React criteria update
       │
       ▼
100 ms debounce
       │
       ▼
evaluateAndFilterGames()
```

## Why this is faster

The previous implementation performed two expensive operations inside the drag loop:

```tsx
onChangeRef.current(...)
forceUpdate(...)
```

The new implementation does neither during pointer movement.

The handle position and highlighted range are updated directly through the existing DOM elements, while `requestAnimationFrame()` ensures that visual work is synchronized with browser rendering.

The parent filtering system only receives the final range when dragging ends, and the subsequent filtering calculation is delayed by 100 ms.

## Files changed

```text
src/
├── components/
│   └── FilterBar.tsx    ← DualRangeSlider replaced
│
└── app/
    └── page.tsx         ← debounced filtering added
```

## Expected behavior

- Drag the **left handle** → minimum odds change.
- Drag the **right handle** → maximum odds change.
- The handles cannot cross.
- The handles can get within one slider `step` of each other.
- Dragging does not continuously update the React parent.
- Filtering occurs after the drag has finished.
- The slider remains responsive even when the filtering engine is expensive.

# LottoBet performance fix

This codebase includes the dual-range slider performance update.

- Both handles use Pointer Events and work independently.
- Drag state and values live in refs, so pointer movement does not trigger React renders.
- Visual updates are batched with `requestAnimationFrame`.
- Parent filter state is committed only when dragging ends.
- Expensive game filtering and company counts use a 100 ms debounced criteria value.
- Slider handles use percentage positioning with `translate(-50%, -50%)`, avoiding handle-position drift.
- Live numeric labels are updated directly through DOM refs during drag.

## Run

```bash
bun install
bun run dev
```

Or with npm:

```bash
npm install
npm run dev
```

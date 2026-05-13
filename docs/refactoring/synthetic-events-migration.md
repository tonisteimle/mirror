# Synthetic Events → Trusted Events Migration

**Status:** in progress (Phase 2 of the 2026-05-13 test-coverage audit).

**Goal:** the 10 browser-test files currently on the
`tests/policy/no-synthetic-mouse-events.test.ts` allowlist switch
from `dispatchEvent(new MouseEvent(...))` to CDP-driven Trusted
Events. The policy fails as soon as a file outside the allowlist
adopts the synthetic pattern, so the surface can only shrink.

## Why migrate

`isTrusted = false` events do **not**:

- Trigger native focus shifts (selection, IME focus loss).
- Carry a real `dataTransfer` on `dragstart` (`effectAllowed`,
  `setData(MIME)`, drop-feedback in DevTools).
- Reach handlers attached via `attachEvent` shims or via the user-
  agent's keymap (browser shortcuts, accessibility events).

Mirror's drop, drag, padding, margin, gap, snap subsystems rely on
at least one of these in production. A green synthetic test next to
a broken production path is the silent-regression vector this
migration closes.

## Migration recipe (per test file)

The mechanical conversion has three steps:

### 1. Replace the dispatch pattern with `api.trusted.dragHandle()`

**Before** (`gap-handlers.test.ts:667`-ish pattern):

```ts
const startX = handleRect.left + handleRect.width / 2
const startY = handleRect.top + handleRect.height / 2
const targetX = startX + deltaX
const targetY = startY + deltaY

handle.dispatchEvent(
  new MouseEvent('mousedown', { clientX: startX, clientY: startY, bubbles: true })
)
document.dispatchEvent(
  new MouseEvent('mousemove', { clientX: targetX, clientY: targetY, bubbles: true })
)
document.dispatchEvent(
  new MouseEvent('mouseup', { clientX: targetX, clientY: targetY, bubbles: true })
)
```

**After**:

```ts
import { coordsOfElement } from '../../trusted-interactions'

const from = coordsOfElement(handle)
await api.trusted.dragHandle(from, deltaX, deltaY)
```

`dragHandle()` emits `mousemove` → `mousedown` → N interpolated
mousemoves → `mouseup`. The intermediate moves are crucial — they
fire `dragover` events that the snap-service, indicator, and RAF-
throttle observe in production. The synthetic single-jump pattern
skipped them.

### 2. Replace synthetic click / hover / focus with `api.trusted.*`

```ts
// before
el.dispatchEvent(new MouseEvent('click', { bubbles: true }))

// after — works on point or node-id; node-id resolves via
// data-mirror-id selector, same as findElement().
await api.trusted.click('node-1')
```

For hover-revealed UI (resize / padding / margin handles only
appear after `mouseenter`):

```ts
// before
api.interact.hover('node-1') // synthetic; sets data-hover
// but does NOT fire mouseenter

// after
await api.trusted.hover('node-1') // real cursor move via CDP
await api.utils.waitForAnimation('node-1') // optional, for fade-in
```

### 3. Modifier keys go through `CdpModifiers` (bitmask)

```ts
import { CdpModifiers } from '../../cdp-input-client'

const SHIFT = 8 as CdpModifiers
const ALT = 1 as CdpModifiers

await api.trusted.dragHandle(from, dx, dy, { modifiers: SHIFT })
// → spacing-handle "all sides" mode
```

The synthetic API used `{ shiftKey: true, altKey: true }` on the
event init dict — CDP wants a single integer.

## Pacing

One file per session. After each migration:

1. Run the file's tests against the actual CDP runner (`npm run
test:browser -- --filter=<file-basename>`). Pass = remove from
   `ALLOWED_LEGACY` in `tests/policy/no-synthetic-mouse-events.test.ts`.
   Fail = real bug — usually the synthetic test was wrong about what
   production does. Fix the production code, then continue.
2. **Expect 1–2 real bugs per file.** Pad-handler, margin-handler,
   gap-handler are the highest-risk; the synthetic shortcut hid real
   focus / event-bubble issues.
3. If a Trusted version genuinely cannot pass (e.g. uses a custom
   listener that intentionally rejects untrusted events but is also
   broken under trusted), open a finding in `docs/findings.md` —
   don't ship a hybrid test.

## Migration order (priority by audit impact)

| File                                    | Tests | Why first                                         |
| --------------------------------------- | ----- | ------------------------------------------------- |
| `interactions/gap-handlers.test.ts`     | 31    | 0 unit-test coverage today — biggest hole         |
| `interactions/padding-handlers.test.ts` | 15    | Largest synthetic-call density                    |
| `interactions/margin-handlers.test.ts`  | 14    | Mirror's most-used spacing primitive              |
| `drag/grid-cell-insert.test.ts`         | ?     | Drag-into-grid is a common workflow               |
| `interactions/snapping.test.ts`         | ?     | Snap behavior depends on Trusted dragover         |
| `interactions/layout-shortcuts.test.ts` | ?     | Keymaps need Trusted to reach handlers            |
| `tutorial/overlays-deep.test.ts`        | 8     | Owner-territory (skip until owner ready)          |
| `property-panel/color-picker.test.ts`   | ?     | Picker has its own complications                  |
| `states/system-states.test.ts`          | ?     | Tests hover/focus state — explicit Trusted target |
| `editor/linter.test.ts`                 | ?     | Editor-internal; verify before migrating          |

## What `dragHandle` does NOT do

- **It does not infer the handle position.** Use
  `coordsOfElement(handle)` after locating the handle via DOM query
  (`[data-handle-side="top"]`, `[data-resize-handle]`, etc.).
- **It does not enter handle modes.** Padding-mode entry, margin-
  mode entry, multi-select preconditions remain test-side. Trusted
  equivalents of those entries are the next API addition; for now
  combine `api.trusted.click()` with the existing `api.interact.
enterMarginMode()` / `enterPaddingMode()`.
- **It does not assert anything.** Returns void. Tests still query
  computed styles, code-modifier output, etc. afterwards.

## Allowlist contract

`tests/policy/no-synthetic-mouse-events.test.ts` has two checks:

1. **Forbids** `new MouseEvent` in any browser-test file not in
   `ALLOWED_LEGACY`. New file → CI red → must rewrite or get owner-
   blessing to expand the list (expanding requires explicit PR).
2. **Keeps the list honest:** when a file is migrated, removing
   `new MouseEvent` from it triggers a second test failure that says
   "remove this file from `ALLOWED_LEGACY`". The list cannot get
   stale.

The allowlist is the visible migration-progress meter in CI.

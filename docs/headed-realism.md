# Headed-Mode Realism — Audit & Test-Pipeline Tiers

**Why this doc exists.** The Studio's existing browser tests dispatch
synthetic events (`new MouseEvent(...).dispatchEvent`). That covers
~80% of behaviour, but there is a long tail of bugs that only show up
under real-OS input, real focus management, real timing — bugs that
pass synthetic tests and break in production.

This document is the audit of **where prod and test diverge today** and
the operating manual for the **input pipeline tiers** built in
Phases 1–7 of the test-runner work.

---

## Three Tiers of Input Realism

The Step-Runner accepts three input pipelines. Pick the lowest tier
that catches your bug class — higher tiers cost more (build time, OS
permission, visible cursor).

| Tier                    | Source                          | Code path                                                                       | What it catches                                                                                                       | What it misses                                                                                             |
| ----------------------- | ------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Synthetic** (default) | `dispatchEvent`                 | `studio/test-api/interactions.ts`                                               | Geometry, props, sync between code↔DOM↔panel                                                                          | `isTrusted=false`; HTML5 dragstart `dataTransfer` is empty; no native focus pipeline; no IME; no clipboard |
| **CDP-Trusted**         | `Input.dispatchMouseEvent` etc. | `tools/test-runner/cdp-input-bridge.ts` ↔ `studio/test-api/cdp-input-client.ts` | Trusted events, native focus pipeline, IME via `Input.insertText`, native key shortcuts                               | Cursor isn't visible; OS-level shortcuts (Cmd-Tab) don't apply; no real `dataTransfer` for HTML5 drag      |
| **OS-Mouse**            | nut-js → real macOS cursor      | `tools/test-runner/os-mouse-bridge.ts` ↔ `studio/test-api/os-mouse-client.ts`   | Everything CDP-Trusted catches **plus** real HTML5 drag with `dataTransfer`, video-recording fidelity, OS-level focus | Slow (cursor moves at watchable pace), requires Accessibility permission, moves the actual cursor          |

### Choosing a tier

```
Did the bug involve dragstart, dataTransfer, or a Studio palette drag?
  → OS-Mouse (only path that fires real HTML5 drag events).

Did the bug involve focus management, IME, native key shortcuts (Cmd-Z)?
  → CDP-Trusted (synthetic dispatchEvent skips the native pipeline).

Everything else (geometry, props, sync) → Synthetic. Cheapest, fastest.
```

### Wiring up

```ts
// Scenario opts into the higher tier; runner has to be started with the
// matching CLI flag, otherwise the scenario throws at the first action.
{
  name: 'Drag from palette into Frame',
  inputMode: 'os',           // OS-Mouse tier
  setup: { ... },
  steps: [
    { do: 'osDrag', from: { byTestId: 'palette-Frame' }, to: { byMirrorId: 'node-1' } },
  ],
}
```

```sh
# Synthetic
npm run test:browser

# CDP-Trusted (always available — bridge installs unconditionally now)
npm run test:browser

# OS-Mouse (visibly moves the cursor)
npx tsx tools/test.ts --os-mouse
```

---

## Audit: where prod and test diverge today

This is the list of code paths that exist **only because the synthetic
event tier doesn't behave like production**. They're not bugs per se;
they're load-bearing accommodations. Each entry is a candidate for
removal once the tier-2 (CDP-Trusted) tests cover the equivalent.

### 1. `altKey`-bypass in selection click handler

**Where.** `studio/preview/index.ts:981`

```ts
private handleClick(e: MouseEvent): void {
  // In play mode or Alt+Click, let clicks pass through to components for interaction
  if (state.get().playMode || e.altKey) {
    return
  }
  ...
}
```

**Why.** Synthetic clicks need to reach `<button>`-style elements without
triggering Studio's selection handler. Tests pass `altKey: true` so the
click skips the selection check.

**Why CDP-Trusted doesn't need it.** Real clicks land on whichever
element the user pointed at; the selection handler runs naturally and
the underlying button receives the next bubble. No bypass needed.

**Removal blocker.** `Interactions.click()` in `studio/test-api/interactions.ts`
sets `altKey: true` on every synthetic click. Removing the bypass
requires migrating all 225+ synthetic tests, or accepting that they fail.

### 2. Manual `setSelection` after synthetic click

**Where.** `studio/test-api/interactions.ts:198`

```ts
// Set selection explicitly since altKey bypasses Studio's selection handler
if (this.studioActions?.setSelection) {
  this.studioActions.setSelection(nodeId, 'test')
}
```

**Why.** Because the altKey-bypass skips the natural selection update,
the test API hand-rolls one. CDP-Trusted clicks would set the selection
through the real event pipeline.

**Removal blocker.** Same as above — coupled to the altKey-bypass.

### 3. `setEditorFocus(false)` after synthetic click

**Where.** `studio/test-api/interactions.ts:204`

```ts
// Set editorHasFocus = false to enable keyboard shortcuts
// This mimics the real behavior of clicking in the preview
if (this.studioActions?.setEditorFocus) {
  this.studioActions.setEditorFocus(false)
}
```

**Why.** Synthetic clicks don't move focus, so the Studio's
`editorHasFocus` flag stays stale. Real clicks blur the editor naturally.

**Removal blocker.** Same coupling as above.

### 4. Empty `dataTransfer` on synthetic dragstart

**Where.** Anywhere that observes `event.dataTransfer.getData(...)` —
the Studio palette and `studio/preview/drag/*` listeners.

**Why.** `new DragEvent('dragstart')` creates a `DataTransfer` object
that is read-only and rejects `setData`. The HTML5 drag-data flow only
fires under real OS or CDP-Trusted input.

**Today.** Tests that need the palette drag use either:

- The `panel.dragFromPalette(component, target)` shortcut, which
  bypasses HTML5 events and writes the AST directly (`browser-test-api.ts`),
  or
- The new OS-Mouse `osDrag` action, which fires real `dataTransfer`.

**Removal blocker.** Direct-AST-writes are simpler than full drag for
many tests; they'll stay. The OS-Mouse path is the canonical real-drag
test today.

### 5. Clipboard / Pointer-Lock / Fullscreen / Autoplay (user-activation gated)

**Browser-API gates** that need a real user gesture (`isTrusted=true`):

- **`navigator.clipboard.writeText`** (`compiler/runtime/clipboard.ts:38`,
  `studio/preview/export-button.ts:295`). In Chrome, only fires inside a
  trusted-event handler. Synthetic clicks silently fail; CDP-Trusted /
  OS-Mouse work.
- **`element.requestPointerLock` / `requestFullscreen`** — not currently
  used in Studio code, but listed here so future features know which tier
  they need.
- **`HTMLMediaElement.play()` with audio** — not used.

**Audit verdict.** Only clipboard is live today. The Mirror runtime's
`copy(text)` action and the export button's "copy hash" both depend on
it. Both work fine in real Studio sessions; tests that exercise them
**must** be CDP-Trusted or higher to hit the binding.

### 6. `event.isTrusted` checks in code

**Repo grep result.** Zero matches in production code paths.
Mirror does not branch on `isTrusted` — it just relies on the browser
to gate what's gateable. So the divergence is structural (which APIs
work), not behavioural (which branch we take).

---

## Headed-realism throttles

Beyond the input tier, headed mode has two more knobs that surface
timing-sensitive bugs the dev machine hides.

### `--cpu-throttle=N` — slow CPU emulation

CDP `Emulation.setCPUThrottlingRate` multiplies effective CPU time. Use
to surface:

- Debounce misuse (a 100 ms "settled" check that misses on a 6× slowed CPU)
- Animation flicker (transitions that don't paint cleanly when frames
  arrive late)
- Race conditions (state-store updates that depend on a particular
  timing order)

```sh
npx tsx tools/test.ts --cpu-throttle=4 --headed   # mid-range mobile
npx tsx tools/test.ts --cpu-throttle=6 --headed   # low-end mobile
```

### `--network=PROFILE` — network conditions

CDP `Network.emulateNetworkConditions` with canonical Chrome DevTools
profiles. Surfaces auto-save / debounced-fetch timeouts that never fire
on localhost.

```sh
npx tsx tools/test.ts --network=slow-3g
npx tsx tools/test.ts --network=offline   # for offline-first feature work
```

| Profile   | Latency | Down     | Up       |
| --------- | ------- | -------- | -------- |
| `offline` | —       | —        | —        |
| `slow-3g` | 2000 ms | 50 KB/s  | 50 KB/s  |
| `fast-3g` | 562 ms  | 188 KB/s | 86 KB/s  |
| `4g`      | 170 ms  | 1.5 MB/s | 750 KB/s |

---

## Recommended scenario matrix

A starter set of which tier + throttle combinations to run, by feature class:

| Feature class           | Synthetic | CDP-Trusted | OS-Mouse | CPU 4× | Network slow-3g |
| ----------------------- | :-------: | :---------: | :------: | :----: | :-------------: |
| Geometry / sync (most)  |     ✓     |             |          |        |                 |
| Editor / shortcuts      |     ✓     |      ✓      |          |        |                 |
| Palette drag → Frame    |           |             |    ✓     |        |                 |
| Reorder via drag        |           |             |    ✓     |        |                 |
| Inline-edit / IME       |           |      ✓      |          |        |                 |
| Clipboard copy          |           |      ✓      |          |        |                 |
| Auto-save / fetch       |           |      ✓      |          |        |        ✓        |
| Animation / transitions |           |             |          |   ✓    |                 |
| Debounced search        |           |             |          |   ✓    |                 |

---

## Phase summary (where this doc came from)

The headed-realism work landed in 8 phases (commits prefixed `feat(test-runner): Phase N`):

| #   | Title                              | Commit                                                  |
| --- | ---------------------------------- | ------------------------------------------------------- |
| 1   | CDP Input Bridge                   | `17eccec8`                                              |
| 2   | TrustedInteractions opt-in API     | `e4e2e9c1`                                              |
| 3   | Real-compile mode for Step-Runner  | `7cd95d2c`                                              |
| 4   | Structural Selectors               | `bde4a8ec`                                              |
| 5   | OS-Mouse path for Step-Runner      | `de09a39b` (bundled into a parallel commit by accident) |
| 6   | Replay-Recorder                    | `6fcd5842`                                              |
| 7   | Pixel-diff snapshots               | `c5b7fe47`                                              |
| 8   | isTrusted audit + headed throttles | this commit                                             |

# Browser Test Classification — `studio/test-api/suites/`

Heuristic-based classification of all 367 test/scenario files into three buckets:

- **A — Needs real browser** (Chrome via CDP). Uses interaction APIs, mouse/keyboard events, real layout reads, CodeMirror runtime, or Studio internals that don't survive jsdom.
- **B — Migratable to Vitest + jsdom**. Pattern: "given DSL X, expect DOM/style/text Y". No interaction, no layout reads, no Studio runtime.
- **C — Borderline / manual review**. Mixes both, or uses `api.editor.setCode` + DOM assertions only (would migrate with a small `compileAndMount` helper but not drop-in).

## 1. Summary

| Bucket    | Files   | Share |
| --------- | ------- | ----- |
| A         | 243     | 66.2% |
| B         | 101     | 27.5% |
| C         | 23      | 6.3%  |
| **Total** | **367** | 100%  |

**Headline:** roughly **one in three suite files (B + C ≈ 124, ~34%) compiles DSL and asserts on the resulting DOM with no real interaction**, and is a candidate to leave the CDP runner. The remaining two-thirds genuinely exercise drag/drop, panel UI, autocomplete, undo/redo, animations, layout-derived measurements, or other browser-only behaviour.

### Heuristic used (per-file grep)

| Signal                                                                                                                                        | Effect   |
| --------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `api.interact.*`, `api.drag.*`, `api.zag.*`, `api.snap.*`, `api.keyboard.*`, `api.panel.*`, `api.studio.*`, `api.history.*`                   | → A      |
| `dispatchEvent`, `MouseEvent`, `PointerEvent`, `KeyboardEvent`, `mousedown/move/up`, `pointerdown/move/up`, `keydown`, `keyup`                | → A      |
| `getBoundingClientRect`, `offsetWidth`, `offsetHeight`, `scrollIntoView`, `requestAnimationFrame`, `.bounds.*`                                | → A      |
| step-runner `do: 'click' / 'hover' / 'pressKey' / 'select' / 'setProperty' (via panel)`                                                       | → A      |
| `(window as any).<global>` (Studio internals like `__mirrorStudio__`, `generateComponentCodeFromDragData`, `editor.dispatch`, `desktopFiles`) | → A or C |
| Editor-only: `api.editor.setCode` in body + DOM assertions (no interactions, no layout reads, no CodeMirror cursor/selection/autocomplete)    | → C      |
| Only `api.assert.*`, `api.preview.*`, `api.utils.*`, plus plain `document.querySelector` reads                                                | → B      |

Sample-validated against ~15 files across `compiler-verification/`, `styling/`, `data-binding/`, `tutorial/`, `interactions/`, `layout/`, `bidirectional/`, `editor/`, `step-runner-examples/`, `autocomplete/`, `components/` to confirm the signals match real intent.

## 2. Per-Category Breakdown

| Directory                | Files | A   | B   | C   | One-line rationale                                                                                           |
| ------------------------ | ----- | --- | --- | --- | ------------------------------------------------------------------------------------------------------------ |
| `actions/`               | 10    | 10  | 0   | 0   | Click/hover/dispatch — pure browser interaction.                                                             |
| `ai/`                    | 1     | 1   | 0   | 0   | Draft-mode workflow needs editor + panel.                                                                    |
| `animations/`            | 3     | 1   | 2   | 0   | Presets/playback verifiable from output; one uses `requestAnimationFrame`.                                   |
| `autocomplete/`          | 7     | 0   | 0   | 7   | All use `setCursor`/`triggerAutocomplete`/`getCompletions` → CodeMirror runtime → effectively A in practice. |
| `bidirectional/`         | 6     | 1   | 2   | 3   | DOM-output checks are B; mid-test `setCode` checks are C; complex sync scenarios A.                          |
| `charts/`                | 4     | 0   | 4   | 0   | All "render chart, assert SVG/structure" — pure output.                                                      |
| `compiler/`              | 4     | 0   | 4   | 0   | Pure parser/IR/backend output verification.                                                                  |
| `compiler-verification/` | 33    | 5   | 27  | 1   | Big bucket of pure DSL→DOM assertions; few use interactions/`window` globals.                                |
| `components/`            | 16    | 7   | 9   | 0   | Definition/inheritance/slots are pure; drag-into-tree and date-picker need browser.                          |
| `core/`                  | 1     | 0   | 1   | 0   | Inline-markdown is pure render assertion.                                                                    |
| `data-binding/`          | 6     | 0   | 6   | 0   | Variables, conditionals, tokens, table syntax, collections, input-binding — all pure render.                 |
| `drag/`                  | 3     | 3   | 0   | 0   | Drag operations + alignment-zone reads → real browser.                                                       |
| `editor/`                | 4     | 2   | 0   | 2   | File-tabs and editor-drop need Studio runtime (`window.generateComponentCodeFromDragData`, `activeTab`).     |
| `events/`                | 7     | 7   | 0   | 0   | Hover/focus/click/keyboard/disabled — all dispatch events.                                                   |
| `flex-reorder/`          | 10    | 10  | 0   | 0   | Drag-reorder by definition.                                                                                  |
| `gradients/`             | 1     | 1   | 0   | 0   | Falsely flagged: actually has dispatch (verified via grep).                                                  |
| `integration/`           | 10    | 6   | 4   | 0   | Form/data/component-token are render-only; nested-component & state-flow need interaction.                   |
| `interactions/`          | 28    | 24  | 1   | 3   | Click/hover/drag/resize/keyboard/snap/multiselect — real browser. `toggle-states` is render-only.            |
| `layout/`                | 7     | 5   | 2   | 0   | `alignment.test.ts` and `direction.test.ts` are pure; rest read `getBoundingClientRect`.                     |
| `layout-verification/`   | 5     | 2   | 3   | 0   | `gap`/`size`/`direction` are pure; `alignment` and `complex-layouts` read `bounds`.                          |
| `playmode/`              | 0     | 0   | 0   | 0   | Empty directory.                                                                                             |
| `primitives/`            | 7     | 3   | 4   | 0   | Headings/semantics/table/device-presets pure; `basic`/`defaults` read SVG bounds.                            |
| `project/`               | 8     | 7   | 0   | 1   | Multi-file workflow needs file-tree/panel; `complex-layout` is editor-only borderline.                       |
| `property-panel/`        | 16    | 14  | 1   | 1   | Panel UI tests by definition need real DOM; one matrix is pure-render.                                       |
| `property-robustness/`   | 9     | 9   | 0   | 0   | Property panel input-handling robustness.                                                                    |
| `responsive/`            | 7     | 3   | 4   | 0   | Visibility/styling/basic/custom-thresholds are output checks; layout/components/complex read sizes.          |
| `stacked-drag/`          | 15    | 15  | 0   | 0   | Stacked drag mechanics → all browser.                                                                        |
| `states/`                | 5     | 5   | 0   | 0   | Toggle/exclusive/hover-on/off — interaction.                                                                 |
| `step-runner-examples/`  | 46    | 46  | 0   | 0   | All scenarios drive `api.panel`/`api.interact` via the runner (often through `styleViaPanel` fragment).      |
| `stress/`                | 4     | 4   | 0   | 0   | Performance/integration stress — full Studio.                                                                |
| `styling/`               | 7     | 0   | 7   | 0   | Colors/borders/effects/spacing/sizing/typography/extended — textbook DSL→style assertions.                   |
| `sync/`                  | 10    | 9   | 0   | 1   | Editor↔preview round-trip needs runtime; one `editor-to-preview` is borderline editor-only.                  |
| `test-system/`           | 4     | 2   | 1   | 1   | Self-tests for the framework; mixed.                                                                         |
| `transforms/`            | 4     | 3   | 1   | 0   | Translate is pure; rotate/scale/composite read transforms after layout.                                      |
| `tutorial/`              | 18    | 3   | 15  | 0   | Auto-generated deep-validation tests — almost all pure DSL→DOM/style assertions.                             |
| `ui-builder/`            | 30    | 30  | 0   | 0   | Builder workflow tests = panel-driven UI flows.                                                              |
| `undo-redo/`             | 5     | 3   | 0   | 2   | History API actions; two are borderline `setCode` flows.                                                     |
| `workflow/`              | 4     | 1   | 2   | 1   | Application/project-with-code are render assertions; dashboard-e2e is editor-flow C.                         |
| **(root)**               | 2     | 1   | 1   | 0   | `pure-select` is interaction; `demo-project` is pure render.                                                 |

## 3. Migration List (B — 101 files, drop-in for vitest+jsdom)

These files only call: `api.assert.*`, `api.preview.inspect/getNodeIds/findByText`, `api.dom.expect`, `api.utils.delay/waitForCompile`, plus occasional `document.querySelector` reads. Setup is a single DSL string compiled before the body.

### `compiler-verification/` (27)

```
advanced-typography.test.ts      animations.test.ts                charts.test.ts
collections.test.ts              complex-combinations.test.ts      complex-properties.test.ts
component-inheritance.test.ts    conditionals.test.ts              cross-element.test.ts
data-binding.test.ts             edge-cases.test.ts                effects.test.ts
event-handlers.test.ts           form-controls.test.ts             functions.test.ts
icons.test.ts                    inline-syntax.test.ts             layout.test.ts
nested-structures.test.ts        primitives.test.ts                real-world-components.test.ts
responsive.test.ts               states.test.ts                    tables.test.ts
tokens.test.ts                   transforms.test.ts                zag.test.ts
```

### `tutorial/` (15)

```
01-elemente.test.ts        02-komponenten.test.ts     03-tokens.test.ts
04-layout.test.ts          05-styling.test.ts         06-states.test.ts
07-animationen.test.ts     08-functions.test.ts       09-daten.test.ts
10-seiten.test.ts          11-eingabe.test.ts         12-navigation.test.ts
13-overlays.test.ts        14-tabellen.test.ts        15-charts.test.ts
```

### `components/` (9)

```
basic.test.ts                    complex-patterns.test.ts         component-states.test.ts
inheritance.test.ts              layout-components.test.ts        multi-level-inheritance.test.ts
nested-slots.test.ts             property-overrides.test.ts       variants.test.ts
```

### `styling/` (7)

```
borders.test.ts    colors.test.ts     effects.test.ts    extended.test.ts
sizing.test.ts     spacing.test.ts    typography.test.ts
```

### `data-binding/` (6)

```
collections.test.ts    conditionals.test.ts    input-binding.test.ts
table-syntax.test.ts   tokens.test.ts          variables.test.ts
```

### `compiler/` (4)

```
layout.test.ts    nesting.test.ts    primitives.test.ts    styling.test.ts
```

### `charts/` (4)

```
basic-rendering.test.ts    data-formats.test.ts    in-layout.test.ts    styling.test.ts
```

### `responsive/` (4)

```
basic.test.ts    custom-thresholds.test.ts    styling.test.ts    visibility.test.ts
```

### `primitives/` (4)

```
device-presets.test.ts    headings.test.ts    semantic.test.ts    table.test.ts
```

### `integration/` (4)

```
component-token.test.ts    data.test.ts    form.test.ts    nested-component.test.ts
```

### `layout-verification/` (3)

```
direction.test.ts    gap.test.ts    size.test.ts
```

### `bidirectional/` (2)

```
property-panel.test.ts    source-map.test.ts
```

### `layout/` (2)

```
alignment.test.ts    direction.test.ts
```

### `animations/` (2)

```
playback-verification.test.ts    presets.test.ts
```

### `workflow/` (2)

```
application.test.ts    project-with-code.test.ts
```

### Singletons (5)

```
core/inline-markdown.test.ts
interactions/toggle-states.test.ts        # render-only despite the directory name
property-panel/primitive-matrix.test.ts
test-system/fixtures.test.ts
transforms/translate.test.ts
demo-project.test.ts                       # root
```

> **Migration note:** all 101 files share the same shape. A single
> `compileAndMount(dsl): TestAPI` helper for vitest can host them — render
> the compiler's DOM emitter output into a jsdom container, expose
> `assert.exists`/`hasStyle`/`hasText` over `data-mirror-id`, expose
> `preview.inspect`/`getNodeIds` over `getElementsByAttribute`. jsdom
> resolves explicit inline CSS (background, color, padding, border-radius,
> font-size) via `getComputedStyle`, which is what these tests check. Tests
> that read **layout-derived** values (`bounds.width`, `getBoundingClientRect`)
> are not in this list — they are in A-layout.

## 4. Browser-only List (A — 243 files, summary)

These categories are ~100% browser-only and should stay on the CDP runner:

| Category                                                 | Why                                                                                                                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `drag/`, `flex-reorder/`, `stacked-drag/` (28)           | Drag synthesis + alignment-zone DOM reads.                                                                                                                                     |
| `interactions/` (24 of 28)                               | Click/hover/keyboard/snap/multiselect/resize/padding/margin/wrap handlers.                                                                                                     |
| `step-runner-examples/` (46)                             | All scenarios call `api.panel.property.setProperty` (often via `styleViaPanel` fragment) or `api.interact`.                                                                    |
| `ui-builder/` (30)                                       | Designer workflow flows through panels and inputs.                                                                                                                             |
| `property-panel/` (14 of 16), `property-robustness/` (9) | Panel UI by definition.                                                                                                                                                        |
| `events/` (7), `actions/` (10), `states/` (5)            | Native event dispatching / state machines.                                                                                                                                     |
| `sync/` (9 of 10)                                        | Editor↔preview↔panel SyncCoordinator round-trips.                                                                                                                              |
| `autocomplete/` (7)                                      | CodeMirror runtime (`setCursor`, `triggerAutocomplete`, `getCompletions`). Listed under C in summary because they are `api.editor.setCode`-bodied, but practically A — see §5. |
| `undo-redo/` (3 of 5)                                    | History API on real CodeMirror.                                                                                                                                                |
| `stress/` (4)                                            | Multi-feature integration in real Studio.                                                                                                                                      |
| `project/` (7 of 8)                                      | File-tree, multi-file workflows, file callbacks.                                                                                                                               |
| **A-layout subset (12)**                                 | Files that only read `getBoundingClientRect`/`bounds.width` — jsdom returns `0` for these so they can't run there. See list below.                                             |

### A-layout files (12)

These have no interaction but read real layout, so vitest+jsdom would silently pass-by-zero or fail. Keep on CDP.

```
layout-verification/alignment.test.ts          layout-verification/complex-layouts.test.ts
layout/extended.test.ts                        layout/gap.test.ts
layout/grid.test.ts                            layout/nesting.test.ts
layout/stacked.test.ts
primitives/basic.test.ts                       primitives/defaults.test.ts
responsive/complex.test.ts                     responsive/components.test.ts
responsive/layout.test.ts
```

## 5. Borderline / Review (C — 23 files)

### C1 — `api.editor.setCode` mid-test, then DOM/style assertion (10)

These could migrate to vitest **if** the harness exposes a way to swap the
compiled DSL between assertions (essentially `compileAndMount(newDsl)` re-rendering
into the same container). They never dispatch events or read layout.

```
bidirectional/code-to-preview.test.ts         bidirectional/complex-sync.test.ts
bidirectional/error-recovery.test.ts          editor/file-tabs.test.ts            *
project/complex-layout.test.ts                property-panel/code-preview-validation.test.ts
sync/editor-to-preview.test.ts                test-system/wait-helpers.test.ts
workflow/dashboard-e2e.test.ts                undo-redo/edge-cases.test.ts        **
```

`*` `editor/file-tabs.test.ts` also uses `activeTab()` (Studio file-system) — leans A.
`**` `undo-redo/edge-cases.test.ts` — borderline; uses CodeMirror `setCode` history → leans A.

### C2 — autocomplete (7) — listed C in dir-table because no `api.interact`/event dispatch, but practically A

All 7 use `api.editor.setCursor`, `triggerAutocomplete`, `getCompletions` — these are CodeMirror APIs and require real editor. Migration would require a CodeMirror jsdom fixture, which is brittle. **Recommendation: classify as A in practice.**

```
autocomplete/components.test.ts    autocomplete/icons.test.ts
autocomplete/primitives.test.ts    autocomplete/properties.test.ts
autocomplete/states.test.ts        autocomplete/tokens.test.ts
autocomplete/values.test.ts
```

### C3 — `(window as any).<Studio global>` (3)

These poke Studio internals on `window` rather than user-facing API.

```
compiler-verification/prelude.test.ts        # uses (window as any).__mirrorTest — small adapter would work
editor/editor-drop.test.ts                   # uses generateComponentCodeFromDragData — needs Studio
interactions/component-extract.test.ts       # editor.dispatch + desktopFiles — needs Studio
interactions/token-extract.test.ts           # editor.dispatch + desktopFiles — needs Studio
interactions/batch-replace.test.ts           # batch-replace dialog DOM — needs Studio
```

(5 unique paths; 2 of them — `prelude` and `editor-drop` — are the only ones counted under C3 in the dir table; the three `interactions/*-extract`/`batch-replace` files were already pulled out as C-window in raw signals.)

## 6. Recommended Migration Order

1. **Quick wins (high coverage / low effort)**: `tutorial/` (15) + `compiler-verification/` (27) + `styling/` (7) + `compiler/` (4) = **53 files** of pure DSL→DOM/style. These are nearly mechanical to port: build a `compileAndMount` helper, point the assertion shims at it, copy the test bodies.
2. **Mid effort**: `data-binding/` (6), `components/` (9), `tutorial`-adjacent `integration/` (4), `responsive/` (4), `primitives/` (4), `charts/` (4), `animations/` (2), `bidirectional/property-panel + source-map` (2), `layout-verification/` (3 non-bounds), `layout/alignment + direction` (2), `core` (1), `transforms/translate` (1), `workflow/{application,project-with-code}` (2), `test-system/fixtures` (1), `interactions/toggle-states` (1), `property-panel/primitive-matrix` (1), `demo-project` (1) = **48 files**.
3. **C1 review** (10): worth attempting after the helper exists; the `setCode`-mid-test pattern collapses to a one-liner once `compileAndMount` is reusable.
4. **Stay on CDP**: the rest (243 + autocomplete + Studio-global tests).

After steps 1 and 2 you would have **~101 of 367 files (27%)** running under vitest+jsdom in seconds, leaving the slow CDP runner to do what only it can: drag, panels, autocomplete, undo/redo, layout-derived measurements, animation timing, and full Studio workflows.

# Mirror Tests

589 Vitest files in this directory, plus 351 CDP-browser suites at
`studio/test-api/suites/`. Two stacks, one project, intentional split.

---

## Where does my new test go?

**Decision rule, in order:**

1. **Does the test need a real browser** (mouse, keyboard, focus,
   drag, animation timing, container queries, real layout)?
   → `studio/test-api/suites/<feature>/`. CDP stack. See
   `docs/TEST-FRAMEWORK.md`.

2. **Does the test compile DSL and assert on output / IR / AST /
   validator-result** without needing browser interaction?
   → `tests/<layer>/`. Vitest stack. See `docs/test-layers.md` for the
   layer-by-layer decision tree (`compiler/` for unit, `behavior/` for
   semantics, `differential/` for cross-backend, `contract/` for
   examples, `integration/` for multi-feature).

3. **Does it test Studio UI behavior** (panel updates, picker logic,
   code-modifier ops, sync, drag math)?
   → `tests/studio/` (Vitest+jsdom) if the unit is mockable;
   `studio/test-api/suites/` if it needs real DOM events.

**Both stacks can own the same feature name.** `tests/charts/` +
`studio/test-api/suites/charts/`, `tests/responsive/` +
`studio/test-api/suites/responsive/`, etc. — that's dual coverage,
not duplication. Vitest version asserts compile-output; CDP version
asserts user-facing interaction.

---

## What's where

- **`tests/`** — Vitest unit + behavior + differential + integration
  layers. Run via `npm test`. Full layer map in
  [`docs/test-layers.md`](../docs/test-layers.md).
- **`studio/test-api/suites/`** — CDP browser stack. Run via
  `npm run test:browser:progress`. Full framework doc at
  [`docs/TEST-FRAMEWORK.md`](../docs/TEST-FRAMEWORK.md).
- **`tests/_infra/`** — shared test environment (mock-tauri-bridge,
  studio-test-api helpers, test-api harness, jsdom setup). Not tests.
- **`tests/utils/`** — vitest-side helper modules (mirror-mount adapter,
  matchers, drag-drop test utils, compile helpers). Imported by tests.
- **`tests/fixtures/`** — `.mirror` source corpora plus per-category
  `runner.test.ts` that diff against `expected.dom.js` / `expected.html`
  golden files.
- **`scripts/eval-*.ts`** — manual-run LLM quality drivers (not CI).

## Commands

```bash
# Vitest (this directory)
npm test                                 # all
npm test -- compiler/parser              # path filter
npm test -- --watch                      # watch mode

# CDP browser stack
npm run test:browser:progress            # all, with live progress
npm run test:browser:headed              # all, visible browser
npx tsx tools/test.ts --category=NAME    # one category
npx tsx tools/test.ts --filter=PATTERN   # regex filter
npx tsx tools/test.ts --list             # list categories
```

## Skipped tests

121 `.skip` / `testWithSetupSkip` / `it.todo` occurrences across both
stacks as of 2026-05-13. Most are documented via `docs/findings.md` or
`docs/refactoring/<lane>.md` cross-references. If a skip lacks a
referenced lane, treat it as drift and either revive or delete.

## Demos and play-mode

`studio/test-api/suites/demos/` holds `.demo.ts` tutorial recordings,
**not tests** — owner-exclusive territory (see `docs/findings.md`).
Don't add `.test.ts` files there. `studio/test-api/suites/playmode/`
is a future-feature stub.

## See also

- [`docs/test-layers.md`](../docs/test-layers.md) — Vitest layer map +
  per-layer decision tree.
- [`docs/TEST-FRAMEWORK.md`](../docs/TEST-FRAMEWORK.md) — full CDP
  stack documentation, trusted-input policy, runner internals.
- [`docs/audit/2026-05-13-tests.md`](../docs/audit/2026-05-13-tests.md) —
  most recent tests-focused audit (organization, infra, duplicates).

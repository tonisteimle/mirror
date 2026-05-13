# Personas — Design und Management (Fixture)

**Goal:** A Mirror project that compiles to the target HTML at
`expected.html` (989 LOC, originally
`/Users/toni.steimle@fhnw.ch/Documents/Fhnw/personas/personas-design-management.html`).

Pinned as a multi-file fixture so the build is byte-diffed every CI run.
This is the **strictest** form of test we have — a mismatch fails the
fixture-runner.

## Status: skeleton — fixture is `.todo`-skipped in the runner

- `expected.html` — committed, the target the Mirror project must produce.
- `tokens/tokens.mirror` — minimal placeholder, extracts the 4 CSS vars.
- `components/components.mirror` — empty placeholder, lists the components
  needed.
- `layouts/app.mirror` — skeleton with a canvas + outline-comment of the
  9 sections.
- `.todo` — sentinel file that tells the multi-file runner to skip this
  fixture. Lets the target HTML stay pinned without failing CI.
  Remove `.todo` when the Mirror project is built up far enough to start
  comparing against `expected.html`.
- `expected.dom.js` — not yet present. Will be auto-created by the runner
  on first run after `.todo` is removed.

## How to iterate

1. **Build up the Mirror sources** in `tokens/`, `components/`, `layouts/`.
   Use `examples/personas-informatik/` as the template (same yellow/black
   color palette, same persona-article structure).

2. **Remove the `.todo` sentinel** when ready to start byte-diffing, then
   run the fixture-runner to see the diff:

   ```bash
   rm tests/fixtures/multi-file/personas-design-management/.todo
   npx vitest run tests/fixtures/multi-file/personas-design-management
   ```

   The first run will fail with a large diff against `expected.html`.

3. **Accept current output as the new baseline** when the Mirror is
   close enough (keeps the rendered structure, even if cosmetic
   normalization differs):

   ```bash
   UPDATE_GOLDEN=1 npx vitest run tests/fixtures/multi-file/personas-design-management
   ```

   This rewrites `expected.html` to match the current Mirror output.
   **WARNING:** running UPDATE_GOLDEN means you're now testing your
   Mirror against itself, not against the original target. Use this only
   when the Mirror+normalizer faithfully reproduces the target's
   user-visible content.

4. **Optional: also ship as `examples/personas-design-management/`** for
   showcase / mirror-build CLI. Today the fixture is the sole home.

## Where the test lives in the hierarchy

Per `tests/README.md` decision rule:

- It's a **compile-output assertion** (no browser interaction needed) →
  Vitest stack, not CDP.
- It uses **multi-file load order** (tokens → components → layouts) →
  `tests/fixtures/multi-file/` (uses `compileProject`).
- The HTML target is a **byte-level golden file** → fixture-runner
  pattern, not contract-test.

The runner is already wired (`tests/fixtures/multi-file/runner.test.ts`)
— no new test code needed. Just populate the Mirror sources.

## Optional: contract test sibling

When the Mirror project is stable, also consider adding
`tests/contract/personas-design-management.contract.test.ts` for
behavioral assertions that survive cosmetic HTML changes (e.g. "4
persona articles render", "footer contains Eintrittsstatistik
reference"). Contract tests complement the fixture's byte-diff with
intent-level checks. Pattern: see `tests/contract/address-manager.contract.test.ts`.

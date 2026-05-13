# Mirror Test Layers

Mirror has two parallel test stacks:

- **Vitest** (this document) — 589 test files in `tests/`, run via `npm test`.
  In-process, jsdom-based.
- **Browser/CDP** — 351 suites in `studio/test-api/suites/`, run via
  `npm run test:browser:progress`. Out-of-process, real Chrome via DevTools
  Protocol. Documented in `docs/TEST-FRAMEWORK.md`.

Both stacks are kept green. This document covers the Vitest stack;
the cross-stack decision rule lives in `tests/README.md`.

---

## Layer Map

| Directory             | Files | Purpose                                                | What it catches                        | What it misses                                          |
| --------------------- | ----: | ------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------- |
| `tests/compiler/`     |   198 | Compiler unit tests (parser, IR, backends, validator)  | Most parser+IR+backend regressions     | Multi-feature interactions; runtime template            |
| `tests/behavior/`     |    17 | Observable feature semantics in jsdom (Schicht 2)      | Does the feature do what users expect? | Cross-backend divergence; per-app integration           |
| `tests/differential/` |    16 | Cross-backend equivalence (DOM ≡ React ≡ Framework)    | Backend divergence on a static corpus  | Bugs that only show in dynamic interaction              |
| `tests/contract/`     |    16 | Per-app contract tests for `examples/*`                | Regressions in real-world example apps | Bugs in code paths no example exercises                 |
| `tests/integration/`  |    25 | Multi-feature interactions                             | Inter-module coupling bugs             | Single-feature semantics (covered by `behavior/`)       |
| `tests/runtime/`      |     5 | Runtime-module unit tests (`compiler/runtime/*.ts`)    | Runtime helper bugs                    | Inlined runtime template (exercised indirectly)         |
| `tests/studio/`       |   206 | Studio component tests (panels, pickers, modifiers, …) | Studio-side regressions                | Compiler regressions; cross-stack flows                 |
| `tests/agent/`        |     3 | LLM-edit-flow pipeline + sketch parsing                | Agent pipeline bugs                    | Real LLM-output quality (see `scripts/eval-*.ts`)       |
| `tests/cli/`          |    13 | `mirror-compile` / `mirror-build` / `mirror-validate`  | CLI argument + IO bugs                 | End-to-end compile correctness (covered by `compiler/`) |
| `tests/fixtures/`     |  data | Per-category `.mirror` fixture corpora                 | —                                      | —                                                       |
| `tests/_infra/`       | infra | Test environment, mock-bridges, test-api helpers       | —                                      | —                                                       |
| `tests/utils/`        | infra | Mount adapter, drag-drop helpers, custom matchers      | —                                      | —                                                       |

Feature-named subdirectories — `tests/charts/`, `tests/components/`,
`tests/data-binding/`, `tests/primitives/`, `tests/responsive/`,
`tests/styling/`, `tests/compiler-verification/` — mirror the
corresponding `studio/test-api/suites/<feature>/` directories. The
division of labor is intentional: Vitest tests compile-output of the
feature, CDP tests its browser-workflow. Both stacks owning the same
feature name is dual coverage, not duplication.

---

## When does each layer fire?

Reading order, narrowest → broadest:

1. **`compiler/`** — your default unit-test home. New parser feature?
   Add a `compiler/parser-foo.test.ts`. New IR transformer?
   `compiler/ir-foo.test.ts`. New DOM emitter?
   `compiler/backend-dom-foo.test.ts`.
2. **`runtime/`** — covers TS modules under `compiler/runtime/`. Does
   NOT cover `compiler/backends/dom/runtime-template/index.ts` —
   that's the inlined-as-string runtime for compiled output, exercised
   indirectly via `differential/` and `behavior/` tests that compile +
   run.
3. **`behavior/`** — when a parser/IR/backend change passes unit tests
   but subtly broke the observed feature behavior (e.g. a Bind that no
   longer re-renders, an Each that double-renders), this layer catches
   it. Each file targets one feature.
4. **`differential/`** — guards against silent divergence between the
   three backends (DOM, React, Framework). If you add a feature, add a
   corpus entry here so all three backends stay in lockstep.
5. **`contract/`** — guards against regressions in the demo apps. The
   fail mode is "address-manager broke" rather than "DSL feature X
   broke". Tests compile the real `examples/*.mirror` files and assert
   app-level contracts.
6. **`integration/`** — for bugs that only emerge from feature
   combinations (positioning + dismiss, state-machine + events). Use
   this layer when you can't isolate the bug to one feature.
7. **`studio/`** — its own world: panels, pickers, code-modifier ops,
   drag-drop, sync. Doesn't typically catch compiler regressions —
   that's `compiler/`'s job — but it catches Studio-side bugs cleanly.

---

## What this stack does NOT cover

- **`compiler/backends/dom/runtime-template/index.ts`** (~2100 LOC, JS
  string). The inlined runtime template has no static type checking
  and is not directly imported by tests. It's exercised indirectly:
  `differential/`, `behavior/`, and `contract/` tests all compile real
  Mirror code and execute the inlined runtime — so a string-runtime
  bug shows up there as a test failure, but the failure isn't easy to
  attribute. Drift between the typed `compiler/runtime/*.ts` modules
  and the string template is the main risk.
- **Build pipeline / packaging** — bundler config, `dist/` output,
  NPM packaging are not tested. Manual verification before release.
- **Browser Studio interactions** — covered by the CDP test stack
  (`docs/TEST-FRAMEWORK.md`), not Vitest.

---

## Adding new tests — quick decision tree

```
What kind of bug am I trying to prevent?

├─ A specific parser/IR/backend rule           → tests/compiler/<concern>.test.ts
├─ A user-facing feature does the wrong thing  → tests/behavior/<feature>.test.ts
├─ DOM and React backends drift apart          → tests/differential/<feature>.test.ts
├─ One of the example apps regresses           → tests/contract/<app>.contract.test.ts
├─ Two features interact incorrectly           → tests/integration/<scenario>.test.ts
├─ Studio panel/picker/code-modifier breaks    → tests/studio/<feature>.test.ts
└─ Browser interaction (drag, click, type)     → studio/test-api/suites/<feature>/
```

When in doubt, prefer `behavior/` — it tests the user-visible end-to-end
and survives codegen refactors better than backend-specific unit tests.

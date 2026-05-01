# Mirror Test Layers

Mirror has two parallel test stacks:

- **Vitest** (this document) — ~7000 tests in `tests/`, run via `npm test`
- **Browser/CDP** — ~225 Studio tests in `studio/test-api/suites/`, run via
  `npm run test:browser:progress`. Documented in `docs/TEST-FRAMEWORK.md`.

Both stacks are kept green; this document covers only the Vitest stack.

---

## Layer Map

| Directory                       | Files   | Purpose                                                                       | What it catches                                     | What it misses                                                      |
| ------------------------------- | ------- | ----------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| `tests/parser/`                 | 1       | Parser-internal unit tests                                                    | Lexer/parser micro-bugs                             | Higher-level semantic regressions                                   |
| `tests/ir/`                     | 2       | IR-transformation unit tests                                                  | AST→IR mapping bugs                                 | Backend output, runtime behavior                                    |
| `tests/compiler/`               | 164     | Compiler unit tests by feature/concern                                        | Most parser+IR+backend regressions                  | Multi-feature interactions                                          |
| `tests/behavior/`               | 16      | **Schicht 2** — observable feature semantics in jsdom                         | Whether a feature does what users expect end-to-end | Cross-backend divergence; per-app integration                       |
| `tests/differential/`           | 16      | Cross-backend equivalence (DOM ≡ React ≡ Framework)                           | Backend divergence on a static corpus               | Bugs that only show in dynamic interaction                          |
| `tests/contract/`               | 16      | Per-app contract tests for `examples/*`                                       | Regressions in real-world example apps              | Bugs in code paths no example exercises                             |
| `tests/integration/`            | 19      | Multi-feature interactions (positioning + dismiss, state-machine + events, …) | Inter-module coupling bugs                          | Single-feature semantics (covered by behavior/)                     |
| `tests/runtime/`                | 3       | Runtime-module unit tests (`compiler/runtime/*.ts`)                           | Runtime helper bugs                                 | Compiled-output runtime template (`backends/dom/runtime-template/`) |
| `tests/studio/`                 | 125     | Studio component tests (panels, pickers, code-modifier, …)                    | Studio-side regressions                             | Compiler regressions; cross-stack flows                             |
| `tests/fixtures/`               | (data)  | Per-feature `.mirror` fixture corpora                                         | —                                                   | —                                                                   |
| `tests/helpers/` `tests/utils/` | (infra) | Shared test environment, matchers, mocks                                      | —                                                   | —                                                                   |

`compiler/` and `studio/` are the two heavy buckets (~55k + ~47k LOC) and carry
most of the day-to-day regression coverage. The other layers add specific
guarantees on top.

---

## When does each layer fire?

Reading order, narrowest → broadest:

1. **`parser/` and `ir/`** — break first when you touch lexer rules or AST→IR
   transformation. Tightly scoped, fast.
2. **`compiler/`** — your default unit-test home. New parser feature? Add a
   `compiler/parser-foo.test.ts`. New IR transformer? `compiler/ir-foo.test.ts`.
   New DOM emitter? `compiler/backend-dom-foo.test.ts`.
3. **`runtime/`** — covers TS modules under `compiler/runtime/`. Does NOT cover
   `compiler/backends/dom/runtime-template/index.ts` — that's the inlined-as-
   string runtime for compiled output, exercised indirectly via `differential/`
   and `behavior/` tests that compile + run.
4. **`behavior/`** — when a parser/IR/backend change passes unit tests but
   subtly broke the observed feature behavior (e.g. a Bind that no longer
   re-renders, an Each that double-renders), this layer catches it. Each file
   targets one feature with a `Sub-features` numbering scheme — reference
   `docs/archive/concepts/feature-test-execution-plan.md` for the full
   feature-test inventory.
5. **`differential/`** — guards against silent divergence between the three
   backends (DOM, React, Framework). If you add a feature, add a corpus entry
   here so all three backends stay in lockstep.
6. **`contract/`** — guards against regressions in the demo apps. The fail
   mode is "address-manager broke" rather than "DSL feature X broke". Tests
   compile the real `examples/*.mirror` files and assert app-level contracts.
7. **`integration/`** — for bugs that only emerge from feature combinations
   (positioning + dismiss, state-machine + events). Use this layer when you
   can't isolate the bug to one feature.
8. **`studio/`** — its own world: panels, pickers, code-modifier ops, drag-
   drop, sync. Doesn't typically catch compiler regressions — that's
   compiler/'s job — but it catches Studio-side bugs cleanly.

---

## What this stack does NOT cover

- **`compiler/backends/dom/runtime-template/index.ts`** (~2261 LOC, JS string).
  The inlined runtime template has no static type checking and is not directly
  imported by tests. It's exercised indirectly: `differential/`, `behavior/`,
  and `contract/` tests all compile real Mirror code and execute the inlined
  runtime — so a string-runtime bug would show up there as a test failure, but
  the failure isn't easy to attribute. Drift between the typed
  `compiler/runtime/*.ts` modules and the string template is the main risk.
- **Build pipeline / packaging** — bundler config, `dist/` output, NPM
  packaging are not tested. Manual verification before release.
- **Browser Studio interactions** — covered by the CDP test stack, not Vitest.

---

## Adding new tests — quick decision tree

```
What kind of bug am I trying to prevent?

├─ A specific parser/IR/backend rule           → tests/compiler/<concern>.test.ts
├─ A user-facing feature does the wrong thing  → tests/behavior/<feature>.test.ts
├─ DOM and React backends drift apart          → tests/differential/<feature>.test.ts
├─ One of the example apps regresses           → tests/contract/<app>.contract.test.ts
├─ Two features interact incorrectly           → tests/integration/<scenario>.test.ts
└─ Studio panel/picker/code-modifier breaks    → tests/studio/<feature>.test.ts
```

When in doubt, prefer `behavior/` — it tests the user-visible end-to-end and
survives codegen refactors better than backend-specific unit tests.

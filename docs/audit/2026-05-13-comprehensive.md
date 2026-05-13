# Mirror — Comprehensive Audit, 2026-05-13

**Scope:** Architecture, test health, code metrics, documentation drift, DSL
feature coverage. Five parallel explore-agents, each constrained to a single
dimension, results cross-verified against the live tree by the synthesizing
session.

**Method:** Agents read source directly, cite `file:line`. The synthesizer
spot-checked surprising claims (e.g. dead links, missing directories,
agent-vs-reality mismatches) and corrected the numbers where the agents
under-counted.

**Net conclusion:** Mirror is structurally mature. The compiler is clean,
state-handling is well-architected, tests are abundant. The drift is **on the
surfaces** — published docs, README links, generated DSL reference, and three
specific feature-asymmetry traps (size-states, mask, state-machine) that are
real production bugs hiding in plain sight. The biggest single risk is the
**docs/publication layer**: README links to files that don't exist;
`docs/generated/` was never built; `packages/` is referenced but absent.

---

## 1. Architecture &amp; Layering

### Strengths

- **Compiler ↔ Studio boundary is clean and asymmetric by design.** Studio
  imports compiler via barrel exports (`compiler/index.ts`,
  `compiler/parser/index.ts`, `compiler/ir/types`, `compiler/utils/logger`).
  The reverse is verified absent — no `compiler/` file imports from `studio/`.
  Validator's studio-integration wrapper sits inside compiler
  (`compiler/validator/studio-integration.ts`) and is owned by the compiler
  surface.
- **IR is single-source-of-truth for DOM and Framework backends.** Both
  `compiler/backends/dom.ts:78` and `compiler/backends/framework.ts:36` call
  `toIR(ast)` and emit from IR. Token / icon emit is structurally symmetric
  (`dom/ops/emit-static.ts:15–29` vs `framework.ts:70–79`).
- **Visual ↔ Core is acyclic.** `studio/visual/` consumes `studio/core/`
  (state, events) but the reverse is verified absent. Visual subsystem is a
  pure consumer; core remains reusable.
- **Runtime-template imports rather than stamps.** The 2105-LOC embedded JS
  string in `compiler/backends/dom/runtime-template/index.ts` pulls
  constants and functions from `compiler/runtime/*.ts` modules
  (`PROP_MAP`, `ALIGN_MAP`, state-machine, scroll, batching) at module-load
  time. Authored once, stamped into the template — no hand-copy duplication.

### Weaknesses / Risks

- **React backend bypasses IR entirely.** Verified: `grep -c "toIR" compiler/backends/react.ts = 0`. The 8 ops files under `compiler/backends/react/ops/`
  walk `program.tokens` / `program.components` / `program.instances`
  directly. Intentional for human-readable JSX export, but breaks the
  "IR is the contract" promise: schema/IR-level fixes (icon viewBox,
  resolver edge cases) don't reach React without manual sync. The 2026-04
  React-decomp lane reduced LOC (3273 → 343) but did not resolve the IR
  bypass.
- **State machine is DOM-only.** Verified: `grep -rn "stateMachine" compiler/backends/react/ = 0`. Same for `loopFocus`, `typeahead`. A Mirror app
  using `toggle()`/`exclusive()` rendered through React or Framework
  silently loses runtime behavior. The differential-test contract here is
  also stale (see Section 2).
- **`studio/app.ts` accesses `window` 65 times across 2385 LOC.** Verified
  count, more than the 25 the agent estimated. Bootstrap (`studio/bootstrap.ts`)
  exists as the clean entry, but `app.ts` still pokes `window.__TAURI_INTERNALS__`,
  `window.desktopFiles`, `window.__compileMirror`, `window.__txFilterDebug`,
  etc. Each window-global is an undeclared dependency that defeats the
  injection contract of the new architecture.
- **Panels reach into preview state-mutation.** `studio/panels/components/component-panel.ts:20` imports `setCurrentDragData` from `studio/preview/drag-preview`. Mutation flows from UI panel
  directly into preview state, bypassing the action-dispatch pattern that
  `studio/core/commands.ts` codifies.

**Top recommendation:** Lift state-machine, loop-focus, typeahead, and
animation-metadata into IR consistently, then converge the React backend to
consume IR like DOM and Framework do. Today's IR-bypass is the single
biggest source of cross-backend asymmetry and silent feature loss.

---

## 2. Test Health

### Strengths

- **Volume + layer balance is healthy.** Compiler unit tests at 194 files
  (parser 36, IR 18, validator 11). Studio jsdom tests at 167. Differential
  16 files. Browser CDP suite at 363. The architecture's high-risk
  surfaces (parser, IR, validator) carry the heaviest dedicated coverage.
- **Skipped tests are documented and tracked.** Each `testWithSetupSkip`
  carries a comment naming the underlying lane (`docs/findings.md` size-state
  entry, container-queries lane). The new contract pin I committed
  (`f6ec2db2`, 6 skipped tests in `tests/differential/states.test.ts`) is
  in the same style.
- **CDP-trusted-events policy enforced.** `docs/TEST-FRAMEWORK.md` codifies
  the "only mouse and keyboard" rule. Studio E2E tests can't bypass real
  input — synthetic-event tests are structurally impossible.

### Weaknesses / Risks

- **Differential tests are per-backend assertions, not semantic
  equivalence.** `tests/differential/actions.test.ts` and siblings compile
  the same source through DOM/React/Framework and assert each backend emits
  something — but don't assert the three outputs _behave_ the same when
  hydrated. A buggy IR transformer could emit syntactically valid but
  semantically broken code in one backend and tests would pass.
- **DOM-backend emit is under-tested vs parser.** Parser 36 test files vs
  DOM-specific 7 files — roughly 5:1. DOM emit is where the state-machine
  → runtime-hook, layout → CSS-Grid, variables → JS conversions happen.
  Higher-risk surface, lower coverage.
- **Timing-dependent flake risk.** 36 studio test files use
  `vi.useFakeTimers()` / `setTimeout` / `MutationObserver`. 10 of them
  `vi.mock` global singletons (e.g. `inline-edit-controller.test.ts:24`)
  — state leakage between runs is a documented flake mode.
- **`scripts/eval-*.ts` (9 files) are manual-run, not CI-wired.** These
  drive the LLM pipeline against real `claude` CLI and measure quality.
  Silent breakage of eval scenarios goes undetected — no versioned
  baselines, no regression alarm.
- **Container-queries differential coverage is partly self-administered.**
  My `f6ec2db2` pin added 6 skipped tests; the parallel session has since
  modified `tests/differential/states.test.ts` (per system-reminder during
  this audit). Synchronization is fragile when two sessions touch the same
  pin file.

**Top recommendation:** Promote 3 differential test files from
"per-backend assertions" to "hydrate + observe equivalence" — at minimum,
mount the DOM and React outputs in jsdom and assert a click on a
`toggle()` button mutates the same data in both. This closes the
silent-divergence gap that today's regex-matching can't catch. Eval
scripts should additionally land an `eval-smoke` CI check that runs a
3-scenario subset and fails the build on quality regression.

---

## 3. Code Health

### Strengths

- **`as any` is at 0 in compiler &amp; studio production.** All 150 remaining
  casts are confined to `studio/test-api/` (1.1% of test-api LOC) and
  serve real opaque surfaces: DOM event routing, window fixture access,
  internal Zag state. Reviewed 15 samples — 12 justified, 3 borderline.
- **Decomposition lanes deliver.** React-backend 3273 → 343, Framework-
  backend 1057 → 165, four dormant subsystems deleted (compile-service
  cluster, react-converter, measurements, layout-inference) totalling
  ~3500 LOC removed in the last two weeks. Repo is actively shrinking.
- **Studio core triplet is the right size.** `studio/core/commands.ts`
  (1168), `state.ts` (779), `change-pipeline.ts` (686), `events.ts` (509)
  — 3142 LOC for the entire state backbone. No single file owns too
  much, no obvious decomposition candidate.

### Weaknesses / Risks

- **Magic strings still scattered.** `'data-mirror-id'` appears 70× across
  studio + compiler. `'__loopVar:'` 14× in resolve-templates and
  resolve-utils. No `studio/shared/constants.ts` exporting these. The
  prior `studio/preview/constants.ts` centralization attempt was deleted
  (2026-05-10) when its re-exports were also dead; lesson: centralization
  only works if call-sites are migrated, not just constants declared.
- **Test-API is 13,815 LOC across 19 files.** Three files >1500 LOC:
  `interactions.ts` (1924), `assertions.ts` (1685),
  `layout-assertions.ts` (1163). Grew from browser-automation harness;
  natural seams along drag/click/focus/layout/visibility lines exist.
- **Container-template runtime sync risk persists.** The 2105 LOC
  `runtime-template/index.ts` imports constants but stamps implementation
  logic inline. Multiple copies of conceptually-similar state-machine
  code at lines 203–211, 326, 1609, 1613, 1619–1762. No TypeScript on
  the stamped calls — schema changes to `compiler/runtime/*.ts` modules
  must be manually mirrored.
- **Console-logging discipline holds, but `/* eslint-disable */` overrides
  in `studio/core/events.ts:459–460`** are a drift channel — easy to
  silently expand.

**Top recommendation:** Add `studio/shared/constants.ts` exporting
`MIRROR_ID_ATTR`, `LOOP_VAR_PREFIX`, `CONDITIONAL_PREFIX` and do the
70 + 14 site replace as one slice. Centralization is now safe because the
test pin for `'data-mirror-id'` would catch any miss. Schedule
test-api/{interactions, assertions, layout-assertions}.ts decomposition
along the drag/click/focus seams when bandwidth allows.

---

## 4. Documentation Drift

### Strengths

- **CLAUDE.md tree-structure is accurate** for `compiler/` (parser, ir,
  backends, runtime, validator, schema) and `studio/` 30+ subdirs. Recent
  deletions (`layout-inference/`, `compile-service`, `react-converter/`,
  `markdown.ts`) are reflected.
- **`findings.md` framework works.** 170 entries tracked; header (lines
  116–139) flags the 6 truly-open vs accumulated history. Architecture-
  Hunt approach is enforced through commit cadence.
- **Lane-docs are accurate.** `docs/refactoring/container-queries.md`
  matches the live bug in `compiler/backends/dom/style-emitter.ts:emitNodeSizeStateCSS`
  (verified — selector targets the element that owns `container-type`,
  per CSS spec violation).
- **Archive docs are linked from active references.** No orphan archive
  files; CLAUDE.md, findings.md, TEST-FRAMEWORK.md all cite specific
  archive paths.

### Weaknesses / Risks (CRITICAL — surface-layer drift)

- **`docs/generated/` directory was never built.** `npm run generate:check`
  confirms: "Run `npm run generate` to update documentation." Generator
  exists at `scripts/generate-from-schema.ts`; reports 128 CSS properties
  - 79 aliases + 18 events + 52 actions + 28 states + 12 keys; emits
    nothing to disk because the target directory is absent. Effect: README.md
    lines 69–70 link to `docs/generated/dsl-reference.md` and
    `docs/generated/properties.md` — both **dead 404 links**.
- **`packages/` does not exist.** Both `README.md:85` and `CLAUDE.md:85`
  reference `packages/mirror-lang/` as the NPM package, but the directory
  is absent at repo root. `package.json` is the actual NPM entry. README's
  project-tree-block is structurally wrong.
- **`docs/MIRROR-TUTORIAL-FULL.md` was moved to archive but README still
  links to the old path.** `README.md:41` and `README.md:68` link to
  `./docs/MIRROR-TUTORIAL-FULL.md` (404); the file lives at
  `docs/archive/MIRROR-TUTORIAL-FULL.md` (5719 LOC, current content).
- **`findings.md` migration debt.** Header acknowledges that ~150 entries
  under "Offen" actually carry `Status: erledigt`/`abgewiesen` and belong
  in "Erledigt". No timeline given. New sessions parsing the doc must
  filter manually.
- **CLAUDE.md inline DSL reference drift.** Manually maintained DSL
  reference (lines 1215–1400) overlaps with `docs/archive/MIRROR-TUTORIAL-FULL.md`.
  77 commits to `compiler/schema/*` in the last 60 days have not all
  reached the inline reference.

**Top recommendation:** Single commit, one session: (1) run `npm run generate`,
(2) commit `docs/generated/`, (3) fix README.md links (lines 41, 68, 69, 70),
(4) remove `packages/` line (85), (5) move `MIRROR-TUTORIAL-FULL.md` back
to active `docs/` or rewrite the link. This unblocks every downstream
user who follows the README and stops the publication-layer drift.

---

## 5. DSL Feature Coverage

### Strengths

- **Schema-as-data is solid.** 25 HTML primitives + 1 Zag (DatePicker) +
  8 Chart primitives. 128 CSS properties + 79 aliases. 18 events + 52
  actions + 28 states + 3 size-states. Authority is the schema files
  (`compiler/schema/{dsl,property-schema,zag-primitives,chart-primitives}.ts`),
  not docs.
- **Dead-feature policy is real.** `tests/policy/dsl-features-have-examples.test.ts`
  enforces: every KEEP-listed feature must have ≥1 `.mir`/`.mirror`/`.com`
  example. WATCHLIST is **currently empty** — both 2026-05-10 entries
  promoted to KEEP. The policy actually gates merges.
- **Pure-Mirror over runtime.** Only DatePicker remains as Zag-backed.
  Select, Checkbox, Switch, RadioGroup, Tabs, Dialog, Tooltip all became
  Pure-Mirror templates (`studio/panels/components/component-templates.ts`).
  Removes runtime bloat without losing surface.
- **Example coverage breadth.** 23 source files spanning single-file
  apps, multi-screen projects, dashboards, component libraries.

### Weaknesses / Risks (CONCRETE FEATURE-LEVEL BUGS)

- **`mask` is a triple-violation.** Property fully defined
  (`compiler/schema/property-schema.ts:1827`), DOM-backend implements it
  (`compiler/backends/dom/node-emitter.ts` + runtime-template support),
  inline-documented in CLAUDE.md (lines 1058–1062). But: (1) **0 `.mirror`
  files** under `examples/` use it (verified — only compiled artifacts
  show "mask"); (2) **not listed in the DSL Reference property table**
  in CLAUDE.md; (3) **React and Framework backends silently drop it** —
  no mask setup logic, no warning. Result: a Mirror app exported to
  React loses the masking property invisibly. Per dead-feature policy:
  90-day deadline ~2026-08-10 unless promoted to KEEP with example.
- **Prose mode has partial backend parity.** Schema flag
  (`property-schema.ts:539`), DOM-backend emits it with prose body parsing.
  React backend's `each`-loop handling has only a comment acknowledging
  "bare strings become paragraphs". Framework backend silent on prose.
  Heavily used in `examples/personas-informatik/components.com`
  (4 prose declarations). No dedicated differential test.
- **`stacked` is exemplified but undocumented internally.** Schema
  (`property-schema.ts:556–566`), 1 example in
  `examples/hospital-dashboard/dashboard.mirror`. Fixture-based test
  exists (`tests/fixtures/layout/l10-stacked/`) but no dedicated `.test.ts`.
  Stack-order semantics (z-axis, overflow clipping) only discoverable
  via tracing style-emitter.
- **77 commits to `compiler/schema/*` in last 60 days** — Mirror's
  surface has evolved substantially. CLAUDE.md inline reference is
  manually maintained; new features land in schema but require manual
  CLAUDE.md update. Drift inevitable.
- **Backend-asymmetry not declared in schema.** Properties don't carry
  a `backends: ['dom']` field. The "feature only works in DOM" surprises
  (state-machine, size-states, mask) are knowable only by reading source.

**Top recommendation:** Single change with cascading payoff: add an
optional `backends` field to schema property definitions. Run-time:
when a user emits to a target that doesn't support a property, log a
clear warning. CI: a differential test asserts that schema-declared
backends really emit the property. Documentation: the generator can
then publish a backend-support matrix automatically. **Plus:** add
`mask` to either WATCHLIST with a deadline, or add a `.mirror` example
that exercises it (favoring the second so the feature stays).

---

## Cross-Cutting Top 5

Ranked by leverage (impact ÷ effort):

1. **Run `npm run generate` and commit `docs/generated/`.** Unblocks
   README links, surfaces DSL drift mechanically, takes one slice. Fix
   the four dead README links in the same commit.
2. **Add `mask` example to `examples/`** OR move to WATCHLIST. A
   schema-defined feature with zero examples is the policy's exact
   target.
3. **Declare backend-support in schema** (`backends: ('dom' | 'react' | 'framework' | 'vue' | 'svelte' | 'vanilla')[]`). Add to all properties.
   Wire the validator to warn at export-time. This single change
   addresses the mask, state-machine, size-state, prose silent-drop
   class of bugs.
4. **Add `studio/shared/constants.ts`** for `MIRROR_ID_ATTR`,
   `LOOP_VAR_PREFIX`, `CONDITIONAL_PREFIX`. Migrate 84 call-sites in one
   slice. Centralization is now safe because the test surface would
   catch any miss.
5. **Migrate the `findings.md` erledigt-entries to the Erledigt
   section.** ~150 entries. Mechanical. Cuts hunt-tracker noise for
   future sessions.

## Out-of-Scope (Owner Lanes)

The audit confirms these stay where they are:

- **Container-Queries Lane A** — Lane-doc steht, Owner-Sign-off ausstehend.
- **Tutorial-Loop-Infrastruktur** — Owner-Entscheidung pending.
- **Tutorial-Demos / Test-Runner** — OWNER-EXKLUSIV.
- **`studio/app.ts` bootstrap-decomp continuation** — diminishing returns,
  remaining content is DOM/editor/state side-effect wiring (per parallel-
  session commit `c179a60a`).
- **React-Backend IR convergence** — large architectural refactor, needs
  owner sign-off (related to the existing react-backend-decomp lane).

## Method Notes

Each section was produced by a dedicated Explore-agent reading source
directly. The synthesizing session spot-checked these claims and
corrected them where wrong:

- Architecture agent's "25+ window-globals in app.ts" was undercounted —
  actual is **65**.
- DSL agent's "20+ schema commits in 60 days" was undercounted —
  actual is **77**.
- Docs agent's claim that `packages/` is absent and README links are
  dead was **verified true on disk** and is the most actionable single
  finding of this audit.
- DSL agent's "no stacked test" was partially wrong — fixture-based test
  exists at `tests/fixtures/layout/l10-stacked/`, but no dedicated
  `.test.ts`. Distinction matters for discoverability.

The audit is structured as a `docs/audit/` artifact, parallel to
`docs/refactoring/` lane-docs. Date-stamped so future audits can be
diffed against this baseline.

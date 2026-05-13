# Probe Scripts

Re-runnable diagnostic scripts that parse mini Mirror snippets and dump
what every backend emits — used to diff "what the DSL promises" against
"what each backend actually does". Surfaced bugs and architectural
drift during refactoring work; today most live as breadcrumbs for the
fixes they motivated.

**Conventions:**

- `slice-NN-<short-name>.ts` — historical, from the Slice-NN refactor
  methodology (archived in git history).
- `probe-<topic>.ts` — current convention for new probes, named by the
  area they investigate (e.g. `probe-react-size-state.ts`).

**Running:**

```bash
npx tsx tools/probes/probe-react-size-state.ts
```

Probes don't need a runtime — they import `compiler/parser`,
`compiler/validator`, `compiler/backends/*` directly and print to stdout.

**Why committed (vs. `/tmp`):** `/tmp` files vanish between sessions and
force the next reader to reconstruct probe geometry from prose alone —
which loses test cases that were "tried and not surprising" (and
therefore undocumented but valuable on re-run). A probe with sharp
geometry (e.g. `probe-abs-size-state.ts` for Container-Queries +
position) is a permanent breadcrumb.

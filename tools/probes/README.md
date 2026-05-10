# Capability-Slice Probe Scripts

Each Mirror refactoring slice (`docs/refactoring/NN-<name>.md`) produces one or
more probe scripts during the audit (Step 2 of the slice methodology). They
parse mini Mirror snippets and dump what every backend emits, so the audit can
diff "what the DSL promises" against "what each backend actually does".

**Convention:** `slice-NN-<short-name>.ts` (e.g. `slice-04-9-positions.ts`).
For a slice with multiple probe rounds, append `-extra` / `-cross-slice` /
`-iter-N`.

**Running:**

```bash
npx tsx tools/probes/slice-04-9-positions.ts
```

Probes don't need a runtime — they import `compiler/parser`,
`compiler/validator`, `compiler/backends/*` directly and print to stdout.

**Why committed (vs. `/tmp`):** the review-pass (Step 7) often re-runs the
original probes against the post-fix state to mirror the audit-doc tables.
Cross-Slice work also re-runs neighbor-slice probes. `/tmp` files vanish
between sessions and force the next reader to reconstruct the probe geometry
from the audit-doc text alone — which loses test cases that were "tried and
not surprising" (and therefore not in the doc but valuable on re-run).

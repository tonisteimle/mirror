# Incremental Re-Export — Update generated/ from changed Mirror sources

This is a **re-export** of an existing bundle. The Mirror source has
changed since the last full export, but the previously generated code in
`./generated/` is still there. **Your job is surgical: update only what
the source diff requires; don't regenerate or reformat anything else.**

**Read these in order:**

1. `CHANGES.md` — list of added / modified / removed Mirror files
2. `MIRROR-BRIEF.md` — DSL reference (only if you need to look up syntax)
3. `target.json` — framework, styling, language settings (unchanged)
4. The current Mirror source for changed files (in `source/`)
5. The corresponding existing files in `generated/` (don't touch the rest)

**Hard rules:**

- For each **added** Mirror source file → create the corresponding
  generated file(s) following the same conventions visible in
  `generated/`.
- For each **modified** Mirror source file → derive what changed
  (component property delta, new component, new screen, etc.) and apply
  the smallest possible edit to the existing generated files. Preserve
  formatting, imports, helper functions, and any user customizations.
- For each **removed** Mirror source file → delete the corresponding
  generated component/page; clean up any now-dead imports.
- For **unchanged** Mirror files → do not touch the generated output.
  Even if you'd format it differently, leave it alone.

**Verification (gate):**

1. Run the project's existing build + type-check (`npm run build`,
   `npx tsc --noEmit`, `npx vue-tsc --noEmit`, `npx svelte-check`,
   whatever the target uses). Must be green.
2. If `render-snapshot/` is present in the bundle, re-run `verify` after
   the build (see bundle README for the command). Visual diff should
   not regress on unchanged areas.
3. Update `generated/CHANGELOG.md` (create if missing) with one line
   per change you made.

**When in doubt:**

- If the diff is so large that surgical edits would be more work than a
  fresh regeneration, say so explicitly and stop. The user can re-run
  without `--incremental` for a full rebuild.
- If a modified Mirror file changes the **shape** of a component (added
  slots, renamed props, primitive change `as Frame` → `as Section`), you
  may need to update both the component definition AND its callers.
- Don't add new framework dependencies. The existing `package.json`
  already has what previous exports used.

**Definition of "done":**

- Build is green
- All `CHANGES.md` items are addressed
- Diff between `git status`-style "before" and "after" of `generated/`
  is small and proportional to the source diff
- `CHANGELOG.md` lists what changed

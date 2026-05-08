# Convert Mirror → Vanilla HTML + CSS (no JS framework)

You are converting a Mirror DSL project to plain semantic HTML +
hand-written CSS — no React, no Vue, no Svelte, no build framework.
Mirror source is in `source/`. Visual ground truth (if provided) is
in `visual-reference.html`. Target settings are in `target.json`.

**Read `MIRROR-BRIEF.md` first.**

## Output

```
generated/
├── index.html                  # the page
├── styles.css                  # global styles + token vars
├── components.css              # per-Mirror-component class rules
└── lib/
    └── inline-md.js            # optional, only if .mir uses inline-md
                                # in dynamic contexts (rare)
```

**Hard rules:**

- No frameworks, no bundlers. Should run via `python -m http.server` or
  `npx serve`.
- Pure HTML5 + CSS3. Modern features OK (custom properties, grid, flex,
  container queries) but no PostCSS / Tailwind / SASS.
- Inline-Markdown (`**bold**`, `*italic*`) → resolved at "compile" time
  by **you, the agent** — emit `<strong>` and `<em>` directly in the
  HTML. No runtime needed.
- Tokens → CSS custom properties on `:root` (e.g. `--yellow: #FDE70E`).
- Each Mirror component → one CSS class. Use `class="logo"` instead of
  `class="Logo"`. The HTML uses semantic tags from the primitive
  (e.g. `Section as Frame` → `<section class="section">`).

## Pipeline (gate on each)

### Step 1 — Plan

`generated/PLAN.md`: list every component class, page structure outline,
token mapping, markdown handling.

**Gate:** PLAN.md lists ≥ all components from every `.com`.

### Step 2 — Tokens & base

`styles.css`:

- `:root { --token-name: value; … }` for every `.tok` entry
- Base resets, font-family stack, body styles
- Container queries / responsive baseline if needed

**Gate:** `styles.css` validates as CSS (no syntax errors).

### Step 3 — Component styles

`components.css`: one class rule per `.com` definition. Use the bare
component name lowercased and dash-cased.

```css
.h2 {
  font-size: 44px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.05;
}
```

**Gate:** every `.com` definition has a corresponding class in
`components.css`.

### Step 4 — Page HTML

For each `.mir` → one HTML output. If only one `.mir` exists, name it
`index.html`. Otherwise: `index.html` + `<name>.html` per layout.

- Each Mirror element → semantic tag from the primitive + class for the
  component (e.g. `<section class="section"><div class="container">…</div></section>`)
- Markdown lists → real `<ul><li>`
- Inline-md → `<strong>` / `<em>` resolved at write-time
- Verbatim text content (locale-specific quotes, accents preserved)

**Gate:** HTML validates (W3C) — at minimum well-formed and proper
nesting.

### Step 5 — Verify (visual diff against Mirror baseline)

If `render-snapshot/` is in the bundle, run the verify CLI from the
bundle README — it pixel-diffs your `generated/` (no `dist/` for vanilla)
against Mirror's render at three viewports.

```bash
npx tsx <path-from-README>/tools/verify.ts . --generated ./generated
```

Iterate: open `verify-diff-<vp>.png` (red = mismatch), fix CSS or HTML,
rerun verify. **Gate:** `verify-report.md` exists; if no snapshot was
captured, fall back to `generated/DISCREPANCIES.md` based on
`visual-reference.html`.

## CSS notes

- Spacing: use `px` directly (`padding: 96px 24px`)
- Letter-spacing: `letter-spacing: -0.025em`
- Line-height: unitless (`line-height: 1.65`)
- Colors via tokens: `background: var(--yellow);`
- For `prose`-marked containers: write CSS rules that mirror
  Tailwind-typography defaults — sensible heading scale, paragraph
  spacing, list styling

## Definition of "done"

- `index.html` opens directly in a browser, renders correctly
- All elements from `.mir` files are present
- Visual diff vs reference ≥ 95%
- No CSS errors; HTML well-formed

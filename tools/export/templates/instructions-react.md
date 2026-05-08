# Convert Mirror → React + TypeScript + Tailwind

You are converting a Mirror DSL project to a production React+TS+Tailwind
implementation. The Mirror source is in `source/`. The visual ground
truth (if provided) is in `visual-reference.html`. Target settings are
in `target.json`.

**Read `MIRROR-BRIEF.md` first.** It explains exactly the Mirror
constructs likely to appear.

## Output

Generate a complete project under `./generated/` with this structure:

```
generated/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.cjs
├── vite.config.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css            # Tailwind directives + base
│   ├── lib/
│   │   └── inline-md.ts     # **bold** / *italic* helper
│   ├── components/          # one .tsx per Mirror component
│   └── pages/               # one .tsx per .mir layout file
```

**Hard rules:**

- No Mirror runtime — pure React + Tailwind only.
- TypeScript strict on.
- Each Mirror component (`.com`) → one React component.
- Each component takes `children` if Mirror used it as a container,
  takes a `text` prop if Mirror used it as text-leaf with a single string,
  takes both if both forms appear.
- Use Tailwind utility classes. No inline styles, no CSS Modules.
- Tokens go to `tailwind.config.ts theme.extend`. Use semantic names
  (the bare token name without suffix).

## Pipeline (do these steps in order, gate on each)

### Step 1 — Plan

Read all source files. Write `generated/PLAN.md` listing:

- Every component you'll create (`<Name>.tsx`)
- The page structure (one `.tsx` per `.mir` layout file)
- The Tailwind config additions (token mapping)
- Any special handling needed (markdown lists, inline-md, ...)

**Gate:** PLAN.md exists and lists ≥ all components from every `.com`.

### Step 2 — Project skeleton + tokens

Generate `package.json`, `tsconfig.json`, `vite.config.ts`,
`tailwind.config.ts`, `postcss.config.cjs`, `index.html`,
`src/main.tsx`, `src/index.css`. Map all `.tok` entries into
`tailwind.config.ts theme.extend`.

**Gate:** `cd generated && npm install && npx tsc --noEmit` passes.

### Step 3 — Inline-markdown helper

Create `src/lib/inline-md.ts` that converts strings with `**bold**` and
`*italic*` to safe HTML:

```ts
export function inlineMd(text: string): string {
  /* ... */
}
```

HTML-escape first, then replace markers.

**Gate:** function exists and tsc is green.

### Step 4 — Components

For each definition in every `.com` file, generate
`src/components/<Name>.tsx`.

- `as <Primitive>` → render the matching HTML element
- `Foo: <props>` (no `as`) with indented body → render a wrapper
  element with the baked-in props, render the body as default,
  accept `children` to override/extend
- Default properties → Tailwind classes on that element
- `text` prop for definitions used as `<Name> "string"` in any `.mir`
- Pure functional components, no state

**Gate:** `npx tsc --noEmit` passes; every `.com` definition has a
generated `.tsx` (even if not yet used in any `.mir`).

### Step 5 — Page composition

For each `.mir` file → one `src/pages/<Name>.tsx`:

- Each Mirror element → matching React component or primitive
- Markdown list blocks (`- text`) inside any container → real
  `<ul><li>` JSX
- Inline `**bold**` / `*italic*` in any text content → use inline-md
  helper
- Preserve text content **verbatim** (locale-specific quotes, accents,
  whitespace)
- `canvas <preset>` → root `<div>` with width/height/bg from preset,
  global styles in `index.css`

**Gate:** `npm run build` succeeds.

### Step 6 — Verify (visual diff against Mirror baseline)

If `render-snapshot/` is in the bundle, run the verify CLI from the
bundle README. It pixel-diffs your `generated/dist/` against Mirror's
own render at three viewports and writes `verify-report.md`.

```bash
npx tsx <path-from-README>/tools/verify.ts .
```

The exit code is 0 if every viewport ≥ 95% match, else 1.

**Iterate:** if any viewport is below threshold, open the corresponding
`verify-diff-<vp>.png` (red pixels = mismatch). Compare the baseline
(`render-snapshot/screenshot-<vp>.png`) with your output
(`verify-screenshot-<vp>.png`). Adjust the generated code, run
`npm run build` in `./generated/`, rerun verify. Stop when green or
when remaining diff is genuinely unfixable from source (e.g. fonts not
installed, intentional Mirror-vs-target rendering differences).

**Gate:** `verify-report.md` exists. If render-snapshot was not in the
bundle (no `--snapshot` at export), fall back to manual diff vs
`visual-reference.html` and write `generated/DISCREPANCIES.md`.

## Tailwind notes

- Spacing in Mirror is **px** — use Tailwind arbitrary values
  `pt-[96px]`, `gap-[64px]`. Don't try to fit the default 4-px scale.
- Letter-spacing `ls -0.025` → `tracking-[-0.025em]`.
- Font-weight `300` → `font-light`; `400` → `font-normal`; `bold` →
  `font-bold`.
- Line-height as unitless → `leading-[0.95]`, `leading-[1.65]`, etc.
- `prose` from Mirror = use `@tailwindcss/typography`'s `prose` class
  on the element marked with `prose`.

## Definition of "done"

- `npm install && npm run build` exits 0
- Page renders looking ≥ 95% like `visual-reference.html` (if provided)
- `npx tsc --noEmit` passes (strict)
- No console errors on load
- All elements from each `.mir` file are present in the corresponding page

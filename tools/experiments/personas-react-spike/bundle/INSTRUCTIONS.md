# Convert Mirror → React + TypeScript + Tailwind

You are converting a Mirror DSL project to a production React+TS+Tailwind
implementation. The Mirror source is in `source/`. The original visual
ground truth (what it should look like) is in `visual-reference.html`.
Target settings are in `target.json`.

**Read `MIRROR-BRIEF.md` first.** It explains exactly the Mirror constructs
used here.

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
│   │   ├── Container.tsx
│   │   ├── Section.tsx
│   │   ├── Logo.tsx
│   │   ├── …
│   └── pages/
│       └── Personas.tsx     # the app.mir layout
```

**Hard rules:**

- No Mirror runtime — pure React + Tailwind only.
- TypeScript strict on.
- Each Mirror component (`.com`) → one React component.
- Each component takes `children` if Mirror used it as a container,
  takes a `text` prop if Mirror used it as text-leaf with a single string,
  takes both if both forms appear in `app.mir`.
- Use Tailwind utility classes. No inline styles, no CSS Modules.
- Tokens go to `tailwind.config.ts theme.extend`. Use semantic names
  (`yellow`, `soft`, `ink`, `muted`, `hairline`).

## Pipeline (do these steps in order, gate on each)

### Step 1 — Plan

Read all source files. Write `generated/PLAN.md` listing:

- Every component you'll create (`<Name>.tsx`)
- The page structure (`Personas.tsx` outline)
- The Tailwind config additions (token mapping)
- Any special handling needed (markdown lists, inline-md, …)

**Gate:** PLAN.md exists and lists ≥ all components from `components.com`.

### Step 2 — Project skeleton + tokens

Generate `package.json`, `tsconfig.json`, `vite.config.ts`,
`tailwind.config.ts`, `postcss.config.cjs`, `index.html`, `src/main.tsx`,
`src/index.css`. Map all `.tok` entries into `tailwind.config.ts theme.extend`.

**Gate:** `cd generated && npm install && npx tsc --noEmit` passes.

### Step 3 — Inline-markdown helper

Create `src/lib/inline-md.ts` that converts strings with `**bold**` and
`*italic*` to safe HTML:

```ts
export function inlineMd(text: string): string {
  /* ... */
}
```

Use HTML-escape first, then replace markers.

**Gate:** function exists, has a tiny test (or at least: import compiles).

### Step 4 — Components

For each definition in `components.com`, generate `src/components/<Name>.tsx`.

- `as Frame` / `as Text` / `as <PrimitiveTag>` → render the matching HTML element
- Default properties → Tailwind classes on that element
- Body slot (children) for definitions that have indented body or are used
  as containers in `app.mir`
- `text` prop for definitions used as `<Name> "string"` in `app.mir`
- Pure functional components, no state

**Gate:** `npx tsc --noEmit` passes; every component has at least one usage
in `Personas.tsx`.

### Step 5 — Page composition

Translate `app.mir` to `src/pages/Personas.tsx`:

- Each Mirror element → matching React component or primitive
- Markdown list blocks (`- text`) inside `ProseBody` → real `<ul><li>` JSX
- Inline `**bold**` / `*italic*` in any text content → use inline-md helper
- Preserve text content **verbatim** (German, "«»", typographic quotes)
- `canvas desktop` → root `<div>` with `min-h-screen` + base styles set
  in `index.css` body rule

**Gate:** `npm run build` succeeds.

### Step 6 — Verify visually

- `npm run dev` starts; manually compare against `visual-reference.html`
  in two browser tabs at desktop width
- Note any discrepancies in `generated/DISCREPANCIES.md`
- Fix what you can; flag what needs design judgment

**Gate:** DISCREPANCIES.md exists; build is green.

## Tailwind notes for this project

- Spacing is in **px** in Mirror — use Tailwind's arbitrary values
  `pt-[96px]`, `gap-[64px]` etc. Don't try to map to default spacing scale.
- Letter-spacing `ls -0.025` → `tracking-[-0.025em]`.
- Font-weight `300` → `font-light`; `400` → `font-normal`; `bold` → `font-bold`.
- Line-height as unitless → `leading-[0.95]`, `leading-[1.65]`, etc.
- `prose` from Mirror means: use `@tailwindcss/typography` plugin's `prose`
  class only on the `ProseBody` component, with `prose-stone` or default.

## Definition of "done"

- `npm install && npm run build` exits 0
- Page renders at `npm run dev` looking ≥ 95% like `visual-reference.html`
- `npx tsc --noEmit` passes (strict)
- No console errors on load
- All five personas, all sections, the topbar, hero, TOC, and footer present

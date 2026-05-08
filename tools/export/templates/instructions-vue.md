# Convert Mirror → Vue 3 + TypeScript + Tailwind

You are converting a Mirror DSL project to a production Vue 3 (Composition
API + `<script setup>`) + TypeScript + Tailwind implementation. Mirror
source is in `source/`. Visual ground truth (if provided) is in
`visual-reference.html`. Target settings are in `target.json`.

**Read `MIRROR-BRIEF.md` first.**

## Output

```
generated/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.cjs
├── vite.config.ts
├── index.html
├── env.d.ts
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── index.css            # Tailwind directives + base
│   ├── lib/
│   │   └── inline-md.ts     # **bold** / *italic* helper
│   ├── components/          # one .vue per Mirror component
│   └── pages/               # one .vue per .mir layout file
```

**Hard rules:**

- No Mirror runtime — pure Vue 3 + Tailwind only.
- TypeScript strict on. Use `<script setup lang="ts">` everywhere.
- One `.vue` SFC per Mirror component definition.
- Components accept `text` prop (string) when used as text-leaf, default
  `<slot />` when used as container, both if both forms appear.
- Use Tailwind utility classes. No `<style>` blocks except for global
  base in `index.css`.
- Tokens go to `tailwind.config.ts theme.extend` using bare names.
- Inline-Markdown via `v-html` with the `inlineMd()` helper.

## Pipeline (gate on each)

### Step 1 — Plan

Write `generated/PLAN.md`: every component, page outline, token mapping,
markdown-list strategy.

**Gate:** PLAN.md lists ≥ all components from every `.com`.

### Step 2 — Skeleton + tokens

Generate `package.json` (deps: `vue`, `vue-router` if needed,
`tailwindcss`, `@tailwindcss/typography`, `@vitejs/plugin-vue`, dev:
`typescript`, `vue-tsc`, `vite`), `tsconfig.json` with `vue-tsc`,
`vite.config.ts` with `@vitejs/plugin-vue`, `tailwind.config.ts`,
`postcss.config.cjs`, `index.html`, `src/main.ts`, `src/App.vue`,
`src/index.css`, `env.d.ts`. Map all `.tok` entries.

**Gate:** `cd generated && npm install && npx vue-tsc --noEmit` passes.

### Step 3 — Inline-md helper

`src/lib/inline-md.ts` exports `inlineMd(text: string): string` —
HTML-escape first, then replace `**bold**` and `*italic*`.

**Gate:** vue-tsc green; helper has self-test or trivial usage.

### Step 4 — Components

For each `.com` definition → `src/components/<Name>.vue`.

```vue
<script setup lang="ts">
defineProps<{ text?: string }>()
</script>

<template>
  <span class="text-[44px] font-bold tracking-[-0.02em] leading-[1.05]">
    <slot>{{ text }}</slot>
  </span>
</template>
```

- `as <Primitive>` → matching HTML tag with baked Tailwind classes
- `Foo: <props>` body slot → render the body inside the SFC's `<template>`,
  override-able via `<slot>`
- Single-string usage (`<H2 text="..." />`) and slot usage both supported

**Gate:** `vue-tsc --noEmit` green; every `.com` definition has a `.vue`.

### Step 5 — Page composition

For each `.mir` → `src/pages/<Name>.vue`:

- Each Mirror element → `<ComponentName>` import + use, or primitive HTML
- Markdown lists (`- text`) → real `<ul><li>` with `v-html` for inline-md
- Quoted strings → either as `text` prop or as default-slot content
- `canvas <preset>` → root wrapper with width/height/bg in `App.vue` or
  page wrapper

**Gate:** `npm run build` succeeds.

### Step 6 — Verify (visual diff against Mirror baseline)

If `render-snapshot/` is in the bundle, run the verify CLI from the
bundle README — it pixel-diffs your `generated/dist/` against Mirror's
render at three viewports.

```bash
npx tsx <path-from-README>/tools/verify.ts .
```

Iterate: open `verify-diff-<vp>.png` (red = mismatch), fix, rebuild,
rerun verify. **Gate:** `verify-report.md` exists; if no snapshot was
captured, fall back to `generated/DISCREPANCIES.md` based on
`visual-reference.html`.

## Tailwind notes

Same as the React variant: arbitrary values for px (`pt-[96px]`),
`tracking-[-0.025em]`, `leading-[0.95]`, `font-light`/`font-bold`.
Use `@tailwindcss/typography` for `prose`.

## Vue-specific notes

- Use `defineProps<{...}>()` for typed props, no `defineProps({...})`
  with object syntax
- Imports go in `<script setup>` block, components are just used by name
  in template
- For `v-html` content, sanitize via `inlineMd()` — never raw user input
  (none here, all content is from Mirror source)

## Definition of "done"

- `npm install && npm run build` exits 0
- `npx vue-tsc --noEmit` passes
- `npm run dev` shows the page rendering correctly
- All elements from each `.mir` file are present

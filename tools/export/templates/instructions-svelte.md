# Convert Mirror → Svelte 5 + TypeScript + Tailwind

You are converting a Mirror DSL project to a production Svelte 5 (runes
mode) + TypeScript + Tailwind implementation. Mirror source is in
`source/`. Visual ground truth (if provided) is in `visual-reference.html`.
Target settings are in `target.json`.

**Read `MIRROR-BRIEF.md` first.**

## Output

```
generated/
├── package.json
├── tsconfig.json
├── svelte.config.js
├── tailwind.config.ts
├── postcss.config.cjs
├── vite.config.ts
├── index.html
├── src/
│   ├── main.ts
│   ├── App.svelte
│   ├── app.css              # Tailwind directives + base
│   ├── lib/
│   │   └── inline-md.ts     # **bold** / *italic* helper
│   ├── components/          # one .svelte per Mirror component
│   └── pages/               # one .svelte per .mir layout file
```

**Hard rules:**

- No Mirror runtime — pure Svelte 5 + Tailwind only.
- TypeScript strict on. Use Svelte 5 runes (`$props`, `$state`).
- One `.svelte` per Mirror component definition.
- Components accept `text?: string` prop and default `<slot />`. Both
  may be present; prefer `text` when caller passes a string, slot
  otherwise.
- Tailwind utility classes. No `<style>` blocks except global base.
- Tokens go to `tailwind.config.ts theme.extend` using bare names.
- Inline-Markdown via `{@html}` with `inlineMd()` helper.

## Pipeline (gate on each)

### Step 1 — Plan

Write `generated/PLAN.md`: every component, page outline, token mapping,
markdown-list strategy.

**Gate:** PLAN.md lists ≥ all components from every `.com`.

### Step 2 — Skeleton + tokens

`package.json` (deps: `svelte`, `tailwindcss`, `@tailwindcss/typography`;
dev: `@sveltejs/vite-plugin-svelte`, `svelte-check`, `typescript`,
`vite`), `tsconfig.json` extending `@tsconfig/svelte`, `svelte.config.js`,
`vite.config.ts`, `tailwind.config.ts`, `postcss.config.cjs`,
`index.html`, `src/main.ts`, `src/App.svelte`, `src/app.css`. Map all
`.tok` entries.

**Gate:** `cd generated && npm install && npx svelte-check --output human` passes.

### Step 3 — Inline-md helper

`src/lib/inline-md.ts` exports `inlineMd(text: string): string` —
HTML-escape first, then replace `**bold**` and `*italic*`.

**Gate:** svelte-check green.

### Step 4 — Components

For each `.com` definition → `src/components/<Name>.svelte`.

```svelte
<script lang="ts">
  let { text, children }: { text?: string; children?: any } = $props()
</script>

<span class="text-[44px] font-bold tracking-[-0.02em] leading-[1.05]">
  {#if children}{@render children()}{:else if text}{text}{/if}
</span>
```

- `as <Primitive>` → matching HTML tag with baked Tailwind classes
- `Foo: <props>` body slot → render the default body inside the
  component, allow `children` snippet to replace it
- Use Svelte 5 snippets (`$props`, `{@render}`), not the legacy `<slot/>`
  syntax

**Gate:** `svelte-check` green; every `.com` definition has a `.svelte`.

### Step 5 — Page composition

For each `.mir` → `src/pages/<Name>.svelte`:

- Each Mirror element → `<ComponentName>` import + use, or HTML primitive
- Markdown lists (`- text`) → real `<ul><li>` with `{@html inlineMd(...)}`
  for inline-md
- Strings as `text` prop or as snippet body
- `canvas <preset>` → root wrapper with width/height/bg

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
captured, fall back to `generated/DISCREPANCIES.md`.

## Tailwind notes

Same as React/Vue variants — arbitrary values for px, `tracking-`,
`leading-`, `font-light`/`font-bold`. `@tailwindcss/typography` for
`prose`.

## Svelte 5 specifics

- Use runes mode: `$props()`, `$state()`, `$derived()` — no `export let`,
  no reactive `$:` declarations
- Snippets via `{#snippet}` and `{@render}` — children pattern is
  `{ children }: { children?: Snippet }` in `$props()`
- For `{@html}` content: only use with `inlineMd()` output (already
  HTML-escaped before transformation)

## Definition of "done"

- `npm install && npm run build` exits 0
- `npx svelte-check` passes
- `npm run dev` shows the page rendering correctly
- All elements from each `.mir` file are present

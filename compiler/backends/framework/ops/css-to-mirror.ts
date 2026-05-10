/**
 * Framework backend — CSS→Mirror reverse-mapper (Slice 2 of
 * framework-backend-decomp).
 *
 * The largest method of the FrameworkGenerator: maps every CSS property
 * the IR emits back to its Mirror equivalent so the M(...) descriptor
 * carries the original-flavor Mirror keyword (`fs 14` not
 * `'font-size': 14`, `anim spin` not the expanded shorthand string).
 *
 * Round-trip guarantee: every CSS shape `compiler/ir/transformers/
 * property-transformer.ts` emits has a reverse branch here. Branches
 * marked `return null` swallow the prop (implicit/companion CSS that
 * doesn't need a Mirror name — e.g. `display: flex` on flex containers,
 * `position: absolute` companion to `x`/`y`).
 *
 * Pure — no `this` state. Only dep: `parsePxValue` from `./helpers`.
 *
 * Extracted from `compiler/backends/framework.ts` per
 * `docs/refactoring/framework-backend-decomp.md`. Behaviour is byte-
 * identical to the pre-extraction call sites.
 */

import { ANIMATION_REVERSE, parseGridSpan, parsePxValue } from './helpers'

/**
 * Map CSS property/value back to Mirror property.
 */
export function cssPropToMirrorProp(
  prop: string,
  value: string
): { name: string; value: string | number | boolean } | null {
  // Layout
  if (prop === 'display' && value === 'flex') return null // Implicit
  if (prop === 'flex-direction' && value === 'row') return { name: 'hor', value: true }
  if (prop === 'flex-direction' && value === 'column') return null // Default
  if (prop === 'gap') return { name: 'gap', value: parsePxValue(value) }
  // Slice 2 V-5: gap-x → column-gap, gap-y → row-gap (Aliases gx/gy
  // map to the same CSS in the IR layout-transformer). Without these
  // branches, Framework export silently dropped both axes.
  if (prop === 'column-gap') return { name: 'gap-x', value: parsePxValue(value) }
  if (prop === 'row-gap') return { name: 'gap-y', value: parsePxValue(value) }
  if (prop === 'justify-content' && value === 'space-between')
    return { name: 'spread', value: true }
  if (prop === 'flex-wrap' && value === 'wrap') return { name: 'wrap', value: true }

  // Alignment
  if (prop === 'justify-content' && value === 'center') return { name: 'center', value: true }
  if (prop === 'align-items' && value === 'center') return { name: 'center', value: true }
  // Cross-axis baseline alignment for mixed-size text rows.
  // Pre-2026-05-10 dropped silently from Framework export.
  if (prop === 'align-items' && value === 'baseline') {
    return { name: 'ver-baseline', value: true }
  }

  // Sizing
  if (prop === 'width') {
    if (value === '100%') return { name: 'w', value: 'full' }
    if (value === 'fit-content') return { name: 'w', value: 'hug' }
    return { name: 'w', value: parsePxValue(value) }
  }
  if (prop === 'height') {
    if (value === '100%') return { name: 'h', value: 'full' }
    if (value === 'fit-content') return { name: 'h', value: 'hug' }
    return { name: 'h', value: parsePxValue(value) }
  }
  if (prop === 'min-width') return { name: 'minw', value: parsePxValue(value) }
  if (prop === 'max-width') return { name: 'maxw', value: parsePxValue(value) }
  if (prop === 'min-height') return { name: 'minh', value: parsePxValue(value) }
  if (prop === 'max-height') return { name: 'maxh', value: parsePxValue(value) }

  // Spacing
  if (prop === 'padding') return { name: 'pad', value: parsePxValue(value) }
  if (prop === 'margin') return { name: 'margin', value: parsePxValue(value) }

  // Colors
  if (prop === 'background' || prop === 'background-color') return { name: 'bg', value: value }
  if (prop === 'color') return { name: 'col', value: value }
  if (prop === 'border-color') return { name: 'boc', value: value }

  // Border
  if (prop === 'border') return { name: 'bor', value: value }
  if (prop === 'border-radius') return { name: 'rad', value: parsePxValue(value) }

  // Typography
  // Prefer Mirror's short alias (`fs`) over the CSS-name form so the
  // round-tripped M(...) bag uses bare-identifier keys (`fs: 14`)
  // instead of quoted hyphenated keys (`'font-size': 14`).
  if (prop === 'font-size') return { name: 'fs', value: parsePxValue(value) }
  if (prop === 'font-weight') {
    // Convert numeric weights back to keywords for readability
    const weightKeywords: Record<string, string> = {
      '100': 'thin',
      '300': 'light',
      '400': 'normal',
      '500': 'medium',
      '600': 'semibold',
      '700': 'bold',
      '900': 'black',
    }
    return { name: 'weight', value: weightKeywords[value] || value }
  }
  if (prop === 'line-height') return { name: 'line', value: value }
  if (prop === 'font-family') return { name: 'font', value: value }
  // Letter-spacing: IR emits `Nem`. Reverse to `tracking N` (the
  // documented Mirror keyword). Pre-2026-05-10 the prop dropped
  // silently from Framework round-trips.
  if (prop === 'letter-spacing') {
    const m = value.match(/^(-?\d+(?:\.\d+)?)em$/)
    if (m) return { name: 'tracking', value: parseFloat(m[1]) }
    return { name: 'tracking', value: value }
  }
  if (prop === 'text-align') return { name: 'text-align', value: value }
  if (prop === 'font-style' && value === 'italic') return { name: 'italic', value: true }
  if (prop === 'text-decoration' && value === 'underline') return { name: 'underline', value: true }
  if (prop === 'text-transform' && value === 'uppercase') return { name: 'uppercase', value: true }
  if (prop === 'text-transform' && value === 'lowercase') return { name: 'lowercase', value: true }

  // Visual
  if (prop === 'opacity') return { name: 'opacity', value: parseFloat(value) }
  if (prop === 'box-shadow') return { name: 'shadow', value: value }
  if (prop === 'cursor') return { name: 'cursor', value: value }
  if (prop === 'z-index') return { name: 'z', value: parseInt(value) }

  // Aspect ratio. The IR's property-transformer maps `aspect square` →
  // `aspect-ratio: 1`, `aspect video` → `aspect-ratio: 16/9`,
  // `aspect <num>` → `aspect-ratio: <num>`. Pre-2026-05-10 the
  // Framework had no reverse mapping and dropped the prop entirely.
  if (prop === 'aspect-ratio') {
    if (value === '1' || value === '1 / 1') return { name: 'aspect', value: 'square' }
    if (value === '16 / 9' || value === '16/9') return { name: 'aspect', value: 'video' }
    // Numeric / arbitrary ratio passes through verbatim.
    return { name: 'aspect', value: value }
  }

  // Filter / backdrop-filter. `blur N` and `backdrop-blur N` are the
  // documented shorthands; the IR emits `filter: blur(Npx)` /
  // `backdrop-filter: blur(Npx)` (plus `-webkit-backdrop-filter` for
  // Safari). Reverse-map both back to the Mirror keyword. The
  // `-webkit-` prefix is dropped since the unprefixed form already
  // round-trips.
  if (prop === '-webkit-backdrop-filter') return null
  if (prop === 'backdrop-filter') {
    const m = value.match(/^blur\((\d+(?:\.\d+)?)px\)$/)
    if (m) return { name: 'backdrop-blur', value: parseFloat(m[1]) }
    return { name: 'backdrop-filter', value: value }
  }
  if (prop === 'filter') {
    const m = value.match(/^blur\((\d+(?:\.\d+)?)px\)$/)
    if (m) return { name: 'blur', value: parseFloat(m[1]) }
    return { name: 'filter', value: value }
  }

  // Scroll
  if (prop === 'overflow-y' && value === 'auto') return { name: 'scroll', value: true }
  if (prop === 'overflow-x' && value === 'auto') return { name: 'scroll-hor', value: true }
  if (prop === 'overflow' && value === 'hidden') return { name: 'clip', value: true }

  // Display
  if (prop === 'display' && value === 'none') return { name: 'hidden', value: true }
  if (prop === 'display' && value === 'grid') return null // Handled separately

  // Grid container
  if (prop === 'grid-template-columns') {
    // Parse repeat(N, 1fr) -> grid N
    const match = value.match(/repeat\((\d+), 1fr\)/)
    if (match) return { name: 'grid', value: parseInt(match[1]) }
    return { name: 'grid', value: value }
  }
  if (prop === 'grid-auto-rows') return { name: 'row-height', value: parsePxValue(value) }
  if (prop === 'grid-auto-flow' && value === 'dense') return { name: 'dense', value: true }
  // Slice 6 V-3: grid-child positioning. Reverse-mapping for `x N`/`y N`/
  // `w N`/`h N` in grid-parent context. The `width: 100%` / `height: 100%`
  // companions emitted alongside `grid-column-end: span N` are dropped
  // (they're a DOM-only artefact — Mirror DSL has just `w N`).
  // Slice 7 V-1: token-resolved values arrive as `var(--name-x)` strings.
  // Pass them through verbatim — the M-runtime resolves CSS-vars at render
  // time. Without this branch `parseInt('var(...)') = NaN` clobbered the
  // round-trip.
  if (prop === 'grid-column-start') {
    return { name: 'x', value: value.startsWith('var(') ? value : parseInt(value) }
  }
  if (prop === 'grid-row-start') {
    return { name: 'y', value: value.startsWith('var(') ? value : parseInt(value) }
  }
  if (prop === 'grid-column-end') {
    const span = parseGridSpan(value)
    return span !== null ? { name: 'w', value: span } : null
  }
  if (prop === 'grid-row-end') {
    const span = parseGridSpan(value)
    return span !== null ? { name: 'h', value: span } : null
  }

  // Slice 6 V-2 / non-grid: `position: absolute` from `x`/`y` outside grid.
  // The IR emits `position: absolute` plus `left: Npx` / `top: Npx`. The
  // Framework reverse-mapper currently has no `position` branch, so we
  // map `left`/`top` directly back to `x`/`y` and drop the `position:
  // absolute` hint (Mirror's `x`/`y` implies absolute positioning).
  if (prop === 'position' && value === 'absolute') return null
  if (prop === 'position' && value === 'fixed') return { name: 'fixed', value: true }
  if (prop === 'position' && value === 'relative') return { name: 'relative', value: true }
  if (prop === 'left') return { name: 'x', value: parsePxValue(value) }
  if (prop === 'top') return { name: 'y', value: parsePxValue(value) }

  // Transforms — `rotate Ndeg` and `scale N` produce a `transform:`
  // string. Pre-2026-05-10 there was no reverse mapping so both
  // dropped from Framework export entirely.
  if (prop === 'transform') {
    const r = value.match(/^rotate\((-?\d+(?:\.\d+)?)deg\)$/)
    if (r) return { name: 'rotate', value: parseFloat(r[1]) }
    const s = value.match(/^scale\((-?\d+(?:\.\d+)?)\)$/)
    if (s) return { name: 'scale', value: parseFloat(s[1]) }
    // Combined transforms (`rotate(45deg) scale(1.2)`) round-trip as a
    // raw `transform:` string; users who wrote the shorthand get
    // separate properties anyway.
    return { name: 'transform', value: value }
  }

  // Directional borders — `bor-l N` / `bor-r N` / `bor-t N` / `bor-b N`.
  // The IR emits `border-left: Npx solid currentColor`. Pre-fix all
  // four directionals dropped silently from Framework export.
  if (
    prop === 'border-left' ||
    prop === 'border-right' ||
    prop === 'border-top' ||
    prop === 'border-bottom'
  ) {
    const m = value.match(/^(\d+)px\s+solid/)
    const dir =
      prop === 'border-left'
        ? 'l'
        : prop === 'border-right'
          ? 'r'
          : prop === 'border-top'
            ? 't'
            : 'b'
    if (m) return { name: `bor-${dir}`, value: parseInt(m[1]) }
    return { name: `bor-${dir}`, value: value }
  }

  // `bor 0 0 1 0` produces `border-style: solid` + `border-width: 0 0 1px 0`.
  // Round-trip the multi-value form back into a `bor` shorthand.
  // `border-style: solid` alone is implicit when border-width is set —
  // drop it to avoid a stray `bor-style: 'solid'` in the M(...) bag.
  if (prop === 'border-style' && value === 'solid') return null
  if (prop === 'border-width') {
    const parts = value.trim().split(/\s+/)
    if (parts.length === 4) {
      const nums = parts.map(p => p.match(/^(\d+)px?$/)?.[1] ?? p)
      return { name: 'bor', value: nums.join(' ') }
    }
    const m = value.match(/^(\d+)px$/)
    if (m) return { name: 'bor', value: parseInt(m[1]) }
    return { name: 'bor', value: value }
  }

  // Flex shorthand - handled in stylesToProps for w full / h full detection
  if (prop === 'flex') return null

  // Flex grow (often combined with width: 100%)
  if (prop === 'flex-grow') return null // Implicit with w full

  // Animations: reverse `mirror-spin 1s linear infinite` → `anim spin`.
  // The IR property-transformer expanded `anim X` to a full CSS shorthand
  // via the shared `ANIMATION_SHORTHAND` map; we reverse-look-up so the
  // M(...) descriptor carries the original keyword (the runtime applies
  // its own `@keyframes mirror-X` rule). Unknown strings pass through —
  // authors can supply a custom `animation: …` value and have it
  // round-trip verbatim.
  if (prop === 'animation') {
    const keyword = ANIMATION_REVERSE[value]
    if (keyword) return { name: 'anim', value: keyword }
    return { name: 'anim', value }
  }

  return null
}

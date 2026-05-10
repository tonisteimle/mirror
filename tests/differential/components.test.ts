/**
 * Components — Differential Testing (Schicht 4 der Test-Pyramide)
 *
 * Pinned support matrix per backend. Where a backend doesn't support a
 * Component sub-feature, the test asserts the *current* (often degraded)
 * behavior so that any improvement shows up as a deliberate test update.
 *
 * Current support summary:
 *
 * | Sub-feature                       | DOM | React | Framework |
 * |-----------------------------------|-----|-------|-----------|
 * | Definition + render               |  ✅  |  ✅  |     ✅     |
 * | `as Primitive`                    |  ✅  |  ✅  |     ✅     |
 * | `as Component` (multi-level)      |  ✅  |  ⚠️  |     ⚠️    |
 * | Slots (named children)            |  ✅  |  ✅  |     ✅     |
 * | Component name in output          |  ✅  |  ❌  |     ✅     |
 * | Instance property override        |  ✅  |  ✅  |     ✅     |
 * | toggle()/exclusive() runtime      |  ✅  |  ⚠️  |     ⚠️    |
 * | hover state                       |  ✅  |  ❌  |     ❌    |
 *
 * - ✅ = fully supported, observable
 * - ⚠️ = partial / degraded behavior (compiles but semantics differ)
 * - ❌ = silently dropped / inlined
 *
 * Documentation: docs/archive/concepts/component-backend-support.md
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

// =============================================================================
// All 3 backends — compile static component corpus without throwing
// =============================================================================

const STATIC_CORPUS = [
  { name: 'C1 — basic definition', src: `Card: pad 16, bg #fff\n\nCard` },
  {
    name: 'C2 — `as Button`',
    src: `PrimaryBtn as Button: bg #2271C1, col white\n\nPrimaryBtn "Save"`,
  },
  {
    name: 'C3 — Frame shorthand',
    src: `StatusBadge: Frame pad 8, bg #2271C1\n\nStatusBadge`,
  },
  {
    name: 'C4 — `as Component`',
    src: `Btn: Button pad 10\nDangerBtn as Btn: bg #ef4444\n\nDangerBtn "X"`,
  },
  {
    name: 'C7 — instance override',
    src: `Btn: Button pad 10, bg #333\n\nBtn "A"\nBtn "B", bg #f00`,
  },
  { name: 'C9 — slot usage', src: `Card: pad 16\n  Title: fs 18\n\nCard\n  Title "Hello"` },
  {
    name: 'C12 — component composition',
    src: `Btn: Button pad 10\nCard: pad 16\n  Btn "Inside"\n\nCard`,
  },
]

describe('Components — All 3 backends compile static corpus', () => {
  it.each(STATIC_CORPUS)('$name: compiles in DOM, React, Framework', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

// =============================================================================
// All 3 backends — Visible text in instances and slots
// =============================================================================

describe('Components — Visible text preserved across backends', () => {
  const corpus = [
    {
      name: 'instance text "Save"',
      src: `PrimaryBtn as Button: bg #2271C1\n\nPrimaryBtn "Save"`,
      text: 'Save',
    },
    {
      name: 'slot text "Hello"',
      src: `Card: pad 16\n  Title: fs 18\n\nCard\n  Title "Hello"`,
      text: 'Hello',
    },
  ]

  it.each(corpus)('$name: "$text" appears in all 3 backends', ({ src, text }) => {
    expect(generateDOM(parse(src))).toContain(text)
    expect(generateReact(parse(src))).toContain(text)
    expect(generateFramework(parse(src))).toContain(text)
  })
})

// =============================================================================
// DOM ↔ React — Tag equivalence (DOM-supported features that React handles)
// =============================================================================

describe('Components — DOM/React tag equivalence (supported subset)', () => {
  const directPrimitiveCases = [
    {
      name: 'C1: `Card:` definition (no `as`) → both produce <div>',
      src: `Card: pad 16\n\nCard`,
      tag: 'div',
    },
    {
      name: 'C2: `as Button` → both produce <button>',
      src: `Btn as Button: bg #333\n\nBtn "X"`,
      tag: 'button',
    },
    {
      name: 'C3: `Btn: Button …` shorthand → both produce <button>',
      src: `Btn: Button pad 10\n\nBtn "X"`,
      tag: 'button',
    },
  ]

  it.each(directPrimitiveCases)('$name', ({ src, tag }) => {
    const dom = generateDOM(parse(src))
    const react = generateReact(parse(src))
    expect(dom).toContain(`createElement('${tag}'`)
    // React: tag appears as JSX element
    expect(react).toMatch(new RegExp(`<${tag}[\\s>/]`))
  })
})

// =============================================================================
// DOM — Component name in output (DOM-only, React inlines)
// =============================================================================

describe('Components — DOM preserves component name in dataset.mirrorName', () => {
  it.each(STATIC_CORPUS)('$name: instantiated component names appear in DOM', ({ src }) => {
    const dom = generateDOM(parse(src))
    // Find instance lines: top-level (no leading whitespace) where the line
    // does NOT contain a `:` (which would mark it as a definition or slot).
    const instanceNames = new Set<string>()
    for (const rawLine of src.split('\n')) {
      if (rawLine.startsWith(' ') || rawLine.startsWith('\t')) continue
      if (rawLine.includes(':')) continue
      const m = rawLine.match(/^([A-Z][a-zA-Z0-9]*)/)
      if (m) instanceNames.add(m[1])
    }
    for (const name of instanceNames) {
      expect(dom).toContain(`mirrorName = '${name}'`)
    }
  })
})

// =============================================================================
// Framework — Component name preserved as M('Name', …)
// =============================================================================

describe('Components — Framework preserves component types', () => {
  it.each(STATIC_CORPUS)('$name: framework emits M(<Name>, …) for definitions', ({ src }) => {
    const fw = generateFramework(parse(src))
    // Top-level component instance → should have M('<DefName>', …)
    const defNames = [...src.matchAll(/^([A-Z][a-zA-Z0-9]*)(?:\s+as\s+\S+)?:/gm)].map(m => m[1])
    // Framework is allowed to drop sub-component refs but should keep at least
    // one of the defined names (the entry-point user is most likely to query)
    const found = defNames.some(name => fw.includes(name))
    expect(found).toBe(true)
  })
})

// =============================================================================
// React — Documented gaps (pinned current behavior)
// =============================================================================

describe('Components — React backend documented limits', () => {
  it('inlines components: no `function Card`/`<Card />` in React output', () => {
    // Current behavior — React inlines `Card` to `<div>` and does NOT emit
    // a separate React function or JSX component. The component name still
    // appears in the data-component / data-mirror-name attributes (Slice 1
    // React-parity), but no `<Card />` or `function Card` is emitted.
    // If/when React backend gains true component preservation, update this.
    const react = generateReact(parse(`Card: pad 16\n\nCard`))
    expect(react).not.toMatch(/function Card\b/)
    expect(react).not.toMatch(/<Card\b/)
    // The render still works, just as a plain <div>.
    expect(react).toMatch(/<div[\s>/]/)
  })

  it('default children: component definition children render when instance is bare', () => {
    // PIN: `Card: pad 16\n  Text "Default"\n\nCard` — the instance has no
    // children, so the React backend now falls through to the component
    // definition's children as default content. Pre-2026-05-10 the React
    // emit was an empty `<div />` for this case.
    const src = `LikeBtn: bg #333, pad 12 20\n  Text "Like"\n\nLikeBtn`
    const react = generateReact(parse(src))
    // Default text shows up.
    expect(react).toContain('Like')
    // Concretely as a Text-tagged span child.
    expect(react).toMatch(/<span[^>]*data-component="Text"/)
  })

  it('default children skipped when instance carries its own positional content', () => {
    // PIN: `Btn "Custom"` overrides the default — only the positional
    // string lands in the JSX, not both.
    const src = `Btn: pad 10\n  Text "Default"\n\nBtn "Custom"`
    const react = generateReact(parse(src))
    expect(react).toContain('Custom')
    expect(react).not.toContain('Default')
  })

  it('multi-level `as Component` inheritance: chain merges across DOM and React', () => {
    // Both backends now walk the `as`-chain via ComponentResolver and merge
    // properties from every level. DOM has done this all along; the React
    // backend used to drop parent props (only innermost LoudBtn's `fs 18`
    // landed) until it picked up the same resolver. CI fails if either
    // backend regresses.
    const src = `Btn: Button pad 10
PrimaryBtn as Btn: bg #2271C1
LoudBtn as PrimaryBtn: fs 18

LoudBtn "X"`
    const dom = generateDOM(parse(src))
    const react = generateReact(parse(src))

    for (const out of [dom, react]) {
      expect(out).toContain('10px')
      expect(out).toContain('#2271C1')
      expect(out).toContain('18')
    }
    // React resolves to the underlying primitive too — `LoudBtn` → ... → `Button`.
    expect(react).toMatch(/<button[\s>]/)
  })
})

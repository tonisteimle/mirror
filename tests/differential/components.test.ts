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
 * Documentation: docs/concepts/component-backend-support.md
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
  it('inlines components: definition name does NOT appear in React output', () => {
    // Current behavior — React inlines `Card` to `<div>` and drops the name.
    // If/when React backend gains component preservation, update this test.
    const react = generateReact(parse(`Card: pad 16\n\nCard`))
    expect(react).not.toContain('Card')
    // The render still works, the structure is just nameless
    expect(react).toMatch(/<div[\s>/]/)
  })

  it('multi-level `as Component` inheritance: only innermost props applied', () => {
    // Current React behavior: `LoudBtn as PrimaryBtn` only emits LoudBtn's
    // own properties (fs 18), NOT the merged chain.
    // DOM correctly merges all 3 levels.
    const src = `Btn: Button pad 10
PrimaryBtn as Btn: bg #2271C1
LoudBtn as PrimaryBtn: fs 18

LoudBtn "X"`
    const dom = generateDOM(parse(src))
    const react = generateReact(parse(src))

    // DOM has all 3 levels merged
    expect(dom).toContain('10px')
    expect(dom).toContain('#2271C1')
    expect(dom).toContain('18px')

    // React has only the innermost (LoudBtn) properties
    expect(react).toContain('18')
    // Currently the parent properties are dropped — pin that
    // (if this fails because they ARE included, that's a fix worth celebrating)
    expect(react).not.toContain('#2271C1')
  })
})

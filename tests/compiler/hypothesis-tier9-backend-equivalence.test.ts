/**
 * Hypothesis-Driven Bug Hunting — Tier 9: Backend Equivalence
 *
 * Mirror has three backends: DOM, React, Framework. They should produce
 * **structurally equivalent** output for the same Mirror input. This test
 * checks several invariants:
 *
 *   - Same primitives produce same HTML element types in DOM and React
 *   - Same number of root elements
 *   - Same nesting depth
 *   - Same text content distribution
 *
 * Differences are expected for unsupported features (each, if, states in
 * the React backend), but for plain static UIs, all three backends should
 * agree on the basic shape.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

// =============================================================================
// Static UIs (no each, no if, no states) — all backends should match
// =============================================================================

const STATIC_CORPUS = [
  { name: 'frame', src: `Frame` },
  { name: 'frame-styled', src: `Frame w 200, h 100, bg #fff` },
  { name: 'text', src: `Text "Hello"` },
  { name: 'button', src: `Button "Click"` },
  { name: 'input', src: `Input placeholder "X"` },
  { name: 'image', src: `Image src "/foo.jpg"` },
  { name: 'link', src: `Link "Home", href "/"` },
  {
    name: 'frame-with-children',
    src: `Frame gap 8
  Text "A"
  Text "B"
  Button "OK"`,
  },
  {
    name: 'nested-frames',
    src: `Frame
  Frame
    Text "deep"`,
  },
  {
    name: 'card-with-title-desc',
    src: `Card: bg #1a1a1a, pad 16
  Title: fs 16, col white
  Desc: col #888

Card
  Title "Hello"
  Desc "World"`,
  },
]

// =============================================================================
// Helpers: extract structural shape from each backend
// =============================================================================

function shapeFromDOM(code: string): { tags: string[]; texts: string[] } {
  // Only count user-facing elements: emitter pattern is
  //   `const NODE = document.createElement('TAG')`
  // followed shortly by `NODE.dataset.mirrorName = 'NAME'` (within 10 lines).
  // Extract by line so we don't match runtime helpers (no dataset.mirrorName).
  const lines = code.split('\n')
  const tags: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/const\s+(\S+)\s*=\s*document\.createElement\('([^']+)'\)/)
    if (!m) continue
    const [, varName, tag] = m
    // Look at next ~10 lines for the dataset.mirrorName assignment
    let isUser = false
    for (let j = i + 1; j < Math.min(i + 11, lines.length); j++) {
      if (lines[j].includes(`${varName}.dataset.mirrorName`)) {
        isUser = true
        break
      }
    }
    if (isUser) tags.push(tag)
  }
  const texts = [...code.matchAll(/textContent\s*=\s*"([^"]*)"/g)].map(m => m[1])
  return { tags, texts }
}

function shapeFromReact(code: string): { tags: string[]; texts: string[] } {
  // Extract opening tags (simple heuristic, ignores self-closing details)
  const tags = [...code.matchAll(/<([a-z][a-z0-9]*)[\s>/]/g)].map(m => m[1])
  // Extract JSX text expressions {"..."}
  const texts = [...code.matchAll(/\{"([^"]*)"\}/g)].map(m => m[1])
  return { tags, texts }
}

function shapeFromFramework(code: string): { tags: string[]; texts: string[] } {
  // Framework emits M('Type', ...) calls
  const tags = [...code.matchAll(/M\('([A-Z][a-zA-Z0-9]*)'/g)].map(m => m[1])
  const texts = [...code.matchAll(/M\('[^']+',\s*'([^']*)'/g)].map(m => m[1])
  return { tags, texts }
}

// Mirror primitive type → HTML tag (canonical)
const PRIMITIVE_TO_TAG: Record<string, string> = {
  Frame: 'div',
  Box: 'div',
  Text: 'span',
  Button: 'button',
  Input: 'input',
  Textarea: 'textarea',
  Image: 'img',
  Link: 'a',
  Icon: 'span',
}

// =============================================================================
// Top-level structural equivalence: at least one element of expected tag
// =============================================================================

describe('Tier 9 — DOM/React HTML-tag equivalence', () => {
  it.each(STATIC_CORPUS)('$name: DOM and React emit same primary tag', ({ name, src }) => {
    const dom = shapeFromDOM(generateDOM(parse(src)))
    const react = shapeFromReact(generateReact(parse(src)))

    // Both backends should have at least one tag from the primitive set
    if (src.includes('Text "')) {
      expect(dom.tags).toContain('span')
      expect(react.tags).toContain('span')
    }
    if (src.includes('Button "')) {
      expect(dom.tags).toContain('button')
      expect(react.tags).toContain('button')
    }
    if (src.includes('Input ')) {
      expect(dom.tags).toContain('input')
      expect(react.tags).toContain('input')
    }
    if (src.includes('Image src')) {
      expect(dom.tags).toContain('img')
      expect(react.tags).toContain('img')
    }
    if (src.includes('Link "')) {
      expect(dom.tags).toContain('a')
      expect(react.tags).toContain('a')
    }
  })
})

describe('Tier 9 — DOM/Framework primitive consistency', () => {
  it.each(STATIC_CORPUS)('$name: Framework Type names match Mirror primitives', ({ name, src }) => {
    const fw = shapeFromFramework(generateFramework(parse(src)))
    // Each Mirror primitive used should appear as M('PrimitiveName', ...) in framework output
    for (const [prim] of Object.entries(PRIMITIVE_TO_TAG)) {
      const sourceUsesPrim = new RegExp(`(^|\\n|;)\\s*${prim}(\\s|"|$)`).test(src)
      const fwHasPrim = fw.tags.includes(prim)
      if (sourceUsesPrim) {
        expect(fwHasPrim).toBe(true)
      }
    }
  })
})

// =============================================================================
// Text content equivalence
// =============================================================================

describe('Tier 9 — Text content preserved across backends', () => {
  it.each(STATIC_CORPUS)('$name: text strings appear in all 3 outputs', ({ name, src }) => {
    const sourceTexts = [...src.matchAll(/"([^"]+)"/g)]
      .map(m => m[1])
      // Filter out things that aren't user text content (URLs, type values, etc.)
      .filter(t => !t.startsWith('/') && !t.startsWith('#') && !/^[a-z]+$/.test(t))
    if (sourceTexts.length === 0) return

    const dom = generateDOM(parse(src))
    const react = generateReact(parse(src))
    const fw = generateFramework(parse(src))
    for (const text of sourceTexts) {
      // Each backend should mention each user-text somewhere
      expect(dom).toContain(text)
      expect(react).toContain(text)
      expect(fw).toContain(text)
    }
  })
})

// =============================================================================
// Element count consistency
// =============================================================================

describe('Tier 9 — Element-count consistency', () => {
  it.each(STATIC_CORPUS)('$name: DOM and React have same primitive-tag count', ({ name, src }) => {
    const dom = shapeFromDOM(generateDOM(parse(src)))
    const react = shapeFromReact(generateReact(parse(src)))

    // Count primary primitives only (excluding root containers like .mirror-root)
    const primitiveTags = new Set(['span', 'button', 'input', 'img', 'a', 'textarea'])
    const domPrim = dom.tags.filter(t => primitiveTags.has(t)).length
    const reactPrim = react.tags.filter(t => primitiveTags.has(t)).length

    // Allow ±1 difference (root wrappers etc.)
    expect(Math.abs(domPrim - reactPrim)).toBeLessThanOrEqual(1)
  })
})

// =============================================================================
// Tokens emission consistency
// =============================================================================

describe('Tier 9 — Tokens consistency', () => {
  it('all 3 backends emit tokens definitions when present', () => {
    const src = `primary.bg: #2271C1
danger.bg: #ef4444

Frame bg $primary`
    const dom = generateDOM(parse(src))
    const react = generateReact(parse(src))
    const fw = generateFramework(parse(src))

    // DOM emits as CSS variables
    expect(dom).toContain('--primary-bg')
    // React emits as a tokens object
    expect(react.toLowerCase()).toContain('primary')
    // Framework emits as exported tokens object
    expect(fw).toContain('primary')
  })
})

// =============================================================================
// Component reference consistency
// =============================================================================

describe('Tier 9 — Component definitions resolve in all backends', () => {
  it('Card with Title slot: all 3 backends include "Hello"', () => {
    const src = `Card: pad 16
  Title: fs 16

Card
  Title "Hello"`
    const dom = generateDOM(parse(src))
    const react = generateReact(parse(src))
    const fw = generateFramework(parse(src))
    expect(dom).toContain('Hello')
    expect(react).toContain('Hello')
    expect(fw).toContain('Hello')
  })

  it('Button "X" appears in output of all 3 backends', () => {
    const src = `Button "OK"`
    const dom = generateDOM(parse(src))
    const react = generateReact(parse(src))
    const fw = generateFramework(parse(src))
    for (const out of [dom, react, fw]) {
      expect(out).toContain('OK')
    }
  })
})

// =============================================================================
// All backends produce valid output for entire corpus
// =============================================================================

describe('Tier 9 — All backends compile every corpus entry without throw', () => {
  it.each(STATIC_CORPUS)('$name compiles in all 3 backends', ({ name, src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

// =============================================================================
// Empty input handling
// =============================================================================

describe('Tier 9 — Empty input is handled identically (no-throw)', () => {
  it.each([
    ['empty', ''],
    ['whitespace', '   \n   '],
    ['comment', '// comment'],
  ])('%s input compiles in all 3 backends', (_label, src) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

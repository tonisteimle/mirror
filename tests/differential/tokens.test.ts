/**
 * Tokens — Differential Testing (Schicht 4 der Test-Pyramide)
 *
 * Pinned support matrix per backend für Token-Sub-Features.
 * Documentation: docs/archive/concepts/tokens-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const STATIC_CORPUS = [
  {
    name: 'TK1: single-value token',
    src: `primary.bg: #2271C1\n\nFrame bg $primary`,
  },
  {
    name: 'TK2: property-set token',
    src: `cardstyle: bg #1a1a1a, pad 16, rad 8\n\nFrame $cardstyle`,
  },
  {
    name: 'TK4: direct match (`$primary-bg`)',
    src: `primary-bg: #2271C1\n\nFrame bg $primary-bg`,
  },
  {
    name: 'TK6: token-in-token chain',
    src: `primary.bg: #2271C1\nsecondary.bg: $primary\n\nFrame bg $secondary`,
  },
]

describe('Tokens — All 3 backends compile static corpus', () => {
  it.each(STATIC_CORPUS)('$name: compiles in DOM, React, Framework', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

describe('Tokens — DOM emits :root CSS variables', () => {
  it('Token-Definitions land in :root CSS as --token-suffix variables', () => {
    const dom = generateDOM(parse(`primary.bg: #2271C1\nprimary.col: white\n\nFrame bg $primary`))
    expect(dom).toContain('--primary-bg')
    expect(dom).toContain('--primary-col')
  })

  it('DOM uses var(--token-suffix) at the consumption site', () => {
    const dom = generateDOM(parse(`primary.bg: #2271C1\n\nFrame bg $primary`))
    expect(dom).toContain('var(--primary-bg)')
  })
})

describe('Tokens — Token-Name appears in DOM output', () => {
  it.each(STATIC_CORPUS.filter(c => !c.name.startsWith('TK2')))(
    '$name: token name appears in DOM output',
    ({ src }) => {
      const dom = generateDOM(parse(src))
      const m = src.match(/^([a-z]+)/m)
      const name = m?.[1] || 'primary'
      expect(dom).toContain(name)
    }
  )

  // TK2 (property-set) is special: property-sets are EXPANDED at IR time,
  // so the set-name doesn't survive into DOM. Pin that.
  it('TK2 PIN: property-set name is expanded out of DOM (not preserved)', () => {
    const dom = generateDOM(parse(`cardstyle: bg #1a1a1a, pad 16, rad 8\n\nFrame $cardstyle`))
    // The set-name `cardstyle` doesn't appear because the IR expands it.
    expect(dom).not.toContain('cardstyle')
    // But its constituent values do appear (rgb form for #1a1a1a)
    expect(dom).toMatch(/1a1a1a|26, 26, 26/)
  })
})

// =============================================================================
// Bug #29 PIN — `bor` shorthand overrides `boc` token
// =============================================================================

describe('Tokens — Bug #29 fixed: `bor` no longer overrides `boc` token', () => {
  it('`bor 2` emits `border-width` + `border-style` (no shorthand reset)', () => {
    const dom = generateDOM(parse(`brand.boc: #1a5d9c\n\nFrame boc $brand, bor 2`))
    // Both border-color and border-width survive, no `border:` shorthand
    expect(dom).toContain("'border-color': 'var(--brand-boc)'")
    expect(dom).toContain("'border-width': '2px'")
    expect(dom).toContain("'border-style': 'solid'")
    // Old shorthand-with-currentColor is gone
    expect(dom).not.toContain('2px solid currentColor')
  })
})

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

  it('IR resolves token-typed gradient stops to CSS variables (DOM + Framework)', () => {
    // Pre-2026-05-10 the IR's gradient logic stringified TokenReference
    // objects directly, leaking `linear-gradient(135deg, [object Object], …)`
    // into both DOM and Framework outputs. Now resolves through the
    // standard `resolveValue` path → `var(--primary-bg)`.
    const src = `primary.bg: #2271C1\nsecondary.bg: #ec4899\n\nFrame bg grad 135 $primary $secondary, w 100, h 100`
    const dom = generateDOM(parse(src))
    const fw = generateFramework(parse(src))
    for (const out of [dom, fw]) {
      expect(out).not.toContain('[object Object]')
      expect(out).toMatch(
        /linear-gradient\(135deg,\s*var\(--primary-bg\),\s*var\(--secondary-bg\)\)/
      )
    }
  })

  it('React skips property-set tokens from the `tokens` object', () => {
    // Pre-2026-05-10 the React backend emitted `'cardstyle': undefined`
    // (and same for every property-set) because it iterated over
    // `program.tokens` without checking for the property-set shape. The
    // set still expands inline at use sites — what we don't want is the
    // bare `undefined` entry in the runtime tokens object.
    const react = generateReact(
      parse(`cardstyle: bg #1a1a1a, pad 16, rad 8\n\nFrame $cardstyle\n  Text "Hi"`)
    )
    expect(react).not.toContain("'cardstyle': undefined")
    // Properties still expand inline at the use site.
    expect(react).toContain('#1a1a1a')
    expect(react).toContain("padding: '16px'")
  })
})

// =============================================================================
// Token-leak guard — unresolved $tokens drop instead of leaking literal
// =============================================================================

describe('Tokens — Unresolved $tokens drop in React style props', () => {
  // PIN: when a token reference can't resolve under the suffix-aware
  // lookup (e.g. `boc $accent` when only `accent.bg`/`accent.col` exist —
  // there's no `accent.boc` and no plain `accent`), the DOM backend
  // silently emits no `border-color:` rule. Pre-2026-05-10 the React
  // backend leaked `borderColor: '$accent'` into the inline style — an
  // invalid CSS value the browser dropped anyway, but it confused anyone
  // reading the generated JSX. The leak guard now drops these silently
  // so React matches DOM.
  it('boc $accent with no accent.boc/accent token: drops in React, drops in DOM', () => {
    const src = `accent.bg: #c9a961\naccent.col: #c9a961\n\nFrame boc $accent, bor 1, w 100, h 50`
    const react = generateReact(parse(src))
    const dom = generateDOM(parse(src))
    expect(react).not.toContain("'$accent'")
    expect(react).not.toContain('borderColor:')
    // DOM has the same drop semantics: no var(--accent-boc) reference,
    // no border-color either.
    expect(dom).not.toContain('var(--accent-boc)')
  })

  it('col $primary with no primary.col/primary token: drops in React', () => {
    const src = `primary.bg: #1a1a1a\n\nFrame col $primary, w 100`
    const react = generateReact(parse(src))
    expect(react).not.toContain("'$primary'")
    expect(react).not.toContain('color:')
  })

  it('Framework: unresolved $tokens drop in style-shaped props (bg/col/boc/ic/...)', () => {
    // Same shape as React: when `accent.boc` doesn't exist and `accent`
    // alone has no value either, `boc $accent` had been emitting
    // `M(..., { boc: '$accent' })` — round-trip-lossy garbage. Now
    // dropped at the prop-bag boundary.
    const src = `accent.bg: #c9a961\n\nFrame boc $accent, bor 1, w 100`
    const fw = generateFramework(parse(src))
    expect(fw).not.toContain("boc: '$accent'")
  })

  it('Framework: nested state-bag tokens also drop on miss', () => {
    // Pre-2026-05-10 the state-styles bag carried `selected: { boc:
    // '$accent', ... }` straight through. Now stripped to match DOM.
    const src = `accent.bg: #c9a961\n\nBtn as Button: bg #333, exclusive()\n  selected:\n    boc $accent\n\nBtn "X", selected`
    const fw = generateFramework(parse(src))
    expect(fw).not.toContain("boc: '$accent'")
  })

  it('Framework: data bindings ($collection, $foo.bar) NOT dropped', () => {
    // PIN: chart `data: '$data'`, M.each collection refs, and dotted
    // text-content data references are runtime bindings the
    // mirror-runtime resolves. The leak guard must NOT touch these.
    const src = `data:\n  A: 1\n  B: 2\n\nLine $data, w 350, h 180`
    const fw = generateFramework(parse(src))
    // The chart's data binding must survive.
    expect(fw).toMatch(/data:\s*['"]\$data['"]/)
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

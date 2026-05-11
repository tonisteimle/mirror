/**
 * collectPreludeDefinitions — pure-function tests.
 *
 * Pin the symbol-set shape the validator consumes so future refactors of
 * `compile()` can refactor with confidence.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { collectPreludeDefinitions } from '../../studio/compile/prelude-definitions'

describe('collectPreludeDefinitions', () => {
  it('returns empty sets for a null prelude AST', () => {
    const r = collectPreludeDefinitions(null)
    expect(r.preludeTokens.size).toBe(0)
    expect(r.preludeComponents.size).toBe(0)
  })

  it('returns empty sets for a prelude with no tokens or components', () => {
    const ast = parse('// nothing here')
    const r = collectPreludeDefinitions(ast)
    expect(r.preludeTokens.size).toBe(0)
    expect(r.preludeComponents.size).toBe(0)
  })

  it('adds both root and base name for a suffix token', () => {
    const ast = parse('primary.bg: #2271C1')
    const r = collectPreludeDefinitions(ast)
    expect(r.preludeTokens.has('primary')).toBe(true)
    expect(r.preludeTokens.has('primary.bg')).toBe(true)
    expect(r.preludeTokens.size).toBe(2)
  })

  it('adds the bare name when token has no suffix', () => {
    const ast = parse('cardstyle: bg #1a1a1a, pad 16, rad 8')
    const r = collectPreludeDefinitions(ast)
    expect(r.preludeTokens.has('cardstyle')).toBe(true)
    // Root segment === base name → set has one entry.
    expect(r.preludeTokens.size).toBe(1)
  })

  it('strips a leading $ if present on the token name', () => {
    const ast = parse('$primary.bg: #2271C1')
    const r = collectPreludeDefinitions(ast)
    // The validator should treat `$primary` references as defined, so we
    // store the name without the `$`.
    expect(r.preludeTokens.has('primary')).toBe(true)
    expect(r.preludeTokens.has('primary.bg')).toBe(true)
    expect(r.preludeTokens.has('$primary')).toBe(false)
    expect(r.preludeTokens.has('$primary.bg')).toBe(false)
  })

  it('collects component names', () => {
    const ast = parse('Card: bg #1a1a1a, pad 16')
    const r = collectPreludeDefinitions(ast)
    expect(r.preludeComponents.has('Card')).toBe(true)
    expect(r.preludeComponents.size).toBe(1)
  })

  it('collects multiple tokens and components together', () => {
    const ast = parse(
      [
        'primary.bg: #2271C1',
        'primary.col: white',
        'danger.bg: #ef4444',
        '',
        'Card: bg #1a1a1a, pad 16',
        'Btn: pad 10 20, rad 6',
      ].join('\n')
    )
    const r = collectPreludeDefinitions(ast)
    // Roots: primary, danger. Base names: primary.bg, primary.col, danger.bg.
    expect(r.preludeTokens.has('primary')).toBe(true)
    expect(r.preludeTokens.has('primary.bg')).toBe(true)
    expect(r.preludeTokens.has('primary.col')).toBe(true)
    expect(r.preludeTokens.has('danger')).toBe(true)
    expect(r.preludeTokens.has('danger.bg')).toBe(true)
    expect(r.preludeTokens.size).toBe(5)
    expect(r.preludeComponents.has('Card')).toBe(true)
    expect(r.preludeComponents.has('Btn')).toBe(true)
    expect(r.preludeComponents.size).toBe(2)
  })
})

/**
 * buildComponentPrimitives — pure-function tests.
 *
 * Pin the Name → primitive shape that the editor icon-trigger consumes,
 * so future refactors of `compile()` move the slice without regression.
 *
 * Important parser quirk pinned here: the parser sets `comp.primitive`
 * to `'Frame'` by default (never null for parsed components). The
 * `comp.primitive || comp.name.toLowerCase()` fallback in the helper
 * lives only for manually-constructed ComponentDefinition objects
 * where `primitive` is explicitly `null` — `null-fallback`-test below.
 */

import { describe, it, expect } from 'vitest'
import type { ComponentDefinition } from '../../compiler/parser/ast'
import { parse } from '../../compiler/parser'
import { buildComponentPrimitives } from '../../studio/compile/component-primitives'

describe('buildComponentPrimitives', () => {
  it('returns an empty map when AST has no components', () => {
    const ast = parse('// no components')
    const m = buildComponentPrimitives(ast.components, new Map())
    expect(m.size).toBe(0)
  })

  it('uses `primitive` when the component has `as <Primitive>`', () => {
    const ast = parse('PrimaryBtn as Button: bg #2271C1, col white')
    const m = buildComponentPrimitives(ast.components, new Map())
    expect(m.get('PrimaryBtn')).toBe('Button')
  })

  it('uses parser-default `Frame` when no `as` clause is given', () => {
    const ast = parse('Card: bg #1a1a1a, pad 16')
    const m = buildComponentPrimitives(ast.components, new Map())
    // Parser auto-assigns primitive='Frame' for definitions without
    // an `as` clause — pin so we notice if the parser ever changes.
    expect(m.get('Card')).toBe('Frame')
  })

  it('falls back to lowercased name when `primitive` is explicitly null', () => {
    // Manually-constructed ComponentDefinition with primitive=null.
    // The parser never produces this shape today, but the type signature
    // (`primitive: string | null`) makes it possible — pin the fallback.
    const comp = {
      type: 'Component',
      name: 'CustomNode',
      primitive: null,
      extends: null,
      properties: [],
      states: [],
      events: [],
      children: [],
    } as unknown as ComponentDefinition
    const m = buildComponentPrimitives([comp], new Map())
    expect(m.get('CustomNode')).toBe('customnode')
  })

  it('clears prior entries on the target map (Map identity preserved)', () => {
    const ast = parse('Card: bg #1a1a1a, pad 16')
    const target = new Map<string, string>([['Stale', 'frame']])
    const returned = buildComponentPrimitives(ast.components, target)
    expect(returned).toBe(target) // same Map reference
    expect(target.has('Stale')).toBe(false)
    expect(target.get('Card')).toBe('Frame')
    expect(target.size).toBe(1)
  })

  it('handles multiple components with mixed `as`-clauses', () => {
    const ast = parse(
      [
        'PrimaryBtn as Button: bg #2271C1, col white',
        'DangerBtn as Button: bg #ef4444, col white',
        'Card: bg #1a1a1a, pad 16',
      ].join('\n')
    )
    const m = buildComponentPrimitives(ast.components, new Map())
    expect(m.get('PrimaryBtn')).toBe('Button')
    expect(m.get('DangerBtn')).toBe('Button')
    expect(m.get('Card')).toBe('Frame')
    expect(m.size).toBe(3)
  })

  it('is idempotent across repeated calls with the same AST', () => {
    const ast = parse('Btn: pad 10 20, rad 6')
    const target = new Map<string, string>()
    buildComponentPrimitives(ast.components, target)
    buildComponentPrimitives(ast.components, target)
    expect(target.size).toBe(1)
    expect(target.get('Btn')).toBe('Frame')
  })
})

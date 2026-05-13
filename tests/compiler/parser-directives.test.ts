/**
 * Parser Component Directive Tests
 *
 * Tests parsing of `@directives` (component metadata) that precede a
 * component definition. Whitelist: `@icon <name>`, `@group <name>`,
 * `@hidden`. Studio-side only — does not affect IR/backends.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'

describe('Parser: Component Directives (@icon / @group / @hidden)', () => {
  it('attaches @icon directive to the next component', () => {
    const ast = parse('@icon home\nCard as frame:')
    expect(ast.components[0].name).toBe('Card')
    expect(ast.components[0].metadata).toEqual({ icon: 'home' })
  })

  it('attaches @group directive to the next component', () => {
    const ast = parse('@group Forms\nBtn as button:')
    expect(ast.components[0].metadata).toEqual({ group: 'Forms' })
  })

  it('attaches @hidden directive (flag, no value)', () => {
    const ast = parse('@hidden\nInternalRow as frame:')
    expect(ast.components[0].metadata).toEqual({ hidden: true })
  })

  it('combines multiple directives on consecutive lines', () => {
    const ast = parse('@icon mouse-pointer\n@group Forms\nBtn as button:')
    expect(ast.components[0].metadata).toEqual({
      icon: 'mouse-pointer',
      group: 'Forms',
    })
  })

  it('combines multiple directives on a single comma-separated line', () => {
    const ast = parse('@icon mouse-pointer, @group Forms\nBtn as button:')
    expect(ast.components[0].metadata).toEqual({
      icon: 'mouse-pointer',
      group: 'Forms',
    })
  })

  it('combines comma-form + @hidden flag', () => {
    const ast = parse('@hidden, @group Internal\nHelper as frame:')
    expect(ast.components[0].metadata).toEqual({
      hidden: true,
      group: 'Internal',
    })
  })

  it('works with default-primitive component (no `as`)', () => {
    const ast = parse('@icon star\nFav:')
    expect(ast.components[0].name).toBe('Fav')
    expect(ast.components[0].metadata).toEqual({ icon: 'star' })
  })

  it('works with extends-component', () => {
    const ast = parse('Base as frame:\n  pad 12\n@icon star\nFancy extends Base:\n  pad 16')
    expect(ast.components[1].name).toBe('Fancy')
    expect(ast.components[1].metadata).toEqual({ icon: 'star' })
  })

  it('directives only attach to the IMMEDIATELY following component', () => {
    const ast = parse('@icon home\nCardA as frame:\n  pad 4\nCardB as frame:\n  pad 8')
    expect(ast.components[0].name).toBe('CardA')
    expect(ast.components[0].metadata).toEqual({ icon: 'home' })
    expect(ast.components[1].name).toBe('CardB')
    expect(ast.components[1].metadata).toBeUndefined()
  })

  it('drops buffered directives when a non-component statement follows', () => {
    // @icon followed by a token definition (not a component) — buffer must
    // NOT silently attach to a later, unrelated component.
    const ast = parse('@icon home\nspace: 16\nCard as frame:')
    expect(ast.components[0].metadata).toBeUndefined()
  })

  it('emits a parse error for unknown directive names', () => {
    const ast = parse('@xyz home\nCard as frame:')
    expect(ast.errors?.some(e => /Unknown directive/.test(e.message))).toBe(true)
  })

  it('emits a parse error for @icon without value', () => {
    const ast = parse('@icon\nCard as frame:')
    expect(ast.errors?.some(e => /expects a value/.test(e.message))).toBe(true)
  })

  it('component without any directives has metadata=undefined', () => {
    const ast = parse('Card as frame:')
    expect(ast.components[0].metadata).toBeUndefined()
  })
})

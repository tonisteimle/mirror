/**
 * Data-Binding & Each — Coverage-Tests (Thema 9)
 *
 * Direct unit tests against the pure-function modules:
 * - `compiler/ir/transformers/data-transformer.ts` (29.7% before)
 * - `compiler/ir/transformers/loop-utils.ts` (52.6% before)
 * - `compiler/parser/data-types.ts` (33.3% before)
 *
 * These three modules are well-suited for direct unit tests because every
 * exported function is pure (no shared state, no side effects).
 */

import { describe, it, expect } from 'vitest'
import {
  transformDataAttributes,
  transformDataValue,
  transformAnimation,
  transformAnimationKeyframe,
  transformAnimationProperty,
  convertStateDependency,
  convertStateAnimation,
} from '../../compiler/ir/transformers/data-transformer'
import {
  markLoopVariablesInFilter,
  fixLoopVariableReferences,
} from '../../compiler/ir/transformers/loop-utils'
import {
  isDataArray,
  isDataNumber,
  isDataBoolean,
  isDataString,
  isDataReference,
  isDataReferenceArray,
} from '../../compiler/parser/data-types'

// =============================================================================
// data-types — type guards
// =============================================================================

describe('data-types — type guards', () => {
  it('isDataArray identifies arrays', () => {
    expect(isDataArray(['a', 'b'])).toBe(true)
    expect(isDataArray('not an array')).toBe(false)
    expect(isDataArray(42)).toBe(false)
  })

  it('isDataNumber identifies numbers', () => {
    expect(isDataNumber(42)).toBe(true)
    expect(isDataNumber('42')).toBe(false)
    expect(isDataNumber(true)).toBe(false)
  })

  it('isDataBoolean identifies booleans', () => {
    expect(isDataBoolean(true)).toBe(true)
    expect(isDataBoolean(false)).toBe(true)
    expect(isDataBoolean('true')).toBe(false)
    expect(isDataBoolean(1)).toBe(false)
  })

  it('isDataString identifies strings', () => {
    expect(isDataString('hello')).toBe(true)
    expect(isDataString('')).toBe(true)
    expect(isDataString(42)).toBe(false)
    expect(isDataString(['a'])).toBe(false)
  })

  it('isDataReference identifies reference objects', () => {
    expect(isDataReference({ kind: 'reference', collection: 'todos', entry: 't1' })).toBe(true)
    expect(isDataReference({ kind: 'referenceArray', references: [] })).toBe(false)
    expect(isDataReference('string')).toBe(false)
    expect(isDataReference(null as any)).toBe(false)
  })

  it('isDataReferenceArray identifies referenceArray objects', () => {
    expect(isDataReferenceArray({ kind: 'referenceArray', references: [] })).toBe(true)
    expect(isDataReferenceArray({ kind: 'reference' } as any)).toBe(false)
  })
})

// =============================================================================
// data-transformer — transformDataValue
// =============================================================================

describe('data-transformer — transformDataValue', () => {
  it('passes through string primitive', () => {
    expect(transformDataValue('hello')).toBe('hello')
  })

  it('passes through number primitive', () => {
    expect(transformDataValue(42)).toBe(42)
  })

  it('passes through boolean primitive', () => {
    expect(transformDataValue(true)).toBe(true)
    expect(transformDataValue(false)).toBe(false)
  })

  it('preserves string array', () => {
    expect(transformDataValue(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('transforms reference into IR-shaped {__ref, collection, entry}', () => {
    const result = transformDataValue({
      kind: 'reference',
      collection: 'todos',
      entry: 't1',
    } as any)
    expect(result).toEqual({ __ref: true, collection: 'todos', entry: 't1' })
  })

  it('transforms referenceArray into IR-shaped {__refArray, references[]}', () => {
    const result = transformDataValue({
      kind: 'referenceArray',
      references: [
        { collection: 'todos', entry: 't1' },
        { collection: 'todos', entry: 't2' },
      ],
    } as any)
    expect(result).toMatchObject({
      __refArray: true,
      references: [
        { __ref: true, collection: 'todos', entry: 't1' },
        { __ref: true, collection: 'todos', entry: 't2' },
      ],
    })
  })
})

// =============================================================================
// data-transformer — transformDataAttributes
// =============================================================================

describe('data-transformer — transformDataAttributes', () => {
  it('produces empty object for empty attrs array', () => {
    expect(transformDataAttributes([])).toEqual({})
  })

  it('flat object with primitives', () => {
    const result = transformDataAttributes([
      { key: 'name', value: 'Max' } as any,
      { key: 'age', value: 42 } as any,
      { key: 'active', value: true } as any,
    ])
    expect(result).toEqual({ name: 'Max', age: 42, active: true })
  })

  it('nested object via children property', () => {
    const result = transformDataAttributes([
      {
        key: 'user',
        children: [
          { key: 'name', value: 'Max' },
          { key: 'email', value: 'max@example.com' },
        ],
      } as any,
    ])
    expect(result).toEqual({ user: { name: 'Max', email: 'max@example.com' } })
  })

  it('skips attribute without value or children', () => {
    const result = transformDataAttributes([
      { key: 'empty' } as any,
      { key: 'has', value: 'X' } as any,
    ])
    expect(result).toEqual({ has: 'X' })
  })
})

// =============================================================================
// data-transformer — animation transformation
// =============================================================================

describe('data-transformer — animation', () => {
  it('transformAnimationProperty: opacity stays simple', () => {
    const result = transformAnimationProperty({ name: 'opacity', value: 0.5 } as any)
    expect(result.property).toBe('opacity')
    expect(result.value).toBe('0.5')
  })

  it('transformAnimationProperty: y-offset → transform translateY(Npx)', () => {
    const result = transformAnimationProperty({ name: 'y-offset', value: 20 } as any)
    expect(result.property).toBe('transform')
    expect(result.value).toBe('translateY(20px)')
  })

  it('transformAnimationProperty: x-offset → transform translateX(Npx)', () => {
    const result = transformAnimationProperty({ name: 'x-offset', value: 30 } as any)
    expect(result.property).toBe('transform')
    expect(result.value).toBe('translateX(30px)')
  })

  it('transformAnimationProperty: scale → transform scale(N)', () => {
    const result = transformAnimationProperty({ name: 'scale', value: 1.5 } as any)
    expect(result.property).toBe('transform')
    expect(result.value).toBe('scale(1.5)')
  })

  it('transformAnimationProperty: rotate → transform rotate(Ndeg)', () => {
    const result = transformAnimationProperty({ name: 'rotate', value: 90 } as any)
    expect(result.property).toBe('transform')
    expect(result.value).toBe('rotate(90deg)')
  })

  it('transformAnimationProperty: width with numeric value adds px', () => {
    const result = transformAnimationProperty({ name: 'width', value: 200 } as any)
    expect(result.property).toBe('width')
    expect(result.value).toBe('200px')
  })

  it('transformAnimationProperty: height numeric adds px', () => {
    const result = transformAnimationProperty({ name: 'height', value: 100 } as any)
    expect(result.value).toBe('100px')
  })

  it('transformAnimationProperty: border-radius numeric adds px', () => {
    const result = transformAnimationProperty({ name: 'border-radius', value: 8 } as any)
    expect(result.value).toBe('8px')
  })

  it('transformAnimationProperty: bg alias → background', () => {
    const result = transformAnimationProperty({ name: 'bg', value: '#f00' } as any)
    expect(result.property).toBe('background')
  })

  it('transformAnimationProperty: col alias → color', () => {
    const result = transformAnimationProperty({ name: 'col', value: '#fff' } as any)
    expect(result.property).toBe('color')
  })

  it('transformAnimationProperty: target marker is preserved', () => {
    const result = transformAnimationProperty({
      name: 'opacity',
      value: 1,
      target: 'all',
    } as any)
    expect(result.target).toBe('all')
  })

  it('transformAnimationKeyframe: maps time + properties', () => {
    const kf = transformAnimationKeyframe({
      time: 0.5,
      properties: [{ name: 'opacity', value: 0.5 }],
    } as any)
    expect(kf.time).toBe(0.5)
    expect(kf.properties).toHaveLength(1)
    expect(kf.properties[0].property).toBe('opacity')
  })

  it('transformAnimation: full structure with default easing', () => {
    const anim = transformAnimation({
      name: 'Pulse',
      keyframes: [],
    } as any)
    expect(anim.name).toBe('Pulse')
    expect(anim.easing).toBe('ease') // default
    expect(anim.keyframes).toEqual([])
  })

  it('transformAnimation: explicit easing preserved', () => {
    const anim = transformAnimation({
      name: 'A',
      easing: 'linear',
      keyframes: [],
    } as any)
    expect(anim.easing).toBe('linear')
  })

  it('transformAnimation: roles array preserved', () => {
    const anim = transformAnimation({
      name: 'A',
      roles: ['enter', 'exit'],
      keyframes: [],
    } as any)
    expect(anim.roles).toEqual(['enter', 'exit'])
  })
})

// =============================================================================
// data-transformer — state conversion
// =============================================================================

describe('data-transformer — state conversion', () => {
  it('convertStateDependency: bare target/state', () => {
    const result = convertStateDependency({ target: 'Btn', state: 'open' } as any)
    expect(result).toEqual({ target: 'Btn', state: 'open' })
  })

  it('convertStateDependency: with condition', () => {
    const result = convertStateDependency({
      target: 'Btn',
      state: 'open',
      condition: 'count > 5',
    } as any)
    expect(result).toMatchObject({ target: 'Btn', state: 'open', condition: 'count > 5' })
  })

  it('convertStateDependency: chained next dependency (recursion)', () => {
    const result = convertStateDependency({
      target: 'Btn',
      state: 'open',
      next: { target: 'Drawer', state: 'visible' },
    } as any)
    expect(result.next).toEqual({ target: 'Drawer', state: 'visible' })
  })

  it('convertStateAnimation: preset only', () => {
    const result = convertStateAnimation({ preset: 'fade-in' } as any)
    expect(result).toEqual({ preset: 'fade-in' })
  })

  it('convertStateAnimation: full set (preset/duration/easing/delay)', () => {
    const result = convertStateAnimation({
      preset: 'slide-up',
      duration: 300,
      easing: 'ease-out',
      delay: 50,
    } as any)
    expect(result).toEqual({
      preset: 'slide-up',
      duration: 300,
      easing: 'ease-out',
      delay: 50,
    })
  })

  it('convertStateAnimation: empty object yields empty result', () => {
    const result = convertStateAnimation({} as any)
    expect(result).toEqual({})
  })
})

// =============================================================================
// loop-utils — markLoopVariablesInFilter
// =============================================================================

describe('loop-utils — markLoopVariablesInFilter', () => {
  it('marks bare item-var occurrences', () => {
    expect(markLoopVariablesInFilter('entry == $filter', 'entry')).toContain('__loopVar:entry')
  })

  it('marks dotted item-var paths', () => {
    expect(markLoopVariablesInFilter('entry.project == $filter', 'entry')).toContain(
      '__loopVar:entry'
    )
  })

  it('does not match partial words (re-entry should stay)', () => {
    const result = markLoopVariablesInFilter('reentry > 0', 'entry')
    expect(result).toBe('reentry > 0')
  })

  it('marks index var when present', () => {
    expect(markLoopVariablesInFilter('i > 0', 'item', 'i')).toContain('__loopVar:i')
  })

  it('handles operators (== / != / && / ||)', () => {
    expect(markLoopVariablesInFilter('item != null', 'item')).toContain('__loopVar:item')
    expect(markLoopVariablesInFilter('item && other', 'item')).toContain('__loopVar:item')
  })

  it('handles "and"/"or" as Mirror keywords', () => {
    expect(markLoopVariablesInFilter('item and other', 'item')).toContain('__loopVar:item')
    expect(markLoopVariablesInFilter('item or other', 'item')).toContain('__loopVar:item')
  })

  it('escapes regex-special chars in item var name', () => {
    // unusual but should not crash
    expect(() => markLoopVariablesInFilter('foo == 1', 'foo$1')).not.toThrow()
  })
})

// =============================================================================
// loop-utils — fixLoopVariableReferences
// =============================================================================

describe('loop-utils — fixLoopVariableReferences', () => {
  function makeNode(overrides: Partial<any> = {}): any {
    return {
      properties: [],
      children: [],
      ...overrides,
    }
  }

  it('initialState matching item var → textContent property', () => {
    const node = makeNode({ initialState: 'item' })
    fixLoopVariableReferences(node, 'item')
    expect(node.initialState).toBeUndefined()
    expect(node.properties).toContainEqual({ name: 'textContent', value: '$item' })
  })

  it('initialState with $ prefix is also handled', () => {
    const node = makeNode({ initialState: '$item' })
    fixLoopVariableReferences(node, 'item')
    expect(node.initialState).toBeUndefined()
    expect(node.properties).toContainEqual({ name: 'textContent', value: '$item' })
  })

  it('initialState matching index var (with index variable provided)', () => {
    const node = makeNode({ initialState: 'i' })
    fixLoopVariableReferences(node, 'item', 'i')
    expect(node.initialState).toBeUndefined()
    expect(node.properties).toContainEqual({ name: 'textContent', value: '$i' })
  })

  it('initialState with dot-notation (item.name) becomes textContent: $item.name', () => {
    const node = makeNode({ initialState: 'item.name' })
    fixLoopVariableReferences(node, 'item')
    expect(node.initialState).toBeUndefined()
    expect(node.properties).toContainEqual({ name: 'textContent', value: '$item.name' })
  })

  it('initialState with dot-notation already prefixed ($item.email) is kept verbatim', () => {
    const node = makeNode({ initialState: '$item.email' })
    fixLoopVariableReferences(node, 'item')
    expect(node.initialState).toBeUndefined()
    expect(node.properties).toContainEqual({ name: 'textContent', value: '$item.email' })
  })

  it('non-matching initialState is left untouched', () => {
    const node = makeNode({ initialState: 'open' })
    fixLoopVariableReferences(node, 'item')
    expect(node.initialState).toBe('open')
    expect(node.properties).toEqual([])
  })

  it('node without initialState stays unchanged', () => {
    const node = makeNode()
    fixLoopVariableReferences(node, 'item')
    expect(node.properties).toEqual([])
  })

  it('children are recursively processed', () => {
    const node = makeNode({
      children: [makeNode({ initialState: 'item' }), makeNode({ initialState: 'item.name' })],
    })
    fixLoopVariableReferences(node, 'item')
    expect(node.children[0].initialState).toBeUndefined()
    expect(node.children[0].properties).toContainEqual({ name: 'textContent', value: '$item' })
    expect(node.children[1].properties).toContainEqual({
      name: 'textContent',
      value: '$item.name',
    })
  })
})

/**
 * Component Resolver — Direct unit tests for inheritance + state/slot merging
 *
 * `compiler/ir/transformers/component-resolver.ts` was 75.6% Lines.
 * The mergeSlots branch (parentSlots/childSlots edge cases) was uncovered.
 */

import { describe, it, expect } from 'vitest'
import { resolveComponent, mergeStates } from '../../compiler/ir/transformers/component-resolver'
import type { ComponentDefinition, State } from '../../compiler/parser/ast'

function makeComponent(
  name: string,
  options: Partial<ComponentDefinition> = {}
): ComponentDefinition {
  return {
    type: 'ComponentDefinition' as const,
    name,
    primitive: undefined,
    extends: undefined,
    properties: [],
    states: [],
    events: [],
    children: [],
    line: 1,
    column: 1,
    ...options,
  } as ComponentDefinition
}

function makeState(name: string, props: any[] = []): State {
  return {
    type: 'State' as const,
    name,
    properties: props,
    childOverrides: [],
    line: 1,
    column: 1,
  } as State
}

// =============================================================================
// resolveComponent — inheritance chains
// =============================================================================

describe('resolveComponent — basic inheritance', () => {
  it('component with no extends/primitive returns itself', () => {
    const comp = makeComponent('Foo')
    const map = new Map<string, ComponentDefinition>([['Foo', comp]])
    const result = resolveComponent(comp, { componentMap: map })
    expect(result.name).toBe('Foo')
  })

  it('explicit extends merges parent properties', () => {
    const parent = makeComponent('Parent', {
      properties: [{ type: 'Property', name: 'pad', values: [16], line: 1, column: 1 } as any],
    })
    const child = makeComponent('Child', { extends: 'Parent' })
    const map = new Map([
      ['Parent', parent],
      ['Child', child],
    ])
    const result = resolveComponent(child, { componentMap: map })
    expect(result.properties.find(p => p.name === 'pad')).toBeTruthy()
  })

  it('child property overrides parent property of same name', () => {
    const parent = makeComponent('Parent', {
      properties: [{ type: 'Property', name: 'bg', values: ['#fff'], line: 1, column: 1 } as any],
    })
    const child = makeComponent('Child', {
      extends: 'Parent',
      properties: [{ type: 'Property', name: 'bg', values: ['#000'], line: 1, column: 1 } as any],
    })
    const map = new Map([
      ['Parent', parent],
      ['Child', child],
    ])
    const result = resolveComponent(child, { componentMap: map })
    const bg = result.properties.find(p => p.name === 'bg')
    expect(bg?.values[0]).toBe('#000')
  })

  it('inheritance via primitive (when primitive is a known component)', () => {
    const base = makeComponent('Base', {
      primitive: 'div',
      properties: [{ type: 'Property', name: 'pad', values: [8], line: 1, column: 1 } as any],
    })
    const child = makeComponent('Variant', { primitive: 'Base' })
    const map = new Map([
      ['Base', base],
      ['Variant', child],
    ])
    const result = resolveComponent(child, { componentMap: map })
    // Primitive resolves to base's primitive (div), and base's pad inherited
    expect(result.primitive).toBe('div')
    expect(result.properties.find(p => p.name === 'pad')).toBeTruthy()
  })

  it('extends to non-existent component returns child unchanged', () => {
    const child = makeComponent('Child', { extends: 'Missing' })
    const map = new Map([['Child', child]])
    const result = resolveComponent(child, { componentMap: map })
    expect(result).toBe(child)
  })

  it('circular inheritance is detected and warns, returns unresolved', () => {
    const a = makeComponent('A', { extends: 'B' })
    const b = makeComponent('B', { extends: 'A' })
    const map = new Map([
      ['A', a],
      ['B', b],
    ])
    const warnings: any[] = []
    const result = resolveComponent(a, {
      componentMap: map,
      addWarning: w => warnings.push(w),
    })
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings[0].type).toBe('circular-inheritance')
    // Returns something to break the cycle
    expect(result).toBeTruthy()
  })

  it('three-level inheritance chain (A extends B extends C)', () => {
    const c = makeComponent('C', {
      properties: [{ type: 'Property', name: 'rad', values: [4], line: 1, column: 1 } as any],
    })
    const b = makeComponent('B', { extends: 'C' })
    const a = makeComponent('A', { extends: 'B' })
    const map = new Map([
      ['A', a],
      ['B', b],
      ['C', c],
    ])
    const result = resolveComponent(a, { componentMap: map })
    expect(result.properties.find(p => p.name === 'rad')?.values[0]).toBe(4)
  })
})

// =============================================================================
// mergeStates
// =============================================================================

describe('mergeStates', () => {
  it('parent and child states with different names → both kept', () => {
    const parent = [makeState('hover', [])]
    const child = [makeState('focus', [])]
    const merged = mergeStates(parent, child)
    expect(merged).toHaveLength(2)
    const names = merged.map(s => s.name).sort()
    expect(names).toEqual(['focus', 'hover'])
  })

  it('child state overrides parent state of same name (properties merged)', () => {
    const parent = [
      makeState('hover', [
        { type: 'Property', name: 'bg', values: ['#fff'], line: 1, column: 1 } as any,
      ]),
    ]
    const child = [
      makeState('hover', [
        { type: 'Property', name: 'bg', values: ['#000'], line: 1, column: 1 } as any,
      ]),
    ]
    const merged = mergeStates(parent, child)
    expect(merged).toHaveLength(1)
    expect(merged[0].properties.find(p => p.name === 'bg')?.values[0]).toBe('#000')
  })

  it('states with null/empty name are skipped', () => {
    const parent = [makeState('', [])]
    const child = [makeState('hover', [])]
    const merged = mergeStates(parent, child)
    expect(merged).toHaveLength(1)
    expect(merged[0].name).toBe('hover')
  })

  it('empty parent + child → returns child', () => {
    const merged = mergeStates([], [makeState('hover', [])])
    expect(merged).toHaveLength(1)
  })

  it('parent + empty child → returns parent', () => {
    const merged = mergeStates([makeState('hover', [])], [])
    expect(merged).toHaveLength(1)
  })

  it('both empty → returns empty', () => {
    expect(mergeStates([], [])).toEqual([])
  })

  it('child overrides preserve childOverrides from parent', () => {
    const parent = [
      {
        ...makeState('hover'),
        childOverrides: [{ type: 'p1' }],
      } as any,
    ]
    const child = [
      {
        ...makeState('hover'),
        childOverrides: [{ type: 'c1' }],
      } as any,
    ]
    const merged = mergeStates(parent, child)
    expect(merged[0].childOverrides).toHaveLength(2)
  })
})

/**
 * augment-local-components — pure-function tests.
 *
 * Pin the local-component preview semantics so the compile()
 * decomposition can refactor with confidence.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import {
  findUninstancedComponents,
  appendImplicitInstances,
} from '../../studio/compile/augment-local-components'

function ast(src: string) {
  return parse(src)
}

describe('findUninstancedComponents', () => {
  it('returns names defined locally but not instanced anywhere', () => {
    const local = ast('Card:\n  bg #fff\n\nBtn:\n  pad 10')
    const full = ast('Card:\n  bg #fff\n\nBtn:\n  pad 10\n\nBtn "Save"')
    expect(findUninstancedComponents(full, local)).toEqual(['Card'])
  })

  it('returns all when none are instanced', () => {
    const local = ast('Card:\n  bg #fff\n\nBtn:\n  pad 10')
    const full = ast('Card:\n  bg #fff\n\nBtn:\n  pad 10')
    expect(findUninstancedComponents(full, local).sort()).toEqual(['Btn', 'Card'])
  })

  it('returns empty when all locally-defined components are instanced', () => {
    const local = ast('Card:\n  bg #fff')
    const full = ast('Card:\n  bg #fff\n\nCard')
    expect(findUninstancedComponents(full, local)).toEqual([])
  })

  // Top-level Each must NOT be treated as a component instantiation. It is
  // a separate AST variant (`Each`, not `Instance`); the type-narrow guard
  // in the helper is what keeps it out of the instanced-set.
  it('ignores non-Instance entries (Each, Slot) when computing instanced set', () => {
    const local = ast('Card:\n  Title')
    const full = ast(
      `tasks:\n  t1:\n    title: "A"\n\nCard:\n  Title\n\neach task in $tasks\n  Text task.title`
    )
    expect(findUninstancedComponents(full, local)).toEqual(['Card'])
  })

  it('returns empty when local AST has no components', () => {
    const local = ast('Frame bg #fff')
    const full = ast('Frame bg #fff')
    expect(findUninstancedComponents(full, local)).toEqual([])
  })
})

describe('appendImplicitInstances', () => {
  it('returns the source unchanged for an empty component list', () => {
    expect(appendImplicitInstances('Frame', [])).toBe('Frame')
  })

  it('appends a marker comment + one line per component', () => {
    const out = appendImplicitInstances('Frame', ['Card', 'Btn'])
    expect(out).toBe('Frame\n\n// Auto-preview local components\nCard\nBtn')
  })

  it('keeps original prelude untouched', () => {
    const code = 'primary.bg: #2271C1\n\n// === app.mir ===\nApp\n  Frame'
    const out = appendImplicitInstances(code, ['Card'])
    expect(out.startsWith(code)).toBe(true)
    expect(out.endsWith('\nCard')).toBe(true)
  })
})

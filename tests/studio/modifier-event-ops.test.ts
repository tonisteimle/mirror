/**
 * CodeModifier event-ops integration: addEvent / removeEvent / updateEvent
 *  / setEventActions against real Mirror sources, with full pipeline-built
 * SourceMaps.
 *
 * setEventActions is the multi-action variant added for the property
 * panel — it replaces the FULL action chain so chained `, action(...)`
 * suffixes don't dangle.
 */

import { describe, it, expect } from 'vitest'
import { CodeModifier } from '../../studio/code-modifier/code-modifier'
import { toIR, type SourceMap } from '../../compiler/ir'
import { parse } from '../../compiler/parser/parser'

function buildModifier(source: string): { modifier: CodeModifier; sourceMap: SourceMap } {
  const ast = parse(source)
  const { sourceMap } = toIR(ast, true)
  const modifier = new CodeModifier(source, sourceMap)
  return { modifier, sourceMap }
}

function firstNodeId(sourceMap: SourceMap): string {
  for (const m of sourceMap.getAllNodes()) {
    if (m.componentName === 'Button') return m.nodeId
  }
  throw new Error('No Button node in source')
}

describe('setEventActions — single-action replacement', () => {
  it('replaces a single-action event with a new single action', () => {
    const src = 'Button "Save", onclick toggle()'
    const { modifier, sourceMap } = buildModifier(src)
    const id = firstNodeId(sourceMap)

    const result = modifier.setEventActions(id, 'onclick', 'show(Menu)')
    expect(result.success).toBe(true)
    expect(result.newSource).toBe('Button "Save", onclick show(Menu)')
  })

  it('returns error result for unknown nodeId', () => {
    const { modifier } = buildModifier('Button "Save", onclick toggle()')
    const result = modifier.setEventActions('does-not-exist', 'onclick', 'show()')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Node not found')
  })

  it('returns error result when the event is absent', () => {
    const { modifier, sourceMap } = buildModifier('Button "Save", onclick toggle()')
    const id = firstNodeId(sourceMap)
    const result = modifier.setEventActions(id, 'onhover', 'toggle()')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Event not found')
  })
})

describe('setEventActions — MULTI-action replacement', () => {
  it('replaces a single-action event with a chain (toggle(), show(Menu))', () => {
    const src = 'Button "Save", onclick toggle()'
    const { modifier, sourceMap } = buildModifier(src)
    const id = firstNodeId(sourceMap)

    const result = modifier.setEventActions(id, 'onclick', 'toggle(), show(Menu)')
    expect(result.success).toBe(true)
    expect(result.newSource).toBe('Button "Save", onclick toggle(), show(Menu)')
  })

  it('replaces an EXISTING multi-action chain with a different chain', () => {
    const src = 'Button "Save", onclick toggle(), show(Menu)'
    const { modifier, sourceMap } = buildModifier(src)
    const id = firstNodeId(sourceMap)

    const result = modifier.setEventActions(id, 'onclick', 'hide(Menu), focus(Input)')
    expect(result.success).toBe(true)
    expect(result.newSource).toBe('Button "Save", onclick hide(Menu), focus(Input)')
  })

  it('replacing a chain does NOT leave a dangling tail', () => {
    // Pre-fix: updateEvent only matched the first action and left
    // ", show(Menu)" hanging in the source.
    const src = 'Button "Save", onclick toggle(), show(Menu)'
    const { modifier, sourceMap } = buildModifier(src)
    const id = firstNodeId(sourceMap)

    const result = modifier.setEventActions(id, 'onclick', 'submit()')
    expect(result.success).toBe(true)
    expect(result.newSource).toBe('Button "Save", onclick submit()')
    expect(result.newSource).not.toContain('show(Menu)')
  })
})

describe('setEventActions — preserves surrounding properties', () => {
  it('keeps trailing comma-separated props after the event chain', () => {
    const src = 'Button "Save", pad 12, onclick toggle(), col white'
    const { modifier, sourceMap } = buildModifier(src)
    const id = firstNodeId(sourceMap)

    const result = modifier.setEventActions(id, 'onclick', 'show(Menu)')
    expect(result.success).toBe(true)
    expect(result.newSource).toBe('Button "Save", pad 12, onclick show(Menu), col white')
  })
})

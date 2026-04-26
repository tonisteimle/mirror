/**
 * IR Internals — Coverage for shared transformer helpers
 *
 * - `transformer-context.ts` (was 0%)
 * - `inline-extraction.ts` (was 41.93%)
 */

import { describe, it, expect } from 'vitest'
import { createSourcePosition } from '../../compiler/ir/transformers/transformer-context'
import { extractInlineStatesAndEvents } from '../../compiler/ir/transformers/inline-extraction'
import type { Instance, Property } from '../../compiler/parser/ast'

// =============================================================================
// transformer-context.ts
// =============================================================================

describe('createSourcePosition', () => {
  it('returns a SourcePosition with start = end at the given line/column', () => {
    const pos = createSourcePosition(5, 12)
    expect(pos.line).toBe(5)
    expect(pos.column).toBe(12)
    expect(pos.endLine).toBe(5)
    expect(pos.endColumn).toBe(12)
  })

  it('defaults to 0 when line/column omitted', () => {
    expect(createSourcePosition()).toEqual({ line: 0, column: 0, endLine: 0, endColumn: 0 })
  })

  it('handles partial args', () => {
    const pos = createSourcePosition(3)
    expect(pos.line).toBe(3)
    expect(pos.column).toBe(0)
  })
})

// =============================================================================
// extractInlineStatesAndEvents
// =============================================================================

const NOOP_CTX = {
  propertyToCSS: (prop: Property) => [
    { property: prop.name, value: String(prop.values?.[0] ?? '') },
  ],
}

function makeProperty(name: string, ...values: (string | number)[]): Property {
  return {
    type: 'Property',
    name,
    values,
    line: 1,
    column: 1,
  } as Property
}

function makeInstance(component: string, properties: Property[] = []): Instance {
  return {
    type: 'Instance',
    component,
    name: null,
    properties,
    children: [],
    line: 1,
    column: 1,
  } as Instance
}

describe('extractInlineStatesAndEvents — basic dispatch', () => {
  it('non-state, non-event children go to remainingChildren', () => {
    const child = makeInstance('Text', [makeProperty('content', 'Hello')])
    const result = extractInlineStatesAndEvents([child], NOOP_CTX)
    expect(result.remainingChildren).toHaveLength(1)
    expect(result.inlineStateStyles).toHaveLength(0)
    expect(result.inlineEvents).toHaveLength(0)
  })

  it('Text nodes are kept as remaining children', () => {
    const text = { type: 'Text' as const, content: 'X', line: 1, column: 1 }
    const result = extractInlineStatesAndEvents([text as any], NOOP_CTX)
    expect(result.remainingChildren).toEqual([text])
  })
})

describe('extractInlineStatesAndEvents — inline state syntax', () => {
  it('"state hover bg #333" emits an IRStyle with state="hover"', () => {
    // Synthesize the parser's representation: an Instance with component
    // "state" whose first property is the state-name (no value), and the rest
    // are styles.
    const stateInst = makeInstance('state', [makeProperty('hover'), makeProperty('bg', '#333')])
    const result = extractInlineStatesAndEvents([stateInst], NOOP_CTX)
    expect(result.inlineStateStyles).toHaveLength(1)
    expect(result.inlineStateStyles[0].state).toBe('hover')
    expect(result.inlineStateStyles[0].property).toBe('bg')
    expect(result.inlineStateStyles[0].value).toBe('#333')
  })

  it('inline state with no extra properties emits no styles', () => {
    const stateInst = makeInstance('state', [makeProperty('hover')])
    const result = extractInlineStatesAndEvents([stateInst], NOOP_CTX)
    expect(result.inlineStateStyles).toHaveLength(0)
  })

  it('inline state with no properties at all is silently skipped', () => {
    const stateInst = makeInstance('state', [])
    const result = extractInlineStatesAndEvents([stateInst], NOOP_CTX)
    expect(result.inlineStateStyles).toHaveLength(0)
    expect(result.remainingChildren).toHaveLength(0) // it's "consumed" as a state instance
  })
})

describe('extractInlineStatesAndEvents — inline event syntax', () => {
  it('"onclick toggle" emits an IREvent with name=click', () => {
    const eventInst = makeInstance('onclick', [makeProperty('toggle')])
    const result = extractInlineStatesAndEvents([eventInst], NOOP_CTX)
    expect(result.inlineEvents).toHaveLength(1)
    expect(result.inlineEvents[0].name).toBe('click')
    expect(result.inlineEvents[0].actions).toHaveLength(1)
    expect(result.inlineEvents[0].actions[0].type).toBe('toggle')
  })

  it('"onhover highlight" emits an IREvent with name=mouseenter', () => {
    const eventInst = makeInstance('onhover', [makeProperty('highlight')])
    const result = extractInlineStatesAndEvents([eventInst], NOOP_CTX)
    expect(result.inlineEvents).toHaveLength(1)
    expect(result.inlineEvents[0].actions[0].type).toBe('highlight')
  })

  it('inline event with no actions is silently skipped (no event emitted)', () => {
    const eventInst = makeInstance('onclick', [])
    const result = extractInlineStatesAndEvents([eventInst], NOOP_CTX)
    expect(result.inlineEvents).toHaveLength(0)
  })

  it('inline event with action target+args is parsed correctly', () => {
    // "onclick navigate(HomeView, replace)"
    const eventInst = makeInstance('onclick', [makeProperty('navigate', 'HomeView', 'replace')])
    const result = extractInlineStatesAndEvents([eventInst], NOOP_CTX)
    expect(result.inlineEvents[0].actions[0]).toEqual({
      type: 'navigate',
      target: 'HomeView',
      args: ['replace'],
    })
  })
})

describe('extractInlineStatesAndEvents — mixed children', () => {
  it('preserves order: state and event extracted, regular kept', () => {
    const stateInst = makeInstance('state', [makeProperty('hover'), makeProperty('bg', '#222')])
    const eventInst = makeInstance('onclick', [makeProperty('toggle')])
    const text = makeInstance('Text', [makeProperty('content', 'Hi')])
    const result = extractInlineStatesAndEvents([stateInst, eventInst, text], NOOP_CTX)
    expect(result.inlineStateStyles).toHaveLength(1)
    expect(result.inlineEvents).toHaveLength(1)
    expect(result.remainingChildren).toHaveLength(1)
    expect((result.remainingChildren[0] as Instance).component).toBe('Text')
  })
})

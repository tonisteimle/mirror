/**
 * Slot-Utils Tests
 *
 * `compiler/ir/transformers/slot-utils.ts` was 81.81% Lines, 50% Branches.
 * Specifically the Text-filler conversion path (lines 49-51) was uncovered.
 */

import { describe, it, expect } from 'vitest'
import {
  childOverridesToInstances,
  mergeSlotPropertiesIntoFiller,
} from '../../compiler/ir/transformers/slot-utils'
import type { ChildOverride, Instance, Text, Property } from '../../compiler/parser/ast'

function makeProperty(name: string, ...values: any[]): Property {
  return { type: 'Property', name, values, line: 1, column: 1 } as Property
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

function makeText(content: string): Text {
  return { type: 'Text', content, line: 1, column: 1 } as Text
}

// =============================================================================
// childOverridesToInstances
// =============================================================================

describe('childOverridesToInstances', () => {
  it('converts each override to an Instance with component=childName', () => {
    const overrides: ChildOverride[] = [
      { childName: 'Icon', properties: [makeProperty('content', 'home')] },
      { childName: 'Label', properties: [makeProperty('content', 'Home')] },
    ]
    const result = childOverridesToInstances(overrides)
    expect(result).toHaveLength(2)
    expect(result[0].component).toBe('Icon')
    expect(result[1].component).toBe('Label')
  })

  it('empty overrides returns empty array', () => {
    expect(childOverridesToInstances([])).toEqual([])
  })

  it('falls back to line/column 0 when properties have no position', () => {
    const overrides: ChildOverride[] = [{ childName: 'Icon', properties: [] }]
    const result = childOverridesToInstances(overrides)
    expect(result[0].line).toBe(0)
    expect(result[0].column).toBe(0)
  })
})

// =============================================================================
// mergeSlotPropertiesIntoFiller
// =============================================================================

describe('mergeSlotPropertiesIntoFiller', () => {
  it('no slot properties → returns filler unchanged', () => {
    const filler = makeInstance('Title', [makeProperty('content', 'X')])
    const result = mergeSlotPropertiesIntoFiller(filler, [])
    expect(result).toBe(filler)
  })

  it('Text filler is wrapped into a Text Instance with merged properties', () => {
    const filler = makeText('Hello')
    const slotProps = [makeProperty('fs', 16), makeProperty('col', 'white')]
    const result = mergeSlotPropertiesIntoFiller(filler, slotProps) as Instance
    expect(result.type).toBe('Instance')
    expect(result.component).toBe('Text')
    // Slot properties + content
    const propNames = result.properties.map(p => p.name).sort()
    expect(propNames).toContain('fs')
    expect(propNames).toContain('col')
    expect(propNames).toContain('content')
    const contentProp = result.properties.find(p => p.name === 'content')
    expect(contentProp?.values[0]).toBe('Hello')
  })

  it('Instance filler: filler property wins over slot property of same name', () => {
    const filler = makeInstance('Title', [makeProperty('col', '#000')])
    const slotProps = [makeProperty('col', '#fff'), makeProperty('fs', 16)]
    const result = mergeSlotPropertiesIntoFiller(filler, slotProps) as Instance
    // col stays #000 (filler), fs added (slot)
    const col = result.properties.find(p => p.name === 'col')
    expect(col?.values[0]).toBe('#000')
    expect(result.properties.find(p => p.name === 'fs')).toBeTruthy()
  })

  it('Instance filler with no overlapping props: all merged', () => {
    const filler = makeInstance('Title', [makeProperty('content', 'X')])
    const slotProps = [makeProperty('fs', 16), makeProperty('col', 'white')]
    const result = mergeSlotPropertiesIntoFiller(filler, slotProps) as Instance
    expect(result.properties).toHaveLength(3)
  })

  it('filler with hasContent (not Text but content property) is also wrapped', () => {
    // An Instance that has content prop should be detected as text-like via
    // hasContent guard (the slot-utils path)
    const filler = { ...makeInstance('Title'), content: 'Hi' } as any
    const slotProps = [makeProperty('fs', 16)]
    const result = mergeSlotPropertiesIntoFiller(filler, slotProps) as Instance
    // The wrap path should have been taken
    expect(result.component).toBe('Text')
  })
})

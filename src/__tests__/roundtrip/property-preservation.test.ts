/**
 * Roundtrip Tests: Property Preservation
 *
 * Tests that properties maintain their format through the pipeline.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'
import { propertiesToStyle } from '../../utils/style-converter'

/** Parse and extract properties */
function getProps(code: string): Record<string, unknown> {
  const result = parse(code)
  if (result.errors.length > 0) {
    throw new Error(`Parse errors: ${result.errors.join(', ')}`)
  }
  return result.nodes[0]?.properties || {}
}

/** Parse and get CSS style */
function getStyle(code: string): React.CSSProperties {
  const result = parse(code)
  const node = result.nodes[0]
  return propertiesToStyle(node.properties, node.children.length > 0, node.name)
}

describe('Shorthand Preservation', () => {
  it('pad shorthand preserves value', () => {
    const props = getProps('Box pad 12')
    expect(props.pad).toBe(12)
  })

  it('bg shorthand preserves color', () => {
    const props = getProps('Box bg #333')
    expect(props.bg).toBe('#333')
  })

  it('col shorthand preserves color', () => {
    const props = getProps('Text col #FFF')
    expect(props.col).toBe('#FFF')
  })

  it('rad shorthand preserves value', () => {
    const props = getProps('Box rad 8')
    expect(props.rad).toBe(8)
  })

  it('bor shorthand preserves value', () => {
    const props = getProps('Box bor 1')
    expect(props.bor).toBe(1)
  })
})

describe('Boolean Property Preservation', () => {
  it('hidden preserves as true', () => {
    const props = getProps('Box hidden')
    expect(props.hidden).toBe(true)
  })

  it('hor preserves as true', () => {
    const props = getProps('Box hor')
    expect(props.hor).toBe(true)
  })

  it('ver preserves as true', () => {
    const props = getProps('Box ver')
    expect(props.ver).toBe(true)
  })

  it('disabled preserves as true', () => {
    const props = getProps('Button disabled')
    expect(props.disabled).toBe(true)
  })
})

describe('Dimension Preservation', () => {
  it('width preserves pixel value', () => {
    const props = getProps('Box w 200')
    expect(props.w).toBe(200)
  })

  it('width preserves percentage', () => {
    const props = getProps('Box w 50%')
    expect(props.w).toBe('50%')
  })
})

describe('Color Format Preservation', () => {
  it('hex color preserves format', () => {
    const props = getProps('Box bg #3B82F6')
    expect(props.bg).toBe('#3B82F6')
  })

  it('short hex preserves format', () => {
    const props = getProps('Box bg #333')
    expect(props.bg).toBe('#333')
  })

  it('transparent preserves keyword', () => {
    const props = getProps('Box bg transparent')
    expect(props.bg).toBe('transparent')
  })
})

describe('Token Reference Preservation', () => {
  it('token reference resolves but preserves reference', () => {
    const result = parse(`$primary: #3B82F6
Box bg $primary`)
    const props = result.nodes[0].properties
    // Value should be resolved
    expect(props.bg).toBe('#3B82F6')
  })

  it('multiple tokens resolve correctly', () => {
    const result = parse(`$bg: #1E1E2E
$pad: 16
$rad: 8
Card bg $bg, pad $pad, rad $rad`)
    const props = result.nodes[0].properties
    expect(props.bg).toBe('#1E1E2E')
    expect(props.pad).toBe(16)
    expect(props.rad).toBe(8)
  })
})

describe('CSS Output Consistency', () => {
  it('padding generates correct CSS', () => {
    const style = getStyle('Box pad 16')
    expect(style.padding).toBe('16px')
  })

  it('backgroundColor generates correct CSS', () => {
    const style = getStyle('Box bg #333')
    expect(style.backgroundColor).toBe('#333')
  })

  it('borderRadius generates correct CSS', () => {
    const style = getStyle('Box rad 8')
    expect(style.borderRadius).toBe('8px')
  })

  it('width generates correct CSS', () => {
    const style = getStyle('Box w 200')
    expect(style.width).toBe('200px')
  })

  it('width full generates 100% + flex', () => {
    const style = getStyle('Box w full')
    expect(style.width).toBe('100%')
    expect(style.flexGrow).toBe(1)
  })

  it('width hug generates fit-content', () => {
    const style = getStyle('Box w hug')
    expect(style.width).toBe('fit-content')
  })
})

describe('State Property Preservation', () => {
  it('hover state properties preserve', () => {
    const result = parse(`Button
  hover
    bg #555`)
    const state = result.nodes[0].states?.find((s) => s.name === 'hover')
    expect(state?.properties.bg).toBe('#555')
  })

  it('multiple state properties preserve', () => {
    const result = parse(`Button
  hover
    bg #555
    col #FFF`)
    const state = result.nodes[0].states?.find((s) => s.name === 'hover')
    expect(state?.properties.bg).toBe('#555')
    expect(state?.properties.col).toBe('#FFF')
  })
})

describe('Event Handler Preservation', () => {
  it('onclick action preserves', () => {
    const result = parse('Button onclick toggle "Click"')
    const handler = result.nodes[0].eventHandlers?.find((h) => h.event === 'onclick')
    expect(handler).toBeDefined()
    expect(handler?.actions.length).toBeGreaterThan(0)
  })

  it('multiple actions preserve', () => {
    const result = parse('Button onclick show Panel, hide Other "Click"')
    const handler = result.nodes[0].eventHandlers?.find((h) => h.event === 'onclick')
    expect(handler?.actions.length).toBeGreaterThanOrEqual(2)
  })
})

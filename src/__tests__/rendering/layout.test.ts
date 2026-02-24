/**
 * V1 Rendering Tests: Layout
 *
 * Tests for flexbox and grid layout rendering.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'
import { propertiesToStyle } from '../../utils/style-converter'

function getStyle(dsl: string): React.CSSProperties {
  const result = parse(dsl)
  if (result.nodes.length === 0) return {}
  const node = result.nodes[0]
  return propertiesToStyle(node.properties, node.children.length > 0, node.name)
}

describe('Flexbox Layout', () => {
  it('default without children is inline-block', () => {
    const style = getStyle('Box')
    expect(style.display).toBe('inline-block')
  })

  it('with children becomes inline-flex', () => {
    const result = parse(`Box
  Child`)
    const style = propertiesToStyle(result.nodes[0].properties, true, 'Box')
    expect(style.display).toBe('inline-flex')
  })

  it('hor sets flex-direction row', () => {
    const style = getStyle('Box hor')
    expect(style.flexDirection).toBe('row')
  })

  it('ver sets flex-direction column', () => {
    const style = getStyle('Box ver')
    expect(style.flexDirection).toBe('column')
  })

  it('wrap enables flex-wrap', () => {
    const style = getStyle('Box wrap')
    expect(style.flexWrap).toBe('wrap')
  })

  it('grow sets flex-grow', () => {
    const style = getStyle('Box grow')
    expect(style.flexGrow).toBe(1)
  })
})

describe('Alignment', () => {
  it('center aligns both axes', () => {
    const style = getStyle('Box cen')
    expect(style.justifyContent).toBe('center')
    expect(style.alignItems).toBe('center')
  })

  it('between sets space-between', () => {
    const style = getStyle('Box between')
    expect(style.justifyContent).toBe('space-between')
  })
})

describe('Grid Layout', () => {
  it('grid 3 creates 3 columns', () => {
    const style = getStyle('Box grid 3')
    expect(style.display).toBe('grid')
    expect(style.gridTemplateColumns).toContain('repeat(3')
  })
})

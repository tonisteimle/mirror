/**
 * Tests for element width behavior - ensuring elements don't stretch
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'
import { propertiesToStyle } from '../utils/style-converter'
import { INTERNAL_NODES } from '../constants'

describe('Element width behavior', () => {
  it('Button with only text should use inline-block', () => {
    const result = parse('Button "Hello World"')
    const node = result.nodes[0]

    // Use the correct hasRealChildren logic
    const hasRealChildren = node.children.length > 0 &&
      node.children.some(child => child.name !== INTERNAL_NODES.TEXT)

    const style = propertiesToStyle(node.properties, hasRealChildren, node.name)

    console.log('Button style:', style)

    // Should have inline-block (not flex, not block)
    expect(style.display).toBe('inline-block')
  })

  it('Box with real children (ver layout) should use inline-flex', () => {
    const code = `Box ver col #252530 pad 20 rad 12 gap 8
  Label col #888 size 12 "Revenue"
  Value size 28 weight bold "2.7 Mio"`

    const result = parse(code)
    const node = result.nodes[0]

    // Box has Label and Value as children (real components, not just _text)
    const hasRealChildren = node.children.length > 0 &&
      node.children.some(child => child.name !== INTERNAL_NODES.TEXT)

    console.log('Box children:', node.children.map(c => c.name))
    console.log('hasRealChildren:', hasRealChildren)

    expect(hasRealChildren).toBe(true)

    const style = propertiesToStyle(node.properties, hasRealChildren, node.name)

    console.log('Box style:', style)

    // Should have inline-flex (not flex) to prevent full width
    expect(style.display).toBe('inline-flex')
    expect(style.flexDirection).toBe('column') // ver layout
  })

  it('Tile with Label and Value children should use inline-flex', () => {
    const code = `Tile ver col #3281d1 pad 20 rad 12 gap 8
  Label col #fff size 12 "Revenue"
  Value size 28 weight bold "2.7 Mio"`

    const result = parse(code)
    const node = result.nodes[0]

    const hasRealChildren = node.children.length > 0 &&
      node.children.some(child => child.name !== INTERNAL_NODES.TEXT)

    const style = propertiesToStyle(node.properties, hasRealChildren, node.name)

    console.log('Tile style:', style)

    // Should have inline-flex
    expect(style.display).toBe('inline-flex')
  })

  it('Grid container should use grid display', () => {
    const code = `Dashboard grid 3 gap 16
  Card "One"
  Card "Two"
  Card "Three"`

    const result = parse(code)
    const node = result.nodes[0]

    const hasRealChildren = node.children.length > 0 &&
      node.children.some(child => child.name !== INTERNAL_NODES.TEXT)

    const style = propertiesToStyle(node.properties, hasRealChildren, node.name)

    console.log('Grid style:', style)

    // Grid should use grid display
    expect(style.display).toBe('grid')
  })
})

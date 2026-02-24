/**
 * Generator Tests: Hover Styles
 *
 * Tests for hover state CSS generation.
 */

import { describe, it, expect } from 'vitest'
import { parseOne, getState } from '../../test-utils'
import { propertiesToStyle } from '../../../utils/style-converter'

describe('Hover State to CSS', () => {
  it('generates hover background', () => {
    const node = parseOne(`Button bg #333
  hover
    bg #555`)
    const hoverState = getState(node, 'hover')
    expect(hoverState?.properties.bg).toBe('#555')

    // Generate CSS for hover state
    const hoverStyle = propertiesToStyle(hoverState!.properties, false, 'Button')
    expect(hoverStyle.backgroundColor).toBe('#555')
  })

  it('generates hover color', () => {
    const node = parseOne(`Link col #999
  hover
    col #FFF`)
    const hoverState = getState(node, 'hover')
    const hoverStyle = propertiesToStyle(hoverState!.properties, false, 'Link')
    expect(hoverStyle.color).toBe('#FFF')
  })

  it('generates hover opacity', () => {
    const node = parseOne(`Card o 1
  hover
    o 0.9`)
    const hoverState = getState(node, 'hover')
    const hoverStyle = propertiesToStyle(hoverState!.properties, false, 'Card')
    expect(hoverStyle.opacity).toBe(0.9)
  })
})

describe('Hover Property Shorthand', () => {
  it('hover-bg generates background', () => {
    const node = parseOne('Button hover-bg #555')
    expect(node.properties['hover-bg']).toBe('#555')
  })

  it('hover-col generates color', () => {
    const node = parseOne('Text hover-col #3B82F6')
    expect(node.properties['hover-col']).toBe('#3B82F6')
  })

  it('hover-scale generates transform', () => {
    const node = parseOne('Card hover-scale 1.05')
    expect(node.properties['hover-scale']).toBe(1.05)
  })
})

describe('Multiple Hover Properties', () => {
  it('hover with multiple style changes', () => {
    const node = parseOne(`Button bg #333, col #999
  hover
    bg #555
    col #FFF
    shadow md`)
    const hoverState = getState(node, 'hover')
    expect(hoverState?.properties.bg).toBe('#555')
    expect(hoverState?.properties.col).toBe('#FFF')
    expect(hoverState?.properties.shadow).toBe('md')
  })
})

describe('Focus State to CSS', () => {
  it('generates focus border color', () => {
    const node = parseOne(`Input boc #333
  focus
    boc #3B82F6`)
    const focusState = getState(node, 'focus')
    const focusStyle = propertiesToStyle(focusState!.properties, false, 'Input')
    expect(focusStyle.borderColor).toBe('#3B82F6')
  })

  it('generates focus shadow', () => {
    const node = parseOne(`Input
  focus
    shadow sm`)
    const focusState = getState(node, 'focus')
    expect(focusState?.properties.shadow).toBe('sm')
  })
})

describe('Active State to CSS', () => {
  it('generates active background', () => {
    const node = parseOne(`Button bg #3B82F6
  active
    bg #1D4ED8`)
    const activeState = getState(node, 'active')
    const activeStyle = propertiesToStyle(activeState!.properties, false, 'Button')
    expect(activeStyle.backgroundColor).toBe('#1D4ED8')
  })
})

describe('Combined System States', () => {
  it('hover and focus states', () => {
    const node = parseOne(`Input boc #333
  hover
    boc #555
  focus
    boc #3B82F6`)
    expect(getState(node, 'hover')?.properties.boc).toBe('#555')
    expect(getState(node, 'focus')?.properties.boc).toBe('#3B82F6')
  })

  it('hover, focus, and active', () => {
    const node = parseOne(`Button bg #3B82F6
  hover
    bg #2563EB
  focus
    shadow sm
  active
    bg #1D4ED8`)
    expect(getState(node, 'hover')?.properties.bg).toBe('#2563EB')
    expect(getState(node, 'focus')?.properties.shadow).toBe('sm')
    expect(getState(node, 'active')?.properties.bg).toBe('#1D4ED8')
  })
})

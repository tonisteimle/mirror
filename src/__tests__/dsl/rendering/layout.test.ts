/**
 * DSL Layout Rendering Tests
 *
 * Tests for layout-related rendering:
 * - Flex layouts (horizontal, vertical)
 * - Grid layouts
 * - Alignment
 * - Distribution
 */

import { describe, it, expect, test } from 'vitest'
import { generate, generateAll, getStyle, getChildren } from '../../test-utils'
import { parse } from '../../../parser/parser'
import { generateReactElement } from '../../../generator/react-generator'

// ============================================
// Flex Direction
// ============================================

describe('Flex Direction', () => {
  describe('horizontal (row)', () => {
    it('hor sets flexDirection to row', () => {
      const style = getStyle(generate('Box hor'))
      expect(style.flexDirection).toBe('row')
    })

    it('horizontal (long form) sets flexDirection to row', () => {
      const style = getStyle(generate('Box horizontal'))
      expect(style.flexDirection).toBe('row')
    })
  })

  describe('vertical (column)', () => {
    it('ver sets flexDirection to column', () => {
      const style = getStyle(generate('Box ver'))
      expect(style.flexDirection).toBe('column')
    })

    it('vertical (long form) sets flexDirection to column', () => {
      const style = getStyle(generate('Box vertical'))
      expect(style.flexDirection).toBe('column')
    })

    it('default with children is column', () => {
      const dsl = `Box
  Child1
  Child2`
      const style = getStyle(generate(dsl))
      expect(style.flexDirection).toBe('column')
    })
  })
})

// ============================================
// Flex Properties
// ============================================

describe('Flex Properties', () => {
  describe('gap', () => {
    it('gap sets CSS gap property', () => {
      const style = getStyle(generate('Box gap 16'))
      expect(style.gap).toBe('16px')
    })
  })

  describe('wrap', () => {
    it('wrap sets flexWrap', () => {
      const style = getStyle(generate('Box wrap'))
      expect(style.flexWrap).toBe('wrap')
    })
  })

  describe('grow/fill', () => {
    it('grow sets flexGrow', () => {
      const style = getStyle(generate('Box grow'))
      expect(style.flexGrow).toBe(1)
    })

    it('fill sets flexGrow', () => {
      const style = getStyle(generate('Box fill'))
      expect(style.flexGrow).toBe(1)
    })
  })

  describe('shrink', () => {
    it('shrink sets flexShrink', () => {
      const style = getStyle(generate('Box shrink 0'))
      expect(style.flexShrink).toBe(0)
    })
  })
})

// ============================================
// Distribution
// ============================================

describe('Distribution', () => {
  describe('between', () => {
    it('between sets justifyContent to space-between', () => {
      const style = getStyle(generate('Box between'))
      expect(style.justifyContent).toBe('space-between')
    })

    it('hor between creates row with space-between', () => {
      const style = getStyle(generate('Box hor between'))
      expect(style.flexDirection).toBe('row')
      expect(style.justifyContent).toBe('space-between')
    })
  })
})

// ============================================
// Alignment - Absolute Positioning
// ============================================

describe('Alignment', () => {
  describe('in column layout', () => {
    // In column: hor-* = cross axis (alignItems), ver-* = main axis (justifyContent)
    test.each([
      ['ver hor-l', { alignItems: 'flex-start' }],
      ['ver hor-cen', { alignItems: 'center' }],
      ['ver hor-r', { alignItems: 'flex-end' }],
    ])('%s → %o', (input, expected) => {
      const style = getStyle(generate(`Box ${input}`))
      expect(style).toMatchObject(expected)
    })

    test.each([
      ['ver ver-t', { justifyContent: 'flex-start' }],
      ['ver ver-cen', { justifyContent: 'center' }],
      ['ver ver-b', { justifyContent: 'flex-end' }],
    ])('%s → %o (main axis)', (input, expected) => {
      const style = getStyle(generate(`Box ${input}`))
      expect(style).toMatchObject(expected)
    })
  })

  describe('in row layout', () => {
    // In row: hor-* = main axis (justifyContent), ver-* = cross axis (alignItems)
    test.each([
      ['hor hor-l', { justifyContent: 'flex-start' }],
      ['hor hor-cen', { justifyContent: 'center' }],
      ['hor hor-r', { justifyContent: 'flex-end' }],
    ])('%s → %o', (input, expected) => {
      const style = getStyle(generate(`Box ${input}`))
      expect(style).toMatchObject(expected)
    })

    test.each([
      ['hor ver-t', { alignItems: 'flex-start' }],
      ['hor ver-cen', { alignItems: 'center' }],
      ['hor ver-b', { alignItems: 'flex-end' }],
    ])('%s → %o (cross axis)', (input, expected) => {
      const style = getStyle(generate(`Box ${input}`))
      expect(style).toMatchObject(expected)
    })
  })

  describe('center shorthand', () => {
    it('cen centers main axis', () => {
      const style = getStyle(generate('Box cen'))
      expect(style.justifyContent).toBe('center')
    })

    it('center (long form) centers main axis', () => {
      const style = getStyle(generate('Box center'))
      expect(style.justifyContent).toBe('center')
    })
  })
})

// ============================================
// Grid Layout
// ============================================

describe('Grid Layout', () => {
  describe('basic grid', () => {
    it('grid N creates N-column layout', () => {
      const style = getStyle(generate('Box grid 3'))
      expect(style.display).toBe('grid')
      expect(style.gridTemplateColumns).toBe('repeat(3, 1fr)')
    })

    test.each([
      ['grid 2', { gridTemplateColumns: 'repeat(2, 1fr)' }],
      ['grid 4', { gridTemplateColumns: 'repeat(4, 1fr)' }],
      ['grid 12', { gridTemplateColumns: 'repeat(12, 1fr)' }],
    ])('%s → %o', (input, expected) => {
      const style = getStyle(generate(`Box ${input}`))
      expect(style.display).toBe('grid')
      expect(style).toMatchObject(expected)
    })
  })

  describe('grid with gap', () => {
    it('grid with gap', () => {
      const style = getStyle(generate('Box grid 3 gap 16'))
      expect(style.display).toBe('grid')
      expect(style.gap).toBe('16px')
    })
  })
})

// ============================================
// Stacked Layout
// ============================================

describe('Stacked Layout', () => {
  it('stacked creates grid with single cell', () => {
    const style = getStyle(generate('Box stacked'))
    expect(style.display).toBe('grid')
    expect(style.gridTemplateColumns).toBe('1fr')
    expect(style.gridTemplateRows).toBe('1fr')
  })

  it('children occupy same grid cell', () => {
    const dsl = `Box stacked
  Layer1 bg #FF0000
  Layer2 bg #00FF0080`
    const result = parse(dsl)
    expect(result.nodes[0].properties.stacked).toBe(true)
    expect(result.nodes[0].children.length).toBe(2)
  })
})

// ============================================
// Layout Combinations
// ============================================

describe('Layout Combinations', () => {
  // Note: These tests check parsed properties, not rendered CSS
  // The generator returns wrapper components; CSS rendering is tested separately
  describe('header layout pattern', () => {
    it('horizontal between for header', () => {
      const result = parse('Header hor between pad 16')
      const props = result.nodes[0].properties
      expect(props.hor).toBe(true)
      expect(props.align_main).toBe('between')
      expect(props.pad).toBe(16)
    })
  })

  describe('card layout pattern', () => {
    it('vertical gap for card', () => {
      const result = parse('Card ver gap 16 pad 20')
      const props = result.nodes[0].properties
      expect(props.ver).toBe(true)
      expect(props.gap).toBe(16)
      expect(props.pad).toBe(20)
    })
  })

  describe('nav layout pattern', () => {
    it('horizontal center for nav', () => {
      const result = parse('Nav hor gap 8 hor-cen')
      const props = result.nodes[0].properties
      expect(props.hor).toBe(true)
      expect(props.gap).toBe(8)
      expect(props['hor-cen']).toBe(true)
    })
  })

  describe('sidebar layout pattern', () => {
    it('vertical with fixed width', () => {
      const result = parse('Sidebar ver w 250 pad 16')
      const props = result.nodes[0].properties
      expect(props.ver).toBe(true)
      expect(props.w).toBe(250)
      expect(props.pad).toBe(16)
    })
  })
})

// ============================================
// Responsive-like Patterns
// ============================================

describe('Responsive Patterns', () => {
  describe('wrap for responsive', () => {
    it('horizontal wrap for flexible items', () => {
      const result = parse('Container hor wrap gap 16')
      const props = result.nodes[0].properties
      expect(props.hor).toBe(true)
      expect(props.wrap).toBe(true)
      expect(props.gap).toBe(16)
    })
  })

  describe('full width children', () => {
    it('children can be full width', () => {
      const dsl = `Container ver
  Child w full`
      const result = parse(dsl)
      expect(result.nodes[0].children[0].properties.w).toBe('full')
    })
  })
})

// ============================================
// Children Rendering
// ============================================

describe('Children Rendering', () => {
  // Note: Testing AST children since generator returns wrapper components
  it('renders all children', () => {
    const dsl = `Container ver gap 8
  Item1 "First"
  Item2 "Second"
  Item3 "Third"`
    const result = parse(dsl)
    // Should have 3 children in AST
    expect(result.nodes[0].children.length).toBe(3)
  })

  it('children inherit parent styles via CSS', () => {
    const dsl = `Container ver col #FFFFFF
  Text "Inherits color"`
    const result = parse(dsl)
    // Parent has color set
    expect(result.nodes[0].properties.col).toBe('#FFFFFF')
  })
})

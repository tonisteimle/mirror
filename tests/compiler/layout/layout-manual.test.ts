/**
 * Layout Manual Tests
 *
 * Consolidated manual tests for layout edge cases, conflicts, and special scenarios
 * that are not suitable for matrix-based generation.
 *
 * Categories:
 * 1. Single-axis alignments (left, right, top, bottom, hor-center, ver-center)
 * 2. Axis-aware alignment mapping (different in row vs column)
 * 3. Grid advanced (percentages, auto)
 * 4. Property conflicts and resolution
 * 5. Edge cases (multiple values, full vs fix)
 * 6. Position + Layout interactions
 * 7. Inheritance with layout
 *
 * Note: Basic layout combinations are tested in layout-matrix.test.ts
 */

import { describe, it, expect, test } from 'vitest'
import { parse } from '../../../compiler/parser'
import { toIR } from '../../../compiler/ir'
import { generateDOM } from '../../../compiler/backends/dom'

// =============================================================================
// HELPERS
// =============================================================================

function getStyle(node: any, property: string): string | undefined {
  const matches = node.styles.filter((s: any) => s.property === property)
  return matches.length > 0 ? matches[matches.length - 1].value : undefined
}

/**
 * Generate DOM and check for CSS property presence
 */
function expectCSS(code: string, property: string, value: string): void {
  const js = generateDOM(parse(code))
  expect(js).toContain(`'${property}': '${value}'`)
}

/**
 * Generate DOM and return for multiple checks
 */
function getDOM(code: string): string {
  return generateDOM(parse(code))
}

// =============================================================================
// 1. SINGLE-AXIS ALIGNMENTS
// =============================================================================

describe('Single-Axis Alignments', () => {
  describe('In Column (default)', () => {
    // Horizontal alignment → align-items (cross-axis)
    it('left → align-items: flex-start', () => {
      expectCSS('Frame left', 'align-items', 'flex-start')
    })

    it('right → align-items: flex-end', () => {
      expectCSS('Frame right', 'align-items', 'flex-end')
    })

    it('hor-center → align-items: center', () => {
      expectCSS('Frame hor-center', 'align-items', 'center')
    })

    // Vertical alignment → justify-content (main-axis)
    it('top → justify-content: flex-start', () => {
      expectCSS('Frame top', 'justify-content', 'flex-start')
    })

    it('bottom → justify-content: flex-end', () => {
      expectCSS('Frame bottom', 'justify-content', 'flex-end')
    })

    it('ver-center → justify-content: center', () => {
      expectCSS('Frame ver-center', 'justify-content', 'center')
    })
  })

  describe('In Row (hor)', () => {
    // Horizontal alignment → justify-content (main-axis)
    it('hor, left → justify-content: flex-start', () => {
      const js = getDOM('Frame hor, left')
      expect(js).toContain("'flex-direction': 'row'")
      expect(js).toContain("'justify-content': 'flex-start'")
    })

    it('hor, right → justify-content: flex-end', () => {
      const js = getDOM('Frame hor, right')
      expect(js).toContain("'flex-direction': 'row'")
      expect(js).toContain("'justify-content': 'flex-end'")
    })

    it('hor, hor-center → justify-content: center', () => {
      const js = getDOM('Frame hor, hor-center')
      expect(js).toContain("'flex-direction': 'row'")
      expect(js).toContain("'justify-content': 'center'")
    })

    // Vertical alignment → align-items (cross-axis)
    it('hor, top → align-items: flex-start', () => {
      const js = getDOM('Frame hor, top')
      expect(js).toContain("'flex-direction': 'row'")
      expect(js).toContain("'align-items': 'flex-start'")
    })

    it('hor, bottom → align-items: flex-end', () => {
      const js = getDOM('Frame hor, bottom')
      expect(js).toContain("'flex-direction': 'row'")
      expect(js).toContain("'align-items': 'flex-end'")
    })

    it('hor, ver-center → align-items: center', () => {
      const js = getDOM('Frame hor, ver-center')
      expect(js).toContain("'flex-direction': 'row'")
      expect(js).toContain("'align-items': 'center'")
    })
  })

  describe('Combined Alignments', () => {
    it('ver, bottom → justify-content: flex-end (main-axis)', () => {
      const js = getDOM('Frame ver, bottom')
      expect(js).toContain("'flex-direction': 'column'")
      expect(js).toContain("'justify-content': 'flex-end'")
    })

    it('ver, right → align-items: flex-end (cross-axis)', () => {
      const js = getDOM('Frame ver, right')
      expect(js).toContain("'flex-direction': 'column'")
      expect(js).toContain("'align-items': 'flex-end'")
    })

    it('ver, right, bottom → both axes aligned', () => {
      const js = getDOM('Frame ver, right, bottom')
      expect(js).toContain("'flex-direction': 'column'")
      expect(js).toContain("'justify-content': 'flex-end'")
      expect(js).toContain("'align-items': 'flex-end'")
    })

    it('hor, right, bottom → both axes in row context', () => {
      const js = getDOM('Frame hor, right, bottom')
      expect(js).toContain("'flex-direction': 'row'")
      expect(js).toContain("'justify-content': 'flex-end'") // right = main axis in row
      expect(js).toContain("'align-items': 'flex-end'") // bottom = cross axis in row
    })
  })
})

// =============================================================================
// 2. GRID ADVANCED
// =============================================================================

describe('Grid Advanced', () => {
  it('grid auto 250 → responsive columns', () => {
    const js = getDOM('Frame grid auto 250')
    expect(js).toContain("'display': 'grid'")
    expect(js).toContain("'grid-template-columns': 'repeat(auto-fill, minmax(250px, 1fr))'")
  })

  it('grid 30% 70% → percentage columns', () => {
    const js = getDOM('Frame grid 30% 70%')
    expect(js).toContain("'display': 'grid'")
    expect(js).toContain("'grid-template-columns': '30% 70%'")
  })

  it('grid with gap-x and gap-y', () => {
    const js = getDOM('Frame grid 3, gx 10, gy 20')
    expect(js).toContain("'display': 'grid'")
    expect(js).toContain("'column-gap': '10px'")
    expect(js).toContain("'row-gap': '20px'")
  })
})

// =============================================================================
// 3. PROPERTY CONFLICTS AND RESOLUTION
// =============================================================================

describe('Property Conflicts', () => {
  describe('Direction Conflicts', () => {
    test('hor ver - later wins', () => {
      const ir = toIR(parse('Frame hor ver'))
      const direction = getStyle(ir.nodes[0], 'flex-direction')
      // Later property wins
      expect(direction).toBe('column')
    })

    test('ver hor - later wins', () => {
      const ir = toIR(parse('Frame ver hor'))
      const direction = getStyle(ir.nodes[0], 'flex-direction')
      expect(direction).toBe('row')
    })
  })

  describe('Alignment Conflicts', () => {
    test('center spread - later wins', () => {
      const ir = toIR(parse('Frame center spread'))
      const justify = getStyle(ir.nodes[0], 'justify-content')
      expect(justify).toBe('space-between')
    })

    test('spread center - later wins', () => {
      const ir = toIR(parse('Frame spread center'))
      const justify = getStyle(ir.nodes[0], 'justify-content')
      expect(justify).toBe('center')
    })

    test('left right - later wins', () => {
      const ir = toIR(parse('Frame left right'))
      const align = getStyle(ir.nodes[0], 'align-items')
      expect(align).toBe('flex-end')
    })
  })

  describe('Sizing Conflicts', () => {
    test('w full w 100 - fixed wins over full', () => {
      const ir = toIR(parse(`
Frame
  Frame w full w 100
`))
      const child = ir.nodes[0].children[0]
      const width = getStyle(child, 'width')
      expect(width).toBe('100px')
    })

    test('w 100 w full - full wins when last (in vertical parent: stretch)', () => {
      // In vertical parent, w full sets align-self: stretch (cross-axis)
      // not flex, because width is the cross-axis in column layout
      const ir = toIR(parse(`
Frame
  Frame w 100 w full
`))
      const child = ir.nodes[0].children[0]
      const alignSelf = getStyle(child, 'align-self')
      expect(alignSelf).toBe('stretch')
    })
  })
})

// =============================================================================
// 4. EDGE CASES: MULTIPLE VALUES
// =============================================================================

describe('Multiple Values Same Property', () => {
  test('w 100 w 200 - last wins', () => {
    const ir = toIR(parse(`
Frame
  Frame w 100 w 200
`))
    const child = ir.nodes[0].children[0]
    const width = getStyle(child, 'width')
    expect(width).toBe('200px')
  })

  test('bg #f00 bg #0f0 - last wins', () => {
    const ir = toIR(parse('Frame bg #f00 bg #0f0'))
    const bg = getStyle(ir.nodes[0], 'background')
    expect(bg).toBe('#0f0')
  })

  test('pad 10 pad 20 - last wins', () => {
    const ir = toIR(parse('Frame pad 10 pad 20'))
    const pad = getStyle(ir.nodes[0], 'padding')
    expect(pad).toBe('20px')
  })

  test('rad 4 rad 8 - last wins', () => {
    const ir = toIR(parse('Frame rad 4 rad 8'))
    const rad = getStyle(ir.nodes[0], 'border-radius')
    expect(rad).toBe('8px')
  })
})

// =============================================================================
// 5. SIZING IN CONTEXT
// =============================================================================

describe('Sizing in Context', () => {
  describe('w full behavior depends on parent axis', () => {
    test('ver parent + w full child → stretch cross-axis', () => {
      const ir = toIR(parse(`
Frame ver, w 400, h 400
  Frame w full, h 50
`))
      const child = ir.nodes[0].children[0]
      // w is cross-axis in column parent
      expect(getStyle(child, 'align-self')).toBe('stretch')
      expect(getStyle(child, 'min-width')).toBe('0')
    })

    test('hor parent + w full child → flex main-axis', () => {
      const ir = toIR(parse(`
Frame hor, w 400
  Frame w full
`))
      const child = ir.nodes[0].children[0]
      // w is main-axis in row parent
      expect(getStyle(child, 'flex')).toBe('1 1 0%')
      expect(getStyle(child, 'min-width')).toBe('0')
    })
  })

  describe('h full behavior depends on parent axis', () => {
    test('ver parent + h full child → flex main-axis', () => {
      const ir = toIR(parse(`
Frame ver, h 400
  Frame h full
`))
      const child = ir.nodes[0].children[0]
      // h is main-axis in column parent
      expect(getStyle(child, 'flex')).toBe('1 1 0%')
      expect(getStyle(child, 'min-height')).toBe('0')
    })

    test('hor parent + h full child → stretch cross-axis', () => {
      const ir = toIR(parse(`
Frame hor, h 400
  Frame h full
`))
      const child = ir.nodes[0].children[0]
      // h is cross-axis in row parent
      expect(getStyle(child, 'align-self')).toBe('stretch')
      expect(getStyle(child, 'min-height')).toBe('0')
    })
  })
})

// =============================================================================
// 6. NESTED ALIGNMENTS
// =============================================================================

describe('Nested Alignments', () => {
  test('Parent center, Child left - each has own alignment context', () => {
    const ir = toIR(parse(`
Frame center
  Frame left
`))
    const parent = ir.nodes[0]
    const child = parent.children[0]

    // Parent centers its children
    expect(getStyle(parent, 'justify-content')).toBe('center')
    expect(getStyle(parent, 'align-items')).toBe('center')

    // Child has its own alignment for ITS children
    expect(getStyle(child, 'align-items')).toBe('flex-start')
  })

  test('Parent spread, Child center - independent contexts', () => {
    const ir = toIR(parse(`
Frame spread
  Frame center
`))
    const parent = ir.nodes[0]
    const child = parent.children[0]

    expect(getStyle(parent, 'justify-content')).toBe('space-between')
    expect(getStyle(child, 'justify-content')).toBe('center')
    expect(getStyle(child, 'align-items')).toBe('center')
  })
})

// =============================================================================
// 7. GAP + ALIGNMENT COMBINATIONS
// =============================================================================

describe('Gap + Alignment Combinations', () => {
  test('gap + spread work together', () => {
    const ir = toIR(parse('Frame hor, spread, gap 20'))
    expect(getStyle(ir.nodes[0], 'justify-content')).toBe('space-between')
    expect(getStyle(ir.nodes[0], 'gap')).toBe('20px')
  })

  test('gap + center work together', () => {
    const ir = toIR(parse('Frame center, gap 16'))
    expect(getStyle(ir.nodes[0], 'justify-content')).toBe('center')
    expect(getStyle(ir.nodes[0], 'align-items')).toBe('center')
    expect(getStyle(ir.nodes[0], 'gap')).toBe('16px')
  })
})

// =============================================================================
// 8. POSITION + LAYOUT INTERACTIONS
// =============================================================================

describe('Position + Layout Interactions', () => {
  test('stacked + center - positioning context', () => {
    const ir = toIR(parse(`
Frame stacked, center, w 400, h 400
  Frame x 10, y 10, w 50, h 50
`))
    const parent = ir.nodes[0]
    const child = parent.children[0]

    expect(getStyle(parent, 'position')).toBe('relative')
    expect(getStyle(child, 'position')).toBe('absolute')
    expect(getStyle(child, 'left')).toBe('10px')
    expect(getStyle(child, 'top')).toBe('10px')
  })

  test('absolute child in flex parent - child ignores flex alignment', () => {
    const ir = toIR(parse(`
Frame center, w 400, h 400
  Frame absolute, x 0, y 0
`))
    const child = ir.nodes[0].children[0]
    expect(getStyle(child, 'position')).toBe('absolute')
    expect(getStyle(child, 'left')).toBe('0px')
    expect(getStyle(child, 'top')).toBe('0px')
  })
})

// =============================================================================
// 9. INHERITANCE + LAYOUT
// =============================================================================

describe('Inheritance + Layout', () => {
  test('extends with layout override', () => {
    const ir = toIR(parse(`
VerticalBox as Frame:
  ver
  gap 20

HorizontalBox extends VerticalBox:
  hor

HorizontalBox
`))
    const node = ir.nodes[0]

    // hor should override ver
    expect(getStyle(node, 'flex-direction')).toBe('row')
    // gap should be inherited
    expect(getStyle(node, 'gap')).toBe('20px')
  })

  test('component inherits layout from base', () => {
    const ir = toIR(parse(`
CenteredBox as Frame:
  center
  gap 12

CenteredBox
`))
    const node = ir.nodes[0]

    expect(getStyle(node, 'justify-content')).toBe('center')
    expect(getStyle(node, 'align-items')).toBe('center')
    expect(getStyle(node, 'gap')).toBe('12px')
  })
})

// =============================================================================
// 10. WRAP AND SHRINK
// =============================================================================

describe('Wrap and Shrink', () => {
  test('wrap enables flex-wrap', () => {
    expectCSS('Frame hor, wrap', 'flex-wrap', 'wrap')
  })

  test('shrink enables flex-shrink (allows element to shrink)', () => {
    // shrink sets flex-shrink: 1, enabling the element to shrink
    const ir = toIR(parse('Frame shrink'))
    expect(getStyle(ir.nodes[0], 'flex-shrink')).toBe('1')
  })

  test('fixed width prevents shrinking (flex-shrink: 0)', () => {
    // Fixed width children get flex-shrink: 0 automatically
    const ir = toIR(parse(`
Frame hor
  Frame w 100
`))
    const child = ir.nodes[0].children[0]
    expect(getStyle(child, 'flex-shrink')).toBe('0')
  })

  test('wrap + gap work together', () => {
    const js = getDOM('Frame hor, wrap, gap 16')
    expect(js).toContain("'flex-wrap': 'wrap'")
    expect(js).toContain("'gap': '16px'")
  })
})

// =============================================================================
// 11. OTHER LAYOUT PROPERTIES
// =============================================================================

describe('Other Layout Properties', () => {
  test('spread → justify-content: space-between', () => {
    expectCSS('Frame spread', 'justify-content', 'space-between')
  })

  test('gap with layout', () => {
    const js = getDOM('Frame hor, gap 16')
    expect(js).toContain("'flex-direction': 'row'")
    expect(js).toContain("'gap': '16px'")
  })

  test('gap-x and gap-y in flex', () => {
    const js = getDOM('Frame hor, gx 10, gy 20')
    expect(js).toContain("'column-gap': '10px'")
    expect(js).toContain("'row-gap': '20px'")
  })
})

/**
 * @vitest-environment jsdom
 */

/**
 * Grid Layout Tests - Consolidated
 *
 * Tests for CSS Grid layout system in Mirror.
 * Covers:
 * 1. Basic grid setup (grid N, grid auto N)
 * 2. Grid positioning (x, y → grid-column-start, grid-row-start)
 * 3. Grid span (w, h → span N)
 * 4. Grid auto-flow (hor, ver, dense)
 * 5. Grid gaps (gap-x, gap-y, gx, gy)
 * 6. Row height
 * 7. Nested grids and context isolation
 * 8. Grid + Flex context switching
 * 9. Edge cases and real-world patterns
 */

import { describe, test, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../../compiler/parser'
import { toIR } from '../../../compiler/ir'
import { generateDOM } from '../../../compiler/backends/dom'

// =============================================================================
// HELPERS - IR Level
// =============================================================================

function getStyle(node: any, property: string): string | undefined {
  const style = node.styles?.find((s: any) => s.property === property)
  return style?.value
}

function hasStyle(node: any, property: string, value?: string): boolean {
  const style = node.styles?.find((s: any) => s.property === property)
  if (!style) return false
  if (value !== undefined) return style.value === value
  return true
}

// =============================================================================
// HELPERS - HTML Level (JSDOM)
// =============================================================================

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'test-container'
  document.body.appendChild(container)
})

afterEach(() => {
  container.remove()
})

function render(code: string): HTMLElement {
  const ast = parse(code)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }

  let domCode = generateDOM(ast)
  domCode = domCode.replace(/^export\s+function/gm, 'function')

  // Note: createUI() returns the root element directly, not an object with { root }
  const fn = new Function(domCode + '\nreturn createUI();')
  const mirrorRoot = fn() as HTMLElement

  container.appendChild(mirrorRoot)

  // Skip the <style> element - find first non-style child
  const children = Array.from(mirrorRoot.children) as HTMLElement[]
  const root = children.find(el => el.tagName.toLowerCase() !== 'style') as HTMLElement
  return root
}

function getStyleFromElement(el: HTMLElement, prop: string): string {
  const inline = el.style.getPropertyValue(prop)
  if (inline) return inline
  const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  return (el.style as any)[camelProp] || ''
}

// =============================================================================
// 1. BASIC GRID SETUP
// =============================================================================

describe('Grid Container', () => {
  describe('IR Level', () => {
    test('grid 3 creates 3-column grid', () => {
      const ir = toIR(parse(`Frame grid 3`))
      expect(hasStyle(ir.nodes[0], 'display', 'grid')).toBe(true)
      expect(hasStyle(ir.nodes[0], 'grid-template-columns', 'repeat(3, 1fr)')).toBe(true)
    })

    test('grid 12 creates 12-column grid', () => {
      const ir = toIR(parse(`Frame grid 12`))
      expect(hasStyle(ir.nodes[0], 'display', 'grid')).toBe(true)
      expect(hasStyle(ir.nodes[0], 'grid-template-columns', 'repeat(12, 1fr)')).toBe(true)
    })

    test('grid auto 250 creates auto-fill grid', () => {
      const ir = toIR(parse(`Frame grid auto 250`))
      expect(hasStyle(ir.nodes[0], 'display', 'grid')).toBe(true)
      expect(getStyle(ir.nodes[0], 'grid-template-columns')).toContain('auto-fill')
    })
  })

  describe('HTML Level', () => {
    it('grid 3 → display: grid', () => {
      const el = render(`Frame grid 3`)
      expect(getStyleFromElement(el, 'display')).toBe('grid')
    })

    it('grid 12 → repeat(12, 1fr)', () => {
      const el = render(`Frame grid 12`)
      expect(getStyleFromElement(el, 'grid-template-columns')).toBe('repeat(12, 1fr)')
    })

    it('grid auto 200 → auto-fill minmax', () => {
      const el = render(`Frame grid auto 200`)
      const gtc = getStyleFromElement(el, 'grid-template-columns')
      expect(gtc).toContain('auto-fill')
      expect(gtc).toContain('200px')
    })
  })
})

// =============================================================================
// 2. GRID POSITIONING (x, y)
// =============================================================================

describe('Grid Positioning (x, y)', () => {
  describe('IR Level', () => {
    test('x in grid child generates grid-column-start', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame x 2
`))
      const child = ir.nodes[0].children[0]
      expect(hasStyle(child, 'grid-column-start', '2')).toBe(true)
      // Should NOT have position: absolute
      expect(hasStyle(child, 'position', 'absolute')).toBe(false)
    })

    test('y in grid child generates grid-row-start', () => {
      const ir = toIR(parse(`
Frame grid 3
  Frame y 2
`))
      const child = ir.nodes[0].children[0]
      expect(hasStyle(child, 'grid-row-start', '2')).toBe(true)
      expect(hasStyle(child, 'position', 'absolute')).toBe(false)
    })

    test('x y combined', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame x 3 y 4
`))
      const child = ir.nodes[0].children[0]
      expect(getStyle(child, 'grid-column-start')).toBe('3')
      expect(getStyle(child, 'grid-row-start')).toBe('4')
    })
  })

  describe('HTML Level', () => {
    it('x in Grid → grid-column-start, NOT left', () => {
      const el = render(`
Frame grid 12
  Frame x 3
`)
      const child = el.firstElementChild as HTMLElement
      expect(getStyleFromElement(child, 'grid-column-start')).toBe('3')
      expect(getStyleFromElement(child, 'position')).not.toBe('absolute')
      expect(getStyleFromElement(child, 'left')).toBe('')
    })

    it('y in Grid → grid-row-start, NOT top', () => {
      const el = render(`
Frame grid 3
  Frame y 2
`)
      const child = el.firstElementChild as HTMLElement
      expect(getStyleFromElement(child, 'grid-row-start')).toBe('2')
      expect(getStyleFromElement(child, 'top')).toBe('')
    })
  })
})

// =============================================================================
// 3. GRID SPAN (w, h in grid context)
// =============================================================================

describe('Grid Span (w, h)', () => {
  describe('IR Level', () => {
    test('w 4 in grid generates grid-column: span 4', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame w 4
`))
      const child = ir.nodes[0].children[0]
      expect(hasStyle(child, 'grid-column', 'span 4')).toBe(true)
    })

    test('h 3 in grid generates grid-row: span 3', () => {
      const ir = toIR(parse(`
Frame grid 4
  Frame h 3
`))
      const child = ir.nodes[0].children[0]
      expect(hasStyle(child, 'grid-row', 'span 3')).toBe(true)
    })

    test('x y w h combined', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame x 2 y 3 w 4 h 2
`))
      const child = ir.nodes[0].children[0]
      expect(getStyle(child, 'grid-column-start')).toBe('2')
      expect(getStyle(child, 'grid-row-start')).toBe('3')
      expect(getStyle(child, 'grid-column')).toBe('span 4')
      expect(getStyle(child, 'grid-row')).toBe('span 2')
    })
  })

  describe('HTML Level', () => {
    it('w in Grid → grid-column: span, NOT width in px', () => {
      const el = render(`
Frame grid 12
  Frame w 4
`)
      const child = el.firstElementChild as HTMLElement
      expect(getStyleFromElement(child, 'grid-column')).toBe('span 4')
      expect(getStyleFromElement(child, 'width')).not.toBe('4px')
    })

    it('h in Grid → grid-row: span, NOT height in px', () => {
      const el = render(`
Frame grid 4
  Frame h 2
`)
      const child = el.firstElementChild as HTMLElement
      expect(getStyleFromElement(child, 'grid-row')).toBe('span 2')
      expect(getStyleFromElement(child, 'height')).not.toBe('2px')
    })
  })
})

// =============================================================================
// 3.1 GRID CELL FILL (elements stretch to fill their grid cells)
// =============================================================================

describe('Grid Cell Fill', () => {
  describe('IR Level - Grid children get width/height 100% to fill cells', () => {
    test('w 4 in grid also adds width: 100%', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame w 4
`))
      const child = ir.nodes[0].children[0]
      expect(hasStyle(child, 'grid-column', 'span 4')).toBe(true)
      expect(hasStyle(child, 'width', '100%')).toBe(true)
    })

    test('h 3 in grid also adds height: 100%', () => {
      const ir = toIR(parse(`
Frame grid 4
  Frame h 3
`))
      const child = ir.nodes[0].children[0]
      expect(hasStyle(child, 'grid-row', 'span 3')).toBe(true)
      expect(hasStyle(child, 'height', '100%')).toBe(true)
    })

    test('w and h in grid add both 100%', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame w 6 h 2
`))
      const child = ir.nodes[0].children[0]
      expect(hasStyle(child, 'grid-column', 'span 6')).toBe(true)
      expect(hasStyle(child, 'grid-row', 'span 2')).toBe(true)
      expect(hasStyle(child, 'width', '100%')).toBe(true)
      expect(hasStyle(child, 'height', '100%')).toBe(true)
    })

    test('x y w h combined all have fill', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame x 2 y 3 w 4 h 2
`))
      const child = ir.nodes[0].children[0]
      expect(getStyle(child, 'grid-column-start')).toBe('2')
      expect(getStyle(child, 'grid-row-start')).toBe('3')
      expect(getStyle(child, 'grid-column')).toBe('span 4')
      expect(getStyle(child, 'grid-row')).toBe('span 2')
      expect(getStyle(child, 'width')).toBe('100%')
      expect(getStyle(child, 'height')).toBe('100%')
    })

    test('w 12 (full width) fills entire row', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame w 12
`))
      const child = ir.nodes[0].children[0]
      expect(hasStyle(child, 'grid-column', 'span 12')).toBe(true)
      expect(hasStyle(child, 'width', '100%')).toBe(true)
    })
  })

  describe('HTML Level - Visual verification of cell fill', () => {
    it('w 6 in Grid → element fills its 6-column cell', () => {
      const el = render(`
Frame grid 12
  Frame w 6, bg #f00
`)
      const child = el.firstElementChild as HTMLElement
      expect(getStyleFromElement(child, 'grid-column')).toBe('span 6')
      expect(getStyleFromElement(child, 'width')).toBe('100%')
    })

    it('h 2 in Grid → element fills its 2-row cell', () => {
      const el = render(`
Frame grid 4, row-height 50
  Frame h 2, bg #f00
`)
      const child = el.firstElementChild as HTMLElement
      expect(getStyleFromElement(child, 'grid-row')).toBe('span 2')
      expect(getStyleFromElement(child, 'height')).toBe('100%')
    })

    it('Tutorial grid example: all elements fill their cells', () => {
      const el = render(`
Frame grid 12, gap 8
  Frame w 12, bg #2563eb, rad 4, center
    Text "w 12"
  Frame w 6, bg #10b981, rad 4, center
    Text "w 6"
  Frame w 6, bg #10b981, rad 4, center
    Text "w 6"
  Frame w 4, bg #f59e0b, rad 4, center
    Text "w 4"
  Frame w 4, bg #f59e0b, rad 4, center
    Text "w 4"
  Frame w 4, bg #f59e0b, rad 4, center
    Text "w 4"
`)
      const children = Array.from(el.children) as HTMLElement[]

      // All children should have width: 100% to fill their cells
      expect(getStyleFromElement(children[0], 'grid-column')).toBe('span 12')
      expect(getStyleFromElement(children[0], 'width')).toBe('100%')

      expect(getStyleFromElement(children[1], 'grid-column')).toBe('span 6')
      expect(getStyleFromElement(children[1], 'width')).toBe('100%')

      expect(getStyleFromElement(children[3], 'grid-column')).toBe('span 4')
      expect(getStyleFromElement(children[3], 'width')).toBe('100%')
    })

    it('Dashboard layout: all sections fill their cells', () => {
      const el = render(`
Frame grid 12, gap 8, row-height 35
  Frame x 1, y 1, w 12, h 2, bg #2563eb
  Frame x 1, y 3, w 3, h 3, bg #10b981
  Frame x 4, y 3, w 9, h 3, bg #333
`)
      const children = Array.from(el.children) as HTMLElement[]

      // Hero section: full width, 2 rows
      expect(getStyleFromElement(children[0], 'grid-column')).toBe('span 12')
      expect(getStyleFromElement(children[0], 'grid-row')).toBe('span 2')
      expect(getStyleFromElement(children[0], 'width')).toBe('100%')
      expect(getStyleFromElement(children[0], 'height')).toBe('100%')

      // Sidebar: 3 columns, 3 rows
      expect(getStyleFromElement(children[1], 'grid-column')).toBe('span 3')
      expect(getStyleFromElement(children[1], 'grid-row')).toBe('span 3')
      expect(getStyleFromElement(children[1], 'width')).toBe('100%')
      expect(getStyleFromElement(children[1], 'height')).toBe('100%')

      // Content: 9 columns, 3 rows
      expect(getStyleFromElement(children[2], 'grid-column')).toBe('span 9')
      expect(getStyleFromElement(children[2], 'grid-row')).toBe('span 3')
      expect(getStyleFromElement(children[2], 'width')).toBe('100%')
      expect(getStyleFromElement(children[2], 'height')).toBe('100%')
    })
  })

  describe('Nested Grids - Cell fill at each level', () => {
    test('Nested grid children each fill their respective cells', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame x 1 w 6 grid 2
    Frame w 1
    Frame w 1
`))
      const innerGrid = ir.nodes[0].children[0]
      const innerChild1 = innerGrid.children[0]
      const innerChild2 = innerGrid.children[1]

      // Inner grid fills its cell in outer grid
      expect(getStyle(innerGrid, 'grid-column')).toBe('span 6')
      expect(getStyle(innerGrid, 'width')).toBe('100%')

      // Inner grid children fill their cells in inner grid
      expect(getStyle(innerChild1, 'grid-column')).toBe('span 1')
      expect(getStyle(innerChild1, 'width')).toBe('100%')
      expect(getStyle(innerChild2, 'grid-column')).toBe('span 1')
      expect(getStyle(innerChild2, 'width')).toBe('100%')
    })
  })

  describe('Edge Cases - Cell fill only for numeric w/h in grid', () => {
    test('w full in Grid does NOT get cell fill (already 100%)', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame w full
`))
      const child = ir.nodes[0].children[0]
      // w full should NOT be interpreted as span
      expect(getStyle(child, 'grid-column')).toBeUndefined()
      // But should still work as width: 100%
      // (handled by default w full logic, not grid-specific)
    })

    test('w hug in Grid does NOT get cell fill', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame w hug
`))
      const child = ir.nodes[0].children[0]
      expect(getStyle(child, 'grid-column')).toBeUndefined()
      expect(getStyle(child, 'width')).toBe('fit-content')
    })

    test('w outside grid does NOT get cell fill', () => {
      const ir = toIR(parse(`
Frame
  Frame w 200
`))
      const child = ir.nodes[0].children[0]
      expect(getStyle(child, 'width')).toBe('200px')
      expect(getStyle(child, 'grid-column')).toBeUndefined()
    })
  })
})

// =============================================================================
// 4. BACKWARD COMPATIBILITY (x/y outside grid)
// =============================================================================

describe('x/y Outside Grid (Backward Compatibility)', () => {
  test('x in pos context generates position: absolute + left', () => {
    const ir = toIR(parse(`
Frame pos
  Frame x 50
`))
    const child = ir.nodes[0].children[0]
    expect(hasStyle(child, 'position', 'absolute')).toBe(true)
    expect(hasStyle(child, 'left', '50px')).toBe(true)
    expect(getStyle(child, 'grid-column-start')).toBeUndefined()
  })

  test('w outside grid generates width in px', () => {
    const ir = toIR(parse(`
Frame
  Frame w 200
`))
    const child = ir.nodes[0].children[0]
    expect(getStyle(child, 'width')).toBe('200px')
    expect(getStyle(child, 'grid-column')).toBeUndefined()
  })

  it('HTML: x in stacked → position: absolute + top', () => {
    const el = render(`
Frame stacked
  Frame y 100
`)
    const child = el.firstElementChild as HTMLElement
    expect(getStyleFromElement(child, 'position')).toBe('absolute')
    expect(getStyleFromElement(child, 'top')).toBe('100px')
  })
})

// =============================================================================
// 5. GRID AUTO-FLOW (hor, ver, dense)
// =============================================================================

describe('Grid Auto-Flow', () => {
  test('hor in grid sets grid-auto-flow: row', () => {
    const ir = toIR(parse(`Frame grid 3 hor`))
    expect(hasStyle(ir.nodes[0], 'grid-auto-flow', 'row')).toBe(true)
  })

  test('ver in grid sets grid-auto-flow: column', () => {
    const ir = toIR(parse(`Frame grid 3 ver`))
    expect(hasStyle(ir.nodes[0], 'grid-auto-flow', 'column')).toBe(true)
  })

  test('dense sets grid-auto-flow: dense', () => {
    const ir = toIR(parse(`Frame grid 3 dense`))
    expect(getStyle(ir.nodes[0], 'grid-auto-flow')).toContain('dense')
  })

  test('hor dense sets grid-auto-flow: row dense', () => {
    const ir = toIR(parse(`Frame grid 3 hor dense`))
    const flow = getStyle(ir.nodes[0], 'grid-auto-flow')
    expect(flow).toContain('row')
    expect(flow).toContain('dense')
  })

  test('ver dense sets grid-auto-flow: column dense', () => {
    const ir = toIR(parse(`Frame grid 3 ver dense`))
    const flow = getStyle(ir.nodes[0], 'grid-auto-flow')
    expect(flow).toContain('column')
    expect(flow).toContain('dense')
  })
})

// =============================================================================
// 6. GRID GAPS (gap-x, gap-y, gx, gy)
// =============================================================================

describe('Grid Gaps', () => {
  test('gap-x sets column-gap', () => {
    const ir = toIR(parse(`Frame grid 3 gap-x 16`))
    expect(hasStyle(ir.nodes[0], 'column-gap', '16px')).toBe(true)
  })

  test('gap-y sets row-gap', () => {
    const ir = toIR(parse(`Frame grid 3 gap-y 24`))
    expect(hasStyle(ir.nodes[0], 'row-gap', '24px')).toBe(true)
  })

  test('gx alias works', () => {
    const ir = toIR(parse(`Frame grid 3 gx 8`))
    expect(hasStyle(ir.nodes[0], 'column-gap', '8px')).toBe(true)
  })

  test('gy alias works', () => {
    const ir = toIR(parse(`Frame grid 3 gy 12`))
    expect(hasStyle(ir.nodes[0], 'row-gap', '12px')).toBe(true)
  })

  test('gap-x and gap-y together', () => {
    const ir = toIR(parse(`Frame grid 3 gap-x 16 gap-y 24`))
    expect(hasStyle(ir.nodes[0], 'column-gap', '16px')).toBe(true)
    expect(hasStyle(ir.nodes[0], 'row-gap', '24px')).toBe(true)
  })

  test('gap-x/gap-y work in flex too', () => {
    const ir = toIR(parse(`Frame hor gap-x 8 gap-y 16`))
    expect(hasStyle(ir.nodes[0], 'column-gap', '8px')).toBe(true)
    expect(hasStyle(ir.nodes[0], 'row-gap', '16px')).toBe(true)
  })
})

// =============================================================================
// 7. ROW HEIGHT
// =============================================================================

describe('Row Height', () => {
  test('row-height 100 sets grid-auto-rows', () => {
    const ir = toIR(parse(`Frame grid 3 row-height 100`))
    expect(hasStyle(ir.nodes[0], 'grid-auto-rows', '100px')).toBe(true)
  })

  test('rh alias works', () => {
    const ir = toIR(parse(`Frame grid 4 rh 80`))
    expect(hasStyle(ir.nodes[0], 'grid-auto-rows', '80px')).toBe(true)
  })
})

// =============================================================================
// 8. NESTED GRIDS - Context Isolation
// =============================================================================

describe('Nested Grids', () => {
  test('Grid child with own grid - x/y refers to parent', () => {
    const ir = toIR(parse(`
Frame grid 12
  Frame x 3 w 6 grid 4
    Frame w 2
`))
    const innerGrid = ir.nodes[0].children[0]
    expect(getStyle(innerGrid, 'grid-column-start')).toBe('3')
    expect(getStyle(innerGrid, 'grid-column')).toBe('span 6')
    expect(hasStyle(innerGrid, 'display', 'grid')).toBe(true)

    // Grandchild: w 2 refers to inner grid 4 (span 2)
    const grandchild = innerGrid.children[0]
    expect(getStyle(grandchild, 'grid-column')).toBe('span 2')
  })

  test('Triple nested grids - context stack', () => {
    const ir = toIR(parse(`
Frame grid 12
  Frame x 1 w 12 grid 6
    Frame x 1 w 6 grid 3
      Frame x 2 w 2
`))
    const level2 = ir.nodes[0].children[0]
    const level3 = level2.children[0]
    const level4 = level3.children[0]

    // Level 2: positioned in grid 12
    expect(getStyle(level2, 'grid-column-start')).toBe('1')
    expect(getStyle(level2, 'grid-column')).toBe('span 12')

    // Level 3: positioned in grid 6
    expect(getStyle(level3, 'grid-column-start')).toBe('1')
    expect(getStyle(level3, 'grid-column')).toBe('span 6')

    // Level 4: positioned in grid 3
    expect(getStyle(level4, 'grid-column-start')).toBe('2')
    expect(getStyle(level4, 'grid-column')).toBe('span 2')
  })

  it('HTML: Grid in Grid works correctly', () => {
    const el = render(`
Frame grid 12
  Frame x 1 w 6 grid 3
    Frame w 2
`)
    const innerGrid = el.firstElementChild as HTMLElement
    const innerChild = innerGrid.firstElementChild as HTMLElement

    expect(getStyleFromElement(innerGrid, 'grid-column-start')).toBe('1')
    expect(getStyleFromElement(innerGrid, 'grid-column')).toBe('span 6')
    expect(getStyleFromElement(innerGrid, 'display')).toBe('grid')
    expect(getStyleFromElement(innerChild, 'grid-column')).toBe('span 2')
  })
})

// =============================================================================
// 9. GRID + FLEX CONTEXT SWITCHING
// =============================================================================

describe('Grid > Flex > Element Context Switching', () => {
  test('x in Flex child (inside Grid) should NOT be grid-column', () => {
    const ir = toIR(parse(`
Frame grid 12
  Frame x 3 w 6 hor
    Frame x 50
`))
    const flexContainer = ir.nodes[0].children[0]
    const flexChild = flexContainer.children[0]

    // FlexContainer is Grid child: x → grid-column-start
    expect(getStyle(flexContainer, 'grid-column-start')).toBe('3')

    // FlexChild is NOT in Grid: x should not generate grid-column-start
    expect(getStyle(flexChild, 'grid-column-start')).toBeUndefined()
  })

  test('Grid > Flex > Grid - context switches back', () => {
    const ir = toIR(parse(`
Frame grid 12
  Frame x 1 w 12 hor
    Frame w 200 grid 4
      Frame x 2 w 2
`))
    const flexContainer = ir.nodes[0].children[0]
    const innerGrid = flexContainer.children[0]
    const gridChild = innerGrid.children[0]

    // FlexContainer: Grid positioning
    expect(getStyle(flexContainer, 'grid-column-start')).toBe('1')

    // InnerGrid: w 200 = pixels (not span, parent is Flex)
    expect(getStyle(innerGrid, 'width')).toBe('200px')
    expect(getStyle(innerGrid, 'grid-column')).toBeUndefined()

    // GridChild: w 2 = span 2 (parent is grid 4)
    expect(getStyle(gridChild, 'grid-column')).toBe('span 2')
  })
})

// =============================================================================
// 10. EDGE CASES
// =============================================================================

describe('Grid Edge Cases', () => {
  test('grid 1 - single column', () => {
    const ir = toIR(parse(`Frame grid 1`))
    expect(hasStyle(ir.nodes[0], 'grid-template-columns', 'repeat(1, 1fr)')).toBe(true)
  })

  test('x 1 - first column', () => {
    const ir = toIR(parse(`
Frame grid 12
  Frame x 1
`))
    expect(getStyle(ir.nodes[0].children[0], 'grid-column-start')).toBe('1')
  })

  test('x 13 in grid 12 - exceeds bounds (valid CSS)', () => {
    const ir = toIR(parse(`
Frame grid 12
  Frame x 13
`))
    // CSS Grid allows this - element placed outside
    expect(getStyle(ir.nodes[0].children[0], 'grid-column-start')).toBe('13')
  })

  test('w full in Grid should NOT be span', () => {
    const ir = toIR(parse(`
Frame grid 3
  Frame w full
`))
    const child = ir.nodes[0].children[0]
    // w full should NOT be interpreted as span
    expect(getStyle(child, 'grid-column')).toBeUndefined()
  })

  test('gap 0 sets explicit gap: 0', () => {
    const el = render(`Frame grid 3 gap 0`)
    expect(getStyleFromElement(el, 'gap')).toBe('0px')
  })
})

// =============================================================================
// 11. REAL-WORLD PATTERNS
// =============================================================================

describe('Real-World Grid Patterns', () => {
  test('12-column dashboard layout', () => {
    const ir = toIR(parse(`
Frame grid 12 gap 16
  Frame x 1 w 3
  Frame x 4 w 6
  Frame x 10 w 3
`))
    const container = ir.nodes[0]
    expect(hasStyle(container, 'display', 'grid')).toBe(true)
    expect(hasStyle(container, 'gap', '16px')).toBe(true)

    expect(getStyle(container.children[0], 'grid-column-start')).toBe('1')
    expect(getStyle(container.children[0], 'grid-column')).toBe('span 3')

    expect(getStyle(container.children[1], 'grid-column-start')).toBe('4')
    expect(getStyle(container.children[1], 'grid-column')).toBe('span 6')

    expect(getStyle(container.children[2], 'grid-column-start')).toBe('10')
    expect(getStyle(container.children[2], 'grid-column')).toBe('span 3')
  })

  test('Dashboard with rows and columns', () => {
    const ir = toIR(parse(`
Frame grid 12 gap-x 16 gap-y 24 row-height 100
  Frame x 1 y 1 w 8 h 2
  Frame x 9 y 1 w 4 h 1
  Frame x 9 y 2 w 4 h 1
`))
    const mainContent = ir.nodes[0].children[0]
    expect(getStyle(mainContent, 'grid-column-start')).toBe('1')
    expect(getStyle(mainContent, 'grid-row-start')).toBe('1')
    expect(getStyle(mainContent, 'grid-column')).toBe('span 8')
    expect(getStyle(mainContent, 'grid-row')).toBe('span 2')
  })

  test('Holy Grail Layout', () => {
    const ir = toIR(parse(`
Frame grid 12 gap 16
  Frame x 1 w 12 h 1
  Frame x 1 w 2 y 2 h 1
  Frame x 3 w 8 y 2 h 1
  Frame x 11 w 2 y 2 h 1
  Frame x 1 w 12 y 3 h 1
`))
    const container = ir.nodes[0]
    expect(container.children.length).toBe(5)

    // Main content
    const main = container.children[2]
    expect(getStyle(main, 'grid-column-start')).toBe('3')
    expect(getStyle(main, 'grid-column')).toBe('span 8')
    expect(getStyle(main, 'grid-row-start')).toBe('2')
  })
})

// =============================================================================
// 12. GRID WITH INHERITANCE
// =============================================================================

describe('Grid with Inheritance', () => {
  test('Definition with Grid, instance with position', () => {
    const el = render(`
GridContainer: = Frame grid 4 gap 8

GridContainer
  Frame x 1 w 2
  Frame x 3 w 2
`)
    expect(getStyleFromElement(el, 'display')).toBe('grid')
    expect(getStyleFromElement(el, 'gap')).toBe('8px')

    const [child1, child2] = Array.from(el.children) as HTMLElement[]
    expect(getStyleFromElement(child1, 'grid-column-start')).toBe('1')
    expect(getStyleFromElement(child2, 'grid-column-start')).toBe('3')
  })

  test('Component definition contains Grid', () => {
    const ir = toIR(parse(`
GridSection: = Frame grid 4 gap 8

Frame ver gap 24
  GridSection
    Frame x 1 w 2
    Frame x 3 w 2
`))
    const section = ir.nodes[0].children[0]
    expect(hasStyle(section, 'display', 'grid')).toBe(true)
    expect(getStyle(section.children[0], 'grid-column-start')).toBe('1')
  })
})

// =============================================================================
// 13. ALL GRID PROPERTIES COMBINED
// =============================================================================

describe('All Grid Properties Combined', () => {
  test('Grid with all properties at once', () => {
    const ir = toIR(parse(`Frame grid 12 gap 16 gap-x 8 gap-y 24 row-height 100 dense ver`))
    const node = ir.nodes[0]

    expect(hasStyle(node, 'display', 'grid')).toBe(true)
    expect(hasStyle(node, 'grid-template-columns', 'repeat(12, 1fr)')).toBe(true)
    // gap-x should override gap for column
    expect(hasStyle(node, 'column-gap', '8px')).toBe(true)
    expect(hasStyle(node, 'row-gap', '24px')).toBe(true)
    expect(hasStyle(node, 'grid-auto-rows', '100px')).toBe(true)

    const flow = node.styles.find((s: any) => s.property === 'grid-auto-flow')?.value
    expect(flow).toContain('dense')
    expect(flow).toContain('column')
  })

  test('Grid child with all positioning properties', () => {
    const ir = toIR(parse(`
Frame grid 12
  Frame x 3 y 2 w 4 h 3 bg #f00 pad 16 rad 8
`))
    const child = ir.nodes[0].children[0]

    expect(hasStyle(child, 'grid-column-start', '3')).toBe(true)
    expect(hasStyle(child, 'grid-row-start', '2')).toBe(true)
    expect(hasStyle(child, 'grid-column', 'span 4')).toBe(true)
    expect(hasStyle(child, 'grid-row', 'span 3')).toBe(true)
    expect(hasStyle(child, 'padding', '16px')).toBe(true)
    expect(hasStyle(child, 'border-radius', '8px')).toBe(true)
  })
})

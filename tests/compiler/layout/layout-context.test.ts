/**
 * Layout Context Tests
 *
 * Tests layout behavior in realistic multi-child and nested scenarios.
 * These tests verify that layout properties interact correctly when:
 * - Multiple children compete for space
 * - Layouts are nested (Grid > Flex > children)
 * - Parent alignment affects child behavior
 * - Different sizing modes are mixed
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../../compiler/parser/parser'
import { generateDOM } from '../../../compiler/backends/dom'
import { toIR } from '../../../compiler/ir'

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Extract all styles from generated DOM code, indexed by node order.
 */
function getAllStyles(code: string): Record<string, string>[] {
  const ast = parse(code)
  const js = generateDOM(ast)

  const stylesByVar: Record<string, Record<string, string>> = {}
  const objectAssignRegex = /Object\.assign\((node_\d+)\.style,\s*\{([\s\S]*?)\}\)/g

  let match
  while ((match = objectAssignRegex.exec(js)) !== null) {
    const [, varName, propsStr] = match
    if (!stylesByVar[varName]) stylesByVar[varName] = {}

    const propRegex = /'([^']+)':\s*'([^']+)'/g
    let propMatch
    while ((propMatch = propRegex.exec(propsStr)) !== null) {
      const [, prop, value] = propMatch
      stylesByVar[varName][prop] = value
    }
  }

  const keys = Object.keys(stylesByVar).sort((a, b) => {
    const numA = parseInt(a.replace('node_', ''), 10)
    const numB = parseInt(b.replace('node_', ''), 10)
    return numA - numB
  })
  return keys.map(k => stylesByVar[k])
}

function getStyleAt(code: string, index: number): Record<string, string> {
  return getAllStyles(code)[index] || {}
}

function getIRStyles(code: string): { parent: any; children: any[] } {
  const ir = toIR(parse(code))
  return {
    parent: ir.nodes[0],
    children: ir.nodes[0].children || [],
  }
}

function getIRStyle(node: any, property: string): string | undefined {
  return node.styles?.find((s: any) => s.property === property)?.value
}

// =============================================================================
// MULTI-CHILD FLEX SCENARIOS
// =============================================================================

describe('Layout Context: Multi-Child Flex', () => {
  describe('Two children with w full share space equally', () => {
    it('vertical parent: both get align-self: stretch', () => {
      const styles = getAllStyles(`
Frame w 400
  Frame w full, bg red
  Frame w full, bg blue`)

      // Both children should stretch
      expect(styles[1]['align-self']).toBe('stretch')
      expect(styles[2]['align-self']).toBe('stretch')
    })

    it('horizontal parent: both get flex: 1 1 0%', () => {
      const styles = getAllStyles(`
Frame hor, w 400
  Frame w full, bg red
  Frame w full, bg blue`)

      expect(styles[1]['flex']).toBe('1 1 0%')
      expect(styles[2]['flex']).toBe('1 1 0%')
    })
  })

  describe('Mixed sizing: fixed + full + fixed (sidebar pattern)', () => {
    it('horizontal: sidebars fixed, center fills', () => {
      const styles = getAllStyles(`
Frame hor, w 600
  Frame w 80, bg gray
  Frame w full, bg white
  Frame w 80, bg gray`)

      // Sidebars: fixed width, no shrink
      expect(styles[1]['width']).toBe('80px')
      expect(styles[1]['flex-shrink']).toBe('0')
      expect(styles[3]['width']).toBe('80px')
      expect(styles[3]['flex-shrink']).toBe('0')

      // Center: fills remaining space
      expect(styles[2]['flex']).toBe('1 1 0%')
    })

    it('vertical: header/footer fixed, content fills', () => {
      const styles = getAllStyles(`
Frame h 600
  Frame h 60, bg gray
  Frame h full, bg white
  Frame h 60, bg gray`)

      // Header/Footer: fixed height, no shrink
      expect(styles[1]['height']).toBe('60px')
      expect(styles[1]['flex-shrink']).toBe('0')
      expect(styles[3]['height']).toBe('60px')
      expect(styles[3]['flex-shrink']).toBe('0')

      // Content: fills remaining space
      expect(styles[2]['flex']).toBe('1 1 0%')
    })
  })

  describe('Mixed sizing: fixed + hug + full', () => {
    it('three different sizing modes coexist', () => {
      const styles = getAllStyles(`
Frame hor, w 600
  Frame w 100, bg red
  Frame w hug, bg green
    Text "Content"
  Frame w full, bg blue`)

      // Fixed: exact width, no shrink
      expect(styles[1]['width']).toBe('100px')
      expect(styles[1]['flex-shrink']).toBe('0')

      // Hug: fit-content
      expect(styles[2]['width']).toBe('fit-content')

      // Full: takes remaining space
      expect(styles[3]['flex']).toBe('1 1 0%')
    })
  })

  describe('h full in horizontal parent (cross-axis)', () => {
    it('h full stretches to parent height', () => {
      const styles = getAllStyles(`
Frame hor, h 200
  Frame h full, bg red`)

      // h full in hor parent = cross-axis stretch
      expect(styles[1]['align-self']).toBe('stretch')
    })

    it('multiple h full children all stretch', () => {
      const styles = getAllStyles(`
Frame hor, h 200
  Frame h full, w 100, bg red
  Frame h full, w 100, bg blue`)

      expect(styles[1]['align-self']).toBe('stretch')
      expect(styles[2]['align-self']).toBe('stretch')
    })
  })

  describe('w full in vertical parent (cross-axis)', () => {
    it('w full stretches to parent width', () => {
      const styles = getAllStyles(`
Frame w 400
  Frame w full, bg red`)

      expect(styles[1]['align-self']).toBe('stretch')
    })
  })
})

// =============================================================================
// PARENT ALIGNMENT + CHILD BEHAVIOR
// =============================================================================

describe('Layout Context: Parent Alignment Effects', () => {
  describe('centered parent with children', () => {
    it('center parent: children are centered as group', () => {
      const styles = getAllStyles(`
Frame center, w 400, h 300
  Frame w 100, h 50, bg red
  Frame w 100, h 50, bg blue`)

      // Parent has centering
      expect(styles[0]['justify-content']).toBe('center')
      expect(styles[0]['align-items']).toBe('center')

      // Children don't need individual centering - parent handles it
      // Children should have their explicit sizes
      expect(styles[1]['width']).toBe('100px')
      expect(styles[2]['width']).toBe('100px')
    })

    it('hor-center parent: children centered horizontally only', () => {
      const styles = getAllStyles(`
Frame hor-center, w 400, h 300
  Frame w 100, h 50, bg red`)

      expect(styles[0]['align-items']).toBe('center')
      // justify-content should NOT be set (vertical not centered)
    })

    it('ver-center parent: children centered vertically only', () => {
      const styles = getAllStyles(`
Frame ver-center, w 400, h 300
  Frame w 100, h 50, bg red`)

      expect(styles[0]['justify-content']).toBe('center')
      // align-items should be flex-start (default)
      expect(styles[0]['align-items']).toBe('flex-start')
    })
  })

  describe('spread parent with children', () => {
    it('spread distributes children to edges', () => {
      const styles = getAllStyles(`
Frame hor, spread, w 400
  Frame w 50, bg red
  Frame w 50, bg blue`)

      expect(styles[0]['justify-content']).toBe('space-between')
    })

    it('spread + gap creates even distribution with gaps', () => {
      const styles = getAllStyles(`
Frame hor, spread, gap 16, w 400
  Frame w 50, bg red
  Frame w 50, bg green
  Frame w 50, bg blue`)

      expect(styles[0]['justify-content']).toBe('space-between')
      expect(styles[0]['gap']).toBe('16px')
    })
  })

  describe('9-zone alignment with children', () => {
    it('br (bottom-right) positions children at bottom-right', () => {
      const styles = getAllStyles(`
Frame br, w 400, h 300
  Frame w 100, h 50, bg red`)

      expect(styles[0]['justify-content']).toBe('flex-end')
      expect(styles[0]['align-items']).toBe('flex-end')
    })

    it('tl (top-left) positions children at top-left', () => {
      const styles = getAllStyles(`
Frame tl, w 400, h 300
  Frame w 100, h 50, bg red`)

      expect(styles[0]['justify-content']).toBe('flex-start')
      expect(styles[0]['align-items']).toBe('flex-start')
    })
  })
})

// =============================================================================
// NESTED LAYOUTS
// =============================================================================

describe('Layout Context: Nested Layouts', () => {
  describe('Flex > Flex nesting', () => {
    it('vertical > horizontal: w full in inner works correctly', () => {
      const styles = getAllStyles(`
Frame w 400
  Frame hor, w full
    Frame w full, bg red
    Frame w 100, bg blue`)

      // Outer child (hor container) stretches to parent width
      expect(styles[1]['align-self']).toBe('stretch')

      // Inner w full child gets flex in horizontal context
      expect(styles[2]['flex']).toBe('1 1 0%')

      // Inner fixed child keeps width
      expect(styles[3]['width']).toBe('100px')
    })

    it('horizontal > vertical: h full in inner works correctly', () => {
      const styles = getAllStyles(`
Frame hor, h 400
  Frame h full
    Frame h full, bg red
    Frame h 50, bg blue`)

      // Outer child stretches to parent height
      expect(styles[1]['align-self']).toBe('stretch')

      // Inner h full child gets flex in vertical context
      expect(styles[2]['flex']).toBe('1 1 0%')

      // Inner fixed child keeps height
      expect(styles[3]['height']).toBe('50px')
    })
  })

  describe('Grid > Flex nesting', () => {
    it('w in Grid child is span, w in Flex grandchild is pixels', () => {
      const { parent, children } = getIRStyles(`
Frame grid 12
  Frame w 6
    Frame hor
      Frame w 100, bg red
      Frame w full, bg blue`)

      // Grid child: w 6 = span 6
      expect(getIRStyle(children[0], 'grid-column')).toBe('span 6')

      // Flex container inside grid
      const flexContainer = children[0].children[0]
      expect(getIRStyle(flexContainer, 'flex-direction')).toBe('row')

      // Flex children: normal flex behavior
      const fixedChild = flexContainer.children[0]
      const fullChild = flexContainer.children[1]

      expect(getIRStyle(fixedChild, 'width')).toBe('100px')
      expect(getIRStyle(fullChild, 'flex')).toBe('1 1 0%')
    })
  })

  describe('Stacked > Flex nesting', () => {
    it('child in stacked is absolute, grandchildren follow flex rules', () => {
      const { parent, children } = getIRStyles(`
Frame stacked, w 400, h 300
  Frame x 50, y 50, w 200
    Frame hor
      Frame w full, bg red
      Frame w 50, bg blue`)

      // Stacked child: absolute positioning
      expect(getIRStyle(children[0], 'position')).toBe('absolute')
      expect(getIRStyle(children[0], 'left')).toBe('50px')
      expect(getIRStyle(children[0], 'top')).toBe('50px')

      // Flex container inside stacked child
      const flexContainer = children[0].children[0]

      // Flex grandchildren: normal flex behavior
      const fullChild = flexContainer.children[0]
      const fixedChild = flexContainer.children[1]

      expect(getIRStyle(fullChild, 'flex')).toBe('1 1 0%')
      expect(getIRStyle(fixedChild, 'width')).toBe('50px')
    })
  })

  describe('Triple nesting', () => {
    it('three levels of w full cascade correctly', () => {
      const styles = getAllStyles(`
Frame w 400
  Frame w full
    Frame w full
      Frame w full, bg red`)

      // Each level should stretch/fill its parent
      expect(styles[1]['align-self']).toBe('stretch')
      expect(styles[2]['align-self']).toBe('stretch')
      expect(styles[3]['align-self']).toBe('stretch')
    })
  })
})

// =============================================================================
// WRAP BEHAVIOR
// =============================================================================

describe('Layout Context: Wrap Behavior', () => {
  it('wrap allows children to flow to next line', () => {
    const styles = getAllStyles(`
Frame hor, wrap, w 200, gap 8
  Frame w 80, h 40, bg red
  Frame w 80, h 40, bg green
  Frame w 80, h 40, bg blue`)

    expect(styles[0]['flex-wrap']).toBe('wrap')
    expect(styles[0]['gap']).toBe('8px')

    // All children have fixed sizes
    expect(styles[1]['width']).toBe('80px')
    expect(styles[2]['width']).toBe('80px')
    expect(styles[3]['width']).toBe('80px')
  })

  it('wrap + w full: full-width items stack', () => {
    const styles = getAllStyles(`
Frame hor, wrap, w 300
  Frame w full, h 40, bg red
  Frame w full, h 40, bg blue`)

    expect(styles[0]['flex-wrap']).toBe('wrap')

    // Both children want full width - they'll stack
    expect(styles[1]['flex']).toBe('1 1 0%')
    expect(styles[2]['flex']).toBe('1 1 0%')
  })
})

// =============================================================================
// GAP INTERACTIONS
// =============================================================================

describe('Layout Context: Gap Interactions', () => {
  it('gap with multiple fixed children', () => {
    const styles = getAllStyles(`
Frame hor, gap 16
  Frame w 100, bg red
  Frame w 100, bg green
  Frame w 100, bg blue`)

    expect(styles[0]['gap']).toBe('16px')
    // Children keep their fixed sizes
    expect(styles[1]['width']).toBe('100px')
    expect(styles[2]['width']).toBe('100px')
    expect(styles[3]['width']).toBe('100px')
  })

  it('gap with mixed fixed + full children', () => {
    const styles = getAllStyles(`
Frame hor, gap 16, w 400
  Frame w 100, bg red
  Frame w full, bg green
  Frame w 100, bg blue`)

    expect(styles[0]['gap']).toBe('16px')
    // Fixed children keep size
    expect(styles[1]['width']).toBe('100px')
    expect(styles[3]['width']).toBe('100px')
    // Full child fills remaining (minus gaps)
    expect(styles[2]['flex']).toBe('1 1 0%')
  })

  it('gap-x and gap-y in grid with children', () => {
    const { parent, children } = getIRStyles(`
Frame grid 3, gap-x 16, gap-y 24
  Frame w 1, bg red
  Frame w 1, bg green
  Frame w 1, bg blue`)

    expect(getIRStyle(parent, 'column-gap')).toBe('16px')
    expect(getIRStyle(parent, 'row-gap')).toBe('24px')

    // All children span 1 column
    expect(getIRStyle(children[0], 'grid-column')).toBe('span 1')
    expect(getIRStyle(children[1], 'grid-column')).toBe('span 1')
    expect(getIRStyle(children[2], 'grid-column')).toBe('span 1')
  })
})

// =============================================================================
// REAL-WORLD PATTERNS
// =============================================================================

describe('Layout Context: Real-World Patterns', () => {
  describe('App Shell', () => {
    it('header + sidebar + content + footer', () => {
      const styles = getAllStyles(`
Frame w 800, h 600
  Frame h 60, w full, bg gray
  Frame hor, h full
    Frame w 200, h full, bg darkgray
    Frame w full, h full, bg white
  Frame h 40, w full, bg gray`)

      // Container
      expect(styles[0]['width']).toBe('800px')
      expect(styles[0]['height']).toBe('600px')

      // Header: full width, fixed height
      expect(styles[1]['height']).toBe('60px')
      expect(styles[1]['align-self']).toBe('stretch')

      // Middle row: fills height
      expect(styles[2]['flex']).toBe('1 1 0%')
      expect(styles[2]['flex-direction']).toBe('row')

      // Sidebar: fixed width
      expect(styles[3]['width']).toBe('200px')

      // Content: fills width
      expect(styles[4]['flex']).toBe('1 1 0%')

      // Footer: full width, fixed height
      expect(styles[5]['height']).toBe('40px')
      expect(styles[5]['align-self']).toBe('stretch')
    })
  })

  describe('Card Grid', () => {
    it('grid of equal cards', () => {
      const { parent, children } = getIRStyles(`
Frame grid 3, gap 16
  Frame h 2, bg white
  Frame h 2, bg white
  Frame h 2, bg white
  Frame h 2, bg white
  Frame h 2, bg white
  Frame h 2, bg white`)

      expect(getIRStyle(parent, 'display')).toBe('grid')
      expect(getIRStyle(parent, 'grid-template-columns')).toBe('repeat(3, 1fr)')
      expect(getIRStyle(parent, 'gap')).toBe('16px')

      // All cards span 2 rows
      for (const child of children) {
        expect(getIRStyle(child, 'grid-row')).toBe('span 2')
      }
    })
  })

  describe('Toolbar', () => {
    it('buttons with spacing and center alignment', () => {
      const styles = getAllStyles(`
Frame hor, center, gap 8, pad 12, bg gray
  Button "Save"
  Button "Cancel"
  Button "Delete"`)

      expect(styles[0]['flex-direction']).toBe('row')
      expect(styles[0]['justify-content']).toBe('center')
      expect(styles[0]['align-items']).toBe('center')
      expect(styles[0]['gap']).toBe('8px')
      expect(styles[0]['padding']).toBe('12px')
    })
  })

  describe('Split Panel', () => {
    it('two resizable panels', () => {
      const styles = getAllStyles(`
Frame hor, w 800, h 400
  Frame w full, bg white
  Frame w 4, bg gray
  Frame w full, bg white`)

      // Both panels fill equally
      expect(styles[1]['flex']).toBe('1 1 0%')
      expect(styles[3]['flex']).toBe('1 1 0%')

      // Divider is fixed
      expect(styles[2]['width']).toBe('4px')
      expect(styles[2]['flex-shrink']).toBe('0')
    })
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Layout Context: Edge Cases', () => {
  it('empty parent with sizing', () => {
    const styles = getAllStyles(`
Frame w 200, h 100, center, bg gray`)

    expect(styles[0]['width']).toBe('200px')
    expect(styles[0]['height']).toBe('100px')
    expect(styles[0]['justify-content']).toBe('center')
    expect(styles[0]['align-items']).toBe('center')
  })

  it('single child inherits nothing special', () => {
    const styles = getAllStyles(`
Frame w 400, h 300
  Frame w 100, h 50, bg red`)

    expect(styles[1]['width']).toBe('100px')
    expect(styles[1]['height']).toBe('50px')
  })

  it('deeply nested single children', () => {
    const styles = getAllStyles(`
Frame w 400
  Frame w full
    Frame w full
      Frame w full
        Frame w 100, bg red`)

    // All intermediates stretch
    expect(styles[1]['align-self']).toBe('stretch')
    expect(styles[2]['align-self']).toBe('stretch')
    expect(styles[3]['align-self']).toBe('stretch')

    // Innermost has explicit size
    expect(styles[4]['width']).toBe('100px')
  })

  it('conflicting constraints resolve correctly', () => {
    // w full + w 100 on same element - last wins
    const styles = getAllStyles(`
Frame w 400
  Frame w full, w 100, bg red`)

    // w 100 should win (last value)
    expect(styles[1]['width']).toBe('100px')
  })
})

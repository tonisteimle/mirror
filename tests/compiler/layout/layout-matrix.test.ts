/**
 * Layout Matrix Tests
 *
 * Systematically tests all layout combinations in Mirror using matrix-based generation.
 * This file generates tests from the layout-matrix-definition.ts file.
 *
 * Test Categories:
 * 1. Direct CSS mappings (EXPECTED_CSS)
 * 2. Parent-Child context tests (CHILD_IN_PARENT_MATRIX)
 * 3. Conflict resolution (CONFLICT_TESTS)
 * 4. Edge cases (EDGE_CASE_TESTS)
 * 5. Pairwise generated combinations
 *
 * Reference: docs/concepts/layout-css-matrix.md
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../../compiler/parser/parser'
import { generateDOM } from '../../../compiler/backends/dom'
import { toIR } from '../../../compiler/ir'

import {
  EXPECTED_CSS,
  CHILD_IN_PARENT_MATRIX,
  CONFLICT_TESTS,
  EDGE_CASE_TESTS,
  SCROLL_TESTS,
  POSITION_TESTS,
  SIZING_TESTS,
  VISIBILITY_TESTS,
  ASPECT_TESTS,
  FLEX_ITEM_TESTS,
  HUG_TESTS,
  buildMirrorCode,
  lookupExpectedCSS,
} from './layout-matrix-definition'

import {
  generateStrategicCombinations,
  getCoverageStats,
} from './pairwise-generator'

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Extract CSS styles from generated DOM JavaScript code.
 * Returns array of style objects in node order.
 */
function getStyles(code: string): Record<string, string>[] {
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

/**
 * Get styles for root element.
 */
function getRootStyles(code: string): Record<string, string> {
  const allStyles = getStyles(code)
  return allStyles[0] || {}
}

/**
 * Get styles for element at specific index.
 */
function getStyleAt(code: string, index: number): Record<string, string> {
  const allStyles = getStyles(code)
  return allStyles[index] || {}
}

/**
 * Get IR node style helper.
 */
function getIRStyle(node: any, property: string): string | undefined {
  const style = node.styles?.find((s: any) => s.property === property)
  return style?.value
}

/**
 * Check IR node has style.
 */
function hasIRStyle(node: any, property: string, value: string): boolean {
  return node.styles?.some((s: any) => s.property === property && s.value === value) || false
}

// =============================================================================
// 1. EXPECTED CSS DIRECT MAPPINGS
// =============================================================================

describe('Layout Matrix: Direct CSS Mappings', () => {
  const entries = Object.entries(EXPECTED_CSS)

  for (const [mirrorCode, expectedProps] of entries) {
    it(`${mirrorCode} → ${JSON.stringify(expectedProps)}`, () => {
      const styles = getRootStyles(mirrorCode)

      for (const [prop, expectedValue] of Object.entries(expectedProps)) {
        expect(styles[prop], `${mirrorCode}: expected ${prop} to be "${expectedValue}"`).toBe(expectedValue)
      }
    })
  }
})

// =============================================================================
// 2. PARENT-CHILD CONTEXT TESTS
// =============================================================================

describe('Layout Matrix: Parent-Child Context', () => {
  for (const testCase of CHILD_IN_PARENT_MATRIX) {
    const { parent, child, expectedCSS, description } = testCase

    // Skip tests that require IR-level checking (grid, stacked, directional positioning)
    const needsIR = parent.includes('grid') ||
                    parent.includes('stacked') ||
                    child.includes('x ') ||
                    child.includes('y ') ||
                    child.includes('bottom') ||
                    child.includes('top') ||
                    child.includes('left') ||
                    child.includes('right') ||
                    (parent.includes('stacked') && child.includes('center'))

    if (needsIR) {
      it(description || `${parent} > ${child}`, () => {
        const code = `
${parent}
  ${child}`

        const ir = toIR(parse(code))
        const parentNode = ir.nodes[0]
        const childNode = parentNode.children?.[0]

        if (!childNode) {
          throw new Error(`No child node found for: ${parent} > ${child}`)
        }

        for (const [prop, expectedValue] of Object.entries(expectedCSS)) {
          const actualValue = getIRStyle(childNode, prop)
          expect(actualValue, `Child ${prop} should be "${expectedValue}" but got "${actualValue}"`).toBe(expectedValue)
        }
      })
    } else {
      // Use DOM backend for flex-based tests
      it(description || `${parent} > ${child}`, () => {
        const code = `
${parent}
  ${child}, bg red`

        const childStyles = getStyleAt(code, 1)

        for (const [prop, expectedValue] of Object.entries(expectedCSS)) {
          expect(childStyles[prop], `Child ${prop} should be "${expectedValue}"`).toBe(expectedValue)
        }
      })
    }
  }
})

// =============================================================================
// 3. CONFLICT RESOLUTION TESTS
// =============================================================================

describe('Layout Matrix: Conflict Resolution', () => {
  for (const testCase of CONFLICT_TESTS) {
    const { code, expectedCSS, description } = testCase

    it(description, () => {
      const styles = getRootStyles(code)

      for (const [prop, expectedValue] of Object.entries(expectedCSS)) {
        expect(styles[prop], `${code}: ${prop}`).toBe(expectedValue)
      }
    })
  }
})

// =============================================================================
// 4. EDGE CASE TESTS
// =============================================================================

describe('Layout Matrix: Edge Cases', () => {
  for (const testCase of EDGE_CASE_TESTS) {
    const { code, expectedCSS, description } = testCase

    it(description, () => {
      const styles = getRootStyles(code)

      for (const [prop, expectedValue] of Object.entries(expectedCSS)) {
        expect(styles[prop], `${code}: ${prop}`).toBe(expectedValue)
      }
    })
  }
})

// =============================================================================
// 4b. SCROLL & OVERFLOW TESTS
// =============================================================================

describe('Layout Matrix: Scroll & Overflow', () => {
  for (const testCase of SCROLL_TESTS) {
    const { code, expectedCSS, description } = testCase

    it(description, () => {
      const styles = getRootStyles(code)

      for (const [prop, expectedValue] of Object.entries(expectedCSS)) {
        expect(styles[prop], `${code}: ${prop}`).toBe(expectedValue)
      }
    })
  }
})

// =============================================================================
// 4c. POSITION TESTS
// =============================================================================

describe('Layout Matrix: Position', () => {
  for (const testCase of POSITION_TESTS) {
    const { code, expectedCSS, description } = testCase

    it(description, () => {
      const styles = getRootStyles(code)

      for (const [prop, expectedValue] of Object.entries(expectedCSS)) {
        expect(styles[prop], `${code}: ${prop}`).toBe(expectedValue)
      }
    })
  }
})

// =============================================================================
// 4d. SIZING TESTS (min/max)
// =============================================================================

describe('Layout Matrix: Sizing (min/max)', () => {
  for (const testCase of SIZING_TESTS) {
    const { code, expectedCSS, description } = testCase

    it(description, () => {
      const styles = getRootStyles(code)

      for (const [prop, expectedValue] of Object.entries(expectedCSS)) {
        expect(styles[prop], `${code}: ${prop}`).toBe(expectedValue)
      }
    })
  }
})

// =============================================================================
// 4e. VISIBILITY TESTS
// =============================================================================

describe('Layout Matrix: Visibility', () => {
  for (const testCase of VISIBILITY_TESTS) {
    const { code, expectedCSS, description } = testCase

    it(description, () => {
      const styles = getRootStyles(code)

      for (const [prop, expectedValue] of Object.entries(expectedCSS)) {
        expect(styles[prop], `${code}: ${prop}`).toBe(expectedValue)
      }
    })
  }
})

// =============================================================================
// 4f. ASPECT RATIO TESTS
// =============================================================================

describe('Layout Matrix: Aspect Ratio', () => {
  for (const testCase of ASPECT_TESTS) {
    const { code, expectedCSS, description } = testCase

    it(description, () => {
      const styles = getRootStyles(code)

      for (const [prop, expectedValue] of Object.entries(expectedCSS)) {
        expect(styles[prop], `${code}: ${prop}`).toBe(expectedValue)
      }
    })
  }
})

// =============================================================================
// 4g. FLEX ITEM BEHAVIOR TESTS
// =============================================================================

describe('Layout Matrix: Flex Item Behavior', () => {
  for (const testCase of FLEX_ITEM_TESTS) {
    const { code, expectedCSS, description } = testCase

    it(description, () => {
      const styles = getRootStyles(code)

      for (const [prop, expectedValue] of Object.entries(expectedCSS)) {
        expect(styles[prop], `${code}: ${prop}`).toBe(expectedValue)
      }
    })
  }
})

// =============================================================================
// 4h. HUG SIZING TESTS
// =============================================================================

describe('Layout Matrix: Hug Sizing', () => {
  for (const testCase of HUG_TESTS) {
    const { code, expectedCSS, description } = testCase

    it(description, () => {
      const styles = getRootStyles(code)

      for (const [prop, expectedValue] of Object.entries(expectedCSS)) {
        expect(styles[prop], `${code}: ${prop}`).toBe(expectedValue)
      }
    })
  }
})

// =============================================================================
// 5. STRATEGIC PAIRWISE COMBINATIONS
// =============================================================================

describe('Layout Matrix: Strategic Combinations', () => {
  const combinations = generateStrategicCombinations()

  // Log coverage stats
  const stats = getCoverageStats(combinations)
  console.log(`Coverage: ${(stats.coverage * 100).toFixed(1)}% (${stats.coveredPairs}/${stats.totalPairs} pairs)`)
  console.log(`Test count: ${stats.testCount}`)

  for (const combo of combinations) {
    const code = buildMirrorCode(combo)
    const expected = lookupExpectedCSS(code)

    it(`${code}`, () => {
      const styles = getRootStyles(code)

      // Check that all expected properties are present
      for (const [prop, expectedValue] of Object.entries(expected)) {
        // Skip flex-direction check for grid (it's not applicable)
        if (code.includes('grid') && (prop === 'flex-direction' || prop === 'align-items')) {
          continue
        }
        // Skip flex properties for stacked
        if (code.includes('stacked') && (prop === 'flex-direction' || prop === 'align-items')) {
          continue
        }

        expect(styles[prop], `${code}: expected ${prop} = "${expectedValue}"`).toBe(expectedValue)
      }
    })
  }
})

// =============================================================================
// 6. CATEGORY-SPECIFIC DEEP TESTS
// =============================================================================

describe('Layout Matrix: Direction (Deep)', () => {
  it('default → flex column with align-items: flex-start', () => {
    const styles = getRootStyles('Frame')
    expect(styles['display']).toBe('flex')
    expect(styles['flex-direction']).toBe('column')
    expect(styles['align-items']).toBe('flex-start')
  })

  it('hor → flex row with align-items: flex-start', () => {
    const styles = getRootStyles('Frame hor')
    expect(styles['display']).toBe('flex')
    expect(styles['flex-direction']).toBe('row')
    expect(styles['align-items']).toBe('flex-start')
  })

  // REGRESSION: Frame hor used to have align-items: center
  // This was asymmetric with Frame ver which had flex-start
  // Now BOTH default to flex-start for consistency
  it('REGRESSION: Frame hor does NOT auto-center vertically', () => {
    const styles = getRootStyles('Frame hor')
    // MUST be flex-start, NOT center
    expect(styles['align-items']).toBe('flex-start')
    expect(styles['align-items']).not.toBe('center')
  })

  it('REGRESSION: Frame ver and Frame hor have SAME align-items default', () => {
    const verStyles = getRootStyles('Frame ver')
    const horStyles = getRootStyles('Frame hor')
    // Both should have the same default
    expect(verStyles['align-items']).toBe(horStyles['align-items'])
    expect(verStyles['align-items']).toBe('flex-start')
  })

  it('Frame hor, center → explicit centering still works', () => {
    const styles = getRootStyles('Frame hor, center')
    expect(styles['align-items']).toBe('center')
    expect(styles['justify-content']).toBe('center')
  })

  it('ver → explicit flex column', () => {
    const styles = getRootStyles('Frame ver')
    expect(styles['display']).toBe('flex')
    expect(styles['flex-direction']).toBe('column')
  })

  it('hor, ver → ver wins (last value)', () => {
    const styles = getRootStyles('Frame hor, ver')
    expect(styles['flex-direction']).toBe('column')
  })

  it('ver, hor → hor wins (last value)', () => {
    const styles = getRootStyles('Frame ver, hor')
    expect(styles['flex-direction']).toBe('row')
  })
})

describe('Layout Matrix: 9-Zone Alignment (Deep)', () => {
  const zones = [
    { code: 'tl', justify: 'flex-start', align: 'flex-start' },
    { code: 'tc', justify: 'flex-start', align: 'center' },
    { code: 'tr', justify: 'flex-start', align: 'flex-end' },
    { code: 'cl', justify: 'center', align: 'flex-start' },
    { code: 'center', justify: 'center', align: 'center' },
    { code: 'cr', justify: 'center', align: 'flex-end' },
    { code: 'bl', justify: 'flex-end', align: 'flex-start' },
    { code: 'bc', justify: 'flex-end', align: 'center' },
    { code: 'br', justify: 'flex-end', align: 'flex-end' },
  ]

  for (const { code, justify, align } of zones) {
    it(`${code} → justify-content: ${justify}, align-items: ${align}`, () => {
      const styles = getRootStyles(`Frame ${code}`)
      expect(styles['justify-content']).toBe(justify)
      expect(styles['align-items']).toBe(align)
    })
  }
})

describe('Layout Matrix: Single-Axis Center (Deep)', () => {
  // hor-center in column layout = align-items: center (horizontal centering)
  it('hor-center in column → align-items: center only', () => {
    const styles = getRootStyles('Frame hor-center')
    expect(styles['align-items']).toBe('center')
    expect(styles['justify-content']).toBeUndefined()
  })

  // hor-center in row layout = justify-content: center (horizontal centering)
  it('hor-center in row → justify-content: center only', () => {
    const styles = getRootStyles('Frame hor, hor-center')
    expect(styles['justify-content']).toBe('center')
    // align-items should be flex-start (default), not center
    expect(styles['align-items']).toBe('flex-start')
  })

  // ver-center in column layout = justify-content: center (vertical centering)
  it('ver-center in column → justify-content: center only', () => {
    const styles = getRootStyles('Frame ver-center')
    expect(styles['justify-content']).toBe('center')
    // align-items should be flex-start (default), not center
    expect(styles['align-items']).toBe('flex-start')
  })

  // ver-center in row layout = align-items: center (vertical centering)
  it('ver-center in row → align-items: center only', () => {
    const styles = getRootStyles('Frame hor, ver-center')
    expect(styles['align-items']).toBe('center')
    expect(styles['justify-content']).toBeUndefined()
  })

  // Combining hor-center + ver-center = same as center
  it('hor-center + ver-center = center (both axes)', () => {
    const styles = getRootStyles('Frame hor-center, ver-center')
    expect(styles['justify-content']).toBe('center')
    expect(styles['align-items']).toBe('center')
  })
})

describe('Layout Matrix: Sizing (Deep)', () => {
  it('w 200, h 100 → fixed dimensions', () => {
    const styles = getRootStyles('Frame w 200, h 100')
    expect(styles['width']).toBe('200px')
    expect(styles['height']).toBe('100px')
  })

  it('w hug → fit-content', () => {
    const styles = getRootStyles('Frame w hug')
    expect(styles['width']).toBe('fit-content')
  })

  it('h hug → fit-content', () => {
    const styles = getRootStyles('Frame h hug')
    expect(styles['height']).toBe('fit-content')
  })

  it('w full as child in vertical parent → width 100% + stretch (cross-axis)', () => {
    const styles = getStyleAt(`
Frame w 400
  Frame w full, bg red`, 1)
    // Cross-axis w full needs BOTH width: 100% AND align-self: stretch
    expect(styles['width']).toBe('100%')
    expect(styles['min-width']).toBe('0')
    expect(styles['align-self']).toBe('stretch')
  })

  it('h full as child → flex (main-axis)', () => {
    const styles = getStyleAt(`
Frame h 400
  Frame h full, bg red`, 1)
    expect(styles['flex']).toBe('1 1 0%')
    expect(styles['min-height']).toBe('0')
  })

  it('fixed width child gets flex-shrink: 0', () => {
    const styles = getStyleAt(`
Frame hor
  Frame w 100, bg red`, 1)
    expect(styles['width']).toBe('100px')
    expect(styles['flex-shrink']).toBe('0')
  })
})

describe('Layout Matrix: Grid (Deep)', () => {
  it('grid 12 → 12-column grid', () => {
    const ir = toIR(parse('Frame grid 12'))
    expect(hasIRStyle(ir.nodes[0], 'display', 'grid')).toBe(true)
    expect(hasIRStyle(ir.nodes[0], 'grid-template-columns', 'repeat(12, 1fr)')).toBe(true)
  })

  it('grid child w 4 → grid-column: span 4', () => {
    const ir = toIR(parse(`
Frame grid 12
  Frame w 4`))
    const child = ir.nodes[0].children[0]
    expect(hasIRStyle(child, 'grid-column', 'span 4')).toBe(true)
  })

  it('grid child h 2 → grid-row: span 2', () => {
    const ir = toIR(parse(`
Frame grid 12
  Frame h 2`))
    const child = ir.nodes[0].children[0]
    expect(hasIRStyle(child, 'grid-row', 'span 2')).toBe(true)
  })

  it('grid child x 2 → grid-column-start: 2', () => {
    const ir = toIR(parse(`
Frame grid 12
  Frame x 2`))
    const child = ir.nodes[0].children[0]
    expect(hasIRStyle(child, 'grid-column-start', '2')).toBe(true)
  })

  it('grid child y 3 → grid-row-start: 3', () => {
    const ir = toIR(parse(`
Frame grid 12
  Frame y 3`))
    const child = ir.nodes[0].children[0]
    expect(hasIRStyle(child, 'grid-row-start', '3')).toBe(true)
  })

  it('gap-x and gap-y work independently', () => {
    const ir = toIR(parse('Frame grid 3, gap-x 16, gap-y 24'))
    expect(hasIRStyle(ir.nodes[0], 'column-gap', '16px')).toBe(true)
    expect(hasIRStyle(ir.nodes[0], 'row-gap', '24px')).toBe(true)
  })

  it('row-height sets grid-auto-rows', () => {
    const ir = toIR(parse('Frame grid 3, row-height 100'))
    expect(hasIRStyle(ir.nodes[0], 'grid-auto-rows', '100px')).toBe(true)
  })
})

describe('Layout Matrix: Stacked (Deep)', () => {
  it('stacked → position: relative', () => {
    const ir = toIR(parse('Frame stacked'))
    expect(hasIRStyle(ir.nodes[0], 'position', 'relative')).toBe(true)
  })

  it('child with x/y in stacked → position: absolute', () => {
    const ir = toIR(parse(`
Frame stacked
  Frame x 50, y 30`))
    const child = ir.nodes[0].children[0]
    expect(hasIRStyle(child, 'position', 'absolute')).toBe(true)
    expect(hasIRStyle(child, 'left', '50px')).toBe(true)
    expect(hasIRStyle(child, 'top', '30px')).toBe(true)
  })

  it('child with bottom in stacked → position: absolute, bottom: 0', () => {
    const ir = toIR(parse(`
Frame stacked
  Frame bottom`))
    const child = ir.nodes[0].children[0]
    expect(hasIRStyle(child, 'position', 'absolute')).toBe(true)
    expect(hasIRStyle(child, 'bottom', '0')).toBe(true)
  })

  it('child with center in stacked → centered with transform', () => {
    const ir = toIR(parse(`
Frame stacked
  Frame center`))
    const child = ir.nodes[0].children[0]
    expect(hasIRStyle(child, 'position', 'absolute')).toBe(true)
    expect(hasIRStyle(child, 'top', '50%')).toBe(true)
    expect(hasIRStyle(child, 'left', '50%')).toBe(true)
    expect(hasIRStyle(child, 'transform', 'translate(-50%, -50%)')).toBe(true)
  })

  it('child with w full, h full in stacked → 100%', () => {
    const ir = toIR(parse(`
Frame stacked
  Frame w full, h full`))
    const child = ir.nodes[0].children[0]
    expect(hasIRStyle(child, 'position', 'absolute')).toBe(true)
    expect(hasIRStyle(child, 'width', '100%')).toBe(true)
    expect(hasIRStyle(child, 'height', '100%')).toBe(true)
  })

  it('z property sets z-index', () => {
    const ir = toIR(parse(`
Frame stacked
  Frame x 100, y 50, z 10`))
    const child = ir.nodes[0].children[0]
    expect(hasIRStyle(child, 'z-index', '10')).toBe(true)
  })
})

describe('Layout Matrix: Complex Combinations', () => {
  it('sidebar pattern: fix + flex + fix', () => {
    const styles = getStyles(`
Frame hor, w 400, h 200
  Frame w 60, bg gray
  Frame w full, bg blue
  Frame w 60, bg gray`)

    // Parent is flex row
    expect(styles[0]['flex-direction']).toBe('row')

    // First sidebar: fixed, no shrink
    expect(styles[1]['width']).toBe('60px')
    expect(styles[1]['flex-shrink']).toBe('0')

    // Center: flex fill
    expect(styles[2]['flex']).toBe('1 1 0%')

    // Second sidebar: fixed, no shrink
    expect(styles[3]['width']).toBe('60px')
    expect(styles[3]['flex-shrink']).toBe('0')
  })

  it('multiple w full children in vertical parent get width 100%', () => {
    const styles = getStyles(`
Frame h 200
  Frame w full, bg red
  Frame w full, bg blue`)

    // Cross-axis w full needs BOTH width: 100% AND align-self: stretch
    expect(styles[1]['width']).toBe('100%')
    expect(styles[1]['align-self']).toBe('stretch')
    expect(styles[2]['width']).toBe('100%')
    expect(styles[2]['align-self']).toBe('stretch')
  })

  it('nested full widths cascade correctly with width 100%', () => {
    const styles = getStyles(`
Frame w 400
  Frame w full
    Frame w full, bg red`)

    // All cross-axis w full get width: 100% + align-self: stretch
    expect(styles[1]['width']).toBe('100%')
    expect(styles[1]['align-self']).toBe('stretch')
    expect(styles[2]['width']).toBe('100%')
    expect(styles[2]['align-self']).toBe('stretch')
  })

  it('12-column grid with positioned items', () => {
    const ir = toIR(parse(`
Frame grid 12, gap 16
  Frame x 1, w 3
  Frame x 4, w 6
  Frame x 10, w 3`))

    const container = ir.nodes[0]
    expect(hasIRStyle(container, 'display', 'grid')).toBe(true)
    expect(hasIRStyle(container, 'gap', '16px')).toBe(true)

    // First child: column 1, span 3
    expect(getIRStyle(container.children[0], 'grid-column-start')).toBe('1')
    expect(getIRStyle(container.children[0], 'grid-column')).toBe('span 3')

    // Second child: column 4, span 6
    expect(getIRStyle(container.children[1], 'grid-column-start')).toBe('4')
    expect(getIRStyle(container.children[1], 'grid-column')).toBe('span 6')

    // Third child: column 10, span 3
    expect(getIRStyle(container.children[2], 'grid-column-start')).toBe('10')
    expect(getIRStyle(container.children[2], 'grid-column')).toBe('span 3')
  })
})

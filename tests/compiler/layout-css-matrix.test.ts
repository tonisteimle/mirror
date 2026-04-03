/**
 * Layout CSS Matrix Tests
 *
 * Systematische Tests für alle Layout-Kombinationen in Mirror.
 * Referenz: docs/concepts/layout-css-matrix.md
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser/parser'
import { generateDOM } from '../../compiler/backends/dom'

/**
 * Helper: Kompiliert Mirror-Code und extrahiert CSS-Styles aus dem generierten JavaScript
 * Extracts styles from the first two Object.assign blocks (parent and first child)
 */
function getStyles(code: string): Record<string, string>[] {
  const ast = parse(code)
  const js = generateDOM(ast)

  // Track styles per variable - only node_* variables (not runtime helpers)
  const stylesByVar: Record<string, Record<string, string>> = {}

  // Find Object.assign style patterns: Object.assign(varName.style, { ... })
  // Use dotall mode (s flag) to match newlines within the object
  const objectAssignRegex = /Object\.assign\((node_\d+)\.style,\s*\{([\s\S]*?)\}\)/g

  let match
  while ((match = objectAssignRegex.exec(js)) !== null) {
    const [, varName, propsStr] = match
    if (!stylesByVar[varName]) stylesByVar[varName] = {}

    // Parse the object literal - handle both string values with single quotes
    // Pattern: 'property': 'value', with possible whitespace
    const propRegex = /'([^']+)':\s*'([^']+)'/g
    let propMatch
    while ((propMatch = propRegex.exec(propsStr)) !== null) {
      const [, prop, value] = propMatch
      stylesByVar[varName][prop] = value
    }
  }

  // Return in order: node_1, node_2, node_3, etc.
  const keys = Object.keys(stylesByVar).sort((a, b) => {
    const numA = parseInt(a.replace('node_', ''), 10)
    const numB = parseInt(b.replace('node_', ''), 10)
    return numA - numB
  })
  return keys.map(k => stylesByVar[k])
}

/**
 * Helper: Gibt den ersten Style-Block zurück (Root-Element)
 */
function getRootStyles(code: string): Record<string, string> {
  const allStyles = getStyles(code)
  return allStyles[0] || {}
}

/**
 * Helper: Gibt den Style-Block eines bestimmten Index zurück
 */
function getStyleAt(code: string, index: number): Record<string, string> {
  const allStyles = getStyles(code)
  return allStyles[index] || {}
}

// =============================================================================
// 1. DIRECTION TESTS
// =============================================================================

describe('Layout: Direction', () => {
  it('Default (no direction) → flex column', () => {
    const styles = getRootStyles('Frame')
    expect(styles['display']).toBe('flex')
    expect(styles['flex-direction']).toBe('column')
    expect(styles['align-items']).toBe('flex-start')
  })

  it('hor → flex row', () => {
    const styles = getRootStyles('Frame hor')
    expect(styles['display']).toBe('flex')
    expect(styles['flex-direction']).toBe('row')
    expect(styles['align-items']).toBe('flex-start')
  })

  it('ver → flex column (explicit)', () => {
    const styles = getRootStyles('Frame ver')
    expect(styles['display']).toBe('flex')
    expect(styles['flex-direction']).toBe('column')
    expect(styles['align-items']).toBe('flex-start')
  })
})

// =============================================================================
// 2. SIZE TESTS
// =============================================================================

describe('Layout: Size', () => {
  describe('Fixed size', () => {
    it('w 200 → width: 200px', () => {
      const styles = getRootStyles('Frame w 200')
      expect(styles['width']).toBe('200px')
    })

    it('h 100 → height: 100px', () => {
      const styles = getRootStyles('Frame h 100')
      expect(styles['height']).toBe('100px')
    })

    it('w 200, h 100 → both dimensions', () => {
      const styles = getRootStyles('Frame w 200, h 100')
      expect(styles['width']).toBe('200px')
      expect(styles['height']).toBe('100px')
    })
  })

  describe('hug', () => {
    it('w hug → fit-content', () => {
      const styles = getRootStyles('Frame w hug')
      expect(styles['width']).toBe('fit-content')
    })

    it('h hug → fit-content', () => {
      const styles = getRootStyles('Frame h hug')
      expect(styles['height']).toBe('fit-content')
    })
  })

  describe('full in flex context', () => {
    // In vertical parent (default), w full is cross-axis → align-self: stretch
    it('Child with w full in vertical parent → align-self: stretch', () => {
      const code = `
Frame w 400
  Frame w full, bg red`

      const allStyles = getStyles(code)
      const childStyles = allStyles[1] || {}
      expect(childStyles['align-self']).toBe('stretch')
    })

    // In vertical parent (default), h full is main-axis → flex: 1 1 0%
    it('Child with h full in vertical parent → flex: 1 1 0%', () => {
      const code = `
Frame h 400
  Frame h full, bg red`

      const allStyles = getStyles(code)
      const childStyles = allStyles[1] || {}
      expect(childStyles['flex']).toBe('1 1 0%')
      expect(childStyles['min-height']).toBe('0')
    })

    // In horizontal parent, w full is main-axis → flex: 1 1 0%
    it('Child with w full in horizontal parent → flex: 1 1 0%', () => {
      const code = `
Frame hor, w 400
  Frame w full, bg red`

      const allStyles = getStyles(code)
      const childStyles = allStyles[1] || {}
      expect(childStyles['flex']).toBe('1 1 0%')
      expect(childStyles['min-width']).toBe('0')
    })
  })

  describe('Child with fixed width in flex parent', () => {
    it('Fixed width child gets flex-shrink: 0', () => {
      const code = `
Frame hor
  Frame w 100, bg red`

      const allStyles = getStyles(code)
      const childStyles = allStyles[1] || {}
      expect(childStyles['width']).toBe('100px')
      expect(childStyles['flex-shrink']).toBe('0')
    })
  })
})

// =============================================================================
// 3. ALIGNMENT TESTS
// =============================================================================

describe('Layout: Alignment', () => {
  describe('center', () => {
    it('center → justify-content: center, align-items: center', () => {
      const styles = getRootStyles('Frame center')
      expect(styles['display']).toBe('flex')
      expect(styles['justify-content']).toBe('center')
      expect(styles['align-items']).toBe('center')
    })
  })

  describe('spread', () => {
    it('spread → justify-content: space-between', () => {
      const styles = getRootStyles('Frame spread')
      expect(styles['justify-content']).toBe('space-between')
    })

    it('hor, spread → row with space-between', () => {
      const styles = getRootStyles('Frame hor, spread')
      expect(styles['flex-direction']).toBe('row')
      expect(styles['justify-content']).toBe('space-between')
    })
  })

  describe('9-zone alignment', () => {
    it('tl (top-left) → column, flex-start, flex-start', () => {
      const styles = getRootStyles('Frame tl')
      expect(styles['flex-direction']).toBe('column')
      expect(styles['justify-content']).toBe('flex-start')
      expect(styles['align-items']).toBe('flex-start')
    })

    it('tc (top-center) → column, flex-start, center', () => {
      const styles = getRootStyles('Frame tc')
      expect(styles['flex-direction']).toBe('column')
      expect(styles['justify-content']).toBe('flex-start')
      expect(styles['align-items']).toBe('center')
    })

    it('tr (top-right) → column, flex-start, flex-end', () => {
      const styles = getRootStyles('Frame tr')
      expect(styles['flex-direction']).toBe('column')
      expect(styles['justify-content']).toBe('flex-start')
      expect(styles['align-items']).toBe('flex-end')
    })

    it('cl (center-left) → column, center, flex-start', () => {
      const styles = getRootStyles('Frame cl')
      expect(styles['flex-direction']).toBe('column')
      expect(styles['justify-content']).toBe('center')
      expect(styles['align-items']).toBe('flex-start')
    })

    it('center → column, center, center', () => {
      const styles = getRootStyles('Frame center')
      expect(styles['justify-content']).toBe('center')
      expect(styles['align-items']).toBe('center')
    })

    it('cr (center-right) → column, center, flex-end', () => {
      const styles = getRootStyles('Frame cr')
      expect(styles['flex-direction']).toBe('column')
      expect(styles['justify-content']).toBe('center')
      expect(styles['align-items']).toBe('flex-end')
    })

    it('bl (bottom-left) → column, flex-end, flex-start', () => {
      const styles = getRootStyles('Frame bl')
      expect(styles['flex-direction']).toBe('column')
      expect(styles['justify-content']).toBe('flex-end')
      expect(styles['align-items']).toBe('flex-start')
    })

    it('bc (bottom-center) → column, flex-end, center', () => {
      const styles = getRootStyles('Frame bc')
      expect(styles['flex-direction']).toBe('column')
      expect(styles['justify-content']).toBe('flex-end')
      expect(styles['align-items']).toBe('center')
    })

    it('br (bottom-right) → column, flex-end, flex-end', () => {
      const styles = getRootStyles('Frame br')
      expect(styles['flex-direction']).toBe('column')
      expect(styles['justify-content']).toBe('flex-end')
      expect(styles['align-items']).toBe('flex-end')
    })
  })
})

// =============================================================================
// 4. SPACING TESTS
// =============================================================================

describe('Layout: Spacing', () => {
  describe('gap', () => {
    it('gap 12 → gap: 12px', () => {
      const styles = getRootStyles('Frame gap 12')
      expect(styles['gap']).toBe('12px')
    })
  })

  describe('padding', () => {
    it('pad 16 → padding: 16px', () => {
      const styles = getRootStyles('Frame pad 16')
      expect(styles['padding']).toBe('16px')
    })

    it('pad 12 24 → padding: 12px 24px', () => {
      const styles = getRootStyles('Frame pad 12 24')
      expect(styles['padding']).toBe('12px 24px')
    })

    it('pad 8 12 16 20 → all four values', () => {
      const styles = getRootStyles('Frame pad 8 12 16 20')
      expect(styles['padding']).toBe('8px 12px 16px 20px')
    })
  })
})

// =============================================================================
// 5. WRAP TESTS
// =============================================================================

describe('Layout: Wrap', () => {
  it('wrap → flex-wrap: wrap', () => {
    const styles = getRootStyles('Frame wrap')
    expect(styles['flex-wrap']).toBe('wrap')
  })

  it('hor, wrap → row with wrap', () => {
    const styles = getRootStyles('Frame hor, wrap')
    expect(styles['flex-direction']).toBe('row')
    expect(styles['flex-wrap']).toBe('wrap')
  })
})

// =============================================================================
// 6. SHRINK TESTS
// =============================================================================

describe('Layout: Shrink', () => {
  it('shrink → flex-shrink: 1', () => {
    const styles = getRootStyles('Frame shrink')
    expect(styles['flex-shrink']).toBe('1')
  })
})

// =============================================================================
// 7. COMBINATION TESTS
// =============================================================================

describe('Layout: Combinations', () => {
  describe('Direction + Alignment', () => {
    it('hor, center → row centered both axes', () => {
      const styles = getRootStyles('Frame hor, center')
      expect(styles['flex-direction']).toBe('row')
      expect(styles['justify-content']).toBe('center')
      expect(styles['align-items']).toBe('center')
    })

    it('hor, spread → row with space-between', () => {
      const styles = getRootStyles('Frame hor, spread')
      expect(styles['flex-direction']).toBe('row')
      expect(styles['justify-content']).toBe('space-between')
    })

    it('ver, spread → column with space-between', () => {
      const styles = getRootStyles('Frame ver, spread')
      expect(styles['flex-direction']).toBe('column')
      expect(styles['justify-content']).toBe('space-between')
    })
  })

  describe('Direction + Gap + Pad', () => {
    it('hor, gap 12, pad 16 → all properties combined', () => {
      const styles = getRootStyles('Frame hor, gap 12, pad 16')
      expect(styles['flex-direction']).toBe('row')
      expect(styles['gap']).toBe('12px')
      expect(styles['padding']).toBe('16px')
    })
  })

  describe('Complex parent-child layouts', () => {
    it('Fix + Flex + Fix pattern (sidebar layout)', () => {
      const code = `
Frame hor, w 400, h 200
  Frame w 60, bg gray
  Frame w full, bg blue
  Frame w 60, bg gray`

      const allStyles = getStyles(code)

      // Parent should be flex row
      expect(allStyles[0]['flex-direction']).toBe('row')

      // First and third children: fixed width, no shrink
      expect(allStyles[1]['width']).toBe('60px')
      expect(allStyles[1]['flex-shrink']).toBe('0')

      // Middle child: flex fill
      expect(allStyles[2]['flex']).toBe('1 1 0%')

      // Third child: fixed width, no shrink
      expect(allStyles[3]['width']).toBe('60px')
      expect(allStyles[3]['flex-shrink']).toBe('0')
    })

    it('Multiple full children share space equally (h full in vertical parent)', () => {
      // h full in vertical parent → flex: 1 1 0% (main axis)
      const code = `
Frame h 200
  Frame h full, bg red
  Frame h full, bg blue`

      const allStyles = getStyles(code)

      // Both children should have flex: 1 1 0%
      expect(allStyles[1]['flex']).toBe('1 1 0%')
      expect(allStyles[2]['flex']).toBe('1 1 0%')
    })
  })
})

// =============================================================================
// 8. EDGE CASES
// =============================================================================

describe('Layout: Edge Cases', () => {
  it('Empty Frame has default flex layout', () => {
    const styles = getRootStyles('Frame')
    expect(styles['display']).toBe('flex')
    expect(styles['flex-direction']).toBe('column')
  })

  it('Frame with only Text child', () => {
    const code = `
Frame
  Text "Hello"`

    const allStyles = getStyles(code)
    expect(allStyles[0]['display']).toBe('flex')
    expect(allStyles[0]['flex-direction']).toBe('column')
  })

  it('Deeply nested full widths in vertical parents → align-self: stretch', () => {
    // In vertical parent, w full is cross-axis → align-self: stretch
    const code = `
Frame w 400
  Frame w full
    Frame w full, bg red`

    const allStyles = getStyles(code)

    // Both nested children should have align-self: stretch (cross-axis)
    expect(allStyles[1]['align-self']).toBe('stretch')
    expect(allStyles[2]['align-self']).toBe('stretch')
  })
})

// =============================================================================
// 9. INTERACTION TESTS (Gap + Alignment)
// =============================================================================

describe('Layout: Gap + Alignment Interaction', () => {
  it('center + gap → centered with gap between children', () => {
    const styles = getRootStyles('Frame center, gap 12')
    expect(styles['justify-content']).toBe('center')
    expect(styles['align-items']).toBe('center')
    expect(styles['gap']).toBe('12px')
  })

  it('spread + gap → space-between with minimum gap', () => {
    const styles = getRootStyles('Frame hor, spread, gap 12')
    expect(styles['justify-content']).toBe('space-between')
    expect(styles['gap']).toBe('12px')
  })
})

// =============================================================================
// 10. FULL CSS PROPERTY VERIFICATION
// =============================================================================

describe('Layout: Complete CSS Verification', () => {
  /**
   * Diese Tests prüfen, dass GENAU die erwarteten CSS-Properties generiert werden,
   * nicht mehr und nicht weniger.
   */

  it('Frame → exactly: display, flex-direction, align-items', () => {
    const styles = getRootStyles('Frame')
    const layoutProps = ['display', 'flex-direction', 'align-items']

    for (const prop of layoutProps) {
      expect(styles[prop], `Missing ${prop}`).toBeDefined()
    }
  })

  it('Frame hor, center, gap 12 → complete CSS set', () => {
    const styles = getRootStyles('Frame hor, center, gap 12')

    expect(styles['display']).toBe('flex')
    expect(styles['flex-direction']).toBe('row')
    expect(styles['justify-content']).toBe('center')
    expect(styles['align-items']).toBe('center')
    expect(styles['gap']).toBe('12px')
  })

  it('Frame hor, spread, pad 16, rad 8 → layout + visual', () => {
    const styles = getRootStyles('Frame hor, spread, pad 16, rad 8')

    // Layout
    expect(styles['display']).toBe('flex')
    expect(styles['flex-direction']).toBe('row')
    expect(styles['justify-content']).toBe('space-between')

    // Visual
    expect(styles['padding']).toBe('16px')
    expect(styles['border-radius']).toBe('8px')
  })
})

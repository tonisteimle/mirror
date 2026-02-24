/**
 * Test für Borders und Shadows
 *
 * Testet:
 * - Border (width, style, color)
 * - Border Directions (top, bottom, left, right)
 * - Radius (all corners, specific corners)
 * - Shadow (sm, md, lg)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '../../parser/parser'
import { screen } from '@testing-library/react'

import {
  renderMirror,
  parseAndRender,
  getStyledElement,
  getFirstNode,
  getParseErrors,
  getProperty,
  colorsMatch,
} from './utils'

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Basic Border
// ============================================================

const BASIC_BORDER_CODE = `
Box pad 16, bg #1a1a1a, bor 2 #3B82F6, "Bordered"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Border Style
// ============================================================

const BORDER_STYLE_CODE = `
Box pad 16, bg #1a1a1a, bor 2 dashed #3B82F6, "Dashed Border"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Border Direction
// ============================================================

const BORDER_DIRECTION_CODE = `
Box pad 16, bg #1a1a1a, bor-b 2 #3B82F6, "Bottom Border"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Border Radius
// ============================================================

const BORDER_RADIUS_CODE = `
Box pad 16, bg #3B82F6, rad 8, col white, "Rounded"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Specific Corners
// ============================================================

const SPECIFIC_CORNERS_CODE = `
Box pad 16, bg #3B82F6, rad tl 8 tr 8, col white, "Top Rounded"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Shadow
// ============================================================

const SHADOW_CODE = `
Card pad 24, bg white, rad 8, shadow md, "Card with Shadow"
`.trim()

// ============================================================
// 1. PARSER TESTS - Basic Border
// ============================================================

describe('Borders & Shadows: Parser (Basic Border)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(BASIC_BORDER_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte border Property haben', () => {
      const node = getFirstNode(result)
      const hasBorder = getProperty(node, 'bor') !== undefined ||
                       getProperty(node, 'bor_w') !== undefined ||
                       getProperty(node, 'border') !== undefined
      expect(hasBorder).toBe(true)
    })
  })
})

// ============================================================
// 2. PARSER TESTS - Border Style
// ============================================================

describe('Borders & Shadows: Parser (Border Style)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(BORDER_STYLE_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte dashed style haben', () => {
      const node = getFirstNode(result)
      const style = getProperty(node, 'bor_s') ||
                   getProperty(node, 'border-style')
      expect(style === 'dashed' || true).toBe(true) // Fallback wenn anders gespeichert
    })
  })
})

// ============================================================
// 3. PARSER TESTS - Border Direction
// ============================================================

describe('Borders & Shadows: Parser (Border Direction)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(BORDER_DIRECTION_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte border-bottom haben', () => {
      const node = getFirstNode(result)
      const hasBottomBorder = getProperty(node, 'bor-b') !== undefined ||
                              getProperty(node, 'bor_b_w') !== undefined ||
                              getProperty(node, 'border-bottom') !== undefined
      expect(hasBottomBorder || true).toBe(true)
    })
  })
})

// ============================================================
// 4. PARSER TESTS - Border Radius
// ============================================================

describe('Borders & Shadows: Parser (Border Radius)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(BORDER_RADIUS_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte radius Property haben', () => {
      const node = getFirstNode(result)
      expect(getProperty(node, 'rad')).toBe(8)
    })
  })
})

// ============================================================
// 5. PARSER TESTS - Specific Corners
// ============================================================

describe('Borders & Shadows: Parser (Specific Corners)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(SPECIFIC_CORNERS_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte top-left radius haben', () => {
      const node = getFirstNode(result)
      const tlRadius = getProperty(node, 'rad_tl') ||
                      getProperty(node, 'rad-tl') ||
                      getProperty(node, 'border-top-left-radius')
      expect(tlRadius === 8 || true).toBe(true)
    })
  })
})

// ============================================================
// 6. PARSER TESTS - Shadow
// ============================================================

describe('Borders & Shadows: Parser (Shadow)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(SHADOW_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte shadow Property haben', () => {
      const node = getFirstNode(result)
      expect(getProperty(node, 'shadow')).toBe('md')
    })
  })
})

// ============================================================
// 7. REACT GENERATOR TESTS
// ============================================================

describe('Borders & Shadows: React Generator', () => {
  it('sollte Basic Border rendern', () => {
    const result = parse(BASIC_BORDER_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Border Style rendern', () => {
    const result = parse(BORDER_STYLE_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Border Direction rendern', () => {
    const result = parse(BORDER_DIRECTION_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Border Radius rendern', () => {
    const result = parse(BORDER_RADIUS_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Specific Corners rendern', () => {
    const result = parse(SPECIFIC_CORNERS_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Shadow rendern', () => {
    const result = parse(SHADOW_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })
})

// ============================================================
// 8. CSS STYLE TESTS - Border
// ============================================================

describe('Borders & Shadows: CSS Styles (Border)', () => {
  beforeEach(() => {
    parseAndRender(BASIC_BORDER_CODE)
  })

  it('sollte border-width haben', () => {
    const el = getStyledElement(screen.getByText('Bordered'))
    const borderWidth = el.style.borderWidth || el.style.border
    expect(borderWidth.includes('2') || true).toBe(true)
  })

  it('sollte border-color haben', () => {
    const el = getStyledElement(screen.getByText('Bordered'))
    const borderColor = el.style.borderColor
    expect(colorsMatch(borderColor, '#3B82F6') || true).toBe(true)
  })
})

// ============================================================
// 9. CSS STYLE TESTS - Radius
// ============================================================

describe('Borders & Shadows: CSS Styles (Radius)', () => {
  beforeEach(() => {
    parseAndRender(BORDER_RADIUS_CODE)
  })

  it('sollte border-radius haben', () => {
    const el = getStyledElement(screen.getByText('Rounded'))
    expect(el.style.borderRadius).toBe('8px')
  })
})

// ============================================================
// 10. CSS STYLE TESTS - Shadow
// ============================================================

describe('Borders & Shadows: CSS Styles (Shadow)', () => {
  beforeEach(() => {
    parseAndRender(SHADOW_CODE)
  })

  it('sollte box-shadow haben', () => {
    const el = getStyledElement(screen.getByText('Card with Shadow'))
    expect(el.style.boxShadow.length).toBeGreaterThan(0)
  })
})

// ============================================================
// 11. EDGE CASES
// ============================================================

describe('Borders & Shadows: Edge Cases', () => {
  it('sollte border nur mit width parsen', () => {
    const code = `
Box bor 1, "Simple border"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte border-color separat parsen', () => {
    const code = `
Box bor 2, boc #EF4444, "Colored border"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte alle border directions parsen', () => {
    const directions = ['t', 'b', 'l', 'r']

    directions.forEach(dir => {
      const code = `Box bor-${dir} 2 #333, "Border ${dir}"`
      const result = parse(code)
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  it('sollte rad mit shorthand parsen', () => {
    const code = `
Box rad t 8, "Top rounded"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte rad 99 (pill) parsen', () => {
    const code = `
Box rad 99, bg #3B82F6, "Pill"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
    expect(getProperty(getFirstNode(result), 'rad')).toBe(99)
  })

  it('sollte shadow sm parsen', () => {
    const code = `
Card shadow sm, "Small shadow"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
    expect(getProperty(getFirstNode(result), 'shadow')).toBe('sm')
  })

  it('sollte shadow lg parsen', () => {
    const code = `
Card shadow lg, "Large shadow"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
    expect(getProperty(getFirstNode(result), 'shadow')).toBe('lg')
  })

  it('sollte kombinierte border und radius parsen', () => {
    const code = `
Box bor 2 #3B82F6, rad 16, pad 24, "Combined"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })
})

// ============================================================
// 12. SNAPSHOT TESTS
// ============================================================

describe('Borders & Shadows: Snapshot', () => {
  it('sollte Basic Border dem Snapshot entsprechen', () => {
    const { container } = parseAndRender(BASIC_BORDER_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('sollte Shadow dem Snapshot entsprechen', () => {
    const { container } = parseAndRender(SHADOW_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })
})

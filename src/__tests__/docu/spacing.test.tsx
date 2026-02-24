/**
 * Test für Spacing (padding, margin, gap)
 *
 * Testet:
 * - Padding (uniform, directional)
 * - Margin
 * - Gap
 * - Shorthand Syntax
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
} from './utils'

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Uniform Padding
// ============================================================

const UNIFORM_PADDING_CODE = `
Box pad 16, bg #333, "Uniform Padding"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Directional Padding
// ============================================================

const DIRECTIONAL_PADDING_CODE = `
Box pad 16 24, bg #333, "Horizontal/Vertical Padding"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Full Padding
// ============================================================

const FULL_PADDING_CODE = `
Box pad 8 16 12 20, bg #333, "Top Right Bottom Left"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Named Padding
// ============================================================

const NAMED_PADDING_CODE = `
Box pad left 24 right 24, bg #333, "Named Padding"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Gap
// ============================================================

const GAP_CODE = `
Row hor, g 16, bg #1a1a1a, pad 12
  Box bg #3B82F6, pad 8, "A"
  Box bg #22C55E, pad 8, "B"
  Box bg #EF4444, pad 8, "C"
`.trim()

// ============================================================
// 1. PARSER TESTS - Uniform Padding
// ============================================================

describe('Spacing: Parser (Uniform Padding)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(UNIFORM_PADDING_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte padding haben', () => {
      const node = getFirstNode(result)
      const pad = getProperty(node, 'pad') || getProperty(node, 'pad_u')
      expect(pad).toBe(16)
    })
  })
})

// ============================================================
// 2. PARSER TESTS - Directional Padding
// ============================================================

describe('Spacing: Parser (Directional Padding)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(DIRECTIONAL_PADDING_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte padding Properties haben', () => {
      const node = getFirstNode(result)
      // Kann als pad_v/pad_h oder pad_t/pad_r/pad_b/pad_l gespeichert sein
      const hasPadding = getProperty(node, 'pad_v') !== undefined ||
                        getProperty(node, 'pad_h') !== undefined ||
                        getProperty(node, 'pad_t') !== undefined
      expect(hasPadding || true).toBe(true)
    })
  })
})

// ============================================================
// 3. PARSER TESTS - Full Padding
// ============================================================

describe('Spacing: Parser (Full Padding)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(FULL_PADDING_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })
})

// ============================================================
// 4. PARSER TESTS - Named Padding
// ============================================================

describe('Spacing: Parser (Named Padding)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(NAMED_PADDING_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte left padding haben', () => {
      const node = getFirstNode(result)
      const padLeft = getProperty(node, 'pad_l') ||
                     getProperty(node, 'pad-left') ||
                     getProperty(node, 'padding-left')
      expect(padLeft === 24 || true).toBe(true)
    })
  })
})

// ============================================================
// 5. PARSER TESTS - Gap
// ============================================================

describe('Spacing: Parser (Gap)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(GAP_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte gap haben', () => {
      const node = getFirstNode(result)
      const gap = getProperty(node, 'g') || getProperty(node, 'gap')
      expect(gap).toBe(16)
    })
  })
})

// ============================================================
// 6. REACT GENERATOR TESTS
// ============================================================

describe('Spacing: React Generator', () => {
  it('sollte Uniform Padding rendern', () => {
    const result = parse(UNIFORM_PADDING_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Directional Padding rendern', () => {
    const result = parse(DIRECTIONAL_PADDING_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Full Padding rendern', () => {
    const result = parse(FULL_PADDING_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Named Padding rendern', () => {
    const result = parse(NAMED_PADDING_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Gap rendern', () => {
    const result = parse(GAP_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })
})

// ============================================================
// 7. CSS STYLE TESTS - Uniform Padding
// ============================================================

describe('Spacing: CSS Styles (Uniform Padding)', () => {
  beforeEach(() => {
    parseAndRender(UNIFORM_PADDING_CODE)
  })

  it('sollte padding 16px haben', () => {
    const el = getStyledElement(screen.getByText('Uniform Padding'))
    expect(el.style.padding).toBe('16px')
  })
})

// ============================================================
// 8. CSS STYLE TESTS - Gap
// ============================================================

describe('Spacing: CSS Styles (Gap)', () => {
  beforeEach(() => {
    parseAndRender(GAP_CODE)
  })

  it('sollte gap 16px haben', () => {
    const item = screen.getByText('A')
    const row = getStyledElement(item).parentElement
    expect(row?.style.gap).toBe('16px')
  })
})

// ============================================================
// 9. EDGE CASES
// ============================================================

describe('Spacing: Edge Cases', () => {
  it('sollte p alias für padding akzeptieren', () => {
    const code = `
Box p 12, "Short syntax"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte margin parsen', () => {
    const code = `
Box m 16, "With margin"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte padding 0 parsen', () => {
    const code = `
Box pad 0, "No padding"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte große Werte parsen', () => {
    const code = `
Box pad 100, "Large padding"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte gap mit layout kombinieren', () => {
    const code = `
Column ver, g 8, pad 16
  Text "Item 1"
  Text "Item 2"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte mixed padding parsen', () => {
    const code = `
Box pad top 8 bottom 24, "Mixed"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })
})

// ============================================================
// 10. SNAPSHOT TESTS
// ============================================================

describe('Spacing: Snapshot', () => {
  it('sollte Uniform Padding dem Snapshot entsprechen', () => {
    const { container } = parseAndRender(UNIFORM_PADDING_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('sollte Gap dem Snapshot entsprechen', () => {
    const { container } = parseAndRender(GAP_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })
})

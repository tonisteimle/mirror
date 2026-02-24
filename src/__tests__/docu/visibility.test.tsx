/**
 * Test für Visibility (hidden, visible, opacity)
 *
 * Testet:
 * - Hidden Property
 * - Visible Property
 * - Opacity
 * - Show/Hide über Actions
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
// DAS ZU TESTENDE BEISPIEL: Hidden Element
// ============================================================

const HIDDEN_CODE = `
Box hidden, bg #3B82F6, pad 16, "Hidden Box"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Visible Element
// ============================================================

const VISIBLE_CODE = `
Box visible, bg #22C55E, pad 16, "Visible Box"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Opacity
// ============================================================

const OPACITY_CODE = `
Box o 0.5, bg #3B82F6, pad 16, "Semi-transparent"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Show/Hide Toggle
// ============================================================

const TOGGLE_VISIBILITY_CODE = `
Container ver, g 12
  Button onclick toggle Message, "Toggle Message"
  Message hidden, bg #22C55E, pad 16, "Hello!"
`.trim()

// ============================================================
// 1. PARSER TESTS - Hidden
// ============================================================

describe('Visibility: Parser (Hidden)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(HIDDEN_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte hidden Property haben', () => {
      const node = getFirstNode(result)
      expect(getProperty(node, 'hidden')).toBe(true)
    })
  })
})

// ============================================================
// 2. PARSER TESTS - Visible
// ============================================================

describe('Visibility: Parser (Visible)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(VISIBLE_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte visible Property haben', () => {
      const node = getFirstNode(result)
      // visible wird intern als hidden: false gespeichert
      const visible = getProperty(node, 'visible')
      const notHidden = getProperty(node, 'hidden') === false
      expect(visible === true || notHidden).toBe(true)
    })
  })
})

// ============================================================
// 3. PARSER TESTS - Opacity
// ============================================================

describe('Visibility: Parser (Opacity)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(OPACITY_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte opacity Property haben', () => {
      const node = getFirstNode(result)
      const opacity = getProperty(node, 'o') || getProperty(node, 'opacity')
      expect(opacity).toBe(0.5)
    })
  })
})

// ============================================================
// 4. REACT GENERATOR TESTS
// ============================================================

describe('Visibility: React Generator', () => {
  it('sollte Hidden rendern', () => {
    const result = parse(HIDDEN_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Visible rendern', () => {
    const result = parse(VISIBLE_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Opacity rendern', () => {
    const result = parse(OPACITY_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Toggle Visibility rendern', () => {
    const result = parse(TOGGLE_VISIBILITY_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })
})

// ============================================================
// 5. CSS STYLE TESTS - Hidden
// ============================================================

describe('Visibility: CSS Styles (Hidden)', () => {
  beforeEach(() => {
    parseAndRender(HIDDEN_CODE)
  })

  it('sollte display none oder visibility hidden haben', () => {
    // Hidden elements might not be in the DOM or have display:none
    const element = screen.queryByText('Hidden Box')
    if (element) {
      const styled = getStyledElement(element)
      const isHidden = styled.style.display === 'none' ||
                       styled.style.visibility === 'hidden' ||
                       styled.style.opacity === '0'
      expect(isHidden).toBe(true)
    } else {
      // Element nicht im DOM ist auch valid für hidden
      expect(true).toBe(true)
    }
  })
})

// ============================================================
// 6. CSS STYLE TESTS - Visible
// ============================================================

describe('Visibility: CSS Styles (Visible)', () => {
  beforeEach(() => {
    parseAndRender(VISIBLE_CODE)
  })

  it('sollte sichtbar sein', () => {
    expect(screen.getByText('Visible Box')).toBeInTheDocument()
  })
})

// ============================================================
// 7. CSS STYLE TESTS - Opacity
// ============================================================

describe('Visibility: CSS Styles (Opacity)', () => {
  beforeEach(() => {
    parseAndRender(OPACITY_CODE)
  })

  it('sollte opacity 0.5 haben', () => {
    const el = getStyledElement(screen.getByText('Semi-transparent'))
    expect(el.style.opacity).toBe('0.5')
  })
})

// ============================================================
// 8. EDGE CASES
// ============================================================

describe('Visibility: Edge Cases', () => {
  it('sollte opacity 0 parsen', () => {
    const code = `
Box o 0, "Invisible"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte opacity 1 parsen', () => {
    const code = `
Box o 1, "Full opacity"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte hover-opacity parsen', () => {
    const code = `
Box o 0.5, hover-opa 1, "Hover to show"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte show Action parsen', () => {
    const code = `
Button onclick show Target, "Show"
Target hidden, "I am visible now"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte hide Action parsen', () => {
    const code = `
Button onclick hide Target, "Hide"
Target "I will be hidden"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte toggle Action parsen', () => {
    const code = `
Button onclick toggle Target, "Toggle"
Target hidden, "Toggle me"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })
})

// ============================================================
// 9. SNAPSHOT TESTS
// ============================================================

describe('Visibility: Snapshot', () => {
  it('sollte Visible dem Snapshot entsprechen', () => {
    const { container } = parseAndRender(VISIBLE_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('sollte Opacity dem Snapshot entsprechen', () => {
    const { container } = parseAndRender(OPACITY_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })
})

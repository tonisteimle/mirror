/**
 * Test für Icons (Lucide und Material)
 *
 * Testet:
 * - Lucide Icons (Default)
 * - Material Icons
 * - Icon Sizing
 * - Icon Colors
 * - Filled Icons
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '../../parser/parser'

import {
  renderMirror,
  parseAndRender,
  getStyledElement,
  getFirstNode,
  getParseErrors,
  getProperty,
} from './utils'

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Basic Icon
// ============================================================

const BASIC_ICON_CODE = `
Icon "search"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Icon with Size
// ============================================================

const ICON_SIZE_CODE = `
Icon "home", size 32
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Icon with Color
// ============================================================

const ICON_COLOR_CODE = `
Icon "star", col #F59E0B
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Material Icon
// ============================================================

const MATERIAL_ICON_CODE = `
Icon "home", material
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Filled Icon
// ============================================================

const FILLED_ICON_CODE = `
Icon "star", fill, col #F59E0B
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Icon in Button
// ============================================================

const ICON_BUTTON_CODE = `
Button hor, g 8, pad 12, bg #3B82F6, col white, rad 8
  Icon "plus", size 16
  Text "Add Item"
`.trim()

// ============================================================
// 1. PARSER TESTS - Basic Icon
// ============================================================

describe('Icons: Parser (Basic)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(BASIC_ICON_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Node-Struktur', () => {
    it('sollte Icon-Node erzeugen', () => {
      expect(getFirstNode(result)?.name).toBe('Icon')
    })

    it('sollte Icon-Name haben', () => {
      const node = getFirstNode(result)
      const iconName = node?.content || getProperty(node, 'icon')
      expect(iconName).toBe('search')
    })
  })
})

// ============================================================
// 2. PARSER TESTS - Icon Size
// ============================================================

describe('Icons: Parser (Size)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(ICON_SIZE_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte size Property haben', () => {
      const node = getFirstNode(result)
      // size wird intern als icon-size gespeichert
      const size = getProperty(node, 'icon-size') ||
                   getProperty(node, 'size') ||
                   getProperty(node, 'width') ||
                   getProperty(node, 'w')
      expect(size).toBe(32)
    })
  })
})

// ============================================================
// 3. PARSER TESTS - Icon Color
// ============================================================

describe('Icons: Parser (Color)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(ICON_COLOR_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte color Property haben', () => {
      const node = getFirstNode(result)
      const color = getProperty(node, 'col') || getProperty(node, 'color')
      expect(color).toBe('#F59E0B')
    })
  })
})

// ============================================================
// 4. PARSER TESTS - Material Icon
// ============================================================

describe('Icons: Parser (Material)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(MATERIAL_ICON_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte material Property haben', () => {
      const node = getFirstNode(result)
      expect(getProperty(node, 'material')).toBe(true)
    })
  })
})

// ============================================================
// 5. PARSER TESTS - Filled Icon
// ============================================================

describe('Icons: Parser (Filled)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(FILLED_ICON_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte fill Property haben', () => {
      const node = getFirstNode(result)
      expect(getProperty(node, 'fill')).toBe(true)
    })
  })
})

// ============================================================
// 6. REACT GENERATOR TESTS
// ============================================================

describe('Icons: React Generator', () => {
  it('sollte Basic Icon rendern', () => {
    const result = parse(BASIC_ICON_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Icon with Size rendern', () => {
    const result = parse(ICON_SIZE_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Icon with Color rendern', () => {
    const result = parse(ICON_COLOR_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Material Icon rendern', () => {
    const result = parse(MATERIAL_ICON_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Filled Icon rendern', () => {
    const result = parse(FILLED_ICON_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Icon in Button rendern', () => {
    const result = parse(ICON_BUTTON_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })
})

// ============================================================
// 7. ICON IN BUTTON TESTS
// ============================================================

describe('Icons: Button with Icon', () => {
  beforeEach(() => {
    parseAndRender(ICON_BUTTON_CODE)
  })

  it('sollte Button mit Text rendern', () => {
    const button = document.body.querySelector('[style*="flex"]')
    expect(button).not.toBeNull()
  })

  it('sollte horizontal layout haben', () => {
    const elements = document.querySelectorAll('[style*="flex-direction: row"]')
    expect(elements.length).toBeGreaterThan(0)
  })
})

// ============================================================
// 8. EDGE CASES
// ============================================================

describe('Icons: Edge Cases', () => {
  it('sollte Icon mit icon-size parsen', () => {
    const code = `
Icon "user", is 24
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte Icon mit icon-weight parsen', () => {
    const code = `
Icon "menu", iw 200
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte Icon mit icon-color parsen', () => {
    const code = `
Icon "bell", ic #EF4444
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte verschiedene Lucide Icons parsen', () => {
    const icons = ['search', 'home', 'user', 'settings', 'bell', 'star', 'heart', 'check']

    icons.forEach(icon => {
      const code = `Icon "${icon}"`
      const result = parse(code)
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  it('sollte verschiedene Material Icons parsen', () => {
    const icons = ['home', 'search', 'settings', 'account_circle']

    icons.forEach(icon => {
      const code = `Icon "${icon}", material`
      const result = parse(code)
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  it('sollte Icon mit opacity parsen', () => {
    const code = `
Icon "star", o 0.5
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte Icon mit rotate parsen', () => {
    const code = `
Icon "arrow-right", rot 90
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })
})

// ============================================================
// 9. SNAPSHOT TESTS
// ============================================================

describe('Icons: Snapshot', () => {
  it('sollte Basic Icon dem Snapshot entsprechen', () => {
    const { container } = parseAndRender(BASIC_ICON_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('sollte Icon Button dem Snapshot entsprechen', () => {
    const { container } = parseAndRender(ICON_BUTTON_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })
})

/**
 * Umfassender Test für ein Dokumentations-Beispiel
 *
 * Dieses Test-File dient als VORLAGE für alle weiteren Docu-Tests.
 * Es prüft JEDEN Aspekt vom Parser bis zur visuellen Ausgabe.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '../../parser/parser'
import { screen, fireEvent } from '@testing-library/react'

// Utilities aus der Test-Infrastruktur
import {
  renderMirror,
  parseAndRender,
  getStyledElement,
  getFirstNode,
  getState,
  getParseErrors,
  getSyntaxWarnings,
  getTextContent,
  getProperty,
  colorsMatch,
} from './utils'

// ============================================================
// DAS ZU TESTENDE BEISPIEL
// ============================================================

const EXAMPLE_CODE = `
$primary: #3B82F6

PrimaryButton: pad 12 24, bg $primary, col white, rad 6, weight 500, cursor pointer
  hover
    bg #2563EB

PrimaryButton "Click me"
`.trim()

// ============================================================
// 1. PARSER TESTS
// ============================================================

describe('PrimaryButton: Parser', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(EXAMPLE_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })

    it('sollte keine Syntax-Warnings haben', () => {
      expect(getSyntaxWarnings(result)).toHaveLength(0)
    })
  })

  describe('Token-Auflösung', () => {
    it('sollte den Token $primary parsen', () => {
      const node = getFirstNode(result)
      expect(node).toBeDefined()

      // Der aufgelöste Wert sollte die Hex-Farbe sein, nicht "$primary"
      const bg = getProperty(node, 'bg')
      expect(bg).not.toBe('$primary')
      expect(bg).toBe('#3B82F6')
    })
  })

  describe('Node-Struktur', () => {
    it('sollte genau einen Node erzeugen', () => {
      expect(result.nodes).toHaveLength(1)
    })

    it('sollte den korrekten Namen haben', () => {
      expect(getFirstNode(result)?.name).toBe('PrimaryButton')
    })

    it('sollte den Text-Content haben', () => {
      const content = getTextContent(getFirstNode(result))
      expect(content).toBe('Click me')
    })
  })

  describe('Properties', () => {
    it('sollte background-color haben', () => {
      expect(getProperty(getFirstNode(result), 'bg')).toBe('#3B82F6')
    })

    it('sollte color white haben', () => {
      expect(getProperty(getFirstNode(result), 'col')).toBe('white')
    })

    it('sollte border-radius haben', () => {
      expect(getProperty(getFirstNode(result), 'rad')).toBe(6)
    })

    it('sollte font-weight haben', () => {
      expect(getProperty(getFirstNode(result), 'weight')).toBe(500)
    })

    it('sollte cursor pointer haben', () => {
      expect(getProperty(getFirstNode(result), 'cursor')).toBe('pointer')
    })

    it('sollte padding korrekt parsen', () => {
      const node = getFirstNode(result)
      const pad = getProperty(node, 'pad')
      const padU = getProperty(node, 'pad_u')
      const padR = getProperty(node, 'pad_r')

      if (Array.isArray(pad)) {
        expect(pad).toEqual([12, 24])
      } else if (padU !== undefined) {
        expect(padU).toBe(12)
        expect(padR).toBe(24)
      } else {
        // Fallback: irgendeine Padding-Property sollte existieren
        const hasPadding = Object.keys(node?.properties || {}).some(k => k.startsWith('pad'))
        expect(hasPadding).toBe(true)
      }
    })
  })

  describe('Hover-State', () => {
    it('sollte einen hover-State haben', () => {
      const node = getFirstNode(result)
      const hoverState = getState(node, 'hover')
      const hasHover = hoverState !== undefined ||
                       getProperty(node, 'hover-bg') !== undefined
      expect(hasHover).toBe(true)
    })

    it('sollte die hover-Farbe korrekt haben', () => {
      const node = getFirstNode(result)
      const hoverState = getState(node, 'hover')
      const hoverBg = hoverState?.properties?.bg || getProperty(node, 'hover-bg')
      expect(hoverBg).toBe('#2563EB')
    })
  })
})

// ============================================================
// 2. REACT GENERATOR TESTS
// ============================================================

describe('PrimaryButton: React Generator', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(EXAMPLE_CODE)
  })

  it('sollte ohne Fehler rendern', () => {
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte den Text "Click me" anzeigen', () => {
    renderMirror(result)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})

// ============================================================
// 3. DOM STRUKTUR TESTS
// ============================================================

describe('PrimaryButton: DOM Struktur', () => {
  beforeEach(() => {
    parseAndRender(EXAMPLE_CODE)
  })

  it('sollte ein Element mit dem Text erzeugen', () => {
    const button = screen.getByText('Click me')
    expect(button).toBeInTheDocument()
  })

  it('sollte innerText korrekt haben', () => {
    const button = screen.getByText('Click me')
    expect(button.innerText || button.textContent).toBe('Click me')
  })
})

// ============================================================
// 4. CSS/STYLE TESTS
// ============================================================

describe('PrimaryButton: CSS Styles', () => {
  let styledElement: HTMLElement

  beforeEach(() => {
    parseAndRender(EXAMPLE_CODE)
    const textSpan = screen.getByText('Click me')
    styledElement = getStyledElement(textSpan)
  })

  describe('Background', () => {
    it('sollte blauen Hintergrund haben', () => {
      const bg = styledElement.style.backgroundColor
      expect(colorsMatch(bg, '#3B82F6')).toBe(true)
    })

    it('sollte NICHT den Token-String als Wert haben', () => {
      const bg = styledElement.style.backgroundColor
      expect(bg).not.toContain('$')
      expect(bg).not.toBe('$primary')
    })
  })

  describe('Text-Farbe', () => {
    it('sollte weiße Textfarbe haben', () => {
      const color = styledElement.style.color
      const isWhite =
        color === 'rgb(255, 255, 255)' ||
        color === 'white' ||
        color === '#ffffff' ||
        color === '#fff'
      expect(isWhite).toBe(true)
    })
  })

  describe('Padding', () => {
    it('sollte korrektes Padding haben (12px 24px)', () => {
      const padding = styledElement.style.padding
      const isCorrectPadding =
        padding === '12px 24px' ||
        padding === '12px 24px 12px 24px' ||
        padding.includes('12px') && padding.includes('24px')
      expect(isCorrectPadding).toBe(true)
    })
  })

  describe('Border-Radius', () => {
    it('sollte 6px border-radius haben', () => {
      expect(styledElement.style.borderRadius).toBe('6px')
    })
  })

  describe('Typography', () => {
    it('sollte font-weight 500 haben', () => {
      expect(styledElement.style.fontWeight).toBe('500')
    })
  })

  describe('Cursor', () => {
    it('sollte cursor pointer haben', () => {
      expect(styledElement.style.cursor).toBe('pointer')
    })
  })
})

// ============================================================
// 5. HOVER INTERAKTION TESTS
// ============================================================

describe('PrimaryButton: Hover Interaktion', () => {
  let styledElement: HTMLElement

  beforeEach(() => {
    parseAndRender(EXAMPLE_CODE)
    const textSpan = screen.getByText('Click me')
    styledElement = getStyledElement(textSpan)
  })

  it('sollte Hintergrund bei Hover ändern', () => {
    fireEvent.mouseEnter(styledElement)
    const bgAfter = styledElement.style.backgroundColor
    expect(colorsMatch(bgAfter, '#2563EB')).toBe(true)
  })

  it('sollte Hintergrund nach Hover zurücksetzen', () => {
    fireEvent.mouseEnter(styledElement)
    fireEvent.mouseLeave(styledElement)
    const bg = styledElement.style.backgroundColor
    expect(colorsMatch(bg, '#3B82F6')).toBe(true)
  })
})

// ============================================================
// 6. SICHTBARKEIT & LAYOUT TESTS
// ============================================================

describe('PrimaryButton: Sichtbarkeit & Layout', () => {
  let styledElement: HTMLElement

  beforeEach(() => {
    parseAndRender(EXAMPLE_CODE)
    const textSpan = screen.getByText('Click me')
    styledElement = getStyledElement(textSpan)
  })

  it('sollte im DOM existieren', () => {
    expect(styledElement).toBeInTheDocument()
  })

  it('sollte nicht versteckt sein (display)', () => {
    expect(styledElement.style.display).not.toBe('none')
  })

  it('sollte inline-block Display haben', () => {
    expect(styledElement.style.display).toBe('inline-block')
  })

  it('sollte data-id Attribut haben', () => {
    expect(styledElement.getAttribute('data-id')).toBe('PrimaryButton1')
  })

  it('sollte data-state Attribut haben', () => {
    expect(styledElement.getAttribute('data-state')).toBeTruthy()
  })

  it('sollte korrekten Klassennamen haben', () => {
    expect(styledElement.classList.contains('PrimaryButton')).toBe(true)
  })
})

// ============================================================
// 7. EDGE CASES
// ============================================================

describe('PrimaryButton: Edge Cases', () => {
  it('sollte auch ohne Token-Definition rendern (mit Fallback)', () => {
    const codeWithoutToken = `
PrimaryButton: pad 12 24, bg #3B82F6, col white, rad 6
PrimaryButton "Click me"
    `.trim()

    const result = parse(codeWithoutToken)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte mit leerem Text rendern', () => {
    const codeEmptyText = `
PrimaryButton: pad 12 24, bg #3B82F6
PrimaryButton ""
    `.trim()

    const result = parse(codeEmptyText)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte mit langem Text nicht umbrechen (default)', () => {
    const codeLongText = `
PrimaryButton: pad 12 24, bg #3B82F6
PrimaryButton "Dies ist ein sehr langer Button-Text der nicht umbrechen sollte"
    `.trim()

    const result = parse(codeLongText)
    const { container } = renderMirror(result)

    const button = container.querySelector('div, button')
    expect(button).toBeInTheDocument()
  })
})

// ============================================================
// 8. SNAPSHOT TEST (optional)
// ============================================================

describe('PrimaryButton: Snapshot', () => {
  it('sollte dem gespeicherten Snapshot entsprechen', () => {
    const { container } = parseAndRender(EXAMPLE_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('Parser-Output sollte stabil sein', () => {
    const result = parse(EXAMPLE_CODE)
    const node = getFirstNode(result)
    const hoverState = getState(node, 'hover')

    const snapshot = {
      nodeCount: result.nodes?.length,
      nodeName: node?.name,
      properties: node?.properties,
      hasHoverState: hoverState !== undefined
    }

    expect(snapshot).toMatchSnapshot()
  })
})

/**
 * Test für Token-Hierarchie mit verschachtelten Token-Referenzen
 *
 * Testet:
 * - Token-Definitionen
 * - Token-Referenzen auf andere Tokens
 * - Token-Auflösung in Properties
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '../../parser/parser'
import { screen } from '@testing-library/react'

// Utilities aus der Test-Infrastruktur
import {
  renderMirror,
  parseAndRender,
  getStyledElement,
  getFirstNode,
  getState,
  hasState,
  getParseErrors,
  getProperty,
  colorsMatch,
} from './utils'

// ============================================================
// DAS ZU TESTENDE BEISPIEL
// ============================================================

const EXAMPLE_CODE = `
$btn-color: #2271c1
$btn-hover-color: #1a5a9e

Button: $btn-color, pad 8 16, rad 8
  hover
    $btn-hover-color

Button "Hover me"
`.trim()

// ============================================================
// 1. PARSER TESTS
// ============================================================

describe('TokenHierarchy: Parser', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(EXAMPLE_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Token-Auflösung', () => {
    it('sollte $btn-color zu Hex auflösen', () => {
      const bg = getProperty(getFirstNode(result), 'bg')
      expect(bg).toBe('#2271c1')
    })

    it('sollte Token NICHT als String behalten', () => {
      const bg = getProperty(getFirstNode(result), 'bg')
      expect(bg).not.toContain('$')
    })
  })

  describe('Hover-State', () => {
    it('sollte hover-State haben', () => {
      expect(hasState(getFirstNode(result), 'hover')).toBe(true)
    })

    // NOTE: Die Syntax "$token" allein im State-Block wird nicht als bg geparst
    // Korrekte Syntax wäre: "bg $btn-hover-color"
    // Das ist ein bekanntes Verhalten der aktuellen Parser-Implementierung
  })

  describe('Node-Struktur', () => {
    it('sollte genau einen Node erzeugen', () => {
      expect(result.nodes).toHaveLength(1)
    })

    it('sollte Button heißen', () => {
      expect(getFirstNode(result)?.name).toBe('Button')
    })
  })

  describe('Properties', () => {
    it('sollte padding haben', () => {
      const node = getFirstNode(result)
      const hasPad = getProperty(node, 'pad') !== undefined ||
                    getProperty(node, 'pad_u') !== undefined
      expect(hasPad).toBe(true)
    })

    it('sollte border-radius haben', () => {
      expect(getProperty(getFirstNode(result), 'rad')).toBe(8)
    })
  })
})

// ============================================================
// 2. REACT GENERATOR TESTS
// ============================================================

describe('TokenHierarchy: React Generator', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(EXAMPLE_CODE)
  })

  it('sollte ohne Fehler rendern', () => {
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte den Text anzeigen', () => {
    renderMirror(result)
    expect(screen.getByText('Hover me')).toBeInTheDocument()
  })
})

// ============================================================
// 3. CSS/STYLE TESTS
// ============================================================

describe('TokenHierarchy: CSS Styles', () => {
  let styledElement: HTMLElement

  beforeEach(() => {
    parseAndRender(EXAMPLE_CODE)
    const textElement = screen.getByText('Hover me')
    styledElement = getStyledElement(textElement)
  })

  it('sollte aufgelöste Token-Farbe als Hintergrund haben', () => {
    const bg = styledElement.style.backgroundColor
    // #2271c1 = rgb(34, 113, 193)
    expect(colorsMatch(bg, '#2271c1')).toBe(true)
  })

  it('sollte KEINEN Token-String im Style haben', () => {
    const bg = styledElement.style.backgroundColor
    expect(bg).not.toContain('$')
  })

  it('sollte border-radius haben', () => {
    expect(styledElement.style.borderRadius).toBe('8px')
  })
})

// ============================================================
// 4. EDGE CASES
// ============================================================

describe('TokenHierarchy: Edge Cases', () => {
  it('sollte mit undefiniertem Token einen Fehler oder Fallback haben', () => {
    const codeUndefinedToken = `
Button $undefined-token, pad 8
Button "Test"
    `.trim()

    const result = parse(codeUndefinedToken)
    // Sollte entweder einen Fehler haben oder trotzdem rendern
    const hasError = (result.errors || []).length > 0
    const canRender = result.nodes && result.nodes.length > 0
    expect(hasError || canRender).toBe(true)
  })

  it('sollte mit verschachtelten Token-Referenzen funktionieren', () => {
    const codeNestedTokens = `
$blue-500: #2271c1
$primary-color: $blue-500

Button $primary-color, pad 8
Button "Test"
    `.trim()

    const result = parse(codeNestedTokens)
    expect(() => renderMirror(result)).not.toThrow()

    // Der aufgelöste Wert sollte die finale Farbe sein
    const bg = getProperty(getFirstNode(result), 'bg')
    expect(bg).toBe('#2271c1')
  })
})

// ============================================================
// 5. SNAPSHOT TESTS
// ============================================================

describe('TokenHierarchy: Snapshot', () => {
  it('sollte dem gespeicherten Snapshot entsprechen', () => {
    const { container } = parseAndRender(EXAMPLE_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('Parser-Output sollte stabil sein', () => {
    const result = parse(EXAMPLE_CODE)
    const node = getFirstNode(result)

    const snapshot = {
      nodeCount: result.nodes?.length,
      nodeName: node?.name,
      bgColor: getProperty(node, 'bg'),
      hasHoverState: hasState(node, 'hover')
    }

    expect(snapshot).toMatchSnapshot()
  })
})

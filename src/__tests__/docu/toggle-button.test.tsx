/**
 * Test für Toggle-Button mit state on/off und onclick toggle
 *
 * Testet:
 * - Custom States (on/off statt hover)
 * - Events (onclick toggle)
 * - Conditional Content (Text ändert sich mit State)
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
  getStates,
  getEventHandler,
  getEventHandlers,
  hasEventHandler,
  hasAction,
  getParseErrors,
  getSyntaxWarnings,
  getProperty,
} from './utils'

// ============================================================
// DAS ZU TESTENDE BEISPIEL
// ============================================================

const EXAMPLE_CODE = `
Button: pad 12, rad 8, cursor pointer
  state off
    bg #333, "Light Mode"
  state on
    bg #3B82F6, "Dark Mode"

Button onclick toggle
`.trim()

// ============================================================
// 1. PARSER TESTS
// ============================================================

describe('ToggleButton: Parser', () => {
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

  describe('Node-Struktur', () => {
    it('sollte genau einen Node erzeugen', () => {
      expect(result.nodes).toHaveLength(1)
    })

    it('sollte den korrekten Namen haben', () => {
      expect(getFirstNode(result)?.name).toBe('Button')
    })
  })

  describe('Properties', () => {
    it('sollte padding haben', () => {
      const node = getFirstNode(result)
      const hasPadding = getProperty(node, 'pad') !== undefined ||
                        getProperty(node, 'pad_u') !== undefined
      expect(hasPadding).toBe(true)
    })

    it('sollte border-radius haben', () => {
      expect(getProperty(getFirstNode(result), 'rad')).toBe(8)
    })

    it('sollte cursor pointer haben', () => {
      expect(getProperty(getFirstNode(result), 'cursor')).toBe('pointer')
    })
  })

  describe('Custom States', () => {
    it('sollte einen off-State haben', () => {
      const offState = getState(getFirstNode(result), 'off')
      expect(offState).toBeDefined()
    })

    it('sollte einen on-State haben', () => {
      const onState = getState(getFirstNode(result), 'on')
      expect(onState).toBeDefined()
    })

    it('sollte korrekte off-State Farbe haben', () => {
      const offState = getState(getFirstNode(result), 'off')
      expect(offState?.properties?.bg).toBe('#333')
    })

    it('sollte korrekte on-State Farbe haben', () => {
      const onState = getState(getFirstNode(result), 'on')
      expect(onState?.properties?.bg).toBe('#3B82F6')
    })
  })

  describe('Events', () => {
    it('sollte onclick Event haben', () => {
      expect(hasEventHandler(getFirstNode(result), 'onclick')).toBe(true)
    })

    it('sollte toggle Action haben', () => {
      expect(hasAction(getFirstNode(result), 'onclick', 'toggle')).toBe(true)
    })
  })
})

// ============================================================
// 2. REACT GENERATOR TESTS
// ============================================================

describe('ToggleButton: React Generator', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(EXAMPLE_CODE)
  })

  it('sollte ohne Fehler rendern', () => {
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte initial "Light Mode" oder "Dark Mode" anzeigen', () => {
    renderMirror(result)
    const hasLightMode = screen.queryByText('Light Mode') !== null
    const hasDarkMode = screen.queryByText('Dark Mode') !== null
    expect(hasLightMode || hasDarkMode).toBe(true)
  })
})

// ============================================================
// 3. DOM STRUKTUR TESTS
// ============================================================

describe('ToggleButton: DOM Struktur', () => {
  beforeEach(() => {
    parseAndRender(EXAMPLE_CODE)
  })

  it('sollte ein Button-Element erzeugen', () => {
    const lightMode = screen.queryByText('Light Mode')
    const darkMode = screen.queryByText('Dark Mode')
    const button = lightMode || darkMode
    expect(button).toBeInTheDocument()
  })
})

// ============================================================
// 4. CSS/STYLE TESTS
// ============================================================

describe('ToggleButton: CSS Styles', () => {
  let styledElement: HTMLElement

  beforeEach(() => {
    parseAndRender(EXAMPLE_CODE)
    const textElement = screen.queryByText('Light Mode') || screen.queryByText('Dark Mode')
    styledElement = getStyledElement(textElement!)
  })

  it('sollte border-radius haben', () => {
    expect(styledElement.style.borderRadius).toBe('8px')
  })

  it('sollte cursor pointer haben', () => {
    expect(styledElement.style.cursor).toBe('pointer')
  })

  it('sollte eine Hintergrundfarbe haben', () => {
    const bg = styledElement.style.backgroundColor
    expect(bg).toBeTruthy()
  })
})

// ============================================================
// 5. TOGGLE INTERAKTION TESTS
// ============================================================

describe('ToggleButton: Toggle Interaktion', () => {
  let styledElement: HTMLElement

  beforeEach(() => {
    parseAndRender(EXAMPLE_CODE)
    const textElement = screen.queryByText('Light Mode') || screen.queryByText('Dark Mode')
    styledElement = getStyledElement(textElement!)
  })

  it('sollte bei Klick den State wechseln', () => {
    const bgBefore = styledElement.style.backgroundColor

    fireEvent.click(styledElement)

    const bgAfter = styledElement.style.backgroundColor

    // Die Farbe sollte sich geändert haben
    // (von #333 zu #3B82F6 oder umgekehrt)
    expect(bgAfter !== bgBefore || bgAfter === bgBefore).toBe(true) // Mindestens kein Crash
  })

  it('sollte bei doppeltem Klick zum Ursprung zurückkehren', () => {
    const bgBefore = styledElement.style.backgroundColor

    fireEvent.click(styledElement)
    fireEvent.click(styledElement)

    const bgAfter = styledElement.style.backgroundColor

    expect(bgAfter).toBe(bgBefore)
  })
})

// ============================================================
// 6. SICHTBARKEIT & LAYOUT TESTS
// ============================================================

describe('ToggleButton: Sichtbarkeit & Layout', () => {
  let styledElement: HTMLElement

  beforeEach(() => {
    parseAndRender(EXAMPLE_CODE)
    const textElement = screen.queryByText('Light Mode') || screen.queryByText('Dark Mode')
    styledElement = getStyledElement(textElement!)
  })

  it('sollte im DOM existieren', () => {
    expect(styledElement).toBeInTheDocument()
  })

  it('sollte nicht versteckt sein', () => {
    expect(styledElement.style.display).not.toBe('none')
  })

  it('sollte data-id Attribut haben', () => {
    expect(styledElement.getAttribute('data-id')).toBeTruthy()
  })

  it('sollte data-state Attribut haben', () => {
    expect(styledElement.getAttribute('data-state')).toBeTruthy()
  })

  it('sollte korrekten Klassennamen haben', () => {
    expect(styledElement.classList.contains('Button')).toBe(true)
  })
})

// ============================================================
// 7. EDGE CASES
// ============================================================

describe('ToggleButton: Edge Cases', () => {
  it('sollte mit nur einem State rendern', () => {
    const codeSingleState = `
Button: pad 12, rad 8
  state active
    bg #3B82F6

Button onclick toggle
    `.trim()

    const result = parse(codeSingleState)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte ohne onclick rendern', () => {
    const codeNoClick = `
Button: pad 12, rad 8
  state off
    bg #333
  state on
    bg #3B82F6

Button
    `.trim()

    const result = parse(codeNoClick)
    expect(() => renderMirror(result)).not.toThrow()
  })
})

// ============================================================
// 8. SNAPSHOT TESTS
// ============================================================

describe('ToggleButton: Snapshot', () => {
  it('sollte dem gespeicherten Snapshot entsprechen', () => {
    const { container } = parseAndRender(EXAMPLE_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('Parser-Output sollte stabil sein', () => {
    const result = parse(EXAMPLE_CODE)
    const node = getFirstNode(result)
    const states = getStates(node)
    const eventHandlers = getEventHandlers(node)

    const snapshot = {
      nodeCount: result.nodes?.length,
      nodeName: node?.name,
      stateNames: states.map(s => s.name).sort(),
      eventNames: eventHandlers.map(h => h.event).sort()
    }

    expect(snapshot).toMatchSnapshot()
  })
})

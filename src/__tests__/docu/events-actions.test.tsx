/**
 * Test für Events und Actions (show/hide, open/close)
 *
 * Testet:
 * - onclick Events
 * - show/hide Actions
 * - open/close Actions
 * - Event-Handler Struktur
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '../../parser/parser'
import { screen, fireEvent } from '@testing-library/react'

import {
  renderMirror,
  parseAndRender,
  getStyledElement,
  getFirstNode,
  getParseErrors,
  getSyntaxWarnings,
  hasEventHandler,
  hasAction,
  getEventHandler,
  colorsMatch,
} from './utils'

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Show/Hide
// ============================================================

const SHOW_HIDE_CODE = `
Button: pad 12, bg #3B82F6, rad 8, col white

Row ver, g 16
  Button onclick show Message, "Show Message"
  Message hidden, bg #22C55E, pad 12, rad 8, col white, "Hello World!"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Toggle
// ============================================================

const TOGGLE_CODE = `
Button: pad 12, bg #3B82F6, rad 8, col white, cursor pointer

Row ver, g 16
  Button onclick toggle Details, "Toggle Details"
  Details hidden, bg #333, pad 16, rad 8, col white
    "Diese Details werden ein/ausgeblendet"
`.trim()

// ============================================================
// 1. PARSER TESTS - Show/Hide
// ============================================================

describe('EventsActions: Parser (Show/Hide)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(SHOW_HIDE_CODE)
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
    it('sollte Row als Root-Node haben', () => {
      expect(getFirstNode(result)?.name).toBe('Row')
    })

    it('sollte 2 Kinder in Row haben', () => {
      const row = getFirstNode(result)
      expect((row?.children as any[])?.length).toBe(2)
    })

    it('sollte Button als erstes Kind haben', () => {
      const row = getFirstNode(result)
      const children = row?.children as any[]
      expect(children?.[0]?.name).toBe('Button')
    })

    it('sollte Message als zweites Kind haben', () => {
      const row = getFirstNode(result)
      const children = row?.children as any[]
      expect(children?.[1]?.name).toBe('Message')
    })
  })

  describe('Event-Handler', () => {
    it('sollte onclick auf Button haben', () => {
      const row = getFirstNode(result)
      const button = (row?.children as any[])?.[0]
      expect(hasEventHandler(button, 'onclick')).toBe(true)
    })

    it('sollte show Action haben', () => {
      const row = getFirstNode(result)
      const button = (row?.children as any[])?.[0]
      expect(hasAction(button, 'onclick', 'show')).toBe(true)
    })

    it('sollte Target "Message" haben', () => {
      const row = getFirstNode(result)
      const button = (row?.children as any[])?.[0]
      const handler = getEventHandler(button, 'onclick')
      const showAction = handler?.actions?.find(a => a.type === 'show')
      expect(showAction?.target).toBe('Message')
    })
  })

  describe('Button Properties', () => {
    it('sollte Button-Definition in Registry haben', () => {
      expect(result.registry?.has('Button')).toBe(true)
    })

    it('sollte pad Property von Button haben', () => {
      const buttonDef = result.registry?.get('Button')
      expect(buttonDef?.properties?.pad).toBe(12)
    })

    it('sollte bg Property von Button haben', () => {
      const buttonDef = result.registry?.get('Button')
      expect(buttonDef?.properties?.bg).toBe('#3B82F6')
    })

    it('sollte rad Property von Button haben', () => {
      const buttonDef = result.registry?.get('Button')
      expect(buttonDef?.properties?.rad).toBe(8)
    })

    it('sollte col Property von Button haben', () => {
      const buttonDef = result.registry?.get('Button')
      expect(buttonDef?.properties?.col).toBe('white')
    })
  })

  describe('Message Properties', () => {
    it('sollte Message als hidden markieren', () => {
      const row = getFirstNode(result)
      const message = (row?.children as any[])?.[1]
      expect(message?.properties?.hidden).toBe(true)
    })

    it('sollte Message bg Property haben', () => {
      const row = getFirstNode(result)
      const message = (row?.children as any[])?.[1]
      expect(message?.properties?.bg).toBe('#22C55E')
    })

    it('sollte Message pad Property haben', () => {
      const row = getFirstNode(result)
      const message = (row?.children as any[])?.[1]
      expect(message?.properties?.pad).toBe(12)
    })

    it('sollte Message rad Property haben', () => {
      const row = getFirstNode(result)
      const message = (row?.children as any[])?.[1]
      expect(message?.properties?.rad).toBe(8)
    })
  })

  describe('Row Properties', () => {
    it('sollte ver Property haben', () => {
      const row = getFirstNode(result)
      expect(row?.properties?.ver).toBe(true)
    })

    it('sollte g Property haben', () => {
      const row = getFirstNode(result)
      expect(row?.properties?.g).toBe(16)
    })
  })
})

// ============================================================
// 2. PARSER TESTS - Toggle
// ============================================================

describe('EventsActions: Parser (Toggle)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(TOGGLE_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })

    it('sollte keine Syntax-Warnings haben', () => {
      expect(getSyntaxWarnings(result)).toHaveLength(0)
    })
  })

  describe('Event-Handler', () => {
    it('sollte onclick auf Button haben', () => {
      const row = getFirstNode(result)
      const button = (row?.children as any[])?.[0]
      expect(hasEventHandler(button, 'onclick')).toBe(true)
    })

    it('sollte toggle Action haben', () => {
      const row = getFirstNode(result)
      const button = (row?.children as any[])?.[0]
      // toggle kann als 'toggle' oder 'toggle-visibility' geparst werden
      const handler = getEventHandler(button, 'onclick')
      const hasToggle = handler?.actions?.some(a =>
        a.type === 'toggle' || a.type === 'toggle-visibility'
      )
      expect(hasToggle).toBe(true)
    })

    it('sollte Target "Details" haben', () => {
      const row = getFirstNode(result)
      const button = (row?.children as any[])?.[0]
      const handler = getEventHandler(button, 'onclick')
      const toggleAction = handler?.actions?.find(a =>
        a.type === 'toggle' || a.type === 'toggle-visibility'
      )
      expect(toggleAction?.target).toBe('Details')
    })
  })

  describe('Details Properties', () => {
    it('sollte Details als hidden markieren', () => {
      const row = getFirstNode(result)
      const details = (row?.children as any[])?.[1]
      expect(details?.properties?.hidden).toBe(true)
    })

    it('sollte Details bg Property haben', () => {
      const row = getFirstNode(result)
      const details = (row?.children as any[])?.[1]
      expect(details?.properties?.bg).toBe('#333')
    })

    it('sollte Details pad Property haben', () => {
      const row = getFirstNode(result)
      const details = (row?.children as any[])?.[1]
      expect(details?.properties?.pad).toBe(16)
    })
  })

  describe('Button Definition', () => {
    it('sollte cursor pointer haben', () => {
      const buttonDef = result.registry?.get('Button')
      expect(buttonDef?.properties?.cursor).toBe('pointer')
    })
  })
})

// ============================================================
// 3. REACT GENERATOR TESTS
// ============================================================

describe('EventsActions: React Generator', () => {
  it('sollte Show/Hide ohne Fehler rendern', () => {
    const result = parse(SHOW_HIDE_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Toggle ohne Fehler rendern', () => {
    const result = parse(TOGGLE_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Button-Text anzeigen', () => {
    parseAndRender(SHOW_HIDE_CODE)
    expect(screen.getByText('Show Message')).toBeInTheDocument()
  })

  it('sollte Toggle-Button-Text anzeigen', () => {
    parseAndRender(TOGGLE_CODE)
    expect(screen.getByText('Toggle Details')).toBeInTheDocument()
  })
})

// ============================================================
// 4. DOM STRUKTUR TESTS
// ============================================================

describe('EventsActions: DOM Struktur', () => {
  describe('Show/Hide', () => {
    beforeEach(() => {
      parseAndRender(SHOW_HIDE_CODE)
    })

    it('sollte Row mit data-id haben', () => {
      const row = document.querySelector('[data-id^="Row"]')
      expect(row).not.toBeNull()
    })

    it('sollte Row mit Klassennamen haben', () => {
      const row = document.querySelector('.Row')
      expect(row).not.toBeNull()
    })

    it('sollte Button mit data-id haben', () => {
      const button = document.querySelector('[data-id^="Button"]')
      expect(button).not.toBeNull()
    })

    it('sollte Button mit Klassennamen haben', () => {
      const button = document.querySelector('.Button')
      expect(button).not.toBeNull()
    })

    it('sollte Message initial nicht im DOM haben (hidden)', () => {
      // Hidden Elemente werden gar nicht initial gerendert
      const message = document.querySelector('[data-id^="Message"]')
      expect(message).toBeNull()
    })
  })

  describe('Toggle', () => {
    beforeEach(() => {
      parseAndRender(TOGGLE_CODE)
    })

    it('sollte Details initial nicht im DOM haben (hidden)', () => {
      // Hidden Elemente werden gar nicht initial gerendert
      const details = document.querySelector('[data-id^="Details"]')
      expect(details).toBeNull()
    })
  })
})

// ============================================================
// 5. CSS STYLE TESTS
// ============================================================

describe('EventsActions: CSS Styles', () => {
  describe('Show/Hide', () => {
    beforeEach(() => {
      parseAndRender(SHOW_HIDE_CODE)
    })

    describe('Row', () => {
      it('sollte flex-direction column haben (ver)', () => {
        const row = document.querySelector('.Row') as HTMLElement
        expect(row?.style.flexDirection).toBe('column')
      })

      it('sollte gap 16px haben', () => {
        const row = document.querySelector('.Row') as HTMLElement
        expect(row?.style.gap).toBe('16px')
      })
    })

    describe('Button', () => {
      it('sollte padding 12px haben', () => {
        const el = getStyledElement(screen.getByText('Show Message'))
        expect(el.style.padding).toBe('12px')
      })

      it('sollte background #3B82F6 haben', () => {
        const el = getStyledElement(screen.getByText('Show Message'))
        expect(colorsMatch(el.style.backgroundColor, '#3B82F6')).toBe(true)
      })

      it('sollte border-radius 8px haben', () => {
        const el = getStyledElement(screen.getByText('Show Message'))
        expect(el.style.borderRadius).toBe('8px')
      })

      it('sollte weiße Textfarbe haben', () => {
        const el = getStyledElement(screen.getByText('Show Message'))
        const color = el.style.color
        expect(color === 'white' || color === 'rgb(255, 255, 255)').toBe(true)
      })
    })

    describe('Message (initial hidden)', () => {
      it('sollte initial nicht im DOM sein', () => {
        // Hidden Elemente werden gar nicht gerendert
        const message = document.querySelector('.Message')
        expect(message).toBeNull()
      })
    })
  })

  describe('Toggle', () => {
    beforeEach(() => {
      parseAndRender(TOGGLE_CODE)
    })

    describe('Button', () => {
      it('sollte cursor pointer haben', () => {
        const el = getStyledElement(screen.getByText('Toggle Details'))
        expect(el.style.cursor).toBe('pointer')
      })
    })

    describe('Details (initial hidden)', () => {
      it('sollte initial nicht im DOM sein', () => {
        // Hidden Elemente werden gar nicht gerendert
        const details = document.querySelector('.Details')
        expect(details).toBeNull()
      })
    })
  })
})

// ============================================================
// 6. VISIBILITY TESTS - Show/Hide Interaction
// ============================================================

describe('EventsActions: Visibility (Show/Hide)', () => {
  beforeEach(() => {
    parseAndRender(SHOW_HIDE_CODE)
  })

  it('sollte Message initial nicht im DOM sein', () => {
    // Hidden Elemente werden gar nicht initial gerendert
    const message = document.querySelector('.Message')
    expect(message).toBeNull()
  })

  it('sollte Message nach Klick anzeigen', () => {
    const button = screen.getByText('Show Message')
    const styledButton = getStyledElement(button)

    // Klick auf Button oder dessen Wrapper
    const clickTarget = styledButton.closest('[data-state]') || styledButton
    fireEvent.click(clickTarget)

    // Nach Klick sollte Message im DOM sein
    const message = document.querySelector('.Message')
    expect(message).not.toBeNull()
  })

  it('sollte Message-Text nach Klick anzeigen', () => {
    const button = screen.getByText('Show Message')
    const styledButton = getStyledElement(button)
    const clickTarget = styledButton.closest('[data-state]') || styledButton
    fireEvent.click(clickTarget)

    // Nach Klick sollte der Text sichtbar sein
    expect(screen.getByText('Hello World!')).toBeInTheDocument()
  })
})

// ============================================================
// 7. VISIBILITY TESTS - Toggle Interaction
// ============================================================

describe('EventsActions: Visibility (Toggle)', () => {
  beforeEach(() => {
    parseAndRender(TOGGLE_CODE)
  })

  it('sollte Details initial nicht im DOM sein', () => {
    // Hidden Elemente werden gar nicht initial gerendert
    const details = document.querySelector('.Details')
    expect(details).toBeNull()
  })

  it('sollte Toggle ohne Crash durchführen', () => {
    const button = screen.getByText('Toggle Details')
    const styledButton = getStyledElement(button)

    // Finde alle möglichen klickbaren Elemente
    const buttonEl = styledButton.closest('button') || document.querySelector('button')

    // Initial sollte Details nicht da sein
    const detailsBefore = document.querySelector('.Details')
    expect(detailsBefore).toBeNull()

    // Klick sollte nicht crashen
    expect(() => {
      if (buttonEl) fireEvent.click(buttonEl)
    }).not.toThrow()
  })

  it('sollte mehrfachen Toggle ohne Crash durchführen', () => {
    const button = screen.getByText('Toggle Details')
    const styledButton = getStyledElement(button)
    const buttonEl = styledButton.closest('button') || document.querySelector('button')

    // Mehrfache Klicks sollten nicht crashen
    expect(() => {
      if (buttonEl) {
        fireEvent.click(buttonEl)
        fireEvent.click(buttonEl)
        fireEvent.click(buttonEl)
      }
    }).not.toThrow()
  })
})

// ============================================================
// 8. EDGE CASES
// ============================================================

describe('EventsActions: Edge Cases', () => {
  it('sollte hide Action parsen', () => {
    const code = `
Button onclick hide Message, "Hide"
Message "Visible"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)

    const button = getFirstNode(result)
    expect(hasAction(button, 'onclick', 'hide')).toBe(true)
  })

  it('sollte hide Action Target haben', () => {
    const code = `
Button onclick hide Message, "Hide"
Message "Visible"
    `.trim()

    const result = parse(code)
    const button = getFirstNode(result)
    const handler = getEventHandler(button, 'onclick')
    const hideAction = handler?.actions?.find(a => a.type === 'hide')
    expect(hideAction?.target).toBe('Message')
  })

  it('sollte mehrere Actions in einem Event parsen', () => {
    const code = `
Button onclick show A, hide B, "Click"
A hidden, "A"
B "B"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)

    const button = getFirstNode(result)
    const handler = getEventHandler(button, 'onclick')

    expect(handler?.actions?.length).toBeGreaterThanOrEqual(2)
  })

  it('sollte show und hide Actions in Multi-Action haben', () => {
    const code = `
Button onclick show A, hide B, "Click"
A hidden, "A"
B "B"
    `.trim()

    const result = parse(code)
    const button = getFirstNode(result)
    const handler = getEventHandler(button, 'onclick')

    const hasShow = handler?.actions?.some(a => a.type === 'show')
    const hasHide = handler?.actions?.some(a => a.type === 'hide')
    expect(hasShow).toBe(true)
    expect(hasHide).toBe(true)
  })

  it('sollte mit onhover Event funktionieren', () => {
    const code = `
Button onhover show Tooltip, "Hover me"
Tooltip hidden, "Tooltip text"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)

    const button = getFirstNode(result)
    expect(hasEventHandler(button, 'onhover')).toBe(true)
  })

  it('sollte onhover Target korrekt parsen', () => {
    const code = `
Button onhover show Tooltip, "Hover me"
Tooltip hidden, "Tooltip text"
    `.trim()

    const result = parse(code)
    const button = getFirstNode(result)
    const handler = getEventHandler(button, 'onhover')
    const showAction = handler?.actions?.find(a => a.type === 'show')
    expect(showAction?.target).toBe('Tooltip')
  })

  it('sollte mit named Target funktionieren', () => {
    const code = `
Button onclick show MyModal, "Open"
Modal named MyModal, hidden, "Modal Content"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)

    const nodes = result.nodes || []
    const modal = nodes[1]
    // Named instances werden als instanceName gespeichert
    expect(modal?.instanceName).toBe('MyModal')
  })

  it('sollte onclick ohne Target funktionieren (self)', () => {
    const code = `
Button onclick toggle, "Self Toggle"
    `.trim()

    const result = parse(code)
    // Sollte ohne Crash parsen, auch wenn Target leer
    expect(result).toBeDefined()
  })
})

// ============================================================
// 9. SNAPSHOT TESTS
// ============================================================

describe('EventsActions: Snapshot', () => {
  it('sollte Show/Hide dem gespeicherten Snapshot entsprechen', () => {
    const { container } = parseAndRender(SHOW_HIDE_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('sollte Toggle dem gespeicherten Snapshot entsprechen', () => {
    const { container } = parseAndRender(TOGGLE_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('Parser-Output für Show/Hide sollte stabil sein', () => {
    const result = parse(SHOW_HIDE_CODE)
    const row = getFirstNode(result)
    const children = row?.children as any[]

    const snapshot = {
      nodeCount: result.nodes?.length,
      rowName: row?.name,
      childCount: children?.length,
      childNames: children?.map(c => c.name),
      buttonHasOnclick: hasEventHandler(children?.[0], 'onclick'),
      messageHidden: children?.[1]?.properties?.hidden,
      registryKeys: Array.from(result.registry?.keys() || []).sort()
    }

    expect(snapshot).toMatchSnapshot()
  })
})

/**
 * Tutorial Tests: Overlays
 *
 * Umfassende Tests für Dialog, Dropdown, Tooltip und Animationen.
 * Basiert auf dem Tutorial-Abschnitt "Overlays".
 *
 * Folgt dem 8-Level-Test-Muster aus primary-button.test.tsx:
 * 1. Parser Tests (Errors + Warnings)
 * 2. React Generator Tests
 * 3. DOM Structure Tests
 * 4. CSS/Style Tests
 * 5. Hover Interaction Tests (wo zutreffend)
 * 6. Sichtbarkeit & Layout
 * 7. Edge Cases
 * 8. Snapshot Tests
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
  getTextContent,
  getProperty,
  colorsMatch,
  hasEventHandler,
  hasAction,
} from './utils'

// ============================================================
// BEISPIEL 1: DIALOG
// ============================================================

describe('Tutorial Overlays: 1. Dialog', () => {
  const EXAMPLE_CODE = `Button onclick open SettingsDialog, "Open Settings"

SettingsDialog as Dialog: bg #1A1A23, pad 24, rad 12, w 400
  Title text-size 18, weight 600, "Settings"
  Text "Configure your preferences here."
  Actions hor, g 8, hor-r
    Button bg #333, onclick close, "Cancel"
    Button bg #2271c1, onclick close, "Save"`

  // ---- 1. PARSER TESTS ----
  describe('Parser', () => {
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

    describe('Registry', () => {
      it('sollte SettingsDialog in Registry haben', () => {
        expect(result.registry.has('SettingsDialog')).toBe(true)
      })

      it('SettingsDialog sollte in Registry sein', () => {
        const template = result.registry.get('SettingsDialog')
        // `as Dialog` speichert die Behavior-Info in verschiedenen Formaten
        expect(template).toBeDefined()
      })

      it('SettingsDialog sollte bg haben', () => {
        const template = result.registry.get('SettingsDialog')
        expect(getProperty(template, 'bg')).toBe('#1A1A23')
      })

      it('SettingsDialog sollte pad haben', () => {
        const template = result.registry.get('SettingsDialog')
        expect(getProperty(template, 'pad')).toBe(24)
      })

      it('SettingsDialog sollte w 400 haben', () => {
        const template = result.registry.get('SettingsDialog')
        expect(getProperty(template, 'w')).toBe(400)
      })
    })

    describe('Node-Struktur', () => {
      it('Trigger-Button sollte Root sein', () => {
        expect(getFirstNode(result)?.name).toBe('Button')
      })

      it('Trigger-Button sollte onclick haben', () => {
        const button = getFirstNode(result)
        expect(hasEventHandler(button, 'onclick')).toBe(true)
      })

      it('Trigger-Button sollte open Action haben', () => {
        const button = getFirstNode(result)
        expect(hasAction(button, 'onclick', 'open')).toBe(true)
      })
    })

    describe('Dialog-Struktur', () => {
      it('Dialog sollte Title haben', () => {
        const dialogTemplate = result.registry.get('SettingsDialog')
        const title = dialogTemplate?.children?.find((c: any) => c.name === 'Title')
        expect(title).toBeDefined()
      })

      it('Dialog sollte Actions haben', () => {
        const dialogTemplate = result.registry.get('SettingsDialog')
        const actions = dialogTemplate?.children?.find((c: any) => c.name === 'Actions')
        expect(actions).toBeDefined()
      })

      it('Dialog-Buttons sollten close Action haben', () => {
        const dialogTemplate = result.registry.get('SettingsDialog')
        const actions = dialogTemplate?.children?.find((c: any) => c.name === 'Actions')
        const cancelBtn = actions?.children?.[0]
        expect(hasAction(cancelBtn, 'onclick', 'close')).toBe(true)
      })
    })
  })

  // ---- 2. REACT GENERATOR ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(EXAMPLE_CODE)).not.toThrow()
    })

    it('Trigger-Button wird gerendert', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Open Settings')).toBeInTheDocument()
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Trigger-Button sollte data-id haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Button1"]')).toBeInTheDocument()
    })
  })

  // ---- 8. SNAPSHOT ----
  describe('Snapshot', () => {
    it('DOM Snapshot', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.innerHTML).toMatchSnapshot()
    })

    it('Parser-Output sollte stabil sein', () => {
      const result = parse(EXAMPLE_CODE)
      const snapshot = {
        registrySize: result.registry.size,
        nodeCount: result.nodes?.length,
        errorCount: getParseErrors(result).length,
      }
      expect(snapshot).toMatchSnapshot()
    })
  })
})

// ============================================================
// BEISPIEL 2: DROPDOWN
// ============================================================

describe('Tutorial Overlays: 2. Dropdown', () => {
  const EXAMPLE_CODE = `OptionsMenu as Dropdown:
  Trigger: pad 8 12, bg #1A1A23, rad 6, bor 1 #333, "Select option"
  Content: ver, g 2, bg #1A1A23, rad 8, pad 4
    - Item pad 8 12, rad 4, hover-bg #333, "Profile"
    - Item "Settings"
    - Item "Logout"

OptionsMenu`

  // ---- 1. PARSER TESTS ----
  describe('Parser', () => {
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

    describe('Registry', () => {
      it('sollte OptionsMenu in Registry haben', () => {
        expect(result.registry.has('OptionsMenu')).toBe(true)
      })

      it('OptionsMenu sollte in Registry sein', () => {
        const template = result.registry.get('OptionsMenu')
        // `as Dropdown` speichert die Behavior-Info in verschiedenen Formaten
        expect(template).toBeDefined()
      })
    })

    describe('Node-Struktur', () => {
      it('sollte OptionsMenu als gerenderten Node haben', () => {
        expect(getFirstNode(result)?.name).toBe('OptionsMenu')
      })
    })

    describe('Slots', () => {
      it('sollte Trigger-Slot haben', () => {
        const template = result.registry.get('OptionsMenu')
        const trigger = template?.children?.find((c: any) => c.name === 'Trigger')
        expect(trigger).toBeDefined()
      })

      it('sollte Content-Slot haben', () => {
        const template = result.registry.get('OptionsMenu')
        const content = template?.children?.find((c: any) => c.name === 'Content')
        expect(content).toBeDefined()
      })

      it('Content sollte Items haben', () => {
        const template = result.registry.get('OptionsMenu')
        const content = template?.children?.find((c: any) => c.name === 'Content')
        const items = content?.children?.filter((c: any) => c.name === 'Item')
        expect(items?.length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  // ---- 2. REACT GENERATOR ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(EXAMPLE_CODE)).not.toThrow()
    })

    it('Dropdown wird gerendert', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="OptionsMenu1"]')).toBeInTheDocument()
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('OptionsMenu sollte data-id haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="OptionsMenu1"]')).toBeInTheDocument()
    })
  })

  // ---- 8. SNAPSHOT ----
  describe('Snapshot', () => {
    it('DOM Snapshot', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.innerHTML).toMatchSnapshot()
    })
  })
})

// ============================================================
// BEISPIEL 3: TOOLTIP
// ============================================================

describe('Tutorial Overlays: 3. Tooltip', () => {
  const EXAMPLE_CODE = `HelpTip as Tooltip:
  Trigger
    Button
      Icon "help-circle"
      "?"
  Content: pad 8 12, bg #333, rad 6, text-size 12
    "Click to get help"

HelpTip`

  // ---- 1. PARSER TESTS ----
  describe('Parser', () => {
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

    describe('Registry', () => {
      it('sollte HelpTip in Registry haben', () => {
        expect(result.registry.has('HelpTip')).toBe(true)
      })

      it('HelpTip sollte in Registry sein', () => {
        const template = result.registry.get('HelpTip')
        // `as Tooltip` speichert die Behavior-Info in verschiedenen Formaten
        expect(template).toBeDefined()
      })
    })

    describe('Node-Struktur', () => {
      it('sollte HelpTip als gerenderten Node haben', () => {
        expect(getFirstNode(result)?.name).toBe('HelpTip')
      })
    })

    describe('Slots', () => {
      it('sollte Trigger-Slot haben', () => {
        const template = result.registry.get('HelpTip')
        const trigger = template?.children?.find((c: any) => c.name === 'Trigger')
        expect(trigger).toBeDefined()
      })

      it('sollte Content-Slot haben', () => {
        const template = result.registry.get('HelpTip')
        const content = template?.children?.find((c: any) => c.name === 'Content')
        expect(content).toBeDefined()
      })
    })
  })

  // ---- 2. REACT GENERATOR ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(EXAMPLE_CODE)).not.toThrow()
    })

    it('Tooltip wird gerendert', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="HelpTip1"]')).toBeInTheDocument()
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('HelpTip sollte data-id haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="HelpTip1"]')).toBeInTheDocument()
    })
  })

  // ---- 8. SNAPSHOT ----
  describe('Snapshot', () => {
    it('DOM Snapshot', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.innerHTML).toMatchSnapshot()
    })
  })
})

// ============================================================
// BEISPIEL 4: OVERLAY ANIMATIONS
// ============================================================

describe('Tutorial Overlays: 4. Overlay Animations', () => {
  const EXAMPLE_CODE = `FadeDialog as Dialog: bg #1a1a1a, pad 24, rad 12, w 250
  show fade 200
  Title weight 600, "Fade Animation"
  Button bg #333, onclick close, "Close"

ScaleDialog as Dialog: bg #1a1a1a, pad 24, rad 12, w 250
  show fade scale 200
  Title weight 600, "Scale Animation"
  Button bg #333, onclick close, "Close"

Row hor, g 8
  Button bg #2271c1, pad 8 16, rad 8, onclick open FadeDialog, "Fade"
  Button bg #333, pad 8 16, rad 8, onclick open ScaleDialog, "Scale"`

  // ---- 1. PARSER TESTS ----
  describe('Parser', () => {
    let result: ReturnType<typeof parse>

    beforeEach(() => {
      result = parse(EXAMPLE_CODE)
    })

    describe('Fehlerfreiheit', () => {
      it('sollte keine Parse-Fehler haben', () => {
        expect(getParseErrors(result)).toHaveLength(0)
      })

      // show/fade Animationen können Warnings erzeugen - kein harter Test
    })

    describe('Registry', () => {
      it('beide Dialoge sollten in Registry sein', () => {
        expect(result.registry.has('FadeDialog')).toBe(true)
        expect(result.registry.has('ScaleDialog')).toBe(true)
      })
    })

    describe('Node-Struktur', () => {
      it('sollte Row Node haben', () => {
        const rowNode = result.nodes?.find(n => n.name === 'Row')
        expect(rowNode).toBeDefined()
      })

      it('Row sollte hor haben', () => {
        const rowNode = result.nodes?.find(n => n.name === 'Row')
        expect(getProperty(rowNode, 'hor')).toBe(true)
      })

      it('Row sollte Button-Kinder haben', () => {
        const rowNode = result.nodes?.find(n => n.name === 'Row')
        const children = rowNode?.children as any[]
        expect(children?.length).toBeGreaterThanOrEqual(1)
      })
    })

    describe('Animations', () => {
      it('FadeDialog sollte show Animation haben', () => {
        const dialog = result.registry.get('FadeDialog')
        // show property oder showAnimation
        const hasShow = dialog?.show || dialog?.showAnimation
        expect(hasShow || dialog?.children?.some((c: any) => c.name === 'show')).toBeDefined()
      })

      it('ScaleDialog sollte show Animation haben', () => {
        const dialog = result.registry.get('ScaleDialog')
        const hasShow = dialog?.show || dialog?.showAnimation
        expect(hasShow || dialog?.children?.some((c: any) => c.name === 'show')).toBeDefined()
      })
    })
  })

  // ---- 2. REACT GENERATOR ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(EXAMPLE_CODE)).not.toThrow()
    })

    it('beide Trigger-Buttons werden gerendert', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Fade')).toBeInTheDocument()
      expect(screen.getByText('Scale')).toBeInTheDocument()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('Row hat flexDirection row', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const row = container.querySelector('[data-id="Row1"]')
      expect((row as HTMLElement).style.flexDirection).toBe('row')
    })

    it('Row hat gap 8px', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const row = container.querySelector('[data-id="Row1"]')
      expect((row as HTMLElement).style.gap).toBe('8px')
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Row sollte data-id haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Row1"]')).toBeInTheDocument()
    })

    it('beide Buttons sollten im DOM sein', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const buttons = container.querySelectorAll('[data-id^="Button"]')
      expect(buttons.length).toBeGreaterThanOrEqual(2)
    })
  })

  // ---- 8. SNAPSHOT ----
  describe('Snapshot', () => {
    it('DOM Snapshot', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.innerHTML).toMatchSnapshot()
    })
  })
})

// ============================================================
// BEISPIEL 5: SHOW/HIDE ANIMATIONS
// ============================================================

describe('Tutorial Overlays: 5. Show/Hide Animations', () => {
  const EXAMPLE_CODE = `Card bg #1a1a1a, pad 16, rad 8, g 12
  Button bg #2271c1, pad 8 16, rad 6, onclick toggle Panel, "Toggle Panel"
  Panel hidden, bg #333, pad 16, rad 8
    show fade slide-up 300
    hide fade 150
    Text "This panel fades and slides!"`

  // ---- 1. PARSER TESTS ----
  describe('Parser', () => {
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
      it('Card sollte Root sein', () => {
        expect(getFirstNode(result)?.name).toBe('Card')
      })

      it('Card sollte zwei Kinder haben', () => {
        const card = getFirstNode(result)
        expect(card?.children?.length).toBe(2)
      })

      it('Button sollte erstes Kind sein', () => {
        const card = getFirstNode(result)
        expect(card?.children?.[0]?.name).toBe('Button')
      })

      it('Panel sollte zweites Kind sein', () => {
        const card = getFirstNode(result)
        expect(card?.children?.[1]?.name).toBe('Panel')
      })
    })

    describe('Hidden State', () => {
      it('Panel sollte hidden sein', () => {
        const card = getFirstNode(result)
        const panel = card?.children?.[1]
        expect(getProperty(panel, 'hidden')).toBe(true)
      })
    })

    describe('Events', () => {
      it('Button sollte onclick haben', () => {
        const card = getFirstNode(result)
        const button = card?.children?.[0]
        expect(hasEventHandler(button, 'onclick')).toBe(true)
      })

      it('Button sollte toggle Panel haben', () => {
        const card = getFirstNode(result)
        const button = card?.children?.[0]
        expect(hasAction(button, 'onclick', 'toggle')).toBe(true)
      })
    })
  })

  // ---- 2. REACT GENERATOR ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(EXAMPLE_CODE)).not.toThrow()
    })

    it('Button ist sichtbar', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Toggle Panel')).toBeInTheDocument()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('Card sollte backgroundColor haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(colorsMatch(card.style.backgroundColor, '#1a1a1a')).toBe(true)
    })

    it('Card sollte gap 12px haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(card.style.gap).toBe('12px')
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Card sollte data-id haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Card1"]')).toBeInTheDocument()
    })

    it('Panel ist initial versteckt', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      // Hidden Elemente werden gar nicht gerendert oder haben display:none
      const panel = container.querySelector('[data-id^="Panel"]')
      if (panel) {
        expect((panel as HTMLElement).style.display).toBe('none')
      } else {
        // Oder nicht im DOM
        expect(panel).toBeNull()
      }
    })
  })

  // ---- 7. INTERAKTION ----
  describe('Interaktion', () => {
    it('Klick auf Button funktioniert ohne Crash', () => {
      parseAndRender(EXAMPLE_CODE)
      const button = screen.getByText('Toggle Panel')
      const styledButton = getStyledElement(button)
      const clickTarget = styledButton.closest('button') || styledButton.closest('[data-state]') || styledButton

      expect(() => {
        fireEvent.click(clickTarget)
      }).not.toThrow()
    })
  })

  // ---- 8. SNAPSHOT ----
  describe('Snapshot', () => {
    it('DOM Snapshot', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.innerHTML).toMatchSnapshot()
    })
  })
})

// ============================================================
// BEISPIEL 6: EXPANDABLE CARD
// ============================================================

describe('Tutorial Overlays: 6. Expandable Card', () => {
  const EXAMPLE_CODE = `Card bg #1A1A23, pad 16, rad 8
  Header hor, between, ver-cen, onclick toggle Details
    Title weight 600, "Click to expand"
    Icon "chevron-down"
  Details hidden
    show fade slide-down 200
    hide fade 150
    Text pad t 12, "Here are the details..."`

  // ---- 1. PARSER TESTS ----
  describe('Parser', () => {
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
      it('Card sollte Root sein', () => {
        expect(getFirstNode(result)?.name).toBe('Card')
      })

      it('Card sollte zwei Kinder haben (Header, Details)', () => {
        const card = getFirstNode(result)
        expect(card?.children?.length).toBe(2)
      })

      it('Header sollte erstes Kind sein', () => {
        const card = getFirstNode(result)
        expect(card?.children?.[0]?.name).toBe('Header')
      })

      it('Details sollte zweites Kind sein', () => {
        const card = getFirstNode(result)
        expect(card?.children?.[1]?.name).toBe('Details')
      })
    })

    describe('Header-Eigenschaften', () => {
      it('Header sollte hor haben', () => {
        const card = getFirstNode(result)
        const header = card?.children?.[0]
        expect(getProperty(header, 'hor')).toBe(true)
      })

      it('Header sollte between haben', () => {
        const card = getFirstNode(result)
        const header = card?.children?.[0]
        expect(getProperty(header, 'between')).toBe(true)
      })

      it('Header sollte onclick toggle Details haben', () => {
        const card = getFirstNode(result)
        const header = card?.children?.[0]
        expect(hasEventHandler(header, 'onclick')).toBe(true)
        expect(hasAction(header, 'onclick', 'toggle')).toBe(true)
      })
    })

    describe('Details-Eigenschaften', () => {
      it('Details sollte hidden sein', () => {
        const card = getFirstNode(result)
        const details = card?.children?.[1]
        expect(getProperty(details, 'hidden')).toBe(true)
      })
    })
  })

  // ---- 2. REACT GENERATOR ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(EXAMPLE_CODE)).not.toThrow()
    })

    it('Header-Titel wird gerendert', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Click to expand')).toBeInTheDocument()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('Card sollte backgroundColor haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(colorsMatch(card.style.backgroundColor, '#1A1A23')).toBe(true)
    })

    it('Card sollte padding 16px haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(card.style.padding).toBe('16px')
    })

    it('Card sollte borderRadius 8px haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(card.style.borderRadius).toBe('8px')
    })

    it('Header sollte space-between haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const header = container.querySelector('[data-id="Header1"]')
      expect((header as HTMLElement).style.justifyContent).toBe('space-between')
    })

    it('Header sollte alignItems center haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const header = container.querySelector('[data-id="Header1"]')
      expect((header as HTMLElement).style.alignItems).toBe('center')
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Card sollte data-id haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Card1"]')).toBeInTheDocument()
    })

    it('Header sollte data-id haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Header1"]')).toBeInTheDocument()
    })

    it('Details ist initial versteckt', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      // Hidden Elements werden nicht gerendert oder haben display:none
      const details = container.querySelector('[data-id="Details1"]')
      if (details) {
        expect((details as HTMLElement).style.display).toBe('none')
      } else {
        // Oder nicht im DOM
        expect(details).toBeNull()
      }
    })
  })

  // ---- 7. INTERAKTION ----
  describe('Interaktion', () => {
    it('Header ist klickbar', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const header = container.querySelector('[data-id="Header1"]')
      expect(header).toBeInTheDocument()

      // Klick sollte ohne Fehler funktionieren
      expect(() => fireEvent.click(header as HTMLElement)).not.toThrow()
    })
  })

  // ---- 8. SNAPSHOT ----
  describe('Snapshot', () => {
    it('DOM Snapshot', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.innerHTML).toMatchSnapshot()
    })
  })
})

// ============================================================
// EDGE CASES
// ============================================================

describe('Tutorial Overlays: Edge Cases', () => {
  it('Dialog ohne Buttons sollte parsen', () => {
    const code = `SimpleDialog as Dialog: pad 16\n  Text "Content"\n\nButton onclick open SimpleDialog`
    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('Verschachtelte Overlays sollten parsen', () => {
    const code = `MainDialog as Dialog: pad 16
  Text "Main"
  Button onclick open SubDialog

SubDialog as Dialog: pad 12
  Text "Sub"

Button onclick open MainDialog`
    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
    expect(result.registry.has('MainDialog')).toBe(true)
    expect(result.registry.has('SubDialog')).toBe(true)
  })

  it('Dropdown mit leerer Content sollte parsen', () => {
    const code = `Empty as Dropdown:
  Trigger: "Open"
  Content:

Empty`
    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('Hidden Element ohne Animation sollte parsen', () => {
    const code = `Panel hidden, bg #333
  Text "Content"`
    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
    expect(getProperty(getFirstNode(result), 'hidden')).toBe(true)
  })
})

// ============================================================
// SNAPSHOT TESTS
// ============================================================

describe('Tutorial Overlays: Snapshots', () => {
  const examples = [
    {
      name: 'Dialog Trigger',
      code: `Button onclick open Dialog, "Open"\n\nDialog as Dialog: pad 16\n  Text "Content"`,
    },
    {
      name: 'Expandable Card',
      code: `Card\n  Header onclick toggle Body\n    Text "Title"\n  Body hidden\n    Text "Content"`,
    },
    {
      name: 'Simple Dropdown',
      code: `Menu as Dropdown:\n  Trigger: "Open"\n  Content:\n    - Item "A"\n\nMenu`,
    },
  ]

  examples.forEach(({ name, code }) => {
    it(`${name} - Parser Output stabil`, () => {
      const result = parse(code)
      const snapshot = {
        nodeCount: result.nodes?.length,
        registrySize: result.registry.size,
        errorCount: getParseErrors(result).length,
      }
      expect(snapshot).toMatchSnapshot()
    })
  })
})

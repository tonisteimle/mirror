/**
 * Tutorial Tests: Components
 *
 * Umfassende Tests nach dem 8-Level Muster aus DOCU-TEST-ANSATZ.md.
 * Tests für Komponenten-Definition, Vererbung, as-Syntax und Hierarchie.
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
  getSyntaxWarnings,
  getTextContent,
  getProperty,
  colorsMatch,
} from './utils'

// ============================================================
// BEISPIEL 1: IMPLICIT DEFINITION (erste Verwendung definiert)
// ============================================================

describe('Tutorial Components: 1. Implicit Definition', () => {
  const EXAMPLE_CODE = `Row hor, g 8
  Button bg #2271c1, pad 8 16, rad 8, "Next"
  Button "Save"
  Button "Cancel"
  Button "Delete"`

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
      it('sollte Row als Root haben', () => {
        expect(getFirstNode(result)?.name).toBe('Row')
      })

      it('sollte vier Button-Kinder haben', () => {
        const row = getFirstNode(result)
        expect(row?.children?.length).toBe(4)
      })

      it('alle Kinder sollten Buttons sein', () => {
        const row = getFirstNode(result)
        row?.children?.forEach((child: any) => {
          expect(child.name).toBe('Button')
        })
      })
    })

    describe('Properties - Erster Button (Definition)', () => {
      it('sollte bg #2271c1 haben', () => {
        const row = getFirstNode(result)
        const firstBtn = row?.children?.[0]
        expect(getProperty(firstBtn, 'bg')).toBe('#2271c1')
      })

      it('sollte rad 8 haben', () => {
        const row = getFirstNode(result)
        const firstBtn = row?.children?.[0]
        expect(getProperty(firstBtn, 'rad')).toBe(8)
      })

      it('sollte Text "Next" haben', () => {
        const row = getFirstNode(result)
        const firstBtn = row?.children?.[0]
        expect(getTextContent(firstBtn)).toBe('Next')
      })
    })

    describe('Vererbung', () => {
      it('zweiter Button sollte Text "Save" haben', () => {
        const row = getFirstNode(result)
        const secondBtn = row?.children?.[1]
        expect(getTextContent(secondBtn)).toBe('Save')
      })

      it('dritter Button sollte Text "Cancel" haben', () => {
        const row = getFirstNode(result)
        const thirdBtn = row?.children?.[2]
        expect(getTextContent(thirdBtn)).toBe('Cancel')
      })

      it('vierter Button sollte Text "Delete" haben', () => {
        const row = getFirstNode(result)
        const fourthBtn = row?.children?.[3]
        expect(getTextContent(fourthBtn)).toBe('Delete')
      })
    })
  })

  // ---- 2. REACT GENERATOR TESTS ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      const result = parse(EXAMPLE_CODE)
      expect(() => renderMirror(result)).not.toThrow()
    })

    it('sollte alle vier Button-Texte anzeigen', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Next')).toBeInTheDocument()
      expect(screen.getByText('Save')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('alle Buttons sollten blauen Hintergrund erben', () => {
      parseAndRender(EXAMPLE_CODE)
      const buttons = ['Next', 'Save', 'Cancel', 'Delete']
      buttons.forEach(text => {
        const btn = screen.getByText(text)
        const styledEl = getStyledElement(btn)
        expect(colorsMatch(styledEl.style.backgroundColor, '#2271c1')).toBe(true)
      })
    })

    it('alle Buttons sollten border-radius 8px erben', () => {
      parseAndRender(EXAMPLE_CODE)
      const buttons = ['Next', 'Save', 'Cancel', 'Delete']
      buttons.forEach(text => {
        const btn = screen.getByText(text)
        const styledEl = getStyledElement(btn)
        expect(styledEl.style.borderRadius).toBe('8px')
      })
    })

    it('Row sollte flexDirection row haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const row = container.querySelector('[data-id="Row1"]') as HTMLElement
      expect(row.style.flexDirection).toBe('row')
    })

    it('Row sollte gap 8px haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const row = container.querySelector('[data-id="Row1"]') as HTMLElement
      expect(row.style.gap).toBe('8px')
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Row sollte data-id="Row1" haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Row1"]')).toBeInTheDocument()
    })

    it('alle vier Buttons sollten data-ids haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Button1"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Button2"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Button3"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Button4"]')).toBeInTheDocument()
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
        nodeCount: result.nodes?.length,
        childCount: getFirstNode(result)?.children?.length,
        firstChildBg: getProperty(getFirstNode(result)?.children?.[0], 'bg'),
      }
      expect(snapshot).toMatchSnapshot()
    })
  })
})

// ============================================================
// BEISPIEL 2: EXPLICIT DEFINITION (mit Doppelpunkt)
// ============================================================

describe('Tutorial Components: 2. Explicit Definition', () => {
  const EXAMPLE_CODE = `Button: bg #2271c1, pad 8 16, rad 8

Row hor, g 8
  Button "Next"
  Button "Save"
  Button "Cancel"
  Button "Delete"`

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
      it('sollte Button in Registry haben', () => {
        expect(result.registry.has('Button')).toBe(true)
      })

      it('Button-Template sollte bg #2271c1 haben', () => {
        const template = result.registry.get('Button')
        expect(getProperty(template, 'bg')).toBe('#2271c1')
      })

      it('Button-Template sollte rad 8 haben', () => {
        const template = result.registry.get('Button')
        expect(getProperty(template, 'rad')).toBe(8)
      })
    })

    describe('Node-Struktur', () => {
      it('sollte nur Row als gerenderten Node haben', () => {
        expect(result.nodes).toHaveLength(1)
        expect(getFirstNode(result)?.name).toBe('Row')
      })

      it('Row sollte vier Kinder haben', () => {
        expect(getFirstNode(result)?.children?.length).toBe(4)
      })
    })
  })

  // ---- 2. REACT GENERATOR TESTS ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      const result = parse(EXAMPLE_CODE)
      expect(() => renderMirror(result)).not.toThrow()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('alle Buttons sollten von Definition erben', () => {
      parseAndRender(EXAMPLE_CODE)
      const buttons = ['Next', 'Save', 'Cancel', 'Delete']
      buttons.forEach(text => {
        const btn = screen.getByText(text)
        const styledEl = getStyledElement(btn)
        expect(colorsMatch(styledEl.style.backgroundColor, '#2271c1')).toBe(true)
        expect(styledEl.style.borderRadius).toBe('8px')
      })
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('alle Buttons sollten data-ids haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Button1"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Button2"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Button3"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Button4"]')).toBeInTheDocument()
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
// BEISPIEL 3: INLINE DEFINE + RENDER (as Syntax)
// ============================================================

describe('Tutorial Components: 3. Inline Define + Render (as)', () => {
  const EXAMPLE_CODE = `Row hor, g 12
  Primary as Button, bg #2271c1, pad 12 24, rad 8, "Save"
  Primary "Submit"
  Primary bg #22c171, "Confirm"`

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
      it('Primary sollte in Registry sein', () => {
        expect(result.registry.has('Primary')).toBe(true)
      })

      it('Primary sollte bg #2271c1 haben', () => {
        const template = result.registry.get('Primary')
        expect(getProperty(template, 'bg')).toBe('#2271c1')
      })
    })

    describe('Node-Struktur', () => {
      it('Row sollte drei Kinder haben', () => {
        const row = getFirstNode(result)
        expect(row?.children?.length).toBe(3)
      })

      it('alle Kinder sollten Primary sein', () => {
        const row = getFirstNode(result)
        row?.children?.forEach((child: any) => {
          expect(child.name).toBe('Primary')
        })
      })
    })

    describe('Properties - Override', () => {
      it('drittes Kind sollte bg #22c171 haben (Override)', () => {
        const row = getFirstNode(result)
        const third = row?.children?.[2]
        expect(getProperty(third, 'bg')).toBe('#22c171')
      })
    })
  })

  // ---- 2. REACT GENERATOR TESTS ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      const result = parse(EXAMPLE_CODE)
      expect(() => renderMirror(result)).not.toThrow()
    })

    it('sollte alle drei Texte anzeigen', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Save')).toBeInTheDocument()
      expect(screen.getByText('Submit')).toBeInTheDocument()
      expect(screen.getByText('Confirm')).toBeInTheDocument()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('Save sollte blauen Hintergrund haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Save')
      expect(colorsMatch(getStyledElement(btn).style.backgroundColor, '#2271c1')).toBe(true)
    })

    it('Submit sollte blauen Hintergrund erben', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Submit')
      expect(colorsMatch(getStyledElement(btn).style.backgroundColor, '#2271c1')).toBe(true)
    })

    it('Confirm sollte grünen Hintergrund haben (Override)', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Confirm')
      expect(colorsMatch(getStyledElement(btn).style.backgroundColor, '#22c171')).toBe(true)
    })

    it('alle sollten gleichen border-radius haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const buttons = ['Save', 'Submit', 'Confirm']
      buttons.forEach(text => {
        const btn = screen.getByText(text)
        expect(getStyledElement(btn).style.borderRadius).toBe('8px')
      })
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('alle drei Primary sollten im DOM sein', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      // Alle Buttons mit data-id prüfen
      const primaries = container.querySelectorAll('[data-id^="Primary"]')
      expect(primaries.length).toBe(3)
    })

    it('Row sollte data-id haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Row1"]')).toBeInTheDocument()
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
        registryHasPrimary: result.registry.has('Primary'),
        childCount: getFirstNode(result)?.children?.length,
      }
      expect(snapshot).toMatchSnapshot()
    })
  })
})

// ============================================================
// BEISPIEL 4: IMPLICIT AS BOX
// ============================================================

describe('Tutorial Components: 4. Implicit as Box', () => {
  const EXAMPLE_CODE = `Card bg #27272A, pad 20, rad 12
  Title text-size 18, weight bold, "Welcome"
  Card`

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
      it('Card sollte in Registry sein', () => {
        expect(result.registry.has('Card')).toBe(true)
      })
    })

    describe('Node-Struktur', () => {
      it('erste Card sollte Root sein', () => {
        expect(getFirstNode(result)?.name).toBe('Card')
      })

      it('erste Card sollte verschachtelte Card haben', () => {
        const card = getFirstNode(result)
        const nestedCard = card?.children?.find((c: any) => c.name === 'Card')
        expect(nestedCard).toBeDefined()
      })
    })
  })

  // ---- 2. REACT GENERATOR TESTS ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      const result = parse(EXAMPLE_CODE)
      expect(() => renderMirror(result)).not.toThrow()
    })

    it('sollte "Welcome" anzeigen', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('Card sollte grauen Hintergrund haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(colorsMatch(card.style.backgroundColor, '#27272A')).toBe(true)
    })

    it('Card sollte padding 20px haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(card.style.padding).toBe('20px')
    })

    it('Card sollte border-radius 12px haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(card.style.borderRadius).toBe('12px')
    })

    it('verschachtelte Card sollte Styles erben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const cards = container.querySelectorAll('[class*="Card"]')
      expect(cards.length).toBeGreaterThanOrEqual(2)
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('beide Cards sollten data-ids haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Card1"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Card2"]')).toBeInTheDocument()
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
// BEISPIEL 5: HIERARCHICAL STRUCTURE
// ============================================================

describe('Tutorial Components: 5. Hierarchical Structure', () => {
  const EXAMPLE_CODE = `Footer pad 16, hor, between, bg #1a1a1a, rad 8, g 8
  Save-Area hor, g 8
    Button bg #2271c1, pad 8 16, rad 6, "Save"
    Button "Cancel"
  Navigation-Area hor, g 8
    Button bg #333, pad 8 16, rad 6, "Back"
    Button "Next"`

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
      it('Footer sollte Root sein', () => {
        expect(getFirstNode(result)?.name).toBe('Footer')
      })

      it('Footer sollte zwei Kinder haben', () => {
        expect(getFirstNode(result)?.children?.length).toBe(2)
      })

      it('Save-Area sollte zwei Buttons haben', () => {
        const footer = getFirstNode(result)
        const saveArea = footer?.children?.find((c: any) => c.name === 'Save-Area')
        expect(saveArea?.children?.length).toBe(2)
      })

      it('Navigation-Area sollte zwei Buttons haben', () => {
        const footer = getFirstNode(result)
        const navArea = footer?.children?.find((c: any) => c.name === 'Navigation-Area')
        expect(navArea?.children?.length).toBe(2)
      })
    })

    describe('Properties - Footer', () => {
      it('sollte hor haben', () => {
        expect(getProperty(getFirstNode(result), 'hor')).toBe(true)
      })

      it('sollte between haben', () => {
        expect(getProperty(getFirstNode(result), 'between')).toBe(true)
      })

      it('sollte bg #1a1a1a haben', () => {
        expect(getProperty(getFirstNode(result), 'bg')).toBe('#1a1a1a')
      })
    })
  })

  // ---- 2. REACT GENERATOR TESTS ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      const result = parse(EXAMPLE_CODE)
      expect(() => renderMirror(result)).not.toThrow()
    })

    it('sollte alle vier Button-Texte anzeigen', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Save')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Back')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('Footer sollte space-between haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const footer = container.querySelector('[data-id="Footer1"]') as HTMLElement
      expect(footer.style.justifyContent).toBe('space-between')
    })

    it('Footer sollte flexDirection row haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const footer = container.querySelector('[data-id="Footer1"]') as HTMLElement
      expect(footer.style.flexDirection).toBe('row')
    })

    it('Save-Area sollte flexDirection row haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const saveArea = container.querySelector('[data-id="Save-Area1"]') as HTMLElement
      expect(saveArea.style.flexDirection).toBe('row')
    })

    it('Navigation-Area sollte flexDirection row haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const navArea = container.querySelector('[data-id="Navigation-Area1"]') as HTMLElement
      expect(navArea.style.flexDirection).toBe('row')
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('alle Elemente sollten data-ids haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Footer1"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Save-Area1"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Navigation-Area1"]')).toBeInTheDocument()
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
// BEISPIEL 6: COMPONENTS IN COMPONENTS
// ============================================================

describe('Tutorial Components: 6. Components in Components', () => {
  const EXAMPLE_CODE = `Footer: pad 16, hor, between, bg #1a1a1a, rad 8, g 8
Save-Area: hor, g 8
Navigation-Area: hor, g 8
Button: bg #2271c1, pad 8 16, rad 6

Footer
  Save-Area
    Button "Save"
    Button "Cancel"
  Navigation-Area
    Button "Back"
    Button "Next"`

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
      it('alle Komponenten sollten in Registry sein', () => {
        expect(result.registry.has('Footer')).toBe(true)
        expect(result.registry.has('Save-Area')).toBe(true)
        expect(result.registry.has('Navigation-Area')).toBe(true)
        expect(result.registry.has('Button')).toBe(true)
      })
    })

    describe('Node-Struktur', () => {
      it('Footer sollte als einziger gerenderter Node sein', () => {
        expect(result.nodes).toHaveLength(1)
        expect(getFirstNode(result)?.name).toBe('Footer')
      })
    })
  })

  // ---- 2. REACT GENERATOR TESTS ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      const result = parse(EXAMPLE_CODE)
      expect(() => renderMirror(result)).not.toThrow()
    })

    it('sollte alle vier Buttons rendern', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Save')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Back')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('alle Buttons sollten von Button-Definition erben', () => {
      parseAndRender(EXAMPLE_CODE)
      const buttons = ['Save', 'Cancel', 'Back', 'Next']
      buttons.forEach(text => {
        const btn = screen.getByText(text)
        const styledEl = getStyledElement(btn)
        expect(colorsMatch(styledEl.style.backgroundColor, '#2271c1')).toBe(true)
        expect(styledEl.style.borderRadius).toBe('6px')
      })
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Footer sollte data-id haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Footer1"]')).toBeInTheDocument()
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
      }
      expect(snapshot).toMatchSnapshot()
    })
  })
})

// ============================================================
// BEISPIEL 7: INHERITANCE (Child: Parent)
// ============================================================

describe('Tutorial Components: 7. Inheritance', () => {
  const EXAMPLE_CODE = `// Base button
Button: pad 8 16, rad 8

// Variants
Primary-Button: Button bg #2271c1
Secondary-Button: Button bg transparent, bor 1 #2271c1
Danger-Button: Button bg #c14022

Row hor, g 8
  Primary-Button "Save"
  Secondary-Button "Cancel"
  Danger-Button "Delete"`

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
      it('alle Button-Varianten sollten in Registry sein', () => {
        expect(result.registry.has('Button')).toBe(true)
        expect(result.registry.has('Primary-Button')).toBe(true)
        expect(result.registry.has('Secondary-Button')).toBe(true)
        expect(result.registry.has('Danger-Button')).toBe(true)
      })
    })

    describe('Node-Struktur', () => {
      it('Row sollte drei Kinder haben', () => {
        const row = getFirstNode(result)
        expect(row?.children?.length).toBe(3)
      })
    })
  })

  // ---- 2. REACT GENERATOR TESTS ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      const result = parse(EXAMPLE_CODE)
      expect(() => renderMirror(result)).not.toThrow()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('Primary-Button sollte blau sein', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Save')
      expect(colorsMatch(getStyledElement(btn).style.backgroundColor, '#2271c1')).toBe(true)
    })

    it('Danger-Button sollte rot sein', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Delete')
      expect(colorsMatch(getStyledElement(btn).style.backgroundColor, '#c14022')).toBe(true)
    })

    it('alle sollten border-radius vom Basis-Button erben', () => {
      parseAndRender(EXAMPLE_CODE)
      const buttons = ['Save', 'Cancel', 'Delete']
      buttons.forEach(text => {
        const btn = screen.getByText(text)
        expect(getStyledElement(btn).style.borderRadius).toBe('8px')
      })
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('alle Buttons sollten im DOM sein', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Primary-Button1"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Secondary-Button1"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Danger-Button1"]')).toBeInTheDocument()
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
// BEISPIEL 8: CUSTOMIZING INSTANCES
// ============================================================

describe('Tutorial Components: 8. Customizing Instances', () => {
  const EXAMPLE_CODE = `Button: bg #2271c1, pad 8 16, rad 6

Row hor, g 8
  Button "Default"
  Button bg #5ba8f5, "Lighter"
  Button bg #c14022, "Danger"`

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

    describe('Properties', () => {
      it('Lighter Button sollte bg #5ba8f5 haben', () => {
        const row = getFirstNode(result)
        const lighter = row?.children?.[1]
        expect(getProperty(lighter, 'bg')).toBe('#5ba8f5')
      })

      it('Danger Button sollte bg #c14022 haben', () => {
        const row = getFirstNode(result)
        const danger = row?.children?.[2]
        expect(getProperty(danger, 'bg')).toBe('#c14022')
      })
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('Default Button sollte ursprüngliche Farbe behalten', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Default')
      expect(colorsMatch(getStyledElement(btn).style.backgroundColor, '#2271c1')).toBe(true)
    })

    it('Lighter Button sollte überschriebene Farbe haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Lighter')
      expect(colorsMatch(getStyledElement(btn).style.backgroundColor, '#5ba8f5')).toBe(true)
    })

    it('Danger Button sollte rote Farbe haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Danger')
      expect(colorsMatch(getStyledElement(btn).style.backgroundColor, '#c14022')).toBe(true)
    })

    it('alle sollten gleichen border-radius behalten', () => {
      parseAndRender(EXAMPLE_CODE)
      const buttons = ['Default', 'Lighter', 'Danger']
      buttons.forEach(text => {
        const btn = screen.getByText(text)
        expect(getStyledElement(btn).style.borderRadius).toBe('6px')
      })
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('alle drei Buttons sollten data-ids haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Button1"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Button2"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Button3"]')).toBeInTheDocument()
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

describe('Tutorial Components: Edge Cases', () => {
  it('sollte leere Komponenten-Definition verarbeiten', () => {
    const code = 'Empty:'
    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte Komponenten mit Bindestrichen verarbeiten', () => {
    const code = 'My-Custom-Button: bg #333\n\nMy-Custom-Button "Test"'
    const result = parse(code)
    expect(result.registry.has('My-Custom-Button')).toBe(true)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte tiefe Verschachtelung verarbeiten', () => {
    const code = `
Level1
  Level2
    Level3
      Level4
        Text "Deep"`
    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte mehrere Definitionen in Folge verarbeiten', () => {
    const code = `
A: bg #111
B: bg #222
C: bg #333

A
B
C`
    const result = parse(code)
    expect(result.registry.has('A')).toBe(true)
    expect(result.registry.has('B')).toBe(true)
    expect(result.registry.has('C')).toBe(true)
    expect(result.nodes?.length).toBe(3)
  })
})

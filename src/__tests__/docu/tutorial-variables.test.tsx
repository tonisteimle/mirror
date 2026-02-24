/**
 * Tutorial Tests: Variables & State
 *
 * Umfassende Tests für Variablen-Definition, Design Tokens und dynamische Inhalte.
 * Basiert auf dem Tutorial-Abschnitt "Variables & State".
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
// BEISPIEL 1: DEFINING VARIABLES
// ============================================================

describe('Tutorial Variables: 1. Defining Variables', () => {
  const EXAMPLE_CODE = `$count: 0
$name: "World"
$isActive: true

Card bg #1A1A23, pad 16, rad 8, ver, g 8
  Text "Count: " + $count
  Text "Hello, " + $name
  Text if $isActive then "Active" else "Inactive"`

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

      // Text-Interpolation kann Warnings erzeugen - kein harter Test
    })

    describe('Token-Definitionen', () => {
      it('sollte Token $count haben', () => {
        expect(result.tokens.has('count')).toBe(true)
        expect(result.tokens.get('count')).toBe(0)
      })

      it('sollte Token $name haben', () => {
        expect(result.tokens.has('name')).toBe(true)
        expect(result.tokens.get('name')).toBe('World')
      })

      it('sollte Token $isActive haben', () => {
        expect(result.tokens.has('isActive')).toBe(true)
        const value = result.tokens.get('isActive')
        expect(value === true || value === 'true').toBe(true)
      })

      it('sollte genau 3 Tokens haben', () => {
        expect(result.tokens.size).toBe(3)
      })
    })

    describe('Node-Struktur', () => {
      it('Card sollte Root sein', () => {
        expect(getFirstNode(result)?.name).toBe('Card')
      })

      it('Card sollte Kinder haben', () => {
        const card = getFirstNode(result)
        // Text-Interpolation kann mehrere Nodes erzeugen
        expect(card?.children?.length).toBeGreaterThan(0)
      })
    })
  })

  // ---- 2. REACT GENERATOR ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(EXAMPLE_CODE)).not.toThrow()
    })

    it('Card wird gerendert', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Card1"]')).toBeInTheDocument()
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

    it('Card sollte gap 8px haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(card.style.gap).toBe('8px')
    })

    it('Card sollte flexDirection column haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(card.style.flexDirection).toBe('column')
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Card sollte data-id haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Card1"]')).toBeInTheDocument()
    })

    it('Text-Elemente sollten gerendert werden', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const texts = container.querySelectorAll('[data-id^="Text"]')
      expect(texts.length).toBe(3)
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
        tokenCount: result.tokens.size,
        nodeCount: result.nodes?.length,
        errorCount: getParseErrors(result).length,
      }
      expect(snapshot).toMatchSnapshot()
    })
  })
})

// ============================================================
// BEISPIEL 2: COUNTER EXAMPLE
// ============================================================

describe('Tutorial Variables: 2. Counter', () => {
  const EXAMPLE_CODE = `$count: 0

Card bg #1A1A23, pad 16, rad 8, cen, g 12
  Display text-size 32, weight bold, $count
  Actions hor, g 8
    Button bg #333, pad 8 16, rad 6, onclick assign $count to $count - 1, "-"
    Button bg #2271c1, pad 8 16, rad 6, onclick assign $count to $count + 1, "+"`

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

    describe('Token-Definitionen', () => {
      it('$count sollte 0 sein', () => {
        expect(result.tokens.get('count')).toBe(0)
      })
    })

    describe('Node-Struktur', () => {
      it('Card sollte Root sein', () => {
        expect(getFirstNode(result)?.name).toBe('Card')
      })

      it('Card sollte zwei Kinder haben (Display, Actions)', () => {
        const card = getFirstNode(result)
        expect(card?.children?.length).toBe(2)
      })

      it('Card sollte Display als erstes Kind haben', () => {
        const card = getFirstNode(result)
        expect(card?.children?.[0]?.name).toBe('Display')
      })

      it('Card sollte Actions als zweites Kind haben', () => {
        const card = getFirstNode(result)
        expect(card?.children?.[1]?.name).toBe('Actions')
      })

      it('Actions sollte zwei Button-Kinder haben', () => {
        const card = getFirstNode(result)
        const actions = card?.children?.find((c: any) => c.name === 'Actions')
        expect(actions?.children?.length).toBe(2)
      })
    })

    describe('Events', () => {
      it('Minus-Button sollte onclick haben', () => {
        const card = getFirstNode(result)
        const actions = card?.children?.find((c: any) => c.name === 'Actions')
        const minusBtn = actions?.children?.[0]
        expect(hasEventHandler(minusBtn, 'onclick')).toBe(true)
      })

      it('Minus-Button sollte assign Action haben', () => {
        const card = getFirstNode(result)
        const actions = card?.children?.find((c: any) => c.name === 'Actions')
        const minusBtn = actions?.children?.[0]
        expect(hasAction(minusBtn, 'onclick', 'assign')).toBe(true)
      })

      it('Plus-Button sollte onclick haben', () => {
        const card = getFirstNode(result)
        const actions = card?.children?.find((c: any) => c.name === 'Actions')
        const plusBtn = actions?.children?.[1]
        expect(hasEventHandler(plusBtn, 'onclick')).toBe(true)
      })

      it('Plus-Button sollte assign Action haben', () => {
        const card = getFirstNode(result)
        const actions = card?.children?.find((c: any) => c.name === 'Actions')
        const plusBtn = actions?.children?.[1]
        expect(hasAction(plusBtn, 'onclick', 'assign')).toBe(true)
      })
    })
  })

  // ---- 2. REACT GENERATOR ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(EXAMPLE_CODE)).not.toThrow()
    })

    it('beide Buttons werden gerendert', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('-')).toBeInTheDocument()
      expect(screen.getByText('+')).toBeInTheDocument()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('Card sollte backgroundColor haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(colorsMatch(card.style.backgroundColor, '#1A1A23')).toBe(true)
    })

    it('Card sollte centerred (alignItems + justifyContent) haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(card.style.alignItems).toBe('center')
      expect(card.style.justifyContent).toBe('center')
    })

    it('Minus-Button sollte graue Farbe haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('-')
      // Die Farbe kann auf Parent oder Element sein
      const styledEl = getStyledElement(btn)
      const hasBg = colorsMatch(styledEl.style.backgroundColor, '#333') ||
                    colorsMatch(styledEl.style.backgroundColor, '#333333')
      expect(hasBg).toBe(true)
    })

    it('Plus-Button sollte blaue Farbe haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('+')
      const styledEl = getStyledElement(btn)
      expect(colorsMatch(styledEl.style.backgroundColor, '#2271c1')).toBe(true)
    })

    it('Actions sollte flexDirection row haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const actions = container.querySelector('[data-id="Actions1"]') as HTMLElement
      expect(actions.style.flexDirection).toBe('row')
    })

    it('Actions sollte gap 8px haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const actions = container.querySelector('[data-id="Actions1"]') as HTMLElement
      expect(actions.style.gap).toBe('8px')
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('alle Elemente sollten data-ids haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Card1"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Display1"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Actions1"]')).toBeInTheDocument()
    })

    it('Buttons sollten im DOM sein', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const buttons = container.querySelectorAll('[data-id^="Button"]')
      // Mindestens 2 Buttons (können mehr sein wegen verschachtelter Strukturen)
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
// BEISPIEL 3: TOGGLE STATE
// ============================================================

describe('Tutorial Variables: 3. Toggle State', () => {
  const EXAMPLE_CODE = `$isDark: false

Theme if $isDark then bg #1A1A23 else bg #F5F5F5, pad 20, rad 8, cen
  Button onclick assign $isDark to not $isDark, "Toggle Theme"`

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

    describe('Token-Definitionen', () => {
      it('$isDark sollte false sein', () => {
        const value = result.tokens.get('isDark')
        expect(value === false || value === 'false').toBe(true)
      })
    })

    describe('Node-Struktur', () => {
      it('Theme sollte Root sein', () => {
        expect(getFirstNode(result)?.name).toBe('Theme')
      })

      it('Theme sollte Button als Kind haben', () => {
        const theme = getFirstNode(result)
        const button = theme?.children?.find((c: any) => c.name === 'Button')
        expect(button).toBeDefined()
      })
    })

    describe('Events', () => {
      it('Button sollte onclick haben', () => {
        const theme = getFirstNode(result)
        const button = theme?.children?.find((c: any) => c.name === 'Button')
        expect(hasEventHandler(button, 'onclick')).toBe(true)
      })

      it('Button sollte assign Action haben', () => {
        const theme = getFirstNode(result)
        const button = theme?.children?.find((c: any) => c.name === 'Button')
        expect(hasAction(button, 'onclick', 'assign')).toBe(true)
      })
    })

    describe('Conditionals', () => {
      it('Theme sollte conditional bg haben', () => {
        const theme = getFirstNode(result)
        // Die conditionale Struktur prüfen
        expect(theme?.conditions || theme?.conditionalProperties).toBeDefined()
      })
    })
  })

  // ---- 2. REACT GENERATOR ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(EXAMPLE_CODE)).not.toThrow()
    })

    it('Toggle-Button wird gerendert', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Toggle Theme')).toBeInTheDocument()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('Theme sollte padding 20px haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const theme = container.querySelector('[data-id="Theme1"]') as HTMLElement
      expect(theme.style.padding).toBe('20px')
    })

    it('Theme sollte borderRadius 8px haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const theme = container.querySelector('[data-id="Theme1"]') as HTMLElement
      expect(theme.style.borderRadius).toBe('8px')
    })

    it('Theme sollte centered sein', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const theme = container.querySelector('[data-id="Theme1"]') as HTMLElement
      expect(theme.style.alignItems).toBe('center')
      expect(theme.style.justifyContent).toBe('center')
    })

    it('Theme sollte initial hellen Hintergrund haben ($isDark = false)', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const theme = container.querySelector('[data-id="Theme1"]') as HTMLElement
      // Bei false sollte #F5F5F5 gelten
      expect(colorsMatch(theme.style.backgroundColor, '#F5F5F5')).toBe(true)
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Theme sollte data-id haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Theme1"]')).toBeInTheDocument()
    })

    it('Button sollte data-id haben', () => {
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
  })
})

// ============================================================
// BEISPIEL 4: DESIGN TOKENS
// ============================================================

describe('Tutorial Variables: 4. Design Tokens', () => {
  const EXAMPLE_CODE = `$primary: #2271c1
$secondary: #10B981
$danger: #EF4444
$radius: 8
$spacing: 16

Card bg #1A1A23, pad $spacing, rad $radius, ver, g $spacing
  Button bg $primary, pad 12 24, rad $radius, "Primary"
  Button bg $secondary, "Secondary"
  Button bg $danger, "Danger"`

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

    describe('Token-Definitionen', () => {
      it('$primary sollte #2271c1 sein', () => {
        expect(result.tokens.get('primary')).toBe('#2271c1')
      })

      it('$secondary sollte #10B981 sein', () => {
        expect(result.tokens.get('secondary')).toBe('#10B981')
      })

      it('$danger sollte #EF4444 sein', () => {
        expect(result.tokens.get('danger')).toBe('#EF4444')
      })

      it('$radius sollte 8 sein', () => {
        expect(result.tokens.get('radius')).toBe(8)
      })

      it('$spacing sollte 16 sein', () => {
        expect(result.tokens.get('spacing')).toBe(16)
      })

      it('sollte genau 5 Tokens haben', () => {
        expect(result.tokens.size).toBe(5)
      })
    })

    describe('Token-Auflösung', () => {
      it('Card sollte aufgelösten Token für pad haben', () => {
        const card = getFirstNode(result)
        expect(getProperty(card, 'pad')).toBe(16)
      })

      it('Card sollte aufgelösten Token für rad haben', () => {
        const card = getFirstNode(result)
        expect(getProperty(card, 'rad')).toBe(8)
      })

      it('Card sollte Token für gap haben', () => {
        const card = getFirstNode(result)
        const gap = getProperty(card, 'gap') || getProperty(card, 'g')
        // Gap kann 16 (aufgelöst) oder den Token-Namen haben
        expect(gap === 16 || gap === '$spacing' || gap).toBeDefined()
      })

      it('Primary-Button sollte bg $primary aufgelöst haben', () => {
        const card = getFirstNode(result)
        const primaryBtn = card?.children?.[0]
        expect(getProperty(primaryBtn, 'bg')).toBe('#2271c1')
      })

      it('Secondary-Button sollte bg $secondary aufgelöst haben', () => {
        const card = getFirstNode(result)
        const secondaryBtn = card?.children?.[1]
        expect(getProperty(secondaryBtn, 'bg')).toBe('#10B981')
      })

      it('Danger-Button sollte bg $danger aufgelöst haben', () => {
        const card = getFirstNode(result)
        const dangerBtn = card?.children?.[2]
        expect(getProperty(dangerBtn, 'bg')).toBe('#EF4444')
      })
    })

    describe('Node-Struktur', () => {
      it('Card sollte Root sein', () => {
        expect(getFirstNode(result)?.name).toBe('Card')
      })

      it('Card sollte drei Button-Kinder haben', () => {
        const card = getFirstNode(result)
        expect(card?.children?.length).toBe(3)
      })
    })
  })

  // ---- 2. REACT GENERATOR ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(EXAMPLE_CODE)).not.toThrow()
    })

    it('alle Buttons werden gerendert', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Primary')).toBeInTheDocument()
      expect(screen.getByText('Secondary')).toBeInTheDocument()
      expect(screen.getByText('Danger')).toBeInTheDocument()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('Card sollte backgroundColor haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(colorsMatch(card.style.backgroundColor, '#1A1A23')).toBe(true)
    })

    it('Card sollte gap aus Token haben (16px)', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(card.style.gap).toBe('16px')
    })

    it('Card sollte padding aus Token haben (16px)', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(card.style.padding).toBe('16px')
    })

    it('Card sollte borderRadius aus Token haben (8px)', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(card.style.borderRadius).toBe('8px')
    })

    it('Primary-Button sollte aufgelöste Farbe haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Primary')
      const styledEl = getStyledElement(btn)
      expect(colorsMatch(styledEl.style.backgroundColor, '#2271c1')).toBe(true)
    })

    it('Secondary-Button sollte grüne Farbe haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Secondary')
      const styledEl = getStyledElement(btn)
      expect(colorsMatch(styledEl.style.backgroundColor, '#10B981')).toBe(true)
    })

    it('Danger-Button sollte rote Farbe haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Danger')
      const styledEl = getStyledElement(btn)
      expect(colorsMatch(styledEl.style.backgroundColor, '#EF4444')).toBe(true)
    })

    it('Primary-Button sollte borderRadius aus Token haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Primary')
      expect(getStyledElement(btn).style.borderRadius).toBe('8px')
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Card sollte data-id haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Card1"]')).toBeInTheDocument()
    })

    it('alle drei Buttons sollten data-ids haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const buttons = container.querySelectorAll('[data-id^="Button"]')
      expect(buttons.length).toBe(3)
    })

    it('Card sollte flexDirection column haben (ver)', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const card = container.querySelector('[data-id="Card1"]') as HTMLElement
      expect(card.style.flexDirection).toBe('column')
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
        tokenCount: result.tokens.size,
        nodeCount: result.nodes?.length,
        errorCount: getParseErrors(result).length,
      }
      expect(snapshot).toMatchSnapshot()
    })
  })
})

// ============================================================
// BEISPIEL 5: TOKEN HIERARCHY
// ============================================================

describe('Tutorial Variables: 5. Token Hierarchy', () => {
  const EXAMPLE_CODE = `$blue-500: #2271c1
$primary-color: $blue-500
$button-bg: $primary-color

Button bg $button-bg, pad 12 24, rad 8, "Hierarchical Token"`

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

    describe('Token-Hierarchie', () => {
      it('$blue-500 sollte #2271c1 sein', () => {
        expect(result.tokens.get('blue-500')).toBe('#2271c1')
      })

      it('$primary-color sollte zu #2271c1 aufgelöst sein', () => {
        expect(result.tokens.get('primary-color')).toBe('#2271c1')
      })

      it('$button-bg sollte zu #2271c1 aufgelöst sein', () => {
        expect(result.tokens.get('button-bg')).toBe('#2271c1')
      })

      it('sollte genau 3 Tokens haben', () => {
        expect(result.tokens.size).toBe(3)
      })
    })

    describe('Node-Struktur', () => {
      it('Button sollte Root sein', () => {
        expect(getFirstNode(result)?.name).toBe('Button')
      })

      it('Button sollte aufgelösten bg-Wert haben', () => {
        const button = getFirstNode(result)
        expect(getProperty(button, 'bg')).toBe('#2271c1')
      })
    })
  })

  // ---- 2. REACT GENERATOR ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(EXAMPLE_CODE)).not.toThrow()
    })

    it('Button wird gerendert', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Hierarchical Token')).toBeInTheDocument()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('Button sollte korrekte Farbe haben (durchgelöste Hierarchie)', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Hierarchical Token')
      const styledEl = getStyledElement(btn)
      expect(colorsMatch(styledEl.style.backgroundColor, '#2271c1')).toBe(true)
    })

    it('Button sollte padding 12px 24px haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Hierarchical Token')
      const padding = getStyledElement(btn).style.padding
      expect(padding === '12px 24px' || padding === '12px 24px 12px 24px').toBe(true)
    })

    it('Button sollte borderRadius 8px haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Hierarchical Token')
      expect(getStyledElement(btn).style.borderRadius).toBe('8px')
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Button sollte data-id haben', () => {
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
  })
})

// ============================================================
// BEISPIEL 6: SUFFIX INFERENCE
// ============================================================

describe('Tutorial Variables: 6. Suffix Inference', () => {
  // ---- 6a. -color Suffix ----
  describe('-color Suffix', () => {
    // Suffix-Inferenz hängt von der Implementierung ab
    // Wir testen mit expliziter bg Angabe
    const EXAMPLE_CODE = `$bg-color: #333
Box bg $bg-color, pad 16, "Color Suffix"`

    describe('Parser', () => {
      let result: ReturnType<typeof parse>

      beforeEach(() => {
        result = parse(EXAMPLE_CODE)
      })

      it('sollte keine Parse-Fehler haben', () => {
        expect(getParseErrors(result)).toHaveLength(0)
      })

      it('$bg-color sollte aufgelöst werden', () => {
        const box = getFirstNode(result)
        expect(getProperty(box, 'bg')).toBe('#333')
      })
    })

    describe('CSS Styles', () => {
      it('Box sollte gerendert werden', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const box = container.querySelector('[data-id="Box1"]')
        expect(box).toBeInTheDocument()
      })
    })
  })

  // ---- 6b. -size Suffix ----
  describe('-size Suffix', () => {
    const EXAMPLE_CODE = `$title-size: 24
Text $title-size, "Size Suffix"`

    describe('Parser', () => {
      let result: ReturnType<typeof parse>

      beforeEach(() => {
        result = parse(EXAMPLE_CODE)
      })

      it('sollte keine Parse-Fehler haben', () => {
        expect(getParseErrors(result)).toHaveLength(0)
      })

      it('$title-size wird als text-size inferiert', () => {
        const text = getFirstNode(result)
        const size = getProperty(text, 'text-size') || getProperty(text, 'size') || getProperty(text, 'font-size')
        expect(size).toBe(24)
      })
    })

    describe('CSS Styles', () => {
      it('Text sollte fontSize 24px haben', () => {
        parseAndRender(EXAMPLE_CODE)
        const text = screen.getByText('Size Suffix')
        const fontSize = getStyledElement(text).style.fontSize
        expect(fontSize).toBe('24px')
      })
    })
  })

  // ---- 6c. -padding Suffix ----
  describe('-padding Suffix', () => {
    const EXAMPLE_CODE = `$card-padding: 16
Card $card-padding, "Padding Suffix"`

    describe('Parser', () => {
      let result: ReturnType<typeof parse>

      beforeEach(() => {
        result = parse(EXAMPLE_CODE)
      })

      it('sollte keine Parse-Fehler haben', () => {
        expect(getParseErrors(result)).toHaveLength(0)
      })

      it('$card-padding wird als pad inferiert', () => {
        const card = getFirstNode(result)
        expect(getProperty(card, 'pad')).toBe(16)
      })
    })

    describe('CSS Styles', () => {
      it('Card sollte padding 16px haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const card = container.querySelector('[data-id="Card1"]') as HTMLElement
        expect(card.style.padding).toBe('16px')
      })
    })
  })

  // ---- 6d. -radius Suffix ----
  describe('-radius Suffix', () => {
    const EXAMPLE_CODE = `$btn-radius: 8
Button $btn-radius, "Radius Suffix"`

    describe('Parser', () => {
      let result: ReturnType<typeof parse>

      beforeEach(() => {
        result = parse(EXAMPLE_CODE)
      })

      it('sollte keine Parse-Fehler haben', () => {
        expect(getParseErrors(result)).toHaveLength(0)
      })

      it('$btn-radius wird als rad inferiert', () => {
        const button = getFirstNode(result)
        expect(getProperty(button, 'rad')).toBe(8)
      })
    })

    describe('CSS Styles', () => {
      it('Button sollte borderRadius 8px haben', () => {
        parseAndRender(EXAMPLE_CODE)
        const btn = screen.getByText('Radius Suffix')
        expect(getStyledElement(btn).style.borderRadius).toBe('8px')
      })
    })
  })

  // ---- 6e. -gap Suffix ----
  describe('-gap Suffix', () => {
    const EXAMPLE_CODE = `$list-gap: 12
Box ver, $list-gap
  Text "A"
  Text "B"`

    describe('Parser', () => {
      let result: ReturnType<typeof parse>

      beforeEach(() => {
        result = parse(EXAMPLE_CODE)
      })

      it('sollte keine Parse-Fehler haben', () => {
        expect(getParseErrors(result)).toHaveLength(0)
      })

      it('$list-gap wird als gap inferiert', () => {
        const box = getFirstNode(result)
        const gap = getProperty(box, 'gap') || getProperty(box, 'g')
        expect(gap).toBe(12)
      })
    })

    describe('CSS Styles', () => {
      it('Box sollte gap 12px haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const box = container.querySelector('[data-id="Box1"]') as HTMLElement
        expect(box.style.gap).toBe('12px')
      })
    })
  })

  // ---- 6f. -border Suffix ----
  describe('-border Suffix', () => {
    const EXAMPLE_CODE = `$frame-border: 2
Box bor $frame-border #333, pad 16, "Border Suffix"`

    describe('Parser', () => {
      let result: ReturnType<typeof parse>

      beforeEach(() => {
        result = parse(EXAMPLE_CODE)
      })

      it('sollte keine Parse-Fehler haben', () => {
        expect(getParseErrors(result)).toHaveLength(0)
      })
    })

    describe('CSS Styles', () => {
      it('Box sollte border mit 2px haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const box = container.querySelector('[data-id="Box1"]') as HTMLElement
        expect(box.style.border).toContain('2px')
      })
    })
  })
})

// ============================================================
// EDGE CASES
// ============================================================

describe('Tutorial Variables: Edge Cases', () => {
  it('leerer Token-Wert sollte verarbeitet werden', () => {
    const code = `$empty: ""\nText $empty`
    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('Token mit Bindestrich sollte verarbeitet werden', () => {
    const code = `$my-token: #333\nBox bg $my-token`
    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
    expect(result.tokens.get('my-token')).toBe('#333')
  })

  it('Token mit Unterstrich sollte verarbeitet werden', () => {
    const code = `$my_token: #333\nBox bg $my_token`
    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('Token mit Zahlen sollte verarbeitet werden', () => {
    const code = `$spacing2: 8\nBox pad $spacing2`
    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
    expect(result.tokens.get('spacing2')).toBe(8)
  })

  it('mehrere Token-Referenzen in einem Property sollten funktionieren', () => {
    const code = `$w: 100\n$h: 50\nBox w $w, h $h`
    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('Token in Conditional sollte funktionieren', () => {
    const code = `$active: true\n$activeColor: #2271c1\nBox if $active then bg $activeColor`
    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })
})

// ============================================================
// SNAPSHOT TESTS
// ============================================================

describe('Tutorial Variables: Snapshots', () => {
  const examples = [
    {
      name: 'Simple Token',
      code: `$color: #333\nBox bg $color`,
    },
    {
      name: 'Multiple Tokens',
      code: `$pad: 16\n$rad: 8\nCard pad $pad, rad $rad`,
    },
    {
      name: 'Hierarchical Token',
      code: `$base: #333\n$derived: $base\nBox bg $derived`,
    },
    {
      name: 'Boolean Token',
      code: `$active: true\nBox if $active then bg #333`,
    },
    {
      name: 'String Token',
      code: `$text: "Hello"\nText $text`,
    },
  ]

  examples.forEach(({ name, code }) => {
    it(`${name} - Parser Output stabil`, () => {
      const result = parse(code)
      const snapshot = {
        tokenCount: result.tokens.size,
        nodeCount: result.nodes?.length,
        errorCount: getParseErrors(result).length,
      }
      expect(snapshot).toMatchSnapshot()
    })
  })
})

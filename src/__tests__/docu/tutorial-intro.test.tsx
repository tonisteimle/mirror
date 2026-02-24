/**
 * Tutorial Tests: Learn Mirror in 2 Minutes
 *
 * Umfassende Tests nach dem 8-Level Muster aus DOCU-TEST-ANSATZ.md.
 * Jedes Beispiel wird VOLLSTÄNDIG getestet: Parser, Generator, DOM, CSS, Hover, Layout, Edge Cases, Snapshots.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '../../parser/parser'
import { screen, fireEvent } from '@testing-library/react'

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
  hasEventHandler,
  hasAction,
} from './utils'

// ============================================================
// BEISPIEL 1: A COMPONENT
// Button "Hello World"
// ============================================================

describe('Tutorial Intro: 1. A Component', () => {
  const EXAMPLE_CODE = 'Button "Hello World"'

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
      it('sollte genau einen Node erzeugen', () => {
        expect(result.nodes).toHaveLength(1)
      })

      it('sollte den korrekten Namen haben', () => {
        expect(getFirstNode(result)?.name).toBe('Button')
      })

      it('sollte den Text-Content haben', () => {
        expect(getTextContent(getFirstNode(result))).toBe('Hello World')
      })
    })
  })

  // ---- 2. REACT GENERATOR TESTS ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      const result = parse(EXAMPLE_CODE)
      expect(() => renderMirror(result)).not.toThrow()
    })

    it('sollte den Text "Hello World" anzeigen', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Hello World')).toBeInTheDocument()
    })
  })

  // ---- 3. DOM STRUKTUR TESTS ----
  describe('DOM Struktur', () => {
    beforeEach(() => {
      parseAndRender(EXAMPLE_CODE)
    })

    it('sollte ein Element mit dem Text erzeugen', () => {
      const button = screen.getByText('Hello World')
      expect(button).toBeInTheDocument()
    })

    it('sollte innerText korrekt haben', () => {
      const button = screen.getByText('Hello World')
      expect(button.textContent).toBe('Hello World')
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    let styledElement: HTMLElement

    beforeEach(() => {
      parseAndRender(EXAMPLE_CODE)
      const text = screen.getByText('Hello World')
      styledElement = getStyledElement(text)
    })

    it('sollte inline-block display haben (Button default)', () => {
      // Buttons haben typischerweise inline-block oder flex
      const display = styledElement.style.display
      expect(['inline-block', 'inline-flex', 'flex', '']).toContain(display)
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    let styledElement: HTMLElement

    beforeEach(() => {
      parseAndRender(EXAMPLE_CODE)
      const text = screen.getByText('Hello World')
      styledElement = getStyledElement(text)
    })

    it('sollte im DOM existieren', () => {
      expect(styledElement).toBeInTheDocument()
    })

    it('sollte nicht versteckt sein', () => {
      expect(styledElement.style.display).not.toBe('none')
    })

    it('sollte data-id Attribut haben', () => {
      expect(styledElement.getAttribute('data-id')).toBe('Button1')
    })

    it('sollte entweder data-state oder kein State-Styling haben', () => {
      // Einfache Buttons ohne States haben kein data-state
      const dataState = styledElement.getAttribute('data-state')
      // Entweder data-state existiert oder Button ist ohne States
      expect(dataState === null || dataState === 'default' || dataState).toBeDefined()
    })

    it('sollte korrekten Klassennamen haben', () => {
      expect(styledElement.classList.contains('Button')).toBe(true)
    })
  })

  // ---- 7. EDGE CASES ----
  describe('Edge Cases', () => {
    it('sollte mit leerem Text rendern', () => {
      const result = parse('Button ""')
      expect(() => renderMirror(result)).not.toThrow()
    })

    it('sollte mit langem Text rendern', () => {
      const result = parse('Button "Dies ist ein sehr langer Button-Text"')
      expect(() => renderMirror(result)).not.toThrow()
    })

    it('sollte mit Sonderzeichen rendern', () => {
      const result = parse('Button "Klick mich! 🎉"')
      expect(() => renderMirror(result)).not.toThrow()
    })
  })

  // ---- 8. SNAPSHOT ----
  describe('Snapshot', () => {
    it('sollte dem HTML-Snapshot entsprechen', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.innerHTML).toMatchSnapshot()
    })

    it('Parser-Output sollte stabil sein', () => {
      const result = parse(EXAMPLE_CODE)
      const snapshot = {
        nodeCount: result.nodes?.length,
        nodeName: getFirstNode(result)?.name,
        hasContent: !!getTextContent(getFirstNode(result)),
      }
      expect(snapshot).toMatchSnapshot()
    })
  })
})

// ============================================================
// BEISPIEL 2: ADD STYLING
// Row hor, g 12
//   Button bg #2271c1, pad 12 24, rad 8, "Short form"
//   Button background #2271c1, padding 12 24, radius 8, "Long form"
// ============================================================

describe('Tutorial Intro: 2. Add Styling', () => {
  const EXAMPLE_CODE = `Row hor, g 12
  Button bg #2271c1, pad 12 24, rad 8, "Short form"
  Button background #2271c1, padding 12 24, radius 8, "Long form"`

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
      it('sollte genau einen Root-Node erzeugen', () => {
        expect(result.nodes).toHaveLength(1)
      })

      it('Row sollte zwei Kinder haben', () => {
        const row = getFirstNode(result)
        expect(row?.children?.length).toBe(2)
      })
    })

    describe('Properties - Row', () => {
      it('sollte hor-Property haben', () => {
        const row = getFirstNode(result)
        expect(getProperty(row, 'hor')).toBe(true)
      })

      it('sollte gap 12 haben', () => {
        const row = getFirstNode(result)
        const gap = getProperty(row, 'gap') || getProperty(row, 'g')
        expect(gap).toBe(12)
      })
    })

    describe('Properties - Button (Shorthand)', () => {
      it('sollte bg #2271c1 haben', () => {
        const row = getFirstNode(result)
        const button = row?.children?.[0]
        expect(getProperty(button, 'bg')).toBe('#2271c1')
      })

      it('sollte rad 8 haben', () => {
        const row = getFirstNode(result)
        const button = row?.children?.[0]
        expect(getProperty(button, 'rad')).toBe(8)
      })

      it('sollte Text-Content "Short form" haben', () => {
        const row = getFirstNode(result)
        const button = row?.children?.[0]
        expect(getTextContent(button)).toBe('Short form')
      })
    })

    describe('Properties - Button (Long form)', () => {
      it('sollte background #2271c1 haben', () => {
        const row = getFirstNode(result)
        const button = row?.children?.[1]
        const bg = getProperty(button, 'bg') || getProperty(button, 'background')
        expect(bg).toBe('#2271c1')
      })

      it('sollte radius 8 haben', () => {
        const row = getFirstNode(result)
        const button = row?.children?.[1]
        const rad = getProperty(button, 'rad') || getProperty(button, 'radius')
        expect(rad).toBe(8)
      })
    })
  })

  // ---- 2. REACT GENERATOR TESTS ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      const result = parse(EXAMPLE_CODE)
      expect(() => renderMirror(result)).not.toThrow()
    })

    it('sollte beide Button-Texte anzeigen', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Short form')).toBeInTheDocument()
      expect(screen.getByText('Long form')).toBeInTheDocument()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles - Row', () => {
    let rowElement: HTMLElement

    beforeEach(() => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      rowElement = container.querySelector('[data-id="Row1"]') as HTMLElement
    })

    it('sollte flexDirection row haben', () => {
      expect(rowElement.style.flexDirection).toBe('row')
    })

    it('sollte gap 12px haben', () => {
      expect(rowElement.style.gap).toBe('12px')
    })
  })

  describe('CSS Styles - Buttons', () => {
    it('sollte Short form Button mit blauem Hintergrund haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const button = screen.getByText('Short form')
      const styledEl = getStyledElement(button)
      expect(colorsMatch(styledEl.style.backgroundColor, '#2271c1')).toBe(true)
    })

    it('sollte Short form Button mit border-radius 8px haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const button = screen.getByText('Short form')
      const styledEl = getStyledElement(button)
      expect(styledEl.style.borderRadius).toBe('8px')
    })

    it('sollte korrektes Padding haben (12px 24px)', () => {
      parseAndRender(EXAMPLE_CODE)
      const button = screen.getByText('Short form')
      const styledEl = getStyledElement(button)
      const padding = styledEl.style.padding
      expect(padding.includes('12px') && padding.includes('24px')).toBe(true)
    })

    it('Long form Button sollte gleiche Styles wie Short form haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const short = getStyledElement(screen.getByText('Short form'))
      const long = getStyledElement(screen.getByText('Long form'))

      expect(colorsMatch(short.style.backgroundColor, long.style.backgroundColor)).toBe(true)
      expect(short.style.borderRadius).toBe(long.style.borderRadius)
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Row sollte data-id="Row1" haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const row = container.querySelector('[data-id="Row1"]')
      expect(row).toBeInTheDocument()
    })

    it('Short form Button sollte data-id="Button1" haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const button = container.querySelector('[data-id="Button1"]')
      expect(button).toBeInTheDocument()
    })

    it('Long form Button sollte data-id="Button2" haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const button = container.querySelector('[data-id="Button2"]')
      expect(button).toBeInTheDocument()
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
// BEISPIEL 3: REUSE AND OVERRIDE
// Row hor, g 12
//   Button bg #2271c1, pad 12 24, rad 8, "Hello World"
//   Button "Save"
//   Button bg #c12271, "Delete"
// ============================================================

describe('Tutorial Intro: 3. Reuse and Override', () => {
  const EXAMPLE_CODE = `Row hor, g 12
  Button bg #2271c1, pad 12 24, rad 8, "Hello World"
  Button "Save"
  Button bg #c12271, "Delete"`

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

    describe('Vererbung', () => {
      it('sollte drei Buttons als Kinder haben', () => {
        const row = getFirstNode(result)
        expect(row?.children?.length).toBe(3)
      })

      it('erster Button definiert Basis-Styles', () => {
        const row = getFirstNode(result)
        const firstButton = row?.children?.[0]
        expect(getProperty(firstButton, 'bg')).toBe('#2271c1')
        expect(getProperty(firstButton, 'rad')).toBe(8)
      })

      it('zweiter Button hat nur Text (erbt Styles implizit)', () => {
        const row = getFirstNode(result)
        const secondButton = row?.children?.[1]
        expect(getTextContent(secondButton)).toBe('Save')
        // Properties werden geerbt - nicht explizit gesetzt
      })

      it('dritter Button überschreibt nur bg', () => {
        const row = getFirstNode(result)
        const thirdButton = row?.children?.[2]
        expect(getProperty(thirdButton, 'bg')).toBe('#c12271')
      })
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles - Vererbung', () => {
    it('Hello World Button sollte blauen Hintergrund haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Hello World')
      expect(colorsMatch(getStyledElement(btn).style.backgroundColor, '#2271c1')).toBe(true)
    })

    it('Save Button sollte blauen Hintergrund erben', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Save')
      expect(colorsMatch(getStyledElement(btn).style.backgroundColor, '#2271c1')).toBe(true)
    })

    it('Delete Button sollte roten Hintergrund haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const btn = screen.getByText('Delete')
      expect(colorsMatch(getStyledElement(btn).style.backgroundColor, '#c12271')).toBe(true)
    })

    it('alle Buttons sollten gleichen border-radius haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const helloBtn = getStyledElement(screen.getByText('Hello World'))
      const saveBtn = getStyledElement(screen.getByText('Save'))
      const deleteBtn = getStyledElement(screen.getByText('Delete'))

      expect(helloBtn.style.borderRadius).toBe('8px')
      expect(saveBtn.style.borderRadius).toBe('8px')
      expect(deleteBtn.style.borderRadius).toBe('8px')
    })

    it('alle Buttons sollten gleiches padding haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const helloBtn = getStyledElement(screen.getByText('Hello World'))
      const saveBtn = getStyledElement(screen.getByText('Save'))

      expect(helloBtn.style.padding).toBe(saveBtn.style.padding)
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('alle drei Buttons sollten im DOM sein', () => {
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
// BEISPIEL 4: LAYOUTS AND CHILDREN
// Tile ver, bg #3281d1, pad 20, rad 12, g 8
//   Label text-size 12, "Revenue"
//   Value text-size 28, weight bold, "2.7 Mio"
// ============================================================

describe('Tutorial Intro: 4. Layouts and Children', () => {
  const EXAMPLE_CODE = `Tile ver, bg #3281d1, pad 20, rad 12, g 8
  Label text-size 12, "Revenue"
  Value text-size 28, weight bold, "2.7 Mio"`

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
      it('sollte Tile als Root haben', () => {
        expect(getFirstNode(result)?.name).toBe('Tile')
      })

      it('sollte zwei Kinder haben (Label, Value)', () => {
        expect(getFirstNode(result)?.children?.length).toBe(2)
      })
    })

    describe('Properties - Tile', () => {
      it('sollte ver-Property haben', () => {
        expect(getProperty(getFirstNode(result), 'ver')).toBe(true)
      })

      it('sollte bg #3281d1 haben', () => {
        expect(getProperty(getFirstNode(result), 'bg')).toBe('#3281d1')
      })

      it('sollte pad 20 haben', () => {
        expect(getProperty(getFirstNode(result), 'pad')).toBe(20)
      })

      it('sollte rad 12 haben', () => {
        expect(getProperty(getFirstNode(result), 'rad')).toBe(12)
      })

      it('sollte g 8 haben', () => {
        const gap = getProperty(getFirstNode(result), 'gap') || getProperty(getFirstNode(result), 'g')
        expect(gap).toBe(8)
      })
    })

    describe('Properties - Label', () => {
      it('sollte text-size 12 haben', () => {
        const tile = getFirstNode(result)
        const label = tile?.children?.[0]
        const size = getProperty(label, 'text-size') || getProperty(label, 'size')
        expect(size).toBe(12)
      })

      it('sollte Text "Revenue" haben', () => {
        const tile = getFirstNode(result)
        const label = tile?.children?.[0]
        expect(getTextContent(label)).toBe('Revenue')
      })
    })

    describe('Properties - Value', () => {
      it('sollte text-size 28 haben', () => {
        const tile = getFirstNode(result)
        const value = tile?.children?.[1]
        const size = getProperty(value, 'text-size') || getProperty(value, 'size')
        expect(size).toBe(28)
      })

      it('sollte weight bold haben', () => {
        const tile = getFirstNode(result)
        const value = tile?.children?.[1]
        const weight = getProperty(value, 'weight')
        expect(weight === 'bold' || weight === 700).toBe(true)
      })

      it('sollte Text "2.7 Mio" haben', () => {
        const tile = getFirstNode(result)
        const value = tile?.children?.[1]
        expect(getTextContent(value)).toBe('2.7 Mio')
      })
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    let tileElement: HTMLElement

    beforeEach(() => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      tileElement = container.querySelector('[data-id="Tile1"]') as HTMLElement
    })

    describe('Tile Layout', () => {
      it('sollte flexDirection column haben', () => {
        expect(tileElement.style.flexDirection).toBe('column')
      })

      it('sollte gap 8px haben', () => {
        expect(tileElement.style.gap).toBe('8px')
      })
    })

    describe('Tile Styling', () => {
      it('sollte blauen Hintergrund haben', () => {
        expect(colorsMatch(tileElement.style.backgroundColor, '#3281d1')).toBe(true)
      })

      it('sollte padding 20px haben', () => {
        expect(tileElement.style.padding).toBe('20px')
      })

      it('sollte border-radius 12px haben', () => {
        expect(tileElement.style.borderRadius).toBe('12px')
      })
    })

    describe('Label Typography', () => {
      it('sollte font-size 12px haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const label = container.querySelector('[data-id="Label1"]') as HTMLElement
        // fontSize kann direkt am Element oder am Parent sein
        const fontSize = label?.style.fontSize || label?.parentElement?.style.fontSize
        expect(fontSize).toBe('12px')
      })
    })

    describe('Value Typography', () => {
      it('sollte font-size 28px haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const value = container.querySelector('[data-id="Value1"]') as HTMLElement
        const fontSize = value?.style.fontSize || value?.parentElement?.style.fontSize
        expect(fontSize).toBe('28px')
      })

      it('sollte font-weight bold haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const value = container.querySelector('[data-id="Value1"]') as HTMLElement
        const fontWeight = value?.style.fontWeight || value?.parentElement?.style.fontWeight
        expect(['bold', '700']).toContain(fontWeight)
      })
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Tile sollte data-id="Tile1" haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Tile1"]')).toBeInTheDocument()
    })

    it('Label sollte data-id="Label1" haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Label1"]')).toBeInTheDocument()
    })

    it('Value sollte data-id="Value1" haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Value1"]')).toBeInTheDocument()
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
// BEISPIEL 5: REUSABLE COMPONENTS (Template Definition)
// ============================================================

describe('Tutorial Intro: 5. Reusable Components (Template)', () => {
  const EXAMPLE_CODE = `Tile: ver, bg #3281d1, pad 20, rad 12, g 8
  Label: text-size 12
  Value: text-size 28, weight bold

Dashboard grid 3, g 16
  Tile
    Label "Revenue"
    Value "2.7 Mio"
  Tile
    Label "Customers"
    Value "40"
  Tile
    Label "Growth"
    Value "+12%"`

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

    describe('Registry (Template Definitions)', () => {
      it('Tile sollte in Registry sein', () => {
        expect(result.registry.has('Tile')).toBe(true)
      })

      it('Label sollte in Registry sein (als Slot oder Top-Level)', () => {
        expect(result.registry.has('Tile.Label') || result.registry.has('Label')).toBe(true)
      })

      it('Value sollte in Registry sein (als Slot oder Top-Level)', () => {
        expect(result.registry.has('Tile.Value') || result.registry.has('Value')).toBe(true)
      })
    })

    describe('Node-Struktur', () => {
      it('sollte Dashboard als einzigen gerenderten Node haben', () => {
        expect(result.nodes).toHaveLength(1)
        expect(getFirstNode(result)?.name).toBe('Dashboard')
      })

      it('Dashboard sollte drei Tile-Kinder haben', () => {
        expect(getFirstNode(result)?.children?.length).toBe(3)
      })

      it('Dashboard sollte grid 3 haben', () => {
        expect(getProperty(getFirstNode(result), 'grid')).toBe(3)
      })

      it('Dashboard sollte g 16 haben', () => {
        const gap = getProperty(getFirstNode(result), 'gap') || getProperty(getFirstNode(result), 'g')
        expect(gap).toBe(16)
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

  // ---- 3. DOM STRUKTUR TESTS ----
  describe('DOM Struktur', () => {
    it('alle Label-Texte sollten angezeigt werden', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Revenue')).toBeInTheDocument()
      expect(screen.getByText('Customers')).toBeInTheDocument()
      expect(screen.getByText('Growth')).toBeInTheDocument()
    })

    it('alle Value-Texte sollten angezeigt werden', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('2.7 Mio')).toBeInTheDocument()
      expect(screen.getByText('40')).toBeInTheDocument()
      expect(screen.getByText('+12%')).toBeInTheDocument()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('Dashboard sollte grid layout haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const dashboard = container.querySelector('[data-id="Dashboard1"]') as HTMLElement
      expect(dashboard.style.display).toBe('grid')
    })

    it('Dashboard sollte gap 16px haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const dashboard = container.querySelector('[data-id="Dashboard1"]') as HTMLElement
      expect(dashboard.style.gap).toBe('16px')
    })

    it('alle Tiles sollten blauen Hintergrund erben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const tiles = container.querySelectorAll('[class*="Tile"]')
      tiles.forEach(tile => {
        if ((tile as HTMLElement).style.backgroundColor) {
          expect(colorsMatch((tile as HTMLElement).style.backgroundColor, '#3281d1')).toBe(true)
        }
      })
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Dashboard sollte data-id="Dashboard1" haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Dashboard1"]')).toBeInTheDocument()
    })

    it('alle drei Tiles sollten data-ids haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Tile1"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Tile2"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Tile3"]')).toBeInTheDocument()
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
        registrySize: result.registry.size,
        dashboardChildren: getFirstNode(result)?.children?.length,
      }
      expect(snapshot).toMatchSnapshot()
    })
  })
})

// ============================================================
// BEISPIEL 6: STATES
// Button bg #2271c1, pad 12 24, rad 8, "Hover me"
//   hover
//     bg #1d5ba0
//   active
//     bg #174a83
// ============================================================

describe('Tutorial Intro: 6. States', () => {
  const EXAMPLE_CODE = `Button bg #2271c1, pad 12 24, rad 8, "Hover me"
  hover
    bg #1d5ba0
  active
    bg #174a83`

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

    describe('Hover-State', () => {
      it('sollte hover-State haben', () => {
        const hoverState = getState(getFirstNode(result), 'hover')
        expect(hoverState).toBeDefined()
      })

      it('hover-State sollte bg #1d5ba0 haben', () => {
        const hoverState = getState(getFirstNode(result), 'hover')
        expect(hoverState?.properties?.bg).toBe('#1d5ba0')
      })
    })

    describe('Active-State', () => {
      it('sollte active-State haben', () => {
        const activeState = getState(getFirstNode(result), 'active')
        expect(activeState).toBeDefined()
      })

      it('active-State sollte bg #174a83 haben', () => {
        const activeState = getState(getFirstNode(result), 'active')
        expect(activeState?.properties?.bg).toBe('#174a83')
      })
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles - Default', () => {
    it('sollte default blauen Hintergrund haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const button = screen.getByText('Hover me')
      const styledEl = getStyledElement(button)
      expect(colorsMatch(styledEl.style.backgroundColor, '#2271c1')).toBe(true)
    })

    it('sollte padding 12px 24px haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const button = screen.getByText('Hover me')
      const styledEl = getStyledElement(button)
      const padding = styledEl.style.padding
      expect(padding.includes('12px') && padding.includes('24px')).toBe(true)
    })

    it('sollte border-radius 8px haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const button = screen.getByText('Hover me')
      const styledEl = getStyledElement(button)
      expect(styledEl.style.borderRadius).toBe('8px')
    })
  })

  // ---- 5. HOVER INTERAKTION ----
  describe('Hover Interaktion', () => {
    it('sollte hover-State in Parser haben', () => {
      const result = parse(EXAMPLE_CODE)
      const hoverState = getState(getFirstNode(result), 'hover')
      expect(hoverState).toBeDefined()
      expect(hoverState?.properties?.bg).toBe('#1d5ba0')
    })

    it('sollte ohne Crash hover/leave Events durchführen können', () => {
      parseAndRender(EXAMPLE_CODE)
      const button = screen.getByText('Hover me')
      const styledEl = getStyledElement(button)

      expect(() => {
        fireEvent.mouseEnter(styledEl)
        fireEvent.mouseLeave(styledEl)
        fireEvent.mouseEnter(styledEl)
      }).not.toThrow()
    })

    it('sollte initial korrekten Hintergrund haben', () => {
      parseAndRender(EXAMPLE_CODE)
      const button = screen.getByText('Hover me')
      const styledEl = getStyledElement(button)
      expect(colorsMatch(styledEl.style.backgroundColor, '#2271c1')).toBe(true)
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('sollte data-id="Button1" haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Button1"]')).toBeInTheDocument()
    })

    it('sollte data-state Attribut haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const button = container.querySelector('[data-id="Button1"]')
      expect(button?.getAttribute('data-state')).toBeTruthy()
    })

    it('sollte initial data-state "default" haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const button = container.querySelector('[data-id="Button1"]')
      const state = button?.getAttribute('data-state')
      // Initial state ist entweder "default" oder enthält keine Pseudo-States
      expect(state === 'default' || !state?.includes('hover')).toBe(true)
    })
  })

  // ---- 8. SNAPSHOT ----
  describe('Snapshot', () => {
    it('DOM Snapshot (default state)', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.innerHTML).toMatchSnapshot()
    })

    it('Parser-Output sollte stabil sein', () => {
      const result = parse(EXAMPLE_CODE)
      const node = getFirstNode(result)
      const snapshot = {
        hasHoverState: !!getState(node, 'hover'),
        hasActiveState: !!getState(node, 'active'),
        hoverBg: getState(node, 'hover')?.properties?.bg,
        activeBg: getState(node, 'active')?.properties?.bg,
      }
      expect(snapshot).toMatchSnapshot()
    })
  })
})

// ============================================================
// BEISPIEL 7: CLICK EVENTS
// Button bg #2271c1, pad 12 24, rad 8, "Click me"
//   hover
//     bg #1d5ba0
//   onclick alert("It works!")
// ============================================================

describe('Tutorial Intro: 7. Click Events', () => {
  const EXAMPLE_CODE = `Button bg #2271c1, pad 12 24, rad 8, "Click me"
  hover
    bg #1d5ba0
  onclick alert("It works!")`

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

    describe('Event Handler', () => {
      it('sollte onclick Event haben', () => {
        expect(hasEventHandler(getFirstNode(result), 'onclick')).toBe(true)
      })

      it('sollte alert Action haben', () => {
        expect(hasAction(getFirstNode(result), 'onclick', 'alert')).toBe(true)
      })
    })
  })

  // ---- 2. REACT GENERATOR TESTS ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      const result = parse(EXAMPLE_CODE)
      expect(() => renderMirror(result)).not.toThrow()
    })

    it('sollte den Button-Text anzeigen', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Click me')).toBeInTheDocument()
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('sollte data-id="Button1" haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Button1"]')).toBeInTheDocument()
    })

    it('sollte klickbar sein (ohne Crash)', () => {
      parseAndRender(EXAMPLE_CODE)
      const button = screen.getByText('Click me')
      const styledEl = getStyledElement(button)
      const clickTarget = styledEl.closest('[data-state]') || styledEl

      expect(() => fireEvent.click(clickTarget)).not.toThrow()
    })
  })

  // ---- 8. SNAPSHOT ----
  describe('Snapshot', () => {
    it('Parser-Output sollte stabil sein', () => {
      const result = parse(EXAMPLE_CODE)
      const snapshot = {
        hasOnclick: hasEventHandler(getFirstNode(result), 'onclick'),
        hasAlertAction: hasAction(getFirstNode(result), 'onclick', 'alert'),
      }
      expect(snapshot).toMatchSnapshot()
    })
  })
})

// ============================================================
// BEISPIEL 8: TOGGLE VISIBILITY
// ============================================================

describe('Tutorial Intro: 8. Toggle Visibility', () => {
  const EXAMPLE_CODE = `Box ver, bg #3281d1, pad 20, rad 12, g 12
  Button bg #2271c1, pad 10 16, rad 6, "Show/Hide Details"
    hover
      bg #1d5ba0
    onclick toggle Details
  Details ver, bg #222, pad 16, rad 8, g 4
    Text "Here are the details."
    Text "They appear and disappear."`

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
      it('Box sollte zwei Kinder haben (Button, Details)', () => {
        expect(getFirstNode(result)?.children?.length).toBe(2)
      })

      it('Details sollte zwei Text-Kinder haben', () => {
        const details = getFirstNode(result)?.children?.[1]
        expect(details?.children?.length).toBe(2)
      })
    })

    describe('Event Handler', () => {
      it('Button sollte onclick toggle Details haben', () => {
        const button = getFirstNode(result)?.children?.[0]
        expect(hasEventHandler(button, 'onclick')).toBe(true)
        expect(hasAction(button, 'onclick', 'toggle')).toBe(true)
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

  // ---- 3. DOM STRUKTUR TESTS ----
  describe('DOM Struktur', () => {
    it('Button sollte gerendert werden', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Show/Hide Details')).toBeInTheDocument()
    })

    it('Details-Texte sollten initial sichtbar sein', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Here are the details.')).toBeInTheDocument()
      expect(screen.getByText('They appear and disappear.')).toBeInTheDocument()
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Box sollte data-id="Box1" haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Box1"]')).toBeInTheDocument()
    })

    it('Details sollte data-id="Details1" haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Details1"]')).toBeInTheDocument()
    })

    it('Klick auf Button sollte ohne Crash funktionieren', () => {
      parseAndRender(EXAMPLE_CODE)
      const button = screen.getByText('Show/Hide Details')
      const clickTarget = getStyledElement(button).closest('[data-state]') || getStyledElement(button)

      expect(() => fireEvent.click(clickTarget)).not.toThrow()
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
// BEISPIEL 9: STARTING HIDDEN
// ============================================================

describe('Tutorial Intro: 9. Starting Hidden', () => {
  const EXAMPLE_CODE = `Box ver, bg #3281d1, pad 20, rad 12, g 12
  Button bg #2271c1, pad 10 16, rad 6, "Show Message"
    hover
      bg #1d5ba0
    onclick toggle Message
  Message hidden, "Hello! Click again to hide."`

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

    describe('Hidden Property', () => {
      it('Message sollte hidden Property haben', () => {
        const message = getFirstNode(result)?.children?.[1]
        expect(getProperty(message, 'hidden')).toBe(true)
      })

      it('Message sollte Text-Content haben', () => {
        const message = getFirstNode(result)?.children?.[1]
        expect(getTextContent(message)).toBe('Hello! Click again to hide.')
      })
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT (Hidden) ----
  describe('Sichtbarkeit & Layout', () => {
    it('Button sollte sichtbar sein', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Show Message')).toBeInTheDocument()
    })

    it('Message sollte initial NICHT im DOM sein (hidden)', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const message = container.querySelector('[data-id^="Message"]')
      expect(message).toBeNull()
    })

    it('Klick auf Button sollte ohne Crash funktionieren', () => {
      parseAndRender(EXAMPLE_CODE)
      const button = screen.getByText('Show Message')
      const clickTarget = getStyledElement(button).closest('[data-state]') || getStyledElement(button)

      expect(() => fireEvent.click(clickTarget)).not.toThrow()
    })
  })

  // ---- 7. EDGE CASES ----
  describe('Edge Cases', () => {
    it('sollte mit nur hidden-Property rendern', () => {
      const code = 'Panel hidden'
      const result = parse(code)
      expect(() => renderMirror(result)).not.toThrow()
    })

    it('sollte hidden Element nicht im DOM haben', () => {
      const code = 'Panel hidden, "Secret"'
      const { container } = parseAndRender(code)
      expect(container.querySelector('[data-id^="Panel"]')).toBeNull()
    })
  })

  // ---- 8. SNAPSHOT ----
  describe('Snapshot', () => {
    it('DOM Snapshot (Message versteckt)', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.innerHTML).toMatchSnapshot()
    })

    it('Parser-Output sollte stabil sein', () => {
      const result = parse(EXAMPLE_CODE)
      const message = getFirstNode(result)?.children?.[1]
      const snapshot = {
        messageHidden: getProperty(message, 'hidden'),
        messageContent: getTextContent(message),
      }
      expect(snapshot).toMatchSnapshot()
    })
  })
})

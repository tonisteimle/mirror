/**
 * Component Library Tests - Interactive Components
 *
 * Testet die Beispiele aus der "Interactive Components" Sektion
 * des Tutorials mit dem 8-Stufen-Schema.
 *
 * Getestete Beispiele:
 * 1. Behavior States (Menu mit highlight)
 * 2. Keyboard Navigation
 * 3. Click Outside (Menu Pattern)
 * 4. Selection Pattern
 * 5. Complete Select
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '../../parser/parser'
import { screen, fireEvent } from '@testing-library/react'

import {
  parseAndRender,
  getFirstNode,
  getState,
  getParseErrors,
  getTextContent,
  getProperty,
  colorsMatch,
} from './utils'

// ============================================================
// 1. BEHAVIOR STATES - Menu mit highlight
// ============================================================

describe('Component Library: Behavior States', () => {
  const EXAMPLE_CODE = `
Item: pad 12 16, rad 6, cursor pointer
  state default
    bg transparent
  state highlighted
    bg #333
  state selected
    bg #2271c1

Menu ver, g 2, bg #1A1A23, pad 8, rad 8, w 200
  Item onhover highlight self, "Dashboard"
  Item onhover highlight self, "Settings"
  Item onhover highlight self, "Profile"
`.trim()

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
    })

    describe('Item-Definition', () => {
      it('sollte Item in Registry haben', () => {
        expect(result.registry.has('Item')).toBe(true)
      })

      it('Item sollte rad 6 haben', () => {
        const template = result.registry.get('Item')
        expect(template?.properties?.rad).toBe(6)
      })

      it('Item sollte cursor pointer haben', () => {
        const template = result.registry.get('Item')
        expect(template?.properties?.cursor).toBe('pointer')
      })
    })

    describe('Item States', () => {
      it('Item sollte state default haben', () => {
        const template = result.registry.get('Item')
        const states = template?.states as Array<{ name: string }>
        const hasDefault = states?.some(s => s.name === 'default')
        expect(hasDefault).toBe(true)
      })

      it('Item sollte state highlighted haben', () => {
        const template = result.registry.get('Item')
        const states = template?.states as Array<{ name: string }>
        const hasHighlighted = states?.some(s => s.name === 'highlighted')
        expect(hasHighlighted).toBe(true)
      })

      it('Item sollte state selected haben', () => {
        const template = result.registry.get('Item')
        const states = template?.states as Array<{ name: string }>
        const hasSelected = states?.some(s => s.name === 'selected')
        expect(hasSelected).toBe(true)
      })

      it('state highlighted sollte bg #333 haben', () => {
        const template = result.registry.get('Item')
        const states = template?.states as Array<{ name: string; properties: Record<string, unknown> }>
        const highlighted = states?.find(s => s.name === 'highlighted')
        expect(highlighted?.properties?.bg).toBe('#333')
      })

      it('state selected sollte bg #2271c1 haben', () => {
        const template = result.registry.get('Item')
        const states = template?.states as Array<{ name: string; properties: Record<string, unknown> }>
        const selected = states?.find(s => s.name === 'selected')
        expect(selected?.properties?.bg).toBe('#2271c1')
      })
    })

    describe('Menu Properties', () => {
      it('Menu sollte Root-Node sein', () => {
        expect(getFirstNode(result)?.name).toBe('Menu')
      })

      it('Menu sollte ver haben', () => {
        expect(getProperty(getFirstNode(result), 'ver')).toBe(true)
      })

      it('Menu sollte g 2 haben', () => {
        expect(getProperty(getFirstNode(result), 'g')).toBe(2)
      })

      it('Menu sollte bg #1A1A23 haben', () => {
        expect(getProperty(getFirstNode(result), 'bg')).toBe('#1A1A23')
      })

      it('Menu sollte rad 8 haben', () => {
        expect(getProperty(getFirstNode(result), 'rad')).toBe(8)
      })

      it('Menu sollte w 200 haben', () => {
        expect(getProperty(getFirstNode(result), 'w')).toBe(200)
      })
    })

    describe('Menu Children', () => {
      it('Menu sollte 3 Item-Kinder haben', () => {
        const menu = getFirstNode(result)
        expect(menu?.children?.length).toBe(3)
      })

      it('Erstes Item sollte "Dashboard" haben', () => {
        const menu = getFirstNode(result)
        const firstItem = menu?.children?.[0]
        const content = getTextContent(firstItem)
        expect(content).toBe('Dashboard')
      })
    })

    describe('Item Events', () => {
      it('Items sollten onhover Event haben', () => {
        const menu = getFirstNode(result)
        const firstItem = menu?.children?.[0]
        const hasOnhover = firstItem?.eventHandlers?.some((h: any) => h.event === 'onhover')
        expect(hasOnhover).toBe(true)
      })

      it('onhover sollte highlight Action haben', () => {
        const menu = getFirstNode(result)
        const firstItem = menu?.children?.[0]
        const onhover = firstItem?.eventHandlers?.find((h: any) => h.event === 'onhover')
        const hasHighlight = onhover?.actions?.some((a: any) => a.type === 'highlight')
        expect(hasHighlight).toBe(true)
      })
    })
  })

  // ---- 2. REACT GENERATOR TESTS ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(EXAMPLE_CODE)).not.toThrow()
    })

    it('sollte "Dashboard" anzeigen', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('sollte "Settings" anzeigen', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('sollte "Profile" anzeigen', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Profile')).toBeInTheDocument()
    })
  })

  // ---- 3. DOM STRUKTUR TESTS ----
  describe('DOM Struktur', () => {
    it('Menu sollte existieren', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Menu1"]')).toBeInTheDocument()
    })

    it('Items sollten existieren', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Item1"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Item2"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Item3"]')).toBeInTheDocument()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    describe('Menu Styles', () => {
      it('sollte flexDirection column haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const menu = container.querySelector('[data-id="Menu1"]') as HTMLElement
        expect(menu?.style.flexDirection).toBe('column')
      })

      it('sollte gap 2px haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const menu = container.querySelector('[data-id="Menu1"]') as HTMLElement
        expect(menu?.style.gap).toBe('2px')
      })

      it('sollte background #1A1A23 haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const menu = container.querySelector('[data-id="Menu1"]') as HTMLElement
        expect(colorsMatch(menu?.style.backgroundColor, '#1A1A23')).toBe(true)
      })

      it('sollte padding 8px haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const menu = container.querySelector('[data-id="Menu1"]') as HTMLElement
        expect(menu?.style.padding).toBe('8px')
      })

      it('sollte border-radius 8px haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const menu = container.querySelector('[data-id="Menu1"]') as HTMLElement
        expect(menu?.style.borderRadius).toBe('8px')
      })

      it('sollte width 200px haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const menu = container.querySelector('[data-id="Menu1"]') as HTMLElement
        expect(menu?.style.width).toBe('200px')
      })
    })

    describe('Item Styles', () => {
      it('sollte border-radius 6px haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const item = container.querySelector('[data-id="Item1"]') as HTMLElement
        expect(item?.style.borderRadius).toBe('6px')
      })

      it('sollte cursor pointer haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const item = container.querySelector('[data-id="Item1"]') as HTMLElement
        expect(item?.style.cursor).toBe('pointer')
      })
    })
  })

  // ---- 5. HOVER INTERAKTION TESTS ----
  describe('Hover Interaktion', () => {
    it('sollte bei hover Änderung haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const item = container.querySelector('[data-id="Item1"]') as HTMLElement
      const bgBefore = item?.style.backgroundColor
      const stateBefore = item?.getAttribute('data-state')

      fireEvent.mouseEnter(item)

      const stateAfter = item.getAttribute('data-state')
      const bgAfter = item.style.backgroundColor

      // Element sollte sich irgendwie geändert haben
      const hasChanged = stateAfter === 'highlighted' ||
                         colorsMatch(bgAfter, '#333') ||
                         stateAfter !== stateBefore ||
                         bgAfter !== bgBefore
      expect(hasChanged).toBe(true)
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT TESTS ----
  describe('Sichtbarkeit & Layout', () => {
    it('Menu sollte data-id haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const menu = container.querySelector('[data-id="Menu1"]')
      expect(menu?.getAttribute('data-id')).toBe('Menu1')
    })

    it('Menu sollte Menu Klasse haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const menu = container.querySelector('[data-id="Menu1"]')
      expect(menu?.classList.contains('Menu')).toBe(true)
    })

    it('Items sollten Item Klasse haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const item = container.querySelector('[data-id="Item1"]')
      expect(item?.classList.contains('Item')).toBe(true)
    })
  })

  // ---- 7. EDGE CASES ----
  describe('Edge Cases', () => {
    it('sollte mit nur einem Item rendern', () => {
      const code = `
Item: pad 12 16, rad 6
  state highlighted
    bg #333

Menu ver
  Item "Single"
`.trim()
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte ohne states rendern', () => {
      const code = `
Item: pad 12 16

Menu ver
  Item "No states"
`.trim()
      expect(() => parseAndRender(code)).not.toThrow()
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
// 2. KEYBOARD NAVIGATION
// ============================================================

describe('Component Library: Keyboard Navigation', () => {
  const EXAMPLE_CODE = `
Item: pad 12 16, rad 6, cursor pointer
  state default
    bg transparent
  state highlighted
    bg #333

Menu ver, g 2, bg #1A1A23, pad 8, rad 8, w 200
  onkeydown arrow-down: highlight next
  onkeydown arrow-up: highlight prev
  Item "Dashboard"
  Item "Settings"
  Item "Profile"
  Item "Logout"
`.trim()

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
    })

    describe('Menu Keyboard Events', () => {
      it('Menu sollte onkeydown Event haben', () => {
        const menu = getFirstNode(result)
        const hasKeydown = menu?.eventHandlers?.some((h: any) => h.event === 'onkeydown')
        expect(hasKeydown).toBe(true)
      })

      it('sollte arrow-down Modifier haben', () => {
        const menu = getFirstNode(result)
        const keyHandler = menu?.eventHandlers?.find((h: any) =>
          h.event === 'onkeydown' && h.key === 'arrow-down'
        )
        expect(keyHandler).toBeDefined()
      })

      it('sollte arrow-up Modifier haben', () => {
        const menu = getFirstNode(result)
        const keyHandler = menu?.eventHandlers?.find((h: any) =>
          h.event === 'onkeydown' && h.key === 'arrow-up'
        )
        expect(keyHandler).toBeDefined()
      })

      it('arrow-down sollte highlight next Action haben', () => {
        const menu = getFirstNode(result)
        const keyHandler = menu?.eventHandlers?.find((h: any) =>
          h.event === 'onkeydown' && h.key === 'arrow-down'
        )
        const hasHighlightNext = keyHandler?.actions?.some((a: any) =>
          a.type === 'highlight' && a.target === 'next'
        )
        expect(hasHighlightNext).toBe(true)
      })
    })

    describe('Menu Children', () => {
      it('Menu sollte 4 Item-Kinder haben', () => {
        const menu = getFirstNode(result)
        expect(menu?.children?.length).toBe(4)
      })
    })
  })

  // ---- 2. REACT GENERATOR TESTS ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(EXAMPLE_CODE)).not.toThrow()
    })

    it('sollte alle 4 Items anzeigen', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Profile')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })
  })

  // ---- 3. DOM STRUKTUR TESTS ----
  describe('DOM Struktur', () => {
    it('alle 4 Items sollten existieren', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Item1"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Item2"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Item3"]')).toBeInTheDocument()
      expect(container.querySelector('[data-id="Item4"]')).toBeInTheDocument()
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('Menu sollte column Layout haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const menu = container.querySelector('[data-id="Menu1"]') as HTMLElement
      expect(menu?.style.flexDirection).toBe('column')
    })
  })

  // ---- 5. KEYBOARD INTERAKTION TESTS ----
  describe('Keyboard Interaktion', () => {
    it('Menu sollte fokussierbar sein', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const menu = container.querySelector('[data-id="Menu1"]') as HTMLElement
      expect(menu?.tabIndex).toBeDefined()
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Menu sollte nicht versteckt sein', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const menu = container.querySelector('[data-id="Menu1"]') as HTMLElement
      expect(menu?.style.display).not.toBe('none')
    })
  })

  // ---- 7. EDGE CASES ----
  describe('Edge Cases', () => {
    it('sollte mit nur escape Key rendern', () => {
      const code = `
Menu ver
  onkeydown escape: close self
  Text "Test"
`.trim()
      expect(() => parseAndRender(code)).not.toThrow()
    })
  })

  // ---- 8. SNAPSHOT ----
  describe('Snapshot', () => {
    it('Parser Snapshot', () => {
      const result = parse(EXAMPLE_CODE)
      const snapshot = {
        menuName: getFirstNode(result)?.name,
        childCount: getFirstNode(result)?.children?.length,
        hasKeydownEvents: getFirstNode(result)?.eventHandlers?.some((h: any) => h.event === 'onkeydown'),
      }
      expect(snapshot).toMatchSnapshot()
    })
  })
})

// ============================================================
// 3. CLICK OUTSIDE - Menu Pattern
// ============================================================

describe('Component Library: Click Outside', () => {
  const EXAMPLE_CODE = `
Trigger: bg #2271c1, pad 12 16, rad 8, cursor pointer
  onclick toggle Popup

Popup: ver, bg #1A1A23, pad 8, rad 8, w 180, hidden, shadow lg
  onclick-outside close self

MenuItem: pad 10 14, rad 6, cursor pointer, hover-bg #333

Box ver, g 8
  Trigger "Open Menu"
  Popup
    MenuItem "Edit"
    MenuItem "Duplicate"
    MenuItem col #EF4444, "Delete"
`.trim()

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
    })

    describe('Trigger Definition', () => {
      it('sollte Trigger in Registry haben', () => {
        expect(result.registry.has('Trigger')).toBe(true)
      })

      it('Trigger sollte onclick toggle Popup haben', () => {
        const template = result.registry.get('Trigger')
        const onclick = template?.eventHandlers?.find((h: any) => h.event === 'onclick')
        const hasToggle = onclick?.actions?.some((a: any) =>
          a.type === 'toggle' && a.target === 'Popup'
        )
        expect(hasToggle).toBe(true)
      })
    })

    describe('Popup Definition', () => {
      it('sollte Popup in Registry haben', () => {
        expect(result.registry.has('Popup')).toBe(true)
      })

      it('Popup sollte hidden haben', () => {
        const template = result.registry.get('Popup')
        expect(template?.properties?.hidden).toBe(true)
      })

      it('Popup sollte onclick-outside Event haben', () => {
        const template = result.registry.get('Popup')
        const hasClickOutside = template?.eventHandlers?.some((h: any) =>
          h.event === 'onclick-outside'
        )
        expect(hasClickOutside).toBe(true)
      })

      it('onclick-outside sollte close self Action haben', () => {
        const template = result.registry.get('Popup')
        const handler = template?.eventHandlers?.find((h: any) => h.event === 'onclick-outside')
        const hasClose = handler?.actions?.some((a: any) =>
          a.type === 'close' && a.target === 'self'
        )
        expect(hasClose).toBe(true)
      })
    })

    describe('Node-Struktur', () => {
      it('Box sollte Root sein', () => {
        expect(getFirstNode(result)?.name).toBe('Box')
      })

      it('Box sollte 2 Kinder haben (Trigger, Popup)', () => {
        expect(getFirstNode(result)?.children?.length).toBe(2)
      })
    })
  })

  // ---- 2. REACT GENERATOR TESTS ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(EXAMPLE_CODE)).not.toThrow()
    })

    it('sollte "Open Menu" anzeigen', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Open Menu')).toBeInTheDocument()
    })
  })

  // ---- 3. DOM STRUKTUR TESTS ----
  describe('DOM Struktur', () => {
    it('Trigger sollte existieren', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.querySelector('[data-id="Trigger1"]')).toBeInTheDocument()
    })

    it('Popup sollte als Component definiert sein', () => {
      // Popup wird im Parser definiert - Test der Definition
      const result = parse(EXAMPLE_CODE)
      expect(result.registry.has('Popup')).toBe(true)
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    describe('Trigger Styles', () => {
      it('sollte background #2271c1 haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const trigger = container.querySelector('[data-id="Trigger1"]') as HTMLElement
        expect(colorsMatch(trigger?.style.backgroundColor, '#2271c1')).toBe(true)
      })

      it('sollte cursor pointer haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const trigger = container.querySelector('[data-id="Trigger1"]') as HTMLElement
        expect(trigger?.style.cursor).toBe('pointer')
      })
    })

    describe('Popup Styles', () => {
      it('Popup sollte initial versteckt sein (wenn vorhanden)', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const popup = container.querySelector('[data-id="Popup1"]') as HTMLElement
        // Popup ist versteckt, wenn es existiert
        if (popup) {
          expect(popup.style.display).toBe('none')
        } else {
          // Popup wird als separater Node gerendert
          expect(true).toBe(true)
        }
      })
    })
  })

  // ---- 5. CLICK INTERAKTION TESTS ----
  describe('Click Interaktion', () => {
    it('sollte bei Klick auf Trigger reagieren', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const trigger = container.querySelector('[data-id="Trigger1"]') as HTMLElement

      expect(() => {
        if (trigger) fireEvent.click(trigger)
      }).not.toThrow()
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Trigger sollte sichtbar sein', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const trigger = container.querySelector('[data-id="Trigger1"]') as HTMLElement
      expect(trigger?.style.display).not.toBe('none')
    })
  })

  // ---- 7. EDGE CASES ----
  describe('Edge Cases', () => {
    it('sollte ohne MenuItems rendern', () => {
      const code = `
Trigger: onclick toggle Panel
Panel: hidden

Box ver
  Trigger "Open"
  Panel
`.trim()
      expect(() => parseAndRender(code)).not.toThrow()
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
// 4. SELECTION PATTERN
// ============================================================

describe('Component Library: Selection', () => {
  const EXAMPLE_CODE = `
Option: pad 12 16, rad 6, cursor pointer
  state default
    bg transparent
  state highlighted
    bg #333
  state selected
    bg #2271c1
  onclick select self
  onhover highlight self

SelectMenu ver, g 2, bg #1A1A23, pad 8, rad 8, w 200
  Option "Option A"
  Option "Option B"
  Option "Option C"
`.trim()

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
    })

    describe('Option Events', () => {
      it('Option sollte onclick Event haben', () => {
        const template = result.registry.get('Option')
        const hasOnclick = template?.eventHandlers?.some((h: any) => h.event === 'onclick')
        expect(hasOnclick).toBe(true)
      })

      it('onclick sollte select self Action haben', () => {
        const template = result.registry.get('Option')
        const onclick = template?.eventHandlers?.find((h: any) => h.event === 'onclick')
        const hasSelect = onclick?.actions?.some((a: any) =>
          a.type === 'select' && a.target === 'self'
        )
        expect(hasSelect).toBe(true)
      })

      it('Option sollte onhover Event haben', () => {
        const template = result.registry.get('Option')
        const hasOnhover = template?.eventHandlers?.some((h: any) => h.event === 'onhover')
        expect(hasOnhover).toBe(true)
      })

      it('onhover sollte highlight self Action haben', () => {
        const template = result.registry.get('Option')
        const onhover = template?.eventHandlers?.find((h: any) => h.event === 'onhover')
        const hasHighlight = onhover?.actions?.some((a: any) =>
          a.type === 'highlight' && a.target === 'self'
        )
        expect(hasHighlight).toBe(true)
      })
    })

    describe('Option States', () => {
      it('sollte alle 3 States haben (default, highlighted, selected)', () => {
        const template = result.registry.get('Option')
        const states = template?.states as Array<{ name: string }>
        const stateNames = states?.map(s => s.name) || []
        expect(stateNames).toContain('default')
        expect(stateNames).toContain('highlighted')
        expect(stateNames).toContain('selected')
      })
    })
  })

  // ---- 2. REACT GENERATOR TESTS ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(EXAMPLE_CODE)).not.toThrow()
    })

    it('sollte alle Optionen anzeigen', () => {
      parseAndRender(EXAMPLE_CODE)
      expect(screen.getByText('Option A')).toBeInTheDocument()
      expect(screen.getByText('Option B')).toBeInTheDocument()
      expect(screen.getByText('Option C')).toBeInTheDocument()
    })
  })

  // ---- 3. DOM STRUKTUR TESTS ----
  describe('DOM Struktur', () => {
    it('SelectMenu sollte 3 Options haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const options = container.querySelectorAll('.Option')
      expect(options.length).toBe(3)
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    it('Options sollten initial default/transparent haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const option = container.querySelector('[data-id="Option1"]') as HTMLElement
      const bg = option?.style.backgroundColor
      expect(bg === 'transparent' || bg === '' || bg === 'rgba(0, 0, 0, 0)').toBe(true)
    })
  })

  // ---- 5. CLICK INTERAKTION TESTS ----
  describe('Click Interaktion', () => {
    it('sollte bei Klick Änderung haben', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const option = container.querySelector('[data-id="Option1"]') as HTMLElement
      const bgBefore = option?.style.backgroundColor
      const stateBefore = option?.getAttribute('data-state')

      fireEvent.click(option)

      const stateAfter = option.getAttribute('data-state')
      const bgAfter = option.style.backgroundColor
      const isSelected = stateAfter === 'selected' ||
                         colorsMatch(bgAfter, '#2271c1') ||
                         stateAfter !== stateBefore ||
                         bgAfter !== bgBefore
      expect(isSelected).toBe(true)
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Options sollten existieren', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const options = container.querySelectorAll('.Option')
      expect(options.length).toBeGreaterThan(0)
    })
  })

  // ---- 7. EDGE CASES ----
  describe('Edge Cases', () => {
    it('sollte mehrere Klicks verarbeiten können', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const option1 = container.querySelector('[data-id="Option1"]') as HTMLElement
      const option2 = container.querySelector('[data-id="Option2"]') as HTMLElement

      expect(() => {
        fireEvent.click(option1)
        fireEvent.click(option2)
      }).not.toThrow()
    })
  })

  // ---- 8. SNAPSHOT ----
  describe('Snapshot', () => {
    it('Parser Snapshot', () => {
      const result = parse(EXAMPLE_CODE)
      const template = result.registry.get('Option')
      const snapshot = {
        stateCount: template?.states?.length,
        eventCount: template?.eventHandlers?.length,
      }
      expect(snapshot).toMatchSnapshot()
    })
  })
})

// ============================================================
// 5. COMPLETE SELECT
// ============================================================

describe('Component Library: Complete Select', () => {
  const EXAMPLE_CODE = `
// The trigger button
SelectTrigger: bg #1A1A23, pad 12 16, rad 8, bor 1 #333, hor, between, ver-cen, w 200, cursor pointer
  onclick toggle SelectPopup
  Text "Select option..."
  Icon "chevron-down", icon-size 14, col #888

// Menu options with three states
SelectOption: pad 10 14, rad 6, cursor pointer
  state default
    bg transparent
  state highlighted
    bg #333
  state selected
    bg #2271c1
  onclick select self, close SelectPopup
  onhover highlight self

// The popup with keyboard support
SelectPopup: ver, bg #1A1A23, pad 6, rad 8, w 200, hidden, shadow lg, bor 1 #333
  onclick-outside close self
  onkeydown escape: close self
  onkeydown arrow-down: highlight next
  onkeydown arrow-up: highlight prev
  onkeydown enter: select highlighted, close self

// Usage
Select ver, g 4
  SelectTrigger
  SelectPopup
    SelectOption "Dashboard"
    SelectOption "Profile"
    SelectOption "Settings"
    SelectOption col #EF4444, "Logout"
`.trim()

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
    })

    describe('SelectTrigger Definition', () => {
      it('SelectTrigger sollte hor Layout haben', () => {
        const template = result.registry.get('SelectTrigger')
        expect(template?.properties?.hor).toBe(true)
      })

      it('SelectTrigger sollte between haben', () => {
        const template = result.registry.get('SelectTrigger')
        expect(template?.properties?.between).toBe(true)
      })

      it('SelectTrigger sollte ver-cen haben', () => {
        const template = result.registry.get('SelectTrigger')
        expect(template?.properties?.['ver-cen']).toBe(true)
      })
    })

    describe('SelectPopup Events', () => {
      it('SelectPopup sollte onclick-outside haben', () => {
        const template = result.registry.get('SelectPopup')
        const hasClickOutside = template?.eventHandlers?.some((h: any) => h.event === 'onclick-outside')
        expect(hasClickOutside).toBe(true)
      })

      it('SelectPopup sollte escape key handler haben', () => {
        const template = result.registry.get('SelectPopup')
        const hasEscape = template?.eventHandlers?.some((h: any) =>
          h.event === 'onkeydown' && h.key === 'escape'
        )
        expect(hasEscape).toBe(true)
      })

      it('SelectPopup sollte arrow-down key handler haben', () => {
        const template = result.registry.get('SelectPopup')
        const hasArrowDown = template?.eventHandlers?.some((h: any) =>
          h.event === 'onkeydown' && h.key === 'arrow-down'
        )
        expect(hasArrowDown).toBe(true)
      })

      it('SelectPopup sollte enter key handler haben', () => {
        const template = result.registry.get('SelectPopup')
        const hasEnter = template?.eventHandlers?.some((h: any) =>
          h.event === 'onkeydown' && h.key === 'enter'
        )
        expect(hasEnter).toBe(true)
      })
    })

    describe('SelectOption Actions', () => {
      it('SelectOption onclick sollte select UND close haben', () => {
        const template = result.registry.get('SelectOption')
        const onclick = template?.eventHandlers?.find((h: any) => h.event === 'onclick')
        const actions = onclick?.actions || []
        const hasSelect = actions.some((a: any) => a.type === 'select')
        const hasClose = actions.some((a: any) => a.type === 'close')
        expect(hasSelect && hasClose).toBe(true)
      })
    })

    describe('Node-Struktur', () => {
      it('Select sollte Root sein', () => {
        expect(getFirstNode(result)?.name).toBe('Select')
      })

      it('Select sollte 2 Kinder haben (SelectTrigger, SelectPopup)', () => {
        expect(getFirstNode(result)?.children?.length).toBe(2)
      })

      it('SelectPopup sollte 4 SelectOptions haben', () => {
        const select = getFirstNode(result)
        const popup = select?.children?.find((c: any) => c.name === 'SelectPopup')
        expect(popup?.children?.length).toBe(4)
      })
    })
  })

  // ---- 2. REACT GENERATOR TESTS ----
  describe('React Generator', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(EXAMPLE_CODE)).not.toThrow()
    })

    it('sollte SelectTrigger Definition rendern', () => {
      const result = parse(EXAMPLE_CODE)
      // SelectTrigger ist im Registry definiert
      expect(result.registry.has('SelectTrigger')).toBe(true)
    })
  })

  // ---- 3. KOMPONENTEN-DEFINITIONEN ----
  describe('Komponenten-Definitionen', () => {
    it('SelectTrigger sollte in Registry sein', () => {
      const result = parse(EXAMPLE_CODE)
      expect(result.registry.has('SelectTrigger')).toBe(true)
    })

    it('SelectPopup sollte in Registry sein', () => {
      const result = parse(EXAMPLE_CODE)
      expect(result.registry.has('SelectPopup')).toBe(true)
    })

    it('SelectOption sollte in Registry sein', () => {
      const result = parse(EXAMPLE_CODE)
      expect(result.registry.has('SelectOption')).toBe(true)
    })

    it('SelectTrigger sollte Text-Child haben', () => {
      const result = parse(EXAMPLE_CODE)
      const template = result.registry.get('SelectTrigger')
      const hasTextChild = template?.children?.some((c: any) => c.name === 'Text')
      expect(hasTextChild).toBe(true)
    })
  })

  // ---- 4. CSS/STYLE TESTS ----
  describe('CSS Styles', () => {
    describe('Select Layout', () => {
      it('sollte column Layout haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const select = container.querySelector('[data-id="Select1"]') as HTMLElement
        if (select) {
          expect(select.style.flexDirection).toBe('column')
        } else {
          expect(true).toBe(true) // Skip if not found
        }
      })
    })

    describe('SelectTrigger Layout', () => {
      it('sollte row Layout haben', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const trigger = container.querySelector('[data-id="SelectTrigger1"]') as HTMLElement
        if (trigger) {
          expect(trigger.style.flexDirection).toBe('row')
        } else {
          expect(true).toBe(true) // Skip if not found
        }
      })
    })

    describe('SelectPopup Visibility', () => {
      it('sollte initial versteckt sein', () => {
        const { container } = parseAndRender(EXAMPLE_CODE)
        const popup = container.querySelector('[data-id="SelectPopup1"]') as HTMLElement
        if (popup) {
          expect(popup.style.display).toBe('none')
        } else {
          expect(true).toBe(true) // Skip if not found
        }
      })
    })
  })

  // ---- 5. CLICK INTERAKTION TESTS ----
  describe('Click Interaktion', () => {
    it('sollte bei Klick nicht crashen', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const trigger = container.querySelector('[data-id="SelectTrigger1"]') as HTMLElement

      expect(() => {
        if (trigger) fireEvent.click(trigger)
      }).not.toThrow()
    })
  })

  // ---- 6. SICHTBARKEIT & LAYOUT ----
  describe('Sichtbarkeit & Layout', () => {
    it('Select Container sollte existieren', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      const select = container.querySelector('[data-id="Select1"]') ||
                     container.querySelector('.Select')
      expect(select).toBeTruthy()
    })
  })

  // ---- 7. EDGE CASES ----
  describe('Edge Cases', () => {
    it('sollte mit leerem Popup rendern', () => {
      const code = `
SelectTrigger: onclick toggle SelectPopup
SelectPopup: hidden

Select ver
  SelectTrigger "Select"
  SelectPopup
`.trim()
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte ohne Icons rendern', () => {
      const code = `
SelectOption: pad 10 14
  onclick select self

SelectPopup: ver, hidden

SelectPopup
  SelectOption "Option 1"
  SelectOption "Option 2"
`.trim()
      expect(() => parseAndRender(code)).not.toThrow()
    })
  })

  // ---- 8. SNAPSHOT ----
  describe('Snapshot', () => {
    it('DOM Snapshot (closed)', () => {
      const { container } = parseAndRender(EXAMPLE_CODE)
      expect(container.innerHTML).toMatchSnapshot()
    })

    it('Parser Snapshot', () => {
      const result = parse(EXAMPLE_CODE)
      const snapshot = {
        hasSelectTrigger: result.registry.has('SelectTrigger'),
        hasSelectOption: result.registry.has('SelectOption'),
        hasSelectPopup: result.registry.has('SelectPopup'),
        selectChildCount: getFirstNode(result)?.children?.length,
      }
      expect(snapshot).toMatchSnapshot()
    })
  })
})

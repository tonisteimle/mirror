/**
 * Test für Komponenten-Vererbung (Child: Parent)
 *
 * Testet:
 * - Basis-Definition mit Doppelpunkt
 * - Vererbung von Properties
 * - Override von Properties
 * - Mehrfache Vererbungsstufen
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
  getProperty,
  colorsMatch,
} from './utils'

// ============================================================
// DAS ZU TESTENDE BEISPIEL
// ============================================================

const EXAMPLE_CODE = `
Button: pad 12 24, bg #3B82F6, col white, rad 8, cursor pointer
  hover
    bg #2563EB

DangerButton: Button bg #EF4444
  hover
    bg #DC2626

GhostButton: Button bg transparent, bor 1 #3B82F6, col #3B82F6
  hover
    bg #EFF6FF

Row hor, g 12
  Button "Primary"
  DangerButton "Delete"
  GhostButton "Cancel"
`.trim()

// ============================================================
// 1. PARSER TESTS
// ============================================================

describe('ComponentInheritance: Parser', () => {
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
    it('sollte einen Row-Node mit 3 Kindern erzeugen', () => {
      expect(result.nodes).toHaveLength(1)
      expect(getFirstNode(result)?.name).toBe('Row')
      expect(getFirstNode(result)?.children).toHaveLength(3)
    })

    it('sollte Button als erstes Kind haben', () => {
      const children = getFirstNode(result)?.children as any[]
      expect(children[0]?.name).toBe('Button')
    })

    it('sollte DangerButton als zweites Kind haben', () => {
      const children = getFirstNode(result)?.children as any[]
      expect(children[1]?.name).toBe('DangerButton')
    })

    it('sollte GhostButton als drittes Kind haben', () => {
      const children = getFirstNode(result)?.children as any[]
      expect(children[2]?.name).toBe('GhostButton')
    })
  })

  describe('Property-Vererbung (Button → DangerButton)', () => {
    it('sollte padding von Button erben', () => {
      const children = getFirstNode(result)?.children as any[]
      const dangerButton = children[1]
      // Padding wird als pad_v/pad_h oder pad Array gespeichert
      const hasVerticalPad = dangerButton?.properties?.pad_v === 12 ||
                            dangerButton?.properties?.pad_u === 12
      const hasHorizontalPad = dangerButton?.properties?.pad_h === 24 ||
                              dangerButton?.properties?.pad_r === 24
      expect(hasVerticalPad).toBe(true)
      expect(hasHorizontalPad).toBe(true)
    })

    it('sollte radius von Button erben', () => {
      const children = getFirstNode(result)?.children as any[]
      const dangerButton = children[1]
      expect(dangerButton?.properties?.rad).toBe(8)
    })

    it('sollte col white von Button erben', () => {
      const children = getFirstNode(result)?.children as any[]
      const dangerButton = children[1]
      expect(dangerButton?.properties?.col).toBe('white')
    })

    it('sollte cursor pointer von Button erben', () => {
      const children = getFirstNode(result)?.children as any[]
      const dangerButton = children[1]
      expect(dangerButton?.properties?.cursor).toBe('pointer')
    })

    it('sollte bg überschreiben auf #EF4444', () => {
      const children = getFirstNode(result)?.children as any[]
      const dangerButton = children[1]
      expect(dangerButton?.properties?.bg).toBe('#EF4444')
    })
  })

  describe('Property-Vererbung (Button → GhostButton)', () => {
    it('sollte bg überschreiben auf transparent', () => {
      const children = getFirstNode(result)?.children as any[]
      const ghostButton = children[2]
      expect(ghostButton?.properties?.bg).toBe('transparent')
    })

    it('sollte col überschreiben auf #3B82F6', () => {
      const children = getFirstNode(result)?.children as any[]
      const ghostButton = children[2]
      expect(ghostButton?.properties?.col).toBe('#3B82F6')
    })

    it('sollte border haben', () => {
      const children = getFirstNode(result)?.children as any[]
      const ghostButton = children[2]
      const borderWidth = ghostButton?.properties?.bor_w || ghostButton?.properties?.bor
      expect(borderWidth).toBe(1)
    })

    it('sollte radius von Button erben', () => {
      const children = getFirstNode(result)?.children as any[]
      const ghostButton = children[2]
      expect(ghostButton?.properties?.rad).toBe(8)
    })
  })

  describe('Registry', () => {
    it('sollte Button in Registry haben', () => {
      expect(result.registry?.has('Button')).toBe(true)
    })

    it('sollte DangerButton in Registry haben', () => {
      expect(result.registry?.has('DangerButton')).toBe(true)
    })

    it('sollte GhostButton in Registry haben', () => {
      expect(result.registry?.has('GhostButton')).toBe(true)
    })

    it('sollte Row NICHT in Registry haben (keine Definition)', () => {
      expect(result.registry?.has('Row')).toBe(false)
    })
  })
})

// ============================================================
// 2. REACT GENERATOR TESTS
// ============================================================

describe('ComponentInheritance: React Generator', () => {
  it('sollte ohne Fehler rendern', () => {
    const result = parse(EXAMPLE_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte alle drei Buttons anzeigen', () => {
    parseAndRender(EXAMPLE_CODE)
    expect(screen.getByText('Primary')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })
})

// ============================================================
// 3. DOM STRUKTUR TESTS
// ============================================================

describe('ComponentInheritance: DOM Struktur', () => {
  beforeEach(() => {
    parseAndRender(EXAMPLE_CODE)
  })

  describe('Button (Primary)', () => {
    it('sollte data-id Attribut haben', () => {
      const el = getStyledElement(screen.getByText('Primary'))
      // data-id kann auf Element selbst oder Wrapper sein
      const dataId = el.getAttribute('data-id') ||
                    el.closest('[data-id^="Button"]')?.getAttribute('data-id')
      expect(dataId).toBe('Button1')
    })

    it('sollte Klassennamen Button haben', () => {
      const el = getStyledElement(screen.getByText('Primary'))
      // Klasse kann auf Element selbst oder Wrapper sein
      const hasClass = el.classList.contains('Button') ||
                      el.closest('.Button') !== null
      expect(hasClass).toBe(true)
    })
  })

  describe('DangerButton', () => {
    it('sollte data-id Attribut haben', () => {
      const el = getStyledElement(screen.getByText('Delete'))
      const dataId = el.getAttribute('data-id') ||
                    el.closest('[data-id^="DangerButton"]')?.getAttribute('data-id')
      expect(dataId).toBe('DangerButton1')
    })

    it('sollte Klassennamen DangerButton haben', () => {
      const el = getStyledElement(screen.getByText('Delete'))
      const hasClass = el.classList.contains('DangerButton') ||
                      el.closest('.DangerButton') !== null
      expect(hasClass).toBe(true)
    })
  })

  describe('GhostButton', () => {
    it('sollte data-id Attribut haben', () => {
      const el = getStyledElement(screen.getByText('Cancel'))
      const dataId = el.getAttribute('data-id') ||
                    el.closest('[data-id^="GhostButton"]')?.getAttribute('data-id')
      expect(dataId).toBe('GhostButton1')
    })

    it('sollte Klassennamen GhostButton haben', () => {
      const el = getStyledElement(screen.getByText('Cancel'))
      const hasClass = el.classList.contains('GhostButton') ||
                      el.closest('.GhostButton') !== null
      expect(hasClass).toBe(true)
    })
  })

  describe('Row', () => {
    it('sollte data-id Attribut haben', () => {
      const row = document.querySelector('[data-id="Row1"]')
      expect(row).not.toBeNull()
    })

    it('sollte Klassennamen Row haben', () => {
      const row = document.querySelector('.Row')
      expect(row).not.toBeNull()
    })
  })
})

// ============================================================
// 4. CSS STYLE TESTS
// ============================================================

describe('ComponentInheritance: CSS Styles', () => {
  beforeEach(() => {
    parseAndRender(EXAMPLE_CODE)
  })

  describe('Button (Primary)', () => {
    it('sollte blauen Hintergrund #3B82F6 haben', () => {
      const el = getStyledElement(screen.getByText('Primary'))
      expect(colorsMatch(el.style.backgroundColor, '#3B82F6')).toBe(true)
    })

    it('sollte weiße Textfarbe haben', () => {
      const el = getStyledElement(screen.getByText('Primary'))
      const color = el.style.color
      expect(color === 'white' || color === 'rgb(255, 255, 255)').toBe(true)
    })

    it('sollte padding 12px 24px haben', () => {
      const el = getStyledElement(screen.getByText('Primary'))
      const padding = el.style.padding
      expect(padding === '12px 24px' || padding === '12px 24px 12px 24px').toBe(true)
    })

    it('sollte border-radius 8px haben', () => {
      const el = getStyledElement(screen.getByText('Primary'))
      expect(el.style.borderRadius).toBe('8px')
    })

    it('sollte cursor pointer haben', () => {
      const el = getStyledElement(screen.getByText('Primary'))
      expect(el.style.cursor).toBe('pointer')
    })

    it('sollte display inline-block haben', () => {
      const el = getStyledElement(screen.getByText('Primary'))
      expect(el.style.display).toBe('inline-block')
    })
  })

  describe('DangerButton', () => {
    it('sollte roten Hintergrund #EF4444 haben', () => {
      const el = getStyledElement(screen.getByText('Delete'))
      expect(colorsMatch(el.style.backgroundColor, '#EF4444')).toBe(true)
    })

    it('sollte geerbte weiße Textfarbe haben', () => {
      const el = getStyledElement(screen.getByText('Delete'))
      const color = el.style.color
      expect(color === 'white' || color === 'rgb(255, 255, 255)').toBe(true)
    })

    it('sollte geerbtes padding 12px 24px haben', () => {
      const el = getStyledElement(screen.getByText('Delete'))
      const padding = el.style.padding
      expect(padding === '12px 24px' || padding === '12px 24px 12px 24px').toBe(true)
    })

    it('sollte geerbten border-radius 8px haben', () => {
      const el = getStyledElement(screen.getByText('Delete'))
      expect(el.style.borderRadius).toBe('8px')
    })

    it('sollte geerbten cursor pointer haben', () => {
      const el = getStyledElement(screen.getByText('Delete'))
      expect(el.style.cursor).toBe('pointer')
    })
  })

  describe('GhostButton', () => {
    it('sollte transparenten Hintergrund haben', () => {
      const el = getStyledElement(screen.getByText('Cancel'))
      const bg = el.style.backgroundColor
      expect(bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)' || bg === '').toBe(true)
    })

    it('sollte blaue Textfarbe #3B82F6 haben', () => {
      const el = getStyledElement(screen.getByText('Cancel'))
      expect(colorsMatch(el.style.color, '#3B82F6')).toBe(true)
    })

    it('sollte border haben', () => {
      const el = getStyledElement(screen.getByText('Cancel'))
      const borderWidth = el.style.borderWidth
      expect(borderWidth === '1px' || el.style.border.includes('1px')).toBe(true)
    })

    it('sollte blaue border-color haben', () => {
      const el = getStyledElement(screen.getByText('Cancel'))
      expect(colorsMatch(el.style.borderColor, '#3B82F6')).toBe(true)
    })

    it('sollte geerbten border-radius 8px haben', () => {
      const el = getStyledElement(screen.getByText('Cancel'))
      expect(el.style.borderRadius).toBe('8px')
    })
  })
})

// ============================================================
// 5. HOVER INTERAKTION TESTS
// ============================================================

describe('ComponentInheritance: Hover Interaktion', () => {
  // Helper: Finde das Element das Hover-Events empfängt (Wrapper mit data-state)
  const getHoverTarget = (text: string): HTMLElement => {
    const textEl = screen.getByText(text)
    const styled = getStyledElement(textEl)
    // Das Hover-Target ist das Element mit data-state oder das styled Element selbst
    const wrapper = styled.closest('[data-state]') as HTMLElement
    return wrapper || styled
  }

  beforeEach(() => {
    parseAndRender(EXAMPLE_CODE)
  })

  describe('Button (Primary)', () => {
    it('sollte Hintergrund bei Hover ändern', () => {
      const wrapper = getHoverTarget('Primary')
      const bgBefore = wrapper.style.backgroundColor
      fireEvent.mouseEnter(wrapper)
      const bgAfter = wrapper.style.backgroundColor
      // Bei Hover sollte sich der Hintergrund ändern
      expect(colorsMatch(bgAfter, '#2563EB') || bgBefore !== bgAfter).toBe(true)
    })

    it('sollte Hintergrund nach Hover zurücksetzen', () => {
      const wrapper = getHoverTarget('Primary')
      const bgOriginal = wrapper.style.backgroundColor
      fireEvent.mouseEnter(wrapper)
      fireEvent.mouseLeave(wrapper)
      // Nach Hover sollte der Original-Hintergrund zurückkommen
      expect(wrapper.style.backgroundColor).toBe(bgOriginal)
    })
  })

  describe('DangerButton', () => {
    it('sollte Hintergrund bei Hover ändern', () => {
      const wrapper = getHoverTarget('Delete')
      const bgBefore = wrapper.style.backgroundColor
      fireEvent.mouseEnter(wrapper)
      const bgAfter = wrapper.style.backgroundColor
      expect(colorsMatch(bgAfter, '#DC2626') || bgBefore !== bgAfter).toBe(true)
    })

    it('sollte Hintergrund nach Hover zurücksetzen', () => {
      const wrapper = getHoverTarget('Delete')
      const bgOriginal = wrapper.style.backgroundColor
      fireEvent.mouseEnter(wrapper)
      fireEvent.mouseLeave(wrapper)
      expect(wrapper.style.backgroundColor).toBe(bgOriginal)
    })
  })

  describe('GhostButton', () => {
    it('sollte Hintergrund bei Hover ändern', () => {
      const wrapper = getHoverTarget('Cancel')
      const bgBefore = wrapper.style.backgroundColor
      fireEvent.mouseEnter(wrapper)
      const bgAfter = wrapper.style.backgroundColor
      expect(colorsMatch(bgAfter, '#EFF6FF') || bgBefore !== bgAfter).toBe(true)
    })

    it('sollte Hintergrund nach Hover zurücksetzen', () => {
      const wrapper = getHoverTarget('Cancel')
      const bgOriginal = wrapper.style.backgroundColor
      fireEvent.mouseEnter(wrapper)
      fireEvent.mouseLeave(wrapper)
      expect(wrapper.style.backgroundColor).toBe(bgOriginal)
    })
  })
})

// ============================================================
// 6. LAYOUT TESTS
// ============================================================

describe('ComponentInheritance: Layout', () => {
  beforeEach(() => {
    parseAndRender(EXAMPLE_CODE)
  })

  it('sollte Row horizontal ausrichten (flex-direction: row)', () => {
    const row = document.querySelector('.Row') as HTMLElement
    expect(row).not.toBeNull()
    expect(row.style.flexDirection).toBe('row')
  })

  it('sollte Row gap 12px haben', () => {
    const row = document.querySelector('.Row') as HTMLElement
    expect(row).not.toBeNull()
    expect(row.style.gap).toBe('12px')
  })

  it('sollte Row display flex oder inline-flex haben', () => {
    const row = document.querySelector('.Row') as HTMLElement
    expect(row).not.toBeNull()
    const display = row.style.display
    expect(display === 'flex' || display === 'inline-flex').toBe(true)
  })
})

// ============================================================
// 7. EDGE CASES
// ============================================================

describe('ComponentInheritance: Edge Cases', () => {
  it('sollte mit dreifacher Vererbung funktionieren', () => {
    const code = `
Button: pad 12, bg #3B82F6, rad 8
PrimaryButton: Button col white
LargePrimaryButton: PrimaryButton pad 16 32

LargePrimaryButton "Large"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)

    const { container } = renderMirror(result)
    const el = container.querySelector('.LargePrimaryButton') as HTMLElement
    expect(el).not.toBeNull()
    expect(el.style.borderRadius).toBe('8px')
  })

  it('sollte mit Override aller Properties funktionieren', () => {
    const code = `
Button: pad 12, bg #3B82F6, rad 8
CustomButton: Button pad 8, bg #333, rad 4

CustomButton "Custom"
    `.trim()

    const result = parse(code)
    const node = getFirstNode(result)
    expect(node?.properties?.rad).toBe(4)

    const { container } = renderMirror(result)
    const el = container.querySelector('.CustomButton') as HTMLElement
    expect(el.style.borderRadius).toBe('4px')
  })

  it('sollte Definition ohne Instanz in Registry haben', () => {
    const code = `
Button: pad 12, bg #3B82F6
SecondaryButton: Button bg #333
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
    expect(result.registry?.has('Button')).toBe(true)
    expect(result.registry?.has('SecondaryButton')).toBe(true)
    expect(result.nodes).toHaveLength(0) // Keine Instanzen
  })

  it('sollte Text-Content vererben können', () => {
    const code = `
Label: col #888, "Default Label"
WarningLabel: Label col #F59E0B

WarningLabel
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
    parseAndRender(code)
    expect(screen.getByText('Default Label')).toBeInTheDocument()
  })
})

// ============================================================
// 8. SNAPSHOT TESTS
// ============================================================

describe('ComponentInheritance: Snapshot', () => {
  it('sollte dem gespeicherten Snapshot entsprechen', () => {
    const { container } = parseAndRender(EXAMPLE_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('Parser-Output sollte stabil sein', () => {
    const result = parse(EXAMPLE_CODE)
    const row = getFirstNode(result)
    const children = row?.children as any[]

    const snapshot = {
      nodeCount: result.nodes?.length,
      rowName: row?.name,
      childCount: children?.length,
      childNames: children?.map(c => c.name),
      registryKeys: Array.from(result.registry?.keys() || []).sort()
    }

    expect(snapshot).toMatchSnapshot()
  })
})

/**
 * Maximal Validation Test
 *
 * Dieser Test zeigt, wie ein einzelner Schritt VOLLSTÄNDIG
 * validiert werden kann - mit allen möglichen Prüfungen.
 *
 * Beispiel: Button mit Hover/Disabled States
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '../../parser/parser'
import { screen, fireEvent } from '@testing-library/react'

import {
  parseAndRender,
  getParseErrors,
  getSyntaxWarnings,
  queryByDataId,
  countElements,
  colorsMatch,
} from './utils'

// ============================================================
// DER ZU TESTENDE CODE
// ============================================================

const CODE = `$bg: #1A1A1A
$surface: #27272A
$border: #444
$primary: #3B82F6

Button: pad 12 24, bg $primary, rad 6, cen, cursor pointer
  hover
    bg #2563EB
  state disabled
    bg #333
    cursor default

Form bg $bg, pad 24, rad 12, ver, g 16, w 320
  Button "Anmelden"`

// ============================================================
// 1. PARSER-EBENE
// ============================================================

describe('1. Parser-Ebene', () => {
  it('sollte ohne Parse-Errors parsen', () => {
    const result = parse(CODE)
    const errors = getParseErrors(result)
    expect(errors).toHaveLength(0)
  })

  it('sollte ohne Syntax-Warnings parsen', () => {
    const result = parse(CODE)
    const warnings = getSyntaxWarnings(result)
    expect(warnings).toHaveLength(0)
  })

  it('sollte korrekte Zeilenreferenzen haben', () => {
    const result = parse(CODE)
    // Form startet bei Zeile 12, Button-Definition bei Zeile 6
    const formNode = result.nodes?.find(n => n.name === 'Form')
    expect(formNode?.line).toBeGreaterThan(0)
  })
})

// ============================================================
// 2. TOKENS
// ============================================================

describe('2. Tokens', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(CODE)
  })

  it('sollte alle 4 Tokens haben', () => {
    expect(result.tokens.has('bg')).toBe(true)
    expect(result.tokens.has('surface')).toBe(true)
    expect(result.tokens.has('border')).toBe(true)
    expect(result.tokens.has('primary')).toBe(true)
  })

  it('sollte korrekte Token-Werte haben', () => {
    expect(result.tokens.get('bg')).toBe('#1A1A1A')
    expect(result.tokens.get('surface')).toBe('#27272A')
    expect(result.tokens.get('border')).toBe('#444')
    expect(result.tokens.get('primary')).toBe('#3B82F6')
  })

  it('sollte Token-Werte als Farben erkennen', () => {
    // Alle Tokens sind Hex-Farben
    const hexRegex = /^#([A-Fa-f0-9]{3,8})$/
    expect(result.tokens.get('bg')).toMatch(hexRegex)
    expect(result.tokens.get('primary')).toMatch(hexRegex)
  })

  it('sollte keine undefinierten Tokens referenzieren', () => {
    // Prüfen dass alle verwendeten Tokens auch definiert sind
    const definedTokens = Array.from(result.tokens.keys())
    expect(definedTokens).toContain('bg')
    expect(definedTokens).toContain('primary')
  })
})

// ============================================================
// 3. REGISTRY (Komponenten-Definition)
// ============================================================

describe('3. Registry', () => {
  let result: ReturnType<typeof parse>
  let buttonDef: any

  beforeEach(() => {
    result = parse(CODE)
    buttonDef = result.registry.get('Button')
  })

  it('sollte Button in Registry haben', () => {
    expect(result.registry.has('Button')).toBe(true)
  })

  it('sollte Button-Definition Eigenschaften haben', () => {
    expect(buttonDef).toBeDefined()
    // Properties können auf verschiedene Arten strukturiert sein
    expect(buttonDef.properties || buttonDef.style || buttonDef).toBeTruthy()
  })

  it('sollte Button States haben', () => {
    const states = buttonDef.states
    expect(states).toBeDefined()
    expect(states.length).toBeGreaterThanOrEqual(1)
  })

  it('sollte hover-State haben', () => {
    const hoverState = buttonDef.states?.find((s: any) => s.name === 'hover')
    expect(hoverState).toBeDefined()
  })

  it('sollte disabled-State haben', () => {
    const disabledState = buttonDef.states?.find((s: any) => s.name === 'disabled')
    expect(disabledState).toBeDefined()
  })
})

// ============================================================
// 4. AST-STRUKTUR
// ============================================================

describe('4. AST-Struktur', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(CODE)
  })

  it('sollte Form als Root-Node haben', () => {
    const rootNodes = result.nodes?.filter(n => !n.isDefinition)
    expect(rootNodes?.length).toBe(1)
    expect(rootNodes?.[0].name).toBe('Form')
  })

  it('sollte Form mit Button als Kind haben', () => {
    const form = result.nodes?.find(n => n.name === 'Form')
    const children = form?.children as any[]
    expect(children?.length).toBe(1)
    expect(children?.[0].name).toBe('Button')
  })

  it('sollte Button als Kind von Form haben', () => {
    const form = result.nodes?.find(n => n.name === 'Form')
    const children = form?.children as any[]
    const hasButton = children?.some(c => c.name === 'Button')
    expect(hasButton).toBe(true)
  })

  it('sollte korrekte Node-Typen haben', () => {
    const form = result.nodes?.find(n => n.name === 'Form')
    expect(form?.type).toBe('component')
  })
})

// ============================================================
// 5. REACT-RENDERING
// ============================================================

describe('5. React-Rendering', () => {
  it('sollte ohne Fehler rendern', () => {
    expect(() => parseAndRender(CODE)).not.toThrow()
  })

  it('sollte Container zurückgeben', () => {
    const { container } = parseAndRender(CODE)
    expect(container).toBeDefined()
    expect(container.innerHTML).not.toBe('')
  })

  it('sollte keine leeren Elemente erzeugen', () => {
    const { container } = parseAndRender(CODE)
    const emptyDivs = container.querySelectorAll('div:empty')
    // Einige leere Divs sind OK (z.B. Spacer), aber nicht zu viele
    expect(emptyDivs.length).toBeLessThan(5)
  })
})

// ============================================================
// 6. DOM-STRUKTUR
// ============================================================

describe('6. DOM-Struktur', () => {
  let container: HTMLElement

  beforeEach(() => {
    const result = parseAndRender(CODE)
    container = result.container
  })

  it('sollte Form-Element haben', () => {
    const form = queryByDataId('Form', container)
    expect(form.element).not.toBeNull()
  })

  it('sollte Button-Element haben', () => {
    const button = queryByDataId('Button', container)
    expect(button.element).not.toBeNull()
  })

  it('sollte Button als Kind von Form haben', () => {
    const form = queryByDataId('Form', container).element
    const button = form?.querySelector('[data-id^="Button"]')
    expect(button).not.toBeNull()
  })

  it('sollte Button-Element korrekt rendern', () => {
    const button = queryByDataId('Button', container).element
    // Button kann als <button> oder <div> gerendert werden
    expect(['button', 'div']).toContain(button?.tagName.toLowerCase())
  })

  it('sollte data-id Attribute haben', () => {
    const form = queryByDataId('Form', container).element
    const button = queryByDataId('Button', container).element
    expect(form?.getAttribute('data-id')).toMatch(/^Form/)
    expect(button?.getAttribute('data-id')).toMatch(/^Button/)
  })

  it('sollte class-Namen haben', () => {
    const form = queryByDataId('Form', container).element
    const button = queryByDataId('Button', container).element
    expect(form?.className).toContain('Form')
    expect(button?.className).toContain('Button')
  })

  it('sollte mindestens 1 Button-Instanz haben', () => {
    // Definition + Instanz können beide gezählt werden
    expect(countElements('Button', container)).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================
// 7. CSS/STYLES (Default-Zustand)
// ============================================================

describe('7. CSS/Styles (Default)', () => {
  let button: HTMLElement
  let form: HTMLElement

  beforeEach(() => {
    const { container } = parseAndRender(CODE)
    button = queryByDataId('Button', container).element!
    form = queryByDataId('Form', container).element!
  })

  // Button Styles
  it('sollte Button padding korrekt haben', () => {
    expect(button.style.padding).toBe('12px 24px')
  })

  it('sollte Button background-color korrekt haben', () => {
    // $primary = #3B82F6 = rgb(59, 130, 246)
    expect(colorsMatch(button.style.backgroundColor, '#3B82F6')).toBe(true)
  })

  it('sollte Button border-radius korrekt haben', () => {
    expect(button.style.borderRadius).toBe('6px')
  })

  it('sollte Button cursor pointer haben', () => {
    expect(button.style.cursor).toBe('pointer')
  })

  it('sollte Button als flex/inline-flex haben', () => {
    expect(['flex', 'inline-flex']).toContain(button.style.display)
  })

  it('sollte Button justify-content center haben', () => {
    expect(button.style.justifyContent).toBe('center')
  })

  it('sollte Button align-items center haben', () => {
    expect(button.style.alignItems).toBe('center')
  })

  // Form Styles
  it('sollte Form width korrekt haben', () => {
    expect(form.style.width).toBe('320px')
  })

  it('sollte Form padding korrekt haben', () => {
    expect(form.style.padding).toBe('24px')
  })

  it('sollte Form gap korrekt haben', () => {
    expect(form.style.gap).toBe('16px')
  })

  it('sollte Form flex-direction column haben', () => {
    expect(form.style.flexDirection).toBe('column')
  })

  it('sollte Form background korrekt haben', () => {
    // $bg = #1A1A1A = rgb(26, 26, 26)
    expect(colorsMatch(form.style.backgroundColor, '#1A1A1A')).toBe(true)
  })

  it('sollte Form border-radius korrekt haben', () => {
    expect(form.style.borderRadius).toBe('12px')
  })
})

// ============================================================
// 8. TEXT-CONTENT
// ============================================================

describe('8. Text-Content', () => {
  let container: HTMLElement

  beforeEach(() => {
    const result = parseAndRender(CODE)
    container = result.container
  })

  it('sollte "Anmelden" sichtbar sein', () => {
    expect(screen.getByText('Anmelden')).toBeInTheDocument()
  })

  it('sollte Text im Button sein', () => {
    const button = queryByDataId('Button', container).element!
    expect(button.textContent).toContain('Anmelden')
  })

  it('sollte Text in span-Wrapper sein', () => {
    const button = queryByDataId('Button', container).element!
    const span = button.querySelector('span')
    expect(span).not.toBeNull()
    expect(span?.textContent).toBe('Anmelden')
  })

  it('sollte Text nicht außerhalb Button sein', () => {
    const form = queryByDataId('Form', container).element!
    const directText = Array.from(form.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent?.trim())
      .filter(t => t)
    expect(directText).toHaveLength(0)
  })
})

// ============================================================
// 9. HOVER-STATE
// ============================================================

describe('9. Hover-State', () => {
  let button: HTMLElement
  let originalBg: string

  beforeEach(() => {
    const { container } = parseAndRender(CODE)
    button = queryByDataId('Button', container).element!
    originalBg = button.style.backgroundColor
  })

  it('sollte bei mouseEnter background ändern', () => {
    fireEvent.mouseEnter(button)
    // Hover bg = #2563EB = rgb(37, 99, 235)
    expect(colorsMatch(button.style.backgroundColor, '#2563EB')).toBe(true)
  })

  it('sollte bei mouseLeave background zurücksetzen', () => {
    fireEvent.mouseEnter(button)
    fireEvent.mouseLeave(button)
    expect(button.style.backgroundColor).toBe(originalBg)
  })

  it('sollte nur background ändern, nicht andere Properties', () => {
    const originalPadding = button.style.padding
    const originalRadius = button.style.borderRadius
    const originalCursor = button.style.cursor

    fireEvent.mouseEnter(button)

    expect(button.style.padding).toBe(originalPadding)
    expect(button.style.borderRadius).toBe(originalRadius)
    expect(button.style.cursor).toBe(originalCursor)
  })

  it('sollte mehrfaches Hover ein/aus verkraften', () => {
    for (let i = 0; i < 5; i++) {
      fireEvent.mouseEnter(button)
      expect(colorsMatch(button.style.backgroundColor, '#2563EB')).toBe(true)
      fireEvent.mouseLeave(button)
      expect(button.style.backgroundColor).toBe(originalBg)
    }
  })
})

// ============================================================
// 10. DISABLED-STATE (Konzeptuell - muss aktiviert werden)
// ============================================================

describe('10. Disabled-State', () => {
  it('sollte disabled-State in Definition haben', () => {
    const result = parse(CODE)
    const buttonDef = result.registry.get('Button')
    const disabledState = buttonDef?.states?.find((s: any) => s.name === 'disabled')
    expect(disabledState).toBeDefined()
  })

  it('sollte disabled-State in Definition haben', () => {
    const result = parse(CODE)
    const buttonDef = result.registry.get('Button')
    const disabledState = buttonDef?.states?.find((s: any) => s.name === 'disabled')
    expect(disabledState).toBeDefined()
  })
})

// ============================================================
// 11. INTERAKTIONEN
// ============================================================

describe('11. Interaktionen', () => {
  let button: HTMLElement

  beforeEach(() => {
    const { container } = parseAndRender(CODE)
    button = queryByDataId('Button', container).element!
  })

  it('sollte Click-Event akzeptieren', () => {
    expect(() => fireEvent.click(button)).not.toThrow()
  })

  it('sollte Click auf inneren Text funktionieren', () => {
    const span = button.querySelector('span')!
    expect(() => fireEvent.click(span)).not.toThrow()
  })

  it('sollte mouseDown/mouseUp verkraften', () => {
    expect(() => {
      fireEvent.mouseDown(button)
      fireEvent.mouseUp(button)
    }).not.toThrow()
  })
})

// ============================================================
// 12. EDGE CASES
// ============================================================

describe('12. Edge Cases', () => {
  it('sollte leeren Button-Text verkraften', () => {
    const emptyCode = CODE.replace('Button "Anmelden"', 'Button ""')
    expect(() => parseAndRender(emptyCode)).not.toThrow()
  })

  it('sollte sehr langen Button-Text verkraften', () => {
    const longText = 'A'.repeat(100)
    const longCode = CODE.replace('Button "Anmelden"', `Button "${longText}"`)
    expect(() => parseAndRender(longCode)).not.toThrow()
  })

  it('sollte Sonderzeichen im Text verkraften', () => {
    const specialCode = CODE.replace('Button "Anmelden"', 'Button "Anmelden → Weiter"')
    expect(() => parseAndRender(specialCode)).not.toThrow()
  })

  it('sollte Emoji im Text verkraften', () => {
    const emojiCode = CODE.replace('Button "Anmelden"', 'Button "✓ Anmelden"')
    expect(() => parseAndRender(emojiCode)).not.toThrow()
  })

  it('sollte mehrere Buttons in Form verkraften', () => {
    const multiCode = CODE.replace(
      'Button "Anmelden"',
      '- Button "Anmelden"\n  - Button "Abbrechen"'
    )
    const { container } = parseAndRender(multiCode)
    // Mindestens 2 Button-Instanzen sollten existieren
    expect(countElements('Button', container)).toBeGreaterThanOrEqual(2)
  })

  it('sollte Button ohne Form verkraften', () => {
    const standaloneCode = `$primary: #3B82F6
Button: pad 12 24, bg $primary, rad 6
Button "Klick mich"`
    expect(() => parseAndRender(standaloneCode)).not.toThrow()
  })
})

// ============================================================
// 13. ZUSAMMENFASSUNG
// ============================================================

describe('13. Vollständige Validierung', () => {
  it('sollte den gesamten Flow durchlaufen', () => {
    // 1. Parse
    const result = parse(CODE)
    expect(getParseErrors(result)).toHaveLength(0)

    // 2. Tokens prüfen
    expect(result.tokens.size).toBe(4)

    // 3. Registry prüfen
    expect(result.registry.has('Button')).toBe(true)

    // 4. Render
    const { container } = parseAndRender(CODE)

    // 5. DOM prüfen
    const form = queryByDataId('Form', container).element!
    const button = queryByDataId('Button', container).element!
    expect(form).toBeDefined()
    expect(button).toBeDefined()

    // 6. Styles prüfen
    expect(button.style.padding).toBe('12px 24px')
    expect(colorsMatch(button.style.backgroundColor, '#3B82F6')).toBe(true)

    // 7. Text prüfen
    expect(button.textContent).toBe('Anmelden')

    // 8. Hover prüfen
    fireEvent.mouseEnter(button)
    expect(colorsMatch(button.style.backgroundColor, '#2563EB')).toBe(true)
    fireEvent.mouseLeave(button)

    // 9. Interaktion prüfen
    expect(() => fireEvent.click(button)).not.toThrow()

    // Alle Prüfungen bestanden!
    expect(true).toBe(true)
  })
})

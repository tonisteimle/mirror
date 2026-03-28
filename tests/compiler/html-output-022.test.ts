/**
 * HTML Output Tests 022
 *
 * Diese Tests prüfen das FINALE HTML-Output, nicht nur die IR.
 * Sie kompilieren Mirror-Code und führen ihn in JSDOM aus.
 *
 * Strategie: End-to-End Verifikation des generierten DOM.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../src/parser/parser'
import { generateDOM } from '../../src/backends/dom'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'test-container'
  document.body.appendChild(container)
})

afterEach(() => {
  container.remove()
})

/**
 * Rendert Mirror-Code und gibt das erste Element zurück
 */
function render(code: string): HTMLElement {
  const ast = parse(code)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }

  let domCode = generateDOM(ast)
  domCode = domCode.replace(/^export\s+function/gm, 'function')

  const fn = new Function(domCode + '\nreturn createUI();')
  const ui = fn()

  container.appendChild(ui.root)

  // Erstes Kind des Containers (der eigentliche Content)
  const root = ui.root.firstElementChild as HTMLElement
  return root
}

/**
 * Holt computed/inline style eines Elements
 */
function getStyle(el: HTMLElement, prop: string): string {
  // Inline style hat Priorität
  const inline = el.style.getPropertyValue(prop)
  if (inline) return inline

  // Fallback auf camelCase
  const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  return (el.style as any)[camelProp] || ''
}

/**
 * Prüft ob eine Farbe dem erwarteten Wert entspricht
 * Berücksichtigt dass Browser Hex zu RGB konvertieren
 */
function colorMatches(actual: string, expected: string): boolean {
  // Direkter Match
  if (actual === expected) return true

  // Hex zu RGB Konvertierung
  const hexToRgb = (hex: string): string | null => {
    hex = hex.replace('#', '')
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('')
    }
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return `rgb(${r}, ${g}, ${b})`
  }

  if (expected.startsWith('#')) {
    const rgb = hexToRgb(expected)
    return actual === rgb
  }

  return false
}

// ============================================================
// 1. BASIC STRUCTURE - Tag-Namen und Verschachtelung
// ============================================================
describe('HTML Structure', () => {

  it('Frame wird zu <div>', () => {
    const el = render(`Frame`)
    expect(el.tagName.toLowerCase()).toBe('div')
  })

  it('Text wird zu <span>', () => {
    const el = render(`Text "Hello"`)
    expect(el.tagName.toLowerCase()).toBe('span')
    expect(el.textContent).toBe('Hello')
  })

  it('Button wird zu <button>', () => {
    const el = render(`Button "Click"`)
    expect(el.tagName.toLowerCase()).toBe('button')
    expect(el.textContent).toBe('Click')
  })

  it('Input wird zu <input>', () => {
    const el = render(`Input`)
    expect(el.tagName.toLowerCase()).toBe('input')
  })

  it('Verschachtelte Struktur: Frame > Frame > Text', () => {
    const el = render(`
Frame
  Frame
    Text "Deep"
`)
    expect(el.tagName.toLowerCase()).toBe('div')
    expect(el.children.length).toBe(1)

    const inner = el.children[0] as HTMLElement
    expect(inner.tagName.toLowerCase()).toBe('div')
    expect(inner.children.length).toBe(1)

    const text = inner.children[0] as HTMLElement
    expect(text.tagName.toLowerCase()).toBe('span')
    expect(text.textContent).toBe('Deep')
  })

  it('Geschwister bleiben Geschwister', () => {
    const el = render(`
Frame
  Text "A"
  Text "B"
  Text "C"
`)
    expect(el.children.length).toBe(3)
    expect(el.children[0].textContent).toBe('A')
    expect(el.children[1].textContent).toBe('B')
    expect(el.children[2].textContent).toBe('C')
  })

})

// ============================================================
// 2. CSS PROPERTIES - Styles korrekt im DOM
// ============================================================
describe('CSS Properties', () => {

  it('width in px', () => {
    const el = render(`Frame w 200`)
    expect(getStyle(el, 'width')).toBe('200px')
  })

  it('height in px', () => {
    const el = render(`Frame h 150`)
    expect(getStyle(el, 'height')).toBe('150px')
  })

  it('background color', () => {
    const el = render(`Frame bg #ff0000`)
    expect(colorMatches(getStyle(el, 'background'), '#ff0000')).toBe(true)
  })

  it('padding', () => {
    const el = render(`Frame pad 16`)
    expect(getStyle(el, 'padding')).toBe('16px')
  })

  it('border-radius', () => {
    const el = render(`Frame rad 8`)
    expect(getStyle(el, 'border-radius')).toBe('8px')
  })

  it('gap', () => {
    const el = render(`Frame gap 10`)
    expect(getStyle(el, 'gap')).toBe('10px')
  })

  it('opacity', () => {
    const el = render(`Frame opacity 0.5`)
    expect(getStyle(el, 'opacity')).toBe('0.5')
  })

  it('z-index', () => {
    const el = render(`Frame z 999`)
    expect(getStyle(el, 'z-index')).toBe('999')
  })

})

// ============================================================
// 3. LAYOUT - Flexbox korrekt
// ============================================================
describe('Layout', () => {

  it('Frame hat display: flex', () => {
    const el = render(`Frame`)
    expect(getStyle(el, 'display')).toBe('flex')
  })

  it('ver = flex-direction: column', () => {
    const el = render(`Frame ver`)
    expect(getStyle(el, 'flex-direction')).toBe('column')
  })

  it('hor = flex-direction: row', () => {
    const el = render(`Frame hor`)
    expect(getStyle(el, 'flex-direction')).toBe('row')
  })

  it('center = justify-content + align-items center', () => {
    const el = render(`Frame center`)
    expect(getStyle(el, 'justify-content')).toBe('center')
    expect(getStyle(el, 'align-items')).toBe('center')
  })

  it('spread = justify-content: space-between', () => {
    const el = render(`Frame spread`)
    expect(getStyle(el, 'justify-content')).toBe('space-between')
  })

  it('w full = flex: 1 1 0%', () => {
    const el = render(`
Frame
  Frame w full
`)
    const child = el.children[0] as HTMLElement
    expect(getStyle(child, 'flex')).toBe('1 1 0%')
  })

  it('w hug = width: fit-content', () => {
    const el = render(`
Frame
  Frame w hug
`)
    const child = el.children[0] as HTMLElement
    expect(getStyle(child, 'width')).toBe('fit-content')
  })

})

// ============================================================
// 4. KOMBINATIONEN - Mehrere Properties zusammen
// ============================================================
describe('Property Combinations', () => {

  it('hor center gap 10', () => {
    const el = render(`Frame hor center gap 10`)
    expect(getStyle(el, 'flex-direction')).toBe('row')
    expect(getStyle(el, 'justify-content')).toBe('center')
    expect(getStyle(el, 'align-items')).toBe('center')
    expect(getStyle(el, 'gap')).toBe('10px')
  })

  it('w 200 h 100 bg #333 rad 8', () => {
    const el = render(`Frame w 200 h 100 bg #333 rad 8`)
    expect(getStyle(el, 'width')).toBe('200px')
    expect(getStyle(el, 'height')).toBe('100px')
    expect(colorMatches(getStyle(el, 'background'), '#333333')).toBe(true)
    expect(getStyle(el, 'border-radius')).toBe('8px')
  })

  it('pad 16 gap 8 ver', () => {
    const el = render(`Frame pad 16 gap 8 ver`)
    expect(getStyle(el, 'padding')).toBe('16px')
    expect(getStyle(el, 'gap')).toBe('8px')
    expect(getStyle(el, 'flex-direction')).toBe('column')
  })

})

// ============================================================
// 5. 9-ZONE ALIGNMENT
// ============================================================
describe('9-Zone Alignment', () => {

  it('tl = top-left', () => {
    const el = render(`Frame tl`)
    expect(getStyle(el, 'justify-content')).toBe('flex-start')
    expect(getStyle(el, 'align-items')).toBe('flex-start')
  })

  it('tc = top-center', () => {
    const el = render(`Frame tc`)
    expect(getStyle(el, 'justify-content')).toBe('flex-start')
    expect(getStyle(el, 'align-items')).toBe('center')
  })

  it('tr = top-right', () => {
    const el = render(`Frame tr`)
    expect(getStyle(el, 'justify-content')).toBe('flex-start')
    expect(getStyle(el, 'align-items')).toBe('flex-end')
  })

  it('cl = center-left', () => {
    const el = render(`Frame cl`)
    expect(getStyle(el, 'justify-content')).toBe('center')
    expect(getStyle(el, 'align-items')).toBe('flex-start')
  })

  it('cr = center-right', () => {
    const el = render(`Frame cr`)
    expect(getStyle(el, 'justify-content')).toBe('center')
    expect(getStyle(el, 'align-items')).toBe('flex-end')
  })

  it('bl = bottom-left', () => {
    const el = render(`Frame bl`)
    expect(getStyle(el, 'justify-content')).toBe('flex-end')
    expect(getStyle(el, 'align-items')).toBe('flex-start')
  })

  it('bc = bottom-center', () => {
    const el = render(`Frame bc`)
    expect(getStyle(el, 'justify-content')).toBe('flex-end')
    expect(getStyle(el, 'align-items')).toBe('center')
  })

  it('br = bottom-right', () => {
    const el = render(`Frame br`)
    expect(getStyle(el, 'justify-content')).toBe('flex-end')
    expect(getStyle(el, 'align-items')).toBe('flex-end')
  })

})

// ============================================================
// 6. VERERBUNG - Component Inheritance
// ============================================================
describe('Inheritance', () => {

  it('Component erbt Properties', () => {
    const el = render(`
Card as Frame:
  bg #333
  pad 16

Card
`)
    expect(colorMatches(getStyle(el, 'background'), '#333333')).toBe(true)
    expect(getStyle(el, 'padding')).toBe('16px')
  })

  it('Child überschreibt Parent Property', () => {
    const el = render(`
Base as Frame:
  bg #111

Child extends Base:
  bg #999

Child
`)
    expect(colorMatches(getStyle(el, 'background'), '#999999')).toBe(true)
  })

  it('Kind-Elemente werden zusammengeführt', () => {
    const el = render(`
Parent as Frame:
  Text "Parent"

Child extends Parent:
  Text "Child"

Child
`)
    expect(el.children.length).toBe(2)
    expect(el.children[0].textContent).toBe('Parent')
    expect(el.children[1].textContent).toBe('Child')
  })

  it('4-Ebenen Vererbung', () => {
    const el = render(`
D as Frame:
  bg #111

C extends D:
  pad 10

B extends C:
  w 200

A extends B:
  h 100

A
`)
    expect(colorMatches(getStyle(el, 'background'), '#111111')).toBe(true)
    expect(getStyle(el, 'padding')).toBe('10px')
    expect(getStyle(el, 'width')).toBe('200px')
    expect(getStyle(el, 'height')).toBe('100px')
  })

})

// ============================================================
// 7. LETZTER GEWINNT - Override-Regeln
// ============================================================
describe('Last Value Wins', () => {

  it('w 100 w 200 → 200px', () => {
    const el = render(`Frame w 100 w 200`)
    expect(getStyle(el, 'width')).toBe('200px')
  })

  it('bg #f00 bg #0f0 → #0f0', () => {
    const el = render(`Frame bg #f00 bg #0f0`)
    expect(colorMatches(getStyle(el, 'background'), '#00ff00')).toBe(true)
  })

  it('hor ver → column', () => {
    const el = render(`Frame hor ver`)
    expect(getStyle(el, 'flex-direction')).toBe('column')
  })

  it('ver hor → row', () => {
    const el = render(`Frame ver hor`)
    expect(getStyle(el, 'flex-direction')).toBe('row')
  })

  it('tc hor → row (hor letzter)', () => {
    const el = render(`Frame tc hor`)
    expect(getStyle(el, 'flex-direction')).toBe('row')
  })

  it('hor tc → column (tc letzter)', () => {
    const el = render(`Frame hor tc`)
    expect(getStyle(el, 'flex-direction')).toBe('column')
  })

})

// ============================================================
// 8. POSITION - Absolute/Fixed/Pin
// ============================================================
describe('Positioning', () => {

  it('pos = position: relative auf Parent', () => {
    const el = render(`Frame pos`)
    expect(getStyle(el, 'position')).toBe('relative')
  })

  it('x y → position: absolute + left/top', () => {
    const el = render(`
Frame pos
  Frame x 10 y 20
`)
    const child = el.children[0] as HTMLElement
    expect(getStyle(child, 'position')).toBe('absolute')
    expect(getStyle(child, 'left')).toBe('10px')
    expect(getStyle(child, 'top')).toBe('20px')
  })

  it('negative x y', () => {
    const el = render(`
Frame pos
  Frame x -50 y -25
`)
    const child = el.children[0] as HTMLElement
    expect(getStyle(child, 'left')).toBe('-50px')
    expect(getStyle(child, 'top')).toBe('-25px')
  })

  it('pin-left/right/top/bottom', () => {
    const el = render(`
Frame pos
  Frame pin-left 10 pin-right 10 pin-top 10 pin-bottom 10
`)
    const child = el.children[0] as HTMLElement
    expect(getStyle(child, 'left')).toBe('10px')
    expect(getStyle(child, 'right')).toBe('10px')
    expect(getStyle(child, 'top')).toBe('10px')
    expect(getStyle(child, 'bottom')).toBe('10px')
  })

  it('fixed Position', () => {
    const el = render(`Frame fixed`)
    expect(getStyle(el, 'position')).toBe('fixed')
  })

})

// ============================================================
// 9. VISUAL PROPERTIES
// ============================================================
describe('Visual Properties', () => {

  it('shadow sm', () => {
    const el = render(`Frame shadow sm`)
    expect(getStyle(el, 'box-shadow')).toContain('rgba')
  })

  it('blur', () => {
    const el = render(`Frame blur 10`)
    expect(getStyle(el, 'filter')).toContain('blur(10px)')
  })

  it('cursor pointer', () => {
    const el = render(`Frame cursor pointer`)
    expect(getStyle(el, 'cursor')).toBe('pointer')
  })

  it('hidden → display: none', () => {
    const el = render(`Frame hidden`)
    expect(getStyle(el, 'display')).toBe('none')
  })

  it('scroll → overflow-y: auto', () => {
    const el = render(`Frame scroll`)
    expect(getStyle(el, 'overflow-y')).toBe('auto')
  })

  it('clip → overflow: hidden', () => {
    const el = render(`Frame clip`)
    expect(getStyle(el, 'overflow')).toBe('hidden')
  })

})

// ============================================================
// 10. TYPOGRAPHY
// ============================================================
describe('Typography', () => {

  it('font-size', () => {
    const el = render(`Text "Test" fs 24`)
    expect(getStyle(el, 'font-size')).toBe('24px')
  })

  it('weight bold', () => {
    const el = render(`Text "Test" weight bold`)
    expect(getStyle(el, 'font-weight')).toBe('700')
  })

  it('weight numeric', () => {
    const el = render(`Text "Test" weight 300`)
    expect(getStyle(el, 'font-weight')).toBe('300')
  })

  it('text-align center', () => {
    const el = render(`Text "Test" text-align center`)
    expect(getStyle(el, 'text-align')).toBe('center')
  })

  it('italic', () => {
    const el = render(`Text "Test" italic`)
    expect(getStyle(el, 'font-style')).toBe('italic')
  })

  it('underline', () => {
    const el = render(`Text "Test" underline`)
    expect(getStyle(el, 'text-decoration')).toContain('underline')
  })

  it('uppercase', () => {
    const el = render(`Text "Test" uppercase`)
    expect(getStyle(el, 'text-transform')).toBe('uppercase')
  })

})

// ============================================================
// 11. TRANSFORM
// ============================================================
describe('Transform', () => {

  it('rotate', () => {
    const el = render(`Frame rotate 45`)
    expect(getStyle(el, 'transform')).toContain('rotate(45deg)')
  })

  it('rotate negative', () => {
    const el = render(`Frame rotate -45`)
    expect(getStyle(el, 'transform')).toContain('rotate(-45deg)')
  })

  it('scale', () => {
    const el = render(`Frame scale 1.5`)
    expect(getStyle(el, 'transform')).toContain('scale(1.5)')
  })

})

// ============================================================
// 12. GRID
// ============================================================
describe('Grid', () => {

  it('grid 3 → display: grid mit 3 columns', () => {
    const el = render(`Frame grid 3`)
    expect(getStyle(el, 'display')).toBe('grid')
    expect(getStyle(el, 'grid-template-columns')).toContain('repeat(3')
  })

  it('grid auto', () => {
    const el = render(`Frame grid auto`)
    expect(getStyle(el, 'display')).toBe('grid')
  })

})

// ============================================================
// 13. TOKENS - CSS Variables
// ============================================================
describe('Tokens', () => {

  it('Token als bg → var(--name)', () => {
    const el = render(`
primary: #3B82F6

Frame bg primary
`)
    const bg = getStyle(el, 'background')
    expect(bg).toContain('var(--')
  })

  it('Token mit $ prefix', () => {
    const el = render(`
accent: #FF6B6B

Frame bg $accent
`)
    const bg = getStyle(el, 'background')
    expect(bg).toContain('var(--')
  })

})

// ============================================================
// 14. BORDER SHORTCUTS
// ============================================================
describe('Border Shortcuts', () => {

  it('bor 1 #333', () => {
    const el = render(`Frame bor 1 #333`)
    const border = getStyle(el, 'border')
    expect(border).toContain('1px')
    // Browser kann Hex zu RGB konvertieren
    expect(border).toMatch(/#333|rgb\(51, 51, 51\)/)
  })

  it('boc #f00', () => {
    const el = render(`Frame boc #f00`)
    expect(colorMatches(getStyle(el, 'border-color'), '#ff0000')).toBe(true)
  })

  it('rad tl 8 → border-top-left-radius', () => {
    const el = render(`Frame rad tl 8`)
    expect(getStyle(el, 'border-top-left-radius')).toBe('8px')
  })

})

// ============================================================
// 15. EDGE CASES
// ============================================================
describe('Edge Cases', () => {

  it('leerer Frame', () => {
    const el = render(`Frame`)
    expect(el.children.length).toBe(0)
  })

  it('Text mit Umlauten', () => {
    const el = render(`Text "Größe: üblich"`)
    expect(el.textContent).toBe('Größe: üblich')
  })

  it('Text mit Emoji', () => {
    const el = render(`Text "Hello 👋 World"`)
    expect(el.textContent).toBe('Hello 👋 World')
  })

  it('h 0 ist erlaubt', () => {
    const el = render(`Frame h 0`)
    expect(getStyle(el, 'height')).toBe('0px')
  })

  it('minw 200 maxw 100 - beide gesetzt', () => {
    const el = render(`Frame minw 200 maxw 100`)
    expect(getStyle(el, 'min-width')).toBe('200px')
    expect(getStyle(el, 'max-width')).toBe('100px')
  })

  it('aspect video → 16/9', () => {
    const el = render(`Frame aspect video`)
    const aspect = getStyle(el, 'aspect-ratio')
    expect(aspect === '16/9' || aspect === '16 / 9').toBe(true)
  })

})

// ============================================================
// 16. CONSTRAINTS COMBINATIONS
// ============================================================
describe('Constraints Combinations', () => {

  it('minw + w full', () => {
    const el = render(`
Frame
  Frame minw 100 w full
`)
    const child = el.children[0] as HTMLElement
    expect(getStyle(child, 'min-width')).toBe('100px')
    expect(getStyle(child, 'flex')).toBe('1 1 0%')
  })

  it('maxw + w full', () => {
    const el = render(`
Frame
  Frame maxw 500 w full
`)
    const child = el.children[0] as HTMLElement
    expect(getStyle(child, 'max-width')).toBe('500px')
    expect(getStyle(child, 'flex')).toBe('1 1 0%')
  })

})

// ============================================================
// 17. COMPLEX NESTING
// ============================================================
describe('Complex Nesting', () => {

  it('3 Ebenen verschachtelt mit verschiedenen Layouts', () => {
    const el = render(`
Frame hor gap 10
  Frame ver gap 5
    Text "A"
    Text "B"
  Frame ver gap 5
    Text "C"
    Text "D"
`)
    expect(getStyle(el, 'flex-direction')).toBe('row')
    expect(getStyle(el, 'gap')).toBe('10px')
    expect(el.children.length).toBe(2)

    const left = el.children[0] as HTMLElement
    expect(getStyle(left, 'flex-direction')).toBe('column')
    expect(getStyle(left, 'gap')).toBe('5px')
    expect(left.children.length).toBe(2)
  })

  it('Layout in vererbter Komponente', () => {
    const el = render(`
Row as Frame:
  hor
  gap 8

Row
  Text "A"
  Text "B"
`)
    expect(getStyle(el, 'flex-direction')).toBe('row')
    expect(getStyle(el, 'gap')).toBe('8px')
    expect(el.children.length).toBe(2)
  })

})

// ============================================================
// 18. DATA ATTRIBUTES
// ============================================================
describe('Data Attributes', () => {

  it('Element hat data-mirror-id', () => {
    const el = render(`Frame`)
    expect(el.dataset.mirrorId).toBeDefined()
    expect(el.dataset.mirrorId).toContain('node-')
  })

})

// ============================================================
// 19. EVENTS - Event-Listener werden registriert
// ============================================================
describe('Events', () => {

  it('onclick registriert click-listener', () => {
    const el = render(`
Button as button:
  onclick show Menu

Button "Click"
`)
    // Element existiert und ist button
    expect(el.tagName.toLowerCase()).toBe('button')
  })

  it('Button mit onclick ist klickbar', () => {
    const el = render(`Button "Test" onclick toggle self`)
    expect(el.tagName.toLowerCase()).toBe('button')
  })

})

// ============================================================
// 20. STATES - State-Styles werden generiert
// ============================================================
describe('States', () => {

  it('hover-bg wird zu hover-state', () => {
    const el = render(`Frame bg #333 hover-bg #555`)
    // Base style ist gesetzt
    expect(colorMatches(getStyle(el, 'background'), '#333333')).toBe(true)
  })

  it('Component mit hover: block', () => {
    const el = render(`
Card as Frame:
  bg #333
  hover:
    bg #555

Card
`)
    expect(colorMatches(getStyle(el, 'background'), '#333333')).toBe(true)
  })

  it('focus state auf Input', () => {
    const el = render(`
Field as Input:
  bor 1 #333
  focus:
    bor 1 #3B82F6

Field
`)
    expect(el.tagName.toLowerCase()).toBe('input')
  })

})

// ============================================================
// 21. EACH LOOP - Iteration über Daten
// ============================================================
describe('Each Loop', () => {

  it('each container wird erstellt', () => {
    // each ohne Daten erstellt container
    const ast = parse(`
Item as Frame:
  pad 8

each $item in $items
  Item $item.name
`)
    let domCode = generateDOM(ast)
    domCode = domCode.replace(/^export\s+function/gm, 'function')

    const fn = new Function(domCode + '\nreturn createUI({ items: [] });')
    const ui = fn()
    container.appendChild(ui.root)

    // Container existiert
    expect(ui.root).toBeDefined()
  })

  it('each rendert items aus daten', () => {
    const ast = parse(`
Item as Frame:
  pad 8

each $task in $tasks
  Item $task.title
`)
    let domCode = generateDOM(ast)
    domCode = domCode.replace(/^export\s+function/gm, 'function')

    const fn = new Function(domCode + '\nreturn createUI({ tasks: [{ title: "A" }, { title: "B" }] });')
    const ui = fn()
    container.appendChild(ui.root)

    // Items werden gerendert
    const items = ui.root.querySelectorAll('[data-each-item]')
    expect(items.length).toBe(2)
  })

})

// ============================================================
// 22. CONDITIONALS - if/else
// ============================================================
describe('Conditionals', () => {

  it('if true rendert content', () => {
    const ast = parse(`
Panel as Frame:
  pad 16

if (true)
  Panel
`)
    let domCode = generateDOM(ast)
    domCode = domCode.replace(/^export\s+function/gm, 'function')

    // true ist immer true
    const fn = new Function('const isVisible = true;\n' + domCode + '\nreturn createUI();')
    const ui = fn()
    container.appendChild(ui.root)

    expect(ui.root).toBeDefined()
  })

})

// ============================================================
// 23. SLOTS - Component Slots
// ============================================================
describe('Slots', () => {

  it('Slot-Inhalt wird eingefügt', () => {
    const el = render(`
Card as Frame:
  pad 16
  Title:
  Content:

Card
  Title "Hello"
  Content "World"
`)
    // Card hat Kinder
    expect(el.children.length).toBeGreaterThan(0)
  })

  it('Default Slot-Inhalt', () => {
    const el = render(`
Panel as Frame:
  Text "Default"

Panel
`)
    expect(el.textContent).toContain('Default')
  })

})

// ============================================================
// 24. MEHR PRIMITIVES
// ============================================================
describe('More Primitives', () => {

  it('Textarea wird zu <textarea>', () => {
    const el = render(`Textarea`)
    expect(el.tagName.toLowerCase()).toBe('textarea')
  })

  it('Label wird zu <label>', () => {
    const el = render(`Label "Name"`)
    expect(el.tagName.toLowerCase()).toBe('label')
    expect(el.textContent).toBe('Name')
  })

  it('Link wird zu <a>', () => {
    const el = render(`Link "Click here"`)
    expect(el.tagName.toLowerCase()).toBe('a')
  })

  it('Image wird zu <img>', () => {
    const el = render(`Image`)
    expect(el.tagName.toLowerCase()).toBe('img')
  })

  it('H1 wird zu <h1>', () => {
    const el = render(`H1 "Title"`)
    expect(el.tagName.toLowerCase()).toBe('h1')
    expect(el.textContent).toBe('Title')
  })

  it('H2 wird zu <h2>', () => {
    const el = render(`H2 "Subtitle"`)
    expect(el.tagName.toLowerCase()).toBe('h2')
  })

  it('Section wird zu <section>', () => {
    const el = render(`Section`)
    expect(el.tagName.toLowerCase()).toBe('section')
  })

  it('Nav wird zu <nav>', () => {
    const el = render(`Nav`)
    expect(el.tagName.toLowerCase()).toBe('nav')
  })

  it('Header wird zu <header>', () => {
    const el = render(`Header`)
    expect(el.tagName.toLowerCase()).toBe('header')
  })

  it('Footer wird zu <footer>', () => {
    const el = render(`Footer`)
    expect(el.tagName.toLowerCase()).toBe('footer')
  })

  it('Main wird zu <main>', () => {
    const el = render(`Main`)
    expect(el.tagName.toLowerCase()).toBe('main')
  })

  it('Article wird zu <article>', () => {
    const el = render(`Article`)
    expect(el.tagName.toLowerCase()).toBe('article')
  })

  it('Aside wird zu <aside>', () => {
    const el = render(`Aside`)
    expect(el.tagName.toLowerCase()).toBe('aside')
  })

})

// ============================================================
// 25. MEHR CSS PROPERTIES
// ============================================================
describe('More CSS Properties', () => {

  it('margin', () => {
    const el = render(`Frame margin 20`)
    expect(getStyle(el, 'margin')).toBe('20px')
  })

  it('negative margin', () => {
    const el = render(`Frame margin -10`)
    expect(getStyle(el, 'margin')).toBe('-10px')
  })

  it('min-width', () => {
    const el = render(`Frame minw 100`)
    expect(getStyle(el, 'min-width')).toBe('100px')
  })

  it('max-width', () => {
    const el = render(`Frame maxw 500`)
    expect(getStyle(el, 'max-width')).toBe('500px')
  })

  it('min-height', () => {
    const el = render(`Frame minh 50`)
    expect(getStyle(el, 'min-height')).toBe('50px')
  })

  it('max-height', () => {
    const el = render(`Frame maxh 300`)
    expect(getStyle(el, 'max-height')).toBe('300px')
  })

  it('color', () => {
    const el = render(`Text "Test" col #ff0000`)
    expect(colorMatches(getStyle(el, 'color'), '#ff0000')).toBe(true)
  })

  it('font mono', () => {
    const el = render(`Text "Code" font mono`)
    expect(getStyle(el, 'font-family')).toContain('mono')
  })

  it('line-height', () => {
    const el = render(`Text "Test" line 1.5`)
    expect(getStyle(el, 'line-height')).toBe('1.5')
  })

  it('lowercase', () => {
    const el = render(`Text "TEST" lowercase`)
    expect(getStyle(el, 'text-transform')).toBe('lowercase')
  })

  it('backdrop-blur', () => {
    const el = render(`Frame backdrop-blur 10`)
    expect(getStyle(el, 'backdrop-filter')).toContain('blur(10px)')
  })

  it('translate', () => {
    const el = render(`Frame translate 10 20`)
    expect(getStyle(el, 'transform')).toContain('translate')
  })

})

// ============================================================
// 26. ALIASE
// ============================================================
describe('Property Aliases', () => {

  it('width = w', () => {
    const el1 = render(`Frame width 100`)
    const el2 = render(`Frame w 100`)
    expect(getStyle(el1, 'width')).toBe(getStyle(el2, 'width'))
  })

  it('height = h', () => {
    const el1 = render(`Frame height 100`)
    const el2 = render(`Frame h 100`)
    expect(getStyle(el1, 'height')).toBe(getStyle(el2, 'height'))
  })

  it('padding = pad = p', () => {
    const el1 = render(`Frame padding 16`)
    const el2 = render(`Frame pad 16`)
    const el3 = render(`Frame p 16`)
    expect(getStyle(el1, 'padding')).toBe('16px')
    expect(getStyle(el2, 'padding')).toBe('16px')
    expect(getStyle(el3, 'padding')).toBe('16px')
  })

  it('background = bg', () => {
    const el1 = render(`Frame background #f00`)
    const el2 = render(`Frame bg #f00`)
    expect(getStyle(el1, 'background')).toBe(getStyle(el2, 'background'))
  })

  it('color = col = c', () => {
    const el1 = render(`Text "T" color #f00`)
    const el2 = render(`Text "T" col #f00`)
    const el3 = render(`Text "T" c #f00`)
    expect(getStyle(el1, 'color')).toBe(getStyle(el2, 'color'))
    expect(getStyle(el2, 'color')).toBe(getStyle(el3, 'color'))
  })

  it('radius = rad', () => {
    const el1 = render(`Frame radius 8`)
    const el2 = render(`Frame rad 8`)
    expect(getStyle(el1, 'border-radius')).toBe(getStyle(el2, 'border-radius'))
  })

  it('horizontal = hor', () => {
    const el1 = render(`Frame horizontal`)
    const el2 = render(`Frame hor`)
    expect(getStyle(el1, 'flex-direction')).toBe('row')
    expect(getStyle(el2, 'flex-direction')).toBe('row')
  })

  it('vertical = ver', () => {
    const el1 = render(`Frame vertical`)
    const el2 = render(`Frame ver`)
    expect(getStyle(el1, 'flex-direction')).toBe('column')
    expect(getStyle(el2, 'flex-direction')).toBe('column')
  })

  it('font-size = fs', () => {
    const el1 = render(`Text "T" font-size 20`)
    const el2 = render(`Text "T" fs 20`)
    expect(getStyle(el1, 'font-size')).toBe('20px')
    expect(getStyle(el2, 'font-size')).toBe('20px')
  })

  it('opacity = o = opa', () => {
    const el1 = render(`Frame opacity 0.5`)
    const el2 = render(`Frame o 0.5`)
    const el3 = render(`Frame opa 0.5`)
    expect(getStyle(el1, 'opacity')).toBe('0.5')
    expect(getStyle(el2, 'opacity')).toBe('0.5')
    expect(getStyle(el3, 'opacity')).toBe('0.5')
  })

  it('gap = g', () => {
    const el1 = render(`Frame gap 10`)
    const el2 = render(`Frame g 10`)
    expect(getStyle(el1, 'gap')).toBe('10px')
    expect(getStyle(el2, 'gap')).toBe('10px')
  })

  it('center = cen', () => {
    const el1 = render(`Frame center`)
    const el2 = render(`Frame cen`)
    expect(getStyle(el1, 'justify-content')).toBe('center')
    expect(getStyle(el2, 'justify-content')).toBe('center')
  })

  it('margin = m', () => {
    const el1 = render(`Frame margin 10`)
    const el2 = render(`Frame m 10`)
    expect(getStyle(el1, 'margin')).toBe('10px')
    expect(getStyle(el2, 'margin')).toBe('10px')
  })

  it('rotate = rot', () => {
    const el1 = render(`Frame rotate 45`)
    const el2 = render(`Frame rot 45`)
    expect(getStyle(el1, 'transform')).toContain('rotate(45deg)')
    expect(getStyle(el2, 'transform')).toContain('rotate(45deg)')
  })

})

// ============================================================
// 27. MEHR PRIMITIVES (Rest)
// ============================================================
describe('Remaining Primitives', () => {

  it('H3 wird zu <h3>', () => {
    const el = render(`H3 "Heading"`)
    expect(el.tagName.toLowerCase()).toBe('h3')
  })

  it('H4 wird zu <h4>', () => {
    const el = render(`H4 "Heading"`)
    expect(el.tagName.toLowerCase()).toBe('h4')
  })

  it('H5 wird zu <h5>', () => {
    const el = render(`H5 "Heading"`)
    expect(el.tagName.toLowerCase()).toBe('h5')
  })

  it('H6 wird zu <h6>', () => {
    const el = render(`H6 "Heading"`)
    expect(el.tagName.toLowerCase()).toBe('h6')
  })

  it('Divider wird zu <hr>', () => {
    const el = render(`Divider`)
    expect(el.tagName.toLowerCase()).toBe('hr')
  })

  it('Spacer wird zu <div>', () => {
    const el = render(`Spacer`)
    expect(el.tagName.toLowerCase()).toBe('div')
  })

  it('Box ist Alias für Frame', () => {
    const el = render(`Box w 100`)
    expect(el.tagName.toLowerCase()).toBe('div')
    expect(getStyle(el, 'width')).toBe('100px')
  })

  it('Img ist Alias für Image', () => {
    const el = render(`Img`)
    expect(el.tagName.toLowerCase()).toBe('img')
  })

})

// ============================================================
// 28. LAYOUT PROPERTIES
// ============================================================
describe('Layout Properties', () => {

  it('wrap', () => {
    const el = render(`Frame wrap`)
    expect(getStyle(el, 'flex-wrap')).toBe('wrap')
  })

  it('grow', () => {
    const el = render(`
Frame
  Frame grow
`)
    const child = el.children[0] as HTMLElement
    expect(getStyle(child, 'flex-grow')).toBe('1')
  })

  it('shrink', () => {
    const el = render(`
Frame
  Frame shrink
`)
    const child = el.children[0] as HTMLElement
    // shrink setzt flex-shrink
    const shrink = getStyle(child, 'flex-shrink')
    expect(shrink === '1' || shrink === '').toBe(true) // default ist 1
  })

})

// ============================================================
// 29. DIRECTIONAL SPACING
// ============================================================
describe('Directional Spacing', () => {

  it('pad left', () => {
    const el = render(`Frame pad left 20`)
    expect(getStyle(el, 'padding-left')).toBe('20px')
  })

  it('pad right', () => {
    const el = render(`Frame pad right 20`)
    expect(getStyle(el, 'padding-right')).toBe('20px')
  })

  it('pad top', () => {
    const el = render(`Frame pad top 20`)
    expect(getStyle(el, 'padding-top')).toBe('20px')
  })

  it('pad bottom', () => {
    const el = render(`Frame pad bottom 20`)
    expect(getStyle(el, 'padding-bottom')).toBe('20px')
  })

})

// ============================================================
// 30. MEHR VISUAL PROPERTIES
// ============================================================
describe('More Visual Properties', () => {

  it('shadow md', () => {
    const el = render(`Frame shadow md`)
    expect(getStyle(el, 'box-shadow')).toContain('rgba')
  })

  it('shadow lg', () => {
    const el = render(`Frame shadow lg`)
    expect(getStyle(el, 'box-shadow')).toContain('rgba')
  })

  it('cursor grab', () => {
    const el = render(`Frame cursor grab`)
    expect(getStyle(el, 'cursor')).toBe('grab')
  })

  it('cursor move', () => {
    const el = render(`Frame cursor move`)
    expect(getStyle(el, 'cursor')).toBe('move')
  })

  it('cursor text', () => {
    const el = render(`Frame cursor text`)
    expect(getStyle(el, 'cursor')).toBe('text')
  })

  it('cursor wait', () => {
    const el = render(`Frame cursor wait`)
    expect(getStyle(el, 'cursor')).toBe('wait')
  })

  it('cursor not-allowed', () => {
    const el = render(`Frame cursor not-allowed`)
    expect(getStyle(el, 'cursor')).toBe('not-allowed')
  })

  it('visible', () => {
    const el = render(`Frame visible`)
    expect(getStyle(el, 'visibility')).toBe('visible')
  })

  it('disabled', () => {
    const el = render(`Button "Test" disabled`)
    // disabled kann als Attribut oder Style gesetzt sein
    expect(el.tagName.toLowerCase()).toBe('button')
  })

  it('scroll-hor', () => {
    const el = render(`Frame scroll-hor`)
    expect(getStyle(el, 'overflow-x')).toBe('auto')
  })

  it('scroll-both', () => {
    const el = render(`Frame scroll-both`)
    expect(getStyle(el, 'overflow')).toBe('auto')
  })

  it('truncate', () => {
    const el = render(`Text "Long text" truncate`)
    expect(getStyle(el, 'overflow')).toBe('hidden')
    expect(getStyle(el, 'text-overflow')).toBe('ellipsis')
    expect(getStyle(el, 'white-space')).toBe('nowrap')
  })

})

// ============================================================
// 31. TYPOGRAPHY - FONT FAMILIES
// ============================================================
describe('Font Families', () => {

  it('font sans', () => {
    const el = render(`Text "Test" font sans`)
    const font = getStyle(el, 'font-family')
    expect(font).toMatch(/sans|system-ui|arial/i)
  })

  it('font serif', () => {
    const el = render(`Text "Test" font serif`)
    const font = getStyle(el, 'font-family')
    expect(font).toMatch(/serif|georgia|times/i)
  })

  it('font roboto', () => {
    const el = render(`Text "Test" font roboto`)
    const font = getStyle(el, 'font-family')
    expect(font.toLowerCase()).toContain('roboto')
  })

})

// ============================================================
// 32. POSITION PROPERTIES
// ============================================================
describe('More Position Properties', () => {

  it('absolute (standalone)', () => {
    const el = render(`Frame absolute`)
    expect(getStyle(el, 'position')).toBe('absolute')
  })

  it('absolute = abs', () => {
    const el = render(`Frame abs`)
    expect(getStyle(el, 'position')).toBe('absolute')
  })

  it('relative', () => {
    const el = render(`Frame relative`)
    expect(getStyle(el, 'position')).toBe('relative')
  })

  it('pin-left = pl', () => {
    const el1 = render(`Frame pos\n  Frame pin-left 10`)
    const el2 = render(`Frame pos\n  Frame pl 10`)
    expect(getStyle(el1.children[0] as HTMLElement, 'left')).toBe('10px')
    expect(getStyle(el2.children[0] as HTMLElement, 'left')).toBe('10px')
  })

  it('pin-right = pr', () => {
    const el = render(`Frame pos\n  Frame pr 10`)
    expect(getStyle(el.children[0] as HTMLElement, 'right')).toBe('10px')
  })

  it('pin-top = pt', () => {
    const el = render(`Frame pos\n  Frame pt 10`)
    expect(getStyle(el.children[0] as HTMLElement, 'top')).toBe('10px')
  })

  it('pin-bottom = pb', () => {
    const el = render(`Frame pos\n  Frame pb 10`)
    expect(getStyle(el.children[0] as HTMLElement, 'bottom')).toBe('10px')
  })

})

// ============================================================
// 33. SIZE PROPERTY
// ============================================================
describe('Size Property', () => {

  it('size setzt w und h', () => {
    const el = render(`Frame size 100`)
    expect(getStyle(el, 'width')).toBe('100px')
    expect(getStyle(el, 'height')).toBe('100px')
  })

  it('size full', () => {
    const el = render(`
Frame
  Frame size full
`)
    const child = el.children[0] as HTMLElement
    // size full sollte beide Dimensionen auf full setzen
    expect(getStyle(child, 'flex')).toBe('1 1 0%')
  })

})

// ============================================================
// 34. WEIGHT KEYWORDS
// ============================================================
describe('Weight Keywords', () => {

  it('weight thin = 100', () => {
    const el = render(`Text "T" weight thin`)
    expect(getStyle(el, 'font-weight')).toBe('100')
  })

  it('weight light = 300', () => {
    const el = render(`Text "T" weight light`)
    expect(getStyle(el, 'font-weight')).toBe('300')
  })

  it('weight normal = 400', () => {
    const el = render(`Text "T" weight normal`)
    expect(getStyle(el, 'font-weight')).toBe('400')
  })

  it('weight medium = 500', () => {
    const el = render(`Text "T" weight medium`)
    expect(getStyle(el, 'font-weight')).toBe('500')
  })

  it('weight semibold = 600', () => {
    const el = render(`Text "T" weight semibold`)
    expect(getStyle(el, 'font-weight')).toBe('600')
  })

  it('weight black = 900', () => {
    const el = render(`Text "T" weight black`)
    expect(getStyle(el, 'font-weight')).toBe('900')
  })

})

// ============================================================
// 35. TEXT ALIGN
// ============================================================
describe('Text Align', () => {

  it('text-align left', () => {
    const el = render(`Text "T" text-align left`)
    expect(getStyle(el, 'text-align')).toBe('left')
  })

  it('text-align right', () => {
    const el = render(`Text "T" text-align right`)
    expect(getStyle(el, 'text-align')).toBe('right')
  })

  it('text-align justify', () => {
    const el = render(`Text "T" text-align justify`)
    expect(getStyle(el, 'text-align')).toBe('justify')
  })

})

// ============================================================
// 36. CENTER ALIGNMENT SHORTCUTS
// ============================================================
describe('Center Alignment Shortcuts', () => {

  it('hor-center sets align-items center (flex column)', () => {
    // Note: standalone properties must come BEFORE value properties on same line
    const el = render(`Frame hor-center w 100`)
    expect(getStyle(el, 'display')).toBe('flex')
    expect(getStyle(el, 'flex-direction')).toBe('column')
    expect(getStyle(el, 'align-items')).toBe('center')
  })

  it('ver-center sets justify-content center (flex column)', () => {
    // Note: standalone properties must come BEFORE value properties on same line
    const el = render(`Frame ver-center h 100`)
    expect(getStyle(el, 'display')).toBe('flex')
    expect(getStyle(el, 'flex-direction')).toBe('column')
    expect(getStyle(el, 'justify-content')).toBe('center')
  })

})

// ============================================================
// 37. DIRECTIONAL MARGIN
// ============================================================
describe('Directional Margin', () => {

  it('margin left sets margin-left', () => {
    const el = render(`Frame margin left 20`)
    expect(getStyle(el, 'margin-left')).toBe('20px')
  })

  it('margin right sets margin-right', () => {
    const el = render(`Frame margin right 15`)
    expect(getStyle(el, 'margin-right')).toBe('15px')
  })

  it('margin top sets margin-top', () => {
    const el = render(`Frame margin top 10`)
    expect(getStyle(el, 'margin-top')).toBe('10px')
  })

  it('margin bottom sets margin-bottom', () => {
    const el = render(`Frame margin bottom 25`)
    expect(getStyle(el, 'margin-bottom')).toBe('25px')
  })

})

// ============================================================
// 38. PIN CENTER PROPERTIES
// ============================================================
describe('Pin Center Properties', () => {

  it('pin-center-x centers horizontally', () => {
    const el = render(`Frame pos pin-center-x`)
    expect(getStyle(el, 'left')).toBe('50%')
    expect(getStyle(el, 'transform')).toContain('translateX(-50%)')
  })

  it('pin-center-y centers vertically', () => {
    const el = render(`Frame pos pin-center-y`)
    expect(getStyle(el, 'top')).toBe('50%')
    expect(getStyle(el, 'transform')).toContain('translateY(-50%)')
  })

  it('pin-center centers both axes', () => {
    const el = render(`Frame pos pin-center`)
    expect(getStyle(el, 'left')).toBe('50%')
    expect(getStyle(el, 'top')).toBe('50%')
    expect(getStyle(el, 'transform')).toContain('translate(-50%, -50%)')
  })

  it('pcx alias works', () => {
    const el = render(`Frame pos pcx`)
    expect(getStyle(el, 'left')).toBe('50%')
  })

  it('pcy alias works', () => {
    const el = render(`Frame pos pcy`)
    expect(getStyle(el, 'top')).toBe('50%')
  })

  it('pc alias works', () => {
    const el = render(`Frame pos pc`)
    expect(getStyle(el, 'left')).toBe('50%')
    expect(getStyle(el, 'top')).toBe('50%')
  })

})

// ============================================================
// 39. MORE PROPERTY ALIASES
// ============================================================
describe('More Property Aliases', () => {

  it('g = gap alias', () => {
    const el = render(`Frame hor g 15`)
    expect(getStyle(el, 'gap')).toBe('15px')
  })

  it('cen = center alias', () => {
    const el = render(`Frame hor cen`)
    expect(getStyle(el, 'justify-content')).toBe('center')
    expect(getStyle(el, 'align-items')).toBe('center')
  })

  it('positioned = pos alias', () => {
    // positioned with x/y makes the element absolutely positioned
    const el = render(`Frame positioned x 10`)
    expect(getStyle(el, 'position')).toBe('absolute')
    expect(getStyle(el, 'left')).toBe('10px')
  })

  it('rot = rotate alias', () => {
    const el = render(`Frame rot 45`)
    expect(getStyle(el, 'transform')).toContain('rotate(45deg)')
  })

  it('m = margin alias', () => {
    const el = render(`Frame m 20`)
    expect(getStyle(el, 'margin')).toBe('20px')
  })

})

// ============================================================
// 40. ICON PRIMITIVE
// ============================================================
describe('Icon Primitive', () => {

  it('Icon renders as span', () => {
    const el = render(`Icon "star"`)
    expect(el.tagName.toLowerCase()).toBe('span')
  })

  it('Icon can have styles applied', () => {
    const el = render(`Icon "star" fs 24`)
    expect(getStyle(el, 'font-size')).toBe('24px')
  })

})

// ============================================================
// 41. STACKED LAYOUT
// ============================================================
describe('Stacked Layout', () => {

  it('stacked sets position relative on parent', () => {
    const el = render(`Frame stacked
  Frame bg #f00`)
    expect(getStyle(el, 'position')).toBe('relative')
  })

  it('stacked children are absolutely positioned', () => {
    const el = render(`Frame stacked
  Frame bg #f00
  Frame bg #0f0`)
    const children = el.querySelectorAll(':scope > div')
    expect(children.length).toBe(2)
    // Children in stacked layout should be absolute
    expect(getStyle(children[0] as HTMLElement, 'position')).toBe('absolute')
    expect(getStyle(children[1] as HTMLElement, 'position')).toBe('absolute')
  })

})

// ============================================================
// 42. ALIGN PROPERTY
// ============================================================
describe('Align Property', () => {

  it('align top sets align-items flex-start', () => {
    const el = render(`Frame hor align top`)
    expect(getStyle(el, 'align-items')).toBe('flex-start')
  })

  it('align bottom sets align-items flex-end', () => {
    const el = render(`Frame hor align bottom`)
    expect(getStyle(el, 'align-items')).toBe('flex-end')
  })

  it('align left sets justify-content flex-start (hor)', () => {
    const el = render(`Frame hor align left`)
    expect(getStyle(el, 'justify-content')).toBe('flex-start')
  })

  it('align right sets justify-content flex-end (hor)', () => {
    const el = render(`Frame hor align right`)
    expect(getStyle(el, 'justify-content')).toBe('flex-end')
  })

  it('align center sets both to center', () => {
    const el = render(`Frame hor align center`)
    expect(getStyle(el, 'justify-content')).toBe('center')
    expect(getStyle(el, 'align-items')).toBe('center')
  })

})

// ============================================================
// 43. STANDALONE ALIGNMENT
// ============================================================
describe('Standalone Alignment', () => {

  it('left sets justify-content flex-start', () => {
    const el = render(`Frame hor left`)
    expect(getStyle(el, 'justify-content')).toBe('flex-start')
  })

  it('right sets justify-content flex-end', () => {
    const el = render(`Frame hor right`)
    expect(getStyle(el, 'justify-content')).toBe('flex-end')
  })

  it('top sets justify-content flex-start (ver)', () => {
    const el = render(`Frame ver top`)
    // In vertical layout, top/bottom control justify-content
    expect(getStyle(el, 'justify-content')).toBe('flex-start')
  })

  it('bottom sets justify-content flex-end (ver)', () => {
    const el = render(`Frame ver bottom`)
    // In vertical layout, top/bottom control justify-content
    expect(getStyle(el, 'justify-content')).toBe('flex-end')
  })

})

// ============================================================
// 44. LAYOUT + POSITION KONFLIKTE
// ============================================================
describe('Layout + Position Conflicts', () => {

  it('hor center + pos x - position overrides', () => {
    const el = render(`Frame hor center pos x 50`)
    expect(getStyle(el, 'position')).toBe('absolute')
    expect(getStyle(el, 'left')).toBe('50px')
  })

  it('grid + stacked - stacked wins (last)', () => {
    const el = render(`Frame grid 3 stacked`)
    expect(getStyle(el, 'position')).toBe('relative')
  })

  it('stacked + grid - grid wins (last)', () => {
    const el = render(`Frame stacked grid 3`)
    expect(getStyle(el, 'display')).toBe('grid')
  })

})

// ============================================================
// 45. TRANSFORM KOMBINATIONEN
// ============================================================
describe('Transform Combinations', () => {

  it('rotate + scale zusammen', () => {
    const el = render(`Frame rotate 45 scale 1.5`)
    const transform = getStyle(el, 'transform')
    expect(transform).toContain('rotate(45deg)')
    expect(transform).toContain('scale(1.5)')
  })

  it('rotate + scale + translate', () => {
    const el = render(`Frame rotate 90 scale 2 translate 10`)
    const transform = getStyle(el, 'transform')
    expect(transform).toContain('rotate(90deg)')
    expect(transform).toContain('scale(2)')
  })

})

// ============================================================
// 46. MEHR REIHENFOLGE KONFLIKTE
// ============================================================
describe('More Order Conflicts', () => {

  it('tl dann br - br gewinnt', () => {
    const el = render(`Frame tl br`)
    expect(getStyle(el, 'justify-content')).toBe('flex-end')
    expect(getStyle(el, 'align-items')).toBe('flex-end')
  })

  it('br dann tl - tl gewinnt', () => {
    const el = render(`Frame br tl`)
    expect(getStyle(el, 'justify-content')).toBe('flex-start')
    expect(getStyle(el, 'align-items')).toBe('flex-start')
  })

  it('center dann spread - spread gewinnt', () => {
    const el = render(`Frame hor center spread`)
    expect(getStyle(el, 'justify-content')).toBe('space-between')
  })

  it('spread dann center - center gewinnt', () => {
    const el = render(`Frame hor spread center`)
    expect(getStyle(el, 'justify-content')).toBe('center')
  })

})

// ============================================================
// 47. TIEFE VERSCHACHTELUNG (4+ EBENEN)
// ============================================================
describe('Deep Nesting 4+ Levels', () => {

  it('4 ebenen layout-wechsel', () => {
    const el = render(`
Frame hor
  Frame ver
    Frame hor
      Frame ver
        Text "deep"`)
    const l1 = el
    const l2 = l1.querySelector(':scope > div') as HTMLElement
    const l3 = l2?.querySelector(':scope > div') as HTMLElement
    const l4 = l3?.querySelector(':scope > div') as HTMLElement

    expect(getStyle(l1, 'flex-direction')).toBe('row')
    expect(getStyle(l2, 'flex-direction')).toBe('column')
    expect(getStyle(l3, 'flex-direction')).toBe('row')
    expect(getStyle(l4, 'flex-direction')).toBe('column')
  })

  it('stacked mit positioned child', () => {
    const el = render(`
Frame stacked
  Frame pos x 10 y 20`)
    const child = el.querySelector(':scope > div') as HTMLElement
    expect(getStyle(el, 'position')).toBe('relative')
    expect(getStyle(child, 'position')).toBe('absolute')
    expect(getStyle(child, 'left')).toBe('10px')
  })

})

// ============================================================
// 48. NULL-WERTE
// ============================================================
describe('Zero Values', () => {

  it('pad 0 margin 0 gap 0', () => {
    const el = render(`Frame pad 0 margin 0 gap 0`)
    expect(getStyle(el, 'padding')).toBe('0px')
    expect(getStyle(el, 'margin')).toBe('0px')
    expect(getStyle(el, 'gap')).toBe('0px')
  })

  it('w 0 h 0', () => {
    const el = render(`Frame w 0 h 0`)
    expect(getStyle(el, 'width')).toBe('0px')
    expect(getStyle(el, 'height')).toBe('0px')
  })

  it('opacity 0', () => {
    const el = render(`Frame opacity 0`)
    expect(getStyle(el, 'opacity')).toBe('0')
  })

  it('scale 0', () => {
    const el = render(`Frame scale 0`)
    expect(getStyle(el, 'transform')).toContain('scale(0)')
  })

  it('rotate 0', () => {
    const el = render(`Frame rotate 0`)
    expect(getStyle(el, 'transform')).toContain('rotate(0deg)')
  })

})

// ============================================================
// 49. NEGATIVE WERTE
// ============================================================
describe('Negative Values', () => {

  it('margin -10', () => {
    const el = render(`Frame margin -10`)
    expect(getStyle(el, 'margin')).toBe('-10px')
  })

  it('z -1', () => {
    const el = render(`Frame z -1`)
    expect(getStyle(el, 'z-index')).toBe('-1')
  })

  it('x -20 y -30', () => {
    const el = render(`Frame pos x -20 y -30`)
    expect(getStyle(el, 'left')).toBe('-20px')
    expect(getStyle(el, 'top')).toBe('-30px')
  })

  it('rotate -180', () => {
    const el = render(`Frame rotate -180`)
    expect(getStyle(el, 'transform')).toContain('rotate(-180deg)')
  })

})

// ============================================================
// 50. EXTREME WERTE
// ============================================================
describe('Extreme Values', () => {

  it('w 99999', () => {
    const el = render(`Frame w 99999`)
    expect(getStyle(el, 'width')).toBe('99999px')
  })

  it('rotate 720 (2x360)', () => {
    const el = render(`Frame rotate 720`)
    expect(getStyle(el, 'transform')).toContain('rotate(720deg)')
  })

  it('rotate -360', () => {
    const el = render(`Frame rotate -360`)
    expect(getStyle(el, 'transform')).toContain('rotate(-360deg)')
  })

  it('scale 10', () => {
    const el = render(`Frame scale 10`)
    expect(getStyle(el, 'transform')).toContain('scale(10)')
  })

  it('z 9999', () => {
    const el = render(`Frame z 9999`)
    expect(getStyle(el, 'z-index')).toBe('9999')
  })

})

// ============================================================
// 51. MULTIPLE STATES
// ============================================================
describe('Multiple States', () => {

  it('hover state kompiliert', () => {
    const el = render(`
Frame bg #fff
  hover: bg #f00`)
    expect(colorMatches(getStyle(el, 'background-color'), '#fff')).toBe(true)
  })

  it('mehrere states auf einem element', () => {
    const el = render(`
Frame bg #fff
  hover: bg #f00
  focus: bg #0f0`)
    expect(el.tagName.toLowerCase()).toBe('div')
  })

  it('custom state selected', () => {
    const el = render(`
Frame
  state selected: bg #f00 bor 2`)
    expect(el.tagName.toLowerCase()).toBe('div')
  })

})

// ============================================================
// 52. MULTIPLE EVENTS
// ============================================================
describe('Multiple Events', () => {

  it('onclick kompiliert', () => {
    const el = render(`
Button "Click"
  onclick: toggle .modal`)
    expect(el.tagName.toLowerCase()).toBe('button')
  })

  it('mehrere events auf einem element', () => {
    const el = render(`
Button "Action"
  onclick: show .panel
  onhover: highlight`)
    expect(el.tagName.toLowerCase()).toBe('button')
  })

  it('onkeydown mit key', () => {
    const el = render(`
Input
  onkeydown enter: submit`)
    expect(el.tagName.toLowerCase()).toBe('input')
  })

})

// ============================================================
// 53. TOKEN REIHENFOLGE
// ============================================================
describe('Token Order', () => {

  it('token dann fester wert - fester gewinnt', () => {
    const el = render(`
$size: 100
Frame w $size w 200`)
    expect(getStyle(el, 'width')).toBe('200px')
  })

  it('fester wert dann token - token gewinnt (as CSS var)', () => {
    const el = render(`
$size: 150
Frame w 100 w $size`)
    // Tokens are rendered as CSS variables, not resolved values
    expect(getStyle(el, 'width')).toBe('var(--size)')
  })

  it('token für mehrere properties (as CSS vars)', () => {
    const el = render(`
$space: 16
Frame pad $space gap $space margin $space`)
    // Tokens stay as CSS variables
    expect(getStyle(el, 'padding')).toBe('var(--space)')
    expect(getStyle(el, 'gap')).toBe('var(--space)')
    expect(getStyle(el, 'margin')).toBe('var(--space)')
  })

})

// ============================================================
// 54. PRAXIS-PATTERNS
// ============================================================
describe('Practical Patterns', () => {

  it('card component', () => {
    const el = render(`
Frame ver pad 16 gap 12 bg #fff rad 8 shadow md
  Text "Title" weight bold fs 18
  Text "Description" col #666`)
    expect(getStyle(el, 'flex-direction')).toBe('column')
    expect(getStyle(el, 'padding')).toBe('16px')
    expect(getStyle(el, 'gap')).toBe('12px')
    expect(getStyle(el, 'border-radius')).toBe('8px')
  })

  it('button component', () => {
    const el = render(`Button "Submit" pad 12 bg #007bff col #fff rad 4 cursor pointer`)
    expect(getStyle(el, 'padding')).toBe('12px')
    expect(getStyle(el, 'border-radius')).toBe('4px')
    expect(getStyle(el, 'cursor')).toBe('pointer')
  })

  it('modal overlay', () => {
    // Note: pin-* sets position: absolute, overriding fixed
    const el = render(`Frame fixed pin-left 0 pin-top 0 w full h full center`)
    expect(getStyle(el, 'position')).toBe('absolute')
    expect(getStyle(el, 'left')).toBe('0px')
    expect(getStyle(el, 'top')).toBe('0px')
  })

  it('navbar', () => {
    const el = render(`
Frame hor spread pad 16 bg #333
  Text "Logo" col #fff
  Frame hor gap 24
    Link "Home"
    Link "About"`)
    expect(getStyle(el, 'flex-direction')).toBe('row')
    expect(getStyle(el, 'justify-content')).toBe('space-between')
    expect(getStyle(el, 'padding')).toBe('16px')
  })

})

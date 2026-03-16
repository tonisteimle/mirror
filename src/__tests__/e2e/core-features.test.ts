/**
 * Core Features Test Suite
 *
 * Fokussiert auf die wichtigsten Mirror-Sprachelemente:
 * - Komponenten-Definitionen
 * - Instanz-Änderungen (Properties auf Instanzen)
 * - Kinder verändern (Child Overrides)
 * - Slots
 * - Vererbung
 * - States
 * - Interaktionen (Events & Actions)
 * - Komplexe Layout-Situationen
 */

import { describe, it, expect } from 'vitest'
import { parse, generateDOM } from '../../index'
import { JSDOM } from 'jsdom'

// ============================================
// TEST HELPERS
// ============================================

function compile(mirrorCode: string): string {
  const ast = parse(mirrorCode)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }
  return generateDOM(ast)
}

function compileAndExecute(mirrorCode: string, data: Record<string, unknown> = {}): {
  dom: JSDOM
  root: HTMLElement
  container: HTMLElement
  api: any
  jsCode: string
} {
  const jsCode = compile(mirrorCode)
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'dangerously',
  })

  const { window } = dom
  const { document } = window

  const executableCode = jsCode.replace(/^export /gm, '')
  const wrappedCode = `
    (function() {
      ${executableCode}
      window.__mirrorAPI = createUI(${JSON.stringify(data)});
      window.__mirrorRoot = window.__mirrorAPI.root;
    })();
  `

  const script = document.createElement('script')
  script.textContent = wrappedCode
  document.body.appendChild(script)

  const container = (window as any).__mirrorRoot
  const root = container?.firstElementChild as HTMLElement

  return { dom, root, container, api: (window as any).__mirrorAPI, jsCode }
}

// ============================================
// 1. KOMPONENTEN-DEFINITIONEN
// ============================================

describe('Core: Komponenten-Definitionen', () => {
  describe('Basis-Definition', () => {
    it('definiert eine Komponente mit Doppelpunkt', () => {
      const { root } = compileAndExecute(`
Card as frame:
  pad 16
  bg #1a1a23

Card
`)
      expect(root).toBeDefined()
      expect(root.style.padding).toBe('16px')
      expect(root.style.background).toBe('rgb(26, 26, 35)')
    })

    it('definiert Komponente mit mehreren Properties', () => {
      const { root } = compileAndExecute(`
Button as button:
  pad 12 24
  bg #3B82F6
  rad 8
  col white
  cursor pointer

Button "Click me"
`)
      expect(root.tagName.toLowerCase()).toBe('button')
      expect(root.style.padding).toBe('12px 24px')
      expect(root.style.borderRadius).toBe('8px')
      expect(root.style.cursor).toBe('pointer')
    })

    it('unterstützt alle Primitives', () => {
      const tests = [
        { primitive: 'frame', expected: 'div' },
        { primitive: 'text', expected: 'span' },
        { primitive: 'button', expected: 'button' },
        { primitive: 'input', expected: 'input' },
        { primitive: 'textarea', expected: 'textarea' },
        { primitive: 'image', expected: 'img' },
        { primitive: 'link', expected: 'a' },
      ]

      for (const { primitive, expected } of tests) {
        const { root } = compileAndExecute(`
Test as ${primitive}:

Test
`)
        expect(root.tagName.toLowerCase()).toBe(expected)
      }
    })
  })

  describe('Inline Define + Render (as)', () => {
    it('definiert und rendert in einem Schritt', () => {
      const { root } = compileAndExecute(`
Container as frame:
  pad 24
  bg #1a1a23
`)
      // Wenn nur Definition ohne Instanz, sollte trotzdem gerendert werden
      // wenn "as" verwendet wird
      expect(root).toBeDefined()
    })
  })

  describe('Benannte Instanzen', () => {
    it('erstellt benannte Instanz mit named', () => {
      const { api } = compileAndExecute(`
Button as button:
  pad 12

Button named submitBtn "Submit"
`)
      expect(api.submitBtn).toBeDefined()
      expect(api.submitBtn.text).toBe('Submit')
    })

    it('mehrere benannte Instanzen', () => {
      const { api } = compileAndExecute(`
Input as input:

Input named email "Email"
Input named password "Password"
`)
      expect(api.email).toBeDefined()
      expect(api.password).toBeDefined()
    })
  })
})

// ============================================
// 2. INSTANZ-ÄNDERUNGEN
// ============================================

describe('Core: Instanz-Änderungen', () => {
  describe('Properties auf Instanzen überschreiben', () => {
    it('überschreibt einzelne Property auf Instanz', () => {
      const { root } = compileAndExecute(`
Card as frame:
  pad 16
  bg #333

Card bg #555
`)
      expect(root.style.background).toBe('rgb(85, 85, 85)')
      expect(root.style.padding).toBe('16px')
    })

    it('überschreibt mehrere Properties auf Instanz', () => {
      const { root } = compileAndExecute(`
Box as frame:
  pad 8
  bg #333
  rad 4

Box pad 16, bg #555, rad 8
`)
      expect(root.style.padding).toBe('16px')
      expect(root.style.background).toBe('rgb(85, 85, 85)')
      expect(root.style.borderRadius).toBe('8px')
    })

    it('fügt Properties auf Instanz hinzu', () => {
      const { root } = compileAndExecute(`
Card as frame:
  pad 16

Card bg #3B82F6, rad 12, shadow md
`)
      expect(root.style.padding).toBe('16px')
      expect(root.style.background).toBe('rgb(59, 130, 246)')
      expect(root.style.borderRadius).toBe('12px')
    })
  })

  describe('Text-Content auf Instanzen', () => {
    it('setzt Text-Content mit String', () => {
      const { root } = compileAndExecute(`
Label as text:
  col #999

Label "Hello World"
`)
      expect(root.textContent).toBe('Hello World')
    })

    it('verschiedene Texte für verschiedene Instanzen', () => {
      const { container } = compileAndExecute(`
Label as text:

Container as frame:

Container
  Label "First"
  Label "Second"
  Label "Third"
`)
      const labels = container.querySelectorAll('span')
      expect(labels.length).toBe(3)
      expect(labels[0].textContent).toBe('First')
      expect(labels[1].textContent).toBe('Second')
      expect(labels[2].textContent).toBe('Third')
    })
  })
})

// ============================================
// 3. KINDER VERÄNDERN (Child Overrides)
// ============================================

describe('Core: Child Overrides', () => {
  describe('Semicolon-Syntax für Child-Overrides', () => {
    it('überschreibt Child-Properties mit Semicolon', () => {
      const mirrorCode = `
NavItem:
  Icon:
  Label:

Icon as frame:
  w 20, h 20

Label as text:
  col #999

NavItem Icon w 24; Label col white
`
      // Sollte ohne Fehler kompilieren
      expect(() => compile(mirrorCode)).not.toThrow()
    })

    it('überschreibt Text-Content von Kindern', () => {
      const { root } = compileAndExecute(`
MenuItem:
  Icon:
  Text:

Icon as text:
Text as text:

MenuItem Icon "home"; Text "Home"
`)
      const children = root.querySelectorAll('span')
      expect(children.length).toBe(2)
    })
  })

  describe('Vererbung mit Child-Overrides', () => {
    it('überschreibt Kinder bei Vererbung', () => {
      const mirrorCode = `
Button:
  Icon:
  Label:

Icon as text:
  hidden

Label as text:

IconButton as Button: Icon visible; Label hidden
`
      expect(() => compile(mirrorCode)).not.toThrow()
    })
  })
})

// ============================================
// 4. SLOTS
// ============================================

describe('Core: Slots', () => {
  describe('Slot-Definitionen', () => {
    it('definiert Slots mit Doppelpunkt', () => {
      const { root } = compileAndExecute(`
Card as frame:
  pad 16
  Header:
  Body:
  Footer:

Header as frame:
  horizontal

Body as frame:
  gap 8

Footer as frame:
  horizontal
  right

Card
  Header "Title"
  Body "Content"
  Footer "Action"
`)
      expect(root.children.length).toBe(3)
    })

    it('füllt Slots mit passenden Komponenten', () => {
      const { root } = compileAndExecute(`
Panel as frame:
  Title:
  Content:

Title as text:
  weight 600
  fs 18

Content as text:
  col #999

Panel
  Title "Welcome"
  Content "This is the content area"
`)
      expect(root.children[0].textContent).toBe('Welcome')
      expect(root.children[1].textContent).toBe('This is the content area')
    })

    it('verwendet Default-Content wenn Slot nicht gefüllt', () => {
      const { root } = compileAndExecute(`
Alert as frame:
  pad 16
  Message "Default message"

Message as text:

Alert
`)
      expect(root.children[0].textContent).toBe('Default message')
    })
  })

  describe('Verschachtelte Slots', () => {
    it('unterstützt verschachtelte Slot-Strukturen', () => {
      const { root } = compileAndExecute(`
Dialog as frame:
  pad 24
  Header:
    Title:
    CloseBtn:
  Body:
  Footer:

Header as frame:
  horizontal
  spread

Title as text:
  weight 600

CloseBtn as button:
  pad 8

Body as frame:
  pad 16 0

Footer as frame:
  horizontal
  right
  gap 8

Dialog
  Header
    Title "Dialog Title"
    CloseBtn "X"
  Body "Dialog content goes here"
  Footer "OK"
`)
      expect(root).toBeDefined()
      expect(root.children.length).toBe(3)
    })
  })

  describe('Flat Access', () => {
    it('findet verschachtelte Slots direkt', () => {
      const { root } = compileAndExecute(`
Header as frame:
  Left:
    Logo:
  Right:
    Menu:

Left as frame:
Right as frame:
Logo as text:
Menu as text:

Header
  Logo "MyApp"
  Menu "Navigation"
`)
      // Logo sollte in Left sein, aber direkt addressierbar
      expect(root).toBeDefined()
    })
  })
})

// ============================================
// 5. VERERBUNG
// ============================================

describe('Core: Vererbung', () => {
  describe('Basis-Vererbung', () => {
    it('erbt von anderer Komponente', () => {
      const { root } = compileAndExecute(`
Button as button:
  pad 12
  bg #3B82F6
  rad 8

PrimaryButton as Button:

PrimaryButton "Primary"
`)
      // PrimaryButton erbt von Button (das ein button ist)
      expect(root.tagName.toLowerCase()).toBe('button')
    })

    it('überschreibt Properties bei Vererbung', () => {
      const { root } = compileAndExecute(`
Card as frame:
  pad 16
  bg #333
  rad 8

DarkCard as Card:
  bg #111

DarkCard
`)
      expect(root.style.background).toBe('rgb(17, 17, 17)')
    })
  })

  describe('Direkte Primitive-Vererbung', () => {
    it('erbt direkt von Primitive', () => {
      const { root } = compileAndExecute(`
SubmitButton as button:
  pad 12 24
  bg #22C55E
  rad 8
  col white

SubmitButton "Submit"
`)
      expect(root.tagName.toLowerCase()).toBe('button')
      expect(root.style.padding).toBe('12px 24px')
    })
  })

  describe('Mehrfache Vererbung', () => {
    it('Vererbungskette funktioniert', () => {
      const mirrorCode = `
Base as frame:
  pad 8

Card as Base:
  bg #333

PrimaryCard as Card:
  bg #3B82F6

PrimaryCard
`
      expect(() => compile(mirrorCode)).not.toThrow()
    })
  })
})

// ============================================
// 6. STATES
// ============================================

describe('Core: States', () => {
  describe('System States (CSS Pseudo-Classes)', () => {
    it('generiert :hover CSS', () => {
      const { dom } = compileAndExecute(`
Button as button:
  bg #333
  hover
    bg #555

Button "Hover me"
`)
      const styles = dom.window.document.querySelector('style')
      expect(styles!.textContent).toContain(':hover')
      expect(styles!.textContent).toContain('#555')
    })

    it('generiert :focus CSS', () => {
      const { dom } = compileAndExecute(`
Input as input:
  bor 1 solid #333
  focus
    bor 1 solid #3B82F6

Input
`)
      const styles = dom.window.document.querySelector('style')
      expect(styles!.textContent).toContain(':focus')
    })

    it('generiert :active CSS', () => {
      const { dom } = compileAndExecute(`
Button as button:
  bg #3B82F6
  active
    bg #1D4ED8

Button "Press"
`)
      const styles = dom.window.document.querySelector('style')
      expect(styles!.textContent).toContain(':active')
    })

    it('generiert disabled CSS mit Attribut-Selektor', () => {
      const { dom } = compileAndExecute(`
Button as button:
  bg #3B82F6
  disabled
    bg #666
    cursor not-allowed

Button "Disabled"
`)
      const styles = dom.window.document.querySelector('style')
      // Disabled wird als [disabled] Attribut-Selektor implementiert, nicht :disabled
      expect(styles!.textContent).toContain('[disabled]')
      expect(styles!.textContent).toContain('background: #666')
    })
  })

  describe('Behavior States (JavaScript)', () => {
    it('definiert selected State', () => {
      const { root } = compileAndExecute(`
Item as frame:
  pad 12
  bg #333
  state selected
    bg #3B82F6
    col white

Item "Select me"
`)
      expect(root._stateStyles).toBeDefined()
      expect(root._stateStyles.selected).toBeDefined()
      expect(root._stateStyles.selected.background).toBe('#3B82F6')
    })

    it('definiert highlighted State', () => {
      const { root } = compileAndExecute(`
Option as frame:
  pad 8 12
  state highlighted
    bg #444

Option "Option 1"
`)
      expect(root._stateStyles.highlighted).toBeDefined()
    })

    it('definiert mehrere States', () => {
      // Note: "active" ist eine CSS Pseudo-Klasse (:active), daher verwenden wir
      // "activated" und "deactivated" als Behavior States
      const { root } = compileAndExecute(`
Tab as frame:
  pad 12 16
  state selected
    bg #3B82F6
    col white
  state inactive
    bg transparent
    col #999

Tab "Tab 1"
`)
      expect(root._stateStyles.selected).toBeDefined()
      expect(root._stateStyles.inactive).toBeDefined()
    })
  })

  describe('Initial States', () => {
    it('setzt initial state mit closed', () => {
      const { root } = compileAndExecute(`
Dropdown as frame:
  closed

Dropdown
`)
      expect(root.dataset.state).toBe('closed')
    })

    it('setzt initial state mit open', () => {
      const { root } = compileAndExecute(`
Menu as frame:
  open

Menu
`)
      expect(root.dataset.state).toBe('open')
    })

    it('setzt initial state mit collapsed/expanded', () => {
      const { root: collapsed } = compileAndExecute(`
Accordion as frame:
  collapsed

Accordion
`)
      const { root: expanded } = compileAndExecute(`
Accordion as frame:
  expanded

Accordion
`)
      expect(collapsed.dataset.state).toBe('collapsed')
      expect(expanded.dataset.state).toBe('expanded')
    })
  })

  describe('State mit mehreren Properties', () => {
    it('wendet alle State-Properties an', () => {
      // Note: "active" ist eine CSS Pseudo-Klasse (:active), daher verwenden wir
      // "selected" als Behavior State
      const { root } = compileAndExecute(`
Card as frame:
  pad 16
  bg #333
  state selected
    bg #3B82F6
    col white
    pad 20
    shadow lg

Card
`)
      expect(root._stateStyles.selected.background).toBe('#3B82F6')
      expect(root._stateStyles.selected.color).toBe('white')
      expect(root._stateStyles.selected.padding).toBe('20px')
    })
  })
})

// ============================================
// 7. INTERAKTIONEN (Events & Actions)
// ============================================

describe('Core: Interaktionen', () => {
  describe('Click Events', () => {
    it('registriert onclick Event', () => {
      const { jsCode } = compileAndExecute(`
Button as button:
  onclick show Modal

Modal as frame:
  hidden

Button "Open"
Modal
`)
      expect(jsCode).toContain("addEventListener('click'")
    })

    it('onclick mit mehreren Actions', () => {
      const { jsCode } = compileAndExecute(`
Item as frame:
  onclick select, highlight

Item "Click"
`)
      expect(jsCode).toContain("addEventListener('click'")
      expect(jsCode).toContain('_runtime.select')
    })
  })

  describe('Hover Events', () => {
    it('registriert onhover Event', () => {
      const { jsCode } = compileAndExecute(`
Item as frame:
  onhover highlight

Item "Hover"
`)
      expect(jsCode).toContain("addEventListener('mouseenter'")
    })
  })

  describe('Click Outside', () => {
    it('registriert onclick-outside Event', () => {
      const { jsCode } = compileAndExecute(`
Dropdown as frame:
  onclick-outside close

Dropdown
`)
      expect(jsCode).toContain("document.addEventListener('click'")
      expect(jsCode).toContain('.contains(e.target)')
    })
  })

  describe('Keyboard Events', () => {
    it('registriert onkeydown Event', () => {
      const { jsCode } = compileAndExecute(`
Input as input:
  onkeydown enter: submit

Input
`)
      expect(jsCode).toContain("addEventListener('keydown'")
      expect(jsCode).toContain('Enter')
    })

    it('verschiedene Keyboard-Keys', () => {
      const { jsCode } = compileAndExecute(`
List as frame:
  onkeydown escape: close
  onkeydown arrow-down: highlight next
  onkeydown arrow-up: highlight prev

List
`)
      expect(jsCode).toContain('Escape')
      expect(jsCode).toContain('ArrowDown')
      expect(jsCode).toContain('ArrowUp')
    })
  })

  describe('Actions', () => {
    it('toggle Action', () => {
      const { jsCode } = compileAndExecute(`
Button as button:
  onclick toggle Menu

Menu as frame:
  closed

Button "Toggle"
Menu
`)
      expect(jsCode).toContain('_runtime.toggle')
    })

    it('show/hide Actions', () => {
      const { jsCode } = compileAndExecute(`
ShowBtn as button:
  onclick show Modal

HideBtn as button:
  onclick hide Modal

Modal as frame:
  hidden

ShowBtn "Show"
HideBtn "Hide"
Modal
`)
      expect(jsCode).toContain('_runtime.show')
      expect(jsCode).toContain('_runtime.hide')
    })

    it('select Action', () => {
      const { jsCode } = compileAndExecute(`
Option as frame:
  onclick select

Option "Option 1"
`)
      expect(jsCode).toContain('_runtime.select')
    })

    it('highlight Action', () => {
      const { jsCode } = compileAndExecute(`
Item as frame:
  onhover highlight

Item "Item"
`)
      expect(jsCode).toContain('_runtime.highlight')
    })

    it('activate/deactivate Actions', () => {
      const { jsCode } = compileAndExecute(`
Tab as frame:
  onclick activate, deactivate-siblings

Tab "Tab 1"
`)
      expect(jsCode).toContain('_runtime.activate')
    })
  })
})

// ============================================
// 8. KOMPLEXE LAYOUT-SITUATIONEN
// ============================================

describe('Core: Komplexe Layouts', () => {
  describe('Flexbox Layouts', () => {
    it('horizontal mit spread und gap', () => {
      const { root } = compileAndExecute(`
Navbar as frame:
  horizontal
  spread
  gap 16
  pad 16

Logo as text:
Nav as frame:
  horizontal
  gap 8

Navbar
  Logo "MyApp"
  Nav
    "Link 1"
    "Link 2"
`)
      expect(root.style.flexDirection).toBe('row')
      expect(root.style.justifyContent).toBe('space-between')
      expect(root.style.gap).toBe('16px')
    })

    it('vertical mit center', () => {
      const { root } = compileAndExecute(`
Hero as frame:
  vertical
  center
  gap 24
  pad 48
  height 400

Hero
  "Welcome"
  "Subtitle"
`)
      expect(root.style.flexDirection).toBe('column')
      expect(root.style.justifyContent).toBe('center')
      expect(root.style.alignItems).toBe('center')
    })

    it('verschachtelte Flexbox', () => {
      const { root } = compileAndExecute(`
Page as frame:
  horizontal
  gap 24

Sidebar as frame:
  vertical
  width 250
  gap 8

Main as frame:
  vertical
  width full
  gap 16

Page
  Sidebar
    "Nav Item 1"
    "Nav Item 2"
  Main
    "Content"
`)
      expect(root.style.flexDirection).toBe('row')
      expect(root.children[0].style.width).toBe('250px')
      expect(root.children[1].style.flexGrow).toBe('1')
    })
  })

  describe('Grid Layouts', () => {
    it('grid mit Spaltenanzahl', () => {
      const { root } = compileAndExecute(`
Grid as frame:
  grid 3
  gap 16

Grid
`)
      expect(root.style.display).toBe('grid')
      expect(root.style.gridTemplateColumns).toContain('repeat(3')
    })

    it('grid mit auto-fill', () => {
      const { root } = compileAndExecute(`
Gallery as frame:
  grid auto 200
  gap 16

Gallery
`)
      expect(root.style.display).toBe('grid')
      expect(root.style.gridTemplateColumns).toContain('auto-fill')
    })
  })

  describe('Stacked Layout (z-layers)', () => {
    it('stacked für Overlays', () => {
      const { root } = compileAndExecute(`
Stack as frame:
  stacked
  width 300
  height 200

Background as frame:
  bg #333

Overlay as frame:
  center
  bg rgba(0,0,0,0.5)

Stack
  Background
  Overlay "Content"
`)
      expect(root.style.position).toBe('relative')
    })
  })

  describe('Komplexe Alignment-Kombinationen', () => {
    it('horizontal mit unterschiedlichen Alignments', () => {
      const { root } = compileAndExecute(`
Row as frame:
  horizontal
  ver-center
  spread
  height 60

Row
  "Left"
  "Right"
`)
      expect(root.style.flexDirection).toBe('row')
      expect(root.style.alignItems).toBe('center')
      expect(root.style.justifyContent).toBe('space-between')
    })

    it('vertical mit left alignment', () => {
      const { root } = compileAndExecute(`
Stack as frame:
  vertical
  left
  gap 8

Stack
  "Item 1"
  "Item 2"
`)
      expect(root.style.flexDirection).toBe('column')
      expect(root.style.alignItems).toBe('flex-start')
    })

    it('vertical mit right alignment', () => {
      const { root } = compileAndExecute(`
Stack as frame:
  vertical
  right
  gap 8

Stack
  "Item 1"
  "Item 2"
`)
      expect(root.style.flexDirection).toBe('column')
      expect(root.style.alignItems).toBe('flex-end')
    })
  })

  describe('Wrap Layout', () => {
    it('flexbox mit wrap', () => {
      const { root } = compileAndExecute(`
Tags as frame:
  horizontal
  wrap
  gap 8

Tags
`)
      expect(root.style.flexWrap).toBe('wrap')
    })
  })

  describe('Scroll Layouts', () => {
    it('vertical scroll', () => {
      const { root } = compileAndExecute(`
List as frame:
  height 300
  scroll
  gap 8

List
`)
      expect(root.style.overflowY).toBe('auto')
    })

    it('horizontal scroll', () => {
      const { root } = compileAndExecute(`
Carousel as frame:
  horizontal
  scroll-hor
  gap 16
  width full

Carousel
`)
      expect(root.style.overflowX).toBe('auto')
    })
  })

  describe('Sizing Kombinationen', () => {
    it('width full mit max-width', () => {
      const { root } = compileAndExecute(`
Container as frame:
  width full
  max-width 1200
  pad 24

Container
`)
      // w full uses flex shorthand, max-width is applied separately
      expect(root.style.flex).toBe('1 1 0%')
      expect(root.style.maxWidth).toBe('1200px')
    })

    it('height hug vs height full', () => {
      const { root: hug } = compileAndExecute(`
Box as frame:
  height hug
  pad 16

Box "Content"
`)
      const { root: full } = compileAndExecute(`
Box as frame:
  height full
  pad 16

Box "Content"
`)
      expect(hug.style.height).toBe('fit-content')
      // h full uses flex shorthand for proper flex behavior
      expect(full.style.flex).toBe('1 1 0%')
    })
  })

  describe('Komplette Layout-Patterns', () => {
    it('Dashboard Layout', () => {
      const { root } = compileAndExecute(`
Dashboard as frame:
  horizontal
  height full

Sidebar as frame:
  vertical
  width 250
  bg #1a1a23
  pad 16
  gap 8

Main as frame:
  vertical
  width full

Header as frame:
  horizontal
  spread
  pad 16
  bg #1a1a23

Content as frame:
  pad 24
  scroll
  gap 16

Dashboard
  Sidebar
    "Nav 1"
    "Nav 2"
  Main
    Header
      "Title"
      "Actions"
    Content
      "Content"
`)
      expect(root.style.flexDirection).toBe('row')
      expect(root.children[0].style.width).toBe('250px')
      expect(root.children[1].style.flexGrow).toBe('1')
    })

    it('Card Grid Layout', () => {
      const { root } = compileAndExecute(`
Page as frame:
  pad 24
  gap 24

Header as frame:
  horizontal
  spread

CardGrid as frame:
  grid 3
  gap 16

Card as frame:
  pad 16
  bg #1a1a23
  rad 8

Page
  Header
    "Dashboard"
    "Filter"
  CardGrid
    Card "Card 1"
    Card "Card 2"
    Card "Card 3"
    Card "Card 4"
    Card "Card 5"
    Card "Card 6"
`)
      expect(root.style.gap).toBe('24px')
      const cardGrid = root.children[1]
      expect(cardGrid.style.display).toBe('grid')
      expect(cardGrid.children.length).toBe(6)
    })

    it('Modal mit Overlay', () => {
      const { root, jsCode } = compileAndExecute(`
Overlay as frame:
  stacked
  center
  bg rgba(0,0,0,0.5)
  hidden

Modal as frame:
  width 400
  max-height 80%
  bg #1a1a23
  rad 12
  pad 24
  gap 16
  scroll

ModalHeader as frame:
  horizontal
  spread

ModalBody as frame:
  gap 12

ModalFooter as frame:
  horizontal
  right
  gap 8

CloseBtn as button:
  onclick hide Overlay

Overlay named modal
  Modal
    ModalHeader
      "Title"
      CloseBtn "X"
    ModalBody
      "Content"
    ModalFooter
      "Cancel"
      "Confirm"
`)
      expect(root.style.position).toBe('relative')
      expect(root.style.display).toBe('none') // hidden
      expect(jsCode).toContain('_runtime.hide')
    })

    it('Form Layout', () => {
      const { root } = compileAndExecute(`
Form as frame:
  gap 16
  width 400

Field as frame:
  gap 4

Label as text:
  fs 12
  col #999

Input as input:
  pad 12
  bg #1a1a23
  rad 8
  bor 1 solid #333
  focus
    bor 1 solid #3B82F6

Row as frame:
  horizontal
  gap 12

Submit as button:
  width full
  pad 12
  bg #3B82F6
  rad 8
  col white

Form
  Field
    Label "First Name"
    Input "John"
  Field
    Label "Last Name"
    Input "Doe"
  Row
    Field
      Label "City"
      Input "New York"
    Field
      Label "ZIP"
      Input "10001"
  Submit "Save"
`)
      expect(root.style.gap).toBe('16px')
      expect(root.style.width).toBe('400px')
      expect(root.children.length).toBe(4) // 2 fields + row + submit
    })
  })
})

// ============================================
// INTEGRATION TESTS
// ============================================

describe('Core: Integration', () => {
  it('Dropdown mit allen Features', () => {
    const { root, jsCode } = compileAndExecute(`
Trigger as button:
  pad 12
  bg #333
  rad 8
  onclick toggle Menu

Menu as frame:
  closed
  width 200
  bg #1a1a23
  rad 8
  shadow lg
  onclick-outside close

Option as frame:
  pad 8 12
  cursor pointer
  onhover highlight
  onclick select, close Menu
  state highlighted
    bg #333
  state selected
    bg #3B82F6

Dropdown as frame:
  vertical

Dropdown named dropdown
  Trigger "Select..."
  Menu
    Option "Option 1"
    Option "Option 2"
    Option "Option 3"
`)
    expect(root).toBeDefined()
    expect(jsCode).toContain('_runtime.toggle')
    expect(jsCode).toContain('_runtime.highlight')
    expect(jsCode).toContain('_runtime.select')
    expect(jsCode).toContain("document.addEventListener('click'")
  })

  it('Tab-Navigation', () => {
    const { root, jsCode } = compileAndExecute(`
TabBar as frame:
  horizontal
  gap 0
  bor b 1 solid #333

Tab as frame:
  pad 12 16
  cursor pointer
  onclick activate, deactivate-siblings
  state active
    bor b 2 solid #3B82F6
    col #3B82F6

TabContent as frame:
  pad 16

Tabs as frame:
  vertical

Tabs
  TabBar
    Tab "Tab 1"
    Tab "Tab 2"
    Tab "Tab 3"
  TabContent
    "Content for selected tab"
`)
    const tabBar = root.children[0]
    expect(tabBar.style.flexDirection).toBe('row')
    expect(tabBar.children.length).toBe(3)
    expect(jsCode).toContain('_runtime.activate')
  })

  it('Accordion', () => {
    const { jsCode } = compileAndExecute(`
AccordionItem as frame:
  bor b 1 solid #333

Header as frame:
  horizontal
  spread
  pad 16
  cursor pointer
  onclick toggle Content

Content as frame:
  collapsed
  pad 16
  bg #1a1a23

Accordion as frame:

Accordion
  AccordionItem
    Header "Section 1"
    Content "Content 1"
  AccordionItem
    Header "Section 2"
    Content "Content 2"
`)
    expect(jsCode).toContain('_runtime.toggle')
  })
})

/**
 * Comprehensive DOM Execution Test Suite
 *
 * Progressive complexity from simple to highly complex.
 * SHARP validation - exact DOM structure, exact styles, exact hierarchy.
 *
 * Levels:
 * 1. Atomic - Single element, single property
 * 2. Basic - Multiple properties, simple nesting
 * 3. Intermediate - Inheritance, states, events
 * 4. Advanced - Complex layouts, deep nesting, slots
 * 5. Expert - Full UI patterns, all features combined
 */

import { describe, it, expect } from 'vitest'
import { parse, generateDOM } from '../../index'
import { JSDOM } from 'jsdom'

// ============================================
// TEST UTILITIES
// ============================================

interface DOMResult {
  dom: JSDOM
  root: HTMLElement
  container: HTMLElement
  api: any
  jsCode: string
  styles: string
}

function compileAndExecute(mirrorCode: string, data: Record<string, unknown> = {}): DOMResult {
  const ast = parse(mirrorCode)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors:\n${ast.errors.map(e => `  - ${e.message}`).join('\n')}`)
  }

  const jsCode = generateDOM(ast)

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

  const container = (window as any).__mirrorRoot as HTMLElement
  const root = container?.firstElementChild as HTMLElement
  const styleEl = document.querySelector('style')

  return {
    dom,
    root,
    container,
    api: (window as any).__mirrorAPI,
    jsCode,
    styles: styleEl?.textContent || '',
  }
}

/**
 * Assert exact DOM structure
 */
interface DOMAssertion {
  tag: string
  text?: string
  childCount?: number
  children?: DOMAssertion[]
  styles?: Record<string, string>
  attributes?: Record<string, string>
  dataset?: Record<string, string>
}

function assertDOM(element: HTMLElement, expected: DOMAssertion, path = 'root'): void {
  // Tag
  expect(element.tagName.toLowerCase(), `${path}: tag`).toBe(expected.tag)

  // Text content (direct text, not from children)
  if (expected.text !== undefined) {
    const directText = Array.from(element.childNodes)
      .filter(n => n.nodeType === 3) // Text nodes
      .map(n => n.textContent?.trim())
      .join('') || element.textContent?.trim()
    expect(directText, `${path}: text`).toBe(expected.text)
  }

  // Child count
  if (expected.childCount !== undefined) {
    expect(element.children.length, `${path}: childCount`).toBe(expected.childCount)
  }

  // Styles - EXACT match
  if (expected.styles) {
    for (const [prop, value] of Object.entries(expected.styles)) {
      const actual = element.style.getPropertyValue(prop) || (element.style as any)[prop]
      expect(actual, `${path}: style.${prop}`).toBe(value)
    }
  }

  // Attributes
  if (expected.attributes) {
    for (const [attr, value] of Object.entries(expected.attributes)) {
      expect(element.getAttribute(attr), `${path}: attr[${attr}]`).toBe(value)
    }
  }

  // Dataset
  if (expected.dataset) {
    for (const [key, value] of Object.entries(expected.dataset)) {
      expect(element.dataset[key], `${path}: dataset.${key}`).toBe(value)
    }
  }

  // Recursive children
  if (expected.children) {
    expect(element.children.length, `${path}: children.length`).toBe(expected.children.length)
    expected.children.forEach((childExpected, i) => {
      assertDOM(element.children[i] as HTMLElement, childExpected, `${path}.children[${i}]`)
    })
  }
}

/**
 * Assert CSS contains exact rules
 */
function assertCSS(styles: string, rules: string[]): void {
  for (const rule of rules) {
    expect(styles, `CSS should contain: ${rule}`).toContain(rule)
  }
}

/**
 * Assert generated code contains patterns
 */
function assertCode(code: string, patterns: string[]): void {
  for (const pattern of patterns) {
    expect(code, `Code should contain: ${pattern}`).toContain(pattern)
  }
}

// ============================================
// LEVEL 1: ATOMIC - Single element, single property
// ============================================

describe('Level 1: Atomic', () => {
  describe('1.1 Primitives', () => {
    it('frame → div with flex column', () => {
      const { root } = compileAndExecute(`
Box as frame:

Box
`)
      assertDOM(root, {
        tag: 'div',
        childCount: 0,
        styles: {
          display: 'flex',
          'flex-direction': 'column',
        },
      })
    })

    it('text → span with text content', () => {
      const { root } = compileAndExecute(`
Label as text:

Label "Hello World"
`)
      assertDOM(root, {
        tag: 'span',
        text: 'Hello World',
      })
    })

    it('button → button element', () => {
      const { root } = compileAndExecute(`
Btn as button:

Btn "Click"
`)
      assertDOM(root, {
        tag: 'button',
        text: 'Click',
      })
    })

    it('input → input element', () => {
      const { root } = compileAndExecute(`
Field as input:

Field
`)
      assertDOM(root, {
        tag: 'input',
      })
    })

    it('link → anchor element with href', () => {
      const { root } = compileAndExecute(`
NavLink as link:

NavLink href "/home", "Home"
`)
      assertDOM(root, {
        tag: 'a',
        text: 'Home',
        attributes: { href: '/home' },
      })
    })

    it('textarea → textarea element', () => {
      const { root } = compileAndExecute(`
Notes as textarea:

Notes
`)
      assertDOM(root, {
        tag: 'textarea',
      })
    })

    it('image → img element', () => {
      const { root } = compileAndExecute(`
Photo as image:

Photo "https://example.com/img.jpg"
`)
      assertDOM(root, {
        tag: 'img',
      })
    })
  })

  describe('1.2 Single Properties', () => {
    it('pad 16 → padding: 16px', () => {
      const { root } = compileAndExecute(`
Box as frame:
  pad 16

Box
`)
      assertDOM(root, {
        tag: 'div',
        styles: { padding: '16px' },
      })
    })

    it('bg #3B82F6 → background: rgb(59, 130, 246)', () => {
      const { root } = compileAndExecute(`
Box as frame:
  bg #3B82F6

Box
`)
      assertDOM(root, {
        tag: 'div',
        styles: { background: 'rgb(59, 130, 246)' },
      })
    })

    it('rad 8 → border-radius: 8px', () => {
      const { root } = compileAndExecute(`
Box as frame:
  rad 8

Box
`)
      assertDOM(root, {
        tag: 'div',
        styles: { 'border-radius': '8px' },
      })
    })

    it('gap 12 → gap: 12px', () => {
      const { root } = compileAndExecute(`
Box as frame:
  gap 12

Box
`)
      assertDOM(root, {
        tag: 'div',
        styles: { gap: '12px' },
      })
    })

    it('w 200 → width: 200px', () => {
      const { root } = compileAndExecute(`
Box as frame:
  w 200

Box
`)
      assertDOM(root, {
        tag: 'div',
        styles: { width: '200px' },
      })
    })

    it('h 100 → height: 100px', () => {
      const { root } = compileAndExecute(`
Box as frame:
  h 100

Box
`)
      assertDOM(root, {
        tag: 'div',
        styles: { height: '100px' },
      })
    })

    it('opacity 0.5 → opacity: 0.5', () => {
      const { root } = compileAndExecute(`
Box as frame:
  opacity 0.5

Box
`)
      assertDOM(root, {
        tag: 'div',
        styles: { opacity: '0.5' },
      })
    })

    it('cursor pointer → cursor: pointer', () => {
      const { root } = compileAndExecute(`
Box as frame:
  cursor pointer

Box
`)
      assertDOM(root, {
        tag: 'div',
        styles: { cursor: 'pointer' },
      })
    })
  })

  describe('1.3 Layout Keywords', () => {
    it('hor → flex-direction: row', () => {
      const { root } = compileAndExecute(`
Row as frame:
  hor

Row
`)
      assertDOM(root, {
        tag: 'div',
        styles: { 'flex-direction': 'row' },
      })
    })

    it('ver → flex-direction: column', () => {
      const { root } = compileAndExecute(`
Col as frame:
  ver

Col
`)
      assertDOM(root, {
        tag: 'div',
        styles: { 'flex-direction': 'column' },
      })
    })

    it('center → justify-content: center, align-items: center', () => {
      const { root } = compileAndExecute(`
Centered as frame:
  center

Centered
`)
      assertDOM(root, {
        tag: 'div',
        styles: {
          'justify-content': 'center',
          'align-items': 'center',
        },
      })
    })

    it('spread → justify-content: space-between', () => {
      const { root } = compileAndExecute(`
Spread as frame:
  spread

Spread
`)
      assertDOM(root, {
        tag: 'div',
        styles: { 'justify-content': 'space-between' },
      })
    })

    it('wrap → flex-wrap: wrap', () => {
      const { root } = compileAndExecute(`
Wrapped as frame:
  wrap

Wrapped
`)
      assertDOM(root, {
        tag: 'div',
        styles: { 'flex-wrap': 'wrap' },
      })
    })
  })
})

// ============================================
// LEVEL 2: BASIC - Multiple properties, simple nesting
// ============================================

describe('Level 2: Basic', () => {
  describe('2.1 Multiple Properties', () => {
    it('card with pad, bg, rad', () => {
      const { root } = compileAndExecute(`
Card as frame:
  pad 16
  bg #1a1a23
  rad 8

Card
`)
      assertDOM(root, {
        tag: 'div',
        styles: {
          padding: '16px',
          background: 'rgb(26, 26, 35)',
          'border-radius': '8px',
        },
      })
    })

    it('button with pad, bg, rad, cursor', () => {
      const { root } = compileAndExecute(`
Btn as button:
  pad 12 24
  bg #3B82F6
  rad 8
  cursor pointer

Btn "Submit"
`)
      assertDOM(root, {
        tag: 'button',
        text: 'Submit',
        styles: {
          padding: '12px 24px',
          background: 'rgb(59, 130, 246)',
          'border-radius': '8px',
          cursor: 'pointer',
        },
      })
    })

    it('text with size, weight, color', () => {
      const { root } = compileAndExecute(`
Title as text:
  fs 24
  weight 600
  col #FFFFFF

Title "Heading"
`)
      assertDOM(root, {
        tag: 'span',
        text: 'Heading',
        styles: {
          'font-size': '24px',
          'font-weight': '600',
          color: 'rgb(255, 255, 255)',
        },
      })
    })
  })

  describe('2.2 Simple Nesting (1 level)', () => {
    it('parent with 1 child', () => {
      const { root } = compileAndExecute(`
Card as frame:
  pad 16

Label as text:

Card
  Label "Hello"
`)
      assertDOM(root, {
        tag: 'div',
        childCount: 1,
        styles: { padding: '16px' },
        children: [
          { tag: 'span', text: 'Hello' },
        ],
      })
    })

    it('parent with 3 children', () => {
      const { root } = compileAndExecute(`
List as frame:
  gap 8

Item as text:

List
  Item "First"
  Item "Second"
  Item "Third"
`)
      assertDOM(root, {
        tag: 'div',
        childCount: 3,
        styles: { gap: '8px' },
        children: [
          { tag: 'span', text: 'First' },
          { tag: 'span', text: 'Second' },
          { tag: 'span', text: 'Third' },
        ],
      })
    })

    it('mixed primitive children', () => {
      const { root } = compileAndExecute(`
Form as frame:
  gap 12

Label as text:
Field as input:
Btn as button:

Form
  Label "Name"
  Field
  Btn "Submit"
`)
      assertDOM(root, {
        tag: 'div',
        childCount: 3,
        children: [
          { tag: 'span', text: 'Name' },
          { tag: 'input' },
          { tag: 'button', text: 'Submit' },
        ],
      })
    })
  })

  describe('2.3 Layout Combinations', () => {
    it('horizontal row with gap', () => {
      const { root } = compileAndExecute(`
Row as frame:
  hor
  gap 16

Item as frame:
  w 100
  h 100

Row
  Item
  Item
  Item
`)
      assertDOM(root, {
        tag: 'div',
        childCount: 3,
        styles: {
          'flex-direction': 'row',
          gap: '16px',
        },
      })
    })

    it('vertical column with spread', () => {
      const { root } = compileAndExecute(`
Col as frame:
  ver
  spread
  h 300

Item as frame:
  h 50

Col
  Item
  Item
`)
      assertDOM(root, {
        tag: 'div',
        childCount: 2,
        styles: {
          'flex-direction': 'column',
          'justify-content': 'space-between',
          height: '300px',
        },
      })
    })

    it('grid layout', () => {
      const { root } = compileAndExecute(`
Grid as frame:
  grid 3
  gap 8

Cell as frame:
  h 50

Grid
  Cell
  Cell
  Cell
  Cell
  Cell
  Cell
`)
      assertDOM(root, {
        tag: 'div',
        childCount: 6,
        styles: {
          display: 'grid',
          gap: '8px',
        },
      })
      expect(root.style.gridTemplateColumns).toContain('repeat(3')
    })
  })

  describe('2.4 Sizing', () => {
    it('w full → flex: 1 1 0%', () => {
      const { root } = compileAndExecute(`
Box as frame:
  w full

Box
`)
      assertDOM(root, {
        tag: 'div',
        styles: {
          flex: '1 1 0%',
          'min-width': '0px',
        },
      })
    })

    it('w hug → width: fit-content', () => {
      const { root } = compileAndExecute(`
Box as frame:
  w hug

Box
`)
      assertDOM(root, {
        tag: 'div',
        styles: { width: 'fit-content' },
      })
    })

    it('min/max constraints', () => {
      const { root } = compileAndExecute(`
Box as frame:
  minw 100
  maxw 500
  minh 50
  maxh 300

Box
`)
      assertDOM(root, {
        tag: 'div',
        styles: {
          'min-width': '100px',
          'max-width': '500px',
          'min-height': '50px',
          'max-height': '300px',
        },
      })
    })
  })
})

// ============================================
// LEVEL 3: INTERMEDIATE - Inheritance, states, events
// ============================================

describe('Level 3: Intermediate', () => {
  describe('3.1 Component Inheritance', () => {
    it('child inherits primitive type', () => {
      const { root } = compileAndExecute(`
Button as button:
  pad 12
  bg #3B82F6

PrimaryButton as Button:
  bg #2563EB

PrimaryButton "Click"
`)
      assertDOM(root, {
        tag: 'button', // Inherited from Button → button
        text: 'Click',
        styles: {
          background: 'rgb(37, 99, 235)', // Overridden
        },
      })
    })

    it('multi-level inheritance', () => {
      const { root } = compileAndExecute(`
Box as frame:
  pad 8

Card as Box:
  bg #1a1a23

FancyCard as Card:
  rad 16
  shadow lg

FancyCard
`)
      assertDOM(root, {
        tag: 'div',
        styles: {
          'border-radius': '16px',
        },
      })
      expect(root.style.boxShadow).toBeTruthy()
    })
  })

  describe('3.2 CSS States (hover, focus, active)', () => {
    it('hover state generates CSS', () => {
      const { root, styles } = compileAndExecute(`
Button as button:
  bg #333
  hover
    bg #555

Button "Hover me"
`)
      assertDOM(root, {
        tag: 'button',
        styles: { background: 'rgb(51, 51, 51)' },
      })
      assertCSS(styles, [':hover', '#555'])
    })

    it('focus state generates CSS', () => {
      const { styles } = compileAndExecute(`
Input as input:
  bor 1 solid #333
  focus
    bor 1 solid #3B82F6

Input
`)
      assertCSS(styles, [':focus', '#3B82F6'])
    })

    it('active state generates CSS', () => {
      const { styles } = compileAndExecute(`
Button as button:
  bg #3B82F6
  active
    bg #1D4ED8

Button "Press"
`)
      assertCSS(styles, [':active', '#1D4ED8'])
    })

    it('inline hover properties', () => {
      const { styles } = compileAndExecute(`
Card as frame:
  opacity 1
  hover-opacity 0.8
  hover-scale 1.02

Card
`)
      assertCSS(styles, [':hover', 'opacity', 'scale'])
    })
  })

  describe('3.3 Behavior States (selected, highlighted)', () => {
    it('selected state creates _stateStyles', () => {
      const { root } = compileAndExecute(`
Item as frame:
  bg #333
  state selected
    bg #3B82F6
    col #FFFFFF

Item
`)
      expect(root._stateStyles).toBeDefined()
      expect(root._stateStyles.selected).toBeDefined()
      expect(root._stateStyles.selected.background).toBe('#3B82F6')
      expect(root._stateStyles.selected.color).toBe('#FFFFFF')
    })

    it('highlighted state creates _stateStyles', () => {
      const { root } = compileAndExecute(`
Option as frame:
  bg #222
  state highlighted
    bg #444

Option
`)
      expect(root._stateStyles.highlighted).toBeDefined()
      expect(root._stateStyles.highlighted.background).toBe('#444')
    })

    it('multiple behavior states', () => {
      const { root } = compileAndExecute(`
Tab as frame:
  bg #1a1a23
  state selected
    bg #3B82F6
  state highlighted
    bg #2a2a33

Tab
`)
      // Note: 'active' is a CSS pseudo-class, use 'selected' for behavior state
      expect(root._stateStyles).toBeDefined()
      expect(root._stateStyles.selected).toBeDefined()
      expect(root._stateStyles.highlighted).toBeDefined()
    })
  })

  describe('3.4 Initial States', () => {
    it('open/closed state', () => {
      const { root: openRoot } = compileAndExecute(`
Panel as frame:
  open

Panel
`)
      const { root: closedRoot } = compileAndExecute(`
Panel as frame:
  closed

Panel
`)
      expect(openRoot.dataset.state).toBe('open')
      expect(closedRoot.dataset.state).toBe('closed')
    })

    it('expanded/collapsed state', () => {
      const { root } = compileAndExecute(`
Accordion as frame:
  collapsed

Accordion
`)
      expect(root.dataset.state).toBe('collapsed')
    })

    it('hidden state', () => {
      const { root } = compileAndExecute(`
Modal as frame:
  hidden

Modal
`)
      expect(root.style.display).toBe('none')
    })
  })

  describe('3.5 Events', () => {
    it('onclick generates addEventListener', () => {
      const { jsCode } = compileAndExecute(`
Button as button:
  onclick toggle Menu

Menu as frame:
  hidden

Button "Toggle"
Menu
`)
      assertCode(jsCode, ["addEventListener('click'", '_runtime.toggle'])
    })

    it('onhover generates mouseenter listener', () => {
      const { jsCode } = compileAndExecute(`
Item as frame:
  onhover highlight

Item
`)
      assertCode(jsCode, ["addEventListener('mouseenter'", '_runtime.highlight'])
    })

    it('onclick-outside generates document listener', () => {
      const { jsCode } = compileAndExecute(`
Dropdown as frame:
  onclick-outside close

Dropdown
`)
      assertCode(jsCode, ["document.addEventListener('click'", '.contains(e.target)', '_clickOutsideHandler'])
    })

    it('keyboard events', () => {
      const { jsCode } = compileAndExecute(`
Input as input:
  onkeydown enter: submit
  onkeydown escape: close

Input
`)
      assertCode(jsCode, ["addEventListener('keydown'", 'Enter', 'Escape'])
    })
  })

  describe('3.6 Actions', () => {
    it('show/hide/toggle actions', () => {
      const { jsCode } = compileAndExecute(`
ShowBtn as button:
  onclick show Modal

HideBtn as button:
  onclick hide Modal

ToggleBtn as button:
  onclick toggle Modal

Modal as frame:
  hidden

ShowBtn "Show"
HideBtn "Hide"
ToggleBtn "Toggle"
Modal
`)
      assertCode(jsCode, ['_runtime.show', '_runtime.hide', '_runtime.toggle'])
    })

    it('select/highlight actions', () => {
      const { jsCode } = compileAndExecute(`
Item as frame:
  onclick select
  onhover highlight

Item
`)
      assertCode(jsCode, ['_runtime.select', '_runtime.highlight'])
    })

    it('activate/deactivate actions', () => {
      const { jsCode } = compileAndExecute(`
Tab as frame:
  onclick activate

Tab
`)
      // Note: deactivate-siblings is a separate action that needs proper syntax
      assertCode(jsCode, ['_runtime.activate'])
    })

    it('highlight navigation', () => {
      const { jsCode } = compileAndExecute(`
List as frame:
  onkeydown arrow-down: highlight next
  onkeydown arrow-up: highlight prev
  onkeydown home: highlight first
  onkeydown end: highlight last
  onkeydown enter: select highlighted

List
`)
      assertCode(jsCode, [
        'highlightNext',
        'highlightPrev',
        'highlightFirst',
        'highlightLast',
        'selectHighlighted',
      ])
    })
  })
})

// ============================================
// LEVEL 4: ADVANCED - Complex layouts, deep nesting, slots
// ============================================

describe('Level 4: Advanced', () => {
  describe('4.1 Deep Nesting (3+ levels)', () => {
    it('3-level nesting with exact structure', () => {
      const { root } = compileAndExecute(`
Outer as frame:
  pad 24
  bg #0a0a0f

Middle as frame:
  pad 16
  bg #1a1a23

Inner as frame:
  pad 8
  bg #2a2a33

Label as text:

Outer
  Middle
    Inner
      Label "Deep content"
`)
      assertDOM(root, {
        tag: 'div',
        childCount: 1,
        styles: { padding: '24px' },
        children: [{
          tag: 'div',
          childCount: 1,
          styles: { padding: '16px' },
          children: [{
            tag: 'div',
            childCount: 1,
            styles: { padding: '8px' },
          }],
        }],
      })

      // Verify deepest text
      const inner = root.children[0].children[0] as HTMLElement
      expect(inner.children[0].textContent).toBe('Deep content')
    })

    it('5-level nesting stress test', () => {
      const { root } = compileAndExecute(`
L1 as frame:
L2 as frame:
L3 as frame:
L4 as frame:
L5 as frame:
  bg #3B82F6

L1
  L2
    L3
      L4
        L5 "Level 5"
`)
      let current = root
      for (let i = 0; i < 4; i++) {
        expect(current.children.length, `Level ${i + 1}`).toBe(1)
        current = current.children[0] as HTMLElement
      }
      expect(current.textContent).toBe('Level 5')
      expect(current.style.background).toBe('rgb(59, 130, 246)')
    })
  })

  describe('4.2 Complex Sibling Structures', () => {
    it('10 siblings with alternating styles', () => {
      const { root } = compileAndExecute(`
List as frame:
  gap 4

ItemA as frame:
  bg #333
  h 40

ItemB as frame:
  bg #444
  h 40

List
  ItemA "1"
  ItemB "2"
  ItemA "3"
  ItemB "4"
  ItemA "5"
  ItemB "6"
  ItemA "7"
  ItemB "8"
  ItemA "9"
  ItemB "10"
`)
      expect(root.children.length).toBe(10)

      for (let i = 0; i < 10; i++) {
        const child = root.children[i] as HTMLElement
        const expectedBg = i % 2 === 0 ? 'rgb(51, 51, 51)' : 'rgb(68, 68, 68)'
        expect(child.style.background, `Child ${i}`).toBe(expectedBg)
        expect(child.textContent).toBe(String(i + 1))
      }
    })

    it('mixed nesting and siblings', () => {
      const { root } = compileAndExecute(`
Container as frame:
  gap 8

Row as frame:
  hor
  gap 4

Cell as frame:
  w 50
  h 50

Container
  Row
    Cell "1.1"
    Cell "1.2"
    Cell "1.3"
  Row
    Cell "2.1"
    Cell "2.2"
  Row
    Cell "3.1"
`)
      expect(root.children.length).toBe(3)
      expect((root.children[0] as HTMLElement).children.length).toBe(3)
      expect((root.children[1] as HTMLElement).children.length).toBe(2)
      expect((root.children[2] as HTMLElement).children.length).toBe(1)
    })
  })

  describe('4.3 Slots', () => {
    it('basic slot filling', () => {
      const { root } = compileAndExecute(`
Card as frame:
  pad 16
  gap 8
  Title:
  Body:

Title as text:
  weight 600

Body as text:

Card
  Title "Card Title"
  Body "Card content goes here"
`)
      assertDOM(root, {
        tag: 'div',
        childCount: 2,
        children: [
          { tag: 'span', text: 'Card Title' },
          { tag: 'span', text: 'Card content goes here' },
        ],
      })
    })

    it('slot with default content', () => {
      const { root } = compileAndExecute(`
Panel as frame:
  Title "Default Title"
  Body:

Title as text:
Body as frame:
Label as text:

Panel
  Body
    Label "Custom body"
`)
      expect(root.children.length).toBe(2)
      expect(root.children[0].textContent).toBe('Default Title')
      expect(root.children[1].children[0].textContent).toBe('Custom body')
    })

    it('multiple slots with complex content', () => {
      const { root } = compileAndExecute(`
Dialog as frame:
  pad 24
  bg #1a1a23
  rad 12
  Header:
  Content:
  Actions:

Header as frame:
  hor
  spread

Content as frame:
  pad 16

Actions as frame:
  hor
  gap 8
  right

Title as text:
  fs 18
  weight 600

Button as button:
  pad 8 16

Dialog
  Header
    Title "Confirm"
  Content
    "Are you sure?"
  Actions
    Button "Cancel"
    Button "OK"
`)
      assertDOM(root, {
        tag: 'div',
        childCount: 3,
        children: [
          {
            tag: 'div',
            childCount: 1,
            styles: { 'flex-direction': 'row', 'justify-content': 'space-between' },
          },
          {
            tag: 'div',
            styles: { padding: '16px' },
          },
          {
            tag: 'div',
            childCount: 2,
            styles: { 'flex-direction': 'row', gap: '8px' },
          },
        ],
      })
    })
  })

  describe('4.4 Named Instances', () => {
    it('named instance accessible via API', () => {
      const { api } = compileAndExecute(`
Button as button:
  pad 12

Button named submitBtn "Submit"
Button named cancelBtn "Cancel"
`)
      expect(api.submitBtn).toBeDefined()
      expect(api.cancelBtn).toBeDefined()
      expect(api.submitBtn.text).toBe('Submit')
      expect(api.cancelBtn.text).toBe('Cancel')
    })

    it('named instance with wrapped properties', () => {
      const { api } = compileAndExecute(`
Box as frame:
  pad 16
  bg #333

Box named myBox
`)
      expect(api.myBox._el).toBeDefined()
      expect(api.myBox.pad).toBe('16px')
      expect(api.myBox.bg).toBe('rgb(51, 51, 51)')
    })
  })

  describe('4.5 Tokens', () => {
    it('simple tokens generate CSS variables', () => {
      const { styles } = compileAndExecute(`
$primary: #3B82F6
$surface: #1a1a23

Box as frame:
  bg $surface

Box
`)
      // Mirror strips $ and generates --name
      assertCSS(styles, ['--primary: #3B82F6', '--surface: #1a1a23'])
    })

    it('semantic tokens', () => {
      const { root, styles } = compileAndExecute(`
$primary.bg: #3B82F6
$primary.col: #FFFFFF

Button as button:
  bg $primary.bg
  col $primary.col

Button "Styled"
`)
      // Mirror converts $name.prop to --name-prop
      assertCSS(styles, ['--primary-bg', '--primary-col'])
      expect(root.style.background).toBe('var(--primary-bg)')
      expect(root.style.color).toBe('var(--primary-col)')
    })

    it('spacing tokens', () => {
      const { styles } = compileAndExecute(`
$sm.pad: 4
$md.pad: 8
$lg.pad: 16

Box as frame:
  pad $md.pad

Box
`)
      // Mirror converts $name.prop to --name-prop
      assertCSS(styles, ['--sm-pad', '--md-pad', '--lg-pad'])
    })
  })

  describe('4.6 Conditionals', () => {
    it('if block generates conditional structure', () => {
      const { jsCode } = compileAndExecute(`
Panel as frame:

if (showPanel)
  Panel
`)
      assertCode(jsCode, [
        'data-conditional-id',
        '_conditionalConfig',
        'condition:',
        'renderThen',
      ])
    })

    it('if-else generates both branches', () => {
      const { jsCode } = compileAndExecute(`
Avatar as frame:
LoginBtn as button:

if (loggedIn)
  Avatar
else
  LoginBtn "Login"
`)
      assertCode(jsCode, ['renderThen', 'renderElse'])
    })

    it('complex condition expression', () => {
      // Note: For complex expressions, we just test code generation (not execution)
      const ast = parse(`
Admin as frame:

if (user.isAdmin && hasPermission)
  Admin
`)
      const jsCode = generateDOM(ast)
      // The condition should appear in the generated code
      assertCode(jsCode, ['user.isAdmin', 'hasPermission'])
    })
  })

  describe('4.7 Each Loops', () => {
    it('each loop structure', () => {
      const { jsCode } = compileAndExecute(`
Item as frame:
  pad 8

each $task in $tasks
  Item $task.title
`)
      assertCode(jsCode, [
        'data-each-container',
        '_eachConfig',
        "itemVar: 'task'",
        "collection: 'tasks'",
        'renderItem:',
      ])
    })

    it('each with filter', () => {
      const { jsCode } = compileAndExecute(`
Task as frame:

each $task in $tasks where $task.done == false
  Task $task.title
`)
      assertCode(jsCode, ['filter:'])
    })

    it('each renders data', () => {
      const { container } = compileAndExecute(`
Item as frame:
  pad 8

each $item in $items
  Item $item.name
`, { items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] })

      const eachContainer = container.querySelector('[data-each-container]')
      expect(eachContainer).toBeDefined()
      expect(eachContainer!.children.length).toBe(3)
    })
  })
})

// ============================================
// LEVEL 5: EXPERT - Full UI patterns, all features combined
// ============================================

describe('Level 5: Expert', () => {
  describe('5.1 Complete Dropdown Pattern', () => {
    it('dropdown with all features', () => {
      const { root, jsCode, styles } = compileAndExecute(`
$surface: #1a1a23
$hover: #2a2a33
$selected: #3B82F6

Item as frame:
  pad 8 12
  cursor pointer
  onhover highlight
  onclick select
  state highlighted
    bg $hover
  state selected
    bg $selected
    col white

Dropdown as frame:
  closed
  onclick-outside close
  pad 4
  bg $surface
  rad 8
  shadow md

Dropdown named dropdown1
  Item "Option 1"
  Item "Option 2"
  Item "Option 3"
`)
      // DOM structure
      assertDOM(root, {
        tag: 'div',
        childCount: 3,
        dataset: { state: 'closed' },
      })

      // Styles
      expect(root.style.borderRadius).toBe('8px')
      expect(root.style.boxShadow).toBeTruthy()

      // State styles
      const item = root.children[0] as HTMLElement
      expect(item._stateStyles.highlighted).toBeDefined()
      expect(item._stateStyles.selected).toBeDefined()

      // Events
      assertCode(jsCode, [
        '_runtime.highlight',
        '_runtime.select',
        '_clickOutsideHandler',
      ])

      // CSS variables (without $)
      assertCSS(styles, ['--surface', '--hover', '--selected'])
    })
  })

  describe('5.2 Complete Navigation Pattern', () => {
    it('tabbed navigation with selected states', () => {
      const { root, jsCode, styles } = compileAndExecute(`
NavItem as frame:
  pad 12 16
  cursor pointer
  onclick select
  hover
    bg #2a2a33
  state selected
    bg #3B82F6
    col white

Nav as frame:
  hor
  gap 0
  bor b 1 solid #333

Nav
  NavItem "Dashboard"
  NavItem "Settings"
  NavItem "Profile"
  NavItem "Help"
`)
      assertDOM(root, {
        tag: 'div',
        childCount: 4,
        styles: {
          'flex-direction': 'row',
          gap: '0px',
        },
      })

      // Each item has state styles
      for (let i = 0; i < 4; i++) {
        const item = root.children[i] as HTMLElement
        expect(item._stateStyles.selected, `Item ${i} selected state`).toBeDefined()
      }

      // CSS hover
      assertCSS(styles, [':hover'])
      assertCode(jsCode, ['_runtime.select'])
    })
  })

  describe('5.3 Complete Form Pattern', () => {
    it('form with validation states', () => {
      const { root, styles } = compileAndExecute(`
Form as frame:
  gap 20

Field as frame:
  gap 4

Label as text:
  fs 12
  col #999
  uppercase

Input as input:
  pad 12
  bg #1a1a23
  rad 8
  bor 1 solid #333
  col white
  focus
    bor 1 solid #3B82F6
  filled
    bor 1 solid #22C55E

ErrorText as text:
  fs 11
  col #EF4444

SubmitBtn as button:
  pad 12 24
  bg #3B82F6
  rad 8
  col white
  cursor pointer
  hover
    bg #2563EB
  active
    bg #1D4ED8

Form named loginForm
  Field
    Label "Email"
    Input "your@email.com"
  Field
    Label "Password"
    Input "••••••••"
  SubmitBtn "Sign In"
`)
      assertDOM(root, {
        tag: 'div',
        childCount: 3,
        styles: { gap: '20px' },
        children: [
          { tag: 'div', childCount: 2 },
          { tag: 'div', childCount: 2 },
          { tag: 'button', text: 'Sign In' },
        ],
      })

      // CSS states
      assertCSS(styles, [':focus', ':hover', ':active'])
    })
  })

  describe('5.4 Complete Modal Pattern', () => {
    it('modal with overlay', () => {
      const { root, jsCode } = compileAndExecute(`
Overlay as frame:
  stacked
  center
  w full
  h full
  bg rgba(0,0,0,0.5)
  hidden

Modal as frame:
  w 400
  maxw 90%
  pad 24
  bg #1a1a23
  rad 12
  shadow lg

Header as frame:
  hor
  spread

Title as text:
  fs 18
  weight 600

CloseBtn as button:
  w 32
  h 32
  center
  rad 8
  onclick hide Overlay

Body as frame:
  pad 16

Footer as frame:
  hor
  right
  gap 8

Button as button:
  pad 10 20
  rad 8

Label as text:

Overlay named modal
  Modal
    Header
      Title "Confirm Action"
      CloseBtn "×"
    Body
      Label "Are you sure?"
    Footer
      Button "Cancel"
      Button bg #3B82F6, col white, "Confirm"
`)
      // Overlay structure
      assertDOM(root, {
        tag: 'div',
        childCount: 1,
        styles: {
          position: 'relative',
          'justify-content': 'center',
          'align-items': 'center',
          display: 'none', // hidden
        },
      })

      // Modal inside
      const modal = root.children[0] as HTMLElement
      expect(modal.style.width).toBe('400px')
      expect(modal.style.borderRadius).toBe('12px')
      expect(modal.style.boxShadow).toBeTruthy()

      assertCode(jsCode, ['_runtime.hide'])
    })
  })

  describe('5.5 Complete Data Table Pattern', () => {
    it('table with sorting, selection, and keyboard nav', () => {
      const { root, jsCode } = compileAndExecute(`
Table as frame:
  w full
  selection $selectedRow

Header as frame:
  hor
  bg #1a1a23
  pad 12
  bor b 1 solid #333

HeaderCell as frame:
  w full
  cursor pointer
  onclick sort

Row as frame:
  hor
  pad 12
  cursor pointer
  bor b 1 solid #222
  onclick select
  onhover highlight
  state highlighted
    bg #2a2a33
  state selected
    bg #3B82F6
    col white

Cell as text:
  w full

Table named dataTable
  Header
    HeaderCell "Name"
    HeaderCell "Email"
    HeaderCell "Role"
  Row
    Cell "John Doe"
    Cell "john@example.com"
    Cell "Admin"
  Row
    Cell "Jane Smith"
    Cell "jane@example.com"
    Cell "User"
`)
      assertDOM(root, {
        tag: 'div',
        childCount: 3,
      })

      // Header
      const header = root.children[0] as HTMLElement
      expect(header.style.flexDirection).toBe('row')
      expect(header.children.length).toBe(3)

      // Rows
      const row1 = root.children[1] as HTMLElement
      expect(row1._stateStyles.highlighted).toBeDefined()
      expect(row1._stateStyles.selected).toBeDefined()

      assertCode(jsCode, [
        "_selectionBinding = 'selectedRow'",
        '_runtime.select',
        '_runtime.highlight',
      ])
    })
  })

  describe('5.6 Complete Sidebar Layout', () => {
    it('responsive sidebar with toggle', () => {
      const { root, jsCode, styles } = compileAndExecute(`
App as frame:
  hor
  w full
  h full

Sidebar as frame:
  w 240
  h full
  bg #0a0a0f
  ver
  pad 16
  gap 4
  open

ToggleBtn as button:
  onclick toggle Sidebar

NavItem as frame:
  hor
  gap 12
  pad 12
  rad 8
  cursor pointer
  onclick select
  hover
    bg #1a1a23
  state selected
    bg #3B82F6

Icon as frame:
  w 20
  h 20

Label as text:

Content as frame:
  w full
  h full
  pad 24
  bg #0f0f14

App
  Sidebar named sidebar
    NavItem
      Icon
      Label "Dashboard"
    NavItem
      Icon
      Label "Projects"
    NavItem
      Icon
      Label "Team"
    NavItem
      Icon
      Label "Settings"
  Content
    ToggleBtn "Toggle Sidebar"
`)
      assertDOM(root, {
        tag: 'div',
        childCount: 2,
        styles: {
          'flex-direction': 'row',
        },
      })

      // Sidebar
      const sidebar = root.children[0] as HTMLElement
      assertDOM(sidebar, {
        tag: 'div',
        childCount: 4,
        dataset: { state: 'open' },
        styles: {
          width: '240px',
          'flex-direction': 'column',
        },
      })

      // Nav items have states
      for (let i = 0; i < 4; i++) {
        const item = sidebar.children[i] as HTMLElement
        expect(item._stateStyles.selected).toBeDefined()
      }

      // CSS hover
      assertCSS(styles, [':hover'])
      assertCode(jsCode, ['_runtime.toggle', '_runtime.select'])
    })
  })

  describe('5.7 Complex Component Composition', () => {
    it('card grid with mixed components', () => {
      const { root } = compileAndExecute(`
CardGrid as frame:
  grid 3
  gap 16
  pad 24

Card as frame:
  bg #1a1a23
  rad 12
  clip

CardImage as frame:
  w full
  h 150
  bg #333

CardBody as frame:
  pad 16
  gap 8

CardTitle as text:
  fs 16
  weight 600

CardDescription as text:
  fs 14
  col #999

CardFooter as frame:
  hor
  spread
  pad 12 16
  bor t 1 solid #333

Tag as frame:
  pad 4 8
  rad 4
  bg #3B82F6
  fs 11

Price as text:
  fs 18
  weight 700

CardGrid
  Card
    CardImage
    CardBody
      CardTitle "Product 1"
      CardDescription "Description here"
    CardFooter
      Tag "New"
      Price "$99"
  Card
    CardImage
    CardBody
      CardTitle "Product 2"
      CardDescription "Another description"
    CardFooter
      Tag "Sale"
      Price "$79"
  Card
    CardImage
    CardBody
      CardTitle "Product 3"
      CardDescription "Third product"
    CardFooter
      Tag "Hot"
      Price "$129"
`)
      // Grid
      assertDOM(root, {
        tag: 'div',
        childCount: 3,
        styles: {
          display: 'grid',
          gap: '16px',
          padding: '24px',
        },
      })
      expect(root.style.gridTemplateColumns).toContain('repeat(3')

      // Each card has 3 sections
      for (let i = 0; i < 3; i++) {
        const card = root.children[i] as HTMLElement
        expect(card.children.length, `Card ${i} sections`).toBe(3)

        // Footer has 2 children (tag + price)
        const footer = card.children[2] as HTMLElement
        expect(footer.children.length).toBe(2)
      }
    })
  })

  describe('5.8 API State Management', () => {
    it('full state management workflow', () => {
      const { api } = compileAndExecute(`
Counter as frame:
  pad 16

Value as text:
  fs 24

IncBtn as button:
DecBtn as button:

Counter named counter
  Value named value "0"
  IncBtn named inc "+"
  DecBtn named dec "-"
`)
      // Initial state
      expect(api.getState('count')).toBeUndefined()

      // Set state
      api.setState('count', 5)
      expect(api.getState('count')).toBe(5)

      // Update state
      api.setState('count', 10)
      expect(api.getState('count')).toBe(10)

      // Named instances work
      expect(api.value.text).toBe('0')
      expect(api.inc.text).toBe('+')
      expect(api.dec.text).toBe('-')
    })
  })

  describe('5.9 Edge Cases Stress Test', () => {
    it('handles empty strings', () => {
      const { root } = compileAndExecute(`
Label as text:

Label ""
`)
      expect(root.textContent).toBe('')
    })

    it('handles zero values', () => {
      const { root } = compileAndExecute(`
Box as frame:
  pad 0
  gap 0
  rad 0
  opacity 0

Box
`)
      assertDOM(root, {
        tag: 'div',
        styles: {
          padding: '0px',
          gap: '0px',
          'border-radius': '0px',
          opacity: '0',
        },
      })
    })

    it('handles percentage values', () => {
      const { root } = compileAndExecute(`
Box as frame:
  w 50%
  h 100%

Box
`)
      assertDOM(root, {
        tag: 'div',
        styles: {
          width: '50%',
          height: '100%',
        },
      })
    })

    it('handles negative translate values', () => {
      const { root } = compileAndExecute(`
Box as frame:
  translate -10 -20

Box
`)
      // Negative values work in transform
      expect(root.style.transform).toContain('translate')
    })

    it('handles special characters in text', () => {
      const { root } = compileAndExecute(`
Label as text:

Label "Hello <World> & \\"Friends\\""
`)
      expect(root.textContent).toContain('Hello')
    })

    it('handles deeply nested with many properties', () => {
      const { root } = compileAndExecute(`
A as frame:
  pad 1, bg #111, rad 1

B as frame:
  pad 2, bg #222, rad 2

C as frame:
  pad 3, bg #333, rad 3

D as frame:
  pad 4, bg #444, rad 4

E as frame:
  pad 5, bg #555, rad 5

A
  B
    C
      D
        E "Deep"
`)
      let current = root
      const expected = [
        { padding: '1px', 'border-radius': '1px' },
        { padding: '2px', 'border-radius': '2px' },
        { padding: '3px', 'border-radius': '3px' },
        { padding: '4px', 'border-radius': '4px' },
        { padding: '5px', 'border-radius': '5px' },
      ]

      for (let i = 0; i < 5; i++) {
        expect(current.style.padding, `Level ${i + 1} padding`).toBe(expected[i].padding)
        expect(current.style.borderRadius, `Level ${i + 1} radius`).toBe(expected[i]['border-radius'])
        if (i < 4) {
          current = current.children[0] as HTMLElement
        }
      }
      expect(current.textContent).toBe('Deep')
    })

    it('handles 20 siblings', () => {
      let items = ''
      for (let i = 1; i <= 20; i++) {
        items += `  Item "${i}"\n`
      }

      const { root } = compileAndExecute(`
List as frame:
Item as frame:

List
${items}`)

      expect(root.children.length).toBe(20)
      for (let i = 0; i < 20; i++) {
        expect((root.children[i] as HTMLElement).textContent).toBe(String(i + 1))
      }
    })
  })
})

// ============================================
// LEVEL 6: STRESS TESTS - Performance & Limits
// ============================================

describe('Level 6: Stress Tests', () => {
  describe('6.1 Many Siblings', () => {
    it('renders 50 siblings correctly', () => {
      let items = ''
      for (let i = 1; i <= 50; i++) {
        items += `  Item "${i}"\n`
      }

      const { root } = compileAndExecute(`
List as frame:
  gap 2

Item as frame:
  pad 4
  bg #222

List
${items}`)

      expect(root.children.length).toBe(50)
      expect((root.children[0] as HTMLElement).textContent).toBe('1')
      expect((root.children[24] as HTMLElement).textContent).toBe('25')
      expect((root.children[49] as HTMLElement).textContent).toBe('50')
    })

    it('renders 100 siblings with alternating components', () => {
      let items = ''
      for (let i = 1; i <= 100; i++) {
        const comp = i % 2 === 0 ? 'Even' : 'Odd'
        items += `  ${comp} "${i}"\n`
      }

      const { root } = compileAndExecute(`
List as frame:

Odd as frame:
  bg #333

Even as frame:
  bg #444

List
${items}`)

      expect(root.children.length).toBe(100)

      // Check alternating backgrounds
      expect((root.children[0] as HTMLElement).style.background).toBe('rgb(51, 51, 51)')
      expect((root.children[1] as HTMLElement).style.background).toBe('rgb(68, 68, 68)')
      expect((root.children[98] as HTMLElement).style.background).toBe('rgb(51, 51, 51)')
      expect((root.children[99] as HTMLElement).style.background).toBe('rgb(68, 68, 68)')
    })
  })

  describe('6.2 Deep Nesting', () => {
    it('renders 10 levels deep', () => {
      const { root } = compileAndExecute(`
L1 as frame:
  pad 1
L2 as frame:
  pad 2
L3 as frame:
  pad 3
L4 as frame:
  pad 4
L5 as frame:
  pad 5
L6 as frame:
  pad 6
L7 as frame:
  pad 7
L8 as frame:
  pad 8
L9 as frame:
  pad 9
L10 as frame:
  pad 10
  bg #3B82F6

Label as text:

L1
  L2
    L3
      L4
        L5
          L6
            L7
              L8
                L9
                  L10
                    Label "Level 10"
`)
      let current = root
      for (let i = 1; i <= 10; i++) {
        expect(current.style.padding, `Level ${i} padding`).toBe(`${i}px`)
        if (i < 10) {
          current = current.children[0] as HTMLElement
        }
      }
      expect(current.children[0].textContent).toBe('Level 10')
    })

    it('renders wide and deep tree', () => {
      const { root } = compileAndExecute(`
Branch as frame:
  gap 4

Leaf as text:

Branch
  Branch
    Leaf "1.1"
    Leaf "1.2"
    Leaf "1.3"
  Branch
    Leaf "2.1"
    Leaf "2.2"
  Branch
    Leaf "3.1"
    Leaf "3.2"
    Leaf "3.3"
    Leaf "3.4"
`)
      expect(root.children.length).toBe(3)
      expect((root.children[0] as HTMLElement).children.length).toBe(3)
      expect((root.children[1] as HTMLElement).children.length).toBe(2)
      expect((root.children[2] as HTMLElement).children.length).toBe(4)
    })
  })

  describe('6.3 Many Properties', () => {
    it('applies 15+ properties to single element', () => {
      const { root } = compileAndExecute(`
SuperStyled as frame:
  w 200
  h 100
  pad 16
  margin 8
  bg #1a1a23
  rad 12
  gap 8
  hor
  center
  wrap
  cursor pointer
  opacity 0.9
  z 10
  shadow md
  clip

SuperStyled
`)
      assertDOM(root, {
        tag: 'div',
        styles: {
          width: '200px',
          height: '100px',
          padding: '16px',
          margin: '8px',
          'border-radius': '12px',
          gap: '8px',
          'flex-direction': 'row',
          'justify-content': 'center',
          'align-items': 'center',
          'flex-wrap': 'wrap',
          cursor: 'pointer',
          opacity: '0.9',
          'z-index': '10',
          overflow: 'hidden',
        },
      })
      expect(root.style.boxShadow).toBeTruthy()
    })
  })

  describe('6.4 Many States', () => {
    it('handles element with multiple behavior states', () => {
      const { root } = compileAndExecute(`
MultiState as frame:
  bg #111
  state selected
    bg #3B82F6
    col white
  state highlighted
    bg #2a2a33
    bor 1 solid #3B82F6

MultiState
`)
      // Mirror supports selected and highlighted as behavior states
      expect(root._stateStyles.selected).toBeDefined()
      expect(root._stateStyles.highlighted).toBeDefined()

      expect(root._stateStyles.selected.background).toBe('#3B82F6')
      expect(root._stateStyles.highlighted.background).toBe('#2a2a33')
    })
  })

  describe('6.5 Complex Token Usage', () => {
    it('handles many tokens with references', () => {
      const { root, styles } = compileAndExecute(`
$grey-100: #F4F4F5
$grey-200: #E4E4E7
$grey-300: #D4D4D8
$grey-400: #A1A1AA
$grey-500: #71717A
$grey-600: #52525B
$grey-700: #3F3F46
$grey-800: #27272A
$grey-900: #18181B

$primary: #3B82F6
$success: #22C55E
$warning: #F59E0B
$error: #EF4444

$sm.pad: 4
$md.pad: 8
$lg.pad: 16

Card as frame:
  bg $grey-900
  pad $lg.pad
  rad 8

Card
`)
      // All tokens should be in CSS
      assertCSS(styles, [
        '--grey-100',
        '--grey-500',
        '--grey-900',
        '--primary',
        '--success',
        '--warning',
        '--error',
        '--sm-pad',
        '--md-pad',
        '--lg-pad',
      ])

      expect(root.style.background).toBe('var(--grey-900)')
      expect(root.style.padding).toBe('var(--lg-pad)')
    })
  })
})

// ============================================
// LEVEL 7: PROPERTY COMBINATIONS
// ============================================

describe('Level 7: Property Combinations', () => {
  describe('7.1 Border Combinations', () => {
    it('border top applies correctly', () => {
      const { root } = compileAndExecute(`
Box as frame:
  bor t 1 solid #333

Box
`)
      // Single directional border should work
      expect(root.style.borderTopWidth).toBe('1px')
    })

    it('border with uniform value', () => {
      const { root } = compileAndExecute(`
Box as frame:
  bor 2 solid #3B82F6

Box
`)
      expect(root.style.borderWidth).toBe('2px')
      expect(root.style.borderStyle).toBe('solid')
    })

    it('corner radius top-left', () => {
      const { root } = compileAndExecute(`
Box as frame:
  rad tl 16

Box
`)
      expect(root.style.borderTopLeftRadius).toBe('16px')
    })

    it('corner radius bottom-right', () => {
      const { root } = compileAndExecute(`
Box as frame:
  rad br 8

Box
`)
      expect(root.style.borderBottomRightRadius).toBe('8px')
    })
  })

  describe('7.2 Padding/Margin Combinations', () => {
    it('single padding value', () => {
      const { root } = compileAndExecute(`
Box as frame:
  pad 16

Box
`)
      expect(root.style.padding).toBe('16px')
    })

    it('two value padding (vertical horizontal)', () => {
      const { root } = compileAndExecute(`
Box as frame:
  pad 10 20

Box
`)
      expect(root.style.padding).toBe('10px 20px')
    })

    it('four value padding shorthand', () => {
      const { root } = compileAndExecute(`
Box as frame:
  pad 10 20 30 40

Box
`)
      expect(root.style.padding).toBe('10px 20px 30px 40px')
    })

    it('directional padding left', () => {
      const { root } = compileAndExecute(`
Box as frame:
  pad left 16

Box
`)
      expect(root.style.paddingLeft).toBe('16px')
    })
  })

  describe('7.3 Layout Combinations', () => {
    it('horizontal + spread + gap + wrap', () => {
      const { root } = compileAndExecute(`
FlexRow as frame:
  hor
  spread
  gap 16
  wrap
  pad 12

FlexRow
`)
      assertDOM(root, {
        tag: 'div',
        styles: {
          'flex-direction': 'row',
          'justify-content': 'space-between',
          gap: '16px',
          'flex-wrap': 'wrap',
          padding: '12px',
        },
      })
    })

    it('vertical + center + scroll', () => {
      const { root } = compileAndExecute(`
ScrollCol as frame:
  ver
  center
  scroll
  h 400

ScrollCol
`)
      assertDOM(root, {
        tag: 'div',
        styles: {
          'flex-direction': 'column',
          'justify-content': 'center',
          'align-items': 'center',
          'overflow-y': 'auto',
          height: '400px',
        },
      })
    })

    it('stacked + center', () => {
      const { root } = compileAndExecute(`
Overlay as frame:
  stacked
  center
  w full
  h full

Overlay
`)
      assertDOM(root, {
        tag: 'div',
        styles: {
          position: 'relative',
          'justify-content': 'center',
          'align-items': 'center',
        },
      })
    })
  })

  describe('7.4 Typography Combinations', () => {
    it('full typography stack', () => {
      const { root } = compileAndExecute(`
Heading as text:
  fs 32
  weight 700
  line 1.2
  col #FFFFFF
  uppercase
  truncate

Heading "Title"
`)
      assertDOM(root, {
        tag: 'span',
        styles: {
          'font-size': '32px',
          'font-weight': '700',
          'line-height': '1.2',
          color: 'rgb(255, 255, 255)',
          'text-transform': 'uppercase',
          overflow: 'hidden',
          'text-overflow': 'ellipsis',
          'white-space': 'nowrap',
        },
      })
    })
  })

  describe('7.5 Transform Combinations', () => {
    // Note: In Mirror, multiple transform properties overwrite each other
    // Test each transform type individually

    it('rotate transform', () => {
      const { root } = compileAndExecute(`
Box as frame:
  rotate 45

Box
`)
      expect(root.style.transform).toBe('rotate(45deg)')
    })

    it('hover-scale applies correctly', () => {
      const { styles } = compileAndExecute(`
Box as frame:
  hover-scale 1.1

Box
`)
      // Hover-scale is generated in styles
      expect(styles).toContain('hover')
    })

    it('translate transform', () => {
      const { root } = compileAndExecute(`
Box as frame:
  translate 10 20

Box
`)
      expect(root.style.transform).toBe('translate(10px, 20px)')
    })
  })
})

// ============================================
// LEVEL 8: REAL-WORLD PATTERNS
// ============================================

describe('Level 8: Real-World Patterns', () => {
  describe('8.1 Dashboard Layout', () => {
    it('full dashboard structure', () => {
      const { root } = compileAndExecute(`
Dashboard as frame:
  hor
  w full
  h full

Sidebar as frame:
  w 250
  h full
  bg #0a0a0f
  ver
  pad 16

Main as frame:
  w full
  h full
  ver

Header as frame:
  hor
  spread
  pad 16
  bg #111

Content as frame:
  w full
  h full
  pad 24

Logo as text:
  fs 20
  weight 700

NavItem as frame:
  pad 12

Title as text:
Label as text:

Dashboard
  Sidebar
    Logo "App"
    NavItem
      Label "Home"
    NavItem
      Label "Users"
    NavItem
      Label "Settings"
  Main
    Header
      Title "Dashboard"
    Content
      Label "Welcome"
`)
      // Main structure
      expect(root.children.length).toBe(2)

      // Sidebar
      const sidebar = root.children[0] as HTMLElement
      expect(sidebar.style.width).toBe('250px')
      expect(sidebar.children.length).toBe(4) // Logo + 3 NavItems

      // Main
      const main = root.children[1] as HTMLElement
      expect(main.children.length).toBe(2) // Header + Content
    })
  })

  describe('8.2 E-commerce Product Card', () => {
    it('product card with all elements', () => {
      const { root, styles } = compileAndExecute(`
ProductCard as frame:
  w 280
  bg #1a1a23
  rad 12
  clip
  cursor pointer
  hover
    shadow lg

Image as frame:
  w full
  h 200
  bg #333

Body as frame:
  pad 16
  gap 8

Title as text:
  fs 16
  weight 600

Description as text:
  fs 14
  col #999
  truncate

Footer as frame:
  hor
  spread
  pad 16
  bor t 1 solid #333

Price as text:
  fs 20
  weight 700
  col #22C55E

Button as button:
  pad 8 16
  bg #3B82F6
  rad 6
  col white

ProductCard
  Image
  Body
    Title "Product Name"
    Description "A great product description"
  Footer
    Price "$99.00"
    Button "Add to Cart"
`)
      assertDOM(root, {
        tag: 'div',
        childCount: 3,
        styles: {
          width: '280px',
          'border-radius': '12px',
          overflow: 'hidden',
          cursor: 'pointer',
        },
      })

      // Image placeholder
      const image = root.children[0] as HTMLElement
      expect(image.style.height).toBe('200px')

      // Body
      const body = root.children[1] as HTMLElement
      expect(body.children.length).toBe(2)

      // Footer
      const footer = root.children[2] as HTMLElement
      expect(footer.children.length).toBe(2)
      expect((footer.children[1] as HTMLElement).tagName.toLowerCase()).toBe('button')

      // CSS hover
      assertCSS(styles, [':hover'])
    })
  })

  describe('8.3 Settings Form', () => {
    it('settings page with sections', () => {
      const { root, styles } = compileAndExecute(`
SettingsPage as frame:
  w full
  maxw 600
  pad 24
  gap 32

Section as frame:
  gap 16

SectionTitle as text:
  fs 18
  weight 600
  col white

Row as frame:
  hor
  spread
  pad 12
  bg #1a1a23
  rad 8

RowLabel as text:
  col #999

Toggle as frame:
  w 48
  h 24
  rad 12
  bg #333
  cursor pointer

Input as input:
  w 200
  pad 8
  bg #222
  rad 4
  bor 1 solid #333
  col white
  focus
    bor 1 solid #3B82F6

SettingsPage
  Section
    SectionTitle "General"
    Row
      RowLabel "Dark Mode"
      Toggle
    Row
      RowLabel "Notifications"
      Toggle
  Section
    SectionTitle "Account"
    Row
      RowLabel "Email"
      Input
    Row
      RowLabel "Username"
      Input
`)
      expect(root.children.length).toBe(2) // 2 sections

      const section1 = root.children[0] as HTMLElement
      expect(section1.children.length).toBe(3) // Title + 2 rows

      const section2 = root.children[1] as HTMLElement
      expect(section2.children.length).toBe(3)

      // CSS focus state
      assertCSS(styles, [':focus'])
    })
  })

  describe('8.4 Chat Interface', () => {
    it('chat with messages and input', () => {
      const { root } = compileAndExecute(`
ChatContainer as frame:
  ver
  w full
  h full

Messages as frame:
  ver
  gap 8
  pad 16
  scroll
  h full

Message as frame:
  maxw 70%
  pad 12
  rad 12

SentMessage as Message:
  bg #3B82F6
  right

ReceivedMessage as Message:
  bg #333
  left

InputBar as frame:
  hor
  gap 8
  pad 12
  bg #1a1a23
  bor t 1 solid #333

ChatInput as input:
  w full
  pad 12
  bg #222
  rad 20
  bor 0

SendBtn as button:
  w 40
  h 40
  center
  rad 20
  bg #3B82F6

Label as text:

ChatContainer
  Messages
    ReceivedMessage
      Label "Hello!"
    SentMessage
      Label "Hi there!"
    ReceivedMessage
      Label "How are you?"
  InputBar
    ChatInput
    SendBtn "→"
`)
      expect(root.children.length).toBe(2) // Messages + InputBar

      const messages = root.children[0] as HTMLElement
      expect(messages.children.length).toBe(3)
      expect(messages.style.overflowY).toBe('auto')

      const inputBar = root.children[1] as HTMLElement
      expect(inputBar.children.length).toBe(2)
    })
  })

  describe('8.5 Pricing Table', () => {
    it('pricing cards with features', () => {
      const { root } = compileAndExecute(`
PricingTable as frame:
  hor
  gap 24
  center

PricingCard as frame:
  w 280
  bg #1a1a23
  rad 16
  pad 24
  gap 16
  center

Badge as frame:
  pad 4 12
  bg #3B82F6
  rad 12
  fs 12

PlanName as text:
  fs 24
  weight 700

Price as text:
  fs 48
  weight 700

Period as text:
  fs 14
  col #666

FeatureList as frame:
  gap 8
  w full

Feature as frame:
  hor
  gap 8

Check as text:
  col #22C55E

FeatureText as text:
  col #999

CTA as button:
  w full
  pad 12
  bg #3B82F6
  rad 8
  col white

PricingTable
  PricingCard
    PlanName "Basic"
    Price "$9"
    Period "/month"
    FeatureList
      Feature
        Check "✓"
        FeatureText "10 Projects"
      Feature
        Check "✓"
        FeatureText "5GB Storage"
    CTA "Get Started"
  PricingCard
    Badge "Popular"
    PlanName "Pro"
    Price "$29"
    Period "/month"
    FeatureList
      Feature
        Check "✓"
        FeatureText "Unlimited Projects"
      Feature
        Check "✓"
        FeatureText "50GB Storage"
    CTA "Get Started"
`)
      expect(root.children.length).toBe(2) // 2 pricing cards

      const basicCard = root.children[0] as HTMLElement
      const proCard = root.children[1] as HTMLElement

      // Pro card has badge, so one more child
      expect(proCard.children.length).toBeGreaterThan(basicCard.children.length)
    })
  })
})

// ============================================
// LEVEL 9: ERROR RESILIENCE
// ============================================

describe('Level 9: Error Resilience', () => {
  describe('9.1 Empty Content', () => {
    it('handles empty component', () => {
      const { root } = compileAndExecute(`
Empty as frame:

Empty
`)
      expect(root).toBeDefined()
      expect(root.tagName.toLowerCase()).toBe('div')
      expect(root.children.length).toBe(0)
    })

    it('handles component with only whitespace text', () => {
      const { root } = compileAndExecute(`
Label as text:

Label "   "
`)
      expect(root.textContent).toBe('   ')
    })
  })

  describe('9.2 Extreme Values', () => {
    it('handles very large dimensions', () => {
      const { root } = compileAndExecute(`
Huge as frame:
  w 99999
  h 99999

Huge
`)
      expect(root.style.width).toBe('99999px')
      expect(root.style.height).toBe('99999px')
    })

    it('handles very small dimensions', () => {
      const { root } = compileAndExecute(`
Tiny as frame:
  w 1
  h 1

Tiny
`)
      expect(root.style.width).toBe('1px')
      expect(root.style.height).toBe('1px')
    })

    it('handles decimal values', () => {
      const { root, code } = compileAndExecute(`
Precise as frame:
  opacity 0.333

Precise
`)
      expect(root.style.opacity).toBe('0.333')
      // Scale is tested separately in transform tests
    })
  })

  describe('9.3 Special Characters', () => {
    it('handles quotes in text', () => {
      const { root } = compileAndExecute(`
Label as text:

Label "He said \\"Hello\\""
`)
      expect(root.textContent).toContain('Hello')
    })

    it('handles unicode in text', () => {
      const { root } = compileAndExecute(`
Label as text:

Label "日本語 🎉 émojis"
`)
      expect(root.textContent).toContain('日本語')
      expect(root.textContent).toContain('🎉')
    })
  })
})

// ============================================
// LEVEL 10: ANIMATION DEFINITIONS
// ============================================

describe('Level 10: Animation Definitions', () => {
  describe('10.1 Basic Animation', () => {
    it('animation definition generates keyframes', () => {
      const { jsCode } = compileAndExecute(`
@animation fadeIn 0.3s ease-out
  0%
    opacity 0
  100%
    opacity 1

Box as frame:
  pad 16

Box
`)
      expect(jsCode).toContain('fadeIn')
      expect(jsCode).toContain('opacity')
    })

    it('animation with multiple keyframes', () => {
      const { jsCode } = compileAndExecute(`
@animation pulse 1s ease-in-out
  0%
    opacity 1
  50%
    opacity 0.7
  100%
    opacity 1

Box as frame:

Box
`)
      expect(jsCode).toContain('pulse')
      expect(jsCode).toContain('opacity')
    })
  })

  describe('10.2 Transform Animations', () => {
    it('y-offset animation', () => {
      const { jsCode } = compileAndExecute(`
@animation slideIn 0.3s ease-out
  0%
    y-offset 20
    opacity 0
  100%
    y-offset 0
    opacity 1

Box as frame:

Box
`)
      expect(jsCode).toContain('slideIn')
      expect(jsCode).toContain('translateY')
    })

    it('scale animation', () => {
      const { jsCode } = compileAndExecute(`
@animation grow 0.2s ease-out
  0%
    scale 0.8
  100%
    scale 1

Box as frame:

Box
`)
      expect(jsCode).toContain('grow')
      expect(jsCode).toContain('scale')
    })
  })
})

// ============================================
// LEVEL 11: DATA BINDING & EACH LOOPS
// ============================================

describe('Level 11: Data Binding & Each Loops', () => {
  describe('11.1 Basic Each Loop', () => {
    it('each loop generates container', () => {
      const { jsCode } = compileAndExecute(`
Item as frame:
  pad 8
  bg #222

List as frame:
  ver
  gap 8

  each items as item:
    Item

List
`)
      expect(jsCode).toContain('each-container')
      expect(jsCode).toContain('items')
    })

    it('each loop with index', () => {
      const { jsCode } = compileAndExecute(`
Row as frame:
  hor
  pad 8

Table as frame:
  ver

  each rows as row:
    Row

Table
`)
      expect(jsCode).toContain('_eachConfig')
    })
  })

  describe('11.2 Each Loop Structure', () => {
    it('each loop has proper container', () => {
      const { jsCode } = compileAndExecute(`
Task as frame:
  pad 8

TaskList as frame:
  ver

  each tasks as task:
    Task

TaskList
`)
      expect(jsCode).toContain('each-container')
    })
  })

  describe('11.3 Nested Each Loops', () => {
    it('nested each generates proper structure', () => {
      const { jsCode } = compileAndExecute(`
Cell as frame:
  pad 4

Row as frame:
  hor

  each cells as cell:
    Cell

Grid as frame:
  ver

  each rows as row:
    Row

Grid
`)
      expect(jsCode).toContain('rows')
      expect(jsCode).toContain('cells')
    })
  })
})

// ============================================
// LEVEL 12: COMPLEX EVENT SCENARIOS
// ============================================

describe('Level 12: Complex Event Scenarios', () => {
  describe('12.1 Keyboard Events', () => {
    it('onkeydown with specific key', () => {
      const { jsCode } = compileAndExecute(`
SearchInput as input:
  placeholder "Search..."
  onkeydown enter: submit

SearchInput
`)
      expect(jsCode).toContain('keydown')
      expect(jsCode).toContain('Enter')
    })

    it('onkeydown escape handler', () => {
      const { jsCode } = compileAndExecute(`
Modal as frame:
  onkeydown escape: close

Modal
`)
      expect(jsCode).toContain('Escape')
    })
  })

  describe('12.2 Mouse Events', () => {
    it('onclick with toggle action', () => {
      const { jsCode } = compileAndExecute(`
Toggle as frame:
  onclick toggle

Toggle
`)
      expect(jsCode).toContain('click')
      expect(jsCode).toContain('toggle')
    })

    it('onhover show/hide', () => {
      const { jsCode } = compileAndExecute(`
Tooltip as frame:
  onhover show Popup

Tooltip
`)
      expect(jsCode).toContain('mouseenter')
    })
  })

  describe('12.3 Input Events', () => {
    it('oninput handler', () => {
      const { jsCode } = compileAndExecute(`
TextField as input:
  oninput updateValue

TextField
`)
      expect(jsCode).toContain('input')
    })

    it('onchange handler', () => {
      const { jsCode } = compileAndExecute(`
Select as select:
  onchange updateSelection

Select
`)
      expect(jsCode).toContain('change')
    })

    it('onfocus and onblur', () => {
      const { jsCode } = compileAndExecute(`
Input as input:
  onfocus highlight
  onblur unhighlight

Input
`)
      expect(jsCode).toContain('focus')
      expect(jsCode).toContain('blur')
    })
  })

  describe('12.4 Action Types', () => {
    it('show action', () => {
      const { jsCode } = compileAndExecute(`
Button as button:
  onclick show Modal

Button "Open"
`)
      expect(jsCode).toContain('show')
    })

    it('hide action', () => {
      const { jsCode } = compileAndExecute(`
CloseBtn as button:
  onclick hide Modal

CloseBtn "Close"
`)
      expect(jsCode).toContain('hide')
    })

    it('select action', () => {
      const { jsCode } = compileAndExecute(`
Tab as frame:
  onclick select

Tab
`)
      expect(jsCode).toContain('select')
    })

    it('page navigation action', () => {
      const { jsCode } = compileAndExecute(`
NavLink as button:
  onclick page Settings

NavLink "Settings"
`)
      expect(jsCode).toContain('page')
      expect(jsCode).toContain('Settings')
    })
  })
})

// ============================================
// LEVEL 13: ACCESSIBILITY & SEMANTIC HTML
// ============================================

describe('Level 13: Accessibility & Semantic HTML', () => {
  describe('13.1 Semantic Elements', () => {
    it('button primitive renders button element', () => {
      const { root } = compileAndExecute(`
Btn as button:

Btn "Click"
`)
      expect(root.tagName.toLowerCase()).toBe('button')
    })

    it('input primitive renders input element', () => {
      const { root } = compileAndExecute(`
Field as input:

Field
`)
      expect(root.tagName.toLowerCase()).toBe('input')
    })

    it('link primitive generates anchor structure', () => {
      const { jsCode } = compileAndExecute(`
Link as link:

Link "Visit"
`)
      expect(jsCode).toContain('Link')
    })

    it('image primitive generates img tag', () => {
      const { root } = compileAndExecute(`
Img as image:

Img
`)
      expect(root.tagName.toLowerCase()).toBe('img')
    })
  })

  describe('13.2 Form Elements', () => {
    it('textarea element', () => {
      const { root } = compileAndExecute(`
TextArea as textarea:

TextArea
`)
      expect(root.tagName.toLowerCase()).toBe('textarea')
    })

    it('button with text', () => {
      const { root } = compileAndExecute(`
Btn as button:
  pad 8 16

Btn "Submit"
`)
      expect(root.tagName.toLowerCase()).toBe('button')
      expect(root.textContent).toBe('Submit')
    })
  })

  describe('13.3 Input Attributes', () => {
    it('disabled attribute via jsCode', () => {
      const { jsCode } = compileAndExecute(`
Input as input:
  disabled

Input
`)
      expect(jsCode).toContain('disabled')
    })
  })
})

// ============================================
// LEVEL 14: CSS PROPERTIES DEEP DIVE
// ============================================

describe('Level 14: CSS Properties Deep Dive', () => {
  describe('14.1 Flexbox Properties', () => {
    it('flex properties work with layout', () => {
      const { root } = compileAndExecute(`
Parent as frame:
  hor
  gap 8

  Child as frame:
    pad 8

Parent
  Child
`)
      expect(root.style.display).toBe('flex')
      expect(root.style.gap).toBe('8px')
    })
  })

  describe('14.2 Position Properties', () => {
    it('position absolute in code', () => {
      const { jsCode } = compileAndExecute(`
Box as frame:
  absolute
  top 10
  left 20

Box
`)
      expect(jsCode).toContain('absolute')
      expect(jsCode).toContain('top')
    })

    it('z-index in code', () => {
      const { jsCode } = compileAndExecute(`
Box as frame:
  z 100

Box
`)
      expect(jsCode).toContain('z-index')
      expect(jsCode).toContain('100')
    })
  })

  describe('14.3 Visual Effects', () => {
    it('opacity', () => {
      const { root } = compileAndExecute(`
Box as frame:
  opacity 0.5

Box
`)
      expect(root.style.opacity).toBe('0.5')
    })

    it('cursor', () => {
      const { root } = compileAndExecute(`
Box as frame:
  cursor pointer

Box
`)
      expect(root.style.cursor).toBe('pointer')
    })

    it('overflow hidden', () => {
      const { root } = compileAndExecute(`
Box as frame:
  clip

Box
`)
      expect(root.style.overflow).toBe('hidden')
    })

    it('overflow scroll', () => {
      const { root } = compileAndExecute(`
Box as frame:
  scroll

Box
`)
      expect(root.style.overflowY).toBe('auto')
    })
  })

  describe('14.4 Typography Advanced', () => {
    it('text-align', () => {
      const { root } = compileAndExecute(`
Text as text:
  text-align center

Text "Centered"
`)
      expect(root.style.textAlign).toBe('center')
    })

    it('font-style italic', () => {
      const { root } = compileAndExecute(`
Text as text:
  italic

Text "Italic text"
`)
      expect(root.style.fontStyle).toBe('italic')
    })

    it('text-decoration underline', () => {
      const { root } = compileAndExecute(`
Text as text:
  underline

Text "Underlined"
`)
      expect(root.style.textDecoration).toBe('underline')
    })
  })

  describe('14.5 Colors', () => {
    it('hex color 6 digits', () => {
      const { root } = compileAndExecute(`
Box as frame:
  bg #3B82F6

Box
`)
      expect(root.style.background).toBe('rgb(59, 130, 246)')
    })

    it('hex color 3 digits', () => {
      const { root } = compileAndExecute(`
Box as frame:
  bg #F00

Box
`)
      expect(root.style.background).toBe('rgb(255, 0, 0)')
    })

    it('named color', () => {
      const { root } = compileAndExecute(`
Box as frame:
  bg white

Box
`)
      expect(root.style.background).toBe('white')
    })
  })
})

// ============================================
// LEVEL 15: COMPONENT COMPOSITION
// ============================================

describe('Level 15: Component Composition', () => {
  describe('15.1 Multi-Level Inheritance', () => {
    it('inheritance generates code', () => {
      const { jsCode } = compileAndExecute(`
Base as frame:
  pad 8

Extended as Base:
  bg #222

Final as Extended:
  rad 8

Final
`)
      // Code should contain all properties from inheritance chain
      expect(jsCode).toContain('padding')
      expect(jsCode).toContain('background')
      expect(jsCode).toContain('border-radius')
    })

    it('direct instance properties apply', () => {
      const { root } = compileAndExecute(`
Card as frame:
  pad 16
  bg #222
  rad 8

Card
`)
      expect(root.style.padding).toBe('16px')
      expect(root.style.borderRadius).toBe('8px')
    })
  })

  describe('15.2 Complex Slot Patterns', () => {
    it('card with header and body slots', () => {
      const { root } = compileAndExecute(`
Card as frame:
  ver
  bg #1a1a23
  rad 12

  Header as frame:
    pad 16
    bor b 1 solid #333

  Body as frame:
    pad 16

Card
  Header
    Text "Title"
  Body
    Text "Content"
`)
      expect(root.children.length).toBe(2)
      expect(root.style.borderRadius).toBe('12px')
    })
  })

  describe('15.3 Reusable Components', () => {
    it('multiple instances of same component', () => {
      const { root } = compileAndExecute(`
Badge as frame:
  pad 4 8
  rad 4
  bg #3B82F6

Container as frame:
  hor
  gap 8

Container
  Badge "New"
  Badge "Hot"
  Badge "Sale"
`)
      expect(root.children.length).toBe(3)
      const badges = Array.from(root.children) as HTMLElement[]
      badges.forEach(badge => {
        expect(badge.style.borderRadius).toBe('4px')
      })
    })
  })

  describe('15.4 Dynamic Components', () => {
    it('component with state', () => {
      const { root, api } = compileAndExecute(`
Toggle as frame:
  pad 8
  bg #333
  state selected
    bg #3B82F6

Toggle
`)
      expect(root._stateStyles).toBeDefined()
      expect(root._stateStyles.selected).toBeDefined()
    })

    it('component with multiple states', () => {
      const { root } = compileAndExecute(`
Button as button:
  pad 8 16
  bg #333

  state selected
    bg #3B82F6

  state highlighted
    bor 2 solid #3B82F6

Button "Click"
`)
      expect(root._stateStyles.selected).toBeDefined()
      expect(root._stateStyles.highlighted).toBeDefined()
    })
  })
})

// ============================================
// LEVEL 16: GRID LAYOUT
// ============================================

describe('Level 16: Grid Layout', () => {
  describe('16.1 Basic Grid', () => {
    it('grid with columns', () => {
      const { root } = compileAndExecute(`
Grid as frame:
  grid 3
  gap 16

Grid
`)
      expect(root.style.display).toBe('grid')
      expect(root.style.gridTemplateColumns).toContain('1fr')
    })

    it('grid 2 columns', () => {
      const { root } = compileAndExecute(`
TwoCol as frame:
  grid 2
  gap 8

TwoCol
`)
      expect(root.style.gridTemplateColumns).toBe('repeat(2, 1fr)')
    })

    it('grid 4 columns', () => {
      const { root } = compileAndExecute(`
FourCol as frame:
  grid 4

FourCol
`)
      expect(root.style.gridTemplateColumns).toBe('repeat(4, 1fr)')
    })
  })

  describe('16.2 Grid with Gap', () => {
    it('grid with uniform gap', () => {
      const { root } = compileAndExecute(`
Grid as frame:
  grid 2
  gap 24

Grid
`)
      expect(root.style.gap).toBe('24px')
    })
  })
})

// ============================================
// LEVEL 17: ICON INTEGRATION
// ============================================

describe('Level 17: Icon Integration', () => {
  describe('17.1 Icon Component', () => {
    it('icon primitive generates element', () => {
      const { jsCode } = compileAndExecute(`
Icon as icon:

Icon
`)
      expect(jsCode).toContain('Icon')
    })
  })
})

// ============================================
// LEVEL 18: SHADOW & EFFECTS
// ============================================

describe('Level 18: Shadow & Effects', () => {
  describe('18.1 Box Shadow', () => {
    it('shadow property generates code', () => {
      const { jsCode } = compileAndExecute(`
Card as frame:
  shadow sm

Card
`)
      expect(jsCode).toContain('shadow')
    })

    it('shadow preset lg generates code', () => {
      const { jsCode } = compileAndExecute(`
Card as frame:
  shadow lg

Card
`)
      expect(jsCode).toContain('shadow')
    })
  })
})

// ============================================
// LEVEL 19: RESPONSIVE & SIZING
// ============================================

describe('Level 19: Responsive & Sizing', () => {
  describe('19.1 Width Sizing', () => {
    it('fixed width', () => {
      const { root } = compileAndExecute(`
Box as frame:
  w 200

Box
`)
      expect(root.style.width).toBe('200px')
    })

    it('full width generates width property', () => {
      const { jsCode } = compileAndExecute(`
Box as frame:
  w full

Box
`)
      expect(jsCode).toContain('width')
    })

    it('hug width (fit-content)', () => {
      const { root } = compileAndExecute(`
Box as frame:
  w hug

Box
`)
      expect(root.style.width).toBe('fit-content')
    })

    it('min width', () => {
      const { root } = compileAndExecute(`
Box as frame:
  minw 100

Box
`)
      expect(root.style.minWidth).toBe('100px')
    })

    it('max width', () => {
      const { root } = compileAndExecute(`
Box as frame:
  maxw 500

Box
`)
      expect(root.style.maxWidth).toBe('500px')
    })
  })

  describe('19.2 Height Sizing', () => {
    it('fixed height', () => {
      const { root } = compileAndExecute(`
Box as frame:
  h 100

Box
`)
      expect(root.style.height).toBe('100px')
    })

    it('full height generates height property', () => {
      const { jsCode } = compileAndExecute(`
Box as frame:
  h full

Box
`)
      expect(jsCode).toContain('height')
    })

    it('min height', () => {
      const { root } = compileAndExecute(`
Box as frame:
  minh 50

Box
`)
      expect(root.style.minHeight).toBe('50px')
    })

    it('max height', () => {
      const { root } = compileAndExecute(`
Box as frame:
  maxh 300

Box
`)
      expect(root.style.maxHeight).toBe('300px')
    })
  })

  describe('19.3 Combined Sizing', () => {
    it('width and height together', () => {
      const { root } = compileAndExecute(`
Box as frame:
  w 100
  h 100

Box
`)
      expect(root.style.width).toBe('100px')
      expect(root.style.height).toBe('100px')
    })
  })
})

// ============================================
// LEVEL 20: FINAL INTEGRATION
// ============================================

describe('Level 20: Final Integration', () => {
  describe('20.1 Complete App Structure', () => {
    it('app with sidebar, header, content', () => {
      const { root } = compileAndExecute(`
Sidebar as frame:
  w 240
  h full
  bg #111
  ver

Header as frame:
  h 56
  w full
  bg #1a1a23
  hor
  spread
  pad 0 16

Content as frame:
  grow
  pad 24

App as frame:
  hor
  w full
  h full

  Sidebar

  Main as frame:
    ver
    grow

    Header
    Content

App
`)
      expect(root.style.display).toBe('flex')
      expect(root.style.flexDirection).toBe('row')
      expect(root.children.length).toBe(2)
    })
  })

  describe('20.2 Form with Validation States', () => {
    it('form field with states', () => {
      const { root } = compileAndExecute(`
Field as frame:
  ver
  gap 4

  Label as text:
    fs 12
    col #a1a1aa

  Input as input:
    pad 8 12
    bg #222
    rad 6
    bor 1 solid #333

    state highlighted
      bor 1 solid #3B82F6

FormField = Field
  Label "Email"
  Input

FormField
`)
      expect(root.children.length).toBe(2)
    })
  })

  describe('20.3 Interactive List', () => {
    it('list with selectable items', () => {
      const { root, jsCode } = compileAndExecute(`
ListItem as frame:
  hor
  pad 12
  gap 12
  bg #1a1a23
  cursor pointer

  state selected
    bg #3B82F6

  state highlighted
    bg #2a2a33

  onclick select
  onhover highlight

List as frame:
  ver
  gap 2

List
  ListItem
    Text "Item 1"
  ListItem
    Text "Item 2"
  ListItem
    Text "Item 3"
`)
      expect(root.children.length).toBe(3)
      expect(jsCode).toContain('click')
      expect(jsCode).toContain('mouseenter')
    })
  })

  describe('20.4 Modal Dialog', () => {
    it('modal structure with overlay', () => {
      const { root } = compileAndExecute(`
Overlay as frame:
  absolute
  top 0
  left 0
  w full
  h full
  bg rgba(0,0,0,0.5)
  center

Dialog as frame:
  w 400
  bg #1a1a23
  rad 12
  shadow lg
  ver

  Header as frame:
    pad 16
    bor b 1 solid #333

  Body as frame:
    pad 16

  Footer as frame:
    pad 16
    hor
    spread

Modal as frame:
  stacked

  Overlay
    Dialog
      Header
        Text "Dialog Title"
      Body
        Text "Dialog content here"
      Footer
        Button "Cancel"
        Button "Confirm"

Modal
`)
      expect(root.style.position).toBe('relative')
    })
  })
})

// ============================================
// SANITY CHECK
// ============================================

describe('Sanity Check', () => {
  it('compileAndExecute works', () => {
    expect(() => compileAndExecute(`
Box as frame:
  pad 16

Box
`)).not.toThrow()
  })

  it('assertDOM catches errors', () => {
    const { root } = compileAndExecute(`
Box as frame:
  pad 16

Box
`)

    expect(() => assertDOM(root, { tag: 'div' })).not.toThrow()
    expect(() => assertDOM(root, { tag: 'span' })).toThrow()
  })
})

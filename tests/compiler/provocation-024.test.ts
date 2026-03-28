/**
 * @vitest-environment jsdom
 */

/**
 * Provocation Tests 024 - Schema-Driven Gap Analysis
 *
 * Strategie: Gezielte Provokation basierend auf Schema-Analyse.
 * Diese Tests prüfen Bereiche, die im Schema definiert aber nicht getestet sind.
 *
 * Fokus:
 * 1. Directional Property Konflikte
 * 2. Position Konflikte
 * 3. Custom States (alle 13)
 * 4. State-Variant Properties (hover-*)
 * 5. Events: onload, onenter, onexit
 * 6. Actions mit Targets: highlight next/prev/first/last
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../src/parser/parser'
import { toIR } from '../../src/ir'
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

  const root = ui.root.firstElementChild as HTMLElement
  return root
}

function getStyle(el: HTMLElement, prop: string): string {
  const inline = el.style.getPropertyValue(prop)
  if (inline) return inline
  const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  return (el.style as any)[camelProp] || ''
}

function getIR(code: string) {
  const ast = parse(code)
  return toIR(ast)
}

// ============================================================
// 1. DIRECTIONAL PROPERTY KONFLIKTE
// ============================================================
describe('Directional Property Konflikte', () => {

  describe('Padding Reihenfolge', () => {
    it('pad left 10 dann pad 5 → letzter gewinnt für alle', () => {
      const el = render(`Frame pad left 10 pad 5`)
      // pad 5 sollte alle Seiten auf 5px setzen (letzter gewinnt)
      expect(getStyle(el, 'padding')).toBe('5px')
    })

    it('pad 10 dann pad left 5 → nur left wird überschrieben', () => {
      const el = render(`Frame pad 10 pad left 5`)
      // Erwartung: pad-left 5px, rest 10px - oder alles 10px dann left 5px?
      // Letzter gewinnt bedeutet pad left sollte 5px sein
      expect(getStyle(el, 'padding-left')).toBe('5px')
    })

    it('pad left 10 pad right 20 → beide gesetzt', () => {
      const el = render(`Frame pad left 10 pad right 20`)
      expect(getStyle(el, 'padding-left')).toBe('10px')
      expect(getStyle(el, 'padding-right')).toBe('20px')
    })

    it('pad x 10 pad left 5 → left überschrieben', () => {
      const el = render(`Frame pad x 10 pad left 5`)
      // pad x setzt left und right auf 10, dann left auf 5
      expect(getStyle(el, 'padding-left')).toBe('5px')
      expect(getStyle(el, 'padding-right')).toBe('10px')
    })
  })

  describe('Margin Reihenfolge', () => {
    it('margin 10 margin left 5 → nur left 5', () => {
      const el = render(`Frame margin 10 margin left 5`)
      expect(getStyle(el, 'margin-left')).toBe('5px')
    })

    it('margin x 20 margin y 10 → x und y separat', () => {
      const el = render(`Frame margin x 20 margin y 10`)
      expect(getStyle(el, 'margin-left')).toBe('20px')
      expect(getStyle(el, 'margin-right')).toBe('20px')
      expect(getStyle(el, 'margin-top')).toBe('10px')
      expect(getStyle(el, 'margin-bottom')).toBe('10px')
    })
  })

  describe('Radius Reihenfolge', () => {
    it('rad tl 10 rad 20 → letzter gewinnt (20 überall)', () => {
      const el = render(`Frame rad tl 10 rad 20`)
      expect(getStyle(el, 'border-radius')).toBe('20px')
    })

    it('rad 20 rad tl 10 → nur tl ist 10', () => {
      const el = render(`Frame rad 20 rad tl 10`)
      expect(getStyle(el, 'border-top-left-radius')).toBe('10px')
    })

    it('rad t 10 rad tl 5 → nur tl überschrieben', () => {
      const el = render(`Frame rad t 10 rad tl 5`)
      expect(getStyle(el, 'border-top-left-radius')).toBe('5px')
      expect(getStyle(el, 'border-top-right-radius')).toBe('10px')
    })

    it('rad l 10 rad r 20 → links und rechts separat', () => {
      const el = render(`Frame rad l 10 rad r 20`)
      expect(getStyle(el, 'border-top-left-radius')).toBe('10px')
      expect(getStyle(el, 'border-bottom-left-radius')).toBe('10px')
      expect(getStyle(el, 'border-top-right-radius')).toBe('20px')
      expect(getStyle(el, 'border-bottom-right-radius')).toBe('20px')
    })
  })

  describe('Border Directional', () => {
    it('bor left 2 bor 1 → letzter gewinnt', () => {
      const el = render(`Frame bor left 2 bor 1`)
      // bor 1 sollte alle Seiten setzen
      expect(getStyle(el, 'border')).toContain('1px')
    })

    it('bor 1 bor left 2 → nur left ist 2', () => {
      const el = render(`Frame bor 1 bor left 2`)
      expect(getStyle(el, 'border-left')).toContain('2px')
    })
  })
})

// ============================================================
// 2. POSITION KONFLIKTE
// ============================================================
describe('Position Konflikte', () => {

  it('x 100 dann pin-left 50 → letzter gewinnt (left: 50px)', () => {
    const el = render(`Frame x 100 pin-left 50`)
    expect(getStyle(el, 'left')).toBe('50px')
    expect(getStyle(el, 'position')).toBe('absolute')
  })

  it('pin-left 50 dann x 100 → x gewinnt (left: 100px)', () => {
    const el = render(`Frame pin-left 50 x 100`)
    expect(getStyle(el, 'left')).toBe('100px')
  })

  it('pin-center-x dann x 100 → x überschreibt left', () => {
    const el = render(`Frame pin-center-x x 100`)
    expect(getStyle(el, 'left')).toBe('100px')
  })

  it('pin-center dann x 50 y 50 → x/y überschreiben', () => {
    const el = render(`Frame pin-center x 50 y 50`)
    expect(getStyle(el, 'left')).toBe('50px')
    expect(getStyle(el, 'top')).toBe('50px')
  })

  it('fixed dann absolute → letzter gewinnt', () => {
    const el = render(`Frame fixed absolute`)
    expect(getStyle(el, 'position')).toBe('absolute')
  })

  it('absolute dann fixed → fixed gewinnt', () => {
    const el = render(`Frame absolute fixed`)
    expect(getStyle(el, 'position')).toBe('fixed')
  })

  it('relative dann pos → pos setzt relative (gleich)', () => {
    const el = render(`Frame relative pos`)
    expect(getStyle(el, 'position')).toBe('relative')
  })

  it('pin-top 10 pin-bottom 10 → beide gesetzt (stretch)', () => {
    const el = render(`Frame pin-top 10 pin-bottom 10`)
    expect(getStyle(el, 'top')).toBe('10px')
    expect(getStyle(el, 'bottom')).toBe('10px')
    expect(getStyle(el, 'position')).toBe('absolute')
  })

  it('pin-left 0 pin-right 0 pin-top 0 pin-bottom 0 → inset 0', () => {
    const el = render(`Frame pin-left 0 pin-right 0 pin-top 0 pin-bottom 0`)
    expect(getStyle(el, 'left')).toBe('0px')
    expect(getStyle(el, 'right')).toBe('0px')
    expect(getStyle(el, 'top')).toBe('0px')
    expect(getStyle(el, 'bottom')).toBe('0px')
  })
})

// ============================================================
// 3. CUSTOM STATES (alle 13 aus Schema)
// ============================================================
describe('Custom States', () => {
  // Helper to check if IR node has styles for a specific state
  function hasStateStyles(node: any, stateName: string): boolean {
    return node.styles.some((s: any) => s.state === stateName)
  }

  describe('State Parsing', () => {
    // All custom states from schema should work
    // States require component definitions - instances don't have states
    // IR stores states as styles with state property

    it('expanded: block parst als state', () => {
      const ir = getIR(`
Expandable as Frame:
  expanded:
    bg #f00
Expandable`)
      expect(hasStateStyles(ir.nodes[0], 'expanded')).toBe(true)
    })

    it('collapsed: block parst als state', () => {
      // Note: Don't use "Collapsible" as name - it's a Zag primitive!
      const ir = getIR(`
MyCollapsible as Frame:
  collapsed:
    h 0
MyCollapsible`)
      expect(hasStateStyles(ir.nodes[0], 'collapsed')).toBe(true)
    })

    it('on: und off: states', () => {
      const ir = getIR(`
Toggle as Frame:
  on:
    bg #0f0
  off:
    bg #f00
Toggle`)
      expect(hasStateStyles(ir.nodes[0], 'on')).toBe(true)
      expect(hasStateStyles(ir.nodes[0], 'off')).toBe(true)
    })

    it('open: und closed: states', () => {
      const ir = getIR(`
Openable as Frame:
  open:
    h 200
  closed:
    h 0
Openable`)
      expect(hasStateStyles(ir.nodes[0], 'open')).toBe(true)
      expect(hasStateStyles(ir.nodes[0], 'closed')).toBe(true)
    })

    it('filled: state (für inputs)', () => {
      const ir = getIR(`
FilledInput as Input:
  filled:
    boc #0f0
FilledInput`)
      expect(hasStateStyles(ir.nodes[0], 'filled')).toBe(true)
    })

    it('valid: und invalid: states', () => {
      const ir = getIR(`
ValidatedInput as Input:
  valid:
    boc #0f0
  invalid:
    boc #f00
ValidatedInput`)
      expect(hasStateStyles(ir.nodes[0], 'valid')).toBe(true)
      expect(hasStateStyles(ir.nodes[0], 'invalid')).toBe(true)
    })

    it('loading: state', () => {
      const ir = getIR(`
LoadingButton as Button:
  loading:
    opacity 0.5
LoadingButton`)
      expect(hasStateStyles(ir.nodes[0], 'loading')).toBe(true)
    })

    it('error: state', () => {
      const ir = getIR(`
ErrorBox as Frame:
  error:
    bg #f00
    bor 2 #f00
ErrorBox`)
      expect(hasStateStyles(ir.nodes[0], 'error')).toBe(true)
    })
  })

  describe('State Konflikte', () => {
    it('open: und closed: auf gleichem Element', () => {
      const ir = getIR(`
OpenClose as Frame:
  open:
    bg #0f0
  closed:
    bg #f00
OpenClose`)
      expect(hasStateStyles(ir.nodes[0], 'open')).toBe(true)
      expect(hasStateStyles(ir.nodes[0], 'closed')).toBe(true)
    })

    it('on: off: als toggle states', () => {
      // Note: Don't use "Switch" as name - it's a Zag primitive!
      const ir = getIR(`
MyToggle as Frame:
  on:
    bg #0f0
  off:
    bg #333
MyToggle`)
      // Component should be resolved and instance should have state styles
      expect(hasStateStyles(ir.nodes[0], 'on')).toBe(true)
      expect(hasStateStyles(ir.nodes[0], 'off')).toBe(true)
    })
  })

  describe('Implemented States', () => {
    // Diese States FUNKTIONIEREN (hover, focus, active, disabled, selected, highlighted)
    // States werden auf AST-Ebene geparst und in IR als IRStyle.state gespeichert

    it('hover: state parst korrekt (AST)', () => {
      const ast = parse(`HoverComp as Button:
  hover:
    bg #f00`)
      expect(ast.components[0].states.length).toBe(1)
      expect(ast.components[0].states[0].name).toBe('hover')
    })

    it('selected: state parst korrekt (AST)', () => {
      const ast = parse(`SelectComp as Frame:
  selected:
    bg #0f0`)
      expect(ast.components[0].states.length).toBe(1)
      expect(ast.components[0].states[0].name).toBe('selected')
    })

    it('hover: state in IR hat state property auf styles', () => {
      // Rendere eine Instanz, nicht nur eine Definition
      const ir = getIR(`HoverBtn as Button:
  hover:
    bg #f00

HoverBtn`)
      // IR speichert states als IRStyle.state auf dem gerenderten Node
      expect(ir.nodes.length).toBeGreaterThan(0)
      const hoverStyles = ir.nodes[0].styles.filter(s => s.state === 'hover')
      expect(hoverStyles.length).toBeGreaterThan(0)
    })
  })
})

// ============================================================
// 4. STATE-VARIANT PROPERTIES (hover-*, focus-*, etc.)
// ============================================================
describe('State-Variant Properties', () => {
  // hover-* properties generate styles with state: 'hover' on the style object

  it('hover-bg generiert :hover styles', () => {
    const ir = getIR(`Button hover-bg #f00`)
    const hoverStyles = ir.nodes[0].styles.filter(s => s.state === 'hover')
    expect(hoverStyles.length).toBeGreaterThan(0)
    expect(hoverStyles.some(s => s.property === 'background')).toBe(true)
  })

  it('hover-col generiert :hover color', () => {
    const ir = getIR(`Button hover-col #fff`)
    const hoverStyles = ir.nodes[0].styles.filter(s => s.state === 'hover')
    expect(hoverStyles.length).toBeGreaterThan(0)
    expect(hoverStyles.some(s => s.property === 'color')).toBe(true)
  })

  it('hover-opacity generiert :hover opacity', () => {
    const ir = getIR(`Button hover-opacity 0.8`)
    const hoverStyles = ir.nodes[0].styles.filter(s => s.state === 'hover')
    expect(hoverStyles.length).toBeGreaterThan(0)
    expect(hoverStyles.some(s => s.property === 'opacity')).toBe(true)
  })

  it('hover-scale generiert :hover transform', () => {
    const ir = getIR(`Button hover-scale 1.1`)
    const hoverStyles = ir.nodes[0].styles.filter(s => s.state === 'hover')
    expect(hoverStyles.length).toBeGreaterThan(0)
    expect(hoverStyles.some(s => s.property === 'transform')).toBe(true)
  })

  it('mehrere hover-* properties zusammen', () => {
    const ir = getIR(`Button hover-bg #f00 hover-col #fff hover-scale 1.05`)
    const hoverStyles = ir.nodes[0].styles.filter(s => s.state === 'hover')
    expect(hoverStyles.length).toBe(3)
    expect(hoverStyles.some(s => s.property === 'background')).toBe(true)
    expect(hoverStyles.some(s => s.property === 'color')).toBe(true)
    expect(hoverStyles.some(s => s.property === 'transform')).toBe(true)
  })

  it('hover-border generiert :hover border', () => {
    const ir = getIR(`Button hover-border 2`)
    const hoverStyles = ir.nodes[0].styles.filter(s => s.state === 'hover')
    expect(hoverStyles.length).toBeGreaterThan(0)
    expect(hoverStyles.some(s => s.property === 'border' || s.property === 'border-width')).toBe(true)
  })

  it('hover-border-color generiert :hover border-color', () => {
    const ir = getIR(`Button hover-border-color #0f0`)
    const hoverStyles = ir.nodes[0].styles.filter(s => s.state === 'hover')
    expect(hoverStyles.length).toBeGreaterThan(0)
    expect(hoverStyles.some(s => s.property === 'border-color')).toBe(true)
  })

  it('hover-radius generiert :hover border-radius', () => {
    const ir = getIR(`Button hover-radius 12`)
    const hoverStyles = ir.nodes[0].styles.filter(s => s.state === 'hover')
    expect(hoverStyles.length).toBeGreaterThan(0)
    expect(hoverStyles.some(s => s.property === 'border-radius')).toBe(true)
  })
})

// ============================================================
// 5. EVENTS: onload, onenter, onexit
// ============================================================
describe('Events: Viewport & Lifecycle', () => {

  it('onload event parst korrekt', () => {
    const ast = parse(`LoadComponent as Frame:
  onload show Toast`)
    expect(ast.components[0].events).toBeDefined()
    expect(ast.components[0].events[0].name).toBe('onload')
  })

  it('onenter event (IntersectionObserver) parst', () => {
    const ast = parse(`EnterComponent as Frame:
  onenter animate`)
    expect(ast.components[0].events[0].name).toBe('onenter')
  })

  it('onexit event parst', () => {
    const ast = parse(`ExitComponent as Frame:
  onexit pause`)
    expect(ast.components[0].events[0].name).toBe('onexit')
  })

  it('onkeyup event parst', () => {
    const ast = parse(`KeyComponent as Input:
  onkeyup validate`)
    expect(ast.components[0].events[0].name).toBe('onkeyup')
  })

  it('onkeyup mit key modifier', () => {
    const ast = parse(`KeyEnterComponent as Input:
  onkeyup enter: submit`)
    expect(ast.components[0].events[0].name).toBe('onkeyup')
  })

  it('multiple events auf einem Element', () => {
    const ast = parse(`MultiEventButton as Button:
  onclick submit
  onhover highlight
  onfocus outline`)
    expect(ast.components[0].events.length).toBe(3)
    expect(ast.components[0].events.map(e => e.name)).toContain('onclick')
    expect(ast.components[0].events.map(e => e.name)).toContain('onhover')
    expect(ast.components[0].events.map(e => e.name)).toContain('onfocus')
  })
})

// ============================================================
// 6. ACTIONS MIT TARGETS
// ============================================================
describe('Actions mit Targets', () => {

  it('highlight next action parst', () => {
    const ast = parse(`ListNav as Frame:
  onkeydown arrow-down: highlight next`)
    expect(ast.components[0].events[0].actions[0].name).toBe('highlight')
    expect(ast.components[0].events[0].actions[0].target).toBe('next')
  })

  it('highlight prev action parst', () => {
    const ast = parse(`ListNavUp as Frame:
  onkeydown arrow-up: highlight prev`)
    expect(ast.components[0].events[0].actions[0].target).toBe('prev')
  })

  it('highlight first action parst', () => {
    const ast = parse(`ListNavHome as Frame:
  onkeydown home: highlight first`)
    expect(ast.components[0].events[0].actions[0].target).toBe('first')
  })

  it('highlight last action parst', () => {
    const ast = parse(`ListNavEnd as Frame:
  onkeydown end: highlight last`)
    expect(ast.components[0].events[0].actions[0].target).toBe('last')
  })

  it('navigate action parst', () => {
    const ast = parse(`NavLink as Link:
  onclick navigate /dashboard`)
    expect(ast.components[0].events[0].actions[0].name).toBe('navigate')
  })

  it('focus action parst', () => {
    const ast = parse(`FocusButton as Button:
  onclick focus Input`)
    expect(ast.components[0].events[0].actions[0].name).toBe('focus')
  })

  it('blur action parst', () => {
    const ast = parse(`BlurButton as Button:
  onclick blur Input`)
    expect(ast.components[0].events[0].actions[0].name).toBe('blur')
  })

  it('submit action parst', () => {
    const ast = parse(`SubmitButton as Button:
  onclick submit Form`)
    expect(ast.components[0].events[0].actions[0].name).toBe('submit')
  })

  it('reset action parst', () => {
    const ast = parse(`ResetButton as Button:
  onclick reset Form`)
    expect(ast.components[0].events[0].actions[0].name).toBe('reset')
  })
})

// ============================================================
// 7. ICON PROPERTIES
// ============================================================
describe('Icon Properties', () => {
  // Mirror-Philosophie: Icons sind Spans, nutzen Standard-Properties
  // icon-size = fs, icon-color = col, icon-weight = weight

  function getStyle(node: any, prop: string): string | undefined {
    return node.styles.find((s: any) => s.property === prop)?.value
  }

  it('Icon mit fs (font-size)', () => {
    const ir = getIR(`Icon "home" fs 24`)
    expect(getStyle(ir.nodes[0], 'font-size')).toBe('24px')
  })

  it('Icon mit col (color)', () => {
    const ir = getIR(`Icon "home" col #f00`)
    expect(getStyle(ir.nodes[0], 'color')).toBe('#f00')
  })

  it('Icon mit weight', () => {
    const ir = getIR(`Icon "home" weight 300`)
    expect(getStyle(ir.nodes[0], 'font-weight')).toBe('300')
  })

  it('Icon mit size (width/height)', () => {
    const ir = getIR(`Icon "home" size 32`)
    // Note: Icon has default size (20px), our size overrides it
    // Last value wins, so we check that 32px is in the styles
    const hasWidth32 = ir.nodes[0].styles.some((s: any) => s.property === 'width' && s.value === '32px')
    const hasHeight32 = ir.nodes[0].styles.some((s: any) => s.property === 'height' && s.value === '32px')
    expect(hasWidth32).toBe(true)
    expect(hasHeight32).toBe(true)
  })

  it('Icon kombiniert: fs, col, weight', () => {
    const ir = getIR(`Icon "home" fs 20 col #333 weight bold`)
    expect(getStyle(ir.nodes[0], 'font-size')).toBe('20px')
    expect(getStyle(ir.nodes[0], 'color')).toBe('#333')
    expect(getStyle(ir.nodes[0], 'font-weight')).toBe('700')
  })
})

// ============================================================
// 8. ANIMATION KEYWORDS
// ============================================================
describe('Animation Keywords', () => {
  // Animation property generates CSS animation with predefined keyframe names

  function getAnimationStyle(ir: any): string | undefined {
    return ir.nodes[0].styles.find((s: any) => s.property === 'animation')?.value
  }

  it('animation fade-in generiert CSS animation', () => {
    const ir = getIR(`Frame animation fade-in`)
    expect(getAnimationStyle(ir)).toBe('mirror-fade-in 0.3s ease forwards')
  })

  it('animation bounce generiert CSS animation', () => {
    const ir = getIR(`Frame animation bounce`)
    expect(getAnimationStyle(ir)).toBe('mirror-bounce 0.5s ease infinite')
  })

  it('animation spin generiert CSS animation', () => {
    const ir = getIR(`Icon "loading" animation spin`)
    expect(getAnimationStyle(ir)).toBe('mirror-spin 1s linear infinite')
  })

  it('animation pulse generiert CSS animation', () => {
    const ir = getIR(`Frame animation pulse`)
    expect(getAnimationStyle(ir)).toBe('mirror-pulse 1s ease infinite')
  })

  it('anim alias funktioniert', () => {
    const ir = getIR(`Frame anim fade-in`)
    expect(getAnimationStyle(ir)).toBe('mirror-fade-in 0.3s ease forwards')
  })
})

// ============================================================
// 9. CONTENT & INPUT PROPERTIES
// ============================================================
describe('Content & Input Properties', () => {

  it('href auf Link element', () => {
    const el = render(`Link "Click me" href "https://example.com"`)
    expect(el.getAttribute('href')).toBe('https://example.com')
  })

  it('src auf Image element', () => {
    const el = render(`Image src "image.png"`)
    expect(el.getAttribute('src')).toBe('image.png')
  })

  it('placeholder auf Input', () => {
    const el = render(`Input placeholder "Enter name"`)
    expect(el.getAttribute('placeholder')).toBe('Enter name')
  })

  it('type auf Input (password)', () => {
    const el = render(`Input type password`)
    expect(el.getAttribute('type')).toBe('password')
  })

  it('type auf Input (email)', () => {
    const el = render(`Input type email`)
    expect(el.getAttribute('type')).toBe('email')
  })

  it('name attribute auf Input', () => {
    const el = render(`Input name "username"`)
    expect(el.getAttribute('name')).toBe('username')
  })

  it('readonly auf Input', () => {
    const el = render(`Input readonly`)
    expect(el.hasAttribute('readonly')).toBe(true)
  })

  it('focusable auf Frame (tabindex)', () => {
    const el = render(`Frame focusable`)
    expect(el.hasAttribute('tabindex')).toBe(true)
  })
})

// ============================================================
// 10. SIZE PROPERTY EDGE CASES
// ============================================================
describe('Size Property', () => {

  it('size 100 setzt w und h', () => {
    const el = render(`Frame size 100`)
    expect(getStyle(el, 'width')).toBe('100px')
    expect(getStyle(el, 'height')).toBe('100px')
  })

  it('size full setzt flex für beide', () => {
    const el = render(`Frame size full`)
    expect(getStyle(el, 'flex')).toContain('1')
  })

  it('size hug setzt fit-content für beide', () => {
    const el = render(`Frame size hug`)
    expect(getStyle(el, 'width')).toBe('fit-content')
    expect(getStyle(el, 'height')).toBe('fit-content')
  })

  it('size 100 dann w 200 → width 200, height 100', () => {
    const el = render(`Frame size 100 w 200`)
    expect(getStyle(el, 'width')).toBe('200px')
    expect(getStyle(el, 'height')).toBe('100px')
  })

  it('w 200 h 100 dann size 50 → beide 50', () => {
    const el = render(`Frame w 200 h 100 size 50`)
    expect(getStyle(el, 'width')).toBe('50px')
    expect(getStyle(el, 'height')).toBe('50px')
  })
})

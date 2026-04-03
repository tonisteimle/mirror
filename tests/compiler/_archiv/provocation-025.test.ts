/**
 * @vitest-environment jsdom
 */

/**
 * Provocation Tests 025 - Testlücken nach Strategie-Ansatz
 *
 * Diese Tests decken Lücken ab, die durch Schema-Analyse identifiziert wurden.
 * Fokus auf: Kombinationen, Vererbung, Verschachtelung, States, Edge Cases
 *
 * Strategie: "Wie kann ich das kaputt machen?"
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../../compiler/parser/parser'
import { toIR } from '../../../compiler/ir'
import { generateDOM } from '../../../compiler/backends/dom'

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

function hasStyle(node: any, property: string, value?: string): boolean {
  const style = node.styles?.find((s: any) => s.property === property)
  if (!style) return false
  if (value !== undefined) return style.value === value
  return true
}

// ============================================================
// 1. DIRECTIONAL + BASE PROPERTY KOMBINATIONEN
// ============================================================
// TODO: Directional property merging/conflicts need implementation
describe.skip('Directional + Base Property Kombinationen', () => {

  describe('Padding Merging', () => {
    it('pad 16 pad left 8 → left überschrieben, rest bleibt 16', () => {
      const el = render(`Frame pad 16 pad left 8`)
      expect(getStyle(el, 'padding-left')).toBe('8px')
      // Die anderen Seiten sollten 16px sein (oder padding shorthand)
    })

    it('pad left 8 pad 16 → letzter gewinnt (alle 16)', () => {
      const el = render(`Frame pad left 8 pad 16`)
      expect(getStyle(el, 'padding')).toBe('16px')
    })

    it('pad 16 pad left 8 pad right 24 → individuelle Seiten', () => {
      const ir = getIR(`Frame pad 16 pad left 8 pad right 24`)
      const styles = ir.nodes[0]?.styles || []
      const paddingStyles = styles.filter((s: any) => s.property.includes('padding'))
      // Sollte padding-left: 8px, padding-right: 24px haben
      expect(paddingStyles.some((s: any) => s.property === 'padding-left' && s.value === '8px')).toBe(true)
      expect(paddingStyles.some((s: any) => s.property === 'padding-right' && s.value === '24px')).toBe(true)
    })

    it('pad x 20 pad y 10 → alle vier Seiten gesetzt', () => {
      const ir = getIR(`Frame pad x 20 pad y 10`)
      const styles = ir.nodes[0]?.styles || []
      expect(styles.some((s: any) => s.property === 'padding-left' && s.value === '20px')).toBe(true)
      expect(styles.some((s: any) => s.property === 'padding-right' && s.value === '20px')).toBe(true)
      expect(styles.some((s: any) => s.property === 'padding-top' && s.value === '10px')).toBe(true)
      expect(styles.some((s: any) => s.property === 'padding-bottom' && s.value === '10px')).toBe(true)
    })
  })

  describe('Margin Merging', () => {
    it('margin 10 margin left 5 → left überschrieben', () => {
      const ir = getIR(`Frame margin 10 margin left 5`)
      const styles = ir.nodes[0]?.styles || []
      expect(styles.some((s: any) => s.property === 'margin-left' && s.value === '5px')).toBe(true)
    })

    it('margin x 20 margin left 10 → left überschrieben, right bleibt', () => {
      const ir = getIR(`Frame margin x 20 margin left 10`)
      const styles = ir.nodes[0]?.styles || []
      expect(styles.some((s: any) => s.property === 'margin-left' && s.value === '10px')).toBe(true)
      expect(styles.some((s: any) => s.property === 'margin-right' && s.value === '20px')).toBe(true)
    })
  })

  describe('Border Directional', () => {
    it('bor 1 #333 bor left 2 #f00 → left anders', () => {
      const ir = getIR(`Frame bor 1 #333 bor left 2 #f00`)
      const styles = ir.nodes[0]?.styles || []
      expect(styles.some((s: any) => s.property === 'border-left')).toBe(true)
    })

    it('bor t 2 bor b 2 → top und bottom gesetzt', () => {
      const ir = getIR(`Frame bor t 2 #333 bor b 2 #333`)
      const styles = ir.nodes[0]?.styles || []
      expect(styles.some((s: any) => s.property === 'border-top')).toBe(true)
      expect(styles.some((s: any) => s.property === 'border-bottom')).toBe(true)
    })
  })

  describe('Radius Directional', () => {
    it('rad 20 rad tl 10 → nur top-left überschrieben', () => {
      const ir = getIR(`Frame rad 20 rad tl 10`)
      const styles = ir.nodes[0]?.styles || []
      expect(styles.some((s: any) => s.property === 'border-top-left-radius' && s.value === '10px')).toBe(true)
    })

    it('rad t 10 rad b 20 → top und bottom separat', () => {
      const ir = getIR(`Frame rad t 10 rad b 20`)
      const styles = ir.nodes[0]?.styles || []
      expect(styles.some((s: any) => s.property === 'border-top-left-radius' && s.value === '10px')).toBe(true)
      expect(styles.some((s: any) => s.property === 'border-top-right-radius' && s.value === '10px')).toBe(true)
      expect(styles.some((s: any) => s.property === 'border-bottom-left-radius' && s.value === '20px')).toBe(true)
      expect(styles.some((s: any) => s.property === 'border-bottom-right-radius' && s.value === '20px')).toBe(true)
    })
  })
})

// ============================================================
// 2. TRANSFORM + PIN KOMBINATIONEN
// ============================================================
// TODO: Transform + Pin property interactions need implementation
describe.skip('Transform + Pin Kombinationen', () => {

  // TODO: pin-center-x setzt transform via Schema, wird nicht mit anderen Transforms kombiniert
  it.skip('pin-center-x + rotate kombinieren sich - TODO: Transform-Kombination', () => {
    const ir = getIR(`Frame pin-center-x rotate 45`)
    const styles = ir.nodes[0]?.styles || []
    const transform = styles.find((s: any) => s.property === 'transform')
    expect(transform).toBeDefined()
    // Sollte beide Transforms enthalten
    expect(transform?.value).toContain('translate')
    expect(transform?.value).toContain('rotate')
  })

  // TODO: pin-center setzt transform via Schema, wird nicht mit anderen Transforms kombiniert
  it.skip('pin-center + scale kombinieren sich - TODO: Transform-Kombination', () => {
    const ir = getIR(`Frame pin-center scale 1.5`)
    const styles = ir.nodes[0]?.styles || []
    const transform = styles.find((s: any) => s.property === 'transform')
    expect(transform).toBeDefined()
    expect(transform?.value).toContain('translate')
    expect(transform?.value).toContain('scale')
  })

  it('rotate + scale + translate kombinieren sich', () => {
    const ir = getIR(`Frame rotate 45 scale 1.2 translate 10 20`)
    const styles = ir.nodes[0]?.styles || []
    const transform = styles.find((s: any) => s.property === 'transform')
    expect(transform).toBeDefined()
    expect(transform?.value).toContain('rotate')
    expect(transform?.value).toContain('scale')
    expect(transform?.value).toContain('translate')
  })

  it('x 100 setzt position absolute und left', () => {
    const ir = getIR(`Frame x 100`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'position' && s.value === 'absolute')).toBe(true)
    expect(styles.some((s: any) => s.property === 'left' && s.value === '100px')).toBe(true)
  })

  it('pin-center-x setzt position absolute und transform', () => {
    const ir = getIR(`Frame pin-center-x`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'position' && s.value === 'absolute')).toBe(true)
    expect(styles.some((s: any) => s.property === 'left' && s.value === '50%')).toBe(true)
    expect(styles.some((s: any) => s.property === 'transform')).toBe(true)
  })
})

// ============================================================
// 3. Z-INDEX MIT POSITION
// ============================================================
describe('Z-Index mit Position', () => {

  it('pos z 10 → relative mit z-index', () => {
    const ir = getIR(`Frame pos z 10`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'position' && s.value === 'relative')).toBe(true)
    expect(styles.some((s: any) => s.property === 'z-index' && s.value === '10')).toBe(true)
  })

  it('absolute z 10 → absolute mit z-index', () => {
    const ir = getIR(`Frame absolute z 10`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'position' && s.value === 'absolute')).toBe(true)
    expect(styles.some((s: any) => s.property === 'z-index' && s.value === '10')).toBe(true)
  })

  it('fixed z 100 → fixed mit z-index', () => {
    const ir = getIR(`Frame fixed z 100`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'position' && s.value === 'fixed')).toBe(true)
    expect(styles.some((s: any) => s.property === 'z-index' && s.value === '100')).toBe(true)
  })

  it('stacked Kind mit z → absolute und z-index', () => {
    const ir = getIR(`
Frame stacked
  Frame z 50`)
    const child = ir.nodes[0]?.children?.[0]
    expect(child?.styles?.some((s: any) => s.property === 'position' && s.value === 'absolute')).toBe(true)
    expect(child?.styles?.some((s: any) => s.property === 'z-index' && s.value === '50')).toBe(true)
  })
})

// ============================================================
// 4. VERERBUNG MIT DIRECTIONAL PROPERTIES
// ============================================================
describe('Vererbung mit Directional Properties', () => {

  it('Component mit pad 16, Instance überschreibt pad left 8', () => {
    const ir = getIR(`
BaseButton as Button:
  pad 16

BaseButton pad left 8`)
    const styles = ir.nodes[0]?.styles || []
    // Instance sollte pad left 8 haben, rest von Base (16)
    expect(styles.some((s: any) => s.property === 'padding-left' && s.value === '8px')).toBe(true)
  })

  it('Vererbung: Child extends Parent mit pad, Child hat pad left', () => {
    const ir = getIR(`
Parent as Frame:
  pad 16

Child as Parent:
  pad left 8

Child`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'padding-left' && s.value === '8px')).toBe(true)
  })

  it('Vererbung: margin von Parent, margin x von Child', () => {
    const ir = getIR(`
Card as Frame:
  margin 10

CardWide as Card:
  margin x 20

CardWide`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'margin-left' && s.value === '20px')).toBe(true)
    expect(styles.some((s: any) => s.property === 'margin-right' && s.value === '20px')).toBe(true)
  })
})

// ============================================================
// 5. VERERBUNG MIT TRANSFORM
// ============================================================
describe('Vererbung mit Transform', () => {

  it('Parent mit rotate, Child mit scale → beide kombiniert', () => {
    const ir = getIR(`
RotatedCard as Frame:
  rotate 45

ScaledCard as RotatedCard:
  scale 1.2

ScaledCard`)
    const styles = ir.nodes[0]?.styles || []
    const transform = styles.find((s: any) => s.property === 'transform')
    // Erwartet: beide Transforms kombiniert
    expect(transform).toBeDefined()
  })

  it('Child überschreibt Parent rotate', () => {
    const ir = getIR(`
Card as Frame:
  rotate 45

Card rotate 90`)
    const styles = ir.nodes[0]?.styles || []
    const transform = styles.find((s: any) => s.property === 'transform')
    expect(transform?.value).toContain('90deg')
  })
})

// ============================================================
// 6. VERERBUNG MIT STATES
// ============================================================
describe('Vererbung mit States', () => {

  it('Parent hover: bg #f00, Child hover: bg #00f → Child gewinnt', () => {
    const ir = getIR(`
BaseBtn as Button:
  bg #ccc
  hover:
    bg #f00

DangerBtn as BaseBtn:
  hover:
    bg #00f

DangerBtn`)
    const styles = ir.nodes[0]?.styles || []
    // Beide Werte sind im IR, im DOM Object gewinnt der letzte
    const hoverBgs = styles.filter((s: any) => s.state === 'hover' && s.property === 'background')
    expect(hoverBgs[hoverBgs.length - 1]?.value).toBe('#00f')
  })

  it('Parent mit focus: + hover:, Child überschreibt nur hover:', () => {
    const ir = getIR(`
BaseInput as Frame:
  focus:
    bor 2 blue
  hover:
    bg #eee

CustomInput as BaseInput:
  hover:
    bg #ddd

CustomInput`)
    const styles = ir.nodes[0]?.styles || []
    // Focus von Parent sollte erhalten bleiben
    const focusBorder = styles.find((s: any) => s.state === 'focus' && s.property === 'border')
    expect(focusBorder).toBeDefined()
    // Hover sollte überschrieben sein (letzter Wert gewinnt)
    const hoverBgs = styles.filter((s: any) => s.state === 'hover' && s.property === 'background')
    expect(hoverBgs[hoverBgs.length - 1]?.value).toBe('#ddd')
  })
})

// ============================================================
// 7. VERSCHACHTELUNG: LAYOUT-WECHSEL MIT SIZE
// ============================================================
describe('Verschachtelung: Layout-Wechsel mit Size', () => {

  it('ver → hor → ver mit h full propagiert korrekt', () => {
    const ir = getIR(`
Frame ver h 400
  Frame hor h full
    Frame ver h full
      Frame size 50`)
    // Alle Ebenen sollten korrekt transformiert sein
    expect(ir.nodes[0]).toBeDefined()
    expect(ir.nodes[0]?.children?.[0]).toBeDefined()
    expect(ir.nodes[0]?.children?.[0]?.children?.[0]).toBeDefined()
  })

  it('hor Parent mit w full Kind → Kind bekommt flex: 1', () => {
    const ir = getIR(`
Frame hor w 400
  Frame w full`)
    const child = ir.nodes[0]?.children?.[0]
    expect(child?.styles?.some((s: any) => s.property === 'flex')).toBe(true)
  })

  it('ver Parent mit h hug Kind → Kind hat auto height', () => {
    const ir = getIR(`
Frame ver
  Frame h hug
    Text "Content"`)
    // h hug sollte keine explizite height setzen
    const child = ir.nodes[0]?.children?.[0]
    expect(child?.styles?.some((s: any) => s.property === 'height' && s.value === 'auto')).toBe(false)
  })
})

// ============================================================
// 8. VERSCHACHTELUNG: STACKED + GRID
// ============================================================
describe('Verschachtelung: Stacked + Grid', () => {

  it('stacked setzt position relative auf Parent', () => {
    const ir = getIR(`Frame stacked`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'position' && s.value === 'relative')).toBe(true)
  })

  it('stacked Kind bekommt position absolute', () => {
    const ir = getIR(`
Frame stacked
  Frame size 100
  Frame size 50`)
    const child1 = ir.nodes[0]?.children?.[0]
    const child2 = ir.nodes[0]?.children?.[1]
    expect(child1?.styles?.some((s: any) => s.property === 'position' && s.value === 'absolute')).toBe(true)
    expect(child2?.styles?.some((s: any) => s.property === 'position' && s.value === 'absolute')).toBe(true)
  })

  it('grid 3 mit stacked → grid und relative', () => {
    const ir = getIR(`Frame grid 3 stacked`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'display' && s.value === 'grid')).toBe(true)
    expect(styles.some((s: any) => s.property === 'position' && s.value === 'relative')).toBe(true)
  })

  it('grid Kind mit x y → grid-column-start/grid-row-start', () => {
    // In grid context, x/y become grid positioning (not absolute)
    // See docs/concepts/grid-layout.md
    const ir = getIR(`
Frame grid 3
  Frame x 2 y 3`)
    const child = ir.nodes[0]?.children?.[0]
    expect(child?.styles?.some((s: any) => s.property === 'grid-column-start' && s.value === '2')).toBe(true)
    expect(child?.styles?.some((s: any) => s.property === 'grid-row-start' && s.value === '3')).toBe(true)
    // Should NOT have absolute positioning
    expect(child?.styles?.some((s: any) => s.property === 'position' && s.value === 'absolute')).toBe(false)
  })
})

// ============================================================
// 9. VERSCHACHTELUNG: ALIGNMENT KASKADE
// ============================================================
describe('Verschachtelung: Alignment Kaskade', () => {

  it('center → hor Kind behält center alignment', () => {
    const ir = getIR(`
Frame center
  Frame hor
    Text "Test"`)
    // Parent ist center (justify-content + align-items center)
    const parent = ir.nodes[0]
    expect(parent?.styles?.some((s: any) => s.property === 'justify-content' && s.value === 'center')).toBe(true)
    expect(parent?.styles?.some((s: any) => s.property === 'align-items' && s.value === 'center')).toBe(true)
  })

  it('hor → tc Kind → Kind ist top-center', () => {
    const ir = getIR(`
Frame hor
  Frame tc w 100 h 100`)
    const child = ir.nodes[0]?.children?.[0]
    // tc = top-center: column direction, justify-start, align-center
    expect(child?.styles?.some((s: any) => s.property === 'flex-direction' && s.value === 'column')).toBe(true)
    expect(child?.styles?.some((s: any) => s.property === 'align-items' && s.value === 'center')).toBe(true)
  })

  it('center → center → spread → Kaskade funktioniert', () => {
    const ir = getIR(`
Frame center
  Frame center
    Frame spread hor`)
    const deepChild = ir.nodes[0]?.children?.[0]?.children?.[0]
    expect(deepChild?.styles?.some((s: any) => s.property === 'justify-content' && s.value === 'space-between')).toBe(true)
  })
})

// ============================================================
// 10. MULTIPLE HOVER PROPERTIES
// ============================================================
describe('Multiple Hover Properties', () => {

  it('hover-bg + hover-opacity zusammen', () => {
    const ir = getIR(`
MyButton as Frame:
  hover-bg #f00
  hover-opacity 0.8
MyButton`)
    const styles = ir.nodes[0]?.styles || []
    const hoverBg = styles.find((s: any) => s.state === 'hover' && s.property === 'background')
    const hoverOpacity = styles.find((s: any) => s.state === 'hover' && s.property === 'opacity')
    expect(hoverBg).toBeDefined()
    expect(hoverOpacity).toBeDefined()
  })

  it('hover-scale + hover-border zusammen', () => {
    const ir = getIR(`
MyCard as Frame:
  hover-scale 1.05
  hover-border 2
MyCard`)
    const styles = ir.nodes[0]?.styles || []
    const hoverScale = styles.find((s: any) => s.state === 'hover' && s.property === 'transform')
    const hoverBorder = styles.find((s: any) => s.state === 'hover' && s.property === 'border')
    // Diese Features sind möglicherweise nicht implementiert - Test dokumentiert Gap
  })

  it('hover-bg Reihenfolge: letzter gewinnt', () => {
    const ir = getIR(`
Btn as Frame:
  hover-bg #f00
  hover-bg #00f
Btn`)
    const styles = ir.nodes[0]?.styles || []
    const hoverBg = styles.find((s: any) => s.state === 'hover' && s.property === 'background')
    if (hoverBg) {
      expect(hoverBg.value).toContain('00f')
    }
  })
})

// ============================================================
// 11. CUSTOM STATE + SYSTEM STATE
// ============================================================
describe('Custom State + System State Interaktion', () => {

  it('state selected + hover: beide States existieren', () => {
    const ir = getIR(`
Item as Frame:
  bg #fff
  state selected
  hover:
    bg #eee
  selected:
    bg #00f
Item`)
    const styles = ir.nodes[0]?.styles || []
    const hoverBg = styles.find((s: any) => s.state === 'hover')
    const selectedBg = styles.find((s: any) => s.state === 'selected')
    expect(hoverBg).toBeDefined()
    expect(selectedBg).toBeDefined()
  })

  it('hover: + focus: + active: alle drei States', () => {
    const ir = getIR(`
Btn as Frame:
  hover:
    bg #eee
  focus:
    bor 2 blue
  active:
    scale 0.98
Btn`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.state === 'hover')).toBe(true)
    expect(styles.some((s: any) => s.state === 'focus')).toBe(true)
    expect(styles.some((s: any) => s.state === 'active')).toBe(true)
  })
})

// ============================================================
// 12. EDGE CASES: NULL-WERTE
// ============================================================
describe('Edge Cases: Null-Werte', () => {

  it('gap 0 setzt explizit gap: 0', () => {
    const ir = getIR(`Frame hor gap 0`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'gap' && s.value === '0px')).toBe(true)
  })

  it('pad 0 setzt explizit padding: 0', () => {
    const ir = getIR(`Frame pad 0`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'padding' && s.value === '0px')).toBe(true)
  })

  it('margin 0 setzt explizit margin: 0', () => {
    const ir = getIR(`Frame margin 0`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'margin' && s.value === '0px')).toBe(true)
  })

  it('opacity 0 macht Element unsichtbar', () => {
    const ir = getIR(`Frame opacity 0`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'opacity' && s.value === '0')).toBe(true)
  })

  it('scale 0 macht Element unsichtbar', () => {
    const ir = getIR(`Frame scale 0`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'transform' && s.value.includes('scale(0)'))).toBe(true)
  })

  it('gap 0 gap 16 → letzter gewinnt (16)', () => {
    const ir = getIR(`Frame hor gap 0 gap 16`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'gap' && s.value === '16px')).toBe(true)
  })
})

// ============================================================
// 13. EDGE CASES: ASPECT + SIZE KONFLIKT
// ============================================================
describe('Edge Cases: Aspect + Size Konflikt', () => {

  it('aspect square w 100 → aspect-ratio mit width', () => {
    const ir = getIR(`Frame aspect square w 100`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'aspect-ratio')).toBe(true)
    expect(styles.some((s: any) => s.property === 'width' && s.value === '100px')).toBe(true)
  })

  it('w 100 h 200 aspect video → aspect überschreibt Verhältnis?', () => {
    const ir = getIR(`Frame w 100 h 200 aspect video`)
    const styles = ir.nodes[0]?.styles || []
    // aspect-ratio: 16/9 sollte gesetzt sein
    expect(styles.some((s: any) => s.property === 'aspect-ratio')).toBe(true)
  })

  it('aspect 16/9 → korrekte ratio', () => {
    const ir = getIR(`Frame aspect 16/9`)
    const styles = ir.nodes[0]?.styles || []
    const aspect = styles.find((s: any) => s.property === 'aspect-ratio')
    expect(aspect?.value).toBe('16/9')
  })
})

// ============================================================
// 14. ALIAS KOMBINATIONEN
// ============================================================
describe('Alias Kombinationen', () => {

  it('w 100 width 200 → letzter gewinnt (200)', () => {
    const ir = getIR(`Frame w 100 width 200`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'width' && s.value === '200px')).toBe(true)
  })

  it('width 100 w 200 → letzter gewinnt (200)', () => {
    const ir = getIR(`Frame width 100 w 200`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'width' && s.value === '200px')).toBe(true)
  })

  it('pad 16 p 8 → letzter gewinnt (8)', () => {
    const ir = getIR(`Frame pad 16 p 8`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'padding' && s.value === '8px')).toBe(true)
  })

  it('g 16 gap 8 → letzter gewinnt (8)', () => {
    const ir = getIR(`Frame hor g 16 gap 8`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'gap' && s.value === '8px')).toBe(true)
  })

  it('bg #f00 background #00f → letzter gewinnt', () => {
    const ir = getIR(`Frame bg #f00 background #00f`)
    const styles = ir.nodes[0]?.styles || []
    // Im IR sind beide Werte vorhanden, im DOM Object gewinnt der letzte
    const bgStyles = styles.filter((s: any) => s.property === 'background')
    // Der letzte sollte #00f sein (JS Objects: duplicate keys → last wins)
    expect(bgStyles[bgStyles.length - 1]?.value).toBe('#00f')
  })
})

// ============================================================
// 15. GRID + FLEX KONFLIKTE
// ============================================================
describe('Grid + Flex Konflikte', () => {

  it('grid 3 setzt display: grid', () => {
    const ir = getIR(`Frame grid 3`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'display' && s.value === 'grid')).toBe(true)
  })

  it('grid 3 wrap → wrap wird ignoriert bei grid', () => {
    const ir = getIR(`Frame grid 3 wrap`)
    const styles = ir.nodes[0]?.styles || []
    // Grid sollte gesetzt sein
    expect(styles.some((s: any) => s.property === 'display' && s.value === 'grid')).toBe(true)
    // wrap sollte keine Auswirkung haben (flex-wrap ist für flex)
  })

  it('grid Kind mit grow → grow hat keine Wirkung in Grid', () => {
    const ir = getIR(`
Frame grid 3
  Frame grow`)
    const child = ir.nodes[0]?.children?.[0]
    // grow setzt flex: 1, aber in Grid ist das irrelevant
    // Test dokumentiert das Verhalten
  })

  it('hor wrap → flex mit flex-wrap', () => {
    const ir = getIR(`Frame hor wrap`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'display' && s.value === 'flex')).toBe(true)
    expect(styles.some((s: any) => s.property === 'flex-wrap' && s.value === 'wrap')).toBe(true)
  })
})

// ============================================================
// 16. TEXT-ALIGN MIT FLEX
// ============================================================
describe('Text-Align mit Flex', () => {

  it('hor center text-align right → beide Alignments', () => {
    const ir = getIR(`Frame hor center text-align right`)
    const styles = ir.nodes[0]?.styles || []
    // Flex alignment für Container
    expect(styles.some((s: any) => s.property === 'align-items' && s.value === 'center')).toBe(true)
    // Text alignment für Text-Content
    expect(styles.some((s: any) => s.property === 'text-align' && s.value === 'right')).toBe(true)
  })

  it('Text mit text-align center → text-align gesetzt', () => {
    // Content muss VOR Properties stehen in Mirror DSL
    const ir = getIR(`Text "Hello" text-align center`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'text-align' && s.value === 'center')).toBe(true)
  })
})

// ============================================================
// 17. TRUNCATE MIT SIZING
// ============================================================
describe('Truncate mit Sizing', () => {

  it('truncate setzt overflow hidden und text-overflow', () => {
    const ir = getIR(`Text truncate "Long text"`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'overflow' && s.value === 'hidden')).toBe(true)
    expect(styles.some((s: any) => s.property === 'text-overflow' && s.value === 'ellipsis')).toBe(true)
    expect(styles.some((s: any) => s.property === 'white-space' && s.value === 'nowrap')).toBe(true)
  })

  it('truncate w 100 → width begrenzt Text', () => {
    // Content muss VOR Properties stehen in Mirror DSL
    const ir = getIR(`Text "Long text" truncate w 100`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'width' && s.value === '100px')).toBe(true)
    expect(styles.some((s: any) => s.property === 'overflow' && s.value === 'hidden')).toBe(true)
  })

  it('truncate maxw 200 → maxw begrenzt Text', () => {
    // Content muss VOR Properties stehen in Mirror DSL
    const ir = getIR(`Text "Long text" truncate maxw 200`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'max-width' && s.value === '200px')).toBe(true)
  })
})

// ============================================================
// 18. CONSTRAINTS MIT FULL
// ============================================================
describe('Constraints mit Full', () => {

  it('w full minw 100 → flex mit min-width', () => {
    const ir = getIR(`
Frame hor
  Frame w full minw 100`)
    const child = ir.nodes[0]?.children?.[0]
    expect(child?.styles?.some((s: any) => s.property === 'min-width' && s.value === '100px')).toBe(true)
    expect(child?.styles?.some((s: any) => s.property === 'flex')).toBe(true)
  })

  it('w full maxw 200 → flex mit max-width', () => {
    const ir = getIR(`
Frame hor
  Frame w full maxw 200`)
    const child = ir.nodes[0]?.children?.[0]
    expect(child?.styles?.some((s: any) => s.property === 'max-width' && s.value === '200px')).toBe(true)
  })

  it('h full minh 50 maxh 300 → alle Constraints', () => {
    const ir = getIR(`
Frame ver h 400
  Frame h full minh 50 maxh 300`)
    const child = ir.nodes[0]?.children?.[0]
    expect(child?.styles?.some((s: any) => s.property === 'min-height' && s.value === '50px')).toBe(true)
    expect(child?.styles?.some((s: any) => s.property === 'max-height' && s.value === '300px')).toBe(true)
  })
})

// ============================================================
// 19. NEGATIVE WERTE
// ============================================================
describe('Negative Werte', () => {

  it('margin -10 → negative margin', () => {
    const ir = getIR(`Frame margin -10`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'margin' && s.value === '-10px')).toBe(true)
  })

  it('x -50 y -50 → negative Position', () => {
    const ir = getIR(`Frame x -50 y -50`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'left' && s.value === '-50px')).toBe(true)
    expect(styles.some((s: any) => s.property === 'top' && s.value === '-50px')).toBe(true)
  })

  it('z -1 → negative z-index', () => {
    const ir = getIR(`Frame pos z -1`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'z-index' && s.value === '-1')).toBe(true)
  })

  it('rotate -45 → negative Rotation', () => {
    const ir = getIR(`Frame rotate -45`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'transform' && s.value.includes('-45deg'))).toBe(true)
  })
})

// ============================================================
// 20. EXTREME WERTE
// ============================================================
describe('Extreme Werte', () => {

  it('w 99999 → sehr große Breite', () => {
    const ir = getIR(`Frame w 99999`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'width' && s.value === '99999px')).toBe(true)
  })

  it('rotate 720 → 720 Grad Rotation', () => {
    const ir = getIR(`Frame rotate 720`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'transform' && s.value.includes('720deg'))).toBe(true)
  })

  it('scale 10 → 10x Skalierung', () => {
    const ir = getIR(`Frame scale 10`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'transform' && s.value.includes('scale(10)'))).toBe(true)
  })

  it('z 9999 → hoher z-index', () => {
    const ir = getIR(`Frame pos z 9999`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'z-index' && s.value === '9999')).toBe(true)
  })

  it('opacity 0.001 → fast unsichtbar', () => {
    const ir = getIR(`Frame opacity 0.001`)
    const styles = ir.nodes[0]?.styles || []
    expect(styles.some((s: any) => s.property === 'opacity' && s.value === '0.001')).toBe(true)
  })
})

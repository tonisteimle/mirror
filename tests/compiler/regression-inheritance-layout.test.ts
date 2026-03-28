/**
 * Deep Edge Cases 012: Gezielte Fehlersuche
 *
 * Komplexe Kombinationen die schiefgehen könnten.
 */

import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

describe('Deep Edge Cases', () => {

  function getStyle(node: any, property: string): string | undefined {
    // Filter out hover/state styles - only get base styles
    const matches = node.styles.filter((s: any) => s.property === property && !s.state)
    return matches.length > 0 ? matches[matches.length - 1].value : undefined
  }

  function getHoverStyle(node: any, property: string): string | undefined {
    const match = node.styles.find((s: any) => s.property === property && s.state === 'hover')
    return match?.value
  }

  // ============================================================
  // 1. Vererbung + Layout Kombinationen
  // ============================================================
  describe('Vererbung + Layout', () => {

    test('Kind überschreibt Parent Layout komplett', () => {
      const ir = toIR(parse(`
VerticalBox as Frame:
  ver
  center
  gap 20

HorizontalBox extends VerticalBox:
  hor
  spread

HorizontalBox
`))
      const node = ir.nodes[0]

      // hor überschreibt ver
      expect(getStyle(node, 'flex-direction')).toBe('row')
      // spread überschreibt center für justify
      expect(getStyle(node, 'justify-content')).toBe('space-between')
      // gap sollte vererbt werden
      expect(getStyle(node, 'gap')).toBe('20px')
    })

    test('Mehrfache Vererbung: A extends B extends C', () => {
      const ir = toIR(parse(`
Base as Frame:
  ver
  gap 10

Middle extends Base:
  hor

Final extends Middle:
  center

Final
`))
      const node = ir.nodes[0]

      console.log('A extends B extends C:', {
        direction: getStyle(node, 'flex-direction'),
        justify: getStyle(node, 'justify-content'),
        gap: getStyle(node, 'gap'),
      })

      // Final hat: ver (Base) → hor (Middle) → center (Final)
      // Direction: hor gewinnt (Middle)
      // Alignment: center (Final)
      // Gap: 10px (Base, nie überschrieben)
      expect(getStyle(node, 'flex-direction')).toBe('row')
      expect(getStyle(node, 'gap')).toBe('10px')
    })

    test('Vererbung mit 9-Zone', () => {
      const ir = toIR(parse(`
TopLeft as Frame:
  tl

TopRight extends TopLeft:
  tr

TopRight
`))
      const node = ir.nodes[0]

      // tr überschreibt tl
      expect(getStyle(node, 'justify-content')).toBe('flex-start')
      expect(getStyle(node, 'align-items')).toBe('flex-end')
    })

  })

  // ============================================================
  // 2. Zag-Komponenten + Layout
  // ============================================================
  describe('Zag + Layout', () => {

    test('Select mit Layout-Properties', () => {
      const ir = toIR(parse(`
Select w 200 pad 10
  Item "A"
  Item "B"
`))
      const node = ir.nodes[0]

      // Select hat jetzt width und padding
      expect(getStyle(node, 'width')).toBe('200px')
      expect(getStyle(node, 'padding')).toBe('10px')
    })

    test('Frame mit Select Kind - Layout funktioniert', () => {
      const ir = toIR(parse(`
Frame hor gap 20
  Frame w 100
  Select w full
    Item "A"
  Frame w 100
`))
      const parent = ir.nodes[0]
      const [left, select, right] = parent.children

      expect(getStyle(parent, 'flex-direction')).toBe('row')
      expect(getStyle(parent, 'gap')).toBe('20px')
      expect(getStyle(left, 'width')).toBe('100px')
      expect(getStyle(select, 'flex')).toBe('1 1 0%')
      expect(getStyle(right, 'width')).toBe('100px')
    })

  })

  // ============================================================
  // 3. States mit Layout (experimentell)
  // ============================================================
  describe('States + Layout', () => {

    test('hover-bg funktioniert', () => {
      const ir = toIR(parse(`Frame bg #f00 hover-bg #0f0`))
      const node = ir.nodes[0]

      expect(getStyle(node, 'background')).toBe('#f00')
      expect(getHoverStyle(node, 'background')).toBe('#0f0')
    })

    test('state block mit bg', () => {
      const ir = toIR(parse(`
Frame bg #f00
  state hover
    bg #0f0
`))
      const node = ir.nodes[0]

      // Normale bg
      expect(getStyle(node, 'background')).toBe('#f00')
      // Hover bg sollte als conditional style existieren
      const hoverStyles = node.styles.filter((s: any) => s.state === 'hover')
      console.log('state block hover styles:', hoverStyles)
    })

  })

  // ============================================================
  // 4. Tokens in Layout
  // ============================================================
  describe('Tokens', () => {

    test('Token für gap', () => {
      const ir = toIR(parse(`
$spacing: 20

Frame gap $spacing
`))
      const node = ir.nodes[0]
      const gap = getStyle(node, 'gap')

      console.log('Token gap:', gap)
      // Token sollte aufgelöst werden zu 20px
      // oder als CSS variable var(--spacing)
      expect(gap).toBeDefined()
    })

    test('Token für Farbe', () => {
      const ir = toIR(parse(`
$primary: #f00

Frame bg $primary
`))
      const node = ir.nodes[0]
      const bg = getStyle(node, 'background')

      console.log('Token bg:', bg)
      expect(bg).toBeDefined()
    })

  })

  // ============================================================
  // 5. Komplexe verschachtelte Strukturen
  // ============================================================
  describe('Verschachtelte Strukturen', () => {

    test('3 Ebenen tief mit unterschiedlichen Layouts', () => {
      const ir = toIR(parse(`
Frame hor gap 10
  Frame ver gap 5 w 200
    Frame h 50 bg #f00
    Frame h full bg #0f0
  Frame w full center
    Text "Mitte"
  Frame ver gap 5 w 200
    Frame h 50 bg #00f
    Frame h full bg #ff0
`))
      const outer = ir.nodes[0]
      const [left, middle, right] = outer.children

      // Outer: horizontal
      expect(getStyle(outer, 'flex-direction')).toBe('row')
      expect(getStyle(outer, 'gap')).toBe('10px')

      // Left: vertical, feste Breite
      expect(getStyle(left, 'flex-direction')).toBe('column')
      expect(getStyle(left, 'width')).toBe('200px')
      expect(getStyle(left, 'gap')).toBe('5px')

      // Middle: füllt, zentriert
      expect(getStyle(middle, 'flex')).toBe('1 1 0%')
      expect(getStyle(middle, 'justify-content')).toBe('center')

      // Right: wie left
      expect(getStyle(right, 'flex-direction')).toBe('column')
      expect(getStyle(right, 'width')).toBe('200px')
    })

    test('Sidebar Layout Pattern', () => {
      const ir = toIR(parse(`
Frame hor h full
  Frame ver w 250 bg #222
    Text "Sidebar"
  Frame ver w full
    Frame hor h 60 bg #333
      Text "Header"
    Frame h full
      Text "Content"
`))
      const root = ir.nodes[0]
      const [sidebar, main] = root.children
      const [header, content] = main.children

      // Root horizontal
      expect(getStyle(root, 'flex-direction')).toBe('row')

      // Sidebar feste Breite
      expect(getStyle(sidebar, 'width')).toBe('250px')

      // Main füllt
      expect(getStyle(main, 'flex')).toBe('1 1 0%')

      // Header feste Höhe
      expect(getStyle(header, 'height')).toBe('60px')

      // Content füllt
      expect(getStyle(content, 'flex')).toBe('1 1 0%')
    })

  })

  // ============================================================
  // 6. Edge Cases bei Größen
  // ============================================================
  describe('Größen Edge Cases', () => {

    test('minw und maxw zusammen', () => {
      // Root elements: w full → width: 100% (not flex: 1 1 0%)
      // but minw/maxw should still be preserved
      const ir = toIR(parse(`Frame minw 100 maxw 500 w full`))
      const node = ir.nodes[0]

      expect(getStyle(node, 'min-width')).toBe('100px')
      expect(getStyle(node, 'max-width')).toBe('500px')
      expect(getStyle(node, 'width')).toBe('100%')
    })

    test('minw und maxw als flex-kind', () => {
      // As child of flex container: w full → flex: 1 1 0%
      // minw/maxw should be preserved
      const ir = toIR(parse(`
Frame hor
  Frame minw 100 maxw 500 w full
`))
      const child = ir.nodes[0].children[0]

      expect(getStyle(child, 'min-width')).toBe('100px')
      expect(getStyle(child, 'max-width')).toBe('500px')
      expect(getStyle(child, 'flex')).toBe('1 1 0%')
    })

    test('size setzt width UND height', () => {
      const ir = toIR(parse(`Frame size 100`))
      const node = ir.nodes[0]

      expect(getStyle(node, 'width')).toBe('100px')
      expect(getStyle(node, 'height')).toBe('100px')
    })

    test('aspect ratio', () => {
      const ir = toIR(parse(`Frame w 200 aspect video`))
      const node = ir.nodes[0]

      expect(getStyle(node, 'width')).toBe('200px')
      expect(getStyle(node, 'aspect-ratio')).toBe('16/9')
    })

  })

  // ============================================================
  // 7. Position Edge Cases
  // ============================================================
  describe('Position Edge Cases', () => {

    test('pin-left + pin-right = stretched', () => {
      const ir = toIR(parse(`
Frame pos w 400 h 200
  Frame pin-left 10 pin-right 10 h 50
`))
      const child = ir.nodes[0].children[0]

      expect(getStyle(child, 'position')).toBe('absolute')
      expect(getStyle(child, 'left')).toBe('10px')
      expect(getStyle(child, 'right')).toBe('10px')
      expect(getStyle(child, 'height')).toBe('50px')
    })

    test('pin-center (both axes)', () => {
      const ir = toIR(parse(`
Frame pos w 400 h 400
  Frame pin-center w 100 h 100
`))
      const child = ir.nodes[0].children[0]

      expect(getStyle(child, 'position')).toBe('absolute')
      expect(getStyle(child, 'left')).toBe('50%')
      expect(getStyle(child, 'top')).toBe('50%')
      // transform sollte translate(-50%, -50%) enthalten
      const transform = getStyle(child, 'transform')
      console.log('pin-center transform:', transform)
      expect(transform).toContain('translate')
    })

  })

  // ============================================================
  // 8. Leere und minimale Fälle
  // ============================================================
  describe('Minimale Fälle', () => {

    test('Leerer Frame', () => {
      const ir = toIR(parse(`Frame`))
      expect(ir.nodes.length).toBe(1)
      expect(ir.nodes[0].tag).toBe('div')
    })

    test('Nur Text', () => {
      const ir = toIR(parse(`Text "Hello"`))
      expect(ir.nodes.length).toBe(1)
      expect(ir.nodes[0].tag).toBe('span')
    })

    test('Frame mit nur Kindern, keine Properties', () => {
      const ir = toIR(parse(`
Frame
  Frame
  Frame
`))
      expect(ir.nodes[0].children.length).toBe(2)
    })

  })

})

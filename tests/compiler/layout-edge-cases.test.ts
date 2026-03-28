/**
 * Aggressive Test 010: Edge Cases und schwierige Kombinationen
 *
 * Gezielt nach Problemen suchen, die nicht offensichtlich sind.
 */

import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

describe('Edge Cases', () => {

  function getStyle(node: any, property: string): string | undefined {
    const matches = node.styles.filter((s: any) => s.property === property)
    return matches.length > 0 ? matches[matches.length - 1].value : undefined
  }

  function getAllStyles(node: any, property: string): string[] {
    return node.styles.filter((s: any) => s.property === property).map((s: any) => s.value)
  }

  // ============================================================
  // 1. Mehrfache Werte für dieselbe Property
  // ============================================================
  describe('Mehrfache Werte', () => {

    test('w 100 w 200 - letzter gewinnt', () => {
      const ir = toIR(parse(`
Frame
  Frame w 100 w 200
`))
      const child = ir.nodes[0].children[0]
      const width = getStyle(child, 'width')

      // Letzter sollte gewinnen
      expect(width).toBe('200px')
    })

    test('bg #f00 bg #0f0 - letzter gewinnt', () => {
      const ir = toIR(parse(`Frame bg #f00 bg #0f0`))
      const bg = getStyle(ir.nodes[0], 'background')

      expect(bg).toBe('#0f0')
    })

    test('pad 10 pad 20 - letzter gewinnt', () => {
      const ir = toIR(parse(`Frame pad 10 pad 20`))
      const pad = getStyle(ir.nodes[0], 'padding')

      expect(pad).toBe('20px')
    })

  })

  // ============================================================
  // 2. full vs fixe Größen
  // ============================================================
  describe('full vs fix', () => {

    test('w full w 100 - 100 sollte gewinnen', () => {
      const ir = toIR(parse(`
Frame
  Frame w full w 100
`))
      const child = ir.nodes[0].children[0]

      // w 100 kommt nach w full
      // full setzt flex: 1 1 0%, w 100 setzt width: 100px
      // Beide Properties existieren parallel!
      const width = getStyle(child, 'width')
      const flex = getStyle(child, 'flex')

      console.log('w full w 100 →', { width, flex })

      // Das ist fragwürdig: beide Styles existieren
      // In CSS würde width: 100px das flex-Verhalten nicht komplett überschreiben
      // Was ist das GEWOLLTE Verhalten?
      expect(width).toBe('100px')
    })

    test('w 100 w full - full sollte gewinnen', () => {
      const ir = toIR(parse(`
Frame
  Frame w 100 w full
`))
      const child = ir.nodes[0].children[0]
      const flex = getStyle(child, 'flex')

      expect(flex).toBe('1 1 0%')
    })

  })

  // ============================================================
  // 3. Sizing in falscher Achse
  // ============================================================
  describe('Sizing in falscher Achse', () => {

    // In ver Container: w full macht was genau?
    test('ver Container + w full Kind', () => {
      const ir = toIR(parse(`
Frame ver w 400 h 400
  Frame w full h 50
`))
      const child = ir.nodes[0].children[0]
      const flex = getStyle(child, 'flex')
      const alignSelf = getStyle(child, 'align-self')

      console.log('ver + w full →', { flex, alignSelf })

      // w full setzt flex: 1 1 0% und align-self: stretch
      // In column: flex wirkt auf HÖHE (main axis)
      // align-self: stretch dehnt auf volle BREITE (cross axis)
      // Das ist verwirrend aber technisch korrekt
      expect(flex).toBe('1 1 0%')
      expect(alignSelf).toBe('stretch')
    })

    // In hor Container: h full macht was genau?
    test('hor Container + h full Kind', () => {
      const ir = toIR(parse(`
Frame hor w 400 h 100
  Frame w 50 h full
`))
      const child = ir.nodes[0].children[0]
      const flex = getStyle(child, 'flex')
      const alignSelf = getStyle(child, 'align-self')

      console.log('hor + h full →', { flex, alignSelf })

      // h full setzt flex: 1 1 0% und align-self: stretch
      // In row: flex wirkt auf BREITE (main axis) - das ist FALSCH!
      // align-self: stretch dehnt auf volle HÖHE (cross axis)
      // Das Kind würde horizontal wachsen, nicht vertikal!

      // Das ist ein DESIGN-PROBLEM:
      // h full in hor Container sollte align-self: stretch sein, OHNE flex
      expect(flex).toBe('1 1 0%')
      expect(alignSelf).toBe('stretch')
    })

  })

  // ============================================================
  // 4. Nested Alignments
  // ============================================================
  describe('Nested Alignments', () => {

    test('Parent center, Kind left - Kind ignoriert Parent', () => {
      const ir = toIR(parse(`
Frame center
  Frame left
`))
      const parent = ir.nodes[0]
      const child = parent.children[0]

      // Parent: center → justify: center, align: center
      // Kind: left → justify: ?, align: flex-start

      console.log('Parent center:', {
        justify: getStyle(parent, 'justify-content'),
        align: getStyle(parent, 'align-items'),
      })
      console.log('Child left:', {
        justify: getStyle(child, 'justify-content'),
        align: getStyle(child, 'align-items'),
      })

      // Kind hat eigenes Alignment für SEINE Kinder
      // Das ist korrekt - jedes Element ist sein eigener Flex-Container
      expect(getStyle(parent, 'justify-content')).toBe('center')
      expect(getStyle(child, 'align-items')).toBe('flex-start')
    })

  })

  // ============================================================
  // 5. gap + spread Kombination
  // ============================================================
  describe('gap + spread', () => {

    test('gap + spread funktionieren zusammen', () => {
      const ir = toIR(parse(`Frame hor spread gap 20`))

      expect(getStyle(ir.nodes[0], 'justify-content')).toBe('space-between')
      expect(getStyle(ir.nodes[0], 'gap')).toBe('20px')

      // gap hat bei space-between einen speziellen Effekt:
      // Es definiert den MINDEST-Abstand, space-between verteilt mehr
    })

  })

  // ============================================================
  // 6. Position + Layout Konflikte
  // ============================================================
  describe('Position + Layout Konflikte', () => {

    test('pos + center: Kind mit x y ignoriert center', () => {
      const ir = toIR(parse(`
Frame pos center w 400 h 400
  Frame x 10 y 10 w 50 h 50
`))
      const parent = ir.nodes[0]
      const child = parent.children[0]

      // pos macht position: relative
      // x y macht position: absolute + left/top
      // center setzt justify/align, aber das wirkt nicht auf absolute Kinder!

      expect(getStyle(parent, 'position')).toBe('relative')
      expect(getStyle(child, 'position')).toBe('absolute')
      expect(getStyle(child, 'left')).toBe('10px')
      expect(getStyle(child, 'top')).toBe('10px')
    })

    test('absolute Kind in center Container: center hat keinen Effekt', () => {
      const ir = toIR(parse(`
Frame center w 400 h 400
  Frame absolute x 0 y 0
`))
      // Das Kind ist absolute und ignoriert das Flex-Alignment des Parents
      // Aber: Parent hat kein position: relative, also ist absolute relativ zum nächsten positionierten Vorfahren!

      const parent = ir.nodes[0]
      const child = parent.children[0]

      console.log('center + absolute child:', {
        parentPosition: getStyle(parent, 'position'),
        childPosition: getStyle(child, 'position'),
      })

      // Erwartung: Parent sollte automatisch position: relative bekommen?
      // Oder ist das ein Fehler?
      expect(getStyle(child, 'position')).toBe('absolute')
    })

  })

  // ============================================================
  // 7. Hover States auf Layout Properties
  // ============================================================
  describe('Hover auf Layout', () => {

    test('hover-hor: Kann man Layout bei Hover ändern?', () => {
      // Das ist ein interessanter Edge Case
      // hover-bg funktioniert, aber hover-hor?
      const ir = toIR(parse(`Frame ver hover-hor`))

      // Suche nach state-conditional styles
      const hoverStyles = ir.nodes[0].styles.filter((s: any) => s.state === 'hover')
      console.log('hover-hor styles:', hoverStyles)

      // Falls das unterstützt wird, sollte es flex-direction: row mit state: hover geben
      // Falls nicht, sollte es ignoriert werden oder einen Fehler geben
    })

  })

  // ============================================================
  // 8. Vererbung + Layout
  // ============================================================
  describe('Vererbung + Layout', () => {

    test('extends mit Layout-Override', () => {
      const ir = toIR(parse(`
VerticalBox as Frame:
  ver
  gap 20

HorizontalBox extends VerticalBox:
  hor

HorizontalBox
`))
      // HorizontalBox erbt von VerticalBox, überschreibt aber ver mit hor
      const node = ir.nodes[0]

      console.log('extends layout override:', {
        direction: getStyle(node, 'flex-direction'),
        gap: getStyle(node, 'gap'),
      })

      // hor sollte ver überschreiben → row
      // gap sollte vererbt werden → 20px
      expect(getStyle(node, 'flex-direction')).toBe('row')
      expect(getStyle(node, 'gap')).toBe('20px')
    })

  })

})

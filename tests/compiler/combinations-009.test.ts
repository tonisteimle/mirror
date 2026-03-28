/**
 * Aggressive Test 009: Kombinationen mit klaren Erwartungen
 *
 * Diese Tests prüfen KOMBINATIONEN von Properties.
 * Jeder Test hat eine KLARE ERWARTUNG, nicht nur "was passiert".
 */

import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

describe('Kombinationen mit Erwartungen', () => {

  // Letzten Wert finden (CSS-Kaskade: letzter gewinnt)
  function getStyle(node: any, property: string): string | undefined {
    const matches = node.styles.filter((s: any) => s.property === property)
    return matches.length > 0 ? matches[matches.length - 1].value : undefined
  }

  // Alle Styles als Map
  function getStyles(node: any): Map<string, string> {
    const map = new Map<string, string>()
    for (const s of node.styles) {
      map.set(s.property, s.value) // Letzter gewinnt automatisch
    }
    return map
  }

  // ============================================================
  // Test 1: hor + center Kombination
  //
  // ERWARTUNG:
  // - hor setzt: display:flex, flex-direction:row
  // - center setzt: display:flex, justify-content:center, align-items:center
  // - Ergebnis sollte sein: row + zentriert auf beiden Achsen
  // ============================================================
  describe('hor + center', () => {

    test('Frame hor center = row mit zentrierten Kindern', () => {
      const ir = toIR(parse(`Frame hor center`))
      const styles = getStyles(ir.nodes[0])

      // KLARE ERWARTUNG:
      expect(styles.get('flex-direction')).toBe('row')
      expect(styles.get('justify-content')).toBe('center')
      expect(styles.get('align-items')).toBe('center')
    })

    test('Reihenfolge: center hor = gleich wie hor center?', () => {
      const ir1 = toIR(parse(`Frame hor center`))
      const ir2 = toIR(parse(`Frame center hor`))

      const styles1 = getStyles(ir1.nodes[0])
      const styles2 = getStyles(ir2.nodes[0])

      // Bei "center hor" sollte hor die direction überschreiben
      // aber justify/align sollten von center bleiben
      expect(styles2.get('flex-direction')).toBe('row')
      expect(styles2.get('justify-content')).toBe('center')
      expect(styles2.get('align-items')).toBe('center')
    })

  })

  // ============================================================
  // Test 2: Parent hor + Child w full
  //
  // ERWARTUNG:
  // - Parent ist horizontal
  // - Kind mit w full sollte den Restplatz füllen (flex: 1 1 0%)
  // - Das bedeutet: Kind wächst horizontal
  // ============================================================
  describe('hor Parent + w full Kind', () => {

    test('Kind mit w full bekommt flex: 1 1 0%', () => {
      const ir = toIR(parse(`
Frame hor
  Frame w full
`))
      const child = ir.nodes[0].children[0]

      expect(getStyle(child, 'flex')).toBe('1 1 0%')
    })

    test('Mehrere Kinder mit w full teilen sich Platz gleichmäßig', () => {
      const ir = toIR(parse(`
Frame hor
  Frame w full bg #f00
  Frame w full bg #0f0
`))
      const [child1, child2] = ir.nodes[0].children

      // Beide haben flex: 1, also 50/50
      expect(getStyle(child1, 'flex')).toBe('1 1 0%')
      expect(getStyle(child2, 'flex')).toBe('1 1 0%')
    })

  })

  // ============================================================
  // Test 3: Parent ver + Child h full
  //
  // ERWARTUNG:
  // - Parent ist vertical (column)
  // - Kind mit h full sollte vertikal den Restplatz füllen
  // - Aber h full setzt flex: 1 1 0% - funktioniert das bei height?
  // ============================================================
  describe('ver Parent + h full Kind', () => {

    test('Kind mit h full bekommt flex: 1 1 0%', () => {
      const ir = toIR(parse(`
Frame ver h 400
  Frame h 50
  Frame h full
`))
      const [top, bottom] = ir.nodes[0].children

      expect(getStyle(top, 'height')).toBe('50px')
      expect(getStyle(bottom, 'flex')).toBe('1 1 0%')
    })

  })

  // ============================================================
  // Test 4: hor + spread + w full Kind
  //
  // FRAGE: Macht das Sinn?
  // - spread = space-between zwischen Kindern
  // - w full = Kind füllt Restplatz
  //
  // ERWARTUNG: w full sollte trotzdem flex:1 setzen
  // Das Kind würde dann den gesamten Platz einnehmen
  // ============================================================
  describe('hor spread + w full Kind', () => {

    test('spread + w full: Kind hat trotzdem flex', () => {
      const ir = toIR(parse(`
Frame hor spread
  Frame w 50
  Frame w full
  Frame w 50
`))
      const [left, middle, right] = ir.nodes[0].children

      // Links und rechts: feste Breite
      expect(getStyle(left, 'width')).toBe('50px')
      expect(getStyle(right, 'width')).toBe('50px')

      // Mitte: flex
      expect(getStyle(middle, 'flex')).toBe('1 1 0%')
    })

  })

  // ============================================================
  // Test 5: 9-Zone Alignment + hor
  //
  // FRAGE: Was passiert bei "Frame hor tc"?
  // - hor setzt flex-direction: row
  // - tc (top-center) setzt flex-direction: column, justify: flex-start, align: center
  //
  // ERWARTUNG: Letzter gewinnt bei flex-direction
  // Also: tc überschreibt hor → column
  // ============================================================
  describe('9-Zone + hor/ver Konflikte', () => {

    test('hor tc = tc gewinnt (column)', () => {
      const ir = toIR(parse(`Frame hor tc`))
      const styles = getStyles(ir.nodes[0])

      // tc kommt NACH hor, also gewinnt tc für flex-direction
      expect(styles.get('flex-direction')).toBe('column')
      expect(styles.get('justify-content')).toBe('flex-start')
      expect(styles.get('align-items')).toBe('center')
    })

    test('tc hor = hor gewinnt (row)', () => {
      const ir = toIR(parse(`Frame tc hor`))
      const styles = getStyles(ir.nodes[0])

      // hor kommt NACH tc, also gewinnt hor für flex-direction
      expect(styles.get('flex-direction')).toBe('row')
      // Aber justify/align bleiben von tc
      expect(styles.get('justify-content')).toBe('flex-start')
      expect(styles.get('align-items')).toBe('center')
    })

  })

  // ============================================================
  // Test 6: Kind-Sizing in verschiedenen Richtungen
  //
  // FRAGE: Was macht w full in einem ver Container?
  // - Parent: flex-direction: column
  // - Kind: w full → flex: 1 1 0%
  //
  // flex: 1 wirkt auf die MAIN AXIS. Bei column ist das height, nicht width!
  // Also: w full in ver macht... was?
  // ============================================================
  describe('w full / h full in falscher Achse', () => {

    test('w full in ver Container', () => {
      const ir = toIR(parse(`
Frame ver
  Frame w full
`))
      const child = ir.nodes[0].children[0]

      // w full setzt flex: 1 1 0%
      // In einem column container wächst das Kind vertikal, nicht horizontal!
      // Das ist vielleicht nicht was der User erwartet
      expect(getStyle(child, 'flex')).toBe('1 1 0%')
      // Es setzt auch align-self: stretch, was für horizontales stretching sorgt
      expect(getStyle(child, 'align-self')).toBe('stretch')
    })

    test('h full in hor Container', () => {
      const ir = toIR(parse(`
Frame hor
  Frame h full
`))
      const child = ir.nodes[0].children[0]

      // h full setzt flex: 1 1 0%
      // In einem row container wächst das Kind horizontal, nicht vertikal!
      expect(getStyle(child, 'flex')).toBe('1 1 0%')
      expect(getStyle(child, 'align-self')).toBe('stretch')
    })

  })

  // ============================================================
  // Test 7: Verschachtelte Layout-Kontexte
  //
  // ERWARTUNG: Jedes Frame hat seinen eigenen Flex-Kontext
  // ============================================================
  describe('Verschachtelte Layouts', () => {

    test('ver > hor > ver: jeder hat eigene direction', () => {
      const ir = toIR(parse(`
Frame ver
  Frame hor
    Frame ver
`))
      const outer = ir.nodes[0]
      const middle = outer.children[0]
      const inner = middle.children[0]

      expect(getStyle(outer, 'flex-direction')).toBe('column')
      expect(getStyle(middle, 'flex-direction')).toBe('row')
      expect(getStyle(inner, 'flex-direction')).toBe('column')
    })

  })

  // ============================================================
  // Test 8: gap in verschiedenen Layouts
  //
  // ERWARTUNG: gap sollte in allen Richtungen funktionieren
  // ============================================================
  describe('gap in verschiedenen Layouts', () => {

    test('gap in hor Layout', () => {
      const ir = toIR(parse(`Frame hor gap 20`))
      expect(getStyle(ir.nodes[0], 'gap')).toBe('20px')
    })

    test('gap in ver Layout', () => {
      const ir = toIR(parse(`Frame ver gap 20`))
      expect(getStyle(ir.nodes[0], 'gap')).toBe('20px')
    })

    test('gap + center', () => {
      const ir = toIR(parse(`Frame center gap 20`))
      expect(getStyle(ir.nodes[0], 'gap')).toBe('20px')
      expect(getStyle(ir.nodes[0], 'justify-content')).toBe('center')
    })

  })

  // ============================================================
  // Test 9: Komplexes Real-World Szenario
  //
  // Header mit Logo links, Navigation center, User rechts
  // ============================================================
  describe('Real-World: Header Layout', () => {

    test('Header: Logo | Nav | User', () => {
      const ir = toIR(parse(`
Frame hor spread pad 16 h 64
  Frame w 100
    Text "Logo"
  Frame w full center
    Text "Navigation"
  Frame w 100
    Text "User"
`))
      const header = ir.nodes[0]
      const [logo, nav, user] = header.children

      // Header
      expect(getStyle(header, 'flex-direction')).toBe('row')
      expect(getStyle(header, 'justify-content')).toBe('space-between')
      expect(getStyle(header, 'height')).toBe('64px')
      expect(getStyle(header, 'padding')).toBe('16px')

      // Logo: feste Breite
      expect(getStyle(logo, 'width')).toBe('100px')

      // Nav: füllt Mitte, Inhalt zentriert
      expect(getStyle(nav, 'flex')).toBe('1 1 0%')
      expect(getStyle(nav, 'justify-content')).toBe('center')
      expect(getStyle(nav, 'align-items')).toBe('center')

      // User: feste Breite
      expect(getStyle(user, 'width')).toBe('100px')
    })

  })

})

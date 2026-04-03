/**
 * Design Issues Test 011: Potentielle User-Verwirrung
 *
 * Diese Tests dokumentieren Stellen, wo das Verhalten
 * technisch korrekt, aber für User verwirrend sein könnte.
 */

import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

describe('Design Issues', () => {

  function getStyle(node: any, property: string): string | undefined {
    const matches = node.styles.filter((s: any) => s.property === property)
    return matches.length > 0 ? matches[matches.length - 1].value : undefined
  }

  // ============================================================
  // ISSUE 1: w full / h full in "falscher" Achse
  //
  // Problem: "w full" setzt flex: 1 1 0%
  // In column Layout: flex wirkt auf HÖHE (main axis)
  // User erwartet: Breite füllen
  //
  // Technisch: Das ist CSS-korrekt!
  // align-self: stretch sorgt für volle Breite in column
  // ABER: flex: 1 lässt es auch vertikal wachsen
  //
  // Frage: Sollte w full in column NUR align-self: stretch setzen?
  // ============================================================
  describe('ISSUE 1: w full / h full Semantik', () => {

    test('w full in ver: Setzt NUR align-self: stretch (cross-axis)', () => {
      const ir = toIR(parse(`
Frame ver h 400
  Frame h 50
  Frame w full
`))
      const fullChild = ir.nodes[0].children[1]

      // NEUES VERHALTEN: w full ist Cross-Axis in vertical parent
      // → align-self: stretch, NICHT flex
      expect(getStyle(fullChild, 'flex')).toBeUndefined()
      expect(getStyle(fullChild, 'align-self')).toBe('stretch')

      // Kind wächst NUR horizontal (stretch), nicht vertikal
      // Das ist das intuitive Verhalten!
    })

    test('h full in hor: Setzt NUR align-self: stretch (cross-axis)', () => {
      const ir = toIR(parse(`
Frame hor w 400
  Frame w 50
  Frame h full
`))
      const fullChild = ir.nodes[0].children[1]

      // NEUES VERHALTEN: h full ist Cross-Axis in horizontal parent
      // → align-self: stretch, NICHT flex
      expect(getStyle(fullChild, 'flex')).toBeUndefined()
      expect(getStyle(fullChild, 'align-self')).toBe('stretch')

      // Kind wächst NUR vertikal (stretch), nicht horizontal
      // Das ist das intuitive Verhalten!
    })

    test('KORREKT: w full in hor = horizontal füllen', () => {
      const ir = toIR(parse(`
Frame hor h 100
  Frame w 50
  Frame w full
`))
      const fullChild = ir.nodes[0].children[1]

      // Das ist der intuitive Fall:
      // hor + w full = horizontal füllen
      expect(getStyle(fullChild, 'flex')).toBe('1 1 0%')
    })

    test('KORREKT: h full in ver = vertikal füllen', () => {
      const ir = toIR(parse(`
Frame ver w 100
  Frame h 50
  Frame h full
`))
      const fullChild = ir.nodes[0].children[1]

      // Das ist der intuitive Fall:
      // ver + h full = vertikal füllen
      expect(getStyle(fullChild, 'flex')).toBe('1 1 0%')
    })

  })

  // ============================================================
  // ISSUE 2: absolute Kind ohne relative Parent
  //
  // Problem: position: absolute ist relativ zum nächsten
  // positionierten Vorfahren, nicht unbedingt zum direkten Parent
  //
  // Wenn User schreibt:
  //   Frame center
  //     Frame absolute x 10 y 10
  //
  // Erwartet User: Kind ist 10px vom Parent entfernt
  // Tatsächlich: Kind ist 10px vom VIEWPORT/nächsten pos. Vorfahren
  //
  // Fix-Option: Parent automatisch position: relative geben
  // wenn Kind absolute/x/y hat
  // ============================================================
  describe('ISSUE 2: absolute ohne relative Parent', () => {

    test('absolute Kind: Parent bekommt KEIN position: relative', () => {
      const ir = toIR(parse(`
Frame center w 400 h 400
  Frame absolute x 10 y 10 w 50 h 50
`))
      const parent = ir.nodes[0]
      const child = parent.children[0]

      // Child ist absolute
      expect(getStyle(child, 'position')).toBe('absolute')
      expect(getStyle(child, 'left')).toBe('10px')
      expect(getStyle(child, 'top')).toBe('10px')

      // Parent hat KEIN position: relative!
      // Das bedeutet: Kind ist relativ zum Viewport oder nächsten pos. Vorfahren
      const parentPos = getStyle(parent, 'position')
      console.log('Parent position:', parentPos)

      // Das ist ein potentielles Problem
      expect(parentPos).toBeUndefined() // Aktuelles Verhalten
      // Erwartung wäre: expect(parentPos).toBe('relative')
    })

    test('pos Property setzt position: relative', () => {
      const ir = toIR(parse(`
Frame pos w 400 h 400
  Frame x 10 y 10 w 50 h 50
`))
      const parent = ir.nodes[0]

      // pos setzt position: relative
      expect(getStyle(parent, 'position')).toBe('relative')
    })

    test('x y ohne pos: Kind ist absolut, Parent nicht positioniert', () => {
      const ir = toIR(parse(`
Frame w 400 h 400
  Frame x 10 y 10 w 50 h 50
`))
      const parent = ir.nodes[0]
      const child = parent.children[0]

      // x y setzt automatisch position: absolute auf Kind
      expect(getStyle(child, 'position')).toBe('absolute')

      // Parent hat immer noch kein position
      const parentPos = getStyle(parent, 'position')
      expect(parentPos).toBeUndefined()

      // Warnung: Das Kind schwebt irgendwo!
    })

  })

  // ============================================================
  // ISSUE 3: Leere Frames
  //
  // Was passiert mit Frame ohne Inhalt und ohne Größe?
  // ============================================================
  describe('ISSUE 3: Leere Frames', () => {

    test('Frame ohne Inhalt hat keine Größe', () => {
      const ir = toIR(parse(`Frame`))

      // Keine explizite Größe
      expect(getStyle(ir.nodes[0], 'width')).toBeUndefined()
      expect(getStyle(ir.nodes[0], 'height')).toBeUndefined()

      // In CSS: 0x0 ohne Inhalt
    })

    test('Frame mit bg aber ohne Größe', () => {
      const ir = toIR(parse(`Frame bg #f00`))

      // Hat Hintergrund aber keine Größe
      expect(getStyle(ir.nodes[0], 'background')).toBe('#f00')
      expect(getStyle(ir.nodes[0], 'width')).toBeUndefined()

      // In CSS: roter Hintergrund, aber 0x0 = nicht sichtbar
    })

  })

  // ============================================================
  // ISSUE 4: Konfligierende Defaults
  //
  // Frame hat default flex-direction: column
  // Was passiert bei bestimmten Kombinationen?
  // ============================================================
  describe('ISSUE 4: Default Direction', () => {

    test('Frame ohne hor/ver hat column als default', () => {
      const ir = toIR(parse(`Frame`))
      expect(getStyle(ir.nodes[0], 'flex-direction')).toBe('column')
    })

    test('Frame center behält column', () => {
      const ir = toIR(parse(`Frame center`))

      // center setzt justify + align, aber keine direction
      // Also bleibt column (default)
      expect(getStyle(ir.nodes[0], 'flex-direction')).toBe('column')
      expect(getStyle(ir.nodes[0], 'justify-content')).toBe('center')
      expect(getStyle(ir.nodes[0], 'align-items')).toBe('center')
    })

    test('Frame spread behält column', () => {
      const ir = toIR(parse(`Frame spread`))

      expect(getStyle(ir.nodes[0], 'flex-direction')).toBe('column')
      expect(getStyle(ir.nodes[0], 'justify-content')).toBe('space-between')
    })

  })

})

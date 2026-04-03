/**
 * GELÖSTE BUGS: Diese Tests dokumentieren behobene Fehler
 *
 * Status: Alle Tests sollten PASSING sein
 */

import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

describe('Gelöste Bugs', () => {

  function getStyle(node: any, property: string): string | undefined {
    const matches = node.styles.filter((s: any) => s.property === property)
    return matches.length > 0 ? matches[matches.length - 1].value : undefined
  }

  // ============================================================
  // BUG 1 (GELÖST): 9-Zone + hor/ver - "Letzter gewinnt" Regel
  //
  // PROBLEM WAR: 9-Zone Properties wurden im Second Pass verarbeitet
  // und überschrieben immer die hor/ver Direction.
  //
  // LÖSUNG: Alle direction-relevanten Properties (hor, ver, 9-zone)
  // werden jetzt in der Source-Reihenfolge verarbeitet.
  // ============================================================
  // DESIGN UPDATE: hor + 9-zone ist konzeptuell inkompatibel
  // 9-zone impliziert column direction, hor/ver sind explizite Richtungen
  // Bei Konflikt: explizite Richtung (hor/ver) gewinnt
  // ============================================================
  describe('DESIGN: 9-Zone + hor/ver Konfliktauflösung', () => {

    test('tc hor = row (hor ist explizite Richtung)', () => {
      const ir = toIR(parse(`Frame tc hor`))
      const direction = getStyle(ir.nodes[0], 'flex-direction')

      // hor ist explizite Richtungsangabe → row
      expect(direction).toBe('row')
    })

    test('hor tc = row (hor ist explizite Richtung, 9-zone inkompatibel)', () => {
      const ir = toIR(parse(`Frame hor tc`))
      const direction = getStyle(ir.nodes[0], 'flex-direction')

      // hor + 9-zone ist konzeptuell inkompatibel
      // explizite Richtung hor gewinnt → row
      expect(direction).toBe('row')
    })

    test('hor/ver hat Priorität über 9-zone', () => {
      const ir1 = toIR(parse(`Frame tc hor`))
      const ir2 = toIR(parse(`Frame hor tc`))

      const dir1 = getStyle(ir1.nodes[0], 'flex-direction')
      const dir2 = getStyle(ir2.nodes[0], 'flex-direction')

      // In beiden Fällen gewinnt hor (explizite Richtung)
      expect(dir1).toBe('row')
      expect(dir2).toBe('row')
    })

  })

  // ============================================================
  // Weitere Tests: 9-Zone untereinander funktioniert korrekt
  // ============================================================
  describe('9-Zone untereinander', () => {

    test('tl br: br gewinnt (letzter)', () => {
      const ir = toIR(parse(`Frame tl br`))
      const justify = getStyle(ir.nodes[0], 'justify-content')
      const align = getStyle(ir.nodes[0], 'align-items')

      // br: justify: flex-end, align: flex-end
      expect(justify).toBe('flex-end')
      expect(align).toBe('flex-end')
    })

    test('center spread: spread gewinnt für justify', () => {
      const ir = toIR(parse(`Frame center spread`))
      const justify = getStyle(ir.nodes[0], 'justify-content')
      const align = getStyle(ir.nodes[0], 'align-items')

      // center: justify: center, align: center
      // spread: justify: space-between
      // → justify überschrieben, align bleibt
      expect(justify).toBe('space-between')
      expect(align).toBe('center')
    })

  })

})

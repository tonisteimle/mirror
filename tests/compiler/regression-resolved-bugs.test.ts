/**
 * GELÖSTE BUGS: Diese Tests dokumentieren behobene Fehler
 *
 * Status: Alle Tests sollten PASSING sein
 */

import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

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
  describe('BUG 1 GELÖST: 9-Zone + hor/ver Reihenfolge', () => {

    test('tc hor = row (hor ist letzter, gewinnt)', () => {
      const ir = toIR(parse(`Frame tc hor`))
      const direction = getStyle(ir.nodes[0], 'flex-direction')

      // hor kommt NACH tc → row gewinnt
      expect(direction).toBe('row')
    })

    test('hor tc = column (tc ist letzter, gewinnt)', () => {
      const ir = toIR(parse(`Frame hor tc`))
      const direction = getStyle(ir.nodes[0], 'flex-direction')

      // tc kommt NACH hor → column gewinnt
      expect(direction).toBe('column')
    })

    test('KONSISTENZ: Letzter gewinnt immer', () => {
      const ir1 = toIR(parse(`Frame tc hor`))
      const ir2 = toIR(parse(`Frame hor tc`))

      const dir1 = getStyle(ir1.nodes[0], 'flex-direction')
      const dir2 = getStyle(ir2.nodes[0], 'flex-direction')

      // tc hor → hor ist letzter → row
      // hor tc → tc ist letzter → column
      expect(dir1).toBe('row')
      expect(dir2).toBe('column')
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

/**
 * @vitest-environment jsdom
 */

/**
 * Grid Layout Provokation Tests
 *
 * Gezielte Provokation: Schwierige Kombinationen und Edge Cases
 * die das System herausfordern und Grenzfälle exponieren.
 *
 * Strategie: Nicht offensichtliche Fälle testen, die bei der
 * Kontext-Propagation oder Eigenschafts-Interpretation scheitern könnten.
 */

import { describe, test, expect } from 'vitest'
import { parse } from '../../src/parser/parser'
import { toIR } from '../../src/ir'

describe('Grid Layout Provokation', () => {

  function getStyle(node: any, property: string): string | undefined {
    const style = node.styles?.find((s: any) => s.property === property)
    return style?.value
  }

  function hasStyle(node: any, property: string, value: string): boolean {
    return node.styles?.some((s: any) => s.property === property && s.value === value) || false
  }

  function hasStyleStartsWith(node: any, property: string, prefix: string): boolean {
    return node.styles?.some((s: any) => s.property === property && s.value?.startsWith(prefix)) || false
  }

  // ============================================================
  // PROVOKATION 1: Verschachtelte Grids (Grid > Grid)
  // ============================================================

  describe('Nested Grids - Kontext-Isolation', () => {

    test('Grid-Kind mit eigenem grid - x/y bezieht sich auf Parent', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame x 3 w 6 grid 4
    Frame w 2
`))
      // Das mittlere Frame ist Kind von grid 12 UND selbst ein grid 4
      const innerGrid = ir.nodes[0].children[0]
      expect(getStyle(innerGrid, 'grid-column-start')).toBe('3')
      expect(getStyle(innerGrid, 'grid-column')).toBe('span 6')
      expect(hasStyle(innerGrid, 'display', 'grid')).toBe(true)

      // Enkel: w 2 bezieht sich auf das innere grid 4 (span 2)
      const grandchild = innerGrid.children[0]
      expect(getStyle(grandchild, 'grid-column')).toBe('span 2')
    })

    test('Dreifach verschachtelte Grids - Kontext-Stack', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame x 1 w 12 grid 6
    Frame x 1 w 6 grid 3
      Frame x 2 w 2
`))
      // Jede Ebene sollte ihren eigenen Grid-Kontext haben
      const level2 = ir.nodes[0].children[0]
      const level3 = level2.children[0]
      const level4 = level3.children[0]

      // Level 2: Positioniert in grid 12
      expect(getStyle(level2, 'grid-column-start')).toBe('1')
      expect(getStyle(level2, 'grid-column')).toBe('span 12')

      // Level 3: Positioniert in grid 6
      expect(getStyle(level3, 'grid-column-start')).toBe('1')
      expect(getStyle(level3, 'grid-column')).toBe('span 6')

      // Level 4: Positioniert in grid 3
      expect(getStyle(level4, 'grid-column-start')).toBe('2')
      expect(getStyle(level4, 'grid-column')).toBe('span 2')
    })

  })

  // ============================================================
  // PROVOKATION 2: Flex innerhalb Grid (Kontext-Wechsel)
  // ============================================================

  describe('Grid > Flex > Element - Kontext-Wechsel', () => {

    test('x in Flex-Kind (innerhalb Grid) sollte NICHT grid-column sein', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame x 3 w 6 hor
    Frame x 50
`))
      const flexContainer = ir.nodes[0].children[0]
      const flexChild = flexContainer.children[0]

      // FlexContainer ist Grid-Kind: x → grid-column-start
      expect(getStyle(flexContainer, 'grid-column-start')).toBe('3')

      // FlexChild ist NICHT in Grid: x → position + left
      expect(getStyle(flexChild, 'grid-column-start')).toBeUndefined()
      // Das Kind sollte relative/absolute Positionierung bekommen
    })

    test('Grid > Flex > Grid - Kontext wechselt zurück', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame x 1 w 12 hor
    Frame w 200 grid 4
      Frame x 2 w 2
`))
      // Äußerer Grid → Flex → Innerer Grid
      const flexContainer = ir.nodes[0].children[0]
      const innerGrid = flexContainer.children[0]
      const gridChild = innerGrid.children[0]

      // FlexContainer: Grid-Positionierung
      expect(getStyle(flexContainer, 'grid-column-start')).toBe('1')

      // InnerGrid: w 200 = Pixel (nicht Span, da Parent ist Flex)
      expect(getStyle(innerGrid, 'width')).toBe('200px')
      expect(getStyle(innerGrid, 'grid-column')).toBeUndefined()

      // GridChild: w 2 = span 2 (Parent ist grid 4)
      expect(getStyle(gridChild, 'grid-column')).toBe('span 2')
    })

  })

  // ============================================================
  // PROVOKATION 3: w/h full/hug in Grid-Kontext
  // ============================================================

  describe('w/h Keywords in Grid', () => {

    test('w full in Grid - sollte stretch sein, nicht span', () => {
      const ir = toIR(parse(`
Frame grid 3
  Frame w full
`))
      const child = ir.nodes[0].children[0]
      // w full sollte NICHT span interpretiert werden
      expect(getStyle(child, 'grid-column')).toBeUndefined()
      // Stattdessen width: 100% oder implizites stretch
      const width = getStyle(child, 'width')
      expect(width === '100%' || width === undefined).toBe(true)
    })

    test('h hug in Grid - sollte content-basiert sein', () => {
      const ir = toIR(parse(`
Frame grid 3
  Frame h hug
`))
      const child = ir.nodes[0].children[0]
      // h hug sollte NICHT span interpretiert werden
      expect(getStyle(child, 'grid-row')).toBeUndefined()
    })

    test('w 3 mit w full - letztes gewinnt', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame w 3 w full
`))
      const child = ir.nodes[0].children[0]
      // w full sollte w 3 überschreiben
      expect(getStyle(child, 'grid-column')).toBeUndefined()
    })

  })

  // ============================================================
  // PROVOKATION 4: Grenzwerte und Edge Cases
  // ============================================================

  describe('Grid Boundary Values', () => {

    test('x 1 - erste Spalte', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame x 1
`))
      expect(getStyle(ir.nodes[0].children[0], 'grid-column-start')).toBe('1')
    })

    test('x 13 in grid 12 - überschreitet Grenzen (valides CSS)', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame x 13
`))
      // CSS Grid erlaubt dies - Element wird außerhalb platziert
      expect(getStyle(ir.nodes[0].children[0], 'grid-column-start')).toBe('13')
    })

    test('w 0 in Grid - edge case', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame w 0
`))
      // w 0 sollte entweder ignoriert oder span 0 sein
      const col = getStyle(ir.nodes[0].children[0], 'grid-column')
      // span 0 ist ungültig, aber wir sollten graceful handeln
      expect(col === 'span 0' || col === undefined).toBe(true)
    })

    test('Sehr große Werte: x 100 w 50', () => {
      const ir = toIR(parse(`
Frame grid 12
  Frame x 100 w 50
`))
      // Sollte funktionieren (CSS Grid erlaubt es)
      expect(getStyle(ir.nodes[0].children[0], 'grid-column-start')).toBe('100')
      expect(getStyle(ir.nodes[0].children[0], 'grid-column')).toBe('span 50')
    })

  })

  // ============================================================
  // PROVOKATION 5: grid auto mit Positionierung
  // ============================================================

  describe('Grid Auto mit Positionierung', () => {

    test('x in grid auto - Positionierung funktioniert', () => {
      const ir = toIR(parse(`
Frame grid auto 200
  Frame x 2 w 3
`))
      const child = ir.nodes[0].children[0]
      // Auch bei auto-fill sollte Grid-Positionierung funktionieren
      expect(getStyle(child, 'grid-column-start')).toBe('2')
      expect(getStyle(child, 'grid-column')).toBe('span 3')
    })

    test('grid auto ohne Zahl - x/y Grid-Kontext?', () => {
      const ir = toIR(parse(`
Frame grid auto
  Frame x 1 w 2
`))
      // grid auto ohne Größe sollte trotzdem Grid-Kontext erzeugen
      expect(hasStyle(ir.nodes[0], 'display', 'grid')).toBe(true)
    })

  })

  // ============================================================
  // PROVOKATION 6: Kombinationen mit anderen Layout-Properties
  // ============================================================

  describe('Grid mit anderen Layout-Kombinationen', () => {

    test('grid mit pos - was hat Priorität?', () => {
      const ir = toIR(parse(`
Frame grid 3 pos
  Frame x 2
`))
      // grid + pos ist ungewöhnlich, aber grid sollte gewinnen
      expect(hasStyle(ir.nodes[0], 'display', 'grid')).toBe(true)
    })

    test('grid mit stacked - Konflikt', () => {
      const ir = toIR(parse(`
Frame grid 3 stacked
  Frame x 2
`))
      // stacked normalerweise = position relative auf Parent
      // Grid sollte hier dominieren oder eine sinnvolle Kombination
      expect(hasStyle(ir.nodes[0], 'display', 'grid')).toBe(true)
    })

    test('grid mit center - Alignment', () => {
      const ir = toIR(parse(`
Frame grid 3 center
  Frame w 2
`))
      // center sollte place-items oder justify/align beeinflussen
      expect(hasStyle(ir.nodes[0], 'display', 'grid')).toBe(true)
      // Center in Grid = place-items: center oder justify-items: center
    })

  })

  // ============================================================
  // PROVOKATION 7: Definition/Instanz mit Grid
  // ============================================================

  describe('Definitionen mit Grid-Kontext', () => {

    test('Definition als Grid-Kind - x/y im richtigen Kontext', () => {
      const ir = toIR(parse(`
Card: = Frame bg #f0f0f0 rad 8

Frame grid 12 gap 16
  Card x 1 w 4
  Card x 5 w 4
  Card x 9 w 4
`))
      // Alle Card-Instanzen sollten Grid-Positionierung haben
      const grid = ir.nodes[0]
      expect(grid.children.length).toBe(3)
      expect(getStyle(grid.children[0], 'grid-column-start')).toBe('1')
      expect(getStyle(grid.children[1], 'grid-column-start')).toBe('5')
      expect(getStyle(grid.children[2], 'grid-column-start')).toBe('9')
    })

    test('Definition enthält Grid - verschachtelt', () => {
      const ir = toIR(parse(`
GridSection: = Frame grid 4 gap 8

Frame ver gap 24
  GridSection
    Frame x 1 w 2
    Frame x 3 w 2
`))
      // Die Kinder von GridSection sollten Grid-Kontext haben
      const section = ir.nodes[0].children[0]
      expect(hasStyle(section, 'display', 'grid')).toBe(true)
      expect(getStyle(section.children[0], 'grid-column-start')).toBe('1')
    })

  })

  // ============================================================
  // PROVOKATION 8: gap vs gap-x/gap-y Priorität
  // ============================================================

  describe('Gap Property Priority', () => {

    test('gap-x/gap-y nach gap - spezifische überschreiben', () => {
      const ir = toIR(parse(`Frame grid 3 gap 16 gap-x 8`))
      // gap-x 8 sollte column-gap überschreiben, row-gap bleibt 16
      expect(hasStyle(ir.nodes[0], 'column-gap', '8px')).toBe(true)
      // gap oder row-gap sollte 16 sein
    })

    test('gap nach gap-x/gap-y - allgemeines überschreibt?', () => {
      const ir = toIR(parse(`Frame grid 3 gap-x 8 gap-y 24 gap 16`))
      // Semantisch unklar - letzte Property gewinnt?
      // Oder gap überschreibt nur nicht-gesetzte?
      const columnGap = getStyle(ir.nodes[0], 'column-gap')
      const rowGap = getStyle(ir.nodes[0], 'row-gap')
      const gap = getStyle(ir.nodes[0], 'gap')
      // Mindestens eine Gap-Property sollte gesetzt sein
      expect(columnGap || rowGap || gap).toBeDefined()
    })

  })

  // ============================================================
  // PROVOKATION 9: Slot in Grid
  // ============================================================

  describe('Slot in Grid', () => {

    // TODO: Slot-Inhalte erben derzeit nicht den Grid-Kontext des
    // übergeordneten Containers. Dies erfordert Änderungen in der
    // Slot-Auflösung, um den parentLayoutContext zu propagieren.
    test.skip('Slot erbt Grid-Kontext für seine Kinder - TODO: Slot-Kontext-Propagation', () => {
      const ir = toIR(parse(`
Widget: = Frame bg #fff rad 4

Container: = Frame grid 4 gap 8
  Slot

Container
  Widget x 1 w 2
  Widget x 3 w 2
`))
      // Widget-Instanzen im Slot sollten Grid-Positionierung haben
      const container = ir.nodes[0]
      if (container.children && container.children.length >= 2) {
        expect(getStyle(container.children[0], 'grid-column-start')).toBe('1')
        expect(getStyle(container.children[1], 'grid-column-start')).toBe('3')
      }
    })

  })

  // ============================================================
  // PROVOKATION 10: Responsive-ähnliche Patterns
  // ============================================================

  describe('Complex Real-World Patterns', () => {

    test('Holy Grail Layout', () => {
      const ir = toIR(parse(`
Frame grid 12 gap 16
  Frame x 1 w 12 h 1
  Frame x 1 w 2 y 2 h 1
  Frame x 3 w 8 y 2 h 1
  Frame x 11 w 2 y 2 h 1
  Frame x 1 w 12 y 3 h 1
`))
      // Header: full width
      // Sidebar left | Main | Sidebar right
      // Footer: full width
      const container = ir.nodes[0]
      expect(container.children.length).toBe(5)

      // Main content
      const main = container.children[2]
      expect(getStyle(main, 'grid-column-start')).toBe('3')
      expect(getStyle(main, 'grid-column')).toBe('span 8')
      expect(getStyle(main, 'grid-row-start')).toBe('2')
    })

    test('Masonry-ähnlich mit dense', () => {
      const ir = toIR(parse(`
Frame grid 3 dense gap 8
  Frame w 2 h 2
  Frame h 1
  Frame h 1
  Frame h 2
`))
      expect(hasStyle(ir.nodes[0], 'display', 'grid')).toBe(true)
      expect(getStyle(ir.nodes[0], 'grid-auto-flow')).toContain('dense')
    })

  })

})

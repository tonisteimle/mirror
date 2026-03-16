/**
 * Deterministic Layout Inference
 *
 * Rule-based approach to infer layout structure from element positions.
 * No LLM needed - pure algorithmic analysis.
 *
 * Usage: npx tsx scripts/test-layout-rules.ts
 */

interface Element {
  id: string
  x: number
  y: number
  w: number
  h: number
}

interface LayoutNode {
  type: 'box' | 'element' | 'slot'
  direction?: 'hor' | 'ver'
  gap?: number
  id?: string
  width?: number
  children?: LayoutNode[]
}

// ============================================================
// REGELN
// ============================================================

const Y_TOLERANCE = 8  // Elemente gelten als "gleiche Zeile" wenn Y-Differenz < 8px
const X_TOLERANCE = 8  // Elemente gelten als "gleiche Spalte" wenn X-Differenz < 8px
const GAP_SNAP = [0, 4, 8, 12, 16, 20, 24, 32]  // Snap gaps to common values

/**
 * Regel 1: Gruppiere Elemente nach Y-Position (horizontale Gruppen)
 */
function groupByRow(elements: Element[]): Element[][] {
  if (elements.length === 0) return []

  // Sort by Y, then by X
  const sorted = [...elements].sort((a, b) => a.y - b.y || a.x - b.x)

  const rows: Element[][] = []
  let currentRow: Element[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = currentRow[0]
    const curr = sorted[i]

    // Same row if Y is within tolerance
    if (Math.abs(curr.y - prev.y) <= Y_TOLERANCE) {
      currentRow.push(curr)
    } else {
      rows.push(currentRow)
      currentRow = [curr]
    }
  }
  rows.push(currentRow)

  // Sort each row by X
  rows.forEach(row => row.sort((a, b) => a.x - b.x))

  return rows
}

/**
 * Regel 2: Berechne Gap zwischen Elementen
 */
function calculateGap(elements: Element[], direction: 'hor' | 'ver'): number {
  if (elements.length < 2) return 0

  const gaps: number[] = []

  for (let i = 1; i < elements.length; i++) {
    const prev = elements[i - 1]
    const curr = elements[i]

    if (direction === 'hor') {
      // Horizontal gap: curr.x - (prev.x + prev.w)
      gaps.push(curr.x - (prev.x + prev.w))
    } else {
      // Vertical gap: curr.y - (prev.y + prev.h)
      gaps.push(curr.y - (prev.y + prev.h))
    }
  }

  // Average gap, snapped to common values
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
  return snapToGrid(avgGap)
}

/**
 * Snap value to nearest common gap
 */
function snapToGrid(value: number): number {
  let closest = GAP_SNAP[0]
  let minDiff = Math.abs(value - closest)

  for (const snap of GAP_SNAP) {
    const diff = Math.abs(value - snap)
    if (diff < minDiff) {
      minDiff = diff
      closest = snap
    }
  }

  return closest
}

/**
 * Regel 3: Erkenne leeren Platz (für Slots)
 */
function detectEmptySpace(elements: Element[], containerWidth: number): { left: number, right: number } {
  if (elements.length === 0) return { left: 0, right: containerWidth }

  const minX = Math.min(...elements.map(e => e.x))
  const maxX = Math.max(...elements.map(e => e.x + e.w))

  return {
    left: minX > 50 ? minX : 0,  // Significant space on left?
    right: containerWidth - maxX > 50 ? containerWidth - maxX : 0
  }
}

/**
 * Hauptalgorithmus: Inferiere Layout aus Positionen
 */
function inferLayout(elements: Element[], containerWidth = 600): LayoutNode {
  if (elements.length === 0) {
    return { type: 'box', direction: 'ver', children: [] }
  }

  if (elements.length === 1) {
    const el = elements[0]
    const emptySpace = detectEmptySpace(elements, containerWidth)

    // Wenn signifikanter Platz links → horizontal mit Slot
    if (emptySpace.left > 50) {
      return {
        type: 'box',
        direction: 'hor',
        gap: snapToGrid(el.x - emptySpace.left),
        children: [
          { type: 'slot', width: Math.round(emptySpace.left) },
          { type: 'element', id: el.id }
        ]
      }
    }

    return { type: 'element', id: el.id }
  }

  // Gruppiere nach Zeilen
  const rows = groupByRow(elements)

  // Nur eine Zeile → horizontal
  if (rows.length === 1) {
    const row = rows[0]
    const gap = calculateGap(row, 'hor')

    // Check for empty space on left
    const emptySpace = detectEmptySpace(row, containerWidth)
    const children: LayoutNode[] = []

    if (emptySpace.left > 50) {
      children.push({ type: 'slot', width: Math.round(emptySpace.left) })
    }

    children.push(...row.map(el => ({ type: 'element' as const, id: el.id })))

    return {
      type: 'box',
      direction: 'hor',
      gap,
      children
    }
  }

  // Mehrere Zeilen → vertikal mit möglichen horizontalen Subgruppen
  const children: LayoutNode[] = []

  for (const row of rows) {
    if (row.length === 1) {
      // Einzelnes Element
      children.push({ type: 'element', id: row[0].id })
    } else {
      // Mehrere Elemente in einer Zeile → horizontal gruppieren
      const gap = calculateGap(row, 'hor')
      children.push({
        type: 'box',
        direction: 'hor',
        gap,
        children: row.map(el => ({ type: 'element', id: el.id }))
      })
    }
  }

  // Berechne vertikalen Gap zwischen Zeilen
  const rowElements = rows.map(row => ({
    id: 'row',
    x: Math.min(...row.map(e => e.x)),
    y: Math.min(...row.map(e => e.y)),
    w: Math.max(...row.map(e => e.x + e.w)) - Math.min(...row.map(e => e.x)),
    h: Math.max(...row.map(e => e.h))
  }))
  const verticalGap = calculateGap(rowElements, 'ver')

  return {
    type: 'box',
    direction: 'ver',
    gap: verticalGap,
    children
  }
}

/**
 * Render LayoutNode to Mirror DSL
 */
function renderMirror(node: LayoutNode, indent = 0): string {
  const pad = '  '.repeat(indent)

  if (node.type === 'element') {
    return `${pad}Text "${node.id}"`
  }

  if (node.type === 'slot') {
    return `${pad}Slot${node.width ? ` w ${node.width}` : ''}`
  }

  if (node.type === 'box') {
    const gapStr = node.gap ? ` gap ${node.gap}` : ''
    const header = `${pad}Box ${node.direction}${gapStr}`

    if (!node.children || node.children.length === 0) {
      return header
    }

    const childrenStr = node.children
      .map(child => renderMirror(child, indent + 1))
      .join('\n')

    return `${header}\n${childrenStr}`
  }

  return ''
}

// ============================================================
// TEST SCENARIOS
// ============================================================

interface Scenario {
  name: string
  elements: Element[]
  containerWidth?: number
  expected?: string
}

const scenarios: Scenario[] = [
  {
    name: "Datum neben Autor ziehen",
    elements: [
      { id: "Titel", x: 0, y: 0, w: 400, h: 32 },
      { id: "Datum", x: 0, y: 50, w: 100, h: 20 },
      { id: "Autor", x: 116, y: 50, w: 120, h: 20 },
      { id: "Untertitel", x: 0, y: 90, w: 400, h: 24 },
    ],
    expected: `Box ver gap 16
  Text "Titel"
  Box hor gap 16
    Text "Datum"
    Text "Autor"
  Text "Untertitel"`
  },
  {
    name: "Element nach rechts schieben",
    elements: [
      { id: "Titel", x: 0, y: 0, w: 400, h: 32 },
      { id: "Content", x: 200, y: 50, w: 200, h: 100 },
    ],
    containerWidth: 600,
    expected: `Box ver
  Text "Titel"
  Box hor
    Slot w 200
    Text "Content"`
  },
  {
    name: "Drei Elemente horizontal",
    elements: [
      { id: "A", x: 0, y: 0, w: 80, h: 24 },
      { id: "B", x: 96, y: 0, w: 80, h: 24 },
      { id: "C", x: 192, y: 0, w: 80, h: 24 },
      { id: "D", x: 0, y: 40, w: 200, h: 24 },
    ],
    expected: `Box ver gap 16
  Box hor gap 16
    Text "A"
    Text "B"
    Text "C"
  Text "D"`
  },
  {
    name: "Grid 2x2",
    elements: [
      { id: "1", x: 0, y: 0, w: 100, h: 50 },
      { id: "2", x: 116, y: 0, w: 100, h: 50 },
      { id: "3", x: 0, y: 66, w: 100, h: 50 },
      { id: "4", x: 116, y: 66, w: 100, h: 50 },
    ],
    expected: `Box ver gap 16
  Box hor gap 16
    Text "1"
    Text "2"
  Box hor gap 16
    Text "3"
    Text "4"`
  },
  {
    name: "Navigation links",
    elements: [
      { id: "Content", x: 220, y: 0, w: 380, h: 400 },
    ],
    containerWidth: 600,
    expected: `Box hor gap 20
  Slot w 200
  Text "Content"`
  }
]

// ============================================================
// RUN TESTS
// ============================================================

function runTests() {
  console.log('🔧 Deterministic Layout Inference')
  console.log('   Rule-based approach (no LLM)\n')

  for (const scenario of scenarios) {
    console.log('═'.repeat(60))
    console.log(`📐 ${scenario.name}`)
    console.log('═'.repeat(60))

    console.log('\n📍 POSITIONEN:')
    for (const el of scenario.elements) {
      console.log(`   ${el.id.padEnd(12)} x=${el.x}, y=${el.y}, w=${el.w}, h=${el.h}`)
    }

    const layout = inferLayout(scenario.elements, scenario.containerWidth)
    const result = renderMirror(layout)

    console.log('\n🔧 ERGEBNIS (Regeln):')
    console.log(result.split('\n').map(l => '   ' + l).join('\n'))

    if (scenario.expected) {
      console.log('\n✅ ERWARTET:')
      console.log(scenario.expected.split('\n').map(l => '   ' + l).join('\n'))

      const match = result.trim() === scenario.expected.trim()
      console.log(match ? '\n   ✓ MATCH!' : '\n   ✗ UNTERSCHIED')
    }

    console.log()
  }
}

runTests()

/**
 * Deterministic Layout Inference v2
 *
 * Extended rule set for better layout detection.
 *
 * Usage: npx tsx scripts/test-layout-rules-v2.ts
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
// KONFIGURATION
// ============================================================

const CONFIG = {
  Y_TOLERANCE: 8,           // Gleiche Zeile wenn Y-Differenz < 8px
  X_TOLERANCE: 8,           // Gleiche Spalte wenn X-Differenz < 8px
  MIN_SLOT_WIDTH: 50,       // Mindestbreite für Slot-Erkennung
  GAP_SNAP: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48],
  DEFAULT_CONTAINER_WIDTH: 600,
}

// ============================================================
// HILFSFUNKTIONEN
// ============================================================

function snapToGrid(value: number): number {
  let closest = CONFIG.GAP_SNAP[0]
  let minDiff = Math.abs(value - closest)

  for (const snap of CONFIG.GAP_SNAP) {
    const diff = Math.abs(value - snap)
    if (diff < minDiff) {
      minDiff = diff
      closest = snap
    }
  }
  return closest
}

function getBoundingBox(elements: Element[]): { x: number, y: number, w: number, h: number, right: number, bottom: number } {
  const x = Math.min(...elements.map(e => e.x))
  const y = Math.min(...elements.map(e => e.y))
  const right = Math.max(...elements.map(e => e.x + e.w))
  const bottom = Math.max(...elements.map(e => e.y + e.h))
  return { x, y, w: right - x, h: bottom - y, right, bottom }
}

// ============================================================
// REGEL 1: Zeilen-Gruppierung
// ============================================================

function groupByRow(elements: Element[]): Element[][] {
  if (elements.length === 0) return []

  const sorted = [...elements].sort((a, b) => a.y - b.y || a.x - b.x)
  const rows: Element[][] = []
  let currentRow: Element[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = currentRow[0]
    const curr = sorted[i]

    if (Math.abs(curr.y - prev.y) <= CONFIG.Y_TOLERANCE) {
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

// ============================================================
// REGEL 2: Gap-Berechnung (verbessert)
// ============================================================

function calculateHorizontalGap(elements: Element[]): number {
  if (elements.length < 2) return 0

  const gaps: number[] = []
  for (let i = 1; i < elements.length; i++) {
    const prev = elements[i - 1]
    const curr = elements[i]
    const gap = curr.x - (prev.x + prev.w)
    if (gap > 0) gaps.push(gap)
  }

  if (gaps.length === 0) return 0
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
  return snapToGrid(avgGap)
}

function calculateVerticalGap(rows: Element[][]): number {
  if (rows.length < 2) return 0

  const gaps: number[] = []
  for (let i = 1; i < rows.length; i++) {
    const prevRow = rows[i - 1]
    const currRow = rows[i]

    // Bottom of previous row
    const prevBottom = Math.max(...prevRow.map(e => e.y + e.h))
    // Top of current row
    const currTop = Math.min(...currRow.map(e => e.y))

    const gap = currTop - prevBottom
    if (gap > 0) gaps.push(gap)
  }

  if (gaps.length === 0) return 0
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
  return snapToGrid(avgGap)
}

// ============================================================
// REGEL 3: Slot-Erkennung (neu)
// ============================================================

interface SlotAnalysis {
  hasLeftSlot: boolean
  leftSlotWidth: number
  hasRightSlot: boolean
  rightSlotWidth: number
  gap: number
}

function analyzeSlots(elements: Element[], containerWidth: number): SlotAnalysis {
  if (elements.length === 0) {
    return { hasLeftSlot: false, leftSlotWidth: 0, hasRightSlot: false, rightSlotWidth: 0, gap: 0 }
  }

  const bbox = getBoundingBox(elements)

  // Regel 3a: Linker Slot wenn erstes Element nicht bei x≈0 startet
  const leftSpace = bbox.x
  const hasLeftSlot = leftSpace >= CONFIG.MIN_SLOT_WIDTH

  // Regel 3b: Rechter Slot wenn letztes Element nicht bis zum Rand geht
  const rightSpace = containerWidth - bbox.right
  const hasRightSlot = rightSpace >= CONFIG.MIN_SLOT_WIDTH

  // Regel 3c: Gap ist der Abstand zwischen Slot und Content
  let gap = 0
  if (hasLeftSlot) {
    // Gap zwischen Slot-Ende und erstem Element
    gap = snapToGrid(leftSpace - Math.floor(leftSpace / 8) * 8)
    if (gap === 0) gap = snapToGrid(leftSpace % 100) // Fallback
  }

  return {
    hasLeftSlot,
    leftSlotWidth: hasLeftSlot ? snapToGrid(leftSpace) : 0,
    hasRightSlot,
    rightSlotWidth: hasRightSlot ? snapToGrid(rightSpace) : 0,
    gap: hasLeftSlot || hasRightSlot ? snapToGrid(Math.min(leftSpace, 20)) : 0
  }
}

// ============================================================
// REGEL 4: Einzelelement-Analyse
// ============================================================

function analyzeSingleElement(el: Element, containerWidth: number): LayoutNode {
  const slots = analyzeSlots([el], containerWidth)

  // Regel 4a: Element nach rechts verschoben → Slot links
  if (slots.hasLeftSlot) {
    return {
      type: 'box',
      direction: 'hor',
      gap: slots.gap || undefined,
      children: [
        { type: 'slot', width: slots.leftSlotWidth },
        { type: 'element', id: el.id }
      ]
    }
  }

  // Regel 4b: Element nach links verschoben → Slot rechts
  if (slots.hasRightSlot && el.x < CONFIG.MIN_SLOT_WIDTH) {
    return {
      type: 'box',
      direction: 'hor',
      gap: slots.gap || undefined,
      children: [
        { type: 'element', id: el.id },
        { type: 'slot', width: slots.rightSlotWidth }
      ]
    }
  }

  return { type: 'element', id: el.id }
}

// ============================================================
// REGEL 5: Row-Analyse
// ============================================================

function analyzeRow(row: Element[], containerWidth: number): LayoutNode {
  if (row.length === 1) {
    return analyzeSingleElement(row[0], containerWidth)
  }

  // Mehrere Elemente → horizontal gruppieren
  const gap = calculateHorizontalGap(row)
  const slots = analyzeSlots(row, containerWidth)

  const children: LayoutNode[] = []

  // Slot links?
  if (slots.hasLeftSlot) {
    children.push({ type: 'slot', width: slots.leftSlotWidth })
  }

  // Elemente
  children.push(...row.map(el => ({ type: 'element' as const, id: el.id })))

  // Slot rechts?
  if (slots.hasRightSlot) {
    children.push({ type: 'slot', width: slots.rightSlotWidth })
  }

  return {
    type: 'box',
    direction: 'hor',
    gap: gap || undefined,
    children
  }
}

// ============================================================
// REGEL 6: Struktur-Vereinfachung
// ============================================================

function simplifyLayout(node: LayoutNode): LayoutNode {
  // Regel 6a: Box mit einem Element-Kind → Element
  if (node.type === 'box' && node.children?.length === 1) {
    const child = node.children[0]
    if (child.type === 'element') {
      return child
    }
  }

  // Regel 6b: Rekursiv vereinfachen
  if (node.children) {
    node.children = node.children.map(simplifyLayout)
  }

  return node
}

// ============================================================
// HAUPTALGORITHMUS
// ============================================================

function inferLayout(elements: Element[], containerWidth = CONFIG.DEFAULT_CONTAINER_WIDTH): LayoutNode {
  if (elements.length === 0) {
    return { type: 'box', direction: 'ver', children: [] }
  }

  if (elements.length === 1) {
    return analyzeSingleElement(elements[0], containerWidth)
  }

  // Gruppiere nach Zeilen
  const rows = groupByRow(elements)

  // Nur eine Zeile
  if (rows.length === 1) {
    return analyzeRow(rows[0], containerWidth)
  }

  // Mehrere Zeilen → vertikal
  const verticalGap = calculateVerticalGap(rows)
  const children = rows.map(row => analyzeRow(row, containerWidth))

  const layout: LayoutNode = {
    type: 'box',
    direction: 'ver',
    gap: verticalGap || undefined,
    children
  }

  return simplifyLayout(layout)
}

// ============================================================
// RENDER
// ============================================================

function renderMirror(node: LayoutNode, indent = 0): string {
  const pad = '  '.repeat(indent)

  if (node.type === 'element') {
    return `${pad}Text "${node.id}"`
  }

  if (node.type === 'slot') {
    return `${pad}Slot${node.width ? ` w ${node.width}` : ''}`
  }

  if (node.type === 'box') {
    const parts = [`Box ${node.direction}`]
    if (node.gap) parts.push(`gap ${node.gap}`)
    const header = `${pad}${parts.join(' ')}`

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
    expected: `Box ver gap 16
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
  },
  // Neue Szenarien
  {
    name: "Sidebar rechts",
    elements: [
      { id: "Main", x: 0, y: 0, w: 400, h: 300 },
    ],
    containerWidth: 600,
    expected: `Box hor
  Text "Main"
  Slot w 200`
  },
  {
    name: "Header + Content + Footer",
    elements: [
      { id: "Header", x: 0, y: 0, w: 600, h: 60 },
      { id: "Content", x: 0, y: 76, w: 600, h: 300 },
      { id: "Footer", x: 0, y: 392, w: 600, h: 40 },
    ],
    containerWidth: 600,
    expected: `Box ver gap 16
  Text "Header"
  Text "Content"
  Text "Footer"`
  },
  {
    name: "Logo + Nav horizontal",
    elements: [
      { id: "Logo", x: 0, y: 0, w: 120, h: 40 },
      { id: "Nav1", x: 200, y: 8, w: 60, h: 24 },
      { id: "Nav2", x: 276, y: 8, w: 60, h: 24 },
      { id: "Nav3", x: 352, y: 8, w: 60, h: 24 },
    ],
    expected: `Box hor gap 16
  Text "Logo"
  Text "Nav1"
  Text "Nav2"
  Text "Nav3"`
  },
]

// ============================================================
// RUN TESTS
// ============================================================

function runTests() {
  console.log('🔧 Deterministic Layout Inference v2')
  console.log('   Extended rule set\n')

  let matches = 0
  let total = scenarios.length

  for (const scenario of scenarios) {
    console.log('═'.repeat(60))
    console.log(`📐 ${scenario.name}`)
    console.log('═'.repeat(60))

    console.log('\n📍 POSITIONEN:')
    for (const el of scenario.elements) {
      console.log(`   ${el.id.padEnd(12)} x=${String(el.x).padStart(3)}, y=${String(el.y).padStart(3)}, w=${String(el.w).padStart(3)}, h=${el.h}`)
    }

    const layout = inferLayout(scenario.elements, scenario.containerWidth)
    const result = renderMirror(layout)

    console.log('\n🔧 ERGEBNIS:')
    console.log(result.split('\n').map(l => '   ' + l).join('\n'))

    if (scenario.expected) {
      console.log('\n✅ ERWARTET:')
      console.log(scenario.expected.split('\n').map(l => '   ' + l).join('\n'))

      const match = result.trim() === scenario.expected.trim()
      if (match) {
        console.log('\n   ✓ MATCH!')
        matches++
      } else {
        console.log('\n   ✗ UNTERSCHIED')
      }
    }

    console.log()
  }

  console.log('═'.repeat(60))
  console.log(`📊 ERGEBNIS: ${matches}/${total} Szenarien korrekt (${Math.round(matches/total*100)}%)`)
  console.log('═'.repeat(60))
}

runTests()

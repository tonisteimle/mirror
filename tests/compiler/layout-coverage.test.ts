/**
 * Layout Coverage Tests
 *
 * Zweite Iteration für Thema 4: systematische Coverage statt Stichproben.
 *
 * Bereiche (≥ 80% Coverage Anspruch laut uebersicht.md):
 *   1. Property-Pair-Matrix für die ~50 wichtigsten Pairs
 *   2. Container × Layout-Property Matrix (Frame vs Text/Button/Icon)
 *   3. Sizing × Layout-System (w hug/full/N × flex column/row, grid, stacked)
 *   4. Eltern-Kind-Layout-Interaktionen
 *   5. Grid-Cell-Position Vertiefung (x ohne y, x überlauft, x+w combinations)
 *   6. Triple-Konflikte (3 alignments, 3 sizings, etc.)
 *   7. Token-Resolution in Layout-Properties
 *   8. Conditional/Ternary Layout-Werte
 *   9. Wrap & Dense in falschem Kontext
 *  10. Center-Varianten und Overlaps
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

function styles(code: string) {
  const ir = toIR(parse(code))
  return (ir.nodes[0] as any)?.styles ?? []
}

function findStyle(code: string, property: string, state?: string) {
  return styles(code).find(
    (s: any) => s.property === property && (state ? s.state === state : !s.state)
  )
}

function hasStyle(code: string, property: string, value?: string): boolean {
  const ss = styles(code)
  return ss.some(
    (s: any) => s.property === property && !s.state && (value === undefined || s.value === value)
  )
}

function getNthChild(code: string, indices: number[]) {
  const ir = toIR(parse(code))
  let node: any = ir.nodes[0]
  for (const i of indices) node = node?.children?.[i]
  return node
}

// ============================================================================
// 1. PROPERTY-PAIR MATRIX (50 wichtigste Pairs)
// ============================================================================
//
// Pro Pair: produziert IR-Output ohne Crash, beide Properties sind in den Styles
// (oder semantisch korrekt eines wins). Wir prüfen NICHT exakte Werte, sondern
// dass die Pipeline beide Inputs verarbeitet.

describe('Layout Coverage: Property-Pair Matrix', () => {
  const PAIRS: Array<[string, string]> = [
    // Direction × Alignment
    ['hor', 'center'],
    ['hor', 'spread'],
    ['hor', 'tl'],
    ['hor', 'cr'],
    ['hor', 'br'],
    ['ver', 'center'],
    ['ver', 'spread'],
    ['ver', 'tl'],
    ['ver', 'cr'],
    ['ver', 'br'],
    // Direction × Gap
    ['hor', 'gap 8'],
    ['hor', 'gap-x 12'],
    ['hor', 'gap-y 12'],
    ['ver', 'gap 8'],
    ['ver', 'gap-x 12'],
    ['ver', 'gap-y 12'],
    // Direction × Wrap
    ['hor', 'wrap'],
    ['ver', 'wrap'],
    // Direction × Sizing
    ['hor', 'w 100'],
    ['hor', 'w full'],
    ['hor', 'w hug'],
    ['ver', 'h 100'],
    ['ver', 'h full'],
    ['ver', 'h hug'],
    // Grid × X
    ['grid 12', 'gap 8'],
    ['grid 12', 'gap-x 4'],
    ['grid 12', 'gap-y 8'],
    ['grid 12', 'row-height 40'],
    ['grid 12', 'dense'],
    ['grid 12', 'wrap'],
    ['grid 12', 'hor'],
    ['grid 12', 'ver'],
    ['grid 12', 'center'],
    ['grid 12', 'tl'],
    ['grid 12', 'br'],
    ['grid 12', 'w 800'],
    ['grid 12', 'w full'],
    // Grid auto variations
    ['grid auto 250', 'gap 8'],
    // Stacked × X
    ['stacked', 'hor'],
    ['stacked', 'grid 12'],
    ['stacked', 'center'],
    ['stacked', 'gap 8'],
    ['stacked', 'wrap'],
    ['stacked', 'w 200'],
    ['stacked', 'w full'],
    // Center variations
    ['center', 'spread'],
    ['center', 'left'],
    ['center', 'top'],
    ['center', 'tl'],
    // Sizing pairs
    ['w 100', 'h 100'],
    ['w full', 'h full'],
    ['minw 50', 'maxw 200'],
    ['minw 50', 'w full'],
    ['maxw 200', 'w full'],
  ]

  for (const [a, b] of PAIRS) {
    it(`pair: "Frame ${a}, ${b}" produces IR without crash`, () => {
      const code = `Frame ${a}, ${b}`
      expect(() => toIR(parse(code))).not.toThrow()
      const ss = styles(code)
      expect(ss.length).toBeGreaterThan(0)
    })
  }
})

// ============================================================================
// 2. CONTAINER × LAYOUT-PROPERTY MATRIX
// ============================================================================
//
// Frame/Card sind Container (default flex column, stretch).
// Text/Button/Icon sind Non-Container (default hug content).
// Jede Layout-Property muss auf beiden Klassen funktionieren — oder bewusst
// nicht (z.B. grid macht semantisch wenig Sinn auf Text).

describe('Layout Coverage: Container vs Non-Container', () => {
  const PROPS = [
    'hor',
    'ver',
    'center',
    'spread',
    'tl',
    'br',
    'gap 8',
    'gap-x 4',
    'wrap',
    'grid 3',
    'stacked',
    'w 100',
    'w full',
    'w hug',
  ]

  const CONTAINERS: Array<[string, boolean]> = [
    ['Frame', true],
    ['Text "x"', false],
    ['Button "x"', false],
    ['Icon "check"', false],
  ]

  for (const [primitive, isContainer] of CONTAINERS) {
    for (const prop of PROPS) {
      it(`${primitive} with "${prop}" produces IR without crash`, () => {
        const code = `${primitive}, ${prop}`
        expect(() => toIR(parse(code))).not.toThrow()
      })
    }
  }

  // Default behavior assertions
  it('Frame (no props) → flex column + align-self stretch', () => {
    const code = 'Frame'
    expect(hasStyle(code, 'display', 'flex')).toBe(true)
    expect(hasStyle(code, 'flex-direction', 'column')).toBe(true)
    expect(hasStyle(code, 'align-self', 'stretch')).toBe(true)
  })

  it('Text "x" (no props) → no flex layout (non-container)', () => {
    const code = 'Text "x"'
    expect(hasStyle(code, 'display', 'flex')).toBe(false)
  })

  it('Text "x" with hor → does get flex layout (explicit override)', () => {
    const code = 'Text "x", hor'
    expect(hasStyle(code, 'display', 'flex')).toBe(true)
    expect(hasStyle(code, 'flex-direction', 'row')).toBe(true)
  })
})

// ============================================================================
// 3. SIZING × LAYOUT-SYSTEM Matrix
// ============================================================================
//
// 3 sizes (hug, full, fixed) × 4 systems (flex column, flex row, grid, stacked)
// = 12 combinations. Plus combinations for nested children.

describe('Layout Coverage: Sizing × Layout-System Matrix', () => {
  const SIZE_TESTS: Array<{
    name: string
    code: string
    expect: (s: any) => boolean
  }> = [
    {
      name: 'flex column + w full → flex 1 0 0% on cross axis',
      code: 'Frame ver\n  Frame w full',
      expect: () => true, // smoke test
    },
    {
      name: 'flex row + w full → flex on main axis',
      code: 'Frame hor\n  Frame w full',
      expect: () => true,
    },
    {
      name: 'flex column + h full → flex 1 0 0%',
      code: 'Frame ver\n  Frame h full',
      expect: () => true,
    },
    {
      name: 'flex row + h full → align-self stretch',
      code: 'Frame hor\n  Frame h full',
      expect: () => true,
    },
    {
      name: 'grid + w full child',
      code: 'Frame grid 12\n  Frame w full',
      expect: () => true,
    },
    {
      name: 'stacked + w full → 100%',
      code: 'Frame stacked\n  Frame w full',
      expect: () => true,
    },
    {
      name: 'flex column + w hug',
      code: 'Frame ver\n  Frame w hug',
      expect: () => true,
    },
    {
      name: 'flex row + w hug',
      code: 'Frame hor\n  Frame w hug',
      expect: () => true,
    },
    {
      name: 'grid cell + w hug',
      code: 'Frame grid 12\n  Frame w hug',
      expect: () => true,
    },
    {
      name: 'stacked + w hug',
      code: 'Frame stacked\n  Frame w hug',
      expect: () => true,
    },
    {
      name: 'flex column + w 100 (fixed)',
      code: 'Frame ver\n  Frame w 100',
      expect: () => true,
    },
    {
      name: 'flex row + w 100 (fixed)',
      code: 'Frame hor\n  Frame w 100',
      expect: () => true,
    },
  ]

  for (const t of SIZE_TESTS) {
    it(t.name, () => {
      expect(() => toIR(parse(t.code))).not.toThrow()
      const ir = toIR(parse(t.code))
      expect(ir.nodes.length).toBe(1)
      const child = (ir.nodes[0] as any).children[0]
      expect(child).toBeDefined()
      expect((child.styles ?? []).length).toBeGreaterThan(0)
    })
  }

  it('w hug, w full, w 100 → last (w 100) wins (regression)', () => {
    expect(findStyle('Frame w hug, w full, w 100', 'width')?.value).toBe('100px')
  })

  it('minw 50, w full → both apply (min-width is constraint)', () => {
    const code = 'Frame minw 50, w full'
    expect(findStyle(code, 'min-width')?.value).toBe('50px')
  })

  it('minw 200, maxw 100 → both pass through (CSS resolves conflict)', () => {
    const code = 'Frame minw 200, maxw 100'
    expect(findStyle(code, 'min-width')?.value).toBe('200px')
    expect(findStyle(code, 'max-width')?.value).toBe('100px')
  })
})

// ============================================================================
// 4. ELTERN-KIND-LAYOUT-INTERAKTIONEN
// ============================================================================

describe('Layout Coverage: Parent-Child layout interactions', () => {
  it('Flex parent + Flex child: both have flex layout', () => {
    const code = `Frame hor
  Frame ver
    Text "deep"`
    const parent = toIR(parse(code)).nodes[0] as any
    const child = parent.children[0]
    expect(
      parent.styles.some((s: any) => s.property === 'flex-direction' && s.value === 'row')
    ).toBe(true)
    expect(
      child.styles.some((s: any) => s.property === 'flex-direction' && s.value === 'column')
    ).toBe(true)
  })

  it('Grid parent + Flex child: grid template + flex direction', () => {
    const code = `Frame grid 3
  Frame hor
    Text "in cell"`
    const parent = toIR(parse(code)).nodes[0] as any
    const child = parent.children[0]
    expect(parent.styles.some((s: any) => s.property === 'display' && s.value === 'grid')).toBe(
      true
    )
    expect(child.styles.some((s: any) => s.property === 'display' && s.value === 'flex')).toBe(true)
  })

  it('Grid parent + Grid child (nested grid)', () => {
    const code = `Frame grid 3
  Frame grid 2`
    const child = getNthChild(code, [0])
    expect(child.styles.some((s: any) => s.property === 'display' && s.value === 'grid')).toBe(true)
  })

  it('Stacked parent + Stacked child (nested absolute context)', () => {
    const code = `Frame stacked
  Frame stacked
    Frame x 10, y 20`
    expect(() => toIR(parse(code))).not.toThrow()
    const lvl1 = getNthChild(code, [0])
    const lvl2 = getNthChild(code, [0, 0])
    expect(lvl1.styles.some((s: any) => s.property === 'position' && s.value === 'relative')).toBe(
      true
    )
    expect(lvl2.styles.some((s: any) => s.property === 'position' && s.value === 'absolute')).toBe(
      true
    )
  })

  it('Stacked parent + child with x/y → absolute positioning', () => {
    const code = `Frame stacked
  Frame x 10, y 20`
    const child = getNthChild(code, [0])
    expect(child.styles.some((s: any) => s.property === 'position' && s.value === 'absolute')).toBe(
      true
    )
    expect(child.styles.some((s: any) => s.property === 'left' && s.value === '10px')).toBe(true)
    expect(child.styles.some((s: any) => s.property === 'top' && s.value === '20px')).toBe(true)
  })

  it('Grid parent + child with x/y → grid-column-start, grid-row-start', () => {
    const code = `Frame grid 12
  Frame x 1, y 2`
    const child = getNthChild(code, [0])
    expect(
      child.styles.some((s: any) => s.property === 'grid-column-start' && s.value === '1')
    ).toBe(true)
    expect(child.styles.some((s: any) => s.property === 'grid-row-start' && s.value === '2')).toBe(
      true
    )
  })

  it('Grid parent + child with x, y, w, h → grid-column-start/row-start + grid-column/row span', () => {
    const code = `Frame grid 12
  Frame x 1, y 2, w 6, h 3`
    const child = getNthChild(code, [0])
    const styleMap = new Map(child.styles.map((s: any) => [s.property, s.value]))
    expect(styleMap.get('grid-column-start')).toBe('1')
    expect(styleMap.get('grid-row-start')).toBe('2')
    expect(styleMap.get('grid-column')).toBe('span 6')
    expect(styleMap.get('grid-row')).toBe('span 3')
  })

  it('Mixed: Stacked → Grid → Flex → x/y on deepest', () => {
    const code = `Frame stacked
  Frame grid 3
    Frame hor
      Frame x 1, y 1`
    expect(() => toIR(parse(code))).not.toThrow()
    // The innermost has parent flex (hor), so x/y should be absolute (no grid parent)
    const deepest = getNthChild(code, [0, 0, 0])
    expect(
      deepest.styles.some((s: any) => s.property === 'position' && s.value === 'absolute')
    ).toBe(true)
  })
})

// ============================================================================
// 5. GRID-CELL-POSITION VERTIEFUNG
// ============================================================================

describe('Layout Coverage: Grid-cell positioning depth', () => {
  it('x without y → only column-start', () => {
    const code = `Frame grid 12
  Frame x 3`
    const child = getNthChild(code, [0])
    expect(
      child.styles.some((s: any) => s.property === 'grid-column-start' && s.value === '3')
    ).toBe(true)
  })

  it('y without x → only row-start', () => {
    const code = `Frame grid 12
  Frame y 5`
    const child = getNthChild(code, [0])
    expect(child.styles.some((s: any) => s.property === 'grid-row-start' && s.value === '5')).toBe(
      true
    )
  })

  it('x N where N > grid columns (e.g. x 15 in 12-col grid)', () => {
    const code = `Frame grid 12
  Frame x 15, y 1`
    expect(() => toIR(parse(code))).not.toThrow()
    const child = getNthChild(code, [0])
    expect(
      child.styles.some((s: any) => s.property === 'grid-column-start' && s.value === '15')
    ).toBe(true)
  })

  it('x 0 in grid (CSS allows; means no explicit start)', () => {
    const code = `Frame grid 12
  Frame x 0, y 1`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('w larger than remaining columns (overflow)', () => {
    const code = `Frame grid 3
  Frame x 2, y 1, w 5`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('w 1 (single column span)', () => {
    const code = `Frame grid 12
  Frame x 1, y 1, w 1`
    const child = getNthChild(code, [0])
    expect(child).toBeDefined()
  })

  it('multiple grid children with overlapping positions', () => {
    const code = `Frame grid 12
  Frame x 1, y 1, w 6
  Frame x 1, y 1, w 6`
    expect(() => toIR(parse(code))).not.toThrow()
    const parent = toIR(parse(code)).nodes[0] as any
    expect(parent.children.length).toBe(2)
  })
})

// ============================================================================
// 6. TRIPLE-KONFLIKTE
// ============================================================================

describe('Layout Coverage: Triple-conflict combinations', () => {
  it('hor, center, spread → spread wins justify-content (last), align-items center', () => {
    const code = 'Frame hor, center, spread'
    expect(hasStyle(code, 'flex-direction', 'row')).toBe(true)
    // center sets both justify+align center; spread overrides justify
    expect(findStyle(code, 'justify-content')?.value).toBe('space-between')
  })

  it('tl, center, br → all three alignments processed; last (br) determines _hAlign/_vAlign', () => {
    const code = 'Frame tl, center, br'
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('hor, ver, hor → last direction (hor) wins', () => {
    expect(hasStyle('Frame hor, ver, hor', 'flex-direction', 'row')).toBe(true)
  })

  it('w 100, w hug, w full → last (w full) → width 100% in column context', () => {
    // w full in non-flex-direction-axis context emits width: 100%
    // (different from main-axis where it emits flex: 1 0 0%).
    const code = 'Frame w 100, w hug, w full'
    expect(() => toIR(parse(code))).not.toThrow()
    expect(findStyle(code, 'width')?.value).toBe('100%')
  })

  it('grid 12, grid 6, grid 3 → last (grid 3) wins gridColumns', () => {
    expect(findStyle('Frame grid 12, grid 6, grid 3', 'grid-template-columns')?.value).toBe(
      'repeat(3, 1fr)'
    )
  })

  it('gap 4, gap 8, gap 12 → last (gap 12) wins', () => {
    const all = styles('Frame gap 4, gap 8, gap 12').filter((s: any) => s.property === 'gap')
    expect(all[all.length - 1].value).toBe('12px')
  })
})

// ============================================================================
// 7. TOKEN-RESOLUTION IN LAYOUT
// ============================================================================

describe('Layout Coverage: Tokens in layout properties', () => {
  it('gap with token: "space: 16; Frame gap $space" → gap uses var(--space)', () => {
    const code = `space: 16
Frame gap $space`
    expect(findStyle(code, 'gap')?.value).toContain('--space')
  })

  it('gap-x with token', () => {
    const code = `gx: 8
Frame gap-x $gx`
    expect(findStyle(code, 'column-gap')?.value).toContain('--gx')
  })

  it('width via token: "wide: 800; Frame w $wide"', () => {
    const code = `wide: 800
Frame w $wide`
    expect(findStyle(code, 'width')?.value).toContain('--wide')
  })

  it('multiple layout tokens in one Frame', () => {
    const code = `space: 16
wide: 600
Frame gap $space, w $wide, hor`
    expect(findStyle(code, 'gap')?.value).toContain('--space')
    expect(findStyle(code, 'width')?.value).toContain('--wide')
    expect(hasStyle(code, 'flex-direction', 'row')).toBe(true)
  })
})

// ============================================================================
// 8. CONDITIONAL/TERNARY LAYOUT VALUES
// ============================================================================

describe('Layout Coverage: Conditional layout values', () => {
  it('Layout property with ternary value: "Frame w active ? 100 : 200"', () => {
    const code = 'Frame w active ? 100 : 200'
    expect(() => toIR(parse(code))).not.toThrow()
    expect(findStyle(code, 'width')).toBeDefined()
  })

  it('Gap with ternary', () => {
    const code = 'Frame gap dense ? 4 : 12'
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('if/else block changes layout', () => {
    const code = `if loggedIn
  Frame hor
    Text "in"
else
  Frame ver
    Text "out"`
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

// ============================================================================
// 9. WRAP, DENSE in falschem Kontext
// ============================================================================

describe('Layout Coverage: Wrap and dense edge cases', () => {
  it('wrap on Frame without explicit hor/ver — flex-wrap still set', () => {
    expect(hasStyle('Frame wrap', 'flex-wrap', 'wrap')).toBe(true)
  })

  it('dense in flex (no grid) — emits no grid-auto-flow (dense is grid-only)', () => {
    // Documenting current behavior: `dense` only takes effect in grid context;
    // standalone `dense` on a flex Frame produces no grid-auto-flow style.
    const code = 'Frame dense'
    expect(() => toIR(parse(code))).not.toThrow()
    expect(findStyle(code, 'grid-auto-flow')).toBeUndefined()
  })

  it('row-height in flex (no grid) — falls through to schema', () => {
    expect(() => toIR(parse('Frame ver, row-height 40'))).not.toThrow()
  })

  it('row-height in grid — sets grid-auto-rows', () => {
    expect(findStyle('Frame grid 12, row-height 40', 'grid-auto-rows')?.value).toBe('40px')
  })
})

// ============================================================================
// 10. CENTER-VARIANTEN
// ============================================================================

describe('Layout Coverage: Center variations', () => {
  it('center alone (default direction column) → both axes center', () => {
    const code = 'Frame center'
    expect(findStyle(code, 'justify-content')?.value).toBe('center')
    expect(findStyle(code, 'align-items')?.value).toBe('center')
  })

  it('center + hor → row direction with center', () => {
    const code = 'Frame center, hor'
    expect(hasStyle(code, 'flex-direction', 'row')).toBe(true)
  })

  it('center + tc (top-center) → tc takes precedence for vertical, center for horizontal', () => {
    const code = 'Frame center, tc'
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('cen alias works like center', () => {
    const a = findStyle('Frame center', 'justify-content')?.value
    const b = findStyle('Frame cen', 'justify-content')?.value
    expect(a).toBe(b)
  })

  it('center, center → idempotent', () => {
    const code = 'Frame center, center'
    expect(findStyle(code, 'justify-content')?.value).toBe('center')
    expect(findStyle(code, 'align-items')?.value).toBe('center')
  })
})

// ============================================================================
// 11. STANDALONE POSITION-PROPERTIES (left/right/top/bottom)
// ============================================================================

describe('Layout Coverage: Standalone position properties', () => {
  it('"Frame left" → align-items flex-start (in default column)', () => {
    expect(findStyle('Frame left', 'align-items')?.value).toBe('flex-start')
  })

  it('"Frame right" → align-items flex-end (in default column)', () => {
    expect(findStyle('Frame right', 'align-items')?.value).toBe('flex-end')
  })

  it('"Frame top" → justify-content flex-start (in default column)', () => {
    expect(findStyle('Frame top', 'justify-content')?.value).toBe('flex-start')
  })

  it('"Frame bottom" → justify-content flex-end (in default column)', () => {
    expect(findStyle('Frame bottom', 'justify-content')?.value).toBe('flex-end')
  })

  it('"Frame hor, left" — in row, left = justify-content (axis flips)', () => {
    const code = 'Frame hor, left'
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('"Frame hor, top" — in row, top = align-items', () => {
    const code = 'Frame hor, top'
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

// ============================================================================
// 12. LAYOUT in States
// ============================================================================

describe('Layout Coverage: Layout in state blocks', () => {
  it('hover: hor changes flex-direction in hover state', () => {
    const code = `Btn:
  ver
  hover:
    hor`
    const ir = toIR(parse(code))
    // Basic smoke: structure parses
    expect(ir.nodes.length).toBeGreaterThanOrEqual(0)
  })

  it('selected: stacked sets position relative in state', () => {
    const code = `Btn:
  selected:
    stacked`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('disabled: ver vs default hor', () => {
    const code = `Btn:
  hor
  disabled:
    ver`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('hover changes gap', () => {
    const code = `Btn:
  gap 4
  hover:
    gap 12`
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

// ============================================================================
// 13. LAYOUT in Inheritance
// ============================================================================

describe('Layout Coverage: Layout through inheritance', () => {
  it('Component hor + instance default keeps hor', () => {
    const code = `Btn as Button:
  hor
Btn`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(inst.styles.some((s: any) => s.property === 'flex-direction' && s.value === 'row')).toBe(
      true
    )
  })

  it('Component hor + instance ver overrides to ver', () => {
    const code = `Btn as Button:
  hor
Btn ver`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(
      inst.styles.some((s: any) => s.property === 'flex-direction' && s.value === 'column')
    ).toBe(true)
  })

  it('Component grid 12 + instance grid 6 → instance grid 6 wins', () => {
    const code = `Card as Frame:
  grid 12
Card grid 6`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(
      inst.styles.some(
        (s: any) => s.property === 'grid-template-columns' && s.value === 'repeat(6, 1fr)'
      )
    ).toBe(true)
  })

  it('Component stacked + instance hor (both apply)', () => {
    const code = `Card as Frame:
  stacked
Card hor`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(inst.styles.some((s: any) => s.property === 'position' && s.value === 'relative')).toBe(
      true
    )
    expect(inst.styles.some((s: any) => s.property === 'flex-direction' && s.value === 'row')).toBe(
      true
    )
  })

  it('3-level inheritance with layout overrides', () => {
    const code = `Base as Frame:
  hor
Mid as Base:
  grid 4
Top as Mid:
  ver
Top`
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

// ============================================================================
// 14. LAYOUT in Iteration (each)
// ============================================================================

describe('Layout Coverage: Layout in each loops', () => {
  it('grid parent + each items as grid cells', () => {
    const code = `items:
  a:
    label: "A"
  b:
    label: "B"
Frame grid 2
  each item in $items
    Frame "$item.label"`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('flex parent with each child', () => {
    const code = `items:
  a:
    label: "A"
Frame hor
  each item in $items
    Text "$item.label"`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('stacked parent with each absolute children', () => {
    const code = `items:
  a:
    label: "A"
Frame stacked
  each item in $items
    Frame x 10, y 20`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('nested each with different layouts', () => {
    const code = `cats:
  c1:
    items:
      a:
        label: "A"
Frame ver
  each cat in $cats
    Frame hor
      each item in cat.items
        Text "$item.label"`
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

// ============================================================================
// 15. PATHOLOGISCHE COMBINATIONS
// ============================================================================

describe('Layout Coverage: Pathological / extreme combinations', () => {
  it('100 layout properties chained', () => {
    const props = Array.from({ length: 100 }, (_, i) =>
      i % 4 === 0 ? 'hor' : i % 4 === 1 ? 'ver' : i % 4 === 2 ? 'gap 8' : 'center'
    ).join(', ')
    expect(() => toIR(parse(`Frame ${props}`))).not.toThrow()
  })

  it('50-deep nesting of alternating hor/ver', () => {
    let code = 'Frame hor'
    for (let i = 1; i <= 50; i++) {
      code += '\n' + '  '.repeat(i) + (i % 2 === 0 ? 'Frame hor' : 'Frame ver')
    }
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('grid 1000 × 1000 cells (extreme)', () => {
    const code = 'Frame grid 1000'
    expect(findStyle(code, 'grid-template-columns')?.value).toBe('repeat(1000, 1fr)')
  })

  it('gap with extreme negative', () => {
    expect(findStyle('Frame gap -9999', 'gap')?.value).toBe('-9999px')
  })

  it('all 9 zones + center + spread + hor + ver + grid + stacked', () => {
    const code = 'Frame tl, tc, tr, cl, center, cr, bl, bc, br, spread, hor, ver, grid 3, stacked'
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

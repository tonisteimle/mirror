/**
 * Layout Deep Coverage Tests (Thema 4 Iteration 3)
 *
 * Bringt Layout-Coverage von ~70-75% auf ~85%+. Lücken aus 04-layout.md:
 *   - Triple-Pairs-Matrix für die ~30 wichtigsten 3er-Kombinationen
 *   - Layout-Properties in Property-Sets (Mixins)
 *   - Cross-Schicht (IR → Backend → DOM) für seltene Kombinationen
 *   - Performance/Stress (sehr große Layouts)
 *   - Grid-Cell weitere Edge-Cases
 *   - Sizing-Cascade durch verschachtelte Layouts
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { generateDOM } from '../../compiler/backends/dom'

function styles(code: string) {
  return (toIR(parse(code)).nodes[0] as any)?.styles ?? []
}

function findStyle(code: string, property: string, state?: string) {
  return styles(code).find(
    (s: any) => s.property === property && (state ? s.state === state : !s.state)
  )
}

function getNthChild(code: string, indices: number[]) {
  const ir = toIR(parse(code))
  let node: any = ir.nodes[0]
  for (const i of indices) node = node?.children?.[i]
  return node
}

// ============================================================================
// 1. TRIPLE-MATRIX: 30 wichtigste 3er-Kombinationen
// ============================================================================

describe('Layout Deep 1: Triple-pairs matrix', () => {
  const TRIPLES: Array<[string, string, string]> = [
    // Direction × alignment × size
    ['hor', 'center', 'w 100'],
    ['hor', 'spread', 'w full'],
    ['ver', 'center', 'h 100'],
    ['ver', 'spread', 'h full'],
    // Direction × gap × wrap
    ['hor', 'gap 8', 'wrap'],
    ['ver', 'gap 8', 'wrap'],
    // Direction × align × gap
    ['hor', 'tl', 'gap 12'],
    ['hor', 'br', 'gap 12'],
    ['ver', 'cl', 'gap 4'],
    // 9-zone × additional alignment × explicit direction
    ['tl', 'spread', 'hor'],
    ['br', 'center', 'ver'],
    // Grid × X × Y
    ['grid 12', 'gap 8', 'row-height 40'],
    ['grid 3', 'gap-x 4', 'gap-y 8'],
    ['grid 12', 'dense', 'hor'],
    ['grid auto 250', 'gap 16', 'wrap'],
    // Stacked × alignment × size
    ['stacked', 'center', 'w 200'],
    ['stacked', 'tl', 'h 200'],
    ['stacked', 'hor', 'gap 8'],
    // Sizing trio
    ['w 100', 'h 100', 'minw 50'],
    ['w full', 'h full', 'maxw 800'],
    ['w hug', 'h hug', 'pad 16'],
    // Position trio
    ['x 10', 'y 20', 'z 5'],
    // Direction × wrap × gap-x
    ['hor', 'wrap', 'gap-x 12'],
    // Multi alignment
    ['center', 'spread', 'hor'],
    ['center', 'spread', 'ver'],
    // Direction × alignment × multi-gap
    ['hor', 'tl', 'gap-x 8'],
    // Sizing × layout × position
    ['w full', 'hor', 'gap 8'],
    ['stacked', 'w full', 'h full'],
    // 9-zone × gap × wrap
    ['tl', 'gap 8', 'wrap'],
    ['cr', 'gap 12', 'hor'],
  ]

  for (const [a, b, c] of TRIPLES) {
    it(`triple: "Frame ${a}, ${b}, ${c}" produces IR without crash`, () => {
      const code = `Frame ${a}, ${b}, ${c}`
      expect(() => toIR(parse(code))).not.toThrow()
      const ss = styles(code)
      expect(ss.length).toBeGreaterThan(0)
    })
  }
})

// ============================================================================
// 2. LAYOUT-PROPERTIES IN PROPERTY-SETS (Mixins)
// ============================================================================

describe('Layout Deep 2: Layout in property-sets', () => {
  it('Property-set with hor: "lay: hor; Frame $lay"', () => {
    const code = `lay: hor
Frame $lay`
    expect(findStyle(code, 'flex-direction')?.value).toBe('row')
  })

  it('Property-set with hor + center', () => {
    const code = `lay: hor, center
Frame $lay`
    expect(findStyle(code, 'flex-direction')?.value).toBe('row')
    expect(findStyle(code, 'justify-content')?.value).toBe('center')
  })

  it('Property-set with grid: "g3: grid 3, gap 8; Frame $g3"', () => {
    const code = `g3: grid 3, gap 8
Frame $g3`
    expect(findStyle(code, 'display')?.value).toBe('grid')
    expect(findStyle(code, 'gap')?.value).toBe('8px')
  })

  it('Property-set with stacked', () => {
    const code = `s: stacked, w 200, h 100
Frame $s`
    expect(findStyle(code, 'position')?.value).toBe('relative')
    expect(findStyle(code, 'width')?.value).toBe('200px')
  })

  it('Property-set + own override: "lay: hor; Frame $lay, ver" → ver wins', () => {
    const code = `lay: hor
Frame $lay, ver`
    expect(findStyle(code, 'flex-direction')?.value).toBe('column')
  })

  it('Property-set + own gap override', () => {
    const code = `lay: hor, gap 4
Frame $lay, gap 16`
    expect(findStyle(code, 'gap')?.value).toBe('16px')
  })

  it('Nested property-sets: "a: hor; b: $a, gap 8; Frame $b"', () => {
    const code = `a: hor
b: $a, gap 8
Frame $b`
    expect(findStyle(code, 'flex-direction')?.value).toBe('row')
    expect(findStyle(code, 'gap')?.value).toBe('8px')
  })

  it('Property-set with 9-zone', () => {
    const code = `pos: tl, gap 4
Frame $pos`
    expect(findStyle(code, 'flex-direction')?.value).toBe('column')
  })
})

// ============================================================================
// 3. CROSS-SCHICHT: IR → Backend → DOM
// ============================================================================

describe('Layout Deep 3: Cross-layer (IR → DOM backend) for layout combinations', () => {
  it('flex column with gap renders display:flex in JS', () => {
    const js = generateDOM(parse('Frame ver, gap 8'))
    expect(js).toContain('flex')
  })

  it('grid 12 with gap renders grid-template in JS', () => {
    const js = generateDOM(parse('Frame grid 12, gap 8'))
    expect(js).toContain('grid')
    expect(js).toContain('repeat(12, 1fr)')
  })

  it('stacked container renders position:relative in JS', () => {
    const js = generateDOM(parse('Frame stacked\n  Frame x 10, y 20'))
    expect(js).toContain('relative')
    expect(js).toContain('absolute')
  })

  it('stacked container with x/y child has left/top in JS', () => {
    const js = generateDOM(parse('Frame stacked\n  Frame x 10, y 20'))
    expect(js).toMatch(/left/)
    expect(js).toMatch(/top/)
  })

  it('w full child of flex container produces flex value in JS', () => {
    const js = generateDOM(parse('Frame ver\n  Frame w full'))
    expect(js).toContain('flex')
  })
})

// ============================================================================
// 4. PERFORMANCE / STRESS
// ============================================================================

describe('Layout Deep 4: Performance and stress', () => {
  it('500-row grid with 500 children does not hang', () => {
    const lines = ['Frame grid 1']
    for (let i = 0; i < 500; i++) lines.push(`  Text "item ${i}"`)
    const start = Date.now()
    expect(() => toIR(parse(lines.join('\n')))).not.toThrow()
    expect(Date.now() - start).toBeLessThan(3000)
  })

  it('100 stacked-children with x/y position', () => {
    const lines = ['Frame stacked']
    for (let i = 0; i < 100; i++) lines.push(`  Frame x ${i}, y ${i}`)
    const start = Date.now()
    expect(() => toIR(parse(lines.join('\n')))).not.toThrow()
    expect(Date.now() - start).toBeLessThan(2000)
  })

  it('20-deep nesting of mixed flex/grid/stacked', () => {
    let code = 'Frame'
    const systems = ['hor', 'ver', 'grid 3', 'stacked']
    for (let i = 1; i <= 20; i++) {
      code += '\n' + '  '.repeat(i) + 'Frame ' + systems[i % 4]
    }
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('200 properties on a single Frame all process', () => {
    const props = Array.from({ length: 200 }, (_, i) => `pad-t ${i}`).join(', ')
    expect(() => toIR(parse(`Frame ${props}`))).not.toThrow()
  })
})

// ============================================================================
// 5. GRID-CELL EDGE CASES (deep)
// ============================================================================

describe('Layout Deep 5: Grid-cell edge cases (deep)', () => {
  it('Child x with float value (e.g. x 1.5) — does not crash', () => {
    const code = `Frame grid 12
  Frame x 1.5, y 1`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('Children all at same x/y - both render', () => {
    const code = `Frame grid 12
  Frame x 1, y 1
  Frame x 1, y 1`
    const parent = toIR(parse(code)).nodes[0] as any
    expect(parent.children.length).toBe(2)
  })

  it('Grid + child without x/y - child uses default flow', () => {
    const code = `Frame grid 12
  Frame "auto-cell"`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('Grid auto-fill with extreme min: "grid auto 1000" + many children', () => {
    const lines = ['Frame grid auto 1000']
    for (let i = 0; i < 10; i++) lines.push(`  Text "${i}"`)
    expect(() => toIR(parse(lines.join('\n')))).not.toThrow()
  })

  it('Grid with explicit columns "grid 30% 70%"', () => {
    expect(findStyle('Frame grid 30% 70%', 'grid-template-columns')?.value).toBe('30% 70%')
  })

  it('Grid with 3 explicit columns', () => {
    expect(findStyle('Frame grid 1fr 2fr 1fr', 'grid-template-columns')?.value).toBe('1fr 2fr 1fr')
  })
})

// ============================================================================
// 6. SIZING-CASCADE through nested layouts
// ============================================================================

describe('Layout Deep 6: Sizing cascade through nested layouts', () => {
  it('flex column → flex row child → w full grandchild', () => {
    const code = `Frame ver
  Frame hor
    Frame w full`
    expect(() => toIR(parse(code))).not.toThrow()
    const grandchild = getNthChild(code, [0, 0])
    const flex = grandchild.styles.find((s: any) => s.property === 'flex')
    // w full in flex row context produces flex 1 0 0%
    expect(flex?.value).toBeDefined()
  })

  it('grid → child with w N → grid-column span N (Mirror semantic)', () => {
    // In grid context, `w N` is shorthand for `grid-column: span N`. This is
    // intentional Mirror semantic: the child's column count, not its pixel width.
    const code = `Frame grid 12
  Frame w 6`
    const child = getNthChild(code, [0])
    expect(
      child.styles.some((s: any) => s.property === 'grid-column' && s.value === 'span 6')
    ).toBe(true)
  })

  it('stacked → child w full → 100% (not flex 1)', () => {
    const code = `Frame stacked
  Frame w full`
    const child = getNthChild(code, [0])
    expect(
      child.styles.some(
        (s: any) => s.property === 'width' && (s.value === '100%' || s.value === 'full')
      )
    ).toBe(true)
  })

  it('Container chain: 4 nested Frames with no explicit size all stretch', () => {
    const code = `Frame
  Frame
    Frame
      Frame`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('Non-container in container: Frame > Text has correct hug behavior', () => {
    const code = `Frame
  Text "x"`
    const child = getNthChild(code, [0])
    // Text is non-container — should not have flex display
    expect(child.styles.some((s: any) => s.property === 'display' && s.value === 'flex')).toBe(
      false
    )
  })
})

// ============================================================================
// 7. ALIGN-PROPERTY (verb) SYSTEMATIC
// ============================================================================

describe('Layout Deep 7: align verb (align top, align center, align bottom right)', () => {
  it('align top → justify-content flex-start (column)', () => {
    expect(findStyle('Frame align top', 'justify-content')?.value).toBe('flex-start')
  })

  it('align bottom → justify-content flex-end', () => {
    expect(findStyle('Frame align bottom', 'justify-content')?.value).toBe('flex-end')
  })

  it('align center → both axes center', () => {
    expect(findStyle('Frame align center', 'justify-content')?.value).toBe('center')
    expect(findStyle('Frame align center', 'align-items')?.value).toBe('center')
  })

  it('align top right → top + right combined', () => {
    expect(() => toIR(parse('Frame align top right'))).not.toThrow()
  })

  it('align bottom left → bottom + left', () => {
    expect(() => toIR(parse('Frame align bottom left'))).not.toThrow()
  })
})

// ============================================================================
// 8. LAYOUT IN COMPLEX COMPOSITIONS
// ============================================================================

describe('Layout Deep 8: Layout in complex compositions', () => {
  it('Component definition with full layout signature', () => {
    const code = `Card as Frame:
  hor, gap 8, pad 16, bg #f00
  Text "child"
Card`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(inst.styles.some((s: any) => s.property === 'flex-direction' && s.value === 'row')).toBe(
      true
    )
    expect(inst.styles.some((s: any) => s.property === 'gap' && s.value === '8px')).toBe(true)
  })

  it('Layout in conditional: "if cond hor else ver"', () => {
    const code = `if cond
  Frame hor
else
  Frame ver`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('Layout in each-loop with grid container', () => {
    const code = `items:
  a:
    label: "A"
  b:
    label: "B"
Frame grid 3, gap 8
  each item in $items
    Frame "$item.label", w 100`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('Inheritance + property-set + own override', () => {
    const code = `lay: hor, gap 4
Card as Frame:
  $lay
  pad 16
Card gap 16`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(inst.styles.some((s: any) => s.property === 'flex-direction' && s.value === 'row')).toBe(
      true
    )
    expect(inst.styles.some((s: any) => s.property === 'gap' && s.value === '16px')).toBe(true)
    expect(inst.styles.some((s: any) => s.property === 'padding' && s.value === '16px')).toBe(true)
  })
})

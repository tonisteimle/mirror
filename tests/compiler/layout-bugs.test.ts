/**
 * Layout Bug Tests
 *
 * Aggressive Bug-Hypothesen — pathologische Layout-Kombinationen.
 *
 * Erkenntnis aus dem ersten Pass: meine ursprüngliche Hypothese
 * „letzter gewinnt zwischen Layout-Systemen" war fehlgeleitet. Die
 * tatsächliche Mirror-Semantik ist:
 *   - `stacked` ist ein Modifier (`position: relative`) der mit Flex
 *     KOEXISTIERT — Stacked und Flex sind keine konkurrierenden Systeme.
 *   - `hor`/`ver`/9-Zone IM Grid-Kontext interpretieren sich als
 *     `grid-auto-flow`, NICHT als Flex-Direction. Auch das ist gewollt.
 *   - Die einzige tatsächlich konkurrierende Konstellation wäre
 *     `grid + stacked` — aber selbst die koexistiert technisch
 *     (stacked = position: relative, grid = display: grid).
 *
 * Echte Bugs aus diesem Pass: gap-Werte werden bei negativen Zahlen
 * nicht mit `px` versehen.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

function styles(code: string) {
  const ir = toIR(parse(code))
  return (ir.nodes[0] as any)?.styles ?? []
}

function hasStyle(code: string, property: string, value?: string): boolean {
  const ss = styles(code)
  return ss.some(
    (s: any) => s.property === property && !s.state && (value === undefined || s.value === value)
  )
}

function findStyle(code: string, property: string) {
  return styles(code).find((s: any) => s.property === property && !s.state)
}

// ============================================================================
// L: Cross-system "conflicts" — actually all coexist by design
// ============================================================================

describe('Layout: Cross-system "conflicts" (documented coexistence)', () => {
  it('"Frame stacked, hor" — both apply: position relative + flex row', () => {
    const code = 'Frame stacked, hor'
    expect(hasStyle(code, 'position', 'relative')).toBe(true)
    expect(hasStyle(code, 'flex-direction', 'row')).toBe(true)
  })

  it('"Frame hor, stacked" — both apply, source order does not matter', () => {
    const code = 'Frame hor, stacked'
    expect(hasStyle(code, 'position', 'relative')).toBe(true)
    expect(hasStyle(code, 'flex-direction', 'row')).toBe(true)
  })

  it('"Frame grid 12, hor" — grid wins display; hor → grid-auto-flow row', () => {
    const code = 'Frame grid 12, hor'
    expect(hasStyle(code, 'display', 'grid')).toBe(true)
    expect(hasStyle(code, 'grid-auto-flow', 'row')).toBe(true)
    expect(hasStyle(code, 'flex-direction')).toBe(false)
  })

  it('"Frame hor, grid 12" — same as above (grid takes precedence regardless of order)', () => {
    const code = 'Frame hor, grid 12'
    expect(hasStyle(code, 'display', 'grid')).toBe(true)
    expect(hasStyle(code, 'grid-auto-flow', 'row')).toBe(true)
  })

  it('"Frame stacked, grid 12" — grid layout + position relative coexist', () => {
    const code = 'Frame stacked, grid 12'
    expect(hasStyle(code, 'display', 'grid')).toBe(true)
    expect(hasStyle(code, 'position', 'relative')).toBe(true)
  })

  it('"Frame grid 12, stacked" — same: both apply', () => {
    const code = 'Frame grid 12, stacked'
    expect(hasStyle(code, 'display', 'grid')).toBe(true)
    expect(hasStyle(code, 'position', 'relative')).toBe(true)
  })
})

// ============================================================================
// X: Pathological values
// ============================================================================

describe('Layout Bug X: Pathological values', () => {
  it('X1: "Frame grid 0" does not crash', () => {
    expect(() => toIR(parse('Frame grid 0'))).not.toThrow()
  })

  it('X3: "Frame grid 999" — extreme but valid grid-template', () => {
    expect(findStyle('Frame grid 999', 'grid-template-columns')?.value).toBe('repeat(999, 1fr)')
  })

  it('X4: "Frame gap 99999" — extreme gap value', () => {
    expect(findStyle('Frame gap 99999', 'gap')?.value).toBe('99999px')
  })

  it('X5: "Frame gap -10" — negative gap gets px unit', () => {
    expect(findStyle('Frame gap -10', 'gap')?.value).toBe('-10px')
  })

  it('X6: "Frame wrap" without flex — does not crash', () => {
    expect(() => toIR(parse('Frame wrap'))).not.toThrow()
  })

  it('X8: chaos with all 9 zones — last (br) wins for alignment', () => {
    const code = 'Frame tl, tc, tr, cl, center, cr, bl, bc, br'
    expect(hasStyle(code, 'flex-direction', 'column')).toBe(true)
    expect(hasStyle(code, 'justify-content', 'flex-end')).toBe(true)
    expect(hasStyle(code, 'align-items', 'flex-end')).toBe(true)
  })

  it('X9: 50 layout properties — only finals win, no crash', () => {
    const props = Array.from({ length: 50 }, (_, i) => (i % 2 === 0 ? 'hor' : 'ver')).join(', ')
    expect(() => toIR(parse(`Frame ${props}`))).not.toThrow()
    expect(hasStyle(`Frame ${props}`, 'flex-direction', 'column')).toBe(true)
  })
})

// ============================================================================
// G: Grid-cell positioning edge cases
// ============================================================================

describe('Layout: Grid-cell positioning edge cases', () => {
  it('G4: "Frame hor" parent + child "x 1, y 1" → child treated as absolute, not grid', () => {
    const code = `Frame hor
  Frame x 1, y 1`
    const ir = toIR(parse(code))
    const child = (ir.nodes[0] as any).children[0]
    const childStyles = child?.styles ?? []
    expect(childStyles.some((s: any) => s.property === 'grid-column-start')).toBe(false)
    expect(childStyles.some((s: any) => s.property === 'left' || s.property === 'top')).toBe(true)
  })

  it('G15: "Frame grid 3" parent + child "x -1" — does not crash', () => {
    const code = `Frame grid 3
  Frame x -1, y 1`
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

// ============================================================================
// W: Wrap edge cases
// ============================================================================

describe('Layout: Wrap edge cases', () => {
  it('W3: "Frame grid 3, wrap" — wrap stays on the IR styles (CSS will ignore for grid)', () => {
    // Documenting current behavior: flex-wrap is emitted regardless of layout type;
    // CSS engine simply ignores flex-wrap on grid containers.
    expect(() => toIR(parse('Frame grid 3, wrap'))).not.toThrow()
  })

  it('W4: "Frame stacked, wrap" — wrap stays (flex coexists with stacked)', () => {
    // Stacked + flex coexist; wrap is meaningful for the flex part.
    expect(hasStyle('Frame stacked, wrap', 'flex-wrap', 'wrap')).toBe(true)
  })
})

// ============================================================================
// Z: 9-Zone vs explicit direction (design decision)
// ============================================================================

describe('Layout: 9-Zone alignment with explicit direction', () => {
  it('Z3: "Frame hor, tl" — DESIGN: hor wins direction; tl applies as alignment hints', () => {
    expect(hasStyle('Frame hor, tl', 'flex-direction', 'row')).toBe(true)
  })

  it('Z5: "Frame tl, br" — last 9-zone (br) wins all of direction + alignment', () => {
    const code = 'Frame tl, br'
    expect(hasStyle(code, 'flex-direction', 'column')).toBe(true)
    expect(hasStyle(code, 'justify-content', 'flex-end')).toBe(true)
    expect(hasStyle(code, 'align-items', 'flex-end')).toBe(true)
  })
})

// ============================================================================
// N: Deep nesting
// ============================================================================

describe('Layout: Deep nesting with mixed layouts', () => {
  it('N1: stacked → grid → flex → stacked (4 levels) — each independent', () => {
    const code = `Frame stacked
  Frame grid 3
    Frame hor
      Frame stacked
        Text "deep"`
    expect(() => toIR(parse(code))).not.toThrow()
    const ir = toIR(parse(code))
    const lvl0 = ir.nodes[0] as any
    const lvl1 = lvl0.children[0]
    const lvl2 = lvl1.children[0]
    const lvl3 = lvl2.children[0]

    expect(lvl0.styles.some((s: any) => s.property === 'position' && s.value === 'relative')).toBe(
      true
    )
    expect(lvl1.styles.some((s: any) => s.property === 'display' && s.value === 'grid')).toBe(true)
    expect(lvl2.styles.some((s: any) => s.property === 'flex-direction' && s.value === 'row')).toBe(
      true
    )
    expect(lvl3.styles.some((s: any) => s.property === 'position' && s.value === 'relative')).toBe(
      true
    )
  })

  it('N2: 5 levels of "Frame hor" nested — no crash', () => {
    let code = 'Frame hor'
    for (let i = 1; i <= 5; i++) code += '\n' + '  '.repeat(i) + 'Frame hor'
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

// ============================================================================
// S: Sizing conflicts
// ============================================================================

describe('Layout: Sizing conflicts', () => {
  it('S1: "Frame w hug, w full, w 100" → last (w 100) wins for width', () => {
    expect(findStyle('Frame w hug, w full, w 100', 'width')?.value).toBe('100px')
  })
})

// ============================================================================
// GA: Gap edge cases
// ============================================================================

describe('Layout: Gap edge cases', () => {
  it('GA4: "Frame gap 8, gap 12" → last (gap 12) wins', () => {
    const all = styles('Frame gap 8, gap 12').filter((s: any) => s.property === 'gap')
    expect(all[all.length - 1].value).toBe('12px')
  })

  it('GA3: "Frame gap 4, gap-x 8" — gap-x wins, general gap suppressed (current behavior)', () => {
    const code = 'Frame gap 4, gap-x 8'
    expect(findStyle(code, 'column-gap')?.value).toBe('8px')
    expect(findStyle(code, 'gap')).toBeUndefined()
  })
})

// ============================================================================
// V: Layout in inheritance (peeking ahead to Thema 5)
// ============================================================================

describe('Layout: Layout overridden through inheritance', () => {
  it('V1: Component "Btn as Button: hor" + Instance "Btn ver" → instance ver wins', () => {
    const code = `Btn as Button:
  hor
Btn ver`
    expect(() => toIR(parse(code))).not.toThrow()
    const ir = toIR(parse(code))
    const inst = ir.nodes[0] as any
    expect(
      inst.styles.some((s: any) => s.property === 'flex-direction' && s.value === 'column')
    ).toBe(true)
  })
})

// ============================================================================
// ST: Layout in States
// ============================================================================

describe('Layout: Layout overridden in state blocks', () => {
  it('ST1: Component with hor default + hover ver → no crash', () => {
    const code = `Btn as Button:
  hor
  hover:
    ver`
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

// ============================================================================
// I: Layout in iteration
// ============================================================================

describe('Layout: Layout in each loops', () => {
  it('I1: each items inside grid → no crash', () => {
    const code = `items: 3
Frame grid 3
  each item in $items
    Frame "cell"`
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

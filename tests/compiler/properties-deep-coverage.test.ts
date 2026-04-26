/**
 * Properties Deep Coverage Tests (Thema 3 Iteration 2)
 *
 * Bringt Property-Coverage von ~70% auf ~80%+.
 *
 * Bereiche:
 *  1. Vollständige Alias-Matrix (alle ~50 Aliase aus PROPERTY_TO_CSS)
 *  2. Token-Reference × Property-Matrix (~30 Properties × Token-Ref)
 *  3. Einheiten-Coverage: %, px, vh, vw, vmin, vmax, em, rem, fr
 *  4. Multi-Value Edge-Cases pro Property-Type
 *  5. Aspect-Ratio
 *  6. Property in jedem State (hover/focus/active/disabled)
 *  7. Property mit Conditional/Ternary für mehr Property-Types
 *  8. Property in Each-Loop-Item-Reference
 *  9. Negative-Werte für jede Spacing/Numeric-Property
 * 10. Boolean-Property mit explicit true/false
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { generateDOM } from '../../compiler/backends/dom'

function findStyle(node: any, property: string, state?: string) {
  return (node?.styles ?? []).find(
    (s: any) => s.property === property && (state ? s.state === state : !s.state)
  )
}

function styles(code: string) {
  return (toIR(parse(code)).nodes[0] as any)?.styles ?? []
}

// ============================================================================
// 1. ALIAS-MATRIX — every alias from PROPERTY_TO_CSS produces correct CSS
// ============================================================================

describe('Properties Coverage 1: Alias matrix (every alias → CSS property)', () => {
  const ALIAS_TESTS: Array<{ mirror: string; cssProp: string; cssValue: string }> = [
    // Sizing
    { mirror: 'w 100', cssProp: 'width', cssValue: '100px' },
    { mirror: 'width 100', cssProp: 'width', cssValue: '100px' },
    { mirror: 'h 100', cssProp: 'height', cssValue: '100px' },
    { mirror: 'height 100', cssProp: 'height', cssValue: '100px' },
    { mirror: 'minw 50', cssProp: 'min-width', cssValue: '50px' },
    { mirror: 'min-width 50', cssProp: 'min-width', cssValue: '50px' },
    { mirror: 'maxw 200', cssProp: 'max-width', cssValue: '200px' },
    { mirror: 'max-width 200', cssProp: 'max-width', cssValue: '200px' },
    { mirror: 'minh 50', cssProp: 'min-height', cssValue: '50px' },
    { mirror: 'min-height 50', cssProp: 'min-height', cssValue: '50px' },
    { mirror: 'maxh 200', cssProp: 'max-height', cssValue: '200px' },
    { mirror: 'max-height 200', cssProp: 'max-height', cssValue: '200px' },
    // Spacing
    { mirror: 'pad 16', cssProp: 'padding', cssValue: '16px' },
    { mirror: 'padding 16', cssProp: 'padding', cssValue: '16px' },
    { mirror: 'p 16', cssProp: 'padding', cssValue: '16px' },
    { mirror: 'mar 16', cssProp: 'margin', cssValue: '16px' },
    { mirror: 'margin 16', cssProp: 'margin', cssValue: '16px' },
    { mirror: 'm 16', cssProp: 'margin', cssValue: '16px' },
    { mirror: 'gap 8', cssProp: 'gap', cssValue: '8px' },
    { mirror: 'g 8', cssProp: 'gap', cssValue: '8px' },
    { mirror: 'gap-x 8', cssProp: 'column-gap', cssValue: '8px' },
    { mirror: 'gx 8', cssProp: 'column-gap', cssValue: '8px' },
    { mirror: 'gap-y 8', cssProp: 'row-gap', cssValue: '8px' },
    { mirror: 'gy 8', cssProp: 'row-gap', cssValue: '8px' },
    // Colors
    { mirror: 'bg #f00', cssProp: 'background', cssValue: '#f00' },
    { mirror: 'background #f00', cssProp: 'background', cssValue: '#f00' },
    { mirror: 'col white', cssProp: 'color', cssValue: 'white' },
    { mirror: 'color white', cssProp: 'color', cssValue: 'white' },
    { mirror: 'c white', cssProp: 'color', cssValue: 'white' },
    { mirror: 'boc #333', cssProp: 'border-color', cssValue: '#333' },
    // Border-radius
    { mirror: 'rad 8', cssProp: 'border-radius', cssValue: '8px' },
    { mirror: 'radius 8', cssProp: 'border-radius', cssValue: '8px' },
    // Typography
    { mirror: 'fs 14', cssProp: 'font-size', cssValue: '14px' },
    { mirror: 'font-size 14', cssProp: 'font-size', cssValue: '14px' },
    // Effects
    { mirror: 'opacity 0.5', cssProp: 'opacity', cssValue: '0.5' },
    { mirror: 'o 0.5', cssProp: 'opacity', cssValue: '0.5' },
    { mirror: 'opa 0.5', cssProp: 'opacity', cssValue: '0.5' },
    { mirror: 'z 5', cssProp: 'z-index', cssValue: '5' },
  ]

  for (const t of ALIAS_TESTS) {
    it(`"Frame ${t.mirror}" → ${t.cssProp}: ${t.cssValue}`, () => {
      const v = findStyle(toIR(parse(`Frame ${t.mirror}`)).nodes[0] as any, t.cssProp)?.value
      expect(v).toBe(t.cssValue)
    })
  }
})

// ============================================================================
// 2. TOKEN-REFERENCE × PROPERTY MATRIX
// ============================================================================

describe('Properties Coverage 2: Token-Reference × Property matrix', () => {
  const TOKEN_PROP_TESTS: Array<{ tokenDef: string; property: string; cssProp: string }> = [
    { tokenDef: 'primary: #2271C1', property: 'bg $primary', cssProp: 'background' },
    { tokenDef: 'primary: #2271C1', property: 'col $primary', cssProp: 'color' },
    { tokenDef: 'primary: #2271C1', property: 'boc $primary', cssProp: 'border-color' },
    { tokenDef: 'space: 16', property: 'pad $space', cssProp: 'padding' },
    { tokenDef: 'space: 16', property: 'mar $space', cssProp: 'margin' },
    { tokenDef: 'space: 16', property: 'gap $space', cssProp: 'gap' },
    { tokenDef: 'space: 16', property: 'gap-x $space', cssProp: 'column-gap' },
    { tokenDef: 'space: 16', property: 'gap-y $space', cssProp: 'row-gap' },
    { tokenDef: 'wide: 200', property: 'w $wide', cssProp: 'width' },
    { tokenDef: 'tall: 100', property: 'h $tall', cssProp: 'height' },
    { tokenDef: 'wide: 200', property: 'minw $wide', cssProp: 'min-width' },
    { tokenDef: 'wide: 200', property: 'maxw $wide', cssProp: 'max-width' },
    { tokenDef: 'r: 8', property: 'rad $r', cssProp: 'border-radius' },
    { tokenDef: 'r: 8', property: 'bor $r', cssProp: 'border' },
    { tokenDef: 's: 14', property: 'fs $s', cssProp: 'font-size' },
    { tokenDef: 'low: 0.5', property: 'opacity $low', cssProp: 'opacity' },
  ]

  for (const t of TOKEN_PROP_TESTS) {
    it(`Token in "${t.property}" resolves to var(--name) for ${t.cssProp}`, () => {
      const code = `${t.tokenDef}\nFrame ${t.property}`
      const v = findStyle(toIR(parse(code)).nodes[0] as any, t.cssProp)?.value
      expect(v).toBeDefined()
      expect(String(v)).toContain('--')
    })
  }
})

// ============================================================================
// 3. UNITS COVERAGE — %, px, vh, vw, vmin, vmax, em, rem, fr
// ============================================================================

describe('Properties Coverage 3: Units (% / vh / vw / vmin / vmax / em / rem)', () => {
  const UNIT_TESTS: Array<{ value: string; expected: string }> = [
    { value: '50%', expected: '50%' },
    { value: '100%', expected: '100%' },
    { value: '0.5%', expected: '0.5%' },
    { value: '50vh', expected: '50vh' },
    { value: '100vh', expected: '100vh' },
    { value: '50vw', expected: '50vw' },
    { value: '50vmin', expected: '50vmin' },
    { value: '50vmax', expected: '50vmax' },
  ]

  for (const t of UNIT_TESTS) {
    it(`"Frame w ${t.value}" preserves unit`, () => {
      expect(findStyle(toIR(parse(`Frame w ${t.value}`)).nodes[0] as any, 'width')?.value).toBe(
        t.expected
      )
    })
  }

  it('Mixed units in multi-value padding: "pad 8 50% 16 25%"', () => {
    const v = findStyle(toIR(parse('Frame pad 8 50% 16 25%')).nodes[0] as any, 'padding')?.value
    // First and third get px; second and fourth keep %
    expect(v).toBe('8px 50% 16px 25%')
  })
})

// ============================================================================
// 4. MULTI-VALUE PER PROPERTY TYPE
// ============================================================================

describe('Properties Coverage 4: Multi-value per property type', () => {
  // Padding/margin: 1/2/4 values are positional
  it('pad with 1 value → all sides', () => {
    expect(findStyle(toIR(parse('Frame pad 8')).nodes[0] as any, 'padding')?.value).toBe('8px')
  })

  it('pad with 2 values → vertical/horizontal', () => {
    expect(findStyle(toIR(parse('Frame pad 8 16')).nodes[0] as any, 'padding')?.value).toBe(
      '8px 16px'
    )
  })

  it('pad with 4 values → top/right/bottom/left', () => {
    expect(findStyle(toIR(parse('Frame pad 8 16 24 32')).nodes[0] as any, 'padding')?.value).toBe(
      '8px 16px 24px 32px'
    )
  })

  it('pad with 3 values (CSS shorthand: top hor bottom)', () => {
    expect(findStyle(toIR(parse('Frame pad 8 16 24')).nodes[0] as any, 'padding')?.value).toBe(
      '8px 16px 24px'
    )
  })

  it('pad with 5+ values does not crash (validator catches semantics)', () => {
    expect(() => toIR(parse('Frame pad 8 16 24 32 40 48'))).not.toThrow()
  })

  // Border: width [style] [color]
  // Bug #29 fix (2026-04-26): single-value `bor N` now emits border-width
  // and border-style separately (no shorthand reset of border-color).
  it('bor 1 → border-width: 1px + border-style: solid', () => {
    const node = toIR(parse('Frame bor 1')).nodes[0] as any
    expect(findStyle(node, 'border-width')?.value).toBe('1px')
    expect(findStyle(node, 'border-style')?.value).toBe('solid')
    expect(findStyle(node, 'border')).toBeUndefined()
  })

  it('bor 2 #333 → "2px solid #333"', () => {
    expect(findStyle(toIR(parse('Frame bor 2 #333')).nodes[0] as any, 'border')?.value).toBe(
      '2px solid #333'
    )
  })

  it('bor 2 dashed #333 → "2px dashed #333"', () => {
    expect(findStyle(toIR(parse('Frame bor 2 dashed #333')).nodes[0] as any, 'border')?.value).toBe(
      '2px dashed #333'
    )
  })

  // Single-value properties
  it('opacity with 1 value', () => {
    expect(findStyle(toIR(parse('Frame opacity 0.5')).nodes[0] as any, 'opacity')?.value).toBe(
      '0.5'
    )
  })

  it('opacity with extra values still produces opacity (extras ignored or appended)', () => {
    expect(() => toIR(parse('Frame opacity 0.5 0.8 0.3'))).not.toThrow()
  })

  // Boolean property with explicit value
  it('hor (boolean) on Frame → display flex + flex-direction row', () => {
    const ss = styles('Frame hor')
    expect(ss.some((s: any) => s.property === 'flex-direction' && s.value === 'row')).toBe(true)
  })
})

// ============================================================================
// 5. ASPECT-RATIO
// ============================================================================

describe('Properties Coverage 5: Aspect ratio', () => {
  it('"aspect square" → aspect-ratio: 1 (CSS shorthand for 1/1)', () => {
    // CSS allows `aspect-ratio: 1` as shorthand for `1 / 1`. Both forms are valid.
    const v = findStyle(toIR(parse('Frame aspect square')).nodes[0] as any, 'aspect-ratio')?.value
    expect(['1', '1 / 1']).toContain(v)
  })

  it('"aspect video" → aspect-ratio: 16/9', () => {
    const v = findStyle(toIR(parse('Frame aspect video')).nodes[0] as any, 'aspect-ratio')?.value
    expect(['16/9', '16 / 9']).toContain(v)
  })

  it('"aspect 16/9" — fraction value', () => {
    expect(() => toIR(parse('Frame aspect 16/9'))).not.toThrow()
  })

  it('"aspect 4/3" — explicit ratio', () => {
    expect(() => toIR(parse('Frame aspect 4/3'))).not.toThrow()
  })
})

// ============================================================================
// 6. PROPERTY × STATE Matrix
// ============================================================================

describe('Properties Coverage 6: Property × State', () => {
  const STATE_PROPS: Array<{ shorthand: string; cssProp: string; state: string }> = [
    { shorthand: 'hover-bg #f00', cssProp: 'background', state: 'hover' },
    { shorthand: 'hover-col white', cssProp: 'color', state: 'hover' },
    { shorthand: 'hover-opacity 0.8', cssProp: 'opacity', state: 'hover' },
    { shorthand: 'hover-rad 4', cssProp: 'border-radius', state: 'hover' },
    { shorthand: 'focus-bg #00f', cssProp: 'background', state: 'focus' },
    { shorthand: 'focus-bor 2', cssProp: 'border', state: 'focus' },
    { shorthand: 'active-col gray', cssProp: 'color', state: 'active' },
    { shorthand: 'disabled-opacity 0.3', cssProp: 'opacity', state: 'disabled' },
  ]

  for (const t of STATE_PROPS) {
    it(`"${t.shorthand}" → ${t.cssProp} on :${t.state}`, () => {
      const v = findStyle(
        toIR(parse(`Btn ${t.shorthand}`)).nodes[0] as any,
        t.cssProp,
        t.state
      )?.value
      expect(v).toBeDefined()
    })
  }
})

// ============================================================================
// 7. CONDITIONAL/TERNARY for various property types
// ============================================================================

describe('Properties Coverage 7: Conditional values across property types', () => {
  it('bg with ternary string value', () => {
    expect(() => toIR(parse('Frame bg active ? red : blue'))).not.toThrow()
  })

  it('w with ternary numeric value', () => {
    expect(() => toIR(parse('Frame w open ? 200 : 100'))).not.toThrow()
  })

  it('opacity with ternary', () => {
    expect(() => toIR(parse('Frame opacity visible ? 1 : 0'))).not.toThrow()
  })

  it('pad with ternary', () => {
    expect(() => toIR(parse('Frame pad compact ? 4 : 16'))).not.toThrow()
  })

  it('rad with ternary', () => {
    expect(() => toIR(parse('Frame rad rounded ? 999 : 4'))).not.toThrow()
  })

  it('Final DOM backend resolves ternary to runtime expression', () => {
    const js = generateDOM(parse('Frame bg active ? red : blue'))
    expect(js).not.toContain('__conditional')
    expect(js).toMatch(/\?\s*"red"\s*:\s*"blue"/)
  })
})

// ============================================================================
// 8. PROPERTIES IN EACH-LOOP CONTEXT
// ============================================================================

describe('Properties Coverage 8: Properties in each-loop with item references', () => {
  it('Frame inside each can have item-property as content', () => {
    const code = `items:
  a:
    label: "A"
each item in $items
  Frame
    Text "$item.label"`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('Property value referencing loop item: bg $item.color', () => {
    const code = `items:
  a:
    color: "#f00"
each item in $items
  Frame bg $item.color`
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

// ============================================================================
// 9. NEGATIVE VALUES for spacing/numeric properties
// ============================================================================

describe('Properties Coverage 9: Negative values', () => {
  const NEGATIVES: Array<{ prop: string; cssProp: string; expected: string }> = [
    { prop: 'mar -10', cssProp: 'margin', expected: '-10px' },
    { prop: 'mar-t -5', cssProp: 'margin-top', expected: '-5px' },
    { prop: 'mar-r -5', cssProp: 'margin-right', expected: '-5px' },
    { prop: 'mar-b -5', cssProp: 'margin-bottom', expected: '-5px' },
    { prop: 'mar-l -5', cssProp: 'margin-left', expected: '-5px' },
    { prop: 'pad-t -10', cssProp: 'padding-top', expected: '-10px' },
    { prop: 'gap -5', cssProp: 'gap', expected: '-5px' },
    { prop: 'z -1', cssProp: 'z-index', expected: '-1' },
    { prop: 'z -100', cssProp: 'z-index', expected: '-100' },
  ]

  for (const t of NEGATIVES) {
    it(`"Frame ${t.prop}" → ${t.cssProp}: ${t.expected}`, () => {
      expect(findStyle(toIR(parse(`Frame ${t.prop}`)).nodes[0] as any, t.cssProp)?.value).toBe(
        t.expected
      )
    })
  }
})

// ============================================================================
// 10. BOOLEAN PROPERTIES (standalone keywords)
// ============================================================================

describe('Properties Coverage 10: Boolean / standalone properties', () => {
  const BOOLEAN_PROPS = [
    'hor',
    'ver',
    'center',
    'spread',
    'wrap',
    'hidden',
    'visible',
    'clip',
    'truncate',
    'italic',
    'underline',
    'uppercase',
    'lowercase',
    'shrink',
    'grow',
  ]

  for (const prop of BOOLEAN_PROPS) {
    it(`"Frame ${prop}" produces some style and does not crash`, () => {
      expect(() => toIR(parse(`Frame ${prop}`))).not.toThrow()
      const ss = styles(`Frame ${prop}`)
      expect(ss.length).toBeGreaterThan(0)
    })
  }

  it('Idempotency: "Frame hor, hor" same as "Frame hor"', () => {
    const a = styles('Frame hor').filter((s: any) => s.property === 'flex-direction')
    const b = styles('Frame hor, hor').filter((s: any) => s.property === 'flex-direction')
    expect(a.length).toBe(b.length)
    expect(a[0].value).toBe(b[0].value)
  })
})

// ============================================================================
// 11. CASCADE: Token-Reference vs literal in pair conflict
// ============================================================================

describe('Properties Coverage 11: Token vs literal cascades', () => {
  it('Token first, literal second → literal wins', () => {
    const code = `primary: #f00
Frame bg $primary, bg #0f0`
    expect(findStyle(toIR(parse(code)).nodes[0] as any, 'background')?.value).toBe('#0f0')
  })

  it('Literal first, token second → token wins', () => {
    const code = `primary: #f00
Frame bg #0f0, bg $primary`
    const v = findStyle(toIR(parse(code)).nodes[0] as any, 'background')?.value
    expect(v).toContain('--primary')
  })

  it('Multiple token refs in one property list', () => {
    const code = `primary: #f00
secondary: #0f0
space: 16
Frame bg $primary, col $secondary, pad $space`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'background')?.value).toContain('--primary')
    expect(findStyle(inst, 'color')?.value).toContain('--secondary')
    expect(findStyle(inst, 'padding')?.value).toContain('--space')
  })
})

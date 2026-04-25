/**
 * Properties Deep Tests
 *
 * Aggressivere Bug-Hypothesen — Lücken aus dem ersten Property-Pass.
 * Fokus auf: directional aliases, schema-type-Konflikte, Conditional-Werte,
 * Computed-Expressions, Mixed-Token+Literal, State-Properties jenseits hover,
 * Cross-Property-Layout-Konflikte, Unknown-Properties, self-referential tokens.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { generateDOM } from '../../compiler/backends/dom'

function getStyles(code: string) {
  const ir = toIR(parse(code))
  return (ir.nodes[0] as any)?.styles ?? []
}

function findStyle(code: string, cssProperty: string, state?: string) {
  return getStyles(code).find(
    (s: any) => s.property === cssProperty && (state ? s.state === state : !s.state)
  )
}

// ============================================================================
// BUG D1: bor with separate direction-token loses color
// ============================================================================

describe('Properties Deep D1: bor-direction with space syntax loses color', () => {
  it('"Frame bor-t 1" produces "1px solid currentColor"', () => {
    const s = findStyle('Frame bor-t 1', 'border-top')
    expect(s?.value).toBe('1px solid currentColor')
  })

  it('"Frame border-top 1" produces "1px solid currentColor"', () => {
    const s = findStyle('Frame border-top 1', 'border-top')
    expect(s?.value).toBe('1px solid currentColor')
  })

  it('BUG: "Frame bor t 1" should also produce "1px solid currentColor"', () => {
    // Inconsistency: bor-t and border-top produce currentColor fallback,
    // but bor t (with space) produces only "1px solid" — invalid CSS.
    const s = findStyle('Frame bor t 1', 'border-top')
    expect(s?.value).toBe('1px solid currentColor')
  })
})

// ============================================================================
// BUG D2: Conditional/Ternary leaks internal marker string
// ============================================================================

describe('Properties Deep D2: Conditional value pipeline (IR marker → backend resolves)', () => {
  it('"Frame bg active ? red : blue" — IR contains __conditional marker (intentional)', () => {
    const s = findStyle('Frame bg active ? red : blue', 'background')
    // The IR uses "__conditional:cond?then:else" as an internal marker.
    // The backend (dom.ts node-emitter) recognises it and emits runtime ternary code.
    // This is documented pipeline behavior, not a bug.
    expect(String(s?.value)).toContain('__conditional:')
  })

  it('numeric conditional: "Frame w count > 0 ? 100 : 200" — same marker', () => {
    const s = findStyle('Frame w count > 0 ? 100 : 200', 'width')
    expect(String(s?.value)).toContain('__conditional:')
  })

  it('final DOM backend output resolves the marker to a runtime ternary', () => {
    // The marker MUST be gone by the time the backend emits JavaScript.
    const js = generateDOM(parse('Frame bg active ? red : blue'))
    expect(js).not.toContain('__conditional')
    // Should contain runtime ternary based on the condition
    expect(js).toMatch(/\?\s*"red"\s*:\s*"blue"/)
  })
})

// ============================================================================
// BUG D3: State-Properties only work for hover
// ============================================================================

describe('Properties Deep D3: state-property aliases beyond hover', () => {
  it('"Btn hover-bg #f00" produces background on :hover state', () => {
    const styles = getStyles('Btn hover-bg #f00')
    const s = styles.find((s: any) => s.property === 'background' && s.state === 'hover')
    expect(s?.value).toBe('#f00')
  })

  it('BUG: "Btn disabled-bg #f00" should produce background on :disabled state', () => {
    const styles = getStyles('Btn disabled-bg #f00')
    const s = styles.find((s: any) => s.property === 'background' && s.state === 'disabled')
    expect(s?.value).toBe('#f00')
  })

  it('BUG: "Btn focus-bor 2" should produce border on :focus state', () => {
    const styles = getStyles('Btn focus-bor 2')
    const s = styles.find((s: any) => s.property === 'border' && s.state === 'focus')
    expect(s?.value).toBeDefined()
  })

  it('BUG: "Btn active-col white" should produce color on :active state', () => {
    const styles = getStyles('Btn active-col white')
    const s = styles.find((s: any) => s.property === 'color' && s.state === 'active')
    expect(s?.value).toBe('white')
  })
})

// ============================================================================
// SCHEMA TYPE-CONFLICTS — documented (Validator's job)
// ============================================================================

describe('Properties Deep: Schema type conflicts (documented)', () => {
  it('limitation: "Frame pad #f00" passes color through as padding (invalid CSS)', () => {
    // Validator (Thema 18) is responsible for catching this.
    // Compiler currently passes the value through.
    const s = findStyle('Frame pad #f00', 'padding')
    expect(s?.value).toBe('#f00')
  })

  it('limitation: "Frame bg 5" passes number through as background', () => {
    const s = findStyle('Frame bg 5', 'background')
    expect(s?.value).toBe('5')
  })

  it('limitation: "Frame opacity \\"high\\"" passes string through', () => {
    const s = findStyle('Frame opacity "high"', 'opacity')
    expect(s?.value).toBe('high')
  })

  it('tolerance: "Frame w \\"100\\"" treats quoted number as number', () => {
    // Different from above — string-with-number gets px suffix.
    const s = findStyle('Frame w "100"', 'width')
    expect(s?.value).toBe('100px')
  })
})

// ============================================================================
// COMPUTED EXPRESSIONS — documented (no math evaluation in compiler)
// ============================================================================

describe('Properties Deep: Computed expressions (documented)', () => {
  it('limitation: "Frame w 100 + 50" emits raw "100 + 50" (no math evaluation)', () => {
    const s = findStyle('Frame w 100 + 50', 'width')
    // Documenting: compiler does NOT evaluate arithmetic. Either CSS calc()
    // wrapping would be desirable, or a validation error. Currently raw passthrough.
    expect(s?.value).toBe('100 + 50')
  })

  it('limitation: "Frame opacity 0.5 * 2" emits raw "0.5 * 2"', () => {
    const s = findStyle('Frame opacity 0.5 * 2', 'opacity')
    expect(s?.value).toBe('0.5 * 2')
  })
})

// ============================================================================
// LONE DOLLAR / SELF-REFERENTIAL TOKENS
// ============================================================================

describe('Properties Deep: Token reference edge cases', () => {
  it('limitation: lone "$" emits literal "$" as background value', () => {
    const s = findStyle('Frame bg $', 'background')
    expect(s?.value).toBe('$')
  })

  it('self-referential token "a: $a" does not crash, leaks literal "$a"', () => {
    const code = `a: $a
Frame bg $a`
    expect(() => toIR(parse(code))).not.toThrow()
    // Documenting current behavior: self-reference is not detected; the value
    // appears as "$a" literally rather than var(--a) or an error.
    const s = findStyle(code, 'background')
    expect(s?.value).toBeDefined()
  })

  it('mixed token + literal in multi-properties resolves both correctly', () => {
    const code = `space: 16
Frame pad $space, bg #f00`
    expect(findStyle(code, 'padding')?.value).toContain('--space')
    expect(findStyle(code, 'background')?.value).toBe('#f00')
  })
})

// ============================================================================
// CROSS-PROPERTY LAYOUT CONFLICTS
// ============================================================================
//
// hor, grid, stacked are competing layout systems. The schema treats them as
// independent properties — not as a single "layout type" enum — so conflicts
// silently coexist or one silently wins.

describe('Properties Deep: Cross-property layout conflicts', () => {
  it('"Frame hor, grid 12, stacked" — grid wins, hor is silently dropped', () => {
    const styles = getStyles('Frame hor, grid 12, stacked')
    // Documented: hor produces nothing here; grid sets template; stacked sets position.
    expect(styles.find((s: any) => s.property === 'grid-template-columns')).toBeDefined()
    expect(
      styles.find((s: any) => s.property === 'position' && s.value === 'relative')
    ).toBeDefined()
    expect(styles.find((s: any) => s.property === 'flex-direction')).toBeUndefined()
  })

  it('"Frame stacked, hor" — both apply (no conflict resolution)', () => {
    // Documented: stacked sets position relative; hor sets flex-direction row.
    // No conflict detection — both silently coexist even though stacked typically
    // expects absolute children rather than flex flow.
    const styles = getStyles('Frame stacked, hor')
    expect(
      styles.find((s: any) => s.property === 'position' && s.value === 'relative')
    ).toBeDefined()
    expect(
      styles.find((s: any) => s.property === 'flex-direction' && s.value === 'row')
    ).toBeDefined()
  })

  it('"Frame center, spread" — spread wins justify-content', () => {
    const styles = getStyles('Frame center, spread')
    const justify = styles.filter((s: any) => s.property === 'justify-content')
    // Last wins — 'spread' becomes space-between.
    expect(justify[justify.length - 1].value).toBe('space-between')
  })
})

// ============================================================================
// UNKNOWN PROPERTIES — silently ignored (no error from IR; Validator's job)
// ============================================================================

describe('Properties Deep: Unknown properties', () => {
  it('limitation: "Frame foobar 5" produces no styles, no error in IR layer', () => {
    const ir = toIR(parse('Frame foobar 5'))
    const styles = (ir.nodes[0] as any).styles ?? []
    const customStyles = styles.filter(
      (s: any) => !['display', 'flex-direction', 'align-self', 'align-items'].includes(s.property)
    )
    expect(customStyles.length).toBe(0)
  })

  it('limitation: "Frame xyz #f00" — same silent skip', () => {
    const ir = toIR(parse('Frame xyz #f00'))
    const styles = (ir.nodes[0] as any).styles ?? []
    const customStyles = styles.filter(
      (s: any) => !['display', 'flex-direction', 'align-self', 'align-items'].includes(s.property)
    )
    expect(customStyles.length).toBe(0)
  })
})

// ============================================================================
// DIRECTIONAL ALIASES — comprehensive sweep
// ============================================================================

describe('Properties Deep: Directional aliases comprehensive', () => {
  // Padding all 4 directions × 3 syntaxes
  const paddingDirs = [
    ['t', 'top'],
    ['r', 'right'],
    ['b', 'bottom'],
    ['l', 'left'],
  ]

  for (const [short, long] of paddingDirs) {
    it(`pad-${short} 10 → padding-${long}`, () => {
      expect(findStyle(`Frame pad-${short} 10`, `padding-${long}`)?.value).toBe('10px')
    })
    it(`p${short} 10 → padding-${long}`, () => {
      expect(findStyle(`Frame p${short} 10`, `padding-${long}`)?.value).toBe('10px')
    })
    it(`pad ${long} 10 → padding-${long}`, () => {
      expect(findStyle(`Frame pad ${long} 10`, `padding-${long}`)?.value).toBe('10px')
    })
  }

  // pad-x / pad-y → -left+-right / -top+-bottom
  it('pad-x 16 → padding-left + padding-right', () => {
    expect(findStyle('Frame pad-x 16', 'padding-left')?.value).toBe('16px')
    expect(findStyle('Frame pad-x 16', 'padding-right')?.value).toBe('16px')
  })

  it('pad-y 8 → padding-top + padding-bottom', () => {
    expect(findStyle('Frame pad-y 8', 'padding-top')?.value).toBe('8px')
    expect(findStyle('Frame pad-y 8', 'padding-bottom')?.value).toBe('8px')
  })

  // Margin equivalents
  it('mar-t 5 / mt 5 / margin top 5 are equivalent', () => {
    const a = findStyle('Frame mar-t 5', 'margin-top')?.value
    const b = findStyle('Frame mt 5', 'margin-top')?.value
    const c = findStyle('Frame margin top 5', 'margin-top')?.value
    expect(a).toBe('5px')
    expect(b).toBe('5px')
    expect(c).toBe('5px')
  })

  // Border directions
  it('bor-l 2 → border-left "2px solid currentColor"', () => {
    expect(findStyle('Frame bor-l 2', 'border-left')?.value).toBe('2px solid currentColor')
  })
})

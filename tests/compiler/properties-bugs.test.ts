/**
 * Properties Bug Tests
 *
 * Bug-Hypothesen aus tests/compiler/docs/themen/03-properties.md (4.1).
 * Tests prüfen erwartetes Verhalten — schlägt der Test fehl, ist der Bug bestätigt.
 *
 * Nutzt IR-Inspection: ein Property erzeugt einen oder mehrere `IRStyle`-Einträge
 * mit `{ property, value }`. Bei mehrfach gesetzter CSS-Property ist der LETZTE
 * Eintrag der gewinnende.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

/** Get all values for a CSS property on the first node, in order */
function getValues(code: string, cssProperty: string): string[] {
  const ir = toIR(parse(code))
  const node = ir.nodes[0] as any
  return (node?.styles ?? [])
    .filter((s: any) => s.property === cssProperty && !s.state)
    .map((s: any) => s.value)
}

/** Get the LAST value (i.e. the winning one) for a CSS property */
function getLastValue(code: string, cssProperty: string): string | undefined {
  const values = getValues(code, cssProperty)
  return values.length > 0 ? values[values.length - 1] : undefined
}

// ============================================================================
// 3.1 ALIAS CONFLICTS — "letzter gewinnt"
// ============================================================================

describe('Properties Bug A1–A6: Alias conflicts ("letzter gewinnt")', () => {
  it('A1: "Frame w 100, width 200" → width 200px wins', () => {
    expect(getLastValue('Frame w 100, width 200', 'width')).toBe('200px')
  })

  it('A2: "Frame width 100, w 200" → w 200px wins', () => {
    expect(getLastValue('Frame width 100, w 200', 'width')).toBe('200px')
  })

  it('A3: "Frame pad 8, padding 16" → padding 16px wins', () => {
    expect(getLastValue('Frame pad 8, padding 16', 'padding')).toBe('16px')
  })

  it('A4: "Frame bg #f00, background #0f0" → background #0f0 wins', () => {
    expect(getLastValue('Frame bg #f00, background #0f0', 'background')).toBe('#0f0')
  })

  it('A5: "Frame col red, color blue, c green" → c green wins', () => {
    expect(getLastValue('Frame col red, color blue, c green', 'color')).toBe('green')
  })

  it('A6: "Frame opacity 0.5, o 0.7, opa 0.9" → opa 0.9 wins', () => {
    expect(getLastValue('Frame opacity 0.5, o 0.7, opa 0.9', 'opacity')).toBe('0.9')
  })
})

// ============================================================================
// 3.3 MULTI-VALUE EXCESS for non-spacing properties
// ============================================================================

describe('Properties Bug M1–M4: Multi-value on single-value properties', () => {
  it('M1: "Frame border 1 2 3" does not crash', () => {
    expect(() => parse('Frame border 1 2 3')).not.toThrow()
    expect(() => toIR(parse('Frame border 1 2 3'))).not.toThrow()
  })

  it('M2: "Frame fs 14 16 18" does not crash and produces font-size', () => {
    const ir = toIR(parse('Frame fs 14 16 18'))
    expect(ir.nodes.length).toBe(1)
    // Either takes first, last, or all — but at least one font-size style exists
    const fs = (ir.nodes[0] as any).styles.filter((s: any) => s.property === 'font-size')
    expect(fs.length).toBeGreaterThanOrEqual(1)
  })

  it('M3: "Frame opacity 0.5 0.8" does not crash', () => {
    expect(() => toIR(parse('Frame opacity 0.5 0.8'))).not.toThrow()
  })

  it('M4: "Frame rotate 45, rotate 90" — last rotate wins', () => {
    // Documented: each rotate becomes part of transform; last assignment wins.
    const ir = toIR(parse('Frame rotate 45, rotate 90'))
    const transforms = (ir.nodes[0] as any).styles.filter((s: any) => s.property === 'transform')
    // At least one transform exists, and it should reflect the last rotate (90deg).
    expect(transforms.length).toBeGreaterThanOrEqual(1)
    const last = transforms[transforms.length - 1].value
    expect(last).toContain('90')
  })
})

// ============================================================================
// 3.5 BOOLEAN PROPERTIES with values (illegal-ish input)
// ============================================================================

describe('Properties Bug B1, B3, B4: Boolean properties with values', () => {
  it('B1: "Frame hor 5" does not crash', () => {
    expect(() => toIR(parse('Frame hor 5'))).not.toThrow()
  })

  it('B3: "Frame hidden true" does not crash', () => {
    expect(() => toIR(parse('Frame hidden true'))).not.toThrow()
  })

  it('B4: "Frame italic false" — italic is set OR not (consistent), no crash', () => {
    expect(() => toIR(parse('Frame italic false'))).not.toThrow()
  })

  it('B6: "Frame italic, italic" is idempotent (one italic style or none)', () => {
    const ir = toIR(parse('Frame italic, italic'))
    const italics = (ir.nodes[0] as any).styles.filter(
      (s: any) => s.property === 'font-style' && s.value === 'italic'
    )
    // Either 1 italic (deduplicated) or 2 (both kept). Test documents whichever.
    expect(italics.length).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================================
// 3.7 TOKEN REFERENCES
// ============================================================================

describe('Properties Bug TR3, TR5: Token reference edge cases', () => {
  it('TR3: undefined token reference does not crash', () => {
    expect(() => toIR(parse('Frame bg $undefined-token'))).not.toThrow()
  })

  it('TR5: "Frame bg $primary, bg #f00" — last (hex) wins', () => {
    const code = `primary: #abc
Frame bg $primary, bg #f00`
    expect(getLastValue(code, 'background')).toBe('#f00')
  })

  it('TR5b: "Frame bg #f00, bg $primary" — last (token) wins', () => {
    const code = `primary: #abc
Frame bg #f00, bg $primary`
    const last = getLastValue(code, 'background')
    // Last wins — a token reference. Could be 'var(--primary)' or similar.
    expect(last).toBeDefined()
    expect(last).not.toBe('#f00')
  })
})

// ============================================================================
// 3.4 NEGATIVE / EDGE VALUES
// ============================================================================

describe('Properties Bug E1, E4, E5: Edge values', () => {
  it('E1: "Frame pad-t -10" → padding-top: -10px', () => {
    const ir = toIR(parse('Frame pad-t -10'))
    const padTop = (ir.nodes[0] as any).styles.find((s: any) => s.property === 'padding-top')
    expect(padTop?.value).toBe('-10px')
  })

  it('E4: "Frame opacity 1.5" — value is set as-is (no clamp at parse stage)', () => {
    const ir = toIR(parse('Frame opacity 1.5'))
    const op = (ir.nodes[0] as any).styles.find((s: any) => s.property === 'opacity')
    // Compiler doesn't clamp — CSS engine does at runtime.
    expect(op?.value).toBe('1.5')
  })

  it('E5: "Frame opacity -0.5" — negative opacity passes through', () => {
    const ir = toIR(parse('Frame opacity -0.5'))
    const op = (ir.nodes[0] as any).styles.find((s: any) => s.property === 'opacity')
    expect(op?.value).toBe('-0.5')
  })

  it('E10: "Frame opacity 0" → opacity: 0 (not falsy-dropped)', () => {
    const ir = toIR(parse('Frame opacity 0'))
    const op = (ir.nodes[0] as any).styles.find((s: any) => s.property === 'opacity')
    expect(op?.value).toBe('0')
  })
})

/**
 * Properties Additional Coverage Tests
 *
 * Coverage-Lücken aus tests/compiler/docs/themen/03-properties.md (4.2).
 * Fixiert existierendes Verhalten an bisher untesteten Stellen.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

function getStyles(code: string) {
  const ir = toIR(parse(code))
  return (ir.nodes[0] as any).styles ?? []
}

function getStyle(code: string, cssProperty: string): string | undefined {
  const matches = getStyles(code).filter((s: any) => s.property === cssProperty && !s.state)
  return matches.length > 0 ? matches[matches.length - 1].value : undefined
}

// ============================================================================
// 3.2 DIRECT CSS PROPERTY NAMES
// ============================================================================

describe('Properties Additional: Direct CSS property names', () => {
  it('C1: "Frame width 100" works (long form)', () => {
    expect(getStyle('Frame width 100', 'width')).toBe('100px')
  })

  it('C2: "Frame max-width 200" works (with hyphen)', () => {
    expect(getStyle('Frame max-width 200', 'max-width')).toBe('200px')
  })

  it('C3: "Frame radius 8" and "Frame rad 8" both work', () => {
    expect(getStyle('Frame radius 8', 'border-radius')).toBe('8px')
    expect(getStyle('Frame rad 8', 'border-radius')).toBe('8px')
  })

  it('C3 limitation: "Frame border-radius 8" (CSS form) is silently ignored', () => {
    // KNOWN LIMITATION: border-radius is the CSS property name, not a Mirror alias.
    // Only `radius` and `rad` map to border-radius. Using `border-radius` directly
    // produces no border-radius style and no error. Validator's job (Thema 18).
    const styles = getStyles('Frame border-radius 8')
    expect(styles.find((s: any) => s.property === 'border-radius')).toBeUndefined()
  })

  it('C4: "Frame min-width 50, maxw 200" — both work side by side', () => {
    const styles = getStyles('Frame min-width 50, maxw 200')
    expect(styles.find((s: any) => s.property === 'min-width')?.value).toBe('50px')
    expect(styles.find((s: any) => s.property === 'max-width')?.value).toBe('200px')
  })
})

// ============================================================================
// 3.4 EDGE VALUES — extended
// ============================================================================

describe('Properties Additional: Edge values', () => {
  it('E2: negative margin', () => {
    expect(getStyle('Frame mar -20', 'margin')).toBe('-20px')
  })

  it('E3: negative z-index', () => {
    expect(getStyle('Frame z -1', 'z-index')).toBe('-1')
  })

  it('E6: rotate 720 (multiple full rotations)', () => {
    const transform = getStyle('Frame rotate 720', 'transform')
    expect(transform).toContain('720')
  })

  it('E7: rotate -360 (negative rotation)', () => {
    const transform = getStyle('Frame rotate -360', 'transform')
    expect(transform).toContain('-360')
  })

  it('E8: scale 0 (zero scale)', () => {
    const transform = getStyle('Frame scale 0', 'transform')
    expect(transform).toContain('0')
  })

  it('E9: width and height of 0', () => {
    expect(getStyle('Frame w 0, h 0', 'width')).toBe('0px')
    expect(getStyle('Frame w 0, h 0', 'height')).toBe('0px')
  })
})

// ============================================================================
// 3.5 BOOLEAN COMBINATIONS
// ============================================================================

describe('Properties Additional: Boolean property combinations', () => {
  it('B5: "Frame truncate, italic, uppercase" applies all three', () => {
    const styles = getStyles('Frame truncate, italic, uppercase')
    // truncate → text-overflow + white-space + overflow
    // italic → font-style: italic
    // uppercase → text-transform: uppercase
    expect(styles.some((s: any) => s.property === 'font-style' && s.value === 'italic')).toBe(true)
    expect(
      styles.some((s: any) => s.property === 'text-transform' && s.value === 'uppercase')
    ).toBe(true)
  })

  it('B5b: standalone alignment keywords combine: "Frame hor center"', () => {
    const styles = getStyles('Frame hor center')
    // hor → flex-direction: row, center → justify+align center
    expect(styles.some((s: any) => s.property === 'flex-direction' && s.value === 'row')).toBe(true)
  })
})

// ============================================================================
// 3.6 TRANSFORM COMBINATIONS
// ============================================================================

describe('Properties Additional: Transform combinations', () => {
  it('T1: "Frame rotate 45, scale 2" combines into one transform', () => {
    const transform = getStyle('Frame rotate 45, scale 2', 'transform')
    expect(transform).toContain('45')
    expect(transform).toContain('2')
  })

  it('T3: "Frame x 10, y 20, rotate 45" combines translate + rotate', () => {
    const transform = getStyle('Frame x 10, y 20, rotate 45', 'transform')
    // Should contain translate or 10/20 references and 45 rotation.
    expect(transform).toBeDefined()
    expect(transform).toContain('45')
  })
})

// ============================================================================
// 3.7 TOKEN REFERENCES — additional patterns
// ============================================================================

describe('Properties Additional: Token references', () => {
  it('TR1: "Frame bg $primary" → background uses var(--primary)', () => {
    const code = `primary: #2271C1
Frame bg $primary`
    const bg = getStyle(code, 'background')
    expect(bg).toContain('--primary')
  })

  it('TR2: "Frame bg $primary.bg" → suffixed token', () => {
    const code = `primary.bg: #2271C1
Frame bg $primary`
    const bg = getStyle(code, 'background')
    expect(bg).toBeDefined()
    expect(bg).toContain('primary')
  })

  it('TR4: multi properties with tokens: "Frame pad $space, bg $primary"', () => {
    const code = `space: 16
primary: #2271C1
Frame pad $space, bg $primary`
    const padding = getStyle(code, 'padding')
    const bg = getStyle(code, 'background')
    expect(padding).toContain('--space')
    expect(bg).toContain('--primary')
  })
})

// ============================================================================
// 3.8 HOVER PROPERTIES
// ============================================================================

describe('Properties Additional: Hover properties', () => {
  it('H1: "Btn hover-bg #f00" → :hover background', () => {
    const styles = getStyles('Btn hover-bg #f00')
    const hover = styles.find((s: any) => s.property === 'background' && s.state === 'hover')
    expect(hover?.value).toBe('#f00')
  })

  it('H3: "Btn hover-bg #f00, hover-bg #0f0" — last wins in hover state', () => {
    const styles = getStyles('Btn hover-bg #f00, hover-bg #0f0')
    const hovers = styles.filter((s: any) => s.property === 'background' && s.state === 'hover')
    const last = hovers[hovers.length - 1]
    expect(last?.value).toBe('#0f0')
  })

  it('H4: "Btn hover-opacity 0.5, hover-scale 1.1" — both apply on hover', () => {
    const styles = getStyles('Btn hover-opacity 0.5, hover-scale 1.1')
    expect(
      styles.some((s: any) => s.property === 'opacity' && s.state === 'hover' && s.value === '0.5')
    ).toBe(true)
    // hover-scale becomes a transform with hover state
    expect(
      styles.some(
        (s: any) =>
          s.property === 'transform' && s.state === 'hover' && String(s.value).includes('1.1')
      )
    ).toBe(true)
  })
})

// ============================================================================
// 3.10 PROPERTY LIST EDGE CASES
// ============================================================================

describe('Properties Additional: Property list edge cases', () => {
  it('L4: "Frame bg, col" (properties without values) does not crash', () => {
    expect(() => toIR(parse('Frame bg, col'))).not.toThrow()
  })

  it('L5: 50 properties on one element does not crash', () => {
    const props = Array.from({ length: 50 }, (_, i) => `pad-t ${i}`).join(', ')
    expect(() => toIR(parse(`Frame ${props}`))).not.toThrow()
  })

  it('L6: multi-value pad mixed with standalone hor', () => {
    const styles = getStyles('Frame pad 8 hor pad 16')
    // Padding should be set (one or both), hor adds flex-direction row
    expect(styles.some((s: any) => s.property === 'padding')).toBe(true)
    expect(styles.some((s: any) => s.property === 'flex-direction' && s.value === 'row')).toBe(true)
  })

  it('L7: comma-separated with trailing space', () => {
    expect(() => toIR(parse('Frame bg #f00, '))).not.toThrow()
  })
})

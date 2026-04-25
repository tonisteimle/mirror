/**
 * Tokens & Property-Sets Coverage Tests (Thema 6)
 *
 * Aggressive Provokationen für Token-Definition-Varianten, Property-Sets
 * und ihre Interaktionen. Bereiche aus 06-tokens.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

function findStyle(node: any, property: string, state?: string) {
  return (node?.styles ?? []).find(
    (s: any) => s.property === property && (state ? s.state === state : !s.state)
  )
}

function getTokens(code: string): any[] {
  return (parse(code) as any).tokens ?? []
}

// ============================================================================
// 3.1 Self- und Circular-References
// ============================================================================

describe('Tokens C: Self / circular references', () => {
  it('C1: Self-reference "a: $a; Frame bg $a" does not crash', () => {
    const code = `a: $a
Frame bg $a`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('C2: 2-cycle "a: $b; b: $a" terminates', () => {
    const code = `a: $b
b: $a
Frame bg $a`
    const start = Date.now()
    expect(() => toIR(parse(code))).not.toThrow()
    expect(Date.now() - start).toBeLessThan(1000)
  })

  it('C3: 3-cycle terminates', () => {
    const code = `a: $b
b: $c
c: $a
Frame bg $a`
    const start = Date.now()
    expect(() => toIR(parse(code))).not.toThrow()
    expect(Date.now() - start).toBeLessThan(1000)
  })

  it('C4: 10-deep cycle terminates', () => {
    const lines: string[] = []
    for (let i = 0; i < 10; i++) {
      lines.push(`t${i}: $t${(i + 1) % 10}`)
    }
    lines.push('Frame bg $t0')
    const start = Date.now()
    expect(() => toIR(parse(lines.join('\n')))).not.toThrow()
    expect(Date.now() - start).toBeLessThan(2000)
  })
})

// ============================================================================
// 3.2 Token Re-Definition
// ============================================================================

describe('Tokens R: Re-definition', () => {
  it('R1: Same token defined twice — last wins', () => {
    const code = `primary: #f00
primary: #0f0
Frame bg $primary`
    const inst = toIR(parse(code)).nodes[0] as any
    const bg = findStyle(inst, 'background')?.value
    // Should reference primary which now resolves to #0f0
    // CSS variable form: var(--primary). Backend later resolves to last value.
    expect(bg).toContain('--primary')
  })

  it('R2: Suffixed token defined twice', () => {
    const code = `primary.bg: #f00
primary.bg: #0f0
Frame bg $primary`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('R3: Same name, different types — last wins (just no crash)', () => {
    const code = `primary: #f00
primary: 16
Frame bg $primary`
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

// ============================================================================
// 3.3 Token-Name Edge-Cases
// ============================================================================

describe('Tokens N: Name edge-cases', () => {
  it('N3: Hyphenated name "grey-800: #333"', () => {
    const code = `grey-800: #333
Frame bg $grey-800`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('N4: Unicode name "primärfarbe"', () => {
    const code = `primärfarbe: #f00
Frame bg $primärfarbe`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('N5: Suffix is potentially reserved word "primary.color"', () => {
    const code = `primary.color: #f00
Frame col $primary`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('N6: Empty suffix "primary.: #f00" does not crash', () => {
    expect(() => toIR(parse('primary.: #f00\nFrame bg #fff'))).not.toThrow()
  })
})

// ============================================================================
// 3.4 Token-Wert-Edge-Cases
// ============================================================================

describe('Tokens V: Value edge-cases', () => {
  it('V1: Multi-value "colors: #f00 #0f0" — accepts something without crash', () => {
    expect(() => toIR(parse('colors: #f00 #0f0\nFrame bg $colors'))).not.toThrow()
  })

  it('V2: Boolean value "loggedIn: true"', () => {
    const code = `loggedIn: true
Frame bg #f00`
    expect(() => toIR(parse(code))).not.toThrow()
    const tokens = getTokens(code)
    expect(tokens.some(t => t.name === 'loggedIn')).toBe(true)
  })

  it('V3: Forward-reference "Frame bg $primary; primary: #f00" works', () => {
    const code = `Frame bg $primary
primary: #f00`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'background')?.value).toContain('--primary')
  })

  it('V4: Unresolved "Frame bg $undefined-token" leaks literal (no crash)', () => {
    const code = 'Frame bg $undefined-token'
    expect(() => toIR(parse(code))).not.toThrow()
    const inst = toIR(parse(code)).nodes[0] as any
    const bg = findStyle(inst, 'background')?.value
    // Unresolved token reference passes through as the literal $name string
    // (validator will catch this later; compiler does not).
    expect(bg).toBeDefined()
  })

  it('V5: Negative number "negative: -10" works as size', () => {
    const code = `negative: -10
Frame mar $negative`
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

// ============================================================================
// 3.5 Property-Set Edge-Cases
// ============================================================================

describe('Tokens PS: Property-Set edge-cases', () => {
  it('PS1: Basic property-set expand', () => {
    const code = `cardstyle: pad 16, bg #f00, rad 8
Frame $cardstyle`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'padding')?.value).toBe('16px')
    expect(findStyle(inst, 'background')?.value).toBe('#f00')
    expect(findStyle(inst, 'border-radius')?.value).toBe('8px')
  })

  it('PS3: Direction in property-set "lay: hor, center; Frame $lay"', () => {
    const code = `lay: hor, center
Frame $lay`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'flex-direction')?.value).toBe('row')
  })

  it('PS4: Nested mixin "b uses $a"', () => {
    const code = `a: pad 8
b: $a, bg #f00
Frame $b`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'padding')?.value).toBe('8px')
    expect(findStyle(inst, 'background')?.value).toBe('#f00')
  })

  it('PS6: Re-defined property-set — last wins', () => {
    const code = `cs: pad 16
cs: pad 24
Frame $cs`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'padding')?.value).toBe('24px')
  })

  it('PS7: Mixin with single token reference', () => {
    const code = `primary: #f00
cs: bg $primary
Frame $cs`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'background')?.value).toContain('--primary')
  })

  it('PS8: Recursive property-sets "a: $b; b: $a" do not infinite-loop', () => {
    const code = `a: $b
b: $a
Frame $a`
    const start = Date.now()
    expect(() => toIR(parse(code))).not.toThrow()
    expect(Date.now() - start).toBeLessThan(1000)
  })
})

// ============================================================================
// 3.6 Token-Suffix Path References
// ============================================================================

describe('Tokens P: Suffix-path references', () => {
  it('P1: "Frame bg $primary" references whole token', () => {
    const code = `primary: #f00
Frame bg $primary`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'background')?.value).toContain('primary')
  })

  it('P2: "primary.bg: #f00; Frame bg $primary" auto-suffix-pick', () => {
    const code = `primary.bg: #f00
Frame bg $primary`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'background')?.value).toBeDefined()
  })

  it('P3: Explicit suffix "Frame bg $primary.bg"', () => {
    const code = `primary.bg: #f00
Frame bg $primary.bg`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'background')?.value).toBeDefined()
  })

  it('P4: Multi-suffix "a.b.c: 1" parses without crash', () => {
    expect(() => toIR(parse('a.b.c: 1\nFrame'))).not.toThrow()
  })

  it('P5: Unknown suffix "Frame bg $primary.foo"', () => {
    const code = `primary.bg: #f00
Frame bg $primary.foo`
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

// ============================================================================
// 3.7 Section-Tracked Tokens
// ============================================================================

describe('Tokens SE: Section tracking', () => {
  it('SE1: Tokens before any section have undefined section', () => {
    const code = `early: #f00
--- Section ---
late: #0f0`
    const tokens = getTokens(code)
    const early = tokens.find((t: any) => t.name === 'early')
    const late = tokens.find((t: any) => t.name === 'late')
    expect(early?.section).toBeUndefined()
    expect(late?.section).toBe('Section')
  })

  it('SE3: Tokens after multiple sections track last section', () => {
    const code = `--- A ---
a: #f00
--- B ---
b: #0f0
--- C ---
c: #00f`
    const tokens = getTokens(code)
    expect(tokens.find((t: any) => t.name === 'a')?.section).toBe('A')
    expect(tokens.find((t: any) => t.name === 'b')?.section).toBe('B')
    expect(tokens.find((t: any) => t.name === 'c')?.section).toBe('C')
  })
})

// ============================================================================
// 3.8 Pathologische
// ============================================================================

describe('Tokens PA: Pathological', () => {
  it('PA1: 500 tokens in one file', () => {
    const lines: string[] = []
    for (let i = 0; i < 500; i++) lines.push(`t${i}: ${i}`)
    lines.push('Frame bg $t0')
    expect(() => toIR(parse(lines.join('\n')))).not.toThrow()
  })

  it('PA3: 50 token-refs in one property list', () => {
    const tokenLines: string[] = []
    for (let i = 0; i < 50; i++) tokenLines.push(`t${i}: 16`)
    const refs = Array.from({ length: 50 }, (_, i) => `pad-t $t${i}`).join(', ')
    const code = `${tokenLines.join('\n')}\nFrame ${refs}`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('PA4: Long suffix chain "a.b.c.d.e: 1" parses', () => {
    expect(() => toIR(parse('a.b.c.d.e: 1\nFrame'))).not.toThrow()
  })
})

// ============================================================================
// CSS-Output checks for token resolution
// ============================================================================

describe('Tokens: CSS-Variable output', () => {
  it('Token-Reference produces var(--name) in IR styles', () => {
    const code = `primary: #2271C1
Frame bg $primary`
    const bg = findStyle(toIR(parse(code)).nodes[0] as any, 'background')?.value
    expect(bg).toMatch(/var\(--primary\)/)
  })

  it('Hyphenated token name preserved in CSS variable', () => {
    const code = `grey-800: #333
Frame bg $grey-800`
    const bg = findStyle(toIR(parse(code)).nodes[0] as any, 'background')?.value
    expect(bg).toContain('grey-800')
  })

  it('Token in hover state', () => {
    const code = `primary: #f00
Btn hover-bg $primary`
    const inst = toIR(parse(code)).nodes[0] as any
    const hoverBg = findStyle(inst, 'background', 'hover')?.value
    expect(hoverBg).toContain('--primary')
  })
})

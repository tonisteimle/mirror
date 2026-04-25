/**
 * Inheritance Bug Tests
 *
 * Aggressive Bug-Hypothesen für Komponenten-Vererbung — Thema 5 Bug-Hunting.
 * Echte Erwartungen, keine reinen Smoke-Tests.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

function findStyle(node: any, property: string, state?: string) {
  return (node?.styles ?? []).find(
    (s: any) => s.property === property && (state ? s.state === state : !s.state)
  )
}

// ============================================================================
// C1–C6: Cycle Detection
// ============================================================================

describe('Inheritance Bug C: Cycle detection', () => {
  it('C1: "Btn as Btn:" (self-inheritance via primitive) does not crash', () => {
    expect(() => toIR(parse('Btn as Btn:\n  pad 12'))).not.toThrow()
  })

  it('C1b: "Btn as Btn" terminates (does not infinite-loop)', () => {
    const start = Date.now()
    toIR(parse('Btn as Btn:\n  pad 12\nBtn'))
    expect(Date.now() - start).toBeLessThan(1000)
  })

  it('C2: "Btn extends Btn:" does not crash', () => {
    expect(() => toIR(parse('Btn extends Btn:\n  pad 12'))).not.toThrow()
  })

  it('C3: 2-cycle "A as B; B as A" does not infinite-loop', () => {
    const code = `A as B:
  pad 8
B as A:
  bg #f00`
    const start = Date.now()
    expect(() => toIR(parse(code))).not.toThrow()
    expect(Date.now() - start).toBeLessThan(1000)
  })

  it('C4: 3-cycle "A as B; B as C; C as A" does not infinite-loop', () => {
    const code = `A as B:
  pad 8
B as C:
  bg #f00
C as A:
  rad 4`
    const start = Date.now()
    expect(() => toIR(parse(code))).not.toThrow()
    expect(Date.now() - start).toBeLessThan(1000)
  })

  it('C5: 10-deep cycle terminates', () => {
    const lines: string[] = []
    for (let i = 0; i < 10; i++) {
      const next = (i + 1) % 10
      lines.push(`C${i} as C${next}:`)
      lines.push(`  pad ${i}`)
    }
    const start = Date.now()
    expect(() => toIR(parse(lines.join('\n')))).not.toThrow()
    expect(Date.now() - start).toBeLessThan(2000)
  })

  it('C6: extends non-existent parent does not crash', () => {
    const code = `Btn extends NonExistentBase:
  pad 12
Btn`
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

// ============================================================================
// E1, E3, E4: Events Inheritance — kein Dedup vermutet
// ============================================================================

describe('Inheritance Bug E: Events concatenation', () => {
  it('E1: Parent onclick A + Child onclick B → BOTH click events present (no dedup)', () => {
    const code = `Base as Button:
  onclick toggle()
Btn as Base:
  onclick toast("hi")
Btn`
    const ir = toIR(parse(code))
    const inst = ir.nodes[0] as any
    const events = inst.events ?? []
    // Events are stored under their DOM name in IR (click, not onclick).
    const clickEvents = events.filter((e: any) => e.name === 'click')
    // Documented: events are concatenated without dedup. Both clicks present.
    expect(clickEvents.length).toBe(2)
  })

  it('E2: Parent onclick + Child onkeydown → both events present (under click + keydown)', () => {
    const code = `Base as Button:
  onclick toggle()
Btn as Base:
  onkeydown enter: submit()
Btn`
    const ir = toIR(parse(code))
    const inst = ir.nodes[0] as any
    const events = inst.events ?? []
    expect(events.some((e: any) => e.name === 'click')).toBe(true)
    expect(events.some((e: any) => e.name === 'keydown')).toBe(true)
  })

  it('E4: Known limitation — comma-actions in Component-Body parse asymmetrically', () => {
    // KNOWN PARSER BUG: in Component-Body, `onclick X, Y` parses Y as a child
    // instance, not a second click event (unlike Instance-Body where comma splits
    // into two events per Thema 2). Workaround: use separate lines per event.
    //
    // Until the parser is fixed, this test documents the actual behavior.
    const code = `Base as Button:
  onclick toggle(), toast("p")
Btn as Base:
  onclick show(X)
Btn`
    const ir = toIR(parse(code))
    const inst = ir.nodes[0] as any
    const clickEvents = (inst.events ?? []).filter((e: any) => e.name === 'click')
    // Current: parent yields 1 click (toggle); toast becomes a child instance.
    // Child adds 1 click (show). Total: 2 clicks at instance level.
    expect(clickEvents.length).toBe(2)
  })

  it('E4b (workaround): separate lines for multi-action events in Component-Body works', () => {
    const code = `Base as Button:
  onclick toggle()
  onclick toast("p")
Btn as Base:
  onclick show(X)
Btn`
    const ir = toIR(parse(code))
    const inst = ir.nodes[0] as any
    const clickEvents = (inst.events ?? []).filter((e: any) => e.name === 'click')
    expect(clickEvents.length).toBe(3)
  })
})

// ============================================================================
// F1, F2: Forward Reference
// ============================================================================

describe('Inheritance Bug F: Forward reference', () => {
  it('F1: Instance "Btn" before "Btn as Button:" definition → works', () => {
    const code = `Btn
Btn as Button:
  pad 12`
    expect(() => toIR(parse(code))).not.toThrow()
    const ir = toIR(parse(code))
    const inst = ir.nodes[0] as any
    // Should resolve the component despite forward reference (parser collects defs before resolve)
    expect(inst).toBeDefined()
  })

  it('F2: Component using forward-declared base ("A as B; B defined later")', () => {
    const code = `A as B:
  pad 4
B as Button:
  bg #f00
A`
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

// ============================================================================
// N1, N2: Naming Conflicts
// ============================================================================

describe('Inheritance Bug N: Naming conflicts', () => {
  it('N1: Component "Btn" defined twice — last wins (or first?), at least one is used', () => {
    const code = `Btn as Button:
  pad 8
  bg #f00
Btn as Button:
  pad 16
  bg #0f0
Btn`
    const ir = toIR(parse(code))
    const inst = ir.nodes[0] as any
    // Either definition works as long as one is applied (no crash, padding is set)
    expect(findStyle(inst, 'padding')).toBeDefined()
    expect(findStyle(inst, 'background')).toBeDefined()
  })

  it('N2: Component named "Frame" (shadows primitive) does not crash', () => {
    const code = `Frame as Button:
  pad 8
Frame "x"`
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

// ============================================================================
// SI1, SI2: Self-Inheritance variants
// ============================================================================

describe('Inheritance Bug SI: Self-inheritance variants', () => {
  it('SI1: "Btn as Btn:" with body produces some component instance without crash', () => {
    const code = `Btn as Btn:
  pad 12
  bg #f00
Btn`
    const ir = toIR(parse(code))
    expect(ir.nodes.length).toBe(1)
  })

  it('SI2: "Btn extends Btn:" with body terminates', () => {
    const code = `Btn extends Btn:
  pad 12
Btn`
    const start = Date.now()
    expect(() => toIR(parse(code))).not.toThrow()
    expect(Date.now() - start).toBeLessThan(1000)
  })
})

// ============================================================================
// M5: Recursive Mixin (PascalCase as property)
// ============================================================================

describe('Inheritance Bug M: Recursive style-mixin', () => {
  it('M5: Style-mixin pointing to itself does not infinite-loop', () => {
    const code = `Self as Frame:
  pad 8
Frame Self`
    const start = Date.now()
    expect(() => toIR(parse(code))).not.toThrow()
    expect(Date.now() - start).toBeLessThan(1000)
  })
})

// ============================================================================
// PA2: Stress
// ============================================================================

describe('Inheritance Bug PA: Stress', () => {
  it('PA2: 10-deep inheritance chain does not crash and merges all properties', () => {
    const lines: string[] = []
    lines.push(`Lvl0 as Frame:`)
    lines.push(`  pad 0`)
    for (let i = 1; i <= 10; i++) {
      lines.push(`Lvl${i} as Lvl${i - 1}:`)
      lines.push(`  mar ${i}`)
    }
    lines.push('Lvl10')
    const ir = toIR(parse(lines.join('\n')))
    const inst = ir.nodes[0] as any
    // Last level's margin should be 10
    expect(findStyle(inst, 'margin')?.value).toBe('10px')
    // Original padding from Lvl0 should still be inherited
    expect(findStyle(inst, 'padding')?.value).toBe('0px')
  })

  it('PA3: Component named with Unicode "Bütton" works', () => {
    const code = `Bütton as Button:
  pad 8
Bütton`
    expect(() => toIR(parse(code))).not.toThrow()
  })
})

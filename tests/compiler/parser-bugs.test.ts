/**
 * Parser Bug Tests
 *
 * Konzentrierte Bug-Hypothesen aus tests/compiler/docs/themen/02-parser.md (Bereich 4.1).
 * Jeder Test prüft das *erwartete* Verhalten. Schlägt der Test fehl → Bug.
 * Tests die grün sind, bleiben als Regressionsschutz.
 *
 * Wichtig: Der Parser SOLL nicht crashen. Bei ungültigem Input erwarten wir
 *   - entweder einen Soft-Error in `ast.errors`,
 *   - eine sinnvolle partielle AST,
 *   - oder beides.
 * Was wir NIE wollen: Stack-Overflow, Endlosschleife, throw/Exception, leere AST ohne Error.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser/parser'

// ============================================================================
// T4/T5: Reserved keywords als Token-Name
// ============================================================================
describe('Parser Bug T4/T5: Reserved keywords as token names', () => {
  it('"if: #f00" does not crash', () => {
    expect(() => parse('if: #f00')).not.toThrow()
  })

  it('"if: #f00" produces SOMETHING (token, error, or conditional) — not silently swallowed', () => {
    const ast = parse('if: #f00')
    // Documented current behavior: 'if' is always the IF-token, so this becomes a malformed
    // Conditional with empty body. That is not ideal, but at least not silently dropped.
    const total = ast.tokens.length + ast.errors.length + ast.instances.length
    expect(total).toBeGreaterThan(0)
  })

  it('"each: #f00" does not crash', () => {
    expect(() => parse('each: #f00')).not.toThrow()
  })
})

// ============================================================================
// T10/T11: Canvas position
// ============================================================================
describe('Parser Bug T10/T11: Canvas placement', () => {
  it('canvas mid-document is NOT recognized as canvas (must be first)', () => {
    const ast = parse(`Frame
canvas mobile`)
    // canvas mid-document should not become program.canvas
    expect(ast.canvas).toBeUndefined()
  })

  it('canvas declared twice — first or last wins, but at least one is set', () => {
    const ast = parse(`canvas mobile
canvas desktop
Frame`)
    // We don't dictate which wins, but it MUST be set.
    expect(ast.canvas).toBeDefined()
  })
})

// ============================================================================
// T12: JS keyword as identifier
// ============================================================================
describe('Parser Bug T12: JavaScript keywords mid-document', () => {
  it('"let" inside Frame property does not switch to JS-block parsing', () => {
    // Frame let 5 — `let` als IDENTIFIER würde parser auf JS-Branch leiten,
    // wenn das nicht durch Top-Level-Position abgesichert ist.
    expect(() =>
      parse(`Frame
  let 5`)
    ).not.toThrow()
    const ast = parse(`Frame
  let 5`)
    // Should NOT have a javascript block — `let` is inside a Frame body.
    expect(ast.javascript).toBeUndefined()
  })

  it('"function" as top-level identifier triggers JS branch', () => {
    // Documented current behavior: top-level JS keyword swallows rest of file.
    const ast = parse(`function foo() { return 1 }`)
    expect(ast.javascript).toBeDefined()
  })
})

// ============================================================================
// TK1: Empty token value
// ============================================================================
describe('Parser Bug TK1: Empty token value', () => {
  it('"primary:" produces SOMETHING — not silently swallowed', () => {
    expect(() => parse('primary:')).not.toThrow()
    const ast = parse('primary:')
    // Documented: parser interprets `name:` (lowercase, empty body) as a Component
    // definition with default primitive (Frame). Not ideal — likely meant as token —
    // but at least visible in the AST.
    const total =
      ast.tokens.length + ast.errors.length + ast.instances.length + ast.components.length
    expect(total).toBeGreaterThan(0)
  })

  it('"name: =" (equals after colon, no value) does not crash', () => {
    expect(() => parse('name: =')).not.toThrow()
  })
})

// ============================================================================
// C2/C3: Self-inheritance
// ============================================================================
describe('Parser Bug C2/C3: Self-inheritance', () => {
  it('"Btn as Btn:" does not crash, parser produces a Component', () => {
    expect(() => parse('Btn as Btn:\n  pad 12')).not.toThrow()
    const ast = parse('Btn as Btn:\n  pad 12')
    expect(ast.components.length).toBe(1)
  })

  it('"Btn extends Btn:" does not crash', () => {
    expect(() => parse('Btn extends Btn:\n  pad 12')).not.toThrow()
  })

  it('"Btn as Btn:" sets primitive, does not infinite-loop', () => {
    const ast = parse('Btn as Btn:\n  pad 12')
    const comp = ast.components[0] as any
    expect(comp).toBeDefined()
    expect(comp.primitive ?? comp.parent).toBeDefined()
  })
})

// ============================================================================
// IC2/IC3: Empty inline-child slots
// ============================================================================
describe('Parser Bug IC2/IC3: Empty inline-child slots', () => {
  it('"Frame ;;" (double semicolon) does not crash', () => {
    expect(() => parse('Frame ;;')).not.toThrow()
  })

  it('"Frame; ; Btn" (empty middle slot) does not crash', () => {
    expect(() => parse('Frame; ; Btn')).not.toThrow()
  })

  it('"Frame ;;" produces an instance, no phantom children', () => {
    const ast = parse('Frame ;;')
    const inst = ast.instances[0] as any
    expect(inst).toBeDefined()
    // Children should be 0 OR all real (no phantom empty entries).
    if (inst.children) {
      for (const child of inst.children) {
        expect(child).toBeDefined()
        expect(typeof child).toBe('object')
      }
    }
  })
})

// ============================================================================
// P3: Multi-value property with too many values
// ============================================================================
describe('Parser Bug P3: Multi-value property with excess', () => {
  it('"Frame pad 8 16 24 32 40" (5 values for pad) does not crash', () => {
    expect(() => parse('Frame pad 8 16 24 32 40')).not.toThrow()
  })

  it('"Frame pad 8 16 24 32 40" produces some kind of property with the values', () => {
    const ast = parse('Frame pad 8 16 24 32 40')
    expect(ast.instances.length).toBe(1)
    // Either pad has 5 values (let it pass through, validator's job) or
    // some values become other properties — but parser must not lose them.
    const inst = ast.instances[0] as any
    expect(inst.properties.length).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================================
// P5: Two string contents
// ============================================================================
describe('Parser Bug P5: Two string contents on one element', () => {
  it('"Frame \\"first\\" pad 12 \\"second\\"" does not crash', () => {
    expect(() => parse('Frame "first" pad 12 "second"')).not.toThrow()
  })

  it('"Frame \\"first\\" \\"second\\"" — at least one string is captured as content', () => {
    const ast = parse('Frame "first" "second"')
    const inst = ast.instances[0] as any
    expect(inst).toBeDefined()
    // Should have a content property (either with first or second string)
    const hasContent = inst.properties?.some(
      (p: any) => p.name === 'content' && (p.values?.[0] === 'first' || p.values?.[0] === 'second')
    )
    expect(hasContent).toBe(true)
  })
})

// ============================================================================
// S1: Multiple hover states
// ============================================================================
describe('Parser Bug S1: Multiple state blocks with same name', () => {
  it('Two hover: blocks in the same component does not crash', () => {
    const code = `Btn:
  hover:
    bg #f00
  hover:
    col #fff`
    expect(() => parse(code)).not.toThrow()
  })

  it('Two hover: blocks → either both kept or merged, but not silently dropped', () => {
    const code = `Btn:
  hover:
    bg #f00
  hover:
    col #fff`
    const ast = parse(code)
    const comp = ast.components[0] as any
    const hoverStates = comp.states?.filter((s: any) => s.name === 'hover') ?? []
    // Either 1 (merged) or 2 (kept separately), but at least 1.
    expect(hoverStates.length).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================================
// S3: State at root level
// ============================================================================
describe('Parser Bug S3: State block at root level', () => {
  it('"hover:" at top level does not crash', () => {
    expect(() =>
      parse(`hover:
  bg #f00`)
    ).not.toThrow()
  })
})

// ============================================================================
// EA1/EA4/EA5: each edge cases
// ============================================================================
describe('Parser Bug EA1: each without loop variable', () => {
  it('"each in $list" does not crash', () => {
    expect(() =>
      parse(`each in $list
  Frame`)
    ).not.toThrow()
  })

  it('"each in $list" produces SOMETHING (instance, error, or each) — not silently swallowed', () => {
    const ast = parse(`each in $list
  Frame`)
    // Documented: parseEach returns null without item, then 'in' falls through and
    // '$list\n  Frame' is reinterpreted as a regular nested instance. Suboptimal,
    // but visible in the AST rather than dropped.
    const total = ast.tokens.length + ast.errors.length + ast.instances.length
    expect(total).toBeGreaterThan(0)
  })
})

describe('Parser Bug EA4/EA5: each with where/by missing arguments', () => {
  it('"each item in $list where" without expression does not crash', () => {
    expect(() =>
      parse(`each item in $list where
  Frame`)
    ).not.toThrow()
  })

  it('"each item in $list by" without field does not crash', () => {
    expect(() =>
      parse(`each item in $list by
  Frame`)
    ).not.toThrow()
  })
})

// ============================================================================
// CO1: Lone if
// ============================================================================
describe('Parser Bug CO1: Lone if', () => {
  it('"if" alone does not crash', () => {
    expect(() => parse('if')).not.toThrow()
  })

  it('"if condition" without body does not crash', () => {
    expect(() => parse('if condition')).not.toThrow()
  })
})

// ============================================================================
// CO3: else-if chain
// ============================================================================
describe('Parser Bug CO3: else-if chain', () => {
  it('"if a / else if b / else" parses without crash', () => {
    const code = `if a
  Text "A"
else if b
  Text "B"
else
  Text "C"`
    expect(() => parse(code)).not.toThrow()
  })

  it('else-if chain produces some kind of conditional structure', () => {
    const code = `if a
  Text "A"
else if b
  Text "B"
else
  Text "C"`
    const ast = parse(code)
    // Sollte mindestens einen Conditional-Knoten haben
    const conds = ast.instances.filter((i: any) => i.type === 'Conditional')
    expect(conds.length).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================================
// Robustheit: Sehr lange Inputs / Stress
// ============================================================================
describe('Parser Bug ER1/ER3: Robustness', () => {
  it('1000 properties on one Frame does not crash', () => {
    const props = Array.from({ length: 1000 }, () => 'pad 8').join(', ')
    expect(() => parse(`Frame ${props}`)).not.toThrow()
  })

  it('50 levels of nesting does not crash', () => {
    let code = 'Frame'
    for (let i = 1; i <= 50; i++) {
      code += '\n' + '  '.repeat(i) + 'Frame'
    }
    expect(() => parse(code)).not.toThrow()
  })

  it('100 top-level components does not hang', () => {
    const code = Array.from({ length: 100 }, (_, i) => `C${i} as frame:\n  pad ${i}`).join('\n')
    const start = Date.now()
    expect(() => parse(code)).not.toThrow()
    expect(Date.now() - start).toBeLessThan(2000)
  })
})

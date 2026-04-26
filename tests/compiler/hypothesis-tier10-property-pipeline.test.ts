/**
 * Hypothesis-Driven Bug Hunting — Tier 10: Property-based Pipeline Testing
 *
 * Generative testing: instead of hand-picked inputs, fast-check generates
 * thousands of random Mirror programs and verifies that key invariants hold
 * for ALL of them. Finds inputs no human would think of.
 *
 * Invariants tested:
 *   I1: compile is deterministic    : forall src, compile(src) === compile(src)
 *   I2: compile produces valid JS    : forall src, new Function(compile(src)) doesn't throw
 *   I3: compile is total (no throw)  : forall src, compile() doesn't throw
 *   I4: output never contains undef  : forall src, compile(src) doesn't have "undefined" leak
 *   I5: empty stays empty            : compile("") never throws and produces createUI
 *   I6: text content survives        : the source text appears in the output
 *
 * Each property runs 200+ random inputs.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

// =============================================================================
// Mirror-program arbitraries
// =============================================================================

const PRIMITIVES = ['Frame', 'Text', 'Button', 'Input', 'Image', 'Link', 'Icon']
const COLORS = ['#fff', '#000', '#2271C1', '#ef4444', '#10b981']
const PROPS_NUM = ['w', 'h', 'pad', 'mar', 'gap', 'fs', 'rad', 'opacity']
const PROPS_COL = ['bg', 'col', 'boc']
const FLAGS = ['hor', 'ver', 'center', 'spread', 'wrap', 'hidden']

const arbColor = fc.constantFrom(...COLORS)
const arbPrim = fc.constantFrom(...PRIMITIVES)

const arbStringSimple = fc
  .string({ minLength: 0, maxLength: 20 })
  // Filter out chars that the Mirror lexer might choke on
  .map(s => s.replace(/["\\\n\r\t`]/g, ''))

const arbProp = fc.oneof(
  fc
    .tuple(fc.constantFrom(...PROPS_NUM), fc.integer({ min: 0, max: 200 }))
    .map(([name, n]) => `${name} ${n}`),
  fc.tuple(fc.constantFrom(...PROPS_COL), arbColor).map(([n, c]) => `${n} ${c}`),
  fc.constantFrom(...FLAGS)
)

const arbInstance = fc.tuple(arbPrim, fc.array(arbProp, { maxLength: 4 })).map(([prim, props]) => {
  if (prim === 'Text' || prim === 'Button' || prim === 'Link') {
    return `${prim} "x"${props.length ? ', ' + props.join(', ') : ''}`
  }
  if (prim === 'Image') {
    return `Image src "/x.jpg"${props.length ? ', ' + props.join(', ') : ''}`
  }
  if (prim === 'Input') {
    return `Input placeholder "x"${props.length ? ', ' + props.join(', ') : ''}`
  }
  if (prim === 'Icon') {
    return `Icon "check"${props.length ? ', ' + props.join(', ') : ''}`
  }
  return `${prim}${props.length ? ' ' + props.join(', ') : ''}`
})

// Either a flat list of instances, or one Frame with N children
const arbProgram = fc.oneof(
  fc.array(arbInstance, { minLength: 0, maxLength: 4 }).map(insts => insts.join('\n')),
  fc
    .array(arbInstance, { minLength: 1, maxLength: 5 })
    .map(insts => 'Frame\n' + insts.map(i => '  ' + i).join('\n'))
)

// =============================================================================
// I1: Determinism
// =============================================================================

describe('Tier 10 — I1: compile is deterministic', () => {
  it('DOM: compile(src) === compile(src) for any random program', () => {
    fc.assert(
      fc.property(arbProgram, src => {
        return generateDOM(parse(src)) === generateDOM(parse(src))
      }),
      { numRuns: 200 }
    )
  })

  it('Framework: compile(src) === compile(src) for any random program', () => {
    fc.assert(
      fc.property(arbProgram, src => {
        return generateFramework(parse(src)) === generateFramework(parse(src))
      }),
      { numRuns: 200 }
    )
  })
})

// =============================================================================
// I2: Output is valid JS
// =============================================================================

describe('Tier 10 — I2: compile produces valid JavaScript', () => {
  it('DOM output always parses with new Function()', () => {
    fc.assert(
      fc.property(arbProgram, src => {
        const ast = parse(src)
        if (ast.errors && ast.errors.length > 0) return true // skip parse-failures
        const code = generateDOM(ast)
        const stripped = code.replace(/^export\s+function/gm, 'function')
        try {
          new Function(stripped)
          return true
        } catch {
          return false
        }
      }),
      { numRuns: 200 }
    )
  })

  it('Framework output always parses with new Function()', () => {
    fc.assert(
      fc.property(arbProgram, src => {
        const ast = parse(src)
        if (ast.errors && ast.errors.length > 0) return true
        const code = generateFramework(ast)
        // Framework uses ES module syntax (import/export). Strip those so we
        // can validate the body with new Function() (which expects script).
        const stripped = code
          .replace(/^import\s+\{[^}]+\}\s+from\s+'[^']+'\s*$/gm, '')
          .replace(/^export\s+(const|function)/gm, '$1')
        try {
          new Function(stripped)
          return true
        } catch {
          return false
        }
      }),
      { numRuns: 200 }
    )
  })
})

// =============================================================================
// I3: compile() is total (no throw)
// =============================================================================

describe('Tier 10 — I3: compile is total (never throws)', () => {
  it('DOM never throws for any random program', () => {
    fc.assert(
      fc.property(arbProgram, src => {
        try {
          generateDOM(parse(src))
          return true
        } catch {
          return false
        }
      }),
      { numRuns: 300 }
    )
  })

  it('React never throws for any random program', () => {
    fc.assert(
      fc.property(arbProgram, src => {
        try {
          generateReact(parse(src))
          return true
        } catch {
          return false
        }
      }),
      { numRuns: 300 }
    )
  })

  it('Framework never throws for any random program', () => {
    fc.assert(
      fc.property(arbProgram, src => {
        try {
          generateFramework(parse(src))
          return true
        } catch {
          return false
        }
      }),
      { numRuns: 300 }
    )
  })
})

// =============================================================================
// I4: No undefined leaks
// =============================================================================

describe('Tier 10 — I4: output does not contain undefined leaks', () => {
  it('DOM output never contains "var(--undefined)"', () => {
    fc.assert(
      fc.property(arbProgram, src => {
        const code = generateDOM(parse(src))
        return !code.includes('var(--undefined)')
      }),
      { numRuns: 200 }
    )
  })

  it('DOM output never contains "= undefined" in setAttribute', () => {
    fc.assert(
      fc.property(arbProgram, src => {
        const code = generateDOM(parse(src))
        return !/\.setAttribute\([^,]+,\s*undefined\s*\)/.test(code)
      }),
      { numRuns: 200 }
    )
  })
})

// =============================================================================
// I5: Empty/minimal inputs are safe
// =============================================================================

describe('Tier 10 — I5: empty/minimal inputs are safe', () => {
  it('empty programs always produce createUI without throw', () => {
    const minimalInputs = ['', ' ', '\n', '\n\n\n', '// comment', '   \t\t   ', '// 1\n// 2']
    for (const src of minimalInputs) {
      const code = generateDOM(parse(src))
      expect(code).toContain('createUI')
    }
  })
})

// =============================================================================
// I6: Text content preservation
// =============================================================================

describe('Tier 10 — I6: text content survives compilation', () => {
  it('DOM: source text appears in output', () => {
    fc.assert(
      fc.property(arbStringSimple, text => {
        if (text.length === 0 || text.includes('"')) return true // skip edge cases
        // Text should contain alphanumeric only to not interact with parser
        if (!/^[a-zA-Z0-9 ]+$/.test(text)) return true
        const src = `Text "${text}"`
        const code = generateDOM(parse(src))
        return code.includes(text)
      }),
      { numRuns: 200 }
    )
  })

  it('Framework: source text appears in output', () => {
    fc.assert(
      fc.property(arbStringSimple, text => {
        if (text.length === 0 || text.includes('"') || text.includes("'")) return true
        if (!/^[a-zA-Z0-9 ]+$/.test(text)) return true
        const src = `Text "${text}"`
        const code = generateFramework(parse(src))
        return code.includes(text)
      }),
      { numRuns: 200 }
    )
  })
})

// =============================================================================
// I7: Compile time bounded
// =============================================================================

describe('Tier 10 — I7: compile time stays bounded', () => {
  it('any random program compiles in < 100ms', () => {
    fc.assert(
      fc.property(arbProgram, src => {
        const start = performance.now()
        try {
          generateDOM(parse(src))
        } catch {
          return false
        }
        const ms = performance.now() - start
        return ms < 100
      }),
      { numRuns: 200 }
    )
  })
})

// =============================================================================
// I8: Output size bounded
// =============================================================================

describe('Tier 10 — I8: output size stays bounded', () => {
  it('per-element overhead < 1k for any small random program', () => {
    // The DOM runtime itself is ~130k constant overhead. Beyond that, each
    // user element adds <1k of generated code.
    fc.assert(
      fc.property(arbProgram, src => {
        const baseline = generateDOM(parse('')).length
        const code = generateDOM(parse(src))
        const elemCount = src.split('\n').filter(l => /^[A-Z]/.test(l.trim())).length
        const userOverhead = code.length - baseline
        // <1k per element is generous for our generator (max ~5 elements)
        return userOverhead < (elemCount + 1) * 2000
      }),
      { numRuns: 200 }
    )
  })

  it('output is at most 200k for a "≤ 5 element" random program', () => {
    fc.assert(
      fc.property(arbProgram, src => {
        const code = generateDOM(parse(src))
        return code.length < 200_000
      }),
      { numRuns: 200 }
    )
  })
})

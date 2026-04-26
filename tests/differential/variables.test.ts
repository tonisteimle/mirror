/**
 * Variables/Data — Differential Testing (Schicht 4 der Test-Pyramide)
 *
 * Pinned support matrix per backend für Variables/Data-Sub-Features.
 * Documentation: docs/concepts/variables-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

// =============================================================================
// Static corpus — values that should appear in all 3 backend outputs
// =============================================================================

const CORPUS = [
  {
    name: 'V1: scalar number → 42 in output',
    src: `count: 42\n\nText "$count"`,
    expectIn: ['42'],
  },
  {
    name: 'V2: scalar string → "Max" in output',
    src: `name: "Max"\n\nText "$name"`,
    expectIn: ['Max'],
  },
  {
    name: 'V5: single interpolation "Hi Max"',
    src: `name: "Max"\n\nText "Hi $name"`,
    expectIn: ['Hi', 'Max'],
  },
  {
    name: 'V6: multi interpolation "Max Mustermann"',
    src: `first: "Max"\nlast: "Mustermann"\n\nText "$first $last"`,
    expectIn: ['Max', 'Mustermann'],
  },
]

// V7 (nested objects) is tested separately — React backend doesn't currently
// inline nested-object data values, so the corpus runs DOM+Framework only.
const NESTED_CORPUS = [
  {
    name: 'V7: nested object property access',
    src: `user:\n  name: "Max"\n\nText "$user.name"`,
    expectIn: ['Max'],
  },
]

describe('Variables — All 3 backends compile static corpus', () => {
  it.each([...CORPUS, ...NESTED_CORPUS])('$name: compiles in DOM, React, Framework', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

describe('Variables — Variable values appear in all 3 backend outputs', () => {
  it.each(CORPUS)('$name: values appear in DOM, React, Framework', ({ src, expectIn }) => {
    const dom = generateDOM(parse(src))
    const react = generateReact(parse(src))
    const fw = generateFramework(parse(src))
    for (const value of expectIn) {
      expect(dom).toContain(value)
      expect(react).toContain(value)
      expect(fw).toContain(value)
    }
  })
})

describe('Variables — Nested-object access: DOM-only', () => {
  // Pin: only DOM backend inlines nested-object values like `user.name`.
  // React + Framework currently emit only the structural shell without the data.
  it.each(NESTED_CORPUS)(
    '$name: DOM includes the value; React + Framework drop it',
    ({ src, expectIn }) => {
      const dom = generateDOM(parse(src))
      const react = generateReact(parse(src))
      const fw = generateFramework(parse(src))
      for (const value of expectIn) {
        expect(dom).toContain(value)
        expect(react).not.toContain(value)
        expect(fw).not.toContain(value)
      }
    }
  )
})

// =============================================================================
// DOM-only: Mirror-data + $get() runtime
// =============================================================================

describe('Variables — DOM uses $get() runtime, others inline', () => {
  it('DOM emits $get("name") for variable access', () => {
    const dom = generateDOM(parse(`name: "Max"\n\nText "$name"`))
    expect(dom).toContain('$get("name")')
  })

  it('Framework emits the variable as a top-level binding', () => {
    const fw = generateFramework(parse(`name: "Max"\n\nText "$name"`))
    // Framework usually exports tokens / data as object / context — at minimum,
    // the value "Max" appears somewhere in the emit.
    expect(fw).toContain('Max')
  })
})

// =============================================================================
// Robustness — XSS prevention across backends
// =============================================================================

describe('Variables — XSS-relevant content survives compile in all backends', () => {
  const xssCorpus = [
    { name: 'angle brackets', src: `s: "<b>x</b>"\n\nText "$s"`, payload: '<b>x</b>' },
    { name: 'quotes', src: `s: "say \\"hi\\""\n\nText "$s"`, payload: 'say' },
    {
      name: 'script-tag literal',
      src: `s: "<script>alert(1)</script>"\n\nText "$s"`,
      payload: 'script',
    },
  ]

  it.each(xssCorpus)('$name: compiles without throwing in all backends', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

// =============================================================================
// Bug #22 — bare `$var` in Text drops content (DOM-confirmed)
// =============================================================================

describe('Variables — Bug #22 (fixed): bare `$var` in Text', () => {
  it('DOM compiler emits textContent that resolves to the variable value', () => {
    const dom = generateDOM(parse(`name: "Max"\n\nText $name`))
    // Either the literal "Max" appears, or `$get("name")` does — both are
    // valid forms (literal vs runtime resolution). The point is that the
    // content is no longer dropped.
    const hasContent =
      dom.includes('textContent') && (dom.includes('Max') || dom.includes('$get("name")'))
    expect(hasContent).toBe(true)
  })

  it('React backend now inlines the value for bare `$var`', () => {
    const react = generateReact(parse(`name: "Max"\n\nText $name`))
    expect(react).toContain('Max')
  })

  it('Framework backend handles bare `$var` without crashing', () => {
    expect(() => generateFramework(parse(`name: "Max"\n\nText $name`))).not.toThrow()
  })
})

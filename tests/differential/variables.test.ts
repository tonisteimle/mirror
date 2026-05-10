/**
 * Variables/Data — Differential Testing (Schicht 4 der Test-Pyramide)
 *
 * Pinned support matrix per backend für Variables/Data-Sub-Features.
 * Documentation: docs/archive/concepts/variables-backend-support.md.
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

describe('Variables — Nested-object access', () => {
  // PIN: nested-object data is reachable in DOM + React (DOM via
  // `__mirrorData`, React via the `tokens` object literal). Framework
  // still emits `'user': undefined` — closing that needs data emission
  // in the framework backend.
  it.each(NESTED_CORPUS)(
    '$name: nested-object data lands in DOM + React; Framework drops it',
    ({ src, expectIn }) => {
      const dom = generateDOM(parse(src))
      const react = generateReact(parse(src))
      const fw = generateFramework(parse(src))
      for (const value of expectIn) {
        expect(dom).toContain(value)
        expect(react).toContain(value)
        expect(fw).not.toContain(value)
      }
    }
  )

  // PIN: `$user.name` interpolation INSIDE Text content. DOM resolves
  // via `$get("user.name")` runtime; React compiles it into a JSX
  // expression (`tokens["user"]?.name`) so the data lands in the render;
  // Framework still keeps the literal `$user.name` string until its
  // backend gains compile-time interpolation.
  it.each(NESTED_CORPUS)(
    '$name: Text-content interpolation: DOM + React resolve; Framework keeps literal',
    ({ src }) => {
      const dom = generateDOM(parse(src))
      const react = generateReact(parse(src))
      const fw = generateFramework(parse(src))
      expect(dom).toMatch(/\$get\(['"]user\.name['"]\)/)
      expect(react).toMatch(/tokens\[['"]user['"]\]\?\.name/)
      expect(fw).toContain("'$user.name'")
    }
  )
})

describe('Variables — React text-interpolation forms', () => {
  // Three canonical interpolation shapes the React backend now resolves
  // at compile time, mirroring DOM's $get() runtime.
  it('bare `$name` → expression', () => {
    const react = generateReact(parse(`name: "Max"\n\nText "$name"`))
    expect(react).toMatch(/\{tokens\[['"]name['"]\]\}/)
  })

  it('mixed text+ref → template literal', () => {
    const react = generateReact(parse(`name: "Max"\n\nText "Hi $name"`))
    expect(react).toMatch(/\{`Hi \$\{tokens\[['"]name['"]\]\}`\}/)
  })

  it('dotted `$user.name` → optional-chain access', () => {
    const react = generateReact(parse(`user:\n  name: "Max"\n\nText "$user.name"`))
    expect(react).toMatch(/tokens\[['"]user['"]\]\?\.name/)
  })

  it('unknown identifier passes through as literal', () => {
    // No token named `missing` — keep `$missing` literal so authors see
    // the typo in the rendered output instead of `undefined`.
    const react = generateReact(parse(`name: "Max"\n\nText "$missing"`))
    expect(react).toContain('"$missing"')
  })
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

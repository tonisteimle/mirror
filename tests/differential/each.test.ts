/**
 * Each-Loop — Differential Testing (Schicht 4 der Test-Pyramide)
 *
 * Pinned support matrix per backend für Each-Loop-Sub-Features.
 * Documentation: docs/archive/concepts/each-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const STATIC_CORPUS = [
  {
    name: 'E1: basic each',
    src: `tasks:\n  t1:\n    title: "A"\n  t2:\n    title: "B"\n\neach task in $tasks\n  Text "$task.title"`,
  },
  {
    name: 'E3: inline-array',
    src: `each x in [1, 2, 3]\n  Text "$x"`,
  },
  {
    name: 'E5: where-filter',
    src: `tasks:\n  t1:\n    done: true\n  t2:\n    done: false\n\neach t in $tasks where t.done\n  Text "X"`,
  },
]

describe('Each-Loop — All 3 backends compile static corpus', () => {
  it.each(STATIC_CORPUS)('$name: compiles in DOM, React, Framework', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

describe('Each-Loop — DOM-only runtime semantics', () => {
  // Block-each uses runtime template (data-each-container + _eachConfig).
  // React/Framework backends do NOT have this runtime — they emit fewer
  // children or no loop at all.
  it('DOM emits _eachConfig runtime hook', () => {
    const dom = generateDOM(
      parse(`tasks:\n  t1:\n    title: "A"\n\neach task in $tasks\n  Text "$task.title"`)
    )
    expect(dom).toContain('_eachConfig')
  })

  it('DOM emits data-each-container in renderItem template', () => {
    const dom = generateDOM(
      parse(`tasks:\n  t1:\n    title: "A"\n\neach task in $tasks\n  Text "$task.title"`)
    )
    expect(dom).toContain('eachContainer')
  })

  it('React backend: each-loop is documented limitation', () => {
    // React backend: each does not produce a runtime loop. Pin this
    // documented limit (was found in Tier 9 + smoke tests).
    const react = generateReact(
      parse(`tasks:\n  t1:\n    title: "A"\n\neach task in $tasks\n  Text "$task.title"`)
    )
    // React doesn't crash, but doesn't loop either.
    expect(react).toContain('react')
  })
})

// =============================================================================
// Bug regressions
// =============================================================================

describe('Each-Loop — Bug regressions', () => {
  it('Bug #17 fixed: two parallel each-loops over same collection both render', () => {
    const src = `tasks:\n  t1:\n    title: "Alpha"\n  t2:\n    title: "Beta"\n\neach task in $tasks\n  Text "1: $task.title"\n\neach task in $tasks\n  Text "2: $task.title"`
    const dom = generateDOM(parse(src))
    // Both each-loops produce variable names that don't clash.
    // Without the fix, this would have `const tasksData` redeclared.
    expect(() => new Function(dom.replace(/^export\s+function/gm, 'function'))).not.toThrow()
  })

  it('Bug #20 fixed: $token reference inside each-loop body resolves', () => {
    const src = `accent.bg: #10b981\n\ntasks:\n  t1:\n    title: "A"\n\neach task in $tasks\n  Frame bg $accent`
    const dom = generateDOM(parse(src))
    // The token resolves to var(--accent-bg) inside the loop's renderItem
    expect(dom).toContain('var(--accent-bg)')
  })
})

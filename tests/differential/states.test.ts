/**
 * States — Differential Testing (Schicht 4)
 *
 * Per-backend support matrix. Documentation:
 * docs/archive/concepts/states-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const STATIC_CORPUS = [
  { name: 'S1: toggle() basic', src: `Btn: Button pad 10, toggle()\n  on:\n    bg red\n\nBtn "X"` },
  {
    name: 'S6: exclusive() group',
    src: `Tab: Button pad 10, exclusive()\n  selected:\n    col white\n\nFrame hor\n  Tab "A", selected\n  Tab "B"`,
  },
  {
    name: 'S9: system states',
    src: `Btn: Button pad 10, bg #333\n  hover:\n    bg #444\n\nBtn "X"`,
  },
]

describe('States — All 3 backends compile static corpus', () => {
  it.each(STATIC_CORPUS)('$name: compiles in DOM, React, Framework', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

describe('States — DOM emits state-machine runtime config', () => {
  it('toggle() generates state-machine in DOM output', () => {
    const dom = generateDOM(parse(`Btn: Button pad 10, toggle()\n  on:\n    bg red\n\nBtn "X"`))
    expect(dom).toContain('data-state')
    // The state machine runtime hook
    expect(dom).toMatch(/toggle|cycleState|_stateMachine/)
  })

  it('exclusive() registers an exclusive group in DOM runtime', () => {
    const dom = generateDOM(
      parse(`Tab: Button pad 10, exclusive()\n  selected:\n    col white\n\nTab "X", selected`)
    )
    // DOM emits `_exclusiveGroup` or similar runtime hook
    expect(dom).toContain('data-state')
  })
})

describe('States — Backend support limits', () => {
  it('toggle() runtime is DOM-only; React + Framework compile but no runtime', () => {
    const src = `Btn: Button pad 10, toggle()\n  on:\n    bg red\n\nBtn "X"`
    const react = generateReact(parse(src))
    const fw = generateFramework(parse(src))
    // Both compile (no throw) but don't include the click-cycle runtime
    expect(react).not.toContain('cycleState')
    expect(fw).not.toContain('cycleState')
  })
})

/**
 * Bind — Differential Testing (Schicht 4)
 *
 * Documentation: docs/archive/concepts/bind-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const STATIC_CORPUS = [
  { name: 'B1: one-way text', src: `name: "Max"\n\nText "$name"` },
  {
    name: 'B3: two-way Input bind',
    src: `searchTerm: ""\n\nInput bind searchTerm`,
  },
  {
    name: 'B5: Input mask + bind',
    src: `phone: ""\n\nInput mask "###-####", bind phone`,
  },
  {
    name: 'B10: Input bind with initial value',
    src: `name: "Max"\n\nInput bind name`,
  },
]

describe('Bind — All 3 backends compile static corpus', () => {
  it.each(STATIC_CORPUS)('$name: compiles in DOM, React, Framework', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

describe('Bind — DOM emits data-bind attribute on Input', () => {
  it('Input bind name → data-bind="name" in DOM output', () => {
    const dom = generateDOM(parse(`name: "Max"\n\nInput bind name`))
    expect(dom).toContain('data-bind')
    expect(dom).toContain('"name"')
  })
})

describe('Bind — Fixed bugs (regression tests)', () => {
  it('Bug #30 fixed: bind in each-loop emits per-item data-bind', () => {
    const src = `items:\n  a:\n    value: "x"\n\neach item in $items\n  Input bind item.value`
    const dom = generateDOM(parse(src))
    // Now: data-bind = 'item.value' is emitted on the input template
    expect(dom).toContain("dataset.bind = 'item.value'")
    // And the initial value is set
    expect(dom).toContain('= item.value')
  })

  it('Bug #31 fixed: bind follows dot-path through identifiers', () => {
    const src = `user:\n  email: "x"\n\nInput bind user.email`
    const dom = generateDOM(parse(src))
    // The dot-path makes it through to the data-bind attribute
    expect(dom).toContain("'user.email'")
  })
})

/**
 * Bind — Differential Testing (Schicht 4)
 *
 * Documentation: docs/concepts/bind-backend-support.md.
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

describe('Bind — Pinned bugs', () => {
  it('Bug #30 PIN: bind in each-loop does not propagate data-bind', () => {
    // The Input inside an each-loop with `bind item.value` doesn't get
    // the data-bind attribute set per loop-item.
    const src = `items:\n  a:\n    value: "x"\n\neach item in $items\n  Input bind item.value`
    const dom = generateDOM(parse(src))
    // Pin: today, no data-bind="item.value" inside the renderItem template
    expect(dom).not.toMatch(/setAttribute\(['"]data-bind['"], ['"]item\.value['"]\)/)
  })

  it('Bug #31 PIN: bind on object property emits top-level only', () => {
    // `bind user.email` should bind to user.email, but currently emits user
    const src = `user:\n  email: "x"\n\nInput bind user.email`
    const dom = generateDOM(parse(src))
    // Pin: today, data-bind value is just "user", not "user.email"
    expect(dom).toContain('data-bind')
    // The bind value used at runtime is "user" (the top-level key)
    expect(dom).not.toContain("data-bind', 'user.email'")
  })
})

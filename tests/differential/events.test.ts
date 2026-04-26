/**
 * Events — Differential Testing (Schicht 4)
 *
 * Documentation: docs/concepts/events-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const STATIC_CORPUS = [
  { name: 'EV1: onclick', src: `Button "X", onclick toast("Hi")` },
  { name: 'EV2: onhover', src: `Frame onhover toast("X")\n  Text "X"` },
  { name: 'EV3: onfocus', src: `Input onfocus toast("F")` },
  { name: 'EV5: onkey enter', src: `Input onkeydown(enter) toast("Y")` },
]

describe('Events — All 3 backends compile static corpus', () => {
  it.each(STATIC_CORPUS)('$name: compiles in DOM, React, Framework', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

describe('Events — DOM emits addEventListener calls', () => {
  it("onclick → addEventListener('click', …)", () => {
    const dom = generateDOM(parse(`Button "X", onclick toast("Hi")`))
    expect(dom).toContain("addEventListener('click'")
  })

  it("onhover → addEventListener('mouseenter', …)", () => {
    const dom = generateDOM(parse(`Frame onhover toast("X")\n  Text "X"`))
    expect(dom).toContain("addEventListener('mouseenter'")
  })

  it('onkeydown(enter) → keydown listener with enter-filter', () => {
    const dom = generateDOM(parse(`Input onkeydown(enter) toast("Y")`))
    expect(dom).toContain("addEventListener('keydown'")
    expect(dom).toMatch(/['"]Enter['"]/)
  })
})

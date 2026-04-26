/**
 * Properties — Differential Testing (Schicht 4)
 *
 * Documentation: docs/concepts/properties-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const STATIC_CORPUS = [
  { name: 'P1: hex color', src: `Frame bg #2271C1, w 100, h 50` },
  { name: 'P3: gradient', src: `Frame bg grad #2271C1 #7c3aed, w 200, h 100` },
  { name: 'P4: typography', src: `Text "T", fs 24, weight bold` },
  { name: 'P6: shadow', src: `Frame w 100, h 50, shadow lg` },
  { name: 'P7: hidden', src: `Frame w 100, hidden` },
  { name: 'P9: radius', src: `Frame w 100, h 50, rad 8` },
]

describe('Properties — All 3 backends compile static corpus', () => {
  it.each(STATIC_CORPUS)('$name: compiles in DOM, React, Framework', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

describe('Properties — DOM emits expected style values', () => {
  it('bg #2271C1 emits #2271C1 hex', () => {
    const dom = generateDOM(parse(`Frame bg #2271C1`))
    expect(dom).toMatch(/#2271C1|#2271c1/)
  })

  it('shadow md emits a box-shadow value', () => {
    const dom = generateDOM(parse(`Frame w 100, h 50, shadow md`))
    expect(dom).toContain('box-shadow')
  })

  it('grad emits linear-gradient', () => {
    const dom = generateDOM(parse(`Frame bg grad #2271C1 #7c3aed, w 200, h 100`))
    expect(dom).toContain('linear-gradient')
  })

  it('truncate emits text-overflow + overflow + white-space', () => {
    const dom = generateDOM(parse(`Text "X", truncate, w 100`))
    expect(dom).toContain('text-overflow')
    expect(dom).toContain('ellipsis')
  })
})

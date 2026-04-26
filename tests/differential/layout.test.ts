/**
 * Layout — Differential Testing (Schicht 4)
 *
 * Documentation: docs/concepts/layout-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const STATIC_CORPUS = [
  { name: 'L1: vertical', src: `Frame\n  Text "A"\n  Text "B"` },
  { name: 'L2: horizontal', src: `Frame hor\n  Text "A"\n  Text "B"` },
  { name: 'L3: center', src: `Frame w 200, h 100, center\n  Text "X"` },
  { name: 'L4: spread', src: `Frame hor, spread\n  Text "A"\n  Text "B"` },
  { name: 'L9: grid 3', src: `Frame grid 3, gap 8\n  Frame h 40\n  Frame h 40` },
]

describe('Layout — All 3 backends compile static corpus', () => {
  it.each(STATIC_CORPUS)('$name: compiles in DOM, React, Framework', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

describe('Layout — DOM emits flex / grid styles', () => {
  it('default Frame uses flex-direction: column', () => {
    const dom = generateDOM(parse(`Frame\n  Text "A"`))
    expect(dom).toContain("'flex-direction': 'column'")
  })

  it('hor Frame uses flex-direction: row', () => {
    const dom = generateDOM(parse(`Frame hor\n  Text "A"`))
    expect(dom).toContain("'flex-direction': 'row'")
  })

  it('grid 3 emits grid-template-columns repeat(3, 1fr)', () => {
    const dom = generateDOM(parse(`Frame grid 3\n  Frame h 40`))
    expect(dom).toContain('grid-template-columns')
    expect(dom).toContain('repeat(3')
  })
})

/**
 * Positional Arguments — Differential Testing (Schicht 4)
 *
 * Documentation: docs/concepts/positional-args.md +
 *                docs/concepts/positional-args-backend-support.md
 *
 * The resolver runs *before* the parser, so all backends see identical
 * AST regardless of which form (positional vs explicit) the user wrote.
 * These tests pin that invariant: positional and explicit Mirror produce
 * byte-identical compiled output across DOM, React and Framework
 * backends.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const PAIRS: Array<[string, string, string]> = [
  ['Frame hex bg', `Frame #2271C1, w 100, h 50`, `Frame bg #2271C1, w 100, h 50`],
  ['Frame size pair + bg', `Frame 100, 50, #333`, `Frame w 100, h 50, bg #333`],
  ['Button full mix', `Button "X", hug, 32, #2271C1`, `Button "X", w hug, h 32, bg #2271C1`],
  ['Text → col', `Text "Hi", #2271C1`, `Text "Hi", col #2271C1`],
  ['Icon → ic + is', `Icon "check", #888, 24`, `Icon "check", ic #888, is 24`],
  ['Image w/h', `Image src "x.jpg", 200, 100`, `Image src "x.jpg", w 200, h 100`],
  ['rgba color', `Frame rgba(0,0,0,0.5), w 200, h 100`, `Frame bg rgba(0,0,0,0.5), w 200, h 100`],
  ['hug+full', `Frame hug, full, #333`, `Frame w hug, h full, bg #333`],
]

describe('Positional Args — All 3 backends produce identical output', () => {
  it.each(PAIRS)('%s — DOM byte-equivalent', (_n, positional, explicit) => {
    expect(generateDOM(parse(positional))).toBe(generateDOM(parse(explicit)))
  })

  it.each(PAIRS)('%s — React byte-equivalent', (_n, positional, explicit) => {
    expect(generateReact(parse(positional))).toBe(generateReact(parse(explicit)))
  })

  it.each(PAIRS)('%s — Framework byte-equivalent', (_n, positional, explicit) => {
    expect(generateFramework(parse(positional))).toBe(generateFramework(parse(explicit)))
  })
})

describe('Positional Args — Resolver is pre-parse, backends see only explicit AST', () => {
  it('AST has explicit property names regardless of source form', () => {
    const positionalAst = parse(`Frame 100, 50, #333`)
    const explicitAst = parse(`Frame w 100, h 50, bg #333`)
    expect(JSON.stringify(positionalAst)).toBe(JSON.stringify(explicitAst))
  })
})

describe('Positional Args — All primitive families compile across backends', () => {
  const corpus = [
    `Frame 100, 50, #333`,
    `Button "X", hug, 32, #2271C1`,
    `Text "Hi", #fff`,
    `Link "More", #2271C1`,
    `Icon "check", #888, 24`,
    `Image src "x.jpg", 200, 100`,
    `Header 200, 60, #1a1a1a`,
    `Section full, hug, transparent`,
  ]

  it.each(corpus)('%s compiles in DOM, React, Framework', src => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

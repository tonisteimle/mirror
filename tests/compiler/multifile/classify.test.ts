/**
 * Classify — Top-Level-Re-Bucketing-Tests
 *
 * Validates that `classify(ast)` correctly sorts AST top-level nodes
 * into the four Multi-File buckets (data / tokens / components / layouts),
 * including hybrid files where multiple bucket types share one source.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../../compiler/parser'
import {
  classify,
  isDataObject,
  isPropertySet,
  isPlainToken,
} from '../../../compiler/loader/classify'

function classifyOf(source: string) {
  const ast = parse(source)
  // No parser errors should slip through unnoticed.
  expect(ast.errors).toEqual([])
  return classify(ast)
}

describe('classify(): pure files', () => {
  it('classifies a pure tokens file', () => {
    const result = classifyOf(`
primary.bg: #2271C1
primary.col: white
radius.md: 8
`)
    expect(result.data).toHaveLength(0)
    expect(result.tokens).toHaveLength(3)
    expect(result.components).toHaveLength(0)
    expect(result.layouts).toHaveLength(0)
    expect(result.tokens.map(t => t.name)).toEqual(['primary.bg', 'primary.col', 'radius.md'])
  })

  it('classifies a pure components file', () => {
    const result = classifyOf(`
Btn: pad 12 24, rad 6, bg #2271C1, col white
Card: bg #1a1a1a, pad 16, rad 8, gap 8
`)
    expect(result.tokens).toHaveLength(0)
    expect(result.components).toHaveLength(2)
    expect(result.layouts).toHaveLength(0)
  })

  it('classifies a pure layouts file (canvas + frame)', () => {
    const result = classifyOf(`
canvas mobile, bg #1a1a1a, col white

Frame gap 12
  Text "Hello"
`)
    expect(result.tokens).toHaveLength(0)
    expect(result.components).toHaveLength(0)
    // canvas + Frame = 2 entries
    expect(result.layouts).toHaveLength(2)
    expect(result.layouts[0].type).toBe('Canvas')
    expect(result.layouts[1].type).toBe('Instance')
  })
})

describe('classify(): hybrid files', () => {
  it('splits a hybrid file with token + component + layout into separate buckets', () => {
    // Critical Roadmap-case: a single source containing all four types.
    // Each definition lands in its own bucket; original line numbers are
    // preserved (we test that line ordering reflects source position).
    const result = classifyOf(`
primary.bg: #2271C1

Btn: pad 12 24, rad 6, bg $primary, col white

Frame gap 8
  Btn "Speichern"
`)
    expect(result.data).toHaveLength(0)
    expect(result.tokens).toHaveLength(1)
    expect(result.components).toHaveLength(1)
    expect(result.layouts).toHaveLength(1)
    expect(result.tokens[0].name).toBe('primary.bg')
    expect(result.tokens[0].line).toBeLessThan(result.components[0].line)
    expect(result.components[0].line).toBeLessThan(result.layouts[0].line)
  })

  it('keeps line/column positions intact (no node duplication)', () => {
    const result = classifyOf(`
primary.bg: #2271C1
Card: bg #1a1a1a, pad 16
Frame
  Text "Hi"
`)
    // Line 2 = primary.bg, Line 3 = Card, Line 4 = Frame
    expect(result.tokens[0].line).toBe(2)
    expect(result.components[0].line).toBe(3)
    expect(result.layouts[0].line).toBe(4)
  })
})

describe('classify(): data objects, schema, icons', () => {
  it('classifies a data object as data', () => {
    const result = classifyOf(`
user:
  name: "Max"
  email: "max@example.com"
`)
    expect(result.data).toHaveLength(1)
    expect(result.tokens).toHaveLength(0)
    expect(result.components).toHaveLength(0)
    expect(result.layouts).toHaveLength(0)
  })

  it('classifies $icons as data', () => {
    const result = classifyOf(`
$icons:
  hbox: "M3 3h18v18H3z|M9 3v18|M15 3v18"
`)
    expect(result.data).toHaveLength(1)
    expect(result.tokens).toHaveLength(0)
  })

  it('keeps property-sets in tokens (not data)', () => {
    // Property-sets like `cardstyle: bg #1a1a1a, pad 16` are mixins that
    // belong in the same load phase as plain tokens.
    const result = classifyOf(`
cardstyle: bg #1a1a1a, pad 16, rad 8
`)
    expect(result.tokens).toHaveLength(1)
    expect(result.data).toHaveLength(0)
    expect(isPropertySet(result.tokens[0])).toBe(true)
  })
})

describe('classify(): edge cases', () => {
  it('handles an empty program', () => {
    const result = classifyOf('')
    expect(result.data).toHaveLength(0)
    expect(result.tokens).toHaveLength(0)
    expect(result.components).toHaveLength(0)
    expect(result.layouts).toHaveLength(0)
  })

  it('handles a comment-only program', () => {
    const result = classifyOf(`
// only a comment
// another comment
`)
    expect(result.data).toHaveLength(0)
    expect(result.tokens).toHaveLength(0)
    expect(result.components).toHaveLength(0)
    expect(result.layouts).toHaveLength(0)
  })

  it('classifies a complete demo (all four types in one file)', () => {
    const result = classifyOf(`
canvas mobile, bg #1a1a1a, col white

primary.bg: #2271C1
primary.col: white

cardstyle: bg #1a1a1a, pad 16, rad 8

users:
  max:
    name: "Max"

Card: bg #1a1a1a, pad 16, rad 8
  Title: col white, fs 16
  Desc: col #888, fs 14

Frame gap 12
  Card
    Title "Welcome"
    Desc "Demo"
`)
    // canvas + Frame = 2 layouts
    expect(result.layouts).toHaveLength(2)
    // primary.bg + primary.col + cardstyle (property-set)
    expect(result.tokens).toHaveLength(3)
    // users data object
    expect(result.data).toHaveLength(1)
    expect(isDataObject(result.data[0] as Parameters<typeof isDataObject>[0])).toBe(true)
    // Card definition
    expect(result.components).toHaveLength(1)
  })
})

describe('classify(): predicates', () => {
  it('isPlainToken / isDataObject / isPropertySet are mutually exclusive', () => {
    // The parser only treats `name:\n  attrs...` as a data object when there
    // are MULTIPLE attributes — single-attr `name:\n  attr: x` flattens to a
    // plain token. Use a two-attr data object to hit the data path.
    const ast = parse(`
plain.bg: #2271C1
mixin: pad 16, rad 8
user:
  name: "Max"
  email: "max@example.com"
`)
    expect(ast.errors).toEqual([])
    const [plain, mixin, data] = ast.tokens
    expect(isPlainToken(plain)).toBe(true)
    expect(isPropertySet(plain)).toBe(false)
    expect(isDataObject(plain)).toBe(false)

    expect(isPlainToken(mixin)).toBe(false)
    expect(isPropertySet(mixin)).toBe(true)
    expect(isDataObject(mixin)).toBe(false)

    expect(isPlainToken(data)).toBe(false)
    expect(isPropertySet(data)).toBe(false)
    expect(isDataObject(data)).toBe(true)
  })
})

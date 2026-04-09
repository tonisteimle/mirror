import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

describe('Simple list without colons', () => {
  it('parses simple list items', () => {
    const code = `
colors:
  rot
  grün
  blau
`
    const ast = parse(code)

    // Find the token definition in ast.tokens
    const colorToken = ast.tokens.find(t => t.name === 'colors')
    expect(colorToken).toBeDefined()
    expect(colorToken?.attributes).toHaveLength(3)
    expect(colorToken?.attributes[0]).toMatchObject({ key: 'rot', value: 'rot' })
    expect(colorToken?.attributes[1]).toMatchObject({ key: 'grün', value: 'grün' })
    expect(colorToken?.attributes[2]).toMatchObject({ key: 'blau', value: 'blau' })
  })

  it('works with each loop', () => {
    const code = `
colors:
  rot
  grün
  blau

Frame gap 8
  each color in $colors
    Text color, col white
`
    const ast = parse(code)
    expect(ast.errors).toHaveLength(0)

    const result = toIR(ast, true)  // true to get IRResult

    // Should compile without errors/warnings
    expect(result.warnings).toHaveLength(0)
    expect(result.ir.nodes.length).toBeGreaterThan(0)
  })

  it('mixes simple items with nested objects', () => {
    const code = `
items:
  apple
  banana:
    price: 5
  cherry
`
    const ast = parse(code)
    const itemsToken = ast.tokens.find(t => t.name === 'items')

    expect(itemsToken).toBeDefined()
    expect(itemsToken?.attributes).toHaveLength(3)

    // Simple item
    expect(itemsToken?.attributes[0]).toMatchObject({ key: 'apple', value: 'apple' })

    // Nested object - has children
    expect(itemsToken?.attributes[1].key).toBe('banana')
    expect(itemsToken?.attributes[1].children).toBeDefined()

    // Simple item after nested
    expect(itemsToken?.attributes[2]).toMatchObject({ key: 'cherry', value: 'cherry' })
  })
})

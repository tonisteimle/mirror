/**
 * Test inline conditionals
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'

describe('Inline Conditionals', () => {
  it('should parse inline if-then-else for properties', () => {
    const code = `Row hor pad 12 if $selected then col #3B82F620 else col transparent`

    const result = parse(code)
    console.log('Errors:', result.errors)
    console.log('Row AST:', JSON.stringify(result.nodes[0], null, 2))

    // Check if conditionalProperties exists
    const row = result.nodes[0]
    console.log('Row properties:', row.properties)
    console.log('Row conditionalProperties:', row.conditionalProperties)
  })

  it('should parse the existing example that passes', () => {
    const code = `Body ver
  each $user in $users
    Row hor pad 12 bor d 1 boc #27272A if $user.selected then col #3B82F620 else col transparent`

    const result = parse(code)
    console.log('Errors:', result.errors)

    const body = result.nodes[0]
    const iterator = body.children[0]
    const row = iterator.children[0]

    console.log('Row name:', row.name)
    console.log('Row properties:', JSON.stringify(row.properties, null, 2))
    console.log('Row conditionalProperties:', JSON.stringify(row.conditionalProperties, null, 2))
  })
})

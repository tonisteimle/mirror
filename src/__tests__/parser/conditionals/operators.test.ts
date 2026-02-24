/**
 * Parser Tests: Conditional Operators
 *
 * Tests for operators in conditions:
 * - Comparison: ==, !=, >, <, >=, <=
 * - Logical: and, or, not
 * - Arithmetic: +, -, *, /
 */

import { describe, it, expect } from 'vitest'
import { parse, parseOne, getConditional } from '../../test-utils'

describe('Equality Operators', () => {
  it('parses == operator', () => {
    const result = parse(`$status: "active"
if $status == "active"
  Box bg #22C55E`)
    expect(result.errors).toHaveLength(0)
  })

  it('parses != operator', () => {
    const result = parse(`$role: "user"
if $role != "admin"
  Text "Limited access"`)
    expect(result.errors).toHaveLength(0)
  })
})

describe('Comparison Operators', () => {
  it('parses > operator', () => {
    const result = parse(`$count: 5
if $count > 0
  Text "Has items"`)
    expect(result.errors).toHaveLength(0)
  })

  it('parses < operator', () => {
    const result = parse(`$progress: 50
if $progress < 100
  Text "In progress"`)
    expect(result.errors).toHaveLength(0)
  })

  it('parses >= operator', () => {
    const result = parse(`$age: 18
if $age >= 18
  Button "Continue"`)
    expect(result.errors).toHaveLength(0)
  })

  it('parses <= operator', () => {
    const result = parse(`$quantity: 10
if $quantity <= 10
  Text "Low stock"`)
    expect(result.errors).toHaveLength(0)
  })
})

describe('Logical Operators', () => {
  it('parses and operator', () => {
    const result = parse(`$a: true
$b: true
if $a and $b
  Text "Both true"`)
    expect(result.errors).toHaveLength(0)
  })

  it('parses or operator', () => {
    const result = parse(`$hasEmail: true
$hasPhone: false
if $hasEmail or $hasPhone
  Text "Can contact"`)
    expect(result.errors).toHaveLength(0)
  })

  it('parses not operator', () => {
    const result = parse(`$disabled: false
if not $disabled
  Button "Enabled"`)
    expect(result.errors).toHaveLength(0)
  })

  it('parses combined logical operators', () => {
    const result = parse(`$a: true
$b: false
$c: true
if $a and $b or $c
  Text "Complex"`)
    expect(result.errors).toHaveLength(0)
  })
})

describe('Arithmetic Operators', () => {
  it('parses + operator', () => {
    const result = parse(`$base: 10
$extra: 5
$total: $base + $extra`)
    expect(result.errors).toHaveLength(0)
  })

  it('parses - operator', () => {
    const result = parse(`$total: 100
$discount: 20
$final: $total - $discount`)
    expect(result.errors).toHaveLength(0)
  })

  it('parses * operator', () => {
    const result = parse(`$price: 50
$quantity: 3
$subtotal: $price * $quantity`)
    expect(result.errors).toHaveLength(0)
  })

  it('parses / operator', () => {
    const result = parse(`$total: 100
$items: 4
$average: $total / $items`)
    expect(result.errors).toHaveLength(0)
  })
})

describe('Inline Conditional Operators', () => {
  it('inline if with ==', () => {
    const node = parseOne('Icon if $status == "done" then "check" else "circle"')
    const cond = getConditional(node)
    expect(cond).toBeDefined()
  })

  it('inline if with >', () => {
    const node = parseOne('Box if $count > 0 then bg #22C55E else bg #EF4444')
    const cond = getConditional(node)
    expect(cond).toBeDefined()
  })

  it('inline if with and', () => {
    const node = parseOne('Button if $valid and $enabled then bg #3B82F6 else bg #999')
    const cond = getConditional(node)
    expect(cond).toBeDefined()
  })
})

describe('Complex Conditions', () => {
  it('nested comparisons', () => {
    const result = parse(`$age: 25
$verified: true
if $age >= 18 and $verified
  Button "Access granted"`)
    expect(result.errors).toHaveLength(0)
  })

  it('multiple or conditions', () => {
    const result = parse(`$role: "admin"
if $role == "admin" or $role == "moderator" or $role == "owner"
  Panel "Admin tools"`)
    expect(result.errors).toHaveLength(0)
  })
})

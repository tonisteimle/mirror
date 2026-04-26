/**
 * Parser Conditional Tests
 *
 * Tests parsing of if/else conditionals with JavaScript expressions
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'

// ============================================================================
// BLOCK CONDITIONALS
// ============================================================================

describe('Parser: Block Conditionals', () => {
  it('parses basic if block', () => {
    const ast = parse(`
if loggedIn
  UserProfile
`)
    expect(ast.instances.length).toBe(1)
    const conditional = ast.instances[0] as any
    expect(conditional.type).toBe('Conditional')
    expect(conditional.condition).toBe('loggedIn')
    expect(conditional.then.length).toBe(1)
    expect(conditional.then[0].component).toBe('UserProfile')
  })

  it('parses if-else block', () => {
    const ast = parse(`
if loggedIn
  UserProfile
else
  LoginButton
`)
    const conditional = ast.instances[0] as any
    expect(conditional.type).toBe('Conditional')
    expect(conditional.then[0].component).toBe('UserProfile')
    expect(conditional.else[0].component).toBe('LoginButton')
  })

  it('parses if with logical expression', () => {
    const ast = parse(`
if isAdmin && hasPermission
  AdminPanel
`)
    const conditional = ast.instances[0] as any
    expect(conditional.condition).toBe('isAdmin && hasPermission')
  })

  it('parses if with complex expression and grouping', () => {
    const ast = parse(`
if user.isAdmin && (hasPermission || isOwner)
  Panel
`)
    const conditional = ast.instances[0] as any
    expect(conditional.condition).toBe('user.isAdmin && (hasPermission || isOwner)')
  })

  it('parses if with comparison operators', () => {
    const ast = parse(`
if count > 0 && status === "active"
  List
`)
    const conditional = ast.instances[0] as any
    expect(conditional.condition).toBe('count > 0 && status === "active"')
  })

  it('parses if with negation', () => {
    const ast = parse(`
if !disabled
  Button
`)
    const conditional = ast.instances[0] as any
    expect(conditional.condition).toBe('!disabled')
  })

  it('parses nested if blocks', () => {
    const ast = parse(`
if hasData
  if isLoading
    Spinner
  else
    Content
`)
    const outer = ast.instances[0] as any
    expect(outer.type).toBe('Conditional')
    expect(outer.condition).toBe('hasData')

    const inner = outer.then[0]
    expect(inner.type).toBe('Conditional')
    expect(inner.condition).toBe('isLoading')
  })

  it('parses if with multiple then children', () => {
    const ast = parse(`
if showDetails
  Title
  Description
  Footer
`)
    const conditional = ast.instances[0] as any
    expect(conditional.then.length).toBe(3)
  })
})

// ============================================================================
// INLINE CONDITIONALS (TERNARY SYNTAX)
// ============================================================================

describe('Parser: Inline Conditionals', () => {
  it('parses ternary conditional', () => {
    const ast = parse(`Button bg active ? primary : muted`)
    const bgProp = ast.instances[0].properties.find(p => p.name === 'bg')
    const cond = bgProp?.values[0] as any
    expect(cond.kind).toBe('conditional')
    expect(cond.condition).toBe('active')
    expect(cond.then).toBe('primary')
    expect(cond.else).toBe('muted')
  })

  it('parses ternary conditional with comparison', () => {
    const ast = parse(`Icon content done === true ? "check" : "circle"`)
    const contentProp = ast.instances[0].properties.find(p => p.name === 'content')
    const cond = contentProp?.values[0] as any
    expect(cond.kind).toBe('conditional')
    expect(cond.condition).toBe('done === true')
    expect(cond.then).toBe('check')
    // `else` is collected as a token sequence (might be a nested ternary), so
    // STRING tokens stay quoted to survive into the JS expression.
    expect(cond.else).toBe('"circle"')
  })

  it('parses ternary conditional with numbers', () => {
    const ast = parse(`Box opacity visible ? 1 : 0`)
    const opaProp = ast.instances[0].properties.find(p => p.name === 'opacity')
    const cond = opaProp?.values[0] as any
    expect(cond.kind).toBe('conditional')
    expect(cond.then).toBe('1')
    expect(cond.else).toBe('0')
  })

  it('parses ternary with property access', () => {
    const ast = parse(`Icon task.done ? "check" : "circle"`)
    const prop = ast.instances[0].properties[0]
    const cond = prop?.values[0] as any
    expect(cond.kind).toBe('conditional')
    expect(cond.condition).toBe('task.done')
    expect(cond.then).toBe('check')
    expect(cond.else).toBe('"circle"')
  })
})

// ============================================================================
// EACH WITH CONDITIONS
// ============================================================================

describe('Parser: Each with Conditions', () => {
  it('parses each with if inside', () => {
    const ast = parse(`
each task in tasks
  if task.done
    CheckIcon
`)
    const each = ast.instances[0] as any
    expect(each.type).toBe('Each')
    expect(each.children[0].type).toBe('Conditional')
    expect(each.children[0].condition).toBe('task.done')
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Parser: Conditional Edge Cases', () => {
  it('parses simple identifier condition', () => {
    const ast = parse(`
if visible
  Content
`)
    const conditional = ast.instances[0] as any
    expect(conditional.condition).toBe('visible')
  })

  it('parses multiple sequential if blocks', () => {
    const ast = parse(`
if first
  A
if second
  B
`)
    expect(ast.instances.length).toBe(2)
    expect((ast.instances[0] as any).condition).toBe('first')
    expect((ast.instances[1] as any).condition).toBe('second')
  })
})

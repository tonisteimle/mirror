/**
 * Parser Iteration Tests
 *
 * Tests parsing of each loops and data binding
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser'
import { Each } from '../../ast'

// ============================================================================
// EACH LOOP SYNTAX
// ============================================================================

describe('Parser: Each Loop', () => {
  it('parses basic each loop', () => {
    const ast = parse(`
each task in tasks
  Card
`)
    expect(ast.instances.length).toBe(1)
    const each = ast.instances[0] as unknown as Each
    expect(each.type).toBe('Each')
    expect(each.item).toBe('task')
    expect(each.collection).toBe('tasks')
  })

  it('parses each with child component', () => {
    const ast = parse(`
each item in items
  Text
`)
    const each = ast.instances[0] as unknown as Each
    expect(each.type).toBe('Each')
    expect(each.children.length).toBe(1)
    expect(each.children[0].component).toBe('Text')
  })

  it('parses each with multiple children', () => {
    const ast = parse(`
each item in items
  Title
  Content
  Button
`)
    const each = ast.instances[0] as unknown as Each
    expect(each.children.length).toBe(3)
  })

  it('parses nested each loops', () => {
    const ast = parse(`
each category in categories
  each item in items
    Text
`)
    const outerEach = ast.instances[0] as unknown as Each
    expect(outerEach.item).toBe('category')
    expect(outerEach.collection).toBe('categories')

    const innerEach = outerEach.children[0] as unknown as Each
    expect(innerEach.type).toBe('Each')
    expect(innerEach.item).toBe('item')
  })

  it('parses each with where filter', () => {
    const ast = parse(`
each task in tasks where done === false
  Card
`)
    const each = ast.instances[0] as unknown as Each
    expect(each.type).toBe('Each')
    expect(each.filter).toBe('done === false')
  })

  it('parses each with complex filter', () => {
    const ast = parse(`
each task in tasks where priority > 3 && !completed
  Card
`)
    const each = ast.instances[0] as unknown as Each
    expect(each.filter).toBe('priority > 3 && !completed')
  })
})

// ============================================================================
// DATA BINDING
// ============================================================================

describe('Parser: Data Binding', () => {
  it('parses data binding as property', () => {
    const ast = parse(`TaskList data tasks`)
    const dataProp = ast.instances[0].properties.find(p => p.name === 'data')
    expect(dataProp).toBeDefined()
    expect(dataProp?.values[0]).toBe('tasks')
  })

  it('parses data binding with where clause', () => {
    const ast = parse(`TaskList data tasks where done === false`)
    const dataProp = ast.instances[0].properties.find(p => p.name === 'data')
    expect(dataProp?.values[0]).toBe('tasks')
    const filter = (dataProp?.values[1] as any)?.filter
    expect(filter).toBe('done === false')
  })

  it('parses data binding with comparison', () => {
    const ast = parse(`TaskList data tasks where priority > 3`)
    const dataProp = ast.instances[0].properties.find(p => p.name === 'data')
    const filter = (dataProp?.values[1] as any)?.filter
    expect(filter).toBe('priority > 3')
  })
})

// ============================================================================
// VARIABLE REFERENCES
// ============================================================================

describe('Parser: Variable References', () => {
  it('parses $variable as TokenReference', () => {
    const ast = parse(`Card bg $theme`)
    const bgProp = ast.instances[0].properties.find(p => p.name === 'bg')
    expect(bgProp).toBeDefined()
    expect(bgProp?.values[0]).toEqual({ kind: 'token', name: 'theme' })  // $ prefix creates TokenReference
  })
})

// ============================================================================
// EACH WITH CONDITIONS
// ============================================================================

describe('Parser: Each with Conditions', () => {
  it('parses each with if inside', () => {
    const ast = parse(`
each task in tasks
  if (task.done)
    Icon
`)
    const each = ast.instances[0] as unknown as Each
    expect(each.type).toBe('Each')
    expect(each.children.length).toBe(1)

    const conditional = each.children[0] as any
    expect(conditional.type).toBe('Conditional')
    expect(conditional.condition).toBe('(task.done)')
  })
})

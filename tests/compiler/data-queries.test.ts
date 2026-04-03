/**
 * Data Queries Tests
 *
 * Tests the where/by clauses in each loops for filtering and sorting data.
 * Syntax: each item in $collection where condition by field desc
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { Each } from '../../compiler/parser/ast'
import { compile } from '../../compiler/index'

// ============================================================================
// WHERE CLAUSE PARSING
// ============================================================================

describe('DataQueries: Where Clause Parsing', () => {
  it('parses where clause with simple condition', () => {
    const code = `
each task in $tasks where done == false
  Text task.title
`
    const ast = parse(code)
    const each = ast.instances[0] as Each

    expect(each.type).toBe('Each')
    expect(each.item).toBe('task')
    expect(each.collection).toBe('$tasks')
    expect(each.filter).toBeDefined()
  })

  it('parses where clause with greater than', () => {
    const code = `
each task in $tasks where priority > 5
  Text task.title
`
    const ast = parse(code)
    const each = ast.instances[0] as Each

    expect(each.filter).toBeDefined()
  })

  it('parses where clause with string comparison', () => {
    const code = `
each user in $users where role == "admin"
  Text user.name
`
    const ast = parse(code)
    const each = ast.instances[0] as Each

    expect(each.filter).toBeDefined()
  })
})

// ============================================================================
// BY CLAUSE PARSING
// ============================================================================

describe('DataQueries: By Clause Parsing', () => {
  it('parses by clause with field', () => {
    const code = `
each task in $tasks by priority
  Text task.title
`
    const ast = parse(code)
    const each = ast.instances[0] as Each

    expect(each.type).toBe('Each')
    expect(each.orderBy).toBe('priority')
    expect(each.orderDesc).toBeUndefined()
  })

  it('parses by clause with desc', () => {
    const code = `
each task in $tasks by priority desc
  Text task.title
`
    const ast = parse(code)
    const each = ast.instances[0] as Each

    expect(each.orderBy).toBe('priority')
    expect(each.orderDesc).toBe(true)
  })

  it('parses by clause with asc', () => {
    const code = `
each task in $tasks by priority asc
  Text task.title
`
    const ast = parse(code)
    const each = ast.instances[0] as Each

    expect(each.orderBy).toBe('priority')
    expect(each.orderDesc).toBe(false)
  })
})

// ============================================================================
// COMBINED WHERE AND BY
// ============================================================================

describe('DataQueries: Combined Where and By', () => {
  it('parses where and by together', () => {
    const code = `
each task in $tasks where done == false by priority desc
  Text task.title
`
    const ast = parse(code)
    const each = ast.instances[0] as Each

    expect(each.filter).toBeDefined()
    expect(each.orderBy).toBe('priority')
    expect(each.orderDesc).toBe(true)
  })

  it('parses complex where with by', () => {
    const code = `
each user in $users where active == true by name asc
  Text user.email
`
    const ast = parse(code)
    const each = ast.instances[0] as Each

    expect(each.filter).toBeDefined()
    expect(each.orderBy).toBe('name')
    expect(each.orderDesc).toBe(false)
  })
})

// ============================================================================
// CODE GENERATION
// ============================================================================

describe('DataQueries: Code Generation', () => {
  it('generates filter code', () => {
    const code = `
each task in $tasks where done == false
  Text task.title
`
    const js = compile(code)

    expect(js).toContain('filter')
    expect(js).toContain('done == false')
  })

  it('generates sort code for ascending', () => {
    const code = `
each task in $tasks by priority
  Text task.title
`
    const js = compile(code)

    expect(js).toContain('sort')
    expect(js).toContain('priority')
  })

  it('generates sort code for descending', () => {
    const code = `
each task in $tasks by priority desc
  Text task.title
`
    const js = compile(code)

    expect(js).toContain('sort')
    expect(js).toContain('priority')
  })

  it('generates both filter and sort code', () => {
    const code = `
each task in $tasks where done == false by priority desc
  Text task.title
`
    const js = compile(code)

    expect(js).toContain('filter')
    expect(js).toContain('sort')
    expect(js).toContain('done == false')
    expect(js).toContain('priority')
  })
})

// ============================================================================
// WITH INDEX VARIABLE
// ============================================================================

describe('DataQueries: With Index Variable', () => {
  it('parses where clause with index', () => {
    const code = `
each task, i in $tasks where done == false
  Text i
  Text task.title
`
    const ast = parse(code)
    const each = ast.instances[0] as Each

    expect(each.item).toBe('task')
    expect(each.index).toBe('i')
    expect(each.filter).toBeDefined()
  })

  it('parses by clause with index', () => {
    const code = `
each task, i in $tasks by priority desc
  Text i
  Text task.title
`
    const ast = parse(code)
    const each = ast.instances[0] as Each

    expect(each.item).toBe('task')
    expect(each.index).toBe('i')
    expect(each.orderBy).toBe('priority')
    expect(each.orderDesc).toBe(true)
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('DataQueries: Edge Cases', () => {
  it('handles field names with underscores', () => {
    const code = `
each item in $items by created_at desc
  Text item.title
`
    const ast = parse(code)
    const each = ast.instances[0] as Each

    expect(each.orderBy).toBe('created_at')
  })

  it('handles nested collection access', () => {
    const code = `
each item in category.items where active == true
  Text item.name
`
    const ast = parse(code)
    const each = ast.instances[0] as Each

    expect(each.collection).toBe('category.items')
    expect(each.filter).toBeDefined()
  })

  it('handles multiple conditions in where', () => {
    const code = `
each task in $tasks where done == false && priority > 3
  Text task.title
`
    const ast = parse(code)
    const each = ast.instances[0] as Each

    expect(each.filter).toBeDefined()
  })
})

/**
 * Data Methods Tests
 *
 * Tests method definitions on collections:
 * function namespace.name(params)
 *   body statements
 */

import { describe, it, expect } from 'vitest'
import { parseDataFile } from '../../compiler/parser/data-parser'
import { compile } from '../../compiler/index'

// ============================================================================
// METHOD DEFINITION PARSING
// ============================================================================

describe('DataMethods: Parsing', () => {
  it('parses simple function definition', () => {
    const source = `
function projects.Total(project)
  return project.effort
`
    const result = parseDataFile(source, 'test')

    expect(result.methods).toHaveLength(1)
    expect(result.methods[0].namespace).toBe('projects')
    expect(result.methods[0].name).toBe('Total')
    expect(result.methods[0].params).toEqual(['project'])
  })

  it('parses function with multiple params', () => {
    const source = `
function tasks.Filter(task, status)
  return task.status == status
`
    const result = parseDataFile(source, 'test')

    expect(result.methods).toHaveLength(1)
    expect(result.methods[0].params).toEqual(['task', 'status'])
  })

  it('parses function with no params', () => {
    const source = `
function stats.Count()
  return items.length
`
    const result = parseDataFile(source, 'test')

    expect(result.methods).toHaveLength(1)
    expect(result.methods[0].params).toEqual([])
  })

  it('captures multiline body', () => {
    const source = `
function projects.Calculate(project)
  total = 0
  for task in project.tasks
    total = total + task.effort
  return total
`
    const result = parseDataFile(source, 'test')

    expect(result.methods).toHaveLength(1)
    expect(result.methods[0].rawBody).toContain('total = 0')
    expect(result.methods[0].rawBody).toContain('for task')
    expect(result.methods[0].rawBody).toContain('return total')
  })

  it('parses multiple functions', () => {
    const source = `
function projects.Sum(project)
  return project.effort

function tasks.IsDone(task)
  return task.done
`
    const result = parseDataFile(source, 'test')

    expect(result.methods).toHaveLength(2)
    expect(result.methods[0].name).toBe('Sum')
    expect(result.methods[1].name).toBe('IsDone')
  })

  it('functions can coexist with entries', () => {
    const source = `
project1:
name: Alpha
effort: 10

function projects.Total(project)
  return project.effort

project2:
name: Beta
effort: 20
`
    const result = parseDataFile(source, 'test')

    expect(result.entries).toHaveLength(2)
    expect(result.methods).toHaveLength(1)
    expect(result.entries[0].name).toBe('project1')
    expect(result.entries[1].name).toBe('project2')
    expect(result.methods[0].name).toBe('Total')
  })

  it('handles hyphenated namespace', () => {
    const source = `
function my-collection.my-method(item)
  return item.value
`
    const result = parseDataFile(source, 'test')

    expect(result.methods[0].namespace).toBe('my-collection')
    expect(result.methods[0].name).toBe('my-method')
  })
})

// ============================================================================
// METHOD BODY HANDLING
// ============================================================================

describe('DataMethods: Body Handling', () => {
  it('preserves indentation in body', () => {
    const source = `
function test.Nested(item)
  if item.active
    return item.value
  return 0
`
    const result = parseDataFile(source, 'test')

    // Body should preserve leading whitespace
    const lines = result.methods[0].rawBody.split('\n')
    expect(lines[0]).toMatch(/^\s+if/)
    expect(lines[1]).toMatch(/^\s+return item\.value/)
  })

  it('ends function body at non-indented line', () => {
    const source = `
function test.First(item)
  return item.a

test-entry:
key: value
`
    const result = parseDataFile(source, 'test')

    expect(result.methods).toHaveLength(1)
    expect(result.methods[0].rawBody).toContain('return item.a')
    expect(result.methods[0].rawBody).not.toContain('test-entry')
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].name).toBe('test-entry')
  })

  it('handles empty body', () => {
    const source = `
function test.Empty(item)

another-entry:
key: value
`
    const result = parseDataFile(source, 'test')

    expect(result.methods).toHaveLength(1)
    expect(result.methods[0].rawBody).toBe('')
    expect(result.entries).toHaveLength(1)
  })
})

// ============================================================================
// CODE GENERATION
// ============================================================================

describe('DataMethods: Code Generation', () => {
  it('generates __methods object', () => {
    const code = `
$tasks: [{ effort: 5 }]

Frame
  Text "Test"
`
    const js = compile(code)

    // The backend should generate a __methods placeholder
    expect(js).toContain('__mirrorData')
  })

  it('generates method functions from dataFiles', () => {
    const dataFile = {
      filename: 'projects',
      entries: [],
      methods: [{
        namespace: 'projects',
        name: 'Total',
        params: ['project'],
        rawBody: '  return project.effort',
        line: 1,
      }],
      errors: [],
    }

    const code = 'Frame'
    const js = compile(code, { dataFiles: [dataFile] })

    expect(js).toContain('const __methods = {}')
    expect(js).toContain('__methods.projects = {}')
    expect(js).toContain('__methods.projects.Total = function(project)')
    expect(js).toContain('return project.effort')
  })

  it('generates multiple methods for same namespace', () => {
    const dataFile = {
      filename: 'tasks',
      entries: [],
      methods: [
        {
          namespace: 'tasks',
          name: 'Sum',
          params: ['task'],
          rawBody: '  return $tasks.sum(effort)',
          line: 1,
        },
        {
          namespace: 'tasks',
          name: 'Count',
          params: [],
          rawBody: '  return $tasks.count',
          line: 5,
        },
      ],
      errors: [],
    }

    const code = 'Frame'
    const js = compile(code, { dataFiles: [dataFile] })

    expect(js).toContain('__methods.tasks.Sum = function(task)')
    expect(js).toContain('__methods.tasks.Count = function()')
  })

  it('transforms $collection to $get in method body', () => {
    const dataFile = {
      filename: 'calc',
      entries: [],
      methods: [{
        namespace: 'calc',
        name: 'Total',
        params: [],
        rawBody: '  return $tasks.sum(effort)',
        line: 1,
      }],
      errors: [],
    }

    const code = 'Frame'
    const js = compile(code, { dataFiles: [dataFile] })

    // $tasks should be transformed to $get('tasks')
    expect(js).toContain("$get('tasks')")
  })

  it('generates methods for multiple namespaces', () => {
    const dataFile = {
      filename: 'mixed',
      entries: [],
      methods: [
        {
          namespace: 'projects',
          name: 'Sum',
          params: ['p'],
          rawBody: '  return p.effort',
          line: 1,
        },
        {
          namespace: 'tasks',
          name: 'IsDone',
          params: ['t'],
          rawBody: '  return t.done',
          line: 5,
        },
      ],
      errors: [],
    }

    const code = 'Frame'
    const js = compile(code, { dataFiles: [dataFile] })

    expect(js).toContain('__methods.projects = {}')
    expect(js).toContain('__methods.tasks = {}')
    expect(js).toContain('__methods.projects.Sum')
    expect(js).toContain('__methods.tasks.IsDone')
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('DataMethods: Edge Cases', () => {
  it('function at end of file', () => {
    const source = `
function test.Last(item)
  return item.value`

    const result = parseDataFile(source, 'test')

    expect(result.methods).toHaveLength(1)
    expect(result.methods[0].rawBody).toContain('return item.value')
  })

  it('multiple functions in sequence', () => {
    const source = `
function a.First(x)
  return x + 1

function a.Second(x)
  return x + 2

function b.Third(x)
  return x + 3
`
    const result = parseDataFile(source, 'test')

    expect(result.methods).toHaveLength(3)
    expect(result.methods[0].namespace).toBe('a')
    expect(result.methods[0].name).toBe('First')
    expect(result.methods[1].namespace).toBe('a')
    expect(result.methods[1].name).toBe('Second')
    expect(result.methods[2].namespace).toBe('b')
    expect(result.methods[2].name).toBe('Third')
  })

  it('function with complex params', () => {
    const source = `
function calc.Sum(a, b, c)
  return a + b + c
`
    const result = parseDataFile(source, 'test')

    expect(result.methods[0].params).toEqual(['a', 'b', 'c'])
  })

  it('whitespace in params is trimmed', () => {
    const source = `
function calc.Sum( a , b , c )
  return a + b + c
`
    const result = parseDataFile(source, 'test')

    expect(result.methods[0].params).toEqual(['a', 'b', 'c'])
  })
})

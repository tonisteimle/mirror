/**
 * Query Files Tests
 *
 * Tests .query file parsing and code generation.
 * Queries define derived/computed collections.
 *
 * Syntax:
 *   QueryName:
 *     each item in $collection where condition by field desc
 *       outputField: item.property
 *       computed: item.value > 5
 */

import { describe, it, expect } from 'vitest'
import { parseQueryFile, serializeQueryToJS, serializeQueriesForJS } from '../../compiler/parser/query-parser'
import type { QueryDefinition, QueryFile } from '../../compiler/parser/query-types'
import { compile } from '../../compiler/index'

// ============================================================================
// BASIC PARSING
// ============================================================================

describe('QueryFiles: Basic Parsing', () => {
  it('parses simple query', () => {
    const source = `
TaskList:
  each task in $tasks
    title: task.title
    done: task.done
`
    const result = parseQueryFile(source, 'views')

    expect(result.queries).toHaveLength(1)
    expect(result.queries[0].name).toBe('TaskList')
    expect(result.queries[0].collection).toBe('$tasks')
    expect(result.queries[0].itemVar).toBe('task')
    expect(result.queries[0].fields).toHaveLength(2)
  })

  it('parses query with where clause', () => {
    const source = `
ActiveTasks:
  each task in $tasks where task.done == false
    title: task.title
`
    const result = parseQueryFile(source, 'views')

    expect(result.queries[0].filter).toBe('task.done == false')
  })

  it('parses query with by clause', () => {
    const source = `
SortedTasks:
  each task in $tasks by priority desc
    title: task.title
`
    const result = parseQueryFile(source, 'views')

    expect(result.queries[0].orderBy).toBe('priority')
    expect(result.queries[0].orderDesc).toBe(true)
  })

  it('parses query with where and by clauses', () => {
    const source = `
FilteredSorted:
  each task in $tasks where task.active == true by createdAt desc
    title: task.title
`
    const result = parseQueryFile(source, 'views')

    expect(result.queries[0].filter).toBe('task.active == true')
    expect(result.queries[0].orderBy).toBe('createdAt')
    expect(result.queries[0].orderDesc).toBe(true)
  })

  it('parses ascending sort', () => {
    const source = `
AscendingSort:
  each item in $items by name asc
    value: item.name
`
    const result = parseQueryFile(source, 'views')

    expect(result.queries[0].orderBy).toBe('name')
    expect(result.queries[0].orderDesc).toBe(false)
  })
})

// ============================================================================
// FIELD MAPPINGS
// ============================================================================

describe('QueryFiles: Field Mappings', () => {
  it('parses multiple fields', () => {
    const source = `
UserView:
  each user in $users
    id: user.id
    name: user.name
    email: user.email
    role: user.role
`
    const result = parseQueryFile(source, 'views')

    expect(result.queries[0].fields).toHaveLength(4)
    expect(result.queries[0].fields[0].name).toBe('id')
    expect(result.queries[0].fields[1].name).toBe('name')
  })

  it('parses computed fields', () => {
    const source = `
TaskBoard:
  each task in $tasks
    isUrgent: task.priority > 5
    isOverdue: task.dueDate < today
`
    const result = parseQueryFile(source, 'views')

    expect(result.queries[0].fields[0].expression).toBe('task.priority > 5')
    expect(result.queries[0].fields[1].expression).toBe('task.dueDate < today')
  })

  it('parses nested property access', () => {
    const source = `
TaskWithUser:
  each task in $tasks
    title: task.title
    userName: task.assignee.name
    userEmail: task.assignee.email
`
    const result = parseQueryFile(source, 'views')

    expect(result.queries[0].fields[1].expression).toBe('task.assignee.name')
    expect(result.queries[0].fields[2].expression).toBe('task.assignee.email')
  })
})

// ============================================================================
// MULTIPLE QUERIES
// ============================================================================

describe('QueryFiles: Multiple Queries', () => {
  it('parses multiple queries in one file', () => {
    const source = `
ActiveTasks:
  each task in $tasks where task.done == false
    title: task.title

CompletedTasks:
  each task in $tasks where task.done == true
    title: task.title
    completedAt: task.completedAt
`
    const result = parseQueryFile(source, 'views')

    expect(result.queries).toHaveLength(2)
    expect(result.queries[0].name).toBe('ActiveTasks')
    expect(result.queries[1].name).toBe('CompletedTasks')
    expect(result.queries[1].fields).toHaveLength(2)
  })

  it('queries have independent fields', () => {
    const source = `
Query1:
  each item in $items
    a: item.a
    b: item.b

Query2:
  each item in $items
    x: item.x
    y: item.y
    z: item.z
`
    const result = parseQueryFile(source, 'views')

    expect(result.queries[0].fields).toHaveLength(2)
    expect(result.queries[1].fields).toHaveLength(3)
  })
})

// ============================================================================
// CODE GENERATION
// ============================================================================

describe('QueryFiles: Code Generation', () => {
  it('generates basic query function', () => {
    const query: QueryDefinition = {
      name: 'TaskList',
      collection: '$tasks',
      itemVar: 'task',
      fields: [
        { name: 'title', expression: 'task.title', line: 3 },
        { name: 'done', expression: 'task.done', line: 4 },
      ],
      line: 1,
    }

    const js = serializeQueryToJS(query)

    expect(js).toContain('__queries.TaskList = function()')
    expect(js).toContain("$get('tasks')")
    expect(js).toContain('return data.map(task => ({')
    expect(js).toContain('title: task.title')
    expect(js).toContain('done: task.done')
  })

  it('generates filter code', () => {
    const query: QueryDefinition = {
      name: 'Active',
      collection: '$tasks',
      itemVar: 'task',
      filter: 'task.done == false',
      fields: [{ name: 'title', expression: 'task.title', line: 3 }],
      line: 1,
    }

    const js = serializeQueryToJS(query)

    expect(js).toContain('data = data.filter(task => task.done == false)')
  })

  it('generates sort code for descending', () => {
    const query: QueryDefinition = {
      name: 'Sorted',
      collection: '$tasks',
      itemVar: 'task',
      orderBy: 'priority',
      orderDesc: true,
      fields: [{ name: 'title', expression: 'task.title', line: 3 }],
      line: 1,
    }

    const js = serializeQueryToJS(query)

    expect(js).toContain('data.slice().sort')
    expect(js).toContain('a.priority')
    expect(js).toContain('b.priority')
  })

  it('generates sort code for ascending', () => {
    const query: QueryDefinition = {
      name: 'Sorted',
      collection: '$tasks',
      itemVar: 'task',
      orderBy: 'name',
      orderDesc: false,
      fields: [{ name: 'title', expression: 'task.title', line: 3 }],
      line: 1,
    }

    const js = serializeQueryToJS(query)

    expect(js).toContain('data.slice().sort')
  })

  it('adds optional chaining for nested access', () => {
    const query: QueryDefinition = {
      name: 'WithUser',
      collection: '$tasks',
      itemVar: 'task',
      fields: [
        { name: 'userName', expression: 'task.assignee.name', line: 3 },
      ],
      line: 1,
    }

    const js = serializeQueryToJS(query)

    expect(js).toContain('task.assignee?.name')
  })

  it('transforms $collection references', () => {
    const query: QueryDefinition = {
      name: 'WithLookup',
      collection: '$tasks',
      itemVar: 'task',
      fields: [
        { name: 'count', expression: '$users.count', line: 3 },
      ],
      line: 1,
    }

    const js = serializeQueryToJS(query)

    expect(js).toContain("$get('users')")
  })
})

// ============================================================================
// SERIALIZE MULTIPLE QUERIES
// ============================================================================

describe('QueryFiles: Serialize Multiple', () => {
  it('serializes multiple query files', () => {
    const queryFiles = [
      {
        filename: 'views',
        queries: [
          {
            name: 'TaskList',
            collection: '$tasks',
            itemVar: 'task',
            fields: [{ name: 'title', expression: 'task.title', line: 3 }],
            line: 1,
          },
        ],
        errors: [],
      },
      {
        filename: 'reports',
        queries: [
          {
            name: 'UserReport',
            collection: '$users',
            itemVar: 'user',
            fields: [{ name: 'name', expression: 'user.name', line: 3 }],
            line: 1,
          },
        ],
        errors: [],
      },
    ]

    const js = serializeQueriesForJS(queryFiles)

    expect(js).toContain('const __queries = {}')
    expect(js).toContain('__queries.TaskList')
    expect(js).toContain('__queries.UserReport')
  })

  it('returns empty string for no queries', () => {
    const js = serializeQueriesForJS([])

    expect(js).toBe('')
  })
})

// ============================================================================
// ERROR HANDLING
// ============================================================================

describe('QueryFiles: Error Handling', () => {
  it('reports error for missing each clause', () => {
    const source = `
BadQuery:
  title: item.title
`
    const result = parseQueryFile(source, 'views')

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('Expected "each item in $collection"')
  })

  it('reports error for content outside query', () => {
    const source = `
orphanField: value
`
    const result = parseQueryFile(source, 'views')

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('Unexpected content')
  })

  it('handles empty file', () => {
    const source = ``
    const result = parseQueryFile(source, 'views')

    expect(result.queries).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })

  it('handles comments', () => {
    const source = `
// This is a comment
TaskList:
  // Another comment
  each task in $tasks
    // Field comment
    title: task.title
`
    const result = parseQueryFile(source, 'views')

    expect(result.queries).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('QueryFiles: Edge Cases', () => {
  it('handles query at end of file without trailing newline', () => {
    const source = `TaskList:
  each task in $tasks
    title: task.title`

    const result = parseQueryFile(source, 'views')

    expect(result.queries).toHaveLength(1)
    expect(result.queries[0].fields).toHaveLength(1)
  })

  it('handles collection without $ prefix', () => {
    const source = `
List:
  each item in items
    value: item.value
`
    const result = parseQueryFile(source, 'views')

    expect(result.queries[0].collection).toBe('items')
  })

  it('handles hyphenated names', () => {
    const source = `
my-query:
  each my-item in $my-collection
    my-field: my-item.value
`
    const result = parseQueryFile(source, 'views')

    expect(result.queries[0].name).toBe('my-query')
    expect(result.queries[0].fields[0].name).toBe('my-field')
  })

  it('handles complex filter expressions', () => {
    const source = `
Complex:
  each task in $tasks where task.priority > 3 && task.done == false
    title: task.title
`
    const result = parseQueryFile(source, 'views')

    expect(result.queries[0].filter).toBe('task.priority > 3 && task.done == false')
  })
})

// ============================================================================
// INTEGRATION WITH COMPILE
// ============================================================================

describe('QueryFiles: Compile Integration', () => {
  it('generates queries in compiled output', () => {
    const queryFile: QueryFile = {
      filename: 'views',
      queries: [{
        name: 'TaskList',
        collection: '$tasks',
        itemVar: 'task',
        fields: [
          { name: 'title', expression: 'task.title', line: 3 },
          { name: 'done', expression: 'task.done', line: 4 },
        ],
        line: 1,
      }],
      errors: [],
    }

    const code = 'Frame'
    const js = compile(code, { queryFiles: [queryFile] })

    expect(js).toContain('const __queries = {}')
    expect(js).toContain('__queries.TaskList = function()')
    expect(js).toContain("$get('tasks')")
    expect(js).toContain('title: task.title')
  })

  it('generates multiple queries', () => {
    const queryFile: QueryFile = {
      filename: 'views',
      queries: [
        {
          name: 'ActiveTasks',
          collection: '$tasks',
          itemVar: 'task',
          filter: 'task.done == false',
          fields: [{ name: 'title', expression: 'task.title', line: 3 }],
          line: 1,
        },
        {
          name: 'CompletedTasks',
          collection: '$tasks',
          itemVar: 'task',
          filter: 'task.done == true',
          fields: [{ name: 'title', expression: 'task.title', line: 3 }],
          line: 5,
        },
      ],
      errors: [],
    }

    const code = 'Frame'
    const js = compile(code, { queryFiles: [queryFile] })

    expect(js).toContain('__queries.ActiveTasks')
    expect(js).toContain('__queries.CompletedTasks')
    expect(js).toContain('task.done == false')
    expect(js).toContain('task.done == true')
  })

  it('generates filter and sort code', () => {
    const queryFile: QueryFile = {
      filename: 'views',
      queries: [{
        name: 'SortedFiltered',
        collection: '$tasks',
        itemVar: 'task',
        filter: 'task.active == true',
        orderBy: 'priority',
        orderDesc: true,
        fields: [{ name: 'title', expression: 'task.title', line: 3 }],
        line: 1,
      }],
      errors: [],
    }

    const code = 'Frame'
    const js = compile(code, { queryFiles: [queryFile] })

    expect(js).toContain('data.filter(task => task.active == true)')
    expect(js).toContain('data.slice().sort')
    expect(js).toContain('a.priority')
  })

  it('works with dataFiles and queryFiles together', () => {
    const dataFile = {
      filename: 'tasks',
      entries: [{
        name: 'task1',
        attributes: [{ key: 'title', value: 'First Task', line: 2 }],
        blocks: [],
        line: 1,
      }],
      methods: [],
      errors: [],
    }

    const queryFile: QueryFile = {
      filename: 'views',
      queries: [{
        name: 'TaskView',
        collection: '$tasks',
        itemVar: 'task',
        fields: [{ name: 'title', expression: 'task.title', line: 3 }],
        line: 1,
      }],
      errors: [],
    }

    const code = 'Frame'
    const js = compile(code, { dataFiles: [dataFile], queryFiles: [queryFile] })

    expect(js).toContain('__mirrorData')
    expect(js).toContain('"tasks"')
    expect(js).toContain('__queries.TaskView')
  })
})

/**
 * Domain Model Integration Tests
 *
 * Comprehensive tests for the complete data layer:
 * - Phase 1: References ($users.toni)
 * - Phase 2: Inline Queries (where, by)
 * - Phase 3: Aggregations (.count, .sum, .avg)
 * - Phase 4: Collection Methods (function projects.X)
 * - Phase 5: Query Files (.query)
 * - Phase 6: Two-Way Binding (nested paths)
 *
 * @vitest-environment jsdom
 */

import { describe, test, expect } from 'vitest'
import { parse, generateDOM, compile } from '../../compiler'
import { parseDataFile, parseDataFiles, mergeDataFiles, serializeDataForJS } from '../../compiler/parser/data-parser'
import { parseQueryFile, parseQueryFiles, serializeQueriesForJS } from '../../compiler/parser/query-parser'
import type { DataFile } from '../../compiler/parser/data-types'
import type { QueryFile } from '../../compiler/parser/query-types'
import { JSDOM } from 'jsdom'

// ============================================================================
// TEST HELPERS
// ============================================================================

function compileWithData(
  mirrorCode: string,
  dataFiles: DataFile[] = [],
  queryFiles: QueryFile[] = []
): string {
  const ast = parse(mirrorCode)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }
  return generateDOM(ast, { dataFiles, queryFiles })
}

function compileAndExecute(
  mirrorCode: string,
  dataFiles: DataFile[] = [],
  queryFiles: QueryFile[] = [],
  globalData: Record<string, any> = {}
): {
  dom: JSDOM
  container: HTMLElement
  window: Window & typeof globalThis
  mirrorData: any
  $get: (name: string) => any
} {
  const jsCode = compileWithData(mirrorCode, dataFiles, queryFiles)
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'dangerously',
    url: 'http://localhost',
  })

  const { window } = dom
  const { document } = window

  // Inject global data before executing the script
  for (const [key, value] of Object.entries(globalData)) {
    ;(window as any)[key] = value
  }

  const executableCode = jsCode.replace(/^export /gm, '')
  const wrappedCode = `
    (function() {
      try {
        ${executableCode}
        window.__mirrorAPI = createUI();
        window.__mirrorRoot = window.__mirrorAPI.root;
        window.$get = $get;
      } catch (e) {
        window.__scriptError = e.message + '\\n' + e.stack;
      }
    })();
  `

  const script = document.createElement('script')
  script.textContent = wrappedCode
  document.body.appendChild(script)

  if ((window as any).__scriptError) {
    throw new Error('Script execution error: ' + (window as any).__scriptError)
  }

  return {
    dom,
    container: (window as any).__mirrorRoot,
    window: window as Window & typeof globalThis,
    mirrorData: (window as any).__mirrorData,
    $get: (window as any).$get,
  }
}

function simulateInput(input: HTMLInputElement, value: string, window: Window) {
  input.value = value
  const event = new window.Event('input', { bubbles: true })
  input.dispatchEvent(event)
}

// ============================================================================
// PHASE 1: REFERENCES
// ============================================================================

describe('Domain Model: References', () => {
  test('parses simple reference $collection.entry', () => {
    const dataSource = `
max:
  name: Max Mustermann
  email: max@example.com

task1:
  title: Task 1
  assignee: $users.max
`
    const dataFile = parseDataFile(dataSource, 'test')

    expect(dataFile.entries).toHaveLength(2)
    const task = dataFile.entries.find(e => e.name === 'task1')
    expect(task).toBeDefined()

    const assignee = task!.attributes.find(a => a.key === 'assignee')
    expect(assignee).toBeDefined()
    expect(assignee!.value).toEqual({
      kind: 'reference',
      collection: 'users',
      entry: 'max',
    })
  })

  test('parses multiple references as array', () => {
    const dataSource = `
project1:
  title: Project Alpha
  members: $users.max, $users.anna
`
    const dataFile = parseDataFile(dataSource, 'projects')
    const project = dataFile.entries[0]
    const members = project.attributes.find(a => a.key === 'members')

    expect(members).toBeDefined()
    expect((members!.value as any).kind).toBe('referenceArray')
    expect((members!.value as any).references).toHaveLength(2)
    expect((members!.value as any).references[0]).toEqual({
      kind: 'reference',
      collection: 'users',
      entry: 'max',
    })
  })

  test('serializes references with __ref structure', () => {
    const dataFile: DataFile = {
      filename: 'tasks',
      entries: [
        {
          name: 'task1',
          attributes: [
            { key: 'title', value: 'Task 1', line: 2 },
            {
              key: 'assignee',
              value: { kind: 'reference', collection: 'users', entry: 'max' },
              line: 3,
            },
          ],
          blocks: [],
          line: 1,
        },
      ],
      methods: [],
      errors: [],
    }

    const merged = mergeDataFiles([dataFile])
    const js = serializeDataForJS(merged)

    expect(js).toContain('"tasks"')
    expect(js).toContain('"task1"')
    expect(js).toContain('__ref: true')
    expect(js).toContain('collection: "users"')
    expect(js).toContain('entry: "max"')
  })

  test('resolves references in runtime via $resolveRef', () => {
    const usersFile = parseDataFile(`
max:
  name: Max Mustermann
  role: Admin
`, 'users')

    const tasksFile = parseDataFile(`
task1:
  title: Important Task
  assignee: $users.max
`, 'tasks')

    const { $get, mirrorData } = compileAndExecute(
      'Frame pad 16',
      [usersFile, tasksFile]
    )

    // Get the task
    const task1 = $get('tasks.task1')
    expect(task1).toBeDefined()
    expect(task1.title).toBe('Important Task')

    // The assignee should have __ref structure
    expect(task1.assignee.__ref).toBe(true)

    // When resolved, should get the actual user data
    const assigneeName = $get('tasks.task1.assignee.name')
    expect(assigneeName).toBe('Max Mustermann')
  })
})

// ============================================================================
// PHASE 2: INLINE QUERIES (where, by)
// ============================================================================

describe('Domain Model: Inline Queries', () => {
  test('parses each with where clause', () => {
    const code = `
Frame gap 8
  each task in $tasks where task.done == false
    Text task.title
`
    const ast = parse(code)
    expect(ast.errors).toHaveLength(0)

    // Find the each node - ast.instances contains root instances
    const frame = ast.instances[0] as any
    const each = frame.children[0]
    expect(each.type).toBe('Each')
    expect(each.filter).toBeDefined()
    expect(each.filter).toContain('done')
    expect(each.filter).toContain('false')
  })

  test('generates filter code for where clause', () => {
    const code = `
$items: [
  { value: 1 },
  { value: 5 },
  { value: 10 }
]

Frame gap 8
  each item in $items where item.value > 3
    Text item.value
`
    const ast = parse(code)
    const output = generateDOM(ast)

    expect(output).toContain('.filter(')
    expect(output).toContain('item.value > 3')
  })

  test('parses each with by clause for sorting', () => {
    const code = `
$tasks: [
  { title: "B Task", priority: 2 },
  { title: "A Task", priority: 1 }
]

Frame gap 8
  each task in $tasks by priority desc
    Text task.title
`
    const ast = parse(code)
    expect(ast.errors).toHaveLength(0)

    // AST structure: instances[0] is Frame, its children[0] is the each
    const frame = ast.instances[0]
    const each = frame.children[0]
    expect(each.orderBy).toBe('priority')
    expect(each.orderDesc).toBe(true)
  })

  test('generates sort code for by clause', () => {
    const code = `
$items: [{ name: "B" }, { name: "A" }]

Frame gap 8
  each item in $items by name asc
    Text item.name
`
    const ast = parse(code)
    const output = generateDOM(ast)

    expect(output).toContain('.sort(')
  })

  test('combines where and by clauses', () => {
    const code = `
$tasks: [
  { title: "Low", priority: 1, active: true },
  { title: "High", priority: 5, active: true },
  { title: "Inactive", priority: 3, active: false }
]

Frame gap 8
  each task in $tasks where task.active == true by priority desc
    Text task.title
`
    const ast = parse(code)
    const output = generateDOM(ast)

    expect(output).toContain('.filter(')
    expect(output).toContain('.sort(')
    expect(output).toContain('task.active == true')
  })

  test('runtime executes where filter correctly', () => {
    // Use globalData injection since inline array syntax is parsed as tokens
    const code = `
Frame gap 8
  each task in $tasks where task.done == false
    Text task.title
`
    const { container } = compileAndExecute(code, [], [], {
      tasks: [
        { title: 'Done', done: true },
        { title: 'Pending 1', done: false },
        { title: 'Pending 2', done: false },
      ],
    })
    const texts = container.querySelectorAll('span')

    // Should only render the 2 pending tasks
    expect(texts.length).toBe(2)
    expect(texts[0].textContent).toBe('Pending 1')
    expect(texts[1].textContent).toBe('Pending 2')
  })
})

// ============================================================================
// PHASE 3: AGGREGATIONS
// ============================================================================

describe('Domain Model: Aggregations', () => {
  test('$tasks.count returns array length', () => {
    const code = `Text "Total: " + $tasks.count`
    const { container } = compileAndExecute(code, [], [], {
      tasks: [{ title: 'Task 1' }, { title: 'Task 2' }, { title: 'Task 3' }],
    })
    const text = container.querySelector('span')
    expect(text?.textContent).toBe('Total: 3')
  })

  test('$tasks.sum(field) calculates sum', () => {
    const code = `Text "Total effort: " + $tasks.sum(effort)`
    const { container } = compileAndExecute(code, [], [], {
      tasks: [{ effort: 2 }, { effort: 5 }, { effort: 3 }],
    })
    const text = container.querySelector('span')
    expect(text?.textContent).toBe('Total effort: 10')
  })

  test('$tasks.avg(field) calculates average', () => {
    const code = `Text "Average: " + $scores.avg(value)`
    const { container } = compileAndExecute(code, [], [], {
      scores: [{ value: 10 }, { value: 20 }, { value: 30 }],
    })
    const text = container.querySelector('span')
    expect(text?.textContent).toBe('Average: 20')
  })

  test('$tasks.min(field) finds minimum', () => {
    const code = `Text "Min price: " + $items.min(price)`
    const { container } = compileAndExecute(code, [], [], {
      items: [{ price: 50 }, { price: 10 }, { price: 30 }],
    })
    const text = container.querySelector('span')
    expect(text?.textContent).toBe('Min price: 10')
  })

  test('$tasks.max(field) finds maximum', () => {
    const code = `Text "High score: " + $items.max(score)`
    const { container } = compileAndExecute(code, [], [], {
      items: [{ score: 85 }, { score: 92 }, { score: 78 }],
    })
    const text = container.querySelector('span')
    expect(text?.textContent).toBe('High score: 92')
  })

  test('$tasks.first returns first element', () => {
    const code = `Text "First: " + $items.first.name`
    const { container } = compileAndExecute(code, [], [], {
      items: [{ name: 'First' }, { name: 'Second' }, { name: 'Third' }],
    })
    const text = container.querySelector('span')
    expect(text?.textContent).toBe('First: First')
  })

  test('$tasks.last returns last element', () => {
    const code = `Text "Last: " + $items.last.name`
    const { container } = compileAndExecute(code, [], [], {
      items: [{ name: 'First' }, { name: 'Second' }, { name: 'Last' }],
    })
    const text = container.querySelector('span')
    expect(text?.textContent).toBe('Last: Last')
  })

  test('aggregations work with globalThis arrays', () => {
    // Note: inline array syntax is not properly parsed.
    // For array aggregations, inject via globalData parameter.
    const code = `
Frame gap 8
  Text "Tasks: " + $tasks.count
  Text "Total effort: " + $tasks.sum(effort)
`
    const { container } = compileAndExecute(code, [], [], {
      tasks: [
        { title: 'Task 1', effort: 3 },
        { title: 'Task 2', effort: 5 },
        { title: 'Task 3', effort: 2 },
      ],
    })
    const texts = container.querySelectorAll('span')

    expect(texts[0]?.textContent).toBe('Tasks: 3')
    expect(texts[1]?.textContent).toBe('Total effort: 10')
  })

  test('aggregations return 0 for empty arrays', () => {
    const code = `
$empty: []

Frame gap 8
  Text "Count: " + $empty.count
  Text "Sum: " + $empty.sum(value)
  Text "Avg: " + $empty.avg(value)
`
    const { container } = compileAndExecute(code)
    const texts = container.querySelectorAll('span')

    expect(texts[0]?.textContent).toBe('Count: 0')
    expect(texts[1]?.textContent).toBe('Sum: 0')
    expect(texts[2]?.textContent).toBe('Avg: 0')
  })
})

// ============================================================================
// PHASE 4: COLLECTION METHODS
// ============================================================================

describe('Domain Model: Collection Methods', () => {
  test('parses function definition in data file', () => {
    const dataSource = `
task1:
  title: Task 1
  effort: 5

function tasks.TotalEffort(tasks)
  return tasks.reduce((sum, t) => sum + t.effort, 0)
`
    const dataFile = parseDataFile(dataSource, 'tasks')

    expect(dataFile.methods).toHaveLength(1)
    expect(dataFile.methods[0].namespace).toBe('tasks')
    expect(dataFile.methods[0].name).toBe('TotalEffort')
    expect(dataFile.methods[0].params).toEqual(['tasks'])
    expect(dataFile.methods[0].rawBody).toContain('reduce')
  })

  test('parses multiple methods', () => {
    const dataSource = `
item1:
  value: 10

function items.Sum(items)
  return items.reduce((s, i) => s + i.value, 0)

function items.Average(items)
  return items.Sum(items) / items.length
`
    const dataFile = parseDataFile(dataSource, 'items')

    expect(dataFile.methods).toHaveLength(2)
    expect(dataFile.methods[0].name).toBe('Sum')
    expect(dataFile.methods[1].name).toBe('Average')
  })

  test('method with multiple parameters', () => {
    const dataSource = `
project1:
  budget: 10000

function projects.WithinBudget(project, max)
  return project.budget <= max
`
    const dataFile = parseDataFile(dataSource, 'projects')

    expect(dataFile.methods[0].params).toEqual(['project', 'max'])
  })

  test('generates method code', () => {
    const dataFile: DataFile = {
      filename: 'tasks',
      entries: [],
      methods: [
        {
          namespace: 'tasks',
          name: 'TotalEffort',
          params: ['tasks'],
          rawBody: 'return tasks.reduce((sum, t) => sum + t.effort, 0)',
          line: 5,
        },
      ],
      errors: [],
    }

    const code = 'Frame pad 16'
    const output = compileWithData(code, [dataFile])

    expect(output).toContain('__methods')
    expect(output).toContain('tasks')
    expect(output).toContain('TotalEffort')
  })

  test('method preserves multiline body', () => {
    const dataSource = `
task1:
  value: 1

function tasks.Complex(items)
  const filtered = items.filter(x => x.value > 0)
  const mapped = filtered.map(x => x.value * 2)
  return mapped.reduce((a, b) => a + b, 0)
`
    const dataFile = parseDataFile(dataSource, 'tasks')

    expect(dataFile.methods[0].rawBody).toContain('filtered')
    expect(dataFile.methods[0].rawBody).toContain('mapped')
    expect(dataFile.methods[0].rawBody).toContain('reduce')
  })
})

// ============================================================================
// PHASE 5: QUERY FILES
// ============================================================================

describe('Domain Model: Query Files', () => {
  test('parses basic query', () => {
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

  test('parses query with where clause', () => {
    const source = `
ActiveTasks:
  each task in $tasks where task.done == false
    title: task.title
`
    const result = parseQueryFile(source, 'views')

    expect(result.queries[0].filter).toBe('task.done == false')
  })

  test('parses query with by clause', () => {
    const source = `
SortedTasks:
  each task in $tasks by priority desc
    title: task.title
`
    const result = parseQueryFile(source, 'views')

    expect(result.queries[0].orderBy).toBe('priority')
    expect(result.queries[0].orderDesc).toBe(true)
  })

  test('parses multiple queries in one file', () => {
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
  })

  test('serializes query to JavaScript function', () => {
    const queryFile: QueryFile = {
      filename: 'views',
      queries: [
        {
          name: 'TaskList',
          collection: '$tasks',
          itemVar: 'task',
          fields: [
            { name: 'title', expression: 'task.title', line: 3 },
            { name: 'done', expression: 'task.done', line: 4 },
          ],
          line: 1,
        },
      ],
      errors: [],
    }

    const js = serializeQueriesForJS([queryFile])

    expect(js).toContain('const __queries = {}')
    expect(js).toContain('__queries.TaskList = function()')
    expect(js).toContain("$get('tasks')")
    expect(js).toContain('title: task.title')
    expect(js).toContain('done: task.done')
  })

  test('generates filter code for where clause', () => {
    const queryFile: QueryFile = {
      filename: 'views',
      queries: [
        {
          name: 'Active',
          collection: '$tasks',
          itemVar: 'task',
          filter: 'task.done == false',
          fields: [{ name: 'title', expression: 'task.title', line: 3 }],
          line: 1,
        },
      ],
      errors: [],
    }

    const js = serializeQueriesForJS([queryFile])

    expect(js).toContain('data.filter(task => task.done == false)')
  })

  test('generates sort code for by clause', () => {
    const queryFile: QueryFile = {
      filename: 'views',
      queries: [
        {
          name: 'Sorted',
          collection: '$tasks',
          itemVar: 'task',
          orderBy: 'priority',
          orderDesc: true,
          fields: [{ name: 'title', expression: 'task.title', line: 3 }],
          line: 1,
        },
      ],
      errors: [],
    }

    const js = serializeQueriesForJS([queryFile])

    expect(js).toContain('data.slice().sort')
    expect(js).toContain('a.priority')
    expect(js).toContain('b.priority')
  })

  test('adds optional chaining for nested access', () => {
    const queryFile: QueryFile = {
      filename: 'views',
      queries: [
        {
          name: 'WithUser',
          collection: '$tasks',
          itemVar: 'task',
          fields: [
            { name: 'userName', expression: 'task.assignee.name', line: 3 },
          ],
          line: 1,
        },
      ],
      errors: [],
    }

    const js = serializeQueriesForJS([queryFile])

    expect(js).toContain('task.assignee?.name')
  })

  test('integrates queryFiles with compile', () => {
    const queryFile: QueryFile = {
      filename: 'views',
      queries: [
        {
          name: 'TaskView',
          collection: '$tasks',
          itemVar: 'task',
          fields: [
            { name: 'title', expression: 'task.title', line: 3 },
          ],
          line: 1,
        },
      ],
      errors: [],
    }

    const code = 'Frame pad 16'
    const output = compileWithData(code, [], [queryFile])

    expect(output).toContain('const __queries = {}')
    expect(output).toContain('__queries.TaskView')
  })

  test('handles query errors gracefully', () => {
    const source = `
BadQuery:
  title: item.title
`
    const result = parseQueryFile(source, 'views')

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('Expected "each item in $collection"')
  })
})

// ============================================================================
// PHASE 6: TWO-WAY BINDING
// ============================================================================

describe('Domain Model: Two-Way Binding', () => {
  test('simple token binding works', () => {
    const code = `
$name: "Max"

Frame gap 12
  Input value $name
  Text $name
`
    const { container, window, mirrorData } = compileAndExecute(code)
    const input = container.querySelector('input') as HTMLInputElement
    const text = container.querySelector('span') as HTMLSpanElement

    expect(input.value).toBe('Max')
    expect(text.textContent).toBe('Max')

    simulateInput(input, 'Anna', window)

    expect(mirrorData.name).toBe('Anna')
    expect(text.textContent).toBe('Anna')
  })

  test('nested path binding works', () => {
    const code = `
$user.profile.name: "Max"

Frame gap 12
  Input value $user.profile.name
  Text $user.profile.name
`
    const { container, window, mirrorData } = compileAndExecute(code)
    const input = container.querySelector('input') as HTMLInputElement
    const text = container.querySelector('span') as HTMLSpanElement

    expect(input.value).toBe('Max')
    expect(text.textContent).toBe('Max')

    simulateInput(input, 'Updated', window)

    expect(mirrorData['user.profile.name']).toBe('Updated')
    expect(text.textContent).toBe('Updated')
  })

  test('complex expression with token updates', () => {
    const code = `
$count: 5

Frame gap 12
  Input value $count, type number
  Text "Count: " + $count + " items"
`
    const { container, window } = compileAndExecute(code)
    const input = container.querySelector('input') as HTMLInputElement
    const text = container.querySelector('span') as HTMLSpanElement

    expect(text.textContent).toContain('Count: 5 items')

    simulateInput(input, '10', window)

    expect(text.textContent).toContain('Count: 10 items')
  })

  test('multiple inputs bound to same token', () => {
    const code = `
$shared: "initial"

Frame gap 12
  Input value $shared, placeholder "Input 1"
  Input value $shared, placeholder "Input 2"
  Text $shared
`
    const { container, window, mirrorData } = compileAndExecute(code)
    const inputs = container.querySelectorAll('input') as NodeListOf<HTMLInputElement>

    expect(inputs[0].value).toBe('initial')
    expect(inputs[1].value).toBe('initial')

    simulateInput(inputs[0], 'updated', window)

    expect(mirrorData.shared).toBe('updated')
  })

  test('textarea binding works', () => {
    const code = `
$content: "Hello"

Frame gap 12
  Textarea value $content
  Text "Preview: " + $content
`
    const { container, window, mirrorData } = compileAndExecute(code)
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    const text = container.querySelector('span') as HTMLSpanElement

    expect(textarea.value).toBe('Hello')

    textarea.value = 'Updated'
    const event = new window.Event('input', { bubbles: true })
    textarea.dispatchEvent(event)

    expect(mirrorData.content).toBe('Updated')
    expect(text.textContent).toContain('Preview: Updated')
  })
})

// ============================================================================
// COMBINED: ALL PHASES TOGETHER
// ============================================================================

describe('Domain Model: Combined Features', () => {
  test('data file entries accessible by name', () => {
    // Note: Entry names like "max", "min", "first", "last" conflict with aggregation methods
    // Use entry names that don't conflict (e.g., "maxUser" instead of "max")
    const usersFile = parseDataFile(`
maxUser:
  name: Max
  hours: 40

anna:
  name: Anna
  hours: 35
`, 'users')

    const code = `
Frame gap 8
  Text "Max: " + $users.maxUser.name
  Text "Anna hours: " + $users.anna.hours
`
    const { container } = compileAndExecute(code, [usersFile])
    const texts = container.querySelectorAll('span')

    expect(texts[0]?.textContent).toBe('Max: Max')
    expect(texts[1]?.textContent).toBe('Anna hours: 35')
  })

  test('aggregations with globalThis array', () => {
    // Note: Complex inline array syntax is parsed as tokens, not arrays.
    // For runtime tests, we inject data via globalThis in the JSDOM environment.
    const code = `
Frame gap 8
  Text "Users: " + $users.count
  Text "Total hours: " + $users.sum(hours)
`
    const jsCode = compileWithData(code)
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      runScripts: 'dangerously',
      url: 'http://localhost',
    })

    const { window } = dom
    const { document } = window

    // Inject test data into globalThis before executing
    ;(window as any).users = [
      { name: 'Max', hours: 40 },
      { name: 'Anna', hours: 35 },
    ]

    const executableCode = jsCode.replace(/^export /gm, '')
    const wrappedCode = `
      (function() {
        ${executableCode}
        window.__mirrorAPI = createUI();
        window.__mirrorRoot = window.__mirrorAPI.root;
      })();
    `

    const script = document.createElement('script')
    script.textContent = wrappedCode
    document.body.appendChild(script)

    const container = (window as any).__mirrorRoot
    const texts = container.querySelectorAll('span')

    expect(texts[0]?.textContent).toBe('Users: 2')
    expect(texts[1]?.textContent).toBe('Total hours: 75')
  })

  test('where/by query with globalThis array', () => {
    // where/by clauses require arrays - inject via globalThis
    const code = `
Frame gap 8
  Text "Active tasks:"
  each task in $tasks where task.done == false by priority desc
    Text task.title
`
    const jsCode = compileWithData(code)
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      runScripts: 'dangerously',
      url: 'http://localhost',
    })

    const { window } = dom
    const { document } = window

    // Inject test data
    ;(window as any).tasks = [
      { title: 'Task A', priority: 3, done: false },
      { title: 'Task B', priority: 1, done: true },
      { title: 'Task C', priority: 2, done: false },
    ]

    const executableCode = jsCode.replace(/^export /gm, '')
    const wrappedCode = `
      (function() {
        ${executableCode}
        window.__mirrorAPI = createUI();
        window.__mirrorRoot = window.__mirrorAPI.root;
      })();
    `

    const script = document.createElement('script')
    script.textContent = wrappedCode
    document.body.appendChild(script)

    const container = (window as any).__mirrorRoot
    const texts = container.querySelectorAll('span')

    // Should show "Active tasks:" + 2 active tasks sorted by priority desc
    expect(texts).toHaveLength(3)
    expect(texts[0]?.textContent).toBe('Active tasks:')
    // Priority 3 (Task A) should come before priority 2 (Task C)
    expect(texts[1]?.textContent).toBe('Task A')
    expect(texts[2]?.textContent).toBe('Task C')
  })

  test('data file + query file integration', () => {
    const dataFile = parseDataFile(`
item1:
  name: Alpha
  value: 100

item2:
  name: Beta
  value: 200

item3:
  name: Gamma
  value: 150
`, 'items')

    const queryFile: QueryFile = {
      filename: 'views',
      queries: [
        {
          name: 'HighValueItems',
          collection: '$items',
          itemVar: 'item',
          filter: 'item.value >= 150',
          orderBy: 'value',
          orderDesc: true,
          fields: [
            { name: 'label', expression: 'item.name', line: 3 },
            { name: 'amount', expression: 'item.value', line: 4 },
          ],
          line: 1,
        },
      ],
      errors: [],
    }

    const code = 'Frame pad 16'
    const output = compileWithData(code, [dataFile], [queryFile])

    expect(output).toContain('__queries.HighValueItems')
    expect(output).toContain('item.value >= 150')
    expect(output).toContain('.sort(')
  })

  test('two-way binding updates text reactively', () => {
    const code = `
$quantity: 5
$price: 10

Frame gap 12
  Input value $quantity, type number
  Input value $price, type number
  Text "Summary: " + $quantity + " x " + $price
`
    const { container, window, mirrorData } = compileAndExecute(code)
    const inputs = container.querySelectorAll('input') as NodeListOf<HTMLInputElement>
    const texts = container.querySelectorAll('span')

    // Initial values
    expect(inputs[0].value).toBe('5')
    expect(inputs[1].value).toBe('10')
    expect(texts[0]?.textContent).toContain('5 x 10')

    // Update quantity
    simulateInput(inputs[0], '3', window)
    expect(mirrorData.quantity).toBe('3')
    expect(texts[0]?.textContent).toContain('3 x 10')

    // Update price
    simulateInput(inputs[1], '25', window)
    expect(mirrorData.price).toBe('25')
    expect(texts[0]?.textContent).toContain('3 x 25')
  })

  test('full dashboard scenario with globalThis array', () => {
    const code = `
$searchTerm: ""

Frame gap 16, pad 20
  Text "Dashboard", fs 24

  Frame gap 8
    Text "Total users: " + $users.count

  Frame gap 8
    Input value $searchTerm, placeholder "Search..."
    Text "Searching for: " + $searchTerm

  Frame gap 4
    Text "Active users:"
    each user in $users where user.active == true
      Frame hor, gap 8
        Text user.name
        Text user.role
`
    const jsCode = compileWithData(code)
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      runScripts: 'dangerously',
      url: 'http://localhost',
    })

    const { window } = dom
    const { document } = window

    // Inject test data
    ;(window as any).users = [
      { name: 'Max', role: 'Admin', active: true },
      { name: 'Anna', role: 'User', active: true },
      { name: 'Tom', role: 'User', active: false },
    ]

    const executableCode = jsCode.replace(/^export /gm, '')
    const wrappedCode = `
      (function() {
        ${executableCode}
        window.__mirrorAPI = createUI();
        window.__mirrorRoot = window.__mirrorAPI.root;
      })();
    `

    const script = document.createElement('script')
    script.textContent = wrappedCode
    document.body.appendChild(script)

    const container = (window as any).__mirrorRoot
    const mirrorData = (window as any).__mirrorData

    // Check dashboard rendered
    const texts = container.querySelectorAll('span')
    expect(texts[0]?.textContent).toBe('Dashboard')

    // Check user count
    expect(texts[1]?.textContent).toBe('Total users: 3')

    // Check active users filter rendered 2 users (Max and Anna)
    const userTexts = Array.from(texts).filter((t: any) =>
      t.textContent === 'Max' || t.textContent === 'Anna' || t.textContent === 'Tom'
    )
    expect(userTexts).toHaveLength(2) // Only Max and Anna (active)

    // Test search binding
    const input = container.querySelector('input') as HTMLInputElement
    simulateInput(input, 'test', window)
    expect(mirrorData.searchTerm).toBe('test')
  })
})

// ============================================================================
// ERROR HANDLING
// ============================================================================

describe('Domain Model: Error Handling', () => {
  test('handles undefined collection gracefully', () => {
    const code = `
Text "Count: " + $undefined.count
`
    const { container } = compileAndExecute(code)
    const text = container.querySelector('span')
    expect(text?.textContent).toBe('Count: 0')
  })

  test('handles empty data file', () => {
    const dataFile = parseDataFile('', 'empty')

    expect(dataFile.entries).toHaveLength(0)
    expect(dataFile.methods).toHaveLength(0)
    expect(dataFile.errors).toHaveLength(0)
  })

  test('handles query file with no queries', () => {
    const queryFile = parseQueryFile('// just a comment', 'empty')

    expect(queryFile.queries).toHaveLength(0)
    expect(queryFile.errors).toHaveLength(0)
  })

  test('aggregation on non-array returns 0', () => {
    const code = `
$notArray: "string"

Text "Count: " + $notArray.count
`
    const { container } = compileAndExecute(code)
    const text = container.querySelector('span')
    expect(text?.textContent).toBe('Count: 0')
  })

  test('nested property access with missing intermediate', () => {
    const code = `
$obj: {}

Text "Value: " + $obj.nested.deep.value
`
    // Should not throw, should handle gracefully
    const { container } = compileAndExecute(code)
    const text = container.querySelector('span')
    expect(text).toBeTruthy()
  })
})

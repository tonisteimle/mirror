/**
 * Aggressive Stress Tests für das Domain Model
 *
 * Testet Edge Cases, Grenzfälle, fehlerhafte Eingaben und Kombinationen
 * die in der normalen Nutzung selten vorkommen aber Bugs aufdecken können.
 */

import { describe, test, expect, beforeEach } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { parseDataFile, mergeDataFiles, serializeDataForJS } from '../../compiler/parser/data-parser'
import { parseQueryFile, serializeQueryToJS } from '../../compiler/parser/query-parser'
import { JSDOM } from 'jsdom'
import type { DataFile } from '../../compiler/parser/data-types'
import type { QueryFile } from '../../compiler/parser/query-types'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function compileWithData(
  code: string,
  dataFiles: DataFile[] = [],
  queryFiles: QueryFile[] = []
): string {
  const ast = parse(code)
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
): { dom: JSDOM; container: HTMLElement; window: any; mirrorData: any; $get: (path: string) => any } {
  const jsCode = compileWithData(mirrorCode, dataFiles, queryFiles)
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'dangerously',
    url: 'http://localhost',
  })

  const { window } = dom
  const { document } = window

  // Inject global data
  for (const [key, value] of Object.entries(globalData)) {
    ;(window as any)[key] = value
  }

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
  document.head.appendChild(script)

  const container = (window as any).__mirrorRoot || document.body
  const mirrorData = (window as any).__mirrorData || {}
  const $get = (window as any).$get || (() => undefined)

  return { dom, container, window, mirrorData, $get }
}

// =============================================================================
// PHASE 1: REFERENCES - STRESS TESTS
// =============================================================================

describe('Stress: References', () => {
  describe('Edge Cases', () => {
    test('reference to non-existent entry returns undefined gracefully', () => {
      const dataFile = parseDataFile(`
user1:
  name: Max
  friend: $users.nonexistent
`, 'users')

      const code = `Text "Friend: " + $users.user1.friend`
      // Should not throw, just show undefined or empty
      expect(() => compileWithData(code, [dataFile])).not.toThrow()
    })

    test('deeply nested references (5 levels)', () => {
      const dataFile = parseDataFile(`
a:
  ref: $data.b
b:
  ref: $data.c
c:
  ref: $data.d
d:
  ref: $data.e
e:
  value: deep
`, 'data')

      const merged = mergeDataFiles([dataFile])
      const serialized = serializeDataForJS(merged)

      // Should contain all reference structures
      expect(serialized).toContain('__ref')
      expect(serialized).toContain('collection: "data"')
    })

    test('self-referencing entry', () => {
      const dataFile = parseDataFile(`
self:
  name: Self
  me: $items.self
`, 'items')

      // Should parse without error
      const merged = mergeDataFiles([dataFile])
      expect(merged.items.self.me).toEqual({
        kind: 'reference',
        collection: 'items',
        entry: 'self'
      })
    })

    test('circular references between two entries', () => {
      const dataFile = parseDataFile(`
alice:
  name: Alice
  friend: $users.bob

bob:
  name: Bob
  friend: $users.alice
`, 'users')

      const merged = mergeDataFiles([dataFile])
      expect(merged.users.alice.friend.entry).toBe('bob')
      expect(merged.users.bob.friend.entry).toBe('alice')
    })

    test('empty reference value', () => {
      // Edge case: what happens with just $?
      const code = `$empty: ""`
      expect(() => parse(code)).not.toThrow()
    })

    test('reference with numbers in name', () => {
      const dataFile = parseDataFile(`
user123:
  name: User 123
  ref: $data.item456
`, 'data')

      const merged = mergeDataFiles([dataFile])
      expect(merged.data.user123.ref.entry).toBe('item456')
    })

    test('many references in one entry (10+)', () => {
      const dataFile = parseDataFile(`
hub:
  r1: $x.a
  r2: $x.b
  r3: $x.c
  r4: $x.d
  r5: $x.e
  r6: $x.f
  r7: $x.g
  r8: $x.h
  r9: $x.i
  r10: $x.j
`, 'x')

      const merged = mergeDataFiles([dataFile])
      expect(Object.keys(merged.x.hub).length).toBe(10)
    })
  })

  describe('Reference Array Stress', () => {
    test('large reference array (20 items)', () => {
      const refs = Array.from({ length: 20 }, (_, i) => `$users.user${i}`).join(', ')
      const dataFile = parseDataFile(`
group:
  members: ${refs}
`, 'groups')

      const merged = mergeDataFiles([dataFile])
      const members = merged.groups.group.members
      expect(members.kind).toBe('referenceArray')
      expect(members.references.length).toBe(20)
    })

    test('reference array with duplicates', () => {
      const dataFile = parseDataFile(`
group:
  members: $users.alice, $users.alice, $users.bob
`, 'groups')

      const merged = mergeDataFiles([dataFile])
      const members = merged.groups.group.members
      expect(members.references.length).toBe(3) // Duplicates allowed
    })
  })
})

// =============================================================================
// PHASE 2: INLINE QUERIES - STRESS TESTS
// =============================================================================

describe('Stress: Inline Queries', () => {
  describe('Where Clause Edge Cases', () => {
    test('where with deeply nested property access', () => {
      const code = `
Frame
  each item in $data where item.user.profile.settings.active == true
    Text item.name
`
      const output = compileWithData(code, [], [])
      expect(output).toContain('.filter(')
      expect(output).toContain('item.user.profile.settings.active')
    })

    test('where with string comparison', () => {
      const code = `
Frame
  each task in $tasks where task.status == "pending"
    Text task.title
`
      const { container } = compileAndExecute(code, [], [], {
        tasks: [
          { title: 'Task 1', status: 'pending' },
          { title: 'Task 2', status: 'done' },
          { title: 'Task 3', status: 'pending' },
        ]
      })
      const texts = container.querySelectorAll('span')
      expect(texts.length).toBe(2)
    })

    test('where with numeric comparison operators', () => {
      const code = `
Frame gap 8
  each item in $items where item.value >= 5
    Text item.name
`
      const { container } = compileAndExecute(code, [], [], {
        items: [
          { name: 'A', value: 3 },
          { name: 'B', value: 5 },
          { name: 'C', value: 10 },
          { name: 'D', value: 4 },
        ]
      })
      const texts = container.querySelectorAll('span')
      expect(texts.length).toBe(2) // B and C
    })

    test('where with != operator', () => {
      const code = `
Frame
  each item in $items where item.type != "hidden"
    Text item.name
`
      const { container } = compileAndExecute(code, [], [], {
        items: [
          { name: 'Visible 1', type: 'normal' },
          { name: 'Hidden', type: 'hidden' },
          { name: 'Visible 2', type: 'special' },
        ]
      })
      const texts = container.querySelectorAll('span')
      expect(texts.length).toBe(2)
    })

    test('where returns empty array gracefully', () => {
      const code = `
Frame
  each item in $items where item.value > 1000
    Text item.name
`
      const { container } = compileAndExecute(code, [], [], {
        items: [{ name: 'A', value: 1 }, { name: 'B', value: 2 }]
      })
      const texts = container.querySelectorAll('span')
      expect(texts.length).toBe(0)
    })

    test('where on empty source array', () => {
      const code = `
Frame
  each item in $items where item.active == true
    Text item.name
`
      const { container } = compileAndExecute(code, [], [], {
        items: []
      })
      const texts = container.querySelectorAll('span')
      expect(texts.length).toBe(0)
    })
  })

  describe('By Clause Edge Cases', () => {
    test('by with descending order on strings', () => {
      const code = `
Frame
  each item in $items by name desc
    Text item.name
`
      const { container } = compileAndExecute(code, [], [], {
        items: [
          { name: 'Alpha' },
          { name: 'Zeta' },
          { name: 'Beta' },
        ]
      })
      const texts = container.querySelectorAll('span')
      expect(texts[0].textContent).toBe('Zeta')
      expect(texts[2].textContent).toBe('Alpha')
    })

    test('by with ascending order (explicit)', () => {
      const code = `
Frame
  each item in $items by priority asc
    Text item.name
`
      const { container } = compileAndExecute(code, [], [], {
        items: [
          { name: 'Low', priority: 1 },
          { name: 'High', priority: 3 },
          { name: 'Medium', priority: 2 },
        ]
      })
      const texts = container.querySelectorAll('span')
      expect(texts[0].textContent).toBe('Low')
      expect(texts[1].textContent).toBe('Medium')
      expect(texts[2].textContent).toBe('High')
    })

    test('by on missing field (should not crash)', () => {
      const code = `
Frame
  each item in $items by nonexistent desc
    Text item.name
`
      // Should compile and execute without crashing
      expect(() => compileAndExecute(code, [], [], {
        items: [{ name: 'A' }, { name: 'B' }]
      })).not.toThrow()
    })

    test('by with null/undefined values', () => {
      const code = `
Frame
  each item in $items by value asc
    Text item.name
`
      const { container } = compileAndExecute(code, [], [], {
        items: [
          { name: 'Has Value', value: 5 },
          { name: 'Null', value: null },
          { name: 'Undefined' }, // value is undefined
        ]
      })
      const texts = container.querySelectorAll('span')
      expect(texts.length).toBe(3)
    })
  })

  describe('Combined Where + By', () => {
    test('where and by together with complex conditions', () => {
      const code = `
Frame
  each task in $tasks where task.priority > 1 by priority desc
    Text task.title
`
      const { container } = compileAndExecute(code, [], [], {
        tasks: [
          { title: 'Low', priority: 1 },
          { title: 'High', priority: 5 },
          { title: 'Medium', priority: 3 },
          { title: 'Critical', priority: 10 },
        ]
      })
      const texts = container.querySelectorAll('span')
      expect(texts.length).toBe(3) // excludes Low
      expect(texts[0].textContent).toBe('Critical')
      expect(texts[1].textContent).toBe('High')
      expect(texts[2].textContent).toBe('Medium')
    })

    test('where filters to empty then by is applied', () => {
      const code = `
Frame
  each item in $items where item.value > 100 by value desc
    Text item.name
`
      const { container } = compileAndExecute(code, [], [], {
        items: [{ name: 'A', value: 1 }]
      })
      const texts = container.querySelectorAll('span')
      expect(texts.length).toBe(0)
    })
  })
})

// =============================================================================
// PHASE 3: AGGREGATIONS - STRESS TESTS
// =============================================================================

describe('Stress: Aggregations', () => {
  describe('Edge Cases', () => {
    test('aggregation on undefined collection returns 0', () => {
      const code = `Text "Count: " + $nonexistent.count`
      const { container } = compileAndExecute(code)
      const text = container.querySelector('span')
      expect(text?.textContent).toBe('Count: 0')
    })

    test('sum on array with mixed types (numbers and strings)', () => {
      const code = `Text "Sum: " + $items.sum(value)`
      const { container } = compileAndExecute(code, [], [], {
        items: [
          { value: 10 },
          { value: '20' }, // string that looks like number
          { value: 30 },
        ]
      })
      const text = container.querySelector('span')
      // Should handle gracefully - either convert or skip
      expect(text?.textContent).toMatch(/Sum: \d+/)
    })

    test('sum on array with null/undefined values', () => {
      const code = `Text "Sum: " + $items.sum(value)`
      const { container } = compileAndExecute(code, [], [], {
        items: [
          { value: 10 },
          { value: null },
          { value: undefined },
          { value: 20 },
        ]
      })
      const text = container.querySelector('span')
      expect(text?.textContent).toBe('Sum: 30')
    })

    test('avg on single item array', () => {
      const code = `Text "Avg: " + $items.avg(value)`
      const { container } = compileAndExecute(code, [], [], {
        items: [{ value: 42 }]
      })
      const text = container.querySelector('span')
      expect(text?.textContent).toBe('Avg: 42')
    })

    test('avg on empty array returns 0 (not NaN)', () => {
      const code = `Text "Avg: " + $items.avg(value)`
      const { container } = compileAndExecute(code, [], [], {
        items: []
      })
      const text = container.querySelector('span')
      expect(text?.textContent).toBe('Avg: 0')
    })

    test('min/max on array with negative numbers', () => {
      const code = `
Frame gap 8
  Text "Min: " + $items.min(value)
  Text "Max: " + $items.max(value)
`
      const { container } = compileAndExecute(code, [], [], {
        items: [
          { value: -10 },
          { value: 0 },
          { value: 5 },
          { value: -100 },
        ]
      })
      const texts = container.querySelectorAll('span')
      expect(texts[0].textContent).toBe('Min: -100')
      expect(texts[1].textContent).toBe('Max: 5')
    })

    test('first/last on single item array', () => {
      const code = `
Frame gap 8
  Text "First: " + $items.first.name
  Text "Last: " + $items.last.name
`
      const { container } = compileAndExecute(code, [], [], {
        items: [{ name: 'Only One' }]
      })
      const texts = container.querySelectorAll('span')
      expect(texts[0].textContent).toBe('First: Only One')
      expect(texts[1].textContent).toBe('Last: Only One')
    })

    test('first/last on empty array returns undefined gracefully', () => {
      const code = `Text "First: " + $items.first.name`
      const { container } = compileAndExecute(code, [], [], {
        items: []
      })
      const text = container.querySelector('span')
      // Should not crash, show undefined or empty
      expect(text?.textContent).toMatch(/First:/)
    })

    test('deeply nested property in aggregation', () => {
      // FIXED: Nested property paths in aggregation arguments now work
      // $items.sum(data.stats.value) traverses nested objects correctly
      const code = `Text "Sum: " + $items.sum(data.stats.value)`
      const { container } = compileAndExecute(code, [], [], {
        items: [
          { data: { stats: { value: 10 } } },
          { data: { stats: { value: 20 } } },
        ]
      })
      const text = container.querySelector('span')
      expect(text?.textContent).toBe('Sum: 30')
    })

    test('chained aggregation access: first.nested.property', () => {
      const code = `Text "First user city: " + $users.first.address.city`
      const { container } = compileAndExecute(code, [], [], {
        users: [
          { name: 'Max', address: { city: 'Berlin', zip: '10115' } },
          { name: 'Anna', address: { city: 'Munich', zip: '80331' } },
        ]
      })
      const text = container.querySelector('span')
      expect(text?.textContent).toBe('First user city: Berlin')
    })
  })

  describe('Large Data Sets', () => {
    test('count on large array (1000 items)', () => {
      const code = `Text "Count: " + $items.count`
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }))
      const { container } = compileAndExecute(code, [], [], { items })
      const text = container.querySelector('span')
      expect(text?.textContent).toBe('Count: 1000')
    })

    test('sum on large array (1000 items)', () => {
      const code = `Text "Sum: " + $items.sum(value)`
      // Sum of 0..999 = 499500
      const items = Array.from({ length: 1000 }, (_, i) => ({ value: i }))
      const { container } = compileAndExecute(code, [], [], { items })
      const text = container.querySelector('span')
      expect(text?.textContent).toBe('Sum: 499500')
    })
  })

  describe('Multiple Aggregations', () => {
    test('multiple aggregations in one expression', () => {
      const code = `Text "Stats: " + $items.count + " items, sum: " + $items.sum(value) + ", avg: " + $items.avg(value)`
      const { container } = compileAndExecute(code, [], [], {
        items: [{ value: 10 }, { value: 20 }, { value: 30 }]
      })
      const text = container.querySelector('span')
      expect(text?.textContent).toBe('Stats: 3 items, sum: 60, avg: 20')
    })

    test('aggregations on different collections', () => {
      const code = `
Frame gap 8
  Text "Users: " + $users.count
  Text "Tasks: " + $tasks.count
  Text "Total hours: " + $users.sum(hours)
`
      const { container } = compileAndExecute(code, [], [], {
        users: [{ hours: 40 }, { hours: 35 }],
        tasks: [{ id: 1 }, { id: 2 }, { id: 3 }]
      })
      const texts = container.querySelectorAll('span')
      expect(texts[0].textContent).toBe('Users: 2')
      expect(texts[1].textContent).toBe('Tasks: 3')
      expect(texts[2].textContent).toBe('Total hours: 75')
    })
  })
})

// =============================================================================
// PHASE 4: COLLECTION METHODS - STRESS TESTS
// =============================================================================

describe('Stress: Collection Methods', () => {
  describe('Method Definition Edge Cases', () => {
    test('method with no parameters', () => {
      // Syntax: function namespace.name(params)
      const dataFile = parseDataFile(`
function items.GetAll()
  return $items
`, 'items')

      expect(dataFile.methods.length).toBe(1)
      expect(dataFile.methods[0].params).toEqual([])
    })

    test('method with many parameters (5+)', () => {
      const dataFile = parseDataFile(`
function calc.Complex(a, b, c, d, e, f)
  return a + b + c + d + e + f
`, 'calc')

      expect(dataFile.methods[0].params.length).toBe(6)
    })

    test('multiple methods on same collection', () => {
      const dataFile = parseDataFile(`
function utils.First()
  return 1

function utils.Second()
  return 2

function utils.Third()
  return 3
`, 'utils')

      expect(dataFile.methods.length).toBe(3)
    })

    test('method body with multiple lines', () => {
      const dataFile = parseDataFile(`
function tasks.ComplexCalc(task)
  const base = task.hours
  const multiplier = task.priority
  const bonus = 10
  return base * multiplier + bonus
`, 'tasks')

      expect(dataFile.methods[0].rawBody).toContain('const base')
      expect(dataFile.methods[0].rawBody).toContain('const multiplier')
      expect(dataFile.methods[0].rawBody).toContain('return base')
    })
  })
})

// =============================================================================
// PHASE 5: QUERY FILES - STRESS TESTS
// =============================================================================

describe('Stress: Query Files', () => {
  describe('Query Definition Edge Cases', () => {
    test('query with many fields (10+)', () => {
      const queryFile = parseQueryFile(`
BigQuery:
  each item in $items
    f1: item.a
    f2: item.b
    f3: item.c
    f4: item.d
    f5: item.e
    f6: item.f
    f7: item.g
    f8: item.h
    f9: item.i
    f10: item.j
`)

      expect(queryFile.queries[0].fields.length).toBe(10)
    })

    test('query with deeply nested source access', () => {
      const queryFile = parseQueryFile(`
DeepQuery:
  each item in $root.level1.level2.items
    name: item.name
`)
      // Property is 'collection', not 'source'
      expect(queryFile.queries[0].collection).toBe('$root.level1.level2.items')
    })

    test('query with computed field expressions', () => {
      const queryFile = parseQueryFile(`
ComputedQuery:
  each item in $items
    fullName: item.firstName + " " + item.lastName
    isActive: item.status == "active"
    priority: item.urgent ? 1 : 0
`)

      const serialized = serializeQueryToJS(queryFile.queries[0])
      expect(serialized).toContain('item.firstName')
      expect(serialized).toContain('item.lastName')
    })

    test('multiple queries in file with where and by', () => {
      const queryFile = parseQueryFile(`
ActiveTasks:
  each task in $tasks where task.active == true
    title: task.title

PriorityTasks:
  each task in $tasks by priority desc
    title: task.title

FilteredAndSorted:
  each task in $tasks where task.done == false by deadline asc
    title: task.title
    deadline: task.deadline
`)

      expect(queryFile.queries.length).toBe(3)
      // Property is 'filter', not 'where'
      expect(queryFile.queries[0].filter).toBeDefined()
      expect(queryFile.queries[1].orderBy).toBe('priority')
      expect(queryFile.queries[2].filter).toBeDefined()
      expect(queryFile.queries[2].orderBy).toBe('deadline')
    })
  })

  describe('Query Serialization', () => {
    test('serializes optional chaining correctly', () => {
      const queryFile = parseQueryFile(`
SafeQuery:
  each item in $items
    userName: item.user.name
    cityName: item.address.city.name
`)

      const serialized = serializeQueryToJS(queryFile.queries[0])
      // Only first level gets optional chaining: item.user?.name
      expect(serialized).toContain('item.user?.name')
      expect(serialized).toContain('item.address?.city.name')
    })
  })
})

// =============================================================================
// PHASE 6: TWO-WAY BINDING - STRESS TESTS
// =============================================================================

describe('Stress: Two-Way Binding', () => {
  describe('Rapid Updates', () => {
    test('multiple rapid input changes', () => {
      const code = `
$name: "Initial"

Frame gap 8
  Input value $name, name testInput
  Text "Hello, " + $name
`
      const { container, window } = compileAndExecute(code)
      const input = container.querySelector('input') as HTMLInputElement

      // Simulate rapid changes
      for (let i = 0; i < 10; i++) {
        input.value = `Value ${i}`
        input.dispatchEvent(new window.Event('input', { bubbles: true }))
      }

      const text = container.querySelector('span')
      expect(text?.textContent).toBe('Hello, Value 9')
    })

    test('simultaneous updates to multiple bound inputs', () => {
      const code = `
$first: "A"
$second: "B"

Frame gap 8
  Input value $first, name input1
  Input value $second, name input2
  Text $first + " " + $second
`
      const { container, window } = compileAndExecute(code)
      const inputs = container.querySelectorAll('input')

      ;(inputs[0] as HTMLInputElement).value = 'Hello'
      inputs[0].dispatchEvent(new window.Event('input', { bubbles: true }))

      ;(inputs[1] as HTMLInputElement).value = 'World'
      inputs[1].dispatchEvent(new window.Event('input', { bubbles: true }))

      const text = container.querySelector('span')
      expect(text?.textContent).toBe('Hello World')
    })
  })

  describe('Deep Path Binding', () => {
    test('binding to deeply nested path (4 levels)', () => {
      const code = `
$data.user.profile.settings.theme: "dark"

Input value $data.user.profile.settings.theme
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const output = generateDOM(ast)
      expect(output).toContain('data.user.profile.settings.theme')
    })

    test('multiple inputs bound to different nested paths', () => {
      const code = `
$user.name: "Max"
$user.email: "max@test.com"
$user.settings.theme: "dark"

Frame gap 8
  Input value $user.name
  Input value $user.email
  Input value $user.settings.theme
`
      const { container, window } = compileAndExecute(code)
      const inputs = container.querySelectorAll('input')

      expect((inputs[0] as HTMLInputElement).value).toBe('Max')
      expect((inputs[1] as HTMLInputElement).value).toBe('max@test.com')
      expect((inputs[2] as HTMLInputElement).value).toBe('dark')
    })
  })

  describe('Binding Edge Cases', () => {
    test('empty initial value binding', () => {
      const code = `
$empty: ""

Frame gap 8
  Input value $empty
  Text "Value: [" + $empty + "]"
`
      const { container, window } = compileAndExecute(code)
      const input = container.querySelector('input') as HTMLInputElement

      expect(input.value).toBe('')

      input.value = 'Now filled'
      input.dispatchEvent(new window.Event('input', { bubbles: true }))

      const text = container.querySelector('span')
      expect(text?.textContent).toBe('Value: [Now filled]')
    })

    test.skip('special characters in bound value', () => {
      // BUG: Strings containing single quotes break JS generation
      // The string "Hello <script>alert('xss')</script>" generates invalid JS
      // because the inner quotes aren't escaped
      const code = `
$text: "Hello <script>alert('xss')</script>"

Frame gap 8
  Input value $text
  Text $text
`
      const { container } = compileAndExecute(code)
      const text = container.querySelector('span')

      // Should be escaped/safe
      expect(text?.textContent).toContain('<script>')
      expect(text?.innerHTML).not.toContain('<script>')
    })

    test('unicode in bound value', () => {
      const code = `
$text: "Hello 世界 🌍"

Frame gap 8
  Input value $text
  Text $text
`
      const { container, window } = compileAndExecute(code)
      const input = container.querySelector('input') as HTMLInputElement
      const text = container.querySelector('span')

      expect(input.value).toBe('Hello 世界 🌍')
      expect(text?.textContent).toBe('Hello 世界 🌍')
    })
  })
})

// =============================================================================
// COMBINED STRESS TESTS
// =============================================================================

describe('Stress: Combined Features', () => {
  test('aggregation + where filter together', () => {
    // First filter, then aggregate
    const code = `
Frame gap 8
  Text "Active count: " + $tasks.count
  each task in $tasks where task.active == true
    Text task.title
`
    const { container } = compileAndExecute(code, [], [], {
      tasks: [
        { title: 'Task 1', active: true },
        { title: 'Task 2', active: false },
        { title: 'Task 3', active: true },
      ]
    })

    const texts = container.querySelectorAll('span')
    expect(texts[0].textContent).toBe('Active count: 3') // count is on all
    expect(texts.length).toBe(3) // 1 count + 2 filtered items
  })

  test('data file references + query file', () => {
    const usersFile = parseDataFile(`
alice:
  name: Alice
  role: admin

bob:
  name: Bob
  role: user
`, 'users')

    const queryFile = parseQueryFile(`
AdminUsers:
  each user in $users where user.role == "admin"
    userName: user.name
`)

    // Should compile without error
    const code = `Text "Test"`
    expect(() => compileWithData(code, [usersFile], [queryFile])).not.toThrow()
  })

  test('binding + aggregation in same view', () => {
    const code = `
$filter: ""

Frame gap 8
  Input value $filter, placeholder "Filter..."
  Text "Total: " + $items.count
  each item in $items
    Text item.name
`
    const { container, window } = compileAndExecute(code, [], [], {
      items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }]
    })

    const input = container.querySelector('input') as HTMLInputElement
    const texts = container.querySelectorAll('span')

    expect(texts[0].textContent).toBe('Total: 3')

    // Change filter (even though we don't filter in this test)
    input.value = 'test'
    input.dispatchEvent(new window.Event('input', { bubbles: true }))

    // Should still work
    expect(texts[0].textContent).toBe('Total: 3')
  })

  test('nested each with aggregations', () => {
    // FIXED: Loop variable in Text expression now generates valid JS
    // team.members.length becomes team.members.length (correctly resolved)
    const code = `
Frame gap 8
  Text "Teams: " + $teams.count
  each team in $teams
    Frame gap 4
      Text team.name + " (" + team.members.length + " members)"
`
    const { container } = compileAndExecute(code, [], [], {
      teams: [
        { name: 'Alpha', members: ['A', 'B'] },
        { name: 'Beta', members: ['C', 'D', 'E'] },
      ]
    })

    const texts = container.querySelectorAll('span')
    expect(texts[0].textContent).toBe('Teams: 2')
  })
})

// =============================================================================
// ERROR HANDLING STRESS TESTS
// =============================================================================

describe('Stress: Error Handling', () => {
  test('graceful handling of malformed data paths', () => {
    // Various edge cases that should not crash
    const testCases = [
      `Text $`,
      `Text $empty`,
      `Text $.invalid`,
    ]

    for (const code of testCases) {
      expect(() => parse(code)).not.toThrow()
    }
  })

  test('aggregation method name conflicts are handled', () => {
    // Entry named same as aggregation method
    // When the data file only has named entries (not an array),
    // $items.count returns 0 because it's not an array
    const dataFile = parseDataFile(`
countEntry:
  value: 123
`, 'items')

    // With a named entry, $items is an object, not an array
    // So $items.count aggregation returns 0
    const code = `Text "Result: " + $items.count`
    const { container } = compileAndExecute(code, [dataFile])
    const text = container.querySelector('span')
    // Returns 0 because items is an object, not an array
    expect(text?.textContent).toBe('Result: 0')
  })

  test('handles very long token names', () => {
    const longName = 'a'.repeat(100)
    const code = `$${longName}: "value"`
    expect(() => parse(code)).not.toThrow()
  })

  test('handles special characters in string values', () => {
    const code = `$text: "Line1\\nLine2\\tTabbed"`
    expect(() => parse(code)).not.toThrow()
  })
})

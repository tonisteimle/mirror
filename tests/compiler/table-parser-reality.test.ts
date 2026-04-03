/**
 * Table Parser Reality Check
 *
 * Diese Tests prüfen, was der Parser TATSÄCHLICH mit Table-Syntax macht.
 * Ziel: Gaps in der Implementierung aufdecken.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { isZagComponent, isInstance } from '../../compiler/parser/ast'

describe('Table - Parser Reality Check', () => {
  describe('Basic Table Parsing', () => {
    it('parses "Table" - requires data source', () => {
      const ast = parse(`Table`)

      // Table requires a data source ($collection), so this should error
      expect(ast.errors).toHaveLength(1)
      expect(ast.errors[0].message).toContain('data source')
    })

    it('parses "Table $tasks" - is $tasks recognized?', () => {
      const ast = parse(`Table $tasks`)

      expect(ast.errors).toHaveLength(0)

      const table = ast.instances[0]
      console.log('Table with $tasks:', JSON.stringify(table, null, 2))

      // Check if $tasks is a property or something else
      const hasDataSource = table.properties.some(
        (p) => p.name === 'dataSource' || p.values.some((v) => String(v).includes('tasks'))
      )
      console.log('Has dataSource property?:', hasDataSource)
    })

    it('parses "Table $tasks where done == false" - is where recognized?', () => {
      const ast = parse(`Table $tasks where done == false`)

      console.log('Errors:', ast.errors)
      console.log('AST:', JSON.stringify(ast.instances[0], null, 2))

      // Document what happens with "where"
      const table = ast.instances[0]
      if (table) {
        const whereProperty = table.properties.find((p) => p.name === 'where')
        console.log('where as property?:', whereProperty)
      }
    })

    it('parses "Table $tasks by priority desc" - is by recognized?', () => {
      const ast = parse(`Table $tasks by priority desc`)

      console.log('Errors:', ast.errors)
      console.log('AST:', JSON.stringify(ast.instances[0], null, 2))

      const table = ast.instances[0]
      if (table) {
        const byProperty = table.properties.find((p) => p.name === 'by')
        console.log('by as property?:', byProperty)
      }
    })

    it('parses "Table $tasks grouped by status" - is grouped by recognized?', () => {
      const ast = parse(`Table $tasks grouped by status`)

      console.log('Errors:', ast.errors)
      console.log('AST:', JSON.stringify(ast.instances[0], null, 2))
    })
  })

  describe('Table with Slots', () => {
    it('parses Table with Column slot', () => {
      const ast = parse(`
Table $tasks
  Column titel, w 250
`)

      console.log('Errors:', ast.errors)
      console.log('Table children:', JSON.stringify(ast.instances[0]?.children, null, 2))

      const table = ast.instances[0]
      expect(table).toBeDefined()

      // Check if Column is recognized as child
      const columnChild = table?.children?.find(
        (c: any) => c.component === 'Column' || c.type === 'Column'
      )
      console.log('Column child:', columnChild)
    })

    it('parses Table with Header slot', () => {
      const ast = parse(`
Table $tasks
  Header:
    Text "Custom Header"
`)

      console.log('Errors:', ast.errors)
      console.log('Table:', JSON.stringify(ast.instances[0], null, 2))
    })

    it('parses Table with select() function', () => {
      const ast = parse(`Table $tasks, select()`)

      console.log('Errors:', ast.errors)
      const table = ast.instances[0]
      console.log('Properties:', table?.properties)
      console.log('Events:', table?.events)

      // Is select() recognized as event/action?
      const selectEvent = table?.events?.find((e: any) => e.action === 'select')
      console.log('select event?:', selectEvent)
    })
  })

  describe('Data Definition & Table', () => {
    it('parses inline data and Table together', () => {
      const ast = parse(`
$tasks: [
  { titel: "Review", effort: 8 }
]

Table $tasks
`)

      console.log('Errors:', ast.errors)
      console.log('Tokens:', ast.tokens?.map((t) => ({ name: t.name, value: t.value })))
      console.log('Instances:', ast.instances?.length)

      // Check if $tasks token exists
      const tasksToken = ast.tokens?.find((t) => t.name === '$tasks' || t.name === 'tasks')
      console.log('$tasks token:', tasksToken)
    })

    it('parses data from .data syntax', () => {
      const ast = parse(`
.data tasks

task1:
  titel: "Review"
  effort: 8

---

Table $tasks
`)

      console.log('Errors:', ast.errors)
      console.log('Data sections:', (ast as any).dataSections)
    })
  })

  describe('Column Properties', () => {
    it('parses Column with all properties', () => {
      const ast = parse(`
Table $tasks
  Column titel, w 250, sortable
  Column effort, suffix "h", align right
  Column done, hidden
`)

      console.log('Errors:', ast.errors)
      const table = ast.instances[0]
      console.log('Children:', JSON.stringify(table?.children, null, 2))
    })

    it('parses Column with custom Cell', () => {
      const ast = parse(`
Table $tasks
  Column assignee
    Cell:
      Frame hor, gap 8
        Avatar row.assignee
        Text row.assignee.name
`)

      console.log('Errors:', ast.errors)
      const table = ast.instances[0]
      console.log('Column children:', JSON.stringify(table?.children, null, 2))
    })
  })
})

describe('Table - What We NEED vs What We HAVE', () => {
  it('documents the gap between plan and reality', () => {
    // This test documents the expected vs actual behavior

    const syntaxExamples = [
      { input: 'Table $tasks', expected: 'TableNode with dataSource=$tasks' },
      { input: 'Table $tasks where done == false', expected: 'TableNode with filter expression' },
      { input: 'Table $tasks by priority desc', expected: 'TableNode with orderBy + orderDesc' },
      { input: 'Table $tasks grouped by status', expected: 'TableNode with groupBy' },
      { input: 'Table $tasks, select()', expected: 'TableNode with selectionMode=single' },
      { input: 'Table $tasks, select(multi)', expected: 'TableNode with selectionMode=multi' },
    ]

    for (const example of syntaxExamples) {
      const ast = parse(example.input)
      const table = ast.instances[0]

      console.log(`\n--- ${example.input} ---`)
      console.log('Expected:', example.expected)
      console.log('Actual type:', table?.type)
      console.log('Actual component:', table?.component)
      console.log(
        'Properties:',
        table?.properties?.map((p) => `${p.name}=${p.values}`)
      )
      console.log('Errors:', ast.errors.length > 0 ? ast.errors : 'none')
    }

    // This test always passes - it's for documentation
    expect(true).toBe(true)
  })
})

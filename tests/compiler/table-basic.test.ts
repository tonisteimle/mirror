/**
 * Table Component Basic Tests
 *
 * Tests for the Table component as a simple UI primitive.
 * No type inference, no schema registry - just data display.
 */

import { describe, it, expect } from 'vitest'
import { compile } from '../../compiler'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

describe('Table: Basic Usage', () => {
  describe('Parser', () => {
    it('parses Table with data source', () => {
      const code = `Table $tasks`
      const ast = parse(code)

      const table = ast.instances.find(c => c.type === 'Table')
      expect(table).toBeDefined()
      expect(table?.dataSource).toBe('$tasks')
    })

    it('parses Table with Row: slot', () => {
      const code = `
Table $tasks
  Row:
    Text row.title
`
      const ast = parse(code)
      const table = ast.instances.find(c => c.type === 'Table')

      expect(table).toBeDefined()
      expect(table?.rowSlot).toBeDefined()
      expect(table?.rowSlot?.children.length).toBe(1)
    })

    it('parses Table with multiple Row children', () => {
      const code = `
Table $tasks
  Row:
    Text row.title
    Text row.status
    Button "Edit"
`
      const ast = parse(code)
      const table = ast.instances.find(c => c.type === 'Table')

      expect(table?.rowSlot?.children.length).toBe(3)
    })
  })

  describe('IR Transformation', () => {
    it('transforms Table to IRTable', () => {
      const code = `Table $tasks`
      const ast = parse(code)
      const ir = toIR(ast)

      const tableNode = ir.nodes.find(c => (c as any).isTableComponent)
      expect(tableNode).toBeDefined()
      expect((tableNode as any).dataSource).toBe('tasks')
    })

    it('transforms Row: slot children', () => {
      const code = `
Table $tasks
  Row:
    Text row.title
`
      const ast = parse(code)
      const ir = toIR(ast)

      const tableNode = ir.nodes.find(c => (c as any).isTableComponent) as any
      expect(tableNode.rowSlot).toBeDefined()
      expect(tableNode.rowSlot.length).toBe(1)
    })
  })

  describe('DOM Backend', () => {
    it('generates table container', () => {
      const code = `
$tasks: [{ title: "Task 1" }]
Table $tasks
`
      const js = compile(code)

      expect(js).toContain('mirror-table')
    })

    it('generates forEach for rows', () => {
      const code = `
$tasks: [{ title: "Task 1" }]
Table $tasks
  Row:
    Text row.title
`
      const js = compile(code)

      expect(js).toContain('.forEach')
      expect(js).toContain('row')
    })

    it('generates row.field access', () => {
      const code = `
$tasks: [{ title: "Task 1", status: "open" }]
Table $tasks
  Row:
    Text row.title
    Text row.status
`
      const js = compile(code)

      expect(js).toContain('row.title')
      expect(js).toContain('row.status')
    })
  })
})

describe('Table: Editable Rows', () => {
  it('supports Input with row.field binding', () => {
    const code = `
$tasks: [{ title: "Task 1" }]
Table $tasks
  Row:
    Input value row.title
`
    const js = compile(code)

    expect(js).toContain('row.title')
  })

  it('supports mixed read and edit fields', () => {
    const code = `
$tasks: [{ title: "Task", status: "open" }]
Table $tasks
  Row:
    Text row.status, col #888
    Input value row.title
`
    const js = compile(code)

    expect(js).toContain('row.status')
    expect(js).toContain('row.title')
  })
})

describe('Table: Styling', () => {
  it('supports row styling', () => {
    const code = `
$tasks: [{ title: "Task" }]
Table $tasks
  Row: pad 12, bg #1a1a1a
    Text row.title
`
    const js = compile(code)

    expect(js).toContain('padding')
    expect(js).toContain('background')
  })
})

/**
 * Table Editable Tests
 *
 * Tests for editable table rows using Row: template slot
 * Each row acts like a form with two-way binding
 */

import { describe, it, expect } from 'vitest'
import { compile } from '../../compiler'
import { parse } from '../../compiler/parser'

describe('Table: Editable Row Template', () => {
  describe('Parser: Row slot with loop variables', () => {
    it('recognizes row as loop variable in Row: slot', () => {
      const code = `
Table $tasks
  Row:
    Input value row.title
`
      const ast = parse(code)
      // Table is in instances array
      const table = ast.instances.find(c => c.type === 'Table')

      expect(table).toBeDefined()
      expect(table.rowSlot).toBeDefined()
      expect(table.rowSlot.children.length).toBe(1)

      // The Input should have a value property with loopVar reference
      const inputChild = table.rowSlot.children[0]
      expect(inputChild.component).toBe('Input')

      const valueProp = inputChild.properties.find(p => p.name === 'value')
      expect(valueProp).toBeDefined()
      expect(valueProp.values[0]).toEqual({ kind: 'loopVar', name: 'row.title' })
    })

    it('supports Text with row.field reference', () => {
      const code = `
Table $tasks
  Row:
    Text row.title
`
      const ast = parse(code)
      const table = ast.instances.find(c => c.type === 'Table')
      const textChild = table.rowSlot.children[0]

      // Text row.title creates a content property with loopVar reference
      const contentProp = textChild.properties.find(p => p.name === 'content')
      expect(contentProp).toBeDefined()
      expect(contentProp.values[0]).toEqual({ kind: 'loopVar', name: 'row.title' })
    })
  })

  describe('DOM Backend: Row template rendering', () => {
    it('generates row template code for simple text', () => {
      const code = `
$tasks: [{ title: "Task 1" }]

Table $tasks
  Row:
    Text row.title
`
      const js = compile(code)

      // Should have forEach with row variable
      expect(js).toContain('.forEach((row, index)')
      // Should access row.title
      expect(js).toContain('row.title')
    })

    it('generates two-way binding for Input in row template', () => {
      const code = `
$tasks: [{ title: "Task 1" }]

Table $tasks
  Row:
    Input value row.title
`
      const js = compile(code)

      // Should have input event listener that updates the data
      expect(js).toContain("addEventListener('input'")
    })

    it('generates nested elements in row template', () => {
      const code = `
$tasks: [{ title: "Task 1", done: false }]

Table $tasks
  Row:
    Frame hor, gap 8
      Input value row.title
`
      const js = compile(code)

      // Should have frame structure
      expect(js).toContain('.forEach((row, index)')
      expect(js).toContain('row.title')
    })
  })

  describe('Full editable table example', () => {
    it('compiles a complete editable table', () => {
      const code = `
$tasks: [
  { title: "Design Review", status: "todo" },
  { title: "Code Review", status: "doing" }
]

Table $tasks
  Row:
    Frame hor, gap 12, pad 8
      Input value row.title, w 200
      Text row.status
`
      const js = compile(code)

      // Basic structure
      expect(js).toContain('mirror-table')
      expect(js).toContain('.forEach((row, index)')

      // Input with two-way binding
      expect(js).toContain("addEventListener('input'")

      // Text displaying status
      expect(js).toContain('row.status')
    })
  })
})

import { describe, it, expect } from 'vitest'
import { parse, toIR, compile } from '../../../dist/index.js'

describe('Static/Manual Tables', () => {
  describe('Parsing', () => {
    it('should parse a simple static table with inline cells', () => {
      const code = `
Table
  Row "Name", "Alter", "Stadt"
  Row "Max", "25", "Berlin"
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.instances).toHaveLength(1)

      const table = ast.instances[0] as any
      expect(table.type).toBe('Table')
      expect(table.staticRows).toHaveLength(2)

      // First row (header)
      expect(table.staticRows[0].cells).toHaveLength(3)
      expect(table.staticRows[0].cells[0].text).toBe('Name')
      expect(table.staticRows[0].cells[1].text).toBe('Alter')
      expect(table.staticRows[0].cells[2].text).toBe('Stadt')

      // Second row (data)
      expect(table.staticRows[1].cells).toHaveLength(3)
      expect(table.staticRows[1].cells[0].text).toBe('Max')
      expect(table.staticRows[1].cells[1].text).toBe('25')
      expect(table.staticRows[1].cells[2].text).toBe('Berlin')
    })

    it('should parse a static table with numeric values', () => {
      const code = `
Table
  Row "ID", "Wert"
  Row 1, 100
  Row 2, 200
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const table = ast.instances[0] as any
      expect(table.staticRows).toHaveLength(3)

      // Second row with numbers
      expect(table.staticRows[1].cells[0].text).toBe('1')
      expect(table.staticRows[1].cells[1].text).toBe('100')
    })
  })

  describe('IR Transformation', () => {
    it('should transform static table to IR', () => {
      const code = `
Table
  Row "A", "B"
  Row "1", "2"
`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes).toHaveLength(1)
      const table = ir.nodes[0] as any

      expect(table.isTableComponent).toBe(true)
      expect(table.dataSource).toBeUndefined()
      expect(table.staticRows).toHaveLength(2)

      expect(table.staticRows[0].cells[0].text).toBe('A')
      expect(table.staticRows[0].cells[1].text).toBe('B')
    })
  })

  describe('Code Generation', () => {
    it('should generate DOM code for static table', () => {
      const code = `
Table
  Row "Name", "Alter"
  Row "Max", "25"
`
      const result = compile(code, { target: 'dom' })
      const output = result as string

      // Should contain table elements
      expect(output).toContain('mirror-table')
      expect(output).toContain('mirror-table-body')
      expect(output).toContain('mirror-table-row')
      expect(output).toContain('mirror-table-cell')

      // Should contain cell content
      expect(output).toContain('"Name"')
      expect(output).toContain('"Alter"')
      expect(output).toContain('"Max"')
      expect(output).toContain('"25"')
    })

    it('should not include data binding for static tables', () => {
      const code = `
Table
  Row "A", "B"
`
      const result = compile(code, { target: 'dom' })
      const output = result as string

      // Should have static rows comment
      expect(output).toContain('Static table rows')
      // Should NOT have dynamic data-driven row template
      expect(output).not.toContain('rowTemplate')
    })
  })

  describe('Mixed Tables', () => {
    it('should still support data-driven tables', () => {
      const code = `
$items:
  a:
    name: "Item A"
  b:
    name: "Item B"

Table $items
  Row:
    Text row.name
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const table = ast.instances[0] as any
      expect(table.type).toBe('Table')
      // dataSource keeps $ prefix in AST
      expect(table.dataSource).toBe('$items')
      expect(table.staticRows).toBeUndefined()
    })
  })
})

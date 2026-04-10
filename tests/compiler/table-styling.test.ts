/**
 * Table Styling Tests
 *
 * Tests that Table components can be fully styled:
 * - Table-level styles (bg, pad, rad)
 * - Header styles
 * - Row styles with zebra striping
 * - Column/cell styles
 * - Footer styles
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

// Helper to get style value from IR node
function getStyle(node: any, property: string): string | undefined {
  if (!node?.styles) return undefined
  const matches = node.styles.filter((s: any) => s.property === property)
  return matches.length > 0 ? matches[matches.length - 1].value : undefined
}

describe('Table Styling', () => {
  describe('Table-level styles', () => {
    it('should apply bg, pad, rad to Table', () => {
      const code = `
tasks:
  t1:
    title: "Task 1"

Table $tasks, bg #1a1a1a, pad 16, rad 12
  Column title
`
      const ir = toIR(parse(code))
      const tableNode = ir.nodes[0]

      expect(getStyle(tableNode, 'background')).toBe('#1a1a1a')
      expect(getStyle(tableNode, 'padding')).toBe('16px')
      expect(getStyle(tableNode, 'border-radius')).toBe('12px')
    })
  })

  describe('Header styles', () => {
    it('should apply Header: slot styles', () => {
      const code = `
tasks:
  t1:
    title: "Task 1"

Table $tasks
  Header: bg #252525, pad 12
  Column title
`
      const ir = toIR(parse(code))
      const tableNode = ir.nodes[0] as any

      expect(tableNode.headerSlotStyles).toBeDefined()
      expect(tableNode.headerSlotStyles.length).toBeGreaterThan(0)

      const bgStyle = tableNode.headerSlotStyles.find((s: any) => s.property === 'background')
      expect(bgStyle?.value).toBe('#252525')
    })
  })

  describe('Row styles', () => {
    it('should apply Row: slot styles', () => {
      const code = `
tasks:
  t1:
    title: "Task 1"

Table $tasks
  Row: bg #1a1a1a, pad 8
  Column title
`
      const ir = toIR(parse(code))
      const tableNode = ir.nodes[0] as any

      expect(tableNode.rowSlotStyles).toBeDefined()
      expect(tableNode.rowSlotStyles.length).toBeGreaterThan(0)

      const bgStyle = tableNode.rowSlotStyles.find((s: any) => s.property === 'background')
      expect(bgStyle?.value).toBe('#1a1a1a')
    })

    it('should apply zebra striping with RowOdd and RowEven', () => {
      const code = `
tasks:
  t1:
    title: "Task 1"
  t2:
    title: "Task 2"

Table $tasks
  RowOdd: bg #1f1f1f
  RowEven: bg #151515
  Column title
`
      const ir = toIR(parse(code))
      const tableNode = ir.nodes[0] as any

      // Check rowOddStyles
      expect(tableNode.rowOddStyles).toBeDefined()
      expect(tableNode.rowOddStyles.length).toBeGreaterThan(0)
      const oddBg = tableNode.rowOddStyles.find((s: any) => s.property === 'background')
      expect(oddBg?.value).toBe('#1f1f1f')

      // Check rowEvenStyles
      expect(tableNode.rowEvenStyles).toBeDefined()
      expect(tableNode.rowEvenStyles.length).toBeGreaterThan(0)
      const evenBg = tableNode.rowEvenStyles.find((s: any) => s.property === 'background')
      expect(evenBg?.value).toBe('#151515')
    })
  })

  describe('Column cell styles', () => {
    it('should apply cell styles from Column definition', () => {
      const code = `
tasks:
  t1:
    title: "Task 1"
    status: "done"

Table $tasks
  Column title, bg #333, col white
  Column status
`
      const ir = toIR(parse(code))
      const tableNode = ir.nodes[0] as any

      expect(tableNode.columns[0].cellStyles).toBeDefined()
      expect(tableNode.columns[0].cellStyles?.length).toBeGreaterThan(0)

      const bgStyle = tableNode.columns[0].cellStyles.find((s: any) => s.property === 'background')
      expect(bgStyle?.value).toBe('#333')
    })
  })

  describe('Footer styles', () => {
    it('should apply Footer: slot styles', () => {
      const code = `
tasks:
  t1:
    title: "Task 1"
    effort: 5

Table $tasks
  Footer: bg #0a0a0a, pad 16
  Column title
  Column effort, sum
`
      const ir = toIR(parse(code))
      const tableNode = ir.nodes[0] as any

      expect(tableNode.footerSlotStyles).toBeDefined()
      expect(tableNode.footerSlotStyles.length).toBeGreaterThan(0)

      const bgStyle = tableNode.footerSlotStyles.find((s: any) => s.property === 'background')
      expect(bgStyle?.value).toBe('#0a0a0a')
    })
  })

  describe('Combined styling', () => {
    it('should apply all levels of styling together', () => {
      const code = `
tasks:
  t1:
    title: "Design"
    status: "done"
  t2:
    title: "Dev"
    status: "wip"

Table $tasks, bg #111, rad 8
  Header: bg #222, pad 12
  Row: pad 10, gap 8
  RowOdd: bg #1a1a1a
  RowEven: bg #151515
  Footer: bg #222
  Column title, col white
  Column status, col #888
`
      const ir = toIR(parse(code))
      const tableNode = ir.nodes[0] as any

      // Table-level
      expect(getStyle(tableNode, 'border-radius')).toBe('8px')

      // Zebra
      expect(tableNode.rowOddStyles).toBeDefined()
      expect(tableNode.rowEvenStyles).toBeDefined()

      // Column cell styles
      expect(tableNode.columns[0].cellStyles).toBeDefined()
    })
  })
})

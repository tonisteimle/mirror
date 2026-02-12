/**
 * Grid Layout Tests
 *
 * Tests for grid layout syntax:
 * - grid N (equal columns)
 * - grid 20% 80% (percentage widths)
 * - grid auto 250 (auto-fill)
 * - grid N rows H1 H2 (with row heights)
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'
import { propertiesToStyle } from '../../utils/style-converter'
import { tokenize } from '../../parser/lexer'

// Helper to filter out warnings from errors array
function getErrors(result: ReturnType<typeof parse>) {
  return (result.errors || []).filter(
    (e: string) => !e.startsWith('Warning:')
  )
}

describe('Grid Layout', () => {
  describe('Lexer - Percentage Values', () => {
    it('tokenizes percentage values', () => {
      const tokens = tokenize('grid 20% 80%')
      expect(tokens[0]).toMatchObject({ type: 'PROPERTY', value: 'grid' })
      expect(tokens[1]).toMatchObject({ type: 'NUMBER', value: '20%' })
      expect(tokens[2]).toMatchObject({ type: 'NUMBER', value: '80%' })
    })

    it('tokenizes decimal percentages', () => {
      const tokens = tokenize('grid 33.33%')
      expect(tokens[1]).toMatchObject({ type: 'NUMBER', value: '33.33%' })
    })
  })

  describe('Parser - Grid Property', () => {
    it('parses grid with column count', () => {
      const result = parse('Container grid 4 gap 16')
      expect(getErrors(result)).toHaveLength(0)
      expect(result.nodes[0].properties.grid).toBe('4')
      expect(result.nodes[0].properties.gap).toBe(16)
    })

    it('parses grid with percentages', () => {
      const result = parse('Container grid 20% 80%')
      expect(getErrors(result)).toHaveLength(0)
      expect(result.nodes[0].properties.grid).toBe('20% 80%')
    })

    it('parses grid with pixel values', () => {
      const result = parse('Container grid 200 300 200')
      expect(getErrors(result)).toHaveLength(0)
      expect(result.nodes[0].properties.grid).toBe('200 300 200')
    })

    it('parses grid with mixed units', () => {
      const result = parse('Container grid 200 auto 30%')
      expect(getErrors(result)).toHaveLength(0)
      expect(result.nodes[0].properties.grid).toBe('200 auto 30%')
    })

    it('parses grid auto-fill', () => {
      const result = parse('Container grid auto 250 gap 16')
      expect(getErrors(result)).toHaveLength(0)
      expect(result.nodes[0].properties.grid).toBe('auto 250')
    })

    it('parses grid with rows', () => {
      const result = parse('Container grid 2 rows 100 200')
      expect(getErrors(result)).toHaveLength(0)
      expect(result.nodes[0].properties.grid).toBe('2')
      expect(result.nodes[0].properties.grid_rows).toBe('100 200')
    })

    it('parses grid with percentage rows', () => {
      const result = parse('Container grid 3 rows 30% 40% 30%')
      expect(getErrors(result)).toHaveLength(0)
      expect(result.nodes[0].properties.grid_rows).toBe('30% 40% 30%')
    })

    it('parses grid with auto in rows', () => {
      const result = parse('Container grid 2 rows 100 auto 200')
      expect(getErrors(result)).toHaveLength(0)
      expect(result.nodes[0].properties.grid_rows).toBe('100 auto 200')
    })
  })

  describe('Style Converter - Grid', () => {
    it('converts column count to repeat()', () => {
      const style = propertiesToStyle({ grid: '4' }, true)
      expect(style.display).toBe('grid')
      expect(style.gridTemplateColumns).toBe('repeat(4, 1fr)')
    })

    it('converts percentages to grid-template-columns', () => {
      const style = propertiesToStyle({ grid: '20% 80%' }, true)
      expect(style.display).toBe('grid')
      expect(style.gridTemplateColumns).toBe('20% 80%')
    })

    it('converts pixel values with px suffix', () => {
      const style = propertiesToStyle({ grid: '200 300' }, true)
      expect(style.gridTemplateColumns).toBe('200px 300px')
    })

    it('converts auto-fill to repeat(auto-fill, minmax())', () => {
      const style = propertiesToStyle({ grid: 'auto 250' }, true)
      expect(style.gridTemplateColumns).toBe('repeat(auto-fill, minmax(250px, 1fr))')
    })

    it('converts auto-fill with percentage', () => {
      const style = propertiesToStyle({ grid: 'auto 25%' }, true)
      expect(style.gridTemplateColumns).toBe('repeat(auto-fill, minmax(25%, 1fr))')
    })

    it('converts mixed units correctly', () => {
      const style = propertiesToStyle({ grid: '200 auto 30%' }, true)
      expect(style.gridTemplateColumns).toBe('200px auto 30%')
    })

    it('converts grid_rows to grid-template-rows', () => {
      const style = propertiesToStyle({ grid: '2', grid_rows: '100 200' }, true)
      expect(style.gridTemplateRows).toBe('100px 200px')
    })

    it('preserves auto in rows', () => {
      const style = propertiesToStyle({ grid_rows: '100 auto 200' }, true)
      expect(style.gridTemplateRows).toBe('100px auto 200px')
    })

    it('preserves percentage in rows', () => {
      const style = propertiesToStyle({ grid_rows: '30% 40% 30%' }, true)
      expect(style.gridTemplateRows).toBe('30% 40% 30%')
    })

    it('includes gap', () => {
      const style = propertiesToStyle({ grid: '3', gap: 16 }, true)
      expect(style.gap).toBe('16px')
    })
  })

  describe('Full Integration', () => {
    it('parses and converts complete grid layout', () => {
      // When widths are specified, column count is inferred (no need for explicit count)
      const result = parse('Container grid 20% 20% 20% 40% gap 16')
      expect(getErrors(result)).toHaveLength(0)

      const style = propertiesToStyle(result.nodes[0].properties, true)
      expect(style.display).toBe('grid')
      expect(style.gridTemplateColumns).toBe('20% 20% 20% 40%')
      expect(style.gap).toBe('16px')
    })

    it('handles grid with children', () => {
      const input = `
Container grid 3 gap 16
  Card "A"
  Card "B"
  Card "C"
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)
      expect(result.nodes[0].properties.grid).toBe('3')
      expect(result.nodes[0].children).toHaveLength(3)
    })
  })
})

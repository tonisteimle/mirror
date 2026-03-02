/**
 * Tests for CSS pseudo-element parsing (::placeholder, ::selection, etc.)
 */
import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

describe('Pseudo-element parsing', () => {
  describe('placeholder pseudo-element', () => {
    it('should parse placeholder block with color', () => {
      const code = `
Input "E-Mail..."
  placeholder
    color #666
`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)
      expect(result.nodes).toHaveLength(1)

      const input = result.nodes[0]
      expect(input.name).toBe('Input')
      expect(input.pseudoElements).toBeDefined()
      expect(input.pseudoElements).toHaveLength(1)
      expect(input.pseudoElements![0].name).toBe('placeholder')
      expect(input.pseudoElements![0].properties).toEqual({ color: '#666' })
    })

    it('should parse placeholder with multiple properties', () => {
      const code = `
Input "Suchen..."
  placeholder
    color #888
    italic
    font-size 12
    opacity 0.7
`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const input = result.nodes[0]
      expect(input.pseudoElements).toHaveLength(1)
      expect(input.pseudoElements![0].properties).toEqual({
        color: '#888',
        italic: true,
        'font-size': 12,
        opacity: 0.7
      })
    })

    it('should work with Textarea as well', () => {
      const code = `
Textarea "Beschreibung..."
  placeholder
    color #555
    weight 300
`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const textarea = result.nodes[0]
      expect(textarea.name).toBe('Textarea')
      expect(textarea.pseudoElements).toHaveLength(1)
      expect(textarea.pseudoElements![0].name).toBe('placeholder')
    })

    it('should coexist with states', () => {
      const code = `
Input "E-Mail..."
  placeholder
    color #666
  hover
    border-color #3B82F6
`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const input = result.nodes[0]
      expect(input.pseudoElements).toHaveLength(1)
      expect(input.states).toHaveLength(1)
      expect(input.states![0].name).toBe('hover')
    })
  })

  describe('selection pseudo-element', () => {
    it('should parse selection block', () => {
      const code = `
Text "Wähle mich aus"
  selection
    background #3B82F6
    color white
`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const text = result.nodes[0]
      expect(text.pseudoElements).toBeDefined()
      expect(text.pseudoElements).toHaveLength(1)
      expect(text.pseudoElements![0].name).toBe('selection')
      expect(text.pseudoElements![0].properties).toEqual({
        background: '#3B82F6',
        color: 'white'
      })
    })
  })

  describe('multiple pseudo-elements', () => {
    it('should support multiple pseudo-elements on one component', () => {
      const code = `
Input "Test"
  placeholder
    color #666
  selection
    background #3B82F6
`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const input = result.nodes[0]
      expect(input.pseudoElements).toHaveLength(2)
      expect(input.pseudoElements![0].name).toBe('placeholder')
      expect(input.pseudoElements![1].name).toBe('selection')
    })
  })
})

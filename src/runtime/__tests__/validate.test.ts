/**
 * Tests for M.validate()
 */

import { M } from '../mirror-runtime'

describe('M.validate()', () => {

  describe('Valid nodes', () => {

    test('Simple Box', () => {
      const node = M('Box', { bg: '#1a1a23', pad: 16 })
      const result = M.validate(node)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('Box with children', () => {
      const node = M('Box', { gap: 16 }, [
        M('Text', 'Hello', { weight: 'bold' }),
        M('Text', 'World', { col: '#888' })
      ])
      const result = M.validate(node)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('Button with states', () => {
      const node = M('Button', 'Click', {
        bg: '#3B82F6',
        states: {
          hover: { bg: '#2563EB' },
          active: { bg: '#1D4ED8' }
        }
      })
      const result = M.validate(node)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('M.each()', () => {
      const node = M.each('task', 'tasks', [
        M('Box', { pad: 8 }, [
          M('Text', '$task.title')
        ])
      ])
      const result = M.validate(node)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('M.if()', () => {
      const node = M.if('isLoggedIn', [
        M('Text', 'Welcome')
      ], [
        M('Button', 'Login')
      ])
      const result = M.validate(node)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('Custom component (PascalCase)', () => {
      const node = M('MyCustomCard', { bg: '#333' }, [
        M('Text', 'Content')
      ])
      const result = M.validate(node)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('All layout properties', () => {
      const node = M('Box', {
        hor: true,
        gap: 16,
        spread: true,
        wrap: true,
        center: true
      })
      const result = M.validate(node)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('Icon with size', () => {
      const node = M('Icon', 'home', { is: 24, col: '#888' })
      const result = M.validate(node)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('Keyboard events', () => {
      const node = M('Box', {
        'onkeydown escape': 'close',
        'onkeydown arrow-down': 'highlight next'
      })
      const result = M.validate(node)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

  })

  describe('Invalid structure', () => {

    test('null node', () => {
      const result = M.validate(null as any)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].type).toBe('invalid_structure')
    })

    test('Node without type', () => {
      const node = { props: {}, children: [] } as any
      const result = M.validate(node)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('type'))).toBe(true)
    })

    test('Children not an array', () => {
      const node = {
        type: 'Box',
        props: {},
        children: 'not an array',
        slots: {}
      } as any
      const result = M.validate(node)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('children'))).toBe(true)
    })

    test('States with invalid value', () => {
      const node = M('Box', {
        states: {
          hover: 'not an object' as any
        }
      })
      const result = M.validate(node)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === 'invalid_value')).toBe(true)
    })

  })

  describe('Warnings', () => {

    test('Unknown property', () => {
      const node = M('Box', {
        unknownProp: 'value',
        bg: '#333'
      } as any)
      const result = M.validate(node)

      expect(result.valid).toBe(true) // Warnings don't make it invalid
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0].type).toBe('unknown_property')
      expect(result.warnings[0].message).toContain('unknownProp')
    })

    test('Unknown primitive type (lowercase)', () => {
      const node = {
        type: 'unknownprimitive',
        props: {},
        children: [],
        slots: {}
      } as any
      const result = M.validate(node)

      expect(result.valid).toBe(true)
      expect(result.warnings.some(w => w.message.includes('Unknown component'))).toBe(true)
    })

  })

  describe('Array of nodes', () => {

    test('Valid array', () => {
      const nodes = [
        M('Box', { bg: '#333' }),
        M('Text', 'Hello'),
        M('Button', 'Click')
      ]
      const result = M.validate(nodes)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('Array with invalid node', () => {
      const nodes = [
        M('Box', { bg: '#333' }),
        null as any,
        M('Button', 'Click')
      ]
      const result = M.validate(nodes)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.path.includes('[1]'))).toBe(true)
    })

  })

  describe('Nested validation', () => {

    test('Error in deeply nested child', () => {
      const node = M('Box', {}, [
        M('Box', {}, [
          M('Box', {}, [
            { type: 'Text', children: 'not an array' } as any
          ])
        ])
      ])
      const result = M.validate(node)

      expect(result.valid).toBe(false)
      expect(result.errors[0].path).toContain('children')
    })

  })

})

/**
 * Tests for M.correct() - LLM output correction/normalization
 */

import { M } from '../mirror-runtime'

describe('M.correct()', () => {

  describe('Property renaming', () => {

    test('color → col', () => {
      const node = M('Text', 'Hello', { color: '#fff' } as any)
      const result = M.correct(node)

      expect(result.node.props.col).toBe('#fff')
      expect((result.node.props as any).color).toBeUndefined()
      expect(result.corrections.length).toBe(1)
      expect(result.corrections[0].type).toBe('property_renamed')
    })

    test('background-color → bg', () => {
      const node = M('Box', { 'background-color': '#333' } as any)
      const result = M.correct(node)

      expect(result.node.props.bg).toBe('#333')
      expect(result.corrections[0].original).toBe('background-color')
    })

    test('fontSize → font-size', () => {
      const node = M('Text', 'Hi', { fontSize: 16 } as any)
      const result = M.correct(node)

      expect(result.node.props['font-size']).toBe(16)
    })

    test('borderRadius → rad', () => {
      const node = M('Box', { borderRadius: 8 } as any)
      const result = M.correct(node)

      expect(result.node.props.rad).toBe(8)
    })

    test('padding → pad', () => {
      const node = M('Box', { padding: 16 } as any)
      const result = M.correct(node)

      expect(result.node.props.pad).toBe(16)
    })

    test('fontWeight → weight', () => {
      const node = M('Text', 'Bold', { fontWeight: 'bold' } as any)
      const result = M.correct(node)

      expect(result.node.props.weight).toBe('bold')
    })

    test('boxShadow → shadow', () => {
      const node = M('Box', { boxShadow: 'lg' } as any)
      const result = M.correct(node)

      expect(result.node.props.shadow).toBe('lg')
    })

    test('zIndex → z', () => {
      const node = M('Box', { zIndex: 100 } as any)
      const result = M.correct(node)

      expect(result.node.props.z).toBe(100)
    })

  })

  describe('Icon size correction', () => {

    test('size → is for Icon', () => {
      const node = M('Icon', 'home', { size: 24 } as any)
      const result = M.correct(node)

      expect(result.node.props.is).toBe(24)
      expect((result.node.props as any).size).toBeUndefined()
    })

    test('size → w,h for non-Icon', () => {
      const node = M('Box', { size: 50 } as any)
      const result = M.correct(node)

      expect(result.node.props.w).toBe(50)
      expect(result.node.props.h).toBe(50)
    })

  })

  describe('Property removal', () => {

    test('removes display property', () => {
      const node = M('Box', { display: 'flex', bg: '#333' } as any)
      const result = M.correct(node)

      expect((result.node.props as any).display).toBeUndefined()
      expect(result.node.props.bg).toBe('#333')
      expect(result.corrections.some(c => c.type === 'property_removed')).toBe(true)
    })

    test('removes flex property', () => {
      const node = M('Box', { flex: 1 } as any)
      const result = M.correct(node)

      expect((result.node.props as any).flex).toBeUndefined()
    })

    test('removes position property', () => {
      const node = M('Box', { position: 'relative' } as any)
      const result = M.correct(node)

      expect((result.node.props as any).position).toBeUndefined()
    })

  })

  describe('Style string extraction', () => {

    test('extracts width from style', () => {
      const node = M('Box', { style: 'width: 100px' } as any)
      const result = M.correct(node)

      expect(result.node.props.w).toBe(100)
      expect((result.node.props as any).style).toBeUndefined()
    })

    test('extracts background from style', () => {
      const node = M('Box', { style: 'background: #1a1a23' } as any)
      const result = M.correct(node)

      expect(result.node.props.bg).toBe('#1a1a23')
    })

    test('extracts multiple properties from style', () => {
      const node = M('Box', { style: 'width: 200px; height: 100px; gap: 16px' } as any)
      const result = M.correct(node)

      expect(result.node.props.w).toBe(200)
      expect(result.node.props.h).toBe(100)
      expect(result.node.props.gap).toBe(16)
    })

    test('converts 100% to full', () => {
      const node = M('Box', { style: 'width: 100%' } as any)
      const result = M.correct(node)

      expect(result.node.props.w).toBe('full')
    })

    test('extracts border-radius from style', () => {
      const node = M('Box', { style: 'border-radius: 8px' } as any)
      const result = M.correct(node)

      expect(result.node.props.rad).toBe(8)
    })

    test('converts flex-direction: row to hor', () => {
      const node = M('Box', { style: 'flex-direction: row' } as any)
      const result = M.correct(node)

      expect(result.node.props.hor).toBe(true)
    })

    test('converts justify-content + align-items center to center: true', () => {
      const node = M('Box', { style: 'justify-content: center; align-items: center' } as any)
      const result = M.correct(node)

      expect(result.node.props.center).toBe(true)
    })

    test('converts space-between to spread', () => {
      const node = M('Box', { style: 'justify-content: space-between' } as any)
      const result = M.correct(node)

      expect(result.node.props.spread).toBe(true)
    })

    test('warns about position: absolute', () => {
      const node = M('Box', { style: 'position: absolute; top: 0; left: 0' } as any)
      const result = M.correct(node)

      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.includes('position'))).toBe(true)
    })

  })

  describe('Recursive correction', () => {

    test('corrects nested children', () => {
      const node = M('Box', {}, [
        M('Text', 'Hello', { color: '#fff' } as any),
        M('Box', { backgroundColor: '#333' } as any, [
          M('Icon', 'home', { size: 20 } as any)
        ])
      ])
      const result = M.correct(node)

      // Check first child
      expect(result.node.children[0].props.col).toBe('#fff')

      // Check second child
      expect(result.node.children[1].props.bg).toBe('#333')

      // Check nested Icon
      expect(result.node.children[1].children[0].props.is).toBe(20)

      // Should have 3 corrections total
      expect(result.corrections.length).toBe(3)
    })

    test('corrects states', () => {
      const node = M('Button', 'Click', {
        bg: '#3B82F6',
        states: {
          hover: { backgroundColor: '#2563EB' } as any
        }
      })
      const result = M.correct(node)

      expect(result.node.props.states?.hover?.bg).toBe('#2563EB')
    })

  })

  describe('Value fixes', () => {

    test('flex: 1 → w: full', () => {
      const node = M('Box', { flex: 1 } as any)
      const result = M.correct(node)

      expect(result.node.props.w).toBe('full')
      expect(result.corrections.some(c => c.type === 'value_fixed')).toBe(true)
    })

  })

  describe('M.correctAndValidate()', () => {

    test('corrects and validates in one step', () => {
      const node = M('Box', { color: '#fff', backgroundColor: '#333' } as any, [
        M('Text', 'Hello')
      ])
      const result = M.correctAndValidate(node)

      expect(result.corrections.length).toBe(2)
      expect(result.validation.valid).toBe(true)
      expect(result.node).toBeDefined()
    })

    test('adds correction warnings to validation', () => {
      const node = M('Box', { style: 'position: absolute; top: 0' } as any)
      const result = M.correctAndValidate(node)

      expect(result.validation.warnings.some(w =>
        w.message.includes('position') || w.message.includes('absolute')
      )).toBe(true)
    })

  })

  describe('Edge cases', () => {

    test('handles empty props', () => {
      const node = M('Box', {})
      const result = M.correct(node)

      expect(result.corrections.length).toBe(0)
      expect(result.node.props).toEqual({})
    })

    test('handles array of nodes', () => {
      const nodes = [
        M('Box', { color: '#fff' } as any),
        M('Text', 'Hi', { fontSize: 14 } as any)
      ]
      const result = M.correct(nodes)

      expect(Array.isArray(result.node)).toBe(true)
      expect(result.corrections.length).toBe(2)
    })

    test('preserves valid properties', () => {
      const node = M('Box', {
        bg: '#333',
        pad: 16,
        rad: 8,
        gap: 12,
        hor: true
      })
      const result = M.correct(node)

      expect(result.corrections.length).toBe(0)
      expect(result.node.props.bg).toBe('#333')
      expect(result.node.props.pad).toBe(16)
      expect(result.node.props.rad).toBe(8)
      expect(result.node.props.gap).toBe(12)
      expect(result.node.props.hor).toBe(true)
    })

    test('handles M.each nodes', () => {
      const node = M.each('item', 'items', [
        M('Box', { color: '#fff' } as any)
      ])
      const result = M.correct(node)

      expect(result.node._each).toBeDefined()
      expect(result.node.children[0].props.col).toBe('#fff')
    })

    test('handles M.if nodes', () => {
      const node = M.if('isVisible', [
        M('Box', { backgroundColor: '#333' } as any)
      ], [
        M('Text', 'Hidden', { color: '#888' } as any)
      ])
      const result = M.correct(node)

      expect(result.node._if).toBeDefined()
      expect(result.node.children[0].props.bg).toBe('#333')
      expect(result.node._if?.else?.[0].props.col).toBe('#888')
    })

  })

})

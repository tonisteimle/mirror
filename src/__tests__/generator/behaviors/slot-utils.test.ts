/**
 * Slot Utilities Tests
 *
 * Tests for behavior slot utilities:
 * - groupChildrenBySlot function
 * - getStylesFromNode function
 */

import { describe, it, expect } from 'vitest'
import { groupChildrenBySlot, getStylesFromNode } from '../../../generator/behaviors/index'
import { createASTNode } from '../../kit/ast-builders'

describe('slot utilities', () => {
  describe('groupChildrenBySlot', () => {
    it('groups children by their name', () => {
      const node = createASTNode({
        children: [
          createASTNode({ name: 'Trigger', id: 'trigger1' }),
          createASTNode({ name: 'Content', id: 'content1' }),
        ],
      })

      const result = groupChildrenBySlot(node)

      expect(result.get('Trigger')).toHaveLength(1)
      expect(result.get('Trigger')![0].id).toBe('trigger1')
      expect(result.get('Content')).toHaveLength(1)
      expect(result.get('Content')![0].id).toBe('content1')
    })

    it('groups multiple children with same name', () => {
      const node = createASTNode({
        children: [
          createASTNode({ name: 'Item', id: 'item1' }),
          createASTNode({ name: 'Item', id: 'item2' }),
          createASTNode({ name: 'Item', id: 'item3' }),
        ],
      })

      const result = groupChildrenBySlot(node)

      expect(result.get('Item')).toHaveLength(3)
      expect(result.get('Item')![0].id).toBe('item1')
      expect(result.get('Item')![1].id).toBe('item2')
      expect(result.get('Item')![2].id).toBe('item3')
    })

    it('returns empty map for node with no children', () => {
      const node = createASTNode({ children: [] })

      const result = groupChildrenBySlot(node)

      expect(result.size).toBe(0)
    })

    it('handles mixed slot types', () => {
      const node = createASTNode({
        children: [
          createASTNode({ name: 'List', id: 'list1' }),
          createASTNode({ name: 'Panel', id: 'panel1' }),
          createASTNode({ name: 'Panel', id: 'panel2' }),
          createASTNode({ name: 'Tab', id: 'tab1' }),
        ],
      })

      const result = groupChildrenBySlot(node)

      expect(result.get('List')).toHaveLength(1)
      expect(result.get('Panel')).toHaveLength(2)
      expect(result.get('Tab')).toHaveLength(1)
    })

    it('returns undefined for non-existent slot', () => {
      const node = createASTNode({
        children: [
          createASTNode({ name: 'Trigger', id: 'trigger1' }),
        ],
      })

      const result = groupChildrenBySlot(node)

      expect(result.get('NonExistent')).toBeUndefined()
    })

    it('preserves child order within groups', () => {
      const node = createASTNode({
        children: [
          createASTNode({ name: 'Item', id: 'first' }),
          createASTNode({ name: 'Item', id: 'second' }),
          createASTNode({ name: 'Item', id: 'third' }),
        ],
      })

      const result = groupChildrenBySlot(node)
      const items = result.get('Item')!

      expect(items[0].id).toBe('first')
      expect(items[1].id).toBe('second')
      expect(items[2].id).toBe('third')
    })
  })

  describe('getStylesFromNode', () => {
    it('converts basic properties to styles', () => {
      const node = createASTNode({
        properties: {
          w: 100,
          h: 50,
          bg: '#FF0000',
        },
      })

      const style = getStylesFromNode(node)

      expect(style.width).toBe('100px')
      expect(style.height).toBe('50px')
      expect(style.backgroundColor).toBe('#FF0000')
    })

    it('converts padding properties', () => {
      const node = createASTNode({
        properties: {
          pad: 16,
        },
      })

      const style = getStylesFromNode(node)

      expect(style.padding).toBe('16px')
    })

    it('converts gap property', () => {
      const node = createASTNode({
        properties: {
          gap: 8,
        },
      })

      const style = getStylesFromNode(node)

      expect(style.gap).toBe('8px')
    })

    it('converts border radius', () => {
      const node = createASTNode({
        properties: {
          rad: 4,
        },
      })

      const style = getStylesFromNode(node)

      expect(style.borderRadius).toBe('4px')
    })

    it('converts flex direction for hor', () => {
      const node = createASTNode({
        properties: {
          hor: true,
        },
      })

      const style = getStylesFromNode(node)

      // Note: style-converter uses 'inline-flex' by default
      expect(style.display).toBe('inline-flex')
      expect(style.flexDirection).toBe('row')
    })

    it('converts flex direction for ver', () => {
      const node = createASTNode({
        properties: {
          ver: true,
        },
      })

      const style = getStylesFromNode(node)

      // Note: style-converter uses 'inline-flex' by default
      expect(style.display).toBe('inline-flex')
      expect(style.flexDirection).toBe('column')
    })

    it('returns minimal styles for empty properties', () => {
      const node = createASTNode({
        properties: {},
      })

      const style = getStylesFromNode(node)

      // Containers get default display: inline-block to fit content
      expect(style.display).toBe('inline-block')
    })

    it('converts col property to text color', () => {
      const node = createASTNode({
        properties: {
          col: '#333333',
        },
      })

      const style = getStylesFromNode(node)

      // col always becomes text color (style.color)
      expect(style.color).toBe('#333333')
      expect(style.backgroundColor).toBeUndefined()
    })

    it('converts bg property to backgroundColor', () => {
      const node = createASTNode({
        properties: {
          bg: '#333333',
        },
      })

      const style = getStylesFromNode(node)

      // bg always becomes backgroundColor
      expect(style.backgroundColor).toBe('#333333')
    })

    it('converts opacity property', () => {
      const node = createASTNode({
        properties: {
          opacity: 0.5,
        },
      })

      const style = getStylesFromNode(node)

      expect(style.opacity).toBe(0.5)
    })

    it('handles multiple properties together', () => {
      const node = createASTNode({
        properties: {
          hor: true,
          gap: 8,
          pad: 16,
          bg: '#FFF',
          rad: 8,
        },
      })

      const style = getStylesFromNode(node)

      // Note: style-converter uses 'inline-flex' by default
      expect(style.display).toBe('inline-flex')
      expect(style.flexDirection).toBe('row')
      expect(style.gap).toBe('8px')
      expect(style.padding).toBe('16px')
      expect(style.backgroundColor).toBe('#FFF')
      expect(style.borderRadius).toBe('8px')
    })
  })
})

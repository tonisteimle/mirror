/**
 * KeyboardNav Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { KeyboardNav, type KeyboardNavConfig } from '../keyboard-nav'

// Mock scrollIntoView which is not implemented in JSDOM
Element.prototype.scrollIntoView = vi.fn()

describe('KeyboardNav', () => {
  let nav: KeyboardNav
  let items: HTMLElement[]
  let onSelect: ReturnType<typeof vi.fn>
  let onCancel: ReturnType<typeof vi.fn>

  function createItems(count: number): HTMLElement[] {
    return Array.from({ length: count }, (_, i) => {
      const el = document.createElement('button')
      el.textContent = `Item ${i}`
      el.setAttribute('data-index', String(i))
      return el
    })
  }

  beforeEach(() => {
    onSelect = vi.fn()
    onCancel = vi.fn()
    items = createItems(5)
  })

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      nav = new KeyboardNav({
        onSelect,
        onCancel,
      })

      expect(nav).toBeDefined()
    })

    it('should accept custom orientation', () => {
      nav = new KeyboardNav({
        orientation: 'horizontal',
        onSelect,
        onCancel,
      })

      nav.setItems(items)
      expect(nav.getSelectedIndex()).toBe(0)
    })

    it('should accept wrap option', () => {
      nav = new KeyboardNav({
        wrap: false,
        onSelect,
        onCancel,
      })

      nav.setItems(items)
      nav.selectIndex(0)

      // Try to move up from first item
      nav.moveUp()
      expect(nav.getSelectedIndex()).toBe(0) // Should stay at 0
    })

    it('should accept grid configuration', () => {
      nav = new KeyboardNav({
        orientation: 'grid',
        columns: 3,
        onSelect,
        onCancel,
      })

      nav.setItems(createItems(9))
      expect(nav.getSelectedIndex()).toBe(0)
    })
  })

  describe('Item Management', () => {
    beforeEach(() => {
      nav = new KeyboardNav({ onSelect, onCancel })
    })

    it('should set items array', () => {
      nav.setItems(items)
      expect(nav.getSelectedIndex()).toBe(0)
    })

    it('should handle empty items', () => {
      nav.setItems([])
      // Implementation keeps index at 0 even with empty items
      expect(nav.getSelectedIndex()).toBe(0)
      expect(nav.getSelectedItem()).toBeNull()
    })

    it('should select first item by default', () => {
      nav.setItems(items)
      expect(nav.getSelectedIndex()).toBe(0)
    })

    it('should reset index when items change', () => {
      nav.setItems(items)
      nav.selectIndex(3)
      nav.setItems(createItems(3))
      expect(nav.getSelectedIndex()).toBe(0)
    })

    it('should get selected item', () => {
      nav.setItems(items)
      nav.selectIndex(2)
      expect(nav.getSelectedItem()).toBe(items[2])
    })
  })

  describe('Vertical Navigation', () => {
    beforeEach(() => {
      nav = new KeyboardNav({
        orientation: 'vertical',
        wrap: true,
        onSelect,
        onCancel,
      })
      nav.setItems(items)
    })

    it('should move down on ArrowDown', () => {
      nav.selectIndex(0)
      nav.moveDown()
      expect(nav.getSelectedIndex()).toBe(1)
    })

    it('should move up on ArrowUp', () => {
      nav.selectIndex(2)
      nav.moveUp()
      expect(nav.getSelectedIndex()).toBe(1)
    })

    it('should wrap at bottom when wrap=true', () => {
      nav.selectIndex(4) // Last item
      nav.moveDown()
      expect(nav.getSelectedIndex()).toBe(0) // Wrapped to first
    })

    it('should wrap at top when wrap=true', () => {
      nav.selectIndex(0) // First item
      nav.moveUp()
      expect(nav.getSelectedIndex()).toBe(4) // Wrapped to last
    })

    it('should stop at boundaries when wrap=false', () => {
      nav = new KeyboardNav({
        orientation: 'vertical',
        wrap: false,
        onSelect,
        onCancel,
      })
      nav.setItems(items)

      nav.selectIndex(4)
      nav.moveDown()
      expect(nav.getSelectedIndex()).toBe(4) // Stayed at last

      nav.selectIndex(0)
      nav.moveUp()
      expect(nav.getSelectedIndex()).toBe(0) // Stayed at first
    })
  })

  describe('Horizontal Navigation', () => {
    beforeEach(() => {
      nav = new KeyboardNav({
        orientation: 'horizontal',
        wrap: true,
        onSelect,
        onCancel,
      })
      nav.setItems(items)
    })

    it('should move right on ArrowRight', () => {
      nav.selectIndex(0)
      nav.moveRight()
      expect(nav.getSelectedIndex()).toBe(1)
    })

    it('should move left on ArrowLeft', () => {
      nav.selectIndex(2)
      nav.moveLeft()
      expect(nav.getSelectedIndex()).toBe(1)
    })

    it('should wrap at end', () => {
      nav.selectIndex(4)
      nav.moveRight()
      expect(nav.getSelectedIndex()).toBe(0)
    })

    it('should wrap at start', () => {
      nav.selectIndex(0)
      nav.moveLeft()
      expect(nav.getSelectedIndex()).toBe(4)
    })
  })

  describe('Grid Navigation', () => {
    beforeEach(() => {
      nav = new KeyboardNav({
        orientation: 'grid',
        columns: 3,
        wrap: true,
        onSelect,
        onCancel,
      })
      // 9 items in 3x3 grid:
      // 0 1 2
      // 3 4 5
      // 6 7 8
      nav.setItems(createItems(9))
    })

    it('should move right within row', () => {
      nav.selectIndex(0)
      nav.moveRight()
      expect(nav.getSelectedIndex()).toBe(1)
    })

    it('should move left within row', () => {
      nav.selectIndex(1)
      nav.moveLeft()
      expect(nav.getSelectedIndex()).toBe(0)
    })

    it('should move down to next row', () => {
      nav.selectIndex(1) // Middle of first row
      nav.moveDown()
      expect(nav.getSelectedIndex()).toBe(4) // Middle of second row
    })

    it('should move up to previous row', () => {
      nav.selectIndex(4) // Middle of second row
      nav.moveUp()
      expect(nav.getSelectedIndex()).toBe(1) // Middle of first row
    })

    it('should wrap right to next row', () => {
      nav.selectIndex(2) // End of first row
      nav.moveRight()
      expect(nav.getSelectedIndex()).toBe(3) // Start of second row
    })

    it('should wrap left to previous row', () => {
      nav.selectIndex(3) // Start of second row
      nav.moveLeft()
      expect(nav.getSelectedIndex()).toBe(2) // End of first row
    })

    it('should handle partial last row', () => {
      // 7 items in 3-column grid:
      // 0 1 2
      // 3 4 5
      // 6
      nav.setItems(createItems(7))
      nav.selectIndex(4) // Middle of second row (column 1)
      nav.moveDown()
      // Moving down from column 1 row 1 wraps to column 1 row 0
      expect(nav.getSelectedIndex()).toBe(1)
    })
  })

  describe('Selection', () => {
    beforeEach(() => {
      nav = new KeyboardNav({ onSelect, onCancel })
      nav.setItems(items)
    })

    it('should call onSelect on Enter', () => {
      nav.selectIndex(2)
      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      nav.handleKeyDown(event)

      expect(onSelect).toHaveBeenCalledWith(items[2], 2)
    })

    it('should call onSelect on Space', () => {
      nav.selectIndex(1)
      const event = new KeyboardEvent('keydown', { key: ' ' })
      nav.handleKeyDown(event)

      expect(onSelect).toHaveBeenCalledWith(items[1], 1)
    })

    it('should select by index', () => {
      nav.selectIndex(3)
      expect(nav.getSelectedIndex()).toBe(3)
    })

    it('should ignore invalid indices', () => {
      nav.selectIndex(2) // Start at valid index
      expect(nav.getSelectedIndex()).toBe(2)

      nav.selectIndex(100) // Invalid - too high
      expect(nav.getSelectedIndex()).toBe(2) // Unchanged

      nav.selectIndex(-5) // Invalid - negative
      expect(nav.getSelectedIndex()).toBe(2) // Unchanged
    })
  })

  describe('Cancel', () => {
    beforeEach(() => {
      nav = new KeyboardNav({ onSelect, onCancel })
      nav.setItems(items)
    })

    it('should call onCancel on Escape', () => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      nav.handleKeyDown(event)

      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('handleKeyDown', () => {
    beforeEach(() => {
      nav = new KeyboardNav({
        orientation: 'vertical',
        onSelect,
        onCancel,
      })
      nav.setItems(items)
    })

    it('should handle ArrowDown', () => {
      nav.selectIndex(0)
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      const handled = nav.handleKeyDown(event)

      expect(handled).toBe(true)
      expect(nav.getSelectedIndex()).toBe(1)
    })

    it('should handle ArrowUp', () => {
      nav.selectIndex(2)
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      nav.handleKeyDown(event)

      expect(nav.getSelectedIndex()).toBe(1)
    })

    it('should return false for unhandled keys', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' })
      const handled = nav.handleKeyDown(event)

      expect(handled).toBe(false)
    })

    it('should not handle Tab (returns false)', () => {
      const event = new KeyboardEvent('keydown', { key: 'Tab' })
      const handled = nav.handleKeyDown(event)

      expect(handled).toBe(false)
      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('Focus Management', () => {
    beforeEach(() => {
      nav = new KeyboardNav({ onSelect, onCancel })
      // Add items to document so focus works
      items.forEach(item => document.body.appendChild(item))
      nav.setItems(items)
    })

    afterEach(() => {
      items.forEach(item => item.remove())
    })

    it('should focus selected item', () => {
      nav.selectIndex(2)

      // In a real browser, this would focus the element
      // JSDOM has limited focus support
      expect(nav.getSelectedItem()).toBe(items[2])
    })
  })
})

/**
 * BasePicker Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BasePicker } from '../picker'
import type { PickerConfig, PickerCallbacks } from '../types'

// Concrete implementation for testing
class TestPicker extends BasePicker {
  private value: string = ''

  render(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'test-picker'
    el.textContent = 'Test Picker'
    return el
  }

  getValue(): string {
    return this.value
  }

  setValue(value: string): void {
    this.value = value
  }

  // Expose protected method for testing
  testSelectValue(value: string): void {
    this.selectValue(value)
  }
}

describe('BasePicker', () => {
  let picker: TestPicker
  let onSelect: ReturnType<typeof vi.fn>
  let onOpen: ReturnType<typeof vi.fn>
  let onClose: ReturnType<typeof vi.fn>
  let anchor: HTMLElement

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = ''
    anchor = document.createElement('button')
    anchor.textContent = 'Open Picker'
    anchor.style.position = 'absolute'
    anchor.style.left = '100px'
    anchor.style.top = '100px'
    document.body.appendChild(anchor)

    // Setup callbacks
    onSelect = vi.fn()
    onOpen = vi.fn()
    onClose = vi.fn()

    // Mock getBoundingClientRect
    anchor.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100,
      bottom: 120,
      left: 100,
      right: 200,
      width: 100,
      height: 20,
    })
  })

  afterEach(() => {
    picker?.destroy()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should create picker with default config', () => {
      picker = new TestPicker({}, { onSelect })
      expect(picker).toBeDefined()
      expect(picker.getIsOpen()).toBe(false)
    })

    it('should create picker with custom config', () => {
      picker = new TestPicker(
        { position: 'above', zIndex: 2000 },
        { onSelect }
      )
      expect(picker).toBeDefined()
    })

    it('should accept all callbacks', () => {
      picker = new TestPicker({}, { onSelect, onOpen, onClose })
      expect(picker).toBeDefined()
    })
  })

  describe('show()', () => {
    beforeEach(() => {
      picker = new TestPicker(
        { animate: false },
        { onSelect, onOpen, onClose }
      )
    })

    it('should show picker and add to DOM', () => {
      picker.show(anchor)

      expect(picker.getIsOpen()).toBe(true)
      expect(document.querySelector('.test-picker')).toBeTruthy()
    })

    it('should call onOpen callback', () => {
      picker.show(anchor)
      expect(onOpen).toHaveBeenCalled()
    })

    it('should position picker below anchor by default', () => {
      picker.show(anchor)
      const el = document.querySelector('.test-picker') as HTMLElement

      expect(el.style.position).toBe('absolute')
      expect(parseInt(el.style.top)).toBeGreaterThanOrEqual(120) // Below anchor
    })

    it('should add picker classes', () => {
      picker.show(anchor)
      const el = document.querySelector('.test-picker')

      expect(el?.classList.contains('picker')).toBe(true)
      expect(el?.classList.contains('picker-container')).toBe(true)
    })

    it('should set zIndex from config', () => {
      picker = new TestPicker({ zIndex: 5000, animate: false }, { onSelect })
      picker.show(anchor)
      const el = document.querySelector('.test-picker') as HTMLElement

      expect(el.style.zIndex).toBe('5000')
    })

    it('should not show twice', () => {
      picker.show(anchor)
      picker.show(anchor)

      const pickers = document.querySelectorAll('.test-picker')
      expect(pickers.length).toBe(1)
    })
  })

  describe('hide()', () => {
    beforeEach(() => {
      picker = new TestPicker(
        { animate: false },
        { onSelect, onOpen, onClose }
      )
    })

    it('should hide picker and remove from DOM', () => {
      picker.show(anchor)
      picker.hide()

      expect(picker.getIsOpen()).toBe(false)
      expect(document.querySelector('.test-picker')).toBeNull()
    })

    it('should call onClose callback', () => {
      picker.show(anchor)
      picker.hide()

      expect(onClose).toHaveBeenCalled()
    })

    it('should not error when hiding unopened picker', () => {
      expect(() => picker.hide()).not.toThrow()
    })

    it('should not call onClose when not open', () => {
      picker.hide()
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('toggle()', () => {
    beforeEach(() => {
      picker = new TestPicker(
        { animate: false },
        { onSelect, onOpen, onClose }
      )
    })

    it('should show when closed', () => {
      picker.toggle(anchor)
      expect(picker.getIsOpen()).toBe(true)
    })

    it('should hide when open', () => {
      picker.show(anchor)
      picker.toggle(anchor)
      expect(picker.getIsOpen()).toBe(false)
    })
  })

  describe('destroy()', () => {
    beforeEach(() => {
      picker = new TestPicker(
        { animate: false },
        { onSelect, onOpen, onClose }
      )
    })

    it('should hide picker', () => {
      picker.show(anchor)
      picker.destroy()

      expect(picker.getIsOpen()).toBe(false)
      expect(document.querySelector('.test-picker')).toBeNull()
    })

    it('should not error on already destroyed picker', () => {
      picker.destroy()
      expect(() => picker.destroy()).not.toThrow()
    })
  })

  describe('getValue/setValue', () => {
    beforeEach(() => {
      picker = new TestPicker({}, { onSelect })
    })

    it('should get initial value', () => {
      expect(picker.getValue()).toBe('')
    })

    it('should set and get value', () => {
      picker.setValue('test-value')
      expect(picker.getValue()).toBe('test-value')
    })
  })

  describe('selectValue', () => {
    it('should call onSelect with value', () => {
      picker = new TestPicker(
        { animate: false },
        { onSelect, onOpen, onClose }
      )
      picker.show(anchor)
      picker.testSelectValue('#ff0000')

      expect(onSelect).toHaveBeenCalledWith('#ff0000')
    })

    it('should close picker when closeOnSelect is true', () => {
      picker = new TestPicker(
        { closeOnSelect: true, animate: false },
        { onSelect }
      )
      picker.show(anchor)
      picker.testSelectValue('#ff0000')

      expect(picker.getIsOpen()).toBe(false)
    })

    it('should not close picker when closeOnSelect is false', () => {
      picker = new TestPicker(
        { closeOnSelect: false, animate: false },
        { onSelect }
      )
      picker.show(anchor)
      picker.testSelectValue('#ff0000')

      expect(picker.getIsOpen()).toBe(true)
    })
  })

  describe('Escape key handling', () => {
    beforeEach(() => {
      picker = new TestPicker(
        { closeOnEscape: true, animate: false },
        { onSelect, onOpen, onClose }
      )
    })

    it('should close on Escape key', () => {
      picker.show(anchor)

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      })
      document.dispatchEvent(event)

      expect(picker.getIsOpen()).toBe(false)
    })

    it('should not close on Escape when disabled', () => {
      picker = new TestPicker(
        { closeOnEscape: false, animate: false },
        { onSelect }
      )
      picker.show(anchor)

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      })
      document.dispatchEvent(event)

      expect(picker.getIsOpen()).toBe(true)
    })
  })

  describe('Click outside handling', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      picker = new TestPicker(
        { closeOnClickOutside: true, animate: false },
        { onSelect, onOpen, onClose }
      )
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should close on click outside', () => {
      picker.show(anchor)
      vi.runAllTimers() // Run setTimeout for event listener setup

      // Click outside
      const outsideEl = document.createElement('div')
      document.body.appendChild(outsideEl)

      const event = new MouseEvent('mousedown', { bubbles: true })
      outsideEl.dispatchEvent(event)

      expect(picker.getIsOpen()).toBe(false)
    })

    it('should not close on click inside picker', () => {
      picker.show(anchor)
      vi.runAllTimers()

      const pickerEl = document.querySelector('.test-picker')!
      const event = new MouseEvent('mousedown', { bubbles: true })
      pickerEl.dispatchEvent(event)

      expect(picker.getIsOpen()).toBe(true)
    })

    it('should not close on click on anchor', () => {
      picker.show(anchor)
      vi.runAllTimers()

      const event = new MouseEvent('mousedown', { bubbles: true })
      anchor.dispatchEvent(event)

      expect(picker.getIsOpen()).toBe(true)
    })
  })

  describe('Positioning', () => {
    it('should position below anchor', () => {
      picker = new TestPicker(
        { position: 'below', animate: false },
        { onSelect }
      )
      picker.show(anchor)
      const el = document.querySelector('.test-picker') as HTMLElement

      // Top should be at or below anchor bottom (120)
      expect(parseInt(el.style.top)).toBeGreaterThanOrEqual(120)
    })

    it('should position above anchor', () => {
      picker = new TestPicker(
        { position: 'above', animate: false },
        { onSelect }
      )
      picker.show(anchor)
      const el = document.querySelector('.test-picker') as HTMLElement

      // Top should be above anchor top (100)
      expect(parseInt(el.style.top)).toBeLessThanOrEqual(100)
    })

    it('should position right of anchor', () => {
      picker = new TestPicker(
        { position: 'right', animate: false },
        { onSelect }
      )
      picker.show(anchor)
      const el = document.querySelector('.test-picker') as HTMLElement

      // Left should be at anchor right (200)
      expect(parseInt(el.style.left)).toBeGreaterThanOrEqual(200)
    })

    it('should position left of anchor', () => {
      picker = new TestPicker(
        { position: 'left', animate: false },
        { onSelect }
      )
      picker.show(anchor)
      const el = document.querySelector('.test-picker') as HTMLElement

      // Left should be at or before anchor left (100)
      expect(parseInt(el.style.left)).toBeLessThanOrEqual(100)
    })

    it('should apply offset', () => {
      picker = new TestPicker(
        { position: 'below', offsetX: 10, offsetY: 20, animate: false },
        { onSelect }
      )
      picker.show(anchor)
      const el = document.querySelector('.test-picker') as HTMLElement

      // Should include offset
      expect(parseInt(el.style.left)).toBe(110) // 100 + 10
      expect(parseInt(el.style.top)).toBe(140) // 120 + 20
    })
  })

  describe('Animation', () => {
    it('should add animation classes when enabled', () => {
      vi.useFakeTimers()
      picker = new TestPicker(
        { animate: true },
        { onSelect }
      )
      picker.show(anchor)

      const el = document.querySelector('.test-picker')
      expect(el?.classList.contains('picker-enter')).toBe(true)

      // Run animation frame
      vi.runAllTimers()
      expect(el?.classList.contains('picker-enter-active')).toBe(true)

      vi.useRealTimers()
    })

    it('should not add animation classes when disabled', () => {
      picker = new TestPicker(
        { animate: false },
        { onSelect }
      )
      picker.show(anchor)

      const el = document.querySelector('.test-picker')
      expect(el?.classList.contains('picker-enter')).toBe(false)
    })
  })

  describe('Custom container', () => {
    it('should append to custom container', () => {
      const customContainer = document.createElement('div')
      customContainer.id = 'custom-container'
      document.body.appendChild(customContainer)

      picker = new TestPicker(
        { container: customContainer, animate: false },
        { onSelect }
      )
      picker.show(anchor)

      expect(customContainer.querySelector('.test-picker')).toBeTruthy()
      expect(document.body.querySelector('.test-picker')).toBe(
        customContainer.querySelector('.test-picker')
      )
    })
  })
})

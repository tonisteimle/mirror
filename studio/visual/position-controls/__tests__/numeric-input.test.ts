/**
 * NumericInput Tests
 *
 * Tests for the NumericInput component:
 * - Value parsing
 * - Drag-to-adjust sensitivity
 * - Shift modifier for 10x step
 * - Keyboard input handling
 * - Spinner buttons
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { NumericInput } from '../numeric-input'
import type { NumericInputConfig } from '../types'

describe('NumericInput', () => {
  let dom: JSDOM
  let container: HTMLElement
  let onChange: ReturnType<typeof vi.fn>
  let onDragStart: ReturnType<typeof vi.fn>
  let onDragEnd: ReturnType<typeof vi.fn>

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    const document = dom.window.document
    global.document = document as unknown as Document
    global.window = dom.window as unknown as Window & typeof globalThis
    global.MouseEvent = dom.window.MouseEvent as unknown as typeof MouseEvent
    global.KeyboardEvent = dom.window.KeyboardEvent as unknown as typeof KeyboardEvent
    global.Event = dom.window.Event as unknown as typeof Event

    container = document.createElement('div')
    document.body.appendChild(container)

    onChange = vi.fn()
    onDragStart = vi.fn()
    onDragEnd = vi.fn()
  })

  afterEach(() => {
    container.remove()
  })

  function createInput(config: Partial<NumericInputConfig> = {}): NumericInput {
    return new NumericInput({
      container,
      label: 'X',
      value: 100,
      onChange,
      onDragStart,
      onDragEnd,
      ...config,
    })
  }

  describe('initialization', () => {
    it('renders the component', () => {
      const input = createInput()
      expect(input.getElement()).toBeDefined()
      expect(container.querySelector('.numeric-input')).not.toBeNull()
    })

    it('displays the initial value', () => {
      const input = createInput({ value: 42 })
      expect(input.getValue()).toBe(42)
    })

    it('displays the label', () => {
      createInput({ label: 'Y' })
      const label = container.querySelector('.numeric-input-label')
      expect(label?.textContent).toBe('Y')
    })

    it('displays the unit', () => {
      createInput({ unit: 'em' })
      const unit = container.querySelector('.numeric-input-unit')
      expect(unit?.textContent).toBe('em')
    })

    it('uses px as default unit', () => {
      createInput()
      const unit = container.querySelector('.numeric-input-unit')
      expect(unit?.textContent).toBe('px')
    })
  })

  describe('value handling', () => {
    it('getValue returns current value', () => {
      const input = createInput({ value: 50 })
      expect(input.getValue()).toBe(50)
    })

    it('setValue updates the value', () => {
      const input = createInput({ value: 50 })
      input.setValue(75)
      expect(input.getValue()).toBe(75)
    })

    it('setValue updates the input field', () => {
      const input = createInput({ value: 50 })
      input.setValue(75)
      const inputField = container.querySelector('.numeric-input-field') as HTMLInputElement
      expect(inputField.value).toBe('75')
    })
  })

  describe('spinner buttons', () => {
    it('up button increments value', () => {
      createInput({ value: 100, step: 1 })
      const upBtn = container.querySelector('.numeric-input-spinner-up') as HTMLButtonElement

      upBtn.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        shiftKey: false,
      }))

      expect(onChange).toHaveBeenCalledWith(101)
    })

    it('down button decrements value', () => {
      createInput({ value: 100, step: 1 })
      const downBtn = container.querySelector('.numeric-input-spinner-down') as HTMLButtonElement

      downBtn.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        shiftKey: false,
      }))

      expect(onChange).toHaveBeenCalledWith(99)
    })

    it('shift+up increments by 10x step', () => {
      createInput({ value: 100, step: 1 })
      const upBtn = container.querySelector('.numeric-input-spinner-up') as HTMLButtonElement

      upBtn.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        shiftKey: true,
      }))

      expect(onChange).toHaveBeenCalledWith(110)
    })

    it('shift+down decrements by 10x step', () => {
      createInput({ value: 100, step: 1 })
      const downBtn = container.querySelector('.numeric-input-spinner-down') as HTMLButtonElement

      downBtn.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        shiftKey: true,
      }))

      expect(onChange).toHaveBeenCalledWith(90)
    })

    it('respects custom step size', () => {
      createInput({ value: 100, step: 5 })
      const upBtn = container.querySelector('.numeric-input-spinner-up') as HTMLButtonElement

      upBtn.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        shiftKey: false,
      }))

      expect(onChange).toHaveBeenCalledWith(105)
    })
  })

  describe('min/max constraints', () => {
    it('respects min constraint', () => {
      createInput({ value: 5, step: 1, min: 0 })
      const downBtn = container.querySelector('.numeric-input-spinner-down') as HTMLButtonElement

      // Try to go below min
      for (let i = 0; i < 10; i++) {
        downBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      }

      // Should not go below 0
      expect(onChange).toHaveBeenLastCalledWith(0)
    })

    it('respects max constraint', () => {
      createInput({ value: 95, step: 1, max: 100 })
      const upBtn = container.querySelector('.numeric-input-spinner-up') as HTMLButtonElement

      // Try to go above max
      for (let i = 0; i < 10; i++) {
        upBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      }

      // Should not go above 100
      expect(onChange).toHaveBeenLastCalledWith(100)
    })
  })

  describe('keyboard navigation', () => {
    it('ArrowUp increments value', () => {
      createInput({ value: 100 })
      const inputField = container.querySelector('.numeric-input-field') as HTMLInputElement

      inputField.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        bubbles: true,
      }))

      expect(onChange).toHaveBeenCalledWith(101)
    })

    it('ArrowDown decrements value', () => {
      createInput({ value: 100 })
      const inputField = container.querySelector('.numeric-input-field') as HTMLInputElement

      inputField.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
      }))

      expect(onChange).toHaveBeenCalledWith(99)
    })

    it('Shift+ArrowUp increments by 10', () => {
      createInput({ value: 100 })
      const inputField = container.querySelector('.numeric-input-field') as HTMLInputElement

      inputField.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        shiftKey: true,
        bubbles: true,
      }))

      expect(onChange).toHaveBeenCalledWith(110)
    })

    it('Shift+ArrowDown decrements by 10', () => {
      createInput({ value: 100 })
      const inputField = container.querySelector('.numeric-input-field') as HTMLInputElement

      inputField.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        shiftKey: true,
        bubbles: true,
      }))

      expect(onChange).toHaveBeenCalledWith(90)
    })
  })

  describe('drag-to-adjust', () => {
    it('label has ew-resize cursor', () => {
      createInput()
      const label = container.querySelector('.numeric-input-label') as HTMLElement
      expect(label.style.cursor).toBe('ew-resize')
    })

    it('calls onDragStart when drag begins', () => {
      createInput()
      const label = container.querySelector('.numeric-input-label') as HTMLElement

      label.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 100,
        bubbles: true,
      }))

      expect(onDragStart).toHaveBeenCalled()
    })

    it('updates value during drag', () => {
      createInput({ value: 100 })
      const label = container.querySelector('.numeric-input-label') as HTMLElement

      // Start drag
      label.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 100,
        bubbles: true,
      }))

      // Move mouse (sensitivity is 2px = 1 step)
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 110, // 10px right = 5 steps
        bubbles: true,
      }))

      expect(onChange).toHaveBeenCalledWith(105)
    })

    it('uses 10x step with shift during drag', () => {
      createInput({ value: 100 })
      const label = container.querySelector('.numeric-input-label') as HTMLElement

      // Start drag
      label.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 100,
        bubbles: true,
      }))

      // Move mouse with shift (10px right, shift = 10x step)
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 110,
        shiftKey: true,
        bubbles: true,
      }))

      // 10px / 2 = 5 steps, 5 * 10 (shift) = 50
      expect(onChange).toHaveBeenCalledWith(150)
    })

    it('calls onDragEnd when drag ends', () => {
      createInput()
      const label = container.querySelector('.numeric-input-label') as HTMLElement

      // Start drag
      label.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 100,
        bubbles: true,
      }))

      // End drag
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

      expect(onDragEnd).toHaveBeenCalled()
    })
  })

  describe('input field', () => {
    it('parses valid numeric input', () => {
      createInput({ value: 100 })
      const inputField = container.querySelector('.numeric-input-field') as HTMLInputElement

      inputField.value = '200'
      inputField.dispatchEvent(new Event('change', { bubbles: true }))

      expect(onChange).toHaveBeenCalledWith(200)
    })

    it('reverts invalid input', () => {
      const input = createInput({ value: 100 })
      const inputField = container.querySelector('.numeric-input-field') as HTMLInputElement

      inputField.value = 'abc'
      inputField.dispatchEvent(new Event('change', { bubbles: true }))

      // Should revert to original value
      expect(inputField.value).toBe('100')
      expect(input.getValue()).toBe(100)
    })

    it('clamps input to min/max', () => {
      createInput({ value: 50, min: 0, max: 100 })
      const inputField = container.querySelector('.numeric-input-field') as HTMLInputElement

      inputField.value = '150'
      inputField.dispatchEvent(new Event('change', { bubbles: true }))

      expect(onChange).toHaveBeenCalledWith(100)
    })
  })

  describe('dispose', () => {
    it('removes element from DOM', () => {
      const input = createInput()
      expect(container.querySelector('.numeric-input')).not.toBeNull()

      input.dispose()
      expect(container.querySelector('.numeric-input')).toBeNull()
    })
  })
})

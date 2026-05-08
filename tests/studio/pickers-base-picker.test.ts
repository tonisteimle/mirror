// @vitest-environment jsdom
/**
 * Tests for studio/pickers/base/picker.ts (BasePicker abstract class)
 *
 * BasePicker is the parent of all picker classes (color, icon, token,
 * animation, action). Module was 0% covered. Tests use a minimal
 * concrete subclass to drive the lifecycle.
 *
 * Tests pin:
 *  - show / hide / toggle / destroy lifecycle + isOpen flag
 *  - Position calculation (below/above/left/right) + viewport clamping
 *  - Click-outside dismissal
 *  - Escape key handling (when not externally handled)
 *  - selectValue → onSelect callback + closeOnSelect
 *  - Open/close events via the events bus
 *  - pickerId / pickerType identity
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BasePicker, type PickerType } from '../../studio/pickers/base/picker'
import type { PickerConfig, PickerCallbacks } from '../../studio/pickers/base/types'
import { events } from '../../studio/core/events'

class TestPicker extends BasePicker {
  public lastValue = ''
  constructor(
    config: Partial<PickerConfig> = {},
    callbacks: PickerCallbacks,
    type: PickerType = 'unknown'
  ) {
    super(config, callbacks, type)
  }
  render(): HTMLElement {
    const el = document.createElement('div')
    el.dataset.testpicker = 'true'
    el.textContent = 'test-picker'
    return el
  }
  getValue(): string {
    return this.lastValue
  }
  setValue(value: string): void {
    this.lastValue = value
  }
  // Expose protected helpers for test
  publicSelectValue(v: string) {
    this.selectValue(v)
  }
}

let anchor: HTMLElement
let onSelect: ReturnType<typeof vi.fn>
let onOpen: ReturnType<typeof vi.fn>
let onClose: ReturnType<typeof vi.fn>

beforeEach(() => {
  document.body.innerHTML = ''
  anchor = document.createElement('button')
  anchor.textContent = 'anchor'
  document.body.appendChild(anchor)
  // jsdom getBoundingClientRect returns zeroes — stub on anchor.
  anchor.getBoundingClientRect = () =>
    ({
      top: 50,
      left: 100,
      bottom: 70,
      right: 150,
      width: 50,
      height: 20,
      x: 100,
      y: 50,
      toJSON: () => '',
    }) as DOMRect
  onSelect = vi.fn()
  onOpen = vi.fn()
  onClose = vi.fn()
})

afterEach(() => {
  vi.useRealTimers()
})

// =============================================================================
// Identity
// =============================================================================

describe('BasePicker — identity', () => {
  it('every instance has a unique pickerId', () => {
    const a = new TestPicker({}, { onSelect })
    const b = new TestPicker({}, { onSelect })
    expect(a.pickerId).not.toBe(b.pickerId)
  })

  it('pickerType is exposed read-only', () => {
    const p = new TestPicker({}, { onSelect }, 'color')
    expect(p.pickerType).toBe('color')
  })

  it('callbacks property is mutable (overrideable by external coordinators)', () => {
    const p = new TestPicker({}, { onSelect })
    const newOnSelect = vi.fn()
    p.callbacks.onSelect = newOnSelect
    p.publicSelectValue('x')
    expect(newOnSelect).toHaveBeenCalledWith('x')
    expect(onSelect).not.toHaveBeenCalled()
  })
})

// =============================================================================
// Show / hide
// =============================================================================

describe('BasePicker — show()', () => {
  it('renders + appends to document.body, flips isOpen to true', () => {
    const p = new TestPicker({ animate: false }, { onSelect })
    expect(p.getIsOpen()).toBe(false)
    p.show(anchor)
    expect(p.getIsOpen()).toBe(true)
    expect(document.querySelector('[data-testpicker]')).not.toBeNull()
  })

  it('adds .picker + .picker-container classes to the rendered element', () => {
    const p = new TestPicker({ animate: false }, { onSelect })
    p.show(anchor)
    const el = p.getElement()!
    expect(el.classList.contains('picker')).toBe(true)
    expect(el.classList.contains('picker-container')).toBe(true)
  })

  it('sets z-index from config (default 1000)', () => {
    const p = new TestPicker({ animate: false, zIndex: 5000 }, { onSelect })
    p.show(anchor)
    expect(p.getElement()!.style.zIndex).toBe('5000')
  })

  it('appends to custom container when provided', () => {
    const container = document.createElement('div')
    container.id = 'custom-container'
    document.body.appendChild(container)
    const p = new TestPicker({ animate: false, container }, { onSelect })
    p.show(anchor)
    expect(container.querySelector('[data-testpicker]')).not.toBeNull()
  })

  it('calls onOpen callback', () => {
    const p = new TestPicker({ animate: false }, { onSelect, onOpen })
    p.show(anchor)
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('emits picker:opened event with id + type', () => {
    let captured: { pickerId: string; pickerType: string } | null = null
    const off = events.on('picker:opened', e => (captured = e as never))
    const p = new TestPicker({ animate: false }, { onSelect }, 'token')
    p.show(anchor)
    expect(captured).not.toBeNull()
    expect(captured!.pickerId).toBe(p.pickerId)
    expect(captured!.pickerType).toBe('token')
    off()
  })

  it('show() is a NO-OP when already open (does NOT re-render)', () => {
    const p = new TestPicker({ animate: false }, { onSelect, onOpen })
    p.show(anchor)
    p.show(anchor)
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(document.querySelectorAll('[data-testpicker]').length).toBe(1)
  })
})

describe('BasePicker — hide()', () => {
  it('removes element + flips isOpen to false', () => {
    const p = new TestPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.hide()
    expect(p.getIsOpen()).toBe(false)
    expect(document.querySelector('[data-testpicker]')).toBeNull()
  })

  it('hide() is a NO-OP when not open', () => {
    const p = new TestPicker({ animate: false }, { onSelect, onClose })
    p.hide()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose callback', () => {
    const p = new TestPicker({ animate: false }, { onSelect, onClose })
    p.show(anchor)
    p.hide()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('with animate=true, defers element removal by 150ms', () => {
    vi.useFakeTimers()
    const p = new TestPicker({ animate: true }, { onSelect })
    p.show(anchor)
    p.hide()
    // Element still present immediately after hide (animating out)
    expect(document.querySelector('[data-testpicker]')).not.toBeNull()
    vi.advanceTimersByTime(150)
    expect(document.querySelector('[data-testpicker]')).toBeNull()
  })

  it('emits picker:closed with the close-reason', () => {
    let reason: string | null = null
    const off = events.on('picker:closed', e => (reason = (e as { reason: string }).reason))
    const p = new TestPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.hide()
    // Close reason "unknown" — direct hide() without a select / escape / click-outside trigger.
    expect(reason).toBe('unknown')
    off()
  })
})

// =============================================================================
// Toggle
// =============================================================================

describe('BasePicker — toggle()', () => {
  it('opens when closed', () => {
    const p = new TestPicker({ animate: false }, { onSelect })
    p.toggle(anchor)
    expect(p.getIsOpen()).toBe(true)
  })

  it('closes when open', () => {
    const p = new TestPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.toggle(anchor)
    expect(p.getIsOpen()).toBe(false)
  })
})

// =============================================================================
// Position calculation
// =============================================================================

describe('BasePicker — position calculation', () => {
  // anchor rect (stubbed): top=50, left=100, bottom=70, right=150

  it('position=below puts top at anchor.bottom + offsetY (default 4)', () => {
    const p = new TestPicker({ animate: false, position: 'below' }, { onSelect })
    p.show(anchor)
    const el = p.getElement()!
    expect(el.style.position).toBe('absolute')
    expect(el.style.top).toBe('74px') // 70 + 4
    expect(el.style.left).toBe('100px') // 100 + 0
  })

  it('position=above puts top at anchor.top - offsetY', () => {
    const p = new TestPicker({ animate: false, position: 'above', offsetY: 10 }, { onSelect })
    p.show(anchor)
    expect(p.getElement()!.style.top).toBe('40px') // 50 - 10
  })

  it('position=right puts left at anchor.right + offsetX', () => {
    const p = new TestPicker({ animate: false, position: 'right', offsetX: 8 }, { onSelect })
    p.show(anchor)
    expect(p.getElement()!.style.left).toBe('158px') // 150 + 8
  })

  it('position=left puts left at anchor.left - offsetX', () => {
    const p = new TestPicker({ animate: false, position: 'left', offsetX: 5 }, { onSelect })
    p.show(anchor)
    expect(p.getElement()!.style.left).toBe('95px') // 100 - 5
  })

  it('clamps left to viewport when picker would overflow right edge', () => {
    // Subclass that pre-stamps offsetWidth so viewport-adjust has data.
    class WidePicker extends TestPicker {
      render(): HTMLElement {
        const el = document.createElement('div')
        el.dataset.testpicker = 'true'
        Object.defineProperty(el, 'offsetWidth', { value: 200, configurable: true })
        Object.defineProperty(el, 'offsetHeight', { value: 100, configurable: true })
        return el
      }
    }
    anchor.getBoundingClientRect = () =>
      ({ top: 50, left: 1010, bottom: 70, right: 1020, width: 10, height: 20 }) as DOMRect
    const p = new WidePicker({ animate: false }, { onSelect })
    p.show(anchor)
    expect(parseInt(p.getElement()!.style.left)).toBeLessThanOrEqual(window.innerWidth - 200)
  })

  it('clamps left to scrollX + 10 when picker would underflow left edge', () => {
    anchor.getBoundingClientRect = () =>
      ({ top: 50, left: -50, bottom: 70, right: 0, width: 50, height: 20 }) as DOMRect
    const p = new TestPicker({ animate: false }, { onSelect })
    p.show(anchor)
    const left = parseInt(p.getElement()!.style.left)
    expect(left).toBeGreaterThanOrEqual(0)
  })
})

// =============================================================================
// Click-outside dismissal
// =============================================================================

describe('BasePicker — click-outside dismissal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('clicking outside the picker AND outside the anchor closes', () => {
    const p = new TestPicker({ animate: false, closeOnClickOutside: true }, { onSelect })
    p.show(anchor)
    vi.advanceTimersByTime(1) // setTimeout(..., 0) for listener attach

    const outside = document.createElement('div')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(p.getIsOpen()).toBe(false)
  })

  it('clicking inside the picker does NOT close', () => {
    const p = new TestPicker({ animate: false, closeOnClickOutside: true }, { onSelect })
    p.show(anchor)
    vi.advanceTimersByTime(1)

    p.getElement()!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(p.getIsOpen()).toBe(true)
  })

  it('clicking on the anchor element does NOT close', () => {
    const p = new TestPicker({ animate: false, closeOnClickOutside: true }, { onSelect })
    p.show(anchor)
    vi.advanceTimersByTime(1)

    anchor.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(p.getIsOpen()).toBe(true)
  })

  it('closeOnClickOutside=false disables the listener', () => {
    const p = new TestPicker({ animate: false, closeOnClickOutside: false }, { onSelect })
    p.show(anchor)
    vi.advanceTimersByTime(1)

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(p.getIsOpen()).toBe(true)
  })
})

// =============================================================================
// Escape key
// =============================================================================

describe('BasePicker — Escape', () => {
  it('Escape closes picker (closeOnEscape default true)', () => {
    const p = new TestPicker({ animate: false }, { onSelect })
    p.show(anchor)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    expect(p.getIsOpen()).toBe(false)
  })

  it('Escape close emits picker:closed with reason="escape"', () => {
    let reason: string | null = null
    const off = events.on('picker:closed', e => (reason = (e as { reason: string }).reason))
    const p = new TestPicker({ animate: false }, { onSelect })
    p.show(anchor)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    expect(reason).toBe('escape')
    off()
  })

  it('externalKeyboardHandling=true disables internal Escape handler', () => {
    const p = new TestPicker({ animate: false, externalKeyboardHandling: true }, { onSelect })
    p.show(anchor)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(p.getIsOpen()).toBe(true)
  })

  it('closeOnEscape=false also disables Escape handling', () => {
    const p = new TestPicker({ animate: false, closeOnEscape: false }, { onSelect })
    p.show(anchor)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(p.getIsOpen()).toBe(true)
  })

  it('non-Escape keys do NOT close the picker', () => {
    const p = new TestPicker({ animate: false }, { onSelect })
    p.show(anchor)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(p.getIsOpen()).toBe(true)
  })
})

// =============================================================================
// selectValue + closeOnSelect
// =============================================================================

describe('BasePicker — selectValue', () => {
  it('fires onSelect with the value', () => {
    const p = new TestPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.publicSelectValue('chosen')
    expect(onSelect).toHaveBeenCalledWith('chosen')
  })

  it('closeOnSelect=true (default) closes after selection with reason="select"', () => {
    let reason: string | null = null
    const off = events.on('picker:closed', e => (reason = (e as { reason: string }).reason))
    const p = new TestPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.publicSelectValue('chosen')
    expect(p.getIsOpen()).toBe(false)
    expect(reason).toBe('select')
    off()
  })

  it('closeOnSelect=false leaves picker open after selection', () => {
    const p = new TestPicker({ animate: false, closeOnSelect: false }, { onSelect })
    p.show(anchor)
    p.publicSelectValue('chosen')
    expect(p.getIsOpen()).toBe(true)
  })
})

// =============================================================================
// destroy
// =============================================================================

describe('BasePicker — destroy', () => {
  it('hides + clears keyboardNav', () => {
    const p = new TestPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.destroy()
    expect(p.getIsOpen()).toBe(false)
    expect(document.querySelector('[data-testpicker]')).toBeNull()
  })

  it('is safe to call when picker was never shown', () => {
    const p = new TestPicker({ animate: false }, { onSelect })
    expect(() => p.destroy()).not.toThrow()
  })
})

// =============================================================================
// P3 — mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: show() guards against re-render when isOpen=true', () => {
    const p = new TestPicker({ animate: false }, { onSelect, onOpen })
    p.show(anchor)
    p.show(anchor)
    p.show(anchor)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('M2: hide() emits picker:closed with closeReason (not always "unknown")', () => {
    let reason: string | null = null
    const off = events.on('picker:closed', e => (reason = (e as { reason: string }).reason))
    const p = new TestPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.publicSelectValue('x')
    expect(reason).toBe('select')
    off()
  })

  it('M3: closeOnSelect=false suppresses closing after onSelect', () => {
    const p = new TestPicker({ animate: false, closeOnSelect: false }, { onSelect })
    p.show(anchor)
    p.publicSelectValue('chosen')
    expect(p.getIsOpen()).toBe(true)
  })
})

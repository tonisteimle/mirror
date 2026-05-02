/**
 * studio/visual/position-controls/numeric-input
 *
 * Numeric input with drag-to-scrub, spinner buttons, and shift-modifier
 * step. Verifies render structure, keyboard, programmatic value, and
 * min/max clamping. jsdom environment because it manipulates DOM.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { NumericInput } from '../../studio/visual/position-controls/numeric-input'

let container: HTMLElement
let lastValue: number | null

function makeInput(
  opts: Partial<{
    value: number
    step: number
    min: number
    max: number
    unit: string
    label: string
  }> = {}
): NumericInput {
  return new NumericInput({
    container,
    label: opts.label ?? 'X',
    value: opts.value ?? 0,
    step: opts.step,
    min: opts.min,
    max: opts.max,
    unit: opts.unit,
    onChange: v => {
      lastValue = v
    },
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  lastValue = null
})

describe('NumericInput — render', () => {
  it('renders label, input, unit, and spinner buttons', () => {
    makeInput({ value: 42, label: 'Y', unit: 'rem' })
    const root = container.querySelector('.numeric-input')!
    expect(root).toBeTruthy()
    expect(root.querySelector('.numeric-input-label')!.textContent).toBe('Y')
    expect((root.querySelector('.numeric-input-field') as HTMLInputElement).value).toBe('42')
    expect(root.querySelector('.numeric-input-unit')!.textContent).toBe('rem')
    expect(root.querySelectorAll('.numeric-input-spinner')).toHaveLength(2)
  })

  it('defaults unit to px and step to 1', () => {
    const ni = makeInput({ value: 0 })
    expect(container.querySelector('.numeric-input-unit')!.textContent).toBe('px')
    // step value isn't externally observable; we drive via spinner click
    const upBtn = container.querySelector('.numeric-input-spinner-up') as HTMLButtonElement
    upBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(ni.getValue()).toBe(1)
  })

  it('uses lowercased label as data-axis', () => {
    makeInput({ label: 'Width' })
    const inp = container.querySelector('.numeric-input-field') as HTMLInputElement
    expect(inp.getAttribute('data-axis')).toBe('width')
  })
})

describe('NumericInput — spinner steps', () => {
  it('up-button increments by step', () => {
    const ni = makeInput({ value: 5, step: 2 })
    const up = container.querySelector('.numeric-input-spinner-up') as HTMLButtonElement
    up.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(ni.getValue()).toBe(7)
    expect(lastValue).toBe(7)
  })

  it('down-button decrements by step', () => {
    const ni = makeInput({ value: 5, step: 2 })
    const down = container.querySelector('.numeric-input-spinner-down') as HTMLButtonElement
    down.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(ni.getValue()).toBe(3)
  })

  it('shift-modifier applies 10× step', () => {
    const ni = makeInput({ value: 0, step: 1 })
    const up = container.querySelector('.numeric-input-spinner-up') as HTMLButtonElement
    up.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, shiftKey: true }))
    expect(ni.getValue()).toBe(10)
  })

  it('clamps to min when stepping down past min', () => {
    const ni = makeInput({ value: 1, step: 5, min: 0 })
    const down = container.querySelector('.numeric-input-spinner-down') as HTMLButtonElement
    down.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(ni.getValue()).toBe(0)
  })

  it('clamps to max when stepping up past max', () => {
    const ni = makeInput({ value: 99, step: 5, max: 100 })
    const up = container.querySelector('.numeric-input-spinner-up') as HTMLButtonElement
    up.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(ni.getValue()).toBe(100)
  })
})

describe('NumericInput — keyboard', () => {
  it('ArrowUp increments by step', () => {
    const ni = makeInput({ value: 0, step: 3 })
    const inp = container.querySelector('.numeric-input-field') as HTMLInputElement
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(ni.getValue()).toBe(3)
  })

  it('ArrowDown decrements', () => {
    const ni = makeInput({ value: 5, step: 2 })
    const inp = container.querySelector('.numeric-input-field') as HTMLInputElement
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(ni.getValue()).toBe(3)
  })

  it('Shift+ArrowUp uses 10× step', () => {
    const ni = makeInput({ value: 0, step: 2 })
    const inp = container.querySelector('.numeric-input-field') as HTMLInputElement
    inp.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true, bubbles: true })
    )
    expect(ni.getValue()).toBe(20)
  })

  it('Escape reverts text to current value', () => {
    const ni = makeInput({ value: 7 })
    const inp = container.querySelector('.numeric-input-field') as HTMLInputElement
    inp.value = '999' // user typed something
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(inp.value).toBe('7')
    expect(ni.getValue()).toBe(7)
  })
})

describe('NumericInput — text-input change', () => {
  it('parses int on change and clamps to min/max', () => {
    const ni = makeInput({ value: 0, min: 0, max: 100 })
    const inp = container.querySelector('.numeric-input-field') as HTMLInputElement
    inp.value = '150'
    inp.dispatchEvent(new Event('change', { bubbles: true }))
    expect(ni.getValue()).toBe(100)
    expect(lastValue).toBe(100)
  })

  it('reverts on non-numeric input', () => {
    const ni = makeInput({ value: 42 })
    const inp = container.querySelector('.numeric-input-field') as HTMLInputElement
    inp.value = 'abc'
    inp.dispatchEvent(new Event('change', { bubbles: true }))
    expect(inp.value).toBe('42')
    expect(ni.getValue()).toBe(42)
    expect(lastValue).toBeNull() // onChange not fired
  })
})

describe('NumericInput — dispose', () => {
  it('removes element on dispose', () => {
    const ni = makeInput({ value: 0 })
    expect(container.querySelector('.numeric-input')).toBeTruthy()
    ni.dispose()
    expect(container.querySelector('.numeric-input')).toBeNull()
  })
})

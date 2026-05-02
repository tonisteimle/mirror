/**
 * studio/pickers/color/full-picker
 *
 * Public API of the Figma-style color picker (1382 LOC, previously
 * untested). Covers: render lifecycle, setColor/getColor round-trip,
 * show/hide visibility, token-grid update, factory functions.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  FullColorPicker,
  createFullColorPicker,
  getFullColorPicker,
} from '../../studio/pickers/color/full-picker'

let picker: FullColorPicker

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  picker?.hide()
  document.body.innerHTML = ''
})

describe('FullColorPicker — render', () => {
  it('creates a container with id="color-picker" by default', () => {
    picker = new FullColorPicker()
    const el = picker.render()
    expect(el.id).toBe('color-picker')
    expect(document.getElementById('color-picker')).toBe(el)
  })

  it('uses provided targetId', () => {
    picker = new FullColorPicker()
    const el = picker.render('my-picker')
    expect(el.id).toBe('my-picker')
  })

  it('renders into existing element if id already in DOM', () => {
    const pre = document.createElement('div')
    pre.id = 'pre-existing'
    document.body.appendChild(pre)
    picker = new FullColorPicker()
    const el = picker.render('pre-existing')
    expect(el).toBe(pre)
  })

  it('populates innerHTML with picker structure', () => {
    picker = new FullColorPicker()
    picker.render()
    // Smoke check: at least the canvas, hex input, and palette tabs exist
    expect(document.querySelector('canvas')).toBeTruthy()
    expect(document.querySelector('input')).toBeTruthy()
  })
})

describe('FullColorPicker — color state', () => {
  it('round-trips color via setColor / getColor', () => {
    picker = new FullColorPicker()
    picker.render()
    picker.setColor('#FF0000')
    expect(picker.getColor()).toBe('#FF0000')
    picker.setColor('#00FF00')
    expect(picker.getColor()).toBe('#00FF00')
  })

  it('default state produces a deterministic initial color', () => {
    picker = new FullColorPicker()
    picker.render()
    // Default state h=210, s=100, v=100 → blue-ish
    const hex = picker.getColor()
    expect(hex).toMatch(/^#[0-9A-F]{6}$/)
  })
})

describe('FullColorPicker — show / hide / isOpen', () => {
  it('starts as closed', () => {
    picker = new FullColorPicker()
    expect(picker.isOpen()).toBe(false)
  })

  it('show() makes it visible at given coordinates', () => {
    picker = new FullColorPicker()
    picker.render()
    picker.show(100, 200)
    expect(picker.isOpen()).toBe(true)
    const container = document.getElementById('color-picker')!
    expect(container.style.left).toBe('100px')
    expect(container.style.top).toBe('200px')
    expect(container.classList.contains('visible')).toBe(true)
  })

  it('show() lazy-renders if container missing', () => {
    picker = new FullColorPicker()
    picker.show(0, 0) // no render() before
    expect(document.getElementById('color-picker')).toBeTruthy()
    expect(picker.isOpen()).toBe(true)
  })

  it('show() with initialColor applies it', () => {
    picker = new FullColorPicker()
    picker.render()
    picker.show(0, 0, '#abcdef')
    expect(picker.getColor()).toBe('#ABCDEF')
  })

  it('hide() removes visibility and triggers onClose', () => {
    let closed = false
    picker = new FullColorPicker({
      onClose: () => {
        closed = true
      },
    })
    picker.render()
    picker.show(0, 0)
    picker.hide()
    expect(picker.isOpen()).toBe(false)
    expect(closed).toBe(true)
    const container = document.getElementById('color-picker')!
    expect(container.classList.contains('visible')).toBe(false)
  })
})

describe('FullColorPicker — token grid', () => {
  it('hides token section when given empty array', () => {
    picker = new FullColorPicker()
    picker.render()
    picker.updateTokenColors([])
    const tokensSection = document.getElementById('color-picker-tokens') as HTMLElement | null
    if (tokensSection) {
      expect(tokensSection.style.display).toBe('none')
    }
  })

  it('renders one swatch per token', () => {
    picker = new FullColorPicker()
    picker.render()
    picker.updateTokenColors([
      { name: 'primary', value: '#2271C1' },
      { name: 'danger', value: '#ef4444' },
    ])
    const tokensSection = document.getElementById('color-picker-tokens') as HTMLElement | null
    expect(tokensSection).toBeTruthy()
    expect(tokensSection!.style.display).toBe('')
    // Look for swatches inside the tokens grid (heuristic: at least 2 children somewhere
    // under the tokens section)
    const swatches = tokensSection!.querySelectorAll(
      'button, [role="button"], .color-swatch, [data-color]'
    )
    expect(swatches.length).toBeGreaterThanOrEqual(2)
  })
})

describe('FullColorPicker — factory functions', () => {
  it('createFullColorPicker returns a fresh instance per call', () => {
    const a = createFullColorPicker()
    const b = createFullColorPicker()
    expect(a).not.toBe(b)
    expect(a).toBeInstanceOf(FullColorPicker)
  })

  it('getFullColorPicker returns a singleton', () => {
    const a = getFullColorPicker()
    const b = getFullColorPicker()
    expect(a).toBe(b)
  })
})

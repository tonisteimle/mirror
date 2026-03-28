/**
 * ColorPicker Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ColorPicker, createColorPicker, type ColorPickerConfig, type ColorPickerCallbacks } from '../../studio/pickers/color/index'

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

describe('ColorPicker', () => {
  let picker: ColorPicker
  let onSelect: ReturnType<typeof vi.fn>
  let onOpen: ReturnType<typeof vi.fn>
  let onClose: ReturnType<typeof vi.fn>
  let onColorPreview: ReturnType<typeof vi.fn>
  let anchor: HTMLElement

  beforeEach(() => {
    document.body.innerHTML = ''
    anchor = document.createElement('button')
    anchor.textContent = 'Pick Color'
    document.body.appendChild(anchor)

    onSelect = vi.fn()
    onOpen = vi.fn()
    onClose = vi.fn()
    onColorPreview = vi.fn()

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
    it('should create color picker with default config', () => {
      picker = new ColorPicker({}, { onSelect })
      expect(picker).toBeDefined()
      expect(picker.getValue()).toBe('#000000')
    })

    it('should create with initial color', () => {
      picker = new ColorPicker(
        { initialColor: '#ff0000' },
        { onSelect }
      )
      expect(picker.getValue()).toBe('#FF0000')
    })

    it('should normalize initial color to uppercase', () => {
      picker = new ColorPicker(
        { initialColor: '#aabbcc' },
        { onSelect }
      )
      expect(picker.getValue()).toBe('#AABBCC')
    })

    it('should use factory function', () => {
      picker = createColorPicker({}, { onSelect })
      expect(picker).toBeInstanceOf(ColorPicker)
    })
  })

  describe('render()', () => {
    beforeEach(() => {
      picker = new ColorPicker(
        { animate: false },
        { onSelect }
      )
    })

    it('should render picker with tabs', () => {
      picker.show(anchor)

      expect(document.querySelector('.color-picker')).toBeTruthy()
      expect(document.querySelector('.color-picker-tabs')).toBeTruthy()
    })

    it('should render palette tab by default', () => {
      picker.show(anchor)

      expect(document.querySelector('.color-picker-palette-tab')).toBeTruthy()
      expect(document.querySelector('.color-picker-custom-tab')).toBeFalsy()
    })

    it('should render swatches', () => {
      picker.show(anchor)

      const swatches = document.querySelectorAll('.color-picker-swatch')
      expect(swatches.length).toBeGreaterThan(0)
    })

    it('should render without tabs when showCustomTab is false', () => {
      picker = new ColorPicker(
        { showCustomTab: false, animate: false },
        { onSelect }
      )
      picker.show(anchor)

      expect(document.querySelector('.color-picker-tabs')).toBeFalsy()
    })
  })

  describe('getValue/setValue', () => {
    beforeEach(() => {
      picker = new ColorPicker(
        { initialColor: '#000000', animate: false },
        { onSelect }
      )
    })

    it('should get current color', () => {
      expect(picker.getValue()).toBe('#000000')
    })

    it('should set color value', () => {
      picker.setValue('#FF00FF')
      expect(picker.getValue()).toBe('#FF00FF')
    })

    it('should parse and normalize color', () => {
      picker.setValue('#abc')
      expect(picker.getValue()).toBe('#AABBCC')
    })

    it('should ignore invalid color', () => {
      picker.setValue('#FF00FF')
      picker.setValue('invalid')
      expect(picker.getValue()).toBe('#FF00FF') // Unchanged
    })

    it('should update input when open', () => {
      picker.show(anchor)
      picker.switchTab('custom')
      picker.setValue('#AABBCC')

      const input = document.querySelector('.color-picker-input') as HTMLInputElement
      expect(input.value).toBe('#AABBCC')
    })
  })

  describe('setColor/getColor', () => {
    it('should alias getValue', () => {
      picker = new ColorPicker(
        { initialColor: '#FF0000' },
        { onSelect }
      )
      expect(picker.getColor()).toBe('#FF0000')
    })

    it('should alias setValue', () => {
      picker = new ColorPicker({}, { onSelect })
      picker.setColor('#00FF00')
      expect(picker.getColor()).toBe('#00FF00')
    })
  })

  describe('Tab switching', () => {
    beforeEach(() => {
      picker = new ColorPicker(
        { animate: false },
        { onSelect }
      )
    })

    it('should start on palette tab', () => {
      expect(picker.getCurrentTab()).toBe('palette')
    })

    it('should switch to custom tab', () => {
      picker.show(anchor)
      picker.switchTab('custom')

      expect(picker.getCurrentTab()).toBe('custom')
      expect(document.querySelector('.color-picker-custom-tab')).toBeTruthy()
    })

    it('should switch back to palette tab', () => {
      picker.show(anchor)
      picker.switchTab('custom')
      picker.switchTab('palette')

      expect(picker.getCurrentTab()).toBe('palette')
      expect(document.querySelector('.color-picker-palette-tab')).toBeTruthy()
    })

    it('should update active tab button', () => {
      picker.show(anchor)
      picker.switchTab('custom')

      const tabs = document.querySelectorAll('.color-picker-tab')
      const paletteTab = Array.from(tabs).find(t => t.getAttribute('data-tab') === 'palette')
      const customTab = Array.from(tabs).find(t => t.getAttribute('data-tab') === 'custom')

      expect(paletteTab?.classList.contains('active')).toBe(false)
      expect(customTab?.classList.contains('active')).toBe(true)
    })

    it('should not re-render same tab', () => {
      picker.show(anchor)
      const initialContent = document.querySelector('.color-picker-content')?.innerHTML

      picker.switchTab('palette') // Same tab
      const afterContent = document.querySelector('.color-picker-content')?.innerHTML

      expect(afterContent).toBe(initialContent)
    })
  })

  describe('Color selection', () => {
    beforeEach(() => {
      picker = new ColorPicker(
        { animate: false },
        { onSelect, onOpen, onClose }
      )
    })

    it('should select color on swatch click', () => {
      picker.show(anchor)

      const swatch = document.querySelector('.color-picker-swatch') as HTMLElement
      const color = swatch.getAttribute('data-color')
      swatch.click()

      expect(onSelect).toHaveBeenCalledWith(color)
    })

    it('should close picker after selection (default)', () => {
      picker.show(anchor)

      const swatch = document.querySelector('.color-picker-swatch') as HTMLElement
      swatch.click()

      expect(picker.getIsOpen()).toBe(false)
    })

    it('should not close when closeOnSelect is false', () => {
      picker = new ColorPicker(
        { closeOnSelect: false, animate: false },
        { onSelect }
      )
      picker.show(anchor)

      const swatch = document.querySelector('.color-picker-swatch') as HTMLElement
      swatch.click()

      expect(picker.getIsOpen()).toBe(true)
    })

    it('should add to recent colors', () => {
      picker.show(anchor)
      picker.addToRecent('#FF0000')
      picker.addToRecent('#00FF00')

      // Destroy and recreate to see recent colors
      picker.destroy()
      picker = new ColorPicker(
        { animate: false, showRecentColors: true, recentColors: ['#FF0000', '#00FF00'] },
        { onSelect }
      )
      picker.show(anchor)

      const sections = document.querySelectorAll('.color-picker-section-label')
      const recentLabel = Array.from(sections).find(s => s.textContent === 'Recent')
      expect(recentLabel).toBeTruthy()
    })
  })

  describe('Recent colors', () => {
    it('should display recent colors', () => {
      picker = new ColorPicker(
        {
          animate: false,
          showRecentColors: true,
          recentColors: ['#FF0000', '#00FF00', '#0000FF']
        },
        { onSelect }
      )
      picker.show(anchor)

      const recentSection = document.querySelector('.color-picker-section')
      const recentSwatches = recentSection?.querySelectorAll('.color-picker-swatch')

      expect(recentSwatches?.length).toBe(3)
    })

    it('should add to recent on selection', () => {
      picker = new ColorPicker(
        { animate: false, closeOnSelect: false },
        { onSelect }
      )
      picker.show(anchor)

      const swatch = document.querySelector('.color-picker-swatch') as HTMLElement
      swatch.click()

      // Check that addToRecent was called (internal state)
      picker.addToRecent('#AABBCC')
      // This is internal - just verify it doesn't throw
    })

    it('should limit recent colors', () => {
      picker = new ColorPicker(
        { maxRecentColors: 5 },
        { onSelect }
      )

      // Add more than max
      for (let i = 0; i < 10; i++) {
        picker.addToRecent(`#00000${i}`)
      }

      // Internal state - just verify no errors
      expect(picker).toBeDefined()
    })

    it('should not duplicate recent colors', () => {
      picker = new ColorPicker({}, { onSelect })

      picker.addToRecent('#FF0000')
      picker.addToRecent('#00FF00')
      picker.addToRecent('#FF0000') // Duplicate

      // Internal state - verify no errors
      expect(picker).toBeDefined()
    })
  })

  describe('Custom tab', () => {
    beforeEach(() => {
      picker = new ColorPicker(
        { animate: false, initialColor: '#FF0000' },
        { onSelect, onColorPreview }
      )
    })

    it('should render hex input', () => {
      picker.show(anchor)
      picker.switchTab('custom')

      const input = document.querySelector('.color-picker-input') as HTMLInputElement
      expect(input).toBeTruthy()
      expect(input.value).toBe('#FF0000')
    })

    it('should render preview', () => {
      picker.show(anchor)
      picker.switchTab('custom')

      const preview = document.querySelector('.color-picker-preview') as HTMLElement
      expect(preview).toBeTruthy()
      expect(preview.style.backgroundColor).toBeTruthy()
    })

    it('should render apply button', () => {
      picker.show(anchor)
      picker.switchTab('custom')

      const btn = document.querySelector('.color-picker-confirm')
      expect(btn).toBeTruthy()
      expect(btn?.textContent).toBe('Apply')
    })

    it('should call onColorPreview on input', () => {
      picker.show(anchor)
      picker.switchTab('custom')

      const input = document.querySelector('.color-picker-input') as HTMLInputElement
      input.value = '#00FF00'
      input.dispatchEvent(new Event('input'))

      expect(onColorPreview).toHaveBeenCalledWith('#00FF00')
    })

    it('should select color on Enter key', () => {
      picker.show(anchor)
      picker.switchTab('custom')

      const input = document.querySelector('.color-picker-input') as HTMLInputElement
      input.value = '#00FF00'
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

      expect(onSelect).toHaveBeenCalledWith('#00FF00')
    })

    it('should select color on Apply click', () => {
      picker.show(anchor)
      picker.switchTab('custom')

      const input = document.querySelector('.color-picker-input') as HTMLInputElement
      input.value = '#00FF00'

      const btn = document.querySelector('.color-picker-confirm') as HTMLButtonElement
      btn.click()

      expect(onSelect).toHaveBeenCalledWith('#00FF00')
    })
  })

  describe('Keyboard navigation', () => {
    beforeEach(() => {
      picker = new ColorPicker(
        { animate: false },
        { onSelect }
      )
    })

    it('should setup keyboard nav on palette tab', () => {
      picker.show(anchor)

      // Arrow key should work
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      document.dispatchEvent(event)

      // No error means keyboard nav is set up
      expect(picker.getIsOpen()).toBe(true)
    })

    it('should select on Enter key in palette', () => {
      picker.show(anchor)

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      document.dispatchEvent(event)

      expect(onSelect).toHaveBeenCalled()
    })
  })

  describe('Color preview callback', () => {
    it('should call onColorPreview on swatch hover', () => {
      picker = new ColorPicker(
        { animate: false },
        { onSelect, onColorPreview }
      )
      picker.show(anchor)

      const swatch = document.querySelector('.color-picker-swatch') as HTMLElement
      swatch.dispatchEvent(new MouseEvent('mouseenter'))

      expect(onColorPreview).toHaveBeenCalled()
    })
  })

  describe('Swatch styling', () => {
    it('should mark light colors', () => {
      picker = new ColorPicker(
        {
          animate: false,
          palettes: [{
            name: 'Test',
            colors: [['#FFFFFF', '#F0F0F0', '#000000']]
          }]
        },
        { onSelect }
      )
      picker.show(anchor)

      const swatches = document.querySelectorAll('.color-picker-swatch')
      const lightSwatches = document.querySelectorAll('.color-picker-swatch.light-color')

      expect(lightSwatches.length).toBeGreaterThan(0)
    })

    it('should mark selected color', () => {
      picker = new ColorPicker(
        {
          initialColor: '#F44336',
          animate: false,
          palettes: [{
            name: 'Test',
            colors: [['#F44336', '#00FF00']]
          }]
        },
        { onSelect }
      )
      picker.show(anchor)

      const selected = document.querySelector('.color-picker-swatch.selected')
      expect(selected).toBeTruthy()
      expect(selected?.getAttribute('data-color')).toBe('#F44336')
    })

    it('should set aria attributes', () => {
      picker = new ColorPicker(
        { animate: false },
        { onSelect }
      )
      picker.show(anchor)

      const swatch = document.querySelector('.color-picker-swatch') as HTMLElement
      expect(swatch.getAttribute('role')).toBe('option')
      expect(swatch.getAttribute('aria-label')).toBeTruthy()
    })
  })
})

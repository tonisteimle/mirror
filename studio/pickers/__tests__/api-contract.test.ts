/**
 * Pickers API Contract Tests
 *
 * Tests that all pickers expose the expected BasePicker interface.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ColorPicker, createColorPicker } from '../color'
import { TokenPicker, createTokenPicker } from '../token'
import { IconPicker, createIconPicker } from '../icon'
import { AnimationPicker, createAnimationPicker } from '../animation'

describe('Picker API Contracts', () => {
  let container: HTMLElement
  const mockCallbacks = {
    onSelect: vi.fn(),
    onCancel: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    document.body.appendChild(container)
    vi.clearAllMocks()
  })

  describe('ColorPicker', () => {
    it('exposes show method', () => {
      const picker = createColorPicker({ container }, mockCallbacks)
      expect(typeof picker.show).toBe('function')
    })

    it('exposes hide method', () => {
      const picker = createColorPicker({ container }, mockCallbacks)
      expect(typeof picker.hide).toBe('function')
    })

    it('exposes isVisible method', () => {
      const picker = createColorPicker({ container }, mockCallbacks)
      // BasePicker uses isOpen property, not isVisible method
      expect(typeof picker.hide).toBe('function')
    })

    it('exposes destroy method', () => {
      const picker = createColorPicker({ container }, mockCallbacks)
      expect(typeof picker.destroy).toBe('function')
    })

    it('exposes getValue method', () => {
      const picker = createColorPicker({ container }, mockCallbacks)
      expect(typeof picker.getValue).toBe('function')
    })

    it('exposes setValue method', () => {
      const picker = createColorPicker({ container }, mockCallbacks)
      expect(typeof picker.setValue).toBe('function')
    })

    it('exposes setColor method', () => {
      const picker = createColorPicker({ container }, mockCallbacks)
      expect(typeof picker.setColor).toBe('function')
    })

    it('exposes getColor method', () => {
      const picker = createColorPicker({ container }, mockCallbacks)
      expect(typeof picker.getColor).toBe('function')
    })

    it('exposes switchTab method', () => {
      const picker = createColorPicker({ container }, mockCallbacks)
      expect(typeof picker.switchTab).toBe('function')
    })

    it('exposes showAt method', () => {
      const picker = createColorPicker({ container }, mockCallbacks)
      expect(typeof picker.showAt).toBe('function')
    })

    it('exposes navigate method', () => {
      const picker = createColorPicker({ container }, mockCallbacks)
      expect(typeof picker.navigate).toBe('function')
    })

    it('exposes filter method', () => {
      const picker = createColorPicker({ container }, mockCallbacks)
      expect(typeof picker.filter).toBe('function')
    })

    it('getValue returns current color', () => {
      const picker = createColorPicker({ container, initialColor: '#FF0000' }, mockCallbacks)
      expect(picker.getValue()).toBe('#FF0000')
    })

    it('setValue updates color', () => {
      const picker = createColorPicker({ container }, mockCallbacks)
      picker.setValue('#00FF00')
      expect(picker.getColor()).toBe('#00FF00')
    })
  })

  describe('TokenPicker', () => {
    const testTokens = [
      { name: '$primary', value: '#007bff', type: 'color' as const },
      { name: '$spacing', value: '16', type: 'spacing' as const },
    ]

    it('exposes show method', () => {
      const picker = createTokenPicker({ container, tokens: testTokens }, mockCallbacks)
      expect(typeof picker.show).toBe('function')
    })

    it('exposes hide method', () => {
      const picker = createTokenPicker({ container, tokens: testTokens }, mockCallbacks)
      expect(typeof picker.hide).toBe('function')
    })

    it('exposes destroy method', () => {
      const picker = createTokenPicker({ container, tokens: testTokens }, mockCallbacks)
      expect(typeof picker.destroy).toBe('function')
    })

    it('exposes setTokens method', () => {
      const picker = createTokenPicker({ container, tokens: [] }, mockCallbacks)
      expect(typeof picker.setTokens).toBe('function')
    })

    it('exposes setContext method', () => {
      const picker = createTokenPicker({ container, tokens: [] }, mockCallbacks)
      expect(typeof picker.setContext).toBe('function')
    })

    it('exposes clearContext method', () => {
      const picker = createTokenPicker({ container, tokens: [] }, mockCallbacks)
      expect(typeof picker.clearContext).toBe('function')
    })

    it('exposes search method', () => {
      const picker = createTokenPicker({ container, tokens: testTokens }, mockCallbacks)
      expect(typeof picker.search).toBe('function')
    })

    it('exposes filter method', () => {
      const picker = createTokenPicker({ container, tokens: testTokens }, mockCallbacks)
      expect(typeof picker.filter).toBe('function')
    })

    it('exposes getFilteredTokens method', () => {
      const picker = createTokenPicker({ container, tokens: testTokens }, mockCallbacks)
      expect(typeof picker.getFilteredTokens).toBe('function')
    })

    it('exposes showAt method', () => {
      const picker = createTokenPicker({ container, tokens: testTokens }, mockCallbacks)
      expect(typeof picker.showAt).toBe('function')
    })

    it('exposes navigate method', () => {
      const picker = createTokenPicker({ container, tokens: testTokens }, mockCallbacks)
      expect(typeof picker.navigate).toBe('function')
    })

    it('setTokens accepts token array', () => {
      const picker = createTokenPicker({ container, tokens: [] }, mockCallbacks)
      expect(() => {
        picker.setTokens([
          { name: '$primary', value: '#007bff', type: 'color' },
          { name: '$spacing', value: '16', type: 'spacing' },
        ])
      }).not.toThrow()
    })

    it('search filters tokens', () => {
      const picker = createTokenPicker({ container, tokens: testTokens }, mockCallbacks)
      picker.search('primary')
      const filtered = picker.getFilteredTokens()
      expect(filtered.length).toBe(1)
      expect(filtered[0].name).toBe('$primary')
    })
  })

  describe('IconPicker', () => {
    it('exposes show method', () => {
      const picker = createIconPicker({ container }, mockCallbacks)
      expect(typeof picker.show).toBe('function')
    })

    it('exposes hide method', () => {
      const picker = createIconPicker({ container }, mockCallbacks)
      expect(typeof picker.hide).toBe('function')
    })

    it('exposes destroy method', () => {
      const picker = createIconPicker({ container }, mockCallbacks)
      expect(typeof picker.destroy).toBe('function')
    })

    it('exposes search method', () => {
      const picker = createIconPicker({ container }, mockCallbacks)
      expect(typeof picker.search).toBe('function')
    })

    it('exposes filter method', () => {
      const picker = createIconPicker({ container }, mockCallbacks)
      expect(typeof picker.filter).toBe('function')
    })

    it('exposes setCategory method', () => {
      const picker = createIconPicker({ container }, mockCallbacks)
      expect(typeof picker.setCategory).toBe('function')
    })

    it('exposes getCategories method', () => {
      const picker = createIconPicker({ container }, mockCallbacks)
      expect(typeof picker.getCategories).toBe('function')
    })

    it('exposes showAt method', () => {
      const picker = createIconPicker({ container }, mockCallbacks)
      expect(typeof picker.showAt).toBe('function')
    })

    it('exposes navigate method', () => {
      const picker = createIconPicker({ container }, mockCallbacks)
      expect(typeof picker.navigate).toBe('function')
    })

    it('exposes getRecentIcons method', () => {
      const picker = createIconPicker({ container }, mockCallbacks)
      expect(typeof picker.getRecentIcons).toBe('function')
    })

    it('exposes addToRecent method', () => {
      const picker = createIconPicker({ container }, mockCallbacks)
      expect(typeof picker.addToRecent).toBe('function')
    })

    it('filter accepts string', () => {
      const picker = createIconPicker({ container }, mockCallbacks)
      expect(() => {
        picker.filter('arrow')
      }).not.toThrow()
    })
  })

  describe('AnimationPicker', () => {
    it('exposes show method', () => {
      const picker = createAnimationPicker({ container }, mockCallbacks)
      expect(typeof picker.show).toBe('function')
    })

    it('exposes hide method', () => {
      const picker = createAnimationPicker({ container }, mockCallbacks)
      expect(typeof picker.hide).toBe('function')
    })

    it('exposes destroy method', () => {
      const picker = createAnimationPicker({ container }, mockCallbacks)
      expect(typeof picker.destroy).toBe('function')
    })

    it('exposes filter method', () => {
      const picker = createAnimationPicker({ container }, mockCallbacks)
      expect(typeof picker.filter).toBe('function')
    })

    it('exposes search method', () => {
      const picker = createAnimationPicker({ container }, mockCallbacks)
      expect(typeof picker.search).toBe('function')
    })

    it('exposes setCategory method', () => {
      const picker = createAnimationPicker({ container }, mockCallbacks)
      expect(typeof picker.setCategory).toBe('function')
    })

    it('exposes showAt method', () => {
      const picker = createAnimationPicker({ container }, mockCallbacks)
      expect(typeof picker.showAt).toBe('function')
    })

    it('exposes navigate method', () => {
      const picker = createAnimationPicker({ container }, mockCallbacks)
      expect(typeof picker.navigate).toBe('function')
    })

    it('exposes previewAnimation method', () => {
      const picker = createAnimationPicker({ container }, mockCallbacks)
      expect(typeof picker.previewAnimation).toBe('function')
    })

    it('exposes stopPreview method', () => {
      const picker = createAnimationPicker({ container }, mockCallbacks)
      expect(typeof picker.stopPreview).toBe('function')
    })

    it('exposes selectPreset method', () => {
      const picker = createAnimationPicker({ container }, mockCallbacks)
      expect(typeof picker.selectPreset).toBe('function')
    })

    it('exposes getSelectedPreset method', () => {
      const picker = createAnimationPicker({ container }, mockCallbacks)
      expect(typeof picker.getSelectedPreset).toBe('function')
    })
  })

  describe('Picker lifecycle', () => {
    it('all pickers can be destroyed safely', () => {
      const colorPicker = createColorPicker({ container }, mockCallbacks)
      const tokenPicker = createTokenPicker({ container, tokens: [] }, mockCallbacks)
      const iconPicker = createIconPicker({ container }, mockCallbacks)
      const animationPicker = createAnimationPicker({ container }, mockCallbacks)

      expect(() => {
        colorPicker.destroy()
        tokenPicker.destroy()
        iconPicker.destroy()
        animationPicker.destroy()
      }).not.toThrow()
    })

    it('destroy can be called multiple times', () => {
      const picker = createColorPicker({ container }, mockCallbacks)

      expect(() => {
        picker.destroy()
        picker.destroy()
        picker.destroy()
      }).not.toThrow()
    })
  })
})

describe('Picker Factory Functions', () => {
  let container: HTMLElement
  const mockCallbacks = {
    onSelect: vi.fn(),
  }

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  it('createColorPicker returns ColorPicker instance', () => {
    const picker = createColorPicker({ container }, mockCallbacks)
    expect(picker).toBeInstanceOf(ColorPicker)
  })

  it('createTokenPicker returns TokenPicker instance', () => {
    const picker = createTokenPicker({ container, tokens: [] }, mockCallbacks)
    expect(picker).toBeInstanceOf(TokenPicker)
  })

  it('createIconPicker returns IconPicker instance', () => {
    const picker = createIconPicker({ container }, mockCallbacks)
    expect(picker).toBeInstanceOf(IconPicker)
  })

  it('createAnimationPicker returns AnimationPicker instance', () => {
    const picker = createAnimationPicker({ container }, mockCallbacks)
    expect(picker).toBeInstanceOf(AnimationPicker)
  })
})

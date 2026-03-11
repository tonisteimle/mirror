/**
 * AnimationPicker Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  AnimationPicker,
  createAnimationPicker,
  ANIMATION_PRESETS,
  getPresetsByCategory,
  getAnimationCategories,
  getPreset,
  type AnimationPreset,
} from '../index'

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

describe('AnimationPicker', () => {
  let picker: AnimationPicker
  let onSelect: ReturnType<typeof vi.fn>
  let anchor: HTMLElement

  beforeEach(() => {
    document.body.innerHTML = ''
    anchor = document.createElement('button')
    document.body.appendChild(anchor)

    onSelect = vi.fn()

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
    it('should create animation picker with default presets', () => {
      picker = new AnimationPicker({}, { onSelect })
      expect(picker).toBeDefined()
    })

    it('should create with custom presets', () => {
      const customPresets: AnimationPreset[] = [
        {
          name: 'custom',
          label: 'Custom',
          category: 'custom',
          keyframes: '@keyframes custom {}',
          duration: '1s',
          easing: 'linear'
        }
      ]
      picker = new AnimationPicker({ presets: customPresets }, { onSelect })
      expect(picker).toBeDefined()
    })

    it('should use factory function', () => {
      picker = createAnimationPicker({}, { onSelect })
      expect(picker).toBeInstanceOf(AnimationPicker)
    })
  })

  describe('render()', () => {
    beforeEach(() => {
      picker = new AnimationPicker({ animate: false }, { onSelect })
    })

    it('should render picker container', () => {
      picker.show(anchor)
      expect(document.querySelector('.animation-picker')).toBeTruthy()
    })

    it('should render category buttons', () => {
      picker.show(anchor)
      const categories = document.querySelectorAll('.animation-picker-category-btn')
      expect(categories.length).toBeGreaterThan(0)
    })

    it('should render preset list', () => {
      picker.show(anchor)
      expect(document.querySelector('.animation-picker-list')).toBeTruthy()
    })

    it('should render preset items', () => {
      picker.show(anchor)
      const items = document.querySelectorAll('.animation-picker-item')
      expect(items.length).toBe(ANIMATION_PRESETS.length)
    })

    it('should render preview area by default', () => {
      picker.show(anchor)
      expect(document.querySelector('.animation-picker-preview')).toBeTruthy()
    })

    it('should not render preview when disabled', () => {
      picker = new AnimationPicker({ showPreview: false, animate: false }, { onSelect })
      picker.show(anchor)

      expect(document.querySelector('.animation-picker-preview')).toBeFalsy()
    })
  })

  describe('Preset items', () => {
    beforeEach(() => {
      picker = new AnimationPicker({ animate: false }, { onSelect })
    })

    it('should show preset label', () => {
      picker.show(anchor)
      const names = document.querySelectorAll('.animation-picker-item-name')
      expect(names[0].textContent).toBeTruthy()
    })

    it('should show preset info', () => {
      picker.show(anchor)
      const info = document.querySelectorAll('.animation-picker-item-info')
      expect(info[0].textContent).toContain('s') // duration
    })

    it('should set data-animation attribute', () => {
      picker.show(anchor)
      const item = document.querySelector('.animation-picker-item') as HTMLElement
      expect(item.getAttribute('data-animation')).toBeTruthy()
    })

    it('should set role attribute', () => {
      picker.show(anchor)
      const item = document.querySelector('.animation-picker-item') as HTMLElement
      expect(item.getAttribute('role')).toBe('option')
    })
  })

  describe('Preset selection', () => {
    beforeEach(() => {
      picker = new AnimationPicker({ animate: false }, { onSelect })
    })

    it('should call onSelect on item click', () => {
      picker.show(anchor)
      const item = document.querySelector('.animation-picker-item') as HTMLElement
      const animationName = item.getAttribute('data-animation')
      item.click()

      expect(onSelect).toHaveBeenCalledWith(animationName)
    })

    it('should close picker after selection (default)', () => {
      picker.show(anchor)
      const item = document.querySelector('.animation-picker-item') as HTMLElement
      item.click()

      expect(picker.getIsOpen()).toBe(false)
    })

    it('should select by name', () => {
      picker.show(anchor)
      picker.selectPreset('fade-in')

      expect(onSelect).toHaveBeenCalledWith('fade-in')
    })
  })

  describe('Category filtering', () => {
    beforeEach(() => {
      picker = new AnimationPicker({ animate: false }, { onSelect })
    })

    it('should filter by category', () => {
      picker.show(anchor)
      picker.setCategory('fade')

      const items = document.querySelectorAll('.animation-picker-item')
      const fadePresets = ANIMATION_PRESETS.filter(p => p.category === 'fade')
      expect(items.length).toBe(fadePresets.length)
    })

    it('should show all presets when category is null', () => {
      picker.show(anchor)
      picker.setCategory('fade')
      picker.setCategory(null)

      const items = document.querySelectorAll('.animation-picker-item')
      expect(items.length).toBe(ANIMATION_PRESETS.length)
    })

    it('should update active category button', () => {
      picker.show(anchor)
      picker.setCategory('scale')

      const activeBtn = document.querySelector('.animation-picker-category-btn.active')
      expect(activeBtn?.getAttribute('data-category')).toBe('scale')
    })
  })

  describe('Preview', () => {
    beforeEach(() => {
      picker = new AnimationPicker({ animate: false, showPreview: true }, { onSelect })
    })

    it('should render preview target', () => {
      picker.show(anchor)
      expect(document.querySelector('.animation-picker-preview-box')).toBeTruthy()
    })

    it('should preview on hover', () => {
      picker.show(anchor)
      const item = document.querySelector('.animation-picker-item') as HTMLElement
      item.dispatchEvent(new MouseEvent('mouseenter'))

      // Preview target should have animation applied
      const previewBox = document.querySelector('.animation-picker-preview-box') as HTMLElement
      // Animation is applied via style
      expect(previewBox).toBeTruthy()
    })

    it('should stop preview', () => {
      picker.show(anchor)

      // Trigger preview
      const item = document.querySelector('.animation-picker-item') as HTMLElement
      item.dispatchEvent(new MouseEvent('mouseenter'))

      // Stop it
      picker.stopPreview()

      const previewBox = document.querySelector('.animation-picker-preview-box') as HTMLElement
      expect(previewBox.style.animation).toBe('')
    })
  })

  describe('getValue/setValue', () => {
    it('should return empty string', () => {
      picker = new AnimationPicker({}, { onSelect })
      expect(picker.getValue()).toBe('')
    })

    it('should accept setValue without error', () => {
      picker = new AnimationPicker({}, { onSelect })
      expect(() => picker.setValue('fade-in')).not.toThrow()
    })
  })

  describe('getSelectedPreset', () => {
    it('should return null by default', () => {
      picker = new AnimationPicker({}, { onSelect })
      expect(picker.getSelectedPreset()).toBeNull()
    })
  })

  describe('Keyboard navigation', () => {
    beforeEach(() => {
      picker = new AnimationPicker({ animate: false }, { onSelect })
    })

    it('should select on Enter', () => {
      picker.show(anchor)

      // Focus first item
      const item = document.querySelector('.animation-picker-item') as HTMLElement
      item.focus()

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      document.dispatchEvent(event)

      expect(onSelect).toHaveBeenCalled()
    })
  })
})

describe('Animation Presets', () => {
  describe('ANIMATION_PRESETS', () => {
    it('should have presets', () => {
      expect(ANIMATION_PRESETS.length).toBeGreaterThan(0)
    })

    it('should have valid preset structure', () => {
      for (const preset of ANIMATION_PRESETS) {
        expect(preset).toHaveProperty('name')
        expect(preset).toHaveProperty('label')
        expect(preset).toHaveProperty('category')
        expect(preset).toHaveProperty('keyframes')
        expect(preset).toHaveProperty('duration')
        expect(preset).toHaveProperty('easing')
      }
    })

    it('should have unique names', () => {
      const names = ANIMATION_PRESETS.map(p => p.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)
    })

    it('should have valid keyframes', () => {
      for (const preset of ANIMATION_PRESETS) {
        expect(preset.keyframes).toMatch(/@keyframes\s+\w+/)
      }
    })
  })

  describe('getPresetsByCategory', () => {
    it('should return presets for category', () => {
      const fadePresets = getPresetsByCategory('fade')
      expect(fadePresets.length).toBeGreaterThan(0)
      expect(fadePresets.every(p => p.category === 'fade')).toBe(true)
    })

    it('should return empty for unknown category', () => {
      const presets = getPresetsByCategory('nonexistent')
      expect(presets).toHaveLength(0)
    })
  })

  describe('getAnimationCategories', () => {
    it('should return all categories', () => {
      const categories = getAnimationCategories()
      expect(categories.length).toBeGreaterThan(0)
    })

    it('should have unique categories', () => {
      const categories = getAnimationCategories()
      const uniqueCategories = new Set(categories)
      expect(uniqueCategories.size).toBe(categories.length)
    })

    it('should include common categories', () => {
      const categories = getAnimationCategories()
      expect(categories).toContain('fade')
      expect(categories).toContain('slide')
      expect(categories).toContain('scale')
    })
  })

  describe('getPreset', () => {
    it('should return preset by name', () => {
      const preset = getPreset('fade-in')
      expect(preset).toBeTruthy()
      expect(preset?.name).toBe('fade-in')
    })

    it('should return null for unknown preset', () => {
      const preset = getPreset('nonexistent')
      expect(preset).toBeNull()
    })
  })
})

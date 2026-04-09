/**
 * Color Picker Module
 */

import { BasePicker, KeyboardNav, type PickerConfig, type PickerCallbacks } from '../base'
import {
  DEFAULT_PALETTES,
  ALL_PALETTES,
  GRAYS,
  QUICK_COLORS,
  COLORS,
  OPEN_COLORS,
  TAILWIND_COLORS,
  OPEN_COLOR_PALETTE,
  TAILWIND_PALETTE,
  MATERIAL_PALETTE,
  parseColor,
  isLightColor,
  type ColorPalette,
} from './palette'

export {
  parseColor,
  isLightColor,
  hexToHSL,
  hslToHex,
  generateShades,
  DEFAULT_PALETTES,
  ALL_PALETTES,
  GRAYS,
  QUICK_COLORS,
  COLORS,
  OPEN_COLORS,
  TAILWIND_COLORS,
  OPEN_COLOR_PALETTE,
  TAILWIND_PALETTE,
  MATERIAL_PALETTE,
} from './palette'
export type { ColorPalette }

export interface ColorPickerConfig extends Partial<PickerConfig> {
  initialColor?: string
  palettes?: ColorPalette[]
  showCustomTab?: boolean
  showRecentColors?: boolean
  recentColors?: string[]
  maxRecentColors?: number
}

export interface ColorPickerCallbacks extends PickerCallbacks {
  onColorPreview?: (color: string) => void
}

export class ColorPicker extends BasePicker {
  private currentTab: 'palette' | 'custom' = 'palette'
  private currentColor: string = '#000000'
  private recentColors: string[] = []
  private maxRecentColors: number
  private palettes: ColorPalette[]
  private showCustomTab: boolean
  private showRecentColors: boolean
  private customInput: HTMLInputElement | null = null
  private swatchElements: HTMLElement[] = []

  constructor(config: ColorPickerConfig, callbacks: ColorPickerCallbacks) {
    super(config, callbacks, 'color')

    this.currentColor = config.initialColor?.toUpperCase() || '#000000'
    this.palettes = config.palettes || DEFAULT_PALETTES
    this.showCustomTab = config.showCustomTab ?? true
    this.showRecentColors = config.showRecentColors ?? true
    this.recentColors = config.recentColors || []
    this.maxRecentColors = config.maxRecentColors || 10
  }

  render(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'color-picker'

    // Tabs (if custom tab enabled)
    if (this.showCustomTab) {
      container.appendChild(this.renderTabs())
    }

    // Content area
    const content = document.createElement('div')
    content.className = 'color-picker-content'

    if (this.currentTab === 'palette') {
      content.appendChild(this.renderPaletteTab())
    } else {
      content.appendChild(this.renderCustomTab())
    }

    container.appendChild(content)

    // Setup keyboard navigation
    this.setupKeyboardNav()

    return container
  }

  getValue(): string {
    return this.currentColor
  }

  setValue(value: string): void {
    const parsed = parseColor(value)
    if (parsed) {
      this.currentColor = parsed
      if (this.customInput) {
        this.customInput.value = parsed
      }
    }
  }

  setColor(color: string): void {
    this.setValue(color)
  }

  getColor(): string {
    return this.currentColor
  }

  switchTab(tab: 'palette' | 'custom'): void {
    if (this.currentTab === tab) return

    this.currentTab = tab

    // Re-render if open
    if (this.isOpen && this.element) {
      const content = this.element.querySelector('.color-picker-content')
      if (content) {
        content.innerHTML = ''
        if (tab === 'palette') {
          content.appendChild(this.renderPaletteTab())
        } else {
          content.appendChild(this.renderCustomTab())
        }
        this.setupKeyboardNav()
      }

      // Update tab buttons
      this.element.querySelectorAll('.color-picker-tab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tab)
      })
    }
  }

  getCurrentTab(): 'palette' | 'custom' {
    return this.currentTab
  }

  addToRecent(color: string): void {
    const normalized = color.toUpperCase()
    this.recentColors = [
      normalized,
      ...this.recentColors.filter(c => c !== normalized),
    ].slice(0, this.maxRecentColors)
  }

  /**
   * Show the picker at a specific position (for TriggerManager)
   */
  showAt(x: number, y: number): void {
    // Create a temporary anchor element
    const anchor = document.createElement('div')
    anchor.style.position = 'fixed'
    anchor.style.left = `${x}px`
    anchor.style.top = `${y}px`
    anchor.style.width = '0'
    anchor.style.height = '0'
    document.body.appendChild(anchor)

    // Show using the base class method
    this.show(anchor)

    // Remove the anchor
    anchor.remove()

    // Override the position to be exact
    if (this.element) {
      this.element.style.left = `${x}px`
      this.element.style.top = `${y}px`
    }
  }

  /**
   * Navigate to a specific direction (for TriggerManager)
   */
  navigate(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (!this.keyboardNav) return

    switch (direction) {
      case 'up':
        this.keyboardNav.moveUp()
        break
      case 'down':
        this.keyboardNav.moveDown()
        break
      case 'left':
        this.keyboardNav.moveLeft()
        break
      case 'right':
        this.keyboardNav.moveRight()
        break
    }
  }

  /**
   * Get the selected swatch index
   */
  getSelectedIndex(): number {
    return this.keyboardNav?.getSelectedIndex() ?? 0
  }

  /**
   * Get the selected color value
   */
  getSelectedValue(): string {
    if (this.currentTab === 'custom') {
      return this.currentColor
    }

    const index = this.getSelectedIndex()
    const swatch = this.swatchElements[index]
    return swatch?.getAttribute('data-color') ?? this.currentColor
  }

  /**
   * Filter method (not applicable to color picker, but needed for interface)
   */
  filter(text: string): void {
    // Color picker doesn't support filtering
  }

  private renderTabs(): HTMLElement {
    const tabs = document.createElement('div')
    tabs.className = 'color-picker-tabs'

    const paletteTab = document.createElement('button')
    paletteTab.className = `color-picker-tab ${this.currentTab === 'palette' ? 'active' : ''}`
    paletteTab.textContent = 'Palette'
    paletteTab.setAttribute('data-tab', 'palette')
    paletteTab.onclick = () => this.switchTab('palette')

    const customTab = document.createElement('button')
    customTab.className = `color-picker-tab ${this.currentTab === 'custom' ? 'active' : ''}`
    customTab.textContent = 'Custom'
    customTab.setAttribute('data-tab', 'custom')
    customTab.onclick = () => this.switchTab('custom')

    tabs.appendChild(paletteTab)
    tabs.appendChild(customTab)

    return tabs
  }

  private renderPaletteTab(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'color-picker-palette-tab'
    this.swatchElements = []

    // Recent colors
    if (this.showRecentColors && this.recentColors.length > 0) {
      const recentSection = document.createElement('div')
      recentSection.className = 'color-picker-section'

      const label = document.createElement('div')
      label.className = 'color-picker-section-label'
      label.textContent = 'Recent'
      recentSection.appendChild(label)

      const grid = document.createElement('div')
      grid.className = 'color-picker-grid'

      for (const color of this.recentColors) {
        grid.appendChild(this.createSwatch(color))
      }

      recentSection.appendChild(grid)
      container.appendChild(recentSection)
    }

    // Palette sections
    for (const palette of this.palettes) {
      const section = document.createElement('div')
      section.className = 'color-picker-section'

      if (palette.name) {
        const label = document.createElement('div')
        label.className = 'color-picker-section-label'
        label.textContent = palette.name
        section.appendChild(label)
      }

      for (const row of palette.colors) {
        const grid = document.createElement('div')
        grid.className = 'color-picker-grid'

        for (const color of row) {
          grid.appendChild(this.createSwatch(color))
        }

        section.appendChild(grid)
      }

      container.appendChild(section)
    }

    return container
  }

  private renderCustomTab(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'color-picker-custom-tab'

    // Hex input
    const inputGroup = document.createElement('div')
    inputGroup.className = 'color-picker-input-group'

    const label = document.createElement('label')
    label.textContent = 'Hex:'
    label.className = 'color-picker-label'

    this.customInput = document.createElement('input')
    this.customInput.type = 'text'
    this.customInput.className = 'color-picker-input'
    this.customInput.value = this.currentColor
    this.customInput.placeholder = '#000000'
    this.customInput.maxLength = 7

    this.customInput.addEventListener('input', () => {
      const value = this.customInput!.value
      if (value.length === 7 || value.length === 4) {
        const parsed = parseColor(value)
        if (parsed) {
          this.currentColor = parsed
          this.updatePreview()
          ;(this.callbacks as ColorPickerCallbacks).onColorPreview?.(parsed)
        }
      }
    })

    this.customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const parsed = parseColor(this.customInput!.value)
        if (parsed) {
          this.currentColor = parsed
          this.addToRecent(parsed)
          this.selectValue(parsed)
        }
      }
    })

    inputGroup.appendChild(label)
    inputGroup.appendChild(this.customInput)
    container.appendChild(inputGroup)

    // Preview
    const preview = document.createElement('div')
    preview.className = 'color-picker-preview'
    preview.style.backgroundColor = this.currentColor
    preview.setAttribute('data-preview', 'true')
    container.appendChild(preview)

    // Confirm button
    const confirmBtn = document.createElement('button')
    confirmBtn.className = 'color-picker-confirm'
    confirmBtn.textContent = 'Apply'
    confirmBtn.onclick = () => {
      const parsed = parseColor(this.customInput!.value)
      if (parsed) {
        this.currentColor = parsed
        this.addToRecent(parsed)
        this.selectValue(parsed)
      }
    }
    container.appendChild(confirmBtn)

    // Focus input
    setTimeout(() => this.customInput?.focus(), 0)

    return container
  }

  private createSwatch(color: string): HTMLElement {
    const swatch = document.createElement('button')
    swatch.className = 'color-picker-swatch'
    swatch.style.backgroundColor = color
    swatch.setAttribute('data-color', color.toUpperCase())
    swatch.setAttribute('aria-label', color)
    swatch.setAttribute('role', 'option')

    // Border for light colors
    if (isLightColor(color)) {
      swatch.classList.add('light-color')
    }

    // Selected state
    if (color.toUpperCase() === this.currentColor) {
      swatch.classList.add('selected')
      swatch.setAttribute('aria-selected', 'true')
    }

    swatch.onclick = () => {
      this.currentColor = color.toUpperCase()
      this.addToRecent(this.currentColor)
      this.selectValue(this.currentColor)
    }

    swatch.onmouseenter = () => {
      ;(this.callbacks as ColorPickerCallbacks).onColorPreview?.(color)
    }

    this.swatchElements.push(swatch)
    return swatch
  }

  private updatePreview(): void {
    const preview = this.element?.querySelector('[data-preview="true"]') as HTMLElement
    if (preview) {
      preview.style.backgroundColor = this.currentColor
    }
  }

  private setupKeyboardNav(): void {
    if (this.currentTab === 'palette' && this.swatchElements.length > 0) {
      this.keyboardNav = new KeyboardNav({
        orientation: 'grid',
        columns: 10, // Adjust based on grid
        wrap: true,
        onSelect: (item) => {
          const color = item.getAttribute('data-color')
          if (color) {
            this.currentColor = color
            this.addToRecent(color)
            this.selectValue(color)
          }
        },
        onCancel: () => this.hide(),
      })
      this.keyboardNav.setItems(this.swatchElements)

      // Find and select current color
      const currentIndex = this.swatchElements.findIndex(
        el => el.getAttribute('data-color') === this.currentColor
      )
      if (currentIndex >= 0) {
        this.keyboardNav.selectIndex(currentIndex)
      }
    } else {
      this.keyboardNav = null
    }
  }

  protected handleKeyDown(event: KeyboardEvent): void {
    // Handle Enter on custom tab
    if (this.currentTab === 'custom' && event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      const parsed = parseColor(this.customInput?.value || '')
      if (parsed) {
        this.currentColor = parsed
        this.addToRecent(parsed)
        this.selectValue(parsed)
      }
      return
    }

    // Handle Enter on palette tab
    if (this.currentTab === 'palette' && event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      const color = this.getSelectedValue()
      if (color) {
        this.currentColor = color
        this.addToRecent(color)
        this.selectValue(color)
      }
      return
    }

    // Use keyboard nav for palette (arrow keys)
    if (this.keyboardNav && this.currentTab === 'palette') {
      if (this.keyboardNav.handleKeyDown(event)) {
        event.stopPropagation()
        return
      }
    }

    // Fall through to base handler
    super.handleKeyDown(event)
  }
}

/**
 * Factory function
 */
export function createColorPicker(
  config: ColorPickerConfig,
  callbacks: ColorPickerCallbacks
): ColorPicker {
  return new ColorPicker(config, callbacks)
}

// ============================================
// Global Color Picker API for Property Panel
// ============================================

let globalColorPicker: ColorPicker | null = null
let globalClickOutsideHandler: ((e: MouseEvent) => void) | null = null

/**
 * Show color picker for property panel
 * This is a convenience function that creates and positions a color picker
 * @param x - X coordinate for positioning
 * @param y - Y coordinate for positioning
 * @param property - Property name (bg, col, boc, etc.) for context
 * @param currentValue - Current color value to preselect
 * @param callback - Called when a color is selected
 */
export function showColorPickerForProperty(
  x: number,
  y: number,
  property: string,
  currentValue: string,
  callback: (color: string) => void
): void {
  // Close any existing picker
  hideGlobalColorPicker()

  // Create new picker
  globalColorPicker = new ColorPicker(
    {
      initialColor: currentValue || '#5BA8F5',
      showCustomTab: true,
      showRecentColors: true,
    },
    {
      onSelect: (color: string) => {
        callback(color)
        hideGlobalColorPicker()
      },
      onClose: () => {
        hideGlobalColorPicker()
      },
    }
  )

  // Show at position
  globalColorPicker.showAt(x, y)

  // Setup click outside to close
  globalClickOutsideHandler = (e: MouseEvent) => {
    const pickerEl = globalColorPicker?.getElement()
    if (pickerEl && !pickerEl.contains(e.target as Node)) {
      hideGlobalColorPicker()
    }
  }
  setTimeout(() => {
    document.addEventListener('mousedown', globalClickOutsideHandler!)
  }, 0)
}

/**
 * Hide the global color picker
 */
export function hideGlobalColorPicker(): void {
  if (globalColorPicker) {
    globalColorPicker.hide()
    globalColorPicker = null
  }
  if (globalClickOutsideHandler) {
    document.removeEventListener('mousedown', globalClickOutsideHandler)
    globalClickOutsideHandler = null
  }
}

/**
 * Check if global color picker is visible
 */
export function isGlobalColorPickerVisible(): boolean {
  return globalColorPicker !== null && (globalColorPicker as unknown as { isOpen: boolean }).isOpen
}

/**
 * Initialize global color picker API on window
 * Call this during app initialization
 */
export function initColorPickerGlobalAPI(): void {
  ;(window as any).showColorPickerForProperty = showColorPickerForProperty
  ;(window as any).hideGlobalColorPicker = hideGlobalColorPicker
}

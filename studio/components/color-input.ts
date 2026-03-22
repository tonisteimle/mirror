/**
 * ColorInput Component
 *
 * Color input with preview swatch and optional picker trigger.
 *
 * CSS Classes used:
 * - .color-input-wrapper
 * - .color-preview
 * - .prop-input, .pp-v2-input
 * - .color-picker-btn
 */

import type { ColorInputConfig, ComponentInstance } from './types'
import { ICONS } from './icons'

export class ColorInput implements ComponentInstance {
  private element: HTMLElement
  private preview: HTMLElement
  private input: HTMLInputElement
  private pickerBtn: HTMLButtonElement | null = null
  private config: ColorInputConfig
  private currentValue: string

  constructor(config: ColorInputConfig) {
    this.config = {
      showPicker: true,
      placeholder: '#000000',
      ...config,
    }
    this.currentValue = config.value || ''
    this.element = document.createElement('div')
    this.preview = document.createElement('div')
    this.input = document.createElement('input')
    this.render()
  }

  private render(): void {
    this.element.className = `color-input-wrapper ${this.config.className || ''}`
    if (this.config.testId) {
      this.element.setAttribute('data-testid', this.config.testId)
    }

    // Color preview swatch
    this.preview.className = 'color-preview'
    this.preview.style.backgroundColor = this.currentValue || 'transparent'
    this.preview.style.cursor = 'pointer'
    this.preview.onclick = () => this.openPicker()
    this.element.appendChild(this.preview)

    // Input field
    this.input.type = 'text'
    this.input.className = 'prop-input pp-v2-input'
    this.input.value = this.currentValue
    this.input.placeholder = this.config.placeholder || ''
    this.input.maxLength = 7

    if (this.config.disabled) {
      this.input.disabled = true
    }

    // Input events
    this.input.addEventListener('input', () => this.handleInput())
    this.input.addEventListener('change', () => this.handleChange())
    this.input.addEventListener('keydown', (e) => this.handleKeyDown(e))
    this.input.addEventListener('focus', () => this.input.select())

    this.element.appendChild(this.input)

    // Picker button
    if (this.config.showPicker) {
      this.pickerBtn = document.createElement('button')
      this.pickerBtn.className = 'color-picker-btn'
      this.pickerBtn.type = 'button'
      this.pickerBtn.title = 'Open color picker'
      this.pickerBtn.innerHTML = ICONS.colorPicker
      this.pickerBtn.onclick = () => this.openPicker()

      if (this.config.disabled) {
        this.pickerBtn.disabled = true
      }

      this.element.appendChild(this.pickerBtn)
    }
  }

  private handleInput(): void {
    const value = this.input.value
    // Live preview while typing
    if (this.isValidColor(value)) {
      this.preview.style.backgroundColor = value
    }
  }

  private handleChange(): void {
    const value = this.input.value.trim()

    if (this.isValidColor(value)) {
      this.currentValue = value.toUpperCase()
      this.input.value = this.currentValue
      this.preview.style.backgroundColor = this.currentValue
      this.config.onChange(this.currentValue)
    } else if (value === '') {
      this.currentValue = ''
      this.preview.style.backgroundColor = 'transparent'
      this.config.onChange('')
    } else {
      // Revert to previous valid value
      this.input.value = this.currentValue
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      this.handleChange()
      this.input.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.input.value = this.currentValue
      this.input.blur()
    }
  }

  private openPicker(): void {
    if (this.config.disabled) return
    this.config.onPickerOpen?.(this.preview)
  }

  private isValidColor(value: string): boolean {
    if (!value) return false
    // Match #RGB, #RRGGBB
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)
  }

  /**
   * Get current color value
   */
  getValue(): string {
    return this.currentValue
  }

  /**
   * Set color value
   */
  setValue(value: string): void {
    this.currentValue = value?.toUpperCase() || ''
    this.input.value = this.currentValue
    this.preview.style.backgroundColor = this.currentValue || 'transparent'
  }

  /**
   * Enable the input
   */
  enable(): void {
    this.config.disabled = false
    this.input.disabled = false
    if (this.pickerBtn) {
      this.pickerBtn.disabled = false
    }
  }

  /**
   * Disable the input
   */
  disable(): void {
    this.config.disabled = true
    this.input.disabled = true
    if (this.pickerBtn) {
      this.pickerBtn.disabled = true
    }
  }

  /**
   * Focus the input
   */
  focus(): void {
    this.input.focus()
  }

  getElement(): HTMLElement {
    return this.element
  }

  dispose(): void {
    this.element.remove()
  }
}

/**
 * Factory function
 */
export function createColorInput(config: ColorInputConfig): ColorInput {
  return new ColorInput(config)
}

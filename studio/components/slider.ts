/**
 * Slider Component
 *
 * Range slider with optional value display.
 *
 * CSS Classes used:
 * - .prop-slider
 * - .slider-wrapper
 * - .slider-value
 */

import type { SliderConfig, ComponentInstance } from './types'

export class Slider implements ComponentInstance {
  private element: HTMLElement
  private slider: HTMLInputElement
  private valueDisplay: HTMLElement | null = null
  private config: SliderConfig

  constructor(config: SliderConfig) {
    this.config = {
      step: 1,
      showValue: true,
      ...config,
    }
    this.element = document.createElement('div')
    this.slider = document.createElement('input')
    this.render()
  }

  private render(): void {
    this.element.className = `slider-wrapper ${this.config.className || ''}`

    if (this.config.testId) {
      this.element.setAttribute('data-testid', this.config.testId)
    }

    // Range input
    this.slider.type = 'range'
    this.slider.className = 'prop-slider'
    this.slider.min = String(this.config.min)
    this.slider.max = String(this.config.max)
    this.slider.step = String(this.config.step)
    this.slider.value = String(this.config.value)

    if (this.config.disabled) {
      this.slider.disabled = true
    }

    // Event handlers
    this.slider.addEventListener('input', () => {
      const value = parseFloat(this.slider.value)
      this.updateValueDisplay(value)
      this.config.onChange(value)
    })

    this.element.appendChild(this.slider)

    // Value display
    if (this.config.showValue) {
      this.valueDisplay = document.createElement('span')
      this.valueDisplay.className = 'slider-value'
      this.updateValueDisplay(this.config.value)
      this.element.appendChild(this.valueDisplay)
    }
  }

  private updateValueDisplay(value: number): void {
    if (this.valueDisplay) {
      // Format: show integer if whole, otherwise 1 decimal
      const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1)
      this.valueDisplay.textContent = formatted
    }
  }

  /**
   * Get current value
   */
  getValue(): number {
    return parseFloat(this.slider.value)
  }

  /**
   * Set value
   */
  setValue(value: number): void {
    this.config.value = value
    this.slider.value = String(value)
    this.updateValueDisplay(value)
  }

  /**
   * Set range
   */
  setRange(min: number, max: number): void {
    this.config.min = min
    this.config.max = max
    this.slider.min = String(min)
    this.slider.max = String(max)
  }

  /**
   * Enable the slider
   */
  enable(): void {
    this.config.disabled = false
    this.slider.disabled = false
  }

  /**
   * Disable the slider
   */
  disable(): void {
    this.config.disabled = true
    this.slider.disabled = true
  }

  /**
   * Focus the slider
   */
  focus(): void {
    this.slider.focus()
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
export function createSlider(config: SliderConfig): Slider {
  return new Slider(config)
}

/**
 * Quick helper
 */
export function slider(
  value: number,
  min: number,
  max: number,
  onChange: (value: number) => void,
  step?: number
): Slider {
  return new Slider({ value, min, max, onChange, step })
}

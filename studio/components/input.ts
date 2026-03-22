/**
 * Input Component
 *
 * Text/number input with optional unit suffix.
 *
 * CSS Classes used:
 * - .prop-input, .pp-v2-input
 * - .input-wrapper (when unit is present)
 * - .input-unit
 * - .invalid (state)
 */

import type { InputConfig, ComponentInstance } from './types'

export class Input implements ComponentInstance {
  private element: HTMLElement
  private input: HTMLInputElement
  private config: InputConfig
  private currentValue: string

  constructor(config: InputConfig) {
    this.config = config
    this.currentValue = config.value || ''
    this.element = document.createElement('div')
    this.input = document.createElement('input')
    this.render()
  }

  private render(): void {
    const hasUnit = !!this.config.unit

    if (hasUnit) {
      this.element.className = `input-wrapper ${this.config.className || ''}`

      // Input field
      this.input.type = this.config.type || 'text'
      this.input.className = 'prop-input pp-v2-input'
      this.input.value = this.currentValue
      this.input.placeholder = this.config.placeholder || ''

      if (this.config.invalid) {
        this.input.classList.add('invalid')
      }

      if (this.config.disabled) {
        this.input.disabled = true
      }

      this.setupInputEvents()
      this.element.appendChild(this.input)

      // Unit suffix
      const unit = document.createElement('span')
      unit.className = 'input-unit'
      unit.textContent = this.config.unit!
      this.element.appendChild(unit)
    } else {
      // Simple input without wrapper
      this.input.type = this.config.type || 'text'
      this.input.className = `prop-input pp-v2-input ${this.config.className || ''}`
      this.input.value = this.currentValue
      this.input.placeholder = this.config.placeholder || ''

      if (this.config.invalid) {
        this.input.classList.add('invalid')
      }

      if (this.config.disabled) {
        this.input.disabled = true
      }

      if (this.config.testId) {
        this.input.setAttribute('data-testid', this.config.testId)
      }

      this.setupInputEvents()
      this.element = this.input as unknown as HTMLElement
    }

    if (this.config.testId && this.element !== this.input) {
      this.element.setAttribute('data-testid', this.config.testId)
    }
  }

  private setupInputEvents(): void {
    // Live input
    if (this.config.onInput) {
      this.input.addEventListener('input', () => {
        this.config.onInput?.(this.input.value)
      })
    }

    // Change (blur/enter)
    this.input.addEventListener('change', () => this.handleChange())

    // Keyboard
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        this.handleChange()
        this.input.blur()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        this.input.value = this.currentValue
        this.input.blur()
      }
    })

    // Select all on focus
    this.input.addEventListener('focus', () => {
      this.input.select()
    })
  }

  private handleChange(): void {
    const newValue = this.input.value
    if (newValue !== this.currentValue) {
      this.currentValue = newValue
      this.config.onChange(newValue)
    }
  }

  /**
   * Get current value
   */
  getValue(): string {
    return this.currentValue
  }

  /**
   * Set value
   */
  setValue(value: string): void {
    this.currentValue = value
    this.input.value = value
  }

  /**
   * Set invalid state
   */
  setInvalid(invalid: boolean): void {
    this.config.invalid = invalid
    this.input.classList.toggle('invalid', invalid)
  }

  /**
   * Enable the input
   */
  enable(): void {
    this.config.disabled = false
    this.input.disabled = false
  }

  /**
   * Disable the input
   */
  disable(): void {
    this.config.disabled = true
    this.input.disabled = true
  }

  /**
   * Focus the input
   */
  focus(): void {
    this.input.focus()
  }

  /**
   * Select all text
   */
  selectAll(): void {
    this.input.select()
  }

  getElement(): HTMLElement {
    return this.element
  }

  /**
   * Get the raw input element
   */
  getInputElement(): HTMLInputElement {
    return this.input
  }

  dispose(): void {
    this.element.remove()
  }
}

/**
 * Factory function
 */
export function createInput(config: InputConfig): Input {
  return new Input(config)
}

/**
 * Quick helper for text input
 */
export function textInput(
  value: string,
  onChange: (value: string) => void,
  placeholder?: string
): Input {
  return new Input({ value, onChange, placeholder })
}

/**
 * Quick helper for number input with unit
 */
export function numberInput(
  value: string | number,
  onChange: (value: string) => void,
  unit?: string
): Input {
  return new Input({
    value: String(value),
    onChange,
    unit,
    type: 'text', // Keep as text to allow flexible input
  })
}

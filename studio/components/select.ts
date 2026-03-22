/**
 * Select Component
 *
 * Dropdown select with styling matching property panel.
 *
 * CSS Classes used:
 * - .prop-select
 */

import type { SelectConfig, SelectOption, ComponentInstance } from './types'

export class Select<T = string> implements ComponentInstance {
  private element: HTMLSelectElement
  private config: SelectConfig<T>

  constructor(config: SelectConfig<T>) {
    this.config = config
    this.element = document.createElement('select')
    this.render()
  }

  private render(): void {
    this.element.className = `prop-select ${this.config.className || ''}`

    if (this.config.testId) {
      this.element.setAttribute('data-testid', this.config.testId)
    }

    if (this.config.disabled) {
      this.element.disabled = true
    }

    // Placeholder option
    if (this.config.placeholder) {
      const placeholder = document.createElement('option')
      placeholder.value = ''
      placeholder.textContent = this.config.placeholder
      placeholder.disabled = true
      if (this.config.value === null) {
        placeholder.selected = true
      }
      this.element.appendChild(placeholder)
    }

    // Options
    for (const option of this.config.options) {
      const optEl = document.createElement('option')
      optEl.value = String(option.value)
      optEl.textContent = option.label

      if (option.disabled) {
        optEl.disabled = true
      }

      if (option.value === this.config.value) {
        optEl.selected = true
      }

      this.element.appendChild(optEl)
    }

    // Change handler
    this.element.addEventListener('change', () => this.handleChange())
  }

  private handleChange(): void {
    const selectedValue = this.element.value
    const option = this.config.options.find(o => String(o.value) === selectedValue)

    if (option) {
      this.config.onChange(option.value)
    }
  }

  /**
   * Get current value
   */
  getValue(): T | null {
    const selectedValue = this.element.value
    const option = this.config.options.find(o => String(o.value) === selectedValue)
    return option?.value ?? null
  }

  /**
   * Set value
   */
  setValue(value: T | null): void {
    if (value === null) {
      this.element.selectedIndex = this.config.placeholder ? 0 : -1
    } else {
      this.element.value = String(value)
    }
  }

  /**
   * Update options
   */
  setOptions(options: SelectOption<T>[]): void {
    this.config.options = options

    // Clear existing options (keep placeholder if exists)
    const startIndex = this.config.placeholder ? 1 : 0
    while (this.element.options.length > startIndex) {
      this.element.remove(startIndex)
    }

    // Add new options
    for (const option of options) {
      const optEl = document.createElement('option')
      optEl.value = String(option.value)
      optEl.textContent = option.label
      if (option.disabled) {
        optEl.disabled = true
      }
      this.element.appendChild(optEl)
    }
  }

  /**
   * Enable the select
   */
  enable(): void {
    this.config.disabled = false
    this.element.disabled = false
  }

  /**
   * Disable the select
   */
  disable(): void {
    this.config.disabled = true
    this.element.disabled = true
  }

  /**
   * Focus the select
   */
  focus(): void {
    this.element.focus()
  }

  getElement(): HTMLSelectElement {
    return this.element
  }

  dispose(): void {
    this.element.remove()
  }
}

/**
 * Factory function
 */
export function createSelect<T = string>(config: SelectConfig<T>): Select<T> {
  return new Select(config)
}

/**
 * Quick helper for string selects
 */
export function select(
  options: Array<{ value: string; label: string }>,
  value: string | null,
  onChange: (value: string) => void,
  placeholder?: string
): Select<string> {
  return new Select({ options, value, onChange, placeholder })
}

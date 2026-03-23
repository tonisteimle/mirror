/**
 * Toggle Component
 *
 * Boolean switch control for on/off states.
 *
 * CSS Classes used:
 * - .prop-toggle
 * - .prop-toggle-thumb
 * - .active (state)
 */

import type { ToggleConfig, ComponentInstance } from './types'

export class Toggle implements ComponentInstance {
  private element: HTMLButtonElement
  private config: ToggleConfig

  constructor(config: ToggleConfig) {
    this.config = config
    this.element = document.createElement('button')
    this.render()
  }

  private handleClick = (): void => {
    if (!this.config.disabled) {
      this.setValue(!this.config.value)
      this.config.onChange(this.config.value)
    }
  }

  private render(): void {
    this.element.className = `prop-toggle ${this.config.className || ''}`
    this.element.type = 'button'
    this.element.setAttribute('role', 'switch')
    this.element.setAttribute('aria-checked', String(this.config.value))

    if (this.config.testId) {
      this.element.setAttribute('data-testid', this.config.testId)
    }

    if (this.config.value) {
      this.element.classList.add('active')
    }

    if (this.config.disabled) {
      this.element.disabled = true
    }

    // Thumb
    const thumb = document.createElement('span')
    thumb.className = 'prop-toggle-thumb'
    this.element.appendChild(thumb)

    this.element.addEventListener('click', this.handleClick)
  }

  /**
   * Set toggle value
   */
  setValue(value: boolean): void {
    this.config.value = value
    this.element.classList.toggle('active', value)
    this.element.setAttribute('aria-checked', String(value))
  }

  /**
   * Get current value
   */
  getValue(): boolean {
    return this.config.value
  }

  /**
   * Enable the toggle
   */
  enable(): void {
    this.config.disabled = false
    this.element.disabled = false
  }

  /**
   * Disable the toggle
   */
  disable(): void {
    this.config.disabled = true
    this.element.disabled = true
  }

  getElement(): HTMLElement {
    return this.element
  }

  dispose(): void {
    this.element.removeEventListener('click', this.handleClick)
    this.element.remove()
  }
}

/**
 * Factory function
 */
export function createToggle(config: ToggleConfig): Toggle {
  return new Toggle(config)
}

/**
 * Quick helper
 */
export function toggle(value: boolean, onChange: (v: boolean) => void): Toggle {
  return new Toggle({ value, onChange })
}

/**
 * IconButton Component
 *
 * Small icon button for toolbars and actions.
 *
 * CSS Classes used:
 * - .icon-btn
 * - .icon-btn-sm, .icon-btn-lg (size variants)
 * - .active (state)
 */

import type { IconButtonConfig, ComponentInstance } from './types'

export class IconButton implements ComponentInstance {
  private element: HTMLButtonElement
  private config: IconButtonConfig

  constructor(config: IconButtonConfig) {
    this.config = config
    this.element = document.createElement('button')
    this.render()
  }

  private render(): void {
    this.element.type = 'button'
    this.element.className = `icon-btn ${this.config.className || ''}`
    this.element.title = this.config.title

    // Size variant
    if (this.config.size === 'sm') {
      this.element.classList.add('icon-btn-sm')
    } else if (this.config.size === 'lg') {
      this.element.classList.add('icon-btn-lg')
    }

    // Active state
    if (this.config.active) {
      this.element.classList.add('active')
      this.element.setAttribute('aria-pressed', 'true')
    } else {
      this.element.setAttribute('aria-pressed', 'false')
    }

    if (this.config.disabled) {
      this.element.disabled = true
    }

    if (this.config.testId) {
      this.element.setAttribute('data-testid', this.config.testId)
    }

    // Icon content
    if (this.config.icon.startsWith('<')) {
      this.element.innerHTML = this.config.icon
    } else {
      this.element.innerHTML = `<span class="icon">${this.config.icon}</span>`
    }

    // Click handler
    this.element.addEventListener('click', (e) => {
      e.preventDefault()
      if (!this.config.disabled) {
        this.config.onClick()
      }
    })
  }

  /**
   * Set active state
   */
  setActive(active: boolean): void {
    this.config.active = active
    this.element.classList.toggle('active', active)
    this.element.setAttribute('aria-pressed', String(active))
  }

  /**
   * Toggle active state
   */
  toggleActive(): void {
    this.setActive(!this.config.active)
  }

  /**
   * Check if active
   */
  isActive(): boolean {
    return this.config.active ?? false
  }

  /**
   * Update icon
   */
  setIcon(icon: string): void {
    this.config.icon = icon
    if (icon.startsWith('<')) {
      this.element.innerHTML = icon
    } else {
      this.element.innerHTML = `<span class="icon">${icon}</span>`
    }
  }

  /**
   * Enable the button
   */
  enable(): void {
    this.config.disabled = false
    this.element.disabled = false
  }

  /**
   * Disable the button
   */
  disable(): void {
    this.config.disabled = true
    this.element.disabled = true
  }

  /**
   * Focus the button
   */
  focus(): void {
    this.element.focus()
  }

  getElement(): HTMLButtonElement {
    return this.element
  }

  dispose(): void {
    this.element.remove()
  }
}

/**
 * Factory function
 */
export function createIconButton(config: IconButtonConfig): IconButton {
  return new IconButton(config)
}

/**
 * Quick helper
 */
export function iconButton(
  icon: string,
  title: string,
  onClick: () => void,
  active?: boolean
): IconButton {
  return new IconButton({ icon, title, onClick, active })
}

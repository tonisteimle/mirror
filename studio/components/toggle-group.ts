/**
 * ToggleGroup Component
 *
 * Segmented control with multiple toggle buttons.
 *
 * CSS Classes used:
 * - .toggle-group, .pp-toggle-group
 * - .toggle-btn, .pp-toggle-btn
 * - .active (state)
 * - .single (variant for standalone button)
 */

import type { ToggleGroupConfig, ToggleOption, ComponentInstance } from './types'

export class ToggleGroup<T = string> implements ComponentInstance {
  private element: HTMLElement
  private buttons: Map<T, HTMLButtonElement> = new Map()
  private config: ToggleGroupConfig<T>
  private selectedValues: Set<T>

  constructor(config: ToggleGroupConfig<T>) {
    this.config = config
    this.selectedValues = new Set(
      Array.isArray(config.value) ? config.value : [config.value]
    )
    this.element = document.createElement('div')
    this.render()
  }

  private render(): void {
    const isSingle = this.config.options.length === 1
    this.element.className = `toggle-group pp-toggle-group ${this.config.className || ''}`

    if (this.config.size === 'sm') {
      this.element.classList.add('toggle-group-sm')
    }

    if (this.config.testId) {
      this.element.setAttribute('data-testid', this.config.testId)
    }

    this.buttons.clear()

    for (const option of this.config.options) {
      const btn = this.createButton(option, isSingle)
      this.buttons.set(option.value, btn)
      this.element.appendChild(btn)
    }
  }

  private createButton(option: ToggleOption<T>, isSingle: boolean): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'toggle-btn pp-toggle-btn'
    btn.type = 'button'

    if (isSingle) {
      btn.classList.add('single')
    }

    if (option.title) {
      btn.title = option.title
    }

    if (option.disabled || this.config.disabled) {
      btn.disabled = true
    }

    // Content: icon or label
    if (option.icon) {
      // Check if it's raw SVG or an icon name
      if (option.icon.startsWith('<')) {
        btn.innerHTML = option.icon
      } else {
        // Assume it's an icon name, could integrate with icons.ts
        btn.innerHTML = `<span class="toggle-icon">${option.icon}</span>`
      }
    } else if (option.label) {
      btn.textContent = option.label
    }

    // Active state
    if (this.selectedValues.has(option.value)) {
      btn.classList.add('active')
      btn.setAttribute('aria-pressed', 'true')
    } else {
      btn.setAttribute('aria-pressed', 'false')
    }

    // Click handler
    btn.addEventListener('click', () => this.handleClick(option.value))

    return btn
  }

  private handleClick(value: T): void {
    if (this.config.disabled) return

    const option = this.config.options.find(o => o.value === value)
    if (option?.disabled) return

    if (this.config.multiSelect) {
      // Toggle selection
      if (this.selectedValues.has(value)) {
        this.selectedValues.delete(value)
      } else {
        this.selectedValues.add(value)
      }
    } else {
      // Single selection
      this.selectedValues.clear()
      this.selectedValues.add(value)
    }

    this.updateActiveStates()
    this.config.onChange(value)
  }

  private updateActiveStates(): void {
    for (const [value, btn] of this.buttons) {
      const isActive = this.selectedValues.has(value)
      btn.classList.toggle('active', isActive)
      btn.setAttribute('aria-pressed', String(isActive))
    }
  }

  /**
   * Get current value(s)
   */
  getValue(): T | T[] {
    const values = Array.from(this.selectedValues)
    return this.config.multiSelect ? values : values[0]
  }

  /**
   * Set value(s)
   */
  setValue(value: T | T[]): void {
    this.selectedValues = new Set(Array.isArray(value) ? value : [value])
    this.updateActiveStates()
  }

  /**
   * Enable the component
   */
  enable(): void {
    this.config.disabled = false
    for (const [value, btn] of this.buttons) {
      const option = this.config.options.find(o => o.value === value)
      btn.disabled = option?.disabled ?? false
    }
  }

  /**
   * Disable the component
   */
  disable(): void {
    this.config.disabled = true
    for (const btn of this.buttons.values()) {
      btn.disabled = true
    }
  }

  getElement(): HTMLElement {
    return this.element
  }

  dispose(): void {
    this.buttons.clear()
    this.element.remove()
  }
}

/**
 * Factory function
 */
export function createToggleGroup<T = string>(config: ToggleGroupConfig<T>): ToggleGroup<T> {
  return new ToggleGroup(config)
}

/**
 * Quick helper for icon toggle groups
 */
export function iconToggleGroup<T = string>(
  options: Array<{ value: T; icon: string; title?: string }>,
  value: T,
  onChange: (value: T) => void
): ToggleGroup<T> {
  return new ToggleGroup({
    options,
    value,
    onChange,
  })
}

/**
 * Quick helper for text toggle groups
 */
export function textToggleGroup<T = string>(
  options: Array<{ value: T; label: string }>,
  value: T,
  onChange: (value: T) => void
): ToggleGroup<T> {
  return new ToggleGroup({
    options,
    value,
    onChange,
  })
}

/**
 * PropRow Component
 *
 * Standard property row with label and content area.
 *
 * CSS Classes used:
 * - .prop-row, .pp-prop-row
 * - .prop-label, .pp-prop-label
 * - .prop-content, .pp-prop-content
 */

import type { PropRowConfig, ComponentInstance } from './types'

export class PropRow implements ComponentInstance {
  private element: HTMLElement
  private contentEl: HTMLElement
  private config: PropRowConfig

  constructor(config: PropRowConfig) {
    this.config = config
    this.element = document.createElement('div')
    this.contentEl = document.createElement('div')
    this.render()
  }

  private render(): void {
    this.element.className = `prop-row pp-prop-row ${this.config.className || ''}`
    if (this.config.testId) {
      this.element.setAttribute('data-testid', this.config.testId)
    }

    // Label
    const label = document.createElement('label')
    label.className = 'prop-label pp-prop-label'
    label.textContent = this.config.label

    if (this.config.tooltip) {
      label.title = this.config.tooltip
    }

    if (this.config.isOverride) {
      label.classList.add('override')
    }

    this.element.appendChild(label)

    // Content container
    this.contentEl.className = 'prop-content pp-prop-content'
    this.element.appendChild(this.contentEl)
  }

  /**
   * Get the content container
   */
  getContent(): HTMLElement {
    return this.contentEl
  }

  /**
   * Set the content
   */
  setContent(content: HTMLElement | HTMLElement[] | ComponentInstance | ComponentInstance[]): this {
    this.contentEl.innerHTML = ''

    const items = Array.isArray(content) ? content : [content]
    for (const item of items) {
      const el = 'getElement' in item ? item.getElement() : item
      this.contentEl.appendChild(el)
    }

    return this
  }

  /**
   * Append to content
   */
  append(child: HTMLElement | ComponentInstance): this {
    const el = 'getElement' in child ? child.getElement() : child
    this.contentEl.appendChild(el)
    return this
  }

  /**
   * Update label
   */
  setLabel(text: string): this {
    const label = this.element.querySelector('.prop-label')
    if (label) {
      label.textContent = text
    }
    return this
  }

  /**
   * Set override state
   */
  setOverride(isOverride: boolean): this {
    const label = this.element.querySelector('.prop-label')
    label?.classList.toggle('override', isOverride)
    return this
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
export function createPropRow(config: PropRowConfig): PropRow {
  return new PropRow(config)
}

/**
 * Quick helper to create a prop row with content in one call
 */
export function propRow(
  label: string,
  content: HTMLElement | HTMLElement[] | ComponentInstance | ComponentInstance[],
  config?: Partial<PropRowConfig>
): PropRow {
  const row = new PropRow({ label, ...config })
  row.setContent(content)
  return row
}

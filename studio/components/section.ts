/**
 * Section Component
 *
 * Collapsible section container for property panel.
 *
 * CSS Classes used:
 * - .section, .pp-section
 * - .section-label, .pp-label
 * - .section-expand-btn
 * - .section-content
 * - .expanded (state)
 */

import type { SectionConfig, ComponentInstance } from './types'
import { getIcon } from './icons'

export class Section implements ComponentInstance {
  private element: HTMLElement
  private contentEl: HTMLElement
  private collapsed: boolean
  private config: SectionConfig

  constructor(config: SectionConfig) {
    this.config = config
    this.collapsed = config.collapsed ?? false
    this.element = document.createElement('div')
    this.contentEl = document.createElement('div')
    this.render()
  }

  private render(): void {
    this.element.className = `section pp-section ${this.config.className || ''}`
    if (!this.collapsed) {
      this.element.classList.add('expanded')
    }
    if (this.config.testId) {
      this.element.setAttribute('data-testid', this.config.testId)
    }

    // Header
    const header = document.createElement('div')
    header.className = 'section-label pp-label'

    // Label with optional icon
    const labelContainer = document.createElement('span')
    labelContainer.className = 'section-label-content'

    if (this.config.icon) {
      const iconEl = document.createElement('span')
      iconEl.className = 'section-icon'
      iconEl.innerHTML = getIcon(this.config.icon as any) || ''
      labelContainer.appendChild(iconEl)
    }

    const labelText = document.createElement('span')
    labelText.textContent = this.config.label
    labelContainer.appendChild(labelText)
    header.appendChild(labelContainer)

    // Expand/collapse button
    const expandBtn = document.createElement('button')
    expandBtn.className = 'section-expand-btn'
    expandBtn.innerHTML = `
      <svg class="icon icon-collapsed" viewBox="0 0 12 12">
        <path d="M4 2L8 6L4 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <svg class="icon icon-expanded" viewBox="0 0 12 12">
        <path d="M2 4L6 8L10 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `
    expandBtn.onclick = () => this.toggle()
    header.appendChild(expandBtn)

    this.element.appendChild(header)

    // Content container
    this.contentEl.className = 'section-content'
    if (this.collapsed) {
      this.contentEl.style.display = 'none'
    }
    this.element.appendChild(this.contentEl)
  }

  /**
   * Toggle collapsed state
   */
  toggle(): void {
    this.collapsed = !this.collapsed
    this.element.classList.toggle('expanded', !this.collapsed)
    this.contentEl.style.display = this.collapsed ? 'none' : ''
    this.config.onToggle?.(this.collapsed)
  }

  /**
   * Expand the section
   */
  expand(): void {
    if (this.collapsed) {
      this.toggle()
    }
  }

  /**
   * Collapse the section
   */
  collapse(): void {
    if (!this.collapsed) {
      this.toggle()
    }
  }

  /**
   * Check if section is collapsed
   */
  isCollapsed(): boolean {
    return this.collapsed
  }

  /**
   * Get the content container to append children
   */
  getContent(): HTMLElement {
    return this.contentEl
  }

  /**
   * Append a child element to the content
   */
  append(child: HTMLElement | ComponentInstance): this {
    const el = 'getElement' in child ? child.getElement() : child
    this.contentEl.appendChild(el)
    return this
  }

  /**
   * Append multiple children
   */
  appendAll(...children: (HTMLElement | ComponentInstance)[]): this {
    for (const child of children) {
      this.append(child)
    }
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
export function createSection(config: SectionConfig): Section {
  return new Section(config)
}

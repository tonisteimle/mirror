/**
 * Section Component
 *
 * Collapsible section container for property panel.
 * Uses shared createSectionHeader component for consistency.
 *
 * CSS Classes used:
 * - .section, .pp-section (container)
 * - .section-content (content container)
 * - .expanded (state)
 */

import type { SectionConfig, ComponentInstance } from './types'
import { createSectionHeader, updateSectionHeaderState } from './section-header'

export class Section implements ComponentInstance {
  private element: HTMLElement
  private contentEl: HTMLElement
  private headerEl: HTMLElement
  private collapsed: boolean
  private config: SectionConfig

  constructor(config: SectionConfig) {
    this.config = config
    this.collapsed = config.collapsed ?? false
    this.element = document.createElement('div')
    this.contentEl = document.createElement('div')
    this.headerEl = document.createElement('div')
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

    // Use shared section header component
    this.headerEl = createSectionHeader({
      label: this.config.label,
      expanded: !this.collapsed,
      className: 'pp-section-header',
      onToggle: () => this.toggle(),
    })

    this.element.appendChild(this.headerEl)

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
    updateSectionHeaderState(this.headerEl, !this.collapsed)
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

/**
 * BaseSection - Abstract Base Class for Property Panel Sections
 *
 * Each section is responsible for:
 * - Rendering its HTML
 * - Providing event handlers for its interactive elements
 * - Managing its internal state
 */

import type {
  SectionData,
  EventHandlerMap,
  SectionConfig,
  PropertyChangeCallback
} from '../types'

/**
 * Dependencies injected into each section
 */
export interface SectionDependencies {
  /** Callback when a property value changes */
  onPropertyChange: PropertyChangeCallback
  /** Function to escape HTML in values */
  escapeHtml: (str: string) => string
  /** Function to get spacing tokens */
  getSpacingTokens: (suffix: string) => Array<{ name: string; fullName: string; value: string }>
  /** Function to get color tokens */
  getColorTokens: () => Array<{ name: string; value: string }>
}

/**
 * BaseSection - Abstract base class for all property panel sections
 *
 * Sections follow a similar pattern to BasePicker:
 * - `render()` returns HTML string
 * - `getHandlers()` returns event handler map
 * - `update()` updates the section with new data
 */
export abstract class BaseSection {
  protected config: SectionConfig
  protected deps: SectionDependencies
  protected data: SectionData | null = null
  protected container: HTMLElement | null = null

  constructor(config: SectionConfig, deps: SectionDependencies) {
    this.config = config
    this.deps = deps
  }

  /**
   * Render the section HTML
   * @param data - The data for this section
   * @returns HTML string
   */
  abstract render(data: SectionData): string

  /**
   * Get the event handlers for this section
   * @returns Map of selector -> event -> handler
   */
  abstract getHandlers(): EventHandlerMap

  /**
   * Called when the section should update its display
   * Default implementation re-renders if container is set
   */
  update(data: SectionData): void {
    this.data = data
    if (this.container) {
      this.container.innerHTML = this.render(data)
      this.afterMount()
    }
  }

  /**
   * Attach the section to a container element
   */
  attach(container: HTMLElement): void {
    this.container = container
    if (this.data) {
      container.innerHTML = this.render(this.data)
      this.afterMount()
    }
  }

  /**
   * Called after the section is mounted/rendered
   * Override to restore persisted state (e.g., expanded sections)
   */
  afterMount(): void {
    // Override in subclasses if needed
  }

  /**
   * Detach from the container
   */
  detach(): void {
    this.container = null
  }

  /**
   * Get the current data
   */
  getData(): SectionData | null {
    return this.data
  }

  /**
   * Get the section configuration
   */
  getConfig(): SectionConfig {
    return this.config
  }

  // ============================================
  // Helper Methods for Subclasses
  // ============================================

  /**
   * Render a section wrapper with label
   */
  protected renderSectionWrapper(content: string, extraClass?: string): string {
    const className = ['section', this.config.className, extraClass].filter(Boolean).join(' ')
    return `
      <div class="${className}">
        <div class="pp-section-label">${this.config.label}</div>
        <div class="pp-section-content">
          ${content}
        </div>
      </div>
    `
  }

  /**
   * Render a collapsible section wrapper
   */
  protected renderCollapsibleWrapper(content: string, expanded: boolean = true): string {
    const className = ['section', this.config.className, expanded ? 'expanded' : ''].filter(Boolean).join(' ')
    return `
      <div class="${className}">
        <div class="pp-section-label">
          ${this.config.label}
          <button class="section-expand-btn" data-section-toggle>
            <svg class="icon icon-collapsed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <svg class="icon icon-expanded" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
        <div class="pp-section-content">
          ${content}
        </div>
      </div>
    `
  }

  /**
   * Render a property row
   */
  protected renderRow(label: string, content: string, extraClass?: string): string {
    const className = ['prop-row', extraClass].filter(Boolean).join(' ')
    return `
      <div class="${className}">
        <span class="pp-row-label">${label}</span>
        <div class="pp-row-content">
          ${content}
        </div>
      </div>
    `
  }

  /**
   * Render an input field
   */
  protected renderInput(
    value: string,
    property: string,
    options: {
      placeholder?: string
      wide?: boolean
      type?: string
      dataAttrs?: Record<string, string>
    } = {}
  ): string {
    const {
      placeholder = '',
      wide = false,
      type = 'text',
      dataAttrs = {}
    } = options

    const className = ['prop-input', wide ? 'wide' : ''].filter(Boolean).join(' ')
    const dataStr = Object.entries(dataAttrs)
      .map(([k, v]) => `data-${k}="${this.deps.escapeHtml(v)}"`)
      .join(' ')

    return `
      <input
        type="${type}"
        class="${className}"
        autocomplete="off"
        value="${this.deps.escapeHtml(value)}"
        data-prop="${property}"
        placeholder="${placeholder}"
        ${dataStr}
      >
    `
  }

  /**
   * Render a toggle button
   */
  protected renderToggle(
    active: boolean,
    icon: string,
    dataAttrs: Record<string, string>,
    title?: string
  ): string {
    const className = ['toggle-btn', active ? 'active' : ''].filter(Boolean).join(' ')
    const dataStr = Object.entries(dataAttrs)
      .map(([k, v]) => `data-${k}="${this.deps.escapeHtml(v)}"`)
      .join(' ')

    return `
      <button class="${className}" ${dataStr} ${title ? `title="${title}"` : ''}>
        ${icon}
      </button>
    `
  }

  /**
   * Find a property value from the category
   */
  protected findPropertyValue(propName: string, aliases?: string[]): string | undefined {
    if (!this.data?.category) return undefined

    const props = this.data.category.properties
    const names = [propName, ...(aliases || [])]

    for (const name of names) {
      const prop = props.find(p => p.name === name)
      if (prop) return prop.value
    }

    return undefined
  }

  /**
   * Check if a standalone property is active
   */
  protected isStandaloneActive(propName: string): boolean {
    if (!this.data?.category) return false

    const props = this.data.category.properties
    const prop = props.find(p => p.name === propName)
    return prop ? (prop.value === 'true' || (prop.value === '' && prop.hasValue !== false)) : false
  }
}

/**
 * Index export
 */
export { EventDelegator } from './event-delegator'

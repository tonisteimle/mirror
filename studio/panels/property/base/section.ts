/**
 * Base Section Interface and Class
 *
 * All property panel sections extend this base class for consistency.
 */

import type { PropertyCategory, ExtractedProperty } from '../../../shared/compiler-types'
import type { SpacingToken, ColorToken } from '../types'

/**
 * Data passed to sections for rendering
 */
export interface SectionData {
  category?: PropertyCategory
  categories?: PropertyCategory[]
  currentElement?: {
    nodeId: string
    componentName: string
    isDefinition: boolean
  }
  // Token data
  spacingTokens?: SpacingToken[]
  colorTokens?: ColorToken[]
  // All properties for the element (used by color section)
  allProperties?: ExtractedProperty[]
  // Callbacks
  getSpacingTokens?: (propType: 'pad' | 'mar' | 'gap' | 'rad' | 'fs') => SpacingToken[]
  getColorTokens?: () => ColorToken[]
  resolveTokenValue?: (tokenRef: string) => string | null
}

/**
 * Event handler definition
 */
export interface EventHandler {
  selector: string
  event: string
  handler: (e: Event, target: HTMLElement) => void
}

/**
 * Section configuration
 */
export interface SectionConfig {
  label: string
  icon?: string
  collapsible?: boolean
  defaultExpanded?: boolean
}

/**
 * Dependencies injected into sections
 */
export interface SectionDependencies {
  escapeHtml: (str: string) => string
  getDisplayLabel: (name: string) => string
  onPropertyChange: (propName: string, value: string, source: string) => void
  onToggleProperty: (propName: string, currentValue: boolean) => void
}

/**
 * Base Section class
 *
 * Provides common functionality for all property panel sections.
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
   */
  abstract render(data: SectionData): string

  /**
   * Get event handlers for this section
   * Returns a map of selector -> { event: handler }
   */
  abstract getHandlers(): EventHandlerMap

  /**
   * Called after the section is mounted to the DOM
   * Override to set up additional event listeners or state
   */
  afterMount(): void {
    // Default: no-op
  }

  /**
   * Called before the section is unmounted
   * Override to clean up resources
   */
  beforeUnmount(): void {
    // Default: no-op
  }

  /**
   * Set the container element for this section
   */
  setContainer(container: HTMLElement): void {
    this.container = container
  }

  /**
   * Helper: Render a section wrapper
   */
  protected renderSectionWrapper(content: string, extraClass?: string): string {
    const classes = ['pp-section', extraClass].filter(Boolean).join(' ')
    return `
      <div class="${classes}">
        <div class="pp-label">${this.deps.escapeHtml(this.config.label)}</div>
        ${content}
      </div>
    `
  }

  /**
   * Helper: Render a row with label and content
   */
  protected renderRow(label: string, content: string, extraClass?: string): string {
    const classes = ['pp-prop-row', extraClass].filter(Boolean).join(' ')
    return `
      <div class="${classes}">
        <span class="pp-prop-label">${this.deps.escapeHtml(label)}</span>
        <div class="pp-prop-controls">${content}</div>
      </div>
    `
  }

  /**
   * Helper: Check if a property is active (boolean or has value)
   */
  protected isPropertyActive(prop: ExtractedProperty | undefined): boolean {
    if (!prop) return false
    return prop.value === 'true' || (prop.value === '' && prop.hasValue !== false)
  }

  /**
   * Helper: Get property value or default
   */
  protected getPropertyValue(props: ExtractedProperty[], name: string, defaultValue: string = ''): string {
    const prop = props.find(p => p.name === name)
    return prop?.value ?? defaultValue
  }

  /**
   * Helper: Find property by name or alias
   */
  protected findProperty(props: ExtractedProperty[], ...names: string[]): ExtractedProperty | undefined {
    return props.find(p => names.includes(p.name))
  }
}

/**
 * Event handler map type
 * Maps CSS selector to event handlers
 */
export type EventHandlerMap = Record<string, {
  [eventName: string]: (e: Event, target: HTMLElement) => void
}>

/**
 * Section registry for dynamic section management
 */
export class SectionRegistry {
  private sections: Map<string, BaseSection> = new Map()

  register(name: string, section: BaseSection): void {
    this.sections.set(name, section)
  }

  get(name: string): BaseSection | undefined {
    return this.sections.get(name)
  }

  getAll(): BaseSection[] {
    return Array.from(this.sections.values())
  }

  getAllHandlers(): EventHandlerMap {
    const combined: EventHandlerMap = {}
    for (const section of this.sections.values()) {
      const handlers = section.getHandlers()
      for (const [selector, events] of Object.entries(handlers)) {
        if (!combined[selector]) {
          combined[selector] = {}
        }
        Object.assign(combined[selector], events)
      }
    }
    return combined
  }
}

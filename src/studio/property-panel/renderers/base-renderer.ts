/**
 * BasePropertyRenderer - Base class for property renderers
 *
 * Provides common functionality for all property category renderers.
 */

import type { PropertyRenderer, RenderContext, ITokenService, EventHandlers } from '../interfaces'
import type { PropertyCategory, ExtractedProperty } from '../../property-extractor'
import type { PropertyValueService } from '../services/property-value-service'
import * as htmlUtils from '../utils/html-utils'

/**
 * Base class for property renderers
 *
 * All category-specific renderers should extend this class.
 */
export abstract class BasePropertyRenderer implements PropertyRenderer {
  protected tokenService: ITokenService
  protected eventHandlers: EventHandlers
  protected propertyValueService?: PropertyValueService

  constructor(
    tokenService: ITokenService,
    eventHandlers: EventHandlers,
    propertyValueService?: PropertyValueService
  ) {
    this.tokenService = tokenService
    this.eventHandlers = eventHandlers
    this.propertyValueService = propertyValueService
  }

  /**
   * Set property value using the PropertyValueService (preferred) or fallback to eventHandlers
   */
  protected setPropertyValue(
    nodeId: string,
    property: string,
    value: string,
    part?: string
  ): void {
    if (this.propertyValueService && part) {
      // Use service for compound properties with parts
      const result = this.propertyValueService.setValue(nodeId, property, value, { part })
      if (result.success) {
        // Notify about the change
        this.eventHandlers.onPropertyChange(nodeId, property, result.finalValue || value)
      }
    } else if (this.propertyValueService) {
      // Use service for simple properties
      const result = this.propertyValueService.setValue(nodeId, property, value)
      if (result.success) {
        this.eventHandlers.onPropertyChange(nodeId, property, value)
      }
    } else {
      // Fallback to direct event handler
      this.eventHandlers.onPropertyChange(nodeId, property, value)
    }
  }

  /**
   * Render the category HTML
   * Must be implemented by subclasses
   */
  abstract render(category: PropertyCategory, context: RenderContext): string

  /**
   * Attach event listeners to the rendered elements
   * Must be implemented by subclasses
   */
  abstract attachEventListeners(container: HTMLElement, context: RenderContext): void

  /**
   * Render an error message for the category
   */
  protected renderError(categoryName: string, error: Error): string {
    console.error(`Error rendering ${categoryName}:`, error)
    return `<div class="pp-error" role="alert">Failed to load ${htmlUtils.escapeHtml(categoryName)}</div>`
  }

  /**
   * Safely execute render with error handling
   */
  protected safeRender(
    categoryName: string,
    renderFn: () => string
  ): string {
    try {
      return renderFn()
    } catch (error) {
      return this.renderError(categoryName, error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Get property value by name (handles aliases)
   */
  protected getPropertyValue(
    properties: ExtractedProperty[],
    ...names: string[]
  ): string {
    for (const name of names) {
      const prop = properties.find(p => p.name === name)
      if (prop) {
        return prop.value || ''
      }
    }
    return ''
  }

  /**
   * Check if a boolean property is active
   */
  protected isPropertyActive(
    properties: ExtractedProperty[],
    ...names: string[]
  ): boolean {
    for (const name of names) {
      const prop = properties.find(p => p.name === name)
      if (prop && (prop.value === 'true' || (prop.value === '' && prop.hasValue !== false))) {
        return true
      }
    }
    return false
  }

  /**
   * Find a property by name (handles aliases)
   */
  protected findProperty(
    properties: ExtractedProperty[],
    ...names: string[]
  ): ExtractedProperty | undefined {
    for (const name of names) {
      const prop = properties.find(p => p.name === name)
      if (prop) {
        return prop
      }
    }
    return undefined
  }

  /**
   * Check if a value is a token reference
   */
  protected isTokenRef(value: string): boolean {
    return value.startsWith('$')
  }

  /**
   * Parse a shorthand value into parts (e.g., "8 16" -> ["8", "16"])
   */
  protected parseShorthand(value: string): string[] {
    return value.split(/\s+/).filter(Boolean)
  }

  /**
   * Escape HTML (delegate to utility)
   */
  protected escapeHtml(str: string): string {
    return htmlUtils.escapeHtml(str)
  }

  /**
   * Render a toggle button
   */
  protected renderToggleButton(options: Parameters<typeof htmlUtils.renderToggleButton>[0]): string {
    return htmlUtils.renderToggleButton(options)
  }

  /**
   * Render an input field
   */
  protected renderInput(options: Parameters<typeof htmlUtils.renderInput>[0]): string {
    return htmlUtils.renderInput(options)
  }

  /**
   * Render a token button
   */
  protected renderTokenButton(options: Parameters<typeof htmlUtils.renderTokenButton>[0]): string {
    return htmlUtils.renderTokenButton(options)
  }

  /**
   * Render a section container
   */
  protected renderSection(options: Parameters<typeof htmlUtils.renderSection>[0]): string {
    return htmlUtils.renderSection(options)
  }

  /**
   * Render a property row
   */
  protected renderPropertyRow(options: Parameters<typeof htmlUtils.renderPropertyRow>[0]): string {
    return htmlUtils.renderPropertyRow(options)
  }

  /**
   * Render a toggle group
   */
  protected renderToggleGroup(buttons: string[]): string {
    return htmlUtils.renderToggleGroup(buttons)
  }

  /**
   * Render a token group
   */
  protected renderTokenGroup(buttons: string[]): string {
    return htmlUtils.renderTokenGroup(buttons)
  }

  /**
   * Render a color swatch
   */
  protected renderColorSwatch(options: Parameters<typeof htmlUtils.renderColorSwatch>[0]): string {
    return htmlUtils.renderColorSwatch(options)
  }

  /**
   * Render a color group
   */
  protected renderColorGroup(swatches: string[]): string {
    return htmlUtils.renderColorGroup(swatches)
  }

  /**
   * Render a color input with preview
   */
  protected renderColorInput(options: Parameters<typeof htmlUtils.renderColorInput>[0]): string {
    return htmlUtils.renderColorInput(options)
  }

  /**
   * Render an expand button
   */
  protected renderExpandButton(options: Parameters<typeof htmlUtils.renderExpandButton>[0]): string {
    return htmlUtils.renderExpandButton(options)
  }

  /**
   * Add event listener with error handling
   */
  protected addEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement | null,
    type: K,
    handler: (e: HTMLElementEventMap[K]) => void,
    context: string
  ): void {
    if (!element) return

    element.addEventListener(type, (e) => {
      try {
        handler(e)
      } catch (error) {
        this.eventHandlers.onError(
          error instanceof Error ? error : new Error(String(error)),
          context
        )
      }
    })
  }

  /**
   * Add event listeners to all matching elements
   */
  protected addEventListeners<K extends keyof HTMLElementEventMap>(
    container: HTMLElement,
    selector: string,
    type: K,
    handler: (element: HTMLElement, e: HTMLElementEventMap[K]) => void,
    context: string
  ): void {
    const elements = container.querySelectorAll(selector)
    elements.forEach(element => {
      if (element instanceof HTMLElement) {
        this.addEventListener(element, type, (e) => handler(element, e), context)
      }
    })
  }
}

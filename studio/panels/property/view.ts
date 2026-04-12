/**
 * Property Panel View
 *
 * Renders the Property Panel UI based on Controller state.
 * Wires up event handlers from Sections to Controller actions.
 */

import type { ExtractedElement, PropertyCategory } from '../../../compiler/studio/property-extractor'
import type { PropertyPanelPorts, PropertyChange } from './ports'
import type { PanelState } from './state-machine'
import { PropertyPanelController, createPropertyPanelController } from './controller'
import { escapeHtml, getDisplayLabel } from './utils'
import {
  createLayoutSection,
  createSizingSection,
  createSpacingSection,
  createBorderSection,
  createColorSection,
  createTypographySection,
  createBehaviorSection,
  createVisualSection
} from './sections'
import type { BaseSection, SectionData, EventHandlerMap, SectionDependencies } from './base/section'

// ============================================
// View Options
// ============================================

export interface PropertyPanelViewOptions {
  /** Debounce time for property changes (ms) */
  debounceTime?: number
}

// ============================================
// Property Panel View
// ============================================

export class PropertyPanelView {
  private container: HTMLElement
  private controller: PropertyPanelController
  private ports: PropertyPanelPorts
  private sections: Map<string, BaseSection> = new Map()
  private eventCleanups: Array<() => void> = []
  private disposed = false

  constructor(
    container: HTMLElement,
    ports: PropertyPanelPorts,
    options: PropertyPanelViewOptions = {}
  ) {
    this.container = container
    this.ports = ports

    // Create controller with render callback
    this.controller = createPropertyPanelController(ports, {
      debounceTime: options.debounceTime,
      onStateChange: (state) => this.render(state),
      onPropertyChange: (nodeId, change) => this.handlePropertyApplied(nodeId, change)
    })

    // Create sections with shared dependencies
    this.initializeSections()
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the view and start listening to events.
   */
  init(): void {
    this.controller.init()
  }

  /**
   * Dispose the view and clean up resources.
   */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true

    // Clean up event listeners
    this.cleanupEventListeners()

    // Dispose controller
    this.controller.dispose()

    // Clear container
    this.container.innerHTML = ''
  }

  /**
   * Get the underlying controller for external access.
   */
  getController(): PropertyPanelController {
    return this.controller
  }

  // ============================================
  // Section Initialization
  // ============================================

  private initializeSections(): void {
    const deps = this.createSectionDependencies()

    this.sections.set('layout', createLayoutSection(deps))
    this.sections.set('sizing', createSizingSection(deps))
    this.sections.set('spacing', createSpacingSection(deps))
    this.sections.set('border', createBorderSection(deps))
    this.sections.set('color', createColorSection(deps))
    this.sections.set('typography', createTypographySection(deps))
    this.sections.set('behavior', createBehaviorSection(deps))
    this.sections.set('visual', createVisualSection(deps))
  }

  private createSectionDependencies(): SectionDependencies {
    return {
      escapeHtml,
      getDisplayLabel,
      onPropertyChange: (propName, value, source) => {
        this.handleSectionPropertyChange(propName, value, source)
      },
      onToggleProperty: (propName, currentValue) => {
        this.controller.toggleProperty(propName, !currentValue)
      }
    }
  }

  // ============================================
  // Rendering
  // ============================================

  private render(state: PanelState): void {
    // Clean up previous event listeners
    this.cleanupEventListeners()

    switch (state.type) {
      case 'empty':
        this.renderEmpty()
        break
      case 'loading':
        this.renderLoading()
        break
      case 'not-found':
        this.renderNotFound(state.nodeId)
        break
      case 'showing':
        this.renderElement(state.element, state.isInPositionedContainer)
        break
      case 'pending-update':
        // Show previous element while waiting for compile
        if (state.previousElement) {
          this.renderElement(state.previousElement, false)
        } else {
          this.renderLoading()
        }
        break
    }
  }

  private renderEmpty(): void {
    this.container.innerHTML = `
      <div class="pp-header">
        <span class="pp-title">Properties</span>
      </div>
      <div class="pp-content">
        <div class="pp-empty">
          <p>Select an element to view properties</p>
        </div>
      </div>
    `
  }

  private renderLoading(): void {
    this.container.innerHTML = `
      <div class="pp-header">
        <span class="pp-title">Properties</span>
      </div>
      <div class="pp-content">
        <div class="pp-empty">
          <p>Loading...</p>
        </div>
      </div>
    `
  }

  private renderNotFound(nodeId: string): void {
    this.container.innerHTML = `
      <div class="pp-header">
        <span class="pp-title">Properties</span>
      </div>
      <div class="pp-content">
        <div class="pp-empty pp-not-found">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>Element not found</p>
          <p class="pp-hint">The selected element may have been removed from the code.</p>
        </div>
      </div>
    `
  }

  private renderElement(element: ExtractedElement, isInPositionedContainer: boolean): void {
    const categoriesHtml = this.renderCategories(element.categories, element, isInPositionedContainer)

    this.container.innerHTML = `
      <div class="pp-header">
        <span class="pp-title">Properties</span>
      </div>
      ${element.isTemplateInstance ? `
        <div class="pp-template-notice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>Template instance - changes apply to all items</span>
        </div>
      ` : ''}
      <div class="pp-content">
        ${categoriesHtml}
      </div>
    `

    // Attach event listeners
    this.attachEventListeners()
  }

  private renderCategories(
    categories: PropertyCategory[],
    element: ExtractedElement,
    isInPositionedContainer: boolean
  ): string {
    if (categories.length === 0) {
      return `<div class="pp-empty"><p>No properties</p></div>`
    }

    // Prepare section data
    const sectionData: SectionData = {
      categories,
      currentElement: {
        nodeId: element.nodeId,
        componentName: element.componentName,
        isDefinition: element.isDefinition
      },
      allProperties: element.allProperties,
      getSpacingTokens: (propType) => this.ports.tokens.getSpacingTokens(propType),
      getColorTokens: () => this.ports.tokens.getColorTokens(),
      resolveTokenValue: (ref) => this.ports.tokens.resolveTokenValue(ref)
    }

    // Find categories for section rendering
    const layoutCat = categories.find(c => c.name === 'layout')
    const sizingCat = categories.find(c => c.name === 'sizing')
    const spacingCat = categories.find(c => c.name === 'spacing')
    const borderCat = categories.find(c => c.name === 'border')
    const typographyCat = categories.find(c => c.name === 'typography')
    const behaviorCat = categories.find(c => c.name === 'behavior')

    let result = ''

    // Render sections in order (matching legacy order)
    if (behaviorCat && behaviorCat.properties.length > 0) {
      const section = this.sections.get('behavior')
      if (section) {
        result += section.render({ ...sectionData, category: behaviorCat })
      }
    }

    if (layoutCat) {
      const section = this.sections.get('layout')
      if (section) {
        result += section.render(sectionData)
      }
    }

    if (sizingCat) {
      const section = this.sections.get('sizing')
      if (section) {
        result += section.render({
          ...sectionData,
          category: sizingCat,
          // Pass positioning context
          spacingTokens: isInPositionedContainer ? [] : undefined
        })
      }
    }

    if (spacingCat) {
      const section = this.sections.get('spacing')
      if (section) {
        const padTokens = this.ports.tokens.getSpacingTokens('pad')
        result += section.render({ ...sectionData, category: spacingCat, spacingTokens: padTokens })
      }
    }

    if (borderCat) {
      const section = this.sections.get('border')
      if (section) {
        result += section.render({ ...sectionData, category: borderCat })
      }
    }

    // Color section always renders (uses allProperties)
    const colorSection = this.sections.get('color')
    if (colorSection) {
      const colorTokens = this.ports.tokens.getColorTokens()
      result += colorSection.render({ ...sectionData, colorTokens })
    }

    if (typographyCat) {
      const section = this.sections.get('typography')
      if (section) {
        result += section.render({ ...sectionData, category: typographyCat })
      }
    }

    return result
  }

  // ============================================
  // Event Handling
  // ============================================

  private attachEventListeners(): void {
    // Collect all handlers from sections
    const allHandlers: EventHandlerMap = {}

    for (const section of this.sections.values()) {
      const handlers = section.getHandlers()
      for (const [selector, events] of Object.entries(handlers)) {
        if (!allHandlers[selector]) {
          allHandlers[selector] = {}
        }
        Object.assign(allHandlers[selector], events)
      }
    }

    // Attach handlers using event delegation
    for (const [selector, events] of Object.entries(allHandlers)) {
      for (const [eventName, handler] of Object.entries(events)) {
        const listener = (e: Event) => {
          const target = (e.target as HTMLElement).closest(selector) as HTMLElement | null
          if (target && this.container.contains(target)) {
            handler(e, target)
          }
        }

        this.container.addEventListener(eventName, listener)
        this.eventCleanups.push(() => {
          this.container.removeEventListener(eventName, listener)
        })
      }
    }
  }

  private cleanupEventListeners(): void {
    for (const cleanup of this.eventCleanups) {
      cleanup()
    }
    this.eventCleanups.length = 0
  }

  // ============================================
  // Property Change Handling
  // ============================================

  /**
   * Handle property changes from sections.
   * Maps special section commands to controller actions.
   */
  private handleSectionPropertyChange(propName: string, value: string, source: string): void {
    const nodeId = this.controller.getCurrentNodeId()
    if (!nodeId) return

    // Handle special section commands
    switch (propName) {
      case '__LAYOUT_MODE__':
        this.handleLayoutModeChange(value)
        break

      case '__PAD_TOKEN__':
      case '__PAD_INPUT__':
        this.handlePaddingChange(propName, value)
        break

      case '__ALIGN__':
        this.handleAlignmentChange(value)
        break

      case '__COLOR_PICKER__':
        this.handleColorPickerOpen(value)
        break

      default:
        // Regular property change
        this.controller.changeProperty(propName, value)
    }
  }

  private handleColorPickerOpen(jsonValue: string): void {
    try {
      const data = JSON.parse(jsonValue)
      const { property, currentValue } = data
      // TODO: Integrate with ColorPicker
      // For now, emit an event that the color picker can listen to
      console.log('[PropertyPanelView] Color picker requested for:', property, currentValue)
    } catch (e) {
      console.error('[PropertyPanelView] Failed to parse color picker request:', e)
    }
  }

  private handleLayoutModeChange(mode: string): void {
    // Layout modes are mutually exclusive
    // When one is set, others should be removed
    const layoutModes = ['hor', 'ver', 'horizontal', 'vertical', 'grid', 'stacked']
    const nodeId = this.controller.getCurrentNodeId()
    if (!nodeId) return

    // Map to short form
    const shortMode = mode === 'horizontal' ? 'hor'
                    : mode === 'vertical' ? 'ver'
                    : mode

    // For simplicity, just set the new mode
    // The code modifier should handle removing conflicting modes
    this.controller.changeProperty(shortMode, '')
  }

  private handlePaddingChange(propName: string, jsonValue: string): void {
    try {
      const data = JSON.parse(jsonValue)
      const { value, dir } = data

      // For now, simplify: just set pad directly
      // TODO: Implement proper directional padding handling
      if (dir === 'h' || dir === 'v') {
        // Simple padding value
        this.controller.changeProperty('pad', value)
      } else {
        // Directional padding - would need more complex handling
        this.controller.changeProperty('pad', value)
      }
    } catch (e) {
      console.error('[PropertyPanelView] Failed to parse padding change:', e)
    }
  }

  private handleAlignmentChange(alignment: string): void {
    // Alignment is a compound value like "top-left" or "middle-center"
    const [vertical, horizontal] = alignment.split('-')

    // Map to actual properties
    if (vertical === 'middle' && horizontal === 'center') {
      this.controller.changeProperty('center', '')
    } else {
      // Would need to set multiple properties
      // For now, just set center if middle-center
      if (vertical) {
        const vProp = vertical === 'top' ? 'top'
                    : vertical === 'bottom' ? 'bottom'
                    : vertical === 'middle' ? 'ver-center'
                    : null
        if (vProp) this.controller.changeProperty(vProp, '')
      }
      if (horizontal) {
        const hProp = horizontal === 'left' ? 'left'
                    : horizontal === 'right' ? 'right'
                    : horizontal === 'center' ? 'hor-center'
                    : null
        if (hProp) this.controller.changeProperty(hProp, '')
      }
    }
  }

  private handlePropertyApplied(nodeId: string, change: PropertyChange): void {
    // Property was applied - could show feedback here
    // For now, no-op - the state machine will trigger a re-render
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Creates a new PropertyPanelView.
 */
export function createPropertyPanelView(
  container: HTMLElement,
  ports: PropertyPanelPorts,
  options?: PropertyPanelViewOptions
): PropertyPanelView {
  return new PropertyPanelView(container, ports, options)
}

/**
 * Property Panel View
 *
 * Renders the Property Panel UI based on Controller state.
 * Wires up event handlers from Sections to Controller actions.
 */

import type { ExtractedElement, PropertyCategory } from '../../code-modifier'
import type { PropertyPanelPorts, PropertyChange } from './ports'
import type { PanelState } from './state-machine'
import { PropertyPanelController, createPropertyPanelController } from './controller'
import { escapeHtml, getDisplayLabel } from './utils'
import {
  createContentSection,
  createPositionSection,
  createEventsSection,
  createLayoutSection,
  createSizingSection,
  createSpacingSection,
  createMarginSection,
  createBorderSection,
  createColorSection,
  createTypographySection,
  createBehaviorSection,
  createVisualSection,
} from './sections'
import type { BaseSection, SectionData, EventHandlerMap, SectionDependencies } from './base/section'
import { dirToSpacingProp } from './utils/spacing-parse'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('PropertyPanelView')

// ============================================
// Primitive-specific Panel Configuration
// ============================================

/**
 * Defines which sections to show for each primitive type.
 * - sections: array of section names to show
 * - compact: hide section headers (for simple primitives)
 * - colorProps: which color properties to show (bg, col, ic, boc)
 */
interface PanelConfig {
  sections: string[]
  compact?: boolean
  colorProps?: string[]
}

const PANEL_CONFIG: Record<string, PanelConfig> = {
  // ==========================================================================
  // BASIC PRIMITIVES
  // ==========================================================================
  Icon: {
    sections: ['content', 'color', 'sizing'],
    compact: true,
    colorProps: ['ic'],
  },
  Image: {
    sections: ['content', 'sizing', 'border'],
    compact: true,
  },
  Img: {
    sections: ['content', 'sizing', 'border'],
    compact: true,
  },
  Divider: {
    sections: ['color', 'spacing'],
    compact: true,
    colorProps: ['bg'],
  },
  Spacer: {
    sections: ['sizing'],
    compact: true,
  },

  // ==========================================================================
  // TEXT ELEMENTS
  // ==========================================================================
  Text: {
    sections: ['content', 'color', 'typography', 'sizing'],
    compact: true,
    colorProps: ['col'],
  },
  Label: {
    sections: ['content', 'color', 'typography'],
    compact: true,
    colorProps: ['col'],
  },
  H1: { sections: ['content', 'color', 'typography'], compact: true, colorProps: ['col'] },
  H2: { sections: ['content', 'color', 'typography'], compact: true, colorProps: ['col'] },
  H3: { sections: ['content', 'color', 'typography'], compact: true, colorProps: ['col'] },
  H4: { sections: ['content', 'color', 'typography'], compact: true, colorProps: ['col'] },
  H5: { sections: ['content', 'color', 'typography'], compact: true, colorProps: ['col'] },
  H6: { sections: ['content', 'color', 'typography'], compact: true, colorProps: ['col'] },

  // ==========================================================================
  // INTERACTIVE ELEMENTS
  // ==========================================================================
  Button: {
    sections: ['content', 'color', 'spacing', 'border', 'typography'],
    colorProps: ['bg', 'col'],
  },
  Link: {
    sections: ['content', 'color', 'typography'],
    colorProps: ['col'],
  },

  // ==========================================================================
  // FORM INPUTS
  // ==========================================================================
  Input: {
    sections: ['content', 'color', 'sizing', 'spacing', 'border', 'typography'],
    colorProps: ['bg', 'col', 'boc'],
  },
  Textarea: {
    sections: ['content', 'color', 'sizing', 'spacing', 'border', 'typography'],
    colorProps: ['bg', 'col', 'boc'],
  },

  // ==========================================================================
  // CONTAINERS
  // ==========================================================================
  Frame: {
    sections: ['layout', 'sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'col'],
  },
  Box: {
    sections: ['layout', 'sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg'],
  },

  // Semantic containers
  Header: { sections: ['layout', 'sizing', 'spacing', 'color'], colorProps: ['bg'] },
  Nav: { sections: ['layout', 'sizing', 'spacing', 'color'], colorProps: ['bg'] },
  Main: { sections: ['layout', 'sizing', 'spacing', 'color'], colorProps: ['bg'] },
  Section: { sections: ['layout', 'sizing', 'spacing', 'color'], colorProps: ['bg'] },
  Article: { sections: ['layout', 'sizing', 'spacing', 'color'], colorProps: ['bg'] },
  Aside: { sections: ['layout', 'sizing', 'spacing', 'color'], colorProps: ['bg'] },
  Footer: { sections: ['layout', 'sizing', 'spacing', 'color'], colorProps: ['bg'] },

  // ==========================================================================
  // DATA COMPONENTS
  // ==========================================================================
  Table: {
    sections: ['layout', 'sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'col'],
  },
  TableHeader: { sections: ['spacing', 'color'], colorProps: ['bg', 'col'] },
  TableRow: { sections: ['spacing', 'color'], colorProps: ['bg', 'col'] },
  TableCell: { sections: ['sizing', 'spacing', 'color', 'typography'], colorProps: ['col'] },
  TableHeaderCell: { sections: ['sizing', 'spacing', 'color', 'typography'], colorProps: ['col'] },

  // ==========================================================================
  // COMPONENT PANEL: FORM CONTROLS
  // ==========================================================================
  Checkbox: {
    sections: ['content', 'sizing', 'spacing', 'color'],
    colorProps: ['bg', 'col'],
  },
  Switch: {
    sections: ['content', 'sizing', 'spacing', 'color'],
    colorProps: ['bg'],
  },
  Slider: {
    sections: ['sizing', 'spacing', 'color'],
    colorProps: ['bg'],
  },
  RadioGroup: {
    sections: ['layout', 'spacing', 'color'],
    colorProps: ['col'],
  },
  RadioItem: {
    sections: ['content', 'spacing', 'color'],
    compact: true,
    colorProps: ['col'],
  },

  // ==========================================================================
  // COMPONENT PANEL: SELECT (Pure Mirror)
  // ==========================================================================
  Select: {
    sections: ['sizing', 'spacing', 'border', 'color', 'typography'],
    colorProps: ['bg', 'col', 'boc'],
  },
  SelectTrigger: {
    sections: ['sizing', 'spacing', 'border', 'color', 'typography'],
    colorProps: ['bg', 'col', 'boc'],
  },
  Trigger: {
    sections: ['sizing', 'spacing', 'border', 'color', 'typography'],
    colorProps: ['bg', 'col', 'boc'],
  },
  SelectContent: {
    sections: ['sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'boc'],
  },
  Content: {
    sections: ['sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'boc'],
  },
  SelectItem: {
    sections: ['spacing', 'border', 'color', 'typography'],
    compact: true,
    colorProps: ['bg', 'col'],
  },
  Item: {
    sections: ['spacing', 'border', 'color', 'typography'],
    compact: true,
    colorProps: ['bg', 'col'],
  },

  // ==========================================================================
  // COMPONENT PANEL: DIALOG
  // ==========================================================================
  Dialog: {
    sections: ['sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'boc'],
  },
  DialogTrigger: {
    sections: ['sizing', 'spacing', 'border', 'color', 'typography'],
    colorProps: ['bg', 'col', 'boc'],
  },
  DialogContent: {
    sections: ['sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'boc'],
  },
  DialogBackdrop: {
    sections: ['color'],
    compact: true,
    colorProps: ['bg'],
  },
  Backdrop: {
    sections: ['color'],
    compact: true,
    colorProps: ['bg'],
  },

  // ==========================================================================
  // COMPONENT PANEL: TABS
  // ==========================================================================
  Tabs: {
    sections: ['layout', 'sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'boc'],
  },
  Tab: {
    sections: ['content', 'spacing', 'border', 'color', 'typography'],
    colorProps: ['bg', 'col', 'boc'],
  },
  TabList: {
    sections: ['layout', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'boc'],
  },
  TabContent: {
    sections: ['spacing', 'color'],
    colorProps: ['bg'],
  },

  // ==========================================================================
  // COMPONENT PANEL: SIDENAV
  // ==========================================================================
  SideNav: {
    sections: ['layout', 'sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'boc'],
  },
  NavItem: {
    sections: ['spacing', 'border', 'color', 'typography'],
    colorProps: ['bg', 'col'],
  },

  // ==========================================================================
  // COMPONENT PANEL: DATE PICKER
  // ==========================================================================
  DatePicker: {
    sections: ['sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'col', 'boc'],
  },
  DateInput: {
    sections: ['sizing', 'spacing', 'border', 'color', 'typography'],
    colorProps: ['bg', 'col', 'boc'],
  },
}

/** Default config for unknown primitives */
const DEFAULT_PANEL_CONFIG: PanelConfig = {
  sections: ['content', 'layout', 'sizing', 'spacing', 'border', 'color', 'typography'],
  colorProps: ['bg', 'col'],
}

/**
 * Get panel configuration for a primitive
 */
function getPanelConfig(primitive: string): PanelConfig {
  return PANEL_CONFIG[primitive] || DEFAULT_PANEL_CONFIG
}

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
      onStateChange: state => this.render(state),
      onPropertyChange: (nodeId, change) => this.handlePropertyApplied(nodeId, change),
    })

    // Create sections with shared dependencies
    this.initializeSections()

    // Install panel-level delegated handlers ONCE — they survive re-renders
    // because they delegate via closest(). Re-registering them per-render
    // (as in earlier code) leaks listeners during back-to-back boot renders:
    // the second click in a sequence then double-fires through stale handlers,
    // making toggle appear stuck.
    this.installGlobalDelegates()
  }

  /**
   * Installs delegated handlers that are panel-level (not section-owned).
   * Runs once in the constructor; re-renders don't re-register these.
   */
  private installGlobalDelegates(): void {
    this.container.addEventListener('click', e => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('.section-expand-btn')
      if (!btn || !this.container.contains(btn)) return
      const name = btn.dataset.expand
      if (!name) return
      e.preventDefault()
      this.controller.toggleSection(name)
    })
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

    this.sections.set('content', createContentSection(deps))
    this.sections.set('position', createPositionSection(deps))
    this.sections.set('events', createEventsSection(deps))
    this.sections.set('layout', createLayoutSection(deps))
    this.sections.set('sizing', createSizingSection(deps))
    this.sections.set('spacing', createSpacingSection(deps))
    this.sections.set('margin', createMarginSection(deps))
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
      },
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
        this.renderElement(state.element, state.isInPositionedContainer, state.expandedSections)
        break
      case 'pending-update':
        // Show previous element while waiting for compile
        if (state.previousElement) {
          this.renderElement(state.previousElement, false, undefined)
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

  private renderElement(
    element: ExtractedElement,
    isInPositionedContainer: boolean,
    expandedSections?: Set<string>
  ): void {
    const categoriesHtml = this.renderCategories(
      element.categories,
      element,
      isInPositionedContainer,
      expandedSections
    )

    // Use component name in title (e.g., "Text Properties", "Button Properties")
    const componentName = element.componentName || 'Element'
    const title = `${componentName} Properties`

    this.container.innerHTML = `
      <div class="pp-header">
        <span class="pp-title">${title}</span>
      </div>
      ${
        element.isTemplateInstance
          ? `
        <div class="pp-template-notice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>Template instance - changes apply to all items</span>
        </div>
      `
          : ''
      }
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
    isInPositionedContainer: boolean,
    expandedSections?: Set<string>
  ): string {
    if (categories.length === 0) {
      return `<div class="pp-empty"><p>No properties</p></div>`
    }

    // Get primitive type and panel configuration
    const primitive = element.componentName || 'Frame'
    const config = getPanelConfig(primitive)
    const allowedSections = new Set(config.sections)

    // Prepare section data with primitive info
    const sectionData: SectionData = {
      categories,
      currentElement: {
        nodeId: element.nodeId,
        componentName: element.componentName,
        isDefinition: element.isDefinition,
      },
      allProperties: element.allProperties,
      primitive,
      compact: config.compact,
      expandedSections,
      getSpacingTokens: propType => this.ports.tokens.getSpacingTokens(propType),
      getColorTokens: () => this.ports.tokens.getColorTokens(),
      resolveTokenValue: (ref, propType) => this.ports.tokens.resolveTokenValue(ref, propType),
    }

    // Find categories for section rendering
    const layoutCat = categories.find(c => c.name === 'layout')
    const sizingCat = categories.find(c => c.name === 'sizing')
    const spacingCat = categories.find(c => c.name === 'spacing')
    const borderCat = categories.find(c => c.name === 'border')
    const typographyCat = categories.find(c => c.name === 'typography')
    const behaviorCat = categories.find(c => c.name === 'behavior')

    let result = ''

    // Behavior section always shows if it has content (Zag components)
    if (behaviorCat && behaviorCat.properties.length > 0) {
      const section = this.sections.get('behavior')
      if (section) {
        result += section.render({ ...sectionData, category: behaviorCat })
      }
    }

    // Content section (text, icon, placeholder, href, src)
    if (allowedSections.has('content')) {
      const contentSection = this.sections.get('content')
      if (contentSection) {
        result += contentSection.render(sectionData)
      }
    }

    // Position section (x, y, z - only for stacked containers)
    if (isInPositionedContainer) {
      const positionSection = this.sections.get('position')
      if (positionSection) {
        result += positionSection.render({ ...sectionData, isInPositionedContainer })
      }
    }

    // Layout section
    if (allowedSections.has('layout') && layoutCat) {
      const section = this.sections.get('layout')
      if (section) {
        result += section.render(sectionData)
      }
    }

    // Sizing section
    if (allowedSections.has('sizing') && sizingCat) {
      const section = this.sections.get('sizing')
      if (section) {
        result += section.render({
          ...sectionData,
          category: sizingCat,
          spacingTokens: isInPositionedContainer ? [] : undefined,
        })
      }
    }

    // Spacing section (Padding) — uses the `spacing` category, filters
    // for padding-shaped properties internally.
    if (allowedSections.has('spacing') && spacingCat) {
      const section = this.sections.get('spacing')
      if (section) {
        const padTokens = this.ports.tokens.getSpacingTokens('pad')
        result += section.render({ ...sectionData, category: spacingCat, spacingTokens: padTokens })
      }
      // Margin section — same `spacing` category (padding + margin share
      // a category in the schema), filters for margin properties.
      const marginSection = this.sections.get('margin')
      if (marginSection) {
        const marTokens = this.ports.tokens.getSpacingTokens('mar')
        result += marginSection.render({
          ...sectionData,
          category: spacingCat,
          spacingTokens: marTokens,
        })
      }
    }

    // Border section
    if (allowedSections.has('border') && borderCat) {
      const section = this.sections.get('border')
      if (section) {
        const radTokens = this.ports.tokens.getSpacingTokens('rad')
        result += section.render({ ...sectionData, category: borderCat, spacingTokens: radTokens })
      }
    }

    // Color section - pass colorProps to filter which colors to show
    if (allowedSections.has('color')) {
      const colorSection = this.sections.get('color')
      if (colorSection) {
        const colorTokens = this.ports.tokens.getColorTokens()
        result += colorSection.render({
          ...sectionData,
          colorTokens,
          colorProps: config.colorProps,
        })
      }
    }

    // Typography section
    if (allowedSections.has('typography') && typographyCat) {
      const section = this.sections.get('typography')
      if (section) {
        result += section.render({ ...sectionData, category: typographyCat })
      }
    }

    // Events section (onclick, onhover, etc.) - at the end
    const eventsSection = this.sections.get('events')
    if (eventsSection) {
      result += eventsSection.render({ ...sectionData, events: element.events })
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

    // Section-expand chevron is installed once via installGlobalDelegates
    // (constructor) — registering it per-render leaks listeners during
    // back-to-back boot renders, causing toggles to misfire.
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

      case '__DEVICE_PRESET__':
        this.handleDevicePresetChange(value)
        break

      case '__PAD_TOKEN__':
      case '__PAD_INPUT__':
        this.handlePaddingChange(propName, value)
        break

      case '__MAR_TOKEN__':
      case '__MAR_INPUT__':
        this.handleMarginChange(propName, value)
        break

      case '__ALIGN__':
        this.handleAlignmentChange(value)
        break

      case '__COLOR_PICKER__':
        this.handleColorPickerOpen(value)
        break

      case '__OPEN_ICON_PICKER__':
        this.handleIconPickerOpen()
        break

      case '__EVENT_ACTION__':
        this.handleEventActionChange(value)
        break

      case '__ADD_EVENT__':
        this.handleAddEvent(value)
        break

      case '__DELETE_EVENT__':
        this.handleDeleteEvent(value)
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

      // Find the color trigger element to position the picker
      const trigger = this.container?.querySelector(
        `[data-color-prop="${property}"]`
      ) as HTMLElement
      if (!trigger) {
        log.warn('Color trigger not found for property:', property)
        return
      }

      const rect = trigger.getBoundingClientRect()
      const x = rect.left
      const y = rect.bottom + 8

      // Use the global color picker API
      const showColorPicker = (window as any).showColorPickerForProperty
      if (showColorPicker) {
        showColorPicker(x, y, property, currentValue, (color: string) => {
          // When a color is selected, update the property
          this.controller.changeProperty(property === 'bg' ? 'bg' : 'col', color)
        })
      } else {
        log.warn('Color picker API not available')
      }
    } catch (e) {
      log.error('Failed to parse color picker request:', e)
    }
  }

  private handleIconPickerOpen(): void {
    // Dispatch a custom event that the IconPicker in the editor can listen to
    // The picker will be positioned near the property panel icon field
    const event = new CustomEvent('property-panel:open-icon-picker', {
      bubbles: true,
      detail: {
        nodeId: this.controller.getCurrentNodeId(),
        onSelect: (iconName: string) => {
          // When an icon is selected, update the property
          this.controller.changeProperty('content', iconName)
        },
      },
    })
    this.container.dispatchEvent(event)
    log.info('Icon picker requested')
  }

  private handleEventActionChange(jsonValue: string): void {
    try {
      const data = JSON.parse(jsonValue)
      const { event, actions } = data
      // Dispatch event to update the event's actions in the code
      const customEvent = new CustomEvent('property-panel:event-change', {
        bubbles: true,
        detail: {
          nodeId: this.controller.getCurrentNodeId(),
          eventName: event,
          actionsString: actions,
        },
      })
      this.container.dispatchEvent(customEvent)
      log.info('Event action changed:', event, actions)
    } catch (e) {
      log.error('Failed to parse event action change:', e)
    }
  }

  private handleAddEvent(eventName: string): void {
    // Dispatch event to add a new event to the element
    const event = new CustomEvent('property-panel:add-event', {
      bubbles: true,
      detail: {
        nodeId: this.controller.getCurrentNodeId(),
        eventName,
      },
    })
    this.container.dispatchEvent(event)
    log.info('Add event:', eventName)
  }

  private handleDeleteEvent(eventName: string): void {
    // Dispatch event to remove an event from the element
    const event = new CustomEvent('property-panel:delete-event', {
      bubbles: true,
      detail: {
        nodeId: this.controller.getCurrentNodeId(),
        eventName,
      },
    })
    this.container.dispatchEvent(event)
    log.info('Delete event:', eventName)
  }

  private handleLayoutModeChange(mode: string): void {
    if (!this.controller.getCurrentNodeId()) return
    const shortMode = mode === 'horizontal' ? 'hor' : mode === 'vertical' ? 'ver' : mode
    this.controller.changeProperty(shortMode, '')
  }

  private handleDevicePresetChange(device: string): void {
    if (!this.controller.getCurrentNodeId()) return

    // Device presets
    const DEVICE_PRESETS: Record<string, { w: number; h: number }> = {
      mobile: { w: 375, h: 812 },
      tablet: { w: 768, h: 1024 },
      desktop: { w: 1440, h: 900 },
    }

    const preset = DEVICE_PRESETS[device]
    if (preset) {
      // Set both width and height
      this.controller.changeProperty('w', String(preset.w))
      this.controller.changeProperty('h', String(preset.h))
    }
  }

  private handlePaddingChange(propName: string, jsonValue: string): void {
    try {
      const data = JSON.parse(jsonValue)
      const { value, dir } = data

      const target = dirToSpacingProp('pad', dir)
      if (!target) return

      if (value === '') {
        this.controller.removeProperty(target)
      } else {
        this.controller.changeProperty(target, value)
      }
    } catch (e) {
      log.error('Failed to parse padding change:', e)
    }
  }

  private handleMarginChange(propName: string, jsonValue: string): void {
    try {
      const data = JSON.parse(jsonValue)
      const { value, dir } = data

      const target = dirToSpacingProp('mar', dir)
      if (!target) return

      if (value === '') {
        this.controller.removeProperty(target)
      } else {
        this.controller.changeProperty(target, value)
      }
    } catch (e) {
      log.error('Failed to parse margin change:', e)
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
        const vProp =
          vertical === 'top'
            ? 'top'
            : vertical === 'bottom'
              ? 'bottom'
              : vertical === 'middle'
                ? 'ver-center'
                : null
        if (vProp) this.controller.changeProperty(vProp, '')
      }
      if (horizontal) {
        const hProp =
          horizontal === 'left'
            ? 'left'
            : horizontal === 'right'
              ? 'right'
              : horizontal === 'center'
                ? 'hor-center'
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

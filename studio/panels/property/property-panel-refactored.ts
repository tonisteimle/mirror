/**
 * PropertyPanel - Refactored Version
 *
 * This is the refactored PropertyPanel that uses extracted sections and EventDelegator.
 * It serves as the orchestrator, delegating rendering and event handling to sections.
 */

import type { BreadcrumbItem } from '../../../compiler/studio/selection-manager'
import type { PropertyExtractor, ExtractedElement, PropertyCategory } from '../../../compiler/studio/property-extractor'
import type { CodeModifier, ModificationResult, FilesAccess } from '../../../compiler/studio/code-modifier'
import { state, events } from '../../core'

import { EventDelegator } from './base/event-delegator'
import type { SectionData, SpacingToken, ColorToken, PropertyChangeCallback } from './types'
import { parseSpacingValue, buildSpacingValue } from './sections/spacing-section'
import { showColorPickerForProperty } from '../../pickers/color'
import { getAlignmentChanges, parseAlignmentState } from './components/align-grid'
import type { AlignPosition } from './types'
import { escapeHtml, isExpanded as isSectionExpanded, setExpanded as setSectionExpanded, toggleExpanded as toggleSectionExpanded } from './utils'

// Import all sections
import {
  LayoutSection, createLayoutSection,
  SizingSection, createSizingSection,
  SpacingSection, createSpacingSection,
  ColorSection, createColorSection,
  BorderSection, createBorderSection,
  TypographySection, createTypographySection,
  IconSection, createIconSection,
  VisualSection, createVisualSection,
  BehaviorSection, createBehaviorSection,
  InteractionsSection, createInteractionsSection,
  EventsSection, createEventsSection,
  ActionsSection, createActionsSection
} from './sections'

import type { BaseSection } from './base/section'

/**
 * Interface for selection providers
 */
export interface SelectionProvider {
  subscribe(listener: (nodeId: string | null, previousNodeId: string | null) => void): () => void
  subscribeBreadcrumb(listener: (chain: BreadcrumbItem[]) => void): () => void
  getSelection(): string | null
  clearSelection(): void
  select(nodeId: string | null): void
}

/**
 * Callback when code changes
 */
export type OnCodeChangeCallback = (result: ModificationResult) => void

/**
 * Callback to get all project source
 */
export type GetAllSourceCallback = () => string

/**
 * PropertyPanel options
 */
export interface PropertyPanelOptions {
  debounceTime?: number
  showSourceIndicators?: boolean
  getAllSource?: GetAllSourceCallback
  filesAccess?: FilesAccess
}

/**
 * Section registry entry
 */
interface SectionEntry {
  section: BaseSection
  categoryName: string
  container: HTMLElement | null
}

/**
 * PropertyPanel - Orchestrator class
 *
 * This is the refactored PropertyPanel that delegates to extracted sections.
 */
export class PropertyPanel {
  private container: HTMLElement
  private selectionManager: SelectionProvider
  private propertyExtractor: PropertyExtractor
  private codeModifier: CodeModifier
  private onCodeChange: OnCodeChangeCallback

  private options: Required<Omit<PropertyPanelOptions, 'getAllSource' | 'filesAccess'>> & Pick<PropertyPanelOptions, 'getAllSource' | 'filesAccess'>
  private unsubscribeSelection: (() => void) | null = null
  private currentElement: ExtractedElement | null = null
  private debounceTimers: Map<string, number> = new Map()

  // Token caching
  private cachedSpacingTokens: Map<string, SpacingToken[]> = new Map()
  private cachedColorTokens: ColorToken[] | null = null
  private cachedSourceHash: string = ''

  // Event subscription cleanup
  private unsubscribeSelectionInvalidated: (() => void) | null = null
  private unsubscribeCompileCompleted: (() => void) | null = null
  private unsubscribeDefinitionSelected: (() => void) | null = null
  private pendingUpdateNodeId: string | null = null

  // Event delegator for centralized event handling
  private eventDelegator: EventDelegator | null = null

  // Sections
  private sections: Map<string, SectionEntry> = new Map()

  constructor(
    container: HTMLElement,
    selectionManager: SelectionProvider,
    propertyExtractor: PropertyExtractor,
    codeModifier: CodeModifier,
    onCodeChange: OnCodeChangeCallback,
    options: PropertyPanelOptions = {}
  ) {
    this.container = container
    this.selectionManager = selectionManager
    this.propertyExtractor = propertyExtractor
    this.codeModifier = codeModifier
    this.onCodeChange = onCodeChange

    this.options = {
      debounceTime: options.debounceTime ?? 150,
      showSourceIndicators: options.showSourceIndicators ?? true,
      getAllSource: options.getAllSource,
      filesAccess: options.filesAccess
    }

    // Initialize sections
    this.initializeSections()

    // Subscribe to selection changes
    this.unsubscribeSelection = this.selectionManager.subscribe((nodeId) => {
      this.updatePanel(nodeId)
    })

    // Listen for selection invalidation
    this.unsubscribeSelectionInvalidated = events.on('selection:invalidated', ({ nodeId }) => {
      if (this.currentElement?.nodeId === nodeId) {
        this.renderNotFound(nodeId)
        this.currentElement = null
      }
    })

    // Listen for compile completion
    this.unsubscribeCompileCompleted = events.on('compile:completed', () => {
      if (this.pendingUpdateNodeId !== null) {
        const nodeId = this.pendingUpdateNodeId
        this.pendingUpdateNodeId = null
        this.updatePanel(nodeId)
      }
    })

    // Listen for definition:selected
    this.unsubscribeDefinitionSelected = events.on('definition:selected', ({ componentName }) => {
      this.showComponentDefinition(componentName)
    })

    // Initial render
    const currentSelection = this.selectionManager.getSelection()
    if (currentSelection) {
      this.updatePanel(currentSelection)
    } else {
      this.renderEmpty()
    }
  }

  /**
   * Initialize all sections with dependency injection
   */
  private initializeSections(): void {
    const deps = {
      onPropertyChange: this.handlePropertyChange.bind(this),
      escapeHtml,
      getSpacingTokens: this.getSpacingTokensBySuffix.bind(this),
      getColorTokens: this.getColorTokens.bind(this)
    }

    // Create all sections
    this.sections.set('layout', { section: createLayoutSection(deps), categoryName: 'layout', container: null })
    this.sections.set('sizing', { section: createSizingSection(deps), categoryName: 'sizing', container: null })
    this.sections.set('spacing', { section: createSpacingSection(deps), categoryName: 'spacing', container: null })
    this.sections.set('color', { section: createColorSection(deps), categoryName: 'color', container: null })
    this.sections.set('border', { section: createBorderSection(deps), categoryName: 'border', container: null })
    this.sections.set('typography', { section: createTypographySection(deps), categoryName: 'typography', container: null })
    this.sections.set('icon', { section: createIconSection(deps), categoryName: 'icon', container: null })
    this.sections.set('visual', { section: createVisualSection(deps), categoryName: 'visual', container: null })
    this.sections.set('behavior', { section: createBehaviorSection(deps), categoryName: 'behavior', container: null })
    this.sections.set('interactions', { section: createInteractionsSection(deps), categoryName: 'interactions', container: null })
    this.sections.set('events', { section: createEventsSection(deps), categoryName: 'events', container: null })
    this.sections.set('actions', { section: createActionsSection(deps), categoryName: 'actions', container: null })
  }

  /**
   * Detach and cleanup
   */
  detach(): void {
    if (this.unsubscribeSelection) {
      this.unsubscribeSelection()
      this.unsubscribeSelection = null
    }
    if (this.unsubscribeSelectionInvalidated) {
      this.unsubscribeSelectionInvalidated()
      this.unsubscribeSelectionInvalidated = null
    }
    if (this.unsubscribeCompileCompleted) {
      this.unsubscribeCompileCompleted()
      this.unsubscribeCompileCompleted = null
    }
    if (this.unsubscribeDefinitionSelected) {
      this.unsubscribeDefinitionSelected()
      this.unsubscribeDefinitionSelected = null
    }

    // Cleanup event delegator
    if (this.eventDelegator) {
      this.eventDelegator.destroy()
      this.eventDelegator = null
    }

    // Detach all sections
    for (const entry of this.sections.values()) {
      entry.section.detach()
    }

    this.clearDebounceTimers()
    this.invalidateTokenCache()
    this.pendingUpdateNodeId = null
  }

  /**
   * Refresh the panel with current selection
   */
  refresh(): void {
    const currentSelection = this.selectionManager.getSelection()
    if (currentSelection) {
      this.updatePanel(currentSelection)
    } else if (this.currentElement) {
      this.updatePanel(this.currentElement.nodeId)
    }
  }

  /**
   * Update dependencies (called when compiler context changes)
   */
  updateDependencies(
    propertyExtractor: PropertyExtractor,
    codeModifier: CodeModifier
  ): void {
    this.propertyExtractor = propertyExtractor
    this.codeModifier = codeModifier
    this.invalidateTokenCache()
    this.refresh()
  }

  /**
   * Dispose the panel completely
   */
  dispose(): void {
    this.detach()
    this.container.innerHTML = ''
  }

  // ============================================
  // Panel Update & Rendering
  // ============================================

  private updatePanel(nodeId: string | null): void {
    // Defer update if compile is in progress
    if (state.get().compiling) {
      this.pendingUpdateNodeId = nodeId
      return
    }

    // Clear debounce timers when selection changes
    const selectionChanged = nodeId !== this.currentElement?.nodeId
    if (selectionChanged) {
      this.clearDebounceTimers()
    }

    if (!nodeId) {
      this.renderEmpty()
      this.currentElement = null
      return
    }

    // Extract element data
    const element = this.propertyExtractor.getProperties(nodeId)
    if (!element) {
      this.renderNotFound(nodeId)
      this.currentElement = null
      return
    }

    this.currentElement = element
    this.renderElement(element)
  }

  private renderEmpty(): void {
    this.container.innerHTML = `
      <div class="pp-header">
        <span class="pp-title">Properties</span>
      </div>
      <div class="pp-empty">
        <p>Select an element to see its properties</p>
      </div>
    `
    this.cleanupEventDelegator()
  }

  private renderNotFound(nodeId: string): void {
    this.container.innerHTML = `
      <div class="pp-header">
        <span class="pp-title">Properties</span>
      </div>
      <div class="pp-not-found">
        <p>Element not found</p>
        <p class="pp-hint">The element may have been removed or modified</p>
        <code>${escapeHtml(nodeId)}</code>
      </div>
    `
    this.cleanupEventDelegator()
  }

  private renderElement(element: ExtractedElement): void {
    // Get token data for sections
    const spacingTokens = this.getSpacingTokens()
    const colorTokens = this.getColorTokens()

    // Render header
    const headerHtml = this.renderHeader(element)

    // Render all sections
    const sectionsHtml = this.renderSections(element, spacingTokens, colorTokens)

    this.container.innerHTML = `
      ${headerHtml}
      ${element.isTemplateInstance ? this.renderTemplateNotice() : ''}
      <div class="pp-content">
        ${sectionsHtml}
      </div>
    `

    // Setup event delegation
    this.setupEventDelegation()

    // Apply persisted section collapse states
    this.applySectionCollapseStates()

    // Attach sections to their containers and call afterMount
    this.attachSections()
  }

  /**
   * Attach sections to their DOM containers and call afterMount
   * This enables features like scrubbing that need DOM references
   */
  private attachSections(): void {
    for (const [name, entry] of this.sections) {
      const containerEl = this.container.querySelector(`[data-section="${name}"]`) as HTMLElement
      if (containerEl) {
        // Set container reference on the section
        // The section's data was already set during render()
        ;(entry.section as any).container = containerEl
        entry.section.afterMount()
      }
    }
  }

  private renderHeader(element: ExtractedElement): string {
    return `
      <div class="pp-header">
        <span class="pp-title">Properties</span>
      </div>
    `
  }

  private renderTemplateNotice(): string {
    return `
      <div class="pp-template-notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>Template instance - changes apply to all items</span>
      </div>
    `
  }

  private renderSections(element: ExtractedElement, spacingTokens: SpacingToken[], colorTokens: ColorToken[]): string {
    const categories = element.categories
    let result = ''

    // Find categories
    const layoutCat = categories.find(c => c.name === 'layout')
    const alignmentCat = categories.find(c => c.name === 'alignment')
    const positionCat = categories.find(c => c.name === 'position')
    const sizingCat = categories.find(c => c.name === 'sizing')
    const spacingCat = categories.find(c => c.name === 'spacing')
    const borderCat = categories.find(c => c.name === 'border')
    const typographyCat = categories.find(c => c.name === 'typography')
    const iconCat = categories.find(c => c.name === 'icon')
    const visualCat = categories.find(c => c.name === 'visual')
    const behaviorCat = categories.find(c => c.name === 'behavior')

    // Check if in absolute container
    const isInPositionedContainer = positionCat?.properties.some(p =>
      (p.name === 'absolute' || p.name === 'abs') &&
      (p.value === 'true' || (p.value === '' && p.hasValue !== false))
    ) ?? false

    // Base section data
    const baseSectionData: Partial<SectionData> = {
      allProperties: element.allProperties,
      nodeId: element.nodeId,
      spacingTokens,
      colorTokens,
      isInPositionedContainer
    }

    // Render Behavior section (for Zag components)
    if (behaviorCat && behaviorCat.properties.length > 0) {
      result += this.renderSection('behavior', {
        ...baseSectionData,
        category: behaviorCat
      } as SectionData)
    }

    // Render Interactions section
    if (element.interactions && element.interactions.length > 0) {
      result += this.renderSection('interactions', {
        ...baseSectionData,
        interactions: element.interactions
      } as SectionData)
    }

    // Render Events section
    if (element.events) {
      result += this.renderSection('events', {
        ...baseSectionData,
        events: element.events
      } as SectionData)
    }

    // Render Layout section (includes alignment)
    if (layoutCat) {
      const relatedCategories = new Map<string, PropertyCategory>()
      if (alignmentCat) relatedCategories.set('alignment', alignmentCat)

      result += this.renderSection('layout', {
        ...baseSectionData,
        category: layoutCat,
        relatedCategories
      } as SectionData)
    }

    // Render Sizing section
    if (sizingCat) {
      result += this.renderSection('sizing', {
        ...baseSectionData,
        category: sizingCat
      } as SectionData)
    }

    // Render Spacing section
    if (spacingCat) {
      result += this.renderSection('spacing', {
        ...baseSectionData,
        category: spacingCat
      } as SectionData)
    }

    // Render Border section
    if (borderCat) {
      result += this.renderSection('border', {
        ...baseSectionData,
        category: borderCat
      } as SectionData)
    }

    // Render Color section
    result += this.renderSection('color', {
      ...baseSectionData
    } as SectionData)

    // Render Typography section
    if (typographyCat) {
      result += this.renderSection('typography', {
        ...baseSectionData,
        category: typographyCat
      } as SectionData)
    }

    // Render Icon section (only for Icon elements)
    if (iconCat && iconCat.properties.length > 0) {
      result += this.renderSection('icon', {
        ...baseSectionData,
        category: iconCat
      } as SectionData)
    }

    // Render Visual section
    if (visualCat && visualCat.properties.length > 0) {
      result += this.renderSection('visual', {
        ...baseSectionData,
        category: visualCat
      } as SectionData)
    }

    return result
  }

  private renderSection(sectionName: string, data: SectionData): string {
    const entry = this.sections.get(sectionName)
    if (!entry) return ''

    const html = entry.section.render(data)
    if (!html) return ''

    // Check if section should be collapsed (from persisted state)
    const sectionKey = `section-${sectionName}`
    const isCollapsed = !isSectionExpanded(sectionKey)

    return `<div data-section="${sectionName}" class="${isCollapsed ? 'section-collapsed' : ''}">${html}</div>`
  }

  /**
   * Add collapsed class to persisted collapsed sections after rendering
   */
  private applySectionCollapseStates(): void {
    const sections = this.container.querySelectorAll('[data-section]')
    sections.forEach(sectionWrapper => {
      const sectionName = sectionWrapper.getAttribute('data-section')
      if (!sectionName) return

      const sectionKey = `section-${sectionName}`
      const isCollapsed = !isSectionExpanded(sectionKey)

      const sectionEl = sectionWrapper.querySelector('.pp-section')
      if (sectionEl && isCollapsed) {
        sectionEl.classList.add('collapsed')
      }
    })
  }

  // ============================================
  // Event Delegation
  // ============================================

  private setupEventDelegation(): void {
    // Clean up existing delegator
    this.cleanupEventDelegator()

    // Create new delegator
    const delegator = new EventDelegator(this.container)

    try {
      // Register handlers from all sections
      for (const [name, entry] of this.sections) {
        const handlers = entry.section.getHandlers()
        delegator.registerHandlers(handlers)
      }

      // Register section collapse handler for clickable section labels
      delegator.registerHandlers({
        '.pp-section-label': {
          click: (e: Event, target: HTMLElement) => {
            // Only handle if not clicking on the expand button
            const expandBtn = (e.target as HTMLElement).closest('.pp-section-expand-btn')
            if (expandBtn) return

            // Find the section wrapper to get the section name
            const sectionWrapper = target.closest('[data-section]')
            if (sectionWrapper) {
              const sectionName = sectionWrapper.getAttribute('data-section')
              if (sectionName) {
                this.handlePropertyChange('__SECTION_COLLAPSE__', sectionName)
              }
            }
          }
        }
      })

      // Only assign after successful registration
      this.eventDelegator = delegator
    } catch (error) {
      // Clean up on failure to prevent memory leak
      delegator.destroy()
      console.error('[PropertyPanel] Failed to setup event delegation:', error)
      throw error
    }
  }

  private cleanupEventDelegator(): void {
    if (this.eventDelegator) {
      this.eventDelegator.destroy()
      this.eventDelegator = null
    }
  }

  // ============================================
  // Property Change Handling
  // ============================================

  /**
   * Central property change handler - receives signals from all sections
   */
  private handlePropertyChange: PropertyChangeCallback = (property: string, value: string, source?: 'input' | 'token' | 'toggle') => {
    if (!this.currentElement) return

    // Handle special signals from sections
    if (property.startsWith('__')) {
      this.handleSpecialSignal(property, value, source)
      return
    }

    // Handle property removal signal
    if (value === '__REMOVE__') {
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId
      const result = this.codeModifier.removeProperty(nodeId, property)
      this.handleModificationResult(result, property)
      return
    }

    // Regular property update
    if (source === 'input') {
      this.debounce(property, () => {
        this.updateProperty(property, value)
      })
    } else {
      this.updateProperty(property, value)
    }
  }

  /**
   * Safe JSON parse with error handling
   */
  private safeJsonParse<T>(value: string, fallback: T): T {
    try {
      return JSON.parse(value)
    } catch (error) {
      console.error('[PropertyPanel] Failed to parse JSON:', value, error)
      return fallback
    }
  }

  /**
   * Signal handler registry - maps signals to their handlers
   */
  private readonly signalHandlers: Record<string, (value: string, signal: string) => void> = {
    '__LAYOUT__': (v) => this.handleLayoutChange(v),
    '__ALIGNMENT__': (v) => this.handleAlignmentChange(v),
    '__PAD_TOKEN__': (v, s) => {
      const data = this.safeJsonParse<{ value: string; dir: string } | null>(v, null)
      if (data) this.handlePaddingChange(data, true)
    },
    '__PAD_INPUT__': (v) => {
      const data = this.safeJsonParse<{ value: string; dir: string } | null>(v, null)
      if (data) this.handlePaddingChange(data, false)
    },
    '__MARGIN_TOKEN__': (v) => {
      const data = this.safeJsonParse<{ value: string; dir: string } | null>(v, null)
      if (data) this.handleMarginChange(data, true)
    },
    '__MARGIN_INPUT__': (v) => {
      const data = this.safeJsonParse<{ value: string; dir: string } | null>(v, null)
      if (data) this.handleMarginChange(data, false)
    },
    '__BORDER_WIDTH__': (v) => this.handleBorderWidthChange(v),
    '__BORDER_COLOR_PICKER__': (v) => {
      const data = this.safeJsonParse<{ property: string; currentValue: string; borderWidth: string } | null>(v, null)
      if (data) this.handleBorderColorPicker(data)
    },
    '__COLOR_PICKER__': (v) => {
      const data = this.safeJsonParse<{ property: string; currentValue: string } | null>(v, null)
      if (data) this.handleColorPicker(data)
    },
    '__RADIUS_CORNER__': (v) => {
      const data = this.safeJsonParse<{ corner: string; value: string } | null>(v, null)
      if (data) this.handleRadiusCornerChange(data)
    },
    '__TEXT_STYLE__': (v) => this.handleTextStyleToggle(v),
    '__BEHAVIOR_TOGGLE__': (v) => this.handleBehaviorToggle(v),
    '__OVERFLOW__': (v) => this.handleOverflowToggle(v),
    '__VISIBILITY__': (v) => this.handleVisibilityToggle(v),
    '__ICON_FILL__': () => this.handleIconFillToggle(),
    '__INTERACTION__': (v) => this.handleInteractionChange(v),
    '__ADD_EVENT__': () => this.handleAddEvent(),
    '__EDIT_EVENT__': (v) => this.handleEditEvent(parseInt(v, 10) || 0),
    '__DELETE_EVENT__': (v) => this.handleDeleteEvent(parseInt(v, 10) || 0),
    '__SECTION_COLLAPSE__': (v) => this.handleSectionCollapse(v)
  }

  /**
   * Handle section collapse toggle
   */
  private handleSectionCollapse(sectionName: string): void {
    const sectionKey = `section-${sectionName}`
    const isNowCollapsed = toggleSectionExpanded(sectionKey)

    // Find and toggle the section element
    const sectionEl = this.container.querySelector(`[data-section="${sectionName}"] .pp-section`) as HTMLElement
    if (sectionEl) {
      sectionEl.classList.toggle('collapsed', !isNowCollapsed)
    }
  }

  /**
   * Handle special signals from sections
   */
  private handleSpecialSignal(signal: string, value: string, source?: string): void {
    const handler = this.signalHandlers[signal]
    if (handler) {
      handler(value, signal)
    } else {
      console.warn(`[PropertyPanel] Unknown signal: ${signal}`)
    }
  }

  // ============================================
  // Signal Handlers
  // ============================================

  private handleLayoutChange(layout: string): void {
    if (!this.currentElement) return
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    // Get current layout modes
    const layoutProps = this.currentElement.categories.find(c => c.name === 'layout')?.properties || []
    const currentModes = ['horizontal', 'vertical', 'grid', 'stacked', 'hor', 'ver']
      .filter(mode => {
        const prop = layoutProps.find(p => p.name === mode)
        return prop && (prop.value === 'true' || (prop.value === '' && prop.hasValue !== false))
      })

    // Remove current layout mode
    for (const mode of currentModes) {
      this.codeModifier.removeProperty(nodeId, mode)
    }

    // Add new layout mode
    const result = this.codeModifier.addProperty(nodeId, layout, '')
    this.handleModificationResult(result, 'layout')
  }

  private handleAlignmentChange(align: string): void {
    if (!this.currentElement) return
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    // Parse current alignment state
    const layoutCat = this.currentElement.categories.find(c => c.name === 'layout')
    const props = layoutCat?.properties || []

    const isPropertyActive = (name: string): boolean => {
      const prop = props.find(p => p.name === name)
      return !!(prop && (prop.value === 'true' || (prop.value === '' && prop.hasValue !== false)))
    }

    const currentState = parseAlignmentState(isPropertyActive)
    const position = align as AlignPosition
    const changes = getAlignmentChanges(position, currentState)

    // Remove old alignment properties
    for (const prop of changes.remove) {
      this.codeModifier.removeProperty(nodeId, prop)
    }

    // Add new alignment properties
    for (const prop of changes.add) {
      this.codeModifier.addProperty(nodeId, prop, '')
    }

    // Trigger refresh
    this.refresh()
  }

  private handlePaddingChange(data: { value: string; dir: string }, isToken: boolean): void {
    if (!this.currentElement) return
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    // Get current padding value
    const spacingCat = this.currentElement.categories.find(c => c.name === 'spacing')
    const padProp = spacingCat?.properties.find(p => p.name === 'padding' || p.name === 'pad' || p.name === 'p')
    const currentValue = padProp?.value || ''

    // Parse current value
    const parsed = parseSpacingValue(currentValue)

    // Update based on direction
    const newValue = data.value
    if (data.dir === 'h') {
      parsed.r = newValue
      parsed.l = newValue
    } else if (data.dir === 'v') {
      parsed.t = newValue
      parsed.b = newValue
    } else {
      parsed[data.dir as 't' | 'r' | 'b' | 'l'] = newValue
    }

    // Build new value
    const finalValue = buildSpacingValue(parsed.t, parsed.r, parsed.b, parsed.l)

    // Update property
    const result = this.codeModifier.updateProperty(nodeId, 'pad', finalValue)
    this.handleModificationResult(result, 'padding')
  }

  private handleMarginChange(data: { value: string; dir: string }, isToken: boolean): void {
    if (!this.currentElement) return
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    // Similar to padding
    const spacingCat = this.currentElement.categories.find(c => c.name === 'spacing')
    const marginProp = spacingCat?.properties.find(p => p.name === 'margin' || p.name === 'm')
    const currentValue = marginProp?.value || ''

    const parsed = parseSpacingValue(currentValue)
    const newValue = data.value

    if (data.dir === 'h') {
      parsed.r = newValue
      parsed.l = newValue
    } else if (data.dir === 'v') {
      parsed.t = newValue
      parsed.b = newValue
    } else {
      parsed[data.dir as 't' | 'r' | 'b' | 'l'] = newValue
    }

    const finalValue = buildSpacingValue(parsed.t, parsed.r, parsed.b, parsed.l)
    const result = this.codeModifier.updateProperty(nodeId, 'margin', finalValue)
    this.handleModificationResult(result, 'margin')
  }

  private handleBorderWidthChange(width: string): void {
    if (!this.currentElement) return
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    // Get current border color
    const borderCat = this.currentElement.categories.find(c => c.name === 'border')
    const borderProp = borderCat?.properties.find(p => p.name === 'border' || p.name === 'bor')
    const currentValue = borderProp?.value || ''
    const parts = currentValue.split(/\s+/).filter(Boolean)
    const color = parts.find(p => p.startsWith('#') || p.startsWith('$')) || ''

    // Build new value
    const newValue = color ? `${width} ${color}` : width
    const result = this.codeModifier.updateProperty(nodeId, 'bor', newValue)
    this.handleModificationResult(result, 'border')
  }

  private handleBorderColorPicker(data: { property: string; currentValue: string; borderWidth: string }): void {
    if (!this.currentElement) return
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    // Find the trigger element to position the picker
    const trigger = this.container.querySelector(`[data-border-color-prop]`) as HTMLElement
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const x = rect.left
    const y = rect.bottom + 4

    showColorPickerForProperty(x, y, 'boc', data.currentValue, (color: string) => {
      // Build the full border value with width and color
      const newValue = data.borderWidth ? `${data.borderWidth} ${color}` : color
      const result = this.codeModifier.updateProperty(nodeId, 'bor', newValue)
      this.handleModificationResult(result, 'border color')
    })
  }

  private handleColorPicker(data: { property: string; currentValue: string }): void {
    if (!this.currentElement) return
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    // Find the trigger element to position the picker
    const trigger = this.container.querySelector(`[data-color-prop="${data.property}"]`) as HTMLElement
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const x = rect.left
    const y = rect.bottom + 4

    showColorPickerForProperty(x, y, data.property, data.currentValue, (color: string) => {
      const result = this.codeModifier.updateProperty(nodeId, data.property, color)
      this.handleModificationResult(result, data.property)
    })
  }

  private handleRadiusCornerChange(data: { corner: string; value: string }): void {
    if (!this.currentElement) return

    // Validate corner value
    const validCorners = ['tl', 'tr', 'br', 'bl'] as const
    if (!validCorners.includes(data.corner as typeof validCorners[number])) {
      console.warn(`[PropertyPanel] Invalid radius corner: "${data.corner}". Expected: tl, tr, br, bl`)
      return
    }

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    // Get current radius values
    const borderCat = this.currentElement.categories.find(c => c.name === 'border')
    const radProp = borderCat?.properties.find(p => p.name === 'radius' || p.name === 'rad')
    const currentValue = radProp?.value || ''

    // Parse current radius (supports 1, 2, 3, or 4 values)
    const parts = currentValue.split(/\s+/).filter(Boolean)
    let tl = '', tr = '', br = '', bl = ''

    if (parts.length === 1) {
      tl = tr = br = bl = parts[0]
    } else if (parts.length === 2) {
      tl = br = parts[0]
      tr = bl = parts[1]
    } else if (parts.length === 3) {
      tl = parts[0]
      tr = bl = parts[1]
      br = parts[2]
    } else if (parts.length === 4) {
      tl = parts[0]
      tr = parts[1]
      br = parts[2]
      bl = parts[3]
    }

    // Update the specified corner (type-safe after validation)
    const newValue = data.value || '0'
    switch (data.corner as typeof validCorners[number]) {
      case 'tl': tl = newValue; break
      case 'tr': tr = newValue; break
      case 'br': br = newValue; break
      case 'bl': bl = newValue; break
    }

    // Build new radius value (simplify if possible)
    let finalValue: string
    if (tl === tr && tr === br && br === bl) {
      finalValue = tl
    } else if (tl === br && tr === bl) {
      finalValue = `${tl} ${tr}`
    } else {
      finalValue = `${tl} ${tr} ${br} ${bl}`
    }

    const result = this.codeModifier.updateProperty(nodeId, 'rad', finalValue)
    this.handleModificationResult(result, 'radius')
  }

  /**
   * Generic toggle for boolean properties (add/remove based on current state)
   */
  private toggleBooleanProperty(propName: string, categoryName: string): void {
    if (!this.currentElement) return
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    const category = this.currentElement.categories.find(c => c.name === categoryName)
    const prop = category?.properties.find(p => p.name === propName)
    const isActive = prop && (prop.value === 'true' || (prop.value === '' && prop.hasValue !== false))

    if (isActive) {
      const result = this.codeModifier.removeProperty(nodeId, propName)
      this.handleModificationResult(result, propName)
    } else {
      const result = this.codeModifier.addProperty(nodeId, propName, '')
      this.handleModificationResult(result, propName)
    }
  }

  private handleTextStyleToggle(style: string): void {
    this.toggleBooleanProperty(style, 'typography')
  }

  private handleBehaviorToggle(propName: string): void {
    this.toggleBooleanProperty(propName, 'behavior')
  }

  private handleOverflowToggle(value: string): void {
    this.toggleBooleanProperty(value, 'visual')
  }

  private handleVisibilityToggle(value: string): void {
    this.toggleBooleanProperty(value, 'visual')
  }

  private handleIconFillToggle(): void {
    this.toggleBooleanProperty('fill', 'icon')
  }

  private handleInteractionChange(interaction: string): void {
    if (!this.currentElement) return
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    // Get current interactions
    const currentInteractions = this.currentElement.interactions || []
    const hasInteraction = currentInteractions.some(i => i.name === interaction)

    // All interaction types to potentially remove
    const interactionTypes = ['toggle', 'exclusive', 'select']

    if (hasInteraction) {
      // Toggle off - remove the interaction
      this.codeModifier.removeProperty(nodeId, `${interaction}()`)
    } else {
      // Toggle on - remove other interactions first, then add new one
      for (const type of interactionTypes) {
        if (currentInteractions.some(i => i.name === type)) {
          this.codeModifier.removeProperty(nodeId, `${type}()`)
        }
      }
      // Add the new interaction
      this.codeModifier.addProperty(nodeId, `${interaction}()`, '')
    }

    this.refresh()
  }

  private handleAddEvent(): void {
    if (!this.currentElement) return

    // Emit event for external handling (e.g., a future EventDialog)
    // For now, add a basic onclick handler as placeholder
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.addEvent(nodeId, 'onclick', '')
    this.handleModificationResult(result, 'event')
  }

  private handleEditEvent(index: number): void {
    if (!this.currentElement) return

    // Get the event to edit
    const event = this.currentElement.events?.[index]
    if (!event) return

    // TODO: Implement EventDialog for editing events
    // Currently no dialog exists - feature placeholder
    console.debug('[PropertyPanel] Edit event requested:', {
      nodeId: this.currentElement.nodeId,
      eventName: event.name,
      eventKey: event.key,
      eventIndex: index
    })
  }

  private handleDeleteEvent(index: number): void {
    if (!this.currentElement) return
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    const event = this.currentElement.events?.[index]
    if (event) {
      const result = this.codeModifier.removeEvent(nodeId, event.name, event.key)
      this.handleModificationResult(result, `event ${event.name}`)
    }
  }

  // ============================================
  // Property Updates
  // ============================================

  private updateProperty(propName: string, value: string): void {
    if (!this.currentElement) return
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    const result = this.codeModifier.updateProperty(nodeId, propName, value)
    this.handleModificationResult(result, propName)
  }

  private handleModificationResult(result: ModificationResult, context?: string): void {
    if (!result.success) {
      this.showErrorFeedback(result.error || 'Unknown error', context)
      return
    }
    this.showSuccessFeedback()
    this.onCodeChange(result)
  }

  private showSuccessFeedback(): void {
    const activeElement = document.activeElement
    if (activeElement && this.container.contains(activeElement)) {
      activeElement.classList.add('success')
      setTimeout(() => activeElement.classList.remove('success'), 400)
    }
  }

  private showErrorFeedback(error: string, context?: string): void {
    const message = context
      ? `Failed to update ${context}: ${error}`
      : `Property update failed: ${error}`

    console.warn(`[PropertyPanel] ${message}`)

    const status = document.getElementById('status')
    if (status) {
      const originalText = status.textContent
      const originalClass = status.className
      status.textContent = message
      status.className = 'status error'

      setTimeout(() => {
        status.textContent = originalText || 'Ready'
        status.className = originalClass || 'status ok'
      }, 3000)
    }
  }

  // ============================================
  // Token Management
  // ============================================

  private getSpacingTokens(): SpacingToken[] {
    if (!this.options.getAllSource) return []

    const source = this.options.getAllSource()
    const hash = this.hashString(source)

    if (hash === this.cachedSourceHash && this.cachedSpacingTokens.size > 0) {
      return Array.from(this.cachedSpacingTokens.values()).flat()
    }

    // Extract tokens from source
    const tokens: SpacingToken[] = []
    const tokenRegex = /^\$(\w+)\.(\w+):\s*(.+)$/gm
    let match

    while ((match = tokenRegex.exec(source)) !== null) {
      const [, name, suffix, value] = match
      tokens.push({
        name,
        fullName: `${name}.${suffix}`,
        value: value.trim()
      })
    }

    this.cachedSourceHash = hash
    this.cachedSpacingTokens.set('all', tokens)

    return tokens
  }

  private getColorTokens(): ColorToken[] {
    if (this.cachedColorTokens) return this.cachedColorTokens

    if (!this.options.getAllSource) return []

    const source = this.options.getAllSource()
    const tokens: ColorToken[] = []
    const tokenRegex = /^\$(\w+)\.(bg|col|c):\s*(#[0-9A-Fa-f]{3,8}|\$\w+)$/gm
    let match

    while ((match = tokenRegex.exec(source)) !== null) {
      const [, name, , value] = match
      tokens.push({ name, value: value.trim() })
    }

    this.cachedColorTokens = tokens
    return tokens
  }

  /**
   * Get spacing tokens filtered by suffix (pad, margin, gap, rad, etc.)
   */
  private getSpacingTokensBySuffix(suffix: string): SpacingToken[] {
    const allTokens = this.getSpacingTokens()
    return allTokens.filter(t => t.fullName.endsWith(`.${suffix}`))
  }

  private invalidateTokenCache(): void {
    this.cachedSpacingTokens.clear()
    this.cachedColorTokens = null
    this.cachedSourceHash = ''
  }

  // ============================================
  // Utilities
  // ============================================

  private debounce(key: string, fn: () => void): void {
    const existing = this.debounceTimers.get(key)
    if (existing) {
      window.clearTimeout(existing)
    }

    const timer = window.setTimeout(() => {
      this.debounceTimers.delete(key)
      fn()
    }, this.options.debounceTime)

    this.debounceTimers.set(key, timer)
  }

  private clearDebounceTimers(): void {
    for (const timer of this.debounceTimers.values()) {
      window.clearTimeout(timer)
    }
    this.debounceTimers.clear()
  }

  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(36)
  }

  /**
   * Show properties for a component definition
   * @returns true if component found and rendered, false otherwise
   */
  showComponentDefinition(componentName: string): boolean {
    // Get properties for the component definition
    const element = this.propertyExtractor.getPropertiesForComponentDefinition(componentName)
    if (!element) {
      return false
    }

    this.currentElement = element
    this.renderElement(element)
    return true
  }
}

/**
 * Factory function to create a PropertyPanel
 */
export function createPropertyPanel(
  container: HTMLElement,
  selectionManager: SelectionProvider,
  propertyExtractor: PropertyExtractor,
  codeModifier: CodeModifier,
  onCodeChange: OnCodeChangeCallback,
  options?: PropertyPanelOptions
): PropertyPanel {
  return new PropertyPanel(
    container,
    selectionManager,
    propertyExtractor,
    codeModifier,
    onCodeChange,
    options
  )
}

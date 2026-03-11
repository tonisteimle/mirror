/**
 * PropertyPanel V2 - Modular property panel implementation
 *
 * This is a refactored version of the PropertyPanel using the modular architecture.
 * It uses the TokenService, AutocompleteManager, and specialized renderers.
 */

import type { SelectionManager, BreadcrumbItem } from '../selection-manager'
import type { PropertyExtractor, ExtractedElement, PropertyCategory } from '../property-extractor'
import type { CodeModifier, ModificationResult, FilesAccess } from '../code-modifier'
import type { SourceMap } from '../source-map'
import type {
  PropertyPanelOptions,
  RequiredPropertyPanelOptions,
  RenderContext,
  EventHandlers,
  ITokenService
} from './interfaces'
import { TokenService } from './services/token-service'
import { AutocompleteManager } from './services/autocomplete-manager'
import { PropertyValueService } from './services/property-value-service'
import { LayoutRenderer } from './renderers/layout-renderer'
import { SizingRenderer } from './renderers/sizing-renderer'
import { SpacingRenderer } from './renderers/spacing-renderer'
import { BorderRenderer } from './renderers/border-renderer'
import { ColorRenderer } from './renderers/color-renderer'
import { TypographyRenderer } from './renderers/typography-renderer'
import { escapeHtml } from './utils/html-utils'

/**
 * Callback when code changes
 */
export type OnCodeChangeCallback = (result: ModificationResult) => void

/**
 * PropertyPanelV2 - Modular property panel
 *
 * Uses specialized renderers for each property category and centralized services.
 */
export class PropertyPanelV2 {
  private container: HTMLElement
  private selectionManager: SelectionManager
  private propertyExtractor: PropertyExtractor
  private codeModifier: CodeModifier
  private sourceMap: SourceMap
  private onCodeChange: OnCodeChangeCallback

  private options: RequiredPropertyPanelOptions
  private unsubscribeSelection: (() => void) | null = null
  private unsubscribeBreadcrumb: (() => void) | null = null
  private currentElement: ExtractedElement | null = null
  private currentBreadcrumb: BreadcrumbItem[] = []
  private debounceTimers: Map<string, number> = new Map()

  // Services
  private tokenService: ITokenService
  private autocompleteManager: AutocompleteManager
  private propertyValueService: PropertyValueService

  // Renderers
  private layoutRenderer: LayoutRenderer
  private sizingRenderer: SizingRenderer
  private spacingRenderer: SpacingRenderer
  private borderRenderer: BorderRenderer
  private colorRenderer: ColorRenderer
  private typographyRenderer: TypographyRenderer

  // Event handlers shared across renderers
  private eventHandlers: EventHandlers

  constructor(
    container: HTMLElement,
    selectionManager: SelectionManager,
    propertyExtractor: PropertyExtractor,
    codeModifier: CodeModifier,
    sourceMap: SourceMap,
    onCodeChange: OnCodeChangeCallback,
    options: PropertyPanelOptions = {}
  ) {
    this.container = container
    this.selectionManager = selectionManager
    this.propertyExtractor = propertyExtractor
    this.codeModifier = codeModifier
    this.sourceMap = sourceMap
    this.onCodeChange = onCodeChange

    this.options = {
      debounceTime: options.debounceTime ?? 300,
      showSourceIndicators: options.showSourceIndicators ?? true,
      getAllSource: options.getAllSource,
      filesAccess: options.filesAccess,
    }

    // Source getter for services
    const getSource = () => this.options.getAllSource
      ? this.options.getAllSource()
      : this.codeModifier.getSource()

    // Initialize services
    this.tokenService = new TokenService(getSource)

    this.propertyValueService = new PropertyValueService(
      this.codeModifier,
      this.sourceMap,
      getSource
    )

    this.autocompleteManager = new AutocompleteManager(this.tokenService)
    this.autocompleteManager.setOnSelect((tokenName, input) => {
      const propName = input.dataset.prop
      if (propName && this.currentElement) {
        this.updateProperty(propName, tokenName)
      }
    })

    // Create event handlers
    this.eventHandlers = {
      onPropertyChange: (nodeId, prop, value) => this.handlePropertyChange(nodeId, prop, value),
      onPropertyRemove: (nodeId, prop) => this.handlePropertyRemove(nodeId, prop),
      onAlignmentChange: (nodeId, newProps) => this.handleAlignmentChange(nodeId, newProps),
      onLayoutChange: (nodeId, layout) => this.handleLayoutChange(nodeId, layout),
      onError: (error, context) => console.error(`PropertyPanel error in ${context}:`, error)
    }

    // Initialize renderers with property value service
    this.layoutRenderer = new LayoutRenderer(this.tokenService, this.eventHandlers, this.propertyValueService)
    this.sizingRenderer = new SizingRenderer(this.tokenService, this.eventHandlers, this.propertyValueService)
    this.spacingRenderer = new SpacingRenderer(this.tokenService, this.eventHandlers, this.propertyValueService)
    this.borderRenderer = new BorderRenderer(this.tokenService, this.eventHandlers, this.propertyValueService)
    this.colorRenderer = new ColorRenderer(this.tokenService, this.eventHandlers, this.propertyValueService)
    this.typographyRenderer = new TypographyRenderer(this.tokenService, this.eventHandlers, this.propertyValueService)

    this.attach()
  }

  /**
   * Attach to selection manager
   */
  attach(): void {
    this.unsubscribeSelection = this.selectionManager.subscribe((nodeId) => {
      this.updatePanel(nodeId)
    })

    this.unsubscribeBreadcrumb = this.selectionManager.subscribeBreadcrumb((chain) => {
      this.currentBreadcrumb = chain
      if (this.currentElement) {
        this.render(this.currentElement)
      }
    })

    const currentSelection = this.selectionManager.getSelection()
    if (currentSelection) {
      this.updatePanel(currentSelection)
    } else {
      this.renderEmpty()
    }
  }

  /**
   * Detach from selection manager
   */
  detach(): void {
    if (this.unsubscribeSelection) {
      this.unsubscribeSelection()
      this.unsubscribeSelection = null
    }
    if (this.unsubscribeBreadcrumb) {
      this.unsubscribeBreadcrumb()
      this.unsubscribeBreadcrumb = null
    }
    this.clearDebounceTimers()
    this.autocompleteManager.hide()
  }

  /**
   * Update panel for a node
   */
  private updatePanel(nodeId: string | null): void {
    const selectionChanged = nodeId !== this.currentElement?.nodeId
    if (selectionChanged) {
      this.clearDebounceTimers()
    }

    if (!nodeId) {
      this.renderEmpty()
      this.currentElement = null
      return
    }

    const element = this.propertyExtractor.getProperties(nodeId)
    if (!element) {
      this.renderNotFound(nodeId)
      this.currentElement = null
      return
    }

    this.currentElement = element
    this.render(element)
  }

  /**
   * Render empty state
   */
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

  /**
   * Render not found state
   */
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

  /**
   * Render the property panel
   */
  private render(element: ExtractedElement): void {
    const title = element.instanceName || element.componentName
    const badge = element.isDefinition ? 'Definition' : ''

    const hasInlineProperties = element.allProperties.some(p => p.source === 'instance')
    const showDefineBtn = !element.isDefinition && hasInlineProperties && this.options.filesAccess

    this.container.innerHTML = `
      ${this.renderBreadcrumb()}
      <div class="pp-header">
        <span class="pp-title">${escapeHtml(title)}</span>
        ${badge ? `<span class="pp-badge">${badge}</span>` : ''}
        <div class="pp-header-actions">
          ${showDefineBtn ? `
            <button class="pp-define-btn" title="Als Komponente definieren" aria-label="Define as component">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </button>
          ` : ''}
          <button class="pp-close" title="Clear selection" aria-label="Clear selection">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      ${element.isTemplateInstance ? `
        <div class="pp-template-notice" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>Template instance - changes apply to all items</span>
        </div>
      ` : ''}
      <div class="pp-content">
        ${this.renderCategories(element)}
      </div>
    `

    this.attachEventListeners(element)
  }

  /**
   * Render breadcrumb navigation
   */
  private renderBreadcrumb(): string {
    if (this.currentBreadcrumb.length === 0) {
      return ''
    }

    const crumbs = this.currentBreadcrumb.map((item, index) => {
      const isLast = index === this.currentBreadcrumb.length - 1
      return `
        <span class="pp-crumb${isLast ? ' active' : ''}"
              data-node-id="${escapeHtml(item.nodeId)}"
              ${!isLast ? 'tabindex="0" role="link"' : ''}
              aria-current="${isLast ? 'location' : 'false'}">
          ${escapeHtml(item.name)}
        </span>
        ${!isLast ? '<span class="pp-crumb-sep" aria-hidden="true">›</span>' : ''}
      `
    }).join('')

    return `<nav class="pp-breadcrumb" aria-label="Element hierarchy">${crumbs}</nav>`
  }

  /**
   * Render property categories using specialized renderers
   */
  private renderCategories(element: ExtractedElement): string {
    const categories = element.categories
    if (categories.length === 0) {
      return `<div class="pp-empty"><p>No properties</p></div>`
    }

    const context = this.createRenderContext(element)

    // Find categories
    const layoutCat = categories.find(c => c.name === 'layout')
    const alignmentCat = categories.find(c => c.name === 'alignment')
    const sizingCat = categories.find(c => c.name === 'sizing')
    const spacingCat = categories.find(c => c.name === 'spacing')
    const borderCat = categories.find(c => c.name === 'border')
    const typographyCat = categories.find(c => c.name === 'typography')

    let result = ''

    // Render using specialized renderers
    if (layoutCat) {
      result += this.layoutRenderer.render(layoutCat, context, alignmentCat)
    }

    if (sizingCat) {
      result += this.sizingRenderer.render(sizingCat, context)
    }

    if (spacingCat) {
      result += this.spacingRenderer.render(spacingCat, context)
    }

    if (borderCat) {
      result += this.borderRenderer.render(borderCat, context)
    }

    // Color renderer doesn't use a category directly
    result += this.colorRenderer.render(null, context)

    if (typographyCat) {
      result += this.typographyRenderer.render(typographyCat, context)
    }

    return result
  }

  /**
   * Create render context
   */
  private createRenderContext(element: ExtractedElement): RenderContext {
    return {
      element,
      currentBreadcrumb: this.currentBreadcrumb,
      nodeId: element.templateId || element.nodeId
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(element: ExtractedElement): void {
    const context = this.createRenderContext(element)

    // Close button
    const closeBtn = this.container.querySelector('.pp-close')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.selectionManager.clearSelection()
      })
    }

    // Breadcrumb clicks
    const breadcrumbs = this.container.querySelectorAll('.pp-crumb[data-node-id]')
    breadcrumbs.forEach(crumb => {
      crumb.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const nodeId = target.dataset.nodeId
        if (nodeId && !target.classList.contains('active')) {
          this.selectionManager.select(nodeId)
        }
      })
    })

    // Text inputs with token autocomplete
    const textInputs = this.container.querySelectorAll('input[type="text"]')
    textInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement
        if (target.value === '$' || target.value.startsWith('$')) {
          const propName = target.dataset.prop || target.dataset.padDir || 'unknown'
          this.autocompleteManager.show(target, propName)
        } else {
          this.autocompleteManager.hide()
        }
      })
      input.addEventListener('blur', () => {
        setTimeout(() => {
          this.autocompleteManager.hide()
        }, 150)
      })
    })

    // Attach renderer-specific event listeners
    this.layoutRenderer.attachEventListeners(this.container, context)
    this.sizingRenderer.attachEventListeners(this.container, context)
    this.spacingRenderer.attachEventListeners(this.container, context)
    this.borderRenderer.attachEventListeners(this.container, context)
    this.colorRenderer.attachEventListeners(this.container, context)
    this.typographyRenderer.attachEventListeners(this.container, context)
  }

  /**
   * Handle property change from renderers
   */
  private handlePropertyChange(nodeId: string, prop: string, value: string): void {
    try {
      const result = this.codeModifier.updateProperty(nodeId, prop, value)
      this.onCodeChange(result)
    } catch (error) {
      console.error('Error updating property:', error)
    }
  }

  /**
   * Handle property removal from renderers
   */
  private handlePropertyRemove(nodeId: string, prop: string): void {
    try {
      const result = this.codeModifier.removeProperty(nodeId, prop)
      this.onCodeChange(result)
    } catch (error) {
      console.error('Error removing property:', error)
    }
  }

  /**
   * Handle alignment change from layout renderer
   */
  private handleAlignmentChange(nodeId: string, newProps: string[]): void {
    try {
      // Remove all alignment properties first
      const alignProps = ['center', 'top', 'bottom', 'left', 'right', 'ver-center', 'hor-center']
      for (const prop of alignProps) {
        this.codeModifier.removeProperty(nodeId, prop)
      }
      // Add new alignment properties
      for (const prop of newProps) {
        const result = this.codeModifier.updateProperty(nodeId, prop, '')
        this.onCodeChange(result)
      }
    } catch (error) {
      console.error('Error updating alignment:', error)
    }
  }

  /**
   * Handle layout change from layout renderer
   */
  private handleLayoutChange(nodeId: string, layout: string): void {
    try {
      // Remove all layout properties first
      const layoutProps = ['vertical', 'ver', 'horizontal', 'hor', 'grid', 'stacked']
      for (const prop of layoutProps) {
        this.codeModifier.removeProperty(nodeId, prop)
      }
      // Add new layout property
      const result = this.codeModifier.updateProperty(nodeId, layout, '')
      this.onCodeChange(result)
    } catch (error) {
      console.error('Error updating layout:', error)
    }
  }

  /**
   * Update property with debouncing
   */
  private updateProperty(prop: string, value: string): void {
    if (!this.currentElement) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const key = `${nodeId}:${prop}`

    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key)
    if (existingTimer) {
      window.clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = window.setTimeout(() => {
      this.handlePropertyChange(nodeId, prop, value)
      this.debounceTimers.delete(key)
    }, this.options.debounceTime)

    this.debounceTimers.set(key, timer)
  }

  /**
   * Clear all debounce timers
   */
  private clearDebounceTimers(): void {
    for (const timer of this.debounceTimers.values()) {
      window.clearTimeout(timer)
    }
    this.debounceTimers.clear()
  }

  /**
   * Refresh the panel
   */
  refresh(): void {
    // Capture focus state before re-render
    const activeElement = document.activeElement as HTMLInputElement | null
    const isOurInput = activeElement && this.container.contains(activeElement)
    const focusedProp = isOurInput ? activeElement?.dataset?.prop : null
    const focusedPadDir = isOurInput ? activeElement?.dataset?.padDir : null
    const cursorPosition = isOurInput ? activeElement?.selectionStart : null

    // Invalidate token cache
    this.tokenService.invalidateCache()

    const nodeId = this.selectionManager.getSelection()
    this.updatePanel(nodeId)

    // Restore focus after re-render
    if (focusedProp || focusedPadDir) {
      requestAnimationFrame(() => {
        let inputToFocus: HTMLInputElement | null = null

        if (focusedPadDir) {
          inputToFocus = this.container.querySelector(
            `input[data-pad-dir="${focusedPadDir}"]`
          ) as HTMLInputElement
        } else if (focusedProp) {
          inputToFocus = this.container.querySelector(
            `input[data-prop="${focusedProp}"]`
          ) as HTMLInputElement
        }

        if (inputToFocus) {
          inputToFocus.focus()
          if (cursorPosition !== null && cursorPosition !== undefined) {
            inputToFocus.setSelectionRange(cursorPosition, cursorPosition)
          }
        }
      })
    }
  }

  /**
   * Update dependencies
   */
  updateDependencies(
    propertyExtractor: PropertyExtractor,
    codeModifier: CodeModifier,
    sourceMap: SourceMap
  ): void {
    this.propertyExtractor = propertyExtractor
    this.codeModifier = codeModifier
    this.sourceMap = sourceMap
    this.propertyValueService.updateCodeModifier(codeModifier)
    this.propertyValueService.updateSourceMap(sourceMap)
    this.refresh()
  }

  /**
   * Dispose the panel
   */
  dispose(): void {
    this.detach()
    this.container.innerHTML = ''
  }
}

/**
 * Create a PropertyPanelV2
 */
export function createPropertyPanelV2(
  container: HTMLElement,
  selectionManager: SelectionManager,
  propertyExtractor: PropertyExtractor,
  codeModifier: CodeModifier,
  sourceMap: SourceMap,
  onCodeChange: OnCodeChangeCallback,
  options?: PropertyPanelOptions
): PropertyPanelV2 {
  return new PropertyPanelV2(
    container,
    selectionManager,
    propertyExtractor,
    codeModifier,
    sourceMap,
    onCodeChange,
    options
  )
}

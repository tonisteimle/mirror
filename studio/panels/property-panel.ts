/**
 * PropertyPanel - Dynamic property panel UI
 *
 * Renders properties for the selected element and handles user input
 * to update the source code.
 */

import type { BreadcrumbItem } from '../../compiler/studio/selection-manager'
import type { PropertyExtractor, ExtractedElement, ExtractedProperty, PropertyCategory } from '../../compiler/studio/property-extractor'
import type { CodeModifier, ModificationResult, FilesAccess } from '../../compiler/studio/code-modifier'
import { PROPERTY_ICONS, LAYOUT_ICONS, getLayoutIcon } from '../icons'

// Alias for backwards compatibility
const PROPERTY_ICON_PATHS = PROPERTY_ICONS
import { isAbsoluteLayoutContainer } from '../../compiler/studio/utils/layout-detection'
import { state, events } from '../core'
import TomSelect from 'tom-select'

/**
 * Interface for selection providers (both SelectionManager and StateSelectionAdapter implement this)
 */
export interface SelectionProvider {
  subscribe(listener: (nodeId: string | null, previousNodeId: string | null) => void): () => void
  subscribeBreadcrumb(listener: (chain: BreadcrumbItem[]) => void): () => void
  getSelection(): string | null
  clearSelection(): void
  select(nodeId: string | null): void
}

/**
 * Token info extracted from source
 */
interface SpacingToken {
  name: string    // e.g., "sm", "md", "lg"
  fullName: string // e.g., "sm.pad", "md.rad"
  value: string   // e.g., "4", "8"
}

// Backwards compatibility alias
type PaddingToken = SpacingToken

/**
 * Callback when code changes
 */
export type OnCodeChangeCallback = (result: ModificationResult) => void

/**
 * Callback to get all project source in processing order (data -> tokens -> components -> layouts)
 */
export type GetAllSourceCallback = () => string

/**
 * PropertyPanel options
 */
export interface PropertyPanelOptions {
  /** Debounce time for input changes (ms) */
  debounceTime?: number
  /** Show source indicators (instance/component/inherited) */
  showSourceIndicators?: boolean
  /** Callback to get all project source for token extraction */
  getAllSource?: GetAllSourceCallback
  /** Access to multiple files for cross-file operations */
  filesAccess?: FilesAccess
}

/**
 * PropertyPanel class
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

  // Token caching for performance
  private cachedSpacingTokens: Map<string, SpacingToken[]> = new Map()
  private cachedColorTokens: Array<{ name: string; value: string }> | null = null
  private cachedSourceHash: string = ''

  // AbortController for autocomplete event cleanup
  private autocompleteAbortController: AbortController | null = null

  // Tom Select instances for dropdowns
  private tomSelectInstances: TomSelect[] = []

  // Event subscription cleanup
  private unsubscribeSelectionInvalidated: (() => void) | null = null
  private unsubscribeCompileCompleted: (() => void) | null = null
  private unsubscribeDefinitionSelected: (() => void) | null = null

  // Pending update during compile
  private pendingUpdateNodeId: string | null = null

  // Active dropdown close handlers for cleanup
  private activeDropdownCloseHandlers: Set<(e: MouseEvent) => void> = new Set()

  // Validation patterns for different property types
  private static readonly VALIDATION_RULES: Record<string, {
    pattern: RegExp
    allowEmpty: boolean
    message: string
  }> = {
    // Numeric properties (gap, padding, margin, radius, border width, x, y, z, etc.)
    numeric: {
      pattern: /^(\$[\w.-]+|\d+(\.\d+)?|)$/,
      allowEmpty: true,
      message: 'Nur Zahlen oder $token erlaubt'
    },
    // Size properties (width, height) - can also be "full", "hug"
    size: {
      pattern: /^(\$[\w.-]+|\d+(\.\d+)?|full|hug|auto|)$/i,
      allowEmpty: true,
      message: 'Nur Zahlen, full, hug oder $token erlaubt'
    },
    // Color properties - hex colors or tokens
    color: {
      pattern: /^(\$[\w.-]+|#[0-9A-Fa-f]{3,8}|transparent|)$/,
      allowEmpty: true,
      message: 'Nur #hex oder $token erlaubt'
    },
    // Opacity (0-1 or 0-100)
    opacity: {
      pattern: /^(\$[\w.-]+|\d+(\.\d+)?|)$/,
      allowEmpty: true,
      message: 'Nur 0-1 oder 0-100 erlaubt'
    }
  }

  // Map property names to validation types
  private static readonly PROPERTY_VALIDATION_TYPE: Record<string, string> = {
    // Numeric
    gap: 'numeric', g: 'numeric',
    x: 'numeric', y: 'numeric', z: 'numeric',
    rotate: 'numeric', rot: 'numeric',
    scale: 'numeric',
    'font-size': 'numeric', fs: 'numeric',
    line: 'numeric',
    blur: 'numeric',
    'backdrop-blur': 'numeric', 'blur-bg': 'numeric',
    // Size
    width: 'numeric', w: 'numeric',
    height: 'numeric', h: 'numeric',
    'min-width': 'numeric', minw: 'numeric',
    'max-width': 'numeric', maxw: 'numeric',
    'min-height': 'numeric', minh: 'numeric',
    'max-height': 'numeric', maxh: 'numeric',
    // Padding/margin - handled by pad handler
    padding: 'numeric', pad: 'numeric', p: 'numeric',
    margin: 'numeric', m: 'numeric',
    // Border/radius
    radius: 'numeric', rad: 'numeric',
    border: 'numeric', bor: 'numeric',
    // Colors
    background: 'color', bg: 'color',
    color: 'color', col: 'color', c: 'color',
    'border-color': 'color', boc: 'color',
    // Opacity
    opacity: 'opacity', o: 'opacity', opa: 'opacity'
  }

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
      debounceTime: options.debounceTime ?? 300,
      showSourceIndicators: options.showSourceIndicators ?? true,
      getAllSource: options.getAllSource,
      filesAccess: options.filesAccess,
    }

    this.attach()
  }

  /**
   * Attach to selection manager
   */
  attach(): void {
    this.unsubscribeSelection = this.selectionManager.subscribe((nodeId) => {
      this.updatePanel(nodeId)
    })

    // Listen for selection invalidation (node removed during compile)
    this.unsubscribeSelectionInvalidated = events.on('selection:invalidated', ({ nodeId }) => {
      if (this.currentElement?.nodeId === nodeId) {
        this.renderNotFound(nodeId)
        this.currentElement = null
      }
    })

    // Listen for compile completion to process pending updates
    this.unsubscribeCompileCompleted = events.on('compile:completed', () => {
      if (this.pendingUpdateNodeId !== null) {
        const nodeId = this.pendingUpdateNodeId
        this.pendingUpdateNodeId = null
        this.updatePanel(nodeId)
      }
    })

    // Listen for definition:selected (for .com files where cursor is on a component definition)
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
   * Detach from selection manager
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
    this.clearDebounceTimers()
    this.invalidateTokenCache()
    this.pendingUpdateNodeId = null

    // Clean up any active dropdown close handlers to prevent memory leaks
    this.cleanupDropdownHandlers()
  }

  /**
   * Clean up all active dropdown close handlers
   */
  private cleanupDropdownHandlers(): void {
    for (const handler of this.activeDropdownCloseHandlers) {
      document.removeEventListener('click', handler)
    }
    this.activeDropdownCloseHandlers.clear()

    // Also remove any open dropdowns
    const dropdowns = this.container.querySelectorAll('.pp-pad-dropdown-menu')
    dropdowns.forEach(d => d.remove())
  }

  /**
   * Clear token cache (memory management)
   */
  private invalidateTokenCache(): void {
    this.cachedSpacingTokens.clear()
    this.cachedColorTokens = null
    this.cachedSourceHash = ''
  }

  /**
   * Update panel for a node
   */
  private updatePanel(nodeId: string | null): void {
    // Defer update if compile is in progress to prevent showing stale data
    if (state.get().compiling) {
      this.pendingUpdateNodeId = nodeId
      return
    }

    // Clear debounce timers when selection changes to prevent stale updates
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
      // Element was selected but not found in AST (may have been deleted)
      this.renderNotFound(nodeId)
      this.currentElement = null
      return
    }

    this.currentElement = element
    this.render(element)
  }

  /**
   * Show properties for a component definition
   * Used when clicking on a component definition line in the editor
   */
  showComponentDefinition(componentName: string): boolean {
    const element = this.propertyExtractor.getPropertiesForComponentDefinition(componentName)
    if (!element) {
      return false
    }

    this.currentElement = element
    this.render(element)
    return true
  }

  /**
   * Render empty state (no selection)
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
   * Render not found state (selection exists but element not in AST)
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
   * Check if the current element is inside a positioned container (pos/stacked)
   * This determines whether x/y position inputs should be shown
   */
  private isInPositionedContainer(): boolean {
    if (!this.currentElement) return false

    const nodeId = this.currentElement.nodeId

    // Search in the preview container, not the whole document
    const previewContainer = document.getElementById('preview')
    const element = previewContainer?.querySelector(`[data-mirror-id="${nodeId}"]`)
    if (!element) return false

    const parent = element.parentElement
    if (!parent) return false

    // Check if parent is a positioned container
    return isAbsoluteLayoutContainer(parent)
  }

  /**
   * Render the property panel
   */
  private render(element: ExtractedElement): void {
    // Guard: Check if the selection has changed since updatePanel was called
    // This prevents race conditions where multiple selection changes are in flight
    const currentSelection = this.selectionManager.getSelection()
    if (currentSelection && element.nodeId !== currentSelection) {
      // Selection changed while we were processing - skip this stale render
      return
    }

    const title = element.instanceName || element.componentName
    const badge = element.isDefinition ? 'Definition' : ''

    // Show "Define as Component" button only for:
    // 1. Non-definitions (instances)
    // 2. Elements with inline properties
    // 3. When filesAccess is available
    const hasInlineProperties = element.allProperties.some(p => p.source === 'instance')
    const showDefineBtn = !element.isDefinition && hasInlineProperties && this.options.filesAccess

    const categoriesHtml = this.renderCategories(element.categories)

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

  /**
   * Render property categories
   */
  private renderCategories(categories: PropertyCategory[]): string {
    if (categories.length === 0) {
      return `<div class="pp-empty"><p>No properties</p></div>`
    }

    // Find special categories for custom rendering
    const layoutCat = categories.find(c => c.name === 'layout')
    const alignmentCat = categories.find(c => c.name === 'alignment')
    const positionCat = categories.find(c => c.name === 'position')
    const sizingCat = categories.find(c => c.name === 'sizing')
    const spacingCat = categories.find(c => c.name === 'spacing')
    const borderCat = categories.find(c => c.name === 'border')
    const typographyCat = categories.find(c => c.name === 'typography')

    const specialCats = ['layout', 'alignment', 'position', 'sizing', 'spacing', 'border', 'typography', 'visual', 'hover', 'behavior']
    const behaviorCat = categories.find(c => c.name === 'behavior')
    const otherCats = categories.filter(c => !specialCats.includes(c.name))

    let result = ''

    // Render behavior section FIRST (for Zag components)
    if (behaviorCat && behaviorCat.properties.length > 0) {
      result += this.renderBehaviorSection(behaviorCat)
    }

    // Render layout section (includes alignment and position/absolute)
    if (layoutCat) {
      result += this.renderLayoutToggleGroup(layoutCat, alignmentCat, positionCat)
    }

    // Render sizing section (includes x/y when absolute is active)
    if (sizingCat) {
      result += this.renderSizingSection(sizingCat, positionCat)
    }

    // Render spacing section
    if (spacingCat) {
      result += this.renderSpacingSection(spacingCat)
    }

    // Render border section
    if (borderCat) {
      result += this.renderRadiusAndBorderSections(borderCat)
    }

    // Render color section
    result += this.renderColorSection()

    // Render typography section
    if (typographyCat) {
      result += this.renderTypographySection(typographyCat)
    }

    return result
  }

  /**
   * Render a single category
   */
  private renderCategory(category: PropertyCategory): string {
    // Special handling for alignment - render as 3x3 grid
    if (category.name === 'alignment') {
      return this.renderAlignmentGrid(category)
    }

    // Note: layout and sizing are handled together in renderCategories

    // Separate boolean toggles from other properties
    const booleans = category.properties.filter(p => p.type === 'boolean')
    const others = category.properties.filter(p => p.type !== 'boolean')

    // Group booleans into rows of max 4
    const booleanRows: ExtractedProperty[][] = []
    for (let i = 0; i < booleans.length; i += 4) {
      booleanRows.push(booleans.slice(i, i + 4))
    }

    return `
      <div class="pp-section">
        <div class="pp-label">${this.escapeHtml(category.label)}</div>
        ${booleanRows.map(row => this.renderToggleRow(row)).join('')}
        ${others.map(prop => this.renderProperty(prop)).join('')}
      </div>
    `
  }

  /**
   * Layout mode options (mutually exclusive)
   */
  // Note: absolute positioning disabled (Webflow-style)
  private readonly LAYOUT_MODES = ['vertical', 'horizontal', 'grid', 'stacked'] as const

  /**
   * Render layout as exclusive toggle group (includes alignment and position)
   */
  private renderLayoutToggleGroup(category: PropertyCategory, alignmentCat?: PropertyCategory, positionCat?: PropertyCategory): string {
    const props = category.properties

    // Find which layout mode is active
    const isActive = (name: string) => {
      const prop = props.find(p => p.name === name || p.name === name.substring(0, 3))
      return prop && (prop.value === 'true' || (prop.value === '' && prop.hasValue !== false))
    }

    // Determine active mode (default to vertical if none set)
    let activeMode: string = 'vertical'
    for (const mode of this.LAYOUT_MODES) {
      if (isActive(mode)) {
        activeMode = mode
        break
      }
    }
    // Also check short forms
    if (isActive('hor')) activeMode = 'horizontal'
    if (isActive('ver')) activeMode = 'vertical'

    // Find gap property
    const gapProp = props.find(p => p.name === 'gap' || p.name === 'g')
    const gapValue = gapProp?.value || ''

    // Find wrap property
    const wrapProp = props.find(p => p.name === 'wrap')
    const wrapActive = wrapProp && (wrapProp.value === 'true' || (wrapProp.value === '' && wrapProp.hasValue !== false))

    // Get dynamic gap tokens - NO FALLBACKS!
    const dynamicGapTokens = this.getGapTokens()
    const gapTokensToUse = dynamicGapTokens.map(t => ({ label: t.name, value: t.value, tokenRef: `$${t.fullName}` }))

    // Check if current gapValue is a token reference
    const isGapTokenRef = gapValue.startsWith('$')

    // Render gap tokens
    const gapTokens = gapTokensToUse.map(token => {
      const active = isGapTokenRef
        ? (gapValue === token.tokenRef)
        : (gapValue === token.value)
      return `<button class="token-btn ${active ? 'active' : ''}" data-gap-token="${token.value}" data-token-ref="${token.tokenRef}" title="${token.tokenRef}: ${token.value}">${token.label}</button>`
    }).join('')

    // Render alignment grid if alignmentCat is provided
    let alignmentRow = ''
    if (alignmentCat) {
      const alignProps = alignmentCat.properties
      const isAlignActive = (name: string) => {
        const prop = alignProps.find(p => p.name === name)
        return prop && (prop.value === 'true' || (prop.value === '' && prop.hasValue !== false))
      }

      const vAlign = isAlignActive('top') ? 'top' : isAlignActive('bottom') ? 'bottom' : isAlignActive('ver-center') ? 'middle' : null
      const hAlign = isAlignActive('left') ? 'left' : isAlignActive('right') ? 'right' : isAlignActive('hor-center') ? 'center' : null
      const isCenter = isAlignActive('center')

      const cells = [
        ['top-left', 'top-center', 'top-right'],
        ['middle-left', 'middle-center', 'middle-right'],
        ['bottom-left', 'bottom-center', 'bottom-right'],
      ]

      const getCellActive = (v: string, h: string): boolean => {
        if (v === 'middle' && h === 'center' && isCenter) return true
        const vMatch = (v === 'top' && vAlign === 'top') ||
                       (v === 'middle' && vAlign === 'middle') ||
                       (v === 'bottom' && vAlign === 'bottom')
        const hMatch = (h === 'left' && hAlign === 'left') ||
                       (h === 'center' && hAlign === 'center') ||
                       (h === 'right' && hAlign === 'right')
        return vMatch && hMatch
      }

      const gridHtml = cells.map((row, vIdx) => {
        const vName = ['top', 'middle', 'bottom'][vIdx]
        return row.map((cell, hIdx) => {
          const hName = ['left', 'center', 'right'][hIdx]
          const active = getCellActive(vName, hName)
          return `<button class="align-cell ${active ? 'active' : ''}" data-align="${cell}" title="${cell.replace('-', ' ')}"></button>`
        }).join('')
      }).join('')

      alignmentRow = `
          <div class="prop-row">
            <span class="prop-label">Align</span>
            <div class="prop-content">
              <div class="align-grid">
                ${gridHtml}
              </div>
            </div>
          </div>`
    }

    // Return prototype structure
    return `
      <div class="section">
        <div class="section-label">Layout</div>
        <div class="section-content">
          <div class="prop-row">
            <span class="prop-label">Mode</span>
            <div class="prop-content">
              <div class="toggle-group">
                <button class="toggle-btn ${activeMode === 'horizontal' ? 'active' : ''}" data-layout="horizontal" title="Horizontal">
                  ${getLayoutIcon('hbox', 'icon')}
                </button>
                <button class="toggle-btn ${activeMode === 'vertical' ? 'active' : ''}" data-layout="vertical" title="Vertical">
                  ${getLayoutIcon('vbox', 'icon')}
                </button>
                <button class="toggle-btn ${activeMode === 'grid' ? 'active' : ''}" data-layout="grid" title="Grid">
                  ${getLayoutIcon('grid', 'icon')}
                </button>
                <button class="toggle-btn ${activeMode === 'stacked' ? 'active' : ''}" data-layout="stacked" title="Stacked">
                  ${getLayoutIcon('zstack', 'icon')}
                </button>
              </div>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Gap</span>
            <div class="prop-content">
              ${gapTokens ? `<div class="token-group">${gapTokens}</div>` : ''}
              <input type="text" class="prop-input" autocomplete="off" value="${this.escapeHtml(gapValue)}" data-prop="gap" placeholder="0">
            </div>
          </div>
${(activeMode === 'horizontal' || activeMode === 'vertical') ? `
          <div class="prop-row">
            <span class="prop-label">Wrap</span>
            <div class="prop-content">
              <button class="toggle-btn single ${wrapActive ? 'active' : ''}" data-wrap="${wrapActive ? 'off' : 'on'}" title="${wrapActive ? 'Disable wrap' : 'Enable wrap'}">
                <svg class="icon" viewBox="0 0 14 14">
                  <rect x="1" y="3" width="2" height="2" fill="currentColor"/><rect x="6" y="3" width="2" height="2" fill="currentColor"/><rect x="11" y="3" width="2" height="2" fill="currentColor"/><rect x="1" y="9" width="2" height="2" fill="currentColor"/><rect x="6" y="9" width="2" height="2" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>` : ''}${alignmentRow}
        </div>
      </div>
    `
  }

  /**
   * Render sizing section (includes x/y when absolute is active)
   */
  private renderSizingSection(category: PropertyCategory, positionCat?: PropertyCategory): string {
    const props = category.properties

    // Find width and height values
    const widthProp = props.find(p => p.name === 'width' || p.name === 'w')
    const heightProp = props.find(p => p.name === 'height' || p.name === 'h')

    const widthValue = widthProp?.value || ''
    const heightValue = heightProp?.value || ''

    // Check for hug/full values
    const widthIsHug = widthValue === 'hug'
    const widthIsFull = widthValue === 'full'
    const heightIsHug = heightValue === 'hug'
    const heightIsFull = heightValue === 'full'

    // Note: x/y positioning disabled (Webflow-style, no absolute positioning)
    const xyRow = ''

    return `
      <div class="section">
        <div class="section-label">Size</div>
        <div class="section-content">${xyRow}
          <div class="prop-row">
            <span class="prop-label">Width</span>
            <div class="prop-content">
              <div class="toggle-group">
                <button class="toggle-btn ${widthIsHug ? 'active' : ''}" data-size-mode="width-hug" title="Hug Content">
                  <svg class="icon" viewBox="0 0 14 14">
                    <path d="M4 3v8M10 3v8M1 7h3M10 7h3"/>
                  </svg>
                </button>
                <button class="toggle-btn ${widthIsFull ? 'active' : ''}" data-size-mode="width-full" title="Fill Container">
                  <svg class="icon" viewBox="0 0 14 14">
                    <path d="M2 3v8M12 3v8M2 7h10"/>
                  </svg>
                </button>
              </div>
              <input type="text" class="prop-input" autocomplete="off" value="${this.escapeHtml(widthValue)}" data-prop="width" placeholder="auto">
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Height</span>
            <div class="prop-content">
              <div class="toggle-group">
                <button class="toggle-btn ${heightIsHug ? 'active' : ''}" data-size-mode="height-hug" title="Hug Content">
                  <svg class="icon" viewBox="0 0 14 14">
                    <path d="M3 4h8M3 10h8M7 1v3M7 10v3"/>
                  </svg>
                </button>
                <button class="toggle-btn ${heightIsFull ? 'active' : ''}" data-size-mode="height-full" title="Fill Container">
                  <svg class="icon" viewBox="0 0 14 14">
                    <path d="M3 2h8M3 12h8M7 2v10"/>
                  </svg>
                </button>
              </div>
              <input type="text" class="prop-input" autocomplete="off" value="${this.escapeHtml(heightValue)}" data-prop="height" placeholder="auto">
            </div>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Padding preset values (for dropdown)
   */
  private readonly PADDING_PRESETS = ['2', '4', '8', '16', '32']

  /**
   * Simple hash for cache invalidation
   */
  private hashSource(source: string): string {
    let hash = 0
    for (let i = 0; i < source.length; i++) {
      const char = source.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(36)
  }

  /**
   * Get spacing tokens from source for a specific property type (cached)
   * Parses tokens like "$s.pad: 4", "$m.rad: 8", "$l.gap: 16" from the source code
   * Uses getAllSource callback if available to get tokens from all project files
   * @param propType - The property type to extract (pad, rad, gap, etc.)
   */
  private getSpacingTokens(propType: string): SpacingToken[] {
    // Use getAllSource callback if available, otherwise fall back to current file
    const source = this.options.getAllSource
      ? this.options.getAllSource()
      : this.codeModifier.getSource()
    const hash = this.hashSource(source)

    // Check cache - invalidate all if source changed
    if (hash !== this.cachedSourceHash) {
      this.cachedSpacingTokens.clear()
      this.cachedSourceHash = hash
    }

    // Return cached if available
    const cached = this.cachedSpacingTokens.get(propType)
    if (cached) {
      return cached
    }

    const lines = source.split('\n')
    // Use Map to deduplicate tokens by name (later definitions override earlier ones)
    const tokenMap = new Map<string, SpacingToken>()

    // Build regex for the specific property type
    // Matches: $name.propType: value (e.g., "$s.pad: 4", "$m.rad: 8")
    const regex = new RegExp(`^\\$?([a-zA-Z0-9_-]+)\\.${propType}\\s*:\\s*(\\d+)$`)

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('//')) continue

      const match = trimmed.match(regex)
      if (match) {
        const name = match[1]
        tokenMap.set(name, {
          name,                     // e.g., "sm"
          fullName: `${name}.${propType}`, // e.g., "sm.pad"
          value: match[2]           // e.g., "4"
        })
      }
    }

    // Convert to array and cache
    const tokens = Array.from(tokenMap.values())
    this.cachedSpacingTokens.set(propType, tokens)
    return tokens
  }

  /**
   * Get padding tokens (convenience method)
   */
  private getPaddingTokens(): SpacingToken[] {
    return this.getSpacingTokens('pad')
  }

  /**
   * Get radius tokens
   */
  private getRadiusTokens(): SpacingToken[] {
    return this.getSpacingTokens('rad')
  }

  /**
   * Get gap tokens
   */
  private getGapTokens(): SpacingToken[] {
    return this.getSpacingTokens('gap')
  }

  /**
   * Get font-size tokens
   */
  private getFontSizeTokens(): SpacingToken[] {
    return this.getSpacingTokens('fs')
  }

  /**
   * Resolve token value - get numeric value for a token reference
   * Token ref can be "sm.pad" or "$s.pad" - we normalize it
   */
  private resolveTokenValue(tokenRef: string): string | null {
    // Normalize: remove $ prefix if present
    const normalizedRef = tokenRef.startsWith('$') ? tokenRef.slice(1) : tokenRef

    // Determine the property type from the token ref (e.g., "sm.pad" -> "pad")
    const parts = normalizedRef.split('.')
    if (parts.length < 2) return null

    const propType = parts[parts.length - 1] // last part is the property type
    const tokens = this.getSpacingTokens(propType)
    const token = tokens.find(t => t.fullName === normalizedRef)
    return token?.value || null
  }

  /**
   * Get color tokens from source (cached)
   * Parses tokens with hex colors like "$accent.bg: #3B82F6"
   * Uses getAllSource callback if available to get tokens from all project files
   */
  private getColorTokens(): Array<{ name: string; value: string }> {
    // Use getAllSource callback if available, otherwise fall back to current file
    const source = this.options.getAllSource
      ? this.options.getAllSource()
      : this.codeModifier.getSource()
    const hash = this.hashSource(source)

    // Return cached if source hasn't changed
    if (hash === this.cachedSourceHash && this.cachedColorTokens) {
      return this.cachedColorTokens
    }

    // Use Map to deduplicate tokens by name (later definitions override earlier ones)
    const tokenMap = new Map<string, { name: string; value: string }>()

    // Match token definitions with hex colors
    const tokenRegex = /\$?([\w.-]+):\s*(#[0-9A-Fa-f]{3,8})/g
    let match
    while ((match = tokenRegex.exec(source)) !== null) {
      tokenMap.set(match[1], {
        name: match[1],
        value: match[2]
      })
    }

    // Convert to array and cache
    const tokens = Array.from(tokenMap.values())
    this.cachedColorTokens = tokens
    this.cachedSourceHash = hash
    return tokens
  }

  /**
   * Get all tokens from source, optionally filtered by property suffix
   * Uses getAllSource callback if available to get tokens from all project files
   * @param propertySuffix Optional suffix to filter (e.g., 'pad', 'bg', 'col')
   */
  private getAllTokens(propertySuffix?: string): Array<{ name: string; value: string }> {
    // Use getAllSource callback if available, otherwise fall back to current file
    const source = this.options.getAllSource
      ? this.options.getAllSource()
      : this.codeModifier.getSource()
    const tokens: Array<{ name: string; value: string }> = []

    // Match token definitions: $name.suffix: value or name.suffix: value
    // Allow leading whitespace for indented tokens
    const tokenRegex = /^\s*\$?([\w.-]+):\s*(.+)$/gm
    let match
    while ((match = tokenRegex.exec(source)) !== null) {
      const name = match[1]
      const value = match[2].trim()

      // Skip if name doesn't contain a dot (not a semantic token)
      if (!name.includes('.')) continue

      // Filter by suffix if provided
      if (propertySuffix) {
        if (name.endsWith('.' + propertySuffix)) {
          tokens.push({ name, value })
        }
      } else {
        tokens.push({ name, value })
      }
    }

    return tokens
  }

  /**
   * Map property name to token suffix for filtering
   */
  private getTokenSuffixForProperty(propName: string): string | undefined {
    const mapping: Record<string, string> = {
      'pad': 'pad',
      'padding': 'pad',
      'p': 'pad',
      'gap': 'gap',
      'g': 'gap',
      'bg': 'bg',
      'background': 'bg',
      'col': 'col',
      'color': 'col',
      'c': 'col',
      'rad': 'rad',
      'radius': 'rad',
      'border-radius': 'rad',
      'font-size': 'font.size',
      'fs': 'font.size',
    }
    return mapping[propName]
  }

  // Autocomplete state
  private autocompleteDropdown: HTMLElement | null = null
  private autocompleteInput: HTMLInputElement | null = null
  private autocompleteIndex: number = -1
  private autocompleteTokens: Array<{ name: string; value: string }> = []
  private autocompleteKeyHandler: ((e: KeyboardEvent) => void) | null = null

  /**
   * Show token autocomplete dropdown
   */
  private showTokenAutocomplete(input: HTMLInputElement): void {
    // Get property name from various data attributes
    let propName = input.dataset.prop
    if (!propName) {
      // Check for padding direction inputs
      if (input.dataset.padDir) {
        propName = 'pad'
      } else if (input.dataset.borderDir || input.dataset.borderColorDir) {
        propName = 'border'
      }
    }
    if (!propName) return

    // Remove existing dropdown first (before setting new tokens)
    this.hideTokenAutocomplete()

    // Get filtered tokens based on property
    const suffix = this.getTokenSuffixForProperty(propName)
    this.autocompleteTokens = this.getAllTokens(suffix)

    if (this.autocompleteTokens.length === 0) {
      // If no specific tokens, show all tokens
      this.autocompleteTokens = this.getAllTokens()
    }

    if (this.autocompleteTokens.length === 0) return

    // Create dropdown
    const dropdown = document.createElement('div')
    dropdown.className = 'pp-token-autocomplete'

    this.renderAutocompleteItems(dropdown)

    // Position dropdown below input using fixed positioning
    const rect = input.getBoundingClientRect()
    dropdown.style.position = 'fixed'
    dropdown.style.top = `${rect.bottom + 4}px`
    dropdown.style.left = `${rect.left}px`
    dropdown.style.minWidth = `${rect.width}px`

    document.body.appendChild(dropdown)
    this.autocompleteDropdown = dropdown
    this.autocompleteInput = input
    this.autocompleteIndex = -1

    // Abort previous autocomplete listeners if any
    if (this.autocompleteAbortController) {
      this.autocompleteAbortController.abort()
    }
    this.autocompleteAbortController = new AbortController()
    const signal = this.autocompleteAbortController.signal

    // Add click handlers to items (mousedown fires before blur)
    dropdown.querySelectorAll('.pp-token-item').forEach((item, index) => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault() // Prevent blur
        this.selectAutocompleteItem(index)
      }, { signal })
      item.addEventListener('mouseenter', () => {
        this.autocompleteIndex = index
        this.updateAutocompleteHighlight()
      }, { signal })
    })

    // Add document-level keyboard handler (survives input re-render)
    this.autocompleteKeyHandler = (e: KeyboardEvent) => {
      this.handleAutocompleteKeydown(e)
    }
    document.addEventListener('keydown', this.autocompleteKeyHandler)
  }

  /**
   * Render autocomplete items
   */
  private renderAutocompleteItems(dropdown: HTMLElement): void {
    dropdown.innerHTML = this.autocompleteTokens.map((token, index) => `
      <div class="pp-token-item ${index === this.autocompleteIndex ? 'highlighted' : ''}" data-index="${index}">
        <span class="pp-token-name">$${token.name}</span>
        <span class="pp-token-value">${token.value}</span>
      </div>
    `).join('')
  }

  /**
   * Update autocomplete highlight
   */
  private updateAutocompleteHighlight(): void {
    if (!this.autocompleteDropdown) return

    const items = this.autocompleteDropdown.querySelectorAll('.pp-token-item')
    items.forEach((item, index) => {
      item.classList.toggle('highlighted', index === this.autocompleteIndex)
    })

    // Scroll into view if needed
    const highlighted = this.autocompleteDropdown.querySelector('.pp-token-item.highlighted')
    if (highlighted) {
      highlighted.scrollIntoView({ block: 'nearest' })
    }
  }

  /**
   * Select autocomplete item
   */
  private selectAutocompleteItem(index: number): void {
    if (index < 0 || index >= this.autocompleteTokens.length) return
    if (!this.autocompleteInput) return

    const token = this.autocompleteTokens[index]
    this.autocompleteInput.value = '$' + token.name
    this.autocompleteInput.classList.add('token')

    // Trigger update
    const propName = this.autocompleteInput.dataset.prop
    if (propName && this.currentElement) {
      this.updateProperty(propName, '$' + token.name)
    }

    this.hideTokenAutocomplete()
  }

  /**
   * Hide autocomplete dropdown
   */
  private hideTokenAutocomplete(): void {
    if (this.autocompleteDropdown) {
      this.autocompleteDropdown.remove()
      this.autocompleteDropdown = null
    }
    // Abort autocomplete event listeners
    if (this.autocompleteAbortController) {
      this.autocompleteAbortController.abort()
      this.autocompleteAbortController = null
    }
    // Remove document-level keyboard handler
    if (this.autocompleteKeyHandler) {
      document.removeEventListener('keydown', this.autocompleteKeyHandler)
      this.autocompleteKeyHandler = null
    }
    this.autocompleteInput = null
    this.autocompleteIndex = -1
    this.autocompleteTokens = []
  }

  /**
   * Handle autocomplete keyboard navigation
   */
  private handleAutocompleteKeydown(e: KeyboardEvent): boolean {
    if (!this.autocompleteDropdown) return false

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        this.autocompleteIndex = Math.min(this.autocompleteIndex + 1, this.autocompleteTokens.length - 1)
        this.updateAutocompleteHighlight()
        return true
      case 'ArrowUp':
        e.preventDefault()
        this.autocompleteIndex = Math.max(this.autocompleteIndex - 1, 0)
        this.updateAutocompleteHighlight()
        return true
      case 'Enter':
        if (this.autocompleteIndex >= 0) {
          e.preventDefault()
          this.selectAutocompleteItem(this.autocompleteIndex)
          return true
        }
        break
      case 'Escape':
        e.preventDefault()
        this.hideTokenAutocomplete()
        return true
      case 'Tab':
        this.hideTokenAutocomplete()
        break
    }
    return false
  }

  /**
   * Default color swatches for v2
   */
  private readonly COLOR_V2_SWATCHES = {
    bg: [
      { label: 'Surface', value: '#1a1a23' },
      { label: 'Elevated', value: '#27272A' },
      { label: 'Primary', value: '#3B82F6' },
      { label: 'Secondary', value: '#6B7280' },
    ],
    text: [
      { label: 'Text', value: '#E5E5E5' },
      { label: 'Muted', value: '#71717A' },
      { label: 'Primary', value: '#3B82F6' },
    ],
  } as const

  /**
   * Render color section (1:1 from prototype-v2.html)
   */
  private renderColorSection(): string {
    // Get current bg and color values
    // Use currentElement.allProperties which is already populated for both instances and definitions
    const allProps = this.currentElement?.allProperties || []
    const bgProp = allProps.find((p: {name: string}) => p.name === 'background' || p.name === 'bg')
    const colProp = allProps.find((p: {name: string}) => p.name === 'color' || p.name === 'col' || p.name === 'c')
    const bgValue = bgProp?.value || ''
    const colValue = colProp?.value || ''

    // Check if properties are instance overrides
    const bgIsOverride = bgProp?.source === 'instance'
    const colIsOverride = colProp?.source === 'instance'

    // Format display values (show token name or hex)
    const bgDisplay = bgValue.startsWith('$') ? bgValue : (bgValue || 'none')
    const colDisplay = colValue.startsWith('$') ? colValue : (colValue || 'none')

    // Check if value is a token for styling
    const bgIsToken = bgValue.startsWith('$')
    const colIsToken = colValue.startsWith('$')

    // Get resolved color for swatch display (resolve tokens to actual color)
    const bgSwatchColor = bgIsToken ? this.resolveTokenValue(bgValue) : bgValue
    const colSwatchColor = colIsToken ? this.resolveTokenValue(colValue) : colValue

    return `
      <div class="section">
        <div class="section-label">Color</div>
        <div class="section-content">
          <div class="prop-row${bgIsOverride ? ' override' : ''}">
            <span class="prop-label">Background</span>
            <div class="prop-content">
              <div class="pp-color-trigger" data-color-prop="bg" data-current-value="${this.escapeHtml(bgValue)}">
                <div class="pp-color-swatch${bgValue ? '' : ' empty'}" style="${bgSwatchColor ? `background: ${this.escapeHtml(bgSwatchColor)}` : ''}"></div>
                <span class="pp-color-value${bgIsToken ? ' token' : ''}">${this.escapeHtml(bgDisplay)}</span>
              </div>
            </div>
          </div>
          <div class="prop-row${colIsOverride ? ' override' : ''}">
            <span class="prop-label">Text</span>
            <div class="prop-content">
              <div class="pp-color-trigger" data-color-prop="color" data-current-value="${this.escapeHtml(colValue)}">
                <div class="pp-color-swatch${colValue ? '' : ' empty'}" style="${colSwatchColor ? `background: ${this.escapeHtml(colSwatchColor)}` : ''}"></div>
                <span class="pp-color-value${colIsToken ? ' token' : ''}">${this.escapeHtml(colDisplay)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render a generic preset row
   * Pattern: [Icon] [Presets] [Input][▾] [Extra]
   */
  private renderPresetRow(config: {
    iconKey: string
    presets: Array<{ value: string; label: string }>
    value: string
    dataAttr: string       // for preset buttons: data-{dataAttr}
    dataProp?: string      // for input: data-prop (for event handlers)
    inputClass: string
    placeholder: string
    showDropdown?: boolean
    dropdownValues?: string[]
    extraContent?: string
  }): string {
    const iconPath = PROPERTY_ICON_PATHS[config.iconKey]

    // Render preset buttons
    const presetButtons = config.presets.map(preset => {
      const active = config.value === preset.value
      return `<button class="pp-preset ${active ? 'active' : ''}" data-${config.dataAttr}="${preset.value}">${preset.label}</button>`
    }).join('')

    // Render dropdown button if needed
    const dropdownBtn = config.showDropdown
      ? `<button class="pp-dropdown" data-${config.dataAttr}-dropdown>▾</button>`
      : ''

    // data-prop attribute for input (used by event handlers)
    const dataPropAttr = config.dataProp ? `data-prop="${config.dataProp}"` : ''

    return `
      <div class="pp-row-line">
        <span class="pp-dim-icon" title="${config.iconKey}">
          <svg viewBox="0 0 14 14" width="12" height="12">${iconPath || ''}</svg>
        </span>
        <div class="pp-presets">
          ${presetButtons}
        </div>
        <div class="pp-input-wrap">
          <input type="text" class="${config.inputClass}" value="${this.escapeHtml(config.value)}" ${dataPropAttr} placeholder="${config.placeholder}">
          ${dropdownBtn}
        </div>
        ${config.extraContent || ''}
      </div>
    `
  }

  /**
   * Render spacing section (1:1 from prototype-v2.html)
   */
  private renderSpacingSection(category: PropertyCategory): string {
    const props = category.properties

    // Find padding values
    const padProp = props.find(p => p.name === 'padding' || p.name === 'pad' || p.name === 'p')
    const padValue = padProp?.value || ''
    const padIsOverride = padProp?.source === 'instance'

    // Parse padding value to get T, R, B, L
    const padParts = padValue.split(/\s+/).filter(Boolean)
    let tPad = '', rPad = '', bPad = '', lPad = ''
    if (padParts.length === 1) {
      tPad = rPad = bPad = lPad = padParts[0]
    } else if (padParts.length === 2) {
      tPad = bPad = padParts[0]
      rPad = lPad = padParts[1]
    } else if (padParts.length === 4) {
      tPad = padParts[0]
      rPad = padParts[1]
      bPad = padParts[2]
      lPad = padParts[3]
    }

    const vPad = tPad, hPad = rPad

    // Get dynamic tokens from source - NO FALLBACKS!
    const dynamicTokens = this.getPaddingTokens()
    const tokensToUse = dynamicTokens.map(t => ({ label: t.name, value: t.value, tokenRef: `$${t.fullName}` }))

    // Render token buttons for padding (returns empty string if no tokens)
    const hasTokens = tokensToUse.length > 0
    const renderPadTokens = (activeValue: string, direction: string) => {
      if (!hasTokens) return ''

      // Check if activeValue is a token reference
      const isTokenRef = activeValue.startsWith('$')

      return tokensToUse.map(token => {
        // Match by token ref or by resolved value
        const isActive = isTokenRef
          ? (activeValue === token.tokenRef)
          : (activeValue === token.value)
        return `<button class="token-btn ${isActive ? 'active' : ''}" data-pad-token="${token.value}" data-token-ref="${token.tokenRef}" data-pad-dir="${direction}" title="${token.tokenRef}: ${token.value}">${token.label}</button>`
      }).join('')
    }

    // Helper to render token group only if tokens exist
    const tokenGroup = (content: string) => hasTokens ? `<div class="token-group">${content}</div>` : ''

    return `
      <div class="section">
        <div class="section-label">
          <span>Padding</span>
          <button class="section-expand-btn" data-expand="spacing" title="Toggle detail view">
            <svg class="icon icon-collapsed" viewBox="0 0 14 14">
              <path d="M4 6l3 3 3-3"/>
            </svg>
            <svg class="icon icon-expanded" viewBox="0 0 14 14">
              <path d="M4 8l3-3 3 3"/>
            </svg>
          </button>
        </div>
        <div class="section-content" data-expand-container="spacing">
          <div class="prop-row collapsed-row${padIsOverride ? ' override' : ''}" data-expand-group="spacing">
            <span class="prop-label">Horizontal</span>
            <div class="prop-content">
              ${tokenGroup(renderPadTokens(hPad, 'h'))}
              <input type="text" class="prop-input" autocomplete="off" value="${this.escapeHtml(hPad)}" data-pad-dir="h" placeholder="0">
            </div>
          </div>
          <div class="prop-row collapsed-row${padIsOverride ? ' override' : ''}" data-expand-group="spacing">
            <span class="prop-label">Vertical</span>
            <div class="prop-content">
              ${tokenGroup(renderPadTokens(vPad, 'v'))}
              <input type="text" class="prop-input" autocomplete="off" value="${this.escapeHtml(vPad)}" data-pad-dir="v" placeholder="0">
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="spacing">
            <span class="prop-label">Top</span>
            <div class="prop-content">
              ${tokenGroup(renderPadTokens(tPad, 't'))}
              <input type="text" class="prop-input" autocomplete="off" value="${this.escapeHtml(tPad)}" data-pad-dir="t" placeholder="0">
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="spacing">
            <span class="prop-label">Right</span>
            <div class="prop-content">
              ${tokenGroup(renderPadTokens(rPad, 'r'))}
              <input type="text" class="prop-input" autocomplete="off" value="${this.escapeHtml(rPad)}" data-pad-dir="r" placeholder="0">
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="spacing">
            <span class="prop-label">Bottom</span>
            <div class="prop-content">
              ${tokenGroup(renderPadTokens(bPad, 'b'))}
              <input type="text" class="prop-input" autocomplete="off" value="${this.escapeHtml(bPad)}" data-pad-dir="b" placeholder="0">
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="spacing">
            <span class="prop-label">Left</span>
            <div class="prop-content">
              ${tokenGroup(renderPadTokens(lPad, 'l'))}
              <input type="text" class="prop-input" autocomplete="off" value="${this.escapeHtml(lPad)}" data-pad-dir="l" placeholder="0">
            </div>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render border section (1:1 from prototype-v2.html)
   */
  private renderRadiusAndBorderSections(category: PropertyCategory): string {
    const props = category.properties

    // Get radius value
    const radiusProp = props.find(p => p.name === 'radius' || p.name === 'rad')
    const radiusValue = radiusProp?.value || ''
    const radiusIsOverride = radiusProp?.source === 'instance'

    // Get border value and extract width and color
    const borderProp = props.find(p => p.name === 'border' || p.name === 'bor')
    const borderValue = borderProp?.value || ''
    const borderParts = borderValue.split(/\s+/).filter(Boolean)
    const borderWidth = borderParts[0] || '0'
    // Color is the second part (or look for # or $)
    const borderColor = borderParts.find(p => p.startsWith('#') || p.startsWith('$')) || ''
    const borderIsOverride = borderProp?.source === 'instance'

    // Border color display
    const borderColorIsToken = borderColor.startsWith('$')
    const borderColorDisplay = borderColor || 'none'
    const borderColorSwatch = borderColorIsToken ? this.resolveTokenValue(borderColor) : borderColor

    // Get dynamic radius tokens - NO FALLBACKS!
    const dynamicRadiusTokens = this.getRadiusTokens()
    const radiusTokens = [
      { label: '0', value: '0', tokenRef: '' },
      ...dynamicRadiusTokens.map(t => ({ label: t.name, value: t.value, tokenRef: `$${t.fullName}` }))
    ]

    // Check if current radiusValue is a token reference
    const isRadiusTokenRef = radiusValue.startsWith('$')

    const renderRadTokens = radiusTokens.map(token => {
      const isActive = isRadiusTokenRef
        ? (radiusValue === token.tokenRef)
        : (radiusValue === token.value)
      const title = token.tokenRef ? `${token.tokenRef}: ${token.value}` : token.value
      return `<button class="token-btn ${isActive ? 'active' : ''}" data-radius="${token.value}" data-token-ref="${token.tokenRef}" title="${title}">${token.label}</button>`
    }).join('')

    // Render border width toggles
    const borderWidths = ['0', '1', '2']
    const borderWidthToggles = borderWidths.map(w => {
      const isActive = borderWidth === w
      return `<button class="toggle-btn ${isActive ? 'active' : ''}" data-border-width="${w}" title="${w}px">${w}</button>`
    }).join('')

    // Color trigger for border (stores current width for compound update)
    const borderColorTrigger = `
      <div class="pp-color-trigger pp-color-trigger-compact" data-border-color-prop="bor" data-border-width="${borderWidth}" data-current-value="${this.escapeHtml(borderColor)}">
        <div class="pp-color-swatch${borderColor ? '' : ' empty'}" style="${borderColorSwatch ? `background: ${this.escapeHtml(borderColorSwatch)}` : ''}"></div>
      </div>
    `

    return `
      <!-- Radius Section -->
      <div class="section">
        <div class="section-label">
          <span>Radius</span>
          <button class="section-expand-btn" data-expand="radius" title="Toggle corner details">
            <svg class="icon icon-collapsed" viewBox="0 0 14 14">
              <path d="M4 6l3 3 3-3"/>
            </svg>
            <svg class="icon icon-expanded" viewBox="0 0 14 14">
              <path d="M4 8l3-3 3 3"/>
            </svg>
          </button>
        </div>
        <div class="section-content" data-expand-container="radius">
          <!-- Collapsed: Global Radius -->
          <div class="prop-row collapsed-row${radiusIsOverride ? ' override' : ''}" data-expand-group="radius">
            <span class="prop-label">All</span>
            <div class="prop-content">
              <div class="token-group">
                ${renderRadTokens}
                <button class="token-btn ${radiusValue === '999' ? 'active' : ''}" data-radius="999" title="Full: 999">
                  <svg class="icon" viewBox="0 0 14 14">
                    <circle cx="7" cy="7" r="5"/>
                  </svg>
                </button>
              </div>
              <input type="text" class="prop-input" autocomplete="off" value="${this.escapeHtml(radiusValue)}" data-prop="radius" placeholder="0">
            </div>
          </div>

          <!-- Expanded: Corner Radii (4 corners) -->
          <div class="prop-row expanded-row" data-expand-group="radius">
            <div class="corner-radius-grid">
              <div class="corner-input">
                <span class="corner-label" title="Top Left">TL</span>
                <input type="text" class="prop-input" autocomplete="off" value="${this.escapeHtml(radiusValue)}" data-radius-corner="tl" placeholder="0">
              </div>
              <div class="corner-input">
                <span class="corner-label" title="Top Right">TR</span>
                <input type="text" class="prop-input" autocomplete="off" value="${this.escapeHtml(radiusValue)}" data-radius-corner="tr" placeholder="0">
              </div>
              <div class="corner-input">
                <span class="corner-label" title="Bottom Left">BL</span>
                <input type="text" class="prop-input" autocomplete="off" value="${this.escapeHtml(radiusValue)}" data-radius-corner="bl" placeholder="0">
              </div>
              <div class="corner-input">
                <span class="corner-label" title="Bottom Right">BR</span>
                <input type="text" class="prop-input" autocomplete="off" value="${this.escapeHtml(radiusValue)}" data-radius-corner="br" placeholder="0">
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Border Section -->
      <div class="section">
        <div class="section-label">
          <span>Border</span>
          <button class="section-expand-btn" data-expand="border" title="Toggle side details">
            <svg class="icon icon-collapsed" viewBox="0 0 14 14">
              <path d="M4 6l3 3 3-3"/>
            </svg>
            <svg class="icon icon-expanded" viewBox="0 0 14 14">
              <path d="M4 8l3-3 3 3"/>
            </svg>
          </button>
        </div>
        <div class="section-content" data-expand-container="border">
          <!-- Collapsed: Global Border -->
          <div class="prop-row collapsed-row${borderIsOverride ? ' override' : ''}" data-expand-group="border">
            <span class="prop-label">All</span>
            <div class="prop-content">
              <div class="toggle-group">
                ${borderWidthToggles}
              </div>
              ${borderColorTrigger}
            </div>
          </div>

          <!-- Expanded: Side Borders -->
          <div class="prop-row expanded-row side-detail" data-expand-group="border">
            <span class="prop-label">Top</span>
            <div class="prop-content">
              <div class="toggle-group">
                ${borderWidthToggles}
              </div>
              <div class="pp-color-trigger pp-color-trigger-compact" data-border-color-prop="bor-t" data-border-width="${borderWidth}" data-current-value="${this.escapeHtml(borderColor)}">
                <div class="pp-color-swatch${borderColor ? '' : ' empty'}" style="${borderColorSwatch ? `background: ${this.escapeHtml(borderColorSwatch)}` : ''}"></div>
              </div>
            </div>
          </div>
          <div class="prop-row expanded-row side-detail" data-expand-group="border">
            <span class="prop-label">Right</span>
            <div class="prop-content">
              <div class="toggle-group">
                ${borderWidthToggles}
              </div>
              <div class="pp-color-trigger pp-color-trigger-compact" data-border-color-prop="bor-r" data-border-width="${borderWidth}" data-current-value="${this.escapeHtml(borderColor)}">
                <div class="pp-color-swatch${borderColor ? '' : ' empty'}" style="${borderColorSwatch ? `background: ${this.escapeHtml(borderColorSwatch)}` : ''}"></div>
              </div>
            </div>
          </div>
          <div class="prop-row expanded-row side-detail" data-expand-group="border">
            <span class="prop-label">Bottom</span>
            <div class="prop-content">
              <div class="toggle-group">
                ${borderWidthToggles}
              </div>
              <div class="pp-color-trigger pp-color-trigger-compact" data-border-color-prop="bor-b" data-border-width="${borderWidth}" data-current-value="${this.escapeHtml(borderColor)}">
                <div class="pp-color-swatch${borderColor ? '' : ' empty'}" style="${borderColorSwatch ? `background: ${this.escapeHtml(borderColorSwatch)}` : ''}"></div>
              </div>
            </div>
          </div>
          <div class="prop-row expanded-row side-detail" data-expand-group="border">
            <span class="prop-label">Left</span>
            <div class="prop-content">
              <div class="toggle-group">
                ${borderWidthToggles}
              </div>
              <div class="pp-color-trigger pp-color-trigger-compact" data-border-color-prop="bor-l" data-border-width="${borderWidth}" data-current-value="${this.escapeHtml(borderColor)}">
                <div class="pp-color-swatch${borderColor ? '' : ' empty'}" style="${borderColorSwatch ? `background: ${this.escapeHtml(borderColorSwatch)}` : ''}"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Google Font families
   */
  private readonly GOOGLE_FONTS = [
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Poppins',
    'Oswald',
    'Raleway',
    'Nunito',
    'Playfair Display',
    'Merriweather',
    'Source Sans Pro',
    'Ubuntu',
    'Rubik',
    'Work Sans',
    'Fira Sans',
    'Quicksand',
    'Karla',
    'Inconsolata',
    'Space Mono',
  ] as const

  /**
   * Font weight options
   */
  private readonly FONT_WEIGHT_OPTIONS = [
    { label: '300', value: '300' },
    { label: '400', value: '400' },
    { label: '500', value: '500' },
    { label: '600', value: '600' },
    { label: '700', value: '700' },
  ] as const

  /**
   * Text alignment options
   */
  private readonly TEXT_ALIGNS = ['left', 'center', 'right'] as const

  /**
   * Text style toggles (booleans)
   */
  private readonly TEXT_STYLES = ['italic', 'underline', 'uppercase', 'lowercase', 'truncate'] as const

  /**
   * Render typography section (v2) - matches prototype-v2.html
   */
  private renderTypographySection(category: PropertyCategory): string {
    const props = category.properties

    // Find typography properties
    const fontProp = props.find(p => p.name === 'font')
    const fontSizeProp = props.find(p => p.name === 'font-size' || p.name === 'fs')
    const weightProp = props.find(p => p.name === 'weight')
    const textAlignProp = props.find(p => p.name === 'text-align')

    const fontValue = fontProp?.value || ''
    const fontSizeValue = fontSizeProp?.value || ''
    const weightValue = weightProp?.value || ''
    const textAlignValue = textAlignProp?.value || ''

    // Font dropdown options - matching prototype
    const prototypefonts = ['Inter', 'SF Pro', 'Helvetica', 'Arial', 'Georgia', 'Times', 'SF Mono', 'Menlo']
    const fontOptions = prototypefonts.map(f =>
      `<option value="${f}" ${fontValue === f ? 'selected' : ''}>${f}</option>`
    ).join('')

    // Weight dropdown options - matching prototype exactly
    const prototypeWeights = [
      { value: '100', label: '100 · Thin' },
      { value: '200', label: '200 · Extra Light' },
      { value: '300', label: '300 · Light' },
      { value: '400', label: '400 · Regular' },
      { value: '500', label: '500 · Medium' },
      { value: '600', label: '600 · Semi Bold' },
      { value: '700', label: '700 · Bold' },
      { value: '800', label: '800 · Extra Bold' },
      { value: '900', label: '900 · Black' },
    ]
    const weightOptions = prototypeWeights.map(w =>
      `<option value="${w.value}" ${weightValue === w.value ? 'selected' : ''}>${w.label}</option>`
    ).join('')

    // Font size tokens - dynamic from source (e.g., $s.fs: 12)
    const dynamicFontSizeTokens = this.getFontSizeTokens()
    const sizeTokens = dynamicFontSizeTokens.map(token => {
      const isActive = fontSizeValue === token.value
      return `<button class="token-btn ${isActive ? 'active' : ''}" data-font-size="${token.value}" title="${token.value}px">${token.name}</button>`
    }).join('')

    // Align icons - thin lines using paths
    const alignIcons = {
      left: '<path d="M2 3h10M2 7h6M2 11h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      center: '<path d="M2 3h10M4 7h6M3 11h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      right: '<path d="M2 3h10M8 7h4M6 11h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    }
    const alignToggles = this.TEXT_ALIGNS.map(align => {
      const isActive = textAlignValue === align
      const iconPath = alignIcons[align as keyof typeof alignIcons] || ''
      return `<button class="toggle-btn ${isActive ? 'active' : ''}" data-text-align="${align}" title="${align.charAt(0).toUpperCase() + align.slice(1)}">
        <svg class="icon" viewBox="0 0 14 14" fill="none">${iconPath}</svg>
      </button>`
    }).join('')

    // Style icons - matching prototype exactly
    const styleIcons = {
      italic: '<path d="M6 3h4M4 11h4M8 3L6 11"/>',
      underline: '<path d="M4 3v5a3 3 0 006 0V3M3 12h8"/>',
    }
    const styleToggles = ['italic', 'underline'].map(style => {
      const prop = props.find(p => p.name === style)
      const isActive = prop && (prop.value === 'true' || (prop.value === '' && prop.hasValue !== false))
      const iconPath = styleIcons[style as keyof typeof styleIcons]
      return `<button class="toggle-btn ${isActive ? 'active' : ''}" data-text-style="${style}" title="${style.charAt(0).toUpperCase() + style.slice(1)}">
        <svg class="icon" viewBox="0 0 14 14">${iconPath}</svg>
      </button>`
    }).join('')

    return `
      <div class="section">
        <div class="section-label">Typography</div>
        <div class="section-content">
          <div class="prop-row">
            <span class="prop-label">Font</span>
            <div class="prop-content">
              <select class="pp-font-input" data-prop="font">
                ${fontOptions}
              </select>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Size</span>
            <div class="prop-content">
              ${sizeTokens ? `<div class="token-group">${sizeTokens}</div>` : ''}
              <input type="text" class="pp-fontsize-input" value="${this.escapeHtml(fontSizeValue)}" data-prop="font-size" placeholder="14" autocomplete="off">
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Weight</span>
            <div class="prop-content">
              <select class="pp-weight-input" data-prop="weight">
                ${weightOptions}
              </select>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Align</span>
            <div class="prop-content">
              <div class="toggle-group">
                ${alignToggles}
              </div>
              <div class="toggle-group">
                ${styleToggles}
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render behavior section for Zag component properties
   * Uses Feature Chips for booleans, selects for enums, inputs for strings
   */
  private renderBehaviorSection(category: PropertyCategory): string {
    const props = category.properties
    if (props.length === 0) return ''

    // Properties to exclude from UI
    const excludedProps = ['clearable', 'disabled', 'required']
    const filteredProps = props.filter(p => !excludedProps.includes(p.name))

    // Separate boolean from other properties
    const booleans = filteredProps.filter(p => p.type === 'boolean')
    const selects = filteredProps.filter(p => p.type === 'select' && p.options && p.options.length > 0)
    const others = filteredProps.filter(p => p.type !== 'boolean' && !(p.type === 'select' && p.options && p.options.length > 0))

    // Render select dropdowns
    const selectRows = selects.map(prop => {
      const options = (prop.options || []).map(opt =>
        `<option value="${this.escapeHtml(opt)}" ${prop.value === opt ? 'selected' : ''}>${this.escapeHtml(opt)}</option>`
      ).join('')
      const label = prop.label || prop.name
      return `
        <div class="prop-row">
          <span class="prop-label" title="${this.escapeHtml(prop.description || '')}">${this.escapeHtml(label)}</span>
          <div class="prop-content">
            <select class="prop-select" data-behavior-select="${prop.name}">
              <option value="">-</option>
              ${options}
            </select>
          </div>
        </div>
      `
    }).join('')

    // Render other properties (strings, numbers) - standard prop-row layout
    const otherRows = others.map(prop => {
      const label = prop.label || prop.name
      const placeholder = prop.type === 'number' ? '0' : ''
      const isWide = prop.type === 'text'
      return `
        <div class="prop-row">
          <span class="prop-label" title="${this.escapeHtml(prop.description || '')}">${this.escapeHtml(label)}</span>
          <div class="prop-content">
            <input type="text" class="prop-input${isWide ? ' wide' : ''}" value="${this.escapeHtml(prop.value || '')}" data-behavior-input="${prop.name}" placeholder="${placeholder}" autocomplete="off">
          </div>
        </div>
      `
    }).join('')

    // Render boolean properties as individual toggle rows
    const booleanRows = booleans.map(prop => {
      const isActive = prop.value === 'true' || (prop.value === '' && prop.hasValue !== false)
      const label = prop.label || prop.name
      return `
        <div class="prop-row">
          <span class="prop-label" title="${this.escapeHtml(prop.description || '')}">${this.escapeHtml(label)}</span>
          <div class="prop-content">
            <button class="toggle-btn single ${isActive ? 'active' : ''}" data-behavior-toggle="${prop.name}" title="${this.escapeHtml(prop.description || label)}">
              <svg class="icon" viewBox="0 0 14 14">
                ${isActive ? '<path d="M11 4L6 10L3 7" stroke="currentColor" stroke-width="2" fill="none"/>' : ''}
              </svg>
            </button>
          </div>
        </div>
      `
    }).join('')

    return `
      <div class="section">
        <div class="section-label">Behavior</div>
        <div class="section-content">
          ${otherRows}
          ${selectRows}
          ${booleanRows}
        </div>
      </div>
    `
  }

  /**
   * Shadow presets
   */
  private readonly SHADOW_PRESETS = ['none', 'sm', 'md', 'lg'] as const

  /**
   * Opacity presets
   */
  private readonly OPACITY_PRESETS = ['0', '0.25', '0.5', '0.75', '1'] as const

  /**
   * Render visual section with shadow, opacity, and visibility toggles
   */
  private renderVisualSection(category: PropertyCategory): string {
    const props = category.properties

    // Find visual properties
    const shadowProp = props.find(p => p.name === 'shadow')
    const opacityProp = props.find(p => p.name === 'opacity' || p.name === 'o')
    const cursorProp = props.find(p => p.name === 'cursor')
    const zIndexProp = props.find(p => p.name === 'z')

    const shadowValue = shadowProp?.value || ''
    const opacityValue = opacityProp?.value || ''
    const cursorValue = cursorProp?.value || ''
    const zIndexValue = zIndexProp?.value || ''

    // Render shadow toggles
    const shadowToggles = this.SHADOW_PRESETS.map(shadow => {
      const active = shadowValue === shadow || (shadow === 'none' && !shadowValue)
      const iconPath = PROPERTY_ICON_PATHS[`shadow-${shadow}`]
      return `
        <button class="pp-shadow-toggle ${active ? 'active' : ''}" data-shadow="${shadow}" title="${shadow}">
          ${iconPath ? `<svg viewBox="0 0 14 14" width="14" height="14">${iconPath}</svg>` : shadow}
        </button>
      `
    }).join('')

    // Render opacity presets
    const opacityPresets = this.OPACITY_PRESETS.map(val => {
      const active = opacityValue === val
      return `<button class="pp-opacity-preset ${active ? 'active' : ''}" data-opacity="${val}">${val}</button>`
    }).join('')

    // Render visibility toggles (hidden, visible, disabled)
    const visibilityToggles = ['hidden', 'visible', 'disabled'].map(prop => {
      const propObj = props.find(p => p.name === prop)
      const isActive = propObj && (propObj.value === 'true' || (propObj.value === '' && propObj.hasValue !== false))
      const iconPath = PROPERTY_ICON_PATHS[prop]
      return `
        <button class="pp-visibility-toggle ${isActive ? 'active' : ''}" data-visibility="${prop}" title="${prop}">
          ${iconPath ? `<svg viewBox="0 0 14 14" width="14" height="14">${iconPath}</svg>` : prop}
        </button>
      `
    }).join('')

    // Cursor options
    const cursorOptions = ['default', 'pointer', 'text', 'move', 'not-allowed', 'grab']

    return `
      <div class="pp-section">
        <div class="pp-label">Visual</div>
        <div class="pp-visual-row">
          <span class="pp-visual-label">Shadow</span>
          <div class="pp-shadow-group">
            ${shadowToggles}
          </div>
        </div>
        <div class="pp-visual-row">
          <span class="pp-visual-label">Opacity</span>
          <div class="pp-opacity-group">
            ${opacityPresets}
          </div>
          <input type="text" class="pp-opacity-input" value="${this.escapeHtml(opacityValue)}" data-prop="opacity" placeholder="1" autocomplete="off">
        </div>
        <div class="pp-visual-row">
          <span class="pp-visual-label">Cursor</span>
          <select class="pp-cursor-select" data-prop="cursor">
            <option value="" ${!cursorValue ? 'selected' : ''}>-</option>
            ${cursorOptions.map(opt => `<option value="${opt}" ${opt === cursorValue ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>
        </div>
        <div class="pp-visual-row">
          <span class="pp-visual-label">Z-Index</span>
          <input type="text" class="pp-zindex-input" value="${this.escapeHtml(zIndexValue)}" data-prop="z" placeholder="0" autocomplete="off">
        </div>
        <div class="pp-visual-row">
          <div class="pp-visibility-group">
            ${visibilityToggles}
          </div>
        </div>
      </div>
    `
  }

  /**
   * Hover opacity presets
   */
  private readonly HOVER_OPACITY_PRESETS = ['0.5', '0.7', '0.8', '0.9', '1'] as const

  /**
   * Hover scale presets
   */
  private readonly HOVER_SCALE_PRESETS = ['0.95', '1', '1.02', '1.05', '1.1'] as const

  /**
   * Render hover section with hover-specific properties (v2 design)
   */
  private renderHoverSection(category: PropertyCategory): string {
    const props = category.properties

    // Find hover properties
    const hoverBgProp = props.find(p => p.name === 'hover-background' || p.name === 'hover-bg')
    const hoverColProp = props.find(p => p.name === 'hover-color' || p.name === 'hover-col')
    const hoverOpaProp = props.find(p => p.name === 'hover-opacity' || p.name === 'hover-opa')
    const hoverScaleProp = props.find(p => p.name === 'hover-scale')
    const hoverBorProp = props.find(p => p.name === 'hover-border' || p.name === 'hover-bor')
    const hoverBocProp = props.find(p => p.name === 'hover-border-color' || p.name === 'hover-boc')

    const hoverBgValue = hoverBgProp?.value || ''
    const hoverColValue = hoverColProp?.value || ''
    const hoverOpaValue = hoverOpaProp?.value || ''
    const hoverScaleValue = hoverScaleProp?.value || ''
    const hoverBorValue = hoverBorProp?.value || ''
    const hoverBocValue = hoverBocProp?.value || ''

    // Format display values for hover colors
    const hoverBgDisplay = hoverBgValue.startsWith('$') ? hoverBgValue : (hoverBgValue || 'none')
    const hoverColDisplay = hoverColValue.startsWith('$') ? hoverColValue : (hoverColValue || 'none')

    // Check if values are tokens for styling
    const hoverBgIsToken = hoverBgValue.startsWith('$')
    const hoverColIsToken = hoverColValue.startsWith('$')

    // Get resolved colors for swatch display
    const hoverBgSwatchColor = hoverBgIsToken ? this.resolveTokenValue(hoverBgValue) : hoverBgValue
    const hoverColSwatchColor = hoverColIsToken ? this.resolveTokenValue(hoverColValue) : hoverColValue

    // Opacity tokens (v2)
    const opacityTokens = this.HOVER_OPACITY_PRESETS.map(val => {
      const isActive = hoverOpaValue === val
      const label = val === '1' ? '1' : val.replace('0.', '.')
      return `<button class="pp-token-btn ${isActive ? 'active' : ''}" data-hover-prop="hover-opacity" data-value="${val}" title="Opacity: ${val}">${label}</button>`
    }).join('')

    // Border width toggles (v2)
    const borderWidths = ['0', '1', '2']
    // Parse border value to extract width (e.g., "1 #333" -> "1")
    const currentBorderWidth = hoverBorValue.split(' ')[0] || '0'
    const borderToggles = borderWidths.map(width => {
      const isActive = currentBorderWidth === width
      return `<button class="pp-toggle-btn ${isActive ? 'active' : ''}" data-hover-bor-width="${width}" title="${width}px">${width}</button>`
    }).join('')

    // Extract border color from hover-bor or hover-boc
    const hoverBorderColor = hoverBocValue || hoverBorValue.split(' ').find(p => p.startsWith('#') || p.startsWith('$')) || ''
    const hoverBorderColorIsToken = hoverBorderColor.startsWith('$')
    const hoverBorderColorSwatch = hoverBorderColorIsToken ? this.resolveTokenValue(hoverBorderColor) : hoverBorderColor

    return `
      <div class="pp-section">
        <div class="pp-label">Hover</div>
        <div class="pp-prop-row">
          <span class="pp-prop-label">BG</span>
          <div class="pp-prop-content">
            <div class="pp-color-trigger" data-color-prop="hover-bg" data-current-value="${this.escapeHtml(hoverBgValue)}">
              <div class="pp-color-swatch${hoverBgValue ? '' : ' empty'}" style="${hoverBgSwatchColor ? `background: ${this.escapeHtml(hoverBgSwatchColor)}` : ''}"></div>
              <span class="pp-color-value${hoverBgIsToken ? ' token' : ''}">${this.escapeHtml(hoverBgDisplay)}</span>
            </div>
          </div>
        </div>
        <div class="pp-prop-row">
          <span class="pp-prop-label">Color</span>
          <div class="pp-prop-content">
            <div class="pp-color-trigger" data-color-prop="hover-col" data-current-value="${this.escapeHtml(hoverColValue)}">
              <div class="pp-color-swatch${hoverColValue ? '' : ' empty'}" style="${hoverColSwatchColor ? `background: ${this.escapeHtml(hoverColSwatchColor)}` : ''}"></div>
              <span class="pp-color-value${hoverColIsToken ? ' token' : ''}">${this.escapeHtml(hoverColDisplay)}</span>
            </div>
          </div>
        </div>
        <div class="pp-prop-row">
          <span class="pp-prop-label">Opacity</span>
          <div class="pp-prop-content">
            <div class="pp-token-group">
              ${opacityTokens}
            </div>
            <input type="text" class="pp-v2-input" value="${this.escapeHtml(hoverOpaValue)}" data-hover-prop="hover-opacity" placeholder="1" autocomplete="off">
          </div>
        </div>
        <div class="pp-prop-row">
          <span class="pp-prop-label">Scale</span>
          <div class="pp-prop-content">
            <input type="text" class="pp-v2-input" value="${this.escapeHtml(hoverScaleValue)}" data-hover-prop="hover-scale" placeholder="1.05" autocomplete="off">
          </div>
        </div>
        <div class="pp-prop-row">
          <span class="pp-prop-label">Border</span>
          <div class="pp-prop-content">
            <div class="pp-toggle-group">
              ${borderToggles}
            </div>
            <div class="pp-color-trigger pp-color-trigger-compact" data-color-prop="hover-boc" data-hover-bor-width="${currentBorderWidth}" data-current-value="${this.escapeHtml(hoverBorderColor)}">
              <div class="pp-color-swatch${hoverBorderColor ? '' : ' empty'}" style="${hoverBorderColorSwatch ? `background: ${this.escapeHtml(hoverBorderColorSwatch)}` : ''}"></div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Get short label from token name for display
   * e.g., "sm.pad" -> "SM", "spacing.small.pad" -> "Sma"
   */
  private getTokenShortLabel(tokenName: string): string {
    // Remove .pad suffix
    const name = tokenName.replace(/\.pad$/, '')
    // Get the most descriptive part
    const parts = name.split('.')
    // Use first part if short, otherwise abbreviate
    const label = parts[0]
    return label.length <= 3 ? label.toUpperCase() : label.charAt(0).toUpperCase() + label.slice(1, 3)
  }

  /**
   * Render alignment as a 3x3 grid
   */
  private renderAlignmentGrid(category: PropertyCategory): string {
    // Find current alignment state
    const props = category.properties
    const isActive = (name: string) => {
      const prop = props.find(p => p.name === name)
      return prop && (prop.value === 'true' || (prop.value === '' && prop.hasValue !== false))
    }

    // Determine active cell based on current properties
    const vAlign = isActive('top') ? 'top' : isActive('bottom') ? 'bottom' : isActive('ver-center') ? 'middle' : null
    const hAlign = isActive('left') ? 'left' : isActive('right') ? 'right' : isActive('hor-center') ? 'center' : null
    const isCenter = isActive('center')

    // Grid positions: [vertical][horizontal]
    const cells = [
      ['top-left', 'top-center', 'top-right'],
      ['middle-left', 'middle-center', 'middle-right'],
      ['bottom-left', 'bottom-center', 'bottom-right'],
    ]

    const getCellActive = (v: string, h: string): boolean => {
      if (v === 'middle' && h === 'center' && isCenter) return true
      const vMatch = (v === 'top' && vAlign === 'top') ||
                     (v === 'middle' && vAlign === 'middle') ||
                     (v === 'bottom' && vAlign === 'bottom')
      const hMatch = (h === 'left' && hAlign === 'left') ||
                     (h === 'center' && hAlign === 'center') ||
                     (h === 'right' && hAlign === 'right')
      return vMatch && hMatch
    }

    const gridHtml = cells.map((row, vIdx) => {
      const vName = ['top', 'middle', 'bottom'][vIdx]
      return row.map((cell, hIdx) => {
        const hName = ['left', 'center', 'right'][hIdx]
        const active = getCellActive(vName, hName)
        return `<button class="pp-align-cell ${active ? 'active' : ''}" data-align="${cell}" title="${cell.replace('-', ' ')}"><span></span></button>`
      }).join('')
    }).join('')

    return `
      <div class="pp-section">
        <div class="pp-label">${this.escapeHtml(category.label)}</div>
        <div class="pp-align-grid">
          ${gridHtml}
        </div>
      </div>
    `
  }

  /**
   * Render a row of boolean toggles
   */
  private renderToggleRow(props: ExtractedProperty[]): string {
    return `
      <div class="pp-toggle-row">
        ${props.map(prop => this.renderToggleButton(prop)).join('')}
      </div>
    `
  }

  /**
   * Render a single toggle button
   */
  private renderToggleButton(prop: ExtractedProperty): string {
    const isActive = prop.value === 'true' || (prop.value === '' && prop.hasValue !== false)
    const tooltip = prop.description || prop.name
    const sourceClass = this.options.showSourceIndicators ? `pp-source-${prop.source}` : ''
    const iconPath = PROPERTY_ICON_PATHS[prop.name]

    const content = iconPath
      ? `<svg width="16" height="16" viewBox="0 0 16 16">${iconPath}</svg>`
      : this.getDisplayLabel(prop.name)

    return `
      <button class="pp-toggle ${isActive ? 'active' : ''} ${sourceClass} ${iconPath ? 'pp-toggle-icon' : ''}" data-prop="${this.escapeHtml(prop.name)}" data-type="boolean" title="${this.escapeHtml(tooltip)}">
        ${content}
      </button>
    `
  }

  /**
   * Render a single property
   */
  private renderProperty(prop: ExtractedProperty): string {
    const sourceClass = this.options.showSourceIndicators ? `pp-source-${prop.source}` : ''
    const emptyClass = prop.hasValue === false ? 'pp-empty-prop' : ''

    switch (prop.type) {
      case 'color':
        return this.renderColorProperty(prop, `${sourceClass} ${emptyClass}`)
      case 'boolean':
        return this.renderBooleanProperty(prop, `${sourceClass} ${emptyClass}`)
      case 'select':
        return this.renderSelectProperty(prop, `${sourceClass} ${emptyClass}`)
      default:
        return this.renderTextProperty(prop, `${sourceClass} ${emptyClass}`)
    }
  }

  /**
   * Render a color property
   */
  private renderColorProperty(prop: ExtractedProperty, sourceClass: string): string {
    const colorValue = prop.isToken ? '' : prop.value
    const displayValue = prop.value

    return `
      <div class="pp-row ${sourceClass}" data-prop="${this.escapeHtml(prop.name)}">
        <div class="pp-color-row">
          <span class="pp-color-label">${this.getDisplayLabel(prop.name)}</span>
          <input type="color" class="pp-color-swatch" value="${this.escapeHtml(colorValue)}" data-prop="${this.escapeHtml(prop.name)}">
          <input type="text" class="pp-color-input ${prop.isToken ? 'token' : ''}" value="${this.escapeHtml(displayValue)}" data-prop="${this.escapeHtml(prop.name)}" placeholder="Color" autocomplete="off">
        </div>
      </div>
    `
  }

  /**
   * Render a boolean property
   */
  private renderBooleanProperty(prop: ExtractedProperty, sourceClass: string): string {
    const isActive = prop.value === 'true' || (prop.value === '' && prop.hasValue !== false)
    const tooltip = prop.description || prop.name

    return `
      <div class="pp-row ${sourceClass}" data-prop="${this.escapeHtml(prop.name)}">
        <button class="pp-icon-btn ${isActive ? 'active' : ''}" data-prop="${this.escapeHtml(prop.name)}" data-type="boolean" title="${this.escapeHtml(tooltip)}">
          <span style="font-size: 9px;">${this.getDisplayLabel(prop.name)}</span>
        </button>
      </div>
    `
  }

  /**
   * Render a select property
   */
  private renderSelectProperty(prop: ExtractedProperty, sourceClass: string): string {
    // Use options from property schema first, then fallback to getSelectOptions
    const options = prop.options || this.getSelectOptions(prop.name)
    const tooltip = prop.description ? `title="${this.escapeHtml(prop.description)}"` : ''

    return `
      <div class="pp-row ${sourceClass}" data-prop="${this.escapeHtml(prop.name)}" ${tooltip}>
        <span class="pp-input-prefix">${this.getDisplayLabel(prop.name)}</span>
        <select class="pp-select" data-prop="${this.escapeHtml(prop.name)}">
          <option value="" ${!prop.value ? 'selected' : ''}>-</option>
          ${options.map(opt => `<option value="${opt}" ${opt === prop.value ? 'selected' : ''}>${opt}</option>`).join('')}
        </select>
      </div>
    `
  }

  /**
   * Render a text/number property
   */
  private renderTextProperty(prop: ExtractedProperty, sourceClass: string): string {
    const placeholder = prop.description || prop.name
    const tooltip = prop.description ? `title="${this.escapeHtml(prop.description)}"` : ''

    return `
      <div class="pp-row ${sourceClass}" data-prop="${this.escapeHtml(prop.name)}" ${tooltip}>
        <div class="pp-input">
          <span class="pp-input-prefix">${this.getDisplayLabel(prop.name)}</span>
          <input type="text" class="${prop.isToken ? 'token' : ''}" value="${this.escapeHtml(prop.value)}" data-prop="${this.escapeHtml(prop.name)}" placeholder="${this.escapeHtml(placeholder)}">
        </div>
      </div>
    `
  }

  /**
   * Attach event listeners to inputs
   */
  private attachEventListeners(): void {
    // Close button
    const closeBtn = this.container.querySelector('.pp-close')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.selectionManager.clearSelection()
      })
    }

    // Define as Component button
    const defineBtn = this.container.querySelector('.pp-define-btn')
    if (defineBtn) {
      defineBtn.addEventListener('click', () => {
        this.handleDefineAsComponent()
      })
    }

    // Text inputs with token autocomplete
    const textInputs = this.container.querySelectorAll('input[type="text"]')
    textInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        this.handleInputChange(e)
        // Show autocomplete when $ is typed
        const target = e.target as HTMLInputElement
        if (target.value === '$' || target.value.startsWith('$')) {
          this.showTokenAutocomplete(target)
        } else {
          this.hideTokenAutocomplete()
        }
      })
      input.addEventListener('keydown', (e) => {
        this.handleAutocompleteKeydown(e as KeyboardEvent)
      })
      input.addEventListener('blur', (e) => {
        const target = e.target as HTMLInputElement
        // Delay to allow click on autocomplete item
        // But only hide if the input is still in the DOM (not removed by re-render)
        setTimeout(() => {
          if (target.isConnected) {
            this.hideTokenAutocomplete()
          }
        }, 150)
      })
    })

    // Color inputs
    const colorInputs = this.container.querySelectorAll('input[type="color"]')
    colorInputs.forEach(input => {
      input.addEventListener('input', (e) => this.handleColorChange(e))
    })

    // Boolean buttons
    const boolButtons = this.container.querySelectorAll('[data-type="boolean"]')
    boolButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleBooleanToggle(e))
    })

    // Select inputs
    const selects = this.container.querySelectorAll('.pp-select')
    selects.forEach(select => {
      select.addEventListener('change', (e) => this.handleSelectChange(e))
    })

    // Alignment grid
    const alignCells = this.container.querySelectorAll('.pp-align-cell, .align-cell')
    alignCells.forEach(cell => {
      cell.addEventListener('click', (e) => this.handleAlignmentClick(e))
    })

    // Layout toggle group (prototype uses .toggle-btn[data-layout])
    const layoutToggles = this.container.querySelectorAll('.pp-layout-toggle, .pp-toggle-btn[data-layout], .toggle-btn[data-layout]')
    layoutToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleLayoutToggle(e))
    })

    // Gap token buttons (v2)
    const gapTokens = this.container.querySelectorAll('[data-gap-token]')
    gapTokens.forEach(token => {
      token.addEventListener('click', (e) => this.handleGapTokenClick(e))
    })

    // Wrap toggle buttons (v2)
    const wrapToggles = this.container.querySelectorAll('[data-wrap]')
    wrapToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleWrapToggle(e))
    })

    // Size constraint toggles
    const sizeToggles = this.container.querySelectorAll('.pp-size-toggle')
    sizeToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleSizeConstraintToggle(e))
    })

    // Size mode toggles (v2 hug/full)
    const sizeModeToggles = this.container.querySelectorAll('[data-size-mode]')
    sizeModeToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleSizeModeToggle(e))
    })

    // Size inputs
    const sizeInputs = this.container.querySelectorAll('.pp-size-input')
    sizeInputs.forEach(input => {
      input.addEventListener('input', (e) => this.handleInputChange(e))
    })

    // Gap input (both v1 .pp-gap-field and prototype .prop-input[data-prop="gap"])
    const gapInputs = this.container.querySelectorAll('.pp-gap-field, .pp-v2-input[data-prop="gap"], .prop-input[data-prop="gap"]')
    gapInputs.forEach(input => {
      input.addEventListener('input', (e) => this.handleInputChange(e))
    })

    // v2 inputs (generic handler for all .pp-v2-input and prototype .prop-input)
    const v2Inputs = this.container.querySelectorAll('.pp-v2-input:not([data-prop="gap"]), .prop-input:not([data-prop="gap"]):not([data-pad-dir])')
    v2Inputs.forEach(input => {
      input.addEventListener('input', (e) => this.handleInputChange(e))
    })

    // Padding token toggles (legacy)
    const padTokens = this.container.querySelectorAll('.pp-pad-token')
    padTokens.forEach(token => {
      token.addEventListener('click', (e) => this.handlePadTokenClick(e))
    })

    // Padding v2 token toggles
    const padV2Tokens = this.container.querySelectorAll('[data-pad-v2-token]')
    padV2Tokens.forEach(token => {
      token.addEventListener('click', (e) => this.handlePadV2TokenClick(e))
    })

    // Padding inputs (both legacy and prototype with data-pad-dir)
    const padInputs = this.container.querySelectorAll('.pp-pad-input, .pp-v2-input[data-pad-dir], .prop-input[data-pad-dir]')
    padInputs.forEach(input => {
      input.addEventListener('input', (e) => this.handlePadInputChange(e))
    })

    // Padding token buttons (prototype)
    const padTokenBtns = this.container.querySelectorAll('.token-btn[data-pad-token]')
    padTokenBtns.forEach(token => {
      token.addEventListener('click', (e) => this.handlePadTokenBtnClick(e))
    })

    // Expand/collapse buttons (prototype uses .expand-btn[data-expand] and .section-expand-btn)
    const prototypeExpandBtns = this.container.querySelectorAll('.expand-btn[data-expand], .section-expand-btn[data-expand]')
    prototypeExpandBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleExpandBtnClick(e))
    })

    // Legacy padding expand/collapse buttons
    const expandBtns = this.container.querySelectorAll('.pp-pad-expand, [data-pad-expand]')
    expandBtns.forEach(btn => {
      btn.addEventListener('click', () => this.togglePaddingExpand(true))
    })
    const collapseBtns = this.container.querySelectorAll('.pp-pad-collapse, [data-pad-collapse]')
    collapseBtns.forEach(btn => {
      btn.addEventListener('click', () => this.togglePaddingExpand(false))
    })

    // Font dropdown button
    const fontDropdownBtn = this.container.querySelector('[data-font-dropdown]')
    if (fontDropdownBtn) {
      fontDropdownBtn.addEventListener('click', (e) => this.showFontDropdown(e))
    }

    // Font size dropdown button
    const fontsizeDropdownBtn = this.container.querySelector('[data-fontsize-dropdown]')
    if (fontsizeDropdownBtn) {
      fontsizeDropdownBtn.addEventListener('click', (e) => this.showFontsizeDropdown(e))
    }

    // Weight dropdown button
    const weightDropdownBtn = this.container.querySelector('[data-weight-dropdown]')
    if (weightDropdownBtn) {
      weightDropdownBtn.addEventListener('click', (e) => this.showWeightDropdown(e))
    }

    // Padding dropdown buttons (exclude font, fontsize and weight dropdowns)
    const dropdownBtns = this.container.querySelectorAll('.pp-pad-dropdown:not([data-font-dropdown]):not([data-fontsize-dropdown]):not([data-weight-dropdown])')
    dropdownBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.showPaddingDropdown(e))
    })

    // Border width presets (generic pp-preset with data-border-width)
    const borderWidthPresets = this.container.querySelectorAll('.pp-preset[data-border-width]')
    borderWidthPresets.forEach(preset => {
      preset.addEventListener('click', (e) => this.handleBorderWidthPreset(e))
    })

    // Border style toggles (both legacy .pp-toggle and v2 .pp-toggle-btn)
    const borderStyleToggles = this.container.querySelectorAll('.pp-toggle[data-border-style], .pp-toggle-btn[data-border-style], .pp-layout-toggle[data-border-style]')
    borderStyleToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleBorderStyleToggle(e))
    })

    // Border color inputs (swatch and text)
    const borderColorSwatches = this.container.querySelectorAll('.pp-color-swatch[data-border-color-dir]')
    borderColorSwatches.forEach(input => {
      input.addEventListener('input', (e) => this.handleBorderColorChange(e))
    })
    const borderColorInputs = this.container.querySelectorAll('.pp-color-input[data-border-color-dir]')
    borderColorInputs.forEach(input => {
      input.addEventListener('input', (e) => this.handleBorderColorChange(e))
    })

    // Radius presets (generic pp-preset with data-radius)
    const radiusPresets = this.container.querySelectorAll('.pp-preset[data-radius]')
    radiusPresets.forEach(preset => {
      preset.addEventListener('click', (e) => this.handleRadiusPreset(e))
    })

    // Typography preset buttons (font size) - supports legacy, v2 and prototype
    const fontSizePresets = this.container.querySelectorAll('.pp-pad-token[data-font-size], .pp-token-btn[data-font-size], .token-btn[data-font-size]')
    fontSizePresets.forEach(preset => {
      preset.addEventListener('click', (e) => this.handleFontSizePreset(e))
    })

    // Radius token buttons (prototype)
    const radiusTokenBtns = this.container.querySelectorAll('.token-btn[data-radius]')
    radiusTokenBtns.forEach(token => {
      token.addEventListener('click', (e) => this.handleRadiusTokenClick(e))
    })

    // Radius corner inputs (prototype - individual corners)
    const radiusCornerInputs = this.container.querySelectorAll('.prop-input[data-radius-corner]')
    radiusCornerInputs.forEach(input => {
      input.addEventListener('input', (e) => this.handleRadiusCornerInput(e))
    })

    // Border width toggle buttons (prototype)
    const borderWidthToggles = this.container.querySelectorAll('.toggle-btn[data-border-width]')
    borderWidthToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleBorderWidthToggle(e))
    })

    // Border color swatches (prototype)
    const borderColorSwatchBtns = this.container.querySelectorAll('.color-swatch[data-border-color]')
    borderColorSwatchBtns.forEach(swatch => {
      swatch.addEventListener('click', (e) => this.handleBorderColorSwatchClick(e))
    })

    // Typography preset buttons (weight) - legacy only (v2 uses select)
    const weightPresets = this.container.querySelectorAll('.pp-pad-token[data-weight]')
    weightPresets.forEach(preset => {
      preset.addEventListener('click', (e) => this.handleWeightPreset(e))
    })

    // Text align toggles - supports legacy, v2 and prototype
    const textAlignToggles = this.container.querySelectorAll('.pp-pad-token[data-text-align], .pp-toggle-btn[data-text-align], .toggle-btn[data-text-align]')
    textAlignToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleTextAlignToggle(e))
    })

    // Text style toggles - supports legacy, v2 and prototype
    const textStyleToggles = this.container.querySelectorAll('.pp-pad-token[data-text-style], .pp-toggle-btn[data-text-style], .toggle-btn[data-text-style]')
    textStyleToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleTextStyleToggle(e))
    })

    // Select dropdowns (font, weight) - supports v2 and prototype
    const v2Selects = this.container.querySelectorAll('.pp-v2-select[data-prop], .prop-select[data-prop]')
    v2Selects.forEach(select => {
      select.addEventListener('change', (e) => this.handleV2SelectChange(e))
    })

    // Inputs with data-prop (font-size, etc.) - supports v2 and prototype
    const v2PropInputs = this.container.querySelectorAll('.pp-v2-input[data-prop], .prop-input[data-prop]')
    v2PropInputs.forEach(input => {
      input.addEventListener('change', (e) => this.handleV2InputChange(e))
    })

    // Shadow toggles
    const shadowToggles = this.container.querySelectorAll('.pp-shadow-toggle')
    shadowToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleShadowToggle(e))
    })

    // Opacity presets
    const opacityPresets = this.container.querySelectorAll('.pp-opacity-preset')
    opacityPresets.forEach(preset => {
      preset.addEventListener('click', (e) => this.handleOpacityPreset(e))
    })

    // Visibility toggles
    const visibilityToggles = this.container.querySelectorAll('.pp-visibility-toggle')
    visibilityToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleVisibilityToggle(e))
    })

    // Color swatches (legacy and prototype)
    const colorSwatches = this.container.querySelectorAll('.pp-color-swatch, .color-swatch[data-color-prop]')
    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', (e) => this.handleColorSwatchClick(e))
    })

    // Color buttons (v2)
    const colorBtns = this.container.querySelectorAll('.pp-color-btn[data-color-prop]')
    colorBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleColorBtnClick(e))
    })

    // Hover color buttons (v2)
    const hoverColorBtns = this.container.querySelectorAll('.pp-color-btn[data-hover-prop]')
    hoverColorBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleHoverColorBtnClick(e))
    })

    // Hover opacity tokens (v2)
    const hoverOpacityTokens = this.container.querySelectorAll('.pp-token-btn[data-hover-prop="hover-opacity"]')
    hoverOpacityTokens.forEach(token => {
      token.addEventListener('click', (e) => this.handleHoverOpacityTokenClick(e))
    })

    // Hover border width toggles (v2)
    const hoverBorderToggles = this.container.querySelectorAll('.pp-toggle-btn[data-hover-bor-width]')
    hoverBorderToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleHoverBorderWidthClick(e))
    })

    // Hover inputs (v2)
    const hoverInputs = this.container.querySelectorAll('.pp-v2-input[data-hover-prop]')
    hoverInputs.forEach(input => {
      input.addEventListener('change', (e) => this.handleHoverInputChange(e))
    })

    // Color pickers
    const colorPickers = this.container.querySelectorAll('.pp-color-picker')
    colorPickers.forEach(picker => {
      picker.addEventListener('input', (e) => this.handleColorPickerChange(e))
    })

    // Color triggers (click to open enhanced color picker)
    const colorTriggers = this.container.querySelectorAll('.pp-color-trigger')
    colorTriggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => this.handleColorTriggerClick(e))
    })

    // Cursor select
    const cursorSelect = this.container.querySelector('.pp-cursor-select')
    if (cursorSelect) {
      cursorSelect.addEventListener('change', (e) => this.handleSelectChange(e))
    }

    // Behavior toggle buttons
    const behaviorToggles = this.container.querySelectorAll('[data-behavior-toggle]')
    behaviorToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleBehaviorToggle(e))
    })

    // Behavior select dropdowns
    const behaviorSelects = this.container.querySelectorAll('[data-behavior-select]')
    behaviorSelects.forEach(select => {
      select.addEventListener('change', (e) => this.handleBehaviorSelect(e))
    })

    // Behavior text/number inputs
    const behaviorInputs = this.container.querySelectorAll('[data-behavior-input]')
    behaviorInputs.forEach(input => {
      input.addEventListener('change', (e) => this.handleBehaviorInput(e))
    })

    // Initialize Tom Select for dropdowns
    this.initializeTomSelect()
  }

  /**
   * Initialize Tom Select for select dropdowns
   */
  private initializeTomSelect(): void {
    // Destroy existing instances
    this.tomSelectInstances.forEach(instance => {
      instance.destroy()
    })
    this.tomSelectInstances = []

    // Find all select elements
    const selects = this.container.querySelectorAll<HTMLSelectElement>('.pp-font-input, .pp-weight-input')

    selects.forEach(select => {
      const settings: any = {
        controlInput: null, // No search input
        hideSelected: false,
        closeAfterSelect: true,
        dropdownParent: 'body',
        render: {
          option: (data: any, escape: (str: string) => string) => {
            return `<div class="tom-select-option">${escape(data.text)}</div>`
          },
          item: (data: any, escape: (str: string) => string) => {
            return `<div class="tom-select-item">${escape(data.text)}</div>`
          }
        },
        onChange: (value: string) => {
          // Trigger change event for existing handler
          const event = new Event('change', { bubbles: true })
          select.dispatchEvent(event)
        }
      }

      const instance = new TomSelect(select, settings)
      this.tomSelectInstances.push(instance)
    })
  }

  /**
   * Handle alignment grid click
   */
  private handleAlignmentClick(e: Event): void {
    const cell = (e.target as HTMLElement).closest('.pp-align-cell, .align-cell') as HTMLElement
    if (!cell || !this.currentElement) return

    const align = cell.dataset.align
    if (!align) return

    // Parse alignment: "top-left", "middle-center", etc.
    const [vertical, horizontal] = align.split('-')

    // Determine which properties to set
    let newProps: string[]
    if (vertical === 'middle' && horizontal === 'center') {
      newProps = ['center']
    } else {
      const vProp = vertical === 'top' ? 'top' : vertical === 'bottom' ? 'bottom' : 'ver-center'
      const hProp = horizontal === 'left' ? 'left' : horizontal === 'right' ? 'right' : 'hor-center'
      newProps = [vProp, hProp]
    }

    // Use direct line manipulation to handle alignment atomically
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.modifyAlignmentInLine(nodeId, newProps)

    if (result) {
      this.onCodeChange(result)
    }
  }

  /**
   * Handle layout toggle click
   */
  private handleLayoutToggle(e: Event): void {
    const toggle = (e.target as HTMLElement).closest('.pp-layout-toggle, .pp-toggle-btn[data-layout], .toggle-btn[data-layout]') as HTMLElement
    if (!toggle || !this.currentElement) return

    const layout = toggle.dataset.layout
    if (!layout) return

    // Use direct line manipulation to handle layout atomically
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.modifyLayoutInLine(nodeId, layout)

    if (result) {
      this.onCodeChange(result)
    }
  }

  /**
   * Handle gap token click (v2)
   */
  private handleGapTokenClick(e: Event): void {
    const btn = (e.target as HTMLElement).closest('[data-gap-token]') as HTMLElement
    if (!btn || !this.currentElement) return

    // Use token reference if available, otherwise use numeric value
    const tokenRef = btn.dataset.tokenRef
    const value = tokenRef || btn.dataset.gapToken
    if (!value) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.updateProperty(nodeId, 'gap', value)
    this.onCodeChange(result)
  }

  /**
   * Handle wrap toggle click (v2)
   */
  private handleWrapToggle(e: Event): void {
    const btn = (e.target as HTMLElement).closest('[data-wrap]') as HTMLElement
    if (!btn || !this.currentElement) return

    const wrapValue = btn.dataset.wrap
    if (!wrapValue) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    if (wrapValue === 'on') {
      // Add wrap property
      const result = this.codeModifier.updateProperty(nodeId, 'wrap', '')
      this.onCodeChange(result)
    } else {
      // Remove wrap property
      const result = this.codeModifier.removeProperty(nodeId, 'wrap')
      this.onCodeChange(result)
    }
  }

  /**
   * Handle expand button click (prototype)
   */
  private handleExpandBtnClick(e: Event): void {
    const btn = (e.target as HTMLElement).closest('.expand-btn[data-expand], .section-expand-btn[data-expand]') as HTMLElement
    if (!btn) return

    const expandGroup = btn.dataset.expand
    if (!expandGroup) return

    // Find the container and toggle expanded state
    const container = this.container.querySelector(`[data-expand-container="${expandGroup}"]`)
    if (container) {
      container.classList.toggle('expanded')

      // Also toggle on parent .section for CSS purposes
      const section = container.closest('.section')
      if (section) {
        section.classList.toggle('expanded')
      }
    }
  }

  /**
   * Handle padding token button click (prototype)
   */
  private handlePadTokenBtnClick(e: Event): void {
    const btn = (e.target as HTMLElement).closest('.token-btn[data-pad-token]') as HTMLElement
    if (!btn || !this.currentElement) return

    // Use token reference if available, otherwise use numeric value
    const tokenRef = btn.dataset.tokenRef
    const value = tokenRef || btn.dataset.padToken
    const dir = btn.dataset.padDir
    if (!value || !dir) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    // Get current padding values
    const props = this.propertyExtractor?.getProperties(nodeId)
    const padProp = props?.allProperties.find((p: {name: string}) => p.name === 'padding' || p.name === 'pad' || p.name === 'p')
    const currentValue = padProp?.value || ''
    const padParts = currentValue.split(/\s+/).filter(Boolean)

    let tPad = '', rPad = '', bPad = '', lPad = ''
    if (padParts.length === 1) {
      tPad = rPad = bPad = lPad = padParts[0]
    } else if (padParts.length === 2) {
      tPad = bPad = padParts[0]
      rPad = lPad = padParts[1]
    } else if (padParts.length === 4) {
      tPad = padParts[0]; rPad = padParts[1]; bPad = padParts[2]; lPad = padParts[3]
    }

    // Update based on direction
    if (dir === 'h') { rPad = lPad = value }
    else if (dir === 'v') { tPad = bPad = value }
    else if (dir === 't') { tPad = value }
    else if (dir === 'r') { rPad = value }
    else if (dir === 'b') { bPad = value }
    else if (dir === 'l') { lPad = value }

    // Build new padding value
    let newPadValue: string
    if (tPad === rPad && rPad === bPad && bPad === lPad) {
      newPadValue = tPad || '0'
    } else if (tPad === bPad && rPad === lPad) {
      newPadValue = `${tPad || '0'} ${rPad || '0'}`
    } else {
      newPadValue = `${tPad || '0'} ${rPad || '0'} ${bPad || '0'} ${lPad || '0'}`
    }

    const result = this.codeModifier.updateProperty(nodeId, 'pad', newPadValue)
    this.onCodeChange(result)
  }

  /**
   * Handle radius token click (prototype)
   */
  private handleRadiusTokenClick(e: Event): void {
    const btn = (e.target as HTMLElement).closest('.token-btn[data-radius]') as HTMLElement
    if (!btn || !this.currentElement) return

    // Use token reference if available, otherwise use numeric value
    const tokenRef = btn.dataset.tokenRef
    const value = tokenRef || btn.dataset.radius
    if (!value) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.updateProperty(nodeId, 'rad', value)
    this.onCodeChange(result)
  }

  /**
   * Handle radius corner input change (prototype - individual corners)
   */
  private handleRadiusCornerInput(e: Event): void {
    const input = e.target as HTMLInputElement
    if (!input || !this.currentElement) return

    const corner = input.dataset.radiusCorner
    if (!corner) return

    const value = input.value.trim()

    // Validate numeric input
    if (!this.validatePropertyValue('radius', value, input)) {
      return
    }

    // For now, individual corners update the single radius value
    // TODO: Support per-corner radius syntax if DSL supports it
    this.debounce('radius', () => {
      const nodeId = this.currentElement!.templateId || this.currentElement!.nodeId
      const result = this.codeModifier.updateProperty(nodeId, 'rad', value)
      this.onCodeChange(result)
    })
  }

  /**
   * Handle border width toggle click (prototype)
   */
  private handleBorderWidthToggle(e: Event): void {
    const btn = (e.target as HTMLElement).closest('.toggle-btn[data-border-width]') as HTMLElement
    if (!btn || !this.currentElement) return

    const width = btn.dataset.borderWidth
    if (width === undefined) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    if (width === '0') {
      // Remove border
      const result = this.codeModifier.removeProperty(nodeId, 'bor')
      this.onCodeChange(result)
    } else {
      // Set border width (default color #333)
      const result = this.codeModifier.updateProperty(nodeId, 'bor', `${width} #333`)
      this.onCodeChange(result)
    }
  }

  /**
   * Handle border color swatch click (prototype)
   */
  private handleBorderColorSwatchClick(e: Event): void {
    const btn = (e.target as HTMLElement).closest('.color-swatch[data-border-color]') as HTMLElement
    if (!btn || !this.currentElement) return

    const color = btn.dataset.borderColor
    if (!color) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    // Get current border value and update color
    const props = this.propertyExtractor?.getProperties(nodeId)
    const borderProp = props?.allProperties.find((p: {name: string}) => p.name === 'border' || p.name === 'bor')
    const currentValue = borderProp?.value || '1'
    const parts = currentValue.split(/\s+/).filter(Boolean)
    const width = parts[0] || '1'

    const result = this.codeModifier.updateProperty(nodeId, 'bor', `${width} ${color}`)
    this.onCodeChange(result)
  }

  /**
   * Handle size mode toggle click (v2 hug/full)
   */
  private handleSizeModeToggle(e: Event): void {
    const btn = (e.target as HTMLElement).closest('[data-size-mode]') as HTMLElement
    if (!btn || !this.currentElement) return

    const mode = btn.dataset.sizeMode
    if (!mode) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    // Parse mode: "width-hug", "width-full", "height-hug", "height-full"
    const [prop, value] = mode.split('-')

    const result = this.codeModifier.updateProperty(nodeId, prop, value)
    this.onCodeChange(result)
  }

  /**
   * Handle size constraint toggle click (min-width, max-width, etc.)
   */
  private handleSizeConstraintToggle(e: Event): void {
    const toggle = (e.target as HTMLElement).closest('.pp-size-toggle') as HTMLElement
    if (!toggle || !this.currentElement) return

    const constraint = toggle.dataset.sizeConstraint
    if (!constraint) return

    const isActive = toggle.classList.contains('active')
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    if (isActive) {
      // Remove the constraint property
      const result = this.codeModifier.removeProperty(nodeId, constraint)
      this.onCodeChange(result)
    } else {
      // Add the constraint with current width/height value as default
      const isWidth = constraint.includes('width')
      const baseProp = isWidth ? 'width' : 'height'
      const baseInput = this.container.querySelector(`.pp-size-input[data-prop="${baseProp}"]`) as HTMLInputElement
      const baseValue = baseInput?.value || '100'

      const result = this.codeModifier.updateProperty(nodeId, constraint, baseValue)
      this.onCodeChange(result)
    }
  }

  /**
   * Handle padding token click
   */
  private handlePadTokenClick(e: Event): void {
    const btn = (e.target as HTMLElement).closest('.pp-pad-token') as HTMLElement
    if (!btn || !this.currentElement) return

    const tokenName = btn.dataset.padToken // Token name without $ (e.g., "sm.pad")
    const dir = btn.dataset.padDir
    if (!tokenName || !dir) return

    // Check if clicking on already active token - deselect it
    const isActive = btn.classList.contains('active')

    // Token reference with $ prefix for code (e.g., "$s.pad")
    const tokenRef = `$${tokenName}`

    // Get current padding values from token refs or input values
    const vInput = this.container.querySelector('.pp-pad-input[data-pad-dir="v"]') as HTMLInputElement
    const hInput = this.container.querySelector('.pp-pad-input[data-pad-dir="h"]') as HTMLInputElement

    // Get current values - prefer token ref, then input value
    let vVal = vInput?.dataset.tokenRef || vInput?.value || '0'
    let hVal = hInput?.dataset.tokenRef || hInput?.value || '0'

    // Update the appropriate direction
    if (dir === 'v') {
      vVal = isActive ? (this.resolveTokenValue(tokenName) || '0') : tokenRef
    } else if (dir === 'h') {
      hVal = isActive ? (this.resolveTokenValue(tokenName) || '0') : tokenRef
    }

    // Build padding value
    const padValue = vVal === hVal ? vVal : `${vVal} ${hVal}`

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.updateProperty(nodeId, 'pad', padValue)
    this.onCodeChange(result)
  }

  /**
   * Handle padding v2 token click
   */
  private handlePadV2TokenClick(e: Event): void {
    const btn = (e.target as HTMLElement).closest('[data-pad-v2-token]') as HTMLElement
    if (!btn || !this.currentElement) return

    const value = btn.dataset.padV2Token
    const dir = btn.dataset.padDir
    if (!value || !dir) return

    // Get current padding values from v2 inputs
    const vInput = this.container.querySelector('.pp-v2-input[data-pad-dir="v"]') as HTMLInputElement
    const hInput = this.container.querySelector('.pp-v2-input[data-pad-dir="h"]') as HTMLInputElement

    let vVal = vInput?.value || '0'
    let hVal = hInput?.value || '0'

    // Update the appropriate direction
    if (dir === 'v') {
      vVal = value
    } else if (dir === 'h') {
      hVal = value
    } else if (dir === 't' || dir === 'b') {
      vVal = value
    } else if (dir === 'r' || dir === 'l') {
      hVal = value
    }

    // Build padding value
    const padValue = vVal === hVal ? vVal : `${vVal} ${hVal}`

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.updateProperty(nodeId, 'pad', padValue)
    this.onCodeChange(result)
  }

  /**
   * Handle padding input change
   */
  private handlePadInputChange(e: Event): void {
    const input = e.target as HTMLInputElement
    if (!input || !this.currentElement) return

    const dir = input.dataset.padDir
    if (!dir) return

    const value = input.value.trim()

    // Validate numeric input
    if (!this.validatePropertyValue('padding', value, input)) {
      // Invalid - don't update, just show visual feedback
      return
    }

    this.debounce('padding', () => {
      this.updatePaddingFromInputs()
    })
  }

  /**
   * Get padding value from input - uses token ref if present, otherwise input value
   */
  private getPadValueFromInput(input: HTMLInputElement | null): string {
    if (!input) return '0'
    // If input has a token reference and is readonly, use the token
    const tokenRef = input.dataset.tokenRef
    if (tokenRef && input.readOnly) {
      return tokenRef
    }
    // Otherwise use the input value
    return input.value || '0'
  }

  /**
   * Update padding from current input values (supports both legacy and v2 inputs)
   */
  private updatePaddingFromInputs(): void {
    if (!this.currentElement) return

    const spacingGroup = this.container.querySelector('.pp-spacing-group') as HTMLElement
    const isExpanded = spacingGroup?.dataset.expanded === 'true'

    // Helper to get input value (legacy or v2)
    const getInput = (dir: string) => {
      return (this.container.querySelector(`.pp-pad-input[data-pad-dir="${dir}"]`) ||
              this.container.querySelector(`.pp-v2-input[data-pad-dir="${dir}"]`)) as HTMLInputElement
    }

    let padValue: string

    if (isExpanded) {
      // Get T, R, B, L values (respecting token refs)
      const t = this.getPadValueFromInput(getInput('t'))
      const r = this.getPadValueFromInput(getInput('r'))
      const b = this.getPadValueFromInput(getInput('b'))
      const l = this.getPadValueFromInput(getInput('l'))

      // Simplify if possible
      if (t === b && r === l && t === r) {
        padValue = t
      } else if (t === b && r === l) {
        padValue = `${t} ${r}`
      } else {
        padValue = `${t} ${r} ${b} ${l}`
      }
    } else {
      // Get V and H values (respecting token refs)
      const v = this.getPadValueFromInput(getInput('v'))
      const h = this.getPadValueFromInput(getInput('h'))

      padValue = v === h ? v : `${v} ${h}`
    }

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.updateProperty(nodeId, 'pad', padValue)
    this.onCodeChange(result)
  }

  /**
   * Toggle padding expand/collapse
   */
  private togglePaddingExpand(expand: boolean): void {
    const spacingGroup = this.container.querySelector('.pp-spacing-group') as HTMLElement
    const compact = this.container.querySelector('.pp-spacing-compact') as HTMLElement
    const expanded = this.container.querySelector('.pp-spacing-expanded') as HTMLElement

    if (!spacingGroup || !compact || !expanded) return

    spacingGroup.dataset.expanded = expand ? 'true' : 'false'
    compact.style.display = expand ? 'none' : 'flex'
    expanded.style.display = expand ? 'flex' : 'none'
  }

  /**
   * Toggle border expand/collapse (T/R/B/L)
   */
  private toggleBorderExpand(expand: boolean): void {
    const borderGroup = this.container.querySelector('.pp-border-group') as HTMLElement
    const compact = this.container.querySelector('.pp-border-compact') as HTMLElement
    const expanded = this.container.querySelector('.pp-border-expanded') as HTMLElement

    if (!borderGroup || !compact || !expanded) return

    borderGroup.dataset.expanded = expand ? 'true' : 'false'
    compact.style.display = expand ? 'none' : 'block'
    expanded.style.display = expand ? 'block' : 'none'
  }

  /**
   * Show padding dropdown with dynamic token values
   */
  private showPaddingDropdown(e: Event): void {
    const btn = e.target as HTMLElement
    const dir = btn.dataset.padDir
    if (!dir) return

    // Remove existing dropdown
    const existing = this.container.querySelector('.pp-pad-dropdown-menu')
    if (existing) existing.remove()

    // Get dynamic tokens from source
    const tokens = this.getPaddingTokens()

    // Create dropdown
    const dropdown = document.createElement('div')
    dropdown.className = 'pp-pad-dropdown-menu'

    if (tokens.length > 0) {
      // Show tokens with names and values
      dropdown.innerHTML = tokens.map(token =>
        `<button class="pp-pad-preset pp-token-preset" data-value="${token.value}" data-token-ref="$${token.fullName}">
          <span class="pp-token-name">${token.name}</span>
          <span class="pp-token-value">${token.value}</span>
        </button>`
      ).join('') + `<div class="pp-dropdown-divider"></div>` +
        this.PADDING_PRESETS.map(val =>
          `<button class="pp-pad-preset pp-numeric-preset" data-value="${val}">${val}</button>`
        ).join('')
    } else {
      // Fallback to numeric presets
      dropdown.innerHTML = this.PADDING_PRESETS.map(val =>
        `<button class="pp-pad-preset" data-value="${val}">${val}</button>`
      ).join('')
    }

    // Position below button
    const rect = btn.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()
    dropdown.style.position = 'absolute'
    dropdown.style.top = `${rect.bottom - containerRect.top + 4}px`
    dropdown.style.left = `${rect.left - containerRect.left}px`

    this.container.style.position = 'relative'
    this.container.appendChild(dropdown)

    // Handle clicks
    dropdown.addEventListener('click', (ev) => {
      const preset = (ev.target as HTMLElement).closest('.pp-pad-preset') as HTMLElement
      if (preset) {
        const value = preset.dataset.value
        const tokenRef = preset.dataset.tokenRef
        const input = this.container.querySelector(`.pp-pad-input[data-pad-dir="${dir}"]`) as HTMLInputElement
        if (input && value) {
          input.value = value
          if (tokenRef) {
            // Token selected - store reference and make readonly
            input.dataset.tokenRef = tokenRef
            input.readOnly = true
            input.classList.add('pp-token-bound')
          } else {
            // Numeric value selected - clear token binding
            delete input.dataset.tokenRef
            input.readOnly = false
            input.classList.remove('pp-token-bound')
          }
          this.updatePaddingFromInputs()
        }
        dropdown.remove()
      }
    })

    // Close on outside click (with cleanup tracking)
    const closeDropdown = (ev: MouseEvent) => {
      if (!dropdown.contains(ev.target as Node)) {
        dropdown.remove()
        document.removeEventListener('click', closeDropdown)
        this.activeDropdownCloseHandlers.delete(closeDropdown)
      }
    }
    this.activeDropdownCloseHandlers.add(closeDropdown)
    requestAnimationFrame(() => document.addEventListener('click', closeDropdown))
  }

  /**
   * Show font dropdown with Google Fonts
   */
  private showFontDropdown(e: Event): void {
    const btn = e.target as HTMLElement
    if (!this.currentElement) return

    // Remove existing dropdown
    const existing = this.container.querySelector('.pp-pad-dropdown-menu')
    if (existing) existing.remove()

    // Get current font value
    const fontInput = this.container.querySelector('.pp-font-input') as HTMLInputElement
    const currentFont = fontInput?.value || ''

    // Create dropdown
    const dropdown = document.createElement('div')
    dropdown.className = 'pp-pad-dropdown-menu pp-font-dropdown-menu'
    dropdown.innerHTML = this.GOOGLE_FONTS.map(font =>
      `<button class="pp-pad-preset pp-font-preset ${font === currentFont ? 'active' : ''}" data-font="${font}" style="font-family: '${font}', sans-serif">${font}</button>`
    ).join('')

    // Position below button
    const rect = btn.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()
    dropdown.style.position = 'absolute'
    dropdown.style.top = `${rect.bottom - containerRect.top + 4}px`
    dropdown.style.right = `${containerRect.right - rect.right}px`

    this.container.style.position = 'relative'
    this.container.appendChild(dropdown)

    // Handle clicks
    dropdown.addEventListener('click', (ev) => {
      const preset = (ev.target as HTMLElement).closest('.pp-font-preset') as HTMLElement
      if (preset) {
        const font = preset.dataset.font
        if (font && fontInput) {
          fontInput.value = font
          const nodeId = this.currentElement!.templateId || this.currentElement!.nodeId
          const result = this.codeModifier.updateProperty(nodeId, 'font', font)
          this.onCodeChange(result)
        }
        dropdown.remove()
      }
    })

    // Close on outside click (with cleanup tracking)
    const closeFontDropdown = (ev: MouseEvent) => {
      if (!dropdown.contains(ev.target as Node)) {
        dropdown.remove()
        document.removeEventListener('click', closeFontDropdown)
        this.activeDropdownCloseHandlers.delete(closeFontDropdown)
      }
    }
    this.activeDropdownCloseHandlers.add(closeFontDropdown)
    requestAnimationFrame(() => document.addEventListener('click', closeFontDropdown))
  }

  /**
   * Show font size dropdown
   */
  private showFontsizeDropdown(e: Event): void {
    const btn = e.target as HTMLElement
    if (!this.currentElement) return

    // Remove existing dropdown
    const existing = this.container.querySelector('.pp-pad-dropdown-menu')
    if (existing) existing.remove()

    // Get current font size value
    const fontsizeInput = this.container.querySelector('.pp-fontsize-input') as HTMLInputElement
    const currentFontsize = fontsizeInput?.value || ''

    // Font size options
    const sizes = ['11', '12', '14', '16', '18', '20', '24', '32', '48']

    // Create dropdown
    const dropdown = document.createElement('div')
    dropdown.className = 'pp-pad-dropdown-menu pp-fontsize-dropdown-menu'
    dropdown.innerHTML = sizes.map(size =>
      `<button class="pp-pad-preset pp-fontsize-preset ${size === currentFontsize ? 'active' : ''}" data-fontsize="${size}">${size}</button>`
    ).join('')

    // Position below button
    const rect = btn.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()
    dropdown.style.position = 'absolute'
    dropdown.style.top = `${rect.bottom - containerRect.top + 4}px`
    dropdown.style.right = `${containerRect.right - rect.right}px`

    this.container.style.position = 'relative'
    this.container.appendChild(dropdown)

    // Handle clicks
    dropdown.addEventListener('click', (ev) => {
      const preset = (ev.target as HTMLElement).closest('.pp-fontsize-preset') as HTMLElement
      if (preset) {
        const size = preset.dataset.fontsize
        if (size && fontsizeInput) {
          fontsizeInput.value = size
          const nodeId = this.currentElement!.templateId || this.currentElement!.nodeId
          const result = this.codeModifier.updateProperty(nodeId, 'font-size', size)
          this.onCodeChange(result)
        }
        dropdown.remove()
      }
    })

    // Close on outside click (with cleanup tracking)
    const closeFontsizeDropdown = (ev: MouseEvent) => {
      if (!dropdown.contains(ev.target as Node)) {
        dropdown.remove()
        document.removeEventListener('click', closeFontsizeDropdown)
        this.activeDropdownCloseHandlers.delete(closeFontsizeDropdown)
      }
    }
    this.activeDropdownCloseHandlers.add(closeFontsizeDropdown)
    requestAnimationFrame(() => document.addEventListener('click', closeFontsizeDropdown))
  }

  /**
   * Show weight dropdown
   */
  private showWeightDropdown(e: Event): void {
    const btn = e.target as HTMLElement
    if (!this.currentElement) return

    // Remove existing dropdown
    const existing = this.container.querySelector('.pp-pad-dropdown-menu')
    if (existing) existing.remove()

    // Get current weight value
    const weightInput = this.container.querySelector('.pp-weight-input') as HTMLInputElement
    const currentWeight = weightInput?.value || ''

    // Weight options
    const weights = ['300', '400', '500', '600', '700']

    // Create dropdown
    const dropdown = document.createElement('div')
    dropdown.className = 'pp-pad-dropdown-menu pp-weight-dropdown-menu'
    dropdown.innerHTML = weights.map(weight =>
      `<button class="pp-pad-preset pp-weight-preset ${weight === currentWeight ? 'active' : ''}" data-weight="${weight}">${weight}</button>`
    ).join('')

    // Position below button
    const rect = btn.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()
    dropdown.style.position = 'absolute'
    dropdown.style.top = `${rect.bottom - containerRect.top + 4}px`
    dropdown.style.right = `${containerRect.right - rect.right}px`

    this.container.style.position = 'relative'
    this.container.appendChild(dropdown)

    // Handle clicks
    dropdown.addEventListener('click', (ev) => {
      const preset = (ev.target as HTMLElement).closest('.pp-weight-preset') as HTMLElement
      if (preset) {
        const weight = preset.dataset.weight
        if (weight && weightInput) {
          weightInput.value = weight
          const nodeId = this.currentElement!.templateId || this.currentElement!.nodeId
          const result = this.codeModifier.updateProperty(nodeId, 'weight', weight)
          this.onCodeChange(result)
        }
        dropdown.remove()
      }
    })

    // Close on outside click (with cleanup tracking)
    const closeWeightDropdown = (ev: MouseEvent) => {
      if (!dropdown.contains(ev.target as Node)) {
        dropdown.remove()
        document.removeEventListener('click', closeWeightDropdown)
        this.activeDropdownCloseHandlers.delete(closeWeightDropdown)
      }
    }
    this.activeDropdownCloseHandlers.add(closeWeightDropdown)
    requestAnimationFrame(() => document.addEventListener('click', closeWeightDropdown))
  }

  /**
   * Modify layout properties directly in the source line
   * Removes existing layout modes and adds the new one
   */
  private modifyLayoutInLine(nodeId: string, newLayout: string): ModificationResult | null {
    const nodeMapping = this.codeModifier.getSourceMap().getNodeById(nodeId)
    if (!nodeMapping) return null

    const source = this.codeModifier.getSource()
    const lines = source.split('\n')
    const lineIndex = nodeMapping.position.line - 1
    let line = lines[lineIndex]
    if (!line) return null

    // All layout keywords to remove (full and short forms) - only mutually exclusive modes
    const layoutKeywords = [
      '\\bhorizontal\\b', '\\bhor\\b',
      '\\bvertical\\b', '\\bver\\b',
      '\\bstacked\\b', '\\bgrid\\b',
      '\\babsolute\\b', '\\babs\\b'
    ]

    // Also remove x and y when switching away from absolute
    const positionKeywords = [
      'x\\s+\\d+', 'y\\s+\\d+'
    ]

    // Remove existing layout keywords
    for (const keyword of layoutKeywords) {
      line = line.replace(new RegExp(`,?\\s*${keyword}\\s*,?`, 'g'), (match) => {
        if (match.startsWith(',') && match.endsWith(',')) {
          return ', '
        }
        return ''
      })
    }

    // Also remove x/y position properties (absolute positioning disabled)
    for (const keyword of positionKeywords) {
      line = line.replace(new RegExp(`,?\\s*${keyword}\\s*,?`, 'g'), (match) => {
        if (match.startsWith(',') && match.endsWith(',')) {
          return ', '
        }
        return ''
      })
    }

    // Clean up commas
    line = line.replace(/,\s*,/g, ',')
    line = line.replace(/,\s*$/g, '')
    line = line.replace(/,\s*(\n|$)/g, '$1')

    // Don't add 'vertical' if it's the default (no layout keyword means vertical)
    if (newLayout !== 'vertical') {
      line = line.trimEnd() + ', ' + newLayout
    }

    lines[lineIndex] = line
    const newSource = lines.join('\n')

    // Calculate character offsets
    let fromOffset = 0
    for (let i = 0; i < lineIndex; i++) {
      fromOffset += source.split('\n')[i].length + 1
    }
    const toOffset = fromOffset + source.split('\n')[lineIndex].length

    return {
      success: true,
      newSource,
      change: {
        from: fromOffset,
        to: toOffset,
        insert: line
      }
    }
  }

  /**
   * Modify alignment properties directly in the source line
   * This handles all alignment changes atomically to avoid position corruption
   */
  private modifyAlignmentInLine(nodeId: string, newProps: string[]): ModificationResult | null {
    const nodeMapping = this.codeModifier.getSourceMap().getNodeById(nodeId)
    if (!nodeMapping) return null

    const source = this.codeModifier.getSource()
    const lines = source.split('\n')
    const lineIndex = nodeMapping.position.line - 1
    let line = lines[lineIndex]
    if (!line) return null

    // All alignment keywords to remove
    const alignKeywords = ['\\btop\\b', '\\bbottom\\b', '\\bver-center\\b', '\\bleft\\b', '\\bright\\b', '\\bhor-center\\b', '\\bcenter\\b']

    // Remove existing alignment keywords (with surrounding comma/space cleanup)
    for (const keyword of alignKeywords) {
      // Match keyword with optional leading comma/space and trailing comma/space
      line = line.replace(new RegExp(`,?\\s*${keyword}\\s*,?`, 'g'), (match, offset, str) => {
        // If we're in the middle (had commas on both sides), keep one comma
        if (match.startsWith(',') && match.endsWith(',')) {
          return ', '
        }
        // Otherwise just remove
        return ''
      })
    }

    // Clean up any double commas or trailing commas before newline
    line = line.replace(/,\s*,/g, ',')
    line = line.replace(/,\s*$/g, '')
    line = line.replace(/,\s*(\n|$)/g, '$1')

    // Find where to insert the new properties (after last existing property, before children)
    // Look for the end of the component line (before any text content or end of line)
    const insertProps = newProps.join(', ')

    // If line has content, add comma and properties
    // Check if line ends with properties (not just component name)
    if (line.includes(',') || line.match(/\w+\s+\d+/) || line.match(/\w+\s+\w+/)) {
      // Has properties, add comma before new ones
      line = line.trimEnd() + ', ' + insertProps
    } else {
      // Just component name, add properties with comma
      line = line.trimEnd() + ', ' + insertProps
    }

    lines[lineIndex] = line
    const newSource = lines.join('\n')

    // Calculate the character offset for the line
    let fromOffset = 0
    for (let i = 0; i < lineIndex; i++) {
      fromOffset += source.split('\n')[i].length + 1 // +1 for newline
    }
    const toOffset = fromOffset + source.split('\n')[lineIndex].length

    return {
      success: true,
      newSource,
      change: {
        from: fromOffset,
        to: toOffset,
        insert: line
      }
    }
  }

  /**
   * Validate a property value
   * Returns true if valid, false otherwise
   */
  private validatePropertyValue(propName: string, value: string, input?: HTMLInputElement): boolean {
    const validationType = PropertyPanel.PROPERTY_VALIDATION_TYPE[propName]
    if (!validationType) {
      // No validation defined, allow anything
      return true
    }

    const rule = PropertyPanel.VALIDATION_RULES[validationType]
    if (!rule) return true

    // Allow empty if permitted
    if (value === '' && rule.allowEmpty) {
      if (input) {
        input.classList.remove('invalid')
        input.title = ''
      }
      return true
    }

    const isValid = rule.pattern.test(value.trim())

    if (input) {
      if (isValid) {
        input.classList.remove('invalid')
        input.title = ''
      } else {
        input.classList.add('invalid')
        input.title = rule.message
      }
    }

    return isValid
  }

  /**
   * Handle text input changes
   */
  private handleInputChange(e: Event): void {
    const input = e.target as HTMLInputElement
    const propName = input.dataset.prop
    if (!propName || !this.currentElement) return

    const value = input.value.trim()

    // Validate input
    if (!this.validatePropertyValue(propName, value, input)) {
      // Invalid - don't update, just show visual feedback
      return
    }

    // Debounce
    this.debounce(propName, () => {
      this.updateProperty(propName, value)
    })
  }

  /**
   * Handle color picker changes
   */
  private handleColorChange(e: Event): void {
    const input = e.target as HTMLInputElement
    const propName = input.dataset.prop
    if (!propName || !this.currentElement) return

    // Update the text input as well
    const textInput = this.container.querySelector(`input[type="text"][data-prop="${propName}"]`) as HTMLInputElement
    if (textInput) {
      textInput.value = input.value
      textInput.classList.remove('token')
    }

    // No debounce for color picker
    this.updateProperty(propName, input.value)
  }

  /**
   * Handle "Define as Component" button click
   *
   * Extracts inline properties to a component definition in components.mirror
   */
  private handleDefineAsComponent(): void {
    if (!this.currentElement || !this.options.filesAccess) {
      console.warn('PropertyPanel: Cannot define as component - missing element or filesAccess')
      return
    }

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    const result = this.codeModifier.extractToComponentFile(
      nodeId,
      this.options.filesAccess
    )

    if (result.success) {
      // 1. Save the components.mirror file
      this.options.filesAccess.setFile(
        result.componentFileChange.path,
        result.componentFileChange.content
      )

      // 2. Apply the change to the current file
      this.onCodeChange({
        success: true,
        newSource: '', // Not used when change is provided
        change: result.currentFileChange,
      })

      console.log(
        'PropertyPanel: Component extracted to',
        result.componentFileChange.path,
        result.importAdded ? '(import added)' : ''
      )
    } else {
      console.warn('PropertyPanel: Failed to extract component:', result.error)
    }
  }

  /**
   * Handle boolean button toggle
   */
  private handleBooleanToggle(e: Event): void {
    const btn = e.target as HTMLElement
    const button = btn.closest('[data-type="boolean"]') as HTMLElement
    if (!button) return

    const propName = button.dataset.prop
    if (!propName || !this.currentElement) return

    const isActive = button.classList.contains('active')
    button.classList.toggle('active')

    // Use template ID for template instances
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    if (isActive) {
      // Remove the property
      const result = this.codeModifier.removeProperty(nodeId, propName)
      this.onCodeChange(result)
    } else {
      // Add the property
      this.updateProperty(propName, 'true')
    }
  }

  /**
   * Handle select changes
   */
  private handleSelectChange(e: Event): void {
    const select = e.target as HTMLSelectElement
    const propName = select.dataset.prop
    if (!propName || !this.currentElement) return

    this.updateProperty(propName, select.value)
  }

  /**
   * Handle border width preset click
   */
  private handleBorderWidthPreset(e: Event): void {
    const preset = (e.target as HTMLElement).closest('.pp-preset[data-border-width]') as HTMLElement
    if (!preset || !this.currentElement) return

    const width = preset.dataset.borderWidth
    if (width === undefined) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    if (width === '0') {
      // Remove border
      const result = this.codeModifier.removeProperty(nodeId, 'bor')
      this.onCodeChange(result)
    } else {
      // Get current style and color
      const colorInput = this.container.querySelector('.pp-color-input[data-prop="border-color"]') as HTMLInputElement
      const color = colorInput?.value || '#333'

      // Find active style
      const activeStyle = this.container.querySelector('.pp-toggle[data-border-style].active, .pp-toggle-btn[data-border-style].active, .pp-layout-toggle[data-border-style].active') as HTMLElement
      const style = activeStyle?.dataset.borderStyle || 'solid'

      // Build border value
      const borderValue = style === 'solid' ? `${width} ${color}` : `${width} ${style} ${color}`

      const result = this.codeModifier.updateProperty(nodeId, 'bor', borderValue)
      this.onCodeChange(result)
    }
  }

  /**
   * Handle border style toggle click
   */
  private handleBorderStyleToggle(e: Event): void {
    const toggle = (e.target as HTMLElement).closest('.pp-toggle[data-border-style], .pp-toggle-btn[data-border-style], .pp-layout-toggle[data-border-style]') as HTMLElement
    if (!toggle || !this.currentElement) return

    const style = toggle.dataset.borderStyle
    if (!style) return

    // Get current border value to preserve width and color
    const widthInput = this.container.querySelector('.pp-input[data-prop="border-width"]') as HTMLInputElement
    const colorInput = this.container.querySelector('.pp-color-input[data-prop="border-color"]') as HTMLInputElement

    const width = widthInput?.value || '1'
    const color = colorInput?.value || '#333'

    // Build new border value
    const borderValue = style === 'solid' ? `${width} ${color}` : `${width} ${style} ${color}`

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.updateProperty(nodeId, 'bor', borderValue)
    this.onCodeChange(result)
  }

  /**
   * Handle border color change (individual sides)
   */
  private handleBorderColorChange(e: Event): void {
    const input = e.target as HTMLInputElement
    const dir = input.dataset.borderColorDir
    if (!dir || !this.currentElement) return

    const color = input.value

    // Sync color swatch and text input
    const row = input.closest('.pp-color-row')
    if (row) {
      const swatch = row.querySelector('.pp-color-swatch') as HTMLInputElement
      const textInput = row.querySelector('.pp-color-input') as HTMLInputElement
      if (swatch && swatch !== input) swatch.value = color.startsWith('#') ? color : '#333333'
      if (textInput && textInput !== input) textInput.value = color
    }

    // Get width and style from this row
    const line = input.closest('.pp-pad-line')
    const widthInput = line?.querySelector('.pp-pad-input[data-border-dir]') as HTMLInputElement
    const activeStyle = line?.querySelector('.pp-layout-toggle.active[data-border-style], .pp-toggle-btn.active[data-border-style]') as HTMLElement

    const width = widthInput?.value || '1'
    const style = activeStyle?.dataset.borderStyle || 'solid'

    // Build border value
    const borderValue = style === 'solid' ? `${width} ${color}` : `${width} ${style} ${color}`

    // Determine property name based on direction
    const propMap: Record<string, string> = {
      't': 'bor-t',
      'r': 'bor-r',
      'b': 'bor-b',
      'l': 'bor-l'
    }
    const propName = propMap[dir] || 'bor'

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.updateProperty(nodeId, propName, borderValue)
    this.onCodeChange(result)
  }

  /**
   * Handle radius preset click
   */
  private handleRadiusPreset(e: Event): void {
    const preset = (e.target as HTMLElement).closest('.pp-preset[data-radius]') as HTMLElement
    if (!preset || !this.currentElement) return

    const radius = preset.dataset.radius
    if (!radius) return

    // Value is already converted in the preset (full → 9999)
    const radiusValue = radius

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    if (radiusValue === '0') {
      // Remove radius property when set to 0
      const result = this.codeModifier.removeProperty(nodeId, 'rad')
      this.onCodeChange(result)
    } else {
      const result = this.codeModifier.updateProperty(nodeId, 'rad', radiusValue)
      this.onCodeChange(result)
    }
  }

  /**
   * Handle font size preset click - reuses pp-pad-token
   */
  private handleFontSizePreset(e: Event): void {
    const preset = (e.target as HTMLElement).closest('.pp-pad-token[data-font-size], .pp-token-btn[data-font-size], .token-btn[data-font-size]') as HTMLElement
    if (!preset || !this.currentElement) return

    const size = preset.dataset.fontSize
    if (!size) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.updateProperty(nodeId, 'font-size', size)
    this.onCodeChange(result)
  }

  /**
   * Handle weight preset click - reuses pp-pad-token
   */
  private handleWeightPreset(e: Event): void {
    const preset = (e.target as HTMLElement).closest('.pp-pad-token[data-weight]') as HTMLElement
    if (!preset || !this.currentElement) return

    const weight = preset.dataset.weight
    if (!weight) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.updateProperty(nodeId, 'weight', weight)
    this.onCodeChange(result)
  }

  /**
   * Handle text align toggle click - reuses pp-pad-token
   */
  private handleTextAlignToggle(e: Event): void {
    const toggle = (e.target as HTMLElement).closest('.pp-pad-token[data-text-align], .pp-toggle-btn[data-text-align], .toggle-btn[data-text-align]') as HTMLElement
    if (!toggle || !this.currentElement) return

    const align = toggle.dataset.textAlign
    if (!align) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.updateProperty(nodeId, 'text-align', align)
    this.onCodeChange(result)
  }

  /**
   * Handle text style toggle click (italic, underline, etc.) - supports prototype
   */
  private handleTextStyleToggle(e: Event): void {
    const toggle = (e.target as HTMLElement).closest('.pp-pad-token[data-text-style], .pp-toggle-btn[data-text-style], .toggle-btn[data-text-style]') as HTMLElement
    if (!toggle || !this.currentElement) return

    const style = toggle.dataset.textStyle
    if (!style) return

    const isActive = toggle.classList.contains('active')
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    if (isActive) {
      // Remove the property
      const result = this.codeModifier.removeProperty(nodeId, style)
      this.onCodeChange(result)
    } else {
      // Add the property
      const result = this.codeModifier.updateProperty(nodeId, style, 'true')
      this.onCodeChange(result)
    }
  }

  /**
   * Handle v2 select change (font, weight dropdowns)
   */
  private handleV2SelectChange(e: Event): void {
    const select = e.target as HTMLSelectElement
    if (!select || !this.currentElement) return

    const prop = select.dataset.prop
    const value = select.value
    if (!prop) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    if (value === '') {
      // Remove property if empty option selected
      const result = this.codeModifier.removeProperty(nodeId, prop)
      this.onCodeChange(result)
    } else {
      const result = this.codeModifier.updateProperty(nodeId, prop, value)
      this.onCodeChange(result)
    }
  }

  /**
   * Handle v2 input change (font-size, etc.)
   */
  private handleV2InputChange(e: Event): void {
    const input = e.target as HTMLInputElement
    if (!input || !this.currentElement) return

    const prop = input.dataset.prop
    const value = input.value.trim()
    if (!prop) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    if (value === '') {
      // Remove property if empty
      const result = this.codeModifier.removeProperty(nodeId, prop)
      this.onCodeChange(result)
    } else {
      const result = this.codeModifier.updateProperty(nodeId, prop, value)
      this.onCodeChange(result)
    }
  }

  /**
   * Handle hover color button click (v2)
   */
  private handleHoverColorBtnClick(e: Event): void {
    const btn = (e.target as HTMLElement).closest('.pp-color-btn[data-hover-prop]') as HTMLElement
    if (!btn || !this.currentElement) return

    const prop = btn.dataset.hoverProp
    const color = btn.dataset.color
    if (!prop || !color) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.updateProperty(nodeId, prop, color)
    this.onCodeChange(result)
  }

  /**
   * Handle hover opacity token click (v2)
   */
  private handleHoverOpacityTokenClick(e: Event): void {
    const token = (e.target as HTMLElement).closest('.pp-token-btn[data-hover-prop]') as HTMLElement
    if (!token || !this.currentElement) return

    const value = token.dataset.value
    if (!value) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.updateProperty(nodeId, 'hover-opacity', value)
    this.onCodeChange(result)
  }

  /**
   * Handle hover border width toggle click (v2)
   */
  private handleHoverBorderWidthClick(e: Event): void {
    const toggle = (e.target as HTMLElement).closest('.pp-toggle-btn[data-hover-bor-width]') as HTMLElement
    if (!toggle || !this.currentElement) return

    const width = toggle.dataset.hoverBorWidth
    if (width === undefined) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    if (width === '0') {
      // Remove hover-border property
      const result = this.codeModifier.removeProperty(nodeId, 'hover-bor')
      this.onCodeChange(result)
    } else {
      // Get current border color if any, or default to #333
      const row = toggle.closest('.pp-prop-row')
      const activeColorBtn = row?.querySelector('.pp-color-btn.active[data-hover-prop="hover-boc"]') as HTMLElement
      const color = activeColorBtn?.dataset.color || '#333'
      const result = this.codeModifier.updateProperty(nodeId, 'hover-bor', `${width} ${color}`)
      this.onCodeChange(result)
    }
  }

  /**
   * Handle hover input change (v2)
   */
  private handleHoverInputChange(e: Event): void {
    const input = e.target as HTMLInputElement
    if (!input || !this.currentElement) return

    const prop = input.dataset.hoverProp
    const value = input.value.trim()
    if (!prop) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    if (value === '') {
      // Remove property if empty
      const result = this.codeModifier.removeProperty(nodeId, prop)
      this.onCodeChange(result)
    } else {
      const result = this.codeModifier.updateProperty(nodeId, prop, value)
      this.onCodeChange(result)
    }
  }

  /**
   * Handle shadow toggle click
   */
  private handleShadowToggle(e: Event): void {
    const toggle = (e.target as HTMLElement).closest('.pp-shadow-toggle') as HTMLElement
    if (!toggle || !this.currentElement) return

    const shadow = toggle.dataset.shadow
    if (!shadow) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    if (shadow === 'none') {
      // Remove shadow property
      const result = this.codeModifier.removeProperty(nodeId, 'shadow')
      this.onCodeChange(result)
    } else {
      // Set shadow value
      const result = this.codeModifier.updateProperty(nodeId, 'shadow', shadow)
      this.onCodeChange(result)
    }
  }

  /**
   * Handle opacity preset click
   */
  private handleOpacityPreset(e: Event): void {
    const preset = (e.target as HTMLElement).closest('.pp-opacity-preset') as HTMLElement
    if (!preset || !this.currentElement) return

    const opacity = preset.dataset.opacity
    if (!opacity) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.updateProperty(nodeId, 'opacity', opacity)
    this.onCodeChange(result)
  }

  /**
   * Handle visibility toggle click (hidden, visible, disabled)
   */
  private handleVisibilityToggle(e: Event): void {
    const toggle = (e.target as HTMLElement).closest('.pp-visibility-toggle') as HTMLElement
    if (!toggle || !this.currentElement) return

    const visibility = toggle.dataset.visibility
    if (!visibility) return

    const isActive = toggle.classList.contains('active')
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    if (isActive) {
      // Remove the property
      const result = this.codeModifier.removeProperty(nodeId, visibility)
      this.onCodeChange(result)
    } else {
      // Add the property
      const result = this.codeModifier.updateProperty(nodeId, visibility, 'true')
      this.onCodeChange(result)
    }
  }

  /**
   * Handle color swatch click (legacy)
   * Uses token name ($accent.bg) when available, falls back to hex value
   */
  private handleColorSwatchClick(e: Event): void {
    const swatch = (e.target as HTMLElement).closest('.pp-color-swatch, .color-swatch') as HTMLElement
    if (!swatch || !this.currentElement) return

    // Prefer token name over resolved color value
    const tokenName = swatch.dataset.token
    const color = tokenName || swatch.dataset.color
    if (!color) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    // Check for prototype structure (data-color-prop)
    const colorProp = swatch.dataset.colorProp
    if (colorProp) {
      const result = this.codeModifier.updateProperty(nodeId, colorProp, color)
      this.onCodeChange(result)
      return
    }

    // Fall back to legacy structure (finding .pp-color-row parent)
    const row = swatch.closest('.pp-color-row')
    const picker = row?.querySelector('.pp-color-picker') as HTMLInputElement
    const prop = picker?.dataset.prop

    if (prop) {
      const result = this.codeModifier.updateProperty(nodeId, prop, color)
      this.onCodeChange(result)
    }
  }

  /**
   * Handle color button click (v2)
   * Uses token name ($accent.bg) when available, falls back to hex value
   */
  private handleColorBtnClick(e: Event): void {
    const btn = (e.target as HTMLElement).closest('.pp-color-btn') as HTMLElement
    if (!btn || !this.currentElement) return

    // Prefer token name over resolved color value
    const tokenName = btn.dataset.token
    const color = tokenName || btn.dataset.color
    const prop = btn.dataset.colorProp // 'bg' or 'color'
    if (!color || !prop) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.updateProperty(nodeId, prop, color)
    this.onCodeChange(result)
  }

  /**
   * Handle color picker change
   */
  private handleColorPickerChange(e: Event): void {
    const picker = e.target as HTMLInputElement
    if (!picker || !this.currentElement) return

    const color = picker.value
    const prop = picker.dataset.prop
    if (!prop) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.updateProperty(nodeId, prop, color)
    this.onCodeChange(result)
  }

  /**
   * Handle color trigger click - opens enhanced color picker
   */
  private handleColorTriggerClick(e: Event): void {
    const trigger = (e.target as HTMLElement).closest('.pp-color-trigger') as HTMLElement
    if (!trigger || !this.currentElement) return

    const colorProp = trigger.dataset.colorProp
    const borderColorProp = trigger.dataset.borderColorProp
    const currentValue = trigger.dataset.currentValue || ''

    const rect = trigger.getBoundingClientRect()

    // Check if showColorPickerForProperty exists on window
    const showColorPicker = (window as { showColorPickerForProperty?: (x: number, y: number, property: string, currentValue: string, callback: (color: string) => void) => void }).showColorPickerForProperty
    if (!showColorPicker) {
      console.warn('Color picker not available')
      return
    }

    // Determine the property name for color picker context
    const property = colorProp || borderColorProp || 'bg'

    showColorPicker(
      rect.left,
      rect.bottom + 4,
      property,
      currentValue,
      (selectedColor: string) => {
        // Get current nodeId at callback time (not capture time)
        // This ensures we use the correct node even if a recompile happened
        if (!this.currentElement) {
          console.warn('Color picker: No element selected')
          return
        }
        const nodeId = this.currentElement.templateId || this.currentElement.nodeId

        // Handle border color specially (compound property)
        if (borderColorProp) {
          const borderWidth = trigger.dataset.borderWidth || '1'
          const result = this.codeModifier.updateProperty(nodeId, borderColorProp, `${borderWidth} ${selectedColor}`)
          this.onCodeChange(result)
          return
        }

        // Handle hover border color specially
        if (colorProp === 'hover-boc') {
          const borderWidth = trigger.dataset.hoverBorWidth || '1'
          // If border width is 0, just set the color without updating hover-bor
          if (borderWidth !== '0') {
            const result = this.codeModifier.updateProperty(nodeId, 'hover-bor', `${borderWidth} ${selectedColor}`)
            this.onCodeChange(result)
          } else {
            // Set just the border color property
            const result = this.codeModifier.updateProperty(nodeId, 'hover-boc', selectedColor)
            this.onCodeChange(result)
          }
          return
        }

        // Regular color property
        if (colorProp) {
          const result = this.codeModifier.updateProperty(nodeId, colorProp, selectedColor)
          this.onCodeChange(result)
        }
      }
    )
  }

  /**
   * Handle behavior toggle click (boolean props)
   */
  private handleBehaviorToggle(e: Event): void {
    const toggle = (e.target as HTMLElement).closest('[data-behavior-toggle]') as HTMLElement
    if (!toggle || !this.currentElement) return

    const propName = toggle.dataset.behaviorToggle
    if (!propName) return

    const isActive = toggle.classList.contains('active')
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    if (isActive) {
      // Remove the property (set to false or remove)
      const result = this.codeModifier.updateProperty(nodeId, propName, 'false')
      this.onCodeChange(result)
    } else {
      // Add the property (set to true)
      const result = this.codeModifier.updateProperty(nodeId, propName, 'true')
      this.onCodeChange(result)
    }
  }

  /**
   * Handle behavior select change (enum props)
   */
  private handleBehaviorSelect(e: Event): void {
    const select = e.target as HTMLSelectElement
    if (!select || !this.currentElement) return

    const propName = select.dataset.behaviorSelect
    const value = select.value
    if (!propName) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    if (value === '' || value === '-') {
      // Remove the property
      const result = this.codeModifier.removeProperty(nodeId, propName)
      this.onCodeChange(result)
    } else {
      // Update the property
      const result = this.codeModifier.updateProperty(nodeId, propName, value)
      this.onCodeChange(result)
    }
  }

  /**
   * Handle behavior input change (string/number props)
   */
  private handleBehaviorInput(e: Event): void {
    const input = e.target as HTMLInputElement
    if (!input || !this.currentElement) return

    const propName = input.dataset.behaviorInput
    const value = input.value.trim()
    if (!propName) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    if (value === '') {
      // Remove the property
      const result = this.codeModifier.removeProperty(nodeId, propName)
      this.onCodeChange(result)
    } else {
      // Update the property - quote string values if needed
      const quotedValue = /^[a-zA-Z]/.test(value) && !/^\d+$/.test(value) ? `"${value}"` : value
      const result = this.codeModifier.updateProperty(nodeId, propName, quotedValue)
      this.onCodeChange(result)
    }
  }

  /**
   * Update a property value
   */
  private updateProperty(propName: string, value: string): void {
    if (!this.currentElement) return

    // Use template ID for template instances (changes apply to template, not instance)
    const nodeId = this.currentElement.templateId || this.currentElement.nodeId

    const result = this.codeModifier.updateProperty(
      nodeId,
      propName,
      value
    )

    this.handleModificationResult(result, propName)
  }

  /**
   * Handle modification result with error feedback
   */
  private handleModificationResult(result: ModificationResult, context?: string): void {
    if (!result.success) {
      this.showErrorFeedback(result.error || 'Unknown error', context)
      return
    }
    this.onCodeChange(result)
  }

  /**
   * Show error feedback to the user
   */
  private showErrorFeedback(error: string, context?: string): void {
    const message = context
      ? `Failed to update ${context}: ${error}`
      : `Property update failed: ${error}`

    // Log for debugging
    console.warn(`[PropertyPanel] ${message}`)

    // Show visual feedback via status indicator
    const status = document.getElementById('status')
    if (status) {
      const originalText = status.textContent
      const originalClass = status.className
      status.textContent = message
      status.className = 'status error'

      // Reset after 3 seconds
      setTimeout(() => {
        status.textContent = originalText || 'Ready'
        status.className = originalClass || 'status ok'
      }, 3000)
    }
  }

  /**
   * Debounce a function call
   */
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
   * Get display label for property
   */
  private getDisplayLabel(name: string): string {
    const labels: Record<string, string> = {
      // Layout
      horizontal: 'Horizontal',
      hor: 'Horizontal',
      vertical: 'Vertical',
      ver: 'Vertical',
      center: 'Center',
      cen: 'Center',
      gap: 'Gap',
      g: 'Gap',
      spread: 'Spread',
      wrap: 'Wrap',
      stacked: 'Stacked',
      grid: 'Grid',

      // Alignment
      left: 'Left',
      right: 'Right',
      'hor-center': 'H-Center',
      top: 'Top',
      bottom: 'Bottom',
      'ver-center': 'V-Center',

      // Size
      width: 'Width',
      w: 'Width',
      height: 'Height',
      h: 'Height',
      size: 'Size',
      'min-width': 'Min W',
      minw: 'Min W',
      'max-width': 'Max W',
      maxw: 'Max W',
      'min-height': 'Min H',
      minh: 'Min H',
      'max-height': 'Max H',
      maxh: 'Max H',

      // Spacing
      padding: 'Padding',
      pad: 'Padding',
      p: 'Padding',
      margin: 'Margin',
      m: 'Margin',

      // Colors
      color: 'Color',
      col: 'Color',
      c: 'Color',
      background: 'Background',
      bg: 'Background',
      'border-color': 'Border Color',
      boc: 'Border Color',

      // Border
      border: 'Border',
      bor: 'Border',
      radius: 'Radius',
      rad: 'Radius',

      // Typography
      'font-size': 'Font Size',
      fs: 'Font Size',
      weight: 'Weight',
      line: 'Line Height',
      font: 'Font',
      'text-align': 'Text Align',
      italic: 'Italic',
      underline: 'Underline',
      truncate: 'Truncate',
      uppercase: 'Uppercase',
      lowercase: 'Lowercase',

      // Icon
      'icon-size': 'Icon Size',
      is: 'Icon Size',
      'icon-weight': 'Icon Weight',
      iw: 'Icon Weight',
      'icon-color': 'Icon Color',
      ic: 'Icon Color',
      fill: 'Fill',

      // Visual
      opacity: 'Opacity',
      o: 'Opacity',
      shadow: 'Shadow',
      cursor: 'Cursor',
      z: 'Z-Index',
      hidden: 'Hidden',
      visible: 'Visible',
      disabled: 'Disabled',
      rotate: 'Rotate',
      rot: 'Rotate',
      translate: 'Translate',

      // Scroll
      scroll: 'Scroll',
      'scroll-ver': 'Scroll Y',
      'scroll-hor': 'Scroll X',
      'scroll-both': 'Scroll Both',
      clip: 'Clip',

      // Hover
      'hover-background': 'Hover BG',
      'hover-bg': 'Hover BG',
      'hover-color': 'Hover Color',
      'hover-col': 'Hover Color',
      'hover-opacity': 'Hover Opacity',
      'hover-opa': 'Hover Opacity',
      'hover-scale': 'Hover Scale',
      'hover-border': 'Hover Border',
      'hover-bor': 'Hover Border',
      'hover-border-color': 'Hover Border Color',
      'hover-boc': 'Hover Border Color',
      'hover-radius': 'Hover Radius',
      'hover-rad': 'Hover Radius',

      // Content
      content: 'Content',
      placeholder: 'Placeholder',
      src: 'Source',
      href: 'Link',
      value: 'Value',
    }
    return labels[name] || name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ')
  }

  /**
   * Get select options for a property
   */
  private getSelectOptions(name: string): string[] {
    const options: Record<string, string[]> = {
      cursor: ['default', 'pointer', 'text', 'move', 'not-allowed', 'grab', 'grabbing'],
      shadow: ['none', 'sm', 'md', 'lg'],
      'text-align': ['left', 'center', 'right', 'justify'],
    }
    return options[name] || []
  }

  /**
   * Escape HTML
   */
  private escapeHtml(str: string): string {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }

  /**
   * Refresh the panel (after external changes)
   * Preserves focus on active input to avoid disrupting user editing
   */
  refresh(): void {
    // Capture focus state before re-render
    const activeElement = document.activeElement as HTMLInputElement | null
    const isOurInput = activeElement && this.container.contains(activeElement)
    const focusedProp = isOurInput ? activeElement?.dataset?.prop : null
    const focusedPadDir = isOurInput ? activeElement?.dataset?.padDir : null
    const cursorPosition = isOurInput ? activeElement?.selectionStart : null

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
          // Restore cursor position
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
    codeModifier: CodeModifier
  ): void {
    this.propertyExtractor = propertyExtractor
    this.codeModifier = codeModifier
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
 * Create a PropertyPanel
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

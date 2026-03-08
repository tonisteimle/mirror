/**
 * PropertyPanel - Dynamic property panel UI
 *
 * Renders properties for the selected element and handles user input
 * to update the source code.
 */

import type { SelectionManager, BreadcrumbItem } from './selection-manager'
import type { PropertyExtractor, ExtractedElement, ExtractedProperty, PropertyCategory } from './property-extractor'
import type { CodeModifier, ModificationResult } from './code-modifier'
import { PROPERTY_ICON_PATHS } from './icons'

/**
 * Token info extracted from source
 */
interface PaddingToken {
  name: string   // e.g., "S.pad", "sm.pad"
  value: string  // e.g., "4", "8"
}

/**
 * Callback when code changes
 */
export type OnCodeChangeCallback = (result: ModificationResult) => void

/**
 * PropertyPanel options
 */
export interface PropertyPanelOptions {
  /** Debounce time for input changes (ms) */
  debounceTime?: number
  /** Show source indicators (instance/component/inherited) */
  showSourceIndicators?: boolean
}

/**
 * PropertyPanel class
 */
export class PropertyPanel {
  private container: HTMLElement
  private selectionManager: SelectionManager
  private propertyExtractor: PropertyExtractor
  private codeModifier: CodeModifier
  private onCodeChange: OnCodeChangeCallback

  private options: Required<PropertyPanelOptions>
  private unsubscribeSelection: (() => void) | null = null
  private unsubscribeBreadcrumb: (() => void) | null = null
  private currentElement: ExtractedElement | null = null
  private currentBreadcrumb: BreadcrumbItem[] = []
  private debounceTimers: Map<string, number> = new Map()

  // Token caching for performance
  private cachedPaddingTokens: PaddingToken[] | null = null
  private cachedColorTokens: Array<{ name: string; value: string }> | null = null
  private cachedSourceHash: string = ''

  // AbortController for autocomplete event cleanup
  private autocompleteAbortController: AbortController | null = null

  constructor(
    container: HTMLElement,
    selectionManager: SelectionManager,
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

    this.unsubscribeBreadcrumb = this.selectionManager.subscribeBreadcrumb((chain) => {
      this.currentBreadcrumb = chain
      // Re-render if we have a current element
      if (this.currentElement) {
        this.render(this.currentElement)
      }
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
    if (this.unsubscribeBreadcrumb) {
      this.unsubscribeBreadcrumb()
      this.unsubscribeBreadcrumb = null
    }
    this.clearDebounceTimers()
  }

  /**
   * Update panel for a node
   */
  private updatePanel(nodeId: string | null): void {
    if (!nodeId) {
      this.renderEmpty()
      this.currentElement = null
      return
    }

    const element = this.propertyExtractor.getProperties(nodeId)
    if (!element) {
      this.renderEmpty()
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
   * Render the property panel
   */
  private render(element: ExtractedElement): void {
    const title = element.instanceName || element.componentName
    const badge = element.isDefinition ? 'Definition' : ''

    this.container.innerHTML = `
      ${this.renderBreadcrumb()}
      <div class="pp-header">
        <span class="pp-title">${this.escapeHtml(title)}</span>
        ${badge ? `<span class="pp-badge">${badge}</span>` : ''}
        <button class="pp-close" title="Clear selection">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
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
        ${this.renderCategories(element.categories)}
      </div>
    `

    // Attach event listeners
    this.attachEventListeners()
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
        <span class="pp-crumb${isLast ? ' active' : ''}" data-node-id="${this.escapeHtml(item.nodeId)}">${this.escapeHtml(item.name)}</span>
        ${!isLast ? '<span class="pp-crumb-sep">›</span>' : ''}
      `
    }).join('')

    return `<div class="pp-breadcrumb">${crumbs}</div>`
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
    const sizingCat = categories.find(c => c.name === 'sizing')
    const spacingCat = categories.find(c => c.name === 'spacing')
    const borderCat = categories.find(c => c.name === 'border')
    const typographyCat = categories.find(c => c.name === 'typography')
    const visualCat = categories.find(c => c.name === 'visual')
    const hoverCat = categories.find(c => c.name === 'hover')

    const specialCats = ['layout', 'alignment', 'sizing', 'spacing', 'border', 'typography', 'visual', 'hover']
    const otherCats = categories.filter(c => !specialCats.includes(c.name))

    let result = ''

    // Render layout section
    if (layoutCat) {
      result += `<div class="pp-section">`
      result += `<div class="pp-label">Layout</div>`
      result += this.renderLayoutToggleGroup(layoutCat)
      result += `</div>`
    }

    // Render sizing + alignment side by side
    if (sizingCat || alignmentCat) {
      result += `<div class="pp-section pp-size-align-row">`
      if (sizingCat) {
        result += `<div class="pp-size-col">`
        result += this.renderSizingSection(sizingCat)
        result += `</div>`
      }
      if (alignmentCat) {
        result += `<div class="pp-align-col">`
        result += this.renderAlignmentGrid(alignmentCat)
        result += `</div>`
      }
      result += `</div>`
    }

    // Render spacing section
    if (spacingCat) {
      result += `<div class="pp-section">`
      result += this.renderSpacingSection(spacingCat)
      result += `</div>`
    }

    // Render color section
    result += `<div class="pp-section">`
    result += this.renderColorSection()
    result += `</div>`

    // Render border section
    if (borderCat) {
      result += `<div class="pp-section">`
      result += this.renderBorderSection(borderCat)
      result += `</div>`
    }

    // Render typography section
    if (typographyCat) {
      result += `<div class="pp-section">`
      result += this.renderTypographySection(typographyCat)
      result += `</div>`
    }

    // Render visual section
    if (visualCat) {
      result += `<div class="pp-section">`
      result += this.renderVisualSection(visualCat)
      result += `</div>`
    }

    // Render hover section
    if (hoverCat) {
      result += `<div class="pp-section">`
      result += this.renderHoverSection(hoverCat)
      result += `</div>`
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
  private readonly LAYOUT_MODES = ['vertical', 'horizontal', 'grid', 'stacked'] as const

  /**
   * Render layout as exclusive toggle group
   */
  private renderLayoutToggleGroup(category: PropertyCategory): string {
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

    // Render toggle buttons
    const toggles = this.LAYOUT_MODES.map(mode => {
      const active = activeMode === mode
      const iconPath = PROPERTY_ICON_PATHS[mode]
      const label = this.getDisplayLabel(mode)

      return `
        <button class="pp-layout-toggle ${active ? 'active' : ''}" data-layout="${mode}" title="${label}">
          ${iconPath ? `<svg viewBox="0 0 14 14" width="14" height="14">${iconPath}</svg>` : mode}
        </button>
      `
    }).join('')

    // Find gap property
    const gapProp = props.find(p => p.name === 'gap' || p.name === 'g')
    const gapValue = gapProp?.value || ''

    // Return just the content, section wrapper is handled by renderCategories
    const layoutIcon = PROPERTY_ICON_PATHS['layout']
    return `
      <div class="pp-layout-row">
        <span class="pp-dim-icon" title="Layout">
          <svg viewBox="0 0 14 14" width="12" height="12">${layoutIcon}</svg>
        </span>
        <div class="pp-layout-group">
          ${toggles}
        </div>
        <span class="pp-dim-label">Gap</span>
        <div class="pp-gap-input">
          <input type="text" class="pp-gap-field" value="${this.escapeHtml(gapValue)}" data-prop="gap" placeholder="0">
        </div>
      </div>
    `
  }

  /**
   * Render sizing section with grouped inputs
   */
  private renderSizingSection(category: PropertyCategory): string {
    const props = category.properties

    // Find width and height values
    const widthProp = props.find(p => p.name === 'width' || p.name === 'w')
    const heightProp = props.find(p => p.name === 'height' || p.name === 'h')
    const minWidthProp = props.find(p => p.name === 'min-width' || p.name === 'minw')
    const maxWidthProp = props.find(p => p.name === 'max-width' || p.name === 'maxw')
    const minHeightProp = props.find(p => p.name === 'min-height' || p.name === 'minh')
    const maxHeightProp = props.find(p => p.name === 'max-height' || p.name === 'maxh')

    const widthValue = widthProp?.value || ''
    const heightValue = heightProp?.value || ''
    const minWidthActive = minWidthProp && minWidthProp.hasValue !== false
    const maxWidthActive = maxWidthProp && maxWidthProp.hasValue !== false
    const minHeightActive = minHeightProp && minHeightProp.hasValue !== false
    const maxHeightActive = maxHeightProp && maxHeightProp.hasValue !== false

    const minWidthIcon = PROPERTY_ICON_PATHS['min-width']
    const maxWidthIcon = PROPERTY_ICON_PATHS['max-width']
    const minHeightIcon = PROPERTY_ICON_PATHS['min-height']
    const maxHeightIcon = PROPERTY_ICON_PATHS['max-height']

    // Render as stacked rows - use same arrow icons as padding
    const widthIcon = PROPERTY_ICON_PATHS['pad-h']
    const heightIcon = PROPERTY_ICON_PATHS['pad-v']

    return `
      <div class="pp-label">Size</div>
      <div class="pp-stacked-rows">
        <div class="pp-size-item">
          <span class="pp-dim-icon" title="Width">
            <svg viewBox="0 0 14 14" width="12" height="12">${widthIcon}</svg>
          </span>
          <div class="pp-size-row">
            <input type="text" class="pp-size-input" value="${this.escapeHtml(widthValue)}" data-prop="width" placeholder="auto">
            <button class="pp-size-toggle ${minWidthActive ? 'active' : ''}" data-size-constraint="min-width" title="Min Width">
              <svg viewBox="0 0 14 14" width="14" height="14">${minWidthIcon}</svg>
            </button>
            <button class="pp-size-toggle ${maxWidthActive ? 'active' : ''}" data-size-constraint="max-width" title="Max Width">
              <svg viewBox="0 0 14 14" width="14" height="14">${maxWidthIcon}</svg>
            </button>
          </div>
        </div>
        <div class="pp-size-item">
          <span class="pp-dim-icon" title="Height">
            <svg viewBox="0 0 14 14" width="12" height="12">${heightIcon}</svg>
          </span>
          <div class="pp-size-row">
            <input type="text" class="pp-size-input" value="${this.escapeHtml(heightValue)}" data-prop="height" placeholder="auto">
            <button class="pp-size-toggle ${minHeightActive ? 'active' : ''}" data-size-constraint="min-height" title="Min Height">
              <svg viewBox="0 0 14 14" width="14" height="14">${minHeightIcon}</svg>
            </button>
            <button class="pp-size-toggle ${maxHeightActive ? 'active' : ''}" data-size-constraint="max-height" title="Max Height">
              <svg viewBox="0 0 14 14" width="14" height="14">${maxHeightIcon}</svg>
            </button>
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
   * Invalidate token cache (call when source changes)
   */
  private invalidateTokenCache(): void {
    this.cachedPaddingTokens = null
    this.cachedColorTokens = null
    this.cachedSourceHash = ''
  }

  /**
   * Get padding tokens from source (cached)
   * Parses tokens like "S.pad: 4" or "sm.pad: 8" from the source code
   */
  private getPaddingTokens(): PaddingToken[] {
    const source = this.codeModifier.getSource()
    const hash = this.hashSource(source)

    // Return cached if source hasn't changed
    if (hash === this.cachedSourceHash && this.cachedPaddingTokens) {
      return this.cachedPaddingTokens
    }

    const lines = source.split('\n')
    const tokens: PaddingToken[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('//')) continue

      // Match token definitions: name.pad: value (e.g., "S.pad: 4", "sm.pad: 8")
      // Supports optional $ prefix for backwards compatibility
      const match = trimmed.match(/^\$?([a-zA-Z0-9_-]+)\.pad\s*:\s*(\d+)$/)
      if (match) {
        tokens.push({
          name: match[1] + '.pad',
          value: match[2]
        })
      }
    }

    // Cache the result
    this.cachedPaddingTokens = tokens
    this.cachedSourceHash = hash
    return tokens
  }

  /**
   * Resolve token value - get numeric value for a token reference
   * Token ref can be "S.pad" or "$S.pad" - we normalize it
   */
  private resolveTokenValue(tokenRef: string): string | null {
    // Normalize: remove $ prefix if present
    const normalizedRef = tokenRef.startsWith('$') ? tokenRef.slice(1) : tokenRef
    const tokens = this.getPaddingTokens()
    const token = tokens.find(t => t.name === normalizedRef)
    return token?.value || null
  }

  /**
   * Get color tokens from source (cached)
   * Parses tokens with hex colors like "$primary.bg: #3B82F6"
   */
  private getColorTokens(): Array<{ name: string; value: string }> {
    const source = this.codeModifier.getSource()
    const hash = this.hashSource(source)

    // Return cached if source hasn't changed
    if (hash === this.cachedSourceHash && this.cachedColorTokens) {
      return this.cachedColorTokens
    }

    const tokens: Array<{ name: string; value: string }> = []

    // Match token definitions with hex colors
    const tokenRegex = /\$?([\w.-]+):\s*(#[0-9A-Fa-f]{3,8})/g
    let match
    while ((match = tokenRegex.exec(source)) !== null) {
      tokens.push({
        name: match[1],
        value: match[2]
      })
    }

    // Cache the result
    this.cachedColorTokens = tokens
    this.cachedSourceHash = hash
    return tokens
  }

  // Default tokens for autocomplete when none are defined in source
  private readonly DEFAULT_TOKENS: Array<{ name: string; value: string }> = [
    // Spacing
    { name: 'xs.pad', value: '2' },
    { name: 'sm.pad', value: '4' },
    { name: 'md.pad', value: '8' },
    { name: 'lg.pad', value: '16' },
    { name: 'xl.pad', value: '24' },
    { name: 'xs.gap', value: '2' },
    { name: 'sm.gap', value: '4' },
    { name: 'md.gap', value: '8' },
    { name: 'lg.gap', value: '16' },
    // Colors
    { name: 'primary.bg', value: '#3B82F6' },
    { name: 'secondary.bg', value: '#6B7280' },
    { name: 'surface.bg', value: '#1a1a23' },
    { name: 'elevated.bg', value: '#27272A' },
    { name: 'primary.col', value: '#3B82F6' },
    { name: 'muted.col', value: '#71717A' },
    { name: 'text.col', value: '#E5E5E5' },
    // Radius
    { name: 'sm.rad', value: '4' },
    { name: 'md.rad', value: '8' },
    { name: 'lg.rad', value: '12' },
  ]

  /**
   * Get all tokens from source, optionally filtered by property suffix
   * @param propertySuffix Optional suffix to filter (e.g., 'pad', 'bg', 'col')
   */
  private getAllTokens(propertySuffix?: string): Array<{ name: string; value: string }> {
    const source = this.codeModifier.getSource()
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

    // If no tokens found in source, use defaults
    if (tokens.length === 0) {
      const defaults = propertySuffix
        ? this.DEFAULT_TOKENS.filter(t => t.name.endsWith('.' + propertySuffix))
        : this.DEFAULT_TOKENS
      return defaults
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
   * Render color picker section
   */
  private renderColorSection(): string {
    const colorTokens = this.getColorTokens()

    // Get current bg and color values
    const nodeId = this.currentElement?.templateId || this.currentElement?.nodeId || ''
    const props = this.propertyExtractor?.getProperties(nodeId)
    const bgProp = props?.allProperties.find((p: {name: string}) => p.name === 'background' || p.name === 'bg')
    const colProp = props?.allProperties.find((p: {name: string}) => p.name === 'color' || p.name === 'col' || p.name === 'c')
    const bgValue = bgProp?.value || ''
    const colValue = colProp?.value || ''

    // Render color swatches (escape values to prevent XSS)
    const swatches = colorTokens.map(token =>
      `<button class="pp-color-swatch" data-color="${this.escapeHtml(token.value)}" data-token="${this.escapeHtml(token.name)}" title="${this.escapeHtml(token.name)}" style="background: ${this.escapeHtml(token.value)}"></button>`
    ).join('')

    return `
      <div class="pp-label">Color</div>
      <div class="pp-color-row">
        <span class="pp-dim-label">BG</span>
        <div class="pp-color-swatches">${swatches}</div>
        <input type="color" class="pp-color-picker" data-prop="bg" value="${bgValue.startsWith('#') ? bgValue : '#000000'}">
      </div>
      <div class="pp-color-row">
        <span class="pp-dim-label">Text</span>
        <div class="pp-color-swatches">${swatches}</div>
        <input type="color" class="pp-color-picker" data-prop="color" value="${colValue.startsWith('#') ? colValue : '#ffffff'}">
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
   * Render spacing section with V/H inputs and tokens
   */
  private renderSpacingSection(category: PropertyCategory): string {
    const props = category.properties

    // Find padding values - check for directional or combined
    const padProp = props.find(p => p.name === 'padding' || p.name === 'pad' || p.name === 'p')
    const padValue = padProp?.value || ''

    // Parse padding value to get T, R, B, L
    const padParts = padValue.split(/\s+/).filter(Boolean)
    let tPad = '', rPad = '', bPad = '', lPad = ''
    if (padParts.length === 1) {
      tPad = rPad = bPad = lPad = padParts[0]
    } else if (padParts.length === 2) {
      tPad = bPad = padParts[0] // vertical
      rPad = lPad = padParts[1] // horizontal
    } else if (padParts.length === 4) {
      tPad = padParts[0]
      rPad = padParts[1]
      bPad = padParts[2]
      lPad = padParts[3]
    }

    // V = top, H = right (for compact view)
    const vPad = tPad, hPad = rPad

    // Get dynamically loaded padding tokens
    const paddingTokens = this.getPaddingTokens()
    const hasTokens = paddingTokens.length > 0

    // Check if values are tokens
    const isToken = (val: string) => val.startsWith('$')

    // Render token buttons for any direction (only if tokens exist)
    const renderTokens = (activeTokenRef: string | null, direction: string) => {
      if (!hasTokens) return ''
      // Normalize activeTokenRef: "$sm.pad" -> "sm.pad"
      const normalizedActive = activeTokenRef?.startsWith('$') ? activeTokenRef.slice(1) : activeTokenRef
      return paddingTokens.map(token => {
        const isActive = normalizedActive === token.name
        // Extract short label from token name (e.g., "sm.pad" -> "SM")
        const shortLabel = this.getTokenShortLabel(token.name)
        return `<button class="pp-pad-token ${isActive ? 'active' : ''}" data-pad-token="${token.name}" data-pad-dir="${direction}" title="${token.name}: ${token.value}">${shortLabel}</button>`
      }).join('')
    }

    // Render a complete padding row
    const renderPadRow = (label: string, dir: string, value: string, showExpand: boolean = false, showCollapse: boolean = false) => {
      const valIsToken = isToken(value)
      const activeTokenName = valIsToken ? value : null
      // If token is selected, show its resolved numeric value in input
      const displayValue = valIsToken ? (this.resolveTokenValue(value) || '') : value
      const iconKey = `pad-${dir}`
      const iconPath = PROPERTY_ICON_PATHS[iconKey]
      return `
        <div class="pp-pad-line">
          <div class="pp-pad-item">
            <span class="pp-dim-icon" title="${label}">
              <svg viewBox="0 0 14 14" width="12" height="12">${iconPath}</svg>
            </span>
            <div class="pp-pad-row">
              ${hasTokens ? `<div class="pp-pad-tokens">${renderTokens(activeTokenName, dir)}</div>` : ''}
              <div class="pp-pad-input-wrap${valIsToken ? ' has-token' : ''}">
                <input type="text" class="pp-pad-input${valIsToken ? ' token-value' : ''}" value="${this.escapeHtml(displayValue)}" data-pad-dir="${dir}" data-token-ref="${valIsToken ? this.escapeHtml(value) : ''}" placeholder="0"${valIsToken ? ' readonly' : ''}>
                <button class="pp-pad-dropdown" data-pad-dir="${dir}">▾</button>
              </div>
            </div>
          </div>
          ${showExpand ? '<button class="pp-pad-expand" title="Expand to T/R/B/L">⊞</button>' : ''}
          ${showCollapse ? '<button class="pp-pad-collapse" title="Collapse to V/H">⊟</button>' : ''}
        </div>
      `
    }

    // Border presets (reuse padding pattern)
    const borderPresets = ['0', '1', '2']
    const borderStyles = ['solid', 'dashed', 'dotted'] as const

    // Render border row for a single side (t, r, b, l) or all
    const renderBorderSideRow = (label: string, dir: string, widthValue: string, activeStyle: string, colorValue: string, showExpand: boolean = false, showCollapse: boolean = false) => {
      const iconKey = dir === 'all' ? 'border' : `border-${dir}`
      const iconPath = PROPERTY_ICON_PATHS[iconKey]
      const styleToggles = borderStyles.map(style => {
        const active = activeStyle === style
        const styleIcon = PROPERTY_ICON_PATHS[`border-${style}`]
        return `<button class="pp-layout-toggle ${active ? 'active' : ''}" data-border-style="${style}" data-border-dir="${dir}" title="${style}">
          <svg viewBox="0 0 14 14" width="14" height="14">${styleIcon}</svg>
        </button>`
      }).join('')

      // Color picker only in expanded mode (individual sides) - reuse pp-color-row pattern
      const colorPicker = dir !== 'all' ? `
        <div class="pp-color-row" style="margin-left: 8px;">
          <input type="color" class="pp-color-swatch" value="${this.escapeHtml(colorValue.startsWith('#') ? colorValue : '#333333')}" data-border-color-dir="${dir}">
          <input type="text" class="pp-color-input" value="${this.escapeHtml(colorValue)}" data-border-color-dir="${dir}" placeholder="#333">
        </div>
      ` : ''

      return `
        <div class="pp-pad-line">
          <div class="pp-pad-item">
            <span class="pp-dim-icon" title="${label}">
              <svg viewBox="0 0 14 14" width="12" height="12">${iconPath}</svg>
            </span>
            <div class="pp-pad-row">
              <div class="pp-pad-tokens">${borderPresets.map(p => {
                const isActive = widthValue === p
                return `<button class="pp-pad-token ${isActive ? 'active' : ''}" data-border-width="${p}" data-border-dir="${dir}">${p}</button>`
              }).join('')}</div>
              <div class="pp-pad-input-wrap">
                <input type="text" class="pp-pad-input" value="${this.escapeHtml(widthValue)}" data-prop="border-width" data-border-dir="${dir}" placeholder="0">
                <button class="pp-pad-dropdown" data-border-dropdown data-border-dir="${dir}">▾</button>
              </div>
            </div>
            <div class="pp-layout-group" style="margin-left: 12px">
              ${styleToggles}
            </div>
            ${colorPicker}
          </div>
          ${showExpand ? '<button class="pp-pad-expand pp-border-expand" title="Expand to T/R/B/L">⊞</button>' : ''}
          ${showCollapse ? '<button class="pp-pad-collapse pp-border-collapse" title="Collapse">⊟</button>' : ''}
        </div>
      `
    }

    // Get border props (all sides)
    const borderProp = props.find(p => p.name === 'border' || p.name === 'bor')
    const borderValue = borderProp?.value || ''
    const borderParts = borderValue.split(/\s+/).filter(Boolean)
    const borderWidth = borderParts[0] || ''

    // Get individual border sides
    const borderTProp = props.find(p => p.name === 'border-top' || p.name === 'bor-t')
    const borderRProp = props.find(p => p.name === 'border-right' || p.name === 'bor-r')
    const borderBProp = props.find(p => p.name === 'border-bottom' || p.name === 'bor-b')
    const borderLProp = props.find(p => p.name === 'border-left' || p.name === 'bor-l')

    const getBorderSideWidth = (prop: typeof borderTProp) => {
      if (!prop?.value) return borderWidth
      return prop.value.split(/\s+/)[0] || ''
    }

    const getBorderSideStyle = (prop: typeof borderTProp, defaultStyle: string) => {
      if (!prop?.value) return defaultStyle
      for (const part of prop.value.split(/\s+/)) {
        if (['solid', 'dashed', 'dotted'].includes(part)) return part
      }
      return defaultStyle
    }

    const getBorderSideColor = (prop: typeof borderTProp, defaultColor: string) => {
      if (!prop?.value) return defaultColor
      for (const part of prop.value.split(/\s+/)) {
        if (part.startsWith('#') || part.startsWith('rgb') || part.startsWith('$')) return part
      }
      return defaultColor
    }

    // Determine border style and color from main border value
    let borderStyle = 'solid'
    let borderColor = '#333'
    for (const part of borderParts) {
      if (['solid', 'dashed', 'dotted'].includes(part)) {
        borderStyle = part
      } else if (part.startsWith('#') || part.startsWith('rgb') || part.startsWith('$')) {
        borderColor = part
      }
    }

    return `
      <div class="pp-label">Spacing</div>
      <div class="pp-spacing-group" data-expanded="false">
        <div class="pp-spacing-compact">
          ${renderPadRow('V', 'v', vPad, true)}
          ${renderPadRow('H', 'h', hPad)}
        </div>
        <div class="pp-spacing-expanded" style="display: none;">
          ${renderPadRow('T', 't', tPad, false, true)}
          ${renderPadRow('R', 'r', rPad)}
          ${renderPadRow('B', 'b', bPad)}
          ${renderPadRow('L', 'l', lPad)}
        </div>
      </div>
      <div class="pp-label" style="margin-top: 12px">Border</div>
      <div class="pp-border-group" data-expanded="false">
        <div class="pp-border-compact">
          ${renderBorderSideRow('Border', 'all', borderWidth, borderStyle, borderColor, true)}
        </div>
        <div class="pp-border-expanded" style="display: none;">
          ${renderBorderSideRow('Top', 't', getBorderSideWidth(borderTProp), getBorderSideStyle(borderTProp, borderStyle), getBorderSideColor(borderTProp, borderColor), false, true)}
          ${renderBorderSideRow('Right', 'r', getBorderSideWidth(borderRProp), getBorderSideStyle(borderRProp, borderStyle), getBorderSideColor(borderRProp, borderColor))}
          ${renderBorderSideRow('Bottom', 'b', getBorderSideWidth(borderBProp), getBorderSideStyle(borderBProp, borderStyle), getBorderSideColor(borderBProp, borderColor))}
          ${renderBorderSideRow('Left', 'l', getBorderSideWidth(borderLProp), getBorderSideStyle(borderLProp, borderStyle), getBorderSideColor(borderLProp, borderColor))}
        </div>
      </div>
    `
  }

  /**
   * Render border section - border is now rendered in spacing section
   */
  private renderBorderSection(_category: PropertyCategory): string {
    return ''
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
   * Font size presets
   */
  private readonly FONT_SIZE_PRESETS = ['11', '12', '14', '16', '18', '20', '24', '32'] as const

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
   * Render typography section - reuses padding CSS classes for consistency
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

    // Render a typography row (reuses padding CSS classes)
    const renderTypoRow = (iconKey: string, presets: string[], value: string, dataAttr: string, placeholder: string) => {
      const iconPath = PROPERTY_ICON_PATHS[iconKey]
      return `
        <div class="pp-pad-line">
          <div class="pp-pad-item">
            <span class="pp-dim-icon" title="${iconKey}">
              <svg viewBox="0 0 14 14" width="12" height="12">${iconPath || ''}</svg>
            </span>
            <div class="pp-pad-row">
              <div class="pp-pad-tokens">${presets.map(p => {
                const isActive = value === p
                return `<button class="pp-pad-token ${isActive ? 'active' : ''}" data-${dataAttr}="${p}">${p}</button>`
              }).join('')}</div>
              <div class="pp-pad-input-wrap">
                <input type="text" class="pp-pad-input" value="${this.escapeHtml(value)}" data-prop="${dataAttr}" placeholder="${placeholder}">
              </div>
            </div>
          </div>
        </div>
      `
    }

    // Font row
    const fontRow = renderTypoRow('font', ['Inter', 'System'], fontValue, 'font', 'Font')

    // Font size row
    const sizeRow = renderTypoRow('font-size', ['12', '14', '16', '18', '24'], fontSizeValue, 'font-size', 'Size')

    // Font weight row
    const weightRow = renderTypoRow('weight', ['400', '500', '600', '700'], weightValue, 'weight', 'Weight')

    // Text align toggles (reuses padding token CSS)
    const alignToggles = `
      <div class="pp-pad-line">
        <div class="pp-pad-item">
          <span class="pp-dim-icon" title="Align">
            <svg viewBox="0 0 14 14" width="12" height="12">${PROPERTY_ICON_PATHS['text-left'] || ''}</svg>
          </span>
          <div class="pp-pad-row">
            <div class="pp-pad-tokens">${this.TEXT_ALIGNS.map(align => {
              const active = textAlignValue === align
              const iconPath = PROPERTY_ICON_PATHS[`text-${align}`]
              return `<button class="pp-pad-token ${active ? 'active' : ''}" data-text-align="${align}" title="${align}">
                ${iconPath ? `<svg viewBox="0 0 14 14" width="12" height="12">${iconPath}</svg>` : align[0].toUpperCase()}
              </button>`
            }).join('')}</div>
            <div class="pp-pad-tokens">${this.TEXT_STYLES.map(style => {
              const prop = props.find(p => p.name === style)
              const isActive = prop && (prop.value === 'true' || (prop.value === '' && prop.hasValue !== false))
              const iconPath = PROPERTY_ICON_PATHS[style]
              return `<button class="pp-pad-token ${isActive ? 'active' : ''}" data-text-style="${style}" title="${style}">
                ${iconPath ? `<svg viewBox="0 0 14 14" width="12" height="12">${iconPath}</svg>` : style.slice(0, 2)}
              </button>`
            }).join('')}</div>
          </div>
        </div>
      </div>
    `

    return `
      <div class="pp-label">Typography</div>
      ${fontRow}
      ${sizeRow}
      ${weightRow}
      ${alignToggles}
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
        <input type="text" class="pp-opacity-input" value="${this.escapeHtml(opacityValue)}" data-prop="opacity" placeholder="1">
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
        <input type="text" class="pp-zindex-input" value="${this.escapeHtml(zIndexValue)}" data-prop="z" placeholder="0">
      </div>
      <div class="pp-visual-row">
        <div class="pp-visibility-group">
          ${visibilityToggles}
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
   * Render hover section with hover-specific properties
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
    const hoverRadProp = props.find(p => p.name === 'hover-radius' || p.name === 'hover-rad')

    const hoverBgValue = hoverBgProp?.value || ''
    const hoverColValue = hoverColProp?.value || ''
    const hoverOpaValue = hoverOpaProp?.value || ''
    const hoverScaleValue = hoverScaleProp?.value || ''
    const hoverBorValue = hoverBorProp?.value || ''
    const hoverBocValue = hoverBocProp?.value || ''
    const hoverRadValue = hoverRadProp?.value || ''

    // Get color tokens for swatches
    const colorTokens = this.getColorTokens()

    // Render color swatches for hover-bg
    const bgSwatches = colorTokens.slice(0, 6).map(token =>
      `<button class="pp-color-swatch pp-hover-swatch" data-hover-prop="hover-bg" data-color="${this.escapeHtml(token.value)}" data-token="${this.escapeHtml(token.name)}" title="${this.escapeHtml(token.name)}" style="background: ${this.escapeHtml(token.value)}"></button>`
    ).join('')

    // Opacity presets
    const opacityPresets = this.HOVER_OPACITY_PRESETS.map(val => {
      const active = hoverOpaValue === val
      return `<button class="pp-opacity-preset ${active ? 'active' : ''}" data-hover-prop="hover-opacity" data-value="${val}">${val}</button>`
    }).join('')

    // Scale presets
    const scalePresets = this.HOVER_SCALE_PRESETS.map(val => {
      const active = hoverScaleValue === val
      return `<button class="pp-scale-preset ${active ? 'active' : ''}" data-hover-prop="hover-scale" data-value="${val}">${val}</button>`
    }).join('')

    return `
      <div class="pp-label">Hover</div>
      <div class="pp-visual-row">
        <span class="pp-visual-label">BG</span>
        <div class="pp-hover-swatches">${bgSwatches}</div>
        <input type="text" class="pp-hover-input" value="${this.escapeHtml(hoverBgValue)}" data-prop="hover-bg" placeholder="#color">
      </div>
      <div class="pp-visual-row">
        <span class="pp-visual-label">Color</span>
        <input type="text" class="pp-hover-input" value="${this.escapeHtml(hoverColValue)}" data-prop="hover-col" placeholder="#color">
      </div>
      <div class="pp-visual-row">
        <span class="pp-visual-label">Opacity</span>
        <div class="pp-opacity-group">${opacityPresets}</div>
        <input type="text" class="pp-hover-input pp-hover-small" value="${this.escapeHtml(hoverOpaValue)}" data-prop="hover-opacity" placeholder="1">
      </div>
      <div class="pp-visual-row">
        <span class="pp-visual-label">Scale</span>
        <div class="pp-scale-group">${scalePresets}</div>
        <input type="text" class="pp-hover-input pp-hover-small" value="${this.escapeHtml(hoverScaleValue)}" data-prop="hover-scale" placeholder="1">
      </div>
      <div class="pp-visual-row">
        <span class="pp-visual-label">Border</span>
        <input type="text" class="pp-hover-input" value="${this.escapeHtml(hoverBorValue)}" data-prop="hover-bor" placeholder="1 #color">
      </div>
      <div class="pp-visual-row">
        <span class="pp-visual-label">Radius</span>
        <input type="text" class="pp-hover-input pp-hover-small" value="${this.escapeHtml(hoverRadValue)}" data-prop="hover-rad" placeholder="4">
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
          <input type="text" class="pp-color-input ${prop.isToken ? 'token' : ''}" value="${this.escapeHtml(displayValue)}" data-prop="${this.escapeHtml(prop.name)}" placeholder="Color">
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
    const alignCells = this.container.querySelectorAll('.pp-align-cell')
    alignCells.forEach(cell => {
      cell.addEventListener('click', (e) => this.handleAlignmentClick(e))
    })

    // Layout toggle group
    const layoutToggles = this.container.querySelectorAll('.pp-layout-toggle')
    layoutToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleLayoutToggle(e))
    })

    // Size constraint toggles
    const sizeToggles = this.container.querySelectorAll('.pp-size-toggle')
    sizeToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleSizeConstraintToggle(e))
    })

    // Size inputs
    const sizeInputs = this.container.querySelectorAll('.pp-size-input')
    sizeInputs.forEach(input => {
      input.addEventListener('input', (e) => this.handleInputChange(e))
    })

    // Gap input
    const gapInput = this.container.querySelector('.pp-gap-field')
    if (gapInput) {
      gapInput.addEventListener('input', (e) => this.handleInputChange(e))
    }

    // Padding token toggles
    const padTokens = this.container.querySelectorAll('.pp-pad-token')
    padTokens.forEach(token => {
      token.addEventListener('click', (e) => this.handlePadTokenClick(e))
    })

    // Padding inputs
    const padInputs = this.container.querySelectorAll('.pp-pad-input')
    padInputs.forEach(input => {
      input.addEventListener('input', (e) => this.handlePadInputChange(e))
    })

    // Padding expand/collapse
    const expandBtn = this.container.querySelector('.pp-pad-expand')
    if (expandBtn) {
      expandBtn.addEventListener('click', () => this.togglePaddingExpand(true))
    }
    const collapseBtn = this.container.querySelector('.pp-pad-collapse')
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => this.togglePaddingExpand(false))
    }

    // Border expand/collapse
    const borderExpandBtn = this.container.querySelector('.pp-border-expand')
    if (borderExpandBtn) {
      borderExpandBtn.addEventListener('click', () => this.toggleBorderExpand(true))
    }
    const borderCollapseBtn = this.container.querySelector('.pp-border-collapse')
    if (borderCollapseBtn) {
      borderCollapseBtn.addEventListener('click', () => this.toggleBorderExpand(false))
    }

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

    // Border style toggles (generic pp-toggle with data-border-style)
    const borderStyleToggles = this.container.querySelectorAll('.pp-toggle[data-border-style]')
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

    // Typography preset buttons (font size) - reuses pp-pad-token
    const fontSizePresets = this.container.querySelectorAll('.pp-pad-token[data-font-size]')
    fontSizePresets.forEach(preset => {
      preset.addEventListener('click', (e) => this.handleFontSizePreset(e))
    })

    // Typography preset buttons (weight) - reuses pp-pad-token
    const weightPresets = this.container.querySelectorAll('.pp-pad-token[data-weight]')
    weightPresets.forEach(preset => {
      preset.addEventListener('click', (e) => this.handleWeightPreset(e))
    })

    // Text align toggles - reuses pp-pad-token
    const textAlignToggles = this.container.querySelectorAll('.pp-pad-token[data-text-align]')
    textAlignToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleTextAlignToggle(e))
    })

    // Text style toggles - reuses pp-pad-token
    const textStyleToggles = this.container.querySelectorAll('.pp-pad-token[data-text-style]')
    textStyleToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleTextStyleToggle(e))
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

    // Color swatches
    const colorSwatches = this.container.querySelectorAll('.pp-color-swatch')
    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', (e) => this.handleColorSwatchClick(e))
    })

    // Color pickers
    const colorPickers = this.container.querySelectorAll('.pp-color-picker')
    colorPickers.forEach(picker => {
      picker.addEventListener('input', (e) => this.handleColorPickerChange(e))
    })

    // Cursor select
    const cursorSelect = this.container.querySelector('.pp-cursor-select')
    if (cursorSelect) {
      cursorSelect.addEventListener('change', (e) => this.handleSelectChange(e))
    }
  }

  /**
   * Handle alignment grid click
   */
  private handleAlignmentClick(e: Event): void {
    const cell = (e.target as HTMLElement).closest('.pp-align-cell') as HTMLElement
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
    const toggle = (e.target as HTMLElement).closest('.pp-layout-toggle') as HTMLElement
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

    // Token reference with $ prefix for code (e.g., "$sm.pad")
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
   * Handle padding input change
   */
  private handlePadInputChange(e: Event): void {
    const input = e.target as HTMLInputElement
    if (!input || !this.currentElement) return

    const dir = input.dataset.padDir
    if (!dir) return

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
   * Update padding from current input values
   */
  private updatePaddingFromInputs(): void {
    if (!this.currentElement) return

    const spacingGroup = this.container.querySelector('.pp-spacing-group') as HTMLElement
    const isExpanded = spacingGroup?.dataset.expanded === 'true'

    let padValue: string

    if (isExpanded) {
      // Get T, R, B, L values (respecting token refs)
      const t = this.getPadValueFromInput(this.container.querySelector('.pp-pad-input[data-pad-dir="t"]') as HTMLInputElement)
      const r = this.getPadValueFromInput(this.container.querySelector('.pp-pad-input[data-pad-dir="r"]') as HTMLInputElement)
      const b = this.getPadValueFromInput(this.container.querySelector('.pp-pad-input[data-pad-dir="b"]') as HTMLInputElement)
      const l = this.getPadValueFromInput(this.container.querySelector('.pp-pad-input[data-pad-dir="l"]') as HTMLInputElement)

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
      const v = this.getPadValueFromInput(this.container.querySelector('.pp-pad-input[data-pad-dir="v"]') as HTMLInputElement)
      const h = this.getPadValueFromInput(this.container.querySelector('.pp-pad-input[data-pad-dir="h"]') as HTMLInputElement)

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
   * Show padding dropdown with preset values
   */
  private showPaddingDropdown(e: Event): void {
    const btn = e.target as HTMLElement
    const dir = btn.dataset.padDir
    if (!dir) return

    // Remove existing dropdown
    const existing = this.container.querySelector('.pp-pad-dropdown-menu')
    if (existing) existing.remove()

    // Create dropdown
    const dropdown = document.createElement('div')
    dropdown.className = 'pp-pad-dropdown-menu'
    dropdown.innerHTML = this.PADDING_PRESETS.map(val =>
      `<button class="pp-pad-preset" data-value="${val}">${val}</button>`
    ).join('')

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
        const input = this.container.querySelector(`.pp-pad-input[data-pad-dir="${dir}"]`) as HTMLInputElement
        if (input && value) {
          input.value = value
          this.updatePaddingFromInputs()
        }
        dropdown.remove()
      }
    })

    // Close on outside click
    const closeDropdown = (ev: MouseEvent) => {
      if (!dropdown.contains(ev.target as Node)) {
        dropdown.remove()
        document.removeEventListener('click', closeDropdown)
      }
    }
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

    // Close on outside click
    const closeFontDropdown = (ev: MouseEvent) => {
      if (!dropdown.contains(ev.target as Node)) {
        dropdown.remove()
        document.removeEventListener('click', closeFontDropdown)
      }
    }
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

    // Close on outside click
    const closeFontsizeDropdown = (ev: MouseEvent) => {
      if (!dropdown.contains(ev.target as Node)) {
        dropdown.remove()
        document.removeEventListener('click', closeFontsizeDropdown)
      }
    }
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

    // Close on outside click
    const closeWeightDropdown = (ev: MouseEvent) => {
      if (!dropdown.contains(ev.target as Node)) {
        dropdown.remove()
        document.removeEventListener('click', closeWeightDropdown)
      }
    }
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
      '\\bstacked\\b', '\\bgrid\\b'
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
   * Handle text input changes
   */
  private handleInputChange(e: Event): void {
    const input = e.target as HTMLInputElement
    const propName = input.dataset.prop
    if (!propName || !this.currentElement) return

    // Debounce
    this.debounce(propName, () => {
      this.updateProperty(propName, input.value)
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
      const activeStyle = this.container.querySelector('.pp-toggle[data-border-style].active') as HTMLElement
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
    const toggle = (e.target as HTMLElement).closest('.pp-toggle[data-border-style]') as HTMLElement
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
    const activeStyle = line?.querySelector('.pp-layout-toggle.active[data-border-style]') as HTMLElement

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
    const preset = (e.target as HTMLElement).closest('.pp-pad-token[data-font-size]') as HTMLElement
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
    const toggle = (e.target as HTMLElement).closest('.pp-pad-token[data-text-align]') as HTMLElement
    if (!toggle || !this.currentElement) return

    const align = toggle.dataset.textAlign
    if (!align) return

    const nodeId = this.currentElement.templateId || this.currentElement.nodeId
    const result = this.codeModifier.updateProperty(nodeId, 'text-align', align)
    this.onCodeChange(result)
  }

  /**
   * Handle text style toggle click (italic, underline, etc.) - reuses pp-pad-token
   */
  private handleTextStyleToggle(e: Event): void {
    const toggle = (e.target as HTMLElement).closest('.pp-pad-token[data-text-style]') as HTMLElement
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
   * Handle color swatch click
   */
  private handleColorSwatchClick(e: Event): void {
    const swatch = e.target as HTMLElement
    if (!swatch || !this.currentElement) return

    const color = swatch.dataset.color
    if (!color) return

    // Find which row this swatch belongs to (BG or Text)
    const row = swatch.closest('.pp-color-row')
    const picker = row?.querySelector('.pp-color-picker') as HTMLInputElement
    const prop = picker?.dataset.prop

    if (prop) {
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId
      const result = this.codeModifier.updateProperty(nodeId, prop, color)
      this.onCodeChange(result)
    }
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

    this.onCodeChange(result)
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
   */
  refresh(): void {
    const nodeId = this.selectionManager.getSelection()
    this.updatePanel(nodeId)
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
  selectionManager: SelectionManager,
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

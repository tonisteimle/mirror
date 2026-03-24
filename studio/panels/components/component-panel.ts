/**
 * Component Panel - Drag & drop component palette
 *
 * Provides a panel of draggable components including:
 * - Layout presets (Vertical, Horizontal, Grid, etc.)
 * - Basic components (Text, Button, Input, etc.)
 * - User-defined components from the current file
 */

import type { AST } from '../../../src/parser/ast'
import type {
  ComponentItem,
  ComponentSection,
  ComponentPanelConfig,
  ComponentPanelCallbacks,
  ComponentDragData,
  ComponentPanelTab,
} from './types'
import { getComponentIcon } from './icons'
import { LAYOUT_PRESETS, BASIC_COMPONENTS, getDefaultBasicSelection } from './layout-presets'
import { parseComponentSections } from './section-parser'
import { GhostRenderer, getGhostRenderer, getDefaultSizeForItem } from './ghost-renderer'
import { events } from '../../core'

/**
 * Component Panel class
 */
export class ComponentPanel {
  private container: HTMLElement
  private config: Required<Omit<ComponentPanelConfig, 'container'>>
  private callbacks: ComponentPanelCallbacks
  private sections: ComponentSection[] = []
  private allSections: ComponentSection[] = []  // All built-in components
  private basicSections: ComponentSection[] = []  // User's project components
  private searchQuery: string = ''
  private panelElement: HTMLElement | null = null
  private abortController: AbortController | null = null
  private ghostRenderer: GhostRenderer
  private activeTab: ComponentPanelTab = 'basic'

  constructor(config: ComponentPanelConfig, callbacks: ComponentPanelCallbacks = {}) {
    this.container = config.container
    this.config = {
      showLayoutPresets: config.showLayoutPresets ?? true,
      showBasicComponents: config.showBasicComponents ?? true,
      showTabBar: config.showTabBar ?? false,
      defaultTab: config.defaultTab ?? 'basic',
    }
    this.callbacks = callbacks
    this.ghostRenderer = getGhostRenderer()
    this.activeTab = this.config.defaultTab

    this.buildSections()
    this.render()
  }

  /**
   * Build sections from built-in and user-defined components
   */
  private buildSections(ast?: AST): void {
    // Build "All" sections - flat alphabetical list (no groups)
    this.allSections = []
    if (this.config.showLayoutPresets || this.config.showBasicComponents) {
      const allItems = [...LAYOUT_PRESETS, ...BASIC_COMPONENTS]
      allItems.sort((a, b) => a.name.localeCompare(b.name))
      this.allSections.push({
        name: '_all',  // Special marker - no header will be rendered
        items: allItems,
        isExpanded: true,
      })
    }

    // Build "Basic" sections (user's project components from AST)
    this.basicSections = []
    if (ast) {
      const userSections = parseComponentSections(ast)
      this.basicSections.push(...userSections)
    }

    // If no user components, show default selection of essential components
    if (this.basicSections.length === 0) {
      this.basicSections.push({
        name: 'Essentials',
        items: getDefaultBasicSelection(),
        isExpanded: true,
      })
    }

    // Set active sections based on current tab
    this.updateActiveSections()
  }

  /**
   * Update sections based on active tab
   */
  private updateActiveSections(): void {
    if (this.config.showTabBar) {
      this.sections = this.activeTab === 'basic' ? this.basicSections : this.allSections
    } else {
      // No tab bar: show all sections (original behavior)
      this.sections = [...this.allSections]
      if (this.basicSections.length > 0 && this.basicSections[0].name !== 'Essentials') {
        this.sections.push(...this.basicSections)
      }
    }
  }

  /**
   * Update with new AST (call after compilation)
   */
  update(ast: AST): void {
    this.buildSections(ast)
    this.render()
  }

  /**
   * Render the component panel
   */
  render(): void {
    // Abort previous event listeners
    this.abortController?.abort()
    this.abortController = new AbortController()

    // Clear existing content
    this.container.innerHTML = ''

    // Create panel wrapper
    this.panelElement = document.createElement('div')
    this.panelElement.className = 'component-panel'

    // Add tab bar if enabled
    if (this.config.showTabBar) {
      const tabBar = this.renderTabBar()
      this.panelElement.appendChild(tabBar)
    }

    // Add search bar
    const searchBar = this.renderSearchBar()
    this.panelElement.appendChild(searchBar)

    // Add sections
    const sectionsContainer = document.createElement('div')
    sectionsContainer.className = 'component-panel-sections'

    for (const section of this.sections) {
      const sectionEl = this.renderSection(section)
      sectionsContainer.appendChild(sectionEl)
    }

    this.panelElement.appendChild(sectionsContainer)
    this.container.appendChild(this.panelElement)

    // Warm the cache in the background
    this.warmGhostCache()
  }

  /**
   * Render the tab bar (Basic / All)
   * Minimal design: two text labels, active = white, inactive = gray
   */
  private renderTabBar(): HTMLElement {
    const tabBar = document.createElement('div')
    tabBar.className = 'component-panel-tabs'

    // Basic tab
    const basicTab = document.createElement('button')
    basicTab.className = `component-panel-tab ${this.activeTab === 'basic' ? 'active' : ''}`
    basicTab.textContent = 'Basic'
    basicTab.addEventListener('click', () => this.setActiveTab('basic'), {
      signal: this.abortController?.signal,
    })

    // All tab
    const allTab = document.createElement('button')
    allTab.className = `component-panel-tab ${this.activeTab === 'all' ? 'active' : ''}`
    allTab.textContent = 'All'
    allTab.addEventListener('click', () => this.setActiveTab('all'), {
      signal: this.abortController?.signal,
    })

    tabBar.appendChild(basicTab)
    tabBar.appendChild(allTab)

    return tabBar
  }

  /**
   * Set the active tab
   */
  setActiveTab(tab: ComponentPanelTab): void {
    if (this.activeTab === tab) return
    this.activeTab = tab

    // Update sections
    this.updateActiveSections()

    // Re-render
    this.render()

    // Emit event
    events.emit('components:tab-changed', { tab })
  }

  /**
   * Get the active tab
   */
  getActiveTab(): ComponentPanelTab {
    return this.activeTab
  }

  /**
   * Set basic components (from components file sync)
   * Used to update the Basic tab with user-defined components
   */
  setBasicComponents(sections: ComponentSection[]): void {
    // Only update if we have meaningful sections (not Essentials)
    if (sections.length > 0 && sections[0].name !== 'Essentials') {
      this.basicSections = sections
    }
    this.updateActiveSections()
    this.render()
  }

  /**
   * Get basic sections
   */
  getBasicSections(): ComponentSection[] {
    return this.basicSections
  }

  /**
   * Pre-render ghosts for all components in the background
   */
  private warmGhostCache(): void {
    // Collect all items from all sections
    const allItems = this.sections.flatMap(section => section.items)

    // Warm cache asynchronously (low priority)
    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleIdle = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 100)

    scheduleIdle(() => {
      this.ghostRenderer.warmCache(allItems).catch(() => {})
    })
  }

  /**
   * Render the search bar
   */
  private renderSearchBar(): HTMLElement {
    const searchContainer = document.createElement('div')
    searchContainer.className = 'component-panel-search'

    const searchInput = document.createElement('input')
    searchInput.type = 'text'
    searchInput.placeholder = 'Search components...'
    searchInput.className = 'component-panel-search-input'
    searchInput.value = this.searchQuery

    searchInput.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase()
      this.updateVisibility()
    }, { signal: this.abortController?.signal })

    searchContainer.appendChild(searchInput)
    return searchContainer
  }

  // Chevron SVGs for section toggle (same as Section component)
  private static CHEVRON_RIGHT = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2L8 6L4 10"/></svg>`
  private static CHEVRON_DOWN = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4L6 8L10 4"/></svg>`

  /**
   * Render a section
   */
  private renderSection(section: ComponentSection): HTMLElement {
    const sectionEl = document.createElement('div')
    sectionEl.className = 'component-panel-section'
    sectionEl.dataset.section = section.name

    // Skip header for flat list (_all section)
    const isFlat = section.name === '_all'

    if (!isFlat) {
      // Section header with toggle
      const header = document.createElement('div')
      header.className = 'component-panel-section-header'

      const toggle = document.createElement('span')
      toggle.className = 'component-panel-section-toggle'
      toggle.innerHTML = section.isExpanded ? ComponentPanel.CHEVRON_DOWN : ComponentPanel.CHEVRON_RIGHT

      const nameSpan = document.createElement('span')
      nameSpan.className = 'component-panel-section-name'
      nameSpan.textContent = section.name

      header.appendChild(toggle)
      header.appendChild(nameSpan)

      header.addEventListener('click', () => {
        section.isExpanded = !section.isExpanded
        sectionEl.classList.toggle('collapsed', !section.isExpanded)
        toggle.innerHTML = section.isExpanded ? ComponentPanel.CHEVRON_DOWN : ComponentPanel.CHEVRON_RIGHT
      }, { signal: this.abortController?.signal })

      sectionEl.appendChild(header)
    }

    // Section items
    const itemsContainer = document.createElement('div')
    itemsContainer.className = 'component-panel-items'

    for (const item of section.items) {
      const itemEl = this.renderItem(item)
      itemsContainer.appendChild(itemEl)
    }

    sectionEl.appendChild(itemsContainer)

    if (!isFlat && !section.isExpanded) {
      sectionEl.classList.add('collapsed')
    }

    return sectionEl
  }

  /**
   * Render a component item
   */
  private renderItem(item: ComponentItem): HTMLElement {
    const itemEl = document.createElement('div')
    itemEl.className = 'component-panel-item'
    itemEl.dataset.id = item.id
    itemEl.draggable = true

    // Icon (innerHTML is safe here - icons are from trusted source)
    const iconEl = document.createElement('span')
    iconEl.className = 'component-panel-item-icon'
    iconEl.innerHTML = getComponentIcon(item.icon)
    itemEl.appendChild(iconEl)

    // Name
    const nameEl = document.createElement('span')
    nameEl.className = 'component-panel-item-name'
    nameEl.textContent = item.name
    itemEl.appendChild(nameEl)

    // Tooltip
    if (item.description) {
      itemEl.title = item.description
    }

    const signal = this.abortController?.signal

    // Drag events
    itemEl.addEventListener('dragstart', (e) => {
      this.handleDragStart(item, e)
    }, { signal })

    itemEl.addEventListener('dragend', (e) => {
      this.handleDragEnd(item, e)
    }, { signal })

    // Click to insert
    itemEl.addEventListener('click', () => {
      this.callbacks.onClick?.(item)
    }, { signal })

    return itemEl
  }

  /**
   * Handle drag start
   */
  private handleDragStart(item: ComponentItem, event: DragEvent): void {
    if (!event.dataTransfer) return

    // Set drag data
    const dragData: ComponentDragData = {
      componentName: item.template,
      properties: item.properties,
      textContent: item.textContent,
      fromComponentPanel: true,
      fromAllTab: this.config.showTabBar && this.activeTab === 'all',
      children: item.children,
    }

    event.dataTransfer.setData('application/mirror-component', JSON.stringify(dragData))
    // NOTE: We intentionally do NOT set text/plain to prevent CodeMirror from auto-inserting
    // the text at cursor position. EditorDropHandler handles code insertion properly.
    event.dataTransfer.effectAllowed = 'copy'

    // Add dragging class
    const target = event.target as HTMLElement
    target.classList.add('dragging')

    // Try to use cached rendered ghost (sync path)
    const cached = this.ghostRenderer.renderSync(item)
    if (cached) {
      this.setupDragImage(event, cached.element, cached.size)
    } else {
      // Fallback: use a placeholder with default size
      this.setupFallbackDragImage(event, item)
    }

    // Notify callback
    this.callbacks.onDragStart?.(item, event)
  }

  /**
   * Setup the drag image from a rendered element
   */
  private setupDragImage(event: DragEvent, element: HTMLElement, size: { width: number; height: number }): void {
    if (!event.dataTransfer) return

    // Create a temporary container for the drag image
    const dragImage = document.createElement('div')
    dragImage.id = 'component-drag-image'
    Object.assign(dragImage.style, {
      position: 'fixed',
      left: '-9999px',
      top: '-9999px',
      pointerEvents: 'none',
    })

    // Clone and append the rendered element
    const clone = element.cloneNode(true) as HTMLElement
    Object.assign(clone.style, {
      opacity: '0.85',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    })
    dragImage.appendChild(clone)
    document.body.appendChild(dragImage)

    // Set drag image centered on cursor
    event.dataTransfer.setDragImage(dragImage, size.width / 2, size.height / 2)

    // Clean up after a short delay
    setTimeout(() => dragImage.remove(), 100)
  }

  /**
   * Setup a fallback drag image when cache is not available
   */
  private setupFallbackDragImage(event: DragEvent, item: ComponentItem): void {
    if (!event.dataTransfer) return

    const size = getDefaultSizeForItem(item)

    // Create a placeholder element
    const dragImage = document.createElement('div')
    dragImage.id = 'component-drag-image-fallback'
    Object.assign(dragImage.style, {
      position: 'fixed',
      left: '-9999px',
      top: '-9999px',
      width: `${size.width}px`,
      height: `${size.height}px`,
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
      border: '2px solid #3b82f6',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontFamily: 'system-ui, sans-serif',
      color: '#3b82f6',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      pointerEvents: 'none',
    })
    dragImage.textContent = item.name

    document.body.appendChild(dragImage)
    event.dataTransfer.setDragImage(dragImage, size.width / 2, size.height / 2)

    // Clean up after a short delay
    setTimeout(() => dragImage.remove(), 100)
  }

  /**
   * Handle drag end
   */
  private handleDragEnd(item: ComponentItem, event: DragEvent): void {
    // Remove dragging class
    const target = event.target as HTMLElement
    target.classList.remove('dragging')

    // Notify callback
    this.callbacks.onDragEnd?.(item, event)
  }

  /**
   * Build Mirror code for a component
   */
  private buildComponentCode(item: ComponentItem, indent: string = ''): string {
    let code = indent + item.template

    if (item.properties) {
      code += ` ${item.properties}`
    }

    if (item.textContent) {
      code += ` "${item.textContent}"`
    }

    // Add children with proper indentation
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        code += '\n' + this.buildChildCode(child, indent + '  ')
      }
    }

    return code
  }

  /**
   * Build Mirror code for a child component
   */
  private buildChildCode(child: { template: string; properties?: string; textContent?: string; children?: any[]; isSlot?: boolean; isItem?: boolean }, indent: string): string {
    // Handle slot syntax (e.g., "Trigger:")
    if (child.isSlot) {
      let code = indent + child.template + ':'
      if (child.properties) {
        code += '\n' + indent + '  ' + child.properties
      }
      // Recursively add nested children
      if (child.children && child.children.length > 0) {
        for (const nested of child.children) {
          code += '\n' + this.buildChildCode(nested, indent + '  ')
        }
      }
      return code
    }

    // Handle item syntax (e.g., 'Item "Option A"')
    if (child.isItem) {
      let code = indent + child.template
      if (child.textContent) {
        code += ` "${child.textContent}"`
      }
      if (child.properties) {
        code += `, ${child.properties}`
      }
      return code
    }

    // Standard component syntax
    let code = indent + child.template

    if (child.properties) {
      code += ` ${child.properties}`
    }

    if (child.textContent) {
      code += ` "${child.textContent}"`
    }

    // Recursively add nested children
    if (child.children && child.children.length > 0) {
      for (const nested of child.children) {
        code += '\n' + this.buildChildCode(nested, indent + '  ')
      }
    }

    return code
  }

  /**
   * Update item visibility based on search query
   */
  private updateVisibility(): void {
    if (!this.panelElement) return

    const items = this.panelElement.querySelectorAll<HTMLElement>('.component-panel-item')

    for (const itemEl of items) {
      const name = itemEl.querySelector('.component-panel-item-name')?.textContent?.toLowerCase() ?? ''
      const matches = !this.searchQuery || name.includes(this.searchQuery)
      itemEl.style.display = matches ? '' : 'none'
    }

    // Hide empty sections
    const sections = this.panelElement.querySelectorAll<HTMLElement>('.component-panel-section')
    for (const sectionEl of sections) {
      const visibleItems = sectionEl.querySelectorAll('.component-panel-item:not([style*="display: none"])')
      sectionEl.style.display = visibleItems.length > 0 ? '' : 'none'
    }
  }

  /**
   * Get all sections
   */
  getSections(): ComponentSection[] {
    return this.sections
  }

  /**
   * Dispose the panel
   */
  dispose(): void {
    // Abort all event listeners
    this.abortController?.abort()
    this.abortController = null

    this.container.innerHTML = ''
    this.panelElement = null
    this.sections = []
  }
}

/**
 * Create a ComponentPanel instance
 */
export function createComponentPanel(
  config: ComponentPanelConfig,
  callbacks?: ComponentPanelCallbacks
): ComponentPanel {
  return new ComponentPanel(config, callbacks)
}

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
} from './types'
import { getComponentIcon } from './icons'
import { BASIC_PRIMITIVES, BASIC_COMPONENTS } from './layout-presets'
import { parseComponentSections } from './section-parser'
import { GhostRenderer, getGhostRenderer, getDefaultSizeForItem } from './ghost-renderer'

// =============================================================================
// Icons
// =============================================================================

/**
 * Component Panel class
 */
export class ComponentPanel {
  private container: HTMLElement
  private config: Required<Omit<ComponentPanelConfig, 'container'>>
  private callbacks: ComponentPanelCallbacks
  private sections: ComponentSection[] = []
  private searchQuery: string = ''
  private panelElement: HTMLElement | null = null
  private abortController: AbortController | null = null
  private ghostRenderer: GhostRenderer

  constructor(config: ComponentPanelConfig, callbacks: ComponentPanelCallbacks = {}) {
    this.container = config.container
    this.config = {
      showLayoutPresets: config.showLayoutPresets ?? true,
      showBasicComponents: config.showBasicComponents ?? true,
      showTabBar: false,
      defaultTab: 'basic',
    }
    this.callbacks = callbacks
    this.ghostRenderer = getGhostRenderer()

    this.buildSections()
    this.render()
  }

  /**
   * Build sections - Basic primitives and Components
   */
  private buildSections(): void {
    this.sections = []

    // Basic section (Frame, Text, Icon, Image)
    if (BASIC_PRIMITIVES.length > 0) {
      this.sections.push({
        name: 'Basic',
        items: [...BASIC_PRIMITIVES],
        isExpanded: true,
      })
    }

    // Components section (alphabetically sorted)
    if (BASIC_COMPONENTS.length > 0) {
      const sortedComponents = [...BASIC_COMPONENTS].sort((a, b) => a.name.localeCompare(b.name))
      this.sections.push({
        name: 'Components',
        items: sortedComponents,
        isExpanded: true,
      })
    }
  }

  /**
   * Refresh the panel
   */
  refresh(): void {
    this.buildSections()
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

    // Add header with hamburger menu
    const header = this.renderHeader()
    this.panelElement.appendChild(header)

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
   * Render the header
   */
  private renderHeader(): HTMLElement {
    const header = document.createElement('div')
    header.className = 'cp-header'
    header.innerHTML = `<span class="cp-title">Components</span>`
    return header
  }

  /**
   * Collapse all sections
   */
  private collapseAllSections(): void {
    for (const section of this.sections) {
      section.isExpanded = false
    }
    this.render()
  }

  /**
   * Expand all sections
   */
  private expandAllSections(): void {
    for (const section of this.sections) {
      section.isExpanded = true
    }
    this.render()
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

    // Set drag data (include componentId for template-based code generation)
    const dragData: ComponentDragData = {
      componentId: item.id,
      componentName: item.template,
      properties: item.properties,
      textContent: item.textContent,
      fromComponentPanel: true,
      children: item.children,
    }

    event.dataTransfer.setData('application/mirror-component', JSON.stringify(dragData))
    // Set text/plain to a marker - required for drag to work in some browsers
    // EditorDropHandler will prevent CodeMirror from inserting this
    event.dataTransfer.setData('text/plain', '\n')
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

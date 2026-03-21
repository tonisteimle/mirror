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
import { LAYOUT_PRESETS, BASIC_COMPONENTS } from './layout-presets'
import { parseComponentSections } from './section-parser'

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

  constructor(config: ComponentPanelConfig, callbacks: ComponentPanelCallbacks = {}) {
    this.container = config.container
    this.config = {
      showLayoutPresets: config.showLayoutPresets ?? true,
      showBasicComponents: config.showBasicComponents ?? true,
    }
    this.callbacks = callbacks

    this.buildSections()
    this.render()
  }

  /**
   * Build sections from built-in and user-defined components
   */
  private buildSections(ast?: AST): void {
    this.sections = []

    // Add layout presets section
    if (this.config.showLayoutPresets) {
      this.sections.push({
        name: 'Layouts',
        items: LAYOUT_PRESETS,
        isExpanded: true,
      })
    }

    // Add basic components section
    if (this.config.showBasicComponents) {
      this.sections.push({
        name: 'Basic',
        items: BASIC_COMPONENTS,
        isExpanded: true,
      })
    }

    // Add user-defined sections from AST
    if (ast) {
      const userSections = parseComponentSections(ast)
      this.sections.push(...userSections)
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

  /**
   * Render a section
   */
  private renderSection(section: ComponentSection): HTMLElement {
    const sectionEl = document.createElement('div')
    sectionEl.className = 'component-panel-section'
    sectionEl.dataset.section = section.name

    // Section header (avoid innerHTML for XSS safety)
    const header = document.createElement('div')
    header.className = 'component-panel-section-header'

    const toggle = document.createElement('span')
    toggle.className = 'component-panel-section-toggle'
    toggle.textContent = section.isExpanded ? '\u25BC' : '\u25B6' // ▼ or ▶

    const nameSpan = document.createElement('span')
    nameSpan.className = 'component-panel-section-name'
    nameSpan.textContent = section.name

    header.appendChild(toggle)
    header.appendChild(nameSpan)

    header.addEventListener('click', () => {
      section.isExpanded = !section.isExpanded
      sectionEl.classList.toggle('collapsed', !section.isExpanded)
      toggle.textContent = section.isExpanded ? '\u25BC' : '\u25B6'
    }, { signal: this.abortController?.signal })

    sectionEl.appendChild(header)

    // Section items
    const itemsContainer = document.createElement('div')
    itemsContainer.className = 'component-panel-items'

    for (const item of section.items) {
      const itemEl = this.renderItem(item)
      itemsContainer.appendChild(itemEl)
    }

    sectionEl.appendChild(itemsContainer)

    if (!section.isExpanded) {
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
      children: item.children,
    }

    event.dataTransfer.setData('application/mirror-component', JSON.stringify(dragData))
    event.dataTransfer.setData('text/plain', this.buildComponentCode(item))
    event.dataTransfer.effectAllowed = 'copy'

    // Add dragging class
    const target = event.target as HTMLElement
    target.classList.add('dragging')

    // Create custom drag image with correct size
    const dragImage = this.createDragImage(item, target)
    document.body.appendChild(dragImage)

    // Position drag image at cursor center
    const rect = target.getBoundingClientRect()
    event.dataTransfer.setDragImage(dragImage, rect.width / 2, rect.height / 2)

    // Remove drag image after a frame (browser has copied it)
    requestAnimationFrame(() => {
      dragImage.remove()
    })

    // Notify callback
    this.callbacks.onDragStart?.(item, event)
  }

  /**
   * Create a drag image element that matches the panel item exactly
   */
  private createDragImage(_item: ComponentItem, sourceElement: HTMLElement): HTMLElement {
    // Clone the source element to get an exact copy
    const dragImage = sourceElement.cloneNode(true) as HTMLElement

    // Position off-screen for the browser to capture
    Object.assign(dragImage.style, {
      position: 'fixed',
      left: '-9999px',
      top: '-9999px',
      pointerEvents: 'none',
      zIndex: '99999',
    })

    return dragImage
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
  private buildChildCode(child: { template: string; properties?: string; textContent?: string; children?: any[] }, indent: string): string {
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

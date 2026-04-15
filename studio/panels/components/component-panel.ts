/**
 * Component Panel - Drag & drop component palette
 *
 * Provides a panel of draggable components including:
 * - Layout presets (Vertical, Horizontal, Grid, etc.)
 * - Basic components (Text, Button, Input, etc.)
 * - User-defined components from the current file
 */

import type { AST } from '../../../compiler'
import type {
  ComponentItem,
  ComponentSection,
  ComponentPanelConfig,
  ComponentPanelCallbacks,
  ComponentDragData,
  ComponentChild,
} from './types'
import { getComponentIcon } from '../../icons'
import { LAYOUT_SECTION, COMPONENTS_SECTION } from './layout-presets'
import { parseComponentSections } from './section-parser'
import { setCurrentDragData, clearCurrentDragData } from '../../preview/drag-preview'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('ComponentPanel')

// =============================================================================
// User Component Parser
// =============================================================================

interface ParsedComponent {
  name: string
  basePrimitive?: string
  hasChildren: boolean
  line: number
}

/**
 * Get indentation level of a line (number of leading spaces)
 */
function getIndent(line: string): number {
  const match = line.match(/^(\s*)/)
  return match ? match[1].length : 0
}

/**
 * Check if a component definition has children (indented content below)
 */
function hasChildContent(lines: string[], startIndex: number): boolean {
  const startIndent = getIndent(lines[startIndex])

  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//')) continue

    const indent = getIndent(line)

    // If same or less indentation, this is a sibling or parent - no children
    if (indent <= startIndent) return false

    // If more indentation, this is a child
    if (indent > startIndent) return true
  }

  return false
}

/**
 * Parse component definitions from .com file content
 *
 * Only returns "real" components:
 * - Derived components with `as` keyword (e.g., PrimaryBtn as Button)
 * - Composite components with children
 *
 * Excludes:
 * - Tokens (names containing `.` like primary.bg)
 * - Pure property sets without `as` and without children
 */
function parseComFile(content: string): ParsedComponent[] {
  const components: ParsedComponent[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//')) continue

    // Component definition: Name: or Name as Base:
    const match = trimmed.match(/^([A-Z][a-zA-Z0-9_-]*)(?:\s+as\s+([a-zA-Z][a-zA-Z0-9_-]*))?:/)
    if (match) {
      const name = match[1]
      const basePrimitive = match[2]

      // Skip tokens (names containing .)
      if (name.includes('.')) continue

      const hasChildren = hasChildContent(lines, i)

      // Only include if it has `as` (derived) OR has children (composite)
      if (basePrimitive || hasChildren) {
        components.push({
          name,
          basePrimitive,
          hasChildren,
          line: i + 1,
        })
      }
    }
  }

  return components
}

// =============================================================================
// Component Panel
// =============================================================================

/**
 * Component Panel class
 */
export class ComponentPanel {
  private container: HTMLElement
  private config: Required<Omit<ComponentPanelConfig, 'container' | 'getComFiles'>> & {
    getComFiles?: () => Array<{ name: string; content: string }>
  }
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
      showTabBar: false,
      defaultTab: 'basic',
      getComFiles: config.getComFiles,
    }
    this.callbacks = callbacks

    this.buildSections()
    this.render()
  }

  /**
   * Build sections: Layout, Components, and My Components
   */
  private buildSections(): void {
    this.sections = []

    // 1. Layout section (Row, Column, Grid, Stack)
    if (LAYOUT_SECTION.length > 0) {
      this.sections.push({
        name: 'Layout',
        items: [...LAYOUT_SECTION],
        isExpanded: true,
      })
    }

    // 2. Components section (all UI components, alphabetically sorted)
    if (COMPONENTS_SECTION.length > 0) {
      this.sections.push({
        name: 'Components',
        items: [...COMPONENTS_SECTION],
        isExpanded: true,
      })
    }

    // 3. My Components section (user-defined from .com files)
    if (this.config.getComFiles) {
      const comFiles = this.config.getComFiles()
      const userItems: ComponentItem[] = []

      for (const file of comFiles) {
        const components = parseComFile(file.content)
        for (const comp of components) {
          // Build description based on component type
          let description: string
          if (comp.basePrimitive) {
            description = `Extends ${comp.basePrimitive}`
          } else if (comp.hasChildren) {
            description = 'Composite component'
          } else {
            description = `From ${file.name}`
          }

          userItems.push({
            id: `user-${comp.name.toLowerCase()}`,
            name: comp.name,
            category: 'User',
            template: comp.name,
            icon: 'custom',
            isUserDefined: true,
            description,
          })
        }
      }

      if (userItems.length > 0) {
        this.sections.push({
          name: 'My Components',
          items: userItems,
          isExpanded: true,
        })
      }
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

    searchInput.addEventListener(
      'input',
      e => {
        this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase()
        this.updateVisibility()
      },
      { signal: this.abortController?.signal }
    )

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
      toggle.innerHTML = section.isExpanded
        ? ComponentPanel.CHEVRON_DOWN
        : ComponentPanel.CHEVRON_RIGHT

      const nameSpan = document.createElement('span')
      nameSpan.className = 'component-panel-section-name'
      nameSpan.textContent = section.name

      header.appendChild(toggle)
      header.appendChild(nameSpan)

      header.addEventListener(
        'click',
        () => {
          section.isExpanded = !section.isExpanded
          sectionEl.classList.toggle('collapsed', !section.isExpanded)
          toggle.innerHTML = section.isExpanded
            ? ComponentPanel.CHEVRON_DOWN
            : ComponentPanel.CHEVRON_RIGHT
        },
        { signal: this.abortController?.signal }
      )

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
    itemEl.addEventListener(
      'dragstart',
      e => {
        this.handleDragStart(item, e)
      },
      { signal }
    )

    itemEl.addEventListener(
      'dragend',
      e => {
        this.handleDragEnd(item, e)
      },
      { signal }
    )

    // Click to insert
    itemEl.addEventListener(
      'click',
      () => {
        this.callbacks.onClick?.(item)
      },
      { signal }
    )

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
      mirTemplate: item.mirTemplate,
      dataBlock: item.dataBlock,
    }

    event.dataTransfer.setData('application/mirror-component', JSON.stringify(dragData))
    // Set text/plain to a marker - required for drag to work in some browsers
    // EditorDropHandler will prevent CodeMirror from inserting this
    event.dataTransfer.setData('text/plain', '\n')
    event.dataTransfer.effectAllowed = 'copy'

    // Store drag data globally for DragPreview (dataTransfer not readable in dragenter)
    setCurrentDragData(
      {
        componentId: item.id,
        componentName: item.template,
        properties: item.properties,
        textContent: item.textContent,
      },
      item
    )

    // Add dragging class
    const target = event.target as HTMLElement
    target.classList.add('dragging')

    // Show visible drag image with icon + text
    this.setupVisibleDragImage(event, item)

    // Notify callback
    this.callbacks.onDragStart?.(item, event)
  }

  /**
   * Setup drag image showing icon + text (like in the panel)
   */
  private setupDragImage(
    event: DragEvent,
    _element: HTMLElement,
    _size: { width: number; height: number }
  ): void {
    // Use visible drag image - handled in handleDragStart
  }

  /**
   * Setup drag image showing icon + text (fallback path)
   */
  private setupFallbackDragImage(event: DragEvent, _item: ComponentItem): void {
    // Use visible drag image - handled in handleDragStart
  }

  /**
   * Create a visible drag image with icon + text
   */
  private setupVisibleDragImage(event: DragEvent, item: ComponentItem): void {
    if (!event.dataTransfer) return

    // Create drag image element
    const dragImage = document.createElement('div')
    dragImage.id = 'component-drag-image'
    Object.assign(dragImage.style, {
      position: 'fixed',
      left: '-9999px',
      top: '-9999px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      background: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '6px',
      color: '#fff',
      fontSize: '13px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    })

    // Add icon
    const iconSpan = document.createElement('span')
    iconSpan.innerHTML = getComponentIcon(item.icon)
    Object.assign(iconSpan.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '16px',
      height: '16px',
      color: '#888',
    })
    // Style the SVG inside
    const svg = iconSpan.querySelector('svg')
    if (svg) {
      svg.style.width = '16px'
      svg.style.height = '16px'
    }
    dragImage.appendChild(iconSpan)

    // Add text
    const textSpan = document.createElement('span')
    textSpan.textContent = item.name
    dragImage.appendChild(textSpan)

    // Must be in DOM for setDragImage to work
    document.body.appendChild(dragImage)
    event.dataTransfer.setDragImage(dragImage, 20, 20)

    // Clean up after browser has captured the image
    setTimeout(() => dragImage.remove(), 0)
  }

  /**
   * Handle drag end
   */
  private handleDragEnd(item: ComponentItem, event: DragEvent): void {
    // Remove dragging class
    const target = event.target as HTMLElement
    target.classList.remove('dragging')

    // Clear global drag data
    clearCurrentDragData()

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
  private buildChildCode(child: ComponentChild, indent: string): string {
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
      const name =
        itemEl.querySelector('.component-panel-item-name')?.textContent?.toLowerCase() ?? ''
      const matches = !this.searchQuery || name.includes(this.searchQuery)
      itemEl.style.display = matches ? '' : 'none'
    }

    // Hide empty sections
    const sections = this.panelElement.querySelectorAll<HTMLElement>('.component-panel-section')
    for (const sectionEl of sections) {
      const visibleItems = sectionEl.querySelectorAll(
        '.component-panel-item:not([style*="display: none"])'
      )
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

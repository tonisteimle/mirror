/**
 * User Components Panel - Shows user-defined components from .com files
 *
 * Displays components defined in .com files and allows dragging them
 * as instances (not definitions) into .mir files.
 */

import type {
  ComponentItem,
  ComponentSection,
  ComponentPanelCallbacks,
  ComponentDragData,
} from './types'
import { getComponentIcon } from '../../icons'
import { createSectionHeader } from '../../components/section-header'

// =============================================================================
// System Components (built-in, not shown in MyComponents)
// =============================================================================

/**
 * Component names that are system/built-in and should not appear in MyComponents.
 * These are added automatically when dropping from the Component Panel.
 */
const SYSTEM_COMPONENTS = new Set([
  // Accordion
  'AccordionItem',
  // Tabs
  'Tab',
  'TabBar',
  'TabContent',
  // Add more system components here as needed
])

/**
 * Check if a component name is a system component (built-in)
 */
export function isSystemComponent(name: string): boolean {
  return SYSTEM_COMPONENTS.has(name)
}

/**
 * Get all system component names
 */
export function getSystemComponentNames(): string[] {
  return Array.from(SYSTEM_COMPONENTS)
}

// =============================================================================
// Types
// =============================================================================

export interface UserComponentsPanelConfig {
  /** Container element for the panel */
  container: HTMLElement
  /** Callback to get all .com file contents */
  getComFiles: () => Array<{ name: string; content: string }>
}

export interface UserComponentsPanelCallbacks extends ComponentPanelCallbacks {
  /** Called when refresh is requested */
  onRefresh?: () => void
}

// =============================================================================
// Parser
// =============================================================================

interface ParsedComponent {
  name: string
  basePrimitive?: string
  properties?: string
  line: number
}

/**
 * Parse component definitions from .com file content
 * Filters out system components (built-in components from Component Panel)
 */
function parseComFile(content: string, filename: string): ParsedComponent[] {
  const components: ParsedComponent[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//')) continue

    // Component definition: Name: or Name as Base: (with optional inline properties)
    // Examples: "App:", "Button as button:", "Card: bg $surface, pad $l"
    const match = trimmed.match(/^([A-Z][a-zA-Z0-9_-]*)(?:\s+as\s+([a-zA-Z][a-zA-Z0-9_-]*))?:/)
    if (match) {
      const componentName = match[1]

      // Skip system components (built-in from Component Panel)
      if (SYSTEM_COMPONENTS.has(componentName)) {
        continue
      }

      components.push({
        name: componentName,
        basePrimitive: match[2],
        line: i + 1,
      })
    }
  }

  return components
}

// =============================================================================
// Component
// =============================================================================

/**
 * User Components Panel class
 */
export class UserComponentsPanel {
  private container: HTMLElement
  private config: UserComponentsPanelConfig
  private callbacks: UserComponentsPanelCallbacks
  private sections: ComponentSection[] = []
  private searchQuery: string = ''
  private panelElement: HTMLElement | null = null
  private abortController: AbortController | null = null

  constructor(config: UserComponentsPanelConfig, callbacks: UserComponentsPanelCallbacks = {}) {
    this.container = config.container
    this.config = config
    this.callbacks = callbacks

    this.buildSections()
    this.render()
  }

  /**
   * Build sections from .com files
   */
  private buildSections(): void {
    this.sections = []

    const comFiles = this.config.getComFiles()

    for (const file of comFiles) {
      const components = parseComFile(file.content, file.name)

      if (components.length > 0) {
        // Use filename without extension as section name
        const sectionName = file.name.replace(/\.(com|components)$/, '')

        this.sections.push({
          name: sectionName,
          isExpanded: true,
          items: components.map(comp => this.createComponentItem(comp, file.name)),
        })
      }
    }

    // If no sections, add empty state info
    if (this.sections.length === 0) {
      // Will show empty state in render
    }
  }

  /**
   * Create a ComponentItem from a parsed component
   */
  private createComponentItem(comp: ParsedComponent, filename: string): ComponentItem {
    return {
      id: `user-${comp.name.toLowerCase()}`,
      name: comp.name,
      category: 'User',
      // Template is just the component name - creates an instance
      template: comp.name,
      icon: 'custom',
      isUserDefined: true,
      description: comp.basePrimitive
        ? `${comp.name} (extends ${comp.basePrimitive})`
        : `User-defined component from ${filename}`,
    }
  }

  /**
   * Refresh the panel (re-parse .com files)
   */
  refresh(): void {
    this.buildSections()
    this.render()
    this.callbacks.onRefresh?.()
  }

  /**
   * Render the panel
   */
  render(): void {
    // Abort previous event listeners
    this.abortController?.abort()
    this.abortController = new AbortController()

    // Clear existing content
    this.container.innerHTML = ''

    // Create panel wrapper
    this.panelElement = document.createElement('div')
    this.panelElement.className = 'user-components-panel'

    // Add header with hamburger menu
    const header = this.renderHeader()
    this.panelElement.appendChild(header)

    // Add search bar
    const searchBar = this.renderSearchBar()
    this.panelElement.appendChild(searchBar)

    // Add sections or empty state
    if (this.sections.length === 0) {
      const emptyState = this.renderEmptyState()
      this.panelElement.appendChild(emptyState)
    } else {
      const sectionsContainer = document.createElement('div')
      sectionsContainer.className = 'user-components-panel-sections'

      for (const section of this.sections) {
        const sectionEl = this.renderSection(section)
        sectionsContainer.appendChild(sectionEl)
      }

      this.panelElement.appendChild(sectionsContainer)
    }

    this.container.appendChild(this.panelElement)
  }

  /**
   * Render the header
   */
  private renderHeader(): HTMLElement {
    const header = document.createElement('div')
    header.className = 'ucp-header'
    header.innerHTML = `<span class="ucp-title">My Components</span>`
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
    searchContainer.className = 'user-components-panel-search'

    const searchInput = document.createElement('input')
    searchInput.type = 'text'
    searchInput.placeholder = 'Search components...'
    searchInput.className = 'user-components-panel-search-input'
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

  /**
   * Render empty state
   */
  private renderEmptyState(): HTMLElement {
    const emptyState = document.createElement('div')
    emptyState.className = 'user-components-panel-empty'
    emptyState.innerHTML = `<div class="user-components-panel-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div><div class="user-components-panel-empty-text">Keine Komponenten</div><div class="user-components-panel-empty-hint">Definiere Komponenten in .com Dateien</div>`
    return emptyState
  }

  /**
   * Render a section
   */
  private renderSection(section: ComponentSection): HTMLElement {
    const sectionEl = document.createElement('div')
    sectionEl.className = 'user-components-panel-section'
    sectionEl.dataset.section = section.name

    // Use shared section header component
    const header = createSectionHeader({
      label: section.name,
      expanded: section.isExpanded,
      count: section.items.length,
      onToggle: expanded => {
        section.isExpanded = expanded
        sectionEl.classList.toggle('collapsed', !expanded)
      },
    })
    header.classList.add('user-components-panel-section-header')

    sectionEl.appendChild(header)

    // Section items
    const itemsContainer = document.createElement('div')
    itemsContainer.className = 'user-components-panel-items'

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
    itemEl.className = 'user-components-panel-item'
    itemEl.dataset.id = item.id
    itemEl.draggable = true

    // Icon
    const iconEl = document.createElement('span')
    iconEl.className = 'user-components-panel-item-icon'
    iconEl.innerHTML = getComponentIcon(item.icon)
    itemEl.appendChild(iconEl)

    // Name
    const nameEl = document.createElement('span')
    nameEl.className = 'user-components-panel-item-name'
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
   * Handle drag start - creates instance data (not definition)
   */
  private handleDragStart(item: ComponentItem, event: DragEvent): void {
    if (!event.dataTransfer) return

    // Set drag data - this creates an INSTANCE, not a definition
    const dragData: ComponentDragData = {
      componentId: item.id,
      componentName: item.template, // Just the component name
      fromComponentPanel: true,
      // No properties, no children - just the component name for instance
    }

    event.dataTransfer.setData('application/mirror-component', JSON.stringify(dragData))
    event.dataTransfer.setData('text/plain', '\n')
    event.dataTransfer.effectAllowed = 'copy'

    // Add dragging class
    const target = event.target as HTMLElement
    target.classList.add('dragging')

    // Setup drag image
    this.setupFallbackDragImage(event, item)

    // Notify callback
    this.callbacks.onDragStart?.(item, event)
  }

  /**
   * Setup an invisible drag image.
   * We use visual indicators (line, highlight) instead of a ghost.
   */
  private setupFallbackDragImage(event: DragEvent, _item: ComponentItem): void {
    if (!event.dataTransfer) return

    // Create a 1x1 transparent element
    const dragImage = document.createElement('div')
    dragImage.id = 'user-component-drag-image'
    Object.assign(dragImage.style, {
      position: 'fixed',
      left: '-9999px',
      top: '-9999px',
      width: '1px',
      height: '1px',
      opacity: '0',
      pointerEvents: 'none',
    })

    document.body.appendChild(dragImage)
    event.dataTransfer.setDragImage(dragImage, 0, 0)

    setTimeout(() => dragImage.remove(), 100)
  }

  /**
   * Handle drag end
   */
  private handleDragEnd(item: ComponentItem, event: DragEvent): void {
    const target = event.target as HTMLElement
    target.classList.remove('dragging')
    this.callbacks.onDragEnd?.(item, event)
  }

  /**
   * Update item visibility based on search query
   */
  private updateVisibility(): void {
    if (!this.panelElement) return

    const items = this.panelElement.querySelectorAll<HTMLElement>('.user-components-panel-item')

    for (const itemEl of items) {
      const name =
        itemEl.querySelector('.user-components-panel-item-name')?.textContent?.toLowerCase() ?? ''
      const matches = !this.searchQuery || name.includes(this.searchQuery)
      itemEl.style.display = matches ? '' : 'none'
    }

    // Hide empty sections
    const sections = this.panelElement.querySelectorAll<HTMLElement>(
      '.user-components-panel-section'
    )
    for (const sectionEl of sections) {
      const visibleItems = sectionEl.querySelectorAll(
        '.user-components-panel-item:not([style*="display: none"])'
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
    this.abortController?.abort()
    this.abortController = null
    this.container.innerHTML = ''
    this.panelElement = null
    this.sections = []
  }
}

/**
 * Create a UserComponentsPanel instance
 */
export function createUserComponentsPanel(
  config: UserComponentsPanelConfig,
  callbacks?: UserComponentsPanelCallbacks
): UserComponentsPanel {
  return new UserComponentsPanel(config, callbacks)
}

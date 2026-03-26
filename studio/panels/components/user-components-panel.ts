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
import { getComponentIcon } from './icons'
import { GhostRenderer, getGhostRenderer, getDefaultSizeForItem } from './ghost-renderer'

// =============================================================================
// Icons
// =============================================================================

const ICON_HAMBURGER = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <line x1="4" y1="6" x2="20" y2="6"/>
  <line x1="4" y1="12" x2="20" y2="12"/>
  <line x1="4" y1="18" x2="20" y2="18"/>
</svg>`

const ICON_REFRESH = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 2v6h-6"/>
  <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
  <path d="M3 22v-6h6"/>
  <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
</svg>`

const ICON_COLLAPSE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <polyline points="4 14 10 14 10 20"/>
  <polyline points="20 10 14 10 14 4"/>
  <line x1="14" y1="10" x2="21" y2="3"/>
  <line x1="3" y1="21" x2="10" y2="14"/>
</svg>`

const ICON_EXPAND = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <polyline points="15 3 21 3 21 9"/>
  <polyline points="9 21 3 21 3 15"/>
  <line x1="21" y1="3" x2="14" y2="10"/>
  <line x1="3" y1="21" x2="10" y2="14"/>
</svg>`

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
 */
function parseComFile(content: string, filename: string): ParsedComponent[] {
  const components: ParsedComponent[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//')) continue

    // Component definition: Name: or Name as Base:
    const match = trimmed.match(/^([A-Z][a-zA-Z0-9_-]*)(?:\s+as\s+([A-Z][a-zA-Z0-9_-]*))?:$/)
    if (match) {
      components.push({
        name: match[1],
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
  private ghostRenderer: GhostRenderer
  private menuOpen: boolean = false

  constructor(config: UserComponentsPanelConfig, callbacks: UserComponentsPanelCallbacks = {}) {
    this.container = config.container
    this.config = config
    this.callbacks = callbacks
    this.ghostRenderer = getGhostRenderer()

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
   * Render the header with hamburger menu
   */
  private renderHeader(): HTMLElement {
    const header = document.createElement('div')
    header.className = 'ucp-header'
    header.innerHTML = `
      <span class="ucp-title">My Components</span>
      <div class="ucp-header-actions">
        <button class="ucp-menu-btn" id="user-component-menu-btn" title="Menü">
          ${ICON_HAMBURGER}
        </button>
      </div>
    `

    // Menu button handler
    const menuBtn = header.querySelector('#user-component-menu-btn') as HTMLButtonElement
    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.toggleMenu(menuBtn)
    }, { signal: this.abortController?.signal })

    return header
  }

  /**
   * Toggle the dropdown menu
   */
  private toggleMenu(anchorBtn: HTMLElement): void {
    // Remove existing menu
    const existingMenu = document.getElementById('user-component-panel-menu')
    if (existingMenu) {
      existingMenu.remove()
      this.menuOpen = false
      return
    }

    // Create menu
    const menu = document.createElement('div')
    menu.id = 'user-component-panel-menu'
    menu.className = 'dropdown-menu'

    const menuItems = [
      { id: 'refresh', icon: ICON_REFRESH, label: 'Aktualisieren' },
      { type: 'separator' },
      { id: 'collapse-all', icon: ICON_COLLAPSE, label: 'Alle einklappen' },
      { id: 'expand-all', icon: ICON_EXPAND, label: 'Alle ausklappen' },
    ]

    for (const item of menuItems) {
      if ((item as any).type === 'separator') {
        const sep = document.createElement('div')
        sep.className = 'dropdown-menu-separator'
        menu.appendChild(sep)
      } else {
        const btn = document.createElement('button')
        btn.className = 'dropdown-menu-item'
        btn.innerHTML = `
          <span class="dropdown-menu-icon">${(item as any).icon}</span>
          <span class="dropdown-menu-label">${(item as any).label}</span>
        `
        btn.addEventListener('click', () => this.handleMenuAction((item as any).id))
        menu.appendChild(btn)
      }
    }

    // Position menu below button
    const rect = anchorBtn.getBoundingClientRect()
    menu.style.position = 'fixed'
    menu.style.top = `${rect.bottom + 4}px`
    menu.style.left = `${rect.right - 180}px`
    menu.style.zIndex = '9999'

    document.body.appendChild(menu)
    this.menuOpen = true

    // Close on click outside
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && e.target !== anchorBtn) {
        menu.remove()
        this.menuOpen = false
        document.removeEventListener('click', closeMenu)
      }
    }
    setTimeout(() => document.addEventListener('click', closeMenu), 0)
  }

  /**
   * Handle menu action
   */
  private handleMenuAction(action: string): void {
    // Close menu
    const menu = document.getElementById('user-component-panel-menu')
    if (menu) {
      menu.remove()
      this.menuOpen = false
    }

    switch (action) {
      case 'refresh':
        this.refresh()
        break
      case 'collapse-all':
        this.collapseAllSections()
        break
      case 'expand-all':
        this.expandAllSections()
        break
    }
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

    searchInput.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase()
      this.updateVisibility()
    }, { signal: this.abortController?.signal })

    searchContainer.appendChild(searchInput)
    return searchContainer
  }

  /**
   * Render empty state
   */
  private renderEmptyState(): HTMLElement {
    const emptyState = document.createElement('div')
    emptyState.className = 'user-components-panel-empty'
    emptyState.innerHTML = `
      <div class="user-components-panel-empty-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="m7.5 4.27 9 5.15"/>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
          <path d="m3.3 7 8.7 5 8.7-5"/>
          <path d="M12 22V12"/>
        </svg>
      </div>
      <div class="user-components-panel-empty-text">Keine Komponenten</div>
      <div class="user-components-panel-empty-hint">Definiere Komponenten in .com Dateien</div>
    `
    return emptyState
  }

  // Chevron SVGs for section toggle
  private static CHEVRON_RIGHT = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2L8 6L4 10"/></svg>`
  private static CHEVRON_DOWN = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4L6 8L10 4"/></svg>`

  /**
   * Render a section
   */
  private renderSection(section: ComponentSection): HTMLElement {
    const sectionEl = document.createElement('div')
    sectionEl.className = 'user-components-panel-section'
    sectionEl.dataset.section = section.name

    // Section header with toggle
    const header = document.createElement('div')
    header.className = 'user-components-panel-section-header'

    const toggle = document.createElement('span')
    toggle.className = 'user-components-panel-section-toggle'
    toggle.innerHTML = section.isExpanded ? UserComponentsPanel.CHEVRON_DOWN : UserComponentsPanel.CHEVRON_RIGHT

    const nameSpan = document.createElement('span')
    nameSpan.className = 'user-components-panel-section-name'
    nameSpan.textContent = section.name

    const countSpan = document.createElement('span')
    countSpan.className = 'user-components-panel-section-count'
    countSpan.textContent = `${section.items.length}`

    header.appendChild(toggle)
    header.appendChild(nameSpan)
    header.appendChild(countSpan)

    header.addEventListener('click', () => {
      section.isExpanded = !section.isExpanded
      sectionEl.classList.toggle('collapsed', !section.isExpanded)
      toggle.innerHTML = section.isExpanded ? UserComponentsPanel.CHEVRON_DOWN : UserComponentsPanel.CHEVRON_RIGHT
    }, { signal: this.abortController?.signal })

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
   * Setup a drag image
   */
  private setupFallbackDragImage(event: DragEvent, item: ComponentItem): void {
    if (!event.dataTransfer) return

    const size = getDefaultSizeForItem(item)

    const dragImage = document.createElement('div')
    dragImage.id = 'user-component-drag-image'
    Object.assign(dragImage.style, {
      position: 'fixed',
      left: '-9999px',
      top: '-9999px',
      width: `${size.width}px`,
      height: `${size.height}px`,
      backgroundColor: 'rgba(139, 92, 246, 0.15)', // Purple for user components
      border: '2px solid #8B5CF6',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontFamily: 'system-ui, sans-serif',
      color: '#8B5CF6',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      pointerEvents: 'none',
    })
    dragImage.textContent = item.name

    document.body.appendChild(dragImage)
    event.dataTransfer.setDragImage(dragImage, size.width / 2, size.height / 2)

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
      const name = itemEl.querySelector('.user-components-panel-item-name')?.textContent?.toLowerCase() ?? ''
      const matches = !this.searchQuery || name.includes(this.searchQuery)
      itemEl.style.display = matches ? '' : 'none'
    }

    // Hide empty sections
    const sections = this.panelElement.querySelectorAll<HTMLElement>('.user-components-panel-section')
    for (const sectionEl of sections) {
      const visibleItems = sectionEl.querySelectorAll('.user-components-panel-item:not([style*="display: none"])')
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

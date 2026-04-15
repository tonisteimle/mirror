/**
 * Icon Picker Module
 *
 * Supports both built-in Material icons and Lucide icons from CDN.
 */

import { BasePicker, KeyboardNav, type PickerConfig, type PickerCallbacks } from '../base'
import { ICONS, searchIcons, getIconsByCategory, getCategories } from './icon-data'
import type { IconDefinition, IconCategory, IconCategoryName } from './types'
import { getUserSettings } from '../../storage/user-settings'
import { getTriggerManager } from '../../editor/trigger-manager'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('IconPicker')

export { ICONS, searchIcons, getIconsByCategory, getCategories }
export type { IconDefinition, IconCategory, IconCategoryName }

const MAX_RECENT_ICONS = 12

export interface IconPickerConfig extends Partial<PickerConfig> {
  icons?: IconDefinition[]
  categories?: string[]
  searchable?: boolean
  iconSize?: number
  columns?: number
  showRecent?: boolean
  maxRecent?: number
  lucideUrl?: string
  useLucide?: boolean
}

export interface LucideIcon {
  name: string
  body: string
}

export class IconPicker extends BasePicker {
  private icons: IconDefinition[]
  private filteredIcons: IconDefinition[]
  private searchQuery: string = ''
  private activeCategory: string | null = null
  private iconSize: number
  private columns: number
  private searchable: boolean
  private showRecent: boolean
  private maxRecent: number
  private iconElements: HTMLElement[] = []
  private searchInput: HTMLInputElement | null = null
  private recentSection: HTMLElement | null = null
  private lucideIcons: Map<string, string> = new Map()
  private lucideLoaded: boolean = false
  private useLucide: boolean
  private lucideUrl: string
  private svgCache: Map<string, string> = new Map()
  private loadingIcons: Set<string> = new Set()

  constructor(config: IconPickerConfig, callbacks: PickerCallbacks) {
    super(config, callbacks, 'icon')

    this.icons = config.icons || ICONS
    this.filteredIcons = this.icons
    this.iconSize = config.iconSize || 24
    this.columns = config.columns || 12
    this.searchable = config.searchable ?? true
    this.showRecent = config.showRecent ?? true
    this.maxRecent = config.maxRecent ?? MAX_RECENT_ICONS
    this.useLucide = config.useLucide ?? true
    this.lucideUrl = config.lucideUrl ?? 'https://unpkg.com/@iconify-json/lucide/icons.json'
  }

  /**
   * Load Lucide icons from CDN
   */
  async loadLucideIcons(): Promise<void> {
    if (this.lucideLoaded) return

    try {
      const res = await fetch(this.lucideUrl)
      const data = await res.json()

      // Convert Lucide format to IconDefinition
      const lucideIcons: IconDefinition[] = Object.entries(data.icons).map(
        ([name, icon]: [string, any]) => ({
          name,
          path: '', // Will be loaded lazily
          category: 'lucide',
          tags: [name.replace(/-/g, ' ')],
          viewBox: '0 0 24 24',
          body: icon.body, // Store the SVG body for later
        })
      )

      // Store bodies for lazy loading
      for (const [name, icon] of Object.entries(data.icons) as [string, any][]) {
        this.lucideIcons.set(name, icon.body)
      }

      this.icons = lucideIcons
      this.lucideLoaded = true

      log.info(`Loaded ${lucideIcons.length} Lucide icons`)

      // Re-apply current search query if one exists, otherwise show all
      if (this.searchQuery) {
        this.search(this.searchQuery)
      } else {
        this.filteredIcons = lucideIcons
        if (this.isOpen) {
          this.refreshGrid()
        }
      }
    } catch (err) {
      log.error('Failed to load Lucide icons:', err)
    }
  }

  /**
   * Get recent icons (persisted to server)
   */
  getRecentIcons(): string[] {
    return getUserSettings().getRecentIcons()
  }

  /**
   * Add icon to recent list
   */
  addToRecent(iconName: string): void {
    getUserSettings().addRecentIcon(iconName, this.maxRecent)

    // Update recent section if visible
    this.updateRecentSection()
  }

  /**
   * Clear recent icons
   */
  clearRecent(): void {
    getUserSettings().clearRecentIcons()
    this.updateRecentSection()
  }

  render(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'icon-picker visible'
    this.iconElements = []

    // Reset search state when picker opens (singleton may have leftover state)
    this.searchQuery = ''
    this.filteredIcons = this.icons.length > 0 ? this.icons : ICONS

    // Recent icons section
    if (this.showRecent) {
      this.recentSection = this.renderRecentSection()
      container.appendChild(this.recentSection)
    }

    // Search
    if (this.searchable) {
      container.appendChild(this.renderSearch())
    }

    // Categories (only for non-Lucide mode with built-in icons)
    if (!this.useLucide && this.icons.some(i => i.category !== 'lucide')) {
      container.appendChild(this.renderCategories())
    }

    // Icon grid
    const grid = document.createElement('div')
    grid.className = 'icon-picker-grid'
    grid.style.gridTemplateColumns = `repeat(${this.columns}, 1fr)`
    grid.appendChild(this.renderIcons())
    container.appendChild(grid)

    // Setup keyboard navigation
    this.setupKeyboardNav()

    // Load Lucide icons if enabled
    if (this.useLucide && !this.lucideLoaded) {
      this.loadLucideIcons()
    }

    return container
  }

  private renderCategories(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'icon-picker-categories'

    // All button
    const allBtn = document.createElement('button')
    allBtn.className = `icon-picker-category-btn ${this.activeCategory === null ? 'active' : ''}`
    allBtn.textContent = 'All'
    allBtn.setAttribute('data-category', '')
    allBtn.onclick = () => this.setCategory(null)
    container.appendChild(allBtn)

    // Category buttons
    for (const cat of getCategories()) {
      const btn = document.createElement('button')
      btn.className = `icon-picker-category-btn ${this.activeCategory === cat.name ? 'active' : ''}`
      btn.textContent = cat.name
      btn.setAttribute('data-category', cat.name)
      btn.onclick = () => this.setCategory(cat.name)
      container.appendChild(btn)
    }

    return container
  }

  private renderRecentSection(): HTMLElement {
    const section = document.createElement('div')
    section.className = 'icon-picker-section icon-picker-recent'

    const recent = this.getRecentIcons()
    if (recent.length === 0) {
      section.style.display = 'none'
      return section
    }

    const label = document.createElement('div')
    label.className = 'icon-picker-section-label'
    label.textContent = 'Zuletzt verwendet'
    section.appendChild(label)

    const grid = document.createElement('div')
    grid.className = 'icon-picker-grid recent'
    grid.style.gridTemplateColumns = `repeat(${this.columns}, 1fr)`

    for (const iconName of recent) {
      const btn = this.createIconButton(iconName)
      grid.appendChild(btn)
    }

    section.appendChild(grid)
    return section
  }

  private updateRecentSection(): void {
    if (!this.recentSection || !this.element) return

    const newSection = this.renderRecentSection()
    this.recentSection.replaceWith(newSection)
    this.recentSection = newSection
  }

  private createIconButton(iconName: string): HTMLElement {
    const btn = document.createElement('button')
    btn.className = 'icon-picker-item'
    btn.setAttribute('data-icon', iconName)
    btn.setAttribute('title', iconName)
    btn.setAttribute('role', 'option')

    // Check if we have the SVG cached
    const cachedBody = this.svgCache.get(iconName) || this.lucideIcons.get(iconName)

    if (cachedBody) {
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="${this.iconSize}" height="${this.iconSize}">${cachedBody}</svg>`
    } else {
      // Show placeholder and load lazily
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="${this.iconSize}" height="${this.iconSize}"><rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"/></svg>`
      this.loadIconSvg(iconName, btn)
    }

    btn.onclick = () => {
      this.addToRecent(iconName)
      this.selectValue(iconName)
    }

    return btn
  }

  private async loadIconSvg(name: string, element: HTMLElement): Promise<void> {
    if (this.loadingIcons.has(name)) return
    this.loadingIcons.add(name)

    try {
      // Check Lucide cache first
      let body = this.lucideIcons.get(name)

      if (!body) {
        // Try to fetch individual icon
        const res = await fetch(`https://api.iconify.design/lucide/${name}.svg`)
        if (res.ok) {
          const svgText = await res.text()
          // Extract body from SVG
          const match = svgText.match(/<svg[^>]*>([\s\S]*?)<\/svg>/)
          if (match) {
            body = match[1]
          }
        }
      }

      if (body) {
        this.svgCache.set(name, body)
        element.innerHTML = `<svg viewBox="0 0 24 24" width="${this.iconSize}" height="${this.iconSize}">${body}</svg>`
      }
    } catch (err) {
      // Keep placeholder
    } finally {
      this.loadingIcons.delete(name)
    }
  }

  getValue(): string {
    const index = this.getSelectedIndex()
    const hasRealSearchQuery = this.searchQuery?.trim().length > 0
    const iconsToUse =
      this.filteredIcons.length === 0 && !hasRealSearchQuery ? ICONS : this.filteredIcons
    return iconsToUse[index]?.name ?? ''
  }

  setValue(value: string): void {
    // Could highlight the selected icon
  }

  search(query: string): void {
    // Trim whitespace - treat whitespace-only queries as empty
    const trimmedQuery = query.trim()
    this.searchQuery = trimmedQuery
    this.activeCategory = null

    if (!trimmedQuery) {
      this.filteredIcons = this.icons
    } else {
      const q = trimmedQuery.toLowerCase()
      this.filteredIcons = this.icons.filter(
        icon =>
          icon.name.toLowerCase().includes(q) ||
          icon.tags.some(tag => tag.toLowerCase().includes(q))
      )
    }

    this.refreshGrid()
  }

  clearSearch(): void {
    this.searchQuery = ''
    this.filteredIcons = this.activeCategory ? getIconsByCategory(this.activeCategory) : this.icons
    if (this.searchInput) {
      this.searchInput.value = ''
    }
    this.refreshGrid()
  }

  setCategory(category: string | null): void {
    this.activeCategory = category
    this.searchQuery = ''
    if (this.searchInput) {
      this.searchInput.value = ''
    }
    this.filteredIcons = category ? getIconsByCategory(category) : this.icons
    this.refreshGrid()
    this.updateCategoryButtons()
  }

  getCategories(): { name: string; count: number }[] {
    return getCategories()
  }

  setIcons(icons: IconDefinition[]): void {
    this.icons = icons
    this.filteredIcons = icons
    this.refreshGrid()
  }

  getIcon(name: string): IconDefinition | null {
    return this.icons.find(i => i.name === name) || null
  }

  /**
   * Show picker at specific coordinates (for editor integration)
   */
  showAt(x: number, y: number): void {
    // Create a temporary anchor element
    const anchor = document.createElement('div')
    anchor.style.position = 'fixed'
    anchor.style.left = `${x}px`
    anchor.style.top = `${y}px`
    anchor.style.width = '0'
    anchor.style.height = '0'
    document.body.appendChild(anchor)

    // Show using the base class method (handles events)
    this.show(anchor)

    // Remove the anchor
    anchor.remove()

    // Override the position to be exact
    if (this.element) {
      this.element.style.left = `${x}px`
      this.element.style.top = `${y}px`
    }

    // Don't auto-focus search input - let editor keep focus
    // TriggerManager handles keyboard navigation (arrows, Enter, Escape)
    // liveFilter handles filtering based on editor input
  }

  /**
   * Filter icons (for external use, e.g., editor integration)
   */
  filter(text: string): void {
    this.search(text)
  }

  /**
   * Get currently filtered icons
   */
  getFilteredIcons(): IconDefinition[] {
    return this.filteredIcons
  }

  /**
   * Get selected icon index (for keyboard nav)
   */
  getSelectedIndex(): number {
    return this.keyboardNav?.getSelectedIndex() ?? 0
  }

  /**
   * Select icon by index
   */
  selectByIndex(index: number): void {
    const icon = this.filteredIcons[index]
    if (icon) {
      this.addToRecent(icon.name)
      this.selectValue(icon.name)
    }
  }

  /**
   * Navigate selection
   */
  navigate(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (!this.keyboardNav) return

    const keyMap = {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight',
    }

    const event = new KeyboardEvent('keydown', { key: keyMap[direction] })
    this.keyboardNav.handleKeyDown(event)
  }

  private renderSearch(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'icon-picker-search'

    this.searchInput = document.createElement('input')
    this.searchInput.type = 'text'
    this.searchInput.className = 'icon-picker-search-input'
    this.searchInput.placeholder = 'Search icons...'

    this.searchInput.addEventListener('input', () => {
      this.search(this.searchInput!.value)
    })

    // Keyboard handler for when user manually clicks search input
    // Note: Normally editor keeps focus and TriggerManager handles keys
    this.searchInput.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.keyboardNav?.moveDown()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.keyboardNav?.moveUp()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        this.keyboardNav?.moveRight()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        this.keyboardNav?.moveLeft()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        // Let TriggerManager handle selection so it can insert the value
        getTriggerManager().selectCurrentFromPicker()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        // Close picker on Escape
        this.hide()
      }
      // No special quote handling - if user is typing in search, let them search
    })

    container.appendChild(this.searchInput)

    return container
  }

  private renderIcons(): DocumentFragment {
    const fragment = document.createDocumentFragment()
    this.iconElements = []

    // Limit displayed icons for performance
    const maxDisplay = 144

    // Treat whitespace-only search queries as empty
    const hasRealSearchQuery = this.searchQuery && this.searchQuery.trim().length > 0

    // Use filteredIcons, but fall back to built-in ICONS if empty (regardless of loading state)
    // This ensures the picker always has selectable icons even during CDN loading
    let iconsToUse = this.filteredIcons
    if (iconsToUse.length === 0 && !hasRealSearchQuery) {
      // No icons and no meaningful search query - show built-in icons as fallback
      iconsToUse = ICONS
    }

    const iconsToShow = iconsToUse.slice(0, maxDisplay)

    if (iconsToShow.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'icon-picker-empty'
      empty.textContent = hasRealSearchQuery ? 'Keine Icons gefunden' : 'Icons laden...'
      fragment.appendChild(empty)
      return fragment
    }

    for (const icon of iconsToShow) {
      const btn = this.createIconButton(icon.name)
      this.iconElements.push(btn)
      fragment.appendChild(btn)
    }

    return fragment
  }

  private renderIcon(icon: IconDefinition): HTMLElement {
    const btn = document.createElement('button')
    btn.className = 'icon-picker-item'
    btn.setAttribute('data-icon', icon.name)
    btn.setAttribute('title', icon.name)
    btn.setAttribute('role', 'option')

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', icon.viewBox || '0 0 24 24')
    svg.setAttribute('width', String(this.iconSize))
    svg.setAttribute('height', String(this.iconSize))

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', icon.path)
    path.setAttribute('fill', 'currentColor')

    svg.appendChild(path)
    btn.appendChild(svg)

    btn.onclick = () => {
      this.addToRecent(icon.name)
      this.selectValue(icon.name)
    }

    this.iconElements.push(btn)
    return btn
  }

  private refreshGrid(): void {
    if (!this.isOpen || !this.element) return

    const grid = this.element.querySelector('.icon-picker-grid:not(.recent)')
    if (grid) {
      this.iconElements = []
      grid.innerHTML = ''
      grid.appendChild(this.renderIcons())
      this.setupKeyboardNav()
    }
  }

  private updateCategoryButtons(): void {
    if (!this.element) return

    this.element.querySelectorAll('.icon-picker-category-btn').forEach(btn => {
      const cat = btn.getAttribute('data-category')
      btn.classList.toggle('active', cat === (this.activeCategory || ''))
    })
  }

  private setupKeyboardNav(): void {
    if (this.iconElements.length > 0) {
      this.keyboardNav = new KeyboardNav({
        orientation: 'grid',
        columns: this.columns,
        wrap: true,
        onSelect: item => {
          const iconName = item.getAttribute('data-icon')
          if (iconName) {
            this.addToRecent(iconName)
            this.selectValue(iconName)
          }
        },
        onCancel: () => this.hide(),
      })
      this.keyboardNav.setItems(this.iconElements)
    } else {
      this.keyboardNav = null
    }
  }

  protected handleKeyDown(event: KeyboardEvent): void {
    if (event.target === this.searchInput) {
      if (event.key === 'Escape') super.handleKeyDown(event)
      return
    }
    if (this.keyboardNav?.handleKeyDown(event)) return
    super.handleKeyDown(event)
  }
}

/**
 * Factory function
 */
export function createIconPicker(config: IconPickerConfig, callbacks: PickerCallbacks): IconPicker {
  return new IconPicker(config, callbacks)
}

/**
 * Singleton instance for editor integration
 */
let globalIconPicker: IconPicker | null = null

export function getGlobalIconPicker(): IconPicker {
  return (globalIconPicker ??= new IconPicker(
    {
      useLucide: true,
      columns: 12,
      iconSize: 24,
      externalKeyboardHandling: true,
      closeOnClickOutside: false,
    },
    { onSelect: () => {} }
  ))
}

export function setGlobalIconPickerCallback(onSelect: (value: string) => void): void {
  if (globalIconPicker) {
    ;(globalIconPicker as any).callbacks.onSelect = onSelect
  }
}

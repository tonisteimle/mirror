/**
 * Icon Picker Module
 *
 * Supports both built-in Material icons and Lucide icons from CDN.
 */

import { BasePicker, KeyboardNav, type PickerConfig, type PickerCallbacks } from '../base'
import { ICONS, searchIcons, getIconsByCategory, getCategories } from './icon-data'
import type { IconDefinition, IconCategory, IconCategoryName } from './types'

export { ICONS, searchIcons, getIconsByCategory, getCategories }
export type { IconDefinition, IconCategory, IconCategoryName }

// Storage key for recent icons
const RECENT_ICONS_KEY = 'mirror-recent-icons'
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
    super(config, callbacks)

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
      const lucideIcons: IconDefinition[] = Object.entries(data.icons).map(([name, icon]: [string, any]) => ({
        name,
        path: '', // Will be loaded lazily
        category: 'lucide',
        tags: [name.replace(/-/g, ' ')],
        viewBox: '0 0 24 24',
        body: icon.body // Store the SVG body for later
      }))

      // Store bodies for lazy loading
      for (const [name, icon] of Object.entries(data.icons) as [string, any][]) {
        this.lucideIcons.set(name, icon.body)
      }

      this.icons = lucideIcons
      this.filteredIcons = lucideIcons
      this.lucideLoaded = true

      console.log(`Loaded ${lucideIcons.length} Lucide icons`)

      // Refresh grid if open
      if (this.isOpen) {
        this.refreshGrid()
      }
    } catch (err) {
      console.error('Failed to load Lucide icons:', err)
    }
  }

  /**
   * Get recent icons from localStorage
   */
  getRecentIcons(): string[] {
    try {
      const stored = localStorage.getItem(RECENT_ICONS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * Add icon to recent list
   */
  addToRecent(iconName: string): void {
    const recent = this.getRecentIcons().filter(i => i !== iconName)
    recent.unshift(iconName)
    localStorage.setItem(RECENT_ICONS_KEY, JSON.stringify(recent.slice(0, this.maxRecent)))

    // Update recent section if visible
    this.updateRecentSection()
  }

  /**
   * Clear recent icons
   */
  clearRecent(): void {
    localStorage.removeItem(RECENT_ICONS_KEY)
    this.updateRecentSection()
  }

  render(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'icon-picker'
    this.iconElements = []

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
    return ''
  }

  setValue(value: string): void {
    // Could highlight the selected icon
  }

  search(query: string): void {
    this.searchQuery = query
    this.activeCategory = null

    if (!query) {
      this.filteredIcons = this.icons
    } else {
      const q = query.toLowerCase()
      this.filteredIcons = this.icons.filter(icon =>
        icon.name.toLowerCase().includes(q) ||
        icon.tags.some(tag => tag.toLowerCase().includes(q))
      )
    }

    this.refreshGrid()
  }

  clearSearch(): void {
    this.searchQuery = ''
    this.filteredIcons = this.activeCategory
      ? getIconsByCategory(this.activeCategory)
      : this.icons
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
    if (this.isOpen) return

    this.element = this.render()
    this.element.classList.add('picker', 'picker-container')
    this.element.style.zIndex = String(this.config.zIndex)
    this.element.style.position = 'absolute'
    this.element.style.left = `${x}px`
    this.element.style.top = `${y}px`

    const container = this.config.container ?? document.body
    container.appendChild(this.element)

    this.setupEventListeners()

    if (this.config.animate) {
      this.element.classList.add('picker-enter')
      requestAnimationFrame(() => {
        this.element?.classList.remove('picker-enter')
        this.element?.classList.add('picker-enter-active')
      })
    }

    this.isOpen = true
    this.callbacks.onOpen?.()

    // Focus search input
    setTimeout(() => this.searchInput?.focus(), 0)
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
      right: 'ArrowRight'
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

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.keyboardNav?.selectIndex(0)
        this.iconElements[0]?.focus()
      }
    })

    container.appendChild(this.searchInput)

    return container
  }

  private renderIcons(): DocumentFragment {
    const fragment = document.createDocumentFragment()
    this.iconElements = []

    // Limit displayed icons for performance
    const maxDisplay = 144
    const iconsToShow = this.filteredIcons.slice(0, maxDisplay)

    if (iconsToShow.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'icon-picker-empty'
      empty.textContent = this.lucideLoaded ? 'Keine Icons gefunden' : 'Icons laden...'
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
        onSelect: (item) => {
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
      if (event.key === 'Escape') {
        super.handleKeyDown(event)
      }
      return
    }

    if (this.keyboardNav) {
      if (this.keyboardNav.handleKeyDown(event)) {
        return
      }
    }

    super.handleKeyDown(event)
  }
}

/**
 * Factory function
 */
export function createIconPicker(
  config: IconPickerConfig,
  callbacks: PickerCallbacks
): IconPicker {
  return new IconPicker(config, callbacks)
}

/**
 * Singleton instance for editor integration
 */
let globalIconPicker: IconPicker | null = null

export function getGlobalIconPicker(): IconPicker {
  if (!globalIconPicker) {
    globalIconPicker = new IconPicker(
      { useLucide: true, columns: 12, iconSize: 24 },
      { onSelect: () => {} }
    )
  }
  return globalIconPicker
}

export function setGlobalIconPickerCallback(onSelect: (value: string) => void): void {
  if (globalIconPicker) {
    (globalIconPicker as any).callbacks.onSelect = onSelect
  }
}

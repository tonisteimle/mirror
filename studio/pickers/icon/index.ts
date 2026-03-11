/**
 * Icon Picker Module
 */

import { BasePicker, KeyboardNav, type PickerConfig, type PickerCallbacks } from '../base'
import { ICONS, searchIcons, getIconsByCategory, getCategories } from './icon-data'
import type { IconDefinition, IconCategory, IconCategoryName } from './types'

export { ICONS, searchIcons, getIconsByCategory, getCategories }
export type { IconDefinition, IconCategory, IconCategoryName }

export interface IconPickerConfig extends Partial<PickerConfig> {
  icons?: IconDefinition[]
  categories?: string[]
  searchable?: boolean
  iconSize?: number
  columns?: number
}

export class IconPicker extends BasePicker {
  private icons: IconDefinition[]
  private filteredIcons: IconDefinition[]
  private searchQuery: string = ''
  private activeCategory: string | null = null
  private iconSize: number
  private columns: number
  private searchable: boolean
  private iconElements: HTMLElement[] = []
  private searchInput: HTMLInputElement | null = null

  constructor(config: IconPickerConfig, callbacks: PickerCallbacks) {
    super(config, callbacks)

    this.icons = config.icons || ICONS
    this.filteredIcons = this.icons
    this.iconSize = config.iconSize || 32
    this.columns = config.columns || 8
    this.searchable = config.searchable ?? true
  }

  render(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'icon-picker'
    this.iconElements = []

    // Search
    if (this.searchable) {
      container.appendChild(this.renderSearch())
    }

    // Categories
    container.appendChild(this.renderCategories())

    // Icon grid
    const grid = document.createElement('div')
    grid.className = 'icon-picker-grid'
    grid.style.gridTemplateColumns = `repeat(${this.columns}, 1fr)`
    grid.appendChild(this.renderIcons())
    container.appendChild(grid)

    // Setup keyboard navigation
    this.setupKeyboardNav()

    return container
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
    this.filteredIcons = query ? searchIcons(query) : this.icons
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

    // Focus search on open
    setTimeout(() => this.searchInput?.focus(), 0)

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

  private renderIcons(): DocumentFragment {
    const fragment = document.createDocumentFragment()
    this.iconElements = []

    if (this.filteredIcons.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'icon-picker-empty'
      empty.textContent = 'No icons found'
      fragment.appendChild(empty)
      return fragment
    }

    for (const icon of this.filteredIcons) {
      fragment.appendChild(this.renderIcon(icon))
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
      this.selectValue(icon.name)
    }

    this.iconElements.push(btn)
    return btn
  }

  private refreshGrid(): void {
    if (!this.isOpen || !this.element) return

    const grid = this.element.querySelector('.icon-picker-grid')
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

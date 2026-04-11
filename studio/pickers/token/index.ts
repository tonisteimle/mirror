/**
 * Token Picker Module
 */

import { BasePicker, KeyboardNav, type PickerConfig, type PickerCallbacks } from '../base'
import {
  parseTokens,
  parseTokensFromFiles,
  getTokenTypesForProperty,
  filterTokensBySuffix,
  filterTokensByType,
  filterTokensBySearch,
  type TokenDefinition,
  type TokenContext,
  type TokenType,
} from './types'

export {
  parseTokens,
  parseTokensFromFiles,
  getTokenTypesForProperty,
  filterTokensBySuffix,
  filterTokensByType,
  filterTokensBySearch,
  type TokenDefinition,
  type TokenContext,
  type TokenType,
}

export interface TokenPickerConfig extends Partial<PickerConfig> {
  tokens: TokenDefinition[]
  context?: TokenContext
  showPreview?: boolean
  groupByCategory?: boolean
  searchable?: boolean
}

export class TokenPicker extends BasePicker {
  private tokens: TokenDefinition[]
  private filteredTokens: TokenDefinition[]
  private context: TokenContext | null
  private showPreview: boolean
  private groupByCategory: boolean
  private searchable: boolean
  private searchQuery: string = ''
  private tokenElements: HTMLElement[] = []
  private searchInput: HTMLInputElement | null = null

  constructor(config: TokenPickerConfig, callbacks: PickerCallbacks) {
    super(config, callbacks, 'token')

    this.tokens = config.tokens || []
    this.context = config.context || null
    this.showPreview = config.showPreview ?? true
    this.groupByCategory = config.groupByCategory ?? true
    this.searchable = config.searchable ?? true
    this.filteredTokens = this.filterTokens()
  }

  render(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'token-picker'
    this.tokenElements = []

    // Search input
    if (this.searchable) {
      container.appendChild(this.renderSearch())
    }

    // Token list
    const list = document.createElement('div')
    list.className = 'token-picker-list'
    list.appendChild(this.renderTokenList())
    container.appendChild(list)

    // Setup keyboard navigation
    this.setupKeyboardNav()

    return container
  }

  getValue(): string {
    return ''
  }

  setValue(value: string): void {
    // Find matching token
    const token = this.tokens.find(t => t.name === value)
    if (token) {
      this.searchQuery = ''
      this.filteredTokens = this.filterTokens()
    }
  }

  setContext(context: TokenContext): void {
    this.context = context
    this.filteredTokens = this.filterTokens()
    this.refreshList()
  }

  clearContext(): void {
    this.context = null
    this.filteredTokens = this.filterTokens()
    this.refreshList()
  }

  setTokens(tokens: TokenDefinition[]): void {
    this.tokens = tokens
    this.filteredTokens = this.filterTokens()
    this.refreshList()
  }

  getFilteredTokens(): TokenDefinition[] {
    return this.filteredTokens
  }

  search(query: string): void {
    this.searchQuery = query.toLowerCase()
    this.filteredTokens = this.filterTokens()
    this.refreshList()
  }

  resetFilter(): void {
    this.searchQuery = ''
    this.context = null
    this.filteredTokens = this.filterTokens()
    this.refreshList()
  }

  /**
   * Filter tokens by text (alias for search, used by TriggerManager)
   */
  filter(text: string): void {
    this.search(text)
  }

  /**
   * Navigate to a specific direction (for keyboard navigation)
   */
  navigate(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (!this.keyboardNav) return

    switch (direction) {
      case 'up':
        this.keyboardNav.moveUp()
        break
      case 'down':
        this.keyboardNav.moveDown()
        break
      case 'left':
        this.keyboardNav.moveLeft()
        break
      case 'right':
        this.keyboardNav.moveRight()
        break
    }
  }

  /**
   * Get the currently selected index
   */
  getSelectedIndex(): number {
    return this.keyboardNav?.getSelectedIndex() ?? 0
  }

  /**
   * Get the selected token
   */
  getSelectedToken(): TokenDefinition | null {
    const index = this.getSelectedIndex()
    return this.filteredTokens[index] ?? null
  }

  /**
   * Get the selected value
   */
  getSelectedValue(): string | undefined {
    const token = this.getSelectedToken()
    return token?.name
  }

  /**
   * Show the picker at a specific position
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

    // Show using the base class method
    this.show(anchor)

    // Remove the anchor
    anchor.remove()

    // Override the position to be exact
    if (this.element) {
      this.element.style.left = `${x}px`
      this.element.style.top = `${y}px`
    }
  }

  private filterTokens(): TokenDefinition[] {
    let tokens = [...this.tokens]

    // Filter by context (property type)
    if (this.context && this.context.allowedTypes.length > 0) {
      tokens = tokens.filter(t => this.context!.allowedTypes.includes(t.type))
    }

    // Filter by search query
    if (this.searchQuery) {
      tokens = tokens.filter(t =>
        t.name.toLowerCase().includes(this.searchQuery) ||
        t.value.toLowerCase().includes(this.searchQuery) ||
        (t.category && t.category.toLowerCase().includes(this.searchQuery))
      )
    }

    return tokens
  }

  private renderSearch(): HTMLElement {
    const searchContainer = document.createElement('div')
    searchContainer.className = 'token-picker-search'

    this.searchInput = document.createElement('input')
    this.searchInput.type = 'text'
    this.searchInput.className = 'token-picker-search-input'
    this.searchInput.placeholder = 'Search tokens...'
    this.searchInput.value = this.searchQuery

    this.searchInput.addEventListener('input', () => {
      this.search(this.searchInput!.value)
    })

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        // Focus first token
        this.keyboardNav?.selectIndex(0)
        this.tokenElements[0]?.focus()
      }
    })

    searchContainer.appendChild(this.searchInput)

    // Don't auto-focus search input - let editor keep focus
    // TriggerManager handles keyboard navigation and liveFilter handles filtering

    return searchContainer
  }

  private renderTokenList(): HTMLElement {
    const fragment = document.createDocumentFragment()
    this.tokenElements = []

    if (this.filteredTokens.length === 0) {
      // Return empty container - no message needed
      const container = document.createElement('div')
      return container
    }

    if (this.groupByCategory) {
      // Group by category
      const groups = new Map<string, TokenDefinition[]>()

      for (const token of this.filteredTokens) {
        const category = token.category || 'Other'
        if (!groups.has(category)) {
          groups.set(category, [])
        }
        groups.get(category)!.push(token)
      }

      for (const [category, tokens] of groups) {
        for (const token of tokens) {
          fragment.appendChild(this.renderToken(token))
        }
      }
    } else {
      // Flat list
      for (const token of this.filteredTokens) {
        fragment.appendChild(this.renderToken(token))
      }
    }

    const container = document.createElement('div')
    container.appendChild(fragment)
    return container
  }

  private renderToken(token: TokenDefinition): HTMLElement {
    const item = document.createElement('button')
    item.className = 'token-picker-item'
    item.setAttribute('data-token', token.name)
    item.setAttribute('role', 'option')

    // Preview (for colors)
    if (this.showPreview && token.type === 'color') {
      const preview = document.createElement('span')
      preview.className = 'token-picker-preview'
      preview.style.backgroundColor = token.value
      item.appendChild(preview)
    }

    // Name
    const name = document.createElement('span')
    name.className = 'token-picker-name'
    name.textContent = token.name
    item.appendChild(name)

    // Value
    const value = document.createElement('span')
    value.className = 'token-picker-value'
    value.textContent = token.value
    item.appendChild(value)

    item.onclick = () => {
      this.selectValue(token.name)
    }

    this.tokenElements.push(item)
    return item
  }

  private refreshList(): void {
    if (!this.isOpen || !this.element) return

    const list = this.element.querySelector('.token-picker-list')
    if (list) {
      this.tokenElements = []
      list.innerHTML = ''
      list.appendChild(this.renderTokenList())
      this.setupKeyboardNav()
    }
  }

  private setupKeyboardNav(): void {
    if (this.tokenElements.length > 0) {
      this.keyboardNav = new KeyboardNav({
        orientation: 'vertical',
        wrap: true,
        onSelect: (item) => {
          const tokenName = item.getAttribute('data-token')
          if (tokenName) {
            this.selectValue(tokenName)
          }
        },
        onCancel: () => this.hide(),
      })
      this.keyboardNav.setItems(this.tokenElements)
    } else {
      this.keyboardNav = null
    }
  }

  protected handleKeyDown(event: KeyboardEvent): void {
    // Let search input handle its own keys
    if (event.target === this.searchInput) {
      if (event.key === 'Escape') {
        super.handleKeyDown(event)
      }
      return
    }

    // Use keyboard nav
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
export function createTokenPicker(
  config: TokenPickerConfig,
  callbacks: PickerCallbacks
): TokenPicker {
  return new TokenPicker(config, callbacks)
}

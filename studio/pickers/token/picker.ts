/**
 * TokenPicker — design-token picker with category grouping and search
 *
 * Implementation lives here; index.ts re-exports the public surface.
 */

import { BasePicker, KeyboardNav, type PickerConfig, type PickerCallbacks } from '../base'
import type { TokenDefinition, TokenContext } from './types'

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

    // Property-set context-filter (Slice 78 V-4):
    // - When the editor is inside a typed property context (`bg $`, `pad $`, …)
    //   the user is choosing a value for that property — only single-value-
    //   tokens make sense. Property-sets apply *as* a property (`Frame
    //   $cardstyle`), not *to* a property.
    // - When the editor is at top-level (`Frame $`, no property context),
    //   both kinds are applicable.
    if (this.context?.property) {
      tokens = tokens.filter(t => t.kind !== 'set')
    }

    // Filter by context (property type) — only meaningful for single-value
    // tokens; property-sets carry `type: 'other'` by design.
    if (this.context && this.context.allowedTypes.length > 0) {
      tokens = tokens.filter(t => t.kind === 'set' || this.context!.allowedTypes.includes(t.type))
    }

    // Filter by search query
    if (this.searchQuery) {
      tokens = tokens.filter(
        t =>
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

    this.searchInput.addEventListener('keydown', e => {
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

    // Split into single-value tokens and property-sets (Slice 78 V-3).
    // Property-sets are visually distinct from single-value tokens — the
    // user picks them as a *style bundle* applied to the element, not as a
    // value for one property. A separate section makes the distinction
    // visible without needing an extra column or icon on every row.
    const singles = this.filteredTokens.filter(t => t.kind !== 'set')
    const sets = this.filteredTokens.filter(t => t.kind === 'set')

    if (this.groupByCategory) {
      // Group single-value tokens by category
      const groups = new Map<string, TokenDefinition[]>()

      for (const token of singles) {
        const category = token.category || 'Other'
        if (!groups.has(category)) {
          groups.set(category, [])
        }
        groups.get(category)!.push(token)
      }

      for (const [, tokens] of groups) {
        for (const token of tokens) {
          fragment.appendChild(this.renderToken(token))
        }
      }
    } else {
      // Flat list of single-value tokens
      for (const token of singles) {
        fragment.appendChild(this.renderToken(token))
      }
    }

    // Property-set section (after the single-value tokens), with a header
    // separator. Only emitted when there are sets — keeps the picker tight
    // for projects without any property-sets defined.
    if (sets.length > 0) {
      if (singles.length > 0) {
        const header = document.createElement('div')
        header.className = 'token-picker-section-header'
        header.textContent = 'Style Bundles'
        fragment.appendChild(header)
      }
      for (const token of sets) {
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
    if (token.kind === 'set') item.classList.add('token-picker-item-set')
    item.setAttribute('data-token', token.name)
    item.setAttribute('data-token-kind', token.kind ?? 'single')
    item.setAttribute('role', 'option')

    // Name (first)
    const name = document.createElement('span')
    name.className = 'token-picker-name'
    name.textContent = token.name
    item.appendChild(name)

    // Color-swatch preview only for single-value color tokens. Property-sets
    // intentionally don't get a swatch — even if the set contains a `bg`,
    // the bg is not the set's identity (Slice 78 V-3).
    if (this.showPreview && token.type === 'color' && token.kind !== 'set') {
      const preview = document.createElement('span')
      preview.className = 'token-picker-preview'
      preview.style.backgroundColor = token.value
      item.appendChild(preview)
    }

    // Value (last) — for sets this is the property-bag preview text built
    // by parseTokens (`bg #1a1a1a · pad 16 · rad 8`); for single-value
    // tokens it's the resolved hex / number / token-ref.
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
        onSelect: item => {
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

export function createTokenPicker(
  config: TokenPickerConfig,
  callbacks: PickerCallbacks
): TokenPicker {
  return new TokenPicker(config, callbacks)
}

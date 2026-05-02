/**
 * Activity Bar - Vertical icon bar for toggling panel visibility
 *
 * Each icon represents a panel that can be shown/hidden independently.
 */

export interface ActivityBarItem {
  id: string
  icon: string // SVG string
  tooltip: string
  /** Initial visibility state */
  active?: boolean
}

export interface ActivityBarConfig {
  container: HTMLElement
  items: ActivityBarItem[]
  /** Initial active items (visible panels) */
  activeItems?: string[]
  /** Bottom items (settings, etc.) - these don't toggle, just fire onClick */
  bottomItems?: ActivityBarItem[]
}

export interface ActivityBarCallbacks {
  /** Called when an item is toggled */
  onToggle?: (id: string, active: boolean) => void
  /** Called when a bottom item is clicked */
  onBottomItemClick?: (id: string) => void
}

/**
 * Activity Bar component - vertical icon strip for panel toggles
 */
export class ActivityBar {
  private container: HTMLElement
  private items: ActivityBarItem[]
  private bottomItems: ActivityBarItem[]
  private callbacks: ActivityBarCallbacks
  private activeItems: Set<string>
  private element: HTMLElement | null = null
  private abortController: AbortController | null = null

  constructor(config: ActivityBarConfig, callbacks: ActivityBarCallbacks = {}) {
    this.container = config.container
    this.items = config.items
    this.bottomItems = config.bottomItems || []
    this.callbacks = callbacks

    // Initialize active items from config
    if (config.activeItems) {
      this.activeItems = new Set(config.activeItems)
    } else {
      // Default: all items with active: true, or all items if none specified
      this.activeItems = new Set(
        config.items.filter(item => item.active !== false).map(item => item.id)
      )
    }
  }

  render(): void {
    // Cleanup previous
    this.abortController?.abort()
    this.abortController = new AbortController()

    // Create activity bar element
    this.element = document.createElement('div')
    this.element.className = 'activity-bar'

    // Add Mirror logo at the top
    const logo = document.createElement('div')
    logo.className = 'activity-bar-logo'
    logo.innerHTML = `<img src="logo.png" alt="Mirror" />`
    this.element.appendChild(logo)

    // Render items
    for (const item of this.items) {
      const button = this.renderItem(item)
      this.element.appendChild(button)
    }

    // Add spacer and bottom items (settings, etc.)
    if (this.bottomItems.length > 0) {
      const spacer = document.createElement('div')
      spacer.className = 'activity-bar-spacer'
      this.element.appendChild(spacer)

      for (const item of this.bottomItems) {
        const button = this.renderBottomItem(item)
        this.element.appendChild(button)
      }
    }

    this.container.appendChild(this.element)
  }

  private renderBottomItem(item: ActivityBarItem): HTMLElement {
    const button = document.createElement('button')
    button.className = 'activity-bar-item activity-bar-bottom-item'
    button.dataset.id = item.id
    button.title = item.tooltip

    // Icon
    const icon = document.createElement('span')
    icon.className = 'activity-bar-icon'
    icon.innerHTML = item.icon
    button.appendChild(icon)

    // Click handler - just fires callback, no toggle
    button.addEventListener(
      'click',
      () => {
        this.callbacks.onBottomItemClick?.(item.id)
      },
      { signal: this.abortController?.signal }
    )

    return button
  }

  private renderItem(item: ActivityBarItem): HTMLElement {
    const button = document.createElement('button')
    button.className = 'activity-bar-item'
    button.dataset.id = item.id
    button.title = item.tooltip

    if (this.activeItems.has(item.id)) {
      button.classList.add('active')
    }

    // Icon
    const icon = document.createElement('span')
    icon.className = 'activity-bar-icon'
    icon.innerHTML = item.icon
    button.appendChild(icon)

    // Click handler - toggle behavior
    button.addEventListener(
      'click',
      () => {
        this.toggle(item.id)
      },
      { signal: this.abortController?.signal }
    )

    return button
  }

  /** Toggle a panel's visibility */
  toggle(id: string): void {
    const isActive = this.activeItems.has(id)

    if (isActive) {
      this.activeItems.delete(id)
    } else {
      this.activeItems.add(id)
    }

    // Update visual state
    this.updateItemState(id, !isActive)

    // Notify callback
    this.callbacks.onToggle?.(id, !isActive)
  }

  /** Set a panel's visibility directly */
  setActive(id: string, active: boolean): void {
    const currentlyActive = this.activeItems.has(id)
    if (currentlyActive === active) return

    if (active) {
      this.activeItems.add(id)
    } else {
      this.activeItems.delete(id)
    }

    this.updateItemState(id, active)
  }

  /** Check if a panel is visible */
  isActive(id: string): boolean {
    return this.activeItems.has(id)
  }

  /** Get all active (visible) panels */
  getActiveItems(): string[] {
    return Array.from(this.activeItems)
  }

  private updateItemState(id: string, active: boolean): void {
    if (!this.element) return

    const button = this.element.querySelector(`[data-id="${id}"]`) as HTMLElement
    if (button) {
      button.classList.toggle('active', active)
    }
  }

  dispose(): void {
    this.abortController?.abort()
    this.abortController = null
    this.element?.remove()
    this.element = null
  }
}

/**
 * Create an ActivityBar instance
 */
export function createActivityBar(
  config: ActivityBarConfig,
  callbacks?: ActivityBarCallbacks
): ActivityBar {
  return new ActivityBar(config, callbacks)
}

// SVG Icons for Activity Bar (Lucide icons, 16x16)
export const ACTIVITY_BAR_ICONS = {
  // Lucide: Folder
  files: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>`,
  // Lucide: Package
  components: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
  </svg>`,
  // Lucide: Palette (for tokens)
  tokens: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
  </svg>`,
  // Lucide: Code
  code: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>`,
  // Lucide: Eye
  preview: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
  </svg>`,
  // Lucide: SlidersHorizontal
  properties: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>
  </svg>`,
  // Lucide: Users (for userComponents)
  userComponents: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>`,
  // Lucide: Settings (gear icon)
  settings: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`,
}

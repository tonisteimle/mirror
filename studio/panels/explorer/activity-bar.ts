/**
 * Activity Bar - Vertical icon bar for switching Explorer views
 */

export interface ActivityBarItem {
  id: string
  icon: string  // SVG string
  tooltip: string
}

export interface ActivityBarConfig {
  container: HTMLElement
  items: ActivityBarItem[]
  defaultActive?: string
}

export interface ActivityBarCallbacks {
  onItemClick?: (id: string) => void
}

/**
 * Activity Bar component - vertical icon strip
 */
export class ActivityBar {
  private container: HTMLElement
  private items: ActivityBarItem[]
  private callbacks: ActivityBarCallbacks
  private activeItem: string
  private element: HTMLElement | null = null
  private abortController: AbortController | null = null

  constructor(config: ActivityBarConfig, callbacks: ActivityBarCallbacks = {}) {
    this.container = config.container
    this.items = config.items
    this.callbacks = callbacks
    this.activeItem = config.defaultActive ?? config.items[0]?.id ?? ''
  }

  render(): void {
    // Cleanup previous
    this.abortController?.abort()
    this.abortController = new AbortController()

    // Create activity bar element
    this.element = document.createElement('div')
    this.element.className = 'activity-bar'

    // Render items
    for (const item of this.items) {
      const button = this.renderItem(item)
      this.element.appendChild(button)
    }

    this.container.appendChild(this.element)
  }

  private renderItem(item: ActivityBarItem): HTMLElement {
    const button = document.createElement('button')
    button.className = 'activity-bar-item'
    button.dataset.id = item.id
    button.title = item.tooltip

    if (item.id === this.activeItem) {
      button.classList.add('active')
    }

    // Icon
    const icon = document.createElement('span')
    icon.className = 'activity-bar-icon'
    icon.innerHTML = item.icon
    button.appendChild(icon)

    // Click handler
    button.addEventListener('click', () => {
      this.setActive(item.id)
      this.callbacks.onItemClick?.(item.id)
    }, { signal: this.abortController?.signal })

    return button
  }

  setActive(id: string): void {
    if (this.activeItem === id) return
    this.activeItem = id

    // Update visual state
    if (this.element) {
      const items = this.element.querySelectorAll('.activity-bar-item')
      for (const item of items) {
        const el = item as HTMLElement
        el.classList.toggle('active', el.dataset.id === id)
      }
    }
  }

  getActive(): string {
    return this.activeItem
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

// SVG Icons for Activity Bar
export const ACTIVITY_BAR_ICONS = {
  files: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>`,
  components: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
  </svg>`,
}

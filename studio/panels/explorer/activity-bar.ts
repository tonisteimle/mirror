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

// SVG Icons for Activity Bar (Lucide icons)
export const ACTIVITY_BAR_ICONS = {
  // Lucide: Folder
  files: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>`,
  // Lucide: Package
  components: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
  </svg>`,
  // Lucide: Boxes (user components)
  userComponents: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/>
    <path d="m7 16.5-4.74-2.85"/>
    <path d="m7 16.5 5-3"/>
    <path d="M7 16.5v5.17"/>
    <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"/>
    <path d="m17 16.5-5-3"/>
    <path d="m17 16.5 4.74-2.85"/>
    <path d="M17 16.5v5.17"/>
    <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"/>
    <path d="M12 8 7.26 5.15"/>
    <path d="m12 8 4.74-2.85"/>
    <path d="M12 13.5V8"/>
  </svg>`,
}

/**
 * Preview Breadcrumb - Shows element hierarchy for selected element
 *
 * Displays the path from root to the currently selected element,
 * allowing navigation to parent elements via click.
 */

import type { BreadcrumbItem } from '../core/state'
import type { EventBus } from '../core/events'

export interface BreadcrumbConfig {
  container: HTMLElement
  events: EventBus
  onItemClick?: (nodeId: string) => void
}

/**
 * Breadcrumb component for preview hierarchy navigation
 */
export class PreviewBreadcrumb {
  private container: HTMLElement
  private events: EventBus
  private onItemClick?: (nodeId: string) => void
  private items: BreadcrumbItem[] = []
  private unsubscribe: (() => void) | null = null
  private boundHandleClick: (e: MouseEvent) => void

  constructor(config: BreadcrumbConfig) {
    this.container = config.container
    this.events = config.events
    this.onItemClick = config.onItemClick

    // Event delegation: single listener for all breadcrumb clicks
    // Prevents memory leaks from re-creating listeners on each render()
    this.boundHandleClick = this.handleClick.bind(this)
    this.container.addEventListener('click', this.boundHandleClick)

    this.render()
    this.subscribe()
  }

  /**
   * Handle delegated click events
   */
  private handleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement
    const item = target.closest('.breadcrumb-item')
    if (item && !item.classList.contains('current')) {
      const nodeId = (item as HTMLElement).dataset.nodeId
      if (nodeId) {
        this.onItemClick?.(nodeId)
      }
    }
  }

  /**
   * Subscribe to breadcrumb changes
   */
  private subscribe(): void {
    this.unsubscribe = this.events.on('breadcrumb:changed', ({ breadcrumb }) => {
      this.items = breadcrumb
      this.render()
    })
  }

  /**
   * Update breadcrumb items directly
   */
  update(items: BreadcrumbItem[]): void {
    this.items = items
    this.render()
  }

  /**
   * Render the breadcrumb
   */
  private render(): void {
    this.container.innerHTML = ''

    if (this.items.length === 0) {
      this.container.classList.add('empty')
      return
    }

    this.container.classList.remove('empty')

    this.items.forEach((item, index) => {
      const isLast = index === this.items.length - 1

      // Create breadcrumb item
      // Click handling is delegated to container (no individual listeners)
      const itemEl = document.createElement('span')
      itemEl.className = `breadcrumb-item${isLast ? ' current' : ''}`
      itemEl.textContent = item.name
      itemEl.dataset.nodeId = item.nodeId

      this.container.appendChild(itemEl)

      // Add separator (except for last item)
      if (!isLast) {
        const separator = document.createElement('span')
        separator.className = 'breadcrumb-separator'
        separator.innerHTML = '&#8250;' // ›
        this.container.appendChild(separator)
      }
    })
  }

  /**
   * Clear the breadcrumb
   */
  clear(): void {
    this.items = []
    this.render()
  }

  /**
   * Dispose the breadcrumb
   */
  dispose(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.container.removeEventListener('click', this.boundHandleClick)
    this.container.innerHTML = ''
  }
}

/**
 * Create a PreviewBreadcrumb instance
 */
export function createPreviewBreadcrumb(config: BreadcrumbConfig): PreviewBreadcrumb {
  return new PreviewBreadcrumb(config)
}

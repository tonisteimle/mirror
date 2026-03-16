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

  constructor(config: BreadcrumbConfig) {
    this.container = config.container
    this.events = config.events
    this.onItemClick = config.onItemClick

    this.render()
    this.subscribe()
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
      const itemEl = document.createElement('span')
      itemEl.className = `breadcrumb-item${isLast ? ' current' : ''}`
      itemEl.textContent = item.name
      itemEl.dataset.nodeId = item.nodeId

      if (!isLast) {
        itemEl.addEventListener('click', () => {
          this.onItemClick?.(item.nodeId)
        })
      }

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
    this.container.innerHTML = ''
  }
}

/**
 * Create a PreviewBreadcrumb instance
 */
export function createPreviewBreadcrumb(config: BreadcrumbConfig): PreviewBreadcrumb {
  return new PreviewBreadcrumb(config)
}

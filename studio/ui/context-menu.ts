// @ts-nocheck
/**
 * Context Menu Component (Zag.js)
 *
 * A headless context menu component.
 * Uses @zag-js/menu for state management.
 */

import * as menu from '@zag-js/menu'
import { normalizeProps } from '@zag-js/vanilla'

// ============================================================================
// Types
// ============================================================================

export interface MenuItem {
  id: string
  label: string
  icon?: string
  shortcut?: string
  disabled?: boolean
  danger?: boolean
}

export interface MenuSeparator {
  type: 'separator'
}

export type MenuEntry = MenuItem | MenuSeparator

export interface ContextMenuConfig {
  /** Menu ID */
  id: string
  /** Menu items */
  items: MenuEntry[]
}

export interface ContextMenuCallbacks {
  /** Called when an item is selected */
  onSelect?: (itemId: string) => void
}

// ============================================================================
// Component
// ============================================================================

export class ZagContextMenu {
  private service: menu.Service | null = null
  private config: ContextMenuConfig
  private callbacks: ContextMenuCallbacks
  private menuElement: HTMLElement | null = null

  constructor(config: ContextMenuConfig, callbacks: ContextMenuCallbacks = {}) {
    this.config = config
    this.callbacks = callbacks
  }

  /**
   * Initialize the menu
   */
  init(): this {
    this.service = menu.machine({
      id: this.config.id,
      onSelect: details => {
        this.callbacks.onSelect?.(details.value)
      },
    })

    this.service.subscribe(() => {
      // Menu state changed
    })

    this.service.start()
    return this
  }

  /**
   * Open menu at position
   */
  open(position: { x: number; y: number }): void {
    if (!this.service) return

    // Remove existing menu
    this.close()

    const api = this.getApi()
    if (!api) return

    // Create menu element
    this.menuElement = document.createElement('div')
    this.menuElement.className = 'zag-context-menu'
    this.spreadProps(this.menuElement, api.getContentProps())

    // Position menu
    this.menuElement.style.position = 'fixed'
    this.menuElement.style.left = `${position.x}px`
    this.menuElement.style.top = `${position.y}px`
    this.menuElement.style.zIndex = '9999'

    // Render items
    for (const entry of this.config.items) {
      if ('type' in entry && entry.type === 'separator') {
        const separator = document.createElement('div')
        separator.className = 'context-menu-separator'
        this.menuElement.appendChild(separator)
      } else {
        const item = entry as MenuItem
        const itemEl = document.createElement('button')
        itemEl.className = 'context-menu-item'
        if (item.danger) itemEl.classList.add('danger')
        if (item.disabled) itemEl.classList.add('disabled')

        this.spreadProps(itemEl, api.getItemProps({ value: item.id }))

        // Icon (optional)
        if (item.icon) {
          const icon = document.createElement('span')
          icon.className = 'context-menu-icon'
          icon.innerHTML = item.icon
          itemEl.appendChild(icon)
        }

        // Label
        const label = document.createElement('span')
        label.className = 'context-menu-label'
        label.textContent = item.label
        itemEl.appendChild(label)

        // Shortcut (optional)
        if (item.shortcut) {
          const shortcut = document.createElement('span')
          shortcut.className = 'context-menu-shortcut'
          shortcut.textContent = item.shortcut
          itemEl.appendChild(shortcut)
        }

        itemEl.addEventListener('click', () => {
          if (!item.disabled) {
            this.callbacks.onSelect?.(item.id)
            this.close()
          }
        })

        this.menuElement.appendChild(itemEl)
      }
    }

    document.body.appendChild(this.menuElement)

    // Set up click outside handler
    const handleClickOutside = (e: MouseEvent) => {
      if (this.menuElement && !this.menuElement.contains(e.target as Node)) {
        this.close()
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0)

    // Adjust position if menu goes off-screen
    requestAnimationFrame(() => {
      if (!this.menuElement) return
      const rect = this.menuElement.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      if (rect.right > viewportWidth) {
        this.menuElement.style.left = `${viewportWidth - rect.width - 8}px`
      }
      if (rect.bottom > viewportHeight) {
        this.menuElement.style.top = `${viewportHeight - rect.height - 8}px`
      }
    })
  }

  /**
   * Close the menu
   */
  close(): void {
    if (this.menuElement) {
      this.menuElement.remove()
      this.menuElement = null
    }
  }

  /**
   * Update menu items
   */
  setItems(items: MenuEntry[]): void {
    this.config.items = items
  }

  /**
   * Get the Zag API
   */
  private getApi(): menu.Api<typeof normalizeProps> | null {
    if (!this.service) return null
    return menu.connect(this.service, normalizeProps)
  }

  /**
   * Spread Zag props onto element
   */
  private spreadProps(el: HTMLElement, props: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value)
      } else if (key.startsWith('on') && typeof value === 'function') {
        const event = key.slice(2).toLowerCase()
        el.addEventListener(event, value as EventListener)
      } else if (
        key.startsWith('data-') ||
        key.startsWith('aria-') ||
        key === 'role' ||
        key === 'id' ||
        key === 'tabindex'
      ) {
        el.setAttribute(key, String(value))
      }
    }
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    this.close()
    this.service?.stop()
    this.service = null
  }
}

/**
 * Factory function
 */
export function createContextMenu(
  config: ContextMenuConfig,
  callbacks: ContextMenuCallbacks = {}
): ZagContextMenu {
  return new ZagContextMenu(config, callbacks).init()
}

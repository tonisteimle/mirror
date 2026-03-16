/**
 * ContextMenu - Right-click context menu for preview elements
 *
 * Shows contextual actions:
 * - Group (Cmd+G) - when multiple elements selected
 * - Ungroup (Shift+Cmd+G) - when container selected
 * - Duplicate (Cmd+D)
 * - Delete (Delete)
 */

import { state, actions, events } from '../core'
import {
  executeGroup,
  executeUngroup,
  executeDuplicate,
  executeDelete,
  canGroup,
  canUngroup,
} from './shared-actions'

export interface ContextMenuConfig {
  container: HTMLElement
}

interface MenuItem {
  label: string
  shortcut?: string
  action: () => void
  disabled?: boolean
  separator?: boolean
}

export class ContextMenu {
  private container: HTMLElement
  private menuElement: HTMLElement | null = null
  private contextMenuAbortController: AbortController | null = null
  private menuAbortController: AbortController | null = null

  constructor(config: ContextMenuConfig) {
    this.container = config.container
  }

  attach(): void {
    this.contextMenuAbortController?.abort()
    this.contextMenuAbortController = new AbortController()
    this.container.addEventListener('contextmenu', this.handleContextMenu.bind(this), {
      signal: this.contextMenuAbortController.signal,
    })
  }

  detach(): void {
    this.contextMenuAbortController?.abort()
    this.contextMenuAbortController = null
    this.hide()
  }

  private handleContextMenu(e: MouseEvent): void {
    // Find the clicked element with data-mirror-id
    const target = e.target as HTMLElement
    const mirrorElement = target.closest('[data-mirror-id]') as HTMLElement | null

    if (!mirrorElement) {
      return // Not clicking on a Mirror element
    }

    e.preventDefault()

    const nodeId = mirrorElement.dataset.mirrorId
    if (!nodeId) return

    // Select the element if not already selected
    const currentSelection = state.get().selection
    const multiSelection = state.get().multiSelection

    if (currentSelection?.nodeId !== nodeId && !multiSelection.includes(nodeId)) {
      actions.setSelection(nodeId, 'preview')
    }

    // Show context menu at cursor position
    this.show(e.clientX, e.clientY)
  }

  private show(x: number, y: number): void {
    this.hide() // Remove existing menu and cleanup listeners

    const items = this.buildMenuItems()
    if (items.length === 0) return

    // Create AbortController for menu lifecycle
    this.menuAbortController = new AbortController()

    // Create menu element
    this.menuElement = document.createElement('div')
    this.menuElement.className = 'context-menu'
    this.menuElement.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      z-index: 10000;
    `

    // Add menu items
    for (const item of items) {
      if (item.separator) {
        const separator = document.createElement('div')
        separator.className = 'context-menu-separator'
        this.menuElement.appendChild(separator)
        continue
      }

      const menuItem = document.createElement('div')
      menuItem.className = 'context-menu-item'
      if (item.disabled) {
        menuItem.classList.add('disabled')
      }

      const label = document.createElement('span')
      label.className = 'context-menu-label'
      label.textContent = item.label
      menuItem.appendChild(label)

      if (item.shortcut) {
        const shortcut = document.createElement('span')
        shortcut.className = 'context-menu-shortcut'
        shortcut.textContent = item.shortcut
        menuItem.appendChild(shortcut)
      }

      if (!item.disabled) {
        menuItem.addEventListener('click', () => {
          this.hide()
          // Execute action in try-catch to ensure cleanup even on error
          try {
            item.action()
          } catch (e) {
            console.error('[ContextMenu] Action failed:', e)
          }
        }, { signal: this.menuAbortController?.signal })
      }

      this.menuElement.appendChild(menuItem)
    }

    document.body.appendChild(this.menuElement)

    // Adjust position if menu goes off-screen
    const rect = this.menuElement.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      this.menuElement.style.left = `${window.innerWidth - rect.width - 8}px`
    }
    if (rect.bottom > window.innerHeight) {
      this.menuElement.style.top = `${window.innerHeight - rect.height - 8}px`
    }
    // Also check top overflow
    if (rect.top < 0) {
      this.menuElement.style.top = '8px'
    }

    // Add event listeners for closing (with AbortController for cleanup)
    document.addEventListener('click', this.handleClickOutside.bind(this), {
      signal: this.menuAbortController?.signal,
    })
    document.addEventListener('keydown', this.handleKeyDown.bind(this), {
      signal: this.menuAbortController?.signal,
    })
  }

  private hide(): void {
    // Abort all menu-related listeners
    this.menuAbortController?.abort()
    this.menuAbortController = null

    if (this.menuElement) {
      this.menuElement.remove()
      this.menuElement = null
    }
  }

  private handleClickOutside(e: MouseEvent): void {
    if (this.menuElement && !this.menuElement.contains(e.target as Node)) {
      this.hide()
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.hide()
    }
  }

  private buildMenuItems(): MenuItem[] {
    const items: MenuItem[] = []
    const selection = state.get().selection
    const multiSelection = state.get().multiSelection
    const sourceMap = state.get().sourceMap

    if (!sourceMap) return items

    // Multi-selection: Group option
    if (multiSelection.length >= 2) {
      items.push({
        label: 'Group',
        shortcut: '\u2318G',
        action: () => this.handleGroup(),
        disabled: !canGroup(),
      })
    }

    // Single selection
    if (selection?.nodeId) {
      const node = sourceMap.getNodeById(selection.nodeId)
      if (node) {
        const hasParent = !!node.parentId

        // Ungroup option (for containers with children)
        if (canUngroup()) {
          items.push({
            label: 'Ungroup',
            shortcut: '\u21E7\u2318G',
            action: () => this.handleUngroup(),
          })
        }

        if (items.length > 0) {
          items.push({ label: '', separator: true, action: () => {} })
        }

        // Duplicate
        if (hasParent) {
          items.push({
            label: 'Duplicate',
            shortcut: '\u2318D',
            action: () => this.handleDuplicate(),
          })
        }

        // Delete
        if (hasParent) {
          items.push({
            label: 'Delete',
            shortcut: '\u232B',
            action: () => this.handleDelete(),
          })
        }
      }
    }

    return items
  }

  private handleGroup(): void {
    const result = executeGroup(this.container)
    if (result.success) {
      events.emit('notification:success', { message: result.message! })
    }
  }

  private handleUngroup(): void {
    const result = executeUngroup()
    if (result.success) {
      events.emit('notification:success', { message: result.message! })
    }
  }

  private handleDuplicate(): void {
    const result = executeDuplicate()
    if (result.success) {
      events.emit('notification:success', { message: result.message! })
    }
  }

  private handleDelete(): void {
    const result = executeDelete()
    if (result.success) {
      events.emit('notification:success', { message: result.message! })
    }
  }

  dispose(): void {
    this.detach()
  }
}

export function createContextMenu(config: ContextMenuConfig): ContextMenu {
  return new ContextMenu(config)
}

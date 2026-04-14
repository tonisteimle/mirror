/**
 * KeyboardHandler - Keyboard shortcuts for preview interactions
 *
 * Shortcuts:
 * - Cmd/Ctrl+G: Group selected elements (wrap in Box)
 * - Shift+Cmd/Ctrl+G: Ungroup selected element (unwrap container)
 * - Cmd/Ctrl+D: Duplicate selected element
 * - Delete/Backspace: Delete selected element(s)
 * - Escape: Clear multi-selection, or navigate to parent element
 * - Enter: Navigate to first child element
 * - Arrow keys: Move selected element (1px normal, 10px with Shift)
 */

import { state, actions, events, getLayoutService } from '../core'
import { executeGroup, executeUngroup, executeDuplicate, executeDelete } from './shared-actions'
import { SetPositionCommand } from '../core/commands'
import type { CommandContext } from '../core/commands'
import { isAbsoluteLayoutContainer } from '../../compiler/studio/utils/layout-detection'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('KeyboardHandler')

export interface KeyboardHandlerConfig {
  container: HTMLElement
  /** Command context for executing position commands */
  getCommandContext?: () => CommandContext | null
  /** Node ID attribute for finding elements */
  nodeIdAttribute?: string
}

export class KeyboardHandler {
  private container: HTMLElement
  private boundHandleKeyDown: (e: KeyboardEvent) => void
  private getCommandContext: () => CommandContext | null
  private nodeIdAttribute: string

  constructor(config: KeyboardHandlerConfig) {
    this.container = config.container
    this.boundHandleKeyDown = this.handleKeyDown.bind(this)
    this.getCommandContext = config.getCommandContext || (() => null)
    this.nodeIdAttribute = config.nodeIdAttribute || 'data-mirror-id'
  }

  attach(): void {
    document.addEventListener('keydown', this.boundHandleKeyDown)
  }

  detach(): void {
    document.removeEventListener('keydown', this.boundHandleKeyDown)
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Skip if target is an input element
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    // Shift+Cmd/Ctrl+G = Ungroup/Unwrap selected element
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'g') {
      e.preventDefault()
      this.handleUngroup()
      return
    }

    // Cmd/Ctrl+G = Group/Wrap selected elements
    if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
      e.preventDefault()
      this.handleGroup()
      return
    }

    // Cmd/Ctrl+D = Duplicate selected element
    if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
      e.preventDefault()
      this.handleDuplicate()
      return
    }

    // Delete/Backspace = Delete selected element(s)
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      this.handleDelete()
      return
    }

    // Arrow keys = Move selected element (if in absolute container)
    if (this.isArrowKey(e.key)) {
      const nodeId = state.get().selection?.nodeId
      if (nodeId && this.isInAbsoluteContainer(nodeId)) {
        e.preventDefault()
        this.handleArrowMove(e, nodeId)
        return
      }
    }

    // Enter = Navigate to first child element
    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
      const currentSelection = state.get().selection?.nodeId
      if (currentSelection) {
        e.preventDefault()
        this.selectFirstChild(currentSelection)
        return
      }
    }

    // Escape = Clear multi-selection OR navigate to parent
    if (e.key === 'Escape') {
      const multiSelection = state.get().multiSelection
      if (multiSelection.length > 0) {
        // First: clear multi-selection
        e.preventDefault()
        actions.clearMultiSelection()
        return
      }

      // Second: navigate to parent element
      const currentSelection = state.get().selection?.nodeId
      if (currentSelection) {
        e.preventDefault()
        this.selectParent(currentSelection)
        return
      }
    }
  }

  /**
   * Select the parent of the current element
   * If no parent exists, clears selection
   */
  private selectParent(nodeId: string): void {
    const sourceMap = state.get().sourceMap
    if (!sourceMap) return

    const node = sourceMap.getNodeById(nodeId)
    if (!node) return

    if (node.parentId) {
      // Navigate to parent
      actions.setSelection(node.parentId, 'keyboard')
      events.emit('notification:info', { message: 'Selected parent element', duration: 1500 })
    } else {
      // No parent - at root level, clear selection
      actions.setSelection(null, 'keyboard')
    }
  }

  /**
   * Select the first child of the current element
   * If no children exist, does nothing
   */
  private selectFirstChild(nodeId: string): void {
    const sourceMap = state.get().sourceMap
    if (!sourceMap) return

    const children = sourceMap.getChildren(nodeId)
    if (children.length > 0) {
      // Sort by line number and select first
      const sorted = children.sort((a, b) => a.position.line - b.position.line)
      actions.setSelection(sorted[0].nodeId, 'keyboard')
      events.emit('notification:info', { message: 'Selected child element', duration: 1500 })
    }
  }

  /**
   * Check if a key is an arrow key
   */
  private isArrowKey(key: string): boolean {
    return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)
  }

  /**
   * Check if an element is in an absolute container (pos/stacked layout)
   * Uses LayoutService for cached lookups, with DOM fallback.
   */
  private isInAbsoluteContainer(nodeId: string): boolean {
    // Try LayoutService first (cached, O(1))
    const layoutService = getLayoutService()
    if (layoutService) {
      const layout = layoutService.getLayout(nodeId)
      if (layout) {
        // Element itself is absolutely positioned
        if (layout.isAbsolute) {
          return true
        }
        // Check parent's layout
        if (layout.parentId) {
          const parentLayout = layoutService.getLayout(layout.parentId)
          if (parentLayout && parentLayout.isAbsolute) {
            return true
          }
        }
      }
    }

    // Fallback to DOM reads
    const element = this.container.querySelector(
      `[${this.nodeIdAttribute}="${nodeId}"]`
    ) as HTMLElement | null
    if (!element) return false

    const parent = element.parentElement
    if (!parent) return false

    // Use centralized layout detection
    if (isAbsoluteLayoutContainer(parent)) {
      return true
    }

    // Also check if element itself has absolute positioning
    const style = window.getComputedStyle(element)
    if (style.position === 'absolute') {
      return true
    }

    return false
  }

  /**
   * Get current position of an element
   *
   * Priority:
   * 1. LayoutService cache (fast, already computed)
   * 2. data-x/data-y attributes (from DSL, most accurate)
   * 3. computed left/top (for CSS-positioned elements)
   * 4. getBoundingClientRect relative to parent (fallback for any layout)
   *
   * IMPORTANT: Never default to (0,0) as this can cause unexpected jumps
   */
  private getCurrentPosition(nodeId: string): { x: number; y: number } | null {
    // Priority 1: Try LayoutService cache first (fastest, O(1))
    const layoutService = getLayoutService()
    if (layoutService) {
      const layout = layoutService.getLayout(nodeId)
      if (layout) {
        return { x: Math.round(layout.x), y: Math.round(layout.y) }
      }
    }

    // Fallback to DOM reads
    const element = this.container.querySelector(
      `[${this.nodeIdAttribute}="${nodeId}"]`
    ) as HTMLElement | null
    if (!element) return null

    // Priority 2: Try to read from data attributes (set by DSL)
    const dataX = element.dataset.x
    const dataY = element.dataset.y
    if (dataX !== undefined && dataY !== undefined) {
      const x = parseInt(dataX, 10)
      const y = parseInt(dataY, 10)
      // Only use data attributes if they're valid numbers
      if (!isNaN(x) && !isNaN(y)) {
        return { x, y }
      }
    }

    // Priority 3: Try computed style left/top
    const style = window.getComputedStyle(element)
    const computedLeft = style.left
    const computedTop = style.top

    // Check if left/top are set (not 'auto' or empty)
    if (computedLeft && computedLeft !== 'auto' && computedTop && computedTop !== 'auto') {
      const x = parseFloat(computedLeft)
      const y = parseFloat(computedTop)
      if (!isNaN(x) && !isNaN(y)) {
        return { x: Math.round(x), y: Math.round(y) }
      }
    }

    // Priority 4: Fall back to getBoundingClientRect relative to parent
    // This works for any layout, including elements without explicit positioning
    const parent = element.parentElement
    if (parent) {
      const elementRect = element.getBoundingClientRect()
      const parentRect = parent.getBoundingClientRect()
      return {
        x: Math.round(elementRect.left - parentRect.left),
        y: Math.round(elementRect.top - parentRect.top),
      }
    }

    // Final fallback: relative to container
    const elementRect = element.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()
    return {
      x: Math.round(elementRect.left - containerRect.left),
      y: Math.round(elementRect.top - containerRect.top),
    }
  }

  /**
   * Handle arrow key movement
   */
  private handleArrowMove(e: KeyboardEvent, nodeId: string): void {
    const step = e.shiftKey ? 10 : 1

    let dx = 0
    let dy = 0
    switch (e.key) {
      case 'ArrowUp':
        dy = -step
        break
      case 'ArrowDown':
        dy = step
        break
      case 'ArrowLeft':
        dx = -step
        break
      case 'ArrowRight':
        dx = step
        break
    }

    const currentPos = this.getCurrentPosition(nodeId)
    if (!currentPos) {
      log.warn('Cannot determine position for element:', nodeId)
      events.emit('notification:warning', {
        message: 'Element-Position konnte nicht ermittelt werden',
        duration: 2000,
      })
      return
    }

    const newX = currentPos.x + dx
    const newY = currentPos.y + dy

    // Execute position command
    const ctx = this.getCommandContext()
    if (!ctx) {
      log.warn('No command context available for position update')
      // PREV-013: Provide user feedback instead of silent failure
      events.emit('notification:warning', {
        message: 'Aktion nicht verfügbar - bitte erneut versuchen',
        duration: 2000,
      })
      return
    }

    const command = new SetPositionCommand({
      nodeId,
      x: newX,
      y: newY,
      description: `Move ${e.key}`,
    })

    const result = command.execute(ctx)
    if (result.success) {
      // Trigger recompile
      ctx.compile()
      events.emit('notification:success', { message: `Moved to (${newX}, ${newY})` })
    } else {
      events.emit('notification:warning', { message: result.error || 'Failed to move element' })
    }
  }

  private handleGroup(): void {
    const result = executeGroup(this.container)

    if (result.success) {
      events.emit('notification:success', { message: result.message! })
    } else {
      events.emit('notification:warning', { message: result.error! })
    }
  }

  private handleUngroup(): void {
    const result = executeUngroup()

    if (result.success) {
      events.emit('notification:success', { message: result.message! })
    } else {
      events.emit('notification:warning', { message: result.error! })
    }
  }

  private handleDelete(): void {
    const result = executeDelete()

    if (result.success) {
      events.emit('notification:success', { message: result.message! })
    } else {
      events.emit('notification:warning', { message: result.error! })
    }
  }

  private handleDuplicate(): void {
    const result = executeDuplicate()

    if (result.success) {
      events.emit('notification:success', { message: result.message! })
    } else {
      events.emit('notification:warning', { message: result.error! })
    }
  }

  dispose(): void {
    this.detach()
  }
}

export function createKeyboardHandler(config: KeyboardHandlerConfig): KeyboardHandler {
  return new KeyboardHandler(config)
}

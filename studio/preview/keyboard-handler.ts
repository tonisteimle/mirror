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

import { state, actions, events } from '../core'
import {
  executeGroup,
  executeUngroup,
  executeDuplicate,
  executeDelete,
} from './shared-actions'
import { SetPositionCommand } from '../core/commands'
import type { CommandContext } from '../core/commands'
import { isAbsoluteLayoutContainer } from '../../src/studio/utils/layout-detection'

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
   * Uses centralized layout detection for consistency.
   */
  private isInAbsoluteContainer(nodeId: string): boolean {
    const element = this.container.querySelector(`[${this.nodeIdAttribute}="${nodeId}"]`) as HTMLElement | null
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
   */
  private getCurrentPosition(nodeId: string): { x: number; y: number } {
    const element = this.container.querySelector(`[${this.nodeIdAttribute}="${nodeId}"]`) as HTMLElement | null
    if (!element) return { x: 0, y: 0 }

    // Try to read from data attributes first (set by DSL)
    const dataX = element.dataset.x
    const dataY = element.dataset.y
    if (dataX !== undefined && dataY !== undefined) {
      return { x: parseInt(dataX, 10) || 0, y: parseInt(dataY, 10) || 0 }
    }

    // Fall back to computed style
    const style = window.getComputedStyle(element)
    return {
      x: parseInt(style.left, 10) || 0,
      y: parseInt(style.top, 10) || 0,
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

    const { x, y } = this.getCurrentPosition(nodeId)
    const newX = x + dx
    const newY = y + dy

    // Execute position command
    const ctx = this.getCommandContext()
    if (!ctx) {
      console.warn('[KeyboardHandler] No command context available for position update')
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

/**
 * KeyboardHandler - Keyboard shortcuts for preview interactions
 *
 * Shortcuts:
 * - Cmd/Ctrl+G: Group selected elements (wrap in Box)
 * - Shift+Cmd/Ctrl+G: Ungroup selected element (unwrap container)
 * - Cmd/Ctrl+D: Duplicate selected element
 * - Delete/Backspace: Delete selected element(s)
 * - Escape: Clear multi-selection
 */

import { state, actions, events } from '../core'
import {
  executeGroup,
  executeUngroup,
  executeDuplicate,
  executeDelete,
} from './shared-actions'

export interface KeyboardHandlerConfig {
  container: HTMLElement
}

export class KeyboardHandler {
  private container: HTMLElement
  private boundHandleKeyDown: (e: KeyboardEvent) => void

  constructor(config: KeyboardHandlerConfig) {
    this.container = config.container
    this.boundHandleKeyDown = this.handleKeyDown.bind(this)
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

    // Escape = Clear multi-selection
    if (e.key === 'Escape') {
      const multiSelection = state.get().multiSelection
      if (multiSelection.length > 0) {
        e.preventDefault()
        actions.clearMultiSelection()
        return
      }
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

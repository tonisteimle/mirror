/**
 * KeyboardHandler - Keyboard shortcuts for direct UI manipulation
 *
 * A thin layer that maps keyboard events to ChangeService intents.
 * No business logic here - just event → intent translation.
 */

import { state, actions } from '../core/state'
import { change } from '../core/change-service'
import { events } from '../core/events'

// ============================================================================
// TYPES
// ============================================================================

export type HoveredEdge = 'top' | 'right' | 'bottom' | 'left' | null

export interface KeyboardHandlerConfig {
  /** Container element to listen for keyboard events (default: document) */
  container?: HTMLElement | Document
  /** Get the currently hovered edge (for side-specific padding) */
  getHoveredEdge?: () => HoveredEdge
  /** Check if keyboard shortcuts should be active */
  isEnabled?: () => boolean
}

// ============================================================================
// KEYBOARD HANDLER
// ============================================================================

export class KeyboardHandler {
  private config: Required<KeyboardHandlerConfig>
  private cleanup: (() => void) | null = null

  constructor(config: KeyboardHandlerConfig = {}) {
    this.config = {
      container: config.container ?? document,
      getHoveredEdge: config.getHoveredEdge ?? (() => null),
      isEnabled: config.isEnabled ?? (() => true),
    }
  }

  /**
   * Initialize keyboard listeners
   */
  init(): void {
    const handler = this.handleKeyDown.bind(this) as unknown as EventListener
    this.config.container.addEventListener('keydown', handler)
    this.cleanup = () => {
      this.config.container.removeEventListener('keydown', handler)
    }
  }

  /**
   * Dispose and cleanup listeners
   */
  dispose(): void {
    this.cleanup?.()
    this.cleanup = null
  }

  /**
   * Handle keydown events
   */
  private async handleKeyDown(e: KeyboardEvent): Promise<void> {
    // Check if shortcuts are enabled
    if (!this.config.isEnabled()) return

    // Don't handle if typing in an input
    if (this.isTypingInInput(e)) return

    // Get selected node
    const selectedNodeId = state.get().selection.nodeId
    const multiSelection = state.get().multiSelection

    // Get key info
    const key = e.key.toLowerCase()
    const shift = e.shiftKey
    const ctrl = e.ctrlKey || e.metaKey

    // Handle shortcuts that don't require selection
    if (key === 'escape') {
      actions.clearSelection('keyboard')
      actions.clearMultiSelection()
      return
    }

    // All other shortcuts require selection
    if (!selectedNodeId && multiSelection.length === 0) return

    // Prevent default for our shortcuts
    const handled = await this.handleShortcut(key, shift, ctrl, selectedNodeId, multiSelection, e)

    if (handled) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  /**
   * Handle a specific shortcut
   */
  private async handleShortcut(
    key: string,
    shift: boolean,
    ctrl: boolean,
    nodeId: string | null,
    multiSelection: string[],
    e: KeyboardEvent
  ): Promise<boolean> {
    // Grouping (Ctrl+G / Ctrl+Shift+G)
    if (ctrl && key === 'g') {
      if (shift) {
        // Ungroup
        if (nodeId) {
          await change({ type: 'ungroup', nodeId })
          return true
        }
      } else {
        // Group
        const nodeIds = multiSelection.length > 0 ? multiSelection : (nodeId ? [nodeId] : [])
        if (nodeIds.length >= 2) {
          await change({ type: 'groupNodes', nodeIds })
          return true
        }
      }
      return false
    }

    // Distribution (Ctrl+Shift+H for horizontal, Ctrl+Shift+V for vertical)
    if (ctrl && shift && (key === 'h' || key === 'v')) {
      const nodeIds = multiSelection.length > 0 ? multiSelection : (nodeId ? [nodeId] : [])
      if (nodeIds.length >= 2) {
        const direction = key === 'h' ? 'horizontal' : 'vertical'
        await change({ type: 'distribute', nodeIds, direction })
        return true
      }
      return false
    }

    // Single-node shortcuts
    if (!nodeId) return false

    switch (key) {
      // ===== SPACING =====
      case 'p':
        // Padding
        const edge = this.config.getHoveredEdge()
        await change({
          type: 'incrementProperty',
          nodeId,
          property: 'pad',
          direction: shift ? -1 : 1,
          side: edge ?? undefined,
        })
        return true

      case 's':
        // Gap/Spacing (but not if Ctrl is pressed - that's save)
        if (ctrl) return false
        await change({
          type: 'incrementProperty',
          nodeId,
          property: 'gap',
          direction: shift ? -1 : 1,
        })
        return true

      // ===== LAYOUT =====
      case 'd':
        // Direction toggle
        await change({ type: 'toggleDirection', nodeId })
        return true

      case 'v':
        // Vertical (explicit)
        await change({ type: 'setDirection', nodeId, direction: 'vertical' })
        return true

      // ===== SIZE =====
      case 'f':
        // Full / Hug
        await change({
          type: 'setSize',
          nodeId,
          size: shift ? 'hug' : 'full',
        })
        return true

      // ===== ALIGNMENT =====
      case 'l':
        await change({ type: 'setAlignment', nodeId, alignment: 'left' })
        return true

      case 'c':
        // Center (but not if Ctrl - that's copy)
        if (ctrl) return false
        await change({ type: 'setAlignment', nodeId, alignment: 'center' })
        return true

      case 'r':
        await change({ type: 'setAlignment', nodeId, alignment: 'right' })
        return true

      case 't':
        await change({ type: 'setAlignment', nodeId, alignment: 'top' })
        return true

      case 'b':
        await change({ type: 'setAlignment', nodeId, alignment: 'bottom' })
        return true

      // ===== DELETE =====
      case 'backspace':
      case 'delete':
        // Delete selected nodes
        if (multiSelection.length > 0) {
          for (const id of multiSelection) {
            await change({ type: 'deleteNode', nodeId: id })
          }
        } else {
          await change({ type: 'deleteNode', nodeId })
        }
        return true

      default:
        return false
    }
  }

  /**
   * Check if user is typing in an input field
   */
  private isTypingInInput(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement
    if (!target) return false

    const tagName = target.tagName.toLowerCase()
    if (tagName === 'input' || tagName === 'textarea') return true
    if (target.isContentEditable) return true

    // Check for CodeMirror
    if (target.closest('.cm-editor')) return true

    return false
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let instance: KeyboardHandler | null = null

/**
 * Initialize the keyboard handler
 */
export function initKeyboardHandler(config?: KeyboardHandlerConfig): KeyboardHandler {
  if (instance) {
    instance.dispose()
  }
  instance = new KeyboardHandler(config)
  instance.init()
  return instance
}

/**
 * Get the keyboard handler instance
 */
export function getKeyboardHandler(): KeyboardHandler | null {
  return instance
}

/**
 * Dispose the keyboard handler
 */
export function disposeKeyboardHandler(): void {
  instance?.dispose()
  instance = null
}

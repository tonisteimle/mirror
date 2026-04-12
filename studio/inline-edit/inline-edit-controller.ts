/**
 * InlineEditController - Orchestrates inline text editing
 *
 * Listens for double-click events on editable elements and manages edit sessions.
 * Integrates with the state store and command system for undo/redo support.
 */

import { state, actions, events } from '../core'
import { InlineEditSession, createInlineEditSession } from './inline-edit-session'
import { isEditableType, type InlineEditConfig, type InlineEditResult } from './types'
import type { SourceMap } from '../../compiler/ir/source-map'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('InlineEdit')

/** Minimum delay (ms) before starting edit mode to prevent accidental activation */
const EDIT_START_DELAY = 150

/** Maximum mouse movement (px) during delay before edit is cancelled */
const MAX_MOUSE_DRIFT = 10

export class InlineEditController {
  private container: HTMLElement
  private nodeIdAttribute: string
  private currentSession: InlineEditSession | null = null
  private sourceMap: SourceMap | null = null
  private onEditStart?: (nodeId: string, element: HTMLElement) => void
  private onEditEnd?: (nodeId: string, newText: string, saved: boolean) => void

  // Bound handler for cleanup
  private boundHandleDoubleClick: (e: MouseEvent) => void

  // Pending edit state (for delay-based activation)
  private pendingEditTimeout: ReturnType<typeof setTimeout> | null = null
  private pendingEditStart: { x: number; y: number } | null = null
  private boundCancelPendingEdit: () => void
  private boundCheckMouseDrift: (e: MouseEvent) => void

  constructor(config: InlineEditConfig) {
    this.container = config.container
    this.nodeIdAttribute = config.nodeIdAttribute ?? 'data-mirror-id'
    this.onEditStart = config.onEditStart
    this.onEditEnd = config.onEditEnd

    this.boundHandleDoubleClick = this.handleDoubleClick.bind(this)
    this.boundCancelPendingEdit = this.cancelPendingEdit.bind(this)
    this.boundCheckMouseDrift = this.checkMouseDrift.bind(this)
  }

  /**
   * Attach double-click listener to container
   */
  attach(): void {
    this.container.addEventListener('dblclick', this.boundHandleDoubleClick)
  }

  /**
   * Detach double-click listener
   */
  detach(): void {
    this.container.removeEventListener('dblclick', this.boundHandleDoubleClick)
    this.cancelPendingEdit()
    this.endEdit(false)
  }

  /**
   * Update source map reference
   */
  setSourceMap(sourceMap: SourceMap | null): void {
    this.sourceMap = sourceMap
  }

  /**
   * Start editing a specific node by ID
   */
  startEdit(nodeId: string): boolean {
    // Don't start if already editing same element
    if (this.currentSession?.isEditing()) {
      if (state.get().inlineEditNodeId === nodeId) {
        return false
      }
      // End current session first (save it)
      this.endEdit(true)
    }

    // Find element
    const element = this.container.querySelector(
      `[${this.nodeIdAttribute}="${nodeId}"]`
    ) as HTMLElement | null

    if (!element) {
      log.warn(' Element not found:', nodeId)
      return false
    }

    // Check if element type is editable
    if (!this.isElementEditable(nodeId)) {
      log.info(' Element not editable:', nodeId)
      return false
    }

    // Hide resize handles during editing
    events.emit('inline-edit:started', { nodeId, element })

    // Create and start session
    this.currentSession = createInlineEditSession({
      element,
      nodeId,
      onEnd: this.handleSessionEnd.bind(this),
      onInput: () => {
        // Emit event for potential resize handle updates
        events.emit('inline-edit:input', { nodeId, element })
      },
    })

    this.currentSession.start()

    // Update state
    actions.setInlineEditActive(true, nodeId)

    // Callback
    this.onEditStart?.(nodeId, element)

    log.info(' Started editing:', nodeId)
    return true
  }

  /**
   * End current edit session
   */
  endEdit(save: boolean): void {
    if (!this.currentSession?.isEditing()) return

    this.currentSession.end(save)
    // Session end callback will handle state update
  }

  /**
   * Check if currently editing
   */
  isEditing(): boolean {
    return this.currentSession?.isEditing() ?? false
  }

  /**
   * Get current edit node ID
   */
  getEditingNodeId(): string | null {
    return state.get().inlineEditNodeId
  }

  /**
   * Dispose controller
   */
  dispose(): void {
    this.detach()
  }

  /**
   * Handle double-click on preview elements
   *
   * Uses a short delay before activating edit mode to prevent accidental
   * activation from quick double-clicks. If the user moves the mouse
   * significantly during the delay, the edit is cancelled.
   */
  private handleDoubleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement

    // Find closest element with node ID
    const nodeElement = target.closest(`[${this.nodeIdAttribute}]`) as HTMLElement | null
    if (!nodeElement) return

    const nodeId = nodeElement.getAttribute(this.nodeIdAttribute)
    if (!nodeId) return

    // Prevent default and stop propagation
    e.preventDefault()
    e.stopPropagation()

    // Cancel any pending edit
    this.cancelPendingEdit()

    // Check if element is editable before starting delay
    if (!this.isElementEditable(nodeId)) {
      return
    }

    // Start delay-based activation
    this.pendingEditStart = { x: e.clientX, y: e.clientY }

    // Listen for mouse movement to detect drift
    document.addEventListener('mousemove', this.boundCheckMouseDrift)

    // Listen for click to cancel (user clicked elsewhere)
    document.addEventListener('mousedown', this.boundCancelPendingEdit)

    // Start the delayed edit
    this.pendingEditTimeout = setTimeout(() => {
      this.cleanupPendingListeners()
      this.startEdit(nodeId)
    }, EDIT_START_DELAY)
  }

  /**
   * Cancel a pending edit activation
   */
  private cancelPendingEdit(): void {
    if (this.pendingEditTimeout) {
      clearTimeout(this.pendingEditTimeout)
      this.pendingEditTimeout = null
    }
    this.pendingEditStart = null
    this.cleanupPendingListeners()
  }

  /**
   * Check if mouse has drifted too far during pending edit delay
   */
  private checkMouseDrift(e: MouseEvent): void {
    if (!this.pendingEditStart) return

    const dx = Math.abs(e.clientX - this.pendingEditStart.x)
    const dy = Math.abs(e.clientY - this.pendingEditStart.y)

    if (dx > MAX_MOUSE_DRIFT || dy > MAX_MOUSE_DRIFT) {
      this.cancelPendingEdit()
    }
  }

  /**
   * Remove temporary listeners for pending edit
   */
  private cleanupPendingListeners(): void {
    document.removeEventListener('mousemove', this.boundCheckMouseDrift)
    document.removeEventListener('mousedown', this.boundCancelPendingEdit)
  }

  /**
   * Check if an element is editable based on its component type
   */
  private isElementEditable(nodeId: string): boolean {
    // Get component type from SourceMap
    const sourceMap = this.sourceMap || state.get().sourceMap
    if (!sourceMap) {
      log.warn(' No SourceMap available')
      return false
    }

    const node = sourceMap.getNodeById(nodeId)
    if (!node) {
      log.warn(' Node not found in SourceMap:', nodeId)
      return false
    }

    const editable = isEditableType(node.componentName)
    log.info(' Component type:', node.componentName, 'editable:', editable)
    return editable
  }

  /**
   * Handle session end
   */
  private handleSessionEnd(result: InlineEditResult): void {
    log.info(' Session ended:', result)

    // Clear session
    this.currentSession = null

    // Update state
    actions.setInlineEditActive(false, null)

    // Emit event
    events.emit('inline-edit:ended', result)

    // Callback
    this.onEditEnd?.(result.nodeId, result.newText, result.saved)
  }
}

/**
 * Create inline edit controller
 */
export function createInlineEditController(config: InlineEditConfig): InlineEditController {
  return new InlineEditController(config)
}

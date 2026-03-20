/**
 * InlineEditController - Orchestrates inline text editing
 *
 * Listens for double-click events on editable elements and manages edit sessions.
 * Integrates with the state store and command system for undo/redo support.
 */

import { state, actions, events } from '../core'
import { InlineEditSession, createInlineEditSession } from './inline-edit-session'
import { isEditableType, type InlineEditConfig, type InlineEditResult } from './types'
import type { SourceMap } from '../../src/studio/source-map'

export class InlineEditController {
  private container: HTMLElement
  private nodeIdAttribute: string
  private currentSession: InlineEditSession | null = null
  private sourceMap: SourceMap | null = null
  private onEditStart?: (nodeId: string, element: HTMLElement) => void
  private onEditEnd?: (nodeId: string, newText: string, saved: boolean) => void

  // Bound handler for cleanup
  private boundHandleDoubleClick: (e: MouseEvent) => void

  constructor(config: InlineEditConfig) {
    this.container = config.container
    this.nodeIdAttribute = config.nodeIdAttribute ?? 'data-mirror-id'
    this.onEditStart = config.onEditStart
    this.onEditEnd = config.onEditEnd

    this.boundHandleDoubleClick = this.handleDoubleClick.bind(this)
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
    // Don't start if already editing
    if (this.currentSession?.isEditing()) {
      // If clicking on same element, ignore
      if (state.get().inlineEditNodeId === nodeId) {
        return false
      }
      // End current session first
      this.endEdit(true)
    }

    // Find element
    const element = this.container.querySelector(
      `[${this.nodeIdAttribute}="${nodeId}"]`
    ) as HTMLElement | null

    if (!element) {
      console.warn('[InlineEdit] Element not found:', nodeId)
      return false
    }

    // Check if element type is editable
    if (!this.isElementEditable(nodeId)) {
      return false
    }

    // Create and start session
    this.currentSession = createInlineEditSession({
      element,
      nodeId,
      onEnd: this.handleSessionEnd.bind(this),
    })

    this.currentSession.start()

    // Update state
    actions.setInlineEditActive(true, nodeId)

    // Emit event
    events.emit('inline-edit:started', { nodeId, element })

    // Callback
    this.onEditStart?.(nodeId, element)

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

    // Start edit session
    this.startEdit(nodeId)
  }

  /**
   * Check if an element is editable based on its component type
   */
  private isElementEditable(nodeId: string): boolean {
    // Get component type from SourceMap
    const sourceMap = this.sourceMap || state.get().sourceMap
    if (!sourceMap) return false

    const node = sourceMap.getNodeById(nodeId)
    if (!node) return false

    return isEditableType(node.componentName)
  }

  /**
   * Handle session end
   */
  private handleSessionEnd(result: InlineEditResult): void {
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

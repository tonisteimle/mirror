/**
 * KeyboardHandler - Keyboard shortcuts for preview interactions
 *
 * Shortcuts:
 * - H: Set horizontal layout (single selection) OR wrap in horizontal Frame (multiselect)
 * - V: Set vertical layout (single selection) OR wrap in vertical Frame (multiselect)
 * - U: Ungroup/unwrap selected container
 * - F: Set full dimension (analyzes shape: wider→w full, taller→h full, press again for both)
 * - S: Toggle spread (space-between distribution)
 * - P: Toggle padding handles (show inner padding handles for direct manipulation)
 * - M: Toggle margin handles (show outer margin handles for direct manipulation)
 * - G: Toggle gap handles (show gap handles between children for direct manipulation)
 * - T: Insert Text as last child of selected element
 * - R: Insert Frame (Rectangle) as last child of selected element
 * - I: Insert Icon as last child of selected element
 * - Cmd/Ctrl+G: Group selected elements (wrap in Box)
 * - Shift+Cmd/Ctrl+G: Ungroup selected element (unwrap container)
 * - Cmd/Ctrl+D: Duplicate selected element
 * - Delete/Backspace: Delete selected element(s)
 * - Escape: Exit spacing mode, clear multi-selection, or navigate to parent element
 * - Enter: Navigate to first child element
 * - Arrow keys (no spacing mode): Move selected element (1px normal, 10px with Shift)
 * - Arrow keys (in P/M/G spacing mode): Adjust spacing in grid steps. Plain = all sides.
 *   Option+arrow = single side +1 step. Option+Shift+arrow = single side -1 step.
 */

import {
  state,
  actions,
  events,
  executor,
  InsertComponentCommand,
  type CommandContext,
} from '../core'
import {
  executeGroup,
  executeUngroup,
  executeDuplicate,
  executeDelete,
  executeSetLayoutDirection,
  executeSetFullDimension,
  executeWrapWithLayout,
  executeToggleSpread,
  type ActionResult,
} from './shared-actions'
import {
  isArrowKey,
  isInAbsoluteContainer,
  handleArrowMove,
  type PositionArrowContext,
} from './keyboard/position-arrow'
import { handleSpacingArrow } from './keyboard/spacing-arrow'
import { createLogger } from '../../compiler/utils/logger'
import { MIRROR_ID_ATTR } from '../../compiler/utils/mirror-attrs'

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
  private unsubscribeHandleMode: (() => void) | null = null

  constructor(config: KeyboardHandlerConfig) {
    this.container = config.container
    this.boundHandleKeyDown = this.handleKeyDown.bind(this)
    this.getCommandContext = config.getCommandContext || (() => null)
    this.nodeIdAttribute = config.nodeIdAttribute || MIRROR_ID_ATTR
  }

  attach(): void {
    document.addEventListener('keydown', this.boundHandleKeyDown)

    // End the spacing-mode coalescing session whenever the user leaves the
    // current spacing mode (back to resize, or directly into another spacing
    // mode). Each mode is one logical undo step.
    this.unsubscribeHandleMode = events.on('handleMode:changed', ({ prevMode }) => {
      const wasSpacing = prevMode === 'padding' || prevMode === 'margin' || prevMode === 'gap'
      if (wasSpacing && executor.isInSession()) {
        executor.endSession()
      }
    })
  }

  detach(): void {
    document.removeEventListener('keydown', this.boundHandleKeyDown)
    if (this.unsubscribeHandleMode) {
      this.unsubscribeHandleMode()
      this.unsubscribeHandleMode = null
    }
    // Defensive: if a session was open (e.g. detach called mid-session), commit it.
    if (executor.isInSession()) {
      executor.endSession()
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Skip if target is an input element
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      log.debug('Skipping key (input element):', e.key)
      return
    }

    // Skip if editor has focus (let editor handle keystrokes)
    // Exceptions:
    // - Global shortcuts with Cmd/Ctrl modifier
    // - Escape key (used for navigation/clearing selection)
    // - Delete/Backspace (when there's a selection to delete)
    const isGlobalShortcut = e.metaKey || e.ctrlKey
    const isNavigationKey = e.key === 'Escape'
    const isDeleteWithSelection =
      (e.key === 'Delete' || e.key === 'Backspace') && !!state.get().selection?.nodeId
    if (
      state.get().editorHasFocus &&
      !isGlobalShortcut &&
      !isNavigationKey &&
      !isDeleteWithSelection
    ) {
      log.debug('Skipping key (editor has focus):', e.key)
      return
    }

    // Shift+Cmd/Ctrl+G = Ungroup/Unwrap selected element
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
      e.preventDefault()
      this.handleUngroup()
      return
    }

    // U = Ungroup/Unwrap selected element (no modifiers)
    if (e.key === 'u' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const nodeId = state.get().selection?.nodeId
      if (nodeId) {
        e.preventDefault()
        this.handleUngroup()
        return
      }
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

    // H = Horizontal layout or wrap multiselection in horizontal Frame
    if (e.key === 'h' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const multiSelection = state.get().multiSelection
      if (multiSelection.length >= 2) {
        // Multiselect: wrap in horizontal Frame with calculated gap
        e.preventDefault()
        this.handleWrapWithLayout('hor')
        return
      }
      const nodeId = state.get().selection?.nodeId
      if (nodeId) {
        // Single selection: set horizontal layout
        e.preventDefault()
        this.handleSetLayoutDirection('horizontal')
        return
      }
    }

    // V = Vertical layout or wrap multiselection in vertical Frame
    if (e.key === 'v' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const multiSelection = state.get().multiSelection
      if (multiSelection.length >= 2) {
        // Multiselect: wrap in vertical Frame with calculated gap
        e.preventDefault()
        this.handleWrapWithLayout('ver')
        return
      }
      const nodeId = state.get().selection?.nodeId
      if (nodeId) {
        // Single selection: set vertical layout
        e.preventDefault()
        this.handleSetLayoutDirection('vertical')
        return
      }
    }

    // F = Set full dimension (based on element shape)
    if (e.key === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const nodeId = state.get().selection?.nodeId
      if (nodeId) {
        e.preventDefault()
        this.handleSetFullDimension()
        return
      }
    }

    // S = Toggle spread (space-between distribution)
    if (e.key === 's' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const nodeId = state.get().selection?.nodeId
      if (nodeId) {
        e.preventDefault()
        this.handleToggleSpread()
        return
      }
    }

    // P = Toggle padding handles mode
    if (e.key === 'p' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const nodeId = state.get().selection?.nodeId
      if (nodeId) {
        e.preventDefault()
        events.emit('handles:toggle-padding', { nodeId })
        return
      }
    }

    // M = Toggle margin handles mode
    if (e.key === 'm' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const nodeId = state.get().selection?.nodeId
      if (nodeId) {
        e.preventDefault()
        events.emit('handles:toggle-margin', { nodeId })
        return
      }
    }

    // G = Toggle gap handles mode (without Cmd/Ctrl modifier)
    if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      const nodeId = state.get().selection?.nodeId
      if (nodeId) {
        e.preventDefault()
        events.emit('handles:toggle-gap', { nodeId })
        return
      }
    }

    // T/R/I = Insert child element. Only active in normal (resize) mode —
    // not while a spacing mode (P/M/G) is active, where these letters may
    // gain modal sub-key meaning later.
    const handleMode = state.get().handleMode
    const isSpacingMode =
      handleMode === 'padding' || handleMode === 'margin' || handleMode === 'gap'
    if (
      !isSpacingMode &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.shiftKey &&
      (e.key === 't' || e.key === 'r' || e.key === 'i')
    ) {
      const nodeId = state.get().selection?.nodeId
      if (nodeId) {
        e.preventDefault()
        const insertSpec = this.getInsertSpec(e.key)
        this.handleInsertChild(nodeId, insertSpec.component, insertSpec.textContent)
        return
      }
    }

    // Arrow keys: in spacing mode → adjust spacing. Otherwise: move element
    // (when in an absolute container).
    if (isArrowKey(e.key)) {
      const nodeId = state.get().selection?.nodeId
      if (nodeId && isSpacingMode) {
        e.preventDefault()
        handleSpacingArrow(this.spacingCtx(), e, handleMode, nodeId)
        return
      }
      if (nodeId && isInAbsoluteContainer(this.positionCtx(), nodeId)) {
        e.preventDefault()
        handleArrowMove(this.positionCtx(), e, nodeId)
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

    // Escape = Exit spacing mode → Clear multi-selection → Navigate to parent
    if (e.key === 'Escape') {
      // First: exit spacing mode (P/M/G handles active) — toggle off via the
      // existing handler, which switches back to resize and hides handles.
      const currentMode = state.get().handleMode
      const currentSelection = state.get().selection?.nodeId
      if (currentSelection && currentMode !== 'resize') {
        e.preventDefault()
        const toggleEvent =
          currentMode === 'padding'
            ? 'handles:toggle-padding'
            : currentMode === 'margin'
              ? 'handles:toggle-margin'
              : 'handles:toggle-gap'
        events.emit(toggleEvent, { nodeId: currentSelection })
        return
      }

      const multiSelection = state.get().multiSelection
      if (multiSelection.length > 0) {
        // Second: clear multi-selection
        e.preventDefault()
        actions.clearMultiSelection()
        return
      }

      // Third: navigate to parent element
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
    const node = state.get().sourceMap?.getNodeById(nodeId)
    if (!node) return
    actions.setSelection(node.parentId ?? null, 'keyboard')
    if (node.parentId)
      events.emit('notification:info', { message: 'Selected parent element', duration: 1500 })
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
   * Build the position-arrow context bag. Carries the things the
   * extracted module needs (container ref, node-id attribute name,
   * command-context accessor) without exposing the rest of the class.
   */
  private positionCtx(): PositionArrowContext {
    return {
      container: this.container,
      nodeIdAttribute: this.nodeIdAttribute,
      getCommandContext: this.getCommandContext,
    }
  }

  /** Same idea for the spacing module. */
  private spacingCtx(): { container: HTMLElement; nodeIdAttribute: string } {
    return { container: this.container, nodeIdAttribute: this.nodeIdAttribute }
  }

  /**
   * Map T/R/I keys to the component to insert and its default text content.
   * R = Rectangle (= Frame in Mirror's schema; designer-friendly key choice
   * to avoid colliding with F = Set full dimension).
   */
  private getInsertSpec(key: string): { component: string; textContent?: string } {
    switch (key) {
      case 't':
        return { component: 'Text', textContent: 'Text' }
      case 'r':
        return { component: 'Frame' }
      case 'i':
        return { component: 'Icon', textContent: 'circle' }
      default:
        return { component: 'Frame' }
    }
  }

  /**
   * Insert a new element as the last child of `parentId` and select it after
   * the recompile completes. Selection works by diffing the parent's child
   * list before vs. after — the new child is the one that wasn't there
   * before.
   */
  private handleInsertChild(parentId: string, component: string, textContent?: string): void {
    const sourceMap = state.get().sourceMap
    if (!sourceMap) {
      events.emit('notification:warning', { message: 'No source map available' })
      return
    }

    const beforeIds = new Set(sourceMap.getChildren(parentId).map(c => c.nodeId))

    // Set up selection of the newly inserted child after compile completes.
    const off = events.once('compile:completed', () => {
      const newSourceMap = state.get().sourceMap
      if (!newSourceMap) return
      const after = newSourceMap.getChildren(parentId)
      const newChild = after.find(c => !beforeIds.has(c.nodeId))
      if (newChild) {
        actions.setSelection(newChild.nodeId, 'keyboard')
      }
    })

    const result = executor.execute(
      new InsertComponentCommand({
        parentId,
        component,
        position: 'last',
        textContent,
      })
    )

    if (!result.success) {
      // Cancel the deferred selection if the insert failed.
      off()
      events.emit('notification:warning', {
        message: result.error || `Failed to insert ${component}`,
      })
      return
    }

    events.emit('notification:success', {
      message: `Inserted ${component}`,
      duration: 1500,
    })
  }

  /**
   * Notify success/failure for any ActionResult-returning shared-action.
   * `successDuration` is optional (some actions like delete don't auto-
   * dismiss). Replaces 7 near-identical private wrappers.
   */
  private notify(result: ActionResult, successDuration?: number): void {
    if (result.success) {
      events.emit('notification:success', {
        message: result.message!,
        ...(successDuration !== undefined && { duration: successDuration }),
      })
    } else {
      events.emit('notification:warning', { message: result.error! })
    }
  }

  private handleGroup(): void {
    this.notify(executeGroup(this.container))
  }
  private handleUngroup(): void {
    this.notify(executeUngroup())
  }
  private handleDelete(): void {
    this.notify(executeDelete())
  }
  private handleDuplicate(): void {
    this.notify(executeDuplicate())
  }
  private handleSetLayoutDirection(direction: 'horizontal' | 'vertical'): void {
    this.notify(executeSetLayoutDirection(direction), 1500)
  }

  private handleWrapWithLayout(direction: 'hor' | 'ver'): void {
    this.notify(executeWrapWithLayout(this.container, direction), 1500)
  }
  private handleSetFullDimension(): void {
    this.notify(executeSetFullDimension(this.container), 1500)
  }
  private handleToggleSpread(): void {
    this.notify(executeToggleSpread(), 1500)
  }

  dispose(): void {
    this.detach()
  }
}

export function createKeyboardHandler(config: KeyboardHandlerConfig): KeyboardHandler {
  return new KeyboardHandler(config)
}

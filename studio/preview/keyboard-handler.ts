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
  getLayoutService,
  handleSnapSettings,
  SetPositionCommand,
  SetPropertyCommand,
  InsertComponentCommand,
  type CommandContext,
  type HandleMode,
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
} from './shared-actions'
import { isAbsoluteLayoutContainer } from '../code-modifier/utils/layout-detection'
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
  private unsubscribeHandleMode: (() => void) | null = null

  constructor(config: KeyboardHandlerConfig) {
    this.container = config.container
    this.boundHandleKeyDown = this.handleKeyDown.bind(this)
    this.getCommandContext = config.getCommandContext || (() => null)
    this.nodeIdAttribute = config.nodeIdAttribute || 'data-mirror-id'
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
    if (this.isArrowKey(e.key)) {
      const nodeId = state.get().selection?.nodeId
      if (nodeId && isSpacingMode) {
        e.preventDefault()
        this.handleSpacingArrow(e, handleMode, nodeId)
        return
      }
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
   * Handle arrow-key in spacing mode (P/M/G handles active). Plain ↑/↓ adjusts
   * all sides; Option+arrow targets a single side; Shift inverts the sign on
   * Option-variants.
   *
   * The arrow direction *is* the side: Option+↑ = top, Option+↓ = bottom,
   * Option+← = left, Option+→ = right. Without Option, ↑ = increase all,
   * ↓ = decrease all.
   *
   * Step size comes from `handleSnapSettings.gridSize` — same source the
   * visual handles use, so mouse-drag and keyboard land on the same grid.
   */
  private handleSpacingArrow(e: KeyboardEvent, mode: HandleMode, nodeId: string): void {
    if (mode !== 'padding' && mode !== 'margin' && mode !== 'gap') return

    const gridSize = handleSnapSettings.get().gridSize
    if (gridSize <= 0) return

    const useSide = e.altKey
    const isVerticalKey = e.key === 'ArrowUp' || e.key === 'ArrowDown'
    const isHorizontalKey = e.key === 'ArrowLeft' || e.key === 'ArrowRight'

    // Gap has no sides — only plain ↑/↓ is meaningful.
    if (mode === 'gap' && (useSide || isHorizontalKey)) {
      return
    }

    // Determine direction (+1 / -1) and target side.
    let direction: 1 | -1
    let side: 'top' | 'right' | 'bottom' | 'left' | null

    if (useSide) {
      // Option+arrow: arrow direction selects the side. Shift inverts sign.
      direction = e.shiftKey ? -1 : 1
      switch (e.key) {
        case 'ArrowUp':
          side = 'top'
          break
        case 'ArrowDown':
          side = 'bottom'
          break
        case 'ArrowLeft':
          side = 'left'
          break
        case 'ArrowRight':
          side = 'right'
          break
        default:
          return
      }
    } else {
      // Plain ↑/↓: all sides ± step. Horizontal keys are ignored without Option.
      if (!isVerticalKey) return
      direction = e.key === 'ArrowUp' ? 1 : -1
      side = null
    }

    const property = this.getSpacingProperty(mode, side)
    const current = this.getCurrentSpacingValue(nodeId, mode, side)
    if (current === null) return

    const next = this.computeNextSnapValue(current, direction, gridSize)
    if (next === current) return

    // Session coalescing: many arrow presses in one mode collapse to one
    // undo entry. Begin lazily on the first press; end is triggered by the
    // handleMode:changed listener in attach() when the user leaves the mode.
    if (!executor.isInSession()) {
      executor.beginSession(`Adjust ${mode} via keyboard`)
    }
    executor.executeInSession(
      new SetPropertyCommand({
        nodeId,
        property,
        value: String(next),
      })
    )
    events.emit('selection:refresh', { nodeId })
  }

  /**
   * Map (mode, side) to the Mirror property name that SetPropertyCommand
   * expects. side=null means "all sides" (or just `gap` for gap mode).
   */
  private getSpacingProperty(
    mode: 'padding' | 'margin' | 'gap',
    side: 'top' | 'right' | 'bottom' | 'left' | null
  ): string {
    if (mode === 'gap') return 'gap'
    const prefix = mode === 'padding' ? 'pad' : 'mar'
    if (side === null) return prefix
    const sideMap: Record<'top' | 'right' | 'bottom' | 'left', string> = {
      top: '-t',
      right: '-r',
      bottom: '-b',
      left: '-l',
    }
    return `${prefix}${sideMap[side]}`
  }

  /**
   * Read the current spacing value (in pixels) from the rendered element's
   * computed style. For "all sides" mode we use the top side as a
   * representative — this matches what the visual "all" handle does on drag.
   */
  private getCurrentSpacingValue(
    nodeId: string,
    mode: 'padding' | 'margin' | 'gap',
    side: 'top' | 'right' | 'bottom' | 'left' | null
  ): number | null {
    const el = this.container.querySelector(
      `[${this.nodeIdAttribute}="${nodeId}"]`
    ) as HTMLElement | null
    if (!el) return null

    const style = window.getComputedStyle(el)
    if (mode === 'gap') {
      return parseInt(style.gap || '0', 10) || 0
    }

    const sideForRead = side ?? 'top'
    if (mode === 'padding') {
      switch (sideForRead) {
        case 'top':
          return parseInt(style.paddingTop || '0', 10) || 0
        case 'right':
          return parseInt(style.paddingRight || '0', 10) || 0
        case 'bottom':
          return parseInt(style.paddingBottom || '0', 10) || 0
        case 'left':
          return parseInt(style.paddingLeft || '0', 10) || 0
      }
    } else {
      switch (sideForRead) {
        case 'top':
          return parseInt(style.marginTop || '0', 10) || 0
        case 'right':
          return parseInt(style.marginRight || '0', 10) || 0
        case 'bottom':
          return parseInt(style.marginBottom || '0', 10) || 0
        case 'left':
          return parseInt(style.marginLeft || '0', 10) || 0
      }
    }
    return null
  }

  /**
   * Compute the next snap value in the given direction.
   * - On-grid value: just step ± gridSize
   * - Off-grid value: snap to next/prev grid multiple (the first press
   *   "rescues" off-grid values back onto the grid, then subsequent presses
   *   step normally)
   * Negative results are clamped to 0.
   */
  private computeNextSnapValue(current: number, direction: 1 | -1, gridSize: number): number {
    if (current % gridSize === 0) {
      return Math.max(0, current + direction * gridSize)
    }
    if (direction > 0) {
      return Math.ceil(current / gridSize) * gridSize
    }
    return Math.max(0, Math.floor(current / gridSize) * gridSize)
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

  private handleSetLayoutDirection(direction: 'horizontal' | 'vertical'): void {
    const result = executeSetLayoutDirection(direction)

    if (result.success) {
      events.emit('notification:success', { message: result.message!, duration: 1500 })
    } else {
      events.emit('notification:warning', { message: result.error! })
    }
  }

  private handleWrapWithLayout(direction: 'hor' | 'ver'): void {
    const result = executeWrapWithLayout(this.container, direction)

    if (result.success) {
      events.emit('notification:success', { message: result.message!, duration: 1500 })
    } else {
      events.emit('notification:warning', { message: result.error! })
    }
  }

  private handleSetFullDimension(): void {
    const result = executeSetFullDimension(this.container)

    if (result.success) {
      events.emit('notification:success', { message: result.message!, duration: 1500 })
    } else {
      events.emit('notification:warning', { message: result.error! })
    }
  }

  private handleToggleSpread(): void {
    const result = executeToggleSpread()

    if (result.success) {
      events.emit('notification:success', { message: result.message!, duration: 1500 })
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

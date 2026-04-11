/**
 * TriggerController (Hexagonal Architecture)
 *
 * Port-based trigger controller for testability.
 * No direct CodeMirror or DOM dependencies.
 *
 * Architecture:
 * ```
 * TriggerController
 *    ├── checkTriggers() - Detect and activate triggers
 *    ├── handleKeyboard() - Keyboard navigation/confirmation
 *    ├── selectCurrent() - Confirm selection
 *    ├── cancel() - Cancel trigger
 *    └── Uses ports for all external operations
 * ```
 */

import type {
  TriggerPorts,
  TriggerRegistry,
  TriggerActivationResult,
  TriggerSelectionResult,
  TriggerCancellationResult,
  CleanupFn,
  LineInfo,
} from './ports'
import type {
  TriggerConfig,
  TriggerContext,
  CharTrigger,
  ComponentTrigger,
  RegexTrigger,
  DoubleClickTrigger,
  KeyboardConfig,
} from './types'

// ============================================
// Controller Configuration
// ============================================

export interface TriggerControllerConfig {
  /** Ports for external dependencies */
  ports: TriggerPorts
  /** Registry of trigger configurations */
  registry: TriggerRegistry
  /** Default keyboard config */
  defaultKeyboardConfig?: KeyboardConfig
}

// ============================================
// TriggerController
// ============================================

export class TriggerController {
  private readonly ports: TriggerPorts
  private readonly registry: TriggerRegistry
  private readonly defaultKeyboardConfig: KeyboardConfig
  private cleanupFns: CleanupFn[] = []
  private disposed = false

  constructor(config: TriggerControllerConfig) {
    this.ports = config.ports
    this.registry = config.registry
    this.defaultKeyboardConfig = config.defaultKeyboardConfig ?? {
      orientation: 'vertical',
    }

    this.setupEventHandlers()
  }

  // ============================================
  // Event Handlers
  // ============================================

  private setupEventHandlers(): void {
    // Listen for external picker close events
    const cleanupPickerClosed = this.ports.events.onPickerClosed(() => {
      this.handleExternalPickerClose()
    })
    this.cleanupFns.push(cleanupPickerClosed)

    // Listen for picker selection
    const cleanupSelect = this.ports.picker.onSelect((value) => {
      this.handlePickerSelect(value)
    })
    this.cleanupFns.push(cleanupSelect)

    // Listen for picker close
    const cleanupClose = this.ports.picker.onClose(() => {
      this.deactivate()
    })
    this.cleanupFns.push(cleanupClose)
  }

  private handleExternalPickerClose(): void {
    if (this.ports.state.isActive()) {
      this.deactivate()
    }
  }

  private handlePickerSelect(value: string): void {
    const triggerId = this.ports.state.getActiveTriggerId()
    const context = this.ports.state.getActiveContext()

    if (triggerId && context) {
      const config = this.registry.get(triggerId)
      if (config) {
        this.applySelection(value, config, context)
      }
    }

    this.deactivate()
  }

  // ============================================
  // Trigger Detection
  // ============================================

  /**
   * Check for triggers based on inserted text
   */
  checkTriggers(insertedText: string): TriggerActivationResult {
    if (this.disposed) {
      return { activated: false, error: 'Controller disposed' }
    }

    // If already active, handle live filter instead
    if (this.ports.state.isActive()) {
      this.handleActiveInput(insertedText)
      return { activated: false }
    }

    const line = this.ports.editor.getCurrentLine()
    const cursor = this.ports.editor.getCursorPosition()
    const textBefore = this.ports.editor.getTextBeforeCursor()

    // Check triggers in priority order
    const triggers = this.registry.getAll()

    for (const config of triggers) {
      const result = this.checkTrigger(config, insertedText, line, textBefore, cursor.offset)
      if (result.activated) {
        return result
      }
    }

    return { activated: false }
  }

  private checkTrigger(
    config: TriggerConfig,
    insertedText: string,
    line: LineInfo,
    textBefore: string,
    cursorOffset: number
  ): TriggerActivationResult {
    const trigger = config.trigger

    switch (trigger.type) {
      case 'char':
        return this.checkCharTrigger(config, trigger, insertedText, line, textBefore, cursorOffset)

      case 'component':
        return this.checkComponentTrigger(config, trigger, insertedText, line, textBefore, cursorOffset)

      case 'regex':
        return this.checkRegexTrigger(config, trigger, line, cursorOffset)

      default:
        return { activated: false }
    }
  }

  private checkCharTrigger(
    config: TriggerConfig,
    trigger: CharTrigger,
    insertedText: string,
    line: LineInfo,
    textBefore: string,
    cursorOffset: number
  ): TriggerActivationResult {
    // Check if inserted text matches trigger char
    if (insertedText !== trigger.char) {
      return { activated: false }
    }

    // Check context pattern if provided
    if (trigger.contextPattern) {
      // Text before the trigger char (exclude the char itself)
      const textBeforeTrigger = textBefore.slice(0, -1)
      if (!trigger.contextPattern.test(textBeforeTrigger)) {
        return { activated: false }
      }
    }

    // Check detection port
    const detection = this.ports.detection.checkCharTrigger(
      trigger.char,
      textBefore,
      line
    )

    if (!detection.matches) {
      return { activated: false }
    }

    // Build context
    const context = this.ports.detection.buildContext(cursorOffset, line, {
      startPos: cursorOffset,
      property: detection.property,
    })

    // Check custom shouldActivate
    if (config.shouldActivate) {
      // For port-based version, we pass a simplified check
      const shouldActivate = this.evaluateShouldActivate(config, insertedText, context)
      if (!shouldActivate) {
        return { activated: false }
      }
    }

    // Activate!
    return this.activate(config.id, context)
  }

  private checkComponentTrigger(
    config: TriggerConfig,
    trigger: ComponentTrigger,
    insertedText: string,
    line: LineInfo,
    textBefore: string,
    cursorOffset: number
  ): TriggerActivationResult {
    // Check if trigger char matches
    const triggerChar = trigger.triggerChar ?? ' '
    if (insertedText !== triggerChar) {
      return { activated: false }
    }

    // Text before the trigger char
    const textBeforeTrigger = textBefore.slice(0, -1)

    // Check detection port
    const detection = this.ports.detection.checkComponentTrigger(
      textBeforeTrigger,
      trigger.names,
      trigger.pattern
    )

    if (!detection.matches) {
      return { activated: false }
    }

    // Build context
    const context = this.ports.detection.buildContext(cursorOffset, line, {
      startPos: cursorOffset,
      componentName: detection.componentName,
    })

    // Activate!
    return this.activate(config.id, context)
  }

  private checkRegexTrigger(
    config: TriggerConfig,
    trigger: RegexTrigger,
    line: LineInfo,
    cursorOffset: number
  ): TriggerActivationResult {
    const detection = this.ports.detection.checkRegexTrigger(line, trigger.pattern)

    if (!detection.matches) {
      return { activated: false }
    }

    // Build context
    const context = this.ports.detection.buildContext(cursorOffset, line, {
      startPos: cursorOffset,
    })

    // Activate!
    return this.activate(config.id, context)
  }

  /**
   * Check for double-click triggers
   */
  checkDoubleClick(clickOffset: number): TriggerActivationResult {
    if (this.disposed) {
      return { activated: false, error: 'Controller disposed' }
    }

    const line = this.ports.editor.getCurrentLine()
    const triggers = this.registry.getByType('doubleClick')

    for (const config of triggers) {
      const trigger = config.trigger as DoubleClickTrigger

      const detection = this.ports.detection.checkDoubleClickTrigger(
        line,
        trigger.pattern,
        clickOffset
      )

      if (detection.matches) {
        const context = this.ports.detection.buildContext(clickOffset, line, {
          startPos: detection.replaceRange?.from ?? clickOffset,
          existingValue: detection.existingValue,
          replaceRange: detection.replaceRange,
        })

        return this.activate(config.id, context)
      }
    }

    return { activated: false }
  }

  private evaluateShouldActivate(
    config: TriggerConfig,
    insertedText: string,
    context: TriggerContext
  ): boolean {
    // In port-based version, shouldActivate is evaluated with context only
    // The ViewUpdate dependency is abstracted away
    return true
  }

  // ============================================
  // Activation
  // ============================================

  private activate(
    triggerId: string,
    context: TriggerContext
  ): TriggerActivationResult {
    // Get screen position for picker
    const screenPos = this.ports.editor.getCursorScreenPosition()

    // Update state
    this.ports.state.activate(triggerId, context.startPos, context)

    // Show picker
    this.ports.picker.show(screenPos.x, screenPos.y)

    // Emit event
    this.ports.events.emitActivated(triggerId, context)

    return { activated: true, triggerId }
  }

  private deactivate(): void {
    const triggerId = this.ports.state.getActiveTriggerId()

    // Hide picker
    this.ports.picker.hide()

    // Update state
    this.ports.state.deactivate()

    // Emit event
    if (triggerId) {
      this.ports.events.emitDeactivated(triggerId)
    }

    // Focus editor
    this.ports.editor.focus()
  }

  // ============================================
  // Active Input Handling
  // ============================================

  private handleActiveInput(insertedText: string): void {
    const triggerId = this.ports.state.getActiveTriggerId()
    const context = this.ports.state.getActiveContext()

    if (!triggerId || !context) {
      return
    }

    const config = this.registry.get(triggerId)
    if (!config) {
      return
    }

    // Check close characters
    if (config.closeOnChars?.includes(insertedText)) {
      this.deactivate()
      return
    }

    // Check custom shouldClose
    if (config.shouldClose) {
      const shouldClose = this.evaluateShouldClose(config, insertedText, context)
      if (shouldClose) {
        this.deactivate()
        return
      }
    }

    // Live filter
    if (config.liveFilter) {
      const filterText = this.getFilterText(context)
      this.ports.picker.filter(filterText)
    }

    // Update context with new cursor position
    const cursor = this.ports.editor.getCursorPosition()
    this.ports.state.updateContext({ cursorPos: cursor.offset })
  }

  private evaluateShouldClose(
    config: TriggerConfig,
    insertedText: string,
    context: TriggerContext
  ): boolean {
    // Default: check if inserted text is not an identifier character
    return !/[\w-]/.test(insertedText)
  }

  private getFilterText(context: TriggerContext): string {
    const cursor = this.ports.editor.getCursorPosition()
    const source = this.ports.editor.getSource()
    return source.slice(context.startPos, cursor.offset)
  }

  // ============================================
  // Keyboard Handling
  // ============================================

  /**
   * Handle keyboard events
   * Returns true if the event was handled
   */
  handleKeyboard(key: string): boolean {
    if (!this.ports.state.isActive()) {
      return false
    }

    switch (key) {
      case 'Enter':
        this.selectCurrent()
        return true

      case 'Escape':
        this.cancel()
        return true

      case 'ArrowUp':
        this.navigate('up')
        return true

      case 'ArrowDown':
        this.navigate('down')
        return true

      case 'ArrowLeft':
        return this.handleArrowLeft()

      case 'ArrowRight':
        return this.handleArrowRight()

      case 'Backspace':
        return this.handleBackspace()

      default:
        return false
    }
  }

  private handleArrowLeft(): boolean {
    const config = this.getActiveKeyboardConfig()
    if (config.orientation === 'grid') {
      this.navigate('left')
      return true
    }
    return false
  }

  private handleArrowRight(): boolean {
    const config = this.getActiveKeyboardConfig()
    if (config.orientation === 'grid') {
      this.navigate('right')
      return true
    }
    return false
  }

  private handleBackspace(): boolean {
    const context = this.ports.state.getActiveContext()
    if (!context) {
      return false
    }

    const cursor = this.ports.editor.getCursorPosition()

    // If cursor would move before trigger start, cancel
    if (cursor.offset <= context.startPos) {
      this.cancel()
      return true
    }

    return false
  }

  private navigate(direction: 'up' | 'down' | 'left' | 'right'): void {
    this.ports.picker.navigate(direction)
  }

  private getActiveKeyboardConfig(): KeyboardConfig {
    const triggerId = this.ports.state.getActiveTriggerId()
    if (triggerId) {
      const config = this.registry.get(triggerId)
      if (config?.keyboard) {
        return config.keyboard
      }
    }
    return this.ports.picker.getKeyboardConfig?.() ?? this.defaultKeyboardConfig
  }

  // ============================================
  // Selection
  // ============================================

  /**
   * Select the current picker value
   */
  selectCurrent(): TriggerSelectionResult {
    if (!this.ports.state.isActive()) {
      return { success: false, error: 'No active trigger' }
    }

    const value = this.ports.picker.getSelectedValue()
    if (!value) {
      return { success: false, error: 'No value selected' }
    }

    const triggerId = this.ports.state.getActiveTriggerId()
    const context = this.ports.state.getActiveContext()

    if (!triggerId || !context) {
      return { success: false, error: 'Invalid trigger state' }
    }

    const config = this.registry.get(triggerId)
    if (!config) {
      return { success: false, error: 'Trigger config not found' }
    }

    // Apply the selection
    this.applySelection(value, config, context)

    // Deactivate
    this.deactivate()

    return { success: true, value }
  }

  private applySelection(
    value: string,
    config: TriggerConfig,
    context: TriggerContext
  ): void {
    // Emit value selected event
    this.ports.events.emitValueSelected(config.id, value)

    // Determine insert range
    const from = context.replaceRange?.from ?? context.startPos
    const to = context.replaceRange?.to ?? this.ports.editor.getCursorPosition().offset

    // Insert the value
    this.ports.editor.insertText({
      from,
      to,
      text: value,
      annotation: `input.${config.id}`,
      moveCursorTo: 'end',
    })
  }

  // ============================================
  // Cancellation
  // ============================================

  /**
   * Cancel the current trigger
   */
  cancel(): TriggerCancellationResult {
    if (!this.ports.state.isActive()) {
      return { success: false, textRemoved: false }
    }

    const triggerId = this.ports.state.getActiveTriggerId()
    const context = this.ports.state.getActiveContext()
    const config = triggerId ? this.registry.get(triggerId) : null

    let textRemoved = false

    // For char triggers, optionally remove the typed text
    if (config && context && config.trigger.type === 'char') {
      const cursor = this.ports.editor.getCursorPosition()
      if (cursor.offset > context.startPos) {
        // Remove text typed after trigger
        this.ports.editor.deleteText(context.startPos, cursor.offset)
        textRemoved = true
      }
    }

    this.deactivate()

    return { success: true, textRemoved }
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Check if a trigger is currently active
   */
  isActive(): boolean {
    return this.ports.state.isActive()
  }

  /**
   * Get the active trigger ID
   */
  getActiveTriggerId(): string | null {
    return this.ports.state.getActiveTriggerId()
  }

  /**
   * Get the active trigger context
   */
  getActiveContext(): TriggerContext | null {
    return this.ports.state.getActiveContext()
  }

  /**
   * Filter the picker with text
   */
  filter(text: string): void {
    if (this.ports.state.isActive()) {
      this.ports.picker.filter(text)
    }
  }

  /**
   * Dispose the controller
   */
  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true

    // Deactivate if active
    if (this.ports.state.isActive()) {
      this.deactivate()
    }

    // Cleanup subscriptions
    for (const cleanup of this.cleanupFns) {
      cleanup()
    }
    this.cleanupFns = []
  }
}

// ============================================
// Factory Function
// ============================================

export function createTriggerController(
  config: TriggerControllerConfig
): TriggerController {
  return new TriggerController(config)
}

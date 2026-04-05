/**
 * Editor Trigger Manager
 *
 * Unified system for managing all editor triggers (icon, token, color, animation).
 * Replaces individual trigger extensions with a single, configurable manager.
 */

import { EditorView, ViewUpdate } from '@codemirror/view'
import { Prec, Transaction } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import type { BasePicker } from '../pickers'
import type {
  TriggerConfig,
  TriggerState,
  TriggerContext,
  TriggerDefinition,
  CharTrigger,
  RegexTrigger,
  ComponentTrigger,
  DoubleClickTrigger,
  ComponentPrimitivesMap,
} from './triggers/types'

// ============================================
// Default State
// ============================================

const createDefaultState = (): TriggerState => ({
  isOpen: false,
  startPos: null,
  picker: null,
  context: null,
  triggerId: null,
})

// ============================================
// EditorTriggerManager Class
// ============================================

export class EditorTriggerManager {
  private triggers: Map<string, TriggerConfig> = new Map()
  private state: TriggerState = createDefaultState()
  private componentPrimitives: ComponentPrimitivesMap = new Map()
  private clickOutsideHandler: ((e: MouseEvent) => void) | null = null
  private clickOutsideTimeoutId: ReturnType<typeof setTimeout> | null = null

  /**
   * Register a trigger configuration
   */
  register(config: TriggerConfig): void {
    if (this.triggers.has(config.id)) {
      console.warn(`[TriggerManager] Trigger "${config.id}" already registered, overwriting.`)
    }
    this.triggers.set(config.id, config)
  }

  /**
   * Unregister a trigger
   */
  unregister(id: string): void {
    this.triggers.delete(id)
  }

  /**
   * Get a registered trigger config
   */
  getTrigger(id: string): TriggerConfig | undefined {
    return this.triggers.get(id)
  }

  /**
   * Set component primitives map (for component-based triggers)
   */
  setComponentPrimitives(primitives: ComponentPrimitivesMap): void {
    this.componentPrimitives = primitives
  }

  /**
   * Get component primitives map
   */
  getComponentPrimitives(): ComponentPrimitivesMap {
    return this.componentPrimitives
  }

  /**
   * Check if any trigger is currently active
   */
  isOpen(): boolean {
    return this.state.isOpen
  }

  /**
   * Get the ID of the currently active trigger
   */
  getActiveTrigger(): string | null {
    return this.state.triggerId
  }

  /**
   * Get the current trigger state
   */
  getState(): TriggerState {
    return { ...this.state }
  }

  /**
   * Create all CodeMirror extensions for registered triggers
   */
  createExtensions(): Extension[] {
    const extensions: Extension[] = []

    // Document change listener (for char/regex/component triggers)
    extensions.push(this.createUpdateListener())

    // Keyboard handler (highest priority)
    extensions.push(Prec.highest(this.createKeyboardHandler()))

    // Double-click handler
    extensions.push(this.createDoubleClickHandler())

    return extensions
  }

  /**
   * Show a picker manually
   */
  showPicker(
    triggerId: string,
    x: number,
    y: number,
    startPos: number,
    view: EditorView,
    context?: Partial<TriggerContext>
  ): void {
    const config = this.triggers.get(triggerId)
    if (!config) {
      console.warn(`[TriggerManager] Unknown trigger: ${triggerId}`)
      return
    }

    if (this.state.isOpen) {
      this.hidePicker()
    }

    // Create context
    // Note: spread context first so explicit values can override it
    const line = view.state.doc.lineAt(startPos)
    const fullContext: TriggerContext = {
      ...context,
      startPos,
      cursorPos: view.state.selection.main.head,
      line: {
        number: line.number,
        from: line.from,
        to: line.to,
        text: line.text,
      },
      textBefore: line.text.slice(0, startPos - line.from),
      textAfter: line.text.slice(startPos - line.from),
    }

    // Get or create picker
    const picker = typeof config.picker === 'function' ? config.picker() : config.picker

    // Update state
    this.state = {
      isOpen: true,
      startPos,
      picker,
      context: fullContext,
      triggerId,
    }

    // Show picker at position
    if ('showAt' in picker && typeof picker.showAt === 'function') {
      picker.showAt(x, y)
    } else if ('show' in picker) {
      // Create temporary anchor for positioning
      const anchor = document.createElement('div')
      anchor.style.position = 'absolute'
      anchor.style.left = `${x}px`
      anchor.style.top = `${y}px`
      document.body.appendChild(anchor)
      picker.show(anchor)
      anchor.remove()
    }

    // Setup click outside handler
    this.setupClickOutside()
  }

  /**
   * Hide the currently active picker
   */
  hidePicker(): void {
    if (!this.state.isOpen || !this.state.picker) return

    // hide() is optional on MinimalPicker
    if ('hide' in this.state.picker && typeof this.state.picker.hide === 'function') {
      this.state.picker.hide()
    }
    this.state = createDefaultState()
    this.teardownClickOutside()
  }

  /**
   * Filter the current picker (for live filtering)
   */
  filterPicker(text: string): void {
    if (!this.state.isOpen || !this.state.picker) return

    const picker = this.state.picker
    if ('filter' in picker && typeof picker.filter === 'function') {
      picker.filter(text)
    } else if ('search' in picker && typeof picker.search === 'function') {
      picker.search(text)
    }
  }

  /**
   * Navigate the picker selection
   */
  navigatePicker(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (!this.state.isOpen || !this.state.picker) return

    const picker = this.state.picker
    if ('navigate' in picker && typeof picker.navigate === 'function') {
      picker.navigate(direction)
    }
  }

  /**
   * Select the current picker item
   */
  selectCurrent(view: EditorView): void {
    if (!this.state.isOpen || !this.state.picker || !this.state.context) return

    const config = this.triggers.get(this.state.triggerId!)
    if (!config) return

    const picker = this.state.picker
    let selectedValue: string | undefined

    // Try to get selected value from different picker APIs
    if ('getSelectedValue' in picker && typeof picker.getSelectedValue === 'function') {
      selectedValue = picker.getSelectedValue() ?? undefined
    } else if ('getValue' in picker && typeof picker.getValue === 'function') {
      selectedValue = picker.getValue()
    } else if ('getSelectedIndex' in picker && 'getFilteredIcons' in picker) {
      // Icon picker specific
      const index = (picker as any).getSelectedIndex()
      const items = (picker as any).getFilteredIcons()
      if (items[index]) {
        selectedValue = items[index].name
        if ('addToRecent' in picker) {
          (picker as any).addToRecent(selectedValue)
        }
      }
    }

    try {
      if (selectedValue !== undefined) {
        config.onSelect(selectedValue, this.state.context, view)
      }
    } catch (error) {
      console.error('[TriggerManager] Error in onSelect callback:', error)
    } finally {
      this.hidePicker()
      view.focus()
    }
  }

  /**
   * Cancel the current trigger (escape)
   */
  cancelTrigger(view: EditorView, removeTypedText: boolean = false): void {
    if (!this.state.isOpen || !this.state.context) return

    if (removeTypedText && this.state.startPos !== null) {
      const cursorPos = view.state.selection.main.head
      if (cursorPos > this.state.startPos) {
        view.dispatch({
          changes: { from: this.state.startPos, to: cursorPos, insert: '' },
          selection: { anchor: this.state.startPos },
        })
      }
    }

    this.hidePicker()
    view.focus()
  }

  /**
   * Insert a value at the trigger position
   */
  insertValue(
    value: string,
    view: EditorView,
    options: { quoted?: boolean; replaceRange?: { from: number; to: number } } = {}
  ): void {
    if (!this.state.context) return

    const { quoted = false, replaceRange } = options
    const insertText = quoted ? `"${value}"` : value

    let from: number
    let to: number

    if (replaceRange) {
      from = replaceRange.from
      to = replaceRange.to
    } else if (this.state.context.replaceRange) {
      from = this.state.context.replaceRange.from
      to = this.state.context.replaceRange.to
    } else {
      from = this.state.startPos ?? this.state.context.startPos
      to = view.state.selection.main.head
    }

    view.dispatch({
      changes: { from, to, insert: insertText },
      selection: { anchor: from + insertText.length },
      annotations: Transaction.userEvent.of('input.picker'),
    })

    this.hidePicker()
    view.focus()
  }

  // ============================================
  // Extension Factories
  // ============================================

  private createUpdateListener(): Extension {
    return EditorView.updateListener.of((update: ViewUpdate) => {
      if (!update.docChanged) return

      update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        const insertedText = inserted.toString()
        const view = update.view

        // Handle live filtering when a trigger is active
        if (this.state.isOpen && this.state.startPos !== null) {
          const config = this.triggers.get(this.state.triggerId!)
          if (config?.liveFilter) {
            this.handleLiveFilter(update, insertedText, fromA, toA, fromB, toB)
            return
          }

          // Check for close characters
          if (config?.closeOnChars?.includes(insertedText)) {
            this.hidePicker()
            return
          }
        }

        // Check for new triggers
        if (insertedText.length > 0 && !this.state.isOpen) {
          this.checkTriggers(update, insertedText, fromB, toB)
        }
      })
    })
  }

  private createKeyboardHandler(): Extension {
    return EditorView.domEventHandlers({
      keydown: (event: KeyboardEvent, view: EditorView) => {
        if (!this.state.isOpen) return false

        const config = this.triggers.get(this.state.triggerId!)
        const keyboard = config?.keyboard ?? { orientation: 'vertical' }

        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault()
            this.navigatePicker('down')
            return true

          case 'ArrowUp':
            event.preventDefault()
            this.navigatePicker('up')
            return true

          case 'ArrowRight':
            if (keyboard.orientation === 'grid') {
              event.preventDefault()
              this.navigatePicker('right')
              return true
            }
            return false

          case 'ArrowLeft':
            if (keyboard.orientation === 'grid') {
              event.preventDefault()
              this.navigatePicker('left')
              return true
            }
            return false

          case 'Enter':
            event.preventDefault()
            this.selectCurrent(view)
            return true

          case 'Escape':
            event.preventDefault()
            // Remove typed text for char triggers
            const trigger = config?.trigger
            const removeText = trigger?.type === 'char'
            this.cancelTrigger(view, removeText)
            return true

          case 'Backspace': {
            // Check if we should close (backspace past start)
            const cursorPos = view.state.selection.main.head
            if (this.state.startPos !== null && cursorPos <= this.state.startPos) {
              this.hidePicker()
            }
            return false // Let editor handle the backspace
          }
        }

        return false
      },
    })
  }

  private createDoubleClickHandler(): Extension {
    return EditorView.domEventHandlers({
      dblclick: (event: MouseEvent, view: EditorView) => {
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
        if (pos === null) return false

        // Check all double-click triggers
        for (const [id, config] of this.triggers) {
          if (config.trigger.type !== 'doubleClick') continue

          const trigger = config.trigger as DoubleClickTrigger
          const line = view.state.doc.lineAt(pos)
          const lineText = line.text

          // Find matches in the line
          const regex = new RegExp(trigger.pattern.source, trigger.pattern.flags + 'g')
          let match: RegExpExecArray | null
          while ((match = regex.exec(lineText)) !== null) {
            const matchStart = line.from + match.index
            const matchEnd = matchStart + match[0].length

            if (pos >= matchStart && pos <= matchEnd) {
              const coords = view.coordsAtPos(matchStart)
              if (coords) {
                event.preventDefault()
                this.showPicker(id, coords.left, coords.bottom + 4, matchStart, view, {
                  existingValue: match[0],
                  replaceRange: { from: matchStart, to: matchEnd },
                })
                return true
              }
            }
          }
        }

        return false
      },
    })
  }

  // ============================================
  // Trigger Detection
  // ============================================

  private checkTriggers(update: ViewUpdate, insertedText: string, fromB: number, toB: number): void {
    const view = update.view
    const line = view.state.doc.lineAt(fromB)
    const textBefore = line.text.slice(0, fromB - line.from)

    // Sort triggers by priority
    const sortedTriggers = [...this.triggers.entries()].sort(
      (a, b) => (b[1].priority ?? 0) - (a[1].priority ?? 0)
    )

    for (const [id, config] of sortedTriggers) {
      const trigger = config.trigger

      // Build context for custom handlers
      const context: TriggerContext = {
        startPos: toB,
        cursorPos: view.state.selection.main.head,
        line: { number: line.number, from: line.from, to: line.to, text: line.text },
        textBefore,
        textAfter: line.text.slice(toB - line.from),
      }

      // Check custom shouldActivate handler
      if (config.shouldActivate && !config.shouldActivate(update, insertedText, context)) {
        continue
      }

      let shouldTrigger = false

      switch (trigger.type) {
        case 'char':
          shouldTrigger = this.checkCharTrigger(trigger, insertedText, textBefore)
          if (shouldTrigger) {
            context.property = this.extractPropertyFromContext(textBefore, trigger.contextPattern)
          }
          break

        case 'regex':
          shouldTrigger = this.checkRegexTrigger(trigger, textBefore + insertedText)
          break

        case 'component':
          shouldTrigger = this.checkComponentTrigger(trigger, insertedText, textBefore)
          if (shouldTrigger) {
            context.componentName = this.extractComponentName(textBefore)
          }
          break

        case 'doubleClick':
          // Double-click triggers are handled separately
          continue
      }

      if (shouldTrigger) {
        const coords = view.coordsAtPos(fromB)
        if (coords) {
          // Determine start position based on trigger type
          let startPos = toB
          if (trigger.type === 'char') {
            startPos = fromB // Position of the trigger character
          }

          this.showPicker(id, coords.left, coords.bottom + 4, startPos, view, context)
          return
        }
      }
    }
  }

  private checkCharTrigger(trigger: CharTrigger, insertedText: string, textBefore: string): boolean {
    if (insertedText !== trigger.char) return false

    if (trigger.contextPattern) {
      return trigger.contextPattern.test(textBefore)
    }

    return true
  }

  private checkRegexTrigger(trigger: RegexTrigger, text: string): boolean {
    return trigger.pattern.test(text)
  }

  private checkComponentTrigger(
    trigger: ComponentTrigger,
    insertedText: string,
    textBefore: string
  ): boolean {
    const triggerChar = trigger.triggerChar ?? ' '
    if (insertedText !== triggerChar) return false

    // Extract component name
    const match = textBefore.match(/\b([A-Z][a-zA-Z0-9]*)\s*$/)
    if (!match) return false

    const componentName = match[1]

    // Check explicit names
    if (trigger.names.includes(componentName)) return true

    // Check pattern
    if (trigger.pattern?.test(componentName)) return true

    // Check component primitives map
    const primitive = this.componentPrimitives.get(componentName)
    if (primitive && trigger.names.some(name => primitive === name.toLowerCase())) {
      return true
    }

    return false
  }

  private extractPropertyFromContext(textBefore: string, contextPattern?: RegExp): string | undefined {
    if (contextPattern) {
      const match = textBefore.match(contextPattern)
      return match?.[1]
    }

    // Default property extraction
    const propertyMatch = textBefore.match(
      /\b(bg|col|color|background|boc|border-color|hover-bg|hover-col|hover-boc|pad|padding|gap|margin|rad|radius)\s*$/
    )
    return propertyMatch?.[1]
  }

  private extractComponentName(textBefore: string): string | undefined {
    const match = textBefore.match(/\b([A-Z][a-zA-Z0-9]*)\s*$/)
    return match?.[1]
  }

  // ============================================
  // Live Filtering
  // ============================================

  private handleLiveFilter(
    update: ViewUpdate,
    insertedText: string,
    fromA: number,
    toA: number,
    fromB: number,
    toB: number
  ): void {
    if (!this.state.isOpen || this.state.startPos === null) return

    const config = this.triggers.get(this.state.triggerId!)
    if (!config) return

    // Handle deletion (backspace)
    if (insertedText.length === 0 && fromA !== toA) {
      if (toB <= this.state.startPos) {
        this.hidePicker()
        return
      }

      // Recalculate filter text
      const line = update.view.state.doc.lineAt(toB)
      const filterText = line.text.slice(this.state.startPos - line.from, toB - line.from)
      this.filterPicker(filterText)
      return
    }

    // Handle close chars
    if (config.closeOnChars?.includes(insertedText)) {
      this.hidePicker()
      return
    }

    // Check custom close handler
    if (this.state.context && config.shouldClose?.(update, insertedText, this.state.context)) {
      this.hidePicker()
      return
    }

    // Update filter
    const line = update.view.state.doc.lineAt(toB)
    const filterText = line.text.slice(this.state.startPos - line.from, toB - line.from)
    this.filterPicker(filterText)
  }

  // ============================================
  // Click Outside
  // ============================================

  private setupClickOutside(): void {
    if (this.clickOutsideHandler) return

    this.clickOutsideHandler = (e: MouseEvent) => {
      if (!this.state.isOpen || !this.state.picker) return

      // Get picker element from the picker instance
      const picker = this.state.picker
      let pickerElement: HTMLElement | null = null

      // Try different ways to get the picker element
      if ('getElement' in picker && typeof picker.getElement === 'function') {
        pickerElement = picker.getElement()
      }

      // Fallback: check if click target is inside any picker container
      if (!pickerElement) {
        const target = e.target as Node
        const closestPicker = (target as Element).closest?.(
          '.picker-container, .icon-picker, .token-picker, .color-picker, .animation-picker'
        )
        if (closestPicker) {
          // Click was inside a picker, don't close
          return
        }
        // Click was outside, close the picker
        this.hidePicker()
        return
      }

      if (!pickerElement.contains(e.target as Node)) {
        this.hidePicker()
      }
    }

    // Delay to prevent immediate close
    this.clickOutsideTimeoutId = setTimeout(() => {
      this.clickOutsideTimeoutId = null
      if (this.clickOutsideHandler) {
        document.addEventListener('mousedown', this.clickOutsideHandler)
      }
    }, 0)
  }

  private teardownClickOutside(): void {
    // Cancel pending timeout to prevent orphaned listeners
    if (this.clickOutsideTimeoutId !== null) {
      clearTimeout(this.clickOutsideTimeoutId)
      this.clickOutsideTimeoutId = null
    }
    if (this.clickOutsideHandler) {
      document.removeEventListener('mousedown', this.clickOutsideHandler)
      this.clickOutsideHandler = null
    }
  }

  /**
   * Dispose the trigger manager
   */
  dispose(): void {
    this.hidePicker()
    this.teardownClickOutside()
    this.triggers.clear()
    this.componentPrimitives.clear()
  }
}

// ============================================
// Singleton Instance
// ============================================

let globalTriggerManager: EditorTriggerManager | null = null

/**
 * Get the global trigger manager instance
 */
export function getTriggerManager(): EditorTriggerManager {
  if (!globalTriggerManager) {
    globalTriggerManager = new EditorTriggerManager()
  }
  return globalTriggerManager
}

/**
 * Set the global trigger manager instance
 */
export function setTriggerManager(manager: EditorTriggerManager): void {
  globalTriggerManager = manager
}

/**
 * Create a new trigger manager
 */
export function createTriggerManager(): EditorTriggerManager {
  return new EditorTriggerManager()
}

// Re-export types
export * from './triggers/types'

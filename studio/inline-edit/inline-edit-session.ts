/**
 * InlineEditSession - Manages a single inline text editing session
 *
 * Handles:
 * - Setting contentEditable on the element
 * - Focusing and selecting text
 * - Keyboard events (Enter to save, Escape to cancel)
 * - Click outside to save
 */

import type { InlineEditResult } from './types'

export interface InlineEditSessionConfig {
  /** Element to edit */
  element: HTMLElement
  /** Node ID of the element */
  nodeId: string
  /** Callback when session ends */
  onEnd: (result: InlineEditResult) => void
  /** Callback when text changes (for live updates) */
  onInput?: (text: string) => void
}

export class InlineEditSession {
  private element: HTMLElement
  private nodeId: string
  private originalText: string
  private onEnd: (result: InlineEditResult) => void
  private onInput?: (text: string) => void
  private isActive: boolean = false
  private isEnding: boolean = false // Prevent double-end

  // Bound handlers for cleanup
  private boundHandleKeyDown: (e: KeyboardEvent) => void
  private boundHandleInput: () => void
  private boundHandleClickOutside: (e: MouseEvent) => void
  private boundHandlePaste: (e: ClipboardEvent) => void

  constructor(config: InlineEditSessionConfig) {
    this.element = config.element
    this.nodeId = config.nodeId
    this.originalText = ''
    this.onEnd = config.onEnd
    this.onInput = config.onInput

    // Bind handlers
    this.boundHandleKeyDown = this.handleKeyDown.bind(this)
    this.boundHandleInput = this.handleInput.bind(this)
    this.boundHandleClickOutside = this.handleClickOutside.bind(this)
    this.boundHandlePaste = this.handlePaste.bind(this)
  }

  /**
   * Start the edit session
   */
  start(): void {
    if (this.isActive) return

    this.isActive = true
    this.isEnding = false

    // Store original text content (trimmed)
    this.originalText = this.element.textContent?.trim() || ''

    // Make element editable
    this.element.contentEditable = 'true'
    this.element.classList.add('inline-editing')

    // Prevent line breaks in single-line elements
    this.element.style.whiteSpace = 'pre'

    // Disable spellcheck for cleaner editing
    this.element.spellcheck = false

    // Add event listeners on element
    this.element.addEventListener('keydown', this.boundHandleKeyDown, { capture: true })
    this.element.addEventListener('input', this.boundHandleInput)
    this.element.addEventListener('paste', this.boundHandlePaste)

    // Prevent click events from propagating during edit
    this.element.addEventListener('click', this.stopPropagation, { capture: true })
    this.element.addEventListener('mousedown', this.stopPropagation, { capture: true })

    // Click outside listener (on document, delayed to avoid immediate trigger)
    setTimeout(() => {
      if (this.isActive) {
        document.addEventListener('mousedown', this.boundHandleClickOutside, { capture: true })
      }
    }, 100)

    // Focus and select all text (use setTimeout to ensure DOM is ready)
    setTimeout(() => {
      if (this.isActive) {
        this.element.focus()
        this.selectAllText()
      }
    }, 0)
  }

  /**
   * End the edit session
   */
  end(save: boolean): void {
    if (!this.isActive || this.isEnding) return

    this.isEnding = true
    this.isActive = false

    const newText = this.element.textContent?.trim() || ''

    // Remove event listeners first
    this.element.removeEventListener('keydown', this.boundHandleKeyDown, { capture: true })
    this.element.removeEventListener('input', this.boundHandleInput)
    this.element.removeEventListener('paste', this.boundHandlePaste)
    this.element.removeEventListener('click', this.stopPropagation, { capture: true })
    this.element.removeEventListener('mousedown', this.stopPropagation, { capture: true })
    document.removeEventListener('mousedown', this.boundHandleClickOutside, { capture: true })

    // Restore element state
    this.element.contentEditable = 'false'
    this.element.classList.remove('inline-editing')
    this.element.classList.remove('inline-editing-modified')
    this.element.style.whiteSpace = ''
    this.element.spellcheck = true

    // Restore original text if cancelled
    if (!save) {
      this.element.textContent = this.originalText
    }

    // Clear selection
    window.getSelection()?.removeAllRanges()

    // Blur the element
    this.element.blur()

    // Notify completion
    this.onEnd({
      nodeId: this.nodeId,
      originalText: this.originalText,
      newText: save ? newText : this.originalText,
      saved: save && newText !== this.originalText,
    })
  }

  /**
   * Check if session is active
   */
  isEditing(): boolean {
    return this.isActive
  }

  /**
   * Get the current text
   */
  getCurrentText(): string {
    return this.element.textContent?.trim() || ''
  }

  /**
   * Get the original text
   */
  getOriginalText(): string {
    return this.originalText
  }

  /**
   * Select all text in the element
   */
  private selectAllText(): void {
    const range = document.createRange()
    range.selectNodeContents(this.element)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown(e: KeyboardEvent): void {
    // Prevent event from bubbling to parent handlers
    e.stopPropagation()

    if (e.key === 'Enter') {
      // Enter = Save and exit (no multiline support for now)
      e.preventDefault()
      this.end(true)
    } else if (e.key === 'Escape') {
      // Escape = Cancel and restore original
      e.preventDefault()
      this.end(false)
    } else if (e.key === 'Tab') {
      // Tab = Save and exit (move to next element)
      e.preventDefault()
      this.end(true)
    }
  }

  /**
   * Handle click outside the element
   */
  private handleClickOutside(e: MouseEvent): void {
    const target = e.target as HTMLElement

    // Check if click is outside the editing element
    if (!this.element.contains(target) && this.isActive) {
      // Save on click outside
      this.end(true)
    }
  }

  /**
   * Handle paste - strip formatting
   */
  private handlePaste(e: ClipboardEvent): void {
    e.preventDefault()
    const text = e.clipboardData?.getData('text/plain') || ''
    // Insert plain text only, remove newlines
    const cleanText = text.replace(/[\r\n]+/g, ' ')
    document.execCommand('insertText', false, cleanText)
  }

  /**
   * Handle input changes
   */
  private handleInput(): void {
    this.element.classList.add('inline-editing-modified')
    // Notify of text change for live updates (e.g., resize handles)
    this.onInput?.(this.getCurrentText())
  }

  /**
   * Stop event propagation
   */
  private stopPropagation(e: Event): void {
    e.stopPropagation()
  }
}

/**
 * Create a new inline edit session
 */
export function createInlineEditSession(config: InlineEditSessionConfig): InlineEditSession {
  return new InlineEditSession(config)
}

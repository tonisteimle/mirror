/**
 * InlineEditSession - Manages a single inline text editing session
 *
 * Handles:
 * - Setting contentEditable on the element
 * - Focusing and selecting text
 * - Keyboard events (Enter to save, Escape to cancel)
 * - Blur to save
 */

import type { InlineEditResult } from './types'

export interface InlineEditSessionConfig {
  /** Element to edit */
  element: HTMLElement
  /** Node ID of the element */
  nodeId: string
  /** Callback when session ends */
  onEnd: (result: InlineEditResult) => void
}

export class InlineEditSession {
  private element: HTMLElement
  private nodeId: string
  private originalText: string
  private onEnd: (result: InlineEditResult) => void
  private isActive: boolean = false

  // Bound handlers for cleanup
  private boundHandleKeyDown: (e: KeyboardEvent) => void
  private boundHandleBlur: (e: FocusEvent) => void
  private boundHandleInput: () => void

  constructor(config: InlineEditSessionConfig) {
    this.element = config.element
    this.nodeId = config.nodeId
    this.originalText = ''
    this.onEnd = config.onEnd

    // Bind handlers
    this.boundHandleKeyDown = this.handleKeyDown.bind(this)
    this.boundHandleBlur = this.handleBlur.bind(this)
    this.boundHandleInput = this.handleInput.bind(this)
  }

  /**
   * Start the edit session
   */
  start(): void {
    if (this.isActive) return

    this.isActive = true

    // Store original text content
    this.originalText = this.element.textContent || ''

    // Make element editable
    this.element.contentEditable = 'true'
    this.element.classList.add('inline-editing')

    // Disable spellcheck for cleaner editing
    this.element.spellcheck = false

    // Focus and select all text
    this.element.focus()
    this.selectAllText()

    // Add event listeners
    this.element.addEventListener('keydown', this.boundHandleKeyDown)
    this.element.addEventListener('blur', this.boundHandleBlur)
    this.element.addEventListener('input', this.boundHandleInput)

    // Prevent click events from propagating during edit
    this.element.addEventListener('click', this.stopPropagation)
    this.element.addEventListener('mousedown', this.stopPropagation)
  }

  /**
   * End the edit session
   */
  end(save: boolean): void {
    if (!this.isActive) return

    this.isActive = false

    const newText = this.element.textContent || ''

    // Restore element state
    this.element.contentEditable = 'false'
    this.element.classList.remove('inline-editing')
    this.element.spellcheck = true

    // Remove event listeners
    this.element.removeEventListener('keydown', this.boundHandleKeyDown)
    this.element.removeEventListener('blur', this.boundHandleBlur)
    this.element.removeEventListener('input', this.boundHandleInput)
    this.element.removeEventListener('click', this.stopPropagation)
    this.element.removeEventListener('mousedown', this.stopPropagation)

    // Restore original text if cancelled
    if (!save) {
      this.element.textContent = this.originalText
    }

    // Clear selection
    window.getSelection()?.removeAllRanges()

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
    return this.element.textContent || ''
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

    if (e.key === 'Enter' && !e.shiftKey) {
      // Enter (without shift) = Save and exit
      e.preventDefault()
      this.end(true)
    } else if (e.key === 'Escape') {
      // Escape = Cancel and restore original
      e.preventDefault()
      this.end(false)
    }
    // Shift+Enter = Allow new line (default behavior, do nothing)
  }

  /**
   * Handle blur (focus lost)
   */
  private handleBlur(e: FocusEvent): void {
    // Small delay to allow for click-to-save scenarios
    // If the user clicks elsewhere, we want to save
    setTimeout(() => {
      if (this.isActive) {
        this.end(true)
      }
    }, 50)
  }

  /**
   * Handle input changes (for potential live preview)
   */
  private handleInput(): void {
    // Currently just marks element as modified
    // Could emit events for live preview in the future
    this.element.classList.add('inline-editing-modified')
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

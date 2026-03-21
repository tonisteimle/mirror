/**
 * InlineEditSession - Manages a single inline text editing session
 *
 * Uses a floating input field positioned over the element.
 * This approach is more robust than contentEditable:
 * - Standard input behavior
 * - Isolated from other event handlers
 * - Reliable Enter/Escape handling
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
  private inputElement: HTMLInputElement | null = null
  private overlay: HTMLDivElement | null = null

  // Bound event handlers for proper cleanup
  private boundHandleKeyDown: ((e: KeyboardEvent) => void) | null = null
  private boundHandleInput: (() => void) | null = null
  private boundHandleBlur: ((e: FocusEvent) => void) | null = null
  private boundHandleOverlayClick: ((e: MouseEvent) => void) | null = null

  constructor(config: InlineEditSessionConfig) {
    this.element = config.element
    this.nodeId = config.nodeId
    this.originalText = ''
    this.onEnd = config.onEnd
    this.onInput = config.onInput
  }

  /**
   * Start the edit session
   */
  start(): void {
    if (this.isActive) return

    this.isActive = true

    // Store original text content
    this.originalText = this.element.textContent?.trim() || ''

    // Create floating input
    this.createFloatingInput()

    // Mark element as being edited
    this.element.classList.add('inline-editing')
  }

  /**
   * End the edit session
   */
  end(save: boolean): void {
    if (!this.isActive) return

    this.isActive = false

    const newText = this.inputElement?.value.trim() || ''

    // Remove floating input
    this.removeFloatingInput()

    // Remove editing class
    this.element.classList.remove('inline-editing')

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
    return this.inputElement?.value.trim() || this.originalText
  }

  /**
   * Get the original text
   */
  getOriginalText(): string {
    return this.originalText
  }

  /**
   * Create the floating input field
   */
  private createFloatingInput(): void {
    // Get element's computed styles
    const computed = window.getComputedStyle(this.element)
    const rect = this.element.getBoundingClientRect()

    // Create overlay to capture clicks outside
    this.overlay = document.createElement('div')
    this.overlay.className = 'inline-edit-overlay'
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9998;
      cursor: default;
    `
    this.boundHandleOverlayClick = this.handleOverlayClick.bind(this)
    this.overlay.addEventListener('mousedown', this.boundHandleOverlayClick)
    document.body.appendChild(this.overlay)

    // Create input element
    this.inputElement = document.createElement('input')
    this.inputElement.type = 'text'
    this.inputElement.value = this.originalText
    this.inputElement.className = 'inline-edit-input'

    // Match the element's typography
    this.inputElement.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${Math.max(rect.width + 20, 60)}px;
      height: ${rect.height}px;
      min-width: 60px;
      padding: 0 4px;
      margin: 0;
      border: 2px solid var(--color-primary, #3B82F6);
      border-radius: 3px;
      background: transparent;
      color: ${computed.color};
      font-family: ${computed.fontFamily};
      font-size: ${computed.fontSize};
      font-weight: ${computed.fontWeight};
      line-height: ${rect.height}px;
      text-align: ${computed.textAlign};
      outline: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      z-index: 9999;
      box-sizing: border-box;
    `

    // Add event listeners with bound handlers for proper cleanup
    this.boundHandleKeyDown = this.handleKeyDown.bind(this)
    this.boundHandleInput = this.handleInput.bind(this)
    this.boundHandleBlur = this.handleBlur.bind(this)
    this.inputElement.addEventListener('keydown', this.boundHandleKeyDown)
    this.inputElement.addEventListener('input', this.boundHandleInput)
    this.inputElement.addEventListener('blur', this.boundHandleBlur)

    // Add to DOM
    document.body.appendChild(this.inputElement)

    // Capture reference before RAF to prevent race condition
    const inputRef = this.inputElement

    // Focus and select all (after a small delay to ensure rendering)
    requestAnimationFrame(() => {
      // Use captured reference and verify still in DOM
      if (inputRef && inputRef.isConnected) {
        inputRef.focus()
        inputRef.select()
      }
    })
  }

  /**
   * Remove the floating input field and clean up event listeners
   */
  private removeFloatingInput(): void {
    // Remove event listeners before removing elements to prevent memory leaks
    if (this.inputElement) {
      if (this.boundHandleKeyDown) {
        this.inputElement.removeEventListener('keydown', this.boundHandleKeyDown)
      }
      if (this.boundHandleInput) {
        this.inputElement.removeEventListener('input', this.boundHandleInput)
      }
      if (this.boundHandleBlur) {
        this.inputElement.removeEventListener('blur', this.boundHandleBlur)
      }
      this.inputElement.remove()
      this.inputElement = null
    }
    if (this.overlay) {
      if (this.boundHandleOverlayClick) {
        this.overlay.removeEventListener('mousedown', this.boundHandleOverlayClick)
      }
      this.overlay.remove()
      this.overlay = null
    }

    // Clear bound handler references
    this.boundHandleKeyDown = null
    this.boundHandleInput = null
    this.boundHandleBlur = null
    this.boundHandleOverlayClick = null
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown(e: KeyboardEvent): void {
    // Stop propagation to prevent other handlers
    e.stopPropagation()

    if (e.key === 'Enter') {
      e.preventDefault()
      this.end(true)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.end(false)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      this.end(true)
    }
  }

  /**
   * Handle input changes
   */
  private handleInput(): void {
    const text = this.inputElement?.value || ''
    this.onInput?.(text)

    // Auto-resize input width
    if (this.inputElement) {
      const textWidth = this.measureTextWidth(text)
      this.inputElement.style.width = `${Math.max(textWidth + 30, 60)}px`
    }
  }

  /**
   * Handle blur (focus lost)
   */
  private handleBlur(e: FocusEvent): void {
    // Small delay to allow click handlers to fire first
    setTimeout(() => {
      if (this.isActive) {
        this.end(true)
      }
    }, 50)
  }

  /**
   * Handle click on overlay (outside input)
   */
  private handleOverlayClick(e: MouseEvent): void {
    e.preventDefault()
    e.stopPropagation()
    this.end(true)
  }

  /**
   * Measure text width for auto-resize
   */
  private measureTextWidth(text: string): number {
    if (!this.inputElement) return 100

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return 100

    const computed = window.getComputedStyle(this.inputElement)
    ctx.font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`
    return ctx.measureText(text || 'M').width
  }
}

/**
 * Create a new inline edit session
 */
export function createInlineEditSession(config: InlineEditSessionConfig): InlineEditSession {
  return new InlineEditSession(config)
}

/**
 * Rename UI
 *
 * Inline input for renaming symbols (F2 functionality).
 * Shows an input field at the cursor position for entering new name.
 */

import { events } from '../core/events'
import type { SymbolType } from './rename-engine'

export interface RenameUIConfig {
  /** Callback when rename is confirmed (Enter pressed) */
  onConfirm: (newName: string) => void
  /** Callback when rename is cancelled (Escape pressed) */
  onCancel: () => void
  /** Optional validation function */
  validate?: (name: string) => { valid: boolean; error?: string }
}

export interface RenameUIPosition {
  x: number
  y: number
}

/**
 * Rename UI - inline input for symbol renaming
 */
export class RenameUI {
  private overlay: HTMLElement | null = null
  private input: HTMLInputElement | null = null
  private errorEl: HTMLElement | null = null
  private currentConfig: RenameUIConfig | null = null
  private originalName: string = ''

  /**
   * Show the rename input at the specified position
   */
  show(
    symbolName: string,
    symbolType: SymbolType,
    position: RenameUIPosition,
    config: RenameUIConfig
  ): void {
    this.hide() // Hide any existing UI

    this.currentConfig = config
    this.originalName = symbolName

    // Create overlay container
    this.overlay = document.createElement('div')
    this.overlay.className = 'rename-overlay'

    // Create input container
    const container = document.createElement('div')
    container.className = 'rename-container'
    container.style.left = `${position.x}px`
    container.style.top = `${position.y}px`

    // Create label
    const label = document.createElement('div')
    label.className = 'rename-label'
    label.textContent = `Rename ${symbolType}`
    container.appendChild(label)

    // Create input
    this.input = document.createElement('input')
    this.input.type = 'text'
    this.input.className = 'rename-input'
    this.input.value = symbolName
    this.input.spellcheck = false
    this.input.autocomplete = 'off'
    container.appendChild(this.input)

    // Create error message element
    this.errorEl = document.createElement('div')
    this.errorEl.className = 'rename-error'
    this.errorEl.style.display = 'none'
    container.appendChild(this.errorEl)

    // Create info text
    const info = document.createElement('div')
    info.className = 'rename-info'
    info.textContent = 'Enter to confirm, Escape to cancel'
    container.appendChild(info)

    this.overlay.appendChild(container)
    document.body.appendChild(this.overlay)

    // Set up event listeners
    this.input.addEventListener('keydown', this.handleKeyDown)
    this.input.addEventListener('input', this.handleInput)
    this.overlay.addEventListener('click', this.handleOverlayClick)

    // Focus and select all text
    requestAnimationFrame(() => {
      this.input?.focus()
      this.input?.select()
    })

    // Emit event
    events.emit('rename:ui-opened', { symbolName, symbolType })
  }

  /**
   * Hide the rename input
   */
  hide(): void {
    if (this.overlay) {
      // Remove event listeners
      this.input?.removeEventListener('keydown', this.handleKeyDown)
      this.input?.removeEventListener('input', this.handleInput)
      this.overlay.removeEventListener('click', this.handleOverlayClick)

      // Remove from DOM
      this.overlay.remove()
      this.overlay = null
      this.input = null
      this.errorEl = null
      this.currentConfig = null
      this.originalName = ''

      // Emit event
      events.emit('rename:ui-closed', {})
    }
  }

  /**
   * Check if UI is currently visible
   */
  isVisible(): boolean {
    return this.overlay !== null
  }

  // ============================================
  // Event handlers
  // ============================================

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      this.confirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      this.cancel()
    }
  }

  private handleInput = (): void => {
    if (!this.input || !this.currentConfig?.validate || !this.errorEl) return

    const value = this.input.value.trim()

    // Don't validate if empty or same as original
    if (!value || value === this.originalName) {
      this.errorEl.style.display = 'none'
      this.input.classList.remove('rename-input-error')
      return
    }

    const result = this.currentConfig.validate(value)
    if (!result.valid && result.error) {
      this.errorEl.textContent = result.error
      this.errorEl.style.display = 'block'
      this.input.classList.add('rename-input-error')
    } else {
      this.errorEl.style.display = 'none'
      this.input.classList.remove('rename-input-error')
    }
  }

  private handleOverlayClick = (e: MouseEvent): void => {
    // Click on overlay (not container) cancels
    if (e.target === this.overlay) {
      this.cancel()
    }
  }

  private confirm(): void {
    if (!this.input || !this.currentConfig) return

    const newName = this.input.value.trim()

    // Validate if validation function provided
    if (this.currentConfig.validate) {
      const result = this.currentConfig.validate(newName)
      if (!result.valid) {
        // Show error and don't close
        if (this.errorEl && result.error) {
          this.errorEl.textContent = result.error
          this.errorEl.style.display = 'block'
          this.input.classList.add('rename-input-error')
        }
        this.input.focus()
        return
      }
    }

    // Don't rename if name hasn't changed
    if (newName === this.originalName) {
      this.cancel()
      return
    }

    // Call confirm callback
    const onConfirm = this.currentConfig.onConfirm
    this.hide()
    onConfirm(newName)
  }

  private cancel(): void {
    const onCancel = this.currentConfig?.onCancel
    this.hide()
    onCancel?.()
  }
}

/**
 * Singleton instance
 */
let renameUIInstance: RenameUI | null = null

export function getRenameUI(): RenameUI {
  if (!renameUIInstance) {
    renameUIInstance = new RenameUI()
  }
  return renameUIInstance
}

export function createRenameUI(): RenameUI {
  return new RenameUI()
}

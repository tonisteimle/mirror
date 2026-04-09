/**
 * Base Picker Class
 */

import type { PickerConfig, PickerCallbacks } from './types'
import { DEFAULT_CONFIG } from './types'
import { KeyboardNav } from './keyboard-nav'
import { events } from '../../core/events'

export type PickerType = 'token' | 'color' | 'icon' | 'animation' | 'action' | 'unknown'

export abstract class BasePicker {
  protected config: Required<PickerConfig>
  protected callbacks: PickerCallbacks
  protected element: HTMLElement | null = null
  protected isOpen: boolean = false
  protected anchor: HTMLElement | null = null
  protected keyboardNav: KeyboardNav | null = null

  /** Unique identifier for this picker instance (for testing) */
  public readonly pickerId: string
  /** Type of picker (for testing) */
  public readonly pickerType: PickerType

  private boundHandleClickOutside: (e: MouseEvent) => void
  private boundHandleKeyDown: (e: KeyboardEvent) => void
  private closeReason: 'select' | 'escape' | 'click-outside' | 'unknown' = 'unknown'

  constructor(config: Partial<PickerConfig>, callbacks: PickerCallbacks, pickerType: PickerType = 'unknown') {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.callbacks = callbacks
    this.pickerId = `picker-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    this.pickerType = pickerType

    this.boundHandleClickOutside = this.handleClickOutside.bind(this)
    this.boundHandleKeyDown = this.handleKeyDown.bind(this)
  }

  // Abstract methods - must be implemented
  abstract render(): HTMLElement
  abstract getValue(): string
  abstract setValue(value: string): void

  show(anchor: HTMLElement): void {
    if (this.isOpen) return

    this.anchor = anchor
    this.element = this.render()
    this.element.classList.add('picker', 'picker-container')
    this.element.style.zIndex = String(this.config.zIndex)

    // Position the picker
    const position = this.calculatePosition(anchor)
    this.element.style.position = 'absolute'
    this.element.style.left = `${position.left}px`
    this.element.style.top = `${position.top}px`

    // Add to container
    const container = this.config.container ?? document.body
    container.appendChild(this.element)

    // Setup event listeners
    this.setupEventListeners()

    // Animate in
    if (this.config.animate) {
      this.element.classList.add('picker-enter')
      requestAnimationFrame(() => {
        this.element?.classList.remove('picker-enter')
        this.element?.classList.add('picker-enter-active')
      })
    }

    this.isOpen = true
    this.closeReason = 'unknown'
    this.callbacks.onOpen?.()

    // Emit event for testing
    events.emit('picker:opened', { pickerId: this.pickerId, pickerType: this.pickerType })
  }

  hide(): void {
    if (!this.isOpen || !this.element) return

    // Animate out
    if (this.config.animate) {
      this.element.classList.add('picker-exit')
      setTimeout(() => {
        this.removeElement()
      }, 150)
    } else {
      this.removeElement()
    }

    this.teardownEventListeners()
    this.isOpen = false
    this.callbacks.onClose?.()

    // Emit event for testing
    events.emit('picker:closed', { pickerId: this.pickerId, reason: this.closeReason })
  }

  toggle(anchor: HTMLElement): void {
    if (this.isOpen) {
      this.hide()
    } else {
      this.show(anchor)
    }
  }

  destroy(): void {
    this.hide()
    this.keyboardNav?.dispose()
    this.keyboardNav = null
  }

  getIsOpen(): boolean {
    return this.isOpen
  }

  /**
   * Get the picker's DOM element (if rendered)
   */
  getElement(): HTMLElement | null {
    return this.element
  }

  protected calculatePosition(anchor: HTMLElement): { top: number; left: number } {
    const anchorRect = anchor.getBoundingClientRect()
    const { position, offsetX, offsetY } = this.config

    let top: number
    let left: number

    switch (position) {
      case 'above':
        top = anchorRect.top - offsetY!
        left = anchorRect.left + offsetX!
        break
      case 'left':
        top = anchorRect.top + offsetY!
        left = anchorRect.left - offsetX!
        break
      case 'right':
        top = anchorRect.top + offsetY!
        left = anchorRect.right + offsetX!
        break
      case 'below':
      default:
        top = anchorRect.bottom + offsetY!
        left = anchorRect.left + offsetX!
        break
    }

    // Adjust for scroll
    top += window.scrollY
    left += window.scrollX

    return this.adjustForViewport({ top, left })
  }

  protected adjustForViewport(pos: { top: number; left: number }): { top: number; left: number } {
    // Get element dimensions (estimate if not rendered yet)
    const width = this.element?.offsetWidth ?? 200
    const height = this.element?.offsetHeight ?? 300

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const scrollX = window.scrollX
    const scrollY = window.scrollY

    let { top, left } = pos

    // Adjust horizontal
    if (left + width > scrollX + viewportWidth) {
      left = scrollX + viewportWidth - width - 10
    }
    if (left < scrollX) {
      left = scrollX + 10
    }

    // Adjust vertical
    if (top + height > scrollY + viewportHeight) {
      // Try placing above anchor
      if (this.anchor) {
        const anchorRect = this.anchor.getBoundingClientRect()
        const aboveTop = anchorRect.top + scrollY - height - (this.config.offsetY ?? 0)
        if (aboveTop > scrollY) {
          top = aboveTop
        } else {
          top = scrollY + viewportHeight - height - 10
        }
      }
    }
    if (top < scrollY) {
      top = scrollY + 10
    }

    return { top, left }
  }

  protected setupEventListeners(): void {
    if (this.config.closeOnClickOutside) {
      // Delay to prevent immediate close
      setTimeout(() => {
        document.addEventListener('mousedown', this.boundHandleClickOutside)
      }, 0)
    }

    // Only set up keyboard listener if NOT using external keyboard handling
    // When external (like TriggerManager) handles keyboard, skip this to avoid conflicts
    if (this.config.closeOnEscape && !this.config.externalKeyboardHandling) {
      // Use capturing phase to intercept events before CodeMirror
      document.addEventListener('keydown', this.boundHandleKeyDown, true)
    }
  }

  protected teardownEventListeners(): void {
    document.removeEventListener('mousedown', this.boundHandleClickOutside)
    document.removeEventListener('keydown', this.boundHandleKeyDown, true)
  }

  protected handleClickOutside(event: MouseEvent): void {
    if (!this.element) return

    const target = event.target as Node
    if (!this.element.contains(target) && !this.anchor?.contains(target)) {
      this.closeReason = 'click-outside'
      this.hide()
    }
  }

  protected handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.config.closeOnEscape) {
      event.preventDefault()
      event.stopPropagation()
      this.closeReason = 'escape'
      this.hide()
      return
    }

    // Delegate to keyboard nav if available
    if (this.keyboardNav) {
      const handled = this.keyboardNav.handleKeyDown(event)
      if (handled) {
        event.stopPropagation()
      }
    }
  }

  protected selectValue(value: string): void {
    this.callbacks.onSelect(value)
    if (this.config.closeOnSelect) {
      this.closeReason = 'select'
      this.hide()
    }
  }

  private removeElement(): void {
    if (this.element) {
      this.element.remove()
      this.element = null
    }
  }
}

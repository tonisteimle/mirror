/**
 * NumericInput Component
 *
 * A numeric input with:
 * - Drag-to-adjust on the label (scrubbing)
 * - Spinner buttons (up/down)
 * - Shift modifier for 10x step
 * - Keyboard input support
 */

import type { NumericInputConfig } from './types'

export class NumericInput {
  private config: Required<Pick<NumericInputConfig, 'label' | 'value' | 'unit' | 'step' | 'onChange'>> & Partial<NumericInputConfig>
  private container: HTMLElement
  private input: HTMLInputElement
  private labelEl: HTMLElement
  private element: HTMLElement

  // Drag state
  private isDragging = false
  private startX = 0
  private startValue = 0

  // Bound handlers for cleanup
  private boundHandleMouseMove: (e: MouseEvent) => void
  private boundHandleMouseUp: () => void
  private boundHandleKeyDown: (e: KeyboardEvent) => void

  constructor(config: NumericInputConfig) {
    this.config = {
      label: config.label,
      value: config.value,
      unit: config.unit ?? 'px',
      step: config.step ?? 1,
      onChange: config.onChange,
      min: config.min,
      max: config.max,
      onDragStart: config.onDragStart,
      onDragEnd: config.onDragEnd,
    }
    this.container = config.container
    this.element = document.createElement('div')
    this.input = document.createElement('input')
    this.labelEl = document.createElement('label')

    this.boundHandleMouseMove = this.handleMouseMove.bind(this)
    this.boundHandleMouseUp = this.handleMouseUp.bind(this)
    this.boundHandleKeyDown = this.handleKeyDown.bind(this)

    this.render()
    this.setupDragToAdjust()
    this.setupInputHandlers()
  }

  private render(): void {
    this.element.className = 'numeric-input'

    // Label (draggable)
    this.labelEl.className = 'numeric-input-label'
    this.labelEl.textContent = this.config.label
    this.labelEl.title = `Drag to adjust ${this.config.label}`

    // Input field
    this.input.type = 'text'
    this.input.className = 'numeric-input-field'
    this.input.value = String(this.config.value)
    this.input.setAttribute('data-axis', this.config.label.toLowerCase())

    // Unit label
    const unitEl = document.createElement('span')
    unitEl.className = 'numeric-input-unit'
    unitEl.textContent = this.config.unit

    // Spinner buttons
    const spinners = document.createElement('div')
    spinners.className = 'numeric-input-spinners'

    const upBtn = document.createElement('button')
    upBtn.className = 'numeric-input-spinner numeric-input-spinner-up'
    upBtn.innerHTML = '<svg width="8" height="8" viewBox="0 0 8 8"><path d="M4 2L7 5H1L4 2Z" fill="currentColor"/></svg>'
    upBtn.tabIndex = -1
    upBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.step(1, e.shiftKey)
    })

    const downBtn = document.createElement('button')
    downBtn.className = 'numeric-input-spinner numeric-input-spinner-down'
    downBtn.innerHTML = '<svg width="8" height="8" viewBox="0 0 8 8"><path d="M4 6L1 3H7L4 6Z" fill="currentColor"/></svg>'
    downBtn.tabIndex = -1
    downBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.step(-1, e.shiftKey)
    })

    spinners.appendChild(upBtn)
    spinners.appendChild(downBtn)

    // Assemble
    this.element.appendChild(this.labelEl)
    this.element.appendChild(this.input)
    this.element.appendChild(unitEl)
    this.element.appendChild(spinners)

    this.container.appendChild(this.element)
  }

  private setupDragToAdjust(): void {
    this.labelEl.style.cursor = 'ew-resize'
    this.labelEl.style.userSelect = 'none'

    this.labelEl.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault()
      this.isDragging = true
      this.startX = e.clientX
      this.startValue = this.getValue()

      this.labelEl.classList.add('dragging')
      document.body.style.cursor = 'ew-resize'

      this.config.onDragStart?.()

      document.addEventListener('mousemove', this.boundHandleMouseMove)
      document.addEventListener('mouseup', this.boundHandleMouseUp)
    })
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return

    const delta = e.clientX - this.startX
    const step = e.shiftKey ? (this.config.step * 10) : this.config.step
    // Sensitivity: 2px mouse movement = 1 step
    const steps = Math.round(delta / 2)
    let newValue = this.startValue + (steps * step)

    // Clamp to min/max if specified
    if (this.config.min !== undefined) {
      newValue = Math.max(this.config.min, newValue)
    }
    if (this.config.max !== undefined) {
      newValue = Math.min(this.config.max, newValue)
    }

    this.setValue(newValue)
    this.config.onChange(newValue)
  }

  private handleMouseUp(): void {
    if (!this.isDragging) return

    this.isDragging = false
    this.labelEl.classList.remove('dragging')
    document.body.style.cursor = ''

    this.config.onDragEnd?.()

    document.removeEventListener('mousemove', this.boundHandleMouseMove)
    document.removeEventListener('mouseup', this.boundHandleMouseUp)
  }

  private setupInputHandlers(): void {
    // Focus and blur handlers
    this.input.addEventListener('focus', () => {
      this.input.select()
    })

    // Handle input changes
    this.input.addEventListener('change', () => {
      const parsed = parseInt(this.input.value, 10)
      if (!isNaN(parsed)) {
        let value = parsed
        if (this.config.min !== undefined) value = Math.max(this.config.min, value)
        if (this.config.max !== undefined) value = Math.min(this.config.max, value)
        this.setValue(value)
        this.config.onChange(value)
      } else {
        // Revert to current value
        this.input.value = String(this.config.value)
      }
    })

    // Keyboard handling
    this.input.addEventListener('keydown', this.boundHandleKeyDown)
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        this.input.blur()
        break
      case 'Escape':
        e.preventDefault()
        this.input.value = String(this.config.value)
        this.input.blur()
        break
      case 'ArrowUp':
        e.preventDefault()
        this.step(1, e.shiftKey)
        break
      case 'ArrowDown':
        e.preventDefault()
        this.step(-1, e.shiftKey)
        break
    }
  }

  private step(direction: 1 | -1, useShift: boolean): void {
    const stepSize = useShift ? (this.config.step * 10) : this.config.step
    let newValue = this.getValue() + (direction * stepSize)

    if (this.config.min !== undefined) newValue = Math.max(this.config.min, newValue)
    if (this.config.max !== undefined) newValue = Math.min(this.config.max, newValue)

    this.setValue(newValue)
    this.config.onChange(newValue)
  }

  getValue(): number {
    return this.config.value
  }

  setValue(value: number): void {
    this.config.value = value
    this.input.value = String(value)
  }

  getElement(): HTMLElement {
    return this.element
  }

  dispose(): void {
    document.removeEventListener('mousemove', this.boundHandleMouseMove)
    document.removeEventListener('mouseup', this.boundHandleMouseUp)
    this.element.remove()
  }
}

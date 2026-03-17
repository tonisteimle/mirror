/**
 * PositionSection Component
 *
 * A panel section containing X and Y position inputs
 * with an optional link toggle for proportional movement.
 */

import { NumericInput } from './numeric-input'
import type { PositionSectionConfig, PositionValue } from './types'

export class PositionSection {
  private xInput: NumericInput | null = null
  private yInput: NumericInput | null = null
  private linked = false
  private element: HTMLElement
  private linkButton: HTMLButtonElement | null = null
  private onChange: (axis: 'x' | 'y', value: number) => void
  private currentX: number
  private currentY: number

  constructor() {
    this.element = document.createElement('div')
    this.onChange = () => {}
    this.currentX = 0
    this.currentY = 0
  }

  render(config: PositionSectionConfig): HTMLElement {
    const { container, x, y, onChange } = config

    this.currentX = x
    this.currentY = y
    this.onChange = onChange

    this.element.className = 'position-section'
    this.element.innerHTML = `
      <div class="position-section-header">Position</div>
      <div class="position-controls">
        <div class="position-row" data-axis="x"></div>
        <div class="position-row" data-axis="y"></div>
        <button class="position-link-toggle" title="Link X/Y movement">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6.5 4.5L4.5 6.5C3.12 7.88 3.12 10.12 4.5 11.5C5.88 12.88 8.12 12.88 9.5 11.5L10 11"
                  stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M9.5 11.5L11.5 9.5C12.88 8.12 12.88 5.88 11.5 4.5C10.12 3.12 7.88 3.12 6.5 4.5L6 5"
                  stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `

    // Create X input
    const xContainer = this.element.querySelector('[data-axis="x"]') as HTMLElement
    this.xInput = new NumericInput({
      container: xContainer,
      label: 'X',
      value: x,
      unit: 'px',
      onChange: (value) => this.handleChange('x', value),
    })

    // Create Y input
    const yContainer = this.element.querySelector('[data-axis="y"]') as HTMLElement
    this.yInput = new NumericInput({
      container: yContainer,
      label: 'Y',
      value: y,
      unit: 'px',
      onChange: (value) => this.handleChange('y', value),
    })

    // Link toggle button
    this.linkButton = this.element.querySelector('.position-link-toggle') as HTMLButtonElement
    this.linkButton.addEventListener('click', () => this.toggleLink())

    container.appendChild(this.element)
    return this.element
  }

  private handleChange(axis: 'x' | 'y', value: number): void {
    const oldX = this.currentX
    const oldY = this.currentY

    if (axis === 'x') {
      this.currentX = value
      if (this.linked) {
        const delta = value - oldX
        this.currentY = oldY + delta
        this.yInput?.setValue(this.currentY)
        this.onChange('y', this.currentY)
      }
    } else {
      this.currentY = value
      if (this.linked) {
        const delta = value - oldY
        this.currentX = oldX + delta
        this.xInput?.setValue(this.currentX)
        this.onChange('x', this.currentX)
      }
    }

    this.onChange(axis, value)
  }

  private toggleLink(): void {
    this.linked = !this.linked
    this.linkButton?.classList.toggle('active', this.linked)
  }

  setValues(x: number, y: number): void {
    this.currentX = x
    this.currentY = y
    this.xInput?.setValue(x)
    this.yInput?.setValue(y)
  }

  getValues(): PositionValue {
    return { x: this.currentX, y: this.currentY }
  }

  getElement(): HTMLElement {
    return this.element
  }

  dispose(): void {
    this.xInput?.dispose()
    this.yInput?.dispose()
    this.element.remove()
  }
}

export function createPositionSection(): PositionSection {
  return new PositionSection()
}

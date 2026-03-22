/**
 * AlignGrid Component
 *
 * 3x3 grid for alignment selection (or 2x2 for corners).
 *
 * CSS Classes used:
 * - .align-grid
 * - .align-cell
 * - .active (state)
 */

import type { AlignGridConfig, AlignPosition, ComponentInstance } from './types'

const GRID_POSITIONS: AlignPosition[] = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'middle-center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
]

const CORNER_POSITIONS: AlignPosition[] = [
  'top-left', 'top-right',
  'bottom-left', 'bottom-right',
]

export class AlignGrid implements ComponentInstance {
  private element: HTMLElement
  private cells: Map<AlignPosition, HTMLButtonElement> = new Map()
  private config: AlignGridConfig
  private selectedPosition: AlignPosition | null

  constructor(config: AlignGridConfig) {
    this.config = config
    this.selectedPosition = config.value
    this.element = document.createElement('div')
    this.render()
  }

  private render(): void {
    const positions = this.config.cornersOnly ? CORNER_POSITIONS : GRID_POSITIONS
    const columns = this.config.cornersOnly ? 2 : 3

    this.element.className = `align-grid ${this.config.className || ''}`
    this.element.style.gridTemplateColumns = `repeat(${columns}, 1fr)`

    if (this.config.cornersOnly) {
      this.element.classList.add('align-grid-corners')
    }

    if (this.config.testId) {
      this.element.setAttribute('data-testid', this.config.testId)
    }

    if (this.config.disabled) {
      this.element.classList.add('disabled')
    }

    this.cells.clear()

    for (const position of positions) {
      const cell = this.createCell(position)
      this.cells.set(position, cell)
      this.element.appendChild(cell)
    }
  }

  private createCell(position: AlignPosition): HTMLButtonElement {
    const cell = document.createElement('button')
    cell.type = 'button'
    cell.className = 'align-cell'
    cell.setAttribute('data-position', position)
    cell.title = this.formatPosition(position)

    if (position === this.selectedPosition) {
      cell.classList.add('active')
      cell.setAttribute('aria-pressed', 'true')
    } else {
      cell.setAttribute('aria-pressed', 'false')
    }

    if (this.config.disabled) {
      cell.disabled = true
    }

    cell.addEventListener('click', () => this.handleClick(position))

    return cell
  }

  private formatPosition(position: AlignPosition): string {
    return position
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  private handleClick(position: AlignPosition): void {
    if (this.config.disabled) return

    this.selectedPosition = position
    this.updateActiveStates()
    this.config.onChange(position)
  }

  private updateActiveStates(): void {
    for (const [position, cell] of this.cells) {
      const isActive = position === this.selectedPosition
      cell.classList.toggle('active', isActive)
      cell.setAttribute('aria-pressed', String(isActive))
    }
  }

  /**
   * Get current value
   */
  getValue(): AlignPosition | null {
    return this.selectedPosition
  }

  /**
   * Set value
   */
  setValue(value: AlignPosition | null): void {
    this.selectedPosition = value
    this.updateActiveStates()
  }

  /**
   * Clear selection
   */
  clear(): void {
    this.setValue(null)
  }

  /**
   * Enable the component
   */
  enable(): void {
    this.config.disabled = false
    this.element.classList.remove('disabled')
    for (const cell of this.cells.values()) {
      cell.disabled = false
    }
  }

  /**
   * Disable the component
   */
  disable(): void {
    this.config.disabled = true
    this.element.classList.add('disabled')
    for (const cell of this.cells.values()) {
      cell.disabled = true
    }
  }

  getElement(): HTMLElement {
    return this.element
  }

  dispose(): void {
    this.cells.clear()
    this.element.remove()
  }
}

/**
 * Factory function
 */
export function createAlignGrid(config: AlignGridConfig): AlignGrid {
  return new AlignGrid(config)
}

/**
 * Quick helper for alignment grid
 */
export function alignGrid(
  value: AlignPosition | null,
  onChange: (position: AlignPosition) => void,
  cornersOnly?: boolean
): AlignGrid {
  return new AlignGrid({ value, onChange, cornersOnly })
}

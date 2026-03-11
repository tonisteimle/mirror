/**
 * Keyboard Navigation for Pickers
 */

export type NavOrientation = 'horizontal' | 'vertical' | 'grid'

export interface KeyboardNavConfig {
  orientation: NavOrientation
  columns?: number
  wrap?: boolean
  onSelect: (item: HTMLElement, index: number) => void
  onCancel?: () => void
}

export class KeyboardNav {
  private items: HTMLElement[] = []
  private selectedIndex: number = 0
  private config: Required<KeyboardNavConfig>

  constructor(config: KeyboardNavConfig) {
    this.config = {
      columns: 1,
      wrap: true,
      onCancel: () => {},
      ...config,
    }
  }

  setItems(items: HTMLElement[]): void {
    this.items = items
    this.selectedIndex = 0
    this.updateVisualSelection()
  }

  getSelectedIndex(): number {
    return this.selectedIndex
  }

  getSelectedItem(): HTMLElement | null {
    return this.items[this.selectedIndex] ?? null
  }

  selectIndex(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.selectedIndex = index
      this.updateVisualSelection()
    }
  }

  moveUp(): void {
    const { orientation, columns, wrap } = this.config
    let newIndex: number

    if (orientation === 'grid') {
      newIndex = this.selectedIndex - columns
      if (newIndex < 0) {
        if (wrap) {
          // Wrap to last row, same column
          const col = this.selectedIndex % columns
          const lastRowStart = Math.floor((this.items.length - 1) / columns) * columns
          newIndex = Math.min(lastRowStart + col, this.items.length - 1)
        } else {
          return
        }
      }
    } else if (orientation === 'vertical') {
      newIndex = this.selectedIndex - 1
      if (newIndex < 0) {
        newIndex = wrap ? this.items.length - 1 : 0
      }
    } else {
      return // horizontal doesn't use up
    }

    this.selectedIndex = newIndex
    this.updateVisualSelection()
  }

  moveDown(): void {
    const { orientation, columns, wrap } = this.config
    let newIndex: number

    if (orientation === 'grid') {
      newIndex = this.selectedIndex + columns
      if (newIndex >= this.items.length) {
        if (wrap) {
          // Wrap to first row, same column
          newIndex = this.selectedIndex % columns
        } else {
          return
        }
      }
    } else if (orientation === 'vertical') {
      newIndex = this.selectedIndex + 1
      if (newIndex >= this.items.length) {
        newIndex = wrap ? 0 : this.items.length - 1
      }
    } else {
      return // horizontal doesn't use down
    }

    this.selectedIndex = newIndex
    this.updateVisualSelection()
  }

  moveLeft(): void {
    const { orientation, columns, wrap } = this.config
    let newIndex: number

    if (orientation === 'grid') {
      const col = this.selectedIndex % columns
      if (col === 0) {
        if (wrap) {
          // Wrap to end of previous row or last item
          newIndex = this.selectedIndex === 0
            ? this.items.length - 1
            : this.selectedIndex - 1
        } else {
          return
        }
      } else {
        newIndex = this.selectedIndex - 1
      }
    } else if (orientation === 'horizontal') {
      newIndex = this.selectedIndex - 1
      if (newIndex < 0) {
        newIndex = wrap ? this.items.length - 1 : 0
      }
    } else {
      return // vertical doesn't use left
    }

    this.selectedIndex = newIndex
    this.updateVisualSelection()
  }

  moveRight(): void {
    const { orientation, columns, wrap } = this.config
    let newIndex: number

    if (orientation === 'grid') {
      const col = this.selectedIndex % columns
      if (col === columns - 1 || this.selectedIndex === this.items.length - 1) {
        if (wrap) {
          // Wrap to start of next row or first item
          newIndex = this.selectedIndex === this.items.length - 1
            ? 0
            : this.selectedIndex + 1
        } else {
          return
        }
      } else {
        newIndex = this.selectedIndex + 1
      }
    } else if (orientation === 'horizontal') {
      newIndex = this.selectedIndex + 1
      if (newIndex >= this.items.length) {
        newIndex = wrap ? 0 : this.items.length - 1
      }
    } else {
      return // vertical doesn't use right
    }

    this.selectedIndex = newIndex
    this.updateVisualSelection()
  }

  moveToFirst(): void {
    this.selectedIndex = 0
    this.updateVisualSelection()
  }

  moveToLast(): void {
    this.selectedIndex = this.items.length - 1
    this.updateVisualSelection()
  }

  selectCurrent(): void {
    const item = this.items[this.selectedIndex]
    if (item) {
      this.config.onSelect(item, this.selectedIndex)
    }
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        this.moveUp()
        return true

      case 'ArrowDown':
        event.preventDefault()
        this.moveDown()
        return true

      case 'ArrowLeft':
        event.preventDefault()
        this.moveLeft()
        return true

      case 'ArrowRight':
        event.preventDefault()
        this.moveRight()
        return true

      case 'Home':
        event.preventDefault()
        this.moveToFirst()
        return true

      case 'End':
        event.preventDefault()
        this.moveToLast()
        return true

      case 'Enter':
      case ' ':
        event.preventDefault()
        this.selectCurrent()
        return true

      case 'Escape':
        event.preventDefault()
        this.config.onCancel?.()
        return true

      default:
        return false
    }
  }

  private updateVisualSelection(): void {
    this.items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.classList.add('picker-selected')
        item.setAttribute('aria-selected', 'true')
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      } else {
        item.classList.remove('picker-selected')
        item.setAttribute('aria-selected', 'false')
      }
    })
  }

  dispose(): void {
    this.items = []
  }
}

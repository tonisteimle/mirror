/**
 * SizingSection - Width, Height, and Min/Max Constraints
 *
 * COMPACT LAYOUT:
 * - Width/Height side by side in 2-column grid
 * - Min/Max in 2-column grid with icons
 * - Position x/y when in absolute container
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap, PropertyCategory } from '../types'
import { escapeHtml, validateInput, PROP_ICONS } from '../utils'
import { toggleExpanded, applyExpandedState } from '../utils/expand-state'
import { makeScrubable, type ScrubInstance } from '../utils/scrub'

/**
 * Size mode icons
 */
const SIZE_ICONS = {
  widthHug: `<svg class="pp-icon" viewBox="0 0 14 14">
    <path d="M4 3v8M10 3v8M1 7h3M10 7h3"/>
  </svg>`,
  widthFull: `<svg class="pp-icon" viewBox="0 0 14 14">
    <path d="M2 3v8M12 3v8M2 7h10"/>
  </svg>`,
  heightHug: `<svg class="pp-icon" viewBox="0 0 14 14">
    <path d="M3 4h8M3 10h8M7 1v3M7 10v3"/>
  </svg>`,
  heightFull: `<svg class="pp-icon" viewBox="0 0 14 14">
    <path d="M3 2h8M3 12h8M7 2v10"/>
  </svg>`,
  expand: `<svg class="pp-icon" viewBox="0 0 14 14">
    <path d="M4 6l3 3 3-3"/>
  </svg>`
}

/**
 * SizingSection class
 */
export class SizingSection extends BaseSection {
  private scrubInstances: ScrubInstance[] = []

  constructor(deps: SectionDependencies) {
    super({ label: 'Size' }, deps)
  }

  render(data: SectionData): string {
    this.data = data
    const category = data.category
    if (!category) return ''

    const props = category.properties

    // Find width and height values
    const widthProp = props.find(p => p.name === 'width' || p.name === 'w')
    const heightProp = props.find(p => p.name === 'height' || p.name === 'h')
    const widthValue = widthProp?.value || ''
    const heightValue = heightProp?.value || ''

    // Find min/max values
    const minWidthProp = props.find(p => p.name === 'min-width' || p.name === 'minw')
    const maxWidthProp = props.find(p => p.name === 'max-width' || p.name === 'maxw')
    const minHeightProp = props.find(p => p.name === 'min-height' || p.name === 'minh')
    const maxHeightProp = props.find(p => p.name === 'max-height' || p.name === 'maxh')

    const minWidthValue = minWidthProp?.value || ''
    const maxWidthValue = maxWidthProp?.value || ''
    const minHeightValue = minHeightProp?.value || ''
    const maxHeightValue = maxHeightProp?.value || ''

    // Check if any min/max is set (for expansion state)
    const hasMinMax = !!(minWidthValue || maxWidthValue || minHeightValue || maxHeightValue)

    // Check for hug/full values
    const widthIsHug = widthValue === 'hug'
    const widthIsFull = widthValue === 'full'
    const heightIsHug = heightValue === 'hug'
    const heightIsFull = heightValue === 'full'

    // Render position row if in positioned container
    const xyRow = data.isInPositionedContainer ? this.renderPositionRow(props) : ''

    return `
      <div class="pp-section">
        <div class="pp-section-label">Size</div>
        <div class="pp-section-content">
          ${xyRow}
          ${this.renderSizeGrid(widthValue, heightValue, widthIsHug, widthIsFull, heightIsHug, heightIsFull)}
        </div>
        ${this.renderMinMaxSection(minWidthValue, maxWidthValue, minHeightValue, maxHeightValue, hasMinMax)}
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      // Size mode toggle (hug/full)
      '[data-size-mode]': {
        click: (e: Event, target: HTMLElement) => {
          const mode = target.getAttribute('data-size-mode')
          if (mode) {
            this.handleSizeModeToggle(mode)
          }
        }
      },
      // Width/height input change
      'input[data-prop="width"], input[data-prop="height"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const prop = input.getAttribute('data-prop')
          if (prop) {
            const result = validateInput(input, prop)
            if (result.valid) {
              this.deps.onPropertyChange(prop, input.value, 'input')
            }
          }
        }
      },
      // Min/max input change
      'input[data-prop="minw"], input[data-prop="maxw"], input[data-prop="minh"], input[data-prop="maxh"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const prop = input.getAttribute('data-prop')
          if (prop) {
            const result = validateInput(input, prop)
            if (result.valid) {
              this.deps.onPropertyChange(prop, input.value, 'input')
            }
          }
        }
      },
      // Position input change
      'input[data-prop="x"], input[data-prop="y"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const prop = input.getAttribute('data-prop')
          if (prop) {
            const result = validateInput(input, prop)
            if (result.valid) {
              this.deps.onPropertyChange(prop, input.value, 'input')
            }
          }
        }
      },
      // Expand button for min/max
      '[data-expand="size-minmax"]': {
        click: (e: Event, target: HTMLElement) => {
          this.handleExpandClick()
        }
      }
    }
  }

  // ============================================
  // Private Render Methods
  // ============================================

  /**
   * Render Width and Height side-by-side in 2-column grid
   */
  private renderSizeGrid(
    widthValue: string,
    heightValue: string,
    widthIsHug: boolean,
    widthIsFull: boolean,
    heightIsHug: boolean,
    heightIsFull: boolean
  ): string {
    return `
      <div class="pp-row-grid">
        <div class="pp-cell" data-scrub="width" data-scrub-min="0">
          <span class="pp-cell-label" title="Width">${PROP_ICONS.width}</span>
          <div class="pp-toggle-group">
            <button class="pp-toggle-btn ${widthIsHug ? 'active' : ''}" data-size-mode="width-hug" title="Hug Content">
              ${SIZE_ICONS.widthHug}
            </button>
            <button class="pp-toggle-btn ${widthIsFull ? 'active' : ''}" data-size-mode="width-full" title="Fill Container">
              ${SIZE_ICONS.widthFull}
            </button>
          </div>
          <div class="pp-cell-input">
            <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(widthValue)}" data-prop="width" placeholder="auto">
          </div>
        </div>
        <div class="pp-cell" data-scrub="height" data-scrub-min="0">
          <span class="pp-cell-label" title="Height">${PROP_ICONS.height}</span>
          <div class="pp-toggle-group">
            <button class="pp-toggle-btn ${heightIsHug ? 'active' : ''}" data-size-mode="height-hug" title="Hug Content">
              ${SIZE_ICONS.heightHug}
            </button>
            <button class="pp-toggle-btn ${heightIsFull ? 'active' : ''}" data-size-mode="height-full" title="Fill Container">
              ${SIZE_ICONS.heightFull}
            </button>
          </div>
          <div class="pp-cell-input">
            <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(heightValue)}" data-prop="height" placeholder="auto">
          </div>
        </div>
      </div>
    `
  }

  private renderPositionRow(props: Array<{ name: string; value: string }>): string {
    const xProp = props.find(p => p.name === 'x')
    const yProp = props.find(p => p.name === 'y')
    const xValue = xProp?.value || ''
    const yValue = yProp?.value || ''

    return `
      <div class="pp-row-grid">
        <div class="pp-cell" data-scrub="x">
          <span class="pp-cell-label" title="X Position">${PROP_ICONS.posX}</span>
          <div class="pp-cell-input">
            <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(xValue)}" data-prop="x" placeholder="0">
          </div>
        </div>
        <div class="pp-cell" data-scrub="y">
          <span class="pp-cell-label" title="Y Position">${PROP_ICONS.posY}</span>
          <div class="pp-cell-input">
            <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(yValue)}" data-prop="y" placeholder="0">
          </div>
        </div>
      </div>
    `
  }

  private renderMinMaxSection(minW: string, maxW: string, minH: string, maxH: string, hasMinMax: boolean): string {
    return `
      <div class="pp-section-content pp-minmax-section${hasMinMax ? ' expanded' : ''}" data-expand-container="size-minmax">
        <div class="pp-row collapsed-row" data-expand-group="size-minmax">
          <span class="pp-row-label">Min/Max</span>
          <div class="pp-row-content">
            <button class="pp-expand-btn" data-expand="size-minmax" title="Show min/max width and height constraints">
              ${SIZE_ICONS.expand}
            </button>
          </div>
        </div>
        <!-- Expanded: Min/Max in 2-column grid -->
        <div class="pp-row-grid expanded-row" data-expand-group="size-minmax">
          <div class="pp-cell" data-scrub="minw" data-scrub-min="0">
            <span class="pp-cell-label" title="Min Width">${PROP_ICONS.minWidth}</span>
            <div class="pp-cell-input">
              <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(minW)}" data-prop="minw" placeholder="none">
            </div>
          </div>
          <div class="pp-cell" data-scrub="maxw" data-scrub-min="0">
            <span class="pp-cell-label" title="Max Width">${PROP_ICONS.maxWidth}</span>
            <div class="pp-cell-input">
              <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(maxW)}" data-prop="maxw" placeholder="none">
            </div>
          </div>
        </div>
        <div class="pp-row-grid expanded-row" data-expand-group="size-minmax">
          <div class="pp-cell" data-scrub="minh" data-scrub-min="0">
            <span class="pp-cell-label" title="Min Height">${PROP_ICONS.minHeight}</span>
            <div class="pp-cell-input">
              <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(minH)}" data-prop="minh" placeholder="none">
            </div>
          </div>
          <div class="pp-cell" data-scrub="maxh" data-scrub-min="0">
            <span class="pp-cell-label" title="Max Height">${PROP_ICONS.maxHeight}</span>
            <div class="pp-cell-input">
              <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(maxH)}" data-prop="maxh" placeholder="none">
            </div>
          </div>
        </div>
      </div>
    `
  }

  // ============================================
  // Private Handler Methods
  // ============================================

  private handleSizeModeToggle(mode: string): void {
    // Parse mode: "width-hug", "width-full", "height-hug", "height-full"
    const [prop, value] = mode.split('-')

    // Check if already active - if so, toggle off (remove)
    const category = this.data?.category
    if (category) {
      const currentProp = category.properties.find(p => p.name === prop || p.name === prop.charAt(0))
      const currentValue = currentProp?.value || ''

      if (currentValue === value) {
        // Already active, remove the property
        this.deps.onPropertyChange(prop, '__REMOVE__', 'toggle')
        return
      }
    }

    this.deps.onPropertyChange(prop, value, 'toggle')
  }

  private handleExpandClick(): void {
    if (this.container) {
      const sectionKey = 'sizing-minmax'
      const isExpanded = toggleExpanded(sectionKey)

      const minmaxSection = this.container.querySelector('[data-expand-container="size-minmax"]')
      if (minmaxSection) {
        minmaxSection.classList.toggle('expanded', isExpanded)
        // Also toggle on parent .pp-section for CSS purposes
        const section = minmaxSection.closest('.pp-section')
        if (section) {
          section.classList.toggle('expanded', isExpanded)
        }
      }
    }
  }

  /**
   * Called after the section is mounted to restore persisted expand states
   */
  afterMount(): void {
    if (this.container) {
      applyExpandedState(this.container, 'sizing-minmax', '[data-expand-container="size-minmax"]')
      this.setupScrubbing()
    }
  }

  /**
   * Clean up scrub instances before re-render
   */
  private cleanupScrubbing(): void {
    this.scrubInstances.forEach(instance => instance.destroy())
    this.scrubInstances = []
  }

  /**
   * Set up scrubbing on all scrubbable labels
   */
  private setupScrubbing(): void {
    this.cleanupScrubbing()

    if (!this.container) return

    // Find all elements with data-scrub attribute (rows or cells)
    const scrubElements = this.container.querySelectorAll('[data-scrub]')

    scrubElements.forEach(element => {
      // Support both old .pp-row-label and new .pp-cell-label
      const label = element.querySelector('.pp-cell-label, .pp-row-label') as HTMLElement
      const input = element.querySelector('input[type="text"]') as HTMLInputElement
      const property = element.getAttribute('data-scrub')

      if (!label || !input || !property) return

      // Get min/max from data attributes
      const min = element.hasAttribute('data-scrub-min')
        ? parseFloat(element.getAttribute('data-scrub-min')!)
        : 0 // Default min 0 for sizes
      const max = element.hasAttribute('data-scrub-max')
        ? parseFloat(element.getAttribute('data-scrub-max')!)
        : undefined

      const instance = makeScrubable({
        label,
        input,
        min,
        max,
        step: 1,
        allowDecimals: false,
        onChange: (value) => {
          this.deps.onPropertyChange(property, String(value), 'input')
        }
      })

      this.scrubInstances.push(instance)
    })
  }
}

/**
 * Factory function
 */
export function createSizingSection(deps: SectionDependencies): SizingSection {
  return new SizingSection(deps)
}

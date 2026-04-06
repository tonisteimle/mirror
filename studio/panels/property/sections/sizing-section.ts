/**
 * SizingSection - Width, Height, and Min/Max Constraints
 *
 * Handles:
 * - Width/Height with hug/full mode toggles
 * - Min/Max width/height constraints (expandable)
 * - Position x/y when in absolute container (future)
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap, PropertyCategory } from '../types'
import { escapeHtml } from '../utils'

/**
 * Size mode icons
 */
const SIZE_ICONS = {
  widthHug: `<svg class="icon" viewBox="0 0 14 14">
    <path d="M4 3v8M10 3v8M1 7h3M10 7h3"/>
  </svg>`,
  widthFull: `<svg class="icon" viewBox="0 0 14 14">
    <path d="M2 3v8M12 3v8M2 7h10"/>
  </svg>`,
  heightHug: `<svg class="icon" viewBox="0 0 14 14">
    <path d="M3 4h8M3 10h8M7 1v3M7 10v3"/>
  </svg>`,
  heightFull: `<svg class="icon" viewBox="0 0 14 14">
    <path d="M3 2h8M3 12h8M7 2v10"/>
  </svg>`,
  expand: `<svg class="icon" viewBox="0 0 14 14">
    <path d="M4 6l3 3 3-3"/>
  </svg>`
}

/**
 * SizingSection class
 */
export class SizingSection extends BaseSection {
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
      <div class="section">
        <div class="section-label">Size</div>
        <div class="section-content">
          ${xyRow}
          ${this.renderWidthRow(widthValue, widthIsHug, widthIsFull)}
          ${this.renderHeightRow(heightValue, heightIsHug, heightIsFull)}
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
            this.deps.onPropertyChange(prop, input.value, 'input')
          }
        }
      },
      // Min/max input change
      'input[data-prop="minw"], input[data-prop="maxw"], input[data-prop="minh"], input[data-prop="maxh"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const prop = input.getAttribute('data-prop')
          if (prop) {
            this.deps.onPropertyChange(prop, input.value, 'input')
          }
        }
      },
      // Position input change
      'input[data-prop="x"], input[data-prop="y"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const prop = input.getAttribute('data-prop')
          if (prop) {
            this.deps.onPropertyChange(prop, input.value, 'input')
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

  private renderWidthRow(value: string, isHug: boolean, isFull: boolean): string {
    return `
      <div class="prop-row">
        <span class="prop-label">Width</span>
        <div class="prop-content">
          <div class="toggle-group">
            <button class="toggle-btn ${isHug ? 'active' : ''}" data-size-mode="width-hug" title="Hug Content">
              ${SIZE_ICONS.widthHug}
            </button>
            <button class="toggle-btn ${isFull ? 'active' : ''}" data-size-mode="width-full" title="Fill Container">
              ${SIZE_ICONS.widthFull}
            </button>
          </div>
          <input type="text" class="prop-input" autocomplete="off" value="${escapeHtml(value)}" data-prop="width" placeholder="auto">
        </div>
      </div>
    `
  }

  private renderHeightRow(value: string, isHug: boolean, isFull: boolean): string {
    return `
      <div class="prop-row">
        <span class="prop-label">Height</span>
        <div class="prop-content">
          <div class="toggle-group">
            <button class="toggle-btn ${isHug ? 'active' : ''}" data-size-mode="height-hug" title="Hug Content">
              ${SIZE_ICONS.heightHug}
            </button>
            <button class="toggle-btn ${isFull ? 'active' : ''}" data-size-mode="height-full" title="Fill Container">
              ${SIZE_ICONS.heightFull}
            </button>
          </div>
          <input type="text" class="prop-input" autocomplete="off" value="${escapeHtml(value)}" data-prop="height" placeholder="auto">
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
      <div class="prop-row">
        <span class="prop-label">X</span>
        <div class="prop-content">
          <input type="text" class="prop-input" autocomplete="off" value="${escapeHtml(xValue)}" data-prop="x" placeholder="0">
        </div>
      </div>
      <div class="prop-row">
        <span class="prop-label">Y</span>
        <div class="prop-content">
          <input type="text" class="prop-input" autocomplete="off" value="${escapeHtml(yValue)}" data-prop="y" placeholder="0">
        </div>
      </div>
    `
  }

  private renderMinMaxSection(minW: string, maxW: string, minH: string, maxH: string, hasMinMax: boolean): string {
    return `
      <div class="section-content minmax-section${hasMinMax ? ' expanded' : ''}" data-expand-container="size-minmax">
        <div class="prop-row collapsed-row" data-expand-group="size-minmax">
          <span class="prop-label">Min/Max</span>
          <div class="prop-content">
            <button class="expand-btn" data-expand="size-minmax" title="Min/Max Constraints">
              ${SIZE_ICONS.expand}
            </button>
          </div>
        </div>
        <div class="prop-row expanded-row" data-expand-group="size-minmax">
          <span class="prop-label">Min W</span>
          <div class="prop-content">
            <input type="text" class="prop-input" autocomplete="off" value="${escapeHtml(minW)}" data-prop="minw" placeholder="none">
          </div>
        </div>
        <div class="prop-row expanded-row" data-expand-group="size-minmax">
          <span class="prop-label">Max W</span>
          <div class="prop-content">
            <input type="text" class="prop-input" autocomplete="off" value="${escapeHtml(maxW)}" data-prop="maxw" placeholder="none">
          </div>
        </div>
        <div class="prop-row expanded-row" data-expand-group="size-minmax">
          <span class="prop-label">Min H</span>
          <div class="prop-content">
            <input type="text" class="prop-input" autocomplete="off" value="${escapeHtml(minH)}" data-prop="minh" placeholder="none">
          </div>
        </div>
        <div class="prop-row expanded-row" data-expand-group="size-minmax">
          <span class="prop-label">Max H</span>
          <div class="prop-content">
            <input type="text" class="prop-input" autocomplete="off" value="${escapeHtml(maxH)}" data-prop="maxh" placeholder="none">
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
    this.deps.onPropertyChange(prop, value, 'toggle')
  }

  private handleExpandClick(): void {
    // Toggle expand state on the container
    if (this.container) {
      const minmaxSection = this.container.querySelector('[data-expand-container="size-minmax"]')
      if (minmaxSection) {
        minmaxSection.classList.toggle('expanded')
        // Also toggle on parent .section for CSS purposes
        const section = minmaxSection.closest('.section')
        if (section) {
          section.classList.toggle('expanded')
        }
      }
    }
  }
}

/**
 * Factory function
 */
export function createSizingSection(deps: SectionDependencies): SizingSection {
  return new SizingSection(deps)
}

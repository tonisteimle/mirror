/**
 * SizingSection - Width, Height, and Min/Max Constraints
 *
 * Simple readable layout with text labels.
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap } from '../types'
import { escapeHtml, validateInput } from '../utils'
import { makeScrubable, type ScrubInstance } from '../utils/scrub'

/**
 * Size mode icons
 */
const SIZE_ICONS = {
  widthHug: `<svg class="pp-icon" viewBox="0 0 14 14"><path d="M4 3v8M10 3v8M1 7h3M10 7h3"/></svg>`,
  widthFull: `<svg class="pp-icon" viewBox="0 0 14 14"><path d="M2 3v8M12 3v8M2 7h10"/></svg>`,
  heightHug: `<svg class="pp-icon" viewBox="0 0 14 14"><path d="M3 4h8M3 10h8M7 1v3M7 10v3"/></svg>`,
  heightFull: `<svg class="pp-icon" viewBox="0 0 14 14"><path d="M3 2h8M3 12h8M7 2v10"/></svg>`,
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

    // Find values
    const widthProp = props.find(p => p.name === 'width' || p.name === 'w')
    const heightProp = props.find(p => p.name === 'height' || p.name === 'h')
    const minWidthProp = props.find(p => p.name === 'min-width' || p.name === 'minw')
    const maxWidthProp = props.find(p => p.name === 'max-width' || p.name === 'maxw')
    const minHeightProp = props.find(p => p.name === 'min-height' || p.name === 'minh')
    const maxHeightProp = props.find(p => p.name === 'max-height' || p.name === 'maxh')

    const widthValue = widthProp?.value || ''
    const heightValue = heightProp?.value || ''
    const minWidthValue = minWidthProp?.value || ''
    const maxWidthValue = maxWidthProp?.value || ''
    const minHeightValue = minHeightProp?.value || ''
    const maxHeightValue = maxHeightProp?.value || ''

    const widthIsHug = widthValue === 'hug'
    const widthIsFull = widthValue === 'full'
    const heightIsHug = heightValue === 'hug'
    const heightIsFull = heightValue === 'full'

    // Position row if in positioned container
    const xyRow = data.isInPositionedContainer ? this.renderPositionRow(props) : ''

    return `
      <div class="pp-section">
        <div class="pp-section-label">Size</div>
        <div class="pp-section-content">
          ${xyRow}
          ${this.renderSizeRow('Width', 'width', widthValue, widthIsHug, widthIsFull, true)}
          ${this.renderSizeRow('Height', 'height', heightValue, heightIsHug, heightIsFull, true)}
          ${this.renderSimpleSizeRow('Min Width', 'minw', minWidthValue, 'none')}
          ${this.renderSimpleSizeRow('Max Width', 'maxw', maxWidthValue, 'none')}
          ${this.renderSimpleSizeRow('Min Height', 'minh', minHeightValue, 'none')}
          ${this.renderSimpleSizeRow('Max Height', 'maxh', maxHeightValue, 'none')}
        </div>
      </div>
    `
  }

  private renderSizeRow(label: string, prop: string, value: string, isHug: boolean, isFull: boolean, showToggle: boolean): string {
    const toggleHtml = showToggle ? `
      <div class="pp-toggle-group">
        <button class="pp-toggle-btn ${isHug ? 'active' : ''}" data-size-mode="${prop}-hug" title="Hug Content">
          ${prop === 'width' ? SIZE_ICONS.widthHug : SIZE_ICONS.heightHug}
        </button>
        <button class="pp-toggle-btn ${isFull ? 'active' : ''}" data-size-mode="${prop}-full" title="Fill Container">
          ${prop === 'width' ? SIZE_ICONS.widthFull : SIZE_ICONS.heightFull}
        </button>
      </div>
    ` : ''

    return `
      <div class="pp-row" data-scrub="${prop}" data-scrub-min="0">
        <span class="pp-row-label">${label}</span>
        <div class="pp-row-content">
          ${toggleHtml}
          <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(value)}" data-prop="${prop}" placeholder="auto">
        </div>
      </div>
    `
  }

  private renderSimpleSizeRow(label: string, prop: string, value: string, placeholder: string): string {
    return `
      <div class="pp-row" data-scrub="${prop}" data-scrub-min="0">
        <span class="pp-row-label">${label}</span>
        <div class="pp-row-content">
          <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(value)}" data-prop="${prop}" placeholder="${placeholder}">
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
      <div class="pp-row" data-scrub="x">
        <span class="pp-row-label">X</span>
        <div class="pp-row-content">
          <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(xValue)}" data-prop="x" placeholder="0">
        </div>
      </div>
      <div class="pp-row" data-scrub="y">
        <span class="pp-row-label">Y</span>
        <div class="pp-row-content">
          <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(yValue)}" data-prop="y" placeholder="0">
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      '[data-size-mode]': {
        click: (e: Event, target: HTMLElement) => {
          const mode = target.getAttribute('data-size-mode')
          if (mode) this.handleSizeModeToggle(mode)
        }
      },
      'input[data-prop]': {
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
      }
    }
  }

  private handleSizeModeToggle(mode: string): void {
    const [prop, value] = mode.split('-')
    const category = this.data?.category
    if (category) {
      const currentProp = category.properties.find(p => p.name === prop || p.name === prop.charAt(0))
      const currentValue = currentProp?.value || ''
      if (currentValue === value) {
        this.deps.onPropertyChange(prop, '__REMOVE__', 'toggle')
        return
      }
    }
    this.deps.onPropertyChange(prop, value, 'toggle')
  }

  afterMount(): void {
    if (this.container) {
      this.setupScrubbing()
    }
  }

  private cleanupScrubbing(): void {
    this.scrubInstances.forEach(instance => instance.destroy())
    this.scrubInstances = []
  }

  private setupScrubbing(): void {
    this.cleanupScrubbing()
    if (!this.container) return

    const scrubElements = this.container.querySelectorAll('[data-scrub]')
    scrubElements.forEach(element => {
      const label = element.querySelector('.pp-row-label') as HTMLElement
      const input = element.querySelector('input[type="text"]') as HTMLInputElement
      const property = element.getAttribute('data-scrub')

      if (!label || !input || !property) return

      const min = element.hasAttribute('data-scrub-min')
        ? parseFloat(element.getAttribute('data-scrub-min')!)
        : 0

      const instance = makeScrubable({
        label,
        input,
        min,
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

export function createSizingSection(deps: SectionDependencies): SizingSection {
  return new SizingSection(deps)
}

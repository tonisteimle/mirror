/**
 * Position Section - X, Y, Z for Stacked Containers
 *
 * Only renders when element is inside a stacked (absolute) container.
 * Provides controls for positioning elements within the stacked layout.
 */

import {
  BaseSection,
  type SectionDependencies,
  type SectionData,
  type EventHandlerMap,
} from '../base/section'

/**
 * Extended SectionData with positioning context
 */
interface PositionSectionData extends SectionData {
  isInPositionedContainer?: boolean
}

/**
 * Position fields configuration
 */
const POSITION_FIELDS = [
  { name: 'x', label: 'X', placeholder: '0' },
  { name: 'y', label: 'Y', placeholder: '0' },
  { name: 'z', label: 'Z', placeholder: '0' },
] as const

/**
 * Position Section class
 */
export class PositionSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Position' }, deps)
  }

  render(data: PositionSectionData): string {
    this.data = data

    // Only show when element is in a stacked container
    if (!data.isInPositionedContainer) {
      return ''
    }

    const allProps = data.allProperties || []

    // Get current position values
    const xProp = allProps.find(p => p.name === 'x')
    const yProp = allProps.find(p => p.name === 'y')
    const zProp = allProps.find(p => p.name === 'z')

    const xValue = xProp?.value || ''
    const yValue = yProp?.value || ''
    const zValue = zProp?.value || ''

    return `
      <div class="section">
        <div class="section-label">Position</div>
        <div class="section-content">
          <div class="prop-row">
            <span class="prop-label">X / Y</span>
            <div class="prop-content pp-position-inputs">
              <div class="pp-position-field">
                <span class="pp-position-label">X</span>
                <input type="text" class="prop-input pp-position-input" value="${this.deps.escapeHtml(xValue)}" data-position-field="x" placeholder="0" autocomplete="off">
              </div>
              <div class="pp-position-field">
                <span class="pp-position-label">Y</span>
                <input type="text" class="prop-input pp-position-input" value="${this.deps.escapeHtml(yValue)}" data-position-field="y" placeholder="0" autocomplete="off">
              </div>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Layer</span>
            <div class="prop-content">
              <input type="text" class="prop-input" value="${this.deps.escapeHtml(zValue)}" data-position-field="z" placeholder="0" autocomplete="off" style="width: 60px;">
            </div>
          </div>
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      'input[data-position-field]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const field = input.dataset.positionField
          if (field) {
            this.deps.onPropertyChange(field, input.value, 'input')
          }
        },
      },
    }
  }
}

/**
 * Factory function
 */
export function createPositionSection(deps: SectionDependencies): PositionSection {
  return new PositionSection(deps)
}

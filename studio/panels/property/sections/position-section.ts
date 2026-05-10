/**
 * Position Section - X, Y, Z
 *
 * Renders for stacked (absolute) parents and for grid parents (Slice 7 V-4).
 * Labels and placeholder differ:
 *   - stacked → "X" / "Y" (pixel offsets, default 0)
 *   - grid    → "Cell-X" / "Cell-Y" (grid-line index, default 1)
 * Z-Index ("Layer") only shown for stacked — grid containers don't use z.
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
  isInGridContainer?: boolean
}

/**
 * Position Section class
 */
export class PositionSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Position' }, deps)
  }

  render(data: PositionSectionData): string {
    this.data = data

    // Show for stacked OR grid parents (Slice 7 V-4 / B-5)
    if (!data.isInPositionedContainer && !data.isInGridContainer) {
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

    const inGrid = !!data.isInGridContainer
    const xLabel = inGrid ? 'Cell-X' : 'X'
    const yLabel = inGrid ? 'Cell-Y' : 'Y'
    const placeholder = inGrid ? '1' : '0'
    const sectionLabel = inGrid ? 'Grid Position' : 'Position'

    const layerRow = inGrid
      ? '' // grid children don't use z-index
      : `
          <div class="prop-row">
            <span class="prop-label">Layer</span>
            <div class="prop-content">
              <input type="text" class="prop-input" value="${this.deps.escapeHtml(zValue)}" data-position-field="z" placeholder="0" autocomplete="off" style="width: 60px;">
            </div>
          </div>`

    return `
      <div class="section">
        <div class="section-label">${sectionLabel}</div>
        <div class="section-content">
          <div class="prop-row">
            <span class="prop-label">${xLabel} / ${yLabel}</span>
            <div class="prop-content pp-position-inputs">
              <div class="pp-position-field">
                <span class="pp-position-label">${xLabel}</span>
                <input type="text" class="prop-input pp-position-input" value="${this.deps.escapeHtml(xValue)}" data-position-field="x" placeholder="${placeholder}" autocomplete="off">
              </div>
              <div class="pp-position-field">
                <span class="pp-position-label">${yLabel}</span>
                <input type="text" class="prop-input pp-position-input" value="${this.deps.escapeHtml(yValue)}" data-position-field="y" placeholder="${placeholder}" autocomplete="off">
              </div>
            </div>
          </div>${layerRow}
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

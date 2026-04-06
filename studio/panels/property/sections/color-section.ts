/**
 * ColorSection - Background and Text Color
 *
 * Handles:
 * - Background color with swatch and color picker trigger
 * - Text color with swatch and color picker trigger
 * - Token resolution for display
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap, ExtractedProperty } from '../types'
import { escapeHtml, resolveColorToken } from '../utils'

/**
 * ColorSection class
 */
export class ColorSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Color' }, deps)
  }

  render(data: SectionData): string {
    this.data = data

    // Get current bg and color values from allProperties
    const allProps = data.allProperties || []
    const bgProp = allProps.find((p: ExtractedProperty) => p.name === 'background' || p.name === 'bg')
    const colProp = allProps.find((p: ExtractedProperty) => p.name === 'color' || p.name === 'col' || p.name === 'c')
    const bgValue = bgProp?.value || ''
    const colValue = colProp?.value || ''

    // Check if properties are instance overrides
    const bgIsOverride = bgProp?.source === 'instance'
    const colIsOverride = colProp?.source === 'instance'

    // Format display values (show token name or hex)
    const bgDisplay = bgValue.startsWith('$') ? bgValue : (bgValue || 'none')
    const colDisplay = colValue.startsWith('$') ? colValue : (colValue || 'none')

    // Check if value is a token for styling
    const bgIsToken = bgValue.startsWith('$')
    const colIsToken = colValue.startsWith('$')

    // Get resolved color for swatch display (resolve tokens to actual color)
    const bgSwatchColor = bgIsToken ? resolveColorToken(bgValue, data) : bgValue
    const colSwatchColor = colIsToken ? resolveColorToken(colValue, data) : colValue

    return `
      <div class="pp-section">
        <div class="pp-section-label">Color</div>
        <div class="pp-section-content">
          ${this.renderColorRow('Background', 'bg', bgValue, bgDisplay, bgSwatchColor, bgIsToken, bgIsOverride)}
          ${this.renderColorRow('Text', 'color', colValue, colDisplay, colSwatchColor, colIsToken, colIsOverride)}
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      // Color trigger click - opens color picker
      '.pp-color-trigger': {
        click: (e: Event, target: HTMLElement) => {
          const colorProp = target.getAttribute('data-color-prop')
          const currentValue = target.getAttribute('data-current-value') || ''
          if (colorProp) {
            // Signal to open color picker
            this.deps.onPropertyChange('__COLOR_PICKER__', JSON.stringify({
              property: colorProp,
              currentValue,
              trigger: target
            }), 'toggle')
          }
        }
      }
    }
  }

  // ============================================
  // Private Render Methods
  // ============================================

  private renderColorRow(
    label: string,
    property: string,
    value: string,
    displayValue: string,
    swatchColor: string,
    isToken: boolean,
    isOverride: boolean
  ): string {
    return `
      <div class="pp-row${isOverride ? ' override' : ''}">
        <span class="pp-row-label">${escapeHtml(label)}</span>
        <div class="pp-row-content">
          <div class="pp-color-trigger" data-color-prop="${property}" data-current-value="${escapeHtml(value)}">
            <div class="pp-color-swatch${value ? '' : ' empty'}" style="${swatchColor ? `background: ${escapeHtml(swatchColor)}` : ''}"></div>
            <span class="pp-color-value${isToken ? ' token' : ''}">${escapeHtml(displayValue)}</span>
          </div>
        </div>
      </div>
    `
  }

}

/**
 * Factory function
 */
export function createColorSection(deps: SectionDependencies): ColorSection {
  return new ColorSection(deps)
}

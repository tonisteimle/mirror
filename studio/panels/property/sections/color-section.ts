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
import { escapeHtml } from '../utils'

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
    const bgSwatchColor = bgIsToken ? this.resolveTokenValue(bgValue, data) : bgValue
    const colSwatchColor = colIsToken ? this.resolveTokenValue(colValue, data) : colValue

    return `
      <div class="section">
        <div class="section-label">Color</div>
        <div class="section-content">
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
      <div class="prop-row${isOverride ? ' override' : ''}">
        <span class="prop-label">${escapeHtml(label)}</span>
        <div class="prop-content">
          <div class="pp-color-trigger" data-color-prop="${property}" data-current-value="${escapeHtml(value)}">
            <div class="pp-color-swatch${value ? '' : ' empty'}" style="${swatchColor ? `background: ${escapeHtml(swatchColor)}` : ''}"></div>
            <span class="pp-color-value${isToken ? ' token' : ''}">${escapeHtml(displayValue)}</span>
          </div>
        </div>
      </div>
    `
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Resolve a token value to its actual color
   * For now, just return the token name - the main PropertyPanel handles actual resolution
   */
  private resolveTokenValue(tokenRef: string, data: SectionData): string {
    // Look up in color tokens if available
    const colorTokens = data.colorTokens || []
    const token = colorTokens.find(t => `$${t.name}` === tokenRef)
    if (token) {
      return token.value
    }
    // Return empty string if not found - the main panel will resolve it
    return ''
  }
}

/**
 * Factory function
 */
export function createColorSection(deps: SectionDependencies): ColorSection {
  return new ColorSection(deps)
}

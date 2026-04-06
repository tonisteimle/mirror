/**
 * IconSection - Icon Element Properties
 *
 * Handles:
 * - Icon size with presets and input
 * - Icon color with color picker trigger
 * - Icon weight (stroke width)
 * - Fill toggle
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap, PropertyCategory } from '../types'
import { escapeHtml, resolveColorToken, validateInput } from '../utils'

/**
 * Icon size presets
 */
const ICON_SIZE_PRESETS = ['14', '16', '18', '20', '24', '32'] as const

/**
 * IconSection class
 */
export class IconSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Icon' }, deps)
  }

  render(data: SectionData): string {
    this.data = data
    const category = data.category
    if (!category) return ''

    const props = category.properties

    // Find icon properties
    const sizeProp = props.find(p => p.name === 'icon-size' || p.name === 'is')
    const colorProp = props.find(p => p.name === 'icon-color' || p.name === 'ic')
    const weightProp = props.find(p => p.name === 'icon-weight' || p.name === 'iw')
    const fillProp = props.find(p => p.name === 'fill')

    const sizeValue = sizeProp?.value || ''
    const colorValue = colorProp?.value || ''
    const weightValue = weightProp?.value || ''
    const fillActive = !!(fillProp && (fillProp.value === 'true' || (fillProp.value === '' && fillProp.hasValue !== false)))

    // Color display
    const colorIsToken = colorValue.startsWith('$')
    const colorDisplay = colorValue || 'none'
    const colorSwatch = colorIsToken ? resolveColorToken(colorValue, data) : colorValue

    return `
      <div class="pp-section">
        <div class="pp-section-label">Icon</div>
        <div class="pp-section-content">
          ${this.renderSizeRow(sizeValue)}
          ${this.renderColorRow(colorValue, colorDisplay, colorSwatch, colorIsToken)}
          ${this.renderWeightRow(weightValue)}
          ${this.renderFillRow(fillActive)}
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      // Size preset click
      '[data-icon-size]': {
        click: (e: Event, target: HTMLElement) => {
          const value = target.getAttribute('data-icon-size')
          if (value) {
            this.deps.onPropertyChange('is', value, 'token')
          }
        }
      },
      // Size input change
      'input[data-prop="is"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const result = validateInput(input, 'fs') // Use fs validation (numeric)
          if (result.valid) {
            this.deps.onPropertyChange('is', input.value, 'input')
          }
        }
      },
      // Color trigger click
      '[data-color-prop="ic"]': {
        click: (e: Event, target: HTMLElement) => {
          const currentValue = target.getAttribute('data-current-value') || ''
          this.deps.onPropertyChange('__COLOR_PICKER__', JSON.stringify({
            property: 'ic',
            currentValue,
            trigger: target
          }), 'toggle')
        }
      },
      // Weight input change
      'input[data-prop="iw"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const result = validateInput(input, 'fs') // Use fs validation (numeric)
          if (result.valid) {
            this.deps.onPropertyChange('iw', input.value, 'input')
          }
        }
      },
      // Fill toggle
      '[data-icon-fill]': {
        click: (e: Event, target: HTMLElement) => {
          this.deps.onPropertyChange('__ICON_FILL__', 'toggle', 'toggle')
        }
      }
    }
  }

  // ============================================
  // Private Render Methods
  // ============================================

  private renderSizeRow(sizeValue: string): string {
    const presets = ICON_SIZE_PRESETS.map(size => {
      const isActive = sizeValue === size
      return `<button class="pp-token-btn ${isActive ? 'active' : ''}" data-icon-size="${size}">${size}</button>`
    }).join('')

    return `
      <div class="pp-row">
        <span class="pp-row-label">Size</span>
        <div class="pp-row-content">
          <div class="pp-token-group">
            ${presets}
          </div>
          <input type="text" class="pp-input" value="${escapeHtml(sizeValue)}" data-prop="is" placeholder="24" autocomplete="off">
        </div>
      </div>
    `
  }

  private renderColorRow(
    colorValue: string,
    colorDisplay: string,
    colorSwatch: string,
    isToken: boolean
  ): string {
    return `
      <div class="pp-row">
        <span class="pp-row-label">Color</span>
        <div class="pp-row-content">
          <div class="pp-color-trigger" data-color-prop="ic" data-current-value="${escapeHtml(colorValue)}">
            <div class="pp-color-swatch${colorValue ? '' : ' empty'}" style="${colorSwatch ? `background: ${escapeHtml(colorSwatch)}` : ''}"></div>
            <span class="pp-color-value${isToken ? ' token' : ''}">${escapeHtml(colorDisplay)}</span>
          </div>
        </div>
      </div>
    `
  }

  private renderWeightRow(weightValue: string): string {
    return `
      <div class="pp-row">
        <span class="pp-row-label">Weight</span>
        <div class="pp-row-content">
          <input type="text" class="pp-input" value="${escapeHtml(weightValue)}" data-prop="iw" placeholder="1.5" autocomplete="off">
        </div>
      </div>
    `
  }

  private renderFillRow(fillActive: boolean): string {
    return `
      <div class="pp-row">
        <span class="pp-row-label">Fill</span>
        <div class="pp-row-content">
          <div class="pp-toggle-group">
            <button class="pp-toggle-btn ${fillActive ? 'active' : ''}" data-icon-fill="toggle" title="Fill icon">
              <svg class="pp-icon" viewBox="0 0 14 14">
                <circle cx="7" cy="7" r="5" fill="${fillActive ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `
  }

}

/**
 * Factory function
 */
export function createIconSection(deps: SectionDependencies): IconSection {
  return new IconSection(deps)
}

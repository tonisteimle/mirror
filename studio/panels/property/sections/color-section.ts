/**
 * Color Section - Background and Text Color
 *
 * Renders color picker triggers for background and text color.
 */

import { BaseSection, type SectionDependencies, type SectionData, type EventHandlerMap } from '../base/section'

/**
 * Color Section class
 */
export class ColorSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Color' }, deps)
  }

  render(data: SectionData): string {
    this.data = data

    // Get color values from allProperties
    const allProps = data.currentElement ? (data as any).allProperties || [] : []
    const bgProp = allProps.find((p: { name: string }) => p.name === 'background' || p.name === 'bg')
    const colProp = allProps.find((p: { name: string }) => p.name === 'color' || p.name === 'col' || p.name === 'c')
    const bgValue = bgProp?.value || ''
    const colValue = colProp?.value || ''

    // Check if properties are instance overrides
    const bgIsOverride = bgProp?.source === 'instance'
    const colIsOverride = colProp?.source === 'instance'

    // Format display values
    const bgDisplay = bgValue.startsWith('$') ? bgValue : (bgValue || 'none')
    const colDisplay = colValue.startsWith('$') ? colValue : (colValue || 'none')

    // Check if value is a token
    const bgIsToken = bgValue.startsWith('$')
    const colIsToken = colValue.startsWith('$')

    // Resolve tokens for swatch display
    const bgSwatchColor = bgIsToken ? (data.resolveTokenValue?.(bgValue) || bgValue) : bgValue
    const colSwatchColor = colIsToken ? (data.resolveTokenValue?.(colValue) || colValue) : colValue

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

  private renderColorRow(
    label: string,
    prop: string,
    value: string,
    display: string,
    swatchColor: string,
    isToken: boolean,
    isOverride: boolean
  ): string {
    return `
      <div class="prop-row${isOverride ? ' override' : ''}">
        <span class="prop-label">${label}</span>
        <div class="prop-content">
          <div class="pp-color-trigger" data-color-prop="${prop}" data-current-value="${this.deps.escapeHtml(value)}">
            <div class="pp-color-swatch${value ? '' : ' empty'}" style="${swatchColor ? `background: ${this.deps.escapeHtml(swatchColor)}` : ''}"></div>
            <span class="pp-color-value${isToken ? ' token' : ''}">${this.deps.escapeHtml(display)}</span>
          </div>
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      '[data-color-prop]': {
        click: (e: Event, target: HTMLElement) => {
          const prop = target.dataset.colorProp
          const currentValue = target.dataset.currentValue || ''
          if (prop) {
            this.deps.onPropertyChange('__COLOR_PICKER__', JSON.stringify({ property: prop, currentValue }), 'toggle')
          }
        }
      }
    }
  }
}

/**
 * Factory function
 */
export function createColorSection(deps: SectionDependencies): ColorSection {
  return new ColorSection(deps)
}

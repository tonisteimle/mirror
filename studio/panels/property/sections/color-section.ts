/**
 * Color Section - Background, Text, Icon, Border Color
 *
 * Renders color picker triggers based on primitive type.
 * Uses colorProps from SectionData to filter which colors to show.
 */

import {
  BaseSection,
  type SectionDependencies,
  type SectionData,
  type EventHandlerMap,
} from '../base/section'

/**
 * Color property configuration
 */
interface ColorPropConfig {
  prop: string // Property name in code (bg, col, ic, boc)
  label: string // Display label
  aliases: string[] // Alternative property names to search
}

const COLOR_PROPS: Record<string, ColorPropConfig> = {
  bg: { prop: 'bg', label: 'Background', aliases: ['background', 'bg'] },
  col: { prop: 'col', label: 'Text', aliases: ['color', 'col', 'c'] },
  ic: { prop: 'ic', label: 'Color', aliases: ['icon-color', 'ic'] },
  boc: { prop: 'boc', label: 'Border', aliases: ['border-color', 'boc'] },
}

/**
 * Color Section class
 */
export class ColorSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Color' }, deps)
  }

  render(data: SectionData): string {
    this.data = data

    // Determine which color properties to show
    const colorProps = data.colorProps || ['bg', 'col']
    const allProps = data.allProperties || []

    // Build rows for each color property
    const rows: string[] = []
    for (const propKey of colorProps) {
      const config = COLOR_PROPS[propKey]
      if (!config) continue

      // Find the property value
      const prop = allProps.find((p: { name: string }) => config.aliases.includes(p.name))
      const value = prop?.value || ''
      const isOverride = prop?.source === 'instance'
      const isToken = value.startsWith('$')
      const display = isToken ? value : value || 'none'
      const swatchColor = isToken ? data.resolveTokenValue?.(value, config.prop) || value : value

      rows.push(
        this.renderColorRow(
          config.label,
          config.prop,
          value,
          display,
          swatchColor,
          isToken,
          isOverride
        )
      )
    }

    if (rows.length === 0) return ''

    // Add fill toggle for Icon
    let fillToggle = ''
    if (data.primitive === 'Icon') {
      const fillProp = allProps.find((p: { name: string }) => p.name === 'fill')
      const isFilled = fillProp?.value === 'true' || fillProp?.value === ''
      fillToggle = `
        <div class="prop-row">
          <span class="prop-label">Fill</span>
          <div class="prop-content">
            <label class="pp-toggle">
              <input type="checkbox" data-toggle-prop="fill" ${isFilled ? 'checked' : ''}>
              <span class="pp-toggle-slider"></span>
            </label>
          </div>
        </div>
      `
    }

    // Use compact mode (no header) for simple primitives
    if (data.compact) {
      return `
        <div class="section">
          <div class="section-content">
            ${rows.join('')}
            ${fillToggle}
          </div>
        </div>
      `
    }

    return `
      <div class="section">
        <div class="section-label">Color</div>
        <div class="section-content">
          ${rows.join('')}
          ${fillToggle}
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
            this.deps.onPropertyChange(
              '__COLOR_PICKER__',
              JSON.stringify({ property: prop, currentValue }),
              'toggle'
            )
          }
        },
      },
      'input[data-toggle-prop="fill"]': {
        change: (e: Event, target: HTMLElement) => {
          const checkbox = target as HTMLInputElement
          this.deps.onToggleProperty('fill', !checkbox.checked)
        },
      },
    }
  }
}

/**
 * Factory function
 */
export function createColorSection(deps: SectionDependencies): ColorSection {
  return new ColorSection(deps)
}

/**
 * Border Section - Radius and Border
 *
 * Renders radius and border controls with token support.
 */

import {
  BaseSection,
  type SectionDependencies,
  type SectionData,
  type EventHandlerMap,
} from '../base/section'
import type { SpacingToken } from '../types'

/**
 * Circle icon for full radius button
 */
const CIRCLE_ICON = `<svg class="icon" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5"/></svg>`

/**
 * Border Section class
 */
export class BorderSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Border' }, deps)
  }

  render(data: SectionData): string {
    this.data = data
    const category = data.category
    if (!category) return ''

    const props = category.properties

    // Get radius value
    const radiusProp = props.find(p => p.name === 'radius' || p.name === 'rad')
    const radiusValue = radiusProp?.value || ''
    const radiusIsOverride = radiusProp?.source === 'instance'

    // Get border value and extract width and color
    const borderProp = props.find(p => p.name === 'border' || p.name === 'bor')
    const borderValue = borderProp?.value || ''
    const borderParts = borderValue.split(/\s+/).filter(Boolean)
    const borderWidth = borderParts[0] || '0'
    const borderColor = borderParts.find(p => p.startsWith('#') || p.startsWith('$')) || ''
    const borderIsOverride = borderProp?.source === 'instance'

    // Border color display
    const borderColorIsToken = borderColor.startsWith('$')
    const borderColorSwatch = borderColorIsToken
      ? data.resolveTokenValue?.(borderColor, 'boc') || borderColor
      : borderColor

    // Get radius tokens
    const radiusTokens = data.spacingTokens?.filter(t => t.fullName.endsWith('.rad')) || []

    return `
      ${this.renderRadiusSection(radiusValue, radiusIsOverride, radiusTokens)}
      ${this.renderBorderSection(borderWidth, borderColor, borderColorSwatch, borderIsOverride)}
    `
  }

  private renderRadiusSection(
    radiusValue: string,
    isOverride: boolean,
    tokens: SpacingToken[]
  ): string {
    const isTokenRef = radiusValue.startsWith('$')

    // Resolve token value for display - show resolved value in input
    let radiusDisplayValue = radiusValue
    let radiusInputClass = 'prop-input'
    if (isTokenRef && this.data?.resolveTokenValue) {
      // Pass 'rad' as property type for short references like "$s" → "$s.rad"
      const resolved = this.data.resolveTokenValue(radiusValue, 'rad')
      if (resolved) {
        radiusDisplayValue = resolved // Show pixel value in input
        radiusInputClass = 'prop-input token-resolved'
      }
    }

    // Token buttons including 0 preset
    const tokenButtons = [
      { label: '0', value: '0', tokenRef: '' },
      ...tokens.map(t => ({ label: t.name, value: t.value, tokenRef: `$${t.fullName}` })),
    ]
      .map(token => {
        const isActive = isTokenRef ? radiusValue === token.tokenRef : radiusValue === token.value
        const title = token.tokenRef ? `${token.tokenRef}: ${token.value}` : token.value
        return `<button class="token-btn ${isActive ? 'active' : ''}" data-radius="${token.value}" data-token-ref="${token.tokenRef}" title="${title}">${token.label}</button>`
      })
      .join('')

    // Full radius button (999)
    const fullRadiusActive = radiusValue === '999'
    const fullRadiusBtn = `<button class="token-btn ${fullRadiusActive ? 'active' : ''}" data-radius="999" title="Full: 999">${CIRCLE_ICON}</button>`

    return `
      <div class="section">
        <div class="section-label">
          <span>Radius</span>
          <button class="section-expand-btn" data-expand="radius" title="Toggle corner details">
            <svg class="icon icon-collapsed" viewBox="0 0 14 14">
              <path d="M4 6l3 3 3-3"/>
            </svg>
            <svg class="icon icon-expanded" viewBox="0 0 14 14">
              <path d="M4 8l3-3 3 3"/>
            </svg>
          </button>
        </div>
        <div class="section-content" data-expand-container="radius">
          <div class="prop-row collapsed-row${isOverride ? ' override' : ''}" data-expand-group="radius">
            <span class="prop-label">All</span>
            <div class="prop-content">
              <div class="token-group">
                ${tokenButtons}
                ${fullRadiusBtn}
              </div>
              <input type="text" class="${radiusInputClass}" autocomplete="off" value="${this.deps.escapeHtml(radiusDisplayValue)}" data-prop="radius" data-token-ref="${isTokenRef ? this.deps.escapeHtml(radiusValue) : ''}" placeholder="0">
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="radius">
            <div class="corner-radius-grid">
              ${this.renderCornerInput('TL', 'tl', radiusDisplayValue, isTokenRef)}
              ${this.renderCornerInput('TR', 'tr', radiusDisplayValue, isTokenRef)}
              ${this.renderCornerInput('BL', 'bl', radiusDisplayValue, isTokenRef)}
              ${this.renderCornerInput('BR', 'br', radiusDisplayValue, isTokenRef)}
            </div>
          </div>
        </div>
      </div>
    `
  }

  private renderCornerInput(
    label: string,
    corner: string,
    value: string,
    isTokenRef: boolean = false
  ): string {
    const title =
      {
        TL: 'Top Left',
        TR: 'Top Right',
        BL: 'Bottom Left',
        BR: 'Bottom Right',
      }[label] || label

    const inputClass = isTokenRef ? 'prop-input token-resolved' : 'prop-input'

    return `
      <div class="corner-input">
        <span class="corner-label" title="${title}">${label}</span>
        <input type="text" class="${inputClass}" autocomplete="off" value="${this.deps.escapeHtml(value)}" data-radius-corner="${corner}" placeholder="0">
      </div>
    `
  }

  private renderBorderSection(
    borderWidth: string,
    borderColor: string,
    borderColorSwatch: string,
    isOverride: boolean
  ): string {
    const borderWidths = ['0', '1', '2']
    const widthToggles = borderWidths
      .map(w => {
        const isActive = borderWidth === w
        return `<button class="toggle-btn ${isActive ? 'active' : ''}" data-border-width="${w}" title="${w}px">${w}</button>`
      })
      .join('')

    const colorTrigger = `
      <div class="pp-color-trigger pp-color-trigger-compact" data-border-color-prop="bor" data-border-width="${borderWidth}" data-current-value="${this.deps.escapeHtml(borderColor)}">
        <div class="pp-color-swatch${borderColor ? '' : ' empty'}" style="${borderColorSwatch ? `background: ${this.deps.escapeHtml(borderColorSwatch)}` : ''}"></div>
      </div>
    `

    return `
      <div class="section">
        <div class="section-label">
          <span>Border</span>
          <button class="section-expand-btn" data-expand="border" title="Toggle side details">
            <svg class="icon icon-collapsed" viewBox="0 0 14 14">
              <path d="M4 6l3 3 3-3"/>
            </svg>
            <svg class="icon icon-expanded" viewBox="0 0 14 14">
              <path d="M4 8l3-3 3 3"/>
            </svg>
          </button>
        </div>
        <div class="section-content" data-expand-container="border">
          <div class="prop-row collapsed-row${isOverride ? ' override' : ''}" data-expand-group="border">
            <span class="prop-label">All</span>
            <div class="prop-content">
              <div class="toggle-group">${widthToggles}</div>
              ${colorTrigger}
            </div>
          </div>
          ${this.renderBorderSideRow('Top', 't', borderWidth, borderColor, borderColorSwatch)}
          ${this.renderBorderSideRow('Right', 'r', borderWidth, borderColor, borderColorSwatch)}
          ${this.renderBorderSideRow('Bottom', 'b', borderWidth, borderColor, borderColorSwatch)}
          ${this.renderBorderSideRow('Left', 'l', borderWidth, borderColor, borderColorSwatch)}
        </div>
      </div>
    `
  }

  private renderBorderSideRow(
    label: string,
    side: string,
    borderWidth: string,
    borderColor: string,
    borderColorSwatch: string
  ): string {
    const borderWidths = ['0', '1', '2']
    const widthToggles = borderWidths
      .map(w => {
        const isActive = borderWidth === w
        return `<button class="toggle-btn ${isActive ? 'active' : ''}" data-border-width="${w}" title="${w}px">${w}</button>`
      })
      .join('')

    return `
      <div class="prop-row expanded-row side-detail" data-expand-group="border">
        <span class="prop-label">${label}</span>
        <div class="prop-content">
          <div class="toggle-group">${widthToggles}</div>
          <div class="pp-color-trigger pp-color-trigger-compact" data-border-color-prop="bor-${side}" data-border-width="${borderWidth}" data-current-value="${this.deps.escapeHtml(borderColor)}">
            <div class="pp-color-swatch${borderColor ? '' : ' empty'}" style="${borderColorSwatch ? `background: ${this.deps.escapeHtml(borderColorSwatch)}` : ''}"></div>
          </div>
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      '.token-btn[data-radius]': {
        click: (e: Event, target: HTMLElement) => {
          const tokenRef = target.dataset.tokenRef
          const value = tokenRef || target.dataset.radius
          if (value) {
            this.deps.onPropertyChange('radius', value, 'token')
          }
        },
      },
      'input[data-prop="radius"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          this.deps.onPropertyChange('radius', input.value, 'input')
        },
      },
      'input[data-radius-corner]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const corner = input.dataset.radiusCorner
          if (corner) {
            this.deps.onPropertyChange(
              '__RADIUS_CORNER__',
              JSON.stringify({ corner, value: input.value }),
              'input'
            )
          }
        },
      },
      '.toggle-btn[data-border-width]': {
        click: (e: Event, target: HTMLElement) => {
          const width = target.dataset.borderWidth
          if (width) {
            this.deps.onPropertyChange('__BORDER_WIDTH__', width, 'toggle')
          }
        },
      },
      '[data-border-color-prop]': {
        click: (e: Event, target: HTMLElement) => {
          const prop = target.dataset.borderColorProp
          const currentValue = target.dataset.currentValue || ''
          const borderWidth = target.dataset.borderWidth || '1'
          if (prop) {
            this.deps.onPropertyChange(
              '__BORDER_COLOR_PICKER__',
              JSON.stringify({ property: prop, currentValue, borderWidth }),
              'toggle'
            )
          }
        },
      },
    }
  }
}

/**
 * Factory function
 */
export function createBorderSection(deps: SectionDependencies): BorderSection {
  return new BorderSection(deps)
}

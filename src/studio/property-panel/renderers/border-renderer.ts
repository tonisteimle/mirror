/**
 * BorderRenderer - Renders border and radius properties
 *
 * Handles border width, color, and radius with token support.
 * Uses PropertyValueService for compound property handling.
 */

import { BasePropertyRenderer } from './base-renderer'
import type { PropertyCategory, RenderContext, TokenPreset, ColorToken, ITokenService, EventHandlers } from '../interfaces'
import type { PropertyValueService } from '../services/property-value-service'
import * as htmlUtils from '../utils/html-utils'

/**
 * Default radius token presets
 */
const DEFAULT_RADIUS_TOKENS: readonly TokenPreset[] = [
  { label: '0', value: '0' },
  { label: 's', value: '4', tokenRef: '$s.rad' },
  { label: 'm', value: '8', tokenRef: '$m.rad' },
  { label: 'l', value: '16', tokenRef: '$l.rad' },
]

/**
 * BorderRenderer
 *
 * Renders radius controls and border width/color controls.
 */
export class BorderRenderer extends BasePropertyRenderer {
  /**
   * Render the border section
   */
  render(category: PropertyCategory, context: RenderContext): string {
    return this.safeRender('border', () => this.renderBorderSection(category, context))
  }

  /**
   * Render the complete border section
   */
  private renderBorderSection(category: PropertyCategory, context: RenderContext): string {
    const props = category.properties

    // Get radius value
    const radiusProp = this.findProperty(props, 'radius', 'rad')
    const radiusValue = radiusProp?.value || ''

    // Get border value
    const borderProp = this.findProperty(props, 'border', 'bor')
    const borderValue = borderProp?.value || ''
    const borderParts = this.parseShorthand(borderValue)
    const borderWidth = borderParts[0] || '0'

    // Check for overrides
    const radiusIsOverride = radiusProp?.source === 'instance'
    const borderIsOverride = borderProp?.source === 'instance'

    // Get radius tokens
    const radiusTokens = this.getRadiusTokens()

    return `
      <div class="section" data-category="border">
        <div class="section-label">Border</div>
        <div class="section-content" data-expand-container="radius">
          ${this.renderRadiusRow(radiusValue, radiusTokens, radiusIsOverride)}
          ${this.renderExpandedRadiusRows(radiusValue, radiusTokens, radiusIsOverride)}
          ${this.renderBorderWidthRow(borderWidth, borderIsOverride)}
          ${this.renderBorderColorRow(borderValue, borderIsOverride)}
        </div>
      </div>
    `
  }

  /**
   * Get radius tokens from token service or defaults
   */
  private getRadiusTokens(): TokenPreset[] {
    const dynamicTokens = this.tokenService.getRadiusTokens()
    if (dynamicTokens.length > 0) {
      return [
        { label: '0', value: '0' },
        ...dynamicTokens.map(t => ({
          label: t.name,
          value: t.value,
          tokenRef: `$${t.fullName}`
        }))
      ]
    }
    return [...DEFAULT_RADIUS_TOKENS]
  }

  /**
   * Render radius row (collapsed mode)
   */
  private renderRadiusRow(radiusValue: string, tokens: TokenPreset[], isOverride: boolean = false): string {
    const isTokenRef = this.isTokenRef(radiusValue)

    const tokenButtons = tokens.map(token => {
      const active = isTokenRef
        ? radiusValue === token.tokenRef
        : radiusValue === token.value

      return this.renderTokenButton({
        label: token.label,
        value: token.value,
        tokenRef: token.tokenRef,
        dataAttr: 'radius',
        active,
        ariaLabel: `Radius ${token.label}`
      })
    })

    // Add full radius button
    const fullActive = radiusValue === '999'
    tokenButtons.push(`
      <button class="token-btn ${fullActive ? 'active' : ''}"
              data-radius="999"
              title="Full: 999"
              role="radio"
              aria-checked="${fullActive}"
              aria-label="Full radius">
        <svg class="icon" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5"/></svg>
      </button>
    `)

    const input = this.renderInput({
      value: radiusValue,
      dataAttr: 'prop',
      dataValue: 'radius',
      placeholder: '0',
      ariaLabel: 'Border radius'
    })

    const expandBtn = `
      <button class="toggle-btn expand-btn" data-expand="radius" title="Expand"
              aria-label="Expand radius controls" aria-expanded="false">
        <svg class="icon" viewBox="0 0 14 14"><path d="M4 6l3 3 3-3"/></svg>
      </button>
    `

    return this.renderPropertyRow({
      label: 'Radius',
      content: `${this.renderTokenGroup(tokenButtons)}${input}${expandBtn}`,
      isOverride
    })
  }

  /**
   * Render expanded radius corner rows
   */
  private renderExpandedRadiusRows(radiusValue: string, tokens: TokenPreset[], isOverride: boolean = false): string {
    const corners: { label: string; corner: string }[] = [
      { label: 'Top Left', corner: 'tl' },
      { label: 'Top Right', corner: 'tr' },
      { label: 'Bottom Right', corner: 'br' },
      { label: 'Bottom Left', corner: 'bl' },
    ]

    const overrideClass = isOverride ? ' override' : ''
    return corners.map(({ label, corner }) => {
      const tokenButtons = tokens.map(token => {
        return this.renderTokenButton({
          label: token.label,
          value: token.value,
          tokenRef: token.tokenRef,
          dataAttr: 'radius-corner-token',
          active: false, // Individual corners would need separate tracking
          ariaLabel: `${label} radius ${token.label}`
        })
      })

      const input = this.renderInput({
        value: radiusValue, // Use same value for now
        dataAttr: 'radius-corner',
        dataValue: corner,
        placeholder: '0',
        ariaLabel: `${label} radius`
      })

      return `
        <div class="prop-row expanded-row${overrideClass}" data-expand-group="radius">
          <span class="prop-label">${this.escapeHtml(label)}</span>
          <div class="prop-content">
            ${this.renderTokenGroup(tokenButtons)}
            ${input}
          </div>
        </div>
      `
    }).join('')
  }

  /**
   * Render border width row
   */
  private renderBorderWidthRow(borderWidth: string, isOverride: boolean = false): string {
    const widths = ['0', '1', '2']

    const buttons = widths.map(w => {
      const active = borderWidth === w
      return this.renderToggleButton({
        active,
        dataAttr: 'border-width',
        dataValue: w,
        title: `${w}px`,
        label: w,
        ariaLabel: `Border width ${w}px`
      })
    })

    return this.renderPropertyRow({
      label: 'Border',
      content: this.renderToggleGroup(buttons),
      isOverride
    })
  }

  /**
   * Render border color row with token support
   */
  private renderBorderColorRow(borderValue: string, isOverride: boolean = false): string {
    const parts = this.parseShorthand(borderValue)
    // Border format: width [style] [color]
    const borderColor = parts.find(p => p.startsWith('#') || p.startsWith('$')) || '#333'

    // Get border color tokens
    const bocTokens = this.tokenService.getBocTokens()
    const resolvedColor = this.resolveBorderColor(borderColor, bocTokens)

    return htmlUtils.renderColorPropertyRow({
      label: 'Border Color',
      dataProp: 'border-color',
      currentValue: borderColor,
      resolvedColor,
      tokens: bocTokens,
      isOverride
    })
  }

  /**
   * Resolve border color value
   */
  private resolveBorderColor(value: string, tokens: ColorToken[]): string {
    if (!value) return '#333'

    // If it's already a hex color, return as-is
    if (value.startsWith('#')) {
      return value
    }

    // If it's a token reference, find the color value
    if (value.startsWith('$')) {
      const tokenName = value.slice(1)
      const token = tokens.find(t => t.name === tokenName)
      if (token) {
        return token.value
      }

      // Try to resolve via token service
      const resolved = this.tokenService.resolveTokenValue(value)
      if (resolved && resolved.startsWith('#')) {
        return resolved
      }
    }

    return value
  }

  /**
   * Attach event listeners
   */
  attachEventListeners(container: HTMLElement, context: RenderContext): void {
    // Expand/collapse buttons
    this.addEventListeners(
      container,
      '.expand-btn[data-expand="radius"]',
      'click',
      (element) => {
        const expandContainer = container.querySelector('[data-expand-container="radius"]')
        if (expandContainer) {
          expandContainer.classList.toggle('expanded')
          const isExpanded = expandContainer.classList.contains('expanded')
          element.setAttribute('aria-expanded', String(isExpanded))
        }
      },
      'handleExpandClick'
    )

    // Radius tokens
    this.addEventListeners(
      container,
      '.token-btn[data-radius]',
      'click',
      (element) => {
        const tokenRef = element.dataset.tokenRef
        const value = tokenRef || element.dataset.radius
        if (value) {
          this.eventHandlers.onPropertyChange(context.nodeId, 'rad', value)
        }
      },
      'handleRadiusTokenClick'
    )

    // Border width toggles
    this.addEventListeners(
      container,
      '[data-border-width]',
      'click',
      (element) => {
        const width = element.dataset.borderWidth
        if (width === '0') {
          this.eventHandlers.onPropertyRemove(context.nodeId, 'bor')
        } else {
          // Use setPropertyValue with 'width' part to preserve color
          this.setPropertyValue(context.nodeId, 'bor', width, 'width')
        }
      },
      'handleBorderWidthToggle'
    )

    // Border color token swatches (new small swatches)
    this.addEventListeners(
      container,
      '.color-prop-row[data-color-prop="border-color"] .color-swatch-sm',
      'click',
      (element) => {
        const token = element.dataset.token
        if (token) {
          // Use setPropertyValue with 'color' part to preserve width
          this.setPropertyValue(context.nodeId, 'bor', token, 'color')
        }
      },
      'handleBorderColorSwatchSmClick'
    )

    // Border color text input
    this.addEventListeners(
      container,
      '.color-prop-row[data-color-prop="border-color"] input[type="text"]',
      'change',
      (element) => {
        const input = element as HTMLInputElement
        if (input.value) {
          // Use setPropertyValue with 'color' part to preserve width
          this.setPropertyValue(context.nodeId, 'bor', input.value, 'color')
        }
      },
      'handleBorderColorInputChange'
    )

    // Border color picker
    this.addEventListeners(
      container,
      '.color-prop-row[data-color-prop="border-color"] .color-picker',
      'input',
      (element) => {
        const input = element as HTMLInputElement
        const textInput = input.parentElement?.querySelector('input[type="text"]') as HTMLInputElement

        if (input.value) {
          // Update text input
          if (textInput) {
            textInput.value = input.value
          }
          // Update preview
          const preview = input.parentElement?.querySelector('.color-preview') as HTMLElement
          if (preview) {
            preview.style.background = input.value
          }
          // Use setPropertyValue with 'color' part to preserve width
          this.setPropertyValue(context.nodeId, 'bor', input.value, 'color')
        }
      },
      'handleBorderColorPickerInput'
    )

    // Legacy border color swatches (for backwards compatibility)
    this.addEventListeners(
      container,
      '.color-swatch[data-color-prop="border-color"]',
      'click',
      (element) => {
        const color = element.dataset.color
        if (color) {
          // Use setPropertyValue with 'color' part to preserve width
          this.setPropertyValue(context.nodeId, 'bor', color, 'color')
        }
      },
      'handleBorderColorSwatchClick'
    )

    // Radius input
    const radiusInput = container.querySelector('input[data-prop="radius"]') as HTMLInputElement
    if (radiusInput) {
      this.addEventListener(radiusInput, 'change', (e) => {
        const value = (e.target as HTMLInputElement).value
        this.eventHandlers.onPropertyChange(context.nodeId, 'rad', value)
      }, 'handleRadiusInputChange')
    }
  }
}

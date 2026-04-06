/**
 * BorderSection - Radius and Border
 *
 * Simple readable layout with text labels.
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap, SpacingToken } from '../types'
import { escapeHtml, resolveColorToken, validateInput } from '../utils'
import { makeScrubable, type ScrubInstance } from '../utils/scrub'

/**
 * Circle icon for full radius
 */
const CIRCLE_ICON = `<svg class="pp-icon" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5"/></svg>`

/**
 * BorderSection class
 */
export class BorderSection extends BaseSection {
  private scrubInstances: ScrubInstance[] = []

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

    // Get border value and extract width and color
    const borderProp = props.find(p => p.name === 'border' || p.name === 'bor')
    const borderValue = borderProp?.value || ''
    const borderParts = borderValue.split(/\s+/).filter(Boolean)
    const borderWidth = borderParts[0] || '0'
    const borderColor = borderParts.find(p => p.startsWith('#') || p.startsWith('$')) || ''

    // Border color display
    const borderColorIsToken = borderColor.startsWith('$')
    const borderColorSwatch = borderColorIsToken ? resolveColorToken(borderColor, data) : borderColor

    // Get radius tokens
    const radiusTokens = data.spacingTokens?.filter(t => t.fullName.endsWith('.rad')) || []

    return `
      ${this.renderRadiusSection(radiusValue, radiusTokens)}
      ${this.renderBorderSection(borderWidth, borderColor, borderColorSwatch)}
    `
  }

  private renderRadiusSection(radiusValue: string, tokens: SpacingToken[]): string {
    const isTokenRef = radiusValue.startsWith('$')

    // Build token buttons including 0 preset
    const tokenButtons = [
      { label: '0', value: '0', tokenRef: '' },
      ...tokens.map(t => ({ label: t.name, value: t.value, tokenRef: `$${t.fullName}` }))
    ].map(token => {
      const isActive = isTokenRef
        ? (radiusValue === token.tokenRef)
        : (radiusValue === token.value)
      const title = token.tokenRef ? `${token.tokenRef}: ${token.value}` : token.value
      return `<button class="pp-token-btn ${isActive ? 'active' : ''}" data-radius="${escapeHtml(token.value)}" data-token-ref="${escapeHtml(token.tokenRef)}" title="${escapeHtml(title)}">${escapeHtml(token.label)}</button>`
    }).join('')

    // Full radius button (999)
    const fullRadiusActive = radiusValue === '999'
    const fullRadiusBtn = `<button class="pp-token-btn ${fullRadiusActive ? 'active' : ''}" data-radius="999" title="Full: 999">${CIRCLE_ICON}</button>`

    return `
      <div class="pp-section">
        <div class="pp-section-label">Radius</div>
        <div class="pp-section-content">
          <div class="pp-row" data-scrub="radius">
            <span class="pp-row-label">All</span>
            <div class="pp-row-content">
              <div class="pp-token-group">
                ${tokenButtons}
                ${fullRadiusBtn}
              </div>
              <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(radiusValue)}" data-prop="radius" placeholder="0">
            </div>
          </div>
          <div class="pp-row" data-scrub="radius-tl">
            <span class="pp-row-label">Top Left</span>
            <div class="pp-row-content">
              <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(radiusValue)}" data-radius-corner="tl" placeholder="0">
            </div>
          </div>
          <div class="pp-row" data-scrub="radius-tr">
            <span class="pp-row-label">Top Right</span>
            <div class="pp-row-content">
              <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(radiusValue)}" data-radius-corner="tr" placeholder="0">
            </div>
          </div>
          <div class="pp-row" data-scrub="radius-bl">
            <span class="pp-row-label">Bottom Left</span>
            <div class="pp-row-content">
              <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(radiusValue)}" data-radius-corner="bl" placeholder="0">
            </div>
          </div>
          <div class="pp-row" data-scrub="radius-br">
            <span class="pp-row-label">Bottom Right</span>
            <div class="pp-row-content">
              <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(radiusValue)}" data-radius-corner="br" placeholder="0">
            </div>
          </div>
        </div>
      </div>
    `
  }

  private renderBorderSection(borderWidth: string, borderColor: string, borderColorSwatch: string): string {
    // Border width toggles
    const borderWidths = ['0', '1', '2']
    const widthToggles = borderWidths.map(w => {
      const isActive = borderWidth === w
      return `<button class="pp-toggle-btn ${isActive ? 'active' : ''}" data-border-width="${w}" title="${w}px">${w}</button>`
    }).join('')

    // Color trigger
    const colorTrigger = `
      <div class="pp-color-trigger" data-border-color-prop="bor" data-border-width="${borderWidth}" data-current-value="${escapeHtml(borderColor)}">
        <div class="pp-color-swatch${borderColor ? '' : ' empty'}" style="${borderColorSwatch ? `background: ${escapeHtml(borderColorSwatch)}` : ''}"></div>
      </div>
    `

    return `
      <div class="pp-section">
        <div class="pp-section-label">Border</div>
        <div class="pp-section-content">
          <div class="pp-row">
            <span class="pp-row-label">Width</span>
            <div class="pp-row-content">
              <div class="pp-toggle-group">
                ${widthToggles}
              </div>
            </div>
          </div>
          <div class="pp-row">
            <span class="pp-row-label">Color</span>
            <div class="pp-row-content">
              ${colorTrigger}
            </div>
          </div>
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      '[data-radius]': {
        click: (e: Event, target: HTMLElement) => {
          const tokenRef = target.getAttribute('data-token-ref')
          const value = tokenRef || target.getAttribute('data-radius')
          if (value) {
            this.deps.onPropertyChange('radius', value, 'token')
          }
        }
      },
      'input[data-prop="radius"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const result = validateInput(input, 'radius')
          if (result.valid) {
            this.deps.onPropertyChange('radius', input.value, 'input')
          }
        }
      },
      'input[data-radius-corner]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const corner = input.getAttribute('data-radius-corner')
          if (corner) {
            const result = validateInput(input, 'radius')
            if (result.valid) {
              this.deps.onPropertyChange('__RADIUS_CORNER__', JSON.stringify({
                corner,
                value: input.value
              }), 'input')
            }
          }
        }
      },
      '[data-border-width]': {
        click: (e: Event, target: HTMLElement) => {
          const width = target.getAttribute('data-border-width')
          if (width) {
            this.deps.onPropertyChange('__BORDER_WIDTH__', width, 'toggle')
          }
        }
      },
      '[data-border-color-prop]': {
        click: (e: Event, target: HTMLElement) => {
          const prop = target.getAttribute('data-border-color-prop')
          const currentValue = target.getAttribute('data-current-value') || ''
          const borderWidth = target.getAttribute('data-border-width') || '1'
          if (prop) {
            this.deps.onPropertyChange('__BORDER_COLOR_PICKER__', JSON.stringify({
              property: prop,
              currentValue,
              borderWidth
            }), 'toggle')
          }
        }
      }
    }
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

    const rows = this.container.querySelectorAll('[data-scrub]')
    rows.forEach(row => {
      const label = row.querySelector('.pp-row-label') as HTMLElement
      const input = row.querySelector('input[type="text"]') as HTMLInputElement
      const property = row.getAttribute('data-scrub')

      if (!label || !input || !property) return

      const instance = makeScrubable({
        label,
        input,
        min: 0,
        step: 1,
        allowDecimals: false,
        onChange: (value) => {
          if (property.startsWith('radius-')) {
            const corner = property.replace('radius-', '')
            this.deps.onPropertyChange('__RADIUS_CORNER__', JSON.stringify({
              corner,
              value: String(value)
            }), 'input')
          } else {
            this.deps.onPropertyChange(property, String(value), 'input')
          }
        }
      })

      this.scrubInstances.push(instance)
    })
  }
}

export function createBorderSection(deps: SectionDependencies): BorderSection {
  return new BorderSection(deps)
}

/**
 * BorderSection - Radius and Border
 *
 * Handles:
 * - Border radius with token presets and per-corner expansion
 * - Border width with toggles
 * - Border color with color picker trigger
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap, PropertyCategory, SpacingToken } from '../types'
import { escapeHtml } from '../utils'

/**
 * Expand icons
 */
const EXPAND_ICONS = {
  collapsed: `<svg class="icon icon-collapsed" viewBox="0 0 14 14">
    <path d="M4 6l3 3 3-3"/>
  </svg>`,
  expanded: `<svg class="icon icon-expanded" viewBox="0 0 14 14">
    <path d="M4 8l3-3 3 3"/>
  </svg>`
}

/**
 * Circle icon for full radius
 */
const CIRCLE_ICON = `<svg class="icon" viewBox="0 0 14 14">
  <circle cx="7" cy="7" r="5"/>
</svg>`

/**
 * BorderSection class
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
    // Color is the second part (or look for # or $)
    const borderColor = borderParts.find(p => p.startsWith('#') || p.startsWith('$')) || ''
    const borderIsOverride = borderProp?.source === 'instance'

    // Border color display
    const borderColorIsToken = borderColor.startsWith('$')
    const borderColorSwatch = borderColorIsToken ? this.resolveTokenValue(borderColor, data) : borderColor

    // Get radius tokens
    const radiusTokens = data.spacingTokens?.filter(t => t.fullName.endsWith('.rad')) || []

    return `
      ${this.renderRadiusSection(radiusValue, radiusIsOverride, radiusTokens)}
      ${this.renderBorderSection(borderWidth, borderColor, borderColorSwatch, borderIsOverride)}
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      // Radius token click
      '[data-radius]': {
        click: (e: Event, target: HTMLElement) => {
          const tokenRef = target.getAttribute('data-token-ref')
          const value = tokenRef || target.getAttribute('data-radius')
          if (value) {
            this.deps.onPropertyChange('radius', value, 'token')
          }
        }
      },
      // Radius input change
      'input[data-prop="radius"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          this.deps.onPropertyChange('radius', input.value, 'input')
        }
      },
      // Corner radius input change
      'input[data-radius-corner]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const corner = input.getAttribute('data-radius-corner')
          if (corner) {
            this.deps.onPropertyChange('__RADIUS_CORNER__', JSON.stringify({
              corner,
              value: input.value
            }), 'input')
          }
        }
      },
      // Border width toggle
      '[data-border-width]': {
        click: (e: Event, target: HTMLElement) => {
          const width = target.getAttribute('data-border-width')
          if (width) {
            this.deps.onPropertyChange('__BORDER_WIDTH__', width, 'toggle')
          }
        }
      },
      // Border color trigger
      '[data-border-color-prop]': {
        click: (e: Event, target: HTMLElement) => {
          const prop = target.getAttribute('data-border-color-prop')
          const currentValue = target.getAttribute('data-current-value') || ''
          const borderWidth = target.getAttribute('data-border-width') || '1'
          if (prop) {
            this.deps.onPropertyChange('__BORDER_COLOR_PICKER__', JSON.stringify({
              property: prop,
              currentValue,
              borderWidth,
              trigger: target
            }), 'toggle')
          }
        }
      },
      // Expand buttons
      '[data-expand="radius"]': {
        click: (e: Event) => {
          this.handleExpandClick('radius')
        }
      },
      '[data-expand="border"]': {
        click: (e: Event) => {
          this.handleExpandClick('border')
        }
      }
    }
  }

  // ============================================
  // Private Render Methods
  // ============================================

  private renderRadiusSection(
    radiusValue: string,
    isOverride: boolean,
    tokens: SpacingToken[]
  ): string {
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
      return `<button class="token-btn ${isActive ? 'active' : ''}" data-radius="${escapeHtml(token.value)}" data-token-ref="${escapeHtml(token.tokenRef)}" title="${escapeHtml(title)}">${escapeHtml(token.label)}</button>`
    }).join('')

    // Full radius button (999)
    const fullRadiusActive = radiusValue === '999'
    const fullRadiusBtn = `<button class="token-btn ${fullRadiusActive ? 'active' : ''}" data-radius="999" title="Full: 999">${CIRCLE_ICON}</button>`

    return `
      <div class="section">
        <div class="section-label">
          <span>Radius</span>
          <button class="section-expand-btn" data-expand="radius" title="Toggle corner details">
            ${EXPAND_ICONS.collapsed}
            ${EXPAND_ICONS.expanded}
          </button>
        </div>
        <div class="section-content" data-expand-container="radius">
          <!-- Collapsed: Global Radius -->
          <div class="prop-row collapsed-row${isOverride ? ' override' : ''}" data-expand-group="radius">
            <span class="prop-label">All</span>
            <div class="prop-content">
              <div class="token-group">
                ${tokenButtons}
                ${fullRadiusBtn}
              </div>
              <input type="text" class="prop-input" autocomplete="off" value="${escapeHtml(radiusValue)}" data-prop="radius" placeholder="0">
            </div>
          </div>

          <!-- Expanded: Corner Radii (4 corners) -->
          <div class="prop-row expanded-row" data-expand-group="radius">
            <div class="corner-radius-grid">
              ${this.renderCornerInput('tl', 'Top Left', radiusValue)}
              ${this.renderCornerInput('tr', 'Top Right', radiusValue)}
              ${this.renderCornerInput('bl', 'Bottom Left', radiusValue)}
              ${this.renderCornerInput('br', 'Bottom Right', radiusValue)}
            </div>
          </div>
        </div>
      </div>
    `
  }

  private renderCornerInput(corner: string, title: string, value: string): string {
    return `
      <div class="corner-input">
        <span class="corner-label" title="${title}">${corner.toUpperCase()}</span>
        <input type="text" class="prop-input" autocomplete="off" value="${escapeHtml(value)}" data-radius-corner="${corner}" placeholder="0">
      </div>
    `
  }

  private renderBorderSection(
    borderWidth: string,
    borderColor: string,
    borderColorSwatch: string,
    isOverride: boolean
  ): string {
    // Border width toggles
    const borderWidths = ['0', '1', '2']
    const widthToggles = borderWidths.map(w => {
      const isActive = borderWidth === w
      return `<button class="toggle-btn ${isActive ? 'active' : ''}" data-border-width="${w}" title="${w}px">${w}</button>`
    }).join('')

    // Color trigger
    const colorTrigger = `
      <div class="pp-color-trigger pp-color-trigger-compact" data-border-color-prop="bor" data-border-width="${borderWidth}" data-current-value="${escapeHtml(borderColor)}">
        <div class="pp-color-swatch${borderColor ? '' : ' empty'}" style="${borderColorSwatch ? `background: ${escapeHtml(borderColorSwatch)}` : ''}"></div>
      </div>
    `

    return `
      <div class="section">
        <div class="section-label">
          <span>Border</span>
          <button class="section-expand-btn" data-expand="border" title="Toggle side details">
            ${EXPAND_ICONS.collapsed}
            ${EXPAND_ICONS.expanded}
          </button>
        </div>
        <div class="section-content" data-expand-container="border">
          <!-- Collapsed: Global Border -->
          <div class="prop-row collapsed-row${isOverride ? ' override' : ''}" data-expand-group="border">
            <span class="prop-label">All</span>
            <div class="prop-content">
              <div class="toggle-group">
                ${widthToggles}
              </div>
              ${colorTrigger}
            </div>
          </div>

          <!-- Expanded: Side Borders -->
          ${this.renderSideBorderRow('Top', 't', borderWidth, borderColor, borderColorSwatch)}
          ${this.renderSideBorderRow('Right', 'r', borderWidth, borderColor, borderColorSwatch)}
          ${this.renderSideBorderRow('Bottom', 'b', borderWidth, borderColor, borderColorSwatch)}
          ${this.renderSideBorderRow('Left', 'l', borderWidth, borderColor, borderColorSwatch)}
        </div>
      </div>
    `
  }

  private renderSideBorderRow(
    label: string,
    side: string,
    borderWidth: string,
    borderColor: string,
    borderColorSwatch: string
  ): string {
    const borderWidths = ['0', '1', '2']
    const widthToggles = borderWidths.map(w => {
      const isActive = borderWidth === w
      return `<button class="toggle-btn ${isActive ? 'active' : ''}" data-border-width="${w}" data-border-side="${side}" title="${w}px">${w}</button>`
    }).join('')

    return `
      <div class="prop-row expanded-row side-detail" data-expand-group="border">
        <span class="prop-label">${label}</span>
        <div class="prop-content">
          <div class="toggle-group">
            ${widthToggles}
          </div>
          <div class="pp-color-trigger pp-color-trigger-compact" data-border-color-prop="bor-${side}" data-border-width="${borderWidth}" data-current-value="${escapeHtml(borderColor)}">
            <div class="pp-color-swatch${borderColor ? '' : ' empty'}" style="${borderColorSwatch ? `background: ${escapeHtml(borderColorSwatch)}` : ''}"></div>
          </div>
        </div>
      </div>
    `
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private resolveTokenValue(tokenRef: string, data: SectionData): string {
    const colorTokens = data.colorTokens || []
    const token = colorTokens.find(t => `$${t.name}` === tokenRef)
    return token?.value || ''
  }

  private handleExpandClick(groupName: string): void {
    if (this.container) {
      const container = this.container.querySelector(`[data-expand-container="${groupName}"]`)
      if (container) {
        container.classList.toggle('expanded')
        const section = container.closest('.section')
        if (section) {
          section.classList.toggle('expanded')
        }
      }
    }
  }
}

/**
 * Factory function
 */
export function createBorderSection(deps: SectionDependencies): BorderSection {
  return new BorderSection(deps)
}

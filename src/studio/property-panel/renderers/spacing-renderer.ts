/**
 * SpacingRenderer - Renders padding/margin properties
 *
 * Handles padding with H/V and TRBL modes with token support.
 * Uses PropertyValueService for compound property handling.
 */

import { BasePropertyRenderer } from './base-renderer'
import type { PropertyCategory, RenderContext, TokenPreset, SpacingDirection, ITokenService, EventHandlers } from '../interfaces'
import type { PropertyValueService } from '../services/property-value-service'

/**
 * Default padding token presets
 */
const DEFAULT_PADDING_TOKENS: readonly TokenPreset[] = [
  { label: 'xs', value: '2' },
  { label: 's', value: '4' },
  { label: 'm', value: '8' },
  { label: 'l', value: '16' },
]

/**
 * SpacingRenderer
 *
 * Renders padding controls with collapsible H/V and expanded TRBL modes.
 */
export class SpacingRenderer extends BasePropertyRenderer {
  /**
   * Render the spacing section
   */
  render(category: PropertyCategory, context: RenderContext): string {
    return this.safeRender('spacing', () => this.renderSpacingSection(category, context))
  }

  /**
   * Render the complete spacing section
   */
  private renderSpacingSection(category: PropertyCategory, context: RenderContext): string {
    const props = category.properties
    const padProp = this.findProperty(props, 'padding', 'pad', 'p')
    const padValue = padProp?.value || ''

    // Check if padding is an override (set on instance)
    const isOverride = padProp?.source === 'instance'

    // Parse padding into TRBL
    const { tPad, rPad, bPad, lPad, vPad, hPad } = this.parsePadding(padValue)

    // Get tokens
    const tokens = this.getPaddingTokens()

    return `
      <div class="section" data-category="spacing">
        <div class="section-label">Spacing</div>
        <div class="section-content" data-expand-container="spacing">
          ${this.renderHPadRow(hPad, tokens, isOverride)}
          ${this.renderVPadRow(vPad, tokens, isOverride)}
          ${this.renderExpandedPadRows(tPad, rPad, bPad, lPad, tokens, isOverride)}
        </div>
      </div>
    `
  }

  /**
   * Parse padding value into individual directions
   */
  private parsePadding(padValue: string): {
    tPad: string
    rPad: string
    bPad: string
    lPad: string
    vPad: string
    hPad: string
  } {
    const parts = this.parseShorthand(padValue)
    let tPad = '', rPad = '', bPad = '', lPad = ''

    if (parts.length === 1) {
      tPad = rPad = bPad = lPad = parts[0]
    } else if (parts.length === 2) {
      tPad = bPad = parts[0]
      rPad = lPad = parts[1]
    } else if (parts.length === 4) {
      tPad = parts[0]
      rPad = parts[1]
      bPad = parts[2]
      lPad = parts[3]
    }

    return {
      tPad, rPad, bPad, lPad,
      vPad: tPad, // V uses top value
      hPad: rPad  // H uses right value
    }
  }

  /**
   * Get padding tokens from token service or defaults
   */
  private getPaddingTokens(): TokenPreset[] {
    const dynamicTokens = this.tokenService.getPaddingTokens()
    if (dynamicTokens.length > 0) {
      return dynamicTokens.map(t => ({
        label: t.name,
        value: t.value,
        tokenRef: `$${t.fullName}`
      }))
    }
    return DEFAULT_PADDING_TOKENS.map(t => ({
      label: t.label,
      value: t.value,
      tokenRef: `$${t.label}.pad`
    }))
  }

  /**
   * Render token buttons for a padding direction
   */
  private renderPadTokens(
    activeValue: string,
    direction: SpacingDirection,
    tokens: TokenPreset[]
  ): string {
    const isTokenRef = this.isTokenRef(activeValue)

    const buttons = tokens.map(token => {
      const active = isTokenRef
        ? activeValue === token.tokenRef
        : activeValue === token.value

      return this.renderTokenButton({
        label: token.label,
        value: token.value,
        tokenRef: token.tokenRef,
        dataAttr: 'pad-token',
        dataDir: direction,
        active,
        ariaLabel: `Padding ${direction} ${token.label}`
      })
    })

    return this.renderTokenGroup(buttons)
  }

  /**
   * Render horizontal padding row (collapsed mode)
   */
  private renderHPadRow(hPad: string, tokens: TokenPreset[], isOverride: boolean = false): string {
    const tokenButtons = this.renderPadTokens(hPad, 'h', tokens)
    const input = this.renderInput({
      value: hPad,
      dataAttr: 'pad-dir',
      dataValue: 'h',
      placeholder: '0',
      ariaLabel: 'Horizontal padding'
    })
    const expandBtn = `
      <button class="toggle-btn expand-btn" data-expand="spacing" title="Expand"
              aria-label="Expand padding controls" aria-expanded="false">
        <svg class="icon" viewBox="0 0 14 14"><path d="M4 6l3 3 3-3"/></svg>
      </button>
    `

    const overrideClass = isOverride ? ' override' : ''
    return `
      <div class="prop-row collapsed-row${overrideClass}" data-expand-group="spacing">
        <span class="prop-label">Padding H</span>
        <div class="prop-content">
          ${tokenButtons}
          ${input}
          ${expandBtn}
        </div>
      </div>
    `
  }

  /**
   * Render vertical padding row (collapsed mode)
   */
  private renderVPadRow(vPad: string, tokens: TokenPreset[], isOverride: boolean = false): string {
    const tokenButtons = this.renderPadTokens(vPad, 'v', tokens)
    const input = this.renderInput({
      value: vPad,
      dataAttr: 'pad-dir',
      dataValue: 'v',
      placeholder: '0',
      ariaLabel: 'Vertical padding'
    })

    const overrideClass = isOverride ? ' override' : ''
    return `
      <div class="prop-row collapsed-row${overrideClass}" data-expand-group="spacing">
        <span class="prop-label">Padding V</span>
        <div class="prop-content">
          ${tokenButtons}
          ${input}
        </div>
      </div>
    `
  }

  /**
   * Render expanded TRBL padding rows
   */
  private renderExpandedPadRows(
    tPad: string,
    rPad: string,
    bPad: string,
    lPad: string,
    tokens: TokenPreset[],
    isOverride: boolean = false
  ): string {
    const directions: { label: string; dir: SpacingDirection; value: string; showCollapse?: boolean }[] = [
      { label: 'Pad Top', dir: 't', value: tPad, showCollapse: true },
      { label: 'Pad Right', dir: 'r', value: rPad },
      { label: 'Pad Bottom', dir: 'b', value: bPad },
      { label: 'Pad Left', dir: 'l', value: lPad },
    ]

    const overrideClass = isOverride ? ' override' : ''
    return directions.map(({ label, dir, value, showCollapse }) => {
      const tokenButtons = this.renderPadTokens(value, dir, tokens)
      const input = this.renderInput({
        value,
        dataAttr: 'pad-dir',
        dataValue: dir,
        placeholder: '0',
        ariaLabel: label
      })
      const collapseBtn = showCollapse ? `
        <button class="toggle-btn expand-btn" data-expand="spacing" title="Collapse"
                aria-label="Collapse padding controls" aria-expanded="true">
          <svg class="icon" viewBox="0 0 14 14"><path d="M4 8l3-3 3 3"/></svg>
        </button>
      ` : ''

      return `
        <div class="prop-row expanded-row${overrideClass}" data-expand-group="spacing">
          <span class="prop-label">${this.escapeHtml(label)}</span>
          <div class="prop-content">
            ${tokenButtons}
            ${input}
            ${collapseBtn}
          </div>
        </div>
      `
    }).join('')
  }

  /**
   * Attach event listeners
   */
  attachEventListeners(container: HTMLElement, context: RenderContext): void {
    // Expand/collapse buttons
    this.addEventListeners(
      container,
      '.expand-btn[data-expand="spacing"]',
      'click',
      (element) => {
        const expandContainer = container.querySelector('[data-expand-container="spacing"]')
        if (expandContainer) {
          expandContainer.classList.toggle('expanded')
          // Update aria-expanded
          const isExpanded = expandContainer.classList.contains('expanded')
          element.setAttribute('aria-expanded', String(isExpanded))
        }
      },
      'handleExpandClick'
    )

    // Padding token buttons
    this.addEventListeners(
      container,
      '.token-btn[data-pad-token]',
      'click',
      (element) => {
        const tokenRef = element.dataset.tokenRef
        const value = tokenRef || element.dataset.padToken
        const dir = element.dataset.padDir as SpacingDirection
        if (value && dir) {
          this.handlePaddingChange(context.nodeId, dir, value)
        }
      },
      'handlePadTokenClick'
    )

    // Padding inputs
    this.addEventListeners(
      container,
      'input[data-pad-dir]',
      'change',
      (element) => {
        const input = element as HTMLInputElement
        const dir = input.dataset.padDir as SpacingDirection
        if (dir) {
          this.handlePaddingChange(context.nodeId, dir, input.value)
        }
      },
      'handlePadInputChange'
    )
  }

  /**
   * Handle padding change for a direction
   * Uses PropertyValueService to correctly merge with existing padding value
   */
  private handlePaddingChange(nodeId: string, dir: SpacingDirection, value: string): void {
    // Use setPropertyValue with the appropriate part
    // This will correctly merge with existing padding value
    if (dir === 'h') {
      // H sets left and right - use the 'h' part shorthand
      this.setPropertyValue(nodeId, 'pad', value, 'h')
    } else if (dir === 'v') {
      // V sets top and bottom - use the 'v' part shorthand
      this.setPropertyValue(nodeId, 'pad', value, 'v')
    } else {
      // Individual direction (t, r, b, l) - use the direction as part name
      this.setPropertyValue(nodeId, 'pad', value, dir)
    }
  }
}

/**
 * SpacingSection - Padding and Margin
 *
 * Handles:
 * - Padding with horizontal/vertical (collapsed) or T/R/B/L (expanded) modes
 * - Margin with same modes
 * - Token presets for both
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap, PropertyCategory, SpacingToken } from '../types'
import { spacingTokensToOptions } from '../components'
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
 * Parse spacing value (1, 2, or 4 values) into T, R, B, L
 */
function parseSpacingValue(value: string): { t: string; r: string; b: string; l: string } {
  const parts = value.split(/\s+/).filter(Boolean)
  let t = '', r = '', b = '', l = ''

  if (parts.length === 1) {
    t = r = b = l = parts[0]
  } else if (parts.length === 2) {
    t = b = parts[0]
    r = l = parts[1]
  } else if (parts.length === 4) {
    t = parts[0]
    r = parts[1]
    b = parts[2]
    l = parts[3]
  }

  return { t, r, b, l }
}

/**
 * Build spacing value from T, R, B, L (simplify if possible)
 */
function buildSpacingValue(t: string, r: string, b: string, l: string): string {
  t = t || '0'
  r = r || '0'
  b = b || '0'
  l = l || '0'

  if (t === b && r === l && t === r) {
    return t
  } else if (t === b && r === l) {
    return `${t} ${r}`
  } else {
    return `${t} ${r} ${b} ${l}`
  }
}

/**
 * SpacingSection class
 */
export class SpacingSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Spacing' }, deps)
  }

  render(data: SectionData): string {
    this.data = data
    const category = data.category
    if (!category) return ''

    const props = category.properties

    // Find padding values
    const padProp = props.find(p => p.name === 'padding' || p.name === 'pad' || p.name === 'p')
    const padValue = padProp?.value || ''
    const padIsOverride = padProp?.source === 'instance'
    const { t: tPad, r: rPad, b: bPad, l: lPad } = parseSpacingValue(padValue)
    const vPad = tPad, hPad = rPad

    // Find margin values
    const marginProp = props.find(p => p.name === 'margin' || p.name === 'm')
    const marginValue = marginProp?.value || ''
    const marginIsOverride = marginProp?.source === 'instance'
    const { t: tMargin, r: rMargin, b: bMargin, l: lMargin } = parseSpacingValue(marginValue)
    const vMargin = tMargin, hMargin = rMargin

    // Get tokens
    const padTokens = data.spacingTokens?.filter(t => t.fullName.endsWith('.pad')) || []
    const marginTokens = data.spacingTokens?.filter(t => t.fullName.endsWith('.m')) || []

    return `
      ${this.renderPaddingSection(vPad, hPad, tPad, rPad, bPad, lPad, padIsOverride, padTokens)}
      ${this.renderMarginSection(vMargin, hMargin, tMargin, rMargin, bMargin, lMargin, marginIsOverride, marginTokens)}
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      // Padding token click
      '[data-pad-token]': {
        click: (e: Event, target: HTMLElement) => {
          const tokenRef = target.getAttribute('data-token-ref')
          const value = tokenRef || target.getAttribute('data-pad-token')
          const dir = target.getAttribute('data-pad-dir')
          if (value && dir) {
            this.handlePadTokenClick(value, dir)
          }
        }
      },
      // Padding input change
      'input[data-pad-dir]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const dir = input.getAttribute('data-pad-dir')
          if (dir) {
            this.handlePadInputChange(input.value, dir)
          }
        }
      },
      // Margin token click
      '[data-margin-token]': {
        click: (e: Event, target: HTMLElement) => {
          const tokenRef = target.getAttribute('data-token-ref')
          const value = tokenRef || target.getAttribute('data-margin-token')
          const dir = target.getAttribute('data-margin-dir')
          if (value && dir) {
            this.handleMarginTokenClick(value, dir)
          }
        }
      },
      // Margin input change
      'input[data-margin-dir]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const dir = input.getAttribute('data-margin-dir')
          if (dir) {
            this.handleMarginInputChange(input.value, dir)
          }
        }
      },
      // Expand buttons
      '[data-expand="spacing"]': {
        click: (e: Event) => {
          this.handleExpandClick('spacing')
        }
      },
      '[data-expand="margin"]': {
        click: (e: Event) => {
          this.handleExpandClick('margin')
        }
      }
    }
  }

  // ============================================
  // Private Render Methods
  // ============================================

  private renderPaddingSection(
    vPad: string, hPad: string,
    tPad: string, rPad: string, bPad: string, lPad: string,
    isOverride: boolean,
    tokens: SpacingToken[]
  ): string {
    const tokenOptions = spacingTokensToOptions(tokens)
    const hasTokens = tokenOptions.length > 0

    return `
      <div class="section">
        <div class="section-label">
          <span>Padding</span>
          <button class="section-expand-btn" data-expand="spacing" title="Toggle detail view">
            ${EXPAND_ICONS.collapsed}
            ${EXPAND_ICONS.expanded}
          </button>
        </div>
        <div class="section-content" data-expand-container="spacing">
          ${this.renderSpacingRow('Horizontal', hPad, 'h', 'pad', isOverride, tokenOptions, hasTokens, 'collapsed-row')}
          ${this.renderSpacingRow('Vertical', vPad, 'v', 'pad', isOverride, tokenOptions, hasTokens, 'collapsed-row')}
          ${this.renderSpacingRow('Top', tPad, 't', 'pad', false, tokenOptions, hasTokens, 'expanded-row')}
          ${this.renderSpacingRow('Right', rPad, 'r', 'pad', false, tokenOptions, hasTokens, 'expanded-row')}
          ${this.renderSpacingRow('Bottom', bPad, 'b', 'pad', false, tokenOptions, hasTokens, 'expanded-row')}
          ${this.renderSpacingRow('Left', lPad, 'l', 'pad', false, tokenOptions, hasTokens, 'expanded-row')}
        </div>
      </div>
    `
  }

  private renderMarginSection(
    vMargin: string, hMargin: string,
    tMargin: string, rMargin: string, bMargin: string, lMargin: string,
    isOverride: boolean,
    tokens: SpacingToken[]
  ): string {
    const tokenOptions = spacingTokensToOptions(tokens)
    const hasTokens = tokenOptions.length > 0

    return `
      <div class="section">
        <div class="section-label">
          <span>Margin</span>
          <button class="section-expand-btn" data-expand="margin" title="Toggle detail view">
            ${EXPAND_ICONS.collapsed}
            ${EXPAND_ICONS.expanded}
          </button>
        </div>
        <div class="section-content" data-expand-container="margin">
          ${this.renderSpacingRow('Horizontal', hMargin, 'h', 'margin', isOverride, tokenOptions, hasTokens, 'collapsed-row')}
          ${this.renderSpacingRow('Vertical', vMargin, 'v', 'margin', isOverride, tokenOptions, hasTokens, 'collapsed-row')}
          ${this.renderSpacingRow('Top', tMargin, 't', 'margin', false, tokenOptions, hasTokens, 'expanded-row')}
          ${this.renderSpacingRow('Right', rMargin, 'r', 'margin', false, tokenOptions, hasTokens, 'expanded-row')}
          ${this.renderSpacingRow('Bottom', bMargin, 'b', 'margin', false, tokenOptions, hasTokens, 'expanded-row')}
          ${this.renderSpacingRow('Left', lMargin, 'l', 'margin', false, tokenOptions, hasTokens, 'expanded-row')}
        </div>
      </div>
    `
  }

  private renderSpacingRow(
    label: string,
    value: string,
    dir: string,
    type: 'pad' | 'margin',
    isOverride: boolean,
    tokens: Array<{ label: string; value: string; tokenRef?: string }>,
    hasTokens: boolean,
    rowClass: string
  ): string {
    const dataAttrPrefix = type === 'pad' ? 'pad' : 'margin'
    const dirAttr = type === 'pad' ? 'data-pad-dir' : 'data-margin-dir'

    // Render token buttons
    const tokenButtons = hasTokens ? this.renderTokenButtons(value, tokens, dataAttrPrefix, dir) : ''

    return `
      <div class="prop-row ${rowClass}${isOverride ? ' override' : ''}" data-expand-group="${type === 'pad' ? 'spacing' : 'margin'}">
        <span class="prop-label">${escapeHtml(label)}</span>
        <div class="prop-content">
          ${tokenButtons ? `<div class="token-group">${tokenButtons}</div>` : ''}
          <input type="text" class="prop-input" autocomplete="off" value="${escapeHtml(value)}" ${dirAttr}="${dir}" placeholder="0">
        </div>
      </div>
    `
  }

  private renderTokenButtons(
    activeValue: string,
    tokens: Array<{ label: string; value: string; tokenRef?: string }>,
    dataAttrPrefix: string,
    dir: string
  ): string {
    const isTokenRef = activeValue.startsWith('$')

    return tokens.map(token => {
      const isActive = isTokenRef
        ? (activeValue === token.tokenRef)
        : (activeValue === token.value)
      const title = token.tokenRef ? `${token.tokenRef}: ${token.value}` : token.value

      return `<button
        class="token-btn ${isActive ? 'active' : ''}"
        data-${dataAttrPrefix}-token="${escapeHtml(token.value)}"
        ${token.tokenRef ? `data-token-ref="${escapeHtml(token.tokenRef)}"` : ''}
        data-${dataAttrPrefix}-dir="${dir}"
        title="${escapeHtml(title)}"
      >${escapeHtml(token.label)}</button>`
    }).join('')
  }

  // ============================================
  // Private Handler Methods
  // ============================================

  private handlePadTokenClick(value: string, dir: string): void {
    // Signal the property change with special format for spacing
    // The main PropertyPanel will handle the actual spacing value construction
    this.deps.onPropertyChange('__PAD_TOKEN__', JSON.stringify({ value, dir }), 'token')
  }

  private handlePadInputChange(value: string, dir: string): void {
    // Signal the property change with special format for spacing
    this.deps.onPropertyChange('__PAD_INPUT__', JSON.stringify({ value, dir }), 'input')
  }

  private handleMarginTokenClick(value: string, dir: string): void {
    // Signal the property change with special format for spacing
    this.deps.onPropertyChange('__MARGIN_TOKEN__', JSON.stringify({ value, dir }), 'token')
  }

  private handleMarginInputChange(value: string, dir: string): void {
    // Signal the property change with special format for spacing
    this.deps.onPropertyChange('__MARGIN_INPUT__', JSON.stringify({ value, dir }), 'input')
  }

  private handleExpandClick(groupName: string): void {
    if (this.container) {
      const container = this.container.querySelector(`[data-expand-container="${groupName}"]`)
      if (container) {
        container.classList.toggle('expanded')
        // Also toggle on parent .section for CSS purposes
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
export function createSpacingSection(deps: SectionDependencies): SpacingSection {
  return new SpacingSection(deps)
}

// ============================================
// Utility functions exported for use by PropertyPanel
// ============================================

export { parseSpacingValue, buildSpacingValue }

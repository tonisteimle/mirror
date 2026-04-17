/**
 * Spacing Section - Padding and Margin
 *
 * Renders padding and margin controls with token support.
 */

import {
  BaseSection,
  type SectionDependencies,
  type SectionData,
  type EventHandlerMap,
} from '../base/section'
import type { SpacingToken } from '../types'

/**
 * Parse padding/margin value into T, R, B, L components
 */
function parseSpacingValue(value: string): { t: string; r: string; b: string; l: string } {
  const parts = value.split(/\s+/).filter(Boolean)
  let t = '',
    r = '',
    b = '',
    l = ''

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
 * Build padding/margin value from T, R, B, L (simplified)
 */
function buildSpacingValue(t: string, r: string, b: string, l: string): string {
  t = t || '0'
  r = r || '0'
  b = b || '0'
  l = l || '0'

  if (t === r && r === b && b === l) {
    return t
  } else if (t === b && r === l) {
    return `${t} ${r}`
  } else {
    return `${t} ${r} ${b} ${l}`
  }
}

/**
 * Spacing Section class
 */
export class SpacingSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Padding' }, deps)
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

    // Parse padding value
    const { t: tPad, r: rPad, b: bPad, l: lPad } = parseSpacingValue(padValue)
    const vPad = tPad,
      hPad = rPad

    // Get tokens
    const tokens = data.spacingTokens?.filter(t => t.fullName.endsWith('.pad')) || []
    const hasTokens = tokens.length > 0

    return `
      <div class="section">
        <div class="section-label">
          <span>Padding</span>
          <button class="section-expand-btn" data-expand="spacing" title="Toggle detail view">
            <svg class="icon icon-collapsed" viewBox="0 0 14 14">
              <path d="M4 6l3 3 3-3"/>
            </svg>
            <svg class="icon icon-expanded" viewBox="0 0 14 14">
              <path d="M4 8l3-3 3 3"/>
            </svg>
          </button>
        </div>
        <div class="section-content" data-expand-container="spacing">
          ${this.renderSpacingRow('Horizontal', hPad, 'h', tokens, hasTokens, padIsOverride, 'collapsed-row')}
          ${this.renderSpacingRow('Vertical', vPad, 'v', tokens, hasTokens, padIsOverride, 'collapsed-row')}
          ${this.renderSpacingRow('Top', tPad, 't', tokens, hasTokens, padIsOverride, 'expanded-row')}
          ${this.renderSpacingRow('Right', rPad, 'r', tokens, hasTokens, padIsOverride, 'expanded-row')}
          ${this.renderSpacingRow('Bottom', bPad, 'b', tokens, hasTokens, padIsOverride, 'expanded-row')}
          ${this.renderSpacingRow('Left', lPad, 'l', tokens, hasTokens, padIsOverride, 'expanded-row')}
        </div>
      </div>
    `
  }

  private renderSpacingRow(
    label: string,
    value: string,
    direction: string,
    tokens: SpacingToken[],
    hasTokens: boolean,
    isOverride: boolean,
    rowClass: string
  ): string {
    const tokenButtons = hasTokens ? this.renderTokenButtons(value, direction, tokens) : ''
    const tokenGroup = hasTokens ? `<div class="token-group">${tokenButtons}</div>` : ''

    // Check if value is a token reference
    const isTokenRef = value.startsWith('$')
    let displayValue = value
    let inputClass = 'prop-input'

    if (isTokenRef && this.data?.resolveTokenValue) {
      // Pass 'pad' as property type for short references like "$s" → "$s.pad"
      const resolved = this.data.resolveTokenValue(value, 'pad')
      if (resolved) {
        // Show resolved pixel value in input, token button shows which is active
        displayValue = resolved
        inputClass = 'prop-input token-resolved'
      }
    }

    return `
      <div class="prop-row ${rowClass}${isOverride ? ' override' : ''}" data-expand-group="spacing">
        <span class="prop-label">${label}</span>
        <div class="prop-content">
          ${tokenGroup}
          <input type="text" class="${inputClass}" autocomplete="off" value="${this.deps.escapeHtml(displayValue)}" data-pad-dir="${direction}" data-token-ref="${isTokenRef ? this.deps.escapeHtml(value) : ''}" placeholder="0">
        </div>
      </div>
    `
  }

  private renderTokenButtons(
    activeValue: string,
    direction: string,
    tokens: SpacingToken[]
  ): string {
    const isTokenRef = activeValue.startsWith('$')

    return tokens
      .map(token => {
        const tokenRef = `$${token.fullName}`
        const shortRef = `$${token.name}` // e.g., "$md" for "md.pad"
        // Active if:
        // - Value is token ref and matches full ref ($md.pad) or short ref ($md)
        // - Value is literal and matches token value (16)
        const isActive = isTokenRef
          ? activeValue === tokenRef || activeValue === shortRef
          : activeValue === token.value
        return `<button class="token-btn ${isActive ? 'active' : ''}" data-pad-token="${token.value}" data-token-ref="${tokenRef}" data-pad-dir="${direction}" title="${tokenRef}: ${token.value}">${token.name}</button>`
      })
      .join('')
  }

  getHandlers(): EventHandlerMap {
    return {
      '.token-btn[data-pad-token]': {
        click: (e: Event, target: HTMLElement) => {
          const tokenRef = target.dataset.tokenRef
          const value = tokenRef || target.dataset.padToken
          const dir = target.dataset.padDir
          if (value && dir) {
            this.deps.onPropertyChange('__PAD_TOKEN__', JSON.stringify({ value, dir }), 'token')
          }
        },
      },
      'input[data-pad-dir]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const dir = input.dataset.padDir
          if (dir) {
            this.deps.onPropertyChange(
              '__PAD_INPUT__',
              JSON.stringify({ value: input.value, dir }),
              'input'
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
export function createSpacingSection(deps: SectionDependencies): SpacingSection {
  return new SpacingSection(deps)
}

export { parseSpacingValue, buildSpacingValue }

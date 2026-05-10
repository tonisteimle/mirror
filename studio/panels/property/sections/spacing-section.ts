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
import type { PanelSpacingToken } from '../types'
import { extractSides, parseSidesValue, spacingPropertyNames } from '../utils/spacing-parse'
import { renderTokenButtonGroup } from '../utils/render-token-buttons'

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

    // Resolve T/R/B/L from shorthand + axis + per-side props.
    const { t: tPad, r: rPad, b: bPad, l: lPad } = extractSides(props, 'padding', 'pad', 'p')
    // Collapsed view shows H + V single fields — for asymmetric values
    // the top/right wins (the user can use the expanded view to edit
    // each side individually).
    const vPad = tPad
    const hPad = rPad

    // Override marker: any padding-shaped prop being an instance override
    // marks the section as overridden.
    const padNames = new Set(spacingPropertyNames('padding', 'pad', 'p'))
    const padIsOverride = props.some(p => padNames.has(p.name) && p.source === 'instance')

    // Get tokens
    const tokens = data.spacingTokens?.filter(t => t.fullName.endsWith('.pad')) || []
    const hasTokens = tokens.length > 0

    const expanded = this.isExpanded('spacing')
    const sectionClass = `section${expanded ? ' expanded' : ''}`
    const containerClass = `section-content${expanded ? ' expanded' : ''}`

    return `
      <div class="${sectionClass}">
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
        <div class="${containerClass}" data-expand-container="spacing">
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
    tokens: PanelSpacingToken[],
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
    tokens: PanelSpacingToken[]
  ): string {
    return renderTokenButtonGroup({
      activeValue,
      propKey: 'pad',
      direction,
      tokens: tokens.map(t => ({
        label: t.name,
        value: t.value,
        tokenRef: `$${t.fullName}`,
      })),
    })
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
      '.token-more-btn': {
        click: (e: Event, target: HTMLElement) => {
          e.stopPropagation()
          const container = target.closest('.token-more-container')
          const dropdown = container?.querySelector('.token-dropdown') as HTMLElement
          if (dropdown) {
            const isOpen = dropdown.classList.contains('open')
            // Close all other dropdowns first
            document
              .querySelectorAll('.token-dropdown.open')
              .forEach(d => d.classList.remove('open'))
            if (!isOpen) {
              dropdown.classList.add('open')
              // Close on outside click
              const closeHandler = (evt: Event) => {
                if (!container?.contains(evt.target as Node)) {
                  dropdown.classList.remove('open')
                  document.removeEventListener('click', closeHandler)
                }
              }
              setTimeout(() => document.addEventListener('click', closeHandler), 0)
            }
          }
        },
      },
      '.token-dropdown-item': {
        click: (e: Event, target: HTMLElement) => {
          const tokenRef = target.dataset.tokenRef
          const value = tokenRef || target.dataset.padToken
          const dir = target.dataset.padDir
          if (value && dir) {
            this.deps.onPropertyChange('__PAD_TOKEN__', JSON.stringify({ value, dir }), 'token')
          }
          // Close dropdown
          const dropdown = target.closest('.token-dropdown')
          dropdown?.classList.remove('open')
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

export { buildSpacingValue }

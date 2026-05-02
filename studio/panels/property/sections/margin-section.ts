/**
 * Margin Section
 *
 * Renders margin (outer-spacing) controls with token support.
 * Shares the `spacing` category with padding — both properties are
 * categorised as `spacing` by the property extractor — so this section
 * filters that category for `margin`/`mar`/`m`.
 */

import {
  BaseSection,
  type SectionDependencies,
  type SectionData,
  type EventHandlerMap,
} from '../base/section'
import type { SpacingToken } from '../types'
import { extractSides, spacingPropertyNames } from '../utils/spacing-parse'

/**
 * Build margin value from T, R, B, L (collapses to 1- or 2-form when symmetric).
 */
function buildMarginValue(t: string, r: string, b: string, l: string): string {
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
 * Margin Section class
 */
export class MarginSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Margin' }, deps)
  }

  render(data: SectionData): string {
    this.data = data
    const category = data.category
    if (!category) return ''

    const props = category.properties

    // Resolve T/R/B/L from shorthand + axis + per-side margin props.
    const { t: tMar, r: rMar, b: bMar, l: lMar } = extractSides(props, 'margin', 'mar', 'm')
    // Collapsed view: top wins for V, right wins for H when asymmetric.
    const vMar = tMar
    const hMar = rMar

    // Override marker spans the whole margin family.
    const marNames = new Set(spacingPropertyNames('margin', 'mar', 'm'))
    const marIsOverride = props.some(p => marNames.has(p.name) && p.source === 'instance')

    // Get tokens (.mar suffix)
    const tokens = data.spacingTokens?.filter(t => t.fullName.endsWith('.mar')) || []
    const hasTokens = tokens.length > 0

    const expanded = this.isExpanded('margin')
    const sectionClass = `section${expanded ? ' expanded' : ''}`
    const containerClass = `section-content${expanded ? ' expanded' : ''}`

    return `
      <div class="${sectionClass}">
        <div class="section-label">
          <span>Margin</span>
          <button class="section-expand-btn" data-expand="margin" title="Toggle detail view">
            <svg class="icon icon-collapsed" viewBox="0 0 14 14">
              <path d="M4 6l3 3 3-3"/>
            </svg>
            <svg class="icon icon-expanded" viewBox="0 0 14 14">
              <path d="M4 8l3-3 3 3"/>
            </svg>
          </button>
        </div>
        <div class="${containerClass}" data-expand-container="margin">
          ${this.renderMarginRow('Horizontal', hMar, 'h', tokens, hasTokens, marIsOverride, 'collapsed-row')}
          ${this.renderMarginRow('Vertical', vMar, 'v', tokens, hasTokens, marIsOverride, 'collapsed-row')}
          ${this.renderMarginRow('Top', tMar, 't', tokens, hasTokens, marIsOverride, 'expanded-row')}
          ${this.renderMarginRow('Right', rMar, 'r', tokens, hasTokens, marIsOverride, 'expanded-row')}
          ${this.renderMarginRow('Bottom', bMar, 'b', tokens, hasTokens, marIsOverride, 'expanded-row')}
          ${this.renderMarginRow('Left', lMar, 'l', tokens, hasTokens, marIsOverride, 'expanded-row')}
        </div>
      </div>
    `
  }

  private renderMarginRow(
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

    const isTokenRef = value.startsWith('$')
    let displayValue = value
    let inputClass = 'prop-input'

    if (isTokenRef && this.data?.resolveTokenValue) {
      const resolved = this.data.resolveTokenValue(value, 'mar')
      if (resolved) {
        displayValue = resolved
        inputClass = 'prop-input token-resolved'
      }
    }

    return `
      <div class="prop-row ${rowClass}${isOverride ? ' override' : ''}" data-expand-group="margin">
        <span class="prop-label">${label}</span>
        <div class="prop-content">
          ${tokenGroup}
          <input type="text" class="${inputClass}" autocomplete="off" value="${this.deps.escapeHtml(displayValue)}" data-mar-dir="${direction}" data-token-ref="${isTokenRef ? this.deps.escapeHtml(value) : ''}" placeholder="0">
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
    const MAX_DIRECT = 4
    const VISIBLE_COUNT = 3

    const renderToken = (token: SpacingToken) => {
      const tokenRef = `$${token.fullName}`
      const shortRef = `$${token.name}`
      const isActive = isTokenRef
        ? activeValue === tokenRef || activeValue === shortRef
        : activeValue === token.value
      return `<button class="token-btn ${isActive ? 'active' : ''}" data-mar-token="${token.value}" data-token-ref="${tokenRef}" data-mar-dir="${direction}" title="${tokenRef}: ${token.value}">${token.name}</button>`
    }

    if (tokens.length <= MAX_DIRECT) {
      return tokens.map(renderToken).join('')
    }

    const visibleTokens = tokens.slice(0, VISIBLE_COUNT)
    const hiddenTokens = tokens.slice(VISIBLE_COUNT)

    const activeInHidden = hiddenTokens.some(token => {
      const tokenRef = `$${token.fullName}`
      const shortRef = `$${token.name}`
      return isTokenRef
        ? activeValue === tokenRef || activeValue === shortRef
        : activeValue === token.value
    })

    const dropdownItems = hiddenTokens
      .map(token => {
        const tokenRef = `$${token.fullName}`
        const shortRef = `$${token.name}`
        const isActive = isTokenRef
          ? activeValue === tokenRef || activeValue === shortRef
          : activeValue === token.value
        return `<button class="token-dropdown-item ${isActive ? 'active' : ''}" data-mar-token="${token.value}" data-token-ref="${tokenRef}" data-mar-dir="${direction}">${token.name} <span class="token-dropdown-value">${token.value}</span></button>`
      })
      .join('')

    return `
      ${visibleTokens.map(renderToken).join('')}
      <div class="token-more-container">
        <button class="token-btn token-more-btn ${activeInHidden ? 'has-active' : ''}" data-mar-dir="${direction}" title="${hiddenTokens.length} more tokens">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
        <div class="token-dropdown" data-mar-dir="${direction}">
          ${dropdownItems}
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      '.token-btn[data-mar-token]': {
        click: (e: Event, target: HTMLElement) => {
          const tokenRef = target.dataset.tokenRef
          const value = tokenRef || target.dataset.marToken
          const dir = target.dataset.marDir
          if (value && dir) {
            this.deps.onPropertyChange('__MAR_TOKEN__', JSON.stringify({ value, dir }), 'token')
          }
        },
      },
      '.token-more-btn[data-mar-dir]': {
        click: (e: Event, target: HTMLElement) => {
          e.stopPropagation()
          const container = target.closest('.token-more-container')
          const dropdown = container?.querySelector('.token-dropdown') as HTMLElement
          if (dropdown) {
            const isOpen = dropdown.classList.contains('open')
            document
              .querySelectorAll('.token-dropdown.open')
              .forEach(d => d.classList.remove('open'))
            if (!isOpen) {
              dropdown.classList.add('open')
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
      '.token-dropdown-item[data-mar-token]': {
        click: (e: Event, target: HTMLElement) => {
          const tokenRef = target.dataset.tokenRef
          const value = tokenRef || target.dataset.marToken
          const dir = target.dataset.marDir
          if (value && dir) {
            this.deps.onPropertyChange('__MAR_TOKEN__', JSON.stringify({ value, dir }), 'token')
          }
          const dropdown = target.closest('.token-dropdown')
          dropdown?.classList.remove('open')
        },
      },
      'input[data-mar-dir]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const dir = input.dataset.marDir
          if (dir) {
            this.deps.onPropertyChange(
              '__MAR_INPUT__',
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
export function createMarginSection(deps: SectionDependencies): MarginSection {
  return new MarginSection(deps)
}

export { buildMarginValue }

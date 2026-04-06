/**
 * SpacingSection - Padding and Margin
 *
 * Simple readable layout with text labels.
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap, SpacingToken } from '../types'
import { spacingTokensToOptions } from '../components'
import { escapeHtml, validateSpacingValue, applyValidationStyle } from '../utils'
import { makeScrubable, type ScrubInstance } from '../utils/scrub'

/**
 * Parse spacing value (1, 2, 3, or 4 values) into T, R, B, L
 */
function parseSpacingValue(value: string): { t: string; r: string; b: string; l: string } {
  const parts = value.split(/\s+/).filter(Boolean)
  let t = '', r = '', b = '', l = ''

  if (parts.length === 1) {
    t = r = b = l = parts[0]
  } else if (parts.length === 2) {
    t = b = parts[0]
    r = l = parts[1]
  } else if (parts.length === 3) {
    t = parts[0]
    r = l = parts[1]
    b = parts[2]
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
  private scrubInstances: ScrubInstance[] = []

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
    const { t: tPad, r: rPad, b: bPad, l: lPad } = parseSpacingValue(padValue)

    // Find margin values
    const marginProp = props.find(p => p.name === 'margin' || p.name === 'm')
    const marginValue = marginProp?.value || ''
    const { t: tMargin, r: rMargin, b: bMargin, l: lMargin } = parseSpacingValue(marginValue)

    // Get tokens
    const padTokens = data.spacingTokens?.filter(t => t.fullName.endsWith('.pad')) || []
    const marginTokens = data.spacingTokens?.filter(t => t.fullName.endsWith('.m')) || []

    return `
      <div class="pp-section">
        <div class="pp-section-label">Padding</div>
        <div class="pp-section-content">
          ${this.renderSpacingRow('Top', tPad, 't', 'pad', padTokens)}
          ${this.renderSpacingRow('Right', rPad, 'r', 'pad', padTokens)}
          ${this.renderSpacingRow('Bottom', bPad, 'b', 'pad', padTokens)}
          ${this.renderSpacingRow('Left', lPad, 'l', 'pad', padTokens)}
        </div>
      </div>
      <div class="pp-section">
        <div class="pp-section-label">Margin</div>
        <div class="pp-section-content">
          ${this.renderSpacingRow('Top', tMargin, 't', 'margin', marginTokens)}
          ${this.renderSpacingRow('Right', rMargin, 'r', 'margin', marginTokens)}
          ${this.renderSpacingRow('Bottom', bMargin, 'b', 'margin', marginTokens)}
          ${this.renderSpacingRow('Left', lMargin, 'l', 'margin', marginTokens)}
        </div>
      </div>
    `
  }

  private renderSpacingRow(
    label: string,
    value: string,
    dir: string,
    type: 'pad' | 'margin',
    tokens: SpacingToken[]
  ): string {
    const dirAttr = type === 'pad' ? 'data-pad-dir' : 'data-margin-dir'
    const tokenOptions = spacingTokensToOptions(tokens)

    // Always render token buttons (at least the "0" preset)
    const tokenButtons = this.renderTokenButtons(value, tokenOptions, type, dir)

    return `
      <div class="pp-row" data-scrub="${type}-${dir}">
        <span class="pp-row-label">${label}</span>
        <div class="pp-row-content">
          <div class="pp-token-group">${tokenButtons}</div>
          <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(value)}" ${dirAttr}="${dir}" placeholder="0">
        </div>
      </div>
    `
  }

  private renderTokenButtons(
    activeValue: string,
    tokens: Array<{ label: string; value: string; tokenRef?: string }>,
    type: 'pad' | 'margin',
    dir: string
  ): string {
    const dataAttrPrefix = type === 'pad' ? 'pad' : 'margin'
    const isTokenRef = activeValue.startsWith('$')

    // Add "0" preset at the beginning
    const allTokens = [
      { label: '0', value: '0', tokenRef: '' },
      ...tokens
    ]

    return allTokens.map(token => {
      const isActive = isTokenRef
        ? (activeValue === token.tokenRef)
        : (activeValue === token.value)
      const title = token.tokenRef ? `${token.tokenRef}: ${token.value}` : token.value

      return `<button
        class="pp-token-btn ${isActive ? 'active' : ''}"
        data-${dataAttrPrefix}-token="${escapeHtml(token.value)}"
        ${token.tokenRef ? `data-token-ref="${escapeHtml(token.tokenRef)}"` : ''}
        data-${dataAttrPrefix}-dir="${dir}"
        title="${escapeHtml(title)}"
      >${escapeHtml(token.label)}</button>`
    }).join('')
  }

  getHandlers(): EventHandlerMap {
    return {
      '[data-pad-token]': {
        click: (e: Event, target: HTMLElement) => {
          const tokenRef = target.getAttribute('data-token-ref')
          const value = tokenRef || target.getAttribute('data-pad-token')
          const dir = target.getAttribute('data-pad-dir')
          if (value && dir) {
            this.deps.onPropertyChange('__PAD_TOKEN__', JSON.stringify({ value, dir }), 'token')
          }
        }
      },
      'input[data-pad-dir]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const dir = input.getAttribute('data-pad-dir')
          if (dir) {
            const result = validateSpacingValue(input.value)
            applyValidationStyle(input, result)
            if (result.valid) {
              this.deps.onPropertyChange('__PAD_INPUT__', JSON.stringify({ value: input.value, dir }), 'input')
            }
          }
        }
      },
      '[data-margin-token]': {
        click: (e: Event, target: HTMLElement) => {
          const tokenRef = target.getAttribute('data-token-ref')
          const value = tokenRef || target.getAttribute('data-margin-token')
          const dir = target.getAttribute('data-margin-dir')
          if (value && dir) {
            this.deps.onPropertyChange('__MARGIN_TOKEN__', JSON.stringify({ value, dir }), 'token')
          }
        }
      },
      'input[data-margin-dir]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const dir = input.getAttribute('data-margin-dir')
          if (dir) {
            const result = validateSpacingValue(input.value)
            applyValidationStyle(input, result)
            if (result.valid) {
              this.deps.onPropertyChange('__MARGIN_INPUT__', JSON.stringify({ value: input.value, dir }), 'input')
            }
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

    const scrubElements = this.container.querySelectorAll('[data-scrub]')
    scrubElements.forEach(element => {
      const label = element.querySelector('.pp-row-label') as HTMLElement
      const input = element.querySelector('input[type="text"]') as HTMLInputElement
      const scrubData = element.getAttribute('data-scrub')

      if (!label || !input || !scrubData) return

      const [type, dir] = scrubData.split('-')

      const instance = makeScrubable({
        label,
        input,
        min: 0,
        step: 1,
        allowDecimals: false,
        onChange: (value) => {
          if (type === 'pad') {
            this.deps.onPropertyChange('__PAD_INPUT__', JSON.stringify({ value: String(value), dir }), 'input')
          } else if (type === 'margin') {
            this.deps.onPropertyChange('__MARGIN_INPUT__', JSON.stringify({ value: String(value), dir }), 'input')
          }
        }
      })

      this.scrubInstances.push(instance)
    })
  }
}

export function createSpacingSection(deps: SectionDependencies): SpacingSection {
  return new SpacingSection(deps)
}

export { parseSpacingValue, buildSpacingValue }

/**
 * Typography Section - Font, Size, Weight, Align
 *
 * Renders typography controls with font dropdown, size tokens, weight dropdown,
 * alignment toggles, and style toggles.
 */

import {
  BaseSection,
  type SectionDependencies,
  type SectionData,
  type EventHandlerMap,
} from '../base/section'
import type { SpacingToken } from '../types'

/**
 * Font options matching prototype
 */
const FONT_OPTIONS = [
  'Inter',
  'SF Pro',
  'Helvetica',
  'Arial',
  'Georgia',
  'Times',
  'SF Mono',
  'Menlo',
]

/**
 * Weight options matching prototype
 */
const WEIGHT_OPTIONS = [
  { value: '100', label: '100 · Thin' },
  { value: '200', label: '200 · Extra Light' },
  { value: '300', label: '300 · Light' },
  { value: '400', label: '400 · Regular' },
  { value: '500', label: '500 · Medium' },
  { value: '600', label: '600 · Semi Bold' },
  { value: '700', label: '700 · Bold' },
  { value: '800', label: '800 · Extra Bold' },
  { value: '900', label: '900 · Black' },
]

/**
 * Text align options
 */
const TEXT_ALIGNS = ['left', 'center', 'right'] as const

/**
 * Align icons - thin lines using paths
 */
const ALIGN_ICONS = {
  left: '<path d="M2 3h10M2 7h6M2 11h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  center:
    '<path d="M2 3h10M4 7h6M3 11h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  right:
    '<path d="M2 3h10M8 7h4M6 11h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
}

/**
 * Style icons - matching prototype exactly
 */
const STYLE_ICONS = {
  italic: '<path d="M6 3h4M4 11h4M8 3L6 11"/>',
  underline: '<path d="M4 3v5a3 3 0 006 0V3M3 12h8"/>',
}

/**
 * Typography Section class
 */
export class TypographySection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Typography' }, deps)
  }

  render(data: SectionData): string {
    this.data = data
    const category = data.category
    if (!category) return ''

    const props = category.properties

    // Find typography properties
    const fontProp = props.find(p => p.name === 'font')
    const fontSizeProp = props.find(p => p.name === 'font-size' || p.name === 'fs')
    const weightProp = props.find(p => p.name === 'weight')
    const textAlignProp = props.find(p => p.name === 'text-align')

    const fontValue = fontProp?.value || ''
    const fontSizeValue = fontSizeProp?.value || ''
    const weightValue = weightProp?.value || ''
    const textAlignValue = textAlignProp?.value || ''

    // Font dropdown options
    const fontOptions = FONT_OPTIONS.map(
      f => `<option value="${f}" ${fontValue === f ? 'selected' : ''}>${f}</option>`
    ).join('')

    // Weight dropdown options
    const weightOptions = WEIGHT_OPTIONS.map(
      w =>
        `<option value="${w.value}" ${weightValue === w.value ? 'selected' : ''}>${w.label}</option>`
    ).join('')

    // Font size tokens
    const fontSizeTokens = data.getSpacingTokens?.('fs') || []
    const sizeTokens = this.renderSizeTokens(fontSizeValue, fontSizeTokens)

    // Resolve font size token value for display
    const fontSizeIsToken = fontSizeValue.startsWith('$')
    let fontSizeDisplayValue = fontSizeValue
    let fontSizeInputClass = 'pp-fontsize-input'
    if (fontSizeIsToken && data.resolveTokenValue) {
      // Pass 'fs' as property type for short references like "$s" → "$s.fs"
      const resolved = data.resolveTokenValue(fontSizeValue, 'fs')
      if (resolved) {
        fontSizeDisplayValue = resolved
        fontSizeInputClass = 'pp-fontsize-input token-resolved'
      }
    }

    // Align toggles
    const alignToggles = this.renderAlignToggles(textAlignValue)

    // Style toggles
    const styleToggles = this.renderStyleToggles(props)

    return `
      <div class="section">
        <div class="section-label">Typography</div>
        <div class="section-content">
          <div class="prop-row">
            <span class="prop-label">Font</span>
            <div class="prop-content">
              <select class="pp-font-input" data-prop="font">
                ${fontOptions}
              </select>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Size</span>
            <div class="prop-content">
              ${sizeTokens ? `<div class="token-group">${sizeTokens}</div>` : ''}
              <input type="text" class="${fontSizeInputClass}" value="${this.deps.escapeHtml(fontSizeDisplayValue)}" data-prop="font-size" data-token-ref="${fontSizeIsToken ? this.deps.escapeHtml(fontSizeValue) : ''}" placeholder="14" autocomplete="off">
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Weight</span>
            <div class="prop-content">
              <select class="pp-weight-input" data-prop="weight">
                ${weightOptions}
              </select>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Align</span>
            <div class="prop-content">
              <div class="toggle-group">
                ${alignToggles}
              </div>
              <div class="toggle-group">
                ${styleToggles}
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  private renderSizeTokens(fontSizeValue: string, tokens: SpacingToken[]): string {
    const MAX_VISIBLE = 3

    const renderToken = (token: SpacingToken) => {
      const isActive = fontSizeValue === token.value
      return `<button class="token-btn ${isActive ? 'active' : ''}" data-font-size="${token.value}" title="${token.value}px">${token.name}</button>`
    }

    if (tokens.length <= MAX_VISIBLE) {
      return tokens.map(renderToken).join('')
    }

    const visibleTokens = tokens.slice(0, MAX_VISIBLE)
    const hiddenTokens = tokens.slice(MAX_VISIBLE)
    const activeInHidden = hiddenTokens.some(t => fontSizeValue === t.value)

    const dropdownItems = hiddenTokens
      .map(token => {
        const isActive = fontSizeValue === token.value
        return `<button class="token-dropdown-item ${isActive ? 'active' : ''}" data-font-size="${token.value}">${token.name} <span class="token-dropdown-value">${token.value}</span></button>`
      })
      .join('')

    return `
      ${visibleTokens.map(renderToken).join('')}
      <div class="token-more-container">
        <button class="token-btn token-more-btn ${activeInHidden ? 'has-active' : ''}" title="${hiddenTokens.length} more tokens">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
        <div class="token-dropdown token-dropdown-fs">
          ${dropdownItems}
        </div>
      </div>
    `
  }

  private renderAlignToggles(textAlignValue: string): string {
    return TEXT_ALIGNS.map(align => {
      const isActive = textAlignValue === align
      const iconPath = ALIGN_ICONS[align] || ''
      return `<button class="toggle-btn ${isActive ? 'active' : ''}" data-text-align="${align}" title="${align.charAt(0).toUpperCase() + align.slice(1)}">
        <svg class="icon" viewBox="0 0 14 14" fill="none">${iconPath}</svg>
      </button>`
    }).join('')
  }

  private renderStyleToggles(
    props: Array<{ name: string; value: string; hasValue?: boolean }>
  ): string {
    return ['italic', 'underline']
      .map(style => {
        const prop = props.find(p => p.name === style)
        const isActive =
          prop && (prop.value === 'true' || (prop.value === '' && prop.hasValue !== false))
        const iconPath = STYLE_ICONS[style as keyof typeof STYLE_ICONS]
        return `<button class="toggle-btn ${isActive ? 'active' : ''}" data-text-style="${style}" title="${style.charAt(0).toUpperCase() + style.slice(1)}">
        <svg class="icon" viewBox="0 0 14 14">${iconPath}</svg>
      </button>`
      })
      .join('')
  }

  getHandlers(): EventHandlerMap {
    return {
      'select[data-prop="font"]': {
        change: (e: Event, target: HTMLElement) => {
          const select = target as HTMLSelectElement
          this.deps.onPropertyChange('font', select.value, 'select')
        },
      },
      '.token-btn[data-font-size]': {
        click: (e: Event, target: HTMLElement) => {
          const value = target.dataset.fontSize
          if (value) {
            this.deps.onPropertyChange('font-size', value, 'token')
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
      '.token-dropdown-item[data-font-size]': {
        click: (e: Event, target: HTMLElement) => {
          const value = target.dataset.fontSize
          if (value) {
            this.deps.onPropertyChange('font-size', value, 'token')
          }
          target.closest('.token-dropdown')?.classList.remove('open')
        },
      },
      'input[data-prop="font-size"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          this.deps.onPropertyChange('font-size', input.value, 'input')
        },
      },
      'select[data-prop="weight"]': {
        change: (e: Event, target: HTMLElement) => {
          const select = target as HTMLSelectElement
          this.deps.onPropertyChange('weight', select.value, 'select')
        },
      },
      '.toggle-btn[data-text-align]': {
        click: (e: Event, target: HTMLElement) => {
          const align = target.dataset.textAlign
          if (align) {
            this.deps.onPropertyChange('text-align', align, 'toggle')
          }
        },
      },
      '.toggle-btn[data-text-style]': {
        click: (e: Event, target: HTMLElement) => {
          const style = target.dataset.textStyle
          if (style) {
            this.deps.onToggleProperty(style, target.classList.contains('active'))
          }
        },
      },
    }
  }
}

/**
 * Factory function
 */
export function createTypographySection(deps: SectionDependencies): TypographySection {
  return new TypographySection(deps)
}

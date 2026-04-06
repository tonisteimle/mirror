/**
 * TypographySection - Font, Size, Weight, Style
 *
 * Handles:
 * - Font family dropdown
 * - Font size with tokens and input
 * - Font weight dropdown
 * - Text alignment toggles
 * - Style toggles (italic, underline, truncate)
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap, PropertyCategory, SpacingToken } from '../types'
import { escapeHtml } from '../utils'

/**
 * Font options
 */
const FONTS = ['Inter', 'SF Pro', 'Helvetica', 'Arial', 'Georgia', 'Times', 'SF Mono', 'Menlo']

/**
 * Weight options
 */
const WEIGHTS = [
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
 * Text alignments
 */
const TEXT_ALIGNS = ['left', 'center', 'right']

/**
 * Align icons
 */
const ALIGN_ICONS: Record<string, string> = {
  left: '<path d="M2 3h10M2 7h6M2 11h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  center: '<path d="M2 3h10M4 7h6M3 11h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  right: '<path d="M2 3h10M8 7h4M6 11h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
}

/**
 * Style icons
 */
const STYLE_ICONS: Record<string, string> = {
  italic: '<path d="M6 3h4M4 11h4M8 3L6 11"/>',
  underline: '<path d="M4 3v5a3 3 0 006 0V3M3 12h8"/>',
  truncate: '<path d="M2 7h6M10 7h.5M12 7h.5"/>'
}

/**
 * TypographySection class
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

    // Get font size tokens
    const fontSizeTokens = data.spacingTokens?.filter(t => t.fullName.endsWith('.fs')) || []

    return `
      <div class="pp-section">
        <div class="pp-section-label">Typography</div>
        <div class="pp-section-content">
          ${this.renderFontRow(fontValue)}
          ${this.renderSizeRow(fontSizeValue, fontSizeTokens)}
          ${this.renderWeightRow(weightValue)}
          ${this.renderAlignAndStyleRow(textAlignValue, props)}
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      // Font select change
      'select[data-prop="font"]': {
        change: (e: Event, target: HTMLElement) => {
          const select = target as HTMLSelectElement
          this.deps.onPropertyChange('font', select.value, 'input')
        }
      },
      // Font size token click
      '[data-font-size]': {
        click: (e: Event, target: HTMLElement) => {
          const value = target.getAttribute('data-font-size')
          if (value) {
            this.deps.onPropertyChange('font-size', value, 'token')
          }
        }
      },
      // Font size input change
      'input[data-prop="font-size"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          this.deps.onPropertyChange('font-size', input.value, 'input')
        }
      },
      // Weight select change
      'select[data-prop="weight"]': {
        change: (e: Event, target: HTMLElement) => {
          const select = target as HTMLSelectElement
          this.deps.onPropertyChange('weight', select.value, 'input')
        }
      },
      // Text align toggle
      '[data-text-align]': {
        click: (e: Event, target: HTMLElement) => {
          const align = target.getAttribute('data-text-align')
          if (align) {
            this.deps.onPropertyChange('text-align', align, 'toggle')
          }
        }
      },
      // Text style toggle
      '[data-text-style]': {
        click: (e: Event, target: HTMLElement) => {
          const style = target.getAttribute('data-text-style')
          if (style) {
            // Toggle - if active, remove; if inactive, add
            this.deps.onPropertyChange('__TEXT_STYLE__', style, 'toggle')
          }
        }
      }
    }
  }

  // ============================================
  // Private Render Methods
  // ============================================

  private renderFontRow(fontValue: string): string {
    const options = FONTS.map(f =>
      `<option value="${f}" ${fontValue === f ? 'selected' : ''}>${f}</option>`
    ).join('')

    return `
      <div class="pp-row">
        <span class="pp-row-label">Font</span>
        <div class="pp-row-content">
          <select class="pp-font-input" data-prop="font">
            ${options}
          </select>
        </div>
      </div>
    `
  }

  private renderSizeRow(fontSizeValue: string, tokens: SpacingToken[]): string {
    const tokenButtons = tokens.map(token => {
      const isActive = fontSizeValue === token.value
      return `<button class="pp-token-btn ${isActive ? 'active' : ''}" data-font-size="${escapeHtml(token.value)}" title="${escapeHtml(token.value)}px">${escapeHtml(token.name)}</button>`
    }).join('')

    return `
      <div class="pp-row">
        <span class="pp-row-label">Size</span>
        <div class="pp-row-content">
          ${tokenButtons ? `<div class="pp-token-group">${tokenButtons}</div>` : ''}
          <input type="text" class="pp-fontsize-input" value="${escapeHtml(fontSizeValue)}" data-prop="font-size" placeholder="14" autocomplete="off">
        </div>
      </div>
    `
  }

  private renderWeightRow(weightValue: string): string {
    const options = WEIGHTS.map(w =>
      `<option value="${w.value}" ${weightValue === w.value ? 'selected' : ''}>${w.label}</option>`
    ).join('')

    return `
      <div class="pp-row">
        <span class="pp-row-label">Weight</span>
        <div class="pp-row-content">
          <select class="pp-weight-input" data-prop="weight">
            ${options}
          </select>
        </div>
      </div>
    `
  }

  private renderAlignAndStyleRow(
    textAlignValue: string,
    props: Array<{ name: string; value: string; hasValue?: boolean }>
  ): string {
    // Align toggles
    const alignToggles = TEXT_ALIGNS.map(align => {
      const isActive = textAlignValue === align
      const iconPath = ALIGN_ICONS[align] || ''
      return `<button class="pp-toggle-btn ${isActive ? 'active' : ''}" data-text-align="${align}" title="${align.charAt(0).toUpperCase() + align.slice(1)}">
        <svg class="pp-icon" viewBox="0 0 14 14" fill="none">${iconPath}</svg>
      </button>`
    }).join('')

    // Style toggles
    const styleToggles = ['italic', 'underline', 'truncate'].map(style => {
      const prop = props.find(p => p.name === style)
      const isActive = prop && (prop.value === 'true' || (prop.value === '' && prop.hasValue !== false))
      const iconPath = STYLE_ICONS[style]
      return `<button class="pp-toggle-btn ${isActive ? 'active' : ''}" data-text-style="${style}" title="${style.charAt(0).toUpperCase() + style.slice(1)}">
        <svg class="pp-icon" viewBox="0 0 14 14">${iconPath}</svg>
      </button>`
    }).join('')

    return `
      <div class="pp-row">
        <span class="pp-row-label">Align</span>
        <div class="pp-row-content">
          <div class="pp-toggle-group">
            ${alignToggles}
          </div>
          <div class="pp-toggle-group">
            ${styleToggles}
          </div>
        </div>
      </div>
    `
  }
}

/**
 * Factory function
 */
export function createTypographySection(deps: SectionDependencies): TypographySection {
  return new TypographySection(deps)
}

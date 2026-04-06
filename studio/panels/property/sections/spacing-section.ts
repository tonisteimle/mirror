/**
 * SpacingSection - Padding and Margin
 *
 * COMPACT LAYOUT:
 * - Padding H/V in 2-column grid with icons (collapsed)
 * - T/R/B/L in 2x2 grid (expanded)
 * - Same for Margin
 * - Token presets for both
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap, PropertyCategory, SpacingToken } from '../types'
import { spacingTokensToOptions } from '../components'
import { escapeHtml, validateSpacingValue, applyValidationStyle, PROP_ICONS } from '../utils'
import { toggleExpanded, applyExpandedState } from '../utils/expand-state'
import { makeScrubable, type ScrubInstance } from '../utils/scrub'

/**
 * Expand icons
 */
const EXPAND_ICONS = {
  collapsed: `<svg class="pp-icon icon-collapsed" viewBox="0 0 14 14">
    <path d="M4 6l3 3 3-3"/>
  </svg>`,
  expanded: `<svg class="pp-icon icon-expanded" viewBox="0 0 14 14">
    <path d="M4 8l3-3 3 3"/>
  </svg>`
}

/**
 * Parse spacing value (1, 2, 3, or 4 values) into T, R, B, L
 * - 1 value: all sides
 * - 2 values: vertical, horizontal
 * - 3 values: top, horizontal, bottom
 * - 4 values: top, right, bottom, left
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
    // CSS 3-value shorthand: top, horizontal (left+right), bottom
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
        },
        keydown: (e: Event, target: HTMLElement) => {
          this.handleTokenKeydown(e as KeyboardEvent, target, 'pad')
        }
      },
      // Padding input change
      'input[data-pad-dir]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const dir = input.getAttribute('data-pad-dir')
          if (dir) {
            const result = validateSpacingValue(input.value)
            applyValidationStyle(input, result)
            if (result.valid) {
              this.handlePadInputChange(input.value, dir)
            }
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
        },
        keydown: (e: Event, target: HTMLElement) => {
          this.handleTokenKeydown(e as KeyboardEvent, target, 'margin')
        }
      },
      // Margin input change
      'input[data-margin-dir]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const dir = input.getAttribute('data-margin-dir')
          if (dir) {
            const result = validateSpacingValue(input.value)
            applyValidationStyle(input, result)
            if (result.valid) {
              this.handleMarginInputChange(input.value, dir)
            }
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
      <div class="pp-section">
        <div class="pp-section-label">
          <span>Padding</span>
          <button class="pp-section-expand-btn" data-expand="spacing" title="Show individual values (Top, Right, Bottom, Left)">
            ${EXPAND_ICONS.collapsed}
            ${EXPAND_ICONS.expanded}
          </button>
        </div>
        <div class="pp-section-content" data-expand-container="spacing">
          <!-- Collapsed: H/V in 2-column grid -->
          <div class="pp-row-grid collapsed-row" data-expand-group="spacing">
            ${this.renderSpacingCell(PROP_ICONS.paddingH, 'Horizontal', hPad, 'h', 'pad', tokenOptions, hasTokens)}
            ${this.renderSpacingCell(PROP_ICONS.paddingV, 'Vertical', vPad, 'v', 'pad', tokenOptions, hasTokens)}
          </div>
          <!-- Expanded: T/R/B/L in 2x2 grid -->
          <div class="pp-row-grid expanded-row" data-expand-group="spacing">
            ${this.renderSpacingCell(PROP_ICONS.paddingTop, 'Top', tPad, 't', 'pad', tokenOptions, hasTokens)}
            ${this.renderSpacingCell(PROP_ICONS.paddingRight, 'Right', rPad, 'r', 'pad', tokenOptions, hasTokens)}
          </div>
          <div class="pp-row-grid expanded-row" data-expand-group="spacing">
            ${this.renderSpacingCell(PROP_ICONS.paddingBottom, 'Bottom', bPad, 'b', 'pad', tokenOptions, hasTokens)}
            ${this.renderSpacingCell(PROP_ICONS.paddingLeft, 'Left', lPad, 'l', 'pad', tokenOptions, hasTokens)}
          </div>
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
      <div class="pp-section">
        <div class="pp-section-label">
          <span>Margin</span>
          <button class="pp-section-expand-btn" data-expand="margin" title="Show individual values (Top, Right, Bottom, Left)">
            ${EXPAND_ICONS.collapsed}
            ${EXPAND_ICONS.expanded}
          </button>
        </div>
        <div class="pp-section-content" data-expand-container="margin">
          <!-- Collapsed: H/V in 2-column grid -->
          <div class="pp-row-grid collapsed-row" data-expand-group="margin">
            ${this.renderSpacingCell(PROP_ICONS.marginH, 'Horizontal', hMargin, 'h', 'margin', tokenOptions, hasTokens)}
            ${this.renderSpacingCell(PROP_ICONS.marginV, 'Vertical', vMargin, 'v', 'margin', tokenOptions, hasTokens)}
          </div>
          <!-- Expanded: T/R/B/L in 2x2 grid -->
          <div class="pp-row-grid expanded-row" data-expand-group="margin">
            ${this.renderSpacingCell(PROP_ICONS.marginTop, 'Top', tMargin, 't', 'margin', tokenOptions, hasTokens)}
            ${this.renderSpacingCell(PROP_ICONS.marginRight, 'Right', rMargin, 'r', 'margin', tokenOptions, hasTokens)}
          </div>
          <div class="pp-row-grid expanded-row" data-expand-group="margin">
            ${this.renderSpacingCell(PROP_ICONS.marginBottom, 'Bottom', bMargin, 'b', 'margin', tokenOptions, hasTokens)}
            ${this.renderSpacingCell(PROP_ICONS.marginLeft, 'Left', lMargin, 'l', 'margin', tokenOptions, hasTokens)}
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render a compact spacing cell for grid layout
   */
  private renderSpacingCell(
    icon: string,
    title: string,
    value: string,
    dir: string,
    type: 'pad' | 'margin',
    tokens: Array<{ label: string; value: string; tokenRef?: string }>,
    hasTokens: boolean
  ): string {
    const dataAttrPrefix = type === 'pad' ? 'pad' : 'margin'
    const dirAttr = type === 'pad' ? 'data-pad-dir' : 'data-margin-dir'

    // Render token buttons
    const tokenButtons = hasTokens ? this.renderTokenButtons(value, tokens, dataAttrPrefix, dir) : ''

    // Check if value matches any token
    const isTokenRef = value.startsWith('$')
    const matchesToken = tokens.some(t => isTokenRef ? value === t.tokenRef : value === t.value)
    const shouldMuteTokens = hasTokens && value && !matchesToken && !isTokenRef

    // Build input with optional token group
    const inputHtml = hasTokens
      ? `<div class="pp-token-input-group${shouldMuteTokens ? ' input-modified' : ''}">
          <div class="pp-token-group">${tokenButtons}</div>
          <div class="pp-cell-input">
            <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(value)}" ${dirAttr}="${dir}" placeholder="0">
          </div>
        </div>`
      : `<div class="pp-cell-input">
          <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(value)}" ${dirAttr}="${dir}" placeholder="0">
        </div>`

    return `
      <div class="pp-cell${isTokenRef ? ' uses-token' : ''}" data-scrub="${type}-${dir}">
        <span class="pp-cell-label" title="${title}">${icon}</span>
        ${inputHtml}
      </div>
    `
  }

  // Keep old renderSpacingRow for backwards compatibility if needed
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

    // Render token buttons with muted state detection
    const tokenButtons = hasTokens ? this.renderTokenButtons(value, tokens, dataAttrPrefix, dir) : ''

    // Check if value matches any token (for muting non-matching tokens)
    const isTokenRef = value.startsWith('$')
    const matchesToken = tokens.some(t => isTokenRef ? value === t.tokenRef : value === t.value)
    const shouldMuteTokens = hasTokens && value && !matchesToken && !isTokenRef

    // Use grouped layout when tokens are present - wrap input for error hints
    const inputContent = hasTokens
      ? `<div class="pp-token-input-group${shouldMuteTokens ? ' input-modified' : ''}">
          <div class="pp-token-group">${tokenButtons}</div>
          <div class="pp-input-wrapper">
            <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(value)}" ${dirAttr}="${dir}" placeholder="0" data-tokens-available="true">
          </div>
        </div>`
      : `<div class="pp-input-wrapper">
          <input type="text" class="pp-input" autocomplete="off" value="${escapeHtml(value)}" ${dirAttr}="${dir}" placeholder="0">
        </div>`

    // Build row classes
    const rowClasses = [
      'pp-row',
      rowClass,
      isOverride ? 'override' : '',
      isTokenRef ? 'uses-token' : ''
    ].filter(Boolean).join(' ')

    // Build data attributes - include scrub for numeric adjustment
    const scrubAttr = `data-scrub="${type}-${dir}"`

    return `
      <div class="${rowClasses}" data-expand-group="${type === 'pad' ? 'spacing' : 'margin'}" ${scrubAttr}>
        <span class="pp-row-label">${escapeHtml(label)}</span>
        <div class="pp-row-content">
          ${inputContent}
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
        class="pp-token-btn ${isActive ? 'active' : ''}"
        data-${dataAttrPrefix}-token="${escapeHtml(token.value)}"
        ${token.tokenRef ? `data-token-ref="${escapeHtml(token.tokenRef)}"` : ''}
        data-${dataAttrPrefix}-dir="${dir}"
        title="${escapeHtml(title)}"
        tabindex="0"
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

  private handleTokenKeydown(e: KeyboardEvent, target: HTMLElement, type: 'pad' | 'margin'): void {
    const key = e.key

    // Handle Enter/Space - activate the token
    if (key === 'Enter' || key === ' ') {
      e.preventDefault()
      target.click()
      return
    }

    // Handle ArrowLeft/ArrowRight - navigate between tokens
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      e.preventDefault()
      const tokenGroup = target.closest('.pp-token-group')
      if (!tokenGroup) return

      const tokens = Array.from(tokenGroup.querySelectorAll('.pp-token-btn')) as HTMLElement[]
      const currentIndex = tokens.indexOf(target)
      if (currentIndex === -1) return

      let nextIndex: number
      if (key === 'ArrowLeft') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : tokens.length - 1
      } else {
        nextIndex = currentIndex < tokens.length - 1 ? currentIndex + 1 : 0
      }

      tokens[nextIndex]?.focus()
    }
  }

  private handleExpandClick(groupName: string): void {
    if (this.container) {
      const sectionKey = `spacing-${groupName}`
      const isExpanded = toggleExpanded(sectionKey)

      const container = this.container.querySelector(`[data-expand-container="${groupName}"]`)
      if (container) {
        container.classList.toggle('expanded', isExpanded)
        // Also toggle on parent .pp-section for CSS purposes
        const section = container.closest('.pp-section')
        if (section) {
          section.classList.toggle('expanded', isExpanded)
        }
      }
    }
  }

  /**
   * Called after the section is mounted to restore persisted expand states
   */
  afterMount(): void {
    if (this.container) {
      applyExpandedState(this.container, 'spacing-spacing', '[data-expand-container="spacing"]')
      applyExpandedState(this.container, 'spacing-margin', '[data-expand-container="margin"]')
      this.setupScrubbing()
    }
  }

  /**
   * Clean up scrub instances before re-render
   */
  private cleanupScrubbing(): void {
    this.scrubInstances.forEach(instance => instance.destroy())
    this.scrubInstances = []
  }

  /**
   * Set up scrubbing on all scrubbable labels
   */
  private setupScrubbing(): void {
    this.cleanupScrubbing()

    if (!this.container) return

    // Find all elements with data-scrub attribute (rows or cells)
    const scrubElements = this.container.querySelectorAll('[data-scrub]')

    scrubElements.forEach(element => {
      // Support both old .pp-row-label and new .pp-cell-label
      const label = element.querySelector('.pp-cell-label, .pp-row-label') as HTMLElement
      const input = element.querySelector('input[type="text"]') as HTMLInputElement
      const scrubData = element.getAttribute('data-scrub')

      if (!label || !input || !scrubData) return

      // Parse scrub data: "pad-h", "margin-v", etc.
      const [type, dir] = scrubData.split('-')

      const instance = makeScrubable({
        label,
        input,
        min: 0,
        step: 1,
        allowDecimals: false,
        onChange: (value) => {
          if (type === 'pad') {
            this.handlePadInputChange(String(value), dir)
          } else if (type === 'margin') {
            this.handleMarginInputChange(String(value), dir)
          }
        }
      })

      this.scrubInstances.push(instance)
    })
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

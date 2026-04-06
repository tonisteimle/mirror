/**
 * LayoutSection - Layout Mode, Gap, Wrap, and Alignment
 *
 * Handles:
 * - Layout mode toggle (horizontal, vertical, grid, stacked)
 * - Gap spacing
 * - Wrap toggle
 * - 9-position alignment grid
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap, PropertyCategory, SpacingToken } from '../types'
import {
  renderToggleGroup,
  renderTokenInput,
  renderAlignGrid,
  parseAlignmentState,
  spacingTokensToOptions
} from '../components'
import { escapeHtml, classNames } from '../utils'
import { LAYOUT_ICONS, getLayoutIcon } from '../../../icons'

/**
 * Layout modes
 */
const LAYOUT_MODES = ['horizontal', 'vertical', 'grid', 'stacked'] as const
type LayoutMode = typeof LAYOUT_MODES[number]

/**
 * Layout icons for each mode
 */
const MODE_ICONS: Record<LayoutMode, string> = {
  horizontal: getLayoutIcon('hbox', 'icon'),
  vertical: getLayoutIcon('vbox', 'icon'),
  grid: getLayoutIcon('grid', 'icon'),
  stacked: getLayoutIcon('zstack', 'icon')
}

/**
 * LayoutSection class
 */
export class LayoutSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Layout' }, deps)
  }

  render(data: SectionData): string {
    this.data = data
    const category = data.category
    if (!category) return ''

    const props = category.properties
    const alignmentCat = data.relatedCategories?.get('alignment')

    // Determine active layout mode
    const activeMode = this.getActiveLayoutMode(props)

    // Get gap value
    const gapProp = props.find(p => p.name === 'gap' || p.name === 'g')
    const gapValue = gapProp?.value || ''

    // Get wrap state
    const wrapProp = props.find(p => p.name === 'wrap')
    const wrapActive = wrapProp && (wrapProp.value === 'true' || (wrapProp.value === '' && wrapProp.hasValue !== false))

    // Get gap tokens
    const gapTokens = data.spacingTokens || []
    const tokenOptions = spacingTokensToOptions(gapTokens)

    // Build sections
    const modeRow = this.renderModeRow(activeMode)
    const gapRow = this.renderGapRow(gapValue, tokenOptions)
    const wrapRow = (activeMode === 'horizontal' || activeMode === 'vertical')
      ? this.renderWrapRow(wrapActive)
      : ''
    const alignRow = alignmentCat ? this.renderAlignmentRow(alignmentCat) : ''

    return `
      <div class="section">
        <div class="section-label">Layout</div>
        <div class="section-content">
          ${modeRow}
          ${gapRow}
          ${wrapRow}
          ${alignRow}
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      // Layout mode toggle
      '.toggle-btn[data-layout]': {
        click: (e: Event, target: HTMLElement) => {
          const layout = target.getAttribute('data-layout')
          if (layout) {
            this.handleLayoutToggle(layout)
          }
        }
      },
      // Gap token click
      '[data-gap-token]': {
        click: (e: Event, target: HTMLElement) => {
          const tokenRef = target.getAttribute('data-token-ref')
          const value = tokenRef || target.getAttribute('data-gap-token')
          if (value) {
            this.deps.onPropertyChange('gap', value, 'token')
          }
        }
      },
      // Gap input change
      'input[data-prop="gap"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          this.deps.onPropertyChange('gap', input.value, 'input')
        }
      },
      // Wrap toggle
      '[data-wrap]': {
        click: (e: Event, target: HTMLElement) => {
          const wrapValue = target.getAttribute('data-wrap')
          if (wrapValue === 'on') {
            this.deps.onPropertyChange('wrap', '', 'toggle')
          } else {
            // Remove wrap - signal with special value
            this.deps.onPropertyChange('wrap', '__REMOVE__', 'toggle')
          }
        }
      },
      // Alignment grid
      '.align-cell': {
        click: (e: Event, target: HTMLElement) => {
          const align = target.getAttribute('data-align')
          if (align) {
            this.handleAlignmentClick(align)
          }
        }
      }
    }
  }

  // ============================================
  // Private Render Methods
  // ============================================

  private renderModeRow(activeMode: LayoutMode): string {
    const buttons = LAYOUT_MODES.map(mode => {
      const isActive = mode === activeMode
      const icon = MODE_ICONS[mode]
      const title = mode.charAt(0).toUpperCase() + mode.slice(1)

      return `<button
        class="toggle-btn ${isActive ? 'active' : ''}"
        data-layout="${mode}"
        title="${title}"
      >${icon}</button>`
    }).join('')

    return `
      <div class="prop-row">
        <span class="prop-label">Mode</span>
        <div class="prop-content">
          <div class="toggle-group">${buttons}</div>
        </div>
      </div>
    `
  }

  private renderGapRow(value: string, tokens: Array<{ label: string; value: string; tokenRef?: string }>): string {
    const tokenButtons = tokens.map(token => {
      const isTokenRef = value.startsWith('$')
      const active = isTokenRef
        ? (value === token.tokenRef)
        : (value === token.value)
      const title = token.tokenRef ? `${token.tokenRef}: ${token.value}` : token.value

      return `<button
        class="token-btn ${active ? 'active' : ''}"
        data-gap-token="${escapeHtml(token.value)}"
        ${token.tokenRef ? `data-token-ref="${escapeHtml(token.tokenRef)}"` : ''}
        title="${escapeHtml(title)}"
      >${escapeHtml(token.label)}</button>`
    }).join('')

    return `
      <div class="prop-row">
        <span class="prop-label">Gap</span>
        <div class="prop-content">
          ${tokens.length > 0 ? `<div class="token-group">${tokenButtons}</div>` : ''}
          <input
            type="text"
            class="prop-input"
            autocomplete="off"
            value="${escapeHtml(value)}"
            data-prop="gap"
            placeholder="0"
          >
        </div>
      </div>
    `
  }

  private renderWrapRow(wrapActive: boolean): string {
    const wrapIcon = `<svg class="icon" viewBox="0 0 14 14">
      <rect x="1" y="3" width="2" height="2" fill="currentColor"/>
      <rect x="6" y="3" width="2" height="2" fill="currentColor"/>
      <rect x="11" y="3" width="2" height="2" fill="currentColor"/>
      <rect x="1" y="9" width="2" height="2" fill="currentColor"/>
      <rect x="6" y="9" width="2" height="2" fill="currentColor"/>
    </svg>`

    return `
      <div class="prop-row">
        <span class="prop-label">Wrap</span>
        <div class="prop-content">
          <button
            class="toggle-btn single ${wrapActive ? 'active' : ''}"
            data-wrap="${wrapActive ? 'off' : 'on'}"
            title="${wrapActive ? 'Disable wrap' : 'Enable wrap'}"
          >${wrapIcon}</button>
        </div>
      </div>
    `
  }

  private renderAlignmentRow(alignmentCat: PropertyCategory): string {
    const alignProps = alignmentCat.properties

    // Helper to check if a property is active
    const isAlignActive = (name: string) => {
      const prop = alignProps.find(p => p.name === name)
      return prop && (prop.value === 'true' || (prop.value === '' && prop.hasValue !== false))
    }

    // Parse alignment state
    const state = parseAlignmentState(isAlignActive)

    // Render the grid
    const gridHtml = renderAlignGrid(state)

    return `
      <div class="prop-row">
        <span class="prop-label">Align</span>
        <div class="prop-content">
          ${gridHtml}
        </div>
      </div>
    `
  }

  // ============================================
  // Private Handler Methods
  // ============================================

  private getActiveLayoutMode(props: Array<{ name: string; value: string; hasValue?: boolean }>): LayoutMode {
    const isActive = (name: string) => {
      const prop = props.find(p => p.name === name || p.name === name.substring(0, 3))
      return prop && (prop.value === 'true' || (prop.value === '' && prop.hasValue !== false))
    }

    // Check each mode
    for (const mode of LAYOUT_MODES) {
      if (isActive(mode)) {
        return mode
      }
    }

    // Check short forms
    if (isActive('hor')) return 'horizontal'
    if (isActive('ver')) return 'vertical'

    // Default to vertical
    return 'vertical'
  }

  private handleLayoutToggle(layout: string): void {
    // The property panel will handle the actual layout modification
    // We emit a special signal that indicates layout change
    this.deps.onPropertyChange('__LAYOUT__', layout, 'toggle')
  }

  private handleAlignmentClick(align: string): void {
    // The property panel will handle the actual alignment modification
    // We emit a special signal that indicates alignment change
    this.deps.onPropertyChange('__ALIGNMENT__', align, 'toggle')
  }
}

/**
 * Factory function
 */
export function createLayoutSection(deps: SectionDependencies): LayoutSection {
  return new LayoutSection(deps)
}

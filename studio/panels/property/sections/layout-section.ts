/**
 * Layout Section - Mode, Gap, Wrap, Alignment
 *
 * Renders layout controls including mode toggles (hor/ver/grid/stacked),
 * gap tokens and input, wrap toggle, and 3x3 alignment grid.
 */

import {
  BaseSection,
  type SectionDependencies,
  type SectionData,
  type EventHandlerMap,
} from '../base/section'
import type { SpacingToken } from '../types'
import { getLayoutIcon } from '../../../icons'

/**
 * Layout modes (mutually exclusive)
 */
const LAYOUT_MODES = ['vertical', 'horizontal', 'grid', 'stacked'] as const

/**
 * Layout Section class
 */
export class LayoutSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Layout' }, deps)
  }

  render(data: SectionData): string {
    this.data = data

    // Get layout category
    const layoutCat = data.categories?.find(c => c.name === 'layout')
    const alignmentCat = data.categories?.find(c => c.name === 'alignment')

    if (!layoutCat) return ''

    const props = layoutCat.properties

    // Find which layout mode is active
    const isActive = (name: string) => {
      const prop = props.find(p => p.name === name || p.name === name.substring(0, 3))
      return prop && (prop.value === 'true' || (prop.value === '' && prop.hasValue !== false))
    }

    // Determine active mode (default to vertical if none set)
    let activeMode: string = 'vertical'
    for (const mode of LAYOUT_MODES) {
      if (isActive(mode)) {
        activeMode = mode
        break
      }
    }
    // Also check short forms
    if (isActive('hor')) activeMode = 'horizontal'
    if (isActive('ver')) activeMode = 'vertical'

    // Find gap property
    const gapProp = props.find(p => p.name === 'gap' || p.name === 'g')
    const gapValue = gapProp?.value || ''

    // Find wrap property
    const wrapProp = props.find(p => p.name === 'wrap')
    const wrapActive = !!(
      wrapProp &&
      (wrapProp.value === 'true' || (wrapProp.value === '' && wrapProp.hasValue !== false))
    )

    // Get dynamic gap tokens
    const gapTokens = data.getSpacingTokens?.('gap') || []
    const gapTokensHtml = this.renderGapTokens(gapValue, gapTokens)

    // Resolve token value for display
    const isGapToken = gapValue.startsWith('$')
    let gapDisplayValue = gapValue
    let gapInputClass = 'prop-input'
    if (isGapToken && data.resolveTokenValue) {
      // Pass 'gap' as property type for short references like "$s" → "$s.gap"
      const resolved = data.resolveTokenValue(gapValue, 'gap')
      if (resolved) {
        gapDisplayValue = resolved
        gapInputClass = 'prop-input token-resolved'
      }
    }

    // Render alignment grid
    const alignmentRow = alignmentCat ? this.renderAlignmentRow(alignmentCat) : ''

    // Wrap row (only for hor/ver modes)
    const wrapRow =
      activeMode === 'horizontal' || activeMode === 'vertical' ? this.renderWrapRow(wrapActive) : ''

    return `
      <div class="section">
        <div class="section-label">Layout</div>
        <div class="section-content">
          <div class="prop-row">
            <span class="prop-label">Mode</span>
            <div class="prop-content">
              <div class="toggle-group">
                <button class="toggle-btn ${activeMode === 'horizontal' ? 'active' : ''}" data-layout="horizontal" title="Horizontal">
                  ${getLayoutIcon('hbox', 'icon')}
                </button>
                <button class="toggle-btn ${activeMode === 'vertical' ? 'active' : ''}" data-layout="vertical" title="Vertical">
                  ${getLayoutIcon('vbox', 'icon')}
                </button>
                <button class="toggle-btn ${activeMode === 'grid' ? 'active' : ''}" data-layout="grid" title="Grid">
                  ${getLayoutIcon('grid', 'icon')}
                </button>
                <button class="toggle-btn ${activeMode === 'stacked' ? 'active' : ''}" data-layout="stacked" title="Stacked">
                  ${getLayoutIcon('zstack', 'icon')}
                </button>
              </div>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Gap</span>
            <div class="prop-content">
              ${gapTokensHtml ? `<div class="token-group">${gapTokensHtml}</div>` : ''}
              <input type="text" class="${gapInputClass}" autocomplete="off" value="${this.deps.escapeHtml(gapDisplayValue)}" data-prop="gap" data-token-ref="${isGapToken ? this.deps.escapeHtml(gapValue) : ''}" placeholder="0">
            </div>
          </div>
          ${wrapRow}
          ${alignmentRow}
        </div>
      </div>
    `
  }

  private renderGapTokens(gapValue: string, tokens: SpacingToken[]): string {
    const isGapTokenRef = gapValue.startsWith('$')

    return tokens
      .map(token => {
        const tokenRef = `$${token.fullName}`
        const active = isGapTokenRef ? gapValue === tokenRef : gapValue === token.value
        return `<button class="token-btn ${active ? 'active' : ''}" data-gap-token="${token.value}" data-token-ref="${tokenRef}" title="${tokenRef}: ${token.value}">${token.name}</button>`
      })
      .join('')
  }

  private renderWrapRow(wrapActive: boolean): string {
    return `
      <div class="prop-row">
        <span class="prop-label">Wrap</span>
        <div class="prop-content">
          <button class="toggle-btn single ${wrapActive ? 'active' : ''}" data-wrap="${wrapActive ? 'off' : 'on'}" title="${wrapActive ? 'Disable wrap' : 'Enable wrap'}">
            <svg class="icon" viewBox="0 0 14 14">
              <rect x="1" y="3" width="2" height="2" fill="currentColor"/><rect x="6" y="3" width="2" height="2" fill="currentColor"/><rect x="11" y="3" width="2" height="2" fill="currentColor"/><rect x="1" y="9" width="2" height="2" fill="currentColor"/><rect x="6" y="9" width="2" height="2" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>`
  }

  private renderAlignmentRow(alignmentCat: {
    properties: Array<{ name: string; value: string; hasValue?: boolean }>
  }): string {
    const alignProps = alignmentCat.properties

    const isAlignActive = (name: string) => {
      const prop = alignProps.find(p => p.name === name)
      return prop && (prop.value === 'true' || (prop.value === '' && prop.hasValue !== false))
    }

    const vAlign = isAlignActive('top')
      ? 'top'
      : isAlignActive('bottom')
        ? 'bottom'
        : isAlignActive('ver-center')
          ? 'middle'
          : null
    const hAlign = isAlignActive('left')
      ? 'left'
      : isAlignActive('right')
        ? 'right'
        : isAlignActive('hor-center')
          ? 'center'
          : null
    const isCenter = isAlignActive('center')

    const cells = [
      ['top-left', 'top-center', 'top-right'],
      ['middle-left', 'middle-center', 'middle-right'],
      ['bottom-left', 'bottom-center', 'bottom-right'],
    ]

    const getCellActive = (v: string, h: string): boolean => {
      if (v === 'middle' && h === 'center' && isCenter) return true
      const vMatch =
        (v === 'top' && vAlign === 'top') ||
        (v === 'middle' && vAlign === 'middle') ||
        (v === 'bottom' && vAlign === 'bottom')
      const hMatch =
        (h === 'left' && hAlign === 'left') ||
        (h === 'center' && hAlign === 'center') ||
        (h === 'right' && hAlign === 'right')
      return vMatch && hMatch
    }

    const gridHtml = cells
      .map((row, vIdx) => {
        const vName = ['top', 'middle', 'bottom'][vIdx]
        return row
          .map((cell, hIdx) => {
            const hName = ['left', 'center', 'right'][hIdx]
            const active = getCellActive(vName, hName)
            return `<button class="align-cell ${active ? 'active' : ''}" data-align="${cell}" title="${cell.replace('-', ' ')}"></button>`
          })
          .join('')
      })
      .join('')

    return `
      <div class="prop-row">
        <span class="prop-label">Align</span>
        <div class="prop-content">
          <div class="align-grid">
            ${gridHtml}
          </div>
        </div>
      </div>`
  }

  getHandlers(): EventHandlerMap {
    return {
      '.toggle-btn[data-layout]': {
        click: (e: Event, target: HTMLElement) => {
          const layout = target.dataset.layout
          if (layout) {
            this.deps.onPropertyChange('__LAYOUT_MODE__', layout, 'toggle')
          }
        },
      },
      '.token-btn[data-gap-token]': {
        click: (e: Event, target: HTMLElement) => {
          const tokenRef = target.dataset.tokenRef
          const value = tokenRef || target.dataset.gapToken
          if (value) {
            this.deps.onPropertyChange('gap', value, 'token')
          }
        },
      },
      'input[data-prop="gap"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          this.deps.onPropertyChange('gap', input.value, 'input')
        },
      },
      '.toggle-btn[data-wrap]': {
        click: (e: Event, target: HTMLElement) => {
          const wrapAction = target.dataset.wrap
          this.deps.onToggleProperty('wrap', wrapAction === 'off')
        },
      },
      '.align-cell[data-align]': {
        click: (e: Event, target: HTMLElement) => {
          const align = target.dataset.align
          if (align) {
            this.deps.onPropertyChange('__ALIGN__', align, 'toggle')
          }
        },
      },
    }
  }
}

/**
 * Factory function
 */
export function createLayoutSection(deps: SectionDependencies): LayoutSection {
  return new LayoutSection(deps)
}

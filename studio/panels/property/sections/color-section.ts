/**
 * Color Section - Background, Text, Icon, Border Color
 *
 * Renders color picker triggers based on primitive type.
 * Uses colorProps from SectionData to filter which colors to show.
 */

import {
  BaseSection,
  type SectionDependencies,
  type SectionData,
  type EventHandlerMap,
} from '../base/section'
import { renderTokenButtonGroup } from '../utils/render-token-buttons'
import type { ColorToken } from '../types'

/**
 * Color property configuration
 */
interface ColorPropConfig {
  prop: string // Property name in code (bg, col, ic, boc)
  label: string // Display label
  aliases: string[] // Alternative property names to search
}

const COLOR_PROPS: Record<string, ColorPropConfig> = {
  bg: { prop: 'bg', label: 'Background', aliases: ['background', 'bg'] },
  col: { prop: 'col', label: 'Text', aliases: ['color', 'col', 'c'] },
  ic: { prop: 'ic', label: 'Color', aliases: ['icon-color', 'ic'] },
  boc: { prop: 'boc', label: 'Border', aliases: ['border-color', 'boc'] },
}

/**
 * Color Section class
 */
export class ColorSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Color' }, deps)
  }

  render(data: SectionData): string {
    this.data = data

    // Determine which color properties to show
    const colorProps = data.colorProps || ['bg', 'col']
    const allProps = data.allProperties || []

    // Build rows for each color property
    const allColorTokens = data.colorTokens || []
    const rows: string[] = []
    for (const propKey of colorProps) {
      const config = COLOR_PROPS[propKey]
      if (!config) continue

      // Find the property value
      const prop = allProps.find((p: { name: string }) => config.aliases.includes(p.name))
      const value = prop?.value || ''
      const isOverride = prop?.source === 'instance'
      const isToken = value.startsWith('$')
      const display = isToken ? value : value || 'none'
      const swatchColor = isToken ? data.resolveTokenValue?.(value, config.prop) || value : value

      // Filter color tokens applicable to this slot:
      //   - `name.{prop}` (e.g. primary.bg for the bg row)
      //   - `name` (no dot — property-set tokens apply to any color slot)
      const matchingTokens = filterColorTokensForProp(allColorTokens, config.prop)

      rows.push(
        this.renderColorRow(
          config.label,
          config.prop,
          value,
          display,
          swatchColor,
          isToken,
          isOverride,
          matchingTokens
        )
      )
    }

    if (rows.length === 0) return ''

    // Add fill toggle for Icon
    let fillToggle = ''
    if (data.primitive === 'Icon') {
      const fillProp = allProps.find((p: { name: string }) => p.name === 'fill')
      const isFilled = fillProp?.value === 'true' || fillProp?.value === ''
      fillToggle = `
        <div class="prop-row">
          <span class="prop-label">Fill</span>
          <div class="prop-content">
            <label class="pp-toggle">
              <input type="checkbox" data-toggle-prop="fill" ${isFilled ? 'checked' : ''}>
              <span class="pp-toggle-slider"></span>
            </label>
          </div>
        </div>
      `
    }

    // Use compact mode (no header) for simple primitives
    if (data.compact) {
      return `
        <div class="section">
          <div class="section-content">
            ${rows.join('')}
            ${fillToggle}
          </div>
        </div>
      `
    }

    return `
      <div class="section">
        <div class="section-label">Color</div>
        <div class="section-content">
          ${rows.join('')}
          ${fillToggle}
        </div>
      </div>
    `
  }

  private renderColorRow(
    label: string,
    prop: string,
    value: string,
    display: string,
    swatchColor: string,
    isToken: boolean,
    isOverride: boolean,
    matchingTokens: ColorToken[]
  ): string {
    // Token button row — same UX as spacing/margin/sizing. Click writes
    // `$tokenName` (short form) into the source. Empty list = no row.
    const tokenItems = matchingTokens.map(t => ({
      label: shortLabel(t.name),
      value: t.value,
      tokenRef: `$${t.name}`,
    }))
    const tokenGroupHtml =
      tokenItems.length > 0
        ? `<div class="token-group">${renderTokenButtonGroup({
            activeValue: value,
            propKey: prop,
            tokens: tokenItems,
          })}</div>`
        : ''

    return `
      <div class="prop-row${isOverride ? ' override' : ''}">
        <span class="prop-label">${label}</span>
        <div class="prop-content">
          ${tokenGroupHtml}
          <div class="pp-color-trigger" data-color-prop="${prop}" data-current-value="${this.deps.escapeHtml(value)}">
            <div class="pp-color-swatch${value ? '' : ' empty'}" style="${swatchColor ? `background: ${this.deps.escapeHtml(swatchColor)}` : ''}"></div>
            <span class="pp-color-value${isToken ? ' token' : ''}">${this.deps.escapeHtml(display)}</span>
          </div>
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      '[data-color-prop]': {
        click: (e: Event, target: HTMLElement) => {
          const prop = target.dataset.colorProp
          const currentValue = target.dataset.currentValue || ''
          if (prop) {
            this.deps.onPropertyChange(
              '__COLOR_PICKER__',
              JSON.stringify({ property: prop, currentValue }),
              'toggle'
            )
          }
        },
      },
      'input[data-toggle-prop="fill"]': {
        change: (e: Event, target: HTMLElement) => {
          const checkbox = target as HTMLInputElement
          this.deps.onToggleProperty('fill', !checkbox.checked)
        },
      },
      // Color token click — applies the token-ref to the matching color
      // property. propKey on the data-attribute (`bg` / `col` / `boc` /
      // `ic`) tells us which property to write.
      ...buildColorTokenHandlers(prop => {
        return (_e: Event, target: HTMLElement) => {
          const tokenRef = target.dataset.tokenRef
          if (tokenRef) {
            this.deps.onPropertyChange(prop, tokenRef, 'token')
          }
          target.closest('.token-dropdown')?.classList.remove('open')
        }
      }),
    }
  }
}

/**
 * Filter the color-token list down to entries that apply to a given
 * color slot. Mirror's color tokens come in two shapes:
 *   - Property-set: `primary: #2271C1` — applies to any color slot
 *     (bg/col/boc/ic). Name has no dot.
 *   - Suffixed: `primary.bg: #2271C1` — only applies to `bg`. Name
 *     contains the suffix.
 *
 * The picker for slot `bg` shows the union of both shapes filtered for
 * that slot, so users see which tokens are valid for what they're
 * editing without having to know the exact suffix rules.
 */
function filterColorTokensForProp(tokens: ReadonlyArray<ColorToken>, prop: string): ColorToken[] {
  return tokens.filter(t => {
    if (!t.name.includes('.')) return true // Property-set token applies anywhere
    return t.name.endsWith(`.${prop}`)
  })
}

/** "primary.bg" → "primary", "primary" → "primary". Used for button labels. */
function shortLabel(name: string): string {
  const dotIdx = name.indexOf('.')
  return dotIdx === -1 ? name : name.slice(0, dotIdx)
}

/**
 * Build click handlers for each color property's token buttons. Each
 * color row's tokens carry `data-${prop}-token` (e.g. `data-bg-token`,
 * `data-col-token`), and clicking either the visible button or a
 * dropdown item writes the `$ref` into the corresponding code property.
 */
function buildColorTokenHandlers(
  makeHandler: (prop: string) => (e: Event, target: HTMLElement) => void
): EventHandlerMap {
  const props = ['bg', 'col', 'boc', 'ic']
  const map: EventHandlerMap = {}
  for (const prop of props) {
    map[`.token-btn[data-${prop}-token], .token-dropdown-item[data-${prop}-token]`] = {
      click: makeHandler(prop),
    }
  }
  return map
}

/**
 * Factory function
 */
export function createColorSection(deps: SectionDependencies): ColorSection {
  return new ColorSection(deps)
}

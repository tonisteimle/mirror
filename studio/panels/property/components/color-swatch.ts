/**
 * ColorSwatch - Color Preview and Selection
 *
 * A clickable color swatch that shows the current color value
 * and opens a color picker when clicked.
 */

import type { EventHandlerMap } from '../types'
import { escapeHtml } from '../utils'

/**
 * ColorSwatch configuration
 */
export interface ColorSwatchConfig {
  /** Property name (bg, col, boc) */
  property: string
  /** Current color value */
  value: string
  /** Label for the swatch */
  label?: string
  /** Size of the swatch */
  size?: 'small' | 'normal' | 'large'
  /** Additional data attributes */
  dataAttrs?: Record<string, string>
}

/**
 * Check if a color is light (for contrast)
 */
function isLightColor(color: string): boolean {
  // Handle transparent
  if (!color || color === 'transparent') return true

  // Extract hex value
  let hex = color
  if (hex.startsWith('#')) {
    hex = hex.slice(1)
  }

  // Handle short hex
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }

  if (hex.length !== 6) return false

  // Calculate luminance
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)

  // Use relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.6
}

/**
 * Render a color swatch
 */
export function renderColorSwatch(config: ColorSwatchConfig): string {
  const {
    property,
    value,
    label,
    size = 'normal',
    dataAttrs = {}
  } = config

  const isToken = value.startsWith('$')
  const displayColor = isToken ? '#888' : (value || 'transparent')
  const isLight = isLightColor(displayColor)

  // Build data attributes
  const allDataAttrs = {
    ...dataAttrs,
    'color-prop': property
  }
  const dataStr = Object.entries(allDataAttrs)
    .map(([k, v]) => `data-${k}="${escapeHtml(v)}"`)
    .join(' ')

  const sizeClass = size === 'small' ? 'color-swatch-sm' : size === 'large' ? 'color-swatch-lg' : ''
  const lightClass = isLight ? 'light-color' : ''

  return `
    <button
      class="color-swatch ${sizeClass} ${lightClass}"
      style="background-color: ${escapeHtml(displayColor)}"
      ${dataStr}
      title="${label || property}: ${escapeHtml(value || 'none')}"
    >
      ${isToken ? `<span class="color-token-indicator">${escapeHtml(value)}</span>` : ''}
    </button>
  `
}

/**
 * Render a color row with label, swatch, and optional token buttons
 */
export function renderColorRow(config: {
  property: string
  value: string
  label: string
  tokens?: Array<{ name: string; value: string }>
  showInput?: boolean
}): string {
  const { property, value, label, tokens = [], showInput = true } = config

  const swatchHtml = renderColorSwatch({ property, value })

  // Token buttons
  const tokenButtons = tokens.slice(0, 6).map(token => {
    const isActive = value === `$${token.name}` || value === token.value
    return `
      <button
        class="color-token-btn ${isActive ? 'active' : ''}"
        data-color-token="${escapeHtml(token.value)}"
        data-token-name="${escapeHtml(token.name)}"
        data-color-prop="${property}"
        style="background-color: ${escapeHtml(token.value)}"
        title="${escapeHtml(token.name)}: ${escapeHtml(token.value)}"
      ></button>
    `
  }).join('')

  // Input field
  const inputHtml = showInput ? `
    <input
      type="text"
      class="pp-input color-input"
      autocomplete="off"
      value="${escapeHtml(value)}"
      data-prop="${property}"
      data-color-input
      placeholder="#hex"
    >
  ` : ''

  return `
    <div class="pp-row">
      <span class="pp-row-label">${escapeHtml(label)}</span>
      <div class="pp-row-content color-group">
        ${swatchHtml}
        ${tokens.length > 0 ? `<div class="color-tokens">${tokenButtons}</div>` : ''}
        ${inputHtml}
      </div>
    </div>
  `
}

/**
 * Create color swatch click handler
 */
export function createColorSwatchHandler(
  onSwatchClick: (property: string, value: string, event: MouseEvent) => void
): EventHandlerMap {
  return {
    '.color-swatch': {
      click: (e: Event, target: HTMLElement) => {
        const property = target.getAttribute('data-color-prop')
        const value = target.style.backgroundColor || ''
        if (property) {
          onSwatchClick(property, value, e as MouseEvent)
        }
      }
    }
  }
}

/**
 * Create color token click handler
 */
export function createColorTokenHandler(
  onTokenSelect: (property: string, value: string, tokenName: string) => void
): EventHandlerMap {
  return {
    '.color-token-btn': {
      click: (e: Event, target: HTMLElement) => {
        const property = target.getAttribute('data-color-prop')
        const value = target.getAttribute('data-color-token')
        const tokenName = target.getAttribute('data-token-name')
        if (property && value) {
          onTokenSelect(property, value, tokenName || '')
        }
      }
    }
  }
}

/**
 * ToggleGroup - Reusable Toggle Button Group
 *
 * A group of mutually exclusive toggle buttons.
 * Used for layout mode, text alignment, size mode, etc.
 */

import type { EventHandlerMap } from '../types'
import { escapeHtml } from '../utils'

/**
 * Toggle option configuration
 */
export interface ToggleOption {
  /** Value for this option */
  value: string
  /** Icon SVG string or text label */
  icon?: string
  /** Text label (used if no icon) */
  label?: string
  /** Tooltip text */
  title?: string
  /** Data attributes to add */
  dataAttrs?: Record<string, string>
}

/**
 * ToggleGroup configuration
 */
export interface ToggleGroupConfig {
  /** Currently selected value */
  selected: string
  /** Available options */
  options: ToggleOption[]
  /** Data attribute name for the toggle value */
  dataAttrName: string
  /** Whether this is a single toggle (not a group) */
  single?: boolean
  /** Additional CSS class */
  className?: string
}

/**
 * Render a ToggleGroup component
 */
export function renderToggleGroup(config: ToggleGroupConfig): string {
  const {
    selected,
    options,
    dataAttrName,
    single = false,
    className = ''
  } = config

  const buttons = options.map(option => {
    const isActive = option.value === selected
    const content = option.icon || escapeHtml(option.label || option.value)
    const title = option.title ? `title="${escapeHtml(option.title)}"` : ''

    // Build data attributes string
    const dataAttrs = option.dataAttrs || {}
    dataAttrs[dataAttrName] = option.value
    const dataStr = Object.entries(dataAttrs)
      .map(([k, v]) => `data-${k}="${escapeHtml(v)}"`)
      .join(' ')

    const btnClass = single
      ? `toggle-btn single ${isActive ? 'active' : ''}`
      : `toggle-btn ${isActive ? 'active' : ''}`

    return `<button class="${btnClass}" ${dataStr} ${title}>${content}</button>`
  }).join('')

  if (single) {
    // Single toggles don't need a wrapper
    return buttons
  }

  const groupClass = ['toggle-group', className].filter(Boolean).join(' ')
  return `<div class="${groupClass}">${buttons}</div>`
}

/**
 * Render a single standalone toggle button
 */
export function renderSingleToggle(config: {
  active: boolean
  icon: string
  dataAttrs: Record<string, string>
  title?: string
}): string {
  const { active, icon, dataAttrs, title } = config

  const dataStr = Object.entries(dataAttrs)
    .map(([k, v]) => `data-${k}="${escapeHtml(v)}"`)
    .join(' ')

  const titleAttr = title ? `title="${escapeHtml(title)}"` : ''

  return `<button class="pp-toggle-btn single ${active ? 'active' : ''}" ${dataStr} ${titleAttr}>${icon}</button>`
}

/**
 * Create a toggle group click handler
 *
 * @param selector - CSS selector for the toggle buttons
 * @param dataAttr - Data attribute name containing the value
 * @param onToggle - Callback when a toggle is clicked
 */
export function createToggleHandler(
  selector: string,
  dataAttr: string,
  onToggle: (value: string, button: HTMLElement) => void
): EventHandlerMap {
  return {
    [selector]: {
      click: (e: Event, target: HTMLElement) => {
        const value = target.getAttribute(`data-${dataAttr}`)
        if (value) {
          onToggle(value, target)
        }
      }
    }
  }
}

/**
 * Standard SVG icons for common toggles
 */
export const TOGGLE_ICONS = {
  wrap: `<svg class="icon" viewBox="0 0 14 14">
    <rect x="1" y="3" width="2" height="2" fill="currentColor"/>
    <rect x="6" y="3" width="2" height="2" fill="currentColor"/>
    <rect x="11" y="3" width="2" height="2" fill="currentColor"/>
    <rect x="1" y="9" width="2" height="2" fill="currentColor"/>
    <rect x="6" y="9" width="2" height="2" fill="currentColor"/>
  </svg>`,

  italic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
    <line x1="19" y1="4" x2="10" y2="4"></line>
    <line x1="14" y1="20" x2="5" y2="20"></line>
    <line x1="15" y1="4" x2="9" y2="20"></line>
  </svg>`,

  underline: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
    <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path>
    <line x1="4" y1="21" x2="20" y2="21"></line>
  </svg>`,

  uppercase: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
    <polyline points="4 7 4 4 20 4 20 7"></polyline>
    <line x1="9" y1="20" x2="15" y2="20"></line>
    <line x1="12" y1="4" x2="12" y2="20"></line>
  </svg>`,

  truncate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <circle cx="12" cy="12" r="1" fill="currentColor"></circle>
    <circle cx="16" cy="12" r="1" fill="currentColor"></circle>
    <circle cx="8" cy="12" r="1" fill="currentColor"></circle>
  </svg>`,

  alignLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
    <line x1="17" y1="10" x2="3" y2="10"></line>
    <line x1="21" y1="6" x2="3" y2="6"></line>
    <line x1="21" y1="14" x2="3" y2="14"></line>
    <line x1="17" y1="18" x2="3" y2="18"></line>
  </svg>`,

  alignCenter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
    <line x1="18" y1="10" x2="6" y2="10"></line>
    <line x1="21" y1="6" x2="3" y2="6"></line>
    <line x1="21" y1="14" x2="3" y2="14"></line>
    <line x1="18" y1="18" x2="6" y2="18"></line>
  </svg>`,

  alignRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
    <line x1="21" y1="10" x2="7" y2="10"></line>
    <line x1="21" y1="6" x2="3" y2="6"></line>
    <line x1="21" y1="14" x2="3" y2="14"></line>
    <line x1="21" y1="18" x2="7" y2="18"></line>
  </svg>`,

  alignJustify: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
    <line x1="21" y1="10" x2="3" y2="10"></line>
    <line x1="21" y1="6" x2="3" y2="6"></line>
    <line x1="21" y1="14" x2="3" y2="14"></line>
    <line x1="21" y1="18" x2="3" y2="18"></line>
  </svg>`,

  visible: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>`,

  hidden: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>`,

  fill: `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
    <circle cx="12" cy="12" r="8"></circle>
  </svg>`,

  stroke: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
    <circle cx="12" cy="12" r="8"></circle>
  </svg>`
}

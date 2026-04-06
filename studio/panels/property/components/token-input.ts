/**
 * TokenInput - Reusable Token Selection with Input
 *
 * A combination of token preset buttons and a free-form input field.
 * Used throughout the property panel for gap, padding, margin, radius, etc.
 */

import type { EventHandlerMap, SpacingToken } from '../types'

/**
 * Token option for the token group
 */
export interface TokenOption {
  /** Display label (e.g., "sm", "md", "lg") */
  label: string
  /** Actual value (e.g., "4", "8", "16") */
  value: string
  /** Full token reference (e.g., "$sm.pad") */
  tokenRef?: string
  /** Tooltip text */
  title?: string
}

/**
 * TokenInput configuration
 */
export interface TokenInputConfig {
  /** The property name this input controls (e.g., "gap", "pad") */
  property: string
  /** Current value */
  value: string
  /** Placeholder text for input */
  placeholder?: string
  /** Token options to display */
  tokens: TokenOption[]
  /** Data attribute prefix for token buttons (e.g., "gap" -> data-gap-token) */
  dataAttrPrefix: string
  /** Additional data attributes for input */
  inputDataAttrs?: Record<string, string>
  /** Show input field */
  showInput?: boolean
  /** Input width class */
  inputClass?: string
}

/**
 * Escape HTML characters in a string
 */
function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char)
}

/**
 * Check if a value matches a token (by value or token reference)
 */
function isTokenActive(currentValue: string, token: TokenOption): boolean {
  if (!currentValue) return false

  // Check token reference match
  if (currentValue.startsWith('$') && token.tokenRef) {
    return currentValue === token.tokenRef
  }

  // Check value match
  return currentValue === token.value
}

/**
 * Render a TokenInput component
 */
export function renderTokenInput(config: TokenInputConfig): string {
  const {
    property,
    value,
    placeholder = '0',
    tokens,
    dataAttrPrefix,
    inputDataAttrs = {},
    showInput = true,
    inputClass = ''
  } = config

  // Render token buttons
  const tokenButtons = tokens.map(token => {
    const active = isTokenActive(value, token)
    const title = token.title || (token.tokenRef ? `${token.tokenRef}: ${token.value}` : token.value)
    const tokenRefAttr = token.tokenRef ? `data-token-ref="${escapeHtml(token.tokenRef)}"` : ''

    return `<button
      class="token-btn ${active ? 'active' : ''}"
      data-${dataAttrPrefix}-token="${escapeHtml(token.value)}"
      ${tokenRefAttr}
      title="${escapeHtml(title)}"
    >${escapeHtml(token.label)}</button>`
  }).join('')

  // Build input data attributes string
  const dataStr = Object.entries(inputDataAttrs)
    .map(([k, v]) => `data-${k}="${escapeHtml(v)}"`)
    .join(' ')

  // Render input field
  const inputHtml = showInput ? `
    <input
      type="text"
      class="prop-input ${inputClass}"
      autocomplete="off"
      value="${escapeHtml(value)}"
      data-prop="${property}"
      placeholder="${placeholder}"
      ${dataStr}
    >
  ` : ''

  // Combine token group and input
  return `
    ${tokens.length > 0 ? `<div class="token-group">${tokenButtons}</div>` : ''}
    ${inputHtml}
  `
}

/**
 * Convert SpacingTokens to TokenOptions
 */
export function spacingTokensToOptions(tokens: SpacingToken[]): TokenOption[] {
  return tokens.map(t => ({
    label: t.name,
    value: t.value,
    tokenRef: `$${t.fullName}`,
    title: `$${t.fullName}: ${t.value}`
  }))
}

/**
 * Create standard token click handler
 *
 * @param selector - CSS selector for the token buttons
 * @param dataAttr - Data attribute name (e.g., 'gap-token')
 * @param onSelect - Callback when a token is selected
 */
export function createTokenClickHandler(
  selector: string,
  dataAttr: string,
  onSelect: (value: string, isTokenRef: boolean) => void
): EventHandlerMap {
  return {
    [selector]: {
      click: (e: Event, target: HTMLElement) => {
        const tokenRef = target.getAttribute('data-token-ref')
        const value = target.getAttribute(`data-${dataAttr}`)

        if (tokenRef) {
          // Token reference selected
          onSelect(tokenRef, true)
        } else if (value) {
          // Direct value selected
          onSelect(value, false)
        }
      }
    }
  }
}

/**
 * Create standard input change handler with debounce
 */
export function createInputChangeHandler(
  selector: string,
  onChange: (property: string, value: string) => void,
  debounceMs: number = 300
): EventHandlerMap {
  let debounceTimer: number | undefined

  return {
    [selector]: {
      input: (e: Event, target: HTMLElement) => {
        const input = target as HTMLInputElement
        const property = input.getAttribute('data-prop')
        const value = input.value

        if (!property) return

        // Clear existing timer
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }

        // Set new timer
        debounceTimer = window.setTimeout(() => {
          onChange(property, value)
        }, debounceMs)
      }
    }
  }
}

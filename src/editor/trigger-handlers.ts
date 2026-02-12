/**
 * Centralized Trigger Character Handlers
 *
 * Handles trigger characters (#, $, ?, /) for opening pickers and panels.
 * Extracted from PromptPanel.tsx and keymaps.ts for consistency.
 */

import { isInsideString } from './utils'
import { TRIGGER_DELAY_MS } from './constants'
import { KNOWN_PROPERTIES } from './property-picker-map'

/**
 * Context for property inference when using $ trigger.
 */
export function findPropertyContext(textBefore: string): string | undefined {
  // Match pattern like "bg " or "pad l-r " before cursor
  const match = textBefore.match(/\b(\w+)\s+(?:[a-z-]+\s+)*$/)
  if (match && KNOWN_PROPERTIES.has(match[1])) {
    return match[1]
  }
  return undefined
}

/**
 * Trigger handler configuration.
 */
export interface TriggerHandlers {
  openColorPanel: () => void
  openTokenPicker: (propertyContext?: string) => void
  openCommandPalette: (query?: string) => void
}

/**
 * State check for preventing trigger when panels are already open.
 */
export interface TriggerState {
  colorPanelOpen: boolean
}

/**
 * Handle trigger character detection and dispatch to appropriate handler.
 * Returns true if a trigger was handled.
 */
export function handleTriggerCharacter(
  charBefore: string,
  textBefore: string,
  handlers: TriggerHandlers,
  state: TriggerState,
  scheduleTrigger: (fn: () => void, delay: number) => void
): boolean {
  // Don't trigger inside strings
  if (isInsideString(textBefore)) {
    return false
  }

  // Don't trigger if a panel is already open
  if (state.colorPanelOpen) {
    return false
  }

  switch (charBefore) {
    case '#':
      scheduleTrigger(handlers.openColorPanel, TRIGGER_DELAY_MS)
      return true

    case '$': {
      // Find property context for filtered token suggestions
      const propertyContext = findPropertyContext(textBefore.slice(0, -1))
      scheduleTrigger(() => handlers.openTokenPicker(propertyContext), TRIGGER_DELAY_MS)
      return true
    }

    // Note: '?' is handled in keymaps.ts for context-sensitive property picker
    // AI panel input is now in the footer, no longer triggered by '?'

    // Note: '/' is no longer a trigger because '//' is used for comments
    // (checking property context, token sections, etc.)

    default:
      return false
  }
}

/**
 * Check if a character is a trigger character.
 */
export function isTriggerCharacter(char: string): boolean {
  return char === '#' || char === '$'
}

/**
 * Get the trigger character for a specific picker type.
 */
export function getTriggerForPicker(pickerType: string): string | null {
  switch (pickerType) {
    case 'color':
      return '#'
    case 'token':
      return '$'
    case 'command':
      return '/'
    default:
      return null
  }
}

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
 * DSL uses hyphenated property names like "padding-left", "border-color".
 */
export function findPropertyContext(textBefore: string): string | undefined {
  // Match pattern like "background " or "padding-left " before cursor
  // Property names can contain hyphens (e.g., padding-left, border-color)
  const match = textBefore.match(/\b([a-z][-a-z]*)\s+(?:[a-z0-9-]+\s+)*$/i)
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

// Note: isTriggerCharacter and getTriggerForPicker were removed as they were unused.
// Trigger handling is done via keymaps in keymaps.ts

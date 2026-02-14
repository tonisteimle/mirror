/**
 * Key Modifier Matching
 *
 * Utilities for matching keyboard events with DSL key modifiers.
 * Used for onkeydown/onkeyup event handlers.
 */

import type React from 'react'

/**
 * Map of DSL modifier names to KeyboardEvent.key values
 */
const KEY_MAP: Record<string, string> = {
  'escape': 'Escape',
  'enter': 'Enter',
  'tab': 'Tab',
  'space': ' ',
  'arrow-up': 'ArrowUp',
  'arrow-down': 'ArrowDown',
  'arrow-left': 'ArrowLeft',
  'arrow-right': 'ArrowRight',
  'backspace': 'Backspace',
  'delete': 'Delete',
  'home': 'Home',
  'end': 'End'
}

/**
 * Check if a keyboard event matches the specified modifier.
 * @param e - React keyboard event
 * @param modifier - DSL modifier string (e.g., 'escape', 'arrow-down')
 * @returns true if the event matches the modifier, or if no modifier specified
 */
export function matchesKeyModifier(e: React.KeyboardEvent, modifier?: string): boolean {
  if (!modifier) return true // No modifier = match all keys

  const expectedKey = KEY_MAP[modifier]
  return expectedKey ? e.key === expectedKey : false
}

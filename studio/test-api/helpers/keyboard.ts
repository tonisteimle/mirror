/**
 * Keyboard Test Helpers
 *
 * Reusable keyboard interaction functions for browser tests.
 * Provides convenient wrappers around TestAPI.interact.pressKey
 * with consistent delays and common key combinations.
 *
 * @created Developer A - Phase 3 (A3.2)
 */

import type { TestAPI, KeyModifiers } from '../types'

// =============================================================================
// Configuration
// =============================================================================

/** Default delay after key press to allow UI updates */
const DEFAULT_DELAY = 100

/** Delay for animations/transitions */
const ANIMATION_DELAY = 200

// =============================================================================
// Individual Key Presses
// =============================================================================

/**
 * Press Tab key
 */
export async function tab(api: TestAPI, delay = DEFAULT_DELAY): Promise<void> {
  await api.interact.pressKey('Tab')
  await api.utils.delay(delay)
}

/**
 * Press Shift+Tab (reverse tab)
 */
export async function shiftTab(api: TestAPI, delay = DEFAULT_DELAY): Promise<void> {
  await api.interact.pressKey('Tab', { shift: true })
  await api.utils.delay(delay)
}

/**
 * Press Enter key
 */
export async function enter(api: TestAPI, delay = DEFAULT_DELAY): Promise<void> {
  await api.interact.pressKey('Enter')
  await api.utils.delay(delay)
}

/**
 * Press Space key
 */
export async function space(api: TestAPI, delay = DEFAULT_DELAY): Promise<void> {
  await api.interact.pressKey(' ')
  await api.utils.delay(delay)
}

/**
 * Press Escape key
 */
export async function escape(api: TestAPI, delay = DEFAULT_DELAY): Promise<void> {
  await api.interact.pressKey('Escape')
  await api.utils.delay(delay)
}

/**
 * Press Arrow Up key
 */
export async function arrowUp(api: TestAPI, delay = DEFAULT_DELAY): Promise<void> {
  await api.interact.pressKey('ArrowUp')
  await api.utils.delay(delay)
}

/**
 * Press Arrow Down key
 */
export async function arrowDown(api: TestAPI, delay = DEFAULT_DELAY): Promise<void> {
  await api.interact.pressKey('ArrowDown')
  await api.utils.delay(delay)
}

/**
 * Press Arrow Left key
 */
export async function arrowLeft(api: TestAPI, delay = DEFAULT_DELAY): Promise<void> {
  await api.interact.pressKey('ArrowLeft')
  await api.utils.delay(delay)
}

/**
 * Press Arrow Right key
 */
export async function arrowRight(api: TestAPI, delay = DEFAULT_DELAY): Promise<void> {
  await api.interact.pressKey('ArrowRight')
  await api.utils.delay(delay)
}

/**
 * Press Home key
 */
export async function home(api: TestAPI, delay = DEFAULT_DELAY): Promise<void> {
  await api.interact.pressKey('Home')
  await api.utils.delay(delay)
}

/**
 * Press End key
 */
export async function end(api: TestAPI, delay = DEFAULT_DELAY): Promise<void> {
  await api.interact.pressKey('End')
  await api.utils.delay(delay)
}

/**
 * Press Backspace key
 */
export async function backspace(api: TestAPI, delay = DEFAULT_DELAY): Promise<void> {
  await api.interact.pressKey('Backspace')
  await api.utils.delay(delay)
}

/**
 * Press Delete key
 */
export async function deleteKey(api: TestAPI, delay = DEFAULT_DELAY): Promise<void> {
  await api.interact.pressKey('Delete')
  await api.utils.delay(delay)
}

// =============================================================================
// Key Press on Specific Element
// =============================================================================

/**
 * Press key on a specific element
 */
export async function pressOn(
  api: TestAPI,
  nodeId: string,
  key: string,
  delay = DEFAULT_DELAY
): Promise<void> {
  await api.interact.pressKeyOn(nodeId, key)
  await api.utils.delay(delay)
}

/**
 * Press key with modifiers on element
 */
export async function pressOnWithModifiers(
  api: TestAPI,
  nodeId: string,
  key: string,
  modifiers: KeyModifiers,
  delay = DEFAULT_DELAY
): Promise<void> {
  await api.interact.pressKeyOn(nodeId, key, modifiers)
  await api.utils.delay(delay)
}

// =============================================================================
// Focus + Key Combinations
// =============================================================================

/**
 * Focus an element and press a key
 */
export async function focusAndPress(
  api: TestAPI,
  nodeId: string,
  key: string,
  delay = DEFAULT_DELAY
): Promise<void> {
  await api.interact.focus(nodeId)
  await api.utils.delay(50)
  await api.interact.pressKey(key)
  await api.utils.delay(delay)
}

/**
 * Focus an element and press Enter
 */
export async function focusAndEnter(
  api: TestAPI,
  nodeId: string,
  delay = DEFAULT_DELAY
): Promise<void> {
  await focusAndPress(api, nodeId, 'Enter', delay)
}

/**
 * Focus an element and press Space
 */
export async function focusAndSpace(
  api: TestAPI,
  nodeId: string,
  delay = DEFAULT_DELAY
): Promise<void> {
  await focusAndPress(api, nodeId, ' ', delay)
}

// =============================================================================
// Key Sequences
// =============================================================================

/**
 * Press Tab multiple times
 */
export async function tabSequence(
  api: TestAPI,
  count: number,
  delay = DEFAULT_DELAY
): Promise<void> {
  for (let i = 0; i < count; i++) {
    await tab(api, delay)
  }
}

/**
 * Press Shift+Tab multiple times
 */
export async function shiftTabSequence(
  api: TestAPI,
  count: number,
  delay = DEFAULT_DELAY
): Promise<void> {
  for (let i = 0; i < count; i++) {
    await shiftTab(api, delay)
  }
}

/**
 * Navigate using arrow keys
 */
export async function arrowSequence(
  api: TestAPI,
  direction: 'up' | 'down' | 'left' | 'right',
  count: number,
  delay = DEFAULT_DELAY
): Promise<void> {
  const keyMap = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
  }

  for (let i = 0; i < count; i++) {
    await api.interact.pressKey(keyMap[direction])
    await api.utils.delay(delay)
  }
}

/**
 * Press a sequence of different keys
 */
export async function keySequence(
  api: TestAPI,
  keys: string[],
  delay = DEFAULT_DELAY
): Promise<void> {
  for (const key of keys) {
    await api.interact.pressKey(key)
    await api.utils.delay(delay)
  }
}

// =============================================================================
// Common Patterns
// =============================================================================

/**
 * Open a dropdown/select and navigate to option
 */
export async function navigateDropdown(
  api: TestAPI,
  openKey: 'Enter' | 'Space' | 'ArrowDown' = 'Enter',
  steps: number = 0
): Promise<void> {
  // Open dropdown
  await api.interact.pressKey(openKey)
  await api.utils.delay(ANIMATION_DELAY)

  // Navigate to option
  if (steps > 0) {
    await arrowSequence(api, 'down', steps)
  } else if (steps < 0) {
    await arrowSequence(api, 'up', Math.abs(steps))
  }
}

/**
 * Select option in dropdown (open, navigate, select)
 */
export async function selectDropdownOption(
  api: TestAPI,
  steps: number,
  selectKey: 'Enter' | 'Space' = 'Enter'
): Promise<void> {
  await navigateDropdown(api, 'Enter', steps)
  await api.interact.pressKey(selectKey)
  await api.utils.delay(DEFAULT_DELAY)
}

/**
 * Navigate tabs with arrow keys
 */
export async function navigateTabs(
  api: TestAPI,
  direction: 'left' | 'right',
  count: number = 1
): Promise<void> {
  const key = direction === 'left' ? 'ArrowLeft' : 'ArrowRight'
  for (let i = 0; i < count; i++) {
    await api.interact.pressKey(key)
    await api.utils.delay(DEFAULT_DELAY)
  }
}

/**
 * Adjust slider value
 */
export async function adjustSlider(
  api: TestAPI,
  direction: 'increase' | 'decrease',
  steps: number = 1
): Promise<void> {
  const key = direction === 'increase' ? 'ArrowRight' : 'ArrowLeft'
  for (let i = 0; i < steps; i++) {
    await api.interact.pressKey(key)
    await api.utils.delay(50) // Shorter delay for slider
  }
  await api.utils.delay(DEFAULT_DELAY)
}

/**
 * Jump slider to min or max
 */
export async function jumpSlider(api: TestAPI, target: 'min' | 'max'): Promise<void> {
  const key = target === 'min' ? 'Home' : 'End'
  await api.interact.pressKey(key)
  await api.utils.delay(DEFAULT_DELAY)
}

// =============================================================================
// Focus Assertions
// =============================================================================

/**
 * Check if element has focus
 */
export function hasFocus(nodeId: string): boolean {
  const element = document.querySelector(`[data-mirror-id="${nodeId}"]`)
  return element !== null && document.activeElement === element
}

/**
 * Get node ID of currently focused element
 */
export function getFocusedNodeId(): string | null {
  const activeEl = document.activeElement
  if (!activeEl) return null
  return activeEl.getAttribute('data-mirror-id')
}

/**
 * Check if focus is within a container
 */
export function isFocusWithin(containerNodeId: string): boolean {
  const container = document.querySelector(`[data-mirror-id="${containerNodeId}"]`)
  const activeEl = document.activeElement
  return container !== null && activeEl !== null && container.contains(activeEl)
}

/**
 * Check if focus is within a Zag component
 */
export function isFocusInZagComponent(componentType: string): boolean {
  const activeEl = document.activeElement
  if (!activeEl) return false
  const zagComponent = activeEl.closest(`[data-zag-component="${componentType}"]`)
  return zagComponent !== null
}

// =============================================================================
// Exports Bundle
// =============================================================================

export const keyboard = {
  // Individual keys
  tab,
  shiftTab,
  enter,
  space,
  escape,
  arrowUp,
  arrowDown,
  arrowLeft,
  arrowRight,
  home,
  end,
  backspace,
  delete: deleteKey,

  // Element-specific
  pressOn,
  pressOnWithModifiers,

  // Focus combos
  focusAndPress,
  focusAndEnter,
  focusAndSpace,

  // Sequences
  tabSequence,
  shiftTabSequence,
  arrowSequence,
  keySequence,

  // Common patterns
  navigateDropdown,
  selectDropdownOption,
  navigateTabs,
  adjustSlider,
  jumpSlider,

  // Focus helpers
  hasFocus,
  getFocusedNodeId,
  isFocusWithin,
  isFocusInZagComponent,
}

export default keyboard

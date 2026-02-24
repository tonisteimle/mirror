/**
 * @generated
 * @description Event and action validation schema - DO NOT EDIT
 *
 * Generated from src/dsl/properties.ts by scripts/generate-validation-schemas.ts
 * Regenerate with: npx ts-node scripts/generate-validation-schemas.ts
 */

// ============================================
// Event Sets
// ============================================

/** Valid event names */
export const VALID_EVENTS = new Set([
    'onblur',
    'onchange',
    'onclick',
    'onclick-inside',
    'onclick-outside',
    'onclose',
    'oncomplete',
    'onempty',
    'onfill',
    'onfocus',
    'onhover',
    'oninput',
    'onkeydown',
    'onkeyup',
    'onload',
    'onopen',
    'onsubmit'
  ])

/** Valid key modifiers for onkeydown/onkeyup */
export const KEY_MODIFIERS = new Set([
    'arrow-down',
    'arrow-left',
    'arrow-right',
    'arrow-up',
    'backspace',
    'delete',
    'end',
    'enter',
    'escape',
    'home',
    'space',
    'tab'
  ])

/** Valid timing modifiers (debounce, delay) */
export const TIMING_MODIFIERS = new Set([
    'debounce',
    'delay'
  ])

// ============================================
// Action Sets
// ============================================

/** Valid action names */
export const VALID_ACTIONS = new Set([
    'activate',
    'alert',
    'assign',
    'call',
    'change',
    'clear-selection',
    'close',
    'deactivate',
    'deactivate-siblings',
    'deselect',
    'filter',
    'focus',
    'hide',
    'highlight',
    'open',
    'page',
    'reset',
    'select',
    'show',
    'to',
    'toggle',
    'toggle-state',
    'validate'
  ])

/** Valid action targets */
export const BEHAVIOR_TARGETS = new Set([
    'all',
    'first',
    'first-empty',
    'highlighted',
    'last',
    'next',
    'none',
    'prev',
    'selected',
    'self',
    'self-and-before'
  ])

// ============================================
// Animation Sets
// ============================================

/** Valid animation names */
export const VALID_ANIMATIONS = new Set([
    'bounce',
    'fade',
    'none',
    'pulse',
    'scale',
    'slide-down',
    'slide-left',
    'slide-right',
    'slide-up',
    'spin'
  ])

/** Valid position keywords for open action */
export const POSITION_KEYWORDS = new Set([
    'above',
    'below',
    'cen',
    'center',
    'left',
    'right'
  ])

// ============================================
// State Sets
// ============================================

/** System states (auto-bound to browser pseudo-classes) */
export const SYSTEM_STATES = new Set([
    'active',
    'disabled',
    'focus',
    'hover'
  ])

/** Behavior states (activated by actions) */
export const BEHAVIOR_STATES = new Set([
    'active',
    'collapsed',
    'default',
    'expanded',
    'highlighted',
    'inactive',
    'invalid',
    'off',
    'on',
    'selected',
    'valid'
  ])

// ============================================
// Validation Functions
// ============================================

/**
 * Check if an event name is valid
 */
export function isValidEvent(name: string): boolean {
  return VALID_EVENTS.has(name)
}

/**
 * Check if a key modifier is valid
 */
export function isValidKeyModifier(key: string): boolean {
  return KEY_MODIFIERS.has(key)
}

/**
 * Check if an action name is valid
 */
export function isValidAction(name: string): boolean {
  return VALID_ACTIONS.has(name)
}

/**
 * Check if an animation name is valid
 */
export function isValidAnimation(name: string): boolean {
  return VALID_ANIMATIONS.has(name)
}

/**
 * Check if a position is valid
 */
export function isValidPosition(pos: string): boolean {
  return POSITION_KEYWORDS.has(pos)
}

/**
 * Check if a target is valid
 */
export function isValidTarget(target: string): boolean {
  return BEHAVIOR_TARGETS.has(target)
}

/**
 * Check if a state is a system state
 */
export function isSystemState(state: string): boolean {
  return SYSTEM_STATES.has(state)
}

/**
 * Check if a state is a behavior state
 */
export function isBehaviorState(state: string): boolean {
  return BEHAVIOR_STATES.has(state)
}

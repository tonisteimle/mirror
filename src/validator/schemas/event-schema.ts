/**
 * Event Schema
 *
 * Schema for events, actions, animations, and positions.
 * Built from dsl/properties.ts keywords.
 */

import {
  EVENT_KEYWORDS,
  ACTION_KEYWORDS,
  ANIMATION_KEYWORDS,
  POSITION_KEYWORDS,
  SYSTEM_STATES
} from '../../dsl/properties'

// ============================================
// Event Validation
// ============================================

/**
 * Check if an event name is valid
 */
export function isValidEvent(event: string): boolean {
  return EVENT_KEYWORDS.has(event)
}

/**
 * Get all valid event names
 */
export function getValidEvents(): string[] {
  return Array.from(EVENT_KEYWORDS)
}

/**
 * Find similar event for typo correction
 */
export function findSimilarEvent(event: string): string | undefined {
  const eventLower = event.toLowerCase()

  // Check for exact match (case insensitive)
  for (const valid of EVENT_KEYWORDS) {
    if (valid.toLowerCase() === eventLower) {
      return valid
    }
  }

  // Check for common typos
  const typoMap: Record<string, string> = {
    'onclick': 'onclick',
    'onclck': 'onclick',
    'onclik': 'onclick',
    'onlick': 'onclick',
    'onhover': 'onhover',
    'onhovr': 'onhover',
    'onchang': 'onchange',
    'onchange': 'onchange',
    'oninpt': 'oninput',
    'oninput': 'oninput',
    'onfocu': 'onfocus',
    'onfocus': 'onfocus',
    'onblr': 'onblur',
    'onblur': 'onblur',
    'onkeyup': 'onkeyup',
    'onkeydown': 'onkeydown',
    'onload': 'onload',
  }

  return typoMap[eventLower]
}

// ============================================
// Action Validation
// ============================================

export interface ActionSchema {
  name: string
  requiresTarget: boolean
  requiresState?: boolean  // For 'change' action
  supportsAnimation?: boolean
  supportsPosition?: boolean
  supportsDuration?: boolean
}

const actionSchemas: Record<string, ActionSchema> = {
  toggle: {
    name: 'toggle',
    requiresTarget: false
  },
  open: {
    name: 'open',
    requiresTarget: true,
    supportsAnimation: true,
    supportsPosition: true,
    supportsDuration: true
  },
  close: {
    name: 'close',
    requiresTarget: false,  // Can close self
    supportsAnimation: true,
    supportsDuration: true
  },
  show: {
    name: 'show',
    requiresTarget: true
  },
  hide: {
    name: 'hide',
    requiresTarget: true
  },
  change: {
    name: 'change',
    requiresTarget: true,
    requiresState: true
  },
  page: {
    name: 'page',
    requiresTarget: true
  },
  assign: {
    name: 'assign',
    requiresTarget: true
  },
  alert: {
    name: 'alert',
    requiresTarget: false
  }
}

/**
 * Check if an action name is valid
 */
export function isValidAction(action: string): boolean {
  return ACTION_KEYWORDS.has(action)
}

/**
 * Get schema for an action
 */
export function getActionSchema(action: string): ActionSchema | undefined {
  return actionSchemas[action]
}

/**
 * Get all valid action names
 */
export function getValidActions(): string[] {
  return Array.from(ACTION_KEYWORDS)
}

/**
 * Find similar action for typo correction
 */
export function findSimilarAction(action: string): string | undefined {
  const actionLower = action.toLowerCase()

  for (const valid of ACTION_KEYWORDS) {
    if (valid.toLowerCase() === actionLower) {
      return valid
    }
  }

  // Common typos
  const typoMap: Record<string, string> = {
    'togle': 'toggle',
    'toogle': 'toggle',
    'opn': 'open',
    'clos': 'close',
    'hid': 'hide',
    'shw': 'show',
    'chng': 'change',
    'pag': 'page',
    'asign': 'assign',
    'assgin': 'assign',
  }

  return typoMap[actionLower]
}

// ============================================
// Animation Validation
// ============================================

/**
 * Check if an animation name is valid
 */
export function isValidAnimation(animation: string): boolean {
  return ANIMATION_KEYWORDS.has(animation)
}

/**
 * Get all valid animation names
 */
export function getValidAnimations(): string[] {
  return Array.from(ANIMATION_KEYWORDS)
}

/**
 * Animation categories
 */
export const TRANSITION_ANIMATIONS = new Set([
  'fade', 'scale', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'none'
])

export const CONTINUOUS_ANIMATIONS = new Set([
  'spin', 'pulse', 'bounce'
])

/**
 * Check if animations can be combined
 */
export function canCombineAnimations(anim1: string, anim2: string): boolean {
  // Continuous animations cannot be combined with each other
  if (CONTINUOUS_ANIMATIONS.has(anim1) && CONTINUOUS_ANIMATIONS.has(anim2)) {
    return false
  }

  // 'none' cannot be combined with others
  if (anim1 === 'none' || anim2 === 'none') {
    return false
  }

  // Opposite directions cannot be combined
  const opposites: [string, string][] = [
    ['slide-up', 'slide-down'],
    ['slide-left', 'slide-right']
  ]

  for (const [a, b] of opposites) {
    if ((anim1 === a && anim2 === b) || (anim1 === b && anim2 === a)) {
      return false
    }
  }

  return true
}

/**
 * Find similar animation for typo correction
 */
export function findSimilarAnimation(animation: string): string | undefined {
  const animLower = animation.toLowerCase()

  for (const valid of ANIMATION_KEYWORDS) {
    if (valid.toLowerCase() === animLower) {
      return valid
    }
  }

  // Common typos (missing hyphen, etc.)
  const typoMap: Record<string, string> = {
    'slideup': 'slide-up',
    'slidedown': 'slide-down',
    'slideleft': 'slide-left',
    'slideright': 'slide-right',
    'slide up': 'slide-up',
    'slide down': 'slide-down',
    'fde': 'fade',
    'scal': 'scale',
    'spn': 'spin',
    'puls': 'pulse',
    'bounc': 'bounce',
  }

  return typoMap[animLower]
}

// ============================================
// Position Validation
// ============================================

/**
 * Check if a position value is valid
 */
export function isValidPosition(position: string): boolean {
  return POSITION_KEYWORDS.has(position)
}

/**
 * Get all valid position values
 */
export function getValidPositions(): string[] {
  return Array.from(POSITION_KEYWORDS)
}

/**
 * Find similar position for typo correction
 */
export function findSimilarPosition(position: string): string | undefined {
  const posLower = position.toLowerCase()

  for (const valid of POSITION_KEYWORDS) {
    if (valid.toLowerCase() === posLower) {
      return valid
    }
  }

  // Common typos
  const typoMap: Record<string, string> = {
    'bellow': 'below',
    'abov': 'above',
    'lft': 'left',
    'rght': 'right',
    'centr': 'center',
    'centre': 'center',
  }

  return typoMap[posLower]
}

// ============================================
// System States
// ============================================

/**
 * Check if a state is a system state
 */
export function isSystemState(state: string): boolean {
  return SYSTEM_STATES.has(state)
}

/**
 * Get all system states
 */
export function getSystemStates(): string[] {
  return Array.from(SYSTEM_STATES)
}

// Re-export keyword sets
export {
  EVENT_KEYWORDS,
  ACTION_KEYWORDS,
  ANIMATION_KEYWORDS,
  POSITION_KEYWORDS,
  SYSTEM_STATES
}

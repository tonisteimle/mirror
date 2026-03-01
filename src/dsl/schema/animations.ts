/**
 * @module dsl/schema/animations
 * @description Animation definitions for Mirror DSL
 */

import type { AnimationDefinition } from './types'

// =============================================================================
// ANIMATIONS
// =============================================================================

export const ANIMATIONS: Record<string, AnimationDefinition> = {
  // Transition Animations
  fade: {
    name: 'fade',
    type: 'transition',
    description: 'Ein-/Ausblenden (opacity)',
    defaultDuration: 200,
    examples: ['show fade', 'hide fade 150'],
  },
  scale: {
    name: 'scale',
    type: 'transition',
    description: 'Skalieren',
    defaultDuration: 200,
    examples: ['show scale', 'hide scale 150'],
  },
  'slide-up': {
    name: 'slide-up',
    type: 'transition',
    description: 'Von unten einblenden',
    defaultDuration: 200,
    examples: ['show slide-up', 'open Modal slide-up 300'],
  },
  'slide-down': {
    name: 'slide-down',
    type: 'transition',
    description: 'Von oben einblenden',
    defaultDuration: 200,
    examples: ['show slide-down'],
  },
  'slide-left': {
    name: 'slide-left',
    type: 'transition',
    description: 'Von rechts einblenden',
    defaultDuration: 200,
    examples: ['show slide-left'],
  },
  'slide-right': {
    name: 'slide-right',
    type: 'transition',
    description: 'Von links einblenden',
    defaultDuration: 200,
    examples: ['show slide-right'],
  },
  none: {
    name: 'none',
    type: 'transition',
    description: 'Keine Animation',
    defaultDuration: 0,
    examples: ['show none'],
  },

  // Continuous Animations
  spin: {
    name: 'spin',
    type: 'continuous',
    description: 'Rotation (kontinuierlich)',
    defaultDuration: 1000,
    examples: ['animate spin 1000'],
  },
  pulse: {
    name: 'pulse',
    type: 'continuous',
    description: 'Pulsieren',
    defaultDuration: 800,
    examples: ['animate pulse 800'],
  },
  bounce: {
    name: 'bounce',
    type: 'continuous',
    description: 'Hüpfen',
    defaultDuration: 800,
    examples: ['animate bounce'],
  },
}

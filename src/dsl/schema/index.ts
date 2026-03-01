/**
 * @module dsl/schema
 * @description Re-exports all schema modules
 *
 * This module provides the split schema definitions.
 * For the full MIRROR_SCHEMA object and helpers, use master-schema.ts directly.
 */

// Types
export * from './types'

// Primitive Components (Box, Text, Icon, etc.)
export { COMPONENTS } from './components'

// Core Components entfernt - alle Komponenten kommen aus _template Projekt

// Events
export { EVENTS } from './events'

// Actions
export { ACTIONS } from './actions'

// States
export { STATES } from './states'

// Animations
export { ANIMATIONS } from './animations'

// Keywords
export { KEYWORDS } from './keywords'

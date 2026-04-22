/**
 * Mirror Schema
 *
 * Type definitions and schemas for Mirror DSL.
 * Central export point for all schema modules.
 */

// Core DSL definitions
export {
  DSL,
  SCHEMA,
  isReservedKeyword,
  getReservedKeywords,
  isPrimitive,
  getPrimitiveDef,
  findProperty,
  getPropertiesByCategory,
  getKeywordsForProperty,
  getAllPropertyNames,
  getEvent,
  getAction,
  getState,
  isValidKey,
  getAllEvents,
  getAllActions,
  getAllStates,
  getSystemStates,
  getCustomStates,
  type PropertyDef,
  type PrimitiveDef,
  type EventDef,
  type ActionDef,
  type StateDef,
  type CSSOutput,
  type PropertyValue,
  type NumericValue,
} from './dsl'

// Primitives - Note: PRIMITIVES was removed, use isPrimitive() instead
export { ZAG_PRIMITIVES, CHART_PRIMITIVES } from './dsl'

// Properties
export * from './properties'

// Zag-specific
export {
  isZagPrimitive,
  getSlotDef,
  getSlotMappings,
  type ZagSlotDef,
  type ZagPrimitiveDef,
} from './zag-primitives'
export { getZagPropMetadata, type ZagPropMeta } from './zag-prop-metadata'

// Component templates
export { COMPONENT_TEMPLATES, adjustTemplateIndentation } from './component-templates'

// Component tokens
export * from './component-tokens'

// Theme
export * from './theme-generator'

// Color utilities
export * from './color-utils'

// Layout defaults
export {
  NON_CONTAINER_PRIMITIVES,
  isContainer,
  FLEX_DEFAULTS,
  CONTAINER_DEFAULTS,
  NINE_ZONE,
  CENTER_ALIGNMENT,
  getFlexDefaults,
  getNineZoneAlignment,
  isNineZonePosition,
  type NineZonePosition,
  type SizingMode,
  type SizingFlags,
} from './layout-defaults'

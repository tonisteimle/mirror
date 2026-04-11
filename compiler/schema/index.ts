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

// Primitives
export {
  PRIMITIVES,
  ZAG_PRIMITIVES,
  COMPOUND_PRIMITIVES,
  CHART_PRIMITIVES,
} from './dsl'

// Properties
export * from './properties'

// Zag-specific
export { isZagPrimitive, getZagSlotDefs, type ZagSlotDef } from './zag-primitives'
export { getZagPropMetadata, type ZagPropMeta, type ZagPropMetaEntry } from './zag-prop-metadata'

// Component templates
export { COMPONENT_TEMPLATES, adjustTemplateIndentation } from './component-templates'

// Compound primitives
export { getCompoundPrimitive, type CompoundPrimitiveDef, type SlotDef } from './compound-primitives'

// Component tokens
export * from './component-tokens'

// Theme
export * from './theme-generator'

// Color utilities
export * from './color-utils'

// Layout defaults
export { getLayoutDefaults, type LayoutDefaults } from './layout-defaults'

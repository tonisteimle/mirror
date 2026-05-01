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
  isPrimitive,
  findProperty,
  getEvent,
  getAction,
  getState,
  getDevicePreset,
  isDevicePreset,
  type PropertyDef,
  type PrimitiveDef,
  type EventDef,
  type ActionDef,
  type StateDef,
  type CSSOutput,
  type PropertyValue,
  type NumericValue,
} from './dsl'

// Property-Panel metadata (separate model from compile-time SCHEMA in dsl.ts —
// the panel needs UI hints like `type`, `min`/`max`, `options`).
// Consumers import directly from './properties' to avoid name collisions
// with dsl.ts's findProperty / getPropertiesByCategory.

// Zag-specific
export {
  ZAG_PRIMITIVES,
  isZagPrimitive,
  getSlotDef,
  getSlotMappings,
  type ZagSlotDef,
  type ZagPrimitiveDef,
} from './zag-primitives'

// Chart-specific
export { CHART_PRIMITIVES } from './chart-primitives'
export { getZagPropMetadata, type ZagPropMeta } from './zag-prop-metadata'

// Primitive roles (positional-args resolution)
export { PRIMITIVE_ROLES, getPrimitiveRole, type PrimitiveRole } from './primitive-roles'

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

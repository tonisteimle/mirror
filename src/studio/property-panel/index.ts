/**
 * PropertyPanel Module
 *
 * Modular property panel for the Mirror Studio.
 */

// Export interfaces
export * from './interfaces'

// Export utilities
export * from './utils/html-utils'

// Services
export { TokenService, createTokenService } from './services/token-service'
export type { GetSourceCallback } from './services/token-service'
export { AutocompleteManager, createAutocompleteManager } from './services/autocomplete-manager'
export type { OnTokenSelectCallback } from './services/autocomplete-manager'
export { PropertyValueService, createPropertyValueService } from './services/property-value-service'
export type { SetValueOptions, SetValueResult } from './services/property-value-service'
export {
  PROPERTY_SCHEMAS,
  getPropertySchema,
  getCanonicalPropertyName,
  isCompoundProperty
} from './services/property-schemas'
export type { PropertySchema, PropertyType, PropertyPart } from './services/property-schemas'

// Renderers
export { BasePropertyRenderer } from './renderers/base-renderer'
export { LayoutRenderer } from './renderers/layout-renderer'
export { SizingRenderer } from './renderers/sizing-renderer'
export { SpacingRenderer } from './renderers/spacing-renderer'
export { BorderRenderer } from './renderers/border-renderer'
export { ColorRenderer } from './renderers/color-renderer'
export { TypographyRenderer } from './renderers/typography-renderer'

// Utilities
export { IncrementalRenderer, createIncrementalRenderer } from './incremental-renderer'
export { KeyboardHandler, createKeyboardHandler } from './keyboard-handler'

// Property Panel V2 (modular implementation)
export { PropertyPanelV2, createPropertyPanelV2 } from './property-panel-v2'
export type { OnCodeChangeCallback } from './property-panel-v2'

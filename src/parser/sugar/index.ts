/**
 * Sugar Module
 *
 * Syntactic sugar handling for implicit property assignments.
 * Provides a registry-based system for processing tokens without explicit property names.
 *
 * Example sugar syntax:
 * - Box 300 400        -> Box w 300 h 400
 * - Box #FF0000        -> Box col #FF0000
 * - Image "photo.jpg"  -> Image src "photo.jpg"
 * - Input "Email"      -> Input placeholder "Email"
 * - $default-pad       -> pad: <token value>
 */

// Type exports
export type { SugarHandler, SugarContext, SugarResult } from './types'

// Registry exports
export { SugarRegistry, createSugarRegistry } from './sugar-registry'

// Component type matcher exports
export {
  isImageComponent,
  isInputComponent,
  isTextareaComponent,
  isLinkComponent,
  isButtonComponent,
  isItemComponent,
  getComponentCategory,
  getStringPropertyForCategory
} from './component-type-matcher'
export type { ComponentCategory } from './component-type-matcher'

// Handler exports
export { dimensionHandler, imageDimensionHandler } from './handlers/dimension-handler'
export { colorHandler } from './handlers/color-handler'
export {
  imageStringHandler,
  inputStringHandler,
  textareaStringHandler,
  linkStringHandler,
  itemStringHandler,
  defaultStringHandler
} from './handlers/string-handler'
export { tokenHandler } from './handlers/token-handler'
export { orphanNumberHandler } from './handlers/orphan-handler'

// Import for creating default registry
import { createSugarRegistry } from './sugar-registry'
import { dimensionHandler, imageDimensionHandler } from './handlers/dimension-handler'
import { colorHandler } from './handlers/color-handler'
import {
  imageStringHandler,
  inputStringHandler,
  textareaStringHandler,
  linkStringHandler,
  itemStringHandler,
  defaultStringHandler
} from './handlers/string-handler'
import { tokenHandler } from './handlers/token-handler'
import { orphanNumberHandler } from './handlers/orphan-handler'

/**
 * Create a sugar registry with all default handlers registered.
 * This is the main entry point for sugar handling.
 */
export function createDefaultSugarRegistry() {
  const registry = createSugarRegistry()

  // Register string handlers (highest priority for specific types)
  registry.register(imageStringHandler)
  registry.register(inputStringHandler)
  registry.register(textareaStringHandler)
  registry.register(linkStringHandler)
  registry.register(itemStringHandler)
  registry.register(defaultStringHandler)

  // Register number handlers
  registry.register(imageDimensionHandler) // Higher priority for images
  registry.register(dimensionHandler)
  registry.register(orphanNumberHandler) // Lowest priority fallback

  // Register color handler
  registry.register(colorHandler)

  // Register token handler
  registry.register(tokenHandler)

  return registry
}

/**
 * Default singleton sugar registry.
 * Use this for standard parsing operations.
 */
let defaultRegistry: ReturnType<typeof createSugarRegistry> | null = null

export function getDefaultSugarRegistry() {
  if (!defaultRegistry) {
    defaultRegistry = createDefaultSugarRegistry()
  }
  return defaultRegistry
}

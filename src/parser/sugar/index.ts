/**
 * @module sugar
 * @description Sugar Module - Syntactic Sugar für implizite Properties
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Registry-basiertes System für implizite Property-Zuweisungen
 *
 * Ermöglicht verkürzte Syntax ohne explizite Property-Namen:
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SUGAR SYNTAX BEISPIELE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example Dimensions
 *   Box 300 400       → Box w 300 h 400
 *   Image 200 150     → Image w 200 h 150
 *
 * @example Colors
 *   Box #FF0000       → Box bg #FF0000
 *   Text #FFFFFF      → Text col #FFFFFF
 *
 * @example Strings
 *   Image "photo.jpg" → Image src "photo.jpg"
 *   Input "Email"     → Input placeholder "Email"
 *   Button "Click"    → Button "Click" (content)
 *
 * @example Tokens
 *   $default-pad      → pad: <token value>
 *   $primary-bg       → bg: <token value>
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * HANDLER KATEGORIEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @category Sketch Mode Handlers (Priority 300 - Highest)
 *   gridPatternHandler    → "Grid N" Pattern → grid: N
 *   sketchLayoutHandler   → Deutsche Layout-Keywords (zentriert, rechts)
 *   textHintHandler       → Text Hints (30W, kurz, lang) → Placeholder-Text
 *
 * @category String Handlers (Priority 200)
 *   imageStringHandler    → Image: String → src
 *   inputStringHandler    → Input: String → placeholder
 *   textareaStringHandler → Textarea: String → placeholder
 *   linkStringHandler     → Link: String → content (href explicit)
 *   iconStringHandler     → Icon: String → content (Icon-Name)
 *   iconNameHandler       → Icon: Identifier → icon name
 *   itemStringHandler     → Item: String → filterText
 *   contentComponentStringHandler → Content Components: String → content
 *   defaultStringHandler  → Default: String → content
 *
 * @category Number Handlers (Priority 100-150)
 *   imageDimensionHandler → Image: 2 Numbers → w, h
 *   dimensionHandler      → Box: 2 Numbers → w, h
 *   orphanNumberHandler   → Fallback: Single Number → ?
 *
 * @category Color Handler (Priority 100)
 *   colorHandler          → COLOR → bg (Container) oder col (Text)
 *
 * @category Token Handler (Priority 100)
 *   tokenHandler          → TOKEN_REF → Property aus Suffix inferieren
 *
 * @category Inline Span Utilities
 *   parseInlineSpans      → Parst Inline-Formatierung (*text*:bold)
 *   resolveSpanStyle      → Löst Span-Style auf (bold, italic, $token)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function createDefaultSugarRegistry() → SugarRegistry
 *   Erstellt Registry mit allen Standard-Handlern
 *
 * @function getDefaultSugarRegistry() → SugarRegistry
 *   Singleton-Zugriff auf Default-Registry
 *
 * @used-by component-parser/inline-properties.ts
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
  isIconComponent,
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
  iconStringHandler,
  iconNameHandler,
  itemStringHandler,
  contentComponentStringHandler,
  defaultStringHandler,
  parseInlineSpans,
  resolveSpanStyle
} from './handlers/string-handler'
export { tokenHandler } from './handlers/token-handler'
export { orphanNumberHandler } from './handlers/orphan-handler'
export { sketchLayoutHandler } from './handlers/sketch-layout-handler'
export { gridPatternHandler } from './handlers/grid-pattern-handler'
export { textHintHandler } from './handlers/text-hint-handler'

// Import for creating default registry
import { createSugarRegistry } from './sugar-registry'
import { dimensionHandler, imageDimensionHandler } from './handlers/dimension-handler'
import { colorHandler } from './handlers/color-handler'
import {
  imageStringHandler,
  inputStringHandler,
  textareaStringHandler,
  linkStringHandler,
  iconStringHandler,
  iconNameHandler,
  itemStringHandler,
  contentComponentStringHandler,
  defaultStringHandler
} from './handlers/string-handler'
import { tokenHandler } from './handlers/token-handler'
import { orphanNumberHandler } from './handlers/orphan-handler'
import { sketchLayoutHandler } from './handlers/sketch-layout-handler'
import { gridPatternHandler } from './handlers/grid-pattern-handler'
import { textHintHandler } from './handlers/text-hint-handler'

/**
 * Create a sugar registry with all default handlers registered.
 * This is the main entry point for sugar handling.
 */
export function createDefaultSugarRegistry() {
  const registry = createSugarRegistry()

  // Register sketch mode handlers (highest priority)
  registry.register(gridPatternHandler) // Grid N pattern
  registry.register(sketchLayoutHandler) // German layout keywords
  registry.register(textHintHandler) // Text hints (30W, kurz, lang)

  // Register string handlers (high priority for specific types)
  registry.register(imageStringHandler)
  registry.register(inputStringHandler)
  registry.register(textareaStringHandler)
  registry.register(linkStringHandler)
  registry.register(iconStringHandler)
  registry.register(iconNameHandler)  // Icon name without quotes
  registry.register(itemStringHandler)
  registry.register(contentComponentStringHandler) // label, title, etc.
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

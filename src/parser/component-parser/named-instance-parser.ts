/**
 * @module component-parser/named-instance-parser
 * @description Parser für Named Instance Patterns
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Parst verschiedene Named-Instance-Syntax-Varianten
 *
 * Named Instances erlauben das Referenzieren von Komponenten:
 * - In Events: Email onclick validate Form
 * - In Conditionals: if Email.value page Dashboard
 * - In Property Access: Submit.disabled = true
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNTAX-VARIANTEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax NEW: Name as PrimitiveType (empfohlen)
 *   Email as Input: "Enter email" type email
 *   Avatar as Image: 48 48 radius 24
 *
 *   → componentName: Email
 *   → instanceName: Email
 *   → componentType: Input
 *
 * @syntax NEW: Name as LibraryType
 *   Settings as Dialog: padding 24
 *   Menu as Dropdown: width 200
 *
 *   → componentName: Settings
 *   → instanceName: Settings
 *   → libraryType: Dialog
 *
 * @syntax NEW: Name as CustomComponent
 *   label as Standardtext: "Beschriftung"
 *   header as Title: "Willkommen"
 *
 *   → componentName: label
 *   → instanceName: label
 *   → customComponentType: Standardtext (instanziiert Standardtext-Template)
 *
 * @syntax OLD: PrimitiveType Name (backwards-compat)
 *   Input Email: "Enter email"
 *   Image Avatar: 48 48
 *
 *   → componentName: Email
 *   → instanceName: Email
 *   → componentType: Input
 *
 * @syntax Named Keyword
 *   Button named Save: "Save"
 *   Card named MainCard: padding 16
 *
 *   → componentName: Button
 *   → instanceName: Save
 *   → componentType: Button (wenn HTML-Primitive)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PARSING-ALGORITHMUS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @algorithm
 * 1. Prüfe auf 'as' Keyword:
 *    a. Konsumiere 'as'
 *    b. Lese PrimitiveType oder LibraryType
 *    c. Setze instanceName = componentName
 *
 * 2. Sonst prüfe auf 'named' Keyword:
 *    a. Konsumiere 'named'
 *    b. Lese Instance-Name
 *    c. Behalte componentName, setze nur instanceName
 *
 * 3. Sonst prüfe auf OLD Primitive-Syntax:
 *    a. componentName muss HTML_PRIMITIVE sein
 *    b. Nächstes Token = PascalCase Name
 *    c. Tausche: componentType = componentName, componentName = Name
 *
 * @returns NamedInstanceResult mit allen geparsten Informationen
 */

import type { ParserContext } from '../parser-context'
import type { NamedInstanceResult } from './types'
import { HTML_PRIMITIVES } from './constants'
import { isLibraryComponent } from '../../library/registry'

/**
 * Parse named instance patterns.
 *
 * @param ctx Parser context
 * @param componentName The initial component name
 * @param isExplicitDefinition Whether this is an explicit definition (with colon)
 * @returns Named instance result with parsed names and types
 */
export function parseNamedInstance(
  ctx: ParserContext,
  componentName: string,
  isExplicitDefinition: boolean
): NamedInstanceResult {
  let instanceName: string | undefined
  let componentType: string | undefined
  let libraryType: string | undefined
  let customComponentType: string | undefined

  // Check for NEW syntax: Name as PrimitiveType or Name as LibraryType or Name as CustomComponent
  const asToken = ctx.current()
  if (asToken?.type === 'KEYWORD' && asToken.value === 'as') {
    ctx.advance() // consume 'as'
    const primitiveToken = ctx.current()
    if (primitiveToken && (primitiveToken.type === 'COMPONENT_NAME' || primitiveToken.type === 'COMPONENT_DEF')) {
      const primitiveValue = ctx.advance().value
      // Always set isExplicitDefinition if the token was COMPONENT_DEF (has colon)
      if (primitiveToken.type === 'COMPONENT_DEF') {
        isExplicitDefinition = true
      }
      if (HTML_PRIMITIVES.includes(primitiveValue)) {
        instanceName = componentName
        componentType = primitiveValue
      } else if (isLibraryComponent(primitiveValue)) {
        instanceName = componentName
        libraryType = primitiveValue
      } else {
        // Custom component type (e.g., "label as Standardtext")
        // The node will be named "label" but instantiate "Standardtext" template
        instanceName = componentName
        customComponentType = primitiveValue
      }
    }
  }
  // Check for 'named' keyword or OLD primitive syntax
  else {
    const nextToken = ctx.current()

    if (nextToken?.type === 'KEYWORD' && nextToken.value === 'named') {
      ctx.advance() // consume 'named'
      const nameToken = ctx.current()
      // Allow both uppercase and lowercase instance names (e.g., "named MyBtn" or "named myBtn")
      if ((nameToken?.type === 'COMPONENT_NAME' || nameToken?.type === 'COMPONENT_DEF') && /^[a-zA-Z]/.test(nameToken.value)) {
        if (nameToken.type === 'COMPONENT_DEF') {
          isExplicitDefinition = true
        }
        instanceName = ctx.advance().value

        // For 'named' keyword syntax, preserve the original component name
        // and just set the componentType for HTML primitives
        if (HTML_PRIMITIVES.includes(componentName)) {
          componentType = componentName
          // Don't change componentName - keep it as the original primitive
        }
      }
    }
    // OLD syntax for HTML primitives: Input Email: or Input Email "placeholder"
    // Applies when followed by a PascalCase name that is NOT itself an HTML_PRIMITIVE
    // e.g., "Input Email:" (definition) or "Input Email 'email'" (instance)
    // NOT for "Button Icon check" where Icon is an inline child (Icon IS a primitive)
    else if (HTML_PRIMITIVES.includes(componentName)) {
      const nextValue = nextToken?.value ?? ''
      const isNextPrimitive = HTML_PRIMITIVES.includes(nextValue)

      // If the next token is ALSO an HTML_PRIMITIVE (like Icon), don't treat this as named-instance
      // Instead, it's an inline child: Button Icon check
      if (isNextPrimitive) {
        // Just mark componentType, don't consume the next token
        componentType = componentName
      }
      // Otherwise, apply the old named-instance pattern
      else if ((nextToken?.type === 'COMPONENT_NAME' || nextToken?.type === 'COMPONENT_DEF') && /^[A-Z]/.test(nextValue)) {
        componentType = componentName
        if (nextToken!.type === 'COMPONENT_DEF') {
          isExplicitDefinition = true
        }
        instanceName = ctx.advance().value
        componentName = instanceName

        // V2 syntax: Check for COLON after instance name (e.g., "Input Email: { ... }")
        if (ctx.current()?.type === 'COLON') {
          isExplicitDefinition = true
          ctx.advance() // consume the colon
        }
      } else {
        // No named instance, just mark the componentType for rendering
        componentType = componentName
      }
    }
  }

  return { componentName, instanceName, componentType, libraryType, customComponentType, isExplicitDefinition }
}

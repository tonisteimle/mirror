/**
 * Named Instance Parser Module
 *
 * Parses named instance patterns:
 * - NEW: Email as Input: -> name: Email, primitiveType: Input
 * - OLD: Input Email: -> name: Email, primitiveType: Input (backwards compat)
 * - named keyword: Button named Save:
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

  // Check for NEW syntax: Name as PrimitiveType or Name as LibraryType
  const asToken = ctx.current()
  if (asToken?.type === 'KEYWORD' && asToken.value === 'as') {
    ctx.advance() // consume 'as'
    const primitiveToken = ctx.current()
    if (primitiveToken && (primitiveToken.type === 'COMPONENT_NAME' || primitiveToken.type === 'COMPONENT_DEF')) {
      const primitiveValue = ctx.advance().value
      if (HTML_PRIMITIVES.includes(primitiveValue)) {
        instanceName = componentName
        componentType = primitiveValue
        if (primitiveToken.type === 'COMPONENT_DEF') {
          isExplicitDefinition = true
        }
      } else if (isLibraryComponent(primitiveValue)) {
        instanceName = componentName
        libraryType = primitiveValue
        if (primitiveToken.type === 'COMPONENT_DEF') {
          isExplicitDefinition = true
        }
      }
    }
  }
  // Check for 'named' keyword or OLD primitive syntax
  else {
    const nextToken = ctx.current()

    if (nextToken?.type === 'KEYWORD' && nextToken.value === 'named') {
      ctx.advance() // consume 'named'
      const nameToken = ctx.current()
      if ((nameToken?.type === 'COMPONENT_NAME' || nameToken?.type === 'COMPONENT_DEF') && /^[A-Z]/.test(nameToken.value)) {
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
    // OLD syntax for HTML primitives: Input Email:
    else if (HTML_PRIMITIVES.includes(componentName)) {
      componentType = componentName
      if ((nextToken?.type === 'COMPONENT_NAME' || nextToken?.type === 'COMPONENT_DEF') && /^[A-Z]/.test(nextToken.value)) {
        if (nextToken.type === 'COMPONENT_DEF') {
          isExplicitDefinition = true
        }
        instanceName = ctx.advance().value
        componentName = instanceName
      }
    }
  }

  return { componentName, instanceName, componentType, libraryType, isExplicitDefinition }
}

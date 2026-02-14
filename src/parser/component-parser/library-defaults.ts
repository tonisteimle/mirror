/**
 * Library Defaults Module
 *
 * Handles application of library component defaults (states, slot properties).
 */

import type { ParserContext } from '../parser-context'
import type { ASTNode } from './types'
import type { Token } from '../lexer'
import { isLibraryComponent, isLibrarySlot, getLibraryComponent } from '../../library/registry'

/**
 * Apply library component defaults (states, slot properties).
 *
 * @param ctx Parser context
 * @param node Target AST node to apply defaults to
 * @param libraryType Optional library type (from 'as' syntax)
 * @param parentScope Optional parent scope for slot validation
 * @param startToken Start token for error reporting
 */
export function applyLibraryDefaults(
  ctx: ParserContext,
  node: ASTNode,
  libraryType: string | undefined,
  parentScope: string | undefined,
  startToken: Token
): void {
  if (libraryType) {
    node._isLibrary = true
    node._libraryType = libraryType
    const libDef = getLibraryComponent(libraryType)
    if (libDef && libDef.defaultStates.length > 0) {
      node.states = libDef.defaultStates.map((stateName, index) => ({
        name: stateName,
        properties: index === 0 ? {} as Record<string, string | number | boolean> : { display: 'none' as string },
        children: []
      }))
    }
  } else if (isLibraryComponent(node.name)) {
    const isDocModeComponent = node.name === 'doc' || node.name === 'text' || node.name === 'playground'
    if (!isDocModeComponent) {
      ctx.addWarning(
        'P010',
        `Library component "${node.name}" should be used with 'as' syntax`,
        startToken,
        `Example: MyComponent as ${node.name}:`
      )
    }
    node._isLibrary = true
    node._libraryType = node.name
    const libDef = getLibraryComponent(node.name)
    if (libDef && libDef.defaultStates.length > 0) {
      node.states = libDef.defaultStates.map((stateName, index) => ({
        name: stateName,
        properties: index === 0 ? {} as Record<string, string | number | boolean> : { display: 'none' as string },
        children: []
      }))
    }
  }

  // Check if this is a slot of a library component
  if (parentScope && isLibraryComponent(parentScope)) {
    if (isLibrarySlot(parentScope, node.name)) {
      node._libraryParent = parentScope
      const libDef = getLibraryComponent(parentScope)
      const slotDef = libDef?.slots.find(s => s.name === node.name)
      if (slotDef) {
        node.properties = { ...slotDef.defaultProps, ...node.properties }
      }
    } else {
      ctx.errors.push(`Warning: Line ${startToken.line + 1}: "${node.name}" is not a valid slot for ${parentScope}. Valid slots: ${getLibraryComponent(parentScope)?.slots.map(s => s.name).join(', ')}`)
    }
  }
}

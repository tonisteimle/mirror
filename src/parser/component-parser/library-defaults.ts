/**
 * @module component-parser/library-defaults
 * @description Library-Component Defaults Anwendung
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Wendet Library-Component Defaults auf Nodes an
 *
 * Library-Components (Dialog, Dropdown, Accordion) haben:
 * - Vordefinierte States (open/closed, expanded/collapsed)
 * - Slots mit Default-Properties
 * - Automatische Behavior-Konfiguration
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LIBRARY COMPONENT DETECTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Mit 'as' Keyword (empfohlen)
 *   MyDialog as Dialog: padding 24
 *   → _isLibrary: true, _libraryType: 'Dialog'
 *
 * @syntax Direkte Verwendung (Warning)
 *   Dialog: padding 24
 *   → Warning: Should use 'as' syntax
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEFAULT STATES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @library Dialog
 *   States: open, closed (default: closed = display: none)
 *
 * @library Dropdown
 *   States: closed, open
 *
 * @library Accordion
 *   States: collapsed, expanded
 *
 * @algorithm
 * 1. Prüfe libraryType oder node.name auf Library-Component
 * 2. Hole Library-Definition aus Registry
 * 3. Erstelle State-Objekte mit Default-Properties
 * 4. Erster State = sichtbar, weitere = display: none
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SLOT VALIDATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Slots werden validiert wenn parentScope bekannt
 *   Dialog
 *     Header "Title"    // Valider Slot
 *     Content "Body"    // Valider Slot
 *     Footer            // Valider Slot
 *     Random "..."      // Warning: Invalid slot
 *
 * @algorithm
 * 1. Prüfe ob parentScope ein Library-Component ist
 * 2. Prüfe ob node.name ein gültiger Slot ist
 * 3. Falls ja: Kopiere Slot-Default-Properties
 * 4. Falls nein: Warning mit gültigen Slots
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
  } else if (isLibraryComponent(node.name) && !ctx.registry.has(node.name)) {
    // Only warn if user hasn't defined their own component with this name
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
      // Find slot by name or alias
      const slotDef = libDef?.slots.find(s =>
        s.name === node.name || (s.aliases && s.aliases.includes(node.name))
      )
      if (slotDef) {
        node.properties = { ...slotDef.defaultProps, ...node.properties }
      }
    } else {
      const libDef = getLibraryComponent(parentScope)
      const validSlots = libDef?.slots.flatMap(s => [s.name, ...(s.aliases || [])]).join(', ')
      ctx.errors.push(`Warning: Line ${startToken.line + 1}: "${node.name}" is not a valid slot for ${parentScope}. Valid slots: ${validSlots}`)
    }
  }
}

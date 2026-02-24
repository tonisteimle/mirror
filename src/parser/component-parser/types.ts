/**
 * @module component-parser/types
 * @description Type-Definitionen für Component-Parser Module
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Geteilte Types für alle Component-Parser Sub-Module
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TYPEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type NamedInstanceResult
 *   Ergebnis vom Named-Instance-Parsing:
 *   - componentName: Der finale Component-Name
 *   - instanceName: Named Instance Name (Email, Save, etc.)
 *   - componentType: HTML-Primitive Typ (Input, Button, etc.)
 *   - libraryType: Library-Typ (Dialog, Dropdown, etc.)
 *   - isExplicitDefinition: Ob mit Colon definiert
 *
 * @type InlinePropertyContext
 *   Context für Inline-Property-Handler:
 *   - componentName: Aktueller Component
 *   - inlineSlots: Inline-definierte Slot-Kinder
 *
 * @type TemplateExtras
 *   Extras die von Template auf Node kopiert werden:
 *   - states: State-Definitionen
 *   - variables: Variable-Declarations
 *   - eventHandlers: Event-Handler
 *   - _isLibrary: Library-Component Flag
 *   - _libraryType: Original Library-Typ
 *   - showAnimation, hideAnimation, continuousAnimation
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NAMED INSTANCE PATTERNS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example NEW Syntax: Name as Type
 *   Email as Input: "Enter email"
 *   → componentName: Email, componentType: Input
 *
 * @example OLD Syntax: Type Name
 *   Input Email: "Enter email"
 *   → componentName: Email, componentType: Input
 *
 * @example Named Keyword
 *   Button named Save: "Save"
 *   → componentName: Button, instanceName: Save
 */

import type { ASTNode, ComponentTemplate, DSLProperties, ConditionExpr, EventHandler } from '../types'
import type { Token } from '../lexer'

/**
 * Result of parsing a named instance pattern.
 * Handles patterns like:
 * - NEW: Email as Input: (name: Email, primitiveType: Input)
 * - OLD: Input Email: (name: Email, primitiveType: Input - backwards compat)
 * - named keyword: Button named Save:
 */
export interface NamedInstanceResult {
  componentName: string
  instanceName?: string
  componentType?: string
  libraryType?: string
  customComponentType?: string  // For "label as Standardtext" - the custom component to instantiate
  isExplicitDefinition: boolean
}

/**
 * Context passed to inline property handlers.
 */
export interface InlinePropertyContext {
  componentName: string
  inlineSlots: ASTNode[]
}

/**
 * Template extras that can be copied from a template to a node.
 * Includes states, variables, event handlers, and library type info.
 */
export interface TemplateExtras {
  states?: ASTNode['states']
  variables?: ASTNode['variables']
  eventHandlers?: EventHandler[]
  _isLibrary?: boolean
  _libraryType?: string
  showAnimation?: ASTNode['showAnimation']
  hideAnimation?: ASTNode['hideAnimation']
  continuousAnimation?: ASTNode['continuousAnimation']
}

// Re-export types needed by other modules
export type {
  ASTNode,
  ComponentTemplate,
  DSLProperties,
  ConditionExpr,
  EventHandler,
  Token
}

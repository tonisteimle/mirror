/**
 * Component Parser Types Module
 *
 * Type definitions used across the component parser modules.
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

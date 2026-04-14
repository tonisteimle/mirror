/**
 * Transformer Context
 *
 * Shared context interface for all IR transformers.
 * Provides access to common transformation methods without tight coupling.
 */

import type { Property, Instance, Text, Slot } from '../../parser/ast'
import type { IRNode, IRStyle, SourcePosition } from '../types'

/**
 * Parent layout context for determining child layout behavior
 */
export interface ParentLayoutContext {
  type: 'flex' | 'grid' | 'absolute' | null
  gridColumns?: number
  flexDirection?: 'row' | 'column' // For w full / h full: determines main vs cross axis
}

/**
 * Context provided to all transformers for accessing shared functionality.
 */
export interface TransformerContext {
  /** Generate a unique node ID */
  generateId(): string

  /** Transform properties to IR styles */
  transformProperties(
    properties: Property[],
    primitive?: string,
    parentLayoutContext?: ParentLayoutContext
  ): IRStyle[]

  /** Transform a child node (Instance, Text, or Slot) */
  transformChild(
    child: Instance | Text | Slot,
    parentId?: string,
    parentLayoutContext?: ParentLayoutContext
  ): IRNode

  /** Include source map information */
  includeSourceMap: boolean

  /** Add node to source map */
  addToSourceMap?(
    nodeId: string,
    name: string,
    sourcePosition: SourcePosition,
    options?: { isDefinition?: boolean; parentId?: string }
  ): void

  /** Add property position to source map (for inline editing) */
  addPropertyPosition?(nodeId: string, propertyName: string, position: SourcePosition): void
}

/**
 * Create a source position object from line/column info
 */
export function createSourcePosition(line?: number, column?: number): SourcePosition {
  return {
    line: line ?? 0,
    column: column ?? 0,
    endLine: line ?? 0,
    endColumn: column ?? 0,
  }
}

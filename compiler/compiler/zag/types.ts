/**
 * Zag Compiler Types
 *
 * Type definitions for the Zag compilation pipeline.
 */

import type { Property, State, Event } from '../../parser/ast'
import type { IRStyle, IRNode, SourcePosition } from '../../ir/types'

/**
 * Configuration for Zag machine instantiation
 */
export interface ZagMachineConfig {
  /** Unique ID for the machine instance */
  id: string
  /** Placeholder text (for select, combobox) */
  placeholder?: string
  /** Allow multiple selections */
  multiple?: boolean
  /** Enable search/filter functionality */
  searchable?: boolean
  /** Show clear button */
  clearable?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Controlled value */
  value?: string | string[]
  /** Default value (uncontrolled) */
  defaultValue?: string | string[]
  /** Custom collection of items */
  collection?: any
}

/**
 * Parsed slot from AST
 */
export interface ParsedSlot {
  name: string
  properties: Property[]
  states: State[]
  children: any[]
  sourcePosition: SourcePosition
}

/**
 * Parsed item from AST
 */
export interface ParsedItem {
  value: string
  label: string
  disabled?: boolean
  children?: any[]
  sourcePosition: SourcePosition
}

/**
 * Context passed through Zag compilation
 */
export interface ZagCompileContext {
  /** ID counter for generating unique IDs */
  idCounter: number
  /** Map of component definitions */
  componentMap: Map<string, any>
  /** Set of token names for variable resolution */
  tokenSet: Set<string>
  /** Whether to include source maps */
  includeSourceMap: boolean
  /** Optional callback to transform child nodes using main IR transformer */
  transformChild?: (child: any) => IRNode | null
}

/**
 * Result of compiling a Zag slot
 */
export interface CompiledSlot {
  name: string
  apiMethod: string
  element: string
  styles: IRStyle[]
  children: IRNode[]
  portal?: boolean
  sourcePosition?: SourcePosition
}

/**
 * Result of compiling a Zag item
 */
export interface CompiledItem {
  value: string
  label: string
  disabled?: boolean
  children?: IRNode[]
  sourcePosition?: SourcePosition
}

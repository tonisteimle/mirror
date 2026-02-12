/**
 * Parser Types Module
 *
 * Central type definitions for the AST and related structures.
 * Extracted from parser.ts for better modularity.
 */

import type { DSLProperties } from '../types/dsl-properties'
export type { DSLProperties }

// ============================================
// Expression Types (for conditionals and arithmetic)
// ============================================

export interface Expression {
  type: 'literal' | 'variable' | 'binary' | 'unary' | 'property_access' | 'component_property'
  value?: string | number | boolean
  name?: string
  path?: string[]                    // $user.avatar -> ['user', 'avatar']
  componentName?: string             // Email.value -> componentName: 'Email'
  propertyName?: string              // Email.value -> propertyName: 'value'
  operator?: '+' | '-' | '*' | '/' | 'not'
  left?: Expression
  right?: Expression
  operand?: Expression               // For unary expressions (e.g., not $flag)
}

// ============================================
// V2: State, Variable, Event, Action Types
// ============================================

export interface StateDefinition {
  name: string
  properties: DSLProperties
  children: ASTNode[]
  line?: number
}

export interface VariableDeclaration {
  name: string
  value: string | number | boolean
  line?: number
}

export interface ActionStatement {
  type: 'change' | 'open' | 'close' | 'toggle' | 'page' | 'show' | 'hide' | 'assign' | 'set_property' | 'alert'
  target?: string       // Target component (e.g., panel1)
  toState?: string      // For 'change X to Y'
  property?: string     // For assignment: target.property = value
  value?: string | number | boolean | Expression  // For assignment (supports expressions)
  payload?: Record<string, Expression>            // Event payload for additional context
  animation?: string    // For open/close: slide-up, slide-down, fade, scale
  position?: 'below' | 'above' | 'left' | 'right' | 'center'  // For open: overlay position
  duration?: number     // For open/close: animation duration in ms (default: 200)
  // For set_property: Component.property = value
  componentName?: string  // Email.value = "x" -> componentName: 'Email'
  propertyName?: string   // Email.value = "x" -> propertyName: 'value'
  line?: number
}

export interface Conditional {
  condition: ConditionExpr
  thenActions: ActionStatement[]
  elseActions?: ActionStatement[]
  line?: number
}

export interface ConditionExpr {
  type: 'var' | 'not' | 'and' | 'or' | 'comparison'
  name?: string                    // For type='var': variable name
  operand?: ConditionExpr          // For type='not'
  left?: ConditionExpr             // For 'and', 'or', 'comparison'
  right?: ConditionExpr            // For 'and', 'or', 'comparison'
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<='  // For comparison
  value?: string | number | boolean // For comparison right-hand side
}

export interface EventHandler {
  event: string  // onclick, onhover, etc.
  actions: (ActionStatement | Conditional)[]
  line?: number
}

/**
 * Centralized event handler that targets a specific named instance.
 * Used in the `events` block: `Email onchange ...`
 */
export interface CentralizedEventHandler {
  targetInstance: string  // The named instance (e.g., 'Email', 'Submit')
  event: string           // onclick, onhover, onchange, etc.
  actions: (ActionStatement | Conditional)[]
  line?: number
}

// ============================================
// ASTNode - The core AST structure
// ============================================

export interface ASTNode {
  type: 'component'
  name: string
  id: string  // Auto-generated unique ID
  properties: DSLProperties
  content?: string
  children: ASTNode[]
  line?: number      // Source line number (0-indexed)
  column?: number    // Source column number
  endLine?: number   // End line number (0-indexed)
  endColumn?: number // End column number
  // V5: Named instances (Input Email: -> instanceName: 'Email', name: 'Input')
  instanceName?: string  // For named instances like Input Email:
  // V2: New fields for interactivity
  states?: StateDefinition[]
  variables?: VariableDeclaration[]
  eventHandlers?: EventHandler[]
  // V3: Conditional rendering and iteration
  condition?: ConditionExpr          // For if-nodes (_conditional)
  elseChildren?: ASTNode[]           // For else-branch
  iteration?: {                      // For each-loops (_iterator)
    itemVar: string                  // $item
    collectionVar: string            // $items
    collectionPath?: string[]        // $data.items -> ['data', 'items']
  }
  // V3: Conditional properties (if $cond then props else props)
  conditionalProperties?: {
    condition: ConditionExpr
    thenProperties: DSLProperties
    elseProperties?: DSLProperties
  }[]
  // Library component fields
  _isLibrary?: boolean  // True if this is a library component (Dropdown, Dialog, etc.)
  _libraryParent?: string  // Name of parent library component (for slots)
  _libraryType?: string  // Original library name when using 'as' syntax (e.g., "Dialog" for "SettingsDialog as Dialog")
  // V4: List items (new instances)
  _isListItem?: boolean  // True if created with - prefix (new instance)
  // V5: Explicit definitions (template definitions with colon)
  _isExplicitDefinition?: boolean  // True if defined with colon (e.g., Input Email:)
  // V6: Element animations
  showAnimation?: AnimationDefinition    // show fade slide-up 300
  hideAnimation?: AnimationDefinition    // hide fade 200
  continuousAnimation?: AnimationDefinition  // animate spin 1000
}

// Animation definition for show/hide/animate
export interface AnimationDefinition {
  type: 'show' | 'hide' | 'animate'
  animations: string[]   // ['fade', 'slide-up'] - can combine multiple
  duration?: number      // Duration in ms (default 300)
  line?: number
}

// ============================================
// Component Templates and Styles
// ============================================

export interface ComponentTemplate {
  properties: DSLProperties
  content?: string
  children: ASTNode[]
  // V2: New fields for interactivity
  states?: StateDefinition[]
  variables?: VariableDeclaration[]
  eventHandlers?: EventHandler[]
  // V5: Library type for 'as Text' etc.
  _isLibrary?: boolean
  _libraryType?: string
}

export interface StyleMixin {
  properties: DSLProperties
}

// ============================================
// Selection Commands
// ============================================

export interface SelectionCommand {
  type: 'modify' | 'addChild' | 'addBefore' | 'addAfter'
  targetId: string
  property?: string
  value?: string | number
  component?: Omit<ASTNode, 'id'> & { id?: string }
}

// ============================================
// Parse Result
// ============================================

// ============================================
// Token Value Types (for design tokens)
// ============================================

import type { Token } from './lexer'

/**
 * Token values can be:
 * - Simple values (string, number)
 * - Token sequences for complex values like "l-r 4" or "$base * 2"
 */
export type TokenValue = string | number | TokenSequence

export interface TokenSequence {
  type: 'sequence'
  tokens: Token[]
}

export function isTokenSequence(value: TokenValue): value is TokenSequence {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'sequence'
}

// ============================================
// Parse Result
// ============================================

import type { ParseError } from './errors'

export interface ParseResult {
  nodes: ASTNode[]
  /** Simple error strings (backwards compatibility) */
  errors: string[]
  /** Structured errors with location and hints */
  diagnostics: ParseError[]
  registry: Map<string, ComponentTemplate>
  tokens: Map<string, TokenValue>
  styles: Map<string, StyleMixin>
  commands: SelectionCommand[]
  centralizedEvents: CentralizedEventHandler[]  // Events from the `events` block
}

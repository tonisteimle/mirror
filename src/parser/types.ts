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

// Valid action types for ActionStatement
export const ACTION_TYPES = [
  'change', 'open', 'close', 'toggle', 'page', 'show', 'hide', 'assign', 'set_property', 'alert',
  'highlight', 'select', 'filter', 'focus',
  'deselect', 'clear-selection',
  'activate', 'deactivate', 'deactivate-siblings',
  'toggle-state', 'validate', 'reset'
] as const

export type ActionType = typeof ACTION_TYPES[number]

/** Type guard for valid action types */
export function isActionType(value: string): value is ActionType {
  return ACTION_TYPES.includes(value as ActionType)
}

export interface ActionStatement {
  type: ActionType
  target?: string       // Target component (e.g., panel1) or special: 'self', 'next', 'prev', 'highlighted'
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
  // For behavior actions
  inContainer?: string    // For 'highlight next in dropdown' -> inContainer: 'dropdown'
  // Timing
  delay?: number          // Delay action in ms: onblur delay 200 hide Results
  line?: number
}

export interface Conditional {
  condition: ConditionExpr
  thenActions: ActionStatement[]
  elseActions?: ActionStatement[]
  line?: number
}

// Valid comparison operators
export const COMPARISON_OPERATORS = ['==', '!=', '>', '<', '>=', '<='] as const
export type ComparisonOperator = typeof COMPARISON_OPERATORS[number]

/** Type guard for valid comparison operators */
export function isComparisonOperator(value: string): value is ComparisonOperator {
  return COMPARISON_OPERATORS.includes(value as ComparisonOperator)
}

export interface ConditionExpr {
  type: 'var' | 'not' | 'and' | 'or' | 'comparison'
  name?: string                    // For type='var': variable name
  operand?: ConditionExpr          // For type='not'
  left?: ConditionExpr             // For 'and', 'or', 'comparison'
  right?: ConditionExpr            // For 'and', 'or', 'comparison'
  operator?: ComparisonOperator    // For comparison
  value?: string | number | boolean // For comparison right-hand side
}

export interface EventHandler {
  event: string  // onclick, onhover, onclick-outside, etc.
  modifier?: string  // For onkeydown: 'escape', 'enter', 'arrow-down', etc.
  debounce?: number  // Debounce in ms: oninput debounce 300 filter Results
  delay?: number     // Delay in ms: onblur delay 200 hide Results
  actions: (ActionStatement | Conditional)[]
  line?: number
}

/**
 * Centralized event handler that targets a specific named instance.
 * Used in the `events` block: `Email onchange ...`
 */
export interface CentralizedEventHandler {
  targetInstance: string  // The named instance (e.g., 'Email', 'Submit')
  event: string           // onclick, onhover, onchange, onclick-outside, etc.
  modifier?: string       // For onkeydown: 'escape', 'enter', 'arrow-down', etc.
  debounce?: number       // Debounce in ms: oninput debounce 300 filter Results
  delay?: number          // Delay in ms: onblur delay 200 hide Results
  actions: (ActionStatement | Conditional)[]
  line?: number
}

// ============================================
// Parse Issues (for error-tolerant parsing)
// ============================================

export type ParseIssueType =
  | 'unknown_event'       // onclck (looks like event but invalid)
  | 'unknown_property'    // paddin (looks like property but invalid)
  | 'unknown_animation'   // slideup (looks like animation but invalid)
  | 'unknown_action'      // opn (looks like action but invalid)
  | 'invalid_value'       // col "hello" (wrong type)
  | 'unknown_token'       // General unknown identifier

export interface ParseIssue {
  type: ParseIssueType
  value: string           // The problematic token value
  line: number            // 0-indexed line number
  column: number          // 0-indexed column number
  message: string         // Human-readable description
  suggestion?: string     // "Did you mean X?"
  context?: string        // Additional context (e.g., property name)
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
  // Data binding: data Tasks [where condition]
  dataBinding?: {
    typeName: string                 // Tasks, Users, etc.
    filter?: ConditionExpr           // Optional where clause
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
  // V7: Parse issues (error-tolerant parsing)
  parseIssues?: ParseIssue[]  // Collected issues during parsing
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
  // V6: Animation definitions
  showAnimation?: AnimationDefinition
  hideAnimation?: AnimationDefinition
  continuousAnimation?: AnimationDefinition
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
  /** Parse issues collected during error-tolerant parsing */
  parseIssues: ParseIssue[]
  registry: Map<string, ComponentTemplate>
  tokens: Map<string, TokenValue>
  styles: Map<string, StyleMixin>
  commands: SelectionCommand[]
  centralizedEvents: CentralizedEventHandler[]  // Events from the `events` block
}

// ============================================
// Data Schema Types (for Data Tab)
// ============================================

export type DataFieldType = 'text' | 'number' | 'boolean' | string  // string = Relation to another type

export interface DataField {
  name: string           // Field name, e.g. "title"
  type: DataFieldType    // Field type, e.g. "text", "number", "boolean", or "Category" (relation)
}

export interface DataSchema {
  typeName: string       // Type name, e.g. "Task"
  fields: DataField[]    // Fields in this type
}

export type DataRecord = Record<string, unknown> & { _id: string }

export type DataRecords = Map<string, DataRecord[]>

// ============================================
// Data Instance Types (for new Data Tab syntax)
// ============================================

/**
 * Parsed data instance from the Data tab.
 * Created from lines like: - Task "Einkaufen" false Category[0]
 */
export interface DataInstance {
  /** Type name this instance belongs to (e.g., "Task") */
  typeName: string
  /** Unique ID, auto-generated as "typename-index" */
  _id: string
  /** Field values in order as defined in the schema */
  values: DataInstanceValue[]
  /** Line number in source (0-indexed) */
  line?: number
}

/**
 * A single field value in a data instance.
 */
export interface DataInstanceValue {
  /** Field name from schema */
  fieldName: string
  /** The value - can be primitive or a reference */
  value: string | number | boolean | DataInstanceReference
}

/**
 * Reference to another data instance (e.g., Category[0])
 */
export interface DataInstanceReference {
  type: 'reference'
  /** Referenced type name (e.g., "Category") */
  typeName: string
  /** Index in the list of that type (0-based) */
  index: number
}

/**
 * Check if a value is a reference
 */
export function isDataInstanceReference(value: unknown): value is DataInstanceReference {
  return typeof value === 'object' && value !== null && 'type' in value && (value as DataInstanceReference).type === 'reference'
}

/**
 * Result of parsing the Data tab code
 */
export interface DataParseResult {
  schemas: DataSchema[]
  instances: DataInstance[]
  errors: string[]
}

/**
 * @module types
 * @description Parser Types - Zentrale Type-Definitionen für AST
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Alle Type-Definitionen für den AST und verwandte Strukturen
 *
 * Diese Datei definiert:
 * - ASTNode: Kern-Struktur für alle geparsten Komponenten
 * - Expression: Für Conditionals und Arithmetic
 * - States, Events, Actions: Für Interaktivität
 * - Templates und Mixins: Für Wiederverwendung
 * - Parse Result: Output des Parsers
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * AST-NODE STRUKTUR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type ASTNode
 *   type: 'component'              Immer 'component'
 *   name: string                   Component-Name (Button, Card, etc.)
 *   id: string                     Auto-generierte eindeutige ID
 *   properties: DSLProperties      Alle Properties (pad, bg, w, etc.)
 *   content?: string               Text-Content ("Click me")
 *   children: ASTNode[]            Child-Komponenten
 *
 * @optional-fields
 *   line, column                   Source-Position (0-indexed)
 *   instanceName                   Named Instance (Input Email:)
 *   extends                        Inheritance (DangerButton from Button)
 *   states                         State-Definitionen
 *   eventHandlers                  Event-Handler
 *   condition                      Conditional Rendering (if $x)
 *   iteration                      Loop (each $item in $list)
 *   dataBinding                    Data-Binding (data Tasks)
 *   conditionalProperties          Inline-Conditionals (if $x then bg #F00)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPRESSION-TYPEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type Expression
 *   Unions für verschiedene Expression-Arten:
 *
 * @subtype literal
 *   { type: 'literal', value: 42 }
 *   { type: 'literal', value: "Hello" }
 *   { type: 'literal', value: true }
 *
 * @subtype variable
 *   { type: 'variable', name: 'count' }
 *   Für $count, $active, etc.
 *
 * @subtype property_access
 *   { type: 'property_access', path: ['user', 'name'] }
 *   Für $user.name, $data.items.length
 *
 * @subtype component_property
 *   { type: 'component_property', componentName: 'Email', propertyName: 'value' }
 *   Für Email.value, Submit.disabled
 *
 * @subtype binary
 *   { type: 'binary', operator: '+', left: expr, right: expr }
 *   Für $count + 1, $price * 2
 *
 * @subtype unary
 *   { type: 'unary', operator: 'not', operand: expr }
 *   Für not $flag
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ACTION-TYPEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @constant ACTION_TYPES
 *   change      → change self to active
 *   open        → open Dialog center fade
 *   close       → close Dialog
 *   toggle      → toggle self
 *   page        → page Dashboard
 *   show/hide   → show Panel, hide Tooltip
 *   assign      → assign $count to $count + 1
 *   alert       → alert "Saved!"
 *   highlight   → highlight self
 *   select      → select self
 *   filter      → filter Results
 *   focus       → focus next
 *   activate    → activate self
 *   deactivate  → deactivate self
 *   toggle-state → toggle-state
 *   validate    → validate Form
 *   reset       → reset Form
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EVENT-HANDLER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type EventHandler
 *   event: string                  onclick, onhover, onchange, etc.
 *   key?: string                   Für onkeydown: escape, enter, arrow-down
 *   debounce?: number              Debounce in ms
 *   delay?: number                 Delay in ms
 *   actions: ActionStatement[]     Auszuführende Actions
 *
 * @example
 *   onclick toggle
 *   onkeydown escape close Dialog
 *   oninput debounce 300 filter Results
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * STATE-DEFINITIONEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type StateDefinition
 *   name: string                   State-Name (hover, active, selected)
 *   category?: string              Kategorie (interaction, selection)
 *   properties: DSLProperties      Override-Properties
 *   children: ASTNode[]            Override-Children
 *
 * @example
 *   state hover
 *     background #444
 *   state selected
 *     background #3B82F6
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CONDITION-EXPRESSIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type ConditionExpr
 *   type: 'var' | 'not' | 'and' | 'or' | 'comparison'
 *
 * @subtype var
 *   { type: 'var', name: 'isActive' }
 *   Für $isActive (boolean check)
 *
 * @subtype not
 *   { type: 'not', operand: ConditionExpr }
 *   Für not $isActive
 *
 * @subtype and/or
 *   { type: 'and', left: ConditionExpr, right: ConditionExpr }
 *   Für $a and $b, $x or $y
 *
 * @subtype comparison
 *   { type: 'comparison', operator: '>', left: expr, value: 0 }
 *   Für $count > 0, $status == "active"
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PARSE-RESULT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type ParseResult
 *   nodes: ASTNode[]               Geparste Top-Level Nodes
 *   errors: string[]               Legacy Error-Strings
 *   diagnostics: ParseError[]      Strukturierte Errors
 *   parseIssues: ParseIssue[]      Error-tolerant Issues
 *   registry: Map<string, ComponentTemplate>
 *   tokens: Map<string, TokenValue>
 *   styles: Map<string, StyleMixin>
 *   commands: SelectionCommand[]
 *   centralizedEvents: CentralizedEventHandler[]
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TOKEN-VALUES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type TokenValue
 *   string | number | TokenSequence
 *
 * @example Simple Values
 *   $primary: #3B82F6     → string "#3B82F6"
 *   $spacing: 16          → number 16
 *
 * @example Token Sequence
 *   $padding: l-r 8       → TokenSequence { tokens: [...] }
 *   $computed: $base * 2  → TokenSequence { tokens: [...] }
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DATA-TYPEN (für Data Tab)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type DataSchema
 *   typeName: string              Task, User, Category
 *   fields: DataField[]           Feld-Definitionen
 *
 * @type DataField
 *   name: string                  Feld-Name (title, done, etc.)
 *   type: DataFieldType           text, number, boolean, oder Relation
 *
 * @type DataInstance
 *   typeName: string              Zugehöriger Typ
 *   _id: string                   Auto-generierte ID
 *   values: DataInstanceValue[]   Feld-Werte
 *
 * @example
 *   Task title:text done:boolean category:Category
 *   - Task "Einkaufen" false Category[0]
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
// State, Variable, Event, Action Types
// ============================================

export interface StateDefinition {
  name: string
  category?: string          // Category for grouped states (e.g., "interaction", "selection")
  properties: DSLProperties
  children: ASTNode[]
  line?: number
}

/**
 * Runtime variable value type.
 * Supports primitives and objects (for Master-Detail pattern with $item).
 */
export type RuntimeValue = string | number | boolean | Record<string, unknown> | null

export interface VariableDeclaration {
  name: string
  value: RuntimeValue
  line?: number
}

// Valid action types for ActionStatement
export const ACTION_TYPES = [
  'change', 'open', 'close', 'toggle', 'page', 'show', 'hide', 'assign', 'set_property', 'alert',
  'call',  // External JavaScript function calls
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
  key?: string  // For onkeydown: 'escape', 'enter', 'arrow-down', etc.
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
  key?: string            // For onkeydown: 'escape', 'enter', 'arrow-down', etc.
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
  contentExpression?: Expression  // For dynamic content like "Query: " + $query
  children: ASTNode[]
  line?: number      // Source line number (0-indexed)
  column?: number    // Source column number
  endLine?: number   // End line number (0-indexed)
  endColumn?: number // End column number
  instanceName?: string  // For named instances like Input Email:
  extends?: string  // Base component for inheritance (DangerButton: Button -> extends: 'Button')
  states?: StateDefinition[]
  variables?: VariableDeclaration[]
  eventHandlers?: EventHandler[]
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
  _customComponentType?: string  // Custom component type for "label as Standardtext" syntax
  // V4: List items (new instances)
  _isListItem?: boolean  // True if created with - prefix (new instance)
  // V5: Explicit definitions (template definitions with colon)
  _isExplicitDefinition?: boolean  // True if defined with colon (e.g., Input Email:)
  // V6: Element animations
  showAnimation?: AnimationDefinition    // show fade slide-up 300
  hideAnimation?: AnimationDefinition    // hide fade 200
  continuousAnimation?: AnimationDefinition  // animate spin 1000
  parseIssues?: ParseIssue[]  // Collected issues during parsing
  activeState?: string  // e.g., Status pending "Waiting" -> activeState: 'pending'
  activeStatesByCategory?: Record<string, string>  // e.g., Button selection selected -> { selection: 'selected' }
  _sourceSpan?: {     // Full source range for blocks
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
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
  extends?: string  // Base component name for inheritance
  states?: StateDefinition[]
  variables?: VariableDeclaration[]
  eventHandlers?: EventHandler[]
  _isLibrary?: boolean
  _libraryType?: string
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
  /** Theme definitions: Map<themeName, Map<tokenName, tokenValue>> */
  themes: Map<string, Map<string, TokenValue>>
  /** Currently active theme name (set by 'use theme X') */
  activeTheme: string | null
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

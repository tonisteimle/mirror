/**
 * Mirror Intermediate Representation Types
 *
 * Framework-unabhängige Zwischendarstellung zwischen AST und Backend-Output.
 */

import type { SizingFlags } from '../schema/layout-defaults'

/**
 * Source position information for bidirectional editing
 */
export interface SourcePosition {
  line: number
  column: number
  endLine: number
  endColumn: number
}

/**
 * Property-level source mapping for precise code modifications
 */
export interface PropertySourceMap {
  name: string
  position: SourcePosition
}

export interface IR {
  nodes: IRNode[]
  tokens: IRToken[]
  animations: IRAnimation[]
}

export interface IREach {
  id: string
  itemVar: string               // Loop variable name (e.g., 'task')
  indexVar?: string             // Optional index variable name (e.g., 'i')
  collection: string            // Collection variable (e.g., 'tasks')
  filter?: string               // Optional filter expression
  orderBy?: string              // Field to sort by (e.g., 'priority')
  orderDesc?: boolean           // Descending order
  template: IRNode[]            // Template nodes to render for each item
}

export interface IRConditional {
  id: string
  condition: string             // JavaScript expression
  then: IRNode[]                // Nodes to render if condition is true
  else?: IRNode[]               // Nodes to render if condition is false
}

/**
 * Layout type hint for drop strategy detection
 * Set when explicit layout properties are used (pos, stacked, hor, ver, grid)
 */
export type LayoutType = 'absolute' | 'flex' | 'grid'

export interface IRNode {
  id: string
  tag: string                    // div, span, button, input, etc.
  primitive?: string             // Original primitive type (icon, frame, text, etc.)
  name?: string                  // Component name (Card, Button)
  instanceName?: string          // Named instance (saveBtn)
  properties: IRProperty[]
  styles: IRStyle[]
  events: IREvent[]
  children: IRNode[]
  each?: IREach                  // If this node is an each loop container
  conditional?: IRConditional    // If this node is a conditional container
  visibleWhen?: string           // State-based visibility: "if (open)" → "open"
  initialState?: string          // Initial state: "closed", "open", etc.
  selection?: string             // Selection binding: "$selected"
  bind?: string                  // Bind active exclusive() child: "bind value" → "value"
  route?: string                 // Navigation target: "Home"
  navContainer?: string          // ID of parent Nav container (for selected sync)
  stateMachine?: IRStateMachine  // State machine configuration (interaction model)
  sourcePosition?: SourcePosition              // Source position for bidirectional editing
  propertySourceMaps?: PropertySourceMap[]     // Per-property source positions
  isDefinition?: boolean                       // True if this is a component definition (not instance)
  layoutType?: LayoutType                      // Explicit layout type (for drop strategy detection)
  valueBinding?: string                        // Token path for two-way binding (e.g., "user.name")
  _sizing?: SizingFlags                        // Internal: tracks how width/height were sized (not CSS marker)
}

export interface IRProperty {
  name: string
  value: string | number | boolean
}

export interface IRStyle {
  property: string              // CSS property (padding, background, etc.)
  value: string                 // CSS value
  state?: string                // hover, focus, active, disabled, or custom
}

export interface IREvent {
  name: string                  // click, keydown, change, etc.
  key?: string                  // For keyboard events (escape, enter, etc.)
  actions: IRAction[]
  modifiers?: IREventModifier[]
}

export interface IRAction {
  type: string                  // toggle, show, hide, select, etc.
  target?: string               // Element name or relative (next, prev)
  args?: string[]
  isFunctionCall?: boolean      // true for new syntax: toggle(), cycle(), customFn()
  isBuiltinStateFunction?: boolean  // true for built-in: toggle, cycle, exclusive
}

export interface IREventModifier {
  type: 'debounce' | 'delay'
  value: number
}

// ============================================================================
// State Machine IR Types (Interaction Model)
// ============================================================================

/**
 * State machine configuration for an element
 * Generated from state blocks with triggers and modifiers
 */
export interface IRStateMachine {
  /** Initial state (first defined or explicitly marked) */
  initial: string
  /** All defined states with their styles */
  states: Record<string, IRStateDefinition>
  /** State transitions triggered by events */
  transitions: IRStateTransition[]
}

/**
 * A single state definition with its visual appearance
 */
export interface IRStateDefinition {
  /** State name (e.g., 'open', 'selected') */
  name: string
  /** CSS styles to apply when in this state */
  styles: IRStyle[]
  /** Children to render when in this state (like Figma Variants) */
  children?: IRNode[]
  /** Whether this state is marked as initial */
  isInitial?: boolean
  /** Animation to play when entering this state */
  enter?: IRStateAnimation
  /** Animation to play when exiting this state */
  exit?: IRStateAnimation
}

/**
 * Animation configuration for state transitions
 */
export interface IRStateAnimation {
  /** Preset animation name (e.g., 'fade-in', 'bounce') or custom animation name */
  preset?: string
  /** Duration in seconds */
  duration?: number
  /** Easing function (e.g., 'ease-out') */
  easing?: string
  /** Delay in seconds */
  delay?: number
}

/**
 * A state transition triggered by an event
 */
export interface IRStateTransition {
  /** Target state to transition to */
  to: string
  /** Event that triggers this transition (empty for 'when' dependencies) */
  trigger: string
  /** Modifier behavior */
  modifier?: 'exclusive' | 'toggle' | 'initial'
  /** Key for keyboard triggers (e.g., 'escape') */
  key?: string
  /** Dependency condition for 'when' clauses */
  when?: IRStateDependency
  /** Animation to play during this transition */
  animation?: IRStateAnimation
}

/**
 * State dependency for 'when' clauses
 * Example: visible when Menu open or Sidebar open:
 */
export interface IRStateDependency {
  /** Target element name (e.g., 'Menu') */
  target: string
  /** State name to check (e.g., 'open') */
  state: string
  /** Condition for chaining ('and' or 'or') */
  condition?: 'and' | 'or'
  /** Next dependency in chain */
  next?: IRStateDependency
}

export interface IRToken {
  name: string
  type?: 'color' | 'size' | 'font' | 'icon'
  /** Simple token value (e.g., $primary.bg: #2563eb) */
  value?: string | number
  /** Nested data object (e.g., tasks: task1: title: "...") */
  data?: IRDataObject
}

/**
 * Nested data object for inline data definitions
 * Represents structured data like:
 *   tasks:
 *     task1:
 *       title: "Design Review"
 *       status: "todo"
 */
export interface IRDataObject {
  [key: string]: IRDataValue
}

/**
 * Value types supported in data objects
 */
export type IRDataValue =
  | string
  | number
  | boolean
  | string[]
  | IRDataObject
  | IRDataReference
  | IRDataReferenceArray

/**
 * Reference to another data entry (e.g., $users.toni)
 */
export interface IRDataReference {
  __ref: true
  collection: string
  entry: string
}

/**
 * Array of references
 */
export interface IRDataReferenceArray {
  __refArray: true
  references: IRDataReference[]
}

/**
 * Type guard to check if a value is an IRDataReference
 */
export function isIRDataReference(value: unknown): value is IRDataReference {
  return typeof value === 'object' && value !== null && '__ref' in value && (value as IRDataReference).__ref === true
}

/**
 * Type guard to check if a value is an IRDataReferenceArray
 */
export function isIRDataReferenceArray(value: unknown): value is IRDataReferenceArray {
  return typeof value === 'object' && value !== null && '__refArray' in value && (value as IRDataReferenceArray).__refArray === true
}

/**
 * Warning types for validation
 */
export type IRWarningType =
  | 'unknown-property'
  | 'unknown-primitive'
  | 'unknown-event'
  | 'unknown-action'
  | 'unknown-state'
  | 'unknown-token'

/**
 * Validation warning
 */
export interface IRWarning {
  type: IRWarningType
  message: string
  property?: string
  position?: SourcePosition
}

/**
 * Animation definition in IR form
 *
 * Ready for code generation with normalized keyframes and timing.
 */
export interface IRAnimation {
  name: string                  // Animation name (e.g., 'FadeUp')
  easing: string                // Default easing (e.g., 'ease-out')
  duration?: number             // Duration in ms (optional, can be set at runtime)
  roles?: string[]              // Named roles for choreography
  keyframes: IRAnimationKeyframe[]
}

export interface IRAnimationKeyframe {
  time: number                  // Normalized time (0-1) or absolute ms
  properties: IRAnimationProperty[]
}

export interface IRAnimationProperty {
  target?: string               // Role name for choreography ('item1', 'all')
  property: string              // CSS property name (e.g., 'opacity', 'transform')
  value: string                 // CSS value
  easing?: string               // Per-property easing override
}

// ============================================================================
// Zag Component IR Types
// ============================================================================

/**
 * IR node for Zag-based behavior components
 *
 * Extends IRNode with Zag-specific data for runtime machine instantiation.
 */
export interface IRZagNode extends IRNode {
  /** Indicates this is a Zag component */
  isZagComponent: true
  /** Zag machine type (e.g., 'select', 'accordion') */
  zagType: string
  /** Slot definitions with their rendering data */
  slots: Record<string, IRSlot>
  /** Items for list-based components */
  items: IRItem[]
  /** Machine configuration derived from properties */
  machineConfig: Record<string, unknown>
  /** True if this is a definition (not rendered), false if instance */
  isDefinition?: boolean
}

/**
 * IR representation of a Zag slot
 *
 * Contains all data needed to render a slot element and bind Zag props.
 */
export interface IRSlot {
  /** Slot name (e.g., 'Trigger', 'Content') */
  name: string
  /** Zag API method to get props (e.g., 'getTriggerProps', 'getContentProps') */
  apiMethod: string
  /** HTML element to render (e.g., 'button', 'div') */
  element: string
  /** CSS styles for the slot */
  styles: IRStyle[]
  /** Children within the slot */
  children: IRNode[]
  /** Whether this slot should be portaled (rendered outside parent) */
  portal?: boolean
  /** Source position for bidirectional editing */
  sourcePosition?: SourcePosition
}

/**
 * IR representation of an item in a Zag list component
 *
 * Used for components like Select, Combobox, Accordion that have item lists.
 */
export interface IRItem {
  /** Unique value for the item (for form submission and selection) */
  value: string
  /** Display label for the item */
  label: string
  /** Whether the value was explicitly set (not derived from label) */
  hasExplicitValue?: boolean
  /** Whether the item is disabled */
  disabled?: boolean
  /** Layout properties for the item (ver, hor, gap, pad, spread, etc.) */
  properties?: any[]
  /** Custom children for complex item rendering */
  children?: IRNode[]
  /** Load content from external file (filename without .mirror extension) - legacy */
  loadFromFile?: string
  /** Target view/element to show: "show X" or "show X from Y" */
  shows?: string
  /** Source file to load the view from: "show X from Y" */
  showsFrom?: string
  /** Source position for bidirectional editing */
  sourcePosition?: SourcePosition
  /** Icon name for items that support icons (Listbox, Select indicators) */
  icon?: string
  /** Whether this item is a group header */
  isGroup?: boolean
  /** Nested items for group items */
  items?: IRItem[]

  // Form Field specific properties
  /** Field name for form binding */
  name?: string
  /** Placeholder text for input fields */
  placeholder?: string
  /** Whether to use multiline input (textarea) */
  multiline?: boolean
  /** Display mode: input, select, checkbox, switch, slider */
  display?: string
  /** Whether the field is required */
  required?: boolean
  /** Whether the field is read-only */
  readOnly?: boolean
  /** Filter function for relation selects */
  filter?: string
  /** Show clear button */
  allowClear?: boolean
  /** Max length or value */
  max?: number
}

/**
 * Type guard to check if an IRNode is a Zag component
 */
export function isIRZagNode(node: IRNode): node is IRZagNode {
  return (node as IRZagNode).isZagComponent === true
}

// ============================================================================
// Table Component IR Types
// ============================================================================

/**
 * Inferred data type for table column auto-rendering
 */
export type InferredDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'relation'
  | 'array'
  | 'unknown'

/**
 * IR representation of a table column
 *
 * Contains all data needed to render a column header and cells.
 */
export interface IRTableColumn {
  /** Field name from data schema */
  field: string
  /** Display label (humanized field name or override) */
  label: string
  /** Column width in pixels */
  width?: number
  /** Value prefix (e.g., "$" for currency) */
  prefix?: string
  /** Value suffix (e.g., "h" for hours) */
  suffix?: string
  /** Alignment (derived from type or override) */
  align?: 'left' | 'right' | 'center'
  /** Inferred data type for default rendering */
  inferredType: InferredDataType
  /** Enable sorting for this column */
  sortable?: boolean
  /** Initial sort direction is descending */
  sortDesc?: boolean
  /** Enable filtering for this column */
  filterable?: boolean
  /** Hide this column */
  hidden?: boolean
  /** Aggregation function for footer */
  aggregation?: 'sum' | 'avg' | 'count'
  /** Custom cell template (when Column has Cell: slot) */
  customCell?: IRNode[]
  /** Target collection for relation types */
  relationTo?: string
}

/**
 * IR node for Table component (data-driven or manual)
 *
 * Extends IRNode with table-specific data for code generation.
 */
export interface IRTable extends IRNode {
  /** Indicates this is a Table component */
  isTableComponent: true
  /** Data source reference (e.g., "$tasks" → "tasks") - optional for manual tables */
  dataSource?: string
  /** Filter expression (JavaScript) from where clause */
  filter?: string
  /** Field to sort by */
  orderBy?: string
  /** Sort in descending order */
  orderDesc?: boolean
  /** Field to group by */
  groupBy?: string
  /** Column definitions (inferred + overrides) */
  columns: IRTableColumn[]
  /** Selection mode: single click, multi with checkbox */
  selectionMode?: 'single' | 'multi'
  /** Number of rows per page (pagination) */
  pageSize?: number
  /** Enable infinite scroll */
  infinite?: boolean
  /** Enable sticky header */
  stickyHeader?: boolean
  /** Custom header slot */
  headerSlot?: IRNode[]
  /** Static header row (from Header: Row "A", "B", "C" syntax) */
  headerStaticRow?: IRTableStaticRow
  /** Custom row slot */
  rowSlot?: IRNode[]
  /** Row slot styles (from Row: properties) */
  rowSlotStyles?: IRStyle[]
  /** Custom footer slot */
  footerSlot?: IRNode[]
  /** Custom group header slot */
  groupSlot?: IRNode[]
  /** Group slot styles (from Group: properties) */
  groupSlotStyles?: IRStyle[]
  /** Static rows for manual tables (when no dataSource) */
  staticRows?: IRTableStaticRow[]
  /** Custom sort icon slot (applies to all sortable columns) */
  sortIconSlot?: IRNode[]
  /** Custom ascending sort icon slot */
  sortAscSlot?: IRNode[]
  /** Custom descending sort icon slot */
  sortDescSlot?: IRNode[]
  /** Custom paginator slot */
  paginatorSlot?: IRNode[]
  /** Paginator slot styles */
  paginatorSlotStyles?: IRStyle[]
  /** Custom previous page button slot */
  paginatorPrevSlot?: IRNode[]
  /** Previous button slot styles */
  paginatorPrevSlotStyles?: IRStyle[]
  /** Custom next page button slot */
  paginatorNextSlot?: IRNode[]
  /** Next button slot styles */
  paginatorNextSlotStyles?: IRStyle[]
  /** Custom page info slot */
  paginatorPageInfoSlot?: IRNode[]
  /** Page info slot styles */
  paginatorPageInfoSlotStyles?: IRStyle[]
}

/**
 * Static row for manual tables
 */
export interface IRTableStaticRow {
  /** Cell contents */
  cells: IRTableStaticCell[]
  /** Row styles */
  styles?: IRStyle[]
}

/**
 * Static cell for manual tables
 */
export interface IRTableStaticCell {
  /** Simple text content */
  text?: string
  /** Complex content (child nodes) */
  children?: IRNode[]
  /** Cell styles */
  styles?: IRStyle[]
}

/**
 * Type guard to check if an IRNode is a Table component
 */
export function isIRTable(node: IRNode): node is IRTable {
  return (node as IRTable).isTableComponent === true
}

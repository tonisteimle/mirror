/**
 * Mirror AST Types
 */

export type NodeType =
  | 'Program'
  | 'Token'
  | 'Component'
  | 'Instance'
  | 'Property'
  | 'State'
  | 'Event'
  | 'Action'
  | 'Each'
  | 'Conditional'
  | 'Slot'
  | 'Text'
  | 'JavaScript'
  | 'Animation'
  | 'ZagComponent'
  | 'Table'
  | 'TableColumn'
  | 'TableStaticRow'
  | 'TableStaticCell'

export interface BaseNode {
  type: NodeType
  line: number
  column: number
  nodeId?: string  // Unique identifier for studio selection
}

export interface ParseError {
  message: string
  line: number
  column: number
  hint?: string
}

export interface Program extends BaseNode {
  type: 'Program'
  imports: string[]  // Imported files via 'use filename'
  tokens: TokenDefinition[]
  components: ComponentDefinition[]
  animations: AnimationDefinition[]  // Animation definitions
  instances: (Instance | Slot | TableNode | Each)[]
  javascript?: JavaScriptBlock  // JavaScript code at end of file
  schema?: SchemaDefinition  // Schema definition for data collections
  errors: ParseError[]
}

// ============================================================================
// Schema Types (for CRUD / Data Collections)
// ============================================================================

/**
 * Schema definition for a data collection
 *
 * Syntax:
 * $schema:
 *   title: string, required
 *   assignee: $users
 *   watchers: $users[], max 5
 */
export interface SchemaDefinition {
  fields: SchemaField[]
  line: number
  column: number
}

/**
 * Field definition within a schema
 */
export interface SchemaField {
  name: string
  type: SchemaType
  constraints: SchemaConstraint[]
  line: number
}

/**
 * Type of a schema field
 */
export type SchemaType =
  | { kind: 'primitive'; type: 'string' | 'number' | 'boolean' }
  | { kind: 'relation'; target: string; isArray: boolean }

/**
 * Constraint on a schema field
 */
export type SchemaConstraint =
  | { kind: 'required' }
  | { kind: 'max'; value: number }
  | { kind: 'onDelete'; action: 'cascade' | 'nullify' | 'restrict' }

export interface JavaScriptBlock extends BaseNode {
  type: 'JavaScript'
  code: string  // Raw JavaScript code
}

export interface TokenDefinition extends BaseNode {
  type: 'Token'
  name: string
  tokenType?: 'color' | 'size' | 'font' | 'icon'  // Optional, inferred from value
  value?: string | number  // Optional when attributes are present (data object)
  section?: string  // Section header this token belongs to (--- Title ---)
  // Data object fields (when value is not present)
  attributes?: DataAttribute[]  // key-value pairs
  blocks?: DataBlock[]  // @blockname markdown content
  // Property Set fields (mixin/stylesheet)
  // e.g., standardtext: fs 14, col #888, weight 500
  properties?: Property[]  // reusable property combinations
}

/**
 * Data attribute within a data object
 * e.g., title: "Mein Artikel"
 *
 * Can be nested:
 *   steps:
 *     planning:
 *       title: "Sprint Planning"
 */
/**
 * A reference to another data entry (e.g., "$users.toni")
 */
export interface DataReference {
  kind: 'reference'
  collection: string
  entry: string
}

/**
 * An array of references (e.g., "$users.toni, $users.anna")
 */
export interface DataReferenceArray {
  kind: 'referenceArray'
  references: DataReference[]
}

export interface DataAttribute {
  key: string
  /** Simple value - undefined if this is a nested object */
  value?: string | number | boolean | string[] | DataReference | DataReferenceArray
  /** Nested attributes - present if this is a nested object */
  children?: DataAttribute[]
  line: number
}

/**
 * Markdown block within a data object
 * e.g., @intro followed by indented markdown content
 */
export interface DataBlock {
  name: string
  content: string
  line: number
}

export interface ComponentDefinition extends BaseNode {
  type: 'Component'
  name: string
  primitive: string | null    // 'frame' | 'text' | 'button' | etc. (for 'as')
  extends: string | null      // parent component name (for 'extends')
  properties: Property[]
  states: State[]
  events: Event[]
  children: (Instance | Slot)[]
  initialState?: string       // initial state: "closed" → initialState: "closed"
  selection?: string          // selection binding: "selection $selected" → selection: "$selected"
  visibleWhen?: string        // state-based visibility: "if (open)" → visibleWhen: "open"
  route?: string              // navigation target: "route Home" → route: "Home"
}

export interface Instance extends BaseNode {
  type: 'Instance'
  component: string
  name: string | null         // named instance
  properties: Property[]
  states?: State[]            // inline states: "hover: bg light"
  events?: Event[]            // inline events: "onkeydown enter: submit"
  children: (Instance | Slot | Text | ZagNode)[]
  childOverrides?: ChildOverride[]  // inline child overrides: NavItem Icon "home"; Label "Home"
  visibleWhen?: string        // state-based visibility: "if open" → visibleWhen: "open"
  initialState?: string       // initial state: "closed" → initialState: "closed"
  selection?: string          // selection binding: "selection $selected" → selection: "$selected"
  route?: string              // navigation target: "route Home" → route: "Home"
  isDefinition?: boolean      // true if ends with : (definition, not rendered)
  isCompound?: boolean        // true if this is a Compound primitive (Shell, etc.)
  compoundType?: string       // Compound primitive type (e.g., 'Shell')
}

export interface Property extends BaseNode {
  type: 'Property'
  name: string
  values: (string | number | boolean | TokenReference | LoopVarReference | Conditional | ComputedExpression)[]
}

export interface TokenReference {
  kind: 'token'
  name: string
}

/**
 * A loop variable reference (from each loops)
 * e.g., user.name, item, index
 */
export interface LoopVarReference {
  kind: 'loopVar'
  name: string
}

/**
 * A computed expression for string concatenation or arithmetic
 * e.g., "Hello " + $name, $count * $price, index + 1
 */
export interface ComputedExpression {
  kind: 'expression'
  parts: (string | number | TokenReference | LoopVarReference)[]  // Operands
  operators: string[]  // Operators between operands (+, -, *, /)
}

export interface Conditional {
  kind: 'conditional'
  condition: Expression
  then: string | number
  else: string | number
}

// Expression is now a JavaScript expression string
export type Expression = string

export interface State extends BaseNode {
  type: 'State'
  name: string
  properties: Property[]
  childOverrides: ChildOverride[]
  children?: (Instance | Slot)[]      // State can have completely different children (like Figma Variants)
  // Interaction model fields
  modifier?: 'exclusive' | 'toggle' | 'initial'
  trigger?: string                    // 'onclick', 'onkeydown escape', etc.
  when?: StateDependency              // dependency on another element's state
  targetState?: string                // for 'when' dependencies: the state to transition to
  // Animation fields
  animation?: StateAnimation          // animation on enter (after trigger/colon)
  enter?: StateAnimation              // explicit enter animation
  exit?: StateAnimation               // explicit exit animation
}

/**
 * Animation configuration for state transitions
 * Examples:
 *   bounce                    → { preset: 'bounce' }
 *   0.2s                      → { duration: 0.2 }
 *   0.3s ease-out             → { duration: 0.3, easing: 'ease-out' }
 *   slide-in 0.2s             → { preset: 'slide-in', duration: 0.2 }
 */
export interface StateAnimation {
  preset?: string                     // 'fade-in', 'bounce', custom name, etc.
  duration?: number                   // duration in seconds
  easing?: string                     // 'ease-out', 'ease-in-out', etc.
  delay?: number                      // delay in seconds
}

/**
 * Dependency on another element's state
 * Example: visible when Menu open
 */
export interface StateDependency {
  target: string                      // element name (e.g., 'Menu')
  state: string                       // state name (e.g., 'open')
  condition?: 'and' | 'or'            // for chaining
  next?: StateDependency              // next dependency in chain
}

export interface ChildOverride {
  childName: string
  properties: Property[]
}

export interface Event extends BaseNode {
  type: 'Event'
  name: string                // 'onclick', 'onhover', etc.
  key?: string                // for keyboard events
  modifiers?: EventModifier[]
  actions: Action[]
}

export interface EventModifier {
  type: 'debounce' | 'delay'
  value: number
}

export interface Action extends BaseNode {
  type: 'Action'
  name: string                // 'toggle', 'select', 'show', 'hide', 'call', 'animate', etc.
  target?: string             // target element or 'next', 'prev', etc.
  args?: string[]
  isFunctionCall?: boolean    // true for new syntax: toggle(), cycle(), customFn()
}

/**
 * Animation definition
 *
 * Syntax:
 * FadeUp as animation: ease-out
 *   0.00 opacity 0, y-offset 20
 *   0.30 opacity 1, y-offset 0
 *   1.00 // end
 *
 * Choreography with roles:
 * StaggeredFade as animation: ease-out
 *   roles: item1, item2, item3
 *   0.00 item1 opacity 0
 *   0.10 item2 opacity 0
 *   0.20 item3 opacity 0
 *   1.00 all opacity 1
 */
export interface AnimationDefinition extends BaseNode {
  type: 'Animation'
  name: string                  // Animation name (e.g., 'FadeUp')
  easing?: string               // Default easing function (e.g., 'ease-out', 'ease-in-out')
  duration?: number             // Duration in ms (calculated from last keyframe time)
  roles?: string[]              // Named roles for choreography
  keyframes: AnimationKeyframe[]
}

export interface AnimationKeyframe {
  time: number                  // Time in normalized form (0.00 - 1.00)
  properties: AnimationKeyframeProperty[]
}

export interface AnimationKeyframeProperty {
  target?: string               // Role name for choreography (e.g., 'item1', 'all')
  name: string                  // Property name (e.g., 'opacity', 'y-offset')
  value: string | number        // Property value
  easing?: string               // Per-property easing override
}

export interface Each extends BaseNode {
  type: 'Each'
  item: string
  index?: string                // Optional index variable: each item, i in collection
  collection: string
  filter?: Expression
  orderBy?: string              // Field to sort by: each task in $tasks by priority
  orderDesc?: boolean           // Descending order: each task in $tasks by priority desc
  children: (Instance | Slot)[]
}

export interface Slot extends BaseNode {
  type: 'Slot'
  name: string
  /** Optional properties for the slot (w, h, etc.) */
  properties?: Property[]
}

export interface Text extends BaseNode {
  type: 'Text'
  content: string
  formatting?: TextFormat[]
}

export interface TextFormat {
  start: number
  end: number
  style: 'bold' | 'italic' | 'underline' | string  // string for token names
}

// ============================================================================
// Zag Component Types
// ============================================================================

/**
 * Zag component node - behavior-driven components using Zag.js
 *
 * Example:
 *   Select placeholder "Choose..."
 *     Trigger:
 *       pad 12, bg #1e1e2e
 *     Item "Option A"
 *     Item "Option B"
 */
export interface ZagNode extends BaseNode {
  type: 'ZagComponent'
  /** Zag machine type (e.g., 'select', 'accordion') */
  machine: string
  /** Component name (e.g., 'Select') */
  name: string
  /** Component-level properties (e.g., placeholder, multiple) */
  properties: Property[]
  /** Slot definitions (e.g., Trigger:, Content:) */
  slots: Record<string, ZagSlotDef>
  /** Items for list-based components (e.g., Item "Option A") */
  items: ZagItem[]
  /** Events (e.g., onchange) */
  events: Event[]
  /** True if this is a definition (ends with :), not an instance */
  isDefinition?: boolean
  /** Initial state (e.g., closed, open, expanded) */
  initialState?: string
}

/**
 * Slot definition within a Zag component
 *
 * Example:
 *   Trigger:
 *     pad 12, bg #1e1e2e
 *     hover:
 *       bg #2a2a3e
 */
export interface ZagSlotDef {
  /** Slot name (e.g., 'Trigger', 'Content') */
  name: string
  /** Slot properties */
  properties: Property[]
  /** State blocks within the slot */
  states: State[]
  /** Children within the slot */
  children: (Instance | Slot | Text)[]
  /** Source position for bidirectional editing */
  sourcePosition: SourcePosition
}

/**
 * Item in a Zag component (for list-based components)
 *
 * Example:
 *   Item "Option A"
 *   Item value "opt-a" label "Option A" disabled
 */
export interface ZagItem {
  /** Item value (for form submission) */
  value?: string
  /** Item label (display text) */
  label?: string
  /** Whether the item is disabled */
  disabled?: boolean
  /** Icon name for this item (Lucide icon) */
  icon?: string
  /** Target element selector (for Tour steps) */
  target?: string
  /** Layout properties for the item (ver, hor, gap, pad, spread) */
  properties?: Property[]
  /** Custom children for complex items (content-items pattern) */
  children?: (Instance | Text)[]
  /** Whether this item is a group container */
  isGroup?: boolean
  /** Child items (for groups) */
  items?: ZagItem[]
  /** Source position for bidirectional editing */
  sourcePosition: SourcePosition
  /** Badge text (SideNav) */
  badge?: string
  /** Show drilldown arrow (SideNav) */
  arrow?: boolean
  /** Target view to show when selected (SideNav) */
  shows?: string
  /** Whether this group is collapsible (SideNav groups) */
  collapsible?: boolean
  /** Whether this group is open by default (SideNav groups) */
  defaultOpen?: boolean

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
 * Source position for bidirectional editing
 */
export interface SourcePosition {
  line: number
  column: number
  endLine: number
  endColumn: number
}

// ============================================================================
// Table Component Types
// ============================================================================

/**
 * Table component node - data-driven table with auto-generated columns
 *
 * Syntax:
 *   Table $collection [where ...] [by ... [desc]] [grouped by ...]
 *
 * Example:
 *   Table $tasks where done == false by priority desc
 *     Column titel, w 250
 *     Column aufwand, suffix "h"
 *
 * Manual Table (without data source):
 *   Table
 *     Row "Name", "Age"
 *     Row "Max", "25"
 */
export interface TableNode extends BaseNode {
  type: 'Table'
  /** Data source reference (e.g., "$tasks") - optional for manual tables */
  dataSource?: string
  /** Filter expression (where clause) */
  filter?: string
  /** Field to sort by */
  orderBy?: string
  /** Sort in descending order */
  orderDesc?: boolean
  /** Field to group by */
  groupBy?: string
  /** Enable sticky header */
  stickyHeader?: boolean
  /** Table-level properties (e.g., select, pageSize) */
  properties: Property[]
  /** Column definitions/overrides */
  columns: TableColumnNode[]
  /** Header slot customization */
  headerSlot?: TableSlotNode
  /** Row slot customization */
  rowSlot?: TableSlotNode
  /** Footer slot customization */
  footerSlot?: TableSlotNode
  /** Group header slot customization */
  groupSlot?: TableSlotNode
  /** Static rows for manual tables (when no dataSource) */
  staticRows?: TableStaticRowNode[]
  /** Custom sort icon slot (for all sortable columns) */
  sortIconSlot?: TableSlotNode
  /** Custom ascending sort icon slot */
  sortAscSlot?: TableSlotNode
  /** Custom descending sort icon slot */
  sortDescSlot?: TableSlotNode
  /** Custom paginator slot */
  paginatorSlot?: TableSlotNode
  /** Custom previous page button slot */
  paginatorPrevSlot?: TableSlotNode
  /** Custom next page button slot */
  paginatorNextSlot?: TableSlotNode
  /** Custom page info slot */
  paginatorPageInfoSlot?: TableSlotNode
}

/**
 * Static row for manual tables
 *
 * Syntax:
 *   Row "Cell1", "Cell2", "Cell3"
 *   Row
 *     Cell "Content"
 *     Cell
 *       Frame ...
 */
export interface TableStaticRowNode extends BaseNode {
  type: 'TableStaticRow'
  /** Cell contents - can be strings or complex content */
  cells: TableStaticCellNode[]
  /** Row-level properties (e.g., bg, pad) */
  properties: Property[]
}

/**
 * Static cell for manual tables
 */
export interface TableStaticCellNode extends BaseNode {
  type: 'TableStaticCell'
  /** Simple text content */
  text?: string
  /** Complex content (child elements) */
  children?: (Instance | Slot)[]
  /** Cell-level properties */
  properties: Property[]
}

/**
 * Column definition within a Table
 *
 * Syntax:
 *   Column fieldName [, options...]
 *   Column "Custom Label"
 *     Cell:
 *       ...custom cell template
 *
 * Example:
 *   Column titel, w 250, sortable
 *   Column aufwand, suffix "h", sum
 */
export interface TableColumnNode extends BaseNode {
  type: 'TableColumn'
  /** Field name from data schema (or custom column id) */
  field: string
  /** Custom label override */
  label?: string
  /** Column width in pixels */
  width?: number
  /** Value prefix (e.g., "$" for currency) */
  prefix?: string
  /** Value suffix (e.g., "h" for hours) */
  suffix?: string
  /** Alignment override */
  align?: 'left' | 'right' | 'center'
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
  /** Custom cell template */
  customCell?: (Instance | Slot | Text)[]
  /** Source position for bidirectional editing */
  sourcePosition?: SourcePosition
}

/**
 * Slot customization within a Table (Header:, Row:, Footer:, Group:)
 */
export interface TableSlotNode {
  /** Slot name */
  name: string
  /** Slot properties */
  properties: Property[]
  /** Slot children */
  children: (Instance | Slot | Text)[]
  /** Source position */
  sourcePosition: SourcePosition
}

export type Node =
  | Program
  | TokenDefinition
  | ComponentDefinition
  | AnimationDefinition
  | Instance
  | Property
  | State
  | Event
  | Action
  | Each
  | Slot
  | Text
  | JavaScriptBlock
  | ZagNode
  | TableNode
  | TableColumnNode

export type AST = Program

// =============================================================================
// Type Guards
// =============================================================================

/** Check if node is a Component definition */
export function isComponent(node: unknown): node is ComponentDefinition {
  return typeof node === 'object' && node !== null && (node as BaseNode).type === 'Component'
}

/** Check if node is an Instance */
export function isInstance(node: unknown): node is Instance {
  return typeof node === 'object' && node !== null && (node as BaseNode).type === 'Instance'
}

/** Check if node is a ZagComponent */
export function isZagComponent(node: unknown): node is ZagNode {
  return typeof node === 'object' && node !== null && (node as BaseNode).type === 'ZagComponent'
}

/** Check if node is a Slot */
export function isSlot(node: unknown): node is Slot {
  return typeof node === 'object' && node !== null && (node as BaseNode).type === 'Slot'
}

/** Check if node is a Text node */
export function isText(node: unknown): node is Text {
  return typeof node === 'object' && node !== null && (node as BaseNode).type === 'Text'
}

/** Check if node is an Each loop */
export function isEach(node: unknown): node is Each {
  return typeof node === 'object' && node !== null && (node as BaseNode).type === 'Each'
}

/** Check if node is a Conditional */
export function isConditional(node: unknown): node is Conditional {
  return typeof node === 'object' && node !== null && (node as { kind?: string }).kind === 'conditional'
}

/** Check if node has content (Text-like) */
export function hasContent(node: unknown): node is { content: string } {
  return typeof node === 'object' && node !== null && 'content' in node
}

/** Check if node is a Table */
export function isTable(node: unknown): node is TableNode {
  return typeof node === 'object' && node !== null && (node as BaseNode).type === 'Table'
}

/** Check if node is a TableColumn */
export function isTableColumn(node: unknown): node is TableColumnNode {
  return typeof node === 'object' && node !== null && (node as BaseNode).type === 'TableColumn'
}

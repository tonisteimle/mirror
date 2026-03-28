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
  tokens: TokenDefinition[]
  components: ComponentDefinition[]
  animations: AnimationDefinition[]  // Animation definitions
  instances: (Instance | Slot)[]
  javascript?: JavaScriptBlock  // JavaScript code at end of file
  errors: ParseError[]
}

export interface JavaScriptBlock extends BaseNode {
  type: 'JavaScript'
  code: string  // Raw JavaScript code
}

export interface TokenDefinition extends BaseNode {
  type: 'Token'
  name: string
  tokenType?: 'color' | 'size' | 'font' | 'icon'  // Optional, inferred from value
  value: string | number
  section?: string  // Section header this token belongs to (--- Title ---)
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
  values: (string | number | boolean | TokenReference | Conditional)[]
}

export interface TokenReference {
  kind: 'token'
  name: string
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
  // Interaction model fields
  modifier?: 'exclusive' | 'toggle' | 'initial'
  trigger?: string                    // 'onclick', 'onkeydown escape', etc.
  when?: StateDependency              // dependency on another element's state
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
  collection: string
  filter?: Expression
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

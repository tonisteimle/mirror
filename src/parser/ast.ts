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

export interface BaseNode {
  type: NodeType
  line: number
  column: number
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
  instances: Instance[]
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
  children: (Instance | Text)[]
  childOverrides?: ChildOverride[]  // inline child overrides: NavItem Icon "home"; Label "Home"
  visibleWhen?: string        // state-based visibility: "if open" → visibleWhen: "open"
  initialState?: string       // initial state: "closed" → initialState: "closed"
  selection?: string          // selection binding: "selection $selected" → selection: "$selected"
  route?: string              // navigation target: "route Home" → route: "Home"
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
  name: string                // 'toggle', 'select', 'show', 'hide', 'call', etc.
  target?: string             // target element or 'next', 'prev', etc.
  args?: string[]
}

export interface Each extends BaseNode {
  type: 'Each'
  item: string
  collection: string
  filter?: Expression
  children: Instance[]
}

export interface Slot extends BaseNode {
  type: 'Slot'
  name: string
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

export type Node =
  | Program
  | TokenDefinition
  | ComponentDefinition
  | Instance
  | Property
  | State
  | Event
  | Action
  | Each
  | Slot
  | Text
  | JavaScriptBlock

export type AST = Program

/**
 * Mirror Intermediate Representation Types
 *
 * Framework-unabhängige Zwischendarstellung zwischen AST und Backend-Output.
 */

export interface IR {
  nodes: IRNode[]
  tokens: IRToken[]
}

export interface IREach {
  id: string
  itemVar: string               // Loop variable name (e.g., 'task')
  collection: string            // Collection variable (e.g., 'tasks')
  filter?: string               // Optional filter expression
  template: IRNode[]            // Template nodes to render for each item
}

export interface IRConditional {
  id: string
  condition: string             // JavaScript expression
  then: IRNode[]                // Nodes to render if condition is true
  else?: IRNode[]               // Nodes to render if condition is false
}

export interface IRNode {
  id: string
  tag: string                    // div, span, button, input, etc.
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
}

export interface IREventModifier {
  type: 'debounce' | 'delay'
  value: number
}

export interface IRToken {
  name: string
  type?: 'color' | 'size' | 'font' | 'icon'
  value: string | number
}

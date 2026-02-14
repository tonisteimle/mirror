/**
 * Interactivity Analysis
 *
 * Analyzes AST to determine what React hooks and state are needed.
 */

import type { ASTNode, ParseResult, ComponentTemplate, EventHandler, ActionStatement } from '../../parser/types'

/**
 * Information about a visibility-controlled element
 */
export interface VisibilityState {
  /** Name of the element being controlled */
  elementName: string
  /** Initial visibility (false if has `hidden` property) */
  initialVisible: boolean
  /** State variable name in camelCase */
  stateName: string
  /** Setter function name */
  setterName: string
}

/**
 * Information about a component state (on/off, etc.)
 */
export interface ComponentState {
  /** Component name */
  componentName: string
  /** Available states */
  states: string[]
  /** Initial state (first defined) */
  initialState: string
  /** State variable name */
  stateName: string
  /** Setter function name */
  setterName: string
}

/**
 * Information about a variable binding
 */
export interface VariableBinding {
  /** Variable name (without $) */
  name: string
  /** Initial value */
  initialValue: string | number | boolean
  /** State variable name */
  stateName: string
  /** Setter function name */
  setterName: string
  /** Components that read this variable */
  readers: string[]
  /** Components that write this variable */
  writers: string[]
}

/**
 * Information about a defined component
 */
export interface ComponentDefinition {
  /** Component name */
  name: string
  /** Template from registry */
  template: ComponentTemplate
  /** Whether it has states */
  hasStates: boolean
  /** Whether it has event handlers */
  hasEvents: boolean
  /** State names if any */
  stateNames: string[]
}

/**
 * Result of analyzing interactivity
 */
export interface InteractivityAnalysis {
  /** Whether useState is needed */
  needsUseState: boolean
  /** Visibility states (show/hide/toggle) */
  visibilityStates: VisibilityState[]
  /** Component states (on/off) */
  componentStates: ComponentState[]
  /** Variable bindings */
  variables: VariableBinding[]
  /** Component definitions */
  definitions: ComponentDefinition[]
  /** Set of component names that are defined (should render as <Component>) */
  definedComponents: Set<string>
}

/**
 * Convert a name to camelCase state variable
 */
function toStateName(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1)
}

/**
 * Convert a name to setter function name
 */
function toSetterName(name: string): string {
  return `set${name.charAt(0).toUpperCase()}${name.slice(1)}`
}

/**
 * Find all show/hide/toggle actions targeting elements
 */
function findVisibilityActions(nodes: ASTNode[]): Map<string, { hidden: boolean; actions: string[] }> {
  const targets = new Map<string, { hidden: boolean; actions: string[] }>()

  function processNode(node: ASTNode) {
    // Check if this node is hidden
    if (node.properties.hidden) {
      const name = node.instanceName || node.name
      if (!targets.has(name)) {
        targets.set(name, { hidden: true, actions: [] })
      } else {
        targets.get(name)!.hidden = true
      }
    }

    // Check event handlers for show/hide/toggle actions
    if (node.eventHandlers) {
      for (const handler of node.eventHandlers) {
        for (const action of handler.actions) {
          if ('type' in action) {
            const actionStmt = action as ActionStatement
            if (['show', 'hide', 'toggle'].includes(actionStmt.type) && actionStmt.target) {
              const targetName = actionStmt.target
              if (!targets.has(targetName)) {
                targets.set(targetName, { hidden: false, actions: [] })
              }
              targets.get(targetName)!.actions.push(actionStmt.type)
            }
          }
        }
      }
    }

    // Recurse into children
    for (const child of node.children) {
      processNode(child)
    }
  }

  for (const node of nodes) {
    processNode(node)
  }

  return targets
}

/**
 * Find all component states from definitions
 */
function findComponentStates(registry: Map<string, ComponentTemplate>): ComponentState[] {
  const states: ComponentState[] = []

  for (const [name, template] of registry) {
    if (template.states && template.states.length > 0) {
      const stateNames = template.states.map((s) => s.name)
      states.push({
        componentName: name,
        states: stateNames,
        initialState: stateNames[0],
        stateName: `${toStateName(name)}State`,
        setterName: `set${name}State`,
      })
    }
  }

  return states
}

/**
 * Find all variable bindings from tokens
 */
function findVariables(tokens: Map<string, unknown>, nodes: ASTNode[]): VariableBinding[] {
  const variables: VariableBinding[] = []

  for (const [name, value] of tokens) {
    if (name.startsWith('$')) {
      continue // Skip internal tokens
    }

    const cleanName = name.replace(/^\$/, '')
    variables.push({
      name: cleanName,
      initialValue: value as string | number | boolean,
      stateName: cleanName,
      setterName: toSetterName(cleanName),
      readers: [],
      writers: [],
    })
  }

  // Find readers and writers in nodes
  function processNode(node: ASTNode) {
    // Check event handlers for assign actions
    if (node.eventHandlers) {
      for (const handler of node.eventHandlers) {
        for (const action of handler.actions) {
          if ('type' in action && (action as ActionStatement).type === 'assign') {
            const varName = ((action as ActionStatement).target || '').replace(/^\$/, '')
            const variable = variables.find((v) => v.name === varName)
            if (variable) {
              variable.writers.push(node.instanceName || node.name)
            }
          }
        }
      }
    }

    for (const child of node.children) {
      processNode(child)
    }
  }

  for (const node of nodes) {
    processNode(node)
  }

  return variables
}

/**
 * Find component definitions from registry
 */
function findDefinitions(registry: Map<string, ComponentTemplate>): ComponentDefinition[] {
  const definitions: ComponentDefinition[] = []

  for (const [name, template] of registry) {
    // Skip built-in components
    if (['Box', 'Text', 'Button', 'Input', 'Image', 'Link', 'Textarea'].includes(name)) {
      continue
    }

    definitions.push({
      name,
      template,
      hasStates: !!(template.states && template.states.length > 0),
      hasEvents: !!(template.eventHandlers && template.eventHandlers.length > 0),
      stateNames: template.states?.map((s) => s.name) || [],
    })
  }

  return definitions
}

/**
 * Analyze AST for interactivity requirements
 */
export function analyzeInteractivity(parseResult: ParseResult): InteractivityAnalysis {
  const visibilityTargets = findVisibilityActions(parseResult.nodes)
  const visibilityStates: VisibilityState[] = []

  for (const [name, info] of visibilityTargets) {
    if (info.actions.length > 0 || info.hidden) {
      visibilityStates.push({
        elementName: name,
        initialVisible: !info.hidden,
        stateName: `${toStateName(name)}Visible`,
        setterName: `set${name}Visible`,
      })
    }
  }

  const componentStates = findComponentStates(parseResult.registry)
  const variables = findVariables(parseResult.tokens, parseResult.nodes)
  const definitions = findDefinitions(parseResult.registry)

  const needsUseState =
    visibilityStates.length > 0 ||
    componentStates.length > 0 ||
    variables.some((v) => v.writers.length > 0)

  return {
    needsUseState,
    visibilityStates,
    componentStates,
    variables,
    definitions,
    definedComponents: new Set(definitions.map((d) => d.name)),
  }
}

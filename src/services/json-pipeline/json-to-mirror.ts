/**
 * Deterministic JSON to Mirror DSL Converter
 *
 * Converts validated JSON to Mirror DSL code with proper formatting.
 * This is a pure function with no LLM calls - guaranteed correct output.
 */

import type {
  PropertiesJSON,
  FullComponent,
  MirrorProperty,
  MirrorState,
  MirrorEvent,
} from './types'

import { SYSTEM_STATES } from '../../dsl/properties'

// =============================================================================
// Main Converter
// =============================================================================

/**
 * Convert PropertiesJSON to Mirror DSL code.
 * This is a deterministic conversion - same input always produces same output.
 */
export function jsonToMirror(json: PropertiesJSON): string {
  const lines: string[] = []

  // Variables (if present)
  if (json.variables) {
    for (const [name, value] of Object.entries(json.variables)) {
      const valStr = value === null ? 'null' : String(value)
      lines.push(`${name}: ${valStr}`)
    }
    if (Object.keys(json.variables).length > 0) {
      lines.push('')
    }
  }

  // Tokens (if present)
  if (json.tokens) {
    for (const [name, value] of Object.entries(json.tokens)) {
      // Ensure token name has $ prefix
      const tokenName = name.startsWith('$') ? name : `$${name}`
      lines.push(`${tokenName}: ${value}`)
    }
    if (Object.keys(json.tokens).length > 0) {
      lines.push('')
    }
  }

  // Components
  for (let i = 0; i < json.components.length; i++) {
    const comp = json.components[i]
    lines.push(...componentToMirror(comp, 0))

    // Add blank line between top-level components (but not after last)
    if (i < json.components.length - 1) {
      lines.push('')
    }
  }

  return lines.join('\n')
}

// =============================================================================
// Component Converter
// =============================================================================

function componentToMirror(comp: FullComponent, level: number): string[] {
  const lines: string[] = []
  const ind = indent(level)

  // Build component line
  let componentLine = buildComponentLine(comp)
  lines.push(`${ind}${componentLine}`)

  // Properties (each on its own line for readability)
  if (comp.properties && comp.properties.length > 0) {
    for (const prop of comp.properties) {
      lines.push(`${indent(level + 1)}${propertyToMirror(prop)}`)
    }
  }

  // Content (string) - only if not already in component line
  if (comp.content && !componentLine.includes(`"${comp.content}"`)) {
    lines.push(`${indent(level + 1)}"${escapeString(comp.content)}"`)
  }

  // States
  if (comp.states && comp.states.length > 0) {
    for (const state of comp.states) {
      lines.push(...stateToMirror(state, level + 1))
    }
  }

  // Events
  if (comp.events && comp.events.length > 0) {
    for (const event of comp.events) {
      lines.push(...eventToMirror(event, level + 1))
    }
  }

  // Children
  if (comp.children && comp.children.length > 0) {
    for (const child of comp.children) {
      lines.push(...componentToMirror(child, level + 1))
    }
  }

  return lines
}

function buildComponentLine(comp: FullComponent): string {
  let line = ''

  // Handle "as" syntax: Email as Input
  if (comp.definedAs) {
    line = `${comp.name || comp.type} as ${comp.definedAs}`
  } else if (comp.isDefinition && comp.name) {
    // Definition with custom name: MyButton:
    line = `${comp.name}:`
  } else if (comp.isDefinition) {
    // Definition without name: Button:
    line = `${comp.type}:`
  } else {
    // Regular instance
    line = comp.type
  }

  // Named instance: Button named SaveBtn
  if (comp.instanceName) {
    line += ` named ${comp.instanceName}`
  }

  // Inline content for simple components (Text, Button)
  if (comp.content && isSimpleContent(comp)) {
    line += ` "${escapeString(comp.content)}"`
  }

  return line
}

// =============================================================================
// Property Converter
// =============================================================================

function propertyToMirror(prop: MirrorProperty): string {
  // Handle direction prefix (for padding, margin, etc.)
  const propName = prop.direction ? `${prop.name} ${prop.direction}` : prop.name

  // Handle token values
  const value = prop.isToken ? `$${prop.value}` : formatValue(prop.value)

  // Boolean properties with value true are just the property name
  if (prop.value === true) {
    return propName
  }

  return `${propName} ${value}`
}

function formatValue(value: string | number | boolean): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  // String value - check if it needs quotes
  if (needsQuotes(value)) {
    return `"${escapeString(value)}"`
  }
  return value
}

function needsQuotes(value: string): boolean {
  // Space-separated numbers don't need quotes (e.g., "12 24" for padding)
  if (/^[\d\s\.]+$/.test(value)) {
    return false
  }
  // Keyword values don't need quotes
  const keywords = ['none', 'auto', 'hug', 'full', 'min', 'max', 'pointer', 'default']
  if (keywords.includes(value.toLowerCase())) {
    return false
  }
  // Quotes needed for strings with spaces or special characters
  return /\s|[,;:]/.test(value)
}

// =============================================================================
// State Converter
// =============================================================================

function stateToMirror(state: MirrorState, level: number): string[] {
  const lines: string[] = []
  const ind = indent(level)

  // System states use direct keyword, behavior states use "state" prefix
  const prefix = SYSTEM_STATES.has(state.name) ? state.name : `state ${state.name}`
  lines.push(`${ind}${prefix}`)

  for (const prop of state.properties) {
    lines.push(`${indent(level + 1)}${propertyToMirror(prop)}`)
  }

  return lines
}

// =============================================================================
// Event Converter
// =============================================================================

function eventToMirror(event: MirrorEvent, level: number): string[] {
  const lines: string[] = []
  const ind = indent(level)

  // Build event prefix
  let eventPrefix = event.event
  if (event.key) {
    eventPrefix += ` ${event.key}`
  }
  if (event.timing) {
    eventPrefix += ` ${event.timing.type} ${event.timing.ms}`
  }

  // All actions on a single line, comma-separated
  const actionsStr = event.actions.join(', ')
  lines.push(`${ind}${eventPrefix}: ${actionsStr}`)

  return lines
}

// =============================================================================
// Helper Functions
// =============================================================================

function indent(level: number): string {
  return '  '.repeat(level)
}

function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
}

/**
 * Check if content should be inlined with component
 */
function isSimpleContent(comp: FullComponent): boolean {
  // Inline for Text, Button, Link, Icon when no complex children
  const inlineTypes = ['Text', 'Button', 'Link', 'Icon', 'Input', 'Textarea']

  if (!inlineTypes.includes(comp.type)) {
    return false
  }

  // Don't inline if there are children (content becomes complex)
  if (comp.children && comp.children.length > 0) {
    return false
  }

  // Don't inline very long content
  if (comp.content && comp.content.length > 50) {
    return false
  }

  return true
}

// =============================================================================
// Compact Format (for single-line components)
// =============================================================================

/**
 * Convert a component to compact format (single line with comma-separated props)
 * Used for simple components without children/states/events
 */
export function componentToCompact(comp: FullComponent): string {
  const parts: string[] = []

  // Component type or definition
  if (comp.isDefinition && comp.name) {
    parts.push(`${comp.name}:`)
  } else if (comp.isDefinition) {
    parts.push(`${comp.type}:`)
  } else {
    parts.push(comp.type)
  }

  // Named instance
  if (comp.instanceName) {
    parts.push(`named ${comp.instanceName}`)
  }

  // Properties
  if (comp.properties && comp.properties.length > 0) {
    const props = comp.properties.map(propertyToMirror).join(', ')
    parts.push(props)
  }

  // Content
  if (comp.content) {
    parts.push(`"${escapeString(comp.content)}"`)
  }

  return parts.join(' ')
}

/**
 * Check if a component can be represented in compact format
 */
export function canBeCompact(comp: FullComponent): boolean {
  // No children, states, or events
  if (comp.children && comp.children.length > 0) return false
  if (comp.states && comp.states.length > 0) return false
  if (comp.events && comp.events.length > 0) return false

  // Not too many properties
  if (comp.properties && comp.properties.length > 5) return false

  // Content not too long
  if (comp.content && comp.content.length > 40) return false

  return true
}

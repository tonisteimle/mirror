/**
 * @module mirror-import
 * @description Mirror Import - JS/JSON zu AST und Mirror DSL Konvertierung
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Konvertiert MirrorConfig zurück zu ASTNode und Mirror DSL (v1 Syntax)
 *
 * Ermöglicht:
 * - Import von React/JS Configs nach Mirror
 * - Roundtrip: Mirror → React → Mirror
 * - Programmatische UI-Generierung
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KONVERTIERUNGSRICHTUNG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @flow MirrorConfig → ASTNode
 *   importFromMirrorConfig(config)
 *   - Long-Form → Short-Form Properties
 *   - Generiert IDs falls fehlend
 *
 * @flow ASTNode → Mirror DSL
 *   astToMirror(node, indent?, options?)
 *   - v1 Syntax: Einrückung statt Klammern
 *   - Properties mit Space statt Colon
 *
 * @flow ParseResult → Mirror DSL
 *   parseResultToMirror(result)
 *   - Inkludiert Tokens, Definitionen, Instanzen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function importFromMirrorConfig(config) → ASTNode
 *   Konvertiert MirrorConfig zu ASTNode
 *
 * @function importAllFromMirrorConfig(configs) → ASTNode[]
 *   Konvertiert Array von Configs
 *
 * @function astToMirror(node, indent?, options?) → string
 *   Konvertiert ASTNode zu DSL String
 *   options.isDefinition: true → Name: props
 *   options.extendsFrom: "Base" → Name: Base props
 *
 * @function astArrayToMirror(nodes) → string
 *   Konvertiert mehrere Nodes zu DSL
 *
 * @function parseResultToMirror(result) → string
 *   Konvertiert komplettes ParseResult
 *   Inkludiert: $tokens, Definitionen, Instanzen
 *
 * @function parseMirrorCall(code) → MirrorConfig | null
 *   Extrahiert MirrorConfig aus mirror() JS-Aufruf
 *
 * @function mirrorCallToMirror(code) → string | null
 *   Konvertiert mirror() Aufruf direkt zu DSL
 *
 * @function resetIdCounter() → void
 *   Setzt ID-Counter zurück (für Tests)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * V1 OUTPUT FORMAT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example Definition
 *   Button: padding 16, background #3B82F6
 *     state hover
 *       background #2563EB
 *
 * @example Instance
 *   Button "Click me"
 *
 * @used-by Editor für Code-Import und Roundtrip
 */

import type { ASTNode, StateDefinition } from './types'
import type { MirrorConfig } from './mirror-export'
import { normalizePropertyToShort, propertyToLongForm } from '../dsl/properties'

let idCounter = 0

/**
 * Generate a unique ID for a component.
 */
function generateId(name: string): string {
  return `${name}-${++idCounter}`
}

/**
 * Reset ID counter (for testing).
 */
export function resetIdCounter(): void {
  idCounter = 0
}

/**
 * Convert properties from long form to internal short form.
 */
function importProperties(properties: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(properties)) {
    // Convert to short form for internal use
    const shortForm = normalizePropertyToShort(key)
    result[shortForm] = value
  }

  return result
}

/**
 * Convert state definitions from export format to internal format.
 */
function importStates(states: Record<string, Record<string, unknown>> | undefined): StateDefinition[] | undefined {
  if (!states) return undefined

  const result: StateDefinition[] = []

  for (const [name, properties] of Object.entries(states)) {
    result.push({
      name,
      properties: importProperties(properties) as StateDefinition['properties'],
      children: []
    })
  }

  return result
}

/**
 * Convert a MirrorConfig to an ASTNode.
 *
 * @param config The MirrorConfig object
 * @returns ASTNode
 */
export function importFromMirrorConfig(config: MirrorConfig): ASTNode {
  const node: ASTNode = {
    type: 'component',
    name: config.type,
    id: config.id || generateId(config.type),
    properties: importProperties(config.properties),
    children: []
  }

  // Add content if present
  if (config.content) {
    node.content = config.content
  }

  // Add children if present
  if (config.children && config.children.length > 0) {
    node.children = config.children.map(child => importFromMirrorConfig(child))
  }

  // Add states if present
  const states = importStates(config.states)
  if (states && states.length > 0) {
    node.states = states
  }

  // Add instance name if present
  if (config.instanceName) {
    node.instanceName = config.instanceName
  }

  // Add source span if present
  if (config.sourceSpan) {
    node._sourceSpan = config.sourceSpan
  }

  return node
}

/**
 * Convert multiple MirrorConfigs to ASTNodes.
 *
 * @param configs Array of MirrorConfig objects
 * @returns Array of ASTNodes
 */
export function importAllFromMirrorConfig(configs: MirrorConfig[]): ASTNode[] {
  return configs.map(config => importFromMirrorConfig(config))
}

/**
 * Format a property value for Mirror syntax.
 */
function formatValue(value: unknown): string {
  // Handle token references: { type: 'token', name: 'primary' }
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    if (obj.type === 'token' && typeof obj.name === 'string') {
      return `$${obj.name}`
    }
    // Handle component property references: { type: 'reference', component: 'Card', property: 'radius' }
    if (obj.type === 'reference' && typeof obj.component === 'string' && typeof obj.property === 'string') {
      return `${obj.component}.${obj.property}`
    }
    // Handle arrays (e.g., padding shorthand)
    if (Array.isArray(value)) {
      return value.map(v => formatValue(v)).join(' ')
    }
  }
  if (typeof value === 'string') {
    // Check if it's a token reference string ($name)
    if (value.startsWith('$')) {
      return value
    }
    // Check if it's a color (starts with #)
    if (value.startsWith('#')) {
      return value
    }
    // Check if it's a keyword (no spaces, alphanumeric)
    if (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(value)) {
      return value
    }
    // Otherwise quote it
    return `"${value}"`
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'boolean') {
    return String(value)
  }
  return String(value)
}

/**
 * Options for astToMirror conversion.
 */
export interface AstToMirrorOptions {
  /** If true, outputs as definition (Name: props) instead of instance (Name props) */
  isDefinition?: boolean
  /** Base component name for inheritance (Name: Base props) */
  extendsFrom?: string
}

/**
 * Convert an ASTNode to v1 Mirror DSL syntax.
 *
 * @param node The ASTNode to convert
 * @param indent Current indentation level (for nested formatting)
 * @param options Conversion options (isDefinition, extendsFrom)
 * @returns v1 Mirror DSL string
 */
export function astToMirror(node: ASTNode, indent = 0, options: AstToMirrorOptions = {}): string {
  const indentStr = '  '.repeat(indent)
  const innerIndent = '  '.repeat(indent + 1)
  const lines: string[] = []

  // Build properties string (space-separated, comma-delimited)
  const propEntries = Object.entries(node.properties).filter(([key]) => !key.startsWith('_'))
  const propParts: string[] = []
  for (const [key, value] of propEntries) {
    const longKey = propertyToLongForm(key)
    propParts.push(`${longKey} ${formatValue(value)}`)
  }
  const propsStr = propParts.join(', ')

  // Component header - definition uses colon, instance doesn't
  const colon = options.isDefinition ? ':' : ''
  const extendsClause = options.extendsFrom ? ` ${options.extendsFrom}` : ''

  // Build main line: Component props "content"
  let mainLine = `${indentStr}${node.name}${colon}${extendsClause}`
  if (propsStr) {
    mainLine += ` ${propsStr}`
  }

  // Content inline if no children/states
  const hasChildren = node.children && node.children.length > 0
  const hasStates = node.states && node.states.length > 0
  if (node.content && !hasChildren && !hasStates) {
    mainLine += ` "${node.content}"`
  }

  lines.push(mainLine)

  // States (indented below)
  if (node.states && node.states.length > 0) {
    for (const state of node.states) {
      const stateProps = Object.entries(state.properties).filter(([key]) => !key.startsWith('_'))
      const statePropParts: string[] = []
      for (const [key, value] of stateProps) {
        const longKey = propertyToLongForm(key)
        statePropParts.push(`${longKey} ${formatValue(value)}`)
      }
      lines.push(`${innerIndent}state ${state.name}`)
      for (const prop of statePropParts) {
        lines.push(`${innerIndent}  ${prop}`)
      }
    }
  }

  // Content as child (if has children or states)
  if (node.content && (hasChildren || hasStates)) {
    lines.push(`${innerIndent}"${node.content}"`)
  }

  // Children (indented below)
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      lines.push(astToMirror(child, indent + 1))
    }
  }

  return lines.join('\n')
}

/**
 * Convert multiple ASTNodes to v1 Mirror DSL syntax.
 *
 * @param nodes Array of ASTNodes
 * @returns v1 Mirror DSL string
 */
export function astArrayToMirror(nodes: ASTNode[]): string {
  return nodes.map(node => astToMirror(node)).join('\n\n')
}

/**
 * Convert a ComponentTemplate to v1 Mirror DSL syntax.
 */
function templateToMirror(name: string, template: import('./types').ComponentTemplate): string {
  const lines: string[] = []

  // Build properties string (space-separated, comma-delimited)
  const propEntries = Object.entries(template.properties).filter(([key]) => !key.startsWith('_'))
  const propParts: string[] = []
  for (const [key, value] of propEntries) {
    const longKey = propertyToLongForm(key)
    propParts.push(`${longKey} ${formatValue(value)}`)
  }
  const propsStr = propParts.join(', ')

  // Header with optional inheritance
  const extendsClause = template.extends ? ` ${template.extends}` : ''

  // Build main line
  let mainLine = `${name}:${extendsClause}`
  if (propsStr) {
    mainLine += ` ${propsStr}`
  }

  const hasChildren = template.children && template.children.length > 0
  const hasStates = template.states && template.states.length > 0

  // Content inline if no children/states
  if (template.content && !hasChildren && !hasStates) {
    mainLine += ` "${template.content}"`
  }

  lines.push(mainLine)

  // States (indented below)
  if (template.states && template.states.length > 0) {
    for (const state of template.states) {
      const stateProps = Object.entries(state.properties).filter(([key]) => !key.startsWith('_'))
      const statePropParts: string[] = []
      for (const [key, value] of stateProps) {
        const longKey = propertyToLongForm(key)
        statePropParts.push(`${longKey} ${formatValue(value)}`)
      }
      lines.push(`  state ${state.name}`)
      for (const prop of statePropParts) {
        lines.push(`    ${prop}`)
      }
    }
  }

  // Content as child (if has children or states)
  if (template.content && (hasChildren || hasStates)) {
    lines.push(`  "${template.content}"`)
  }

  // Children (indented below)
  if (template.children && template.children.length > 0) {
    for (const child of template.children) {
      lines.push(astToMirror(child, 1))
    }
  }

  return lines.join('\n')
}

/**
 * Convert a full ParseResult to v1 Mirror DSL syntax.
 * Includes tokens, definitions (from registry), and instances (from nodes).
 *
 * @param result ParseResult from parse()
 * @returns Complete v1 Mirror DSL string
 */
export function parseResultToMirror(result: import('./types').ParseResult): string {
  const sections: string[] = []

  // 1. Design Tokens
  const tokenLines: string[] = []
  for (const [name, value] of result.tokens) {
    // Skip complex token values (sequences)
    if (typeof value === 'object' && value !== null && 'type' in value) {
      continue
    }
    tokenLines.push(`$${name}: ${formatValue(value)}`)
  }
  if (tokenLines.length > 0) {
    sections.push(tokenLines.join('\n'))
  }

  // 2. Component Definitions (from registry)
  const defLines: string[] = []
  for (const [name, template] of result.registry) {
    defLines.push(templateToMirror(name, template))
  }
  if (defLines.length > 0) {
    sections.push(defLines.join('\n\n'))
  }

  // 3. Instances (from nodes)
  if (result.nodes.length > 0) {
    const instanceLines = result.nodes.map(node => astToMirror(node)).join('\n\n')
    sections.push(instanceLines)
  }

  return sections.join('\n\n')
}

/**
 * Parse a mirror() function call from JavaScript/React code.
 * Extracts the MirrorConfig from the call.
 *
 * @param code JavaScript/React code containing mirror() call
 * @returns MirrorConfig or null if not found
 */
export function parseMirrorCall(code: string): MirrorConfig | null {
  // Match mirror({ ... }) or mirror([{ ... }])
  const mirrorCallRegex = /mirror\s*\(\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*\)/

  const match = code.match(mirrorCallRegex)
  if (!match) return null

  try {
    // Parse the JSON-like config
    // Note: This is a simplified parser - real implementation might need
    // a proper JS parser for complex cases
    const configStr = match[1]
    const config = JSON.parse(configStr)

    // If it's an array, return the first element
    if (Array.isArray(config)) {
      return config[0] as MirrorConfig
    }

    return config as MirrorConfig
  } catch {
    return null
  }
}

/**
 * Convert a mirror() call in JavaScript to v1 Mirror DSL.
 *
 * @param code JavaScript code containing mirror() call
 * @returns v1 Mirror DSL string or null if conversion failed
 */
export function mirrorCallToMirror(code: string): string | null {
  const config = parseMirrorCall(code)
  if (!config) return null

  const ast = importFromMirrorConfig(config)
  return astToMirror(ast)
}

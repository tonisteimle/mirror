/**
 * @module mirror-export
 * @description Mirror Export - AST zu JS/JSON Format Konvertierung
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Exportiert AST-Nodes zu JS-freundlichem MirrorConfig Format
 *
 * Geeignet für:
 * - React Code-Generierung
 * - JSON Serialisierung
 * - Programmatische Manipulation
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MIRROR CONFIG FORMAT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @interface MirrorConfig
 *   type: string              → Component-Typ Name
 *   id: string                → Eindeutige ID
 *   properties: Record        → Long-Form Properties
 *   content?: string          → Text-Inhalt
 *   children?: MirrorConfig[] → Kinder
 *   states?: Record           → State-Definitionen
 *   instanceName?: string     → Named Instance Name
 *   syntaxVersion?: 1 | 2     → Syntax-Version
 *   sourceSpan?: { start, end } → Source Location
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PROPERTY KONVERTIERUNG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @rule Short → Long Form
 *   pad → padding
 *   col → color
 *   bg → background
 *   rad → radius
 *
 * @rule Internal Properties werden übersprungen
 *   _syntaxVersion, _isLibrary, etc.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function exportToMirrorConfig(node) → MirrorConfig
 *   Konvertiert einzelnen ASTNode
 *
 * @function exportAllToMirrorConfig(nodes) → MirrorConfig[]
 *   Konvertiert Array von Nodes
 *
 * @function exportToJson(nodes, pretty?) → string
 *   Exportiert als JSON String
 *   pretty: true → formatiert mit Einrückung
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BEISPIEL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example AST → MirrorConfig
 *   // Input AST
 *   { name: 'Button', properties: { pad: 16, bg: '#3B82F6' } }
 *
 *   // Output MirrorConfig
 *   { type: 'Button', properties: { padding: 16, background: '#3B82F6' } }
 *
 * @used-by React Generator für Code-Export
 */

import type { ASTNode, StateDefinition } from './types'
import { propertyToLongForm } from '../dsl/properties'

/**
 * MirrorConfig represents a component in a JS-friendly format.
 */
export interface MirrorConfig {
  /** Component type name */
  type: string

  /** Unique identifier */
  id: string

  /** Component properties (styles, layout, etc.) */
  properties: Record<string, unknown>

  /** Text content */
  content?: string

  /** Child components */
  children?: MirrorConfig[]

  /** State definitions */
  states?: Record<string, Record<string, unknown>>

  /** Instance name (for named instances) */
  instanceName?: string

  /** Syntax version used */
  syntaxVersion?: 1 | 2

  /** Source location */
  sourceSpan?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
}

/**
 * Convert properties from internal short form to export format.
 * Uses long-form property names for readability.
 */
function exportProperties(properties: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(properties)) {
    // Skip internal properties (prefixed with _)
    if (key.startsWith('_')) continue

    // Convert to long form for readability
    const longForm = propertyToLongForm(key)
    result[longForm] = value
  }

  return result
}

/**
 * Convert state definitions to export format.
 */
function exportStates(states: StateDefinition[] | undefined): Record<string, Record<string, unknown>> | undefined {
  if (!states || states.length === 0) return undefined

  const result: Record<string, Record<string, unknown>> = {}

  for (const state of states) {
    result[state.name] = exportProperties(state.properties as Record<string, unknown>)
  }

  return result
}

/**
 * Export an ASTNode to MirrorConfig format.
 *
 * @param node The AST node to export
 * @returns MirrorConfig object
 */
export function exportToMirrorConfig(node: ASTNode): MirrorConfig {
  const config: MirrorConfig = {
    type: node.name,
    id: node.id,
    properties: exportProperties(node.properties as Record<string, unknown>)
  }

  // Add content if present
  if (node.content) {
    config.content = node.content
  }

  // Add children if present
  if (node.children && node.children.length > 0) {
    config.children = node.children.map(child => exportToMirrorConfig(child))
  }

  // Add states if present
  const states = exportStates(node.states)
  if (states) {
    config.states = states
  }

  // Add instance name if present
  if (node.instanceName) {
    config.instanceName = node.instanceName
  }

  // Add syntax version if present
  if (node._syntaxVersion) {
    config.syntaxVersion = node._syntaxVersion
  }

  // Add source span if present
  if (node._sourceSpan) {
    config.sourceSpan = node._sourceSpan
  }

  return config
}

/**
 * Export multiple nodes to MirrorConfig array.
 *
 * @param nodes Array of AST nodes
 * @returns Array of MirrorConfig objects
 */
export function exportAllToMirrorConfig(nodes: ASTNode[]): MirrorConfig[] {
  return nodes.map(node => exportToMirrorConfig(node))
}

/**
 * Export to JSON string.
 *
 * @param nodes Array of AST nodes or single node
 * @param pretty Whether to pretty-print (default: true)
 * @returns JSON string
 */
export function exportToJson(nodes: ASTNode | ASTNode[], pretty = true): string {
  const configs = Array.isArray(nodes)
    ? exportAllToMirrorConfig(nodes)
    : exportToMirrorConfig(nodes)

  return JSON.stringify(configs, null, pretty ? 2 : 0)
}

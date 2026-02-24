/**
 * @module debug
 * @description Parser Debug Tools - AST und Token Visualisierung
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Utilities für Debugging und Visualisierung von Parser-Output
 *
 * Features:
 * - AST Pretty Printer mit ANSI-Farben
 * - Token Stream Visualizer
 * - Parse Result Summary
 * - Kombinations-Debug-Funktion
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * AST PRETTY PRINTER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function printAST(node, options?) → string
 *   Formatiert AST-Baum für Debug-Output
 *
 * @interface PrintOptions
 *   showLocations: boolean     → Line/Column anzeigen
 *   showInternalProps: boolean → _prefixed Properties zeigen
 *   maxDepth: number           → Maximale Tiefe (-1 = unbegrenzt)
 *   indent: string             → Einrückungsstring
 *   colors: boolean            → ANSI-Farben verwenden
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TOKEN VISUALIZER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function printTokens(tokens, options?) → string
 *   Formatiert Token-Stream für Debug-Output
 *   - Gruppiert nach Zeilen
 *   - Zeigt Type, Column, Value
 *   - Farbcodiert nach Token-Typ
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PARSE RESULT SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function printParseResult(result, source?, options?) → string
 *   Vollständige Zusammenfassung eines Parse-Results
 *   - Statistiken (Nodes, Templates, Tokens, Errors)
 *   - Formatierte Fehler mit Source-Kontext
 *   - AST-Dump
 *   - Design Token Liste
 *   - Template-Namen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEBUG PARSE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function debugParse(input, options?) → DebugResult
 *   Kombinierte Debug-Funktion
 *
 * @returns DebugResult
 *   result: ParseResult
 *   tokens: Token[]
 *   tokenDump: string    → Formatierter Token-Stream
 *   astDump: string      → Formatierter AST
 *   summary: string      → Vollständige Zusammenfassung
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FARBSCHEMA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @colors
 *   cyan    → Component-Namen
 *   green   → Properties, Token-Refs
 *   yellow  → Strings, Locations
 *   blue    → Numbers, States
 *   magenta → Sections, Keywords
 *   red     → Errors
 *   dim     → IDs, Metadata
 *
 * @used-by Entwickler für Parser-Debugging
 */

import type { Token } from './lexer'
import type { ASTNode, ParseResult } from './types'
import type { ParseError } from './errors'
import { formatErrors } from './errors'

// ============================================
// AST Pretty Printer
// ============================================

export interface PrintOptions {
  /** Include source locations (line, column) */
  showLocations?: boolean
  /** Include all properties (including internal ones like _isLibrary) */
  showInternalProps?: boolean
  /** Maximum depth to print (-1 for unlimited) */
  maxDepth?: number
  /** Indentation string */
  indent?: string
  /** Use colors in output (ANSI codes) */
  colors?: boolean
}

const defaultPrintOptions: PrintOptions = {
  showLocations: true,
  showInternalProps: false,
  maxDepth: -1,
  indent: '  ',
  colors: true,
}

/**
 * Pretty print an AST node tree.
 */
export function printAST(node: ASTNode | ASTNode[], options?: PrintOptions): string {
  const opts = { ...defaultPrintOptions, ...options }
  const nodes = Array.isArray(node) ? node : [node]

  return nodes.map(n => printNode(n, 0, opts)).join('\n')
}

function printNode(node: ASTNode, depth: number, opts: PrintOptions): string {
  const maxDepth = opts.maxDepth ?? -1
  if (maxDepth !== -1 && depth > maxDepth) {
    return `${opts.indent!.repeat(depth)}...`
  }

  const lines: string[] = []
  const indent = opts.indent!.repeat(depth)
  const c = opts.colors ? colors : noColors

  // Node header: name and id
  let header = `${c.cyan}${node.name}${c.reset}`
  if (node.instanceName) {
    header += ` ${c.dim}(instance: ${node.instanceName})${c.reset}`
  }
  header += ` ${c.dim}#${node.id}${c.reset}`

  if (opts.showLocations && node.line !== undefined) {
    const loc = node.endLine !== undefined
      ? `${node.line + 1}:${node.column! + 1}-${node.endLine + 1}:${node.endColumn}`
      : `${node.line + 1}:${node.column! + 1}`
    header += ` ${c.yellow}@${loc}${c.reset}`
  }

  lines.push(`${indent}${header}`)

  // Properties (excluding internal ones unless requested)
  const props = Object.entries(node.properties).filter(([key]) => {
    if (opts.showInternalProps) return true
    return !key.startsWith('_')
  })
  if (props.length > 0) {
    lines.push(`${indent}  ${c.magenta}properties:${c.reset}`)
    for (const [key, value] of props) {
      lines.push(`${indent}    ${c.green}${key}${c.reset}: ${formatValue(value, c)}`)
    }
  }

  // Content
  if (node.content) {
    lines.push(`${indent}  ${c.magenta}content:${c.reset} ${c.yellow}"${node.content}"${c.reset}`)
  }

  // States
  if (node.states && node.states.length > 0) {
    lines.push(`${indent}  ${c.magenta}states:${c.reset}`)
    for (const state of node.states) {
      lines.push(`${indent}    ${c.blue}${state.name}${c.reset}`)
    }
  }

  // Event handlers
  if (node.eventHandlers && node.eventHandlers.length > 0) {
    lines.push(`${indent}  ${c.magenta}events:${c.reset}`)
    for (const handler of node.eventHandlers) {
      lines.push(`${indent}    ${c.blue}${handler.event}${c.reset} (${handler.actions.length} actions)`)
    }
  }

  // Condition
  if (node.condition) {
    lines.push(`${indent}  ${c.magenta}condition:${c.reset} ${formatCondition(node.condition, c)}`)
  }

  // Iteration
  if (node.iteration) {
    lines.push(`${indent}  ${c.magenta}iteration:${c.reset} each ${node.iteration.itemVar} in ${node.iteration.collectionVar}`)
  }

  // Children
  if (node.children.length > 0) {
    lines.push(`${indent}  ${c.magenta}children:${c.reset}`)
    for (const child of node.children) {
      lines.push(printNode(child, depth + 2, opts))
    }
  }

  // Else children
  if (node.elseChildren && node.elseChildren.length > 0) {
    lines.push(`${indent}  ${c.magenta}else:${c.reset}`)
    for (const child of node.elseChildren) {
      lines.push(printNode(child, depth + 2, opts))
    }
  }

  return lines.join('\n')
}

function formatValue(value: unknown, c: typeof colors): string {
  if (typeof value === 'string') {
    if (value.startsWith('#')) return `${c.cyan}${value}${c.reset}`
    return `${c.yellow}"${value}"${c.reset}`
  }
  if (typeof value === 'number') return `${c.blue}${value}${c.reset}`
  if (typeof value === 'boolean') return `${c.magenta}${value}${c.reset}`
  return String(value)
}

function formatCondition(cond: ASTNode['condition'], c: typeof colors): string {
  if (!cond) return ''
  switch (cond.type) {
    case 'var': return `${c.green}$${cond.name}${c.reset}`
    case 'not': return `not ${formatCondition(cond.operand!, c)}`
    case 'and': return `${formatCondition(cond.left!, c)} and ${formatCondition(cond.right!, c)}`
    case 'or': return `${formatCondition(cond.left!, c)} or ${formatCondition(cond.right!, c)}`
    case 'comparison': return `... ${cond.operator} ...`
    default: return '?'
  }
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
}

const noColors = {
  reset: '',
  dim: '',
  cyan: '',
  yellow: '',
  green: '',
  blue: '',
  magenta: '',
  red: '',
}

// ============================================
// Token Stream Visualizer
// ============================================

/**
 * Format a token stream for visualization.
 */
export function printTokens(tokens: Token[], options?: { colors?: boolean }): string {
  const useColors = options?.colors ?? true
  const c = useColors ? colors : noColors

  const lines: string[] = []
  let currentLine = -1

  for (const token of tokens) {
    if (token.type === 'EOF') continue

    // New line marker
    if (token.line !== currentLine) {
      if (currentLine !== -1) lines.push('')
      currentLine = token.line
      lines.push(`${c.dim}Line ${token.line + 1}:${c.reset}`)
    }

    // Token info
    const typeColor = getTokenColor(token.type, c)
    const col = String(token.column).padStart(3, ' ')
    lines.push(`  ${c.dim}[${col}]${c.reset} ${typeColor}${token.type.padEnd(15)}${c.reset} ${c.yellow}${escapeValue(token.value)}${c.reset}`)
  }

  return lines.join('\n')
}

function getTokenColor(type: string, c: typeof colors): string {
  if (type.includes('DEF') || type === 'SELECTOR') return c.magenta
  if (type === 'COMPONENT_NAME') return c.cyan
  if (type === 'PROPERTY' || type === 'MODIFIER') return c.green
  if (type === 'NUMBER' || type === 'COLOR') return c.blue
  if (type === 'STRING') return c.yellow
  if (type === 'TOKEN_REF') return c.green
  if (type === 'ERROR') return c.red
  if (type.includes('CONTROL') || type.includes('EVENT') || type.includes('ACTION')) return c.magenta
  return c.dim
}

function escapeValue(value: string): string {
  return value
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
}

// ============================================
// Parse Result Summary
// ============================================

/**
 * Print a summary of a parse result.
 */
export function printParseResult(result: ParseResult, source?: string, options?: PrintOptions): string {
  const opts = { ...defaultPrintOptions, ...options }
  const c = opts.colors ? colors : noColors
  const lines: string[] = []

  // Header
  lines.push(`${c.cyan}=== Parse Result ===${c.reset}`)
  lines.push('')

  // Statistics
  lines.push(`${c.magenta}Statistics:${c.reset}`)
  lines.push(`  Nodes:       ${result.nodes.length}`)
  lines.push(`  Templates:   ${result.registry.size}`)
  lines.push(`  Tokens:      ${result.tokens.size}`)
  lines.push(`  Styles:      ${result.styles.size}`)
  lines.push(`  Errors:      ${result.errors.length}`)
  lines.push(`  Diagnostics: ${result.diagnostics.length}`)
  lines.push('')

  // Errors
  if (result.diagnostics.length > 0) {
    lines.push(`${c.red}Errors:${c.reset}`)
    const sourceLines = source?.split('\n')
    lines.push(formatErrors(result.diagnostics, sourceLines))
    lines.push('')
  }

  // AST
  if (result.nodes.length > 0) {
    lines.push(`${c.magenta}AST:${c.reset}`)
    lines.push(printAST(result.nodes, opts))
    lines.push('')
  }

  // Tokens defined
  if (result.tokens.size > 0) {
    lines.push(`${c.magenta}Design Tokens:${c.reset}`)
    for (const [name, value] of result.tokens) {
      lines.push(`  ${c.green}$${name}${c.reset}: ${formatValue(value, c)}`)
    }
    lines.push('')
  }

  // Templates
  if (result.registry.size > 0) {
    lines.push(`${c.magenta}Templates:${c.reset}`)
    for (const [name] of result.registry) {
      lines.push(`  ${c.cyan}${name}${c.reset}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ============================================
// Debug Parse Function
// ============================================

import { parse } from './parser'
import { tokenize } from './lexer'

/**
 * Parse with debug output.
 * Returns both the result and debug information.
 */
export function debugParse(input: string, options?: PrintOptions): {
  result: ParseResult
  tokens: Token[]
  tokenDump: string
  astDump: string
  summary: string
} {
  const tokens = tokenize(input)
  const result = parse(input)

  return {
    result,
    tokens,
    tokenDump: printTokens(tokens, options),
    astDump: printAST(result.nodes, options),
    summary: printParseResult(result, input, options),
  }
}

/**
 * @module semantic-validation
 * @description Semantic Validation - Post-Parse AST Validierung
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Validiert AST nach dem Parsing auf semantische Fehler
 *
 * Geprüft werden:
 * - Undefinierte Token-Referenzen ($unknown)
 * - Undefinierte Component-Referenzen
 * - Doppelte Definitionen
 * - Typ-Mismatches (z.B. String wo Number erwartet)
 * - Zirkuläre Referenzen in Tokens
 * - Ungültige Property-Werte
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VALIDATION RESULT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @interface ValidationResult
 *   valid: boolean      → true wenn keine Errors (Warnings erlaubt)
 *   errors: ParseError[] → Blocking Errors
 *   warnings: ParseError[] → Advisory Warnings
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function validateSemantics(result, source?) → ValidationResult
 *   Hauptfunktion: Validiert komplettes ParseResult
 *   - Sammelt definierte Tokens und Templates
 *   - Traversiert AST rekursiv
 *   - Gruppiert Fehler nach Token/Component-Namen
 *
 * @function checkCircularReferences(tokens) → ParseError[]
 *   Prüft Token-Definitionen auf Zirkel
 *   Verwendet DFS mit visiting/visited Sets
 *
 * @function checkDuplicateDefinitions(registry, source?) → ParseError[]
 *   Placeholder für Duplikat-Prüfung
 *   (Benötigt Line-Tracking in Registry)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VALIDIERTE PROPERTIES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @validate Numeric Properties
 *   pad, mar, gap, w, h, rad, bor, size, z
 *   → Warning wenn String statt Number
 *
 * @validate Color Properties
 *   col, boc
 *   → Warning wenn kein Farbwert (#, rgb, hsl)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BEISPIEL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example Undefined Token Warning
 *   Button background $unknown
 *   → Warning [S001]: Token "$unknown" is not defined
 *   → Hint: Define it with: $unknown: <value>
 *
 * @example Type Mismatch Warning
 *   Button padding "sixteen"
 *   → Warning [S005]: Property "pad" expects a number, got string "sixteen"
 *
 * @used-by parser.ts nach dem Haupt-Parsing
 */

import type { ASTNode, ParseResult } from './types'
import type { ParseError } from './errors'
import { createError, ErrorCodes } from './errors'

export interface ValidationResult {
  valid: boolean
  errors: ParseError[]
  warnings: ParseError[]
}

/**
 * Validate a parse result for semantic errors.
 */
export function validateSemantics(result: ParseResult, source?: string): ValidationResult {
  const errors: ParseError[] = []
  const warnings: ParseError[] = []
  const sourceLines = source?.split('\n') || []

  // Collect all defined names
  const definedTokens = new Set(result.tokens.keys())
  const definedTemplates = new Set(result.registry.keys())

  // Track referenced but undefined items
  const undefinedTokens = new Map<string, { line: number; column: number }[]>()
  const undefinedComponents = new Map<string, { line: number; column: number }[]>()

  // Validate all nodes recursively
  for (const node of result.nodes) {
    validateNode(node, {
      definedTokens,
      definedTemplates,
      undefinedTokens,
      undefinedComponents,
      errors,
      warnings,
      sourceLines,
    })
  }

  // Report undefined tokens (grouped)
  for (const [name, locations] of undefinedTokens) {
    if (locations.length === 1) {
      const loc = locations[0]
      warnings.push(createError(
        'warning',
        ErrorCodes.UNDEFINED_TOKEN,
        `Token "$${name}" is not defined`,
        loc.line,
        loc.column,
        { hint: `Define it with: $${name}: <value>` }
      ))
    } else {
      const firstLoc = locations[0]
      warnings.push(createError(
        'warning',
        ErrorCodes.UNDEFINED_TOKEN,
        `Token "$${name}" is not defined (referenced ${locations.length} times)`,
        firstLoc.line,
        firstLoc.column,
        { hint: `Define it with: $${name}: <value>` }
      ))
    }
  }

  // Report undefined components (grouped)
  for (const [name, locations] of undefinedComponents) {
    if (locations.length === 1) {
      const loc = locations[0]
      warnings.push(createError(
        'warning',
        ErrorCodes.UNDEFINED_COMPONENT,
        `Component "${name}" is not defined`,
        loc.line,
        loc.column,
        { hint: `Define it with: ${name}: <properties>` }
      ))
    } else {
      const firstLoc = locations[0]
      warnings.push(createError(
        'warning',
        ErrorCodes.UNDEFINED_COMPONENT,
        `Component "${name}" is not defined (used ${locations.length} times)`,
        firstLoc.line,
        firstLoc.column,
        { hint: `Define it with: ${name}: <properties>` }
      ))
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

interface ValidationContext {
  definedTokens: Set<string>
  definedTemplates: Set<string>
  undefinedTokens: Map<string, { line: number; column: number }[]>
  undefinedComponents: Map<string, { line: number; column: number }[]>
  errors: ParseError[]
  warnings: ParseError[]
  sourceLines: string[]
}

function validateNode(node: ASTNode, ctx: ValidationContext): void {
  // Check for undefined token references in properties
  for (const [key, value] of Object.entries(node.properties)) {
    if (typeof value === 'string' && value.startsWith('$')) {
      const tokenName = value.slice(1)
      if (!ctx.definedTokens.has(tokenName) && !tokenName.includes('.')) {
        // Track undefined token
        const locations = ctx.undefinedTokens.get(tokenName) || []
        locations.push({ line: node.line || 0, column: node.column || 0 })
        ctx.undefinedTokens.set(tokenName, locations)
      }
    }
  }

  // Validate property values
  validatePropertyValues(node, ctx)

  // Validate iteration
  if (node.iteration) {
    const collectionVar = node.iteration.collectionVar
    if (!ctx.definedTokens.has(collectionVar) && !collectionVar.includes('.')) {
      const locations = ctx.undefinedTokens.get(collectionVar) || []
      locations.push({ line: node.line || 0, column: node.column || 0 })
      ctx.undefinedTokens.set(collectionVar, locations)
    }
  }

  // Validate condition references
  if (node.condition) {
    validateCondition(node.condition, node.line || 0, node.column || 0, ctx)
  }

  // Recursively validate children
  for (const child of node.children) {
    validateNode(child, ctx)
  }

  if (node.elseChildren) {
    for (const child of node.elseChildren) {
      validateNode(child, ctx)
    }
  }
}

function validateCondition(
  cond: NonNullable<ASTNode['condition']>,
  line: number,
  column: number,
  ctx: ValidationContext
): void {
  switch (cond.type) {
    case 'var':
      if (cond.name && !ctx.definedTokens.has(cond.name)) {
        // This might be a state variable, so just a warning
        // ctx.warnings.push(...)
      }
      break
    case 'not':
      if (cond.operand) validateCondition(cond.operand, line, column, ctx)
      break
    case 'and':
    case 'or':
      if (cond.left) validateCondition(cond.left, line, column, ctx)
      if (cond.right) validateCondition(cond.right, line, column, ctx)
      break
    case 'comparison':
      if (cond.left) validateCondition(cond.left, line, column, ctx)
      if (cond.right) validateCondition(cond.right, line, column, ctx)
      break
  }
}

function validatePropertyValues(node: ASTNode, ctx: ValidationContext): void {
  const props = node.properties

  // Validate numeric properties are numbers
  const numericProps = ['pad', 'mar', 'gap', 'w', 'h', 'rad', 'bor', 'size', 'z']
  for (const prop of numericProps) {
    if (prop in props) {
      const value = props[prop]
      if (typeof value === 'string' && !value.startsWith('$') && !value.startsWith('#')) {
        // Non-token string for numeric property
        ctx.warnings.push(createError(
          'warning',
          ErrorCodes.TYPE_MISMATCH,
          `Property "${prop}" expects a number, got string "${value}"`,
          node.line || 0,
          node.column || 0
        ))
      }
    }
  }

  // Validate color properties
  const colorProps = ['col', 'boc']
  for (const prop of colorProps) {
    if (prop in props) {
      const value = props[prop]
      if (typeof value === 'string' && !value.startsWith('$') && !value.startsWith('#') && !value.startsWith('rgb') && !value.startsWith('hsl')) {
        // Non-color value for color property
        ctx.warnings.push(createError(
          'warning',
          ErrorCodes.TYPE_MISMATCH,
          `Property "${prop}" expects a color value, got "${value}"`,
          node.line || 0,
          node.column || 0
        ))
      }
    }
  }
}

/**
 * Check for circular references in token definitions.
 */
export function checkCircularReferences(
  tokens: Map<string, unknown>
): ParseError[] {
  const errors: ParseError[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  function visit(name: string, path: string[]): boolean {
    if (visiting.has(name)) {
      // Circular reference detected
      const cycle = [...path, name].join(' -> ')
      errors.push(createError(
        'error',
        ErrorCodes.CIRCULAR_REFERENCE,
        `Circular reference in token definitions: ${cycle}`,
        0, 0
      ))
      return true
    }

    if (visited.has(name)) return false

    visiting.add(name)
    const value = tokens.get(name)

    // Check if value references other tokens
    if (value && typeof value === 'object' && 'type' in value && (value as { type: string }).type === 'sequence') {
      const seq = value as { type: 'sequence'; tokens: Array<{ type: string; value: string }> }
      for (const token of seq.tokens) {
        if (token.type === 'TOKEN_REF') {
          if (visit(token.value, [...path, name])) {
            return true
          }
        }
      }
    }

    visiting.delete(name)
    visited.add(name)
    return false
  }

  for (const name of tokens.keys()) {
    visit(name, [])
  }

  return errors
}

/**
 * Find duplicate component definitions.
 */
export function checkDuplicateDefinitions(
  registry: Map<string, unknown>,
  source?: string
): ParseError[] {
  // Since the registry is a Map, duplicates are already overwritten
  // We would need to track this during parsing
  // For now, this is a placeholder for when we add line tracking to registry entries
  return []
}

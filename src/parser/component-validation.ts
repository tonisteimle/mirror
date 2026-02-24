/**
 * @module component-validation
 * @description Component Validation - Validierung für Component-Hierarchien
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Validierungsfunktionen für AST-Hierarchien
 *
 * Features:
 * - Rekursive Suche nach Children (Flat Access)
 * - Sammeln aller Element-Namen
 * - Validierung der Namens-Eindeutigkeit
 * - Stack-Overflow-Schutz (MAX_RECURSION_DEPTH)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FLAT ACCESS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @concept Flat Access
 *   Direkter Zugriff auf tief verschachtelte Kinder nach Namen:
 *
 *   Header
 *     Left
 *       Logo                    ← Kann direkt als "Logo" referenziert werden
 *     Right
 *       Avatar                  ← Kann direkt als "Avatar" referenziert werden
 *
 *   Header
 *     Logo background #F00      ← Findet Logo in Left
 *     Avatar size 36            ← Findet Avatar in Right
 *
 * @requirement Flat Access erfordert eindeutige Namen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function findChildDeep(children, name, depth?) → ASTNode | null
 *   Sucht Kind rekursiv nach Namen
 *   Gibt Node für In-Place-Modifikation zurück
 *
 * @function collectNames(children, names?, depth?) → Map<string, number[]>
 *   Sammelt alle Element-Namen mit Zeilennummern
 *   Überspringt: _internal, _isListItem, icon
 *
 * @function validateUniqueNames(children, componentName) → string[]
 *   Validiert Namens-Eindeutigkeit
 *   Gibt Fehlermeldungen für Duplikate zurück
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * AUSNAHMEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @skip Internal Nodes
 *   Namen die mit '_' beginnen: _text, _conditional, _iterator
 *
 * @skip List Items
 *   Mit - Prefix erstellte Items (nicht für eindeutigen Namen gedacht)
 *
 * @skip Icons
 *   'icon' ist ein Primitive das mehrfach vorkommen kann
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SICHERHEIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @constant MAX_RECURSION_DEPTH = 100
 *   Verhindert Stack-Overflow bei zirkulären oder sehr tiefen Strukturen
 *
 * @used-by children-merger.ts für Flat Access Resolution
 */

import type { ASTNode } from './types'

/**
 * Maximum recursion depth to prevent stack overflow.
 */
const MAX_RECURSION_DEPTH = 100

/**
 * Primitive data type names used in schema definitions.
 * These should be skipped in uniqueness validation because they're types, not slot names.
 */
const DATA_PRIMITIVE_TYPES = new Set(['text', 'boolean', 'number', 'string', 'date', 'datetime', 'time', 'email', 'url', 'tel', 'password', 'search', 'file', 'image'])

/**
 * Find a child node by name recursively (flat access).
 * Returns the node for in-place modification.
 * @param depth - Current recursion depth (internal use)
 */
export function findChildDeep(children: ASTNode[], name: string, depth: number = 0): ASTNode | null {
  // Prevent stack overflow on deeply nested or circular structures
  if (depth >= MAX_RECURSION_DEPTH) {
    console.warn(`findChildDeep: Max recursion depth (${MAX_RECURSION_DEPTH}) reached`)
    return null
  }

  for (const child of children) {
    if (child.name === name) {
      return child
    }
    // Recurse into nested children
    const found = findChildDeep(child.children, name, depth + 1)
    if (found) {
      return found
    }
  }
  return null
}

/**
 * Collect all element names in a hierarchy for uniqueness validation.
 * Returns a map of name -> array of line numbers where it appears.
 * @param depth - Current recursion depth (internal use)
 */
export function collectNames(children: ASTNode[], names: Map<string, number[]> = new Map(), depth: number = 0): Map<string, number[]> {
  // Prevent stack overflow on deeply nested or circular structures
  if (depth >= MAX_RECURSION_DEPTH) {
    console.warn(`collectNames: Max recursion depth (${MAX_RECURSION_DEPTH}) reached`)
    return names
  }

  for (const child of children) {
    // Skip internal names like _text, _conditional, _iterator
    // Skip list items (created with - prefix) - they're not meant to be unique
    // Skip 'icon' - it's a primitive that can appear multiple times
    // Skip data primitive types (text, boolean, number, etc.) - they're types in schema definitions, not slot names
    const nameLower = child.name.toLowerCase()
    if (!child.name.startsWith('_') && !child._isListItem && nameLower !== 'icon' && !DATA_PRIMITIVE_TYPES.has(nameLower)) {
      const lines = names.get(child.name) || []
      lines.push(child.line ?? 0)
      names.set(child.name, lines)
    }
    // Recurse into nested children
    collectNames(child.children, names, depth + 1)
  }
  return names
}

/**
 * Validate that all element names in a component hierarchy are unique.
 * Returns error messages for duplicates.
 */
export function validateUniqueNames(children: ASTNode[], componentName: string): string[] {
  const names = collectNames(children)
  const errors: string[] = []

  for (const [name, lines] of Array.from(names)) {
    if (lines.length > 1) {
      errors.push(`Error in ${componentName}: Duplicate element name "${name}" on lines ${lines.map(l => l + 1).join(', ')}. Names must be unique for flat access.`)
    }
  }

  return errors
}

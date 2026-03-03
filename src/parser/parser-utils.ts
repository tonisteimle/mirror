/**
 * @module parser-utils
 * @description Parser Utilities - Low-Level Helper Functions
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Hilfsfunktionen für CSS, Node-Traversal und AST-Manipulation
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DIRECTION UTILITIES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function splitDirections(dirValue) → string[]
 *   Splittet kombinierte Directions: 'u-d' → ['u', 'd']
 *   Normalisiert: t→u, b→d
 *
 * @function expandCSSShorthand(values) → {u, r, d, l}
 *   Expandiert CSS-Shorthand: [16] → alle 16
 *   [16, 8] → u/d: 16, l/r: 8
 *   [16, 8, 4] → u: 16, l/r: 8, d: 4
 *   [16, 12, 8, 4] → u: 16, r: 12, d: 8, l: 4
 *
 * @function applySpacingToProperties(props, prefix, values, directions)
 *   Wendet Spacing auf Properties an
 *   Mit Directions: pad_l, pad_r
 *   Ohne: pad (einzeln) oder pad_u/r/d/l (shorthand)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * AST NODE CREATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function createTextNode(content, generateId, line, column) → ASTNode
 *   Erstellt _text Node für Inline-String-Content
 *   name: '_text', content: "Hello World"
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * AST TRAVERSAL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function findNode(nodes, id) → FindNodeResult | null
 *   Sucht Node nach ID, gibt {node, parent, index} zurück
 *
 * @function findNodeRecursive(parent, id) → FindNodeResult | null
 *   Rekursive Suche in Children
 *
 * @function cloneChildrenWithNewIds(children, generateId) → ASTNode[]
 *   Deep-Clone mit neuen IDs für Template-Instanziierung
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SELECTION COMMANDS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function applyCommands(nodes, commands, generateId)
 *   Wendet Selection-Commands auf AST an:
 *   - modify: Property ändern
 *   - addChild: Kind hinzufügen
 *   - addAfter/addBefore: Geschwister hinzufügen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEMPLATE UTILITIES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function createTemplateFromNode(node) → ComponentTemplate
 *   Erstellt Template aus Node-Zustand
 *   Kopiert: properties, content, states, eventHandlers, variables
 *
 * @function applyTemplate(registry, node, scopedName, name, cloneChildren?)
 *   Wendet Template auf Node an
 *   Prüft scopedName zuerst, dann unscoped
 *
 * @constant CSS_COLOR_KEYWORDS
 *   Set mit CSS-Farbnamen: transparent, black, white, etc.
 */

import type { ASTNode, SelectionCommand, ComponentTemplate } from './types'
import { INTERNAL_NODES } from '../constants'
import { normalizeDirection } from '../dsl/properties'

// ============================================
// CSS Constants
// ============================================

/**
 * CSS color keywords that should be treated as color values.
 * These are valid CSS color names that can be used without # or rgb().
 */
export const CSS_COLOR_KEYWORDS = new Set([
  'transparent', 'currentColor', 'inherit',
  'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'gray', 'grey'
])

// ============================================
// Direction Utilities
// ============================================

/**
 * Normalize direction to internal short form.
 * Supports both short (l, r, u, d, t, b) and long (left, right, top, bottom) forms.
 * Examples: t→u, b→d, top→u, bottom→d, left→l, right→r
 */
function normalizeDir(dir: string): string {
  return normalizeDirection(dir)
}

/**
 * Split combined directions like 'u-d' or 't-b' into ['u', 'd']
 * Used for pad/mar/bor with multiple directions.
 * Normalizes t→u and b→d.
 */
export function splitDirections(dirValue: string): string[] {
  // Handle hyphenated: 'u-d' -> ['u', 'd'], 't-b' -> ['u', 'd']
  if (dirValue.includes('-')) {
    return dirValue.split('-').map(normalizeDir)
  }
  // Single direction: 'u' -> ['u'], 't' -> ['u']
  return [normalizeDir(dirValue)]
}

/**
 * Expand CSS shorthand values for padding/margin/border.
 * Converts 1-4 values to individual directional values.
 *
 * @param values Array of 1-4 numeric values
 * @returns Object with u, r, d, l values (top, right, bottom, left)
 */
export function expandCSSShorthand(values: number[]): { u: number; r: number; d: number; l: number } {
  if (values.length === 1) {
    return { u: values[0], r: values[0], d: values[0], l: values[0] }
  } else if (values.length === 2) {
    return { u: values[0], d: values[0], l: values[1], r: values[1] }
  } else if (values.length === 3) {
    return { u: values[0], l: values[1], r: values[1], d: values[2] }
  } else if (values.length >= 4) {
    return { u: values[0], r: values[1], d: values[2], l: values[3] }
  }
  return { u: 0, r: 0, d: 0, l: 0 }
}

/**
 * Apply spacing values (pad/mar) to a properties object.
 * Handles both directional and CSS shorthand values.
 *
 * @param properties Target properties object to modify
 * @param prefix Property prefix ('pad' or 'mar')
 * @param values Array of numeric values (1-4 for CSS shorthand)
 * @param directions Optional array of specific directions to apply
 */
export function applySpacingToProperties(
  properties: Record<string, unknown>,
  prefix: string,
  values: number[],
  directions: string[] = []
): void {
  if (values.length === 0) return

  if (directions.length > 0) {
    // Apply to specific directions
    for (const dir of directions) {
      properties[`${prefix}_${dir}`] = values[0]
    }
  } else if (values.length === 1) {
    // Single value - apply uniformly
    properties[prefix] = values[0]
  } else {
    // CSS shorthand - expand to all directions
    const expanded = expandCSSShorthand(values)
    properties[`${prefix}_u`] = expanded.u
    properties[`${prefix}_r`] = expanded.r
    properties[`${prefix}_d`] = expanded.d
    properties[`${prefix}_l`] = expanded.l
  }
}

// ============================================
// AST Node Creation
// ============================================

/**
 * Create a text node (_text) from a string token.
 * Used for inline string content in components.
 *
 * @param content The text content
 * @param generateId ID generator function, or null for template nodes (id will be empty)
 * @param line Source line number
 * @param column Source column number
 */
export function createTextNode(
  content: string,
  generateId: ((name: string) => string) | null,
  line?: number,
  column?: number
): ASTNode {
  return {
    type: 'component',
    name: INTERNAL_NODES.TEXT,
    id: generateId ? generateId('text') : '',
    properties: {},
    content,
    children: [],
    line,
    column
  }
}

// ============================================
// AST Node Traversal
// ============================================

interface FindNodeResult {
  node: ASTNode
  parent: ASTNode | null
  index: number
}

/**
 * Find a node by ID in a flat list of nodes.
 * Returns the node, its parent (if any), and index.
 */
export function findNode(nodes: ASTNode[], id: string): FindNodeResult | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.id === id) {
      return { node, parent: null, index: i }
    }
    const found = findNodeRecursive(node, id)
    if (found) {
      return found
    }
  }
  return null
}

/**
 * Recursively search for a node by ID within a parent node's children.
 */
export function findNodeRecursive(parent: ASTNode, id: string): FindNodeResult | null {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i]
    if (child.id === id) {
      return { node: child, parent, index: i }
    }
    const found = findNodeRecursive(child, id)
    if (found) {
      return found
    }
  }
  return null
}

// ============================================
// AST Cloning
// ============================================

/**
 * Clone children with new IDs for template instantiation.
 * Creates deep copies of nodes with fresh IDs.
 */
export function cloneChildrenWithNewIds(
  children: ASTNode[],
  generateId: (name: string) => string
): ASTNode[] {
  return children.map(child => ({
    ...child,
    id: generateId(child.name),
    // Deep clone properties to avoid shared references
    properties: { ...child.properties },
    children: cloneChildrenWithNewIds(child.children, generateId)
  }))
}

// ============================================
// Selection Commands
// ============================================

/**
 * Apply selection commands to the AST.
 * Modifies nodes in-place based on commands.
 */
export function applyCommands(
  nodes: ASTNode[],
  commands: SelectionCommand[],
  generateId: (name: string) => string
): void {
  for (const cmd of commands) {
    const found = findNode(nodes, cmd.targetId)
    if (!found) continue

    switch (cmd.type) {
      case 'modify':
        if (cmd.property && cmd.value !== undefined) {
          found.node.properties[cmd.property] = cmd.value
        }
        break

      case 'addChild':
        if (cmd.component) {
          const newNode: ASTNode = {
            ...cmd.component,
            id: generateId(cmd.component.name),
            children: cmd.component.children || []
          }
          found.node.children.push(newNode)
        }
        break

      case 'addAfter':
        if (cmd.component) {
          const newNode: ASTNode = {
            ...cmd.component,
            id: generateId(cmd.component.name),
            children: cmd.component.children || []
          }
          if (found.parent) {
            found.parent.children.splice(found.index + 1, 0, newNode)
          } else {
            nodes.splice(found.index + 1, 0, newNode)
          }
        }
        break

      case 'addBefore':
        if (cmd.component) {
          const newNode: ASTNode = {
            ...cmd.component,
            id: generateId(cmd.component.name),
            children: cmd.component.children || []
          }
          if (found.parent) {
            found.parent.children.splice(found.index, 0, newNode)
          } else {
            nodes.splice(found.index, 0, newNode)
          }
        }
        break
    }
  }
}

// ============================================
// Template Application
// ============================================

/**
 * Create a template object from a node's current state.
 * Used for registering components as templates.
 */
export function createTemplateFromNode(node: ASTNode): ComponentTemplate {
  const template: ComponentTemplate = {
    properties: { ...node.properties },
    content: node.content,
    children: [],
    // Preserve library type for 'as Text' etc.
    _isLibrary: node._isLibrary,
    _libraryType: node._libraryType,
    // Preserve line number for section grouping in ComponentLibraryView
    line: node.line
  }

  // V7: Copy states for component-local state definitions
  if (node.states && node.states.length > 0) {
    template.states = node.states.map(s => ({
      ...s,
      properties: { ...s.properties }
    }))
  }

  // V7: Copy event handlers for component-local events
  if (node.eventHandlers && node.eventHandlers.length > 0) {
    template.eventHandlers = node.eventHandlers.map(h => ({
      ...h,
      actions: [...h.actions]
    }))
  }

  // V7: Copy variables
  if (node.variables && node.variables.length > 0) {
    template.variables = node.variables.map(v => ({ ...v }))
  }

  return template
}

/**
 * Apply a template to a node if it exists in the registry.
 * Checks scoped name first, then falls back to unscoped name.
 *
 * @param registry Component template registry
 * @param node Target node to apply template to
 * @param scopedName Scoped name to check first (e.g., "Parent.Child")
 * @param name Fallback name to check (e.g., "Child")
 * @param cloneChildren Optional function to clone children with new IDs
 */
export function applyTemplate(
  registry: Map<string, ComponentTemplate>,
  node: ASTNode,
  scopedName: string,
  name: string,
  cloneChildren?: (children: ASTNode[]) => ASTNode[]
): void {
  const template = registry.get(scopedName) || registry.get(name)

  if (template) {
    node.properties = { ...template.properties }
    if (template.content) {
      node.content = template.content
    }
    if (cloneChildren && template.children.length > 0) {
      node.children = cloneChildren(template.children)
    }
    // Apply library type from template (for 'as Text' etc.)
    if (template._isLibrary) {
      node._isLibrary = template._isLibrary
    }
    if (template._libraryType) {
      node._libraryType = template._libraryType
    }
  }
}

/**
 * Component Parser Module
 *
 * The core component parsing logic.
 * Parses component definitions and instances with:
 * - Modifiers, properties, and content
 * - Child components
 * - Library component integration
 * - Template inheritance (from keyword)
 * - Conditional rendering (if/else)
 * - Iteration (each)
 *
 * This module has been refactored into smaller, maintainable sub-modules:
 * - types.ts: Type definitions
 * - constants.ts: Constants (HTML_PRIMITIVES, GENERIC_CONTAINERS)
 * - named-instance-parser.ts: Named instance pattern parsing
 * - library-defaults.ts: Library component defaults
 * - children-merger.ts: Children merging logic
 * - template-logic.ts: Template registration and application
 * - inline-properties.ts: Inline properties, events, conditionals
 */

import type { ParserContext } from '../parser-context'
import type { ASTNode } from './types'
import { cloneChildrenWithNewIds } from '../parser-context'
import { validateUniqueNames } from '../component-validation'
import { parseIterator } from '../iterator-parser'
import { parseChildren as parseChildrenImpl } from '../children-parser'
import { applyTemplate, createTemplateFromNode } from '../parser-utils'

// Import sub-modules
import { parseNamedInstance } from './named-instance-parser'
import { applyLibraryDefaults } from './library-defaults'
import { mergeInstanceChildren } from './children-merger'
import { handleTemplateLogic, saveToTemplate } from './template-logic'
import { parseInlineProperties } from './inline-properties'

// Re-export types for backwards compatibility
export * from './types'
export { HTML_PRIMITIVES, GENERIC_CONTAINERS } from './constants'
export { parseNamedInstance } from './named-instance-parser'
export { applyLibraryDefaults } from './library-defaults'
export { mergeInstanceChildren, mergeChildrenRecursive } from './children-merger'
export { handleTemplateLogic, copyTemplateExtras, saveToTemplate } from './template-logic'
export { parseInlineProperties, parseInlineEventHandler, parseInlineConditional, parseInlineConditionalProperties } from './inline-properties'

/**
 * Parse a component definition or instance.
 *
 * @param ctx Parser context
 * @param baseIndent Base indentation level
 * @param parentScope Optional parent scope for scoped naming
 * @param isExplicitDefinition Whether this is an explicit definition (with colon)
 * @param isChildOfDefinition Whether this is a child of a definition
 * @returns Parsed AST node or null
 */
export function parseComponent(
  ctx: ParserContext,
  baseIndent: number,
  parentScope?: string,
  isExplicitDefinition = false,
  isChildOfDefinition = false
): ASTNode | null {
  const token = ctx.current()
  if (!token || (token.type !== 'COMPONENT_NAME' && token.type !== 'COMPONENT_DEF')) {
    return null
  }

  const startToken = token
  let componentName = ctx.advance().value

  if (startToken.type === 'COMPONENT_DEF') {
    isExplicitDefinition = true
  }

  // Parse named instance patterns
  const namedResult = parseNamedInstance(ctx, componentName, isExplicitDefinition)
  componentName = namedResult.componentName
  isExplicitDefinition = namedResult.isExplicitDefinition
  const { instanceName, componentType, libraryType } = namedResult

  // Determine the scoped name for registry lookup/storage
  const scopedName = parentScope ? `${parentScope}.${componentName}` : componentName

  const node: ASTNode = {
    type: 'component',
    name: componentName,
    id: ctx.generateId(componentName),
    properties: {},
    children: [],
    line: startToken.line,
    column: startToken.column
  }

  // Set instance name if this is a named instance
  if (instanceName) {
    node.instanceName = instanceName
  }

  // Mark if this is an explicit definition (with colon)
  if (isExplicitDefinition) {
    node._isExplicitDefinition = true
  }

  // Mark the component type for rendering (if different from name)
  if (componentType) {
    node.properties._primitiveType = componentType
  }

  // Apply library component defaults (states, slot properties)
  applyLibraryDefaults(ctx, node, libraryType, parentScope, startToken)

  // Collect inline child slots (to be merged after template application)
  const inlineSlots: ASTNode[] = []

  // Check for "from" keyword: NewComponent from BaseComponent ...
  if (ctx.current()?.type === 'KEYWORD' && ctx.current()?.value === 'from') {
    ctx.advance() // consume 'from'

    // Get base component name and apply its template
    if (ctx.current()?.type === 'COMPONENT_NAME') {
      const baseComponentName = ctx.advance().value
      applyTemplate(
        ctx.registry,
        node,
        baseComponentName,
        baseComponentName,
        (children) => cloneChildrenWithNewIds(children, ctx.generateId.bind(ctx))
      )
    }
  }

  // Parse properties and content on the same line
  parseInlineProperties(ctx, node, componentName, inlineSlots)

  // Check if this instance has its own properties
  const hasOwnProps = Object.keys(node.properties).length > 0

  // Handle template registration/application
  handleTemplateLogic(ctx, node, scopedName, componentName, isExplicitDefinition, isChildOfDefinition, hasOwnProps)

  // Register named instances as templates for reuse
  // e.g., Input Email "placeholder" -> registers Email as reusable template
  if (instanceName && !isExplicitDefinition) {
    ctx.registry.set(instanceName, createTemplateFromNode(node))
  }

  // Merge inline slots: replace matching children or add new ones
  for (const slot of inlineSlots) {
    const existingIndex = node.children.findIndex(c => c.name === slot.name)
    if (existingIndex >= 0) {
      node.children[existingIndex] = slot
    } else {
      node.children.push(slot)
    }
  }

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse children (using dependency injection to avoid circular imports)
  // For library components with as syntax, use libraryType as parent scope for slot validation
  // Use scopedName so template lookups work correctly (e.g., Dropdown.Content instead of just Content)
  const parentScopeForChildren = libraryType || scopedName
  const instanceChildren = parseChildrenImpl(
    ctx, node, baseIndent, parentScopeForChildren,
    parseComponent,
    (ctx, childIndent, compName, parseFn) => parseIterator(ctx, childIndent, compName, parseFn)
  )

  // Merge instance children with template children using flat access
  mergeInstanceChildren(node, instanceChildren, isExplicitDefinition)

  // Save children to template (for both explicit and implicit definitions)
  saveToTemplate(ctx, node, scopedName, isExplicitDefinition)

  // Validate unique names for flat access (only for explicit definitions, skip library components)
  // Library components can have multiple slots with the same name (e.g., Tab, TabContent)
  if (isExplicitDefinition && node.children.length > 0 && !libraryType) {
    const nameErrors = validateUniqueNames(node.children, componentName)
    ctx.errors.push(...nameErrors)
  }

  // Track end position - use the previous token's position
  // (current token is already past the component)
  const prevToken = ctx.peek(-1)
  if (prevToken) {
    node.endLine = prevToken.line
    node.endColumn = prevToken.column + prevToken.value.length
  }

  return node
}

/**
 * Template Logic Module
 *
 * Handles template registration and application logic.
 */

import type { ParserContext } from '../parser-context'
import type { ASTNode, ComponentTemplate } from './types'
import { cloneChildrenWithNewIds } from '../parser-context'
import { createTemplateFromNode } from '../parser-utils'
import { GENERIC_CONTAINERS } from './constants'

/**
 * Copy states, variables, event handlers, and library type from template to node.
 *
 * @param template Source template
 * @param node Target node
 */
export function copyTemplateExtras(
  template: ComponentTemplate,
  node: ASTNode
): void {
  if (template.states && template.states.length > 0) {
    node.states = template.states.map(s => ({ ...s, properties: { ...s.properties } }))
  }
  if (template.variables && template.variables.length > 0) {
    node.variables = template.variables.map(v => ({ ...v }))
  }
  if (template.eventHandlers && template.eventHandlers.length > 0) {
    node.eventHandlers = template.eventHandlers.map(h => ({ ...h, actions: [...h.actions] }))
  }
  // Copy library type (for 'as Text' etc.)
  if (template._isLibrary) {
    node._isLibrary = template._isLibrary
  }
  if (template._libraryType) {
    node._libraryType = template._libraryType
  }
  // Copy animation definitions
  if (template.showAnimation) {
    node.showAnimation = { ...template.showAnimation }
  }
  if (template.hideAnimation) {
    node.hideAnimation = { ...template.hideAnimation }
  }
  if (template.continuousAnimation) {
    node.continuousAnimation = { ...template.continuousAnimation }
  }
}

/**
 * Handle template registration and application logic.
 *
 * @param ctx Parser context
 * @param node Target node
 * @param scopedName Scoped name for registry lookup
 * @param componentName Component name
 * @param isExplicitDefinition Whether this is an explicit definition
 * @param isChildOfDefinition Whether this is a child of a definition
 * @param hasOwnProps Whether the node has its own properties
 */
export function handleTemplateLogic(
  ctx: ParserContext,
  node: ASTNode,
  scopedName: string,
  componentName: string,
  isExplicitDefinition: boolean,
  isChildOfDefinition: boolean,
  hasOwnProps: boolean
): void {
  if (isExplicitDefinition) {
    // Explicit definition: save as template
    ctx.registry.set(scopedName, createTemplateFromNode(node))
  } else {
    // Instance: apply template first, then override with local props
    const template = ctx.registry.get(scopedName) || ctx.registry.get(componentName)
    if (template) {
      // Save inline _text child before applying template (created from inline string)
      const inlineTextChild = node.children.find(c => c.name === '_text')

      // Merge: template first, then node's own values override
      node.properties = { ...template.properties, ...node.properties }

      // Only apply template content if no content was specified
      if (!node.content && template.content) {
        node.content = template.content
      }

      // Clone template children with new IDs
      if (template.children.length > 0) {
        node.children = cloneChildrenWithNewIds(template.children, ctx.generateId.bind(ctx))

        // If we had an inline _text child, use it instead of the template's _text
        if (inlineTextChild) {
          const templateTextIndex = node.children.findIndex(c => c.name === '_text')
          if (templateTextIndex >= 0) {
            // Replace template's _text with inline _text (preserves template text properties like color)
            const templateText = node.children[templateTextIndex]
            node.children[templateTextIndex] = {
              ...templateText,
              ...inlineTextChild,
              // Merge properties: template first, then inline overrides
              properties: { ...templateText.properties, ...inlineTextChild.properties }
            }
          } else {
            // Template had no _text, add the inline one
            node.children.push(inlineTextChild)
          }
        }
      }

      // Copy states, variables, eventHandlers
      copyTemplateExtras(template, node)
    }

    // Children of a definition with their own props should be registered
    if (isChildOfDefinition && hasOwnProps) {
      ctx.registry.set(scopedName, createTemplateFromNode(node))
    }

    // Implicit inheritance: first usage with properties becomes the template
    // This allows: Button #blue "Click"  ->  Button "Other" (inherits #blue)
    // EXCLUDE generic containers like Box - they should NOT inherit implicitly
    const isGenericContainer = GENERIC_CONTAINERS.includes(node.name)
    if (hasOwnProps && !template && !isChildOfDefinition && !isGenericContainer) {
      ctx.registry.set(scopedName, createTemplateFromNode(node))
    }
  }
}

/**
 * Save children and other node data to template after parsing.
 *
 * @param ctx Parser context
 * @param node The parsed node
 * @param scopedName Scoped name for registry lookup
 * @param isExplicitDefinition Whether this is an explicit definition
 */
export function saveToTemplate(
  ctx: ParserContext,
  node: ASTNode,
  scopedName: string,
  isExplicitDefinition: boolean
): void {
  const template = ctx.registry.get(scopedName)
  if (!template) return

  // Check if this is the defining instance (not an inheriting one)
  // For explicit definitions, always save. For implicit, only if template has no children yet.
  const isDefiningInstance = isExplicitDefinition || template.children.length === 0
  if (!isDefiningInstance) return

  // Save children
  if (node.children.length > 0) {
    template.children = node.children.map(child => ({
      ...child,
      id: '' // Clear ID for template - will be regenerated on instantiation
    }))
  }

  // V7: Save component-local event handlers to template
  if (node.eventHandlers && node.eventHandlers.length > 0) {
    template.eventHandlers = node.eventHandlers.map(h => ({
      ...h,
      actions: [...h.actions]
    }))
  }

  // V7: Save component-local states to template
  if (node.states && node.states.length > 0) {
    template.states = node.states.map(s => ({
      ...s,
      properties: { ...s.properties }
    }))
  }

  // V7: Save component-local variables to template
  if (node.variables && node.variables.length > 0) {
    template.variables = node.variables.map(v => ({ ...v }))
  }

  // V8: Save animation definitions to template
  if (node.showAnimation) {
    template.showAnimation = { ...node.showAnimation }
  }
  if (node.hideAnimation) {
    template.hideAnimation = { ...node.hideAnimation }
  }
  if (node.continuousAnimation) {
    template.continuousAnimation = { ...node.continuousAnimation }
  }
}

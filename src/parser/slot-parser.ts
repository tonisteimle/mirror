/**
 * Slot Parser Module
 *
 * Parses inline child slots for component instances.
 * Handles patterns like: ProductTile Name "text" Price "price"
 */

import type { ParserContext } from './parser-context'
import type { ASTNode } from './types'
import { splitDirections, applySpacingToProperties, applyTemplate, createTemplateFromNode } from './parser-utils'

/**
 * Parse an inline child slot (e.g., "ProductTile Name "text" Price "price"")
 */
export function parseInlineChildSlot(ctx: ParserContext, componentName: string): ASTNode | null {
  const token = ctx.current()!
  const childName = token.value
  const scopedChildName = `${componentName}.${childName}`

  ctx.advance() // consume child name

  const childNode: ASTNode = {
    type: 'component',
    name: childName,
    id: ctx.generateId(childName),
    properties: {},
    children: [],
    line: token.line,
    column: token.column
  }

  // Apply template if exists
  applyTemplate(ctx.registry, childNode, scopedChildName, childName)

  // Parse inline properties and content for this child
  while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
    const childToken = ctx.current()!

    if (childToken.type === 'PROPERTY') {
      parseInlineChildProperty(ctx, childNode)
    } else if (childToken.type === 'STRING') {
      childNode.content = ctx.advance().value
      // Content ends this child's properties - break to handle next inline child
      break
    } else if (childToken.type === 'COMPONENT_NAME') {
      // This is a nested child - add as child of current childNode
      const nestedNode = parseNestedInlineChild(ctx, childName)
      if (nestedNode) {
        childNode.children.push(nestedNode)
      }
    } else {
      break
    }
  }

  // Register child as template if it has properties
  const childHasDef = Object.keys(childNode.properties).length > 0
  if (childHasDef) {
    ctx.registry.set(childName, createTemplateFromNode(childNode))
  }

  return childNode
}

/**
 * Parse property for inline child.
 */
function parseInlineChildProperty(ctx: ParserContext, childNode: ASTNode): void {
  const propName = ctx.advance().value

  // Handle pad/mar/bor with CSS shorthand
  if (propName === 'pad' || propName === 'mar' || propName === 'bor') {
    const directions: string[] = []
    while (ctx.current()?.type === 'DIRECTION') {
      directions.push(...splitDirections(ctx.advance().value))
    }
    const values: number[] = []
    while (ctx.current()?.type === 'NUMBER') {
      values.push(parseInt(ctx.advance().value, 10))
    }
    applySpacingToProperties(childNode.properties, propName, values, directions)
  } else {
    const next = ctx.current()
    if (next && (next.type === 'NUMBER' || next.type === 'COLOR')) {
      childNode.properties[propName] = next.type === 'NUMBER'
        ? parseInt(ctx.advance().value, 10)
        : ctx.advance().value
    } else {
      childNode.properties[propName] = true
    }
  }
}

/**
 * Parse nested inline child (2 levels deep).
 */
export function parseNestedInlineChild(ctx: ParserContext, childName: string): ASTNode | null {
  const token = ctx.current()!
  const nestedName = token.value
  const nestedScopedName = `${childName}.${nestedName}`
  ctx.advance() // consume nested child name

  const nestedNode: ASTNode = {
    type: 'component',
    name: nestedName,
    id: ctx.generateId(nestedName),
    properties: {},
    children: [],
    line: token.line,
    column: token.column
  }

  // Apply template if exists
  applyTemplate(ctx.registry, nestedNode, nestedScopedName, nestedName)

  // Parse properties for nested child
  while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
    const nt = ctx.current()!
    if (nt.type === 'PROPERTY') {
      parseInlineChildProperty(ctx, nestedNode)
    } else if (nt.type === 'STRING') {
      nestedNode.content = ctx.advance().value
    } else if (nt.type === 'COMPONENT_NAME') {
      // Further nesting - for now just break (2 levels deep is enough for most cases)
      break
    } else {
      break
    }
  }

  // Register nested child as template if it has properties
  const nestedHasDef = Object.keys(nestedNode.properties).length > 0
  if (nestedHasDef) {
    ctx.registry.set(nestedName, createTemplateFromNode(nestedNode))
  }

  return nestedNode
}

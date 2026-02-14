/**
 * Tag Mapper
 *
 * Maps Mirror component names to appropriate HTML tags.
 */

import type { ASTNode } from '../../parser/types'

/**
 * Primitive components that map to specific HTML tags
 */
const PRIMITIVE_TAGS: Record<string, string> = {
  Button: 'button',
  Input: 'input',
  Textarea: 'textarea',
  Image: 'img',
  Link: 'a',
}

/**
 * Self-closing HTML tags (no children allowed)
 */
const SELF_CLOSING_TAGS = new Set(['input', 'img', 'br', 'hr'])

/**
 * Get the HTML tag for a component
 *
 * @example
 * getHtmlTag(buttonNode) // 'button'
 * getHtmlTag(boxNode)    // 'div'
 * getHtmlTag(inputNode)  // 'input'
 */
export function getHtmlTag(node: ASTNode): string {
  // Check primitive type first
  const primitiveType = node.properties._primitiveType as string | undefined
  if (primitiveType && PRIMITIVE_TAGS[primitiveType]) {
    return PRIMITIVE_TAGS[primitiveType]
  }

  // Check component name
  if (PRIMITIVE_TAGS[node.name]) {
    return PRIMITIVE_TAGS[node.name]
  }

  // Default to div
  return 'div'
}

/**
 * Check if a tag is self-closing
 */
export function isSelfClosingTag(tag: string): boolean {
  return SELF_CLOSING_TAGS.has(tag)
}

/**
 * Check if a node represents a primitive HTML element
 */
export function isPrimitiveNode(node: ASTNode): boolean {
  const primitiveType = node.properties._primitiveType as string | undefined
  return !!(primitiveType || PRIMITIVE_TAGS[node.name])
}

/**
 * Primitive Type Checkers
 *
 * Functions to check if an AST node is a specific primitive type.
 * Separated from renderers to avoid react-refresh issues.
 */

import type { ASTNode } from '../../parser/parser'
import { isHeadingComponent, getHeadingLevel, isSegmentComponent } from '../../parser/sugar/component-type-matcher'

/**
 * Factory for creating primitive type checkers.
 * Reduces code duplication for is*Primitive functions.
 */
function createPrimitiveChecker(typeName: string, checkPrimitiveType = true): (node: ASTNode) => boolean {
  return (node: ASTNode): boolean => {
    if (checkPrimitiveType && node.properties._primitiveType === typeName) return true
    if (node.name === typeName) return true
    if (node.name.endsWith(typeName)) return true
    return false
  }
}

/** Check if node is an Input primitive. */
export const isInputPrimitive = createPrimitiveChecker('Input')

/** Check if node is a Textarea primitive. */
export const isTextareaPrimitive = createPrimitiveChecker('Textarea')

/** Check if node is a Link primitive. */
export const isLinkPrimitive = createPrimitiveChecker('Link')

/** Check if node is an Icon component. */
export const isIconComponent = createPrimitiveChecker('Icon', false)

/** Check if node is an Image component. */
export const isImageComponent = createPrimitiveChecker('Image')

/**
 * Check if node is a Heading primitive (H1-H6).
 */
export function isHeadingPrimitive(node: ASTNode): boolean {
  return isHeadingComponent(node)
}

// Re-export heading and segment utilities
export { isHeadingComponent, getHeadingLevel, isSegmentComponent }

/**
 * Check if a node is a Segment primitive.
 */
export function isSegmentPrimitive(node: ASTNode): boolean {
  return (
    node.properties._primitiveType === 'Segment' ||
    node.name === 'Segment' ||
    node.name.endsWith('Segment')
  )
}

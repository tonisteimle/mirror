/**
 * Primitive Type Checkers
 *
 * Functions to check if an AST node is a specific primitive type.
 * Separated from renderers to avoid react-refresh issues.
 */

import type { ASTNode } from '../../parser/parser'
import { isHeadingComponent, getHeadingLevel, isSegmentComponent, isSelectComponent } from '../../parser/sugar/component-type-matcher'

/**
 * Factory for creating primitive type checkers.
 * Reduces code duplication for is*Primitive functions.
 *
 * Note: We intentionally do NOT use endsWith() because it causes false positives.
 * For example, "SelectorInput" would match "Input" even though it's a container
 * with an Input child, not an Input primitive itself.
 *
 * Named primitives use _primitiveType (set via "as" syntax or old "Input Email:" syntax).
 */
function createPrimitiveChecker(typeName: string, checkPrimitiveType = true): (node: ASTNode) => boolean {
  return (node: ASTNode): boolean => {
    if (checkPrimitiveType && node.properties._primitiveType === typeName) return true
    if (node.name === typeName) return true
    return false
  }
}

/**
 * Check if node is a Button primitive.
 * Note: Button is NOT a primitive anymore - users can define their own Button component.
 * This only matches if _primitiveType is explicitly set to 'Button' (legacy support).
 * A component named 'Button' will NOT be treated as a primitive.
 */
export function isButtonPrimitive(node: ASTNode): boolean {
  return node.properties._primitiveType === 'Button'
}

/** Check if node is an Input primitive. */
export const isInputPrimitive = createPrimitiveChecker('Input')

/** Check if node is a Textarea primitive. */
export const isTextareaPrimitive = createPrimitiveChecker('Textarea')

/** Check if node is a Link primitive. */
export const isLinkPrimitive = createPrimitiveChecker('Link')

/** Check if node is an Icon component (case-insensitive: Icon, icon). */
export function isIconComponent(node: ASTNode): boolean {
  const nameLower = node.name.toLowerCase()
  return (
    node.properties._primitiveType === 'Icon' ||
    nameLower === 'icon'
  )
}

/** Check if node is an Image component. */
export const isImageComponent = createPrimitiveChecker('Image')

/**
 * Check if node is a Heading primitive (H1-H6).
 */
export function isHeadingPrimitive(node: ASTNode): boolean {
  return isHeadingComponent(node)
}

// Re-export heading and segment utilities
export { isHeadingComponent, getHeadingLevel, isSegmentComponent, isSelectComponent }

/**
 * Check if a node is a Segment primitive.
 */
export function isSegmentPrimitive(node: ASTNode): boolean {
  return (
    node.properties._primitiveType === 'Segment' ||
    node.name === 'Segment'
  )
}

/**
 * Check if a node is a Select primitive (native select with appearance: base-select).
 */
export function isSelectPrimitive(node: ASTNode): boolean {
  return (
    node.properties._primitiveType === 'Select' ||
    node.name === 'Select'
  )
}

/**
 * Check if a node is an Option primitive (for native select options).
 */
export function isOptionPrimitive(node: ASTNode): boolean {
  return (
    node.properties._primitiveType === 'Option' ||
    node.name === 'Option'
  )
}

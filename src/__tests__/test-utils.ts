/**
 * Test Utilities
 *
 * Shared helper functions for testing React components and DSL generation.
 * Import these instead of duplicating in individual test files.
 */
import React from 'react'
import { parse, type ParseResult } from '../parser/parser'
import { generateReactElement } from '../generator/react-generator'

/**
 * Extract style object from a React element.
 */
export function getStyle(node: React.ReactNode): React.CSSProperties {
  if (React.isValidElement(node)) {
    return (node.props as { style?: React.CSSProperties }).style || {}
  }
  return {}
}

/**
 * Extract all props from a React element.
 */
export function getProps(node: React.ReactNode): Record<string, unknown> {
  if (React.isValidElement(node)) {
    return node.props as Record<string, unknown>
  }
  return {}
}

/**
 * Extract children from a React element as an array.
 */
export function getChildren(node: React.ReactNode): React.ReactNode[] {
  if (React.isValidElement(node)) {
    const children = (node.props as { children?: React.ReactNode }).children
    if (Array.isArray(children)) return children
    if (children) return [children]
  }
  return []
}

/**
 * Recursively extract text content from nested React elements.
 */
export function getTextContent(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (node === null || node === undefined) return ''
  if (Array.isArray(node)) {
    return node.map(getTextContent).join('')
  }
  if (React.isValidElement(node)) {
    const children = (node.props as { children?: React.ReactNode }).children
    return getTextContent(children)
  }
  return ''
}

/**
 * Parse DSL and generate React element (returns first element).
 */
export function generate(dsl: string): React.ReactNode {
  const result = parse(dsl)
  const elements = generateReactElement(result.nodes)
  return Array.isArray(elements) ? elements[0] : elements
}

/**
 * Parse DSL and generate all React elements as an array.
 */
export function generateAll(dsl: string): React.ReactNode[] {
  const result = parse(dsl)
  const elements = generateReactElement(result.nodes)
  return Array.isArray(elements) ? elements : [elements]
}

/**
 * Get the first child element from a React node.
 */
export function getFirstChild(node: React.ReactNode): React.ReactNode {
  const children = getChildren(node)
  return children[0] || null
}

/**
 * Get a specific prop value from a React element.
 */
export function getProp<T = unknown>(node: React.ReactNode, propName: string): T | undefined {
  const props = getProps(node)
  return props[propName] as T | undefined
}

/**
 * Check if a React element has a specific className.
 */
export function hasClassName(node: React.ReactNode, className: string): boolean {
  const props = getProps(node)
  const nodeClassName = props.className as string | undefined
  if (!nodeClassName) return false
  return nodeClassName.split(' ').includes(className)
}

/**
 * Find a child element by className.
 */
export function findByClassName(node: React.ReactNode, className: string): React.ReactNode | null {
  if (hasClassName(node, className)) return node

  const children = getChildren(node)
  for (const child of children) {
    const found = findByClassName(child, className)
    if (found) return found
  }

  return null
}

// =============================================================================
// EXTENDED HELPERS (Phase 5)
// =============================================================================

/**
 * Assert parse result has no errors (excluding warnings).
 */
export function assertNoErrors(result: ParseResult): void {
  const errors = result.errors.filter(e => !e.startsWith('Warning:'))
  if (errors.length > 0) {
    throw new Error(`Parse errors: ${errors.join(', ')}`)
  }
}

/**
 * Parse DSL and check for errors.
 * Returns the parse result if no errors, throws otherwise.
 */
export function parseWithoutErrors(dsl: string): ParseResult {
  const result = parse(dsl)
  assertNoErrors(result)
  return result
}

/**
 * Parse and generate React elements in one step.
 * Returns both the parse result and generated elements.
 */
export function parseAndGenerate(dsl: string): {
  result: ParseResult
  elements: React.ReactNode[]
} {
  const result = parse(dsl)
  const elements = generateReactElement(result.nodes)
  return {
    result,
    elements: Array.isArray(elements) ? elements : [elements],
  }
}

/**
 * Get nth child element.
 */
export function getNthChild(element: React.ReactNode, index: number): React.ReactNode | undefined {
  const children = getChildren(element)
  return children[index]
}

/**
 * Count direct children.
 */
export function countChildren(element: React.ReactNode): number {
  return getChildren(element).length
}

/**
 * Find elements matching a predicate recursively.
 */
export function findAll(
  node: React.ReactNode,
  predicate: (node: React.ReactNode) => boolean
): React.ReactNode[] {
  const results: React.ReactNode[] = []

  if (predicate(node)) {
    results.push(node)
  }

  const children = getChildren(node)
  for (const child of children) {
    results.push(...findAll(child, predicate))
  }

  return results
}

/**
 * Find first element matching a predicate.
 */
export function findFirst(
  node: React.ReactNode,
  predicate: (node: React.ReactNode) => boolean
): React.ReactNode | null {
  if (predicate(node)) return node

  const children = getChildren(node)
  for (const child of children) {
    const found = findFirst(child, predicate)
    if (found) return found
  }

  return null
}

/**
 * Check if element has specific style property value.
 */
export function hasStyle(
  node: React.ReactNode,
  property: keyof React.CSSProperties,
  value: unknown
): boolean {
  const style = getStyle(node)
  return style[property] === value
}

/**
 * Get element type (tag name or component name).
 */
export function getElementType(node: React.ReactNode): string | null {
  if (React.isValidElement(node)) {
    const type = node.type
    if (typeof type === 'string') return type
    if (typeof type === 'function') return type.name || 'Unknown'
  }
  return null
}

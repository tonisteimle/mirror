/**
 * Style Assertions
 *
 * Helper functions for asserting CSS styles on generated React elements.
 */
import React from 'react'
import { getStyle, generate } from '../test-utils'
import { parse } from '../../parser/parser'
import { propertiesToStyle } from '../../utils/style-converter'

/**
 * Assert that an element has a specific style property value.
 */
export function expectStyle(
  element: React.ReactNode,
  property: keyof React.CSSProperties,
  expected: unknown
): void {
  const style = getStyle(element)
  expect(style[property]).toBe(expected)
}

/**
 * Assert that an element has multiple style properties.
 */
export function expectStyles(
  element: React.ReactNode,
  expected: Partial<React.CSSProperties>
): void {
  const style = getStyle(element)
  for (const [key, value] of Object.entries(expected)) {
    expect(style[key as keyof React.CSSProperties]).toBe(value)
  }
}

/**
 * Parse DSL and compute styles directly using propertiesToStyle.
 * This is more reliable than trying to extract styles from rendered elements
 * since the generator wraps elements in interactive components.
 */
export function getGeneratedStyle(dsl: string): React.CSSProperties {
  const result = parse(dsl)
  const node = result.nodes[0]
  if (!node) return {}
  const hasChildren = node.children && node.children.length > 0
  return propertiesToStyle(node.properties, hasChildren, node.name)
}

/**
 * Assert that a DSL string generates specific styles.
 */
export function expectDSLStyle(
  dsl: string,
  property: keyof React.CSSProperties,
  expected: unknown
): void {
  const style = getGeneratedStyle(dsl)
  expect(style[property]).toBe(expected)
}

/**
 * Assert that a DSL string generates multiple styles.
 */
export function expectDSLStyles(
  dsl: string,
  expected: Partial<React.CSSProperties>
): void {
  const style = getGeneratedStyle(dsl)
  for (const [key, value] of Object.entries(expected)) {
    expect(style[key as keyof React.CSSProperties]).toBe(value)
  }
}

/**
 * Assert that an element does NOT have a specific style property set.
 */
export function expectNoStyle(
  element: React.ReactNode,
  property: keyof React.CSSProperties
): void {
  const style = getStyle(element)
  expect(style[property]).toBeUndefined()
}

/**
 * Get all style properties from an element as a typed object.
 */
export function getStyleMap(element: React.ReactNode): Map<string, unknown> {
  const style = getStyle(element)
  return new Map(Object.entries(style))
}

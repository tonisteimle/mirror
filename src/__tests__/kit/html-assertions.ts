/**
 * HTML Structure Assertions
 *
 * Helper functions for asserting HTML structure on generated React elements.
 */
import React from 'react'
import { getProps, getChildren, hasClassName, findByClassName } from '../test-utils'

/**
 * Assert that an element renders as a specific HTML tag.
 */
export function expectTag(element: React.ReactNode, tagName: string): void {
  if (!React.isValidElement(element)) {
    throw new Error('Expected a valid React element')
  }
  expect(element.type).toBe(tagName)
}

/**
 * Assert that an element has a specific number of children.
 */
export function expectChildCount(element: React.ReactNode, count: number): void {
  const children = getChildren(element)
  expect(children).toHaveLength(count)
}

/**
 * Assert that an element has a specific data attribute.
 */
export function expectDataAttribute(
  element: React.ReactNode,
  attr: string,
  value?: string
): void {
  const props = getProps(element)
  const dataKey = attr.startsWith('data-') ? attr : `data-${attr}`
  if (value !== undefined) {
    expect(props[dataKey]).toBe(value)
  } else {
    expect(props[dataKey]).toBeDefined()
  }
}

/**
 * Assert that an element has a specific className.
 */
export function expectClassName(element: React.ReactNode, className: string): void {
  expect(hasClassName(element, className)).toBe(true)
}

/**
 * Assert that an element has a specific prop value.
 */
export function expectProp<T = unknown>(
  element: React.ReactNode,
  propName: string,
  expected: T
): void {
  const props = getProps(element)
  expect(props[propName]).toBe(expected)
}

/**
 * Assert that an element has a prop defined (any value).
 */
export function expectPropDefined(element: React.ReactNode, propName: string): void {
  const props = getProps(element)
  expect(props[propName]).toBeDefined()
}

/**
 * Assert that an element contains a child with a specific className.
 */
export function expectContainsChild(element: React.ReactNode, className: string): void {
  const found = findByClassName(element, className)
  expect(found).not.toBeNull()
}

/**
 * Assert that an element does NOT contain a child with a specific className.
 */
export function expectNotContainsChild(element: React.ReactNode, className: string): void {
  const found = findByClassName(element, className)
  expect(found).toBeNull()
}

/**
 * Get the element type (tag name or component name).
 */
export function getElementTag(element: React.ReactNode): string | null {
  if (!React.isValidElement(element)) return null
  const type = element.type
  if (typeof type === 'string') return type
  if (typeof type === 'function') return type.name || 'Anonymous'
  return null
}

/**
 * Assert that a nested structure matches expectations.
 */
export interface ElementStructure {
  tag?: string
  className?: string
  props?: Record<string, unknown>
  childCount?: number
}

export function expectStructure(
  element: React.ReactNode,
  expected: ElementStructure
): void {
  if (expected.tag) {
    expectTag(element, expected.tag)
  }
  if (expected.className) {
    expectClassName(element, expected.className)
  }
  if (expected.props) {
    const props = getProps(element)
    for (const [key, value] of Object.entries(expected.props)) {
      expect(props[key]).toBe(value)
    }
  }
  if (expected.childCount !== undefined) {
    expectChildCount(element, expected.childCount)
  }
}

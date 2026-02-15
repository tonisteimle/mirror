/**
 * DSL Test Runner Infrastructure
 *
 * Provides a declarative way to test the Mirror DSL pipeline:
 * DSL Text → Lexer → Parser → AST → React Generator → React Elements
 *
 * Usage:
 * ```typescript
 * runSyntaxTests('padding', [
 *   { name: 'single value', input: 'Box pad 16', expect: { render: { style: { padding: '16px' }}}},
 *   { name: 'two values', input: 'Box pad 16 8', expect: { render: { style: { padding: '16px 8px' }}}},
 * ])
 * ```
 */

import { describe, it, expect } from 'vitest'
import type React from 'react'
import { parse } from '../../../parser/parser'
import type { ParseResult, ASTNode } from '../../../parser/types'
import { generateReactElement } from '../../../generator/react-generator'
import { getStyle, getChildren, getTextContent, getProps } from '../../test-utils'

// ============================================
// Types
// ============================================

export interface SyntaxTest {
  /** Test name */
  name: string
  /** DSL code to test */
  input: string
  /** Expected outcomes */
  expect: TestExpectations
  /** Skip this test */
  skip?: boolean
  /** Only run this test */
  only?: boolean
}

export interface TestExpectations {
  /** Parser expectations */
  parse?: ParseExpectations
  /** React rendering expectations */
  render?: RenderExpectations
  /** Should have parse errors */
  error?: boolean | string
}

export interface ParseExpectations {
  /** Expected number of AST nodes */
  nodes?: number
  /** Expected parse errors */
  errors?: string[]
  /** Properties on first node */
  properties?: Record<string, unknown>
  /** First node name */
  name?: string
  /** First node has children */
  hasChildren?: boolean
  /** Number of children on first node */
  childCount?: number
  /** Child node names */
  childNames?: string[]
}

export interface RenderExpectations {
  /** Expected CSS style properties on root element */
  style?: Partial<React.CSSProperties>
  /** Expected number of children */
  children?: number
  /** Expected text content */
  text?: string
  /** Element type (div, span, input, etc.) */
  elementType?: string
  /** Expected props on root element */
  props?: Record<string, unknown>
  /** Styles that should NOT be present */
  noStyle?: (keyof React.CSSProperties)[]
  /** Props that should NOT be present */
  noProps?: string[]
}

// ============================================
// Test Runner
// ============================================

/**
 * Run a batch of syntax tests for a specific feature.
 *
 * @param featureName - Name of the feature being tested (e.g., "padding")
 * @param tests - Array of test cases
 */
export function runSyntaxTests(featureName: string, tests: SyntaxTest[]): void {
  describe(featureName, () => {
    for (const test of tests) {
      const testFn = test.only ? it.only : test.skip ? it.skip : it
      testFn(test.name, () => runSingleTest(test))
    }
  })
}

/**
 * Run a single test case.
 */
function runSingleTest(test: SyntaxTest): void {
  const { input, expect: expectations } = test

  // Parse the DSL
  const parseResult = parse(input)

  // Check for expected errors
  if (expectations.error) {
    if (typeof expectations.error === 'string') {
      expect(parseResult.errors.some(e => e.includes(expectations.error as string))).toBe(true)
    } else {
      expect(parseResult.errors.length).toBeGreaterThan(0)
    }
    return
  }

  // Verify no unexpected errors (excluding warnings)
  const errors = parseResult.errors.filter(e => !e.startsWith('Warning:'))
  if (errors.length > 0 && !expectations.parse?.errors) {
    throw new Error(`Unexpected parse errors: ${errors.join(', ')}`)
  }

  // Check parse expectations
  if (expectations.parse) {
    verifyParseExpectations(parseResult, expectations.parse)
  }

  // Check render expectations
  if (expectations.render) {
    const elements = generateReactElement(parseResult.nodes)
    const element = Array.isArray(elements) ? elements[0] : elements
    verifyRenderExpectations(element, expectations.render)
  }
}

/**
 * Verify parser output against expectations.
 */
function verifyParseExpectations(result: ParseResult, expectations: ParseExpectations): void {
  if (expectations.nodes !== undefined) {
    expect(result.nodes.length).toBe(expectations.nodes)
  }

  if (expectations.errors) {
    for (const expectedError of expectations.errors) {
      expect(result.errors.some(e => e.includes(expectedError))).toBe(true)
    }
  }

  const firstNode = result.nodes[0]
  if (!firstNode) return

  if (expectations.name !== undefined) {
    expect(firstNode.name).toBe(expectations.name)
  }

  if (expectations.properties) {
    for (const [key, value] of Object.entries(expectations.properties)) {
      expect(firstNode.properties[key]).toEqual(value)
    }
  }

  if (expectations.hasChildren !== undefined) {
    expect(firstNode.children.length > 0).toBe(expectations.hasChildren)
  }

  if (expectations.childCount !== undefined) {
    expect(firstNode.children.length).toBe(expectations.childCount)
  }

  if (expectations.childNames) {
    const childNames = firstNode.children.map(c => c.name)
    expect(childNames).toEqual(expectations.childNames)
  }
}

/**
 * Verify React rendering against expectations.
 */
function verifyRenderExpectations(element: React.ReactNode, expectations: RenderExpectations): void {
  if (expectations.style) {
    const style = getStyle(element)
    for (const [key, value] of Object.entries(expectations.style)) {
      expect(style[key as keyof React.CSSProperties]).toBe(value)
    }
  }

  if (expectations.noStyle) {
    const style = getStyle(element)
    for (const key of expectations.noStyle) {
      expect(style[key]).toBeUndefined()
    }
  }

  if (expectations.children !== undefined) {
    const children = getChildren(element)
    expect(children.length).toBe(expectations.children)
  }

  if (expectations.text !== undefined) {
    const text = getTextContent(element)
    expect(text).toBe(expectations.text)
  }

  if (expectations.props) {
    const props = getProps(element)
    for (const [key, value] of Object.entries(expectations.props)) {
      expect(props[key]).toEqual(value)
    }
  }

  if (expectations.noProps) {
    const props = getProps(element)
    for (const key of expectations.noProps) {
      expect(props[key]).toBeUndefined()
    }
  }

  if (expectations.elementType) {
    if (React.isValidElement(element)) {
      expect(typeof element.type === 'string' ? element.type : element.type.name).toBe(expectations.elementType)
    }
  }
}

// ============================================
// Utilities
// ============================================

/**
 * Helper to create a property test case.
 */
export function propertyTest(
  name: string,
  dslProp: string,
  expectedStyle: Partial<React.CSSProperties>
): SyntaxTest {
  return {
    name,
    input: `Box ${dslProp}`,
    expect: {
      render: { style: expectedStyle }
    }
  }
}

/**
 * Helper to create a shorthand expansion test.
 */
export function shorthandTest(
  name: string,
  shorthand: string,
  longform: string,
  expectedStyle: Partial<React.CSSProperties>
): SyntaxTest {
  return {
    name: `${name} (${shorthand} → ${longform})`,
    input: `Box ${shorthand}`,
    expect: {
      parse: { properties: { [longform.split(' ')[0]]: expect.anything() } },
      render: { style: expectedStyle }
    }
  }
}

/**
 * Helper to verify both short and long form produce same result.
 */
export function equivalentForms(
  name: string,
  shortInput: string,
  longInput: string,
  expectedStyle: Partial<React.CSSProperties>
): SyntaxTest[] {
  return [
    {
      name: `${name} (short: ${shortInput.split(' ').slice(1).join(' ')})`,
      input: shortInput,
      expect: { render: { style: expectedStyle } }
    },
    {
      name: `${name} (long: ${longInput.split(' ').slice(1).join(' ')})`,
      input: longInput,
      expect: { render: { style: expectedStyle } }
    }
  ]
}

/**
 * Import React for element type checking
 */
import React from 'react'

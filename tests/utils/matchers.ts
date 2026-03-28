/**
 * Test Utilities - Custom Vitest Matchers
 *
 * Custom matchers for DOM and IR assertions.
 */

import type { MatcherResult, StyleExpectation, DatasetExpectation, DOMStructure } from './types'
import type { IR } from '../ir/types'

// ============================================
// DOM MATCHERS
// ============================================

/**
 * Checks if element has specified styles
 *
 * @example
 * expect(element).toHaveStyle({ padding: '16px', background: 'rgb(59, 130, 246)' })
 */
export function toHaveStyle(
  element: HTMLElement,
  expected: StyleExpectation
): MatcherResult {
  const mismatches: string[] = []

  for (const [prop, expectedValue] of Object.entries(expected)) {
    // Handle both camelCase and kebab-case
    const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    const actual = element.style.getPropertyValue(prop) || (element.style as any)[camelProp]

    if (actual !== expectedValue) {
      mismatches.push(`${prop}: expected "${expectedValue}", got "${actual}"`)
    }
  }

  return {
    pass: mismatches.length === 0,
    message: () =>
      mismatches.length === 0
        ? `Expected element not to have styles ${JSON.stringify(expected)}`
        : `Style mismatches:\n${mismatches.join('\n')}`,
  }
}

/**
 * Checks if element has specified number of children
 *
 * @example
 * expect(container).toHaveChildCount(3)
 */
export function toHaveChildCount(
  element: HTMLElement,
  expected: number
): MatcherResult {
  const actual = element.children.length

  return {
    pass: actual === expected,
    message: () =>
      actual === expected
        ? `Expected element not to have ${expected} children`
        : `Expected ${expected} children, got ${actual}`,
  }
}

/**
 * Checks if element has specified tag name
 *
 * @example
 * expect(element).toHaveTagName('div')
 */
export function toHaveTagName(
  element: HTMLElement,
  expected: string
): MatcherResult {
  const actual = element.tagName.toLowerCase()
  const expectedLower = expected.toLowerCase()

  return {
    pass: actual === expectedLower,
    message: () =>
      actual === expectedLower
        ? `Expected element not to have tag name "${expected}"`
        : `Expected tag name "${expected}", got "${actual}"`,
  }
}

/**
 * Checks if element has specified dataset attributes
 *
 * @example
 * expect(element).toHaveDataset({ mirrorId: 'node-1', state: 'open' })
 */
export function toHaveDataset(
  element: HTMLElement,
  expected: DatasetExpectation
): MatcherResult {
  const mismatches: string[] = []

  for (const [key, expectedValue] of Object.entries(expected)) {
    const actual = element.dataset[key]
    if (actual !== expectedValue) {
      mismatches.push(`data-${key}: expected "${expectedValue}", got "${actual}"`)
    }
  }

  return {
    pass: mismatches.length === 0,
    message: () =>
      mismatches.length === 0
        ? `Expected element not to have dataset ${JSON.stringify(expected)}`
        : `Dataset mismatches:\n${mismatches.join('\n')}`,
  }
}

/**
 * Checks if element has specified state styles when in a given state
 *
 * @example
 * expect(element).toHaveStateStyles('selected', { background: '#3B82F6' })
 */
export function toHaveStateStyles(
  element: HTMLElement,
  state: string,
  expected: StyleExpectation
): MatcherResult {
  const currentState = element.dataset.state

  if (currentState !== state) {
    return {
      pass: false,
      message: () =>
        `Expected element to be in state "${state}", but it's in state "${currentState || 'none'}"`,
    }
  }

  return toHaveStyle(element, expected)
}

/**
 * Checks if element has specified initial state
 *
 * @example
 * expect(element).toHaveInitialState('closed')
 */
export function toHaveInitialState(
  element: HTMLElement,
  expected: string
): MatcherResult {
  const actual = element.dataset.state

  return {
    pass: actual === expected,
    message: () =>
      actual === expected
        ? `Expected element not to have initial state "${expected}"`
        : `Expected initial state "${expected}", got "${actual || 'none'}"`,
  }
}

/**
 * Checks if element structure matches expected DOM tree
 *
 * @example
 * expect(element).toMatchDOMStructure({
 *   tag: 'div',
 *   children: [
 *     { tag: 'span', text: 'Hello' }
 *   ]
 * })
 */
export function toMatchDOMStructure(
  element: HTMLElement,
  expected: DOMStructure
): MatcherResult {
  function checkStructure(el: Element, exp: DOMStructure, path: string): string[] {
    const errors: string[] = []

    // Check tag name
    if (el.tagName.toLowerCase() !== exp.tag.toLowerCase()) {
      errors.push(`${path}: expected tag "${exp.tag}", got "${el.tagName.toLowerCase()}"`)
    }

    // Check attributes
    if (exp.attributes) {
      for (const [attr, value] of Object.entries(exp.attributes)) {
        const actual = el.getAttribute(attr)
        if (actual !== value) {
          errors.push(`${path}[${attr}]: expected "${value}", got "${actual}"`)
        }
      }
    }

    // Check text content (only if no children expected)
    if (exp.text !== undefined && !exp.children) {
      if (el.textContent !== exp.text) {
        errors.push(`${path} text: expected "${exp.text}", got "${el.textContent}"`)
      }
    }

    // Check children
    if (exp.children) {
      if (el.children.length !== exp.children.length) {
        errors.push(
          `${path} children: expected ${exp.children.length}, got ${el.children.length}`
        )
      } else {
        for (let i = 0; i < exp.children.length; i++) {
          const childErrors = checkStructure(
            el.children[i],
            exp.children[i],
            `${path} > ${exp.children[i].tag}[${i}]`
          )
          errors.push(...childErrors)
        }
      }
    }

    return errors
  }

  const errors = checkStructure(element, expected, expected.tag)

  return {
    pass: errors.length === 0,
    message: () =>
      errors.length === 0
        ? `Expected element not to match structure`
        : `Structure mismatches:\n${errors.join('\n')}`,
  }
}

/**
 * Checks if element has text content
 *
 * @example
 * expect(element).toHaveTextContent('Hello World')
 */
export function toHaveTextContent(
  element: HTMLElement,
  expected: string
): MatcherResult {
  const actual = element.textContent

  return {
    pass: actual === expected,
    message: () =>
      actual === expected
        ? `Expected element not to have text content "${expected}"`
        : `Expected text content "${expected}", got "${actual}"`,
  }
}

/**
 * Checks if element has specified attribute
 *
 * @example
 * expect(element).toHaveAttribute('disabled')
 * expect(element).toHaveAttribute('type', 'submit')
 */
export function toHaveAttribute(
  element: HTMLElement,
  name: string,
  value?: string
): MatcherResult {
  const hasAttr = element.hasAttribute(name)
  const actual = element.getAttribute(name)

  if (value === undefined) {
    return {
      pass: hasAttr,
      message: () =>
        hasAttr
          ? `Expected element not to have attribute "${name}"`
          : `Expected element to have attribute "${name}"`,
    }
  }

  return {
    pass: actual === value,
    message: () =>
      actual === value
        ? `Expected element not to have attribute ${name}="${value}"`
        : `Expected attribute ${name}="${value}", got ${name}="${actual}"`,
  }
}

// ============================================
// IR MATCHERS
// ============================================

/**
 * Checks if IR node has specified style value
 *
 * @example
 * expect(irNode).toHaveIRStyle('padding', '16px')
 */
export function toHaveIRStyle(
  node: IR,
  property: string,
  expected: string
): MatcherResult {
  const actual = node.styles?.[property]

  return {
    pass: actual === expected,
    message: () =>
      actual === expected
        ? `Expected IR node not to have style ${property}: ${expected}`
        : `Expected IR style ${property}: "${expected}", got "${actual}"`,
  }
}

/**
 * Checks if IR node has specified event
 *
 * @example
 * expect(irNode).toHaveIREvent('onclick')
 */
export function toHaveIREvent(node: IR, eventName: string): MatcherResult {
  const hasEvent = node.events?.some(e => e.name === eventName) ?? false

  return {
    pass: hasEvent,
    message: () =>
      hasEvent
        ? `Expected IR node not to have event "${eventName}"`
        : `Expected IR node to have event "${eventName}"`,
  }
}

/**
 * Checks if IR node has specified number of children
 *
 * @example
 * expect(irNode).toHaveIRChildren(2)
 */
export function toHaveIRChildren(node: IR, expected: number): MatcherResult {
  const actual = node.children?.length ?? 0

  return {
    pass: actual === expected,
    message: () =>
      actual === expected
        ? `Expected IR node not to have ${expected} children`
        : `Expected ${expected} IR children, got ${actual}`,
  }
}

// ============================================
// ERROR MATCHERS
// ============================================

/**
 * Checks if AST has parse error matching pattern
 *
 * @example
 * expect(ast).toHaveParseError(/undefined component/i)
 */
export function toHaveParseError(
  ast: { errors: Array<{ message: string }> },
  pattern: RegExp | string
): MatcherResult {
  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern
  const hasMatchingError = ast.errors.some(e => regex.test(e.message))

  return {
    pass: hasMatchingError,
    message: () =>
      hasMatchingError
        ? `Expected AST not to have error matching ${pattern}`
        : `Expected AST to have error matching ${pattern}, got errors: ${
            ast.errors.length > 0
              ? ast.errors.map(e => e.message).join(', ')
              : 'none'
          }`,
  }
}

/**
 * Checks if AST has semantic error of specified type
 *
 * @example
 * expect(ast).toHaveSemanticError('undefined-target')
 */
export function toHaveSemanticError(
  ast: { errors: Array<{ message: string; type?: string }> },
  errorType: string
): MatcherResult {
  const hasError = ast.errors.some(e => e.type === errorType)

  return {
    pass: hasError,
    message: () =>
      hasError
        ? `Expected AST not to have semantic error "${errorType}"`
        : `Expected AST to have semantic error "${errorType}", got: ${
            ast.errors.map(e => e.type || e.message).join(', ') || 'none'
          }`,
  }
}

/**
 * Checks if AST has no errors
 *
 * @example
 * expect(ast).toHaveNoErrors()
 */
export function toHaveNoErrors(ast: { errors: Array<{ message: string }> }): MatcherResult {
  return {
    pass: ast.errors.length === 0,
    message: () =>
      ast.errors.length === 0
        ? `Expected AST to have errors`
        : `Expected no errors, got: ${ast.errors.map(e => e.message).join(', ')}`,
  }
}

/**
 * Custom Vitest Matchers for Mirror
 *
 * Import in setup.ts to make these available in all tests.
 * Usage: expect('Box bg #333').toParseWithProps({ bg: '#333' })
 */

import { expect } from 'vitest'
import { parse } from '../parser/parser'
import { propertiesToStyle } from '../utils/style-converter'

// Note: These paths are relative to src/__tests__/

// =============================================================================
// Custom Matcher Implementations
// =============================================================================

function toParseWithoutErrors(received: string) {
  const result = parse(received)
  const pass = result.errors.length === 0

  return {
    pass,
    message: () =>
      pass
        ? `Expected parsing to have errors, but it succeeded`
        : `Expected parsing to succeed, but got errors:\n${result.errors.map(e => `  - ${e.message}`).join('\n')}\n\nCode:\n${received}`,
  }
}

function toParseWithErrors(received: string, expectedCount?: number) {
  const result = parse(received)
  const hasErrors = result.errors.length > 0
  const countMatches = expectedCount === undefined || result.errors.length === expectedCount

  const pass = hasErrors && countMatches

  return {
    pass,
    message: () => {
      if (!hasErrors) {
        return `Expected parsing to have errors, but it succeeded without errors`
      }
      if (!countMatches) {
        return `Expected ${expectedCount} parse errors, but got ${result.errors.length}:\n${result.errors.map(e => `  - ${e.message}`).join('\n')}`
      }
      return `Expected parsing to succeed, but got ${result.errors.length} errors`
    },
  }
}

function toParseWithProps(received: string, expected: Record<string, unknown>) {
  const result = parse(received)

  if (result.errors.length > 0) {
    return {
      pass: false,
      message: () =>
        `Expected parsing to succeed, but got errors:\n${result.errors.map(e => `  - ${e.message}`).join('\n')}`,
    }
  }

  if (result.nodes.length === 0) {
    return {
      pass: false,
      message: () => `Expected at least one node, but got none`,
    }
  }

  const actualProps = result.nodes[0].properties
  const mismatches: string[] = []

  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actualProps[key]
    if (actualValue !== expectedValue) {
      mismatches.push(`  ${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`)
    }
  }

  const pass = mismatches.length === 0

  return {
    pass,
    message: () =>
      pass
        ? `Expected properties not to match, but they did`
        : `Property mismatches:\n${mismatches.join('\n')}\n\nCode: ${received}`,
  }
}

function toParseWithStyle(received: string, expected: React.CSSProperties) {
  const result = parse(received)

  if (result.errors.length > 0) {
    return {
      pass: false,
      message: () =>
        `Expected parsing to succeed, but got errors:\n${result.errors.map(e => `  - ${e.message}`).join('\n')}`,
    }
  }

  if (result.nodes.length === 0) {
    return {
      pass: false,
      message: () => `Expected at least one node, but got none`,
    }
  }

  const node = result.nodes[0]
  const actualStyle = propertiesToStyle(node.properties, node.children.length > 0, node.name)
  const mismatches: string[] = []

  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = (actualStyle as Record<string, unknown>)[key]
    if (actualValue !== expectedValue) {
      mismatches.push(`  ${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`)
    }
  }

  const pass = mismatches.length === 0

  return {
    pass,
    message: () =>
      pass
        ? `Expected styles not to match, but they did`
        : `Style mismatches:\n${mismatches.join('\n')}\n\nCode: ${received}`,
  }
}

function toHaveChild(received: unknown, childName: string) {
  const node = received as { children?: Array<{ name: string }> }

  if (!node.children || !Array.isArray(node.children)) {
    return {
      pass: false,
      message: () => `Expected node to have children array`,
    }
  }

  const hasChild = node.children.some(c => c.name === childName)

  return {
    pass: hasChild,
    message: () =>
      hasChild
        ? `Expected node not to have child "${childName}", but it does`
        : `Expected node to have child "${childName}", but children are: [${node.children?.map(c => c.name).join(', ')}]`,
  }
}

function toHaveState(received: unknown, stateName: string, stateProps?: Record<string, unknown>) {
  const node = received as { states?: Array<{ name: string; properties: Record<string, unknown> }> }

  if (!node.states || !Array.isArray(node.states)) {
    return {
      pass: false,
      message: () => `Expected node to have states array`,
    }
  }

  const state = node.states.find(s => s.name === stateName)

  if (!state) {
    return {
      pass: false,
      message: () =>
        `Expected node to have state "${stateName}", but states are: [${node.states?.map(s => s.name).join(', ')}]`,
    }
  }

  if (stateProps) {
    const mismatches: string[] = []
    for (const [key, expectedValue] of Object.entries(stateProps)) {
      const actualValue = state.properties[key]
      if (actualValue !== expectedValue) {
        mismatches.push(`  ${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`)
      }
    }

    if (mismatches.length > 0) {
      return {
        pass: false,
        message: () => `State "${stateName}" property mismatches:\n${mismatches.join('\n')}`,
      }
    }
  }

  return {
    pass: true,
    message: () => `Expected node not to have state "${stateName}", but it does`,
  }
}

function toHaveEventHandler(received: unknown, eventName: string) {
  const node = received as { eventHandlers?: Array<{ event: string }> }

  if (!node.eventHandlers || !Array.isArray(node.eventHandlers)) {
    return {
      pass: false,
      message: () => `Expected node to have eventHandlers array`,
    }
  }

  const hasEvent = node.eventHandlers.some(h => h.event === eventName)

  return {
    pass: hasEvent,
    message: () =>
      hasEvent
        ? `Expected node not to have event handler "${eventName}", but it does`
        : `Expected node to have event handler "${eventName}", but handlers are: [${node.eventHandlers?.map(h => h.event).join(', ')}]`,
  }
}

// =============================================================================
// Extend Vitest
// =============================================================================

expect.extend({
  toParseWithoutErrors,
  toParseWithErrors,
  toParseWithProps,
  toParseWithStyle,
  toHaveChild,
  toHaveState,
  toHaveEventHandler,
})

// =============================================================================
// TypeScript Declaration
// =============================================================================

declare module 'vitest' {
  interface Assertion<T> {
    /** Assert that Mirror code parses without errors */
    toParseWithoutErrors(): T
    /** Assert that Mirror code parses with errors */
    toParseWithErrors(expectedCount?: number): T
    /** Assert that Mirror code parses and has specific properties */
    toParseWithProps(expected: Record<string, unknown>): T
    /** Assert that Mirror code parses and produces specific CSS styles */
    toParseWithStyle(expected: React.CSSProperties): T
    /** Assert that an AST node has a child with the given name */
    toHaveChild(childName: string): T
    /** Assert that an AST node has a state with the given name and optional properties */
    toHaveState(stateName: string, stateProps?: Record<string, unknown>): T
    /** Assert that an AST node has an event handler */
    toHaveEventHandler(eventName: string): T
  }

  interface AsymmetricMatchersContaining {
    toParseWithoutErrors(): unknown
    toParseWithErrors(expectedCount?: number): unknown
    toParseWithProps(expected: Record<string, unknown>): unknown
    toParseWithStyle(expected: React.CSSProperties): unknown
  }
}

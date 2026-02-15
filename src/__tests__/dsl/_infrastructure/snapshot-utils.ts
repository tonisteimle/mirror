/**
 * Snapshot Utilities
 *
 * Helpers for AST and React element snapshot testing.
 * Use these for capturing and comparing complex structures.
 */

import type React from 'react'
import { parse } from '../../../parser/parser'
import type { ASTNode, ParseResult } from '../../../parser/types'
import { generateReactElement } from '../../../generator/react-generator'
import { getStyle, getProps, getChildren, getTextContent } from '../../test-utils'

// ============================================
// AST Snapshot Helpers
// ============================================

/**
 * Normalize AST node for snapshot comparison.
 * Removes volatile fields like generated IDs.
 */
export function normalizeASTNode(node: ASTNode): Record<string, unknown> {
  const normalized: Record<string, unknown> = {
    name: node.name,
  }

  // Only include non-empty properties
  if (Object.keys(node.properties).length > 0) {
    normalized.properties = node.properties
  }

  // Only include content if present
  if (node.content) {
    normalized.content = node.content
  }

  // Recursively normalize children
  if (node.children.length > 0) {
    normalized.children = node.children.map(normalizeASTNode)
  }

  // Include event handlers if present
  if (node.eventHandlers && node.eventHandlers.length > 0) {
    normalized.eventHandlers = node.eventHandlers.map(eh => ({
      event: eh.event,
      actions: eh.actions,
    }))
  }

  // Include states if present
  if (node.states && Object.keys(node.states).length > 0) {
    normalized.states = node.states
  }

  // Include conditions if present
  if (node.condition) {
    normalized.condition = node.condition
  }

  // Include iteration if present
  if (node.iteration) {
    normalized.iteration = node.iteration
  }

  return normalized
}

/**
 * Parse DSL and return normalized AST for snapshot testing.
 */
export function parseToSnapshot(dsl: string): {
  nodes: Record<string, unknown>[]
  errors: string[]
  tokens: number
} {
  const result = parse(dsl)
  return {
    nodes: result.nodes.map(normalizeASTNode),
    errors: result.errors,
    tokens: result.tokens.size,
  }
}

// ============================================
// React Element Snapshot Helpers
// ============================================

/**
 * Structure representing a React element for snapshot comparison.
 */
export interface ElementSnapshot {
  type: string
  style?: React.CSSProperties
  props?: Record<string, unknown>
  text?: string
  children?: ElementSnapshot[]
}

/**
 * Convert a React element to a snapshot-friendly structure.
 */
export function elementToSnapshot(element: React.ReactNode): ElementSnapshot | null {
  if (!React.isValidElement(element)) {
    if (typeof element === 'string') {
      return { type: 'text', text: element }
    }
    return null
  }

  const snapshot: ElementSnapshot = {
    type: typeof element.type === 'string' ? element.type : element.type.name || 'Unknown',
  }

  const style = getStyle(element)
  if (Object.keys(style).length > 0) {
    snapshot.style = style
  }

  // Get relevant props (exclude React internals)
  const props = getProps(element)
  const relevantProps: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (!['children', 'style', 'key', 'ref'].includes(key)) {
      relevantProps[key] = value
    }
  }
  if (Object.keys(relevantProps).length > 0) {
    snapshot.props = relevantProps
  }

  // Handle text content
  const text = getTextContent(element)
  if (text) {
    snapshot.text = text
  }

  // Handle children
  const children = getChildren(element)
  if (children.length > 0) {
    const childSnapshots = children
      .map(elementToSnapshot)
      .filter((s): s is ElementSnapshot => s !== null)
    if (childSnapshots.length > 0) {
      snapshot.children = childSnapshots
    }
  }

  return snapshot
}

/**
 * Parse DSL and render to snapshot-friendly structure.
 */
export function renderToSnapshot(dsl: string): ElementSnapshot[] {
  const result = parse(dsl)
  const elements = generateReactElement(result.nodes)
  const elementArray = Array.isArray(elements) ? elements : [elements]
  return elementArray
    .map(elementToSnapshot)
    .filter((s): s is ElementSnapshot => s !== null)
}

// ============================================
// Comparison Helpers
// ============================================

/**
 * Deep compare two style objects, ignoring undefined values.
 */
export function stylesMatch(
  actual: React.CSSProperties,
  expected: Partial<React.CSSProperties>
): boolean {
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key as keyof React.CSSProperties] !== value) {
      return false
    }
  }
  return true
}

/**
 * Get style differences between actual and expected.
 */
export function styleDiff(
  actual: React.CSSProperties,
  expected: Partial<React.CSSProperties>
): { missing: string[]; wrong: Array<{ key: string; actual: unknown; expected: unknown }> } {
  const missing: string[] = []
  const wrong: Array<{ key: string; actual: unknown; expected: unknown }> = []

  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key as keyof React.CSSProperties]
    if (actualValue === undefined) {
      missing.push(key)
    } else if (actualValue !== expectedValue) {
      wrong.push({ key, actual: actualValue, expected: expectedValue })
    }
  }

  return { missing, wrong }
}

// Import React for element type checking
import React from 'react'

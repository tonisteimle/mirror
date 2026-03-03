/**
 * Central Test Utilities for Mirror
 *
 * Provides reusable helpers that make writing tests simple and consistent.
 * Import what you need: import { parse, props, style, render } from '../test-utils'
 */

import { parse as parseAST, type ParseResult } from '../parser/parser'
import { propertiesToStyle } from '../utils/style-converter'
import { tokenize } from '../parser/lexer'
import { createParserContext, type ParserContext } from '../parser/parser-context'
import type { ASTNode } from '../parser/types'
import { render as rtlRender } from '@testing-library/react'
import {
  generateReactElement,
  BehaviorRegistryProvider,
  ComponentRegistryProvider,
  TemplateRegistryProvider,
  OverlayRegistryProvider,
  DataProvider
} from '../generator/react-generator'
import React from 'react'

// =============================================================================
// Core Parsing Utilities
// =============================================================================

/**
 * Parse Mirror code and return full result.
 * Use this when you need access to errors or multiple nodes.
 */
export function parse(code: string): ParseResult {
  return parseAST(code)
}

// =============================================================================
// Render Utilities (for DOM testing)
// =============================================================================

/**
 * Wrapper component providing all required contexts for rendering
 */
function RenderWrapper({ children, registry }: { children: React.ReactNode, registry?: Map<string, unknown> }) {
  return React.createElement(
    BehaviorRegistryProvider,
    null,
    React.createElement(
      ComponentRegistryProvider,
      null,
      React.createElement(
        TemplateRegistryProvider,
        { registry: registry || new Map() },
        React.createElement(
          OverlayRegistryProvider,
          null,
          React.createElement(
            DataProvider,
            { allRecords: new Map(), schemas: [] },
            children
          )
        )
      )
    )
  )
}

/**
 * Parse Mirror code and render to DOM.
 * Returns the render result from @testing-library/react.
 *
 * @example
 * parseAndRender('Button "Click me"')
 * expect(screen.getByText('Click me')).toBeInTheDocument()
 */
export function parseAndRender(code: string) {
  const result = parseAST(code)
  // Only throw on actual errors, not warnings
  const realErrors = result.errors.filter(e => !String(e).startsWith('Warning:'))
  if (realErrors.length > 0) {
    throw new Error(`Parse errors:\n${realErrors.map(e => `  - ${e}`).join('\n')}\n\nCode:\n${code}`)
  }

  const element = generateReactElement(result.nodes, {})
  return rtlRender(
    React.createElement(RenderWrapper, { registry: result.registry as Map<string, unknown> }, element)
  )
}

/**
 * Get parse errors from a parse result (excludes warnings).
 *
 * @example
 * const result = parse('Box unknown-prop')
 * const errors = getParseErrors(result)
 */
export function getParseErrors(result: ParseResult): Array<{ message: string }> {
  return result.errors
    .filter(e => !String(e).startsWith('Warning:'))
    .map(e => ({ message: typeof e === 'string' ? e : String(e) }))
}

/**
 * Get syntax warnings from a parse result.
 *
 * @example
 * const result = parse('Dropdown\n  DropdownTrigger')
 * const warnings = getSyntaxWarnings(result)
 */
export function getSyntaxWarnings(result: ParseResult): string[] {
  return result.errors.filter(e => String(e).startsWith('Warning:')).map(e => String(e))
}

/**
 * Compare two colors, normalizing format.
 * Handles hex, rgb, rgba formats.
 *
 * @example
 * colorsMatch('#FF0000', 'rgb(255, 0, 0)') // true
 */
export function colorsMatch(actual: string, expected: string): boolean {
  const normalizeColor = (color: string): string => {
    // Remove whitespace
    color = color.trim().toLowerCase()

    // Convert hex to rgb
    if (color.startsWith('#')) {
      const hex = color.slice(1)
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16)
        const g = parseInt(hex[1] + hex[1], 16)
        const b = parseInt(hex[2] + hex[2], 16)
        return `rgb(${r}, ${g}, ${b})`
      }
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16)
        const g = parseInt(hex.slice(2, 4), 16)
        const b = parseInt(hex.slice(4, 6), 16)
        return `rgb(${r}, ${g}, ${b})`
      }
    }

    // Normalize rgb/rgba whitespace
    return color.replace(/\s+/g, ' ').replace(/,\s*/g, ', ')
  }

  return normalizeColor(actual) === normalizeColor(expected)
}

/**
 * Parse and assert no errors. Returns first node.
 * Most common use case for simple component tests.
 *
 * @example
 * const node = parseOne('Button "Click", bg #333')
 * expect(node.name).toBe('Button')
 */
export function parseOne(code: string): ASTNode {
  const result = parseAST(code)
  if (result.errors.length > 0) {
    throw new Error(`Parse errors:\n${result.errors.map(e => `  - ${e}`).join('\n')}\n\nCode:\n${code}`)
  }
  if (result.nodes.length === 0) {
    throw new Error(`No nodes parsed from:\n${code}`)
  }
  return result.nodes[0]
}

/**
 * Parse and return all nodes (asserts no errors).
 *
 * @example
 * const nodes = parseAll(`
 *   Button "One"
 *   Button "Two"
 * `)
 * expect(nodes).toHaveLength(2)
 */
export function parseAll(code: string): ASTNode[] {
  const result = parseAST(code)
  if (result.errors.length > 0) {
    throw new Error(`Parse errors:\n${result.errors.map(e => `  - ${e}`).join('\n')}\n\nCode:\n${code}`)
  }
  return result.nodes
}

/**
 * Parse and expect specific number of errors.
 * Use for testing error handling.
 *
 * @example
 * const errors = parseErrors('Box unknown-property', 1)
 * expect(errors[0]).toContain('unknown')
 */
export function parseErrors(code: string, expectedCount?: number) {
  const result = parseAST(code)
  if (expectedCount !== undefined && result.errors.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} errors, got ${result.errors.length}:\n${result.errors.map(e => `  - ${e}`).join('\n')}`)
  }
  return result.errors
}

// =============================================================================
// Property & Style Extraction
// =============================================================================

/**
 * Parse and extract properties from first node.
 * Shortcut for the most common test pattern.
 *
 * @example
 * expect(props('Box bg #333').bg).toBe('#333')
 * expect(props('Button pad 12').pad).toBe(12)
 */
export function props(code: string): Record<string, unknown> {
  return parseOne(code).properties
}

/**
 * Parse and extract computed CSS styles.
 *
 * @example
 * expect(style('Box bg #333').backgroundColor).toBe('#333')
 * expect(style('Box pad 12').padding).toBe('12px')
 */
export function style(code: string): React.CSSProperties {
  const node = parseOne(code)
  return propertiesToStyle(node.properties, node.children.length > 0, node.name)
}

/**
 * Parse and extract styles from a specific child by index.
 *
 * @example
 * const s = childStyle(`
 *   Box
 *     Text col #FFF
 * `, 0)
 * expect(s.color).toBe('#FFF')
 */
export function childStyle(code: string, childIndex: number): React.CSSProperties {
  const node = parseOne(code)
  const child = node.children[childIndex]
  if (!child) {
    throw new Error(`No child at index ${childIndex}. Node has ${node.children.length} children.`)
  }
  return propertiesToStyle(child.properties, child.children.length > 0, child.name)
}

// =============================================================================
// AST Navigation
// =============================================================================

/**
 * Find a node by name (first match).
 *
 * @example
 * const btn = findNode(parseOne('Card\n  Button "Click"'), 'Button')
 * expect(btn?.properties.text).toBe('Click')
 */
export function findNode(root: ASTNode, name: string): ASTNode | undefined {
  if (root.name === name) return root
  for (const child of root.children) {
    const found = findNode(child, name)
    if (found) return found
  }
  return undefined
}

/**
 * Find all nodes matching a name.
 *
 * @example
 * const buttons = findAllNodes(node, 'Button')
 * expect(buttons).toHaveLength(3)
 */
export function findAllNodes(root: ASTNode, name: string): ASTNode[] {
  const results: ASTNode[] = []
  if (root.name === name) results.push(root)
  for (const child of root.children) {
    results.push(...findAllNodes(child, name))
  }
  return results
}

/**
 * Get child by index with helpful error.
 */
export function child(node: ASTNode, index: number): ASTNode {
  if (index >= node.children.length) {
    throw new Error(`No child at index ${index}. "${node.name}" has ${node.children.length} children.`)
  }
  return node.children[index]
}

/**
 * Get first child.
 */
export function firstChild(node: ASTNode): ASTNode {
  return child(node, 0)
}

/**
 * Get child by index or name. Returns undefined if not found.
 *
 * @example
 * const title = getChild(card, 'Title')
 * const first = getChild(node, 0)
 */
export function getChild(node: ASTNode, indexOrName: number | string): ASTNode | undefined {
  if (typeof indexOrName === 'number') {
    return node.children[indexOrName]
  }
  return node.children.find(c => c.name === indexOrName)
}

// =============================================================================
// State & Event Helpers
// =============================================================================

/**
 * Extract state definitions from a node.
 *
 * @example
 * const states = getStates(parseOne(`
 *   Button
 *     hover
 *       bg #555
 * `))
 * expect(states.hover.bg).toBe('#555')
 */
export function getStates(node: ASTNode): Record<string, Record<string, unknown>> {
  const states: Record<string, Record<string, unknown>> = {}
  for (const state of node.states || []) {
    states[state.name] = state.properties
  }
  return states
}

/**
 * Extract event handlers from a node.
 *
 * @example
 * const events = getEvents(parseOne('Button onclick toggle'))
 * expect(events.onclick).toBeDefined()
 */
export function getEvents(node: ASTNode): Record<string, unknown> {
  const events: Record<string, unknown> = {}
  for (const handler of node.eventHandlers || []) {
    events[handler.event] = handler.actions
  }
  return events
}

// =============================================================================
// Lexer / Parser Context (for low-level tests)
// =============================================================================

/**
 * Create parser context for testing parser internals.
 *
 * @example
 * const ctx = context('state hover\n  bg #333')
 * const result = parseStateDefinition(ctx, 0)
 */
export function context(code: string): ParserContext {
  const tokens = tokenize(code)
  return createParserContext(tokens, code)
}

/**
 * Tokenize code for lexer tests.
 *
 * @example
 * const tokens = lex('Box bg #333')
 * expect(tokens[0].type).toBe('IDENTIFIER')
 */
export function lex(code: string) {
  return tokenize(code)
}

// =============================================================================
// Test Data Builders
// =============================================================================

/**
 * Build Mirror code with a fluent API.
 *
 * @example
 * const code = mirror()
 *   .token('$primary', '#3B82F6')
 *   .component('Button', { bg: '$primary', pad: 12 })
 *   .build()
 */
export function mirror() {
  return new MirrorBuilder()
}

class MirrorBuilder {
  private lines: string[] = []
  private indent = 0

  token(name: string, value: string | number): this {
    this.lines.push(`$${name}: ${value}`)
    return this
  }

  define(name: string, propsOrCode?: string | Record<string, unknown>): this {
    if (typeof propsOrCode === 'string') {
      this.lines.push(`${this.indentStr()}${name}: ${propsOrCode}`)
    } else if (propsOrCode) {
      this.lines.push(`${this.indentStr()}${name}: ${this.propsToString(propsOrCode)}`)
    } else {
      this.lines.push(`${this.indentStr()}${name}:`)
    }
    return this
  }

  component(name: string, propsOrCode?: string | Record<string, unknown>): this {
    if (typeof propsOrCode === 'string') {
      this.lines.push(`${this.indentStr()}${name} ${propsOrCode}`)
    } else if (propsOrCode) {
      this.lines.push(`${this.indentStr()}${name} ${this.propsToString(propsOrCode)}`)
    } else {
      this.lines.push(`${this.indentStr()}${name}`)
    }
    return this
  }

  text(content: string): this {
    this.lines.push(`${this.indentStr()}Text "${content}"`)
    return this
  }

  state(name: string, props: Record<string, unknown>): this {
    this.lines.push(`${this.indentStr()}${name}`)
    this.indent++
    this.lines.push(`${this.indentStr()}${this.propsToString(props)}`)
    this.indent--
    return this
  }

  child(): this {
    this.indent++
    return this
  }

  parent(): this {
    this.indent = Math.max(0, this.indent - 1)
    return this
  }

  raw(line: string): this {
    this.lines.push(`${this.indentStr()}${line}`)
    return this
  }

  build(): string {
    return this.lines.join('\n')
  }

  private indentStr(): string {
    return '  '.repeat(this.indent)
  }

  private propsToString(props: Record<string, unknown>): string {
    return Object.entries(props)
      .map(([key, value]) => {
        if (typeof value === 'string' && !value.startsWith('#') && !value.startsWith('$')) {
          return `${key} "${value}"`
        }
        return `${key} ${value}`
      })
      .join(', ')
  }
}

// =============================================================================
// Snapshot Helpers
// =============================================================================

/**
 * Prepare AST for snapshot comparison.
 * Removes volatile fields like positions.
 *
 * @example
 * expect(snapshotAST(parseOne('Button'))).toMatchSnapshot()
 */
export function snapshotAST(node: ASTNode): unknown {
  return cleanForSnapshot(node)
}

function cleanForSnapshot(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(cleanForSnapshot)
  if (typeof obj !== 'object') return obj

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    // Skip position info and empty arrays
    if (['line', 'column', 'start', 'end', 'position'].includes(key)) continue
    if (Array.isArray(value) && value.length === 0) continue
    if (value === undefined) continue
    result[key] = cleanForSnapshot(value)
  }
  return result
}

// =============================================================================
// Table-Driven Test Helpers
// =============================================================================

/**
 * Create property test cases for it.each
 *
 * @example
 * describe('padding', () => {
 *   it.each(propCases([
 *     ['Box pad 12', { pad: 12 }],
 *     ['Box p 8', { pad: 8 }],
 *   ]))('%s', (code, expected) => {
 *     expect(props(code)).toMatchObject(expected)
 *   })
 * })
 */
export function propCases(cases: Array<[string, Record<string, unknown>]>) {
  return cases
}

/**
 * Create style test cases for it.each
 *
 * @example
 * describe('CSS output', () => {
 *   it.each(styleCases([
 *     ['Box pad 12', { padding: '12px' }],
 *     ['Box bg #333', { backgroundColor: '#333' }],
 *   ]))('%s', (code, expected) => {
 *     expect(style(code)).toMatchObject(expected)
 *   })
 * })
 */
export function styleCases(cases: Array<[string, React.CSSProperties]>) {
  return cases
}

// =============================================================================
// Mock Factories
// =============================================================================

/**
 * Create a mock EditorView for hook testing.
 *
 * @example
 * const { editorRef, dispatch } = mockEditor('Button ')
 * // Use editorRef in hook tests
 * expect(dispatch).toHaveBeenCalled()
 */
export function mockEditor(doc = '', cursorPos?: number) {
  const pos = cursorPos ?? doc.length
  const dispatch = vi.fn()

  const editorRef = {
    current: {
      state: {
        doc: {
          length: doc.length,
          lineAt: () => ({ from: 0, to: doc.length, text: doc }),
          sliceString: (from: number, to: number) => doc.slice(from, to),
        },
        selection: { main: { head: pos, from: pos, to: pos } },
      },
      coordsAtPos: () => ({ left: 100, top: 200, bottom: 220 }),
      dispatch,
      focus: vi.fn(),
    },
  }

  return { editorRef, dispatch }
}

// Need to import vi for mocks
import { vi } from 'vitest'
import type { Token } from '../parser/lexer'
import type { ActionStatement, EventHandler, StateDefinition } from '../parser/types'

// =============================================================================
// Lexer Test Helpers
// =============================================================================

/**
 * Assert a token at a specific index has expected type and value.
 *
 * @example
 * const tokens = lex('Box bg #333')
 * expectToken(tokens, 0, 'COMPONENT_NAME', 'Box')
 * expectToken(tokens, 1, 'PROPERTY', 'bg')
 * expectToken(tokens, 2, 'COLOR', '#333')
 */
export function expectToken(
  tokens: Token[],
  index: number,
  type: string,
  value?: string
): void {
  const token = tokens[index]
  if (!token) {
    throw new Error(`No token at index ${index}. Have ${tokens.length} tokens.`)
  }
  if (token.type !== type) {
    throw new Error(`Token ${index}: expected type '${type}', got '${token.type}' (value: '${token.value}')`)
  }
  if (value !== undefined && token.value !== value) {
    throw new Error(`Token ${index}: expected value '${value}', got '${token.value}'`)
  }
}

/**
 * Find first token of a specific type.
 *
 * @example
 * const colorToken = findToken(lex('Box bg #333'), 'COLOR')
 * expect(colorToken?.value).toBe('#333')
 */
export function findToken(tokens: Token[], type: string): Token | undefined {
  return tokens.find(t => t.type === type)
}

/**
 * Filter tokens by type.
 *
 * @example
 * const props = filterTokens(lex('Box pad 12, bg #333'), 'PROPERTY')
 * expect(props).toHaveLength(2)
 */
export function filterTokens(tokens: Token[], type: string): Token[] {
  return tokens.filter(t => t.type === type)
}

// =============================================================================
// Action & Animation Helpers
// =============================================================================

/**
 * Get first action from an event handler.
 *
 * @example
 * const action = getAction(parseOne('Button onclick toggle'))
 * expect(action?.type).toBe('toggle')
 */
export function getAction(node: ASTNode, eventName = 'onclick'): ActionStatement | undefined {
  const handler = node.eventHandlers?.find(h => h.event === eventName)
  if (!handler || handler.actions.length === 0) return undefined
  const first = handler.actions[0]
  // Actions can be ActionStatement or Conditional
  if ('type' in first && typeof first.type === 'string') {
    return first as ActionStatement
  }
  return undefined
}

/**
 * Get all actions from an event handler.
 *
 * @example
 * const actions = getActions(parseOne('Button onclick toggle, show Modal'))
 * expect(actions).toHaveLength(2)
 */
export function getActions(node: ASTNode, eventName = 'onclick'): ActionStatement[] {
  const handler = node.eventHandlers?.find(h => h.event === eventName)
  if (!handler) return []
  return handler.actions.filter((a): a is ActionStatement =>
    'type' in a && typeof a.type === 'string'
  )
}

/**
 * Get event handler by name.
 *
 * @example
 * const handler = getHandler(parseOne('Button onclick toggle'), 'onclick')
 * expect(handler?.actions).toHaveLength(1)
 */
export function getHandler(node: ASTNode, eventName: string): EventHandler | undefined {
  return node.eventHandlers?.find(h => h.event === eventName)
}

/**
 * Get animation definition from node.
 *
 * @example
 * const anim = getAnimation(parseOne('Panel\n  show fade 300'), 'show')
 * expect(anim?.animations).toContain('fade')
 */
export function getAnimation(node: ASTNode, type: 'show' | 'hide' | 'animate') {
  if (type === 'show') return node.showAnimation
  if (type === 'hide') return node.hideAnimation
  return node.continuousAnimation
}

// =============================================================================
// State Helpers (Extended)
// =============================================================================

/**
 * Get a specific state by name.
 *
 * @example
 * const hover = getState(parseOne('Button\n  hover\n    bg #555'), 'hover')
 * expect(hover?.properties.bg).toBe('#555')
 */
export function getState(node: ASTNode, stateName: string): StateDefinition | undefined {
  return node.states?.find(s => s.name === stateName)
}

/**
 * Get states by category.
 *
 * @example
 * const selectionStates = getStatesByCategory(node, 'selection')
 * expect(selectionStates.map(s => s.name)).toEqual(['selected', 'not-selected'])
 */
export function getStatesByCategory(node: ASTNode, category: string): StateDefinition[] {
  return (node.states || []).filter(s => s.category === category)
}

// =============================================================================
// Token & Registry Helpers
// =============================================================================

/**
 * Get resolved token value from parse result.
 *
 * @example
 * const result = parse('$primary: #3B82F6\nBox bg $primary')
 * expect(getToken(result, 'primary')).toBe('#3B82F6')
 */
export function getToken(result: ParseResult, name: string): unknown {
  return result.tokens.get(name)
}

/**
 * Get component template from registry.
 *
 * @example
 * const result = parse('Button: pad 12, bg #333')
 * const template = getTemplate(result, 'Button')
 * expect(template?.properties.pad).toBe(12)
 */
export function getTemplate(result: ParseResult, name: string) {
  return result.registry.get(name)
}

/**
 * Check if a definition exists in registry.
 *
 * @example
 * const result = parse('Button: pad 12')
 * expect(hasDefinition(result, 'Button')).toBe(true)
 */
export function hasDefinition(result: ParseResult, name: string): boolean {
  return result.registry.has(name)
}

// =============================================================================
// Error Testing Helpers
// =============================================================================

/**
 * Parse and expect an error message matching pattern.
 *
 * @example
 * expectError('Box unknownprop 12', /unknown/i)
 */
export function expectError(code: string, pattern: RegExp): void {
  const result = parseAST(code)
  const hasMatch = result.errors.some(e => pattern.test(e))
  if (!hasMatch) {
    throw new Error(
      `Expected error matching ${pattern}, got:\n` +
      result.errors.map(e => `  - ${e}`).join('\n') || '  (no errors)'
    )
  }
}

/**
 * Parse and expect no errors (with helpful message on failure).
 *
 * @example
 * expectNoErrors('Box pad 12, bg #333')
 */
export function expectNoErrors(code: string): ParseResult {
  const result = parseAST(code)
  if (result.errors.length > 0) {
    throw new Error(
      `Expected no errors, got ${result.errors.length}:\n` +
      result.errors.map(e => `  - ${e}`).join('\n') +
      `\n\nCode:\n${code}`
    )
  }
  return result
}

/**
 * Parse and expect specific error count.
 *
 * @example
 * expectErrorCount('Box bad1 bad2', 2)
 */
export function expectErrorCount(code: string, count: number): ParseResult {
  const result = parseAST(code)
  if (result.errors.length !== count) {
    throw new Error(
      `Expected ${count} errors, got ${result.errors.length}:\n` +
      result.errors.map(e => `  - ${e}`).join('\n')
    )
  }
  return result
}

// =============================================================================
// Conditional Helpers
// =============================================================================

/**
 * Get conditional properties from node.
 *
 * @example
 * const cond = getConditional(parseOne('Button if $active then bg #333'))
 * expect(cond?.thenProperties.bg).toBe('#333')
 */
export function getConditional(node: ASTNode, index = 0) {
  return node.conditionalProperties?.[index]
}

/**
 * Check if node has conditional children.
 *
 * @example
 * const node = parseOne('if $isAdmin\n  AdminPanel')
 * expect(hasConditionalChildren(node)).toBe(true)
 */
export function hasConditionalChildren(node: ASTNode): boolean {
  return node.children.some(c => c.condition !== undefined)
}

// =============================================================================
// Table-Driven Test Helpers (Extended)
// =============================================================================

/**
 * Create state test cases for it.each
 *
 * @example
 * it.each(stateCases([
 *   ['Button\n  hover\n    bg #555', 'hover', { bg: '#555' }],
 * ]))('%s has state %s', (code, stateName, expected) => {
 *   const state = getState(parseOne(code), stateName)
 *   expect(state?.properties).toMatchObject(expected)
 * })
 */
export function stateCases(cases: Array<[string, string, Record<string, unknown>]>) {
  return cases
}

/**
 * Create event test cases for it.each
 *
 * @example
 * it.each(eventCases([
 *   ['Button onclick toggle', 'onclick', 'toggle'],
 *   ['Button onclick show Modal', 'onclick', 'show', 'Modal'],
 * ]))('%s', (code, event, actionType, target?) => {
 *   const action = getAction(parseOne(code), event)
 *   expect(action?.type).toBe(actionType)
 *   if (target) expect(action?.target).toBe(target)
 * })
 */
export function eventCases(cases: Array<[string, string, string, string?]>) {
  return cases
}

/**
 * Create token test cases for it.each
 *
 * @example
 * it.each(tokenCases([
 *   ['$primary: #3B82F6', 'primary', '#3B82F6'],
 *   ['$spacing: 16', 'spacing', 16],
 * ]))('%s defines %s = %s', (code, name, value) => {
 *   expect(getToken(parse(code), name)).toBe(value)
 * })
 */
export function tokenCases(cases: Array<[string, string, unknown]>) {
  return cases
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export { expect, describe, it, vi, beforeEach, afterEach, test } from 'vitest'
export type { Token, ASTNode, ParseResult, ActionStatement, EventHandler, StateDefinition }

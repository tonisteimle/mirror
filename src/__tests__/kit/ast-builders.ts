/**
 * AST Builder Utilities
 *
 * Factory functions for creating AST nodes and parser context for testing.
 * Provides a clean API for constructing test fixtures.
 */

import type { Token } from '../../parser/lexer'
import type { ASTNode, StyleMixin, ConditionExpr, ComponentTemplate } from '../../parser/types'
import type { ParserContext } from '../../parser/parser-context'
import { createParserContext } from '../../parser/parser-context'
import { tokenize } from '../../parser/lexer'

// ============================================
// Token Builders
// ============================================

/**
 * Create a token with defaults.
 */
export function createToken(
  type: Token['type'],
  value: string,
  overrides: Partial<Token> = {}
): Token {
  return {
    type,
    value,
    line: 0,
    column: 0,
    ...overrides,
  }
}

/**
 * Create common token types with shorthand.
 */
export const token = {
  property: (value: string, line = 0, column = 0): Token =>
    createToken('PROPERTY', value, { line, column }),
  number: (value: string | number, line = 0, column = 0): Token =>
    createToken('NUMBER', String(value), { line, column }),
  color: (value: string, line = 0, column = 0): Token =>
    createToken('COLOR', value, { line, column }),
  string: (value: string, line = 0, column = 0): Token =>
    createToken('STRING', value, { line, column }),
  component: (value: string, line = 0, column = 0): Token =>
    createToken('COMPONENT_NAME', value, { line, column }),
  keyword: (value: string, line = 0, column = 0): Token =>
    createToken('KEYWORD', value, { line, column }),
  modifier: (value: string, line = 0, column = 0): Token =>
    createToken('MODIFIER', value, { line, column }),
  tokenRef: (value: string, line = 0, column = 0): Token =>
    createToken('TOKEN_REF', value, { line, column }),
  direction: (value: string, line = 0, column = 0): Token =>
    createToken('DIRECTION', value, { line, column }),
  newline: (line = 0): Token =>
    createToken('NEWLINE', '\n', { line, column: 0 }),
  eof: (line = 0): Token =>
    createToken('EOF', '', { line, column: 0 }),
  parenOpen: (line = 0, column = 0): Token =>
    createToken('PAREN_OPEN', '(', { line, column }),
  parenClose: (line = 0, column = 0): Token =>
    createToken('PAREN_CLOSE', ')', { line, column }),
  comma: (line = 0, column = 0): Token =>
    createToken('COMMA', ',', { line, column }),
}

// ============================================
// AST Node Builders
// ============================================

/**
 * Create an AST node with sensible defaults.
 */
export function createASTNode(overrides: Partial<ASTNode> = {}): ASTNode {
  return {
    type: 'component',
    name: 'Box',
    id: 'box1',
    modifiers: [],
    properties: {},
    children: [],
    ...overrides,
  }
}

/**
 * Create a conditional node for testing if/else rendering.
 */
export function createConditionalNode(
  condition: ConditionExpr,
  children: ASTNode[] = [],
  elseChildren?: ASTNode[]
): ASTNode {
  return createASTNode({
    name: '_conditional',
    id: 'cond1',
    condition,
    children,
    elseChildren,
  })
}

/**
 * Create an iterator node for testing each loops.
 */
export function createIteratorNode(
  collectionVar: string,
  itemVar: string = 'item',
  children: ASTNode[] = []
): ASTNode {
  return createASTNode({
    name: '_iterator',
    id: 'iter1',
    iteration: {
      itemVar,
      collectionVar,
    },
    children,
  })
}

/**
 * Create a text node.
 */
export function createTextNode(content: string, id = 'text1'): ASTNode {
  return createASTNode({
    name: '_text',
    id,
    content,
  })
}

/**
 * Create a component template.
 */
export function createComponentTemplate(
  overrides: Partial<ComponentTemplate> = {}
): ComponentTemplate {
  return {
    modifiers: [],
    properties: {},
    children: [],
    ...overrides,
  }
}

// ============================================
// Condition Builders
// ============================================

/**
 * Create a variable condition.
 */
export function varCondition(name: string): ConditionExpr {
  return { type: 'var', name }
}

/**
 * Create a negated condition.
 */
export function notCondition(operand: ConditionExpr): ConditionExpr {
  return { type: 'not', operand }
}

/**
 * Create an AND condition.
 */
export function andCondition(left: ConditionExpr, right: ConditionExpr): ConditionExpr {
  return { type: 'and', left, right }
}

/**
 * Create an OR condition.
 */
export function orCondition(left: ConditionExpr, right: ConditionExpr): ConditionExpr {
  return { type: 'or', left, right }
}

/**
 * Create a comparison condition.
 */
export function compareCondition(
  left: ConditionExpr,
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=',
  value: string | number | boolean
): ConditionExpr {
  return {
    type: 'comparison',
    left,
    operator,
    value,
  }
}

// ============================================
// Style Mixin Builders
// ============================================

/**
 * Create a style mixin.
 */
export function createStyleMixin(overrides: Partial<StyleMixin> = {}): StyleMixin {
  return {
    properties: {},
    modifiers: [],
    ...overrides,
  }
}

// ============================================
// Parser Context Builders
// ============================================

/**
 * Create a parser context from DSL source code.
 * This is the recommended way to create contexts for testing.
 */
export function createContextFromSource(source: string): ParserContext {
  const tokens = tokenize(source)
  return createParserContext(tokens, source)
}

/**
 * Create a parser context from a token array.
 * Useful for unit testing individual parser functions.
 */
export function createContextFromTokens(tokens: Token[], source = ''): ParserContext {
  return createParserContext(tokens, source)
}

/**
 * Create a parser context with pre-configured registries.
 */
export function createContextWithRegistry(
  tokens: Token[],
  options: {
    registry?: Map<string, ComponentTemplate>
    designTokens?: Map<string, string | number>
    styleMixins?: Map<string, StyleMixin>
  } = {}
): ParserContext {
  const ctx = createParserContext(tokens, '')

  if (options.registry) {
    for (const [name, template] of options.registry) {
      ctx.registry.set(name, template)
    }
  }

  if (options.designTokens) {
    for (const [name, value] of options.designTokens) {
      ctx.designTokens.set(name, value)
    }
  }

  if (options.styleMixins) {
    for (const [name, mixin] of options.styleMixins) {
      ctx.styleMixins.set(name, mixin)
    }
  }

  return ctx
}

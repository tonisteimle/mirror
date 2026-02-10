/**
 * Iterator Parser Module
 *
 * Parses each loops for iterating over collections.
 * Syntax: each $item in $collection
 *
 * Uses dependency injection to avoid circular dependencies with component-parser.
 */

import type { ParserContext } from './parser-context'
import type { ASTNode } from './types'
import { INTERNAL_NODES } from '../constants'

/**
 * Type for the component parser function (dependency injection).
 */
export type ComponentParserFn = (
  ctx: ParserContext,
  baseIndent: number,
  parentScope?: string
) => ASTNode | null

/**
 * Parse an iterator (each loop).
 *
 * @param ctx Parser context
 * @param childIndent Current indentation level
 * @param componentName Parent component name for scoping
 * @param parseComponentFn Injected parseComponent function to avoid circular dependency
 */
export function parseIterator(
  ctx: ParserContext,
  childIndent: number,
  componentName: string,
  parseComponentFn: ComponentParserFn
): ASTNode {
  const eachLine = ctx.current()!.line
  ctx.advance() // consume 'each'

  // Parse: each $item in $items
  let itemVar = ''
  if (ctx.current()?.type === 'TOKEN_REF') {
    itemVar = ctx.advance().value
  }

  // Consume 'in'
  if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'in') {
    ctx.advance()
  }

  // Parse collection
  let collectionVar = ''
  let collectionPath: string[] | undefined
  if (ctx.current()?.type === 'TOKEN_REF') {
    const collectionValue = ctx.advance().value
    const parts = collectionValue.split('.')
    collectionVar = parts[0]
    if (parts.length > 1) {
      collectionPath = parts
    }
  }

  const iterNode: ASTNode = {
    type: 'component',
    name: INTERNAL_NODES.ITERATOR,
    id: ctx.generateId('iter'),
    modifiers: [],
    properties: {},
    children: [],
    iteration: {
      itemVar,
      collectionVar,
      collectionPath
    },
    line: eachLine
  }

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse template children (deeper indent)
  while (ctx.current()?.type === 'INDENT') {
    const templateIndent = parseInt(ctx.current()!.value, 10)
    if (templateIndent > childIndent) {
      ctx.advance() // consume indent
      const templateChild = parseComponentFn(ctx, templateIndent, componentName)
      if (templateChild) {
        iterNode.children.push(templateChild)
      }
      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      break
    }
  }

  return iterNode
}

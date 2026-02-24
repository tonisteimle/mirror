/**
 * @module iterator-parser
 * @description Iterator Parser - Parst each-Loops für Iteration
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Parst each-Loops zum Iterieren über Collections
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNTAX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Basic Iterator
 *   each $item in $collection
 *     Card $item.title
 *
 * @syntax With Nested Path
 *   each $task in $data.tasks
 *     TaskItem $task.name
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PARSING-ALGORITHMUS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @algorithm parseIterator
 *   1. Consume 'each' Keyword
 *   2. Parse Item-Variable ($item)
 *   3. Consume 'in' Keyword
 *   4. Parse Collection-Variable ($collection)
 *      - Kann Punkt-Pfad enthalten: $data.items.active
 *   5. Erstelle _iterator Node mit iteration-Metadaten
 *   6. Parse Template-Children (tiefere Einrückung)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * OUTPUT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @output ASTNode
 *   {
 *     name: '_iterator',
 *     iteration: {
 *       itemVar: 'item',           // Variable für jedes Element
 *       collectionVar: 'tasks',    // Root-Variable der Collection
 *       collectionPath: ['data', 'tasks']  // Optional: Voller Pfad
 *     },
 *     children: [...]              // Template das wiederholt wird
 *   }
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEPENDENCY INJECTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type ComponentParserFn
 *   Injizierte Funktion um zirkuläre Dependencies zu vermeiden
 *   parseIterator → braucht parseComponent
 *   parseComponent → braucht parseIterator
 *   → Lösung: parseComponent als Parameter übergeben
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BEISPIEL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example Input
 *   $tasks: [{ title: "Task 1" }, { title: "Task 2" }]
 *
 *   each $task in $tasks
 *     Card
 *       Text $task.title
 *
 * @example Output AST
 *   {
 *     name: '_iterator',
 *     iteration: { itemVar: 'task', collectionVar: 'tasks' },
 *     children: [{
 *       name: 'Card',
 *       children: [{ name: 'Text', content: '$task.title' }]
 *     }]
 *   }
 *
 * @used-by component-parser/index.ts für each-Blöcke
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

/**
 * Table Parser
 *
 * Handles parsing of Table components and their sub-structures.
 * This module is prepared for future extraction from the main parser.
 *
 * TODO: Migrate the following methods from parser.ts:
 * - parseTable (line ~1792)
 * - parseTableClauses (line ~1854)
 * - parseTableExpression (line ~1896)
 * - parseTableBody (line ~1959)
 * - parseTablePaginatorSlot (line ~2041)
 * - parseTableStaticRow (line ~2113)
 * - parseTableColumn (line ~2218)
 * - parseTableSlot (line ~2364)
 * - parseTableCellSlot (line ~2434)
 *
 * Dependencies needed:
 * - ParserContext from parser-context.ts
 * - AST types from ./ast.ts
 */

import type { TableNode, TableColumnNode, TableSlotNode, TableStaticRowNode } from './ast'
import type { ParserContext } from './parser-context'

/**
 * Parse result for Table components.
 */
export interface TableParseResult {
  node: TableNode | null
  errors: string[]
}

/**
 * Parse a Table component.
 * Currently delegates to the main parser - will be migrated here.
 */
export function parseTable(
  _ctx: ParserContext,
  _nameToken: { value: string; line: number; column: number }
): TableParseResult {
  // TODO: Migrate from Parser.parseTable
  throw new Error('Not yet migrated - use Parser.parseTable')
}

/**
 * Parse a Table column definition.
 * Currently delegates to the main parser - will be migrated here.
 */
export function parseTableColumn(
  _ctx: ParserContext
): TableColumnNode | null {
  // TODO: Migrate from Parser.parseTableColumn
  throw new Error('Not yet migrated - use Parser.parseTableColumn')
}

/**
 * Parse a Table slot (Header:, Row:, Footer:, etc.)
 * Currently delegates to the main parser - will be migrated here.
 */
export function parseTableSlot(
  _ctx: ParserContext,
  _slotName: string
): TableSlotNode | null {
  // TODO: Migrate from Parser.parseTableSlot
  throw new Error('Not yet migrated - use Parser.parseTableSlot')
}

/**
 * Parse a static table row.
 * Currently delegates to the main parser - will be migrated here.
 */
export function parseTableStaticRow(
  _ctx: ParserContext
): TableStaticRowNode | null {
  // TODO: Migrate from Parser.parseTableStaticRow
  throw new Error('Not yet migrated - use Parser.parseTableStaticRow')
}

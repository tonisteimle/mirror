/**
 * Table Parser
 *
 * Handles parsing of Table components and their sub-structures.
 * Extracted from the main parser for better modularity.
 *
 * Dependencies:
 * - ParserContext from parser-context.ts for state management
 * - ParserUtils for token manipulation
 * - Callbacks for parseInlineProperties and parseInstance (circular dependency)
 */

import type { Token } from './lexer'
import type {
  TableNode,
  TableColumnNode,
  TableSlotNode,
  TableStaticRowNode,
  TableStaticCellNode,
  Property,
  Event,
  Instance,
  Slot,
} from './ast'
import type { ParserContext } from './parser-context'
import { ParserUtils } from './parser-context'
import { logParser as log } from '../utils/logger'

/**
 * Callbacks to main parser for methods that can't be extracted
 * due to circular dependencies.
 */
export interface TableParserCallbacks {
  parseInlineProperties: (properties: Property[], events?: Event[]) => void
  parseInstance: (nameToken: Token) => Instance | Slot | TableNode | { type: 'ZagComponent' }
}

/**
 * Maximum iterations for loops to prevent infinite loops.
 */
const MAX_ITERATIONS = 100000

// Shorthand aliases for cleaner code
const U = ParserUtils

/**
 * Parse a Table component.
 *
 * Syntax:
 *   Table $data [where expr] [by field [desc]]
 *     Column field, w 100, sortable
 *     Header:
 *       ...custom header
 */
export function parseTable(
  ctx: ParserContext,
  nameToken: Token,
  callbacks: TableParserCallbacks
): TableNode {
  const table: TableNode = {
    type: 'Table',
    properties: [],
    columns: [],
    line: nameToken.line,
    column: nameToken.column,
  }

  // Parse data source: $collection (parsed as IDENTIFIER starting with $)
  // Data source is optional - manual tables don't have one
  if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value.startsWith('$')) {
    table.dataSource = U.advance(ctx).value
    // Parse optional clauses: where, by, grouped by (only for data-driven tables)
    parseTableClauses(ctx, table)
  }

  // Parse inline properties (select, pageSize, etc.)
  const events: Event[] = []
  callbacks.parseInlineProperties(table.properties, events)

  // Convert select() event to selectionMode property
  // select() appears as an event with action 'select'
  for (const event of events) {
    for (const action of event.actions) {
      if (action.name === 'select') {
        // Check if multi: select(multi)
        const isMulti = action.args?.some(arg =>
          typeof arg === 'string' && arg === 'multi'
        )
        table.properties.push({
          type: 'Property',
          name: 'selectionMode',
          values: [isMulti ? 'multi' : 'single'],
          line: event.line,
          column: event.column,
        })
      }
    }
  }

  // Extract stickyHeader flag from properties
  const stickyHeaderProp = table.properties.find(p => p.name === 'stickyHeader')
  if (stickyHeaderProp) {
    table.stickyHeader = true
    // Remove from properties array (it's a direct flag, not a style property)
    table.properties = table.properties.filter(p => p.name !== 'stickyHeader')
  }

  // Parse children (Column, Header:, Row:, Footer:, Group:)
  if (U.check(ctx, 'INDENT')) {
    U.advance(ctx)
    parseTableBody(ctx, table, callbacks)
  }

  return table
}

/**
 * Parse Table clauses: where, by, grouped by
 * Note: where, by, desc, grouped are reserved keywords with their own token types
 */
function parseTableClauses(ctx: ParserContext, table: TableNode): void {
  for (let iter = 0; !U.isAtEnd(ctx) && iter < MAX_ITERATIONS; iter++) {
    // Check for 'where' clause (token type WHERE)
    if (U.check(ctx, 'WHERE')) {
      U.advance(ctx)
      table.filter = parseTableExpression(ctx)
    }
    // Check for 'by' clause (token type BY)
    else if (U.check(ctx, 'BY')) {
      U.advance(ctx)
      if (U.check(ctx, 'IDENTIFIER')) {
        table.orderBy = U.advance(ctx).value
        // Check for desc (token type DESC)
        if (U.check(ctx, 'DESC')) {
          U.advance(ctx)
          table.orderDesc = true
        }
      }
    }
    // Check for 'grouped by' clause (token type GROUPED)
    else if (U.check(ctx, 'GROUPED')) {
      U.advance(ctx)
      // Expect "by" after "grouped"
      if (U.check(ctx, 'BY')) {
        U.advance(ctx)
        if (U.check(ctx, 'IDENTIFIER')) {
          table.groupBy = U.advance(ctx).value
        }
      }
    }
    // Not a clause keyword, stop parsing clauses
    else {
      break
    }
  }
}

/**
 * Parse a table expression (for where clause)
 * Collects tokens until we hit a clause keyword or comma
 * Note: by, grouped are reserved keywords with their own token types (BY, GROUPED)
 */
function parseTableExpression(ctx: ParserContext): string {
  const parts: string[] = []
  const comparisonTokens = new Set([
    'EQUALS', 'GT', 'LT', 'GTE', 'LTE', 'NOT_EQUAL',
    'STRICT_EQUAL', 'STRICT_NOT_EQUAL', 'AND_AND', 'OR_OR', 'BANG'
  ])

  // Safety guard to prevent infinite loops
  let lastPos = ctx.pos
  const maxIterations = 1000 // Reasonable limit for expression parsing

  for (let i = 0; i < maxIterations && !U.isAtEnd(ctx) && !U.check(ctx, 'COMMA') && !U.check(ctx, 'NEWLINE') && !U.check(ctx, 'INDENT'); i++) {
    const token = U.current(ctx)

    // Stop at clause keywords (these have their own token types)
    if (token.type === 'BY' || token.type === 'GROUPED') {
      break
    }

    // Handle token reference ($variable)
    if (token.type === 'IDENTIFIER' && token.value.startsWith('$')) {
      parts.push(`$get("${token.value.slice(1)}")`)
    } else if (token.type === 'STRING') {
      parts.push(`"${token.value}"`)
    } else if (comparisonTokens.has(token.type)) {
      // Map token types to JavaScript operators
      const opMap: Record<string, string> = {
        'EQUALS': '==',
        'GT': '>',
        'LT': '<',
        'GTE': '>=',
        'LTE': '<=',
        'NOT_EQUAL': '!=',
        'STRICT_EQUAL': '===',
        'STRICT_NOT_EQUAL': '!==',
        'AND_AND': '&&',
        'OR_OR': '||',
        'BANG': '!',
      }
      parts.push(opMap[token.type] || token.value)
    } else if (token.type === 'OR') {
      // Convert 'or' keyword to '||'
      parts.push('||')
    } else if (token.type === 'AND') {
      // Convert 'and' keyword to '&&'
      parts.push('&&')
    } else {
      parts.push(token.value)
    }

    U.advance(ctx)

    // Verify progress to prevent infinite loop
    if (ctx.pos === lastPos) {
      log.warn('parseTableExpression: no progress made, breaking to prevent infinite loop')
      break
    }
    lastPos = ctx.pos
  }

  return parts.join(' ')
}

/**
 * Parse Table body (columns, slots, and static rows)
 */
function parseTableBody(
  ctx: ParserContext,
  table: TableNode,
  callbacks: TableParserCallbacks
): void {
  while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx)) {
    // Skip newlines
    if (U.check(ctx, 'NEWLINE')) {
      U.advance(ctx)
      continue
    }

    if (U.check(ctx, 'IDENTIFIER')) {
      const name = U.current(ctx).value

      if (name === 'Column') {
        U.advance(ctx)
        const column = parseTableColumn(ctx, callbacks)
        table.columns.push(column)
      } else if (name === 'Header' && U.checkNext(ctx, 'COLON')) {
        U.advance(ctx) // Header
        U.advance(ctx) // :
        table.headerSlot = parseTableSlot(ctx, 'Header', callbacks)
      } else if (name === 'Row' && U.checkNext(ctx, 'COLON')) {
        // Row: slot for data-driven tables
        U.advance(ctx) // Row
        U.advance(ctx) // :
        table.rowSlot = parseTableSlot(ctx, 'Row', callbacks)
      } else if (name === 'RowOdd' && U.checkNext(ctx, 'COLON')) {
        // RowOdd: slot for zebra striping (odd rows)
        U.advance(ctx) // RowOdd
        U.advance(ctx) // :
        table.rowOddSlot = parseTableSlot(ctx, 'RowOdd', callbacks)
      } else if (name === 'RowEven' && U.checkNext(ctx, 'COLON')) {
        // RowEven: slot for zebra striping (even rows)
        U.advance(ctx) // RowEven
        U.advance(ctx) // :
        table.rowEvenSlot = parseTableSlot(ctx, 'RowEven', callbacks)
      } else if (name === 'Row' && !U.checkNext(ctx, 'COLON')) {
        // Row without colon = static row for manual tables
        U.advance(ctx) // Row
        const staticRow = parseTableStaticRow(ctx, callbacks)
        if (!table.staticRows) table.staticRows = []
        table.staticRows.push(staticRow)
      } else if (name === 'Footer' && U.checkNext(ctx, 'COLON')) {
        U.advance(ctx) // Footer
        U.advance(ctx) // :
        table.footerSlot = parseTableSlot(ctx, 'Footer', callbacks)
      } else if (name === 'Group' && U.checkNext(ctx, 'COLON')) {
        U.advance(ctx) // Group
        U.advance(ctx) // :
        table.groupSlot = parseTableSlot(ctx, 'Group', callbacks)
      } else if (name === 'SortIcon' && U.checkNext(ctx, 'COLON')) {
        U.advance(ctx) // SortIcon
        U.advance(ctx) // :
        table.sortIconSlot = parseTableSlot(ctx, 'SortIcon', callbacks)
      } else if (name === 'SortAsc' && U.checkNext(ctx, 'COLON')) {
        U.advance(ctx) // SortAsc
        U.advance(ctx) // :
        table.sortAscSlot = parseTableSlot(ctx, 'SortAsc', callbacks)
      } else if (name === 'SortDesc' && U.checkNext(ctx, 'COLON')) {
        U.advance(ctx) // SortDesc
        U.advance(ctx) // :
        table.sortDescSlot = parseTableSlot(ctx, 'SortDesc', callbacks)
      } else if (name === 'Paginator' && U.checkNext(ctx, 'COLON')) {
        U.advance(ctx) // Paginator
        U.advance(ctx) // :
        table.paginatorSlot = parseTablePaginatorSlot(ctx, callbacks)
      } else {
        // Unknown, skip
        U.advance(ctx)
      }
    } else {
      U.advance(ctx)
    }
  }

  // Consume DEDENT
  if (U.check(ctx, 'DEDENT')) {
    U.advance(ctx)
  }
}

/**
 * Parse Paginator: slot with sub-slots (Prev:, Next:, PageInfo:)
 */
function parseTablePaginatorSlot(
  ctx: ParserContext,
  callbacks: TableParserCallbacks
): TableSlotNode {
  const startToken = ctx.tokens[ctx.pos - 1] // previous token
  const slot: TableSlotNode = {
    name: 'Paginator',
    properties: [],
    children: [],
    sourcePosition: {
      line: startToken?.line ?? 0,
      column: startToken?.column ?? 0,
      endLine: startToken?.line ?? 0,
      endColumn: startToken?.column ?? 0,
    },
  }

  // Parse inline properties
  callbacks.parseInlineProperties(slot.properties)

  if (U.check(ctx, 'INDENT')) {
    U.advance(ctx)
    while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx)) {
      if (U.check(ctx, 'NEWLINE')) {
        U.advance(ctx)
        continue
      }

      if (U.check(ctx, 'IDENTIFIER')) {
        const subName = U.current(ctx).value

        if (subName === 'Prev' && U.checkNext(ctx, 'COLON')) {
          U.advance(ctx) // Prev
          U.advance(ctx) // :
          slot.prevSlot = parseTableSlot(ctx, 'Prev', callbacks)
        } else if (subName === 'Next' && U.checkNext(ctx, 'COLON')) {
          U.advance(ctx) // Next
          U.advance(ctx) // :
          slot.nextSlot = parseTableSlot(ctx, 'Next', callbacks)
        } else if (subName === 'PageInfo' && U.checkNext(ctx, 'COLON')) {
          U.advance(ctx) // PageInfo
          U.advance(ctx) // :
          slot.pageInfoSlot = parseTableSlot(ctx, 'PageInfo', callbacks)
        } else {
          // Regular child element
          const child = callbacks.parseInstance(U.advance(ctx))
          if (child.type !== 'ZagComponent' && child.type !== 'Table') {
            slot.children.push(child as Instance | Slot)
          }
        }
      } else {
        U.advance(ctx)
      }
    }
    if (U.check(ctx, 'DEDENT')) {
      U.advance(ctx)
    }
  }

  return slot
}

/**
 * Parse a static Row for manual tables
 *
 * Syntax:
 *   Row "Cell1", "Cell2", "Cell3"
 *   Row
 *     Text "Content"
 *     Frame ...
 */
function parseTableStaticRow(
  ctx: ParserContext,
  callbacks: TableParserCallbacks
): TableStaticRowNode {
  const startToken = ctx.tokens[ctx.pos - 1] // previous token
  const row: TableStaticRowNode = {
    type: 'TableStaticRow',
    cells: [],
    properties: [],
    line: startToken?.line ?? 0,
    column: startToken?.column ?? 0,
  }

  // Parse inline cells (strings separated by commas)
  // Row "Name", "Age", "Email"
  while (!U.check(ctx, 'NEWLINE') && !U.check(ctx, 'INDENT') && !U.isAtEnd(ctx)) {
    if (U.check(ctx, 'STRING')) {
      const token = U.advance(ctx)
      row.cells.push({
        type: 'TableStaticCell',
        text: token.value,
        properties: [],
        line: token.line,
        column: token.column,
      })
    } else if (U.check(ctx, 'NUMBER')) {
      const token = U.advance(ctx)
      row.cells.push({
        type: 'TableStaticCell',
        text: String(token.value),
        properties: [],
        line: token.line,
        column: token.column,
      })
    } else if (U.check(ctx, 'COMMA')) {
      U.advance(ctx)
    } else if (U.check(ctx, 'IDENTIFIER')) {
      // Could be a property like bg, pad, etc.
      // For now, skip unknown identifiers in inline position
      break
    } else {
      break
    }
  }

  // Skip newline
  if (U.check(ctx, 'NEWLINE')) {
    U.advance(ctx)
  }

  // Parse child content (indented block)
  if (U.check(ctx, 'INDENT')) {
    U.advance(ctx)
    // If we had inline cells, children are additional content
    // If no inline cells, children become the cell content
    const children: (Instance | Slot)[] = []

    while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx)) {
      if (U.check(ctx, 'NEWLINE')) {
        U.advance(ctx)
        continue
      }

      if (U.check(ctx, 'IDENTIFIER')) {
        const child = callbacks.parseInstance(U.advance(ctx))
        // Only accept Instance and Slot in static cells (not Table/Zag)
        if (child && (child.type === 'Instance' || child.type === 'Slot')) {
          children.push(child)
        }
      } else {
        U.advance(ctx)
      }
    }

    // If we have children but no cells, wrap children in a single cell
    if (row.cells.length === 0 && children.length > 0) {
      row.cells.push({
        type: 'TableStaticCell',
        children,
        properties: [],
        line: startToken?.line ?? 0,
        column: startToken?.column ?? 0,
      })
    } else if (children.length > 0) {
      // Add children to the last cell or create new cell
      const lastCell = row.cells[row.cells.length - 1]
      if (lastCell && !lastCell.children) {
        lastCell.children = children
      }
    }

    if (U.check(ctx, 'DEDENT')) {
      U.advance(ctx)
    }
  }

  return row
}

/**
 * Parse a Column definition
 *
 * Syntax:
 *   Column fieldName [, w N] [, suffix "str"] [, sortable] [, sum|avg|count]
 *   Column "Custom Label"
 *     Cell:
 *       ...custom cell template
 */
function parseTableColumn(
  ctx: ParserContext,
  callbacks: TableParserCallbacks
): TableColumnNode {
  const startToken = ctx.tokens[ctx.pos - 1] // previous token
  const column: TableColumnNode = {
    type: 'TableColumn',
    field: '',
    line: startToken?.line ?? 0,
    column: startToken?.column ?? 0,
  }

  // Column-config properties (not style properties)
  const columnConfigProps = new Set([
    'w', 'width', 'prefix', 'suffix', 'align', 'sortable', 'desc',
    'filterable', 'hidden', 'sum', 'avg', 'count'
  ])

  // Field name or custom label
  if (U.check(ctx, 'STRING')) {
    column.label = U.advance(ctx).value
    column.field = column.label.toLowerCase().replace(/\s+/g, '_')
  } else if (U.check(ctx, 'IDENTIFIER')) {
    column.field = U.advance(ctx).value
  }

  // Parse column properties
  while (U.check(ctx, 'COMMA')) {
    U.advance(ctx) // consume comma

    if (U.check(ctx, 'IDENTIFIER')) {
      const propName = U.advance(ctx).value

      // Check if this is a column-config property
      if (columnConfigProps.has(propName)) {
        switch (propName) {
          case 'w':
          case 'width':
            if (U.check(ctx, 'NUMBER')) {
              column.width = parseInt(U.advance(ctx).value, 10)
            }
            break
          case 'prefix':
            if (U.check(ctx, 'STRING')) {
              column.prefix = U.advance(ctx).value
            }
            break
          case 'suffix':
            if (U.check(ctx, 'STRING')) {
              column.suffix = U.advance(ctx).value
            }
            break
          case 'align':
            if (U.check(ctx, 'IDENTIFIER')) {
              const alignValue = U.advance(ctx).value
              if (alignValue === 'left' || alignValue === 'right' || alignValue === 'center') {
                column.align = alignValue
              }
            }
            break
          case 'sortable':
            column.sortable = true
            break
          case 'desc':
            column.sortDesc = true
            break
          case 'filterable':
            column.filterable = true
            break
          case 'hidden':
            column.hidden = true
            break
          case 'sum':
            column.aggregation = 'sum'
            break
          case 'avg':
            column.aggregation = 'avg'
            break
          case 'count':
            column.aggregation = 'count'
            break
        }
      } else {
        // Style property - collect for cell styling
        if (!column.cellProperties) column.cellProperties = []
        const prevToken = ctx.tokens[ctx.pos - 1]
        const prop: Property = {
          type: 'Property',
          name: propName,
          values: [],
          line: prevToken?.line ?? 0,
          column: prevToken?.column ?? 0,
        }
        // Collect value(s) for this property
        while (!U.check(ctx, 'COMMA') && !U.check(ctx, 'NEWLINE') && !U.check(ctx, 'INDENT') && !U.isAtEnd(ctx)) {
          const token = U.advance(ctx)
          if (token.type === 'NUMBER') {
            // Hex colors like #333 come as NUMBER tokens - keep as string
            if (token.value.startsWith('#')) {
              prop.values.push(token.value)
            } else {
              prop.values.push(parseFloat(token.value))
            }
          } else if (token.type === 'STRING') {
            prop.values.push(token.value)
          } else if (token.type === 'IDENTIFIER') {
            // Check if it's a color (#hex)
            if (token.value.startsWith('#')) {
              prop.values.push(token.value)
            } else {
              prop.values.push(token.value)
            }
          } else {
            break
          }
        }
        column.cellProperties.push(prop)
      }
    }
  }

  // Check for Cell: slot (custom cell template)
  if (U.check(ctx, 'INDENT')) {
    U.advance(ctx)
    while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx)) {
      if (U.check(ctx, 'NEWLINE')) {
        U.advance(ctx)
        continue
      }

      if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value === 'Cell' && U.checkNext(ctx, 'COLON')) {
        U.advance(ctx) // Cell
        U.advance(ctx) // :
        column.customCell = parseTableCellSlot(ctx, callbacks)
      } else {
        U.advance(ctx)
      }
    }
    if (U.check(ctx, 'DEDENT')) {
      U.advance(ctx)
    }
  }

  return column
}

/**
 * Parse a Table slot (Header:, Row:, Footer:, Group:)
 */
function parseTableSlot(
  ctx: ParserContext,
  slotName: string,
  callbacks: TableParserCallbacks
): TableSlotNode {
  const startToken = ctx.tokens[ctx.pos - 1] // previous token
  const slot: TableSlotNode = {
    name: slotName,
    properties: [],
    children: [],
    sourcePosition: {
      line: startToken?.line ?? 0,
      column: startToken?.column ?? 0,
      endLine: startToken?.line ?? 0,
      endColumn: startToken?.column ?? 0,
    },
  }

  // Parse inline properties
  callbacks.parseInlineProperties(slot.properties)

  // For Row: slot, add 'row' and 'index' as loop variables
  // so that row.field references are detected as loop variable references
  const isRowSlot = slotName === 'Row'
  if (isRowSlot) {
    ctx.loopVariables.add('row')
    ctx.loopVariables.add('index')
  }

  // Parse children - use try-finally to guarantee loop variable cleanup
  try {
    if (U.check(ctx, 'INDENT')) {
      U.advance(ctx)
      while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx)) {
        if (U.check(ctx, 'NEWLINE')) {
          U.advance(ctx)
          continue
        }

        if (U.check(ctx, 'IDENTIFIER')) {
          const name = U.current(ctx).value

          // Special case: Row without colon inside Header or Footer slot = static row
          if ((slotName === 'Header' || slotName === 'Footer') && name === 'Row' && !U.checkNext(ctx, 'COLON')) {
            U.advance(ctx) // Row
            slot.staticRow = parseTableStaticRow(ctx, callbacks)
          } else {
            const child = callbacks.parseInstance(U.advance(ctx))
            if (child.type !== 'ZagComponent') {
              slot.children.push(child as Instance | Slot)
            }
          }
        } else {
          U.advance(ctx)
        }
      }
      if (U.check(ctx, 'DEDENT')) {
        U.advance(ctx)
      }
    }
  } finally {
    // Clean up loop variables for Row: slot - guaranteed to run
    if (isRowSlot) {
      ctx.loopVariables.delete('row')
      ctx.loopVariables.delete('index')
    }
  }

  return slot
}

/**
 * Parse a custom Cell template
 */
function parseTableCellSlot(
  ctx: ParserContext,
  callbacks: TableParserCallbacks
): (Instance | Slot)[] {
  const children: (Instance | Slot)[] = []

  // Parse inline content first
  if (U.check(ctx, 'IDENTIFIER')) {
    const child = callbacks.parseInstance(U.advance(ctx))
    if (child.type !== 'ZagComponent') {
      children.push(child as Instance | Slot)
    }
  }

  // Parse indented children
  if (U.check(ctx, 'INDENT')) {
    U.advance(ctx)
    while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx)) {
      if (U.check(ctx, 'NEWLINE')) {
        U.advance(ctx)
        continue
      }

      if (U.check(ctx, 'IDENTIFIER')) {
        const child = callbacks.parseInstance(U.advance(ctx))
        if (child.type !== 'ZagComponent') {
          children.push(child as Instance | Slot)
        }
      } else {
        U.advance(ctx)
      }
    }
    if (U.check(ctx, 'DEDENT')) {
      U.advance(ctx)
    }
  }

  return children
}

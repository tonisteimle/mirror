/**
 * Table Transformer
 *
 * Transforms TableNode AST nodes into IRTable representation.
 * Extracted from ir/index.ts for modularity.
 */

import type {
  TableNode,
  TableColumnNode,
  TableSlotNode,
  TableStaticRowNode,
  TableStaticCellNode,
} from '../../parser/ast'
import type { IRTable, IRTableColumn, IRTableStaticRow, IRTableStaticCell, IRNode, IRStyle } from '../types'
import type { TransformerContext } from './transformer-context'
import { createSourcePosition } from './transformer-context'

/**
 * Transform a TableNode to an IRTable
 */
export function transformTable(ctx: TransformerContext, table: TableNode): IRTable {
  const nodeId = ctx.generateId()

  // Extract selection mode from properties
  const selectionModeProp = table.properties.find(p => p.name === 'selectionMode')
  const selectionMode = selectionModeProp?.values[0] as 'single' | 'multi' | undefined

  // Extract pageSize from properties
  const pageSizeProp = table.properties.find(p => p.name === 'pageSize')
  const pageSize = pageSizeProp?.values[0] ? parseInt(String(pageSizeProp.values[0]), 10) : undefined

  // Transform column definitions
  const columns: IRTableColumn[] = (table.columns || []).map(col => transformTableColumn(ctx, col))

  // Transform table-level styles (excluding behavioral props)
  const behavioralProps = new Set(['selectionMode', 'pageSize', 'stickyHeader'])
  const tableStyleProps = table.properties.filter(p => !behavioralProps.has(p.name))
  const tableStyles = ctx.transformProperties(tableStyleProps, 'frame')

  // Transform slots to IRNode arrays
  const headerSlot = table.headerSlot
    ? transformTableSlotChildren(ctx, table.headerSlot)
    : undefined
  const headerSlotStyles = table.headerSlot
    ? transformTableSlotStyles(ctx, table.headerSlot)
    : undefined
  const headerStaticRow = table.headerSlot?.staticRow
    ? transformTableStaticRow(ctx, table.headerSlot.staticRow)
    : undefined

  const rowSlot = table.rowSlot
    ? transformTableSlotChildren(ctx, table.rowSlot)
    : undefined
  const rowSlotStyles = table.rowSlot
    ? transformTableSlotStyles(ctx, table.rowSlot)
    : undefined

  // Zebra striping: odd/even row styles
  const rowOddStyles = table.rowOddSlot
    ? transformTableSlotStyles(ctx, table.rowOddSlot)
    : undefined
  const rowEvenStyles = table.rowEvenSlot
    ? transformTableSlotStyles(ctx, table.rowEvenSlot)
    : undefined

  const footerSlot = table.footerSlot
    ? transformTableSlotChildren(ctx, table.footerSlot)
    : undefined
  const footerSlotStyles = table.footerSlot
    ? transformTableSlotStyles(ctx, table.footerSlot)
    : undefined
  const footerStaticRow = table.footerSlot?.staticRow
    ? transformTableStaticRow(ctx, table.footerSlot.staticRow)
    : undefined

  const groupSlot = table.groupSlot
    ? transformTableSlotChildren(ctx, table.groupSlot)
    : undefined
  const groupSlotStyles = table.groupSlot
    ? transformTableSlotStyles(ctx, table.groupSlot)
    : undefined

  // Transform sort icon slots
  const sortIconSlot = table.sortIconSlot
    ? transformTableSlotChildren(ctx, table.sortIconSlot)
    : undefined
  const sortAscSlot = table.sortAscSlot
    ? transformTableSlotChildren(ctx, table.sortAscSlot)
    : undefined
  const sortDescSlot = table.sortDescSlot
    ? transformTableSlotChildren(ctx, table.sortDescSlot)
    : undefined

  // Transform paginator slot
  const paginatorSlot = table.paginatorSlot
    ? transformTableSlotChildren(ctx, table.paginatorSlot)
    : undefined
  const paginatorSlotStyles = table.paginatorSlot
    ? transformTableSlotStyles(ctx, table.paginatorSlot)
    : undefined

  // Handle paginator sub-slots
  const paginatorPrevSlot = table.paginatorSlot?.prevSlot
    ? transformTableSlotChildren(ctx, table.paginatorSlot.prevSlot)
    : undefined
  const paginatorPrevSlotStyles = table.paginatorSlot?.prevSlot
    ? transformTableSlotStyles(ctx, table.paginatorSlot.prevSlot)
    : undefined
  const paginatorNextSlot = table.paginatorSlot?.nextSlot
    ? transformTableSlotChildren(ctx, table.paginatorSlot.nextSlot)
    : undefined
  const paginatorNextSlotStyles = table.paginatorSlot?.nextSlot
    ? transformTableSlotStyles(ctx, table.paginatorSlot.nextSlot)
    : undefined
  const paginatorPageInfoSlot = table.paginatorSlot?.pageInfoSlot
    ? transformTableSlotChildren(ctx, table.paginatorSlot.pageInfoSlot)
    : undefined
  const paginatorPageInfoSlotStyles = table.paginatorSlot?.pageInfoSlot
    ? transformTableSlotStyles(ctx, table.paginatorSlot.pageInfoSlot)
    : undefined

  // Build source position
  const sourcePosition = createSourcePosition(table.line, table.column)

  // Transform static rows for manual tables
  const staticRows = table.staticRows?.map(row => transformTableStaticRow(ctx, row))

  // Create the IRTable node
  const irTable: IRTable = {
    id: nodeId,
    tag: 'div',
    primitive: 'table',
    name: 'Table',
    isTableComponent: true,
    dataSource: table.dataSource
      ? (table.dataSource.startsWith('$') ? table.dataSource.slice(1) : table.dataSource)
      : undefined,
    filter: table.filter,
    orderBy: table.orderBy,
    orderDesc: table.orderDesc,
    groupBy: table.groupBy,
    columns,
    selectionMode,
    pageSize,
    stickyHeader: table.stickyHeader,
    headerSlot,
    headerSlotStyles,
    headerStaticRow,
    rowSlot,
    rowSlotStyles,
    rowOddStyles,
    rowEvenStyles,
    footerSlot,
    footerSlotStyles,
    footerStaticRow,
    groupSlot,
    groupSlotStyles,
    staticRows,
    sortIconSlot,
    sortAscSlot,
    sortDescSlot,
    paginatorSlot,
    paginatorSlotStyles,
    paginatorPrevSlot,
    paginatorPrevSlotStyles,
    paginatorNextSlot,
    paginatorNextSlotStyles,
    paginatorPageInfoSlot,
    paginatorPageInfoSlotStyles,
    properties: [],
    styles: tableStyles,
    events: [],
    children: [],
    sourcePosition,
  }

  // Add to source map for selection support in Studio
  if (ctx.includeSourceMap && ctx.addToSourceMap) {
    ctx.addToSourceMap(nodeId, 'Table', sourcePosition, { isDefinition: false })
  }

  return irTable
}

/**
 * Transform a TableColumnNode to an IRTableColumn
 */
export function transformTableColumn(ctx: TransformerContext, col: TableColumnNode): IRTableColumn {
  return {
    field: col.field,
    label: col.label ?? humanizeFieldName(col.field),
    width: col.width,
    prefix: col.prefix,
    suffix: col.suffix,
    align: col.align as 'left' | 'right' | 'center' | undefined,
    sortable: col.sortable,
    sortDesc: col.sortDesc,
    filterable: col.filterable,
    hidden: col.hidden,
    aggregation: col.aggregation as 'sum' | 'avg' | 'count' | undefined,
    inferredType: 'string',  // Default, will be overridden at runtime
    customCell: col.customCell
      ? col.customCell.map(child => ctx.transformChild(child))
      : undefined,
    cellStyles: col.cellProperties
      ? ctx.transformProperties(col.cellProperties, 'frame')
      : undefined,
    headerCellStyles: col.headerCellProperties
      ? ctx.transformProperties(col.headerCellProperties, 'frame')
      : undefined,
  }
}

/**
 * Transform table slot children to IRNode array
 */
export function transformTableSlotChildren(ctx: TransformerContext, slot: TableSlotNode): IRNode[] {
  return (slot.children || []).map(child => ctx.transformChild(child))
}

/**
 * Transform table slot properties to IRStyle array
 */
export function transformTableSlotStyles(ctx: TransformerContext, slot: TableSlotNode): IRStyle[] {
  if (!slot.properties || slot.properties.length === 0) {
    return []
  }
  return ctx.transformProperties(slot.properties, 'frame')
}

/**
 * Transform a static table row
 */
export function transformTableStaticRow(ctx: TransformerContext, row: TableStaticRowNode): IRTableStaticRow {
  return {
    cells: row.cells.map(cell => transformTableStaticCell(ctx, cell)),
    styles: ctx.transformProperties(row.properties, 'frame'),
  }
}

/**
 * Transform a static table cell
 */
export function transformTableStaticCell(ctx: TransformerContext, cell: TableStaticCellNode): IRTableStaticCell {
  return {
    text: cell.text,
    children: cell.children?.map(child => ctx.transformChild(child)),
    styles: ctx.transformProperties(cell.properties, 'frame'),
  }
}

/**
 * Convert a field name to a human-readable label
 * e.g., "firstName" -> "First Name", "user_id" -> "User Id"
 */
export function humanizeFieldName(field: string): string {
  return field
    // Insert space before uppercase letters
    .replace(/([A-Z])/g, ' $1')
    // Replace underscores and hyphens with spaces
    .replace(/[_-]/g, ' ')
    // Capitalize first letter of each word
    .replace(/\b\w/g, c => c.toUpperCase())
    // Trim and normalize spaces
    .trim()
    .replace(/\s+/g, ' ')
}

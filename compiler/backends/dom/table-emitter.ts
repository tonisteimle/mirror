/**
 * Table Emitter
 *
 * Extracted from DOMGenerator for better maintainability.
 * Handles all table-related code generation including:
 * - Static tables
 * - Data-driven tables
 * - Headers, rows, cells
 * - Grouping, filtering, sorting
 * - Selection, pagination
 */

import type { IRTable, IRTableColumn, IRNode, IRStyle } from '../../ir/types'
import type { EmitterContext } from './emitter-context'
import { escapeJSString, sanitizeVarName } from './utils'

/**
 * Generate code for a Table component
 *
 * Tables are data-driven and auto-generate columns from data schema.
 * They support filtering, sorting, grouping, selection, and aggregations.
 */
export function emitTable(ctx: EmitterContext, node: IRTable, parentVar: string): void {
  const tableVar = sanitizeVarName(node.id)
  const isStaticTable = node.staticRows && node.staticRows.length > 0 && !node.dataSource

  ctx.emit(`// Table${node.dataSource ? `: ${node.dataSource}` : ' (static)'}`)
  ctx.emit(`const ${tableVar} = document.createElement('div')`)
  ctx.emit(`${tableVar}.className = 'mirror-table'`)
  ctx.emit(`${tableVar}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`_elements['${node.id}'] = ${tableVar}`)

  // Apply default table styles
  // IMPORTANT: alignItems: 'stretch' ensures table body and rows fill container width
  ctx.emit(`Object.assign(${tableVar}.style, {`)
  ctx.indentIn()
  ctx.emit(`display: 'flex',`)
  ctx.emit(`flexDirection: 'column',`)
  ctx.emit(`alignItems: 'stretch',`)
  ctx.emit(`overflow: 'hidden',`)
  ctx.indentOut()
  ctx.emit(`})`)

  // Apply custom table styles (overrides defaults)
  // IMPORTANT: Filter out align-items from custom styles to preserve alignItems: 'stretch'
  const baseStyles = node.styles.filter(s => !s.state && s.property !== 'align-items')
  if (baseStyles.length > 0) {
    ctx.emit(`Object.assign(${tableVar}.style, {`)
    ctx.indentIn()
    for (const style of baseStyles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit(`})`)
  } else {
    // Apply default visual styles only if no custom styles
    ctx.emit(`Object.assign(${tableVar}.style, {`)
    ctx.indentIn()
    ctx.emit(`background: 'var(--surface, #1a1a1a)',`)
    ctx.emit(`borderRadius: '8px',`)
    ctx.indentOut()
    ctx.emit(`})`)
  }
  ctx.emit('')

  if (isStaticTable) {
    // Static table: emit header (if present) and static rows
    if (node.headerStaticRow) {
      emitStaticTableHeader(ctx, tableVar, node)
    }
    emitStaticTableRows(ctx, tableVar, node)
  } else if (node.dataSource) {
    // Data-driven table
    const dataVar = `${tableVar}_data`
    const collectionName = node.dataSource.replace(/^\$/, '')

    // Load data - convert entry-format objects to arrays with _key
    ctx.emit(`// Load data from collection`)
    ctx.emit(`let ${dataVar} = $get("${collectionName}") || []`)
    ctx.emit(`if (!Array.isArray(${dataVar})) ${dataVar} = Object.entries(${dataVar}).map(([k, v]) => typeof v === 'object' && v !== null ? { _key: k, ...v } : { _key: k, value: v })`)
    ctx.emit('')

    // Apply filter (where clause)
    if (node.filter) {
      ctx.emit(`// Apply filter: where ${node.filter}`)
      ctx.emit(`${dataVar} = ${dataVar}.filter(row => ${node.filter})`)
      ctx.emit('')
    }

    // Apply sorting (by clause)
    if (node.orderBy) {
      ctx.emit(`// Apply sort: by ${node.orderBy}${node.orderDesc ? ' desc' : ''}`)
      ctx.emit(`${dataVar} = ${dataVar}.slice().sort((a, b) => {`)
      ctx.indentIn()
      ctx.emit(`const av = a.${node.orderBy}, bv = b.${node.orderBy}`)
      ctx.emit(`const cmp = av < bv ? -1 : av > bv ? 1 : 0`)
      ctx.emit(`return ${node.orderDesc ? '-cmp' : 'cmp'}`)
      ctx.indentOut()
      ctx.emit(`})`)
      ctx.emit('')
    }

    // Generate header only if there are visible columns or a headerSlot
    const hasVisibleColumns = node.columns.filter(c => !c.hidden).length > 0
    if (hasVisibleColumns || node.headerSlot) {
      emitTableHeader(ctx, tableVar, node)
      ctx.emit('')
    }

    // Generate rows (with grouping if needed)
    if (node.groupBy) {
      emitTableGroupedRows(ctx, tableVar, dataVar, node)
    } else {
      emitTableRows(ctx, tableVar, dataVar, node)
    }
    ctx.emit('')

    // Generate footer if aggregations exist or footer slot/static row is defined
    const hasAggregations = node.columns.some(c => c.aggregation)
    if (hasAggregations || node.footerSlot || node.footerStaticRow) {
      emitTableFooter(ctx, tableVar, dataVar, node)
      ctx.emit('')
    }

    // Selection handling
    if (node.selectionMode) {
      emitTableSelection(ctx, tableVar, dataVar, node)
      ctx.emit('')
    }

    // Pagination
    if (node.pageSize) {
      emitTablePagination(ctx, tableVar, dataVar, node)
      ctx.emit('')
    }
  }

  ctx.emit(`${parentVar}.appendChild(${tableVar})`)
  ctx.emit('')
}

/**
 * Emit static table header for manual tables (from Header: Row "A", "B" syntax)
 */
function emitStaticTableHeader(ctx: EmitterContext, tableVar: string, node: IRTable): void {
  if (!node.headerStaticRow) return

  ctx.emit(`// Static table header`)
  const headerVar = `${tableVar}_header`
  ctx.emit(`const ${headerVar} = document.createElement('div')`)
  ctx.emit(`${headerVar}.className = 'mirror-table-header'`)
  ctx.emit(`Object.assign(${headerVar}.style, {`)
  ctx.indentIn()
  ctx.emit(`display: 'flex',`)
  ctx.emit(`flexDirection: 'row',`)
  ctx.emit(`gap: '24px',`)
  ctx.emit(`background: 'var(--surface-elevated, #252525)',`)
  ctx.emit(`padding: '12px 16px',`)
  ctx.emit(`borderBottom: '1px solid var(--border, #333)',`)
  ctx.indentOut()
  ctx.emit(`})`)

  // Render header cells
  const row = node.headerStaticRow
  for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex++) {
    const cell = row.cells[cellIndex]
    const cellVar = `${headerVar}_cell_${cellIndex}`

    ctx.emit(`const ${cellVar} = document.createElement('div')`)
    ctx.emit(`${cellVar}.className = 'mirror-table-header-cell'`)
    ctx.emit(`Object.assign(${cellVar}.style, {`)
    ctx.indentIn()
    ctx.emit(`flex: '1',`)
    ctx.emit(`minWidth: '60px',`)
    ctx.emit(`fontWeight: '500',`)
    ctx.emit(`color: 'var(--text-muted, #888)',`)
    ctx.emit(`fontSize: '11px',`)
    ctx.emit(`textTransform: 'uppercase',`)
    ctx.indentOut()
    ctx.emit(`})`)

    if (cell.text !== undefined) {
      ctx.emit(`${cellVar}.textContent = ${JSON.stringify(cell.text)}`)
    }

    ctx.emit(`${headerVar}.appendChild(${cellVar})`)
  }

  ctx.emit(`${tableVar}.appendChild(${headerVar})`)
  ctx.emit('')
}

/**
 * Emit static table rows for manual tables
 */
function emitStaticTableRows(ctx: EmitterContext, tableVar: string, node: IRTable): void {
  if (!node.staticRows) return

  ctx.emit(`// Static table rows`)
  const bodyVar = `${tableVar}_body`
  ctx.emit(`const ${bodyVar} = document.createElement('div')`)
  ctx.emit(`${bodyVar}.className = 'mirror-table-body'`)
  ctx.emit(`${bodyVar}.style.display = 'flex'`)
  ctx.emit(`${bodyVar}.style.flexDirection = 'column'`)

  for (let rowIndex = 0; rowIndex < node.staticRows.length; rowIndex++) {
    const row = node.staticRows[rowIndex]
    const rowVar = `${tableVar}_row_${rowIndex}`

    ctx.emit(`const ${rowVar} = document.createElement('div')`)
    ctx.emit(`${rowVar}.className = 'mirror-table-row'`)
    ctx.emit(`Object.assign(${rowVar}.style, {`)
    ctx.indentIn()
    ctx.emit(`display: 'flex',`)
    ctx.emit(`flexDirection: 'row',`)
    ctx.emit(`gap: '24px',`)
    ctx.emit(`padding: '12px 16px',`)
    ctx.emit(`borderBottom: '1px solid var(--border-subtle, #222)',`)
    ctx.indentOut()
    ctx.emit(`})`)

    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex++) {
      const cell = row.cells[cellIndex]
      const cellVar = `${rowVar}_cell_${cellIndex}`

      ctx.emit(`const ${cellVar} = document.createElement('div')`)
      ctx.emit(`${cellVar}.className = 'mirror-table-cell'`)
      ctx.emit(`Object.assign(${cellVar}.style, {`)
      ctx.indentIn()
      ctx.emit(`flex: '1',`)
      ctx.emit(`minWidth: '60px',`)
      ctx.emit(`color: 'var(--text, white)',`)
      ctx.emit(`fontSize: '14px',`)
      ctx.indentOut()
      ctx.emit(`})`)

      if (cell.text !== undefined) {
        // Simple text content
        ctx.emit(`${cellVar}.textContent = ${JSON.stringify(cell.text)}`)
      } else if (cell.children && cell.children.length > 0) {
        // Complex content - emit children
        for (const child of cell.children) {
          ctx.emitNode(child, cellVar)
        }
      }

      ctx.emit(`${rowVar}.appendChild(${cellVar})`)
    }

    ctx.emit(`${bodyVar}.appendChild(${rowVar})`)
  }

  ctx.emit(`${tableVar}.appendChild(${bodyVar})`)
  ctx.emit('')
}

/**
 * Generate table header row
 */
function emitTableHeader(ctx: EmitterContext, tableVar: string, node: IRTable): void {
  const headerVar = `${tableVar}_header`

  ctx.emit(`// Table header`)
  ctx.emit(`const ${headerVar} = document.createElement('div')`)
  ctx.emit(`${headerVar}.className = 'mirror-table-header'`)

  // Prefer headerStaticRow if it exists (Header: Row "A", "B" syntax)
  if (node.headerStaticRow) {
    // Check if Row: template uses spread
    const rowHasSpread = node.rowSlotStyles?.some(
      s => s.property === 'justify-content' && s.value === 'space-between'
    )

    // Extract column widths from Row: template children
    const columnWidths: (string | null)[] = []
    if (node.rowSlot && node.rowSlot.length > 0) {
      for (const child of node.rowSlot) {
        const widthStyle = child.styles?.find(s => s.property === 'width')
        columnWidths.push(widthStyle ? String(widthStyle.value) : null)
      }
    }

    // Extract gap from Row: template if present
    const rowGap = node.rowSlotStyles?.find(s => s.property === 'gap')?.value

    // Header: Row "A", "B" syntax - render static row cells
    ctx.emit(`Object.assign(${headerVar}.style, {`)
    ctx.indentIn()
    ctx.emit(`display: 'flex',`)
    ctx.emit(`flexDirection: 'row',`)
    if (rowHasSpread) {
      ctx.emit(`justifyContent: 'space-between',`)
    }
    if (rowGap) {
      ctx.emit(`gap: '${rowGap}',`)
    } else if (!rowHasSpread) {
      ctx.emit(`gap: '24px',`)
    }
    const rowHasFullWidth = node.rowSlotStyles?.some(
      s => s.property === 'width' && s.value === '100%'
    )
    if (rowHasFullWidth) {
      ctx.emit(`width: '100%',`)
    }
    // Apply header slot styles, filter out layout properties
    if (node.headerSlotStyles && node.headerSlotStyles.length > 0) {
      const layoutPropsToFilter = new Set(['display', 'flex-direction', 'align-items', 'width', 'justify-content'])
      for (const style of node.headerSlotStyles) {
        if (layoutPropsToFilter.has(style.property)) continue
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
    } else {
      ctx.emit(`background: 'var(--surface-elevated, #252525)',`)
      ctx.emit(`padding: '12px 16px',`)
      ctx.emit(`borderBottom: '1px solid var(--border, #333)',`)
    }
    ctx.indentOut()
    ctx.emit(`})`)

    // Render header cells from static row
    const row = node.headerStaticRow
    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex++) {
      const cell = row.cells[cellIndex]
      const cellVar = `${headerVar}_cell_${cellIndex}`

      ctx.emit(`const ${cellVar} = document.createElement('div')`)
      ctx.emit(`${cellVar}.className = 'mirror-table-header-cell'`)
      ctx.emit(`Object.assign(${cellVar}.style, {`)
      ctx.indentIn()

      // Apply column width from Row: template if available
      const cellWidth = columnWidths[cellIndex]
      if (cellWidth) {
        ctx.emit(`width: '${cellWidth}',`)
        ctx.emit(`flexShrink: '0',`)
      } else if (!rowHasSpread) {
        ctx.emit(`flex: '1',`)
        ctx.emit(`minWidth: '60px',`)
      }

      ctx.emit(`fontWeight: '500',`)
      ctx.emit(`color: 'var(--text-muted, #888)',`)
      ctx.emit(`fontSize: '11px',`)
      ctx.emit(`textTransform: 'uppercase',`)
      ctx.indentOut()
      ctx.emit(`})`)

      if (cell.text !== undefined) {
        ctx.emit(`${cellVar}.textContent = ${JSON.stringify(cell.text)}`)
      }

      ctx.emit(`${headerVar}.appendChild(${cellVar})`)
    }
  } else if (node.headerSlot && node.headerSlot.length > 0) {
    // Custom header content
    ctx.emit(`${headerVar}.style.display = 'flex'`)

    if (node.headerSlotStyles && node.headerSlotStyles.length > 0) {
      ctx.emit(`Object.assign(${headerVar}.style, {`)
      ctx.indentIn()
      for (const style of node.headerSlotStyles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit(`})`)
    }

    // Render header slot children
    for (const child of node.headerSlot) {
      ctx.emitNode(child, headerVar)
    }
  } else {
    // Auto-generated header from columns
    ctx.emit(`Object.assign(${headerVar}.style, {`)
    ctx.indentIn()
    ctx.emit(`display: 'flex',`)
    ctx.emit(`flexDirection: 'row',`)
    ctx.emit(`gap: '24px',`)
    if (node.headerSlotStyles && node.headerSlotStyles.length > 0) {
      for (const style of node.headerSlotStyles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
    } else {
      ctx.emit(`background: 'var(--surface-elevated, #252525)',`)
      ctx.emit(`padding: '12px 16px',`)
      ctx.emit(`borderBottom: '1px solid var(--border, #333)',`)
    }
    if (node.stickyHeader) {
      ctx.emit(`position: 'sticky',`)
      ctx.emit(`top: '0',`)
      ctx.emit(`zIndex: '10',`)
    }
    ctx.indentOut()
    ctx.emit(`})`)

    // Generate header cells for each visible column
    for (const col of node.columns.filter(c => !c.hidden)) {
      const cellVar = `${tableVar}_hc_${sanitizeVarName(col.field)}`
      ctx.emit(`const ${cellVar} = document.createElement('div')`)
      ctx.emit(`${cellVar}.className = 'mirror-table-header-cell'`)
      ctx.emit(`${cellVar}.dataset.field = "${escapeJSString(col.field)}"`)

      ctx.emit(`Object.assign(${cellVar}.style, {`)
      ctx.indentIn()
      ctx.emit(`flex: '1',`)
      ctx.emit(`minWidth: '60px',`)
      ctx.emit(`display: 'flex',`)
      ctx.emit(`alignItems: 'center',`)
      ctx.emit(`gap: '4px',`)
      ctx.emit(`fontWeight: '500',`)
      ctx.emit(`color: 'var(--text-muted, #888)',`)
      ctx.emit(`fontSize: '11px',`)
      ctx.emit(`textTransform: 'uppercase',`)
      if (col.width) {
        ctx.emit(`width: '${col.width}px',`)
        ctx.emit(`flex: 'none',`)
      }
      if (col.align === 'right') {
        ctx.emit(`justifyContent: 'flex-end',`)
      } else if (col.align === 'center') {
        ctx.emit(`justifyContent: 'center',`)
      }
      ctx.indentOut()
      ctx.emit(`})`)

      // Add label text in a span
      const labelVar = `${cellVar}_label`
      ctx.emit(`const ${labelVar} = document.createElement('span')`)
      ctx.emit(`${labelVar}.textContent = "${col.label}"`)
      ctx.emit(`${cellVar}.appendChild(${labelVar})`)

      // Sortable column
      if (col.sortable) {
        ctx.emit(`${cellVar}.dataset.sortable = 'true'`)
        ctx.emit(`${cellVar}.style.cursor = 'pointer'`)

        const sortIconVar = `${cellVar}_sortIcon`
        ctx.emit(`const ${sortIconVar} = document.createElement('span')`)
        ctx.emit(`${sortIconVar}.className = 'mirror-sort-icon'`)
        ctx.emit(`${sortIconVar}.dataset.field = '${escapeJSString(col.field)}'`)
        ctx.emit(`${sortIconVar}.style.display = 'inline-flex'`)
        ctx.emit(`${sortIconVar}.style.alignItems = 'center'`)
        ctx.emit(`${sortIconVar}.style.opacity = '0.5'`)
        ctx.emit(`${sortIconVar}.style.transition = 'opacity 0.15s'`)

        if (node.sortAscSlot && node.sortAscSlot.length > 0 && node.sortDescSlot && node.sortDescSlot.length > 0) {
          const ascVar = `${sortIconVar}_asc`
          const descVar = `${sortIconVar}_desc`
          ctx.emit(`const ${ascVar} = document.createElement('span')`)
          ctx.emit(`${ascVar}.className = 'mirror-sort-asc'`)
          ctx.emit(`${ascVar}.style.display = 'none'`)
          for (const child of node.sortAscSlot) {
            ctx.emitNode(child, ascVar)
          }
          ctx.emit(`const ${descVar} = document.createElement('span')`)
          ctx.emit(`${descVar}.className = 'mirror-sort-desc'`)
          ctx.emit(`${descVar}.style.display = 'none'`)
          for (const child of node.sortDescSlot) {
            ctx.emitNode(child, descVar)
          }
          ctx.emit(`const ${sortIconVar}_default = document.createElement('span')`)
          ctx.emit(`${sortIconVar}_default.className = 'mirror-sort-default'`)
          if (node.sortIconSlot && node.sortIconSlot.length > 0) {
            for (const child of node.sortIconSlot) {
              ctx.emitNode(child, `${sortIconVar}_default`)
            }
          } else {
            ctx.emit(`${sortIconVar}_default.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 15l5 5 5-5M7 9l5-5 5 5"/></svg>'`)
          }
          ctx.emit(`${sortIconVar}.appendChild(${ascVar})`)
          ctx.emit(`${sortIconVar}.appendChild(${descVar})`)
          ctx.emit(`${sortIconVar}.appendChild(${sortIconVar}_default)`)
          ctx.emit(`${sortIconVar}.dataset.hasCustomIcons = 'true'`)
        } else if (node.sortIconSlot && node.sortIconSlot.length > 0) {
          for (const child of node.sortIconSlot) {
            ctx.emitNode(child, sortIconVar)
          }
        } else {
          ctx.emit(`${sortIconVar}.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 15l5 5 5-5M7 9l5-5 5 5"/></svg>'`)
        }

        ctx.emit(`${cellVar}.appendChild(${sortIconVar})`)

        // Click handler for sorting
        ctx.emit(`${cellVar}.addEventListener('click', () => {`)
        ctx.indentIn()
        ctx.emit(`if (typeof _runtime !== 'undefined' && _runtime.tableSort) {`)
        ctx.indentIn()
        ctx.emit(`_runtime.tableSort(${tableVar}, '${escapeJSString(col.field)}')`)
        ctx.indentOut()
        ctx.emit(`}`)
        ctx.indentOut()
        ctx.emit(`})`)
      }

      ctx.emit(`${headerVar}.appendChild(${cellVar})`)
    }
  }

  ctx.emit(`${tableVar}.appendChild(${headerVar})`)
}

/**
 * Generate table body with rows
 */
function emitTableRows(ctx: EmitterContext, tableVar: string, dataVar: string, node: IRTable): void {
  ctx.emit(`// Table body`)
  ctx.emit(`const ${tableVar}_body = document.createElement('div')`)
  ctx.emit(`${tableVar}_body.className = 'mirror-table-body'`)

  ctx.emit(`${dataVar}.forEach((row, index) => {`)
  ctx.indentIn()
  emitTableRow(ctx, tableVar, 'row', 'index', node, dataVar)
  ctx.emit(`${tableVar}_body.appendChild(${tableVar}_row)`)
  ctx.indentOut()
  ctx.emit(`})`)

  ctx.emit(`${tableVar}.appendChild(${tableVar}_body)`)
}

/**
 * Generate a single table row
 */
function emitTableRow(
  ctx: EmitterContext,
  tableVar: string,
  rowVar: string,
  indexVar: string,
  node: IRTable,
  dataVar?: string
): void {
  ctx.emit(`const ${tableVar}_row = document.createElement('div')`)
  ctx.emit(`${tableVar}_row.className = 'mirror-table-row'`)
  ctx.emit(`${tableVar}_row.dataset.index = ${indexVar}`)
  ctx.emit(`Object.assign(${tableVar}_row.style, {`)
  ctx.indentIn()
  if (node.rowSlotStyles && node.rowSlotStyles.length > 0) {
    for (const style of node.rowSlotStyles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    const hasDisplay = node.rowSlotStyles.some(s => s.property === 'display')
    if (!hasDisplay) {
      ctx.emit(`display: 'flex',`)
    }
    const hasGap = node.rowSlotStyles.some(s => s.property === 'gap')
    if (!hasGap) {
      ctx.emit(`gap: '24px',`)
    }
  } else {
    ctx.emit(`display: 'flex',`)
    ctx.emit(`gap: '24px',`)
    ctx.emit(`padding: '12px',`)
    ctx.emit(`borderBottom: '1px solid var(--border-subtle, #222)',`)
    ctx.emit(`cursor: 'pointer',`)
  }
  ctx.indentOut()
  ctx.emit(`})`)

  // Zebra striping
  const zebraLayoutPropsToFilter = new Set(['display', 'flex-direction', 'align-items', 'width', 'justify-content'])
  if (node.rowOddStyles && node.rowOddStyles.length > 0) {
    const filteredOddStyles = node.rowOddStyles.filter(s => !zebraLayoutPropsToFilter.has(s.property))
    if (filteredOddStyles.length > 0) {
      ctx.emit(`if (${indexVar} % 2 === 1) {`)
      ctx.indentIn()
      ctx.emit(`Object.assign(${tableVar}_row.style, {`)
      ctx.indentIn()
      for (const style of filteredOddStyles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit(`})`)
      ctx.indentOut()
      ctx.emit(`}`)
    }
  }
  if (node.rowEvenStyles && node.rowEvenStyles.length > 0) {
    const filteredEvenStyles = node.rowEvenStyles.filter(s => !zebraLayoutPropsToFilter.has(s.property))
    if (filteredEvenStyles.length > 0) {
      ctx.emit(`if (${indexVar} % 2 === 0) {`)
      ctx.indentIn()
      ctx.emit(`Object.assign(${tableVar}_row.style, {`)
      ctx.indentIn()
      for (const style of filteredEvenStyles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit(`})`)
      ctx.indentOut()
      ctx.emit(`}`)
    }
  }

  // Hover effect
  const bgStyle = node.rowSlotStyles?.find(s => s.property === 'background')
  const originalBg = bgStyle ? `'${bgStyle.value}'` : "''"
  ctx.emit(`const ${tableVar}_row_origBg = ${originalBg}`)
  ctx.emit(`${tableVar}_row.addEventListener('mouseenter', () => {`)
  ctx.indentIn()
  ctx.emit(`${tableVar}_row.style.background = 'var(--surface-hover, #252525)'`)
  ctx.indentOut()
  ctx.emit(`})`)
  ctx.emit(`${tableVar}_row.addEventListener('mouseleave', () => {`)
  ctx.indentIn()
  ctx.emit(`if (!${tableVar}_row.classList.contains('selected')) {`)
  ctx.indentIn()
  ctx.emit(`${tableVar}_row.style.background = ${tableVar}_row_origBg`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.indentOut()
  ctx.emit(`})`)

  // Check for custom row template
  if (node.rowSlot && node.rowSlot.length > 0) {
    for (const templateNode of node.rowSlot) {
      emitTableRowSlotNode(ctx, templateNode, `${tableVar}_row`, rowVar, indexVar, dataVar)
    }
  } else {
    for (const col of node.columns.filter(c => !c.hidden)) {
      emitTableCell(ctx, tableVar, rowVar, col, indexVar, dataVar)
    }
  }
}

/**
 * Emit a node inside a table row template with row variable context
 */
function emitTableRowSlotNode(
  ctx: EmitterContext,
  node: IRNode,
  parentVar: string,
  rowVar: string,
  indexVar: string,
  dataVar?: string
): void {
  const varName = sanitizeVarName(node.id) + '_tpl'

  ctx.emit(`const ${varName} = document.createElement('${node.tag}')`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}[' + ${indexVar} + ']'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  const isIcon = node.primitive === 'icon'
  let iconName: string | null = null

  // Set HTML properties
  for (const prop of node.properties) {
    if (prop.name === 'textContent') {
      if (isIcon && typeof prop.value === 'string') {
        iconName = prop.value
      } else {
        const value = resolveRowTemplateValue(ctx, prop.value, rowVar, indexVar)
        ctx.emit(`${varName}.textContent = ${value}`)
      }
    } else if (prop.name === 'value' && (node.primitive === 'input' || node.primitive === 'textarea')) {
      const value = resolveRowTemplateValue(ctx, prop.value, rowVar, indexVar)
      ctx.emit(`${varName}.value = ${value} ?? ''`)
      // Two-way binding
      if (dataVar && typeof prop.value === 'string' && prop.value.includes('__loopVar:')) {
        const match = prop.value.match(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]+)/)
        if (match) {
          const fieldPath = match[1]
          const field = fieldPath.startsWith(`${rowVar}.`) ? fieldPath.slice(rowVar.length + 1) : fieldPath
          ctx.emit(`${varName}.addEventListener('input', (e) => {`)
          ctx.indentIn()
          ctx.emit(`${dataVar}[${indexVar}].${field} = e.target.value`)
          ctx.indentOut()
          ctx.emit(`})`)
        }
      }
    } else if (prop.name === 'disabled' || prop.name === 'hidden') {
      ctx.emit(`${varName}.${prop.name} = ${prop.value}`)
    } else {
      const value = resolveRowTemplateValue(ctx, prop.value, rowVar, indexVar)
      ctx.emit(`${varName}.setAttribute('${prop.name}', ${value})`)
    }
  }

  // Apply base styles
  const baseStyles = node.styles.filter(s => !s.state)
  if (baseStyles.length > 0) {
    ctx.emit(`Object.assign(${varName}.style, {`)
    ctx.indentIn()
    for (const style of baseStyles) {
      const value = resolveRowTemplateStyleValue(style.value, rowVar)
      ctx.emit(`'${style.property}': ${value},`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }

  // Handle icon loading
  if (isIcon && iconName) {
    ctx.emit(`// Icon default styles`)
    ctx.emit(`Object.assign(${varName}.style, {`)
    ctx.indentIn()
    ctx.emit(`'display': 'inline-flex',`)
    ctx.emit(`'align-items': 'center',`)
    ctx.emit(`'justify-content': 'center',`)
    ctx.emit(`'flex-shrink': '0',`)
    ctx.emit(`'line-height': '0',`)
    ctx.indentOut()
    ctx.emit(`})`)
    const iconSizeProp = node.properties.find(p => p.name === 'data-icon-size')
    const iconColorProp = node.properties.find(p => p.name === 'data-icon-color')
    const iconWeightProp = node.properties.find(p => p.name === 'data-icon-weight')
    const iconSize = iconSizeProp?.value || node.styles.find(s => s.property === 'fontSize')?.value || '16'
    const iconColor = iconColorProp?.value || node.styles.find(s => s.property === 'color')?.value || 'currentColor'
    const iconWeight = iconWeightProp?.value || node.styles.find(s => s.property === 'strokeWidth')?.value || '2'
    ctx.emit(`${varName}.dataset.iconSize = '${String(iconSize).replace('px', '')}'`)
    ctx.emit(`${varName}.dataset.iconColor = '${iconColor}'`)
    ctx.emit(`${varName}.dataset.iconWeight = '${iconWeight}'`)
    ctx.emit(`// Load Lucide icon`)
    ctx.emit(`_runtime.loadIcon(${varName}, '${iconName}')`)
  }

  // Setup state machine
  if (node.stateMachine) {
    ctx.emitStateMachine(varName, node)
  }

  // Add event listeners
  for (const event of node.events) {
    ctx.emitEachTemplateNode(node, varName, rowVar, indexVar)
  }

  // Recursively emit children
  for (const child of node.children) {
    emitTableRowSlotNode(ctx, child, varName, rowVar, indexVar, dataVar)
  }

  ctx.emit(`${parentVar}.appendChild(${varName})`)
}

/**
 * Resolve a template value with row variable context
 */
function resolveRowTemplateValue(
  ctx: EmitterContext,
  value: string | number | boolean,
  rowVar: string,
  indexVar: string = 'index'
): string {
  if (typeof value === 'string') {
    if (value.includes('__loopVar:')) {
      let resolved = value.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g, '$1')
      resolved = resolved.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g, '$get("$1")')
      return resolved
    }
    if (value.includes(`$${rowVar}.`) || value.includes(`\${${rowVar}.`)) {
      const resolved = value.replace(new RegExp(`\\$${rowVar}\\.`, 'g'), `${rowVar}.`)
      return resolved
    }
    if (value === `$${rowVar}`) {
      return rowVar
    }
    if (value === `$${indexVar}`) {
      return indexVar
    }
    return `"${escapeJSString(String(value))}"`
  }
  return String(value)
}

/**
 * Resolve a style value with row variable context
 */
function resolveRowTemplateStyleValue(value: string, rowVar: string): string {
  if (value.includes(`$${rowVar}.`) || value.includes(`\${${rowVar}.`)) {
    const resolved = value.replace(new RegExp(`\\$${rowVar}\\.`, 'g'), `${rowVar}.`)
    return resolved
  }
  return `'${value}'`
}

/**
 * Generate a table cell with type-specific rendering
 */
function emitTableCell(
  ctx: EmitterContext,
  tableVar: string,
  rowVar: string,
  col: IRTableColumn,
  indexVar: string = 'i',
  dataVar?: string
): void {
  const cellVar = `${tableVar}_cell_${sanitizeVarName(col.field)}`

  ctx.emit(`const ${cellVar} = document.createElement('div')`)
  ctx.emit(`${cellVar}.className = 'mirror-table-cell'`)
  ctx.emit(`${cellVar}.dataset.field = '${escapeJSString(col.field)}'`)

  ctx.emit(`Object.assign(${cellVar}.style, {`)
  ctx.indentIn()
  ctx.emit(`flex: '1',`)
  ctx.emit(`minWidth: '60px',`)
  ctx.emit(`color: 'var(--text, white)',`)
  if (col.width) {
    ctx.emit(`width: '${col.width}px',`)
    ctx.emit(`flex: 'none',`)
  }
  ctx.indentOut()
  ctx.emit(`})`)

  // Apply custom cell styles
  if (col.cellStyles && col.cellStyles.length > 0) {
    ctx.emit(`Object.assign(${cellVar}.style, {`)
    ctx.indentIn()
    for (const style of col.cellStyles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit(`})`)
  }

  // Custom cell template
  if (col.customCell && col.customCell.length > 0) {
    ctx.emit(`// Custom cell template for ${col.field}`)
    for (const templateNode of col.customCell) {
      emitTableRowSlotNode(ctx, templateNode, cellVar, rowVar, indexVar, dataVar)
    }
  } else {
    // Simple value rendering
    const formatValue = (expr: string) => {
      const safePrefix = col.prefix ? escapeJSString(col.prefix) : ''
      const safeSuffix = col.suffix ? escapeJSString(col.suffix) : ''
      if (col.prefix && col.suffix) return `'${safePrefix}' + ${expr} + '${safeSuffix}'`
      if (col.prefix) return `'${safePrefix}' + ${expr}`
      if (col.suffix) return `${expr} + '${safeSuffix}'`
      return expr
    }

    switch (col.inferredType) {
      case 'boolean':
        ctx.emit(`${cellVar}.innerHTML = ${rowVar}.${col.field} ? '✓' : '✗'`)
        ctx.emit(`${cellVar}.style.textAlign = 'center'`)
        ctx.emit(`${cellVar}.style.color = ${rowVar}.${col.field} ? 'var(--success, #10b981)' : 'var(--muted, #666)'`)
        break

      case 'date':
        ctx.emit(`try {`)
        ctx.indentIn()
        ctx.emit(`${cellVar}.textContent = new Date(${rowVar}.${col.field}).toLocaleDateString('de-DE')`)
        ctx.indentOut()
        ctx.emit(`} catch { ${cellVar}.textContent = ${rowVar}.${col.field} || '' }`)
        break

      case 'array':
        ctx.emit(`${cellVar}.textContent = Array.isArray(${rowVar}.${col.field}) ? ${rowVar}.${col.field}.join(', ') : ''`)
        break

      default:
        ctx.emit(`${cellVar}.textContent = ${formatValue(`String(${rowVar}.${col.field} ?? '')`)}`)
    }
  }

  ctx.emit(`${tableVar}_row.appendChild(${cellVar})`)
}

/**
 * Generate grouped table rows
 */
function emitTableGroupedRows(ctx: EmitterContext, tableVar: string, dataVar: string, node: IRTable): void {
  ctx.emit(`// Group by ${node.groupBy}`)
  ctx.emit(`const ${tableVar}_groups = new Map()`)
  ctx.emit(`${dataVar}.forEach(row => {`)
  ctx.indentIn()
  ctx.emit(`const key = row.${node.groupBy}`)
  ctx.emit(`if (!${tableVar}_groups.has(key)) ${tableVar}_groups.set(key, [])`)
  ctx.emit(`${tableVar}_groups.get(key).push(row)`)
  ctx.indentOut()
  ctx.emit(`})`)
  ctx.emit('')

  ctx.emit(`const ${tableVar}_body = document.createElement('div')`)
  ctx.emit(`${tableVar}_body.className = 'mirror-table-body'`)
  ctx.emit('')

  ctx.emit(`${tableVar}_groups.forEach((items, key) => {`)
  ctx.indentIn()

  // Group header
  ctx.emit(`// Group header`)
  ctx.emit(`const groupHeader = document.createElement('div')`)
  ctx.emit(`groupHeader.className = 'mirror-table-group-header'`)

  if (node.groupSlotStyles && node.groupSlotStyles.length > 0) {
    ctx.emit(`Object.assign(groupHeader.style, {`)
    ctx.indentIn()
    ctx.emit(`display: 'flex',`)
    for (const style of node.groupSlotStyles) {
      ctx.emit(`${style.property}: ${JSON.stringify(style.value)},`)
    }
    ctx.indentOut()
    ctx.emit(`})`)
  } else {
    ctx.emit(`Object.assign(groupHeader.style, {`)
    ctx.indentIn()
    ctx.emit(`display: 'flex',`)
    ctx.emit(`justifyContent: 'space-between',`)
    ctx.emit(`padding: '12px',`)
    ctx.emit(`background: 'var(--surface-elevated, #252525)',`)
    ctx.emit(`borderBottom: '1px solid var(--border, #333)',`)
    ctx.indentOut()
    ctx.emit(`})`)
  }

  // Render groupSlot content if defined
  if (node.groupSlot && node.groupSlot.length > 0) {
    ctx.emit(`const group = { key: key?.name ?? key, count: items.length }`)
    for (const child of node.groupSlot) {
      emitTableGroupSlotNode(ctx, child, 'groupHeader')
    }
  } else {
    ctx.emit(`const groupKeySpan = document.createElement('span')`)
    ctx.emit(`groupKeySpan.style.fontWeight = '500'`)
    ctx.emit(`groupKeySpan.style.color = 'var(--text,white)'`)
    ctx.emit(`groupKeySpan.textContent = key?.name ?? key`)
    ctx.emit(`groupHeader.appendChild(groupKeySpan)`)
    ctx.emit(`const groupCountSpan = document.createElement('span')`)
    ctx.emit(`groupCountSpan.style.color = 'var(--text-muted,#888)'`)
    ctx.emit(`groupCountSpan.style.fontSize = '12px'`)
    ctx.emit(`groupCountSpan.textContent = items.length`)
    ctx.emit(`groupHeader.appendChild(groupCountSpan)`)
  }

  ctx.emit(`${tableVar}_body.appendChild(groupHeader)`)
  ctx.emit('')

  // Group items
  ctx.emit(`items.forEach((row, index) => {`)
  ctx.indentIn()
  emitTableRow(ctx, tableVar, 'row', 'index', node, 'items')
  ctx.emit(`${tableVar}_body.appendChild(${tableVar}_row)`)
  ctx.indentOut()
  ctx.emit(`})`)

  ctx.indentOut()
  ctx.emit(`})`)

  ctx.emit(`${tableVar}.appendChild(${tableVar}_body)`)
}

/**
 * Emit a node inside a table group slot with group context
 */
function emitTableGroupSlotNode(ctx: EmitterContext, node: IRNode, parentVar: string): void {
  const varName = sanitizeVarName(node.id)

  ctx.emit(`const ${varName} = document.createElement('${node.tag || 'div'}')`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)

  if (node.styles && node.styles.length > 0) {
    ctx.emit(`Object.assign(${varName}.style, {`)
    ctx.indentIn()
    for (const style of node.styles) {
      ctx.emit(`${style.property}: ${JSON.stringify(style.value)},`)
    }
    ctx.indentOut()
    ctx.emit(`})`)
  }

  // Handle text content with group references
  const textProp = node.properties.find(p => p.name === 'textContent')
  if (textProp && typeof textProp.value === 'string') {
    const content = textProp.value
    if (content.includes('group.key') || content.includes('group.count')) {
      const jsContent = content
        .replace(/group\.key/g, '${group.key}')
        .replace(/group\.count/g, '${group.count}')
      ctx.emit(`${varName}.textContent = \`${jsContent}\``)
    } else {
      ctx.emit(`${varName}.textContent = ${JSON.stringify(content)}`)
    }
  }

  // Process children recursively
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      emitTableGroupSlotNode(ctx, child, varName)
    }
  }

  ctx.emit(`${parentVar}.appendChild(${varName})`)
}

/**
 * Generate table footer with aggregations or custom content
 */
function emitTableFooter(ctx: EmitterContext, tableVar: string, dataVar: string, node: IRTable): void {
  const footerVar = `${tableVar}_footer`

  ctx.emit(`// Table footer`)
  ctx.emit(`const ${footerVar} = document.createElement('div')`)
  ctx.emit(`${footerVar}.className = 'mirror-table-footer'`)

  if (node.footerStaticRow) {
    ctx.emit(`Object.assign(${footerVar}.style, {`)
    ctx.indentIn()
    ctx.emit(`display: 'flex',`)
    ctx.emit(`flexDirection: 'row',`)
    ctx.emit(`gap: '24px',`)
    if (node.footerSlotStyles && node.footerSlotStyles.length > 0) {
      const layoutPropsToFilter = new Set(['display', 'flex-direction', 'align-items', 'width'])
      for (const style of node.footerSlotStyles) {
        if (layoutPropsToFilter.has(style.property)) continue
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
    } else {
      ctx.emit(`padding: '12px 16px',`)
      ctx.emit(`background: 'var(--surface-elevated, #252525)',`)
      ctx.emit(`borderTop: '1px solid var(--border, #333)',`)
    }
    ctx.indentOut()
    ctx.emit(`})`)

    const row = node.footerStaticRow
    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex++) {
      const cell = row.cells[cellIndex]
      const cellVar = `${footerVar}_cell_${cellIndex}`

      ctx.emit(`const ${cellVar} = document.createElement('div')`)
      ctx.emit(`${cellVar}.className = 'mirror-table-footer-cell'`)
      ctx.emit(`Object.assign(${cellVar}.style, {`)
      ctx.indentIn()
      ctx.emit(`flex: '1',`)
      ctx.emit(`minWidth: '60px',`)
      ctx.emit(`fontWeight: '500',`)
      ctx.emit(`color: 'var(--text, white)',`)
      ctx.indentOut()
      ctx.emit(`})`)

      if (cell.text !== undefined) {
        ctx.emit(`${cellVar}.textContent = ${JSON.stringify(cell.text)}`)
      }

      ctx.emit(`${footerVar}.appendChild(${cellVar})`)
    }
  } else if (node.footerSlot && node.footerSlot.length > 0) {
    ctx.emit(`Object.assign(${footerVar}.style, {`)
    ctx.indentIn()
    ctx.emit(`display: 'flex',`)
    ctx.emit(`flexDirection: 'row',`)
    ctx.emit(`gap: '16px',`)
    if (node.footerSlotStyles && node.footerSlotStyles.length > 0) {
      for (const style of node.footerSlotStyles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
    }
    ctx.indentOut()
    ctx.emit(`})`)

    for (const child of node.footerSlot) {
      ctx.emitNode(child, footerVar)
    }
  } else {
    ctx.emit(`Object.assign(${footerVar}.style, {`)
    ctx.indentIn()
    ctx.emit(`display: 'flex',`)
    ctx.emit(`flexDirection: 'row',`)
    ctx.emit(`gap: '24px',`)
    if (node.footerSlotStyles && node.footerSlotStyles.length > 0) {
      for (const style of node.footerSlotStyles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
    } else {
      ctx.emit(`padding: '12px 16px',`)
      ctx.emit(`background: 'var(--surface-elevated, #252525)',`)
      ctx.emit(`borderTop: '1px solid var(--border, #333)',`)
    }
    ctx.indentOut()
    ctx.emit(`})`)

    for (const col of node.columns.filter(c => !c.hidden)) {
      const cellVar = `${tableVar}_fc_${sanitizeVarName(col.field)}`
      ctx.emit(`const ${cellVar} = document.createElement('div')`)
      ctx.emit(`${cellVar}.className = 'mirror-table-footer-cell'`)

      ctx.emit(`Object.assign(${cellVar}.style, {`)
      ctx.indentIn()
      ctx.emit(`flex: '1',`)
      ctx.emit(`minWidth: '60px',`)
      ctx.emit(`fontWeight: '500',`)
      ctx.emit(`color: 'var(--text, white)',`)
      if (col.width) {
        ctx.emit(`width: '${col.width}px',`)
        ctx.emit(`flex: 'none',`)
      }
      if (col.align === 'right') {
        ctx.emit(`textAlign: 'right',`)
      } else if (col.align === 'center') {
        ctx.emit(`textAlign: 'center',`)
      }
      ctx.indentOut()
      ctx.emit(`})`)

      if (col.aggregation) {
        const safeSuffix = col.suffix ? escapeJSString(col.suffix) : ''
        switch (col.aggregation) {
          case 'sum':
            ctx.emit(`${cellVar}.textContent = ${dataVar}.reduce((s, r) => s + (r.${col.field} || 0), 0)${col.suffix ? ` + "${safeSuffix}"` : ''}`)
            break
          case 'avg':
            ctx.emit(`${cellVar}.textContent = (${dataVar}.reduce((s, r) => s + (r.${col.field} || 0), 0) / ${dataVar}.length).toFixed(1)${col.suffix ? ` + "${safeSuffix}"` : ''}`)
            break
          case 'count':
            ctx.emit(`${cellVar}.textContent = ${dataVar}.length`)
            break
        }
      }

      ctx.emit(`${footerVar}.appendChild(${cellVar})`)
    }
  }

  ctx.emit(`${tableVar}.appendChild(${footerVar})`)
}

/**
 * Generate selection handling for table
 */
function emitTableSelection(ctx: EmitterContext, tableVar: string, dataVar: string, node: IRTable): void {
  ctx.emit(`// Selection handling: ${node.selectionMode}`)

  if (node.selectionMode === 'single') {
    ctx.emit(`${tableVar}.addEventListener('click', (e) => {`)
    ctx.indentIn()
    ctx.emit(`const row = e.target.closest('.mirror-table-row')`)
    ctx.emit(`if (!row) return`)
    ctx.emit(`${tableVar}.querySelectorAll('.mirror-table-row').forEach(r => {`)
    ctx.indentIn()
    ctx.emit(`r.classList.remove('selected')`)
    ctx.emit(`r.style.background = ''`)
    ctx.indentOut()
    ctx.emit(`})`)
    ctx.emit(`row.classList.add('selected')`)
    ctx.emit(`row.style.background = 'var(--primary-alpha, rgba(37, 99, 235, 0.15))'`)
    ctx.emit(`const index = parseInt(row.dataset.index)`)
    ctx.emit(`window.$selected = ${dataVar}[index]`)
    ctx.emit(`_runtime.notifyChange('$selected')`)
    ctx.indentOut()
    ctx.emit(`})`)
  } else {
    ctx.emit(`window.$selection = window.$selection || []`)
    ctx.emit(`${tableVar}.addEventListener('click', (e) => {`)
    ctx.indentIn()
    ctx.emit(`const row = e.target.closest('.mirror-table-row')`)
    ctx.emit(`if (!row) return`)
    ctx.emit(`const index = parseInt(row.dataset.index)`)
    ctx.emit(`const item = ${dataVar}[index]`)
    ctx.emit(`if (row.classList.contains('selected')) {`)
    ctx.indentIn()
    ctx.emit(`row.classList.remove('selected')`)
    ctx.emit(`row.style.background = ''`)
    ctx.emit(`window.$selection = window.$selection.filter(i => i !== item)`)
    ctx.indentOut()
    ctx.emit(`} else {`)
    ctx.indentIn()
    ctx.emit(`row.classList.add('selected')`)
    ctx.emit(`row.style.background = 'var(--primary-alpha, rgba(37, 99, 235, 0.15))'`)
    ctx.emit(`window.$selection.push(item)`)
    ctx.indentOut()
    ctx.emit(`}`)
    ctx.emit(`_runtime.notifyChange('$selection')`)
    ctx.indentOut()
    ctx.emit(`})`)
  }
}

/**
 * Generate pagination controls for table
 */
function emitTablePagination(ctx: EmitterContext, tableVar: string, dataVar: string, node: IRTable): void {
  const pageSize = node.pageSize || 10
  const pagVar = `${tableVar}_paginator`

  ctx.emit(`// Pagination`)
  ctx.emit(`const ${pagVar} = document.createElement('div')`)
  ctx.emit(`${pagVar}.className = 'mirror-table-paginator'`)
  ctx.emit(`${pagVar}.dataset.pageSize = '${pageSize}'`)
  ctx.emit(`${pagVar}.dataset.currentPage = '1'`)
  ctx.emit(`${pagVar}.dataset.totalItems = ${dataVar}.length`)

  if (node.paginatorSlotStyles && node.paginatorSlotStyles.length > 0) {
    ctx.emit(`Object.assign(${pagVar}.style, {`)
    ctx.indentIn()
    ctx.emit(`display: 'flex',`)
    for (const style of node.paginatorSlotStyles) {
      ctx.emit(`${style.property}: ${JSON.stringify(style.value)},`)
    }
    ctx.indentOut()
    ctx.emit(`})`)
  } else {
    ctx.emit(`Object.assign(${pagVar}.style, {`)
    ctx.indentIn()
    ctx.emit(`display: 'flex',`)
    ctx.emit(`justifyContent: 'space-between',`)
    ctx.emit(`alignItems: 'center',`)
    ctx.emit(`padding: '12px',`)
    ctx.emit(`borderTop: '1px solid var(--border, #333)',`)
    ctx.emit(`color: 'var(--text-muted, #888)',`)
    ctx.emit(`fontSize: '13px',`)
    ctx.indentOut()
    ctx.emit(`})`)
  }

  // Render custom paginator content or default
  if (node.paginatorSlot && node.paginatorSlot.length > 0) {
    for (const child of node.paginatorSlot) {
      ctx.emitNode(child, pagVar)
    }
  } else {
    // Default paginator UI
    const prevVar = `${pagVar}_prev`
    ctx.emit(`const ${prevVar} = document.createElement('button')`)
    ctx.emit(`${prevVar}.className = 'mirror-paginator-prev'`)
    ctx.emit(`${prevVar}.textContent = '← Prev'`)
    ctx.emit(`Object.assign(${prevVar}.style, {`)
    ctx.indentIn()
    ctx.emit(`padding: '6px 12px',`)
    ctx.emit(`background: 'var(--surface-elevated, #252525)',`)
    ctx.emit(`border: '1px solid var(--border, #333)',`)
    ctx.emit(`borderRadius: '4px',`)
    ctx.emit(`color: 'var(--text, white)',`)
    ctx.emit(`cursor: 'pointer',`)
    ctx.emit(`fontSize: '12px',`)
    if (node.paginatorPrevSlotStyles && node.paginatorPrevSlotStyles.length > 0) {
      for (const style of node.paginatorPrevSlotStyles) {
        ctx.emit(`${style.property}: ${JSON.stringify(style.value)},`)
      }
    }
    ctx.indentOut()
    ctx.emit(`})`)
    ctx.emit(`${prevVar}.addEventListener('click', () => {`)
    ctx.indentIn()
    ctx.emit(`if (typeof _runtime !== 'undefined' && _runtime.tablePrev) {`)
    ctx.indentIn()
    ctx.emit(`_runtime.tablePrev(${tableVar})`)
    ctx.indentOut()
    ctx.emit(`}`)
    ctx.indentOut()
    ctx.emit(`})`)

    // Page info
    const infoVar = `${pagVar}_info`
    ctx.emit(`const ${infoVar} = document.createElement('span')`)
    ctx.emit(`${infoVar}.className = 'mirror-paginator-info'`)
    if (node.paginatorPageInfoSlotStyles && node.paginatorPageInfoSlotStyles.length > 0) {
      ctx.emit(`Object.assign(${infoVar}.style, {`)
      ctx.indentIn()
      for (const style of node.paginatorPageInfoSlotStyles) {
        ctx.emit(`${style.property}: ${JSON.stringify(style.value)},`)
      }
      ctx.indentOut()
      ctx.emit(`})`)
    }
    ctx.emit(`${infoVar}.textContent = 'Page 1 of ' + Math.ceil(${dataVar}.length / ${pageSize})`)

    // Next button
    const nextVar = `${pagVar}_next`
    ctx.emit(`const ${nextVar} = document.createElement('button')`)
    ctx.emit(`${nextVar}.className = 'mirror-paginator-next'`)
    ctx.emit(`${nextVar}.textContent = 'Next →'`)
    ctx.emit(`Object.assign(${nextVar}.style, {`)
    ctx.indentIn()
    ctx.emit(`padding: '6px 12px',`)
    ctx.emit(`background: 'var(--surface-elevated, #252525)',`)
    ctx.emit(`border: '1px solid var(--border, #333)',`)
    ctx.emit(`borderRadius: '4px',`)
    ctx.emit(`color: 'var(--text, white)',`)
    ctx.emit(`cursor: 'pointer',`)
    ctx.emit(`fontSize: '12px',`)
    if (node.paginatorNextSlotStyles && node.paginatorNextSlotStyles.length > 0) {
      for (const style of node.paginatorNextSlotStyles) {
        ctx.emit(`${style.property}: ${JSON.stringify(style.value)},`)
      }
    }
    ctx.indentOut()
    ctx.emit(`})`)
    ctx.emit(`${nextVar}.addEventListener('click', () => {`)
    ctx.indentIn()
    ctx.emit(`if (typeof _runtime !== 'undefined' && _runtime.tableNext) {`)
    ctx.indentIn()
    ctx.emit(`_runtime.tableNext(${tableVar})`)
    ctx.indentOut()
    ctx.emit(`}`)
    ctx.indentOut()
    ctx.emit(`})`)

    ctx.emit(`${pagVar}.appendChild(${prevVar})`)
    ctx.emit(`${pagVar}.appendChild(${infoVar})`)
    ctx.emit(`${pagVar}.appendChild(${nextVar})`)
  }

  ctx.emit(`${tableVar}.appendChild(${pagVar})`)

  // Store page state
  ctx.emit(`${tableVar}._pageState = { current: 1, size: ${pageSize}, total: ${dataVar}.length }`)

  // Initialize page visibility
  ctx.emit(`if (typeof _runtime !== 'undefined' && _runtime._updateTablePage) {`)
  ctx.indentIn()
  ctx.emit(`_runtime._updateTablePage(${tableVar})`)
  ctx.indentOut()
  ctx.emit(`}`)
}

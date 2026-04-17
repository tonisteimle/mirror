/**
 * Table Pattern Detector
 *
 * Detects table-like structures from pixel analysis:
 * - Regular row heights
 * - Consistent column widths
 * - Grid alignment patterns
 */

import type { MergedElement, PixelBounds } from './schema'

// =============================================================================
// Types
// =============================================================================

export interface TableStructure {
  isTable: boolean
  confidence: number
  rows: TableRow[]
  columns: ColumnInfo[]
  headerRow?: number // Index of header row (usually 0)
}

export interface TableRow {
  index: number
  bounds: PixelBounds
  cells: TableCell[]
  isHeader: boolean
}

export interface TableCell {
  columnIndex: number
  bounds: PixelBounds
  content?: string
  backgroundColor?: string
}

export interface ColumnInfo {
  index: number
  x: number
  width: number
  alignment: 'left' | 'center' | 'right'
}

// =============================================================================
// Table Detection
// =============================================================================

/**
 * Find row candidates from element children using multiple strategies
 */
function findRowCandidates(element: MergedElement): MergedElement[] {
  if (!element.children) return []

  // Strategy 1: Direct children with horizontal layout
  const horizontalChildren = element.children.filter(
    child => child.layout === 'horizontal' || (child.children && child.children.length >= 2)
  )

  if (horizontalChildren.length >= 2) {
    return horizontalChildren
  }

  // Strategy 2: Look one level deeper (e.g., wrapper Frame containing rows)
  for (const child of element.children) {
    if (child.children && child.children.length >= 2) {
      const nestedHorizontal = child.children.filter(
        c => c.layout === 'horizontal' || (c.children && c.children.length >= 2)
      )
      if (nestedHorizontal.length >= 2) {
        return nestedHorizontal
      }
    }
  }

  // Strategy 3: All direct children as rows (if they seem row-like)
  if (element.children.length >= 2) {
    const allHaveContent = element.children.every(c => c.children || c.text || c.backgroundColor)
    if (allHaveContent) {
      return element.children
    }
  }

  return []
}

/**
 * Analyze a MergedElement to detect table patterns
 */
export function detectTablePattern(element: MergedElement): TableStructure | null {
  if (!element.children || element.children.length < 2) {
    return null
  }

  // Try multiple strategies to find row candidates
  const rowCandidates = findRowCandidates(element)

  if (rowCandidates.length < 2) {
    return null
  }

  // Analyze row heights - be more lenient
  const heights = rowCandidates.map(r => r.bounds.height).filter(h => h > 0)
  if (heights.length < 2) {
    return null
  }

  const heightVariance = calculateVariance(heights)
  const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length

  // Be more lenient - 50% tolerance OR all heights within 20px of each other
  const maxDiff = Math.max(...heights) - Math.min(...heights)
  const isRegularHeight = heightVariance < avgHeight * 0.5 || maxDiff < 20

  // Even if heights are irregular, if semantic says Table, try to detect
  if (!isRegularHeight && rowCandidates.length < 3) {
    return null
  }

  // Detect columns by analyzing x-positions of cell contents
  const columns = detectColumns(rowCandidates)

  if (columns.length < 2) {
    return null
  }

  // Build table structure
  const rows: TableRow[] = rowCandidates.map((row, index) => {
    const cells = mapCellsToColumns(row, columns)
    const isHeader = detectHeaderRow(row, index, rowCandidates)

    return {
      index,
      bounds: row.bounds,
      cells,
      isHeader,
    }
  })

  // Calculate confidence
  const confidence = calculateTableConfidence(rows, columns, heightVariance)

  return {
    isTable: confidence > 0.6,
    confidence,
    rows,
    columns,
    headerRow: rows.findIndex(r => r.isHeader),
  }
}

/**
 * Detect columns by finding consistent x-positions across rows
 */
function detectColumns(rows: MergedElement[]): ColumnInfo[] {
  // Collect all x-positions and widths from cell-like elements
  const xPositions: Map<number, { count: number; widths: number[] }> = new Map()

  for (const row of rows) {
    if (!row.children) continue

    for (const cell of row.children) {
      const x = Math.round(cell.bounds.x / 10) * 10 // Round to 10px grid
      const existing = xPositions.get(x) || { count: 0, widths: [] }
      existing.count++
      existing.widths.push(cell.bounds.width)
      xPositions.set(x, existing)
    }
  }

  // FALLBACK: If all x positions are 0 (not set), compute columns from cell ordering
  if (xPositions.size === 1 && xPositions.has(0)) {
    return computeColumnsFromOrdering(rows)
  }

  // Find x-positions that appear in most rows
  const minRowCount = Math.ceil(rows.length * 0.5) // At least 50% of rows
  const columns: ColumnInfo[] = []

  const sortedPositions = [...xPositions.entries()]
    .filter(([_, info]) => info.count >= minRowCount)
    .sort((a, b) => a[0] - b[0])

  for (let i = 0; i < sortedPositions.length; i++) {
    const [x, info] = sortedPositions[i]
    const avgWidth = info.widths.reduce((a, b) => a + b, 0) / info.widths.length

    columns.push({
      index: i,
      x,
      width: Math.round(avgWidth),
      alignment: 'left', // Default, could be improved
    })
  }

  return columns
}

/**
 * Compute columns from cell ordering when x-positions are not available
 * Uses cell widths and ordering to infer column structure
 */
function computeColumnsFromOrdering(rows: MergedElement[]): ColumnInfo[] {
  // Find the row with the most cells to determine column count
  let maxCells = 0
  let referenceRow: MergedElement | null = null

  for (const row of rows) {
    if (row.children && row.children.length > maxCells) {
      maxCells = row.children.length
      referenceRow = row
    }
  }

  if (!referenceRow || maxCells < 2) return []

  // Collect widths for each column position across all rows
  const columnWidths: number[][] = Array.from({ length: maxCells }, () => [])

  for (const row of rows) {
    if (!row.children) continue
    for (let i = 0; i < row.children.length && i < maxCells; i++) {
      const width = row.children[i].bounds.width
      if (width > 0) {
        columnWidths[i].push(width)
      }
    }
  }

  // Build columns with averaged widths
  const columns: ColumnInfo[] = []
  let currentX = 0

  for (let i = 0; i < maxCells; i++) {
    const widths = columnWidths[i]
    const avgWidth =
      widths.length > 0 ? Math.round(widths.reduce((a, b) => a + b, 0) / widths.length) : 100 // Default width if none specified

    columns.push({
      index: i,
      x: currentX,
      width: avgWidth,
      alignment: 'left',
    })

    currentX += avgWidth
  }

  return columns
}

/**
 * Map row children to detected columns
 */
function mapCellsToColumns(row: MergedElement, columns: ColumnInfo[]): TableCell[] {
  const cells: TableCell[] = []

  if (!row.children) {
    return cells
  }

  for (const child of row.children) {
    // Find closest column
    const cellX = child.bounds.x
    let closestColumn = 0
    let minDistance = Infinity

    for (let i = 0; i < columns.length; i++) {
      const distance = Math.abs(columns[i].x - cellX)
      if (distance < minDistance) {
        minDistance = distance
        closestColumn = i
      }
    }

    // Only accept if within reasonable distance (50px tolerance)
    if (minDistance < 50) {
      cells.push({
        columnIndex: closestColumn,
        bounds: child.bounds,
        content: child.text,
        backgroundColor: child.backgroundColor,
      })
    }
  }

  return cells
}

/**
 * Detect if a row is a header row
 */
function detectHeaderRow(row: MergedElement, index: number, allRows: MergedElement[]): boolean {
  // First row is often header
  if (index === 0) {
    // Check if it has different styling
    const hasDistinctBg = row.backgroundColor && row.backgroundColor !== allRows[1]?.backgroundColor

    // Check if children have different styling (smaller font, different color)
    const avgFontSize = getAverageFontSize(row)
    const otherAvgFontSize = allRows
      .slice(1)
      .map(r => getAverageFontSize(r))
      .filter(s => s > 0)

    const avgOther =
      otherAvgFontSize.length > 0
        ? otherAvgFontSize.reduce((a, b) => a + b, 0) / otherAvgFontSize.length
        : 0

    // Header often has smaller font or distinct background
    if (hasDistinctBg || (avgFontSize > 0 && avgFontSize < avgOther)) {
      return true
    }
  }

  return false
}

/**
 * Get average font size from row children
 */
function getAverageFontSize(row: MergedElement): number {
  if (!row.children) return 0

  const fontSizes = row.children.map(c => c.fontSize || 0).filter(s => s > 0)

  if (fontSizes.length === 0) return 0
  return fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length
}

/**
 * Calculate variance of numbers
 */
function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length
  const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2))
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length)
}

/**
 * Calculate confidence score for table detection
 */
function calculateTableConfidence(
  rows: TableRow[],
  columns: ColumnInfo[],
  heightVariance: number
): number {
  let confidence = 0.5 // Base confidence

  // More rows = more likely a table
  if (rows.length >= 3) confidence += 0.1
  if (rows.length >= 5) confidence += 0.1

  // More columns = more likely a table
  if (columns.length >= 3) confidence += 0.1
  if (columns.length >= 4) confidence += 0.1

  // Low height variance = consistent rows
  if (heightVariance < 5) confidence += 0.1

  // Has header row
  if (rows.some(r => r.isHeader)) confidence += 0.1

  // All rows have same number of cells
  const cellCounts = rows.map(r => r.cells.length)
  const allSameCellCount = cellCounts.every(c => c === cellCounts[0])
  if (allSameCellCount) confidence += 0.1

  return Math.min(confidence, 1.0)
}

// =============================================================================
// Mirror Code Generation for Tables
// =============================================================================

/**
 * Generate optimized Mirror code for a detected table
 */
export function generateTableCode(table: TableStructure, originalElement: MergedElement): string {
  const lines: string[] = []

  // Root table frame
  const rootProps: string[] = []
  if (originalElement.backgroundColor) {
    rootProps.push(`bg ${originalElement.backgroundColor}`)
  }
  if (originalElement.borderRadius) {
    rootProps.push(`rad ${originalElement.borderRadius}`)
  }
  rootProps.push('gap 0') // Tables typically have no gap between rows

  lines.push(`Frame ${rootProps.join(', ')}`)

  // Find where the rows are in the original element structure
  // They might be direct children or nested in a wrapper
  const rowContainer = findRowContainer(originalElement, table.rows.length)

  // Generate rows
  for (const row of table.rows) {
    const rowIndent = '  '
    const rowProps: string[] = ['hor']

    // Find original element for styling
    const originalRow = rowContainer?.[row.index]
    if (originalRow?.backgroundColor) {
      rowProps.push(`bg ${originalRow.backgroundColor}`)
    }
    if (originalRow?.padding) {
      const { top, right } = originalRow.padding
      rowProps.push(`pad ${top} ${right}`)
    }

    lines.push(`${rowIndent}Frame ${rowProps.join(', ')}`)

    // Generate cells with fixed widths
    for (const col of table.columns) {
      const cell = row.cells.find(c => c.columnIndex === col.index)
      const cellIndent = '    '

      if (cell?.content) {
        const textProps: string[] = [`"${cell.content}"`]
        textProps.push(`w ${col.width}`)

        // Get color from original if available
        const originalCell = originalRow?.children?.[col.index]
        if (originalCell?.color) {
          textProps.push(`col ${originalCell.color}`)
        }
        if (originalCell?.fontSize) {
          textProps.push(`fs ${originalCell.fontSize}`)
        }

        lines.push(`${cellIndent}Text ${textProps.join(', ')}`)
      } else {
        // Empty cell placeholder
        lines.push(`${cellIndent}Frame w ${col.width}`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Find where rows are in the element structure
 * They might be direct children or nested in a wrapper
 */
function findRowContainer(
  element: MergedElement,
  expectedRowCount: number
): MergedElement[] | undefined {
  // Direct children match
  if (element.children?.length === expectedRowCount) {
    return element.children
  }

  // Wrapper case: single child contains the rows
  if (element.children?.length === 1 && element.children[0].children?.length === expectedRowCount) {
    return element.children[0].children
  }

  // Fallback to direct children
  return element.children
}

// =============================================================================
// Integration Helper
// =============================================================================

/**
 * Check if semantic analysis suggests a table and apply table detection
 */
export function shouldApplyTableDetection(componentType: string | undefined): boolean {
  return componentType === 'Table' || componentType === 'List' || componentType === 'DataGrid'
}

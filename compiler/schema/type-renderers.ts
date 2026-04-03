/**
 * Mirror Type Renderers
 *
 * Default rendering templates for Table cells based on inferred data types.
 * These are conceptual definitions - actual rendering happens in the DOM backend.
 */

import type { InferredDataType } from './table-types'

/**
 * Renderer definition for a data type
 */
export interface TypeRendererDef {
  /** Human-readable name */
  name: string
  /** Description */
  description: string
  /** Default alignment */
  align?: 'left' | 'right' | 'center'
  /** Font style */
  fontMono?: boolean
}

/**
 * Type renderer definitions
 */
export const TYPE_RENDERERS: Record<InferredDataType, TypeRendererDef> = {
  string: {
    name: 'StringCell',
    description: 'Text, left-aligned, truncated if too long',
    align: 'left',
  },
  number: {
    name: 'NumberCell',
    description: 'Number, right-aligned, monospace',
    align: 'right',
    fontMono: true,
  },
  boolean: {
    name: 'BooleanCell',
    description: 'Check/X icon for true/false',
    align: 'center',
  },
  date: {
    name: 'DateCell',
    description: 'Formatted date (locale-specific)',
    align: 'left',
  },
  relation: {
    name: 'RelationCell',
    description: 'Shows .name of related entry with link styling',
    align: 'left',
  },
  array: {
    name: 'ArrayCell',
    description: 'Comma-separated list or tags',
    align: 'left',
  },
  unknown: {
    name: 'UnknownCell',
    description: 'Fallback to string representation',
    align: 'left',
  },
}

/**
 * Get renderer for a data type
 */
export function getTypeRenderer(type: InferredDataType): TypeRendererDef {
  return TYPE_RENDERERS[type] ?? TYPE_RENDERERS.unknown
}

/**
 * Get alignment CSS value for a type
 */
export function getTypeAlignment(type: InferredDataType): string {
  const renderer = getTypeRenderer(type)
  switch (renderer.align) {
    case 'right':
      return 'flex-end'
    case 'center':
      return 'center'
    default:
      return 'flex-start'
  }
}

/**
 * Get CSS styles for a type renderer
 */
export function getTypeRendererStyles(type: InferredDataType): Record<string, string> {
  const renderer = getTypeRenderer(type)
  const styles: Record<string, string> = {}

  // Alignment
  if (renderer.align === 'right') {
    styles['justify-content'] = 'flex-end'
    styles['text-align'] = 'right'
  } else if (renderer.align === 'center') {
    styles['justify-content'] = 'center'
    styles['text-align'] = 'center'
  }

  // Monospace for numbers
  if (renderer.fontMono) {
    styles['font-family'] = 'ui-monospace, monospace'
  }

  return styles
}

/**
 * Format a cell value for display based on its type
 * Returns JavaScript expression string for code generation
 */
export function getValueFormatter(type: InferredDataType, fieldExpr: string, options?: {
  prefix?: string
  suffix?: string
}): string {
  const { prefix, suffix } = options ?? {}
  let expr = fieldExpr

  switch (type) {
    case 'boolean':
      // Return icon element (check/x) - handled specially in renderer
      return `${fieldExpr}`

    case 'date':
      // Format as locale date
      return `new Date(${fieldExpr}).toLocaleDateString('de-DE')`

    case 'relation':
      // Get .name from related entry
      return `(${fieldExpr}?.name ?? ${fieldExpr} ?? '')`

    case 'array':
      // Join with comma or show count for large arrays
      return `Array.isArray(${fieldExpr}) ? ${fieldExpr}.join(', ') : ''`

    case 'number':
      // Keep as-is, add suffix/prefix if specified
      if (prefix) expr = `"${prefix}" + ${expr}`
      if (suffix) expr = `${expr} + "${suffix}"`
      return expr

    case 'string':
    default:
      // Default: string coercion with prefix/suffix
      if (prefix) expr = `"${prefix}" + ${expr}`
      if (suffix) expr = `${expr} + "${suffix}"`
      return `String(${expr} ?? '')`
  }
}

/**
 * Data Context Hooks
 *
 * Hooks for accessing data context.
 * Separated from provider to avoid react-refresh issues.
 */

import { createContext, useContext } from 'react'
import type { DataSchema, DataRecord } from '../parser/types'
import { resolveFieldPath } from './data-utils'

// ============================================
// Types
// ============================================

interface DataContextValue {
  /** Current record being rendered (e.g., the current Task in a list) */
  currentRecord: DataRecord | null
  /** Type name of the current record (e.g., 'Task') */
  currentTypeName: string | null
  /** All data records by collection name (e.g., { tasks: [...], categories: [...] }) */
  allRecords: Map<string, DataRecord[]>
  /** All schemas for type/relation lookup */
  schemas: DataSchema[]
}

// ============================================
// Context (shared with provider)
// ============================================

export const DataContext = createContext<DataContextValue>({
  currentRecord: null,
  currentTypeName: null,
  allRecords: new Map(),
  schemas: []
})

// ============================================
// Hooks
// ============================================

/**
 * Hook to access data context.
 */
export function useDataContext() {
  return useContext(DataContext)
}

/**
 * Hook to resolve a field path from the current data context.
 */
export function useResolveField(fieldPath: string): unknown {
  const { currentRecord, currentTypeName, schemas, allRecords } = useDataContext()
  return resolveFieldPath(fieldPath, currentRecord, currentTypeName, schemas, allRecords)
}

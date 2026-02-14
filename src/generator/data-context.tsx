/**
 * Data Context for Data Binding
 *
 * Provides context for data-bound components to access:
 * - Current record being rendered
 * - All data records (for relation resolution)
 * - Schema information
 *
 * Also integrates with RuntimeVariableContext to make record fields
 * accessible as $fieldName (e.g., $title, $done).
 */

import { useContext, useMemo, type ReactNode } from 'react'
import type { DataSchema, DataRecord } from '../parser/types'
import { RuntimeVariableContext, useRuntimeVariables } from './runtime-context'
import { DataContext } from './data-context-hooks'

// ============================================
// Provider
// ============================================

interface DataProviderProps {
  children: ReactNode
  /** All data records */
  allRecords: Map<string, DataRecord[]>
  /** All schemas */
  schemas: DataSchema[]
}

/**
 * Provider for data records available to all data-bound components.
 * Wraps the entire preview.
 */
export function DataProvider({ children, allRecords, schemas }: DataProviderProps) {
  const value = useMemo(() => ({
    currentRecord: null,
    currentTypeName: null,
    allRecords,
    schemas
  }), [allRecords, schemas])

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

interface DataRecordProviderProps {
  children: ReactNode
  /** Current record being rendered */
  record: DataRecord
  /** Type name of the record */
  typeName: string
}

/**
 * Provider for a single data record.
 * Used when iterating over a data collection.
 *
 * Also injects record fields into RuntimeVariableContext so they can be
 * accessed as $fieldName (e.g., $title, $done, $category).
 */
export function DataRecordProvider({ children, record, typeName }: DataRecordProviderProps) {
  const parent = useContext(DataContext)
  const { variables: parentVariables, setVariable } = useRuntimeVariables()

  // Data context value
  const dataValue = useMemo(() => ({
    currentRecord: record,
    currentTypeName: typeName,
    allRecords: parent.allRecords,
    schemas: parent.schemas
  }), [record, typeName, parent.allRecords, parent.schemas])

  // Merge record fields into runtime variables
  // This makes $title, $done, etc. work inside data-bound components
  const variablesWithRecord = useMemo(() => {
    const merged = { ...parentVariables }

    // Add all record fields as variables
    for (const [key, value] of Object.entries(record)) {
      if (key !== '_id') {
        merged[key] = value
      }
    }

    // Also add the full record as $item for convenience
    merged['item'] = record

    return merged
  }, [parentVariables, record])

  const runtimeValue = useMemo(() => ({
    variables: variablesWithRecord,
    setVariable
  }), [variablesWithRecord, setVariable])

  return (
    <DataContext.Provider value={dataValue}>
      <RuntimeVariableContext.Provider value={runtimeValue}>
        {children}
      </RuntimeVariableContext.Provider>
    </DataContext.Provider>
  )
}

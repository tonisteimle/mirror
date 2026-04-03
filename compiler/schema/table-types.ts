/**
 * Mirror Table Types
 *
 * Type inference system for auto-generating Table columns from data schemas.
 */

import type { DataEntry, DataValue, DataReference, DataReferenceArray } from '../parser/data-types'
import { isDataReference, isDataReferenceArray, isDataArray, isDataBoolean, isDataNumber } from '../parser/data-types'

/**
 * Inferred data type for automatic column rendering
 */
export type InferredDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'relation'
  | 'array'
  | 'unknown'

/**
 * Schema for a single field in a collection
 */
export interface FieldSchema {
  /** Field name (key) */
  name: string
  /** Inferred data type */
  type: InferredDataType
  /** Target collection for relations (e.g., "users" for $users.toni) */
  relationTo?: string
}

/**
 * Schema for a data collection (from .data files)
 */
export interface CollectionSchema {
  /** Collection name (filename without extension) */
  name: string
  /** All fields and their inferred types */
  fields: FieldSchema[]
}

/**
 * Date pattern for inferring date types (YYYY-MM-DD)
 */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Check if a string value looks like a date
 */
function isDatePattern(value: string): boolean {
  return DATE_PATTERN.test(value)
}

/**
 * Infer the data type from a value
 */
export function inferType(value: DataValue): InferredDataType {
  // Reference to another entry
  if (isDataReference(value)) {
    return 'relation'
  }

  // Array of references
  if (isDataReferenceArray(value)) {
    return 'array'
  }

  // Array of strings
  if (isDataArray(value)) {
    return 'array'
  }

  // Boolean
  if (isDataBoolean(value)) {
    return 'boolean'
  }

  // Number
  if (isDataNumber(value)) {
    return 'number'
  }

  // String - check for date pattern
  if (typeof value === 'string') {
    if (isDatePattern(value)) {
      return 'date'
    }
    return 'string'
  }

  return 'unknown'
}

/**
 * Extract the relation target from a reference
 */
function getRelationTarget(value: DataValue): string | undefined {
  if (isDataReference(value)) {
    return value.collection
  }
  if (isDataReferenceArray(value)) {
    // Use first reference's collection as target
    return value.references[0]?.collection
  }
  return undefined
}

/**
 * Extract schema from parsed data entries
 *
 * Analyzes all entries in a collection to infer field types.
 * First seen type wins (or we could implement type widening).
 */
export function extractSchema(collectionName: string, entries: DataEntry[]): CollectionSchema {
  const fieldMap = new Map<string, FieldSchema>()

  for (const entry of entries) {
    for (const attr of entry.attributes) {
      // Skip if we've already seen this field
      if (fieldMap.has(attr.key)) {
        continue
      }

      const type = inferType(attr.value)
      const relationTo = getRelationTarget(attr.value)

      fieldMap.set(attr.key, {
        name: attr.key,
        type,
        relationTo,
      })
    }
  }

  return {
    name: collectionName,
    fields: Array.from(fieldMap.values()),
  }
}

/**
 * Registry for data collection schemas
 *
 * Maintains schemas for all loaded collections to enable
 * zero-config Table column generation.
 */
export class DataTypeRegistry {
  private schemas: Map<string, CollectionSchema> = new Map()

  /**
   * Register a collection schema from parsed data entries
   */
  registerCollection(name: string, entries: DataEntry[]): void {
    const schema = extractSchema(name, entries)
    this.schemas.set(name, schema)
  }

  /**
   * Get schema for a collection
   */
  getSchema(collection: string): CollectionSchema | undefined {
    return this.schemas.get(collection)
  }

  /**
   * Get the inferred type for a specific field
   */
  getFieldType(collection: string, field: string): InferredDataType {
    const schema = this.schemas.get(collection)
    if (!schema) return 'unknown'

    const fieldSchema = schema.fields.find(f => f.name === field)
    return fieldSchema?.type ?? 'unknown'
  }

  /**
   * Get all field schemas for a collection
   */
  getFields(collection: string): FieldSchema[] {
    return this.schemas.get(collection)?.fields ?? []
  }

  /**
   * Check if a collection is registered
   */
  hasCollection(collection: string): boolean {
    return this.schemas.has(collection)
  }

  /**
   * Get all registered collection names
   */
  getCollectionNames(): string[] {
    return Array.from(this.schemas.keys())
  }

  /**
   * Clear all schemas
   */
  clear(): void {
    this.schemas.clear()
  }
}

// Global registry instance (singleton for compiler use)
export const dataTypeRegistry = new DataTypeRegistry()

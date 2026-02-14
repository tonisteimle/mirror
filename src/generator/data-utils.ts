/**
 * Data Context Utilities
 *
 * Utility functions for data field resolution.
 * Separated from provider to avoid react-refresh issues.
 */

import type { DataSchema, DataRecord, ASTNode, ConditionExpr } from '../parser/types'
import { getCollectionName } from '../parser/data-parser'

// ============================================
// Field Resolution
// ============================================

/**
 * Resolve a field path to a value from the current record.
 *
 * Examples:
 * - 'title' -> record.title
 * - 'category.name' -> resolve category relation, then get name
 * - 'category.parent.name' -> nested relation
 *
 * @param fieldPath - Dot-separated field path (e.g., 'title', 'category.name')
 * @param record - The current data record
 * @param typeName - The type name of the record
 * @param schemas - All schemas for relation lookup
 * @param allRecords - All records for relation resolution
 * @returns The resolved value, or undefined if not found
 */
export function resolveFieldPath(
  fieldPath: string,
  record: DataRecord | null,
  typeName: string | null,
  schemas: DataSchema[],
  allRecords: Map<string, DataRecord[]>
): unknown {
  if (!record || !typeName) return undefined

  const parts = fieldPath.split('.')
  let currentValue: unknown = record
  let currentTypeName = typeName

  for (const part of parts) {
    if (currentValue === null || currentValue === undefined) {
      return undefined
    }

    if (typeof currentValue !== 'object') {
      return undefined
    }

    const obj = currentValue as Record<string, unknown>
    const fieldValue = obj[part]

    // Check if this field is a relation
    const schema = schemas.find(s => s.typeName === currentTypeName)
    const field = schema?.fields.find(f => f.name === part)

    if (field && !['text', 'number', 'boolean'].includes(field.type)) {
      // It's a relation - resolve to the related record
      const relatedTypeName = field.type
      const relatedCollectionName = getCollectionName(relatedTypeName)
      const relatedRecords = allRecords.get(relatedCollectionName) || []

      // fieldValue should be the _id of the related record
      if (typeof fieldValue === 'string') {
        const relatedRecord = relatedRecords.find(r => r._id === fieldValue)
        if (relatedRecord) {
          currentValue = relatedRecord
          currentTypeName = relatedTypeName
          continue
        }
      }
      return undefined
    }

    // Not a relation - just get the field value
    currentValue = fieldValue
  }

  return currentValue
}

// ============================================
// Node Field Resolution
// ============================================

/**
 * Check if a value is a field reference (field name or dotted path).
 *
 * @param value - The value to check
 * @param fieldNames - Set of valid field names from the schema
 * @returns True if the value references a field
 */
export function isFieldReference(value: unknown, fieldNames: Set<string>): boolean {
  if (typeof value !== 'string') return false
  // Direct field reference: "title", "done"
  if (fieldNames.has(value)) return true
  // Dotted path: "category.name" -> check if first part is a field
  const parts = value.split('.')
  return parts.length > 1 && fieldNames.has(parts[0])
}

/**
 * Resolve field references in an AST node's content and properties.
 *
 * This function transforms field names into their actual values from the current
 * data record. It handles:
 * - Text content: `Label title` -> `Label "Einkaufen"`
 * - Properties: `Checkbox checked done` -> `Checkbox checked true`
 * - Dotted paths: `Tag category.name` -> `Tag "Arbeit"`
 * - _text children: resolves text child nodes
 *
 * @param node - The AST node to resolve
 * @param currentRecord - The current data record
 * @param typeName - The type name of the record
 * @param schemas - All schemas for relation lookup
 * @param allRecords - All records for relation resolution
 * @returns A new node with resolved field values (or original if nothing to resolve)
 */
export function resolveNodeFields(
  node: ASTNode,
  currentRecord: DataRecord | null,
  typeName: string | null,
  schemas: DataSchema[],
  allRecords: Map<string, DataRecord[]>
): ASTNode {
  if (!currentRecord || !typeName) return node

  const schema = schemas.find(s => s.typeName === typeName)
  if (!schema) return node

  const fieldNames = new Set(schema.fields.map(f => f.name))

  // Check if this node needs any resolution
  let needsResolution = false

  // Check content
  if (isFieldReference(node.content, fieldNames)) {
    needsResolution = true
  }

  // Check property values (including _fieldBinding objects)
  for (const value of Object.values(node.properties)) {
    if (isFieldReference(value, fieldNames)) {
      needsResolution = true
      break
    }
    // Check for _fieldBinding objects from parser
    if (typeof value === 'object' && value !== null && '_fieldBinding' in value) {
      needsResolution = true
      break
    }
  }

  // Check _text children
  for (const child of node.children) {
    if (child.name === '_text' && isFieldReference(child.content, fieldNames)) {
      needsResolution = true
      break
    }
  }

  if (!needsResolution) return node

  // Create resolved copy
  const resolved: ASTNode = {
    ...node,
    properties: { ...node.properties },
    children: [...node.children]
  }

  // 1. Resolve text content
  if (isFieldReference(node.content, fieldNames)) {
    const value = resolveFieldPath(node.content as string, currentRecord, typeName, schemas, allRecords)
    resolved.content = value !== undefined ? String(value) : node.content
  }

  // 2. Resolve property values
  for (const [key, value] of Object.entries(node.properties)) {
    // Handle _fieldBinding objects from parser (e.g., { _fieldBinding: "done" })
    if (typeof value === 'object' && value !== null && '_fieldBinding' in value) {
      const binding = (value as { _fieldBinding: string })._fieldBinding
      const resolvedValue = resolveFieldPath(binding, currentRecord, typeName, schemas, allRecords)
      if (resolvedValue !== undefined) {
        resolved.properties[key] = resolvedValue
      }
    }
    // Handle direct field references
    else if (typeof value === 'string' && isFieldReference(value, fieldNames)) {
      const resolvedValue = resolveFieldPath(value, currentRecord, typeName, schemas, allRecords)
      if (resolvedValue !== undefined) {
        resolved.properties[key] = resolvedValue
      }
    }
  }

  // 3. Resolve _text children
  resolved.children = node.children.map(child => {
    if (child.name === '_text' && isFieldReference(child.content, fieldNames)) {
      const value = resolveFieldPath(child.content as string, currentRecord, typeName, schemas, allRecords)
      return {
        ...child,
        content: value !== undefined ? String(value) : child.content
      }
    }
    return child
  })

  return resolved
}

/**
 * Get records for a data binding.
 *
 * @param typeName - The type name (e.g., 'Tasks', 'Users')
 * @param allRecords - All records
 * @param schemas - All schemas
 * @param filter - Optional filter condition
 * @returns Array of records matching the binding
 */
export function getDataRecords(
  typeName: string,
  allRecords: Map<string, DataRecord[]>,
  schemas: DataSchema[],
  filter?: ConditionExpr
): DataRecord[] {
  // Find the collection - typeName might be 'Tasks' or 'tasks'
  let collectionName = typeName.toLowerCase()

  // Try to find the schema to get the proper collection name
  const schema = schemas.find(s =>
    s.typeName === typeName ||
    s.typeName.toLowerCase() === typeName.toLowerCase()
  )
  if (schema) {
    collectionName = getCollectionName(schema.typeName)
  }

  const records = allRecords.get(collectionName) || []

  // If no filter, return all records
  if (!filter) {
    return records
  }

  // Apply filter
  return records.filter(record => {
    return evaluateFilterCondition(filter, record, schema?.typeName || typeName, schemas, allRecords)
  })
}

/**
 * Evaluate a filter condition against a record.
 */
function evaluateFilterCondition(
  condition: ConditionExpr,
  record: DataRecord,
  typeName: string,
  schemas: DataSchema[],
  allRecords: Map<string, DataRecord[]>
): boolean {
  switch (condition.type) {
    case 'var': {
      // Variable reference like $done or done
      const fieldName = condition.name?.replace(/^\$/, '') || ''
      const value = resolveFieldPath(fieldName, record, typeName, schemas, allRecords)
      return Boolean(value)
    }

    case 'not':
      if (!condition.operand) return true
      return !evaluateFilterCondition(condition.operand, record, typeName, schemas, allRecords)

    case 'and':
      if (!condition.left || !condition.right) return true
      return (
        evaluateFilterCondition(condition.left, record, typeName, schemas, allRecords) &&
        evaluateFilterCondition(condition.right, record, typeName, schemas, allRecords)
      )

    case 'or':
      if (!condition.left || !condition.right) return false
      return (
        evaluateFilterCondition(condition.left, record, typeName, schemas, allRecords) ||
        evaluateFilterCondition(condition.right, record, typeName, schemas, allRecords)
      )

    case 'comparison': {
      if (!condition.left) return true

      // Get left value (usually a field reference)
      let leftValue: unknown
      if (condition.left.type === 'var' && condition.left.name) {
        const leftFieldName = condition.left.name.replace(/^\$/, '')
        leftValue = resolveFieldPath(leftFieldName, record, typeName, schemas, allRecords)
      }

      // Get right value (usually a literal)
      const rightValue = condition.value

      // Compare based on operator
      switch (condition.operator) {
        case '==':
          return leftValue === rightValue
        case '!=':
          return leftValue !== rightValue
        case '>':
          return typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue > rightValue
        case '<':
          return typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue < rightValue
        case '>=':
          return typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue >= rightValue
        case '<=':
          return typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue <= rightValue
        default:
          return true
      }
    }

    default:
      return true
  }
}

/**
 * Schema Registry
 *
 * Central registry for schema definitions.
 * Used by Form/Field components to determine field types and relation targets.
 */

import type { SchemaDefinition, SchemaField, SchemaType, SchemaConstraint } from '../parser/ast'

export class SchemaRegistry {
  private schemas: Map<string, SchemaDefinition> = new Map()

  /**
   * Register a schema for a collection
   * @param collectionName - Name of the collection (e.g., 'tasks', 'users')
   * @param schema - The schema definition
   */
  register(collectionName: string, schema: SchemaDefinition): void {
    // Remove $ prefix if present
    const name = collectionName.startsWith('$') ? collectionName.slice(1) : collectionName
    this.schemas.set(name, schema)
  }

  /**
   * Get the schema for a collection
   * @param collectionName - Name of the collection
   * @returns The schema definition or undefined
   */
  get(collectionName: string): SchemaDefinition | undefined {
    const name = collectionName.startsWith('$') ? collectionName.slice(1) : collectionName
    return this.schemas.get(name)
  }

  /**
   * Check if a collection has a registered schema
   */
  has(collectionName: string): boolean {
    const name = collectionName.startsWith('$') ? collectionName.slice(1) : collectionName
    return this.schemas.has(name)
  }

  /**
   * Get all registered collection names
   */
  collections(): string[] {
    return Array.from(this.schemas.keys())
  }

  /**
   * Alias for collections() - returns all registered collection names
   */
  list(): string[] {
    return this.collections()
  }

  /**
   * Get all entries as [name, schema] pairs
   */
  entries(): [string, SchemaDefinition][] {
    return Array.from(this.schemas.entries())
  }

  /**
   * Get a specific field from a collection's schema
   * @param collectionName - Name of the collection
   * @param fieldName - Name of the field
   * @returns The field definition or undefined
   */
  getField(collectionName: string, fieldName: string): SchemaField | undefined {
    const schema = this.get(collectionName)
    if (!schema) return undefined
    return schema.fields.find(f => f.name === fieldName)
  }

  /**
   * Get the type of a field in a collection
   * @param collectionName - Name of the collection
   * @param fieldName - Name of the field
   * @returns The field type or undefined
   */
  getFieldType(collectionName: string, fieldName: string): SchemaType | undefined {
    const field = this.getField(collectionName, fieldName)
    return field?.type
  }

  /**
   * Get the relation target for a field (if it's a relation)
   * @param collectionName - Name of the collection
   * @param fieldName - Name of the field
   * @returns The target collection name or undefined
   */
  getRelationTarget(collectionName: string, fieldName: string): string | undefined {
    const fieldType = this.getFieldType(collectionName, fieldName)
    if (fieldType?.kind === 'relation') {
      return fieldType.target
    }
    return undefined
  }

  /**
   * Check if a field is a relation (N:1 or N:N)
   */
  isRelation(collectionName: string, fieldName: string): boolean {
    const fieldType = this.getFieldType(collectionName, fieldName)
    return fieldType?.kind === 'relation'
  }

  /**
   * Check if a field is an array relation (N:N)
   */
  isArrayRelation(collectionName: string, fieldName: string): boolean {
    const fieldType = this.getFieldType(collectionName, fieldName)
    return fieldType?.kind === 'relation' && fieldType.isArray
  }

  /**
   * Check if a field is required
   */
  isRequired(collectionName: string, fieldName: string): boolean {
    const field = this.getField(collectionName, fieldName)
    if (!field) return false
    return field.constraints.some(c => c.kind === 'required')
  }

  /**
   * Get the max constraint value for a field
   * @returns The max value or undefined
   */
  getMaxConstraint(collectionName: string, fieldName: string): number | undefined {
    const field = this.getField(collectionName, fieldName)
    if (!field) return undefined
    const maxConstraint = field.constraints.find(c => c.kind === 'max')
    return maxConstraint?.kind === 'max' ? maxConstraint.value : undefined
  }

  /**
   * Get the onDelete action for a relation field
   * @returns The action ('cascade' | 'nullify' | 'restrict') or undefined
   */
  getOnDeleteAction(collectionName: string, fieldName: string): 'cascade' | 'nullify' | 'restrict' | undefined {
    const field = this.getField(collectionName, fieldName)
    if (!field) return undefined
    const onDeleteConstraint = field.constraints.find(c => c.kind === 'onDelete')
    return onDeleteConstraint?.kind === 'onDelete' ? onDeleteConstraint.action : undefined
  }

  /**
   * Clear all registered schemas
   */
  clear(): void {
    this.schemas.clear()
  }
}

// Singleton instance for global access
export const schemaRegistry = new SchemaRegistry()

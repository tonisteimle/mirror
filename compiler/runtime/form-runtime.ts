/**
 * Form Runtime
 *
 * Runtime support for Form component with:
 * - Schema-driven field generation
 * - Two-way binding to collection.current
 * - Automatic field type detection
 * - Validation support
 */

import { schemaRegistry } from './schema-registry'
import { getCollection, type CollectionLike } from './crud-actions'
import type { SchemaFieldType } from '../parser/ast'

/**
 * Field configuration for rendering
 */
export interface FieldConfig {
  name: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'textarea' | 'select' | 'checkbox' | 'switch' | 'slider'
  placeholder?: string
  required: boolean
  disabled: boolean
  readOnly: boolean
  max?: number
  min?: number
  // For relations
  relationTarget?: string
  isArray?: boolean
  options?: Array<{ value: string; label: string }>
}

/**
 * Form state for managing edits
 */
export interface FormState {
  collectionName: string
  collection: CollectionLike
  fields: FieldConfig[]
  values: Record<string, unknown>
  errors: Record<string, string>
  dirty: boolean
}

/**
 * Get field type for rendering based on schema type
 */
export function getFieldType(schemaType: SchemaFieldType, display?: string): FieldConfig['type'] {
  // User-specified display type takes precedence
  if (display) {
    const validTypes: FieldConfig['type'][] = ['text', 'number', 'boolean', 'textarea', 'select', 'checkbox', 'switch', 'slider']
    if (validTypes.includes(display as FieldConfig['type'])) {
      return display as FieldConfig['type']
    }
  }

  // Auto-detect from schema type
  if (schemaType.kind === 'primitive') {
    switch (schemaType.type) {
      case 'string':
        return 'text'
      case 'number':
        return 'number'
      case 'boolean':
        return 'checkbox'
      default:
        return 'text'
    }
  }

  if (schemaType.kind === 'relation') {
    return 'select'
  }

  return 'text'
}

/**
 * Generate field configurations from schema
 */
export function generateFieldConfigs(collectionName: string): FieldConfig[] {
  const normalizedName = collectionName.startsWith('$') ? collectionName.slice(1) : collectionName
  const schema = schemaRegistry.get(normalizedName)

  if (!schema) {
    return []
  }

  return schema.fields.map(field => {
    const required = field.constraints.some(c => c.kind === 'required')
    const maxConstraint = field.constraints.find(c => c.kind === 'max')
    const max = maxConstraint?.kind === 'max' ? maxConstraint.value : undefined

    const config: FieldConfig = {
      name: field.name,
      label: formatLabel(field.name),
      type: getFieldType(field.type),
      required,
      disabled: false,
      readOnly: false,
      max,
    }

    // Handle relation fields
    if (field.type.kind === 'relation') {
      config.relationTarget = field.type.target
      config.isArray = field.type.isArray
    }

    return config
  })
}

/**
 * Format field name as human-readable label
 */
function formatLabel(name: string): string {
  // Convert camelCase or snake_case to Title Case
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
}

/**
 * Get relation options from target collection
 */
export function getRelationOptions(targetCollection: string): Array<{ value: string; label: string }> {
  const collection = getCollection(targetCollection)
  if (!collection) {
    return []
  }

  return collection.items.map(item => ({
    value: String(item.id ?? ''),
    label: String(item.name ?? item.title ?? item.label ?? item.id ?? ''),
  }))
}

/**
 * Create form state for a collection
 */
export function createFormState(collectionName: string): FormState | null {
  const collection = getCollection(collectionName)
  if (!collection) {
    return null
  }

  const fields = generateFieldConfigs(collectionName)
  const current = collection.current

  // Initialize values from current entry or defaults
  const values: Record<string, unknown> = {}
  for (const field of fields) {
    if (current && current[field.name] !== undefined) {
      // Use value from current entry
      values[field.name] = current[field.name]
    } else {
      // Use default value (also when current exists but field is missing)
      values[field.name] = getDefaultValue(field)
    }
  }

  return {
    collectionName: collectionName.startsWith('$') ? collectionName.slice(1) : collectionName,
    collection,
    fields,
    values,
    errors: {},
    dirty: false,
  }
}

/**
 * Validate form values against schema
 */
export function validateForm(state: FormState): Record<string, string> {
  const errors: Record<string, string> = {}
  const schema = schemaRegistry.get(state.collectionName)

  if (!schema) {
    return errors
  }

  for (const field of schema.fields) {
    const value = state.values[field.name]
    const isRequired = field.constraints.some(c => c.kind === 'required')
    const maxConstraint = field.constraints.find(c => c.kind === 'max')

    // Required validation
    if (isRequired) {
      const isEmpty = value === undefined || value === null || value === '' ||
        (typeof value === 'string' && value.trim() === '')
      if (isEmpty) {
        errors[field.name] = `${formatLabel(field.name)} is required`
        continue
      }
    }

    // Max validation for strings
    if (maxConstraint?.kind === 'max' && typeof value === 'string') {
      if (value.length > maxConstraint.value) {
        errors[field.name] = `${formatLabel(field.name)} must be at most ${maxConstraint.value} characters`
      }
    }

    // Max validation for numbers
    if (maxConstraint?.kind === 'max' && typeof value === 'number') {
      if (value > maxConstraint.value) {
        errors[field.name] = `${formatLabel(field.name)} must be at most ${maxConstraint.value}`
      }
    }
  }

  return errors
}

/**
 * Update a field value in form state
 */
export function updateFieldValue(state: FormState, fieldName: string, value: unknown): FormState {
  return {
    ...state,
    values: {
      ...state.values,
      [fieldName]: value,
    },
    dirty: true,
  }
}

/**
 * Reset form to initial values from collection.current
 */
export function resetForm(state: FormState): FormState {
  const current = state.collection.current
  const values: Record<string, unknown> = {}

  for (const field of state.fields) {
    if (current && current[field.name] !== undefined) {
      values[field.name] = current[field.name]
    } else {
      values[field.name] = getDefaultValue(field)
    }
  }

  return {
    ...state,
    values,
    errors: {},
    dirty: false,
  }
}

/**
 * Get default value for a field
 */
function getDefaultValue(field: FieldConfig): unknown {
  switch (field.type) {
    case 'text':
    case 'textarea':
      return ''
    case 'number':
    case 'slider':
      return field.min ?? 0
    case 'boolean':
    case 'checkbox':
    case 'switch':
      return false
    case 'select':
      return field.isArray ? [] : null
    default:
      return ''
  }
}

/**
 * Form runtime object for registration
 */
export const formRuntime = {
  generateFieldConfigs,
  getFieldType,
  getRelationOptions,
  createFormState,
  validateForm,
  updateFieldValue,
  resetForm,
}

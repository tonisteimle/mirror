/**
 * CRUD Actions Runtime
 *
 * Runtime implementation of CRUD functions:
 * - create(collection, initialValues?) - Create new entry
 * - save() - Save pending changes
 * - revert() - Discard pending changes
 * - delete(entry?, confirm?) - Delete entry
 */

import { schemaRegistry } from './schema-registry'

// Type for collection-like objects (matches $collection helper in generated code)
export interface CollectionLike {
  items: Array<Record<string, unknown>>
  current: Record<string, unknown> | null
  add(item: Partial<Record<string, unknown>>): Record<string, unknown>
  remove(item: Record<string, unknown>): void
  update(item: Record<string, unknown>, changes: Partial<Record<string, unknown>>): void
  subscribe(fn: () => void): () => void
}

// Global collections store (set by generated code)
declare global {
  interface Window {
    __collections: Record<string, CollectionLike>
  }
}

/**
 * Get a collection by name
 */
export function getCollection(name: string): CollectionLike | undefined {
  const normalizedName = name.startsWith('$') ? name.slice(1) : name
  return typeof window !== 'undefined' ? window.__collections?.[normalizedName] : undefined
}

// Alias for consistency with $ prefix convention
export const $getCollection = getCollection

/**
 * Generate default values for a new entry based on schema
 */
export function getDefaults(collectionName: string): Record<string, unknown> {
  const schema = schemaRegistry.get(collectionName)
  if (!schema) return {}

  const defaults: Record<string, unknown> = {}

  for (const field of schema.fields) {
    if (field.type.kind === 'primitive') {
      switch (field.type.type) {
        case 'string':
          defaults[field.name] = ''
          break
        case 'number':
          defaults[field.name] = 0
          break
        case 'boolean':
          defaults[field.name] = false
          break
      }
    } else if (field.type.kind === 'relation') {
      defaults[field.name] = field.type.isArray ? [] : null
    }
  }

  return defaults
}

/**
 * Create a new entry in a collection and set it as current
 *
 * @param collectionName - Name of the collection (e.g., '$tasks' or 'tasks')
 * @param initialValues - Optional initial values for the new entry
 */
export function create(
  collectionName: string,
  initialValues?: Record<string, unknown>
): Record<string, unknown> | null {
  const collection = getCollection(collectionName)
  if (!collection) {
    console.warn(`Collection "${collectionName}" not found`)
    return null
  }

  // Merge defaults with initial values
  const defaults = getDefaults(collectionName)
  const newItem = collection.add({ ...defaults, ...initialValues })

  // Set as current
  collection.current = newItem

  return newItem
}

/**
 * Save pending changes to the current entry
 *
 * @param collectionName - Name of the collection
 * @param pendingChanges - Changes to apply
 */
export function save(
  collectionName: string,
  pendingChanges: Record<string, unknown>
): boolean {
  const collection = getCollection(collectionName)
  if (!collection) {
    console.warn(`Collection "${collectionName}" not found`)
    return false
  }

  const current = collection.current
  if (!current) {
    console.warn(`No current entry in collection "${collectionName}"`)
    return false
  }

  // Validate required fields
  const schema = schemaRegistry.get(collectionName)
  if (schema) {
    for (const field of schema.fields) {
      const isRequired = field.constraints.some(c => c.kind === 'required')
      const value = pendingChanges[field.name] ?? current[field.name]

      if (isRequired && (value === undefined || value === null || value === '')) {
        console.warn(`Required field "${field.name}" is empty`)
        return false
      }
    }
  }

  // Apply changes
  collection.update(current, pendingChanges)

  return true
}

/**
 * Revert/discard pending changes (no-op at runtime, UI handles this)
 */
export function revert(): void {
  // This is primarily handled by the UI layer
  // The function exists for API completeness
}

/**
 * Delete an entry from its collection
 *
 * @param entry - The entry to delete (or current entry if not specified)
 * @param collectionName - Name of the collection
 * @param confirmMessage - Optional confirmation message
 */
export function deleteEntry(
  collectionName: string,
  entry?: Record<string, unknown>,
  confirmMessage?: string
): boolean {
  const collection = getCollection(collectionName)
  if (!collection) {
    console.warn(`Collection "${collectionName}" not found`)
    return false
  }

  const itemToDelete = entry ?? collection.current
  if (!itemToDelete) {
    console.warn(`No entry to delete in collection "${collectionName}"`)
    return false
  }

  // Show confirmation if requested
  if (confirmMessage && typeof window !== 'undefined' && !window.confirm(confirmMessage)) {
    return false
  }

  // Handle cascade delete
  handleCascadeDelete(collectionName, itemToDelete)

  // Remove from collection
  collection.remove(itemToDelete)

  return true
}

/**
 * Handle cascade delete based on schema constraints
 */
function handleCascadeDelete(
  collectionName: string,
  entry: Record<string, unknown>
): void {
  const entryId = entry.id

  // Find all collections that reference this collection
  for (const [otherCollName, otherSchema] of schemaRegistry.entries()) {
    for (const field of otherSchema.fields) {
      if (field.type.kind === 'relation' && field.type.target === `$${collectionName}`) {
        const onDeleteConstraint = field.constraints.find(c => c.kind === 'onDelete')
        const action = onDeleteConstraint?.kind === 'onDelete' ? onDeleteConstraint.action : 'nullify'

        const otherCollection = getCollection(otherCollName)
        if (!otherCollection) continue

        for (const item of [...otherCollection.items]) {
          const refValue = item[field.name]

          // Check if this item references the deleted entry
          const referencesEntry = field.type.isArray
            ? Array.isArray(refValue) && refValue.some((ref: unknown) =>
                (ref as Record<string, unknown>)?.id === entryId || ref === entryId)
            : (refValue as Record<string, unknown>)?.id === entryId || refValue === entryId

          if (referencesEntry) {
            if (action === 'cascade') {
              // Recursively delete referencing entries
              deleteEntry(otherCollName, item)
            } else if (action === 'nullify') {
              // Set reference to null
              if (field.type.isArray) {
                const filtered = (refValue as unknown[]).filter((ref: unknown) =>
                  (ref as Record<string, unknown>)?.id !== entryId && ref !== entryId)
                otherCollection.update(item, { [field.name]: filtered })
              } else {
                otherCollection.update(item, { [field.name]: null })
              }
            } else if (action === 'restrict') {
              throw new Error(`Cannot delete: referenced by ${otherCollName}.${field.name}`)
            }
          }
        }
      }
    }
  }
}

/**
 * Add a new item to a collection (alias for create)
 */
export function $add(
  collectionName: string,
  initialValues?: Record<string, unknown>
): Record<string, unknown> | null {
  return create(collectionName, initialValues)
}

/**
 * Remove an item from a collection
 */
export function $remove(
  collectionName: string,
  entry?: Record<string, unknown>
): boolean {
  return deleteEntry(collectionName, entry)
}

/**
 * Update an item in a collection
 */
export function $update(
  collectionName: string,
  item: Record<string, unknown>,
  changes: Record<string, unknown>
): boolean {
  const collection = getCollection(collectionName)
  if (!collection) {
    console.warn(`Collection "${collectionName}" not found`)
    return false
  }

  collection.update(item, changes)
  return true
}

/**
 * Save changes to current entry (alias for save)
 */
export function $save(
  collectionName: string,
  pendingChanges: Record<string, unknown>
): boolean {
  return save(collectionName, pendingChanges)
}

/**
 * Select an item as current in a collection
 */
export function $select(
  collectionName: string,
  item: Record<string, unknown> | null
): void {
  const collection = getCollection(collectionName)
  if (!collection) {
    console.warn(`Collection "${collectionName}" not found`)
    return
  }

  collection.current = item
}

/**
 * Select the next item in a collection
 */
export function $selectNext(collectionName: string): void {
  const collection = getCollection(collectionName)
  if (!collection) return

  const items = collection.items
  if (items.length === 0) return

  const currentIndex = collection.current
    ? items.indexOf(collection.current)
    : -1

  const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
  collection.current = items[nextIndex]
}

/**
 * Select the previous item in a collection
 */
export function $selectPrev(collectionName: string): void {
  const collection = getCollection(collectionName)
  if (!collection) return

  const items = collection.items
  if (items.length === 0) return

  const currentIndex = collection.current
    ? items.indexOf(collection.current)
    : 0

  const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
  collection.current = items[prevIndex]
}

/**
 * Clear all items from a collection
 */
export function $clear(collectionName: string): void {
  const collection = getCollection(collectionName)
  if (!collection) {
    console.warn(`Collection "${collectionName}" not found`)
    return
  }

  // Remove all items
  while (collection.items.length > 0) {
    collection.remove(collection.items[0])
  }
  collection.current = null
}

/**
 * CRUD Actions object for runtime registration
 */
export const crudActions = {
  create,
  save,
  revert,
  delete: deleteEntry,
  $add,
  $remove,
  $update,
  $save,
  $select,
  $selectNext,
  $selectPrev,
  $clear,
  $getCollection,
}

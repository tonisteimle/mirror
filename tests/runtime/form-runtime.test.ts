/**
 * Form Runtime Tests
 *
 * Tests for Form component runtime:
 * - Field generation from schema
 * - Field type detection
 * - Form state management
 * - Validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateFieldConfigs,
  getFieldType,
  getRelationOptions,
  createFormState,
  validateForm,
  updateFieldValue,
  resetForm,
  type FieldConfig,
} from '../../compiler/runtime/form-runtime'
import { schemaRegistry } from '../../compiler/runtime/schema-registry'
import { type CollectionLike } from '../../compiler/runtime/crud-actions'

// Mock window.__collections
const mockCollections: Record<string, CollectionLike> = {}

// Setup global window mock
beforeEach(() => {
  // Clear collections
  Object.keys(mockCollections).forEach(key => delete mockCollections[key])

  // Clear schema registry
  schemaRegistry.clear()

  // Setup window mock
  ;(global as unknown as { window: { __collections: typeof mockCollections } }).window = {
    __collections: mockCollections,
  }
})

// Helper to create a mock collection
function createMockCollection(items: Array<Record<string, unknown>> = []): CollectionLike {
  const subscribers = new Set<() => void>()
  let current: Record<string, unknown> | null = null

  return {
    items: [...items],
    get current() {
      return current
    },
    set current(item: Record<string, unknown> | null) {
      current = item
      subscribers.forEach(fn => fn())
    },
    add(item) {
      const newItem = { id: Date.now().toString(), ...item }
      this.items.push(newItem)
      return newItem
    },
    remove(item) {
      const idx = this.items.indexOf(item)
      if (idx > -1) this.items.splice(idx, 1)
      if (current === item) current = null
    },
    update(item, changes) {
      Object.assign(item, changes)
    },
    subscribe(fn) {
      subscribers.add(fn)
      return () => subscribers.delete(fn)
    },
  }
}

describe('getFieldType', () => {
  it('returns text for string type', () => {
    expect(getFieldType({ kind: 'primitive', type: 'string' })).toBe('text')
  })

  it('returns number for number type', () => {
    expect(getFieldType({ kind: 'primitive', type: 'number' })).toBe('number')
  })

  it('returns checkbox for boolean type', () => {
    expect(getFieldType({ kind: 'primitive', type: 'boolean' })).toBe('checkbox')
  })

  it('returns select for relation type', () => {
    expect(getFieldType({ kind: 'relation', target: '$users', isArray: false })).toBe('select')
  })

  it('respects display override', () => {
    expect(getFieldType({ kind: 'primitive', type: 'string' }, 'textarea')).toBe('textarea')
    expect(getFieldType({ kind: 'primitive', type: 'boolean' }, 'switch')).toBe('switch')
    expect(getFieldType({ kind: 'primitive', type: 'number' }, 'slider')).toBe('slider')
  })
})

describe('generateFieldConfigs', () => {
  beforeEach(() => {
    schemaRegistry.register('tasks', {
      fields: [
        { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [{ kind: 'required' }], line: 1 },
        { name: 'description', type: { kind: 'primitive', type: 'string' }, constraints: [{ kind: 'max', value: 500 }], line: 2 },
        { name: 'priority', type: { kind: 'primitive', type: 'number' }, constraints: [], line: 3 },
        { name: 'done', type: { kind: 'primitive', type: 'boolean' }, constraints: [], line: 4 },
        { name: 'assignee', type: { kind: 'relation', target: '$users', isArray: false }, constraints: [], line: 5 },
      ],
      line: 1,
      column: 1,
    })
  })

  it('generates configs for all schema fields', () => {
    const configs = generateFieldConfigs('tasks')
    expect(configs).toHaveLength(5)
  })

  it('handles $ prefix in collection name', () => {
    const configs = generateFieldConfigs('$tasks')
    expect(configs).toHaveLength(5)
  })

  it('sets correct field types', () => {
    const configs = generateFieldConfigs('tasks')
    const byName = Object.fromEntries(configs.map(c => [c.name, c]))

    expect(byName.title.type).toBe('text')
    expect(byName.description.type).toBe('text')
    expect(byName.priority.type).toBe('number')
    expect(byName.done.type).toBe('checkbox')
    expect(byName.assignee.type).toBe('select')
  })

  it('sets required flag from constraints', () => {
    const configs = generateFieldConfigs('tasks')
    const byName = Object.fromEntries(configs.map(c => [c.name, c]))

    expect(byName.title.required).toBe(true)
    expect(byName.description.required).toBe(false)
  })

  it('sets max from constraints', () => {
    const configs = generateFieldConfigs('tasks')
    const byName = Object.fromEntries(configs.map(c => [c.name, c]))

    expect(byName.description.max).toBe(500)
    expect(byName.title.max).toBeUndefined()
  })

  it('formats labels from field names', () => {
    const configs = generateFieldConfigs('tasks')
    const byName = Object.fromEntries(configs.map(c => [c.name, c]))

    expect(byName.title.label).toBe('Title')
    expect(byName.done.label).toBe('Done')
  })

  it('captures relation info', () => {
    const configs = generateFieldConfigs('tasks')
    const assigneeConfig = configs.find(c => c.name === 'assignee')!

    expect(assigneeConfig.relationTarget).toBe('$users')
    expect(assigneeConfig.isArray).toBe(false)
  })

  it('returns empty for unknown collection', () => {
    const configs = generateFieldConfigs('unknown')
    expect(configs).toEqual([])
  })
})

describe('getRelationOptions', () => {
  beforeEach(() => {
    mockCollections['users'] = createMockCollection([
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
      { id: 'u3', title: 'Charlie' }, // uses title as fallback
    ])
  })

  it('returns options from target collection', () => {
    const options = getRelationOptions('users')
    expect(options).toHaveLength(3)
  })

  it('uses name, title, or id for label', () => {
    const options = getRelationOptions('users')

    expect(options[0]).toEqual({ value: 'u1', label: 'Alice' })
    expect(options[1]).toEqual({ value: 'u2', label: 'Bob' })
    expect(options[2]).toEqual({ value: 'u3', label: 'Charlie' })
  })

  it('handles $ prefix', () => {
    const options = getRelationOptions('$users')
    expect(options).toHaveLength(3)
  })

  it('returns empty for unknown collection', () => {
    const options = getRelationOptions('unknown')
    expect(options).toEqual([])
  })
})

describe('createFormState', () => {
  beforeEach(() => {
    schemaRegistry.register('tasks', {
      fields: [
        { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
        { name: 'count', type: { kind: 'primitive', type: 'number' }, constraints: [], line: 2 },
        { name: 'done', type: { kind: 'primitive', type: 'boolean' }, constraints: [], line: 3 },
      ],
      line: 1,
      column: 1,
    })

    mockCollections['tasks'] = createMockCollection([
      { id: '1', title: 'Existing Task', count: 5, done: true },
    ])
  })

  it('creates state for collection', () => {
    const state = createFormState('tasks')

    expect(state).not.toBeNull()
    expect(state!.collectionName).toBe('tasks')
    expect(state!.fields).toHaveLength(3)
  })

  it('initializes with default values when no current', () => {
    const state = createFormState('tasks')!

    expect(state.values.title).toBe('')
    expect(state.values.count).toBe(0)
    expect(state.values.done).toBe(false)
  })

  it('initializes from current entry when selected', () => {
    mockCollections['tasks'].current = mockCollections['tasks'].items[0]

    const state = createFormState('tasks')!

    expect(state.values.title).toBe('Existing Task')
    expect(state.values.count).toBe(5)
    expect(state.values.done).toBe(true)
  })

  it('starts not dirty', () => {
    const state = createFormState('tasks')!
    expect(state.dirty).toBe(false)
  })

  it('returns null for unknown collection', () => {
    const state = createFormState('unknown')
    expect(state).toBeNull()
  })
})

describe('validateForm', () => {
  beforeEach(() => {
    schemaRegistry.register('tasks', {
      fields: [
        { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [{ kind: 'required' }], line: 1 },
        { name: 'description', type: { kind: 'primitive', type: 'string' }, constraints: [{ kind: 'max', value: 10 }], line: 2 },
        { name: 'priority', type: { kind: 'primitive', type: 'number' }, constraints: [{ kind: 'max', value: 5 }], line: 3 },
      ],
      line: 1,
      column: 1,
    })

    mockCollections['tasks'] = createMockCollection()
  })

  it('validates required fields', () => {
    const state = createFormState('tasks')!
    state.values.title = ''

    const errors = validateForm(state)

    expect(errors.title).toBe('Title is required')
  })

  it('passes when required field has value', () => {
    const state = createFormState('tasks')!
    state.values.title = 'Test'

    const errors = validateForm(state)

    expect(errors.title).toBeUndefined()
  })

  it('validates max length for strings', () => {
    const state = createFormState('tasks')!
    state.values.title = 'Test'
    state.values.description = 'This is way too long'

    const errors = validateForm(state)

    expect(errors.description).toBe('Description must be at most 10 characters')
  })

  it('validates max value for numbers', () => {
    const state = createFormState('tasks')!
    state.values.title = 'Test'
    state.values.priority = 10

    const errors = validateForm(state)

    expect(errors.priority).toBe('Priority must be at most 5')
  })

  it('returns empty errors for valid form', () => {
    const state = createFormState('tasks')!
    state.values.title = 'Test'
    state.values.description = 'Short'
    state.values.priority = 3

    const errors = validateForm(state)

    expect(Object.keys(errors)).toHaveLength(0)
  })
})

describe('updateFieldValue', () => {
  beforeEach(() => {
    schemaRegistry.register('tasks', {
      fields: [
        { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
      ],
      line: 1,
      column: 1,
    })

    mockCollections['tasks'] = createMockCollection()
  })

  it('updates field value', () => {
    const state = createFormState('tasks')!
    const newState = updateFieldValue(state, 'title', 'New Title')

    expect(newState.values.title).toBe('New Title')
  })

  it('marks form as dirty', () => {
    const state = createFormState('tasks')!
    const newState = updateFieldValue(state, 'title', 'New Title')

    expect(newState.dirty).toBe(true)
  })

  it('preserves other values', () => {
    schemaRegistry.clear()
    schemaRegistry.register('tasks', {
      fields: [
        { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
        { name: 'description', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 2 },
      ],
      line: 1,
      column: 1,
    })

    const state = createFormState('tasks')!
    state.values.description = 'Original'
    const newState = updateFieldValue(state, 'title', 'New Title')

    expect(newState.values.description).toBe('Original')
  })
})

describe('resetForm', () => {
  beforeEach(() => {
    schemaRegistry.register('tasks', {
      fields: [
        { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
        { name: 'count', type: { kind: 'primitive', type: 'number' }, constraints: [], line: 2 },
      ],
      line: 1,
      column: 1,
    })

    mockCollections['tasks'] = createMockCollection([
      { id: '1', title: 'Original', count: 10 },
    ])
    mockCollections['tasks'].current = mockCollections['tasks'].items[0]
  })

  it('resets to current values', () => {
    const state = createFormState('tasks')!
    state.values.title = 'Changed'
    state.values.count = 99

    const resetState = resetForm(state)

    expect(resetState.values.title).toBe('Original')
    expect(resetState.values.count).toBe(10)
  })

  it('clears errors', () => {
    const state = createFormState('tasks')!
    state.errors = { title: 'Some error' }

    const resetState = resetForm(state)

    expect(resetState.errors).toEqual({})
  })

  it('clears dirty flag', () => {
    const state = createFormState('tasks')!
    state.dirty = true

    const resetState = resetForm(state)

    expect(resetState.dirty).toBe(false)
  })

  it('resets to defaults when no current', () => {
    mockCollections['tasks'].current = null

    const state = createFormState('tasks')!
    state.values.title = 'Changed'

    const resetState = resetForm(state)

    expect(resetState.values.title).toBe('')
    expect(resetState.values.count).toBe(0)
  })
})

describe('Form with Relations', () => {
  beforeEach(() => {
    // Users collection
    mockCollections['users'] = createMockCollection([
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
    ])

    // Tasks collection with user relation
    mockCollections['tasks'] = createMockCollection()

    schemaRegistry.register('tasks', {
      fields: [
        { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
        { name: 'assignee', type: { kind: 'relation', target: '$users', isArray: false }, constraints: [], line: 2 },
        { name: 'watchers', type: { kind: 'relation', target: '$users', isArray: true }, constraints: [], line: 3 },
      ],
      line: 1,
      column: 1,
    })
  })

  it('generates select field for single relation', () => {
    const configs = generateFieldConfigs('tasks')
    const assignee = configs.find(c => c.name === 'assignee')!

    expect(assignee.type).toBe('select')
    expect(assignee.relationTarget).toBe('$users')
    expect(assignee.isArray).toBe(false)
  })

  it('generates select field for array relation', () => {
    const configs = generateFieldConfigs('tasks')
    const watchers = configs.find(c => c.name === 'watchers')!

    expect(watchers.type).toBe('select')
    expect(watchers.relationTarget).toBe('$users')
    expect(watchers.isArray).toBe(true)
  })

  it('initializes single relation as null', () => {
    const state = createFormState('tasks')!
    expect(state.values.assignee).toBeNull()
  })

  it('initializes array relation as empty array', () => {
    const state = createFormState('tasks')!
    expect(state.values.watchers).toEqual([])
  })
})

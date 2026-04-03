/**
 * Aggressive Tests: Form Runtime
 *
 * Comprehensive edge case testing for Form runtime:
 * - Field generation edge cases
 * - Validation edge cases
 * - State management edge cases
 * - Relation handling
 * - Error conditions
 */

import { describe, it, expect, beforeEach } from 'vitest'
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
  Object.keys(mockCollections).forEach(key => delete mockCollections[key])
  schemaRegistry.clear()
  ;(global as unknown as { window: { __collections: typeof mockCollections } }).window = {
    __collections: mockCollections,
  }
})

function createMockCollection(items: Array<Record<string, unknown>> = []): CollectionLike {
  const subscribers = new Set<() => void>()
  let current: Record<string, unknown> | null = null

  return {
    items: [...items],
    get current() { return current },
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

describe('getFieldType: Aggressive Tests', () => {
  describe('Primitive Types', () => {
    it('returns text for string', () => {
      expect(getFieldType({ kind: 'primitive', type: 'string' })).toBe('text')
    })

    it('returns number for number', () => {
      expect(getFieldType({ kind: 'primitive', type: 'number' })).toBe('number')
    })

    it('returns checkbox for boolean', () => {
      expect(getFieldType({ kind: 'primitive', type: 'boolean' })).toBe('checkbox')
    })

    it('returns text for unknown primitive', () => {
      expect(getFieldType({ kind: 'primitive', type: 'unknown' as any })).toBe('text')
    })
  })

  describe('Relation Types', () => {
    it('returns select for single relation', () => {
      expect(getFieldType({ kind: 'relation', target: '$users', isArray: false })).toBe('select')
    })

    it('returns select for array relation', () => {
      expect(getFieldType({ kind: 'relation', target: '$tags', isArray: true })).toBe('select')
    })
  })

  describe('Display Overrides', () => {
    it('textarea override', () => {
      expect(getFieldType({ kind: 'primitive', type: 'string' }, 'textarea')).toBe('textarea')
    })

    it('switch override for boolean', () => {
      expect(getFieldType({ kind: 'primitive', type: 'boolean' }, 'switch')).toBe('switch')
    })

    it('slider override for number', () => {
      expect(getFieldType({ kind: 'primitive', type: 'number' }, 'slider')).toBe('slider')
    })

    it('select override for string', () => {
      expect(getFieldType({ kind: 'primitive', type: 'string' }, 'select')).toBe('select')
    })

    it('checkbox override for string', () => {
      expect(getFieldType({ kind: 'primitive', type: 'string' }, 'checkbox')).toBe('checkbox')
    })

    it('number override for string', () => {
      expect(getFieldType({ kind: 'primitive', type: 'string' }, 'number')).toBe('number')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty display override', () => {
      expect(getFieldType({ kind: 'primitive', type: 'string' }, '')).toBe('text')
    })

    it('handles undefined display override', () => {
      expect(getFieldType({ kind: 'primitive', type: 'string' }, undefined)).toBe('text')
    })
  })
})

describe('generateFieldConfigs: Aggressive Tests', () => {
  describe('Basic Schema', () => {
    beforeEach(() => {
      schemaRegistry.register('products', {
        fields: [
          { name: 'name', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
          { name: 'price', type: { kind: 'primitive', type: 'number' }, constraints: [], line: 2 },
          { name: 'inStock', type: { kind: 'primitive', type: 'boolean' }, constraints: [], line: 3 },
        ],
        line: 1,
        column: 1,
      })
    })

    it('generates configs for all fields', () => {
      const configs = generateFieldConfigs('products')
      expect(configs).toHaveLength(3)
    })

    it('assigns correct types', () => {
      const configs = generateFieldConfigs('products')
      const byName = Object.fromEntries(configs.map(c => [c.name, c]))

      expect(byName.name.type).toBe('text')
      expect(byName.price.type).toBe('number')
      expect(byName.inStock.type).toBe('checkbox')
    })

    it('formats labels from camelCase', () => {
      const configs = generateFieldConfigs('products')
      const byName = Object.fromEntries(configs.map(c => [c.name, c]))

      expect(byName.inStock.label).toBe('In Stock')
    })
  })

  describe('Constraints Handling', () => {
    beforeEach(() => {
      schemaRegistry.register('constrained', {
        fields: [
          {
            name: 'required_field',
            type: { kind: 'primitive', type: 'string' },
            constraints: [{ kind: 'required' }],
            line: 1,
          },
          {
            name: 'max_field',
            type: { kind: 'primitive', type: 'string' },
            constraints: [{ kind: 'max', value: 255 }],
            line: 2,
          },
          {
            name: 'both',
            type: { kind: 'primitive', type: 'string' },
            constraints: [{ kind: 'required' }, { kind: 'max', value: 100 }],
            line: 3,
          },
        ],
        line: 1,
        column: 1,
      })
    })

    it('sets required from constraint', () => {
      const configs = generateFieldConfigs('constrained')
      const byName = Object.fromEntries(configs.map(c => [c.name, c]))

      expect(byName.required_field.required).toBe(true)
      expect(byName.max_field.required).toBe(false)
    })

    it('sets max from constraint', () => {
      const configs = generateFieldConfigs('constrained')
      const byName = Object.fromEntries(configs.map(c => [c.name, c]))

      expect(byName.max_field.max).toBe(255)
      expect(byName.required_field.max).toBeUndefined()
    })

    it('handles multiple constraints', () => {
      const configs = generateFieldConfigs('constrained')
      const byName = Object.fromEntries(configs.map(c => [c.name, c]))

      expect(byName.both.required).toBe(true)
      expect(byName.both.max).toBe(100)
    })
  })

  describe('Relation Fields', () => {
    beforeEach(() => {
      schemaRegistry.register('posts', {
        fields: [
          { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
          { name: 'author', type: { kind: 'relation', target: '$users', isArray: false }, constraints: [], line: 2 },
          { name: 'tags', type: { kind: 'relation', target: '$tags', isArray: true }, constraints: [], line: 3 },
        ],
        line: 1,
        column: 1,
      })
    })

    it('sets select type for relations', () => {
      const configs = generateFieldConfigs('posts')
      const byName = Object.fromEntries(configs.map(c => [c.name, c]))

      expect(byName.author.type).toBe('select')
      expect(byName.tags.type).toBe('select')
    })

    it('captures relation target', () => {
      const configs = generateFieldConfigs('posts')
      const byName = Object.fromEntries(configs.map(c => [c.name, c]))

      expect(byName.author.relationTarget).toBe('$users')
      expect(byName.tags.relationTarget).toBe('$tags')
    })

    it('captures isArray flag', () => {
      const configs = generateFieldConfigs('posts')
      const byName = Object.fromEntries(configs.map(c => [c.name, c]))

      expect(byName.author.isArray).toBe(false)
      expect(byName.tags.isArray).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('returns empty for unknown collection', () => {
      const configs = generateFieldConfigs('nonexistent')
      expect(configs).toEqual([])
    })

    it('handles $ prefix in collection name', () => {
      schemaRegistry.register('items', {
        fields: [{ name: 'x', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 }],
        line: 1,
        column: 1,
      })

      const configs = generateFieldConfigs('$items')
      expect(configs).toHaveLength(1)
    })

    it('handles empty fields array', () => {
      schemaRegistry.register('empty', {
        fields: [],
        line: 1,
        column: 1,
      })

      const configs = generateFieldConfigs('empty')
      expect(configs).toEqual([])
    })
  })

  describe('Label Formatting', () => {
    beforeEach(() => {
      schemaRegistry.register('labels', {
        fields: [
          { name: 'firstName', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
          { name: 'lastName', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 2 },
          { name: 'emailAddress', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 3 },
          { name: 'isActive', type: { kind: 'primitive', type: 'boolean' }, constraints: [], line: 4 },
          { name: 'createdAt', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 5 },
        ],
        line: 1,
        column: 1,
      })
    })

    it('converts camelCase to Title Case', () => {
      const configs = generateFieldConfigs('labels')
      const byName = Object.fromEntries(configs.map(c => [c.name, c]))

      expect(byName.firstName.label).toBe('First Name')
      expect(byName.lastName.label).toBe('Last Name')
      expect(byName.emailAddress.label).toBe('Email Address')
      expect(byName.isActive.label).toBe('Is Active')
      expect(byName.createdAt.label).toBe('Created At')
    })
  })
})

describe('getRelationOptions: Aggressive Tests', () => {
  beforeEach(() => {
    mockCollections['users'] = createMockCollection([
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
      { id: 'u3', title: 'Charlie' },
      { id: 'u4' }, // No name or title
    ])
  })

  it('returns all items as options', () => {
    const options = getRelationOptions('users')
    expect(options).toHaveLength(4)
  })

  it('uses name for label when available', () => {
    const options = getRelationOptions('users')
    expect(options[0]).toEqual({ value: 'u1', label: 'Alice' })
    expect(options[1]).toEqual({ value: 'u2', label: 'Bob' })
  })

  it('uses title as fallback', () => {
    const options = getRelationOptions('users')
    expect(options[2]).toEqual({ value: 'u3', label: 'Charlie' })
  })

  it('uses id when no name or title', () => {
    const options = getRelationOptions('users')
    expect(options[3]).toEqual({ value: 'u4', label: 'u4' })
  })

  it('handles $ prefix', () => {
    const options = getRelationOptions('$users')
    expect(options).toHaveLength(4)
  })

  it('returns empty for unknown collection', () => {
    const options = getRelationOptions('nonexistent')
    expect(options).toEqual([])
  })

  it('returns empty for empty collection', () => {
    mockCollections['empty'] = createMockCollection([])
    const options = getRelationOptions('empty')
    expect(options).toEqual([])
  })
})

describe('createFormState: Aggressive Tests', () => {
  beforeEach(() => {
    schemaRegistry.register('products', {
      fields: [
        { name: 'name', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
        { name: 'price', type: { kind: 'primitive', type: 'number' }, constraints: [], line: 2 },
        { name: 'active', type: { kind: 'primitive', type: 'boolean' }, constraints: [], line: 3 },
        { name: 'category', type: { kind: 'relation', target: '$categories', isArray: false }, constraints: [], line: 4 },
        { name: 'tags', type: { kind: 'relation', target: '$tags', isArray: true }, constraints: [], line: 5 },
      ],
      line: 1,
      column: 1,
    })
    mockCollections['products'] = createMockCollection()
  })

  describe('Default Value Initialization', () => {
    it('initializes string to empty string', () => {
      const state = createFormState('products')!
      expect(state.values.name).toBe('')
    })

    it('initializes number to 0', () => {
      const state = createFormState('products')!
      expect(state.values.price).toBe(0)
    })

    it('initializes boolean to false', () => {
      const state = createFormState('products')!
      expect(state.values.active).toBe(false)
    })

    it('initializes single relation to null', () => {
      const state = createFormState('products')!
      expect(state.values.category).toBeNull()
    })

    it('initializes array relation to empty array', () => {
      const state = createFormState('products')!
      expect(state.values.tags).toEqual([])
    })
  })

  describe('Current Entry Initialization', () => {
    it('initializes from current when set', () => {
      mockCollections['products'] = createMockCollection([
        { id: '1', name: 'Widget', price: 99.99, active: true, category: 'cat1', tags: ['t1', 't2'] },
      ])
      mockCollections['products'].current = mockCollections['products'].items[0]

      const state = createFormState('products')!

      expect(state.values.name).toBe('Widget')
      expect(state.values.price).toBe(99.99)
      expect(state.values.active).toBe(true)
      expect(state.values.category).toBe('cat1')
      expect(state.values.tags).toEqual(['t1', 't2'])
    })

    it('handles missing fields in current', () => {
      mockCollections['products'] = createMockCollection([
        { id: '1', name: 'Partial' }, // Missing price, active, etc.
      ])
      mockCollections['products'].current = mockCollections['products'].items[0]

      const state = createFormState('products')!

      expect(state.values.name).toBe('Partial')
      expect(state.values.price).toBe(0) // Default
      expect(state.values.active).toBe(false) // Default
    })
  })

  describe('State Properties', () => {
    it('includes all fields', () => {
      const state = createFormState('products')!
      expect(state.fields).toHaveLength(5)
    })

    it('starts not dirty', () => {
      const state = createFormState('products')!
      expect(state.dirty).toBe(false)
    })

    it('starts with no errors', () => {
      const state = createFormState('products')!
      expect(state.errors).toEqual({})
    })

    it('includes collection name', () => {
      const state = createFormState('products')!
      expect(state.collectionName).toBe('products')
    })
  })

  describe('Edge Cases', () => {
    it('returns null for unknown collection', () => {
      const state = createFormState('nonexistent')
      expect(state).toBeNull()
    })

    it('handles $ prefix', () => {
      const state = createFormState('$products')
      expect(state).not.toBeNull()
      expect(state!.collectionName).toBe('products')
    })
  })
})

describe('validateForm: Aggressive Tests', () => {
  beforeEach(() => {
    schemaRegistry.register('validated', {
      fields: [
        {
          name: 'required',
          type: { kind: 'primitive', type: 'string' },
          constraints: [{ kind: 'required' }],
          line: 1,
        },
        {
          name: 'maxLen',
          type: { kind: 'primitive', type: 'string' },
          constraints: [{ kind: 'max', value: 5 }],
          line: 2,
        },
        {
          name: 'maxNum',
          type: { kind: 'primitive', type: 'number' },
          constraints: [{ kind: 'max', value: 100 }],
          line: 3,
        },
        {
          name: 'both',
          type: { kind: 'primitive', type: 'string' },
          constraints: [{ kind: 'required' }, { kind: 'max', value: 10 }],
          line: 4,
        },
      ],
      line: 1,
      column: 1,
    })
    mockCollections['validated'] = createMockCollection()
  })

  describe('Required Validation', () => {
    it('fails on empty string', () => {
      const state = createFormState('validated')!
      state.values.required = ''
      state.values.both = 'ok'

      const errors = validateForm(state)

      expect(errors.required).toBe('Required is required')
    })

    it('passes on non-empty string', () => {
      const state = createFormState('validated')!
      state.values.required = 'value'
      state.values.both = 'ok'

      const errors = validateForm(state)

      expect(errors.required).toBeUndefined()
    })

    it('fails on whitespace only', () => {
      const state = createFormState('validated')!
      state.values.required = '   '
      state.values.both = 'ok'

      const errors = validateForm(state)

      expect(errors.required).toBe('Required is required')
    })
  })

  describe('Max Length Validation', () => {
    it('fails when string exceeds max', () => {
      const state = createFormState('validated')!
      state.values.required = 'ok'
      state.values.maxLen = 'toolong'
      state.values.both = 'ok'

      const errors = validateForm(state)

      expect(errors.maxLen).toBe('Max Len must be at most 5 characters')
    })

    it('passes when string equals max', () => {
      const state = createFormState('validated')!
      state.values.required = 'ok'
      state.values.maxLen = '12345'
      state.values.both = 'ok'

      const errors = validateForm(state)

      expect(errors.maxLen).toBeUndefined()
    })

    it('passes when string is under max', () => {
      const state = createFormState('validated')!
      state.values.required = 'ok'
      state.values.maxLen = '123'
      state.values.both = 'ok'

      const errors = validateForm(state)

      expect(errors.maxLen).toBeUndefined()
    })
  })

  describe('Max Value Validation', () => {
    it('fails when number exceeds max', () => {
      const state = createFormState('validated')!
      state.values.required = 'ok'
      state.values.maxNum = 150
      state.values.both = 'ok'

      const errors = validateForm(state)

      expect(errors.maxNum).toBe('Max Num must be at most 100')
    })

    it('passes when number equals max', () => {
      const state = createFormState('validated')!
      state.values.required = 'ok'
      state.values.maxNum = 100
      state.values.both = 'ok'

      const errors = validateForm(state)

      expect(errors.maxNum).toBeUndefined()
    })

    it('passes when number is under max', () => {
      const state = createFormState('validated')!
      state.values.required = 'ok'
      state.values.maxNum = 50
      state.values.both = 'ok'

      const errors = validateForm(state)

      expect(errors.maxNum).toBeUndefined()
    })
  })

  describe('Multiple Constraint Validation', () => {
    it('checks required first', () => {
      const state = createFormState('validated')!
      state.values.required = 'ok'
      state.values.both = ''

      const errors = validateForm(state)

      expect(errors.both).toBe('Both is required')
    })

    it('checks max after required passes', () => {
      const state = createFormState('validated')!
      state.values.required = 'ok'
      state.values.both = 'this is too long'

      const errors = validateForm(state)

      expect(errors.both).toBe('Both must be at most 10 characters')
    })

    it('passes when both constraints satisfied', () => {
      const state = createFormState('validated')!
      state.values.required = 'ok'
      state.values.both = 'short'

      const errors = validateForm(state)

      expect(errors.both).toBeUndefined()
    })
  })

  describe('Valid Form', () => {
    it('returns empty errors for valid form', () => {
      const state = createFormState('validated')!
      state.values.required = 'value'
      state.values.maxLen = 'ok'
      state.values.maxNum = 50
      state.values.both = 'good'

      const errors = validateForm(state)

      expect(Object.keys(errors)).toHaveLength(0)
    })
  })
})

describe('updateFieldValue: Aggressive Tests', () => {
  beforeEach(() => {
    schemaRegistry.register('update', {
      fields: [
        { name: 'a', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
        { name: 'b', type: { kind: 'primitive', type: 'number' }, constraints: [], line: 2 },
        { name: 'c', type: { kind: 'primitive', type: 'boolean' }, constraints: [], line: 3 },
      ],
      line: 1,
      column: 1,
    })
    mockCollections['update'] = createMockCollection()
  })

  it('updates string field', () => {
    const state = createFormState('update')!
    const newState = updateFieldValue(state, 'a', 'new value')

    expect(newState.values.a).toBe('new value')
  })

  it('updates number field', () => {
    const state = createFormState('update')!
    const newState = updateFieldValue(state, 'b', 42)

    expect(newState.values.b).toBe(42)
  })

  it('updates boolean field', () => {
    const state = createFormState('update')!
    const newState = updateFieldValue(state, 'c', true)

    expect(newState.values.c).toBe(true)
  })

  it('marks form as dirty', () => {
    const state = createFormState('update')!
    expect(state.dirty).toBe(false)

    const newState = updateFieldValue(state, 'a', 'x')
    expect(newState.dirty).toBe(true)
  })

  it('preserves other values', () => {
    const state = createFormState('update')!
    state.values.a = 'original a'
    state.values.b = 123
    state.values.c = true

    const newState = updateFieldValue(state, 'a', 'changed')

    expect(newState.values.b).toBe(123)
    expect(newState.values.c).toBe(true)
  })

  it('returns new state object (immutable)', () => {
    const state = createFormState('update')!
    const newState = updateFieldValue(state, 'a', 'x')

    expect(newState).not.toBe(state)
    expect(newState.values).not.toBe(state.values)
  })

  it('handles undefined field gracefully', () => {
    const state = createFormState('update')!
    const newState = updateFieldValue(state, 'nonexistent', 'value')

    // Should still return a state, just with the new field added
    expect(newState.values.nonexistent).toBe('value')
  })
})

describe('resetForm: Aggressive Tests', () => {
  beforeEach(() => {
    schemaRegistry.register('reset', {
      fields: [
        { name: 'name', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
        { name: 'count', type: { kind: 'primitive', type: 'number' }, constraints: [], line: 2 },
        { name: 'active', type: { kind: 'primitive', type: 'boolean' }, constraints: [], line: 3 },
      ],
      line: 1,
      column: 1,
    })
  })

  describe('Reset to Current', () => {
    it('resets to current values', () => {
      mockCollections['reset'] = createMockCollection([
        { id: '1', name: 'Original', count: 100, active: true },
      ])
      mockCollections['reset'].current = mockCollections['reset'].items[0]

      const state = createFormState('reset')!
      state.values.name = 'Changed'
      state.values.count = 999
      state.values.active = false

      const resetState = resetForm(state)

      expect(resetState.values.name).toBe('Original')
      expect(resetState.values.count).toBe(100)
      expect(resetState.values.active).toBe(true)
    })
  })

  describe('Reset to Defaults', () => {
    it('resets to defaults when no current', () => {
      mockCollections['reset'] = createMockCollection()

      const state = createFormState('reset')!
      state.values.name = 'Some Value'
      state.values.count = 42
      state.values.active = true

      const resetState = resetForm(state)

      expect(resetState.values.name).toBe('')
      expect(resetState.values.count).toBe(0)
      expect(resetState.values.active).toBe(false)
    })
  })

  describe('State Cleanup', () => {
    it('clears errors', () => {
      mockCollections['reset'] = createMockCollection()

      const state = createFormState('reset')!
      state.errors = { name: 'Error 1', count: 'Error 2' }

      const resetState = resetForm(state)

      expect(resetState.errors).toEqual({})
    })

    it('clears dirty flag', () => {
      mockCollections['reset'] = createMockCollection()

      const state = createFormState('reset')!
      state.dirty = true

      const resetState = resetForm(state)

      expect(resetState.dirty).toBe(false)
    })
  })

  describe('Immutability', () => {
    it('returns new state object', () => {
      mockCollections['reset'] = createMockCollection()

      const state = createFormState('reset')!
      const resetState = resetForm(state)

      expect(resetState).not.toBe(state)
    })
  })
})

describe('Form Runtime: Stress Tests', () => {
  it('handles schema with 50 fields', () => {
    const fields = Array.from({ length: 50 }, (_, i) => ({
      name: `field${i}`,
      type: { kind: 'primitive' as const, type: 'string' as const },
      constraints: i % 3 === 0 ? [{ kind: 'required' as const }] : [],
      line: i + 1,
    }))

    schemaRegistry.register('large', { fields, line: 1, column: 1 })
    mockCollections['large'] = createMockCollection()

    const configs = generateFieldConfigs('large')
    expect(configs).toHaveLength(50)

    const state = createFormState('large')
    expect(state).not.toBeNull()
    expect(Object.keys(state!.values)).toHaveLength(50)
  })

  it('validates form with many required fields', () => {
    const fields = Array.from({ length: 20 }, (_, i) => ({
      name: `required${i}`,
      type: { kind: 'primitive' as const, type: 'string' as const },
      constraints: [{ kind: 'required' as const }],
      line: i + 1,
    }))

    schemaRegistry.register('allRequired', { fields, line: 1, column: 1 })
    mockCollections['allRequired'] = createMockCollection()

    const state = createFormState('allRequired')!
    const errors = validateForm(state)

    // All fields should have errors
    expect(Object.keys(errors)).toHaveLength(20)
  })

  it('handles rapid updates', () => {
    schemaRegistry.register('rapid', {
      fields: [{ name: 'x', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 }],
      line: 1,
      column: 1,
    })
    mockCollections['rapid'] = createMockCollection()

    let state = createFormState('rapid')!

    // 100 rapid updates
    for (let i = 0; i < 100; i++) {
      state = updateFieldValue(state, 'x', `value${i}`)
    }

    expect(state.values.x).toBe('value99')
    expect(state.dirty).toBe(true)
  })
})

describe('Form Runtime: Integration Tests', () => {
  it('complete form workflow', () => {
    // Setup schema
    schemaRegistry.register('workflow', {
      fields: [
        { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [{ kind: 'required' }], line: 1 },
        { name: 'description', type: { kind: 'primitive', type: 'string' }, constraints: [{ kind: 'max', value: 100 }], line: 2 },
      ],
      line: 1,
      column: 1,
    })
    mockCollections['workflow'] = createMockCollection()

    // 1. Create form state
    const state = createFormState('workflow')!
    expect(state.values.title).toBe('')
    expect(state.dirty).toBe(false)

    // 2. Update values
    let current = updateFieldValue(state, 'title', 'My Task')
    current = updateFieldValue(current, 'description', 'Task description')
    expect(current.dirty).toBe(true)

    // 3. Validate - should pass
    let errors = validateForm(current)
    expect(Object.keys(errors)).toHaveLength(0)

    // 4. Update to invalid state
    current = updateFieldValue(current, 'title', '')
    errors = validateForm(current)
    expect(errors.title).toBeDefined()

    // 5. Reset
    const resetState = resetForm(current)
    expect(resetState.values.title).toBe('')
    expect(resetState.dirty).toBe(false)
    expect(resetState.errors).toEqual({})
  })

  it('edit existing entry workflow', () => {
    schemaRegistry.register('edit', {
      fields: [
        { name: 'name', type: { kind: 'primitive', type: 'string' }, constraints: [{ kind: 'required' }], line: 1 },
      ],
      line: 1,
      column: 1,
    })

    mockCollections['edit'] = createMockCollection([
      { id: '1', name: 'Existing Item' },
    ])
    mockCollections['edit'].current = mockCollections['edit'].items[0]

    // 1. Create state - should load current
    const state = createFormState('edit')!
    expect(state.values.name).toBe('Existing Item')
    expect(state.dirty).toBe(false)

    // 2. Modify
    let current = updateFieldValue(state, 'name', 'Updated Item')
    expect(current.dirty).toBe(true)

    // 3. Reset - should go back to current entry values
    const reset = resetForm(current)
    expect(reset.values.name).toBe('Existing Item')
  })
})
